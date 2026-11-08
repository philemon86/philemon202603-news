'use strict';
(()=>{
const $=id=>document.getElementById(id);
const APP_URL=(window.SHIRT_CONFIG||{}).scriptUrl||'';
const END=new Date('2027-12-10T23:59:59+08:00').getTime();
const PAIRS="乾干亞亚來来俱具倫伦傘伞傳传僑侨內内務务勝胜勢势區区員员問问啟启國国圍围園园圓圆報报壇坛壢坜壩坝壽寿奧奥學学實实寧宁寶宝專专岡冈島岛峽峡崙仑嶼屿巒峦師师庫库廈厦廣广廬庐強强後后復复愛爱慶庆應应戶户擔担昇升晉晋書书會会東东柵栅棧栈楊杨榮荣樂乐樓楼樹树橋桥橫横權权歷历歸归涼凉溝沟滿满漁渔漢汉漬渍澤泽濱滨灣湾烏乌營营爾尔獅狮現现瑪玛璉琏環环發发磯矶禱祷穌稣篤笃簡简紅红納纳紐纽組组綠绿維维線线縣县繼继羅罗義义聖圣腦脑腳脚臥卧臺台興兴莊庄華华萊莱萬万葉叶蓋盖蓮莲蘆芦蘇苏蘭兰號号裡里見见親亲觀观觸触詩诗豐丰貝贝貞贞財财貢贡貴贵賓宾輝辉轄辖農农連连遊游運运達达遠远邊边鄉乡鄰邻醃腌銅铜鋪铺錦锦鎮镇鐵铁長长門门開开間间閣阁閩闽關关阪坂陽阳際际雙双雲云霧雾靈灵靜静韓韩頂顶順顺領领頭头館馆馬马鬧闹魯鲁鰲鳌鳥鸟鳳凤鴨鸭鶯莺鶴鹤鹽盐麗丽麥麦龍龙龜龟";
const chars=new Map(Array.from({length:PAIRS.length/2},(_,i)=>[PAIRS[2*i],PAIRS[2*i+1]]));
const norm=s=>Array.from(String(s||'').normalize('NFKC').toLowerCase()).map(ch=>chars.get(ch)||ch).join('').replace(/[\s\-_.·・（）()]/g,'');
const clean=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('zh-TW');
const churchTitle=c=>c.c==='TW'&&c.name&&!/(教會|祈禱所|聚會所|福音中心|禱告所)$/.test(c.name)?c.name+'教會':c.name;
const queryChurch=(c,q)=>[churchTitle(c),c.name,c.en,c.region,c.country,c.label].some(v=>norm(v).includes(q));
const countOf=r=>Math.max(0,Number(r?.confirmed)||0)+Math.max(0,Number(r?.pending)||0);
const validURL=/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(APP_URL);
let catalog=[],byId=new Map(),live=null,scope='TW',map=null,base=null,hot=null,mapLoaded=false,loadingStats=false;
let selectedChurch=null,bridgePort=null,bridgeNonce='',pendingRequest=null,readyBridge=false;
const SIZES=['110cm','120cm','2XS','XS','S','M','L','XL','2XL','3XL','4XL'];
const quantities=Object.fromEntries(SIZES.map(s=>[s,0]));
function status(t){$('updatedAt').textContent=t;}
function labelColor(n){return n>=25?'#193451':n>=10?'#335e7e':n>=4?'#608ca1':'#9eb8c3';}
function refreshTime(){
 const left=END-Date.now(),elem=$('deadlineCountdown');
 if(left<=0){elem.textContent='已截止';elem.style.color='#a14d47';return;}
 const days=Math.floor(left/86400000);
 elem.textContent=days>0?'還有 '+days+' 天':Math.floor(left/3600000)+' 小時';
}
function initSearch(){
 const input=$('churchSearch'),results=$('churchSuggestions');
 const show=()=>{
   const q=norm(input.value);results.replaceChildren();
   if(!q){results.hidden=true;return;}
   const picks=catalog.filter(c=>queryChurch(c,q)).slice(0,12);
   for(const c of picks){
    const btn=document.createElement('button');btn.type='button';
    const strong=document.createElement('strong');strong.textContent=churchTitle(c);
    const small=document.createElement('small');small.textContent=c.country+(c.region?' · '+c.region:'');
    btn.append(strong,small);
    btn.onclick=()=>{
      input.value=churchTitle(c);results.hidden=true;
      if(c.c!=='TW'&&scope==='TW')setScope('ALL');
      if(map&&Number.isFinite(+c.lat)&&Number.isFinite(+c.lng)){
        map.flyTo([c.lat,c.lng],c.loc==='country_center_approximate'?5:12,{duration:.7});
      }
    };
    results.append(btn);
   }
   results.hidden=!picks.length;
 };
 input.addEventListener('input',show);
 input.addEventListener('focus',show);
 document.addEventListener('click',e=>{if(!e.target.closest('.map-search'))results.hidden=true;});
}
function setScope(next){
 scope=next;
 document.querySelectorAll('[data-scope]').forEach(b=>b.classList.toggle('active',b.dataset.scope===next));
 resetMap();renderFallback();renderMarkers();
}
function resetMap(){
 if(map)map.setView(scope==='TW'?[23.75,120.98]:[24,22],scope==='TW'?8:2.2);
}
function fallbackReady(){
 const fallback=$('mapFallback');
 if(fallback)fallback.classList.add('tile-ready');
 mapLoaded=true;
}
function renderFallback(){
 const dots=$('fallbackPins'),world=$('fallbackWorldPins'),holder=$('mapFallback');
 holder.classList.toggle('world',scope==='ALL');
 if(!catalog.length)return;
 dots.replaceChildren();world.replaceChildren();
 $('fallbackTw').style.display=scope==='TW'?'':'none';
 $('fallbackWorld').style.display=scope==='TW'?'none':'';
 const stats=new Map((live?.churches||[]).map(r=>[r.id,countOf(r)]));
 if(scope==='TW'){
  for(const c of catalog){
   if(c.c!=='TW'||!Number.isFinite(+c.lat)||!Number.isFinite(+c.lng)||c.loc==='country_center_approximate')continue;
   const rad=c.lat*Math.PI/180;
   const x=((c.lng+180)/360)*65536-212*256;
   const y=(1-Math.log(Math.tan(rad)+1/Math.cos(rad))/Math.PI)/2*65536-109*256;
   if(x<0||x>1024||y<0||y>1024)continue;
   const marker=document.createElement('span');marker.className='offline-dot'+((stats.get(c.id)||0)>0?' active':'');
   marker.style.left=x+'px';marker.style.top=y+'px';
   marker.title=churchTitle(c);marker.dataset.churchId=c.id;
   if(selectedChurch?.id===c.id)marker.classList.add('current');
   dots.append(marker);
  }
  $('fallbackCaption').textContent='© OpenStreetMap contributors · 教會位置';
 }else{
  const byCountry=new Map();
  for(const c of catalog){
   if(!Number.isFinite(+c.lat)||!Number.isFinite(+c.lng))continue;
   if(!byCountry.has(c.c)||c.loc==='country_center_approximate')byCountry.set(c.c,c);
  }
  for(const c of byCountry.values()){
   const x=(c.lng+180)/360*100,y=(90-c.lat)/180*100;
   if(x<0||x>100||y<0||y>100)continue;
   const marker=document.createElement('span');marker.className='offline-dot';
   marker.style.left=x+'%';marker.style.top=y+'%';marker.title=c.country;
   world.append(marker);
  }
  $('fallbackCaption').textContent='全球教會位置概覽 · 含概略定位';
 }
}

async function waitForLeaflet(){
 if(window.L)return true;
 const styles=[
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
 ];
 styles.forEach(url=>{const link=document.createElement('link');link.rel='stylesheet';link.href=url;document.head.append(link);});
 return new Promise(resolve=>{
  const scripts=[
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
  ];
  let done=false;
  const finish=ok=>{if(done)return;done=true;clearTimeout(timer);resolve(ok);};
  scripts.forEach((url,index)=>{
   const load=()=>{
    if(done||window.L){if(window.L)finish(true);return;}
    const s=document.createElement('script');s.src=url;s.async=true;
    s.onload=()=>{if(window.L)finish(true);};
    s.onerror=()=>{if(index===scripts.length-1&&!window.L)status('地圖程式無法載入，仍保留教會分布示意');};
    document.head.append(s);
   };
   if(index===0)load();else setTimeout(load,index*900);
  });
  const timer=setTimeout(()=>finish(Boolean(window.L)),6500);
 });
}

function initMap(){
 if(!window.L)return;
 try{
 map=L.map('mapStage',{zoomControl:false,attributionControl:true,scrollWheelZoom:true,preferCanvas:true,minZoom:2,maxZoom:17,worldCopyJump:true});
 // OpenStreetMap Standard tiles do not require a CARTO API key.
 // Leave browser caching enabled and retain the attribution / HTTP Referer.
 const tile=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
   maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',crossOrigin:true,
   updateWhenIdle:true,keepBuffer:2
 });
 tile.on('tileload',fallbackReady);
 tile.on('tileerror',()=>status('底圖服務暫時無法使用，仍可查看教會位置'));
 tile.addTo(map);
 base=L.layerGroup().addTo(map);
 hot=L.layerGroup().addTo(map);
 resetMap();
 if(selectedChurch&&Number.isFinite(Number(selectedChurch.lat))&&Number.isFinite(Number(selectedChurch.lng)))map.setView([+selectedChurch.lat,+selectedChurch.lng],selectedChurch.loc==='country_center_approximate'?5:12);
 map.on('moveend',renderMarkers);
 setTimeout(()=>{map?.invalidateSize();},160);
 }catch(e){status('地圖底圖暫無法載入，顯示教會位置示意');}
}
function getPopup(meta,rec){
 const qty=countOf(rec);
 const people=(live?.recent||[]).filter(p=>p.id===meta.id);
 const recent=people.map(p=>'<div class="popup-person"><span>'+clean(p.surname||'')+'</span><b>'+fmt(p.qty)+' 件</b></div>').join('');
 const info=qty>0?'已有 '+fmt(qty)+' 件意向':'尚無意向登記';
 return '<div class="popup-title">'+clean(churchTitle(meta))+'</div><div class="popup-info">'+info+'</div>'+recent;
}
function renderMarkers(){
 if(!map||!base||!hot)return;
 base.clearLayers();hot.clearLayers();
 const stats=new Map((live?.churches||[]).map(x=>[x.id,x]));
 const zoom=map.getZoom(),bounds=map.getBounds().pad(.3);
 if(scope==='TW'||zoom>=6){
  for(const c of catalog){
   if(scope==='TW'&&c.c!=='TW')continue;
   if(c.loc==='country_center_approximate'||!Number.isFinite(+c.lat)||!Number.isFinite(+c.lng)||!bounds.contains([c.lat,c.lng]))continue;
   const item=stats.get(c.id),total=countOf(item);
   if(total>0){
     const size=Math.min(49,27+Math.sqrt(total)*4);
     const icon=L.divIcon({className:'',html:'<span class="demand-marker" style="width:'+size+'px;height:'+size+'px;background:'+labelColor(total)+'">'+fmt(total)+'</span><span class="demand-label">'+clean(churchTitle(c))+'</span>',iconSize:[size,size],iconAnchor:[size/2,size/2]});
     L.marker([c.lat,c.lng],{icon}).bindPopup(getPopup(c,item),{maxWidth:240}).addTo(hot);
   }else{
     L.circleMarker([c.lat,c.lng],{radius:((zoom>11?6.5:4.8)+(selectedChurch?.id===c.id?3:0)),weight:1.5,color:'#fff',fillColor:selectedChurch?.id===c.id?'#b28b52':'#7197a9',fillOpacity:.88})
      .bindTooltip(churchTitle(c),{direction:'top'}).bindPopup(getPopup(c,item)).addTo(base);
   }
  }
 }else{
  const countries=new Map();
  for(const c of catalog){
   if(!Number.isFinite(+c.lat)||!Number.isFinite(+c.lng))continue;
   let group=countries.get(c.c);if(!group){group={label:c.country,count:0,lat:c.lat,lng:c.lng,loc:c.loc,qty:0};countries.set(c.c,group);}
   group.count++;
   if(c.loc==='country_center_approximate'&&group.loc!=='country_center_approximate'){group.lat=c.lat;group.lng=c.lng;group.loc=c.loc;}
   group.qty+=countOf(stats.get(c.id));
  }
  for(const grp of countries.values()){
    L.circleMarker([grp.lat,grp.lng],{radius:Math.min(18,7+Math.sqrt(grp.qty)*2),color:'#fff',weight:1.8,fillColor:grp.qty>0?labelColor(grp.qty):'#8faebc',fillOpacity:.9})
    .bindPopup('<div class="popup-title">'+clean(grp.label)+'</div><div class="popup-info">'+grp.count+' 個教會／聚會點　·　'+fmt(grp.qty)+' 件意向</div><div class="popup-info">部分海外位置為國家概略位置</div>')
    .addTo(base);
  }
 }
}
function updateStats(){
 if(!live){$('totalQtyNum').textContent='—';$('churchesNum').textContent='—';$('goalProgress').textContent='填寫意向';return;}
 const total=Math.max(0,Number(live.total)||0);
 $('totalQtyNum').textContent=fmt(total);
 $('churchesNum').textContent=fmt((live.churches||[]).filter(r=>countOf(r)>0).length);
 $('goalProgress').textContent=total>=101?'已達到 101 件門檻':'目前 '+fmt(total)+' / 101 件';
 const item=(live.recent||[])[0];
 $('recentText').textContent=item?(byId.get(item.id)?churchTitle(byId.get(item.id))+' · ':'')+(item.surname||'')+' · '+fmt(item.qty)+' 件':'目前尚無登記資料';
}
function restoreCachedStats(){
 try{
  const item=JSON.parse(sessionStorage.getItem('shirt_last_public_stats')||'null');
  if(item&&Date.now()-item.at<180000&&item.data&&Array.isArray(item.data.churches)){
   live=item.data;updateStats();renderFallback();status('顯示最近統計，正在更新');
  }
 }catch(e){}
}
function loadStats(){
 if(!validURL||loadingStats)return Promise.resolve();
 loadingStats=true;
 const cb='__shirtMap_'+Date.now()+'_'+Math.floor(Math.random()*99999);
 return new Promise(resolve=>{
  const script=document.createElement('script');let done=false;
  const finish=data=>{
    if(done)return;done=true;clearTimeout(timer);delete window[cb];script.remove();loadingStats=false;
    if(data&&Array.isArray(data.churches)){
      try{sessionStorage.setItem('shirt_last_public_stats',JSON.stringify({at:Date.now(),data}));}catch(e){}
      live=data;updateStats();renderFallback();renderMarkers();status('意向統計更新 '+new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}));
    }else status('統計暫時無法連線；地圖仍可查看');
    resolve();
  };
  window[cb]=finish;
  script.async=true;script.onerror=()=>finish(null);
  const timer=setTimeout(()=>finish(null),15000);
  script.src=APP_URL+'?mode=public&callback='+encodeURIComponent(cb)+'&v='+Date.now();
  document.head.append(script);
 });
}

function showQuickMessage(message,kind='info'){
 const el=$('quickStatus');
 el.textContent=message;el.className='quick-status active '+kind;
 if(kind==='success')setTimeout(()=>{if(el.textContent===message)el.classList.remove('active')},5500);
}
function getTotal(){return Object.values(quantities).reduce((a,b)=>a+b,0);}
function paintQty(){
 $('quickTotal').textContent='共 '+getTotal()+' 件';
 document.querySelectorAll('.quick-table tbody tr').forEach(row=>{
  const n=quantities[row.dataset.size]||0;
  row.querySelector('output').textContent=String(n);
  row.classList.toggle('picked',n>0);
 });
}
function renderChurchOptions(){
 const input=$('quickChurch'),box=$('quickChurchOptions');
 const q=norm(input.value);box.replaceChildren();
 if(!q){box.hidden=true;return;}
 const matches=catalog.filter(c=>queryChurch(c,q)).slice(0,12);
 for(const c of matches){
  const button=document.createElement('button');button.type='button';
  button.textContent=churchTitle(c)+' · '+c.country;
  button.addEventListener('click',()=>{
   selectedChurch=c;input.value=churchTitle(c);input.classList.add('selected');box.hidden=true;
   renderFallback();renderMarkers();
   $('churchSearch').value=churchTitle(c);
   if(c.c!=='TW'&&scope==='TW')setScope('ALL');
   if(map&&Number.isFinite(Number(c.lat))&&Number.isFinite(Number(c.lng))){
    map.flyTo([+c.lat,+c.lng],c.loc==='country_center_approximate'?5:12,{duration:.55});
   }
  });box.append(button);
 }
 box.hidden=!matches.length;
}
function initQuickForm(){
 const form=$('quickForm');
 if(!form)return;
 const church=$('quickChurch');
 church.addEventListener('input',()=>{
  selectedChurch=null;church.classList.remove('selected');renderChurchOptions();
 });
 church.addEventListener('focus',renderChurchOptions);
 document.addEventListener('click',e=>{if(!e.target.closest('.quick-field'))$('quickChurchOptions').hidden=true;});
 form.querySelectorAll('.quick-stepper button').forEach(button=>button.addEventListener('click',()=>{
  const tr=button.closest('tr'),name=tr.dataset.size;
  const change=Number(button.dataset.step);
  const next=(quantities[name]||0)+change;
  if(next<0||next>10||change>0&&getTotal()>=10)return;
  quantities[name]=next;paintQty();
 }));
 paintQty();
 const submit=$('quickSend');
 form.addEventListener('submit',event=>{
  event.preventDefault();
  if(Date.now()>END){showQuickMessage('意向調查已截止','error');return;}
  if(pendingRequest){showQuickMessage('上一筆資料仍在傳送，請勿重複送出','info');return;}
  if(!selectedChurch){showQuickMessage('請從教會建議名單點選所屬教會','error');church.focus();return;}
  const surname=$('quickSurname').value.trim();
  if(!surname||!/^[\p{L}\p{M}.'’\-\s]{1,16}$/u.test(surname)){showQuickMessage('請只填中文或英文姓氏（最多16字）','error');return;}
  const qty=getTotal();if(qty<1||qty>10){showQuickMessage('請選擇1至10件','error');return;}
  let token='';try{token=localStorage.getItem('shirt_receipt_code_v2')||'';}catch(e){}
  if(!/^[0-9a-f-]{36}$/.test(token)){
   token=window.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const r=Math.floor(Math.random()*16);return(c==='x'?r:(r&3|8)).toString(16);
   });
  }
  try{localStorage.setItem('shirt_receipt_code_v2',token);}catch(e){}
  pendingRequest={req:String(Date.now())+'-'+Math.random().toString(36).slice(2,8),token,churchId:selectedChurch.id,qty,body:{churchId:selectedChurch.id,surname,sizes:{...quantities},honey:'',token},sent:false};
  submit.disabled=true;submit.textContent='準備送出…';
  showQuickMessage(readyBridge?'正在保存登記…':'正在連接 Google，尚未送出資料');
  pendingRequest.timeout=setTimeout(()=>{
   if(!pendingRequest)return;
   pendingRequest=null;submit.disabled=false;submit.textContent='重新送出意向 →';
   showQuickMessage('Google 尚未回覆，資料尚未確認儲存。可改用備用登記頁。','error');
   const link=document.createElement('a');
   link.href=APP_URL+'?mode=form';link.target='_blank';link.rel='noopener noreferrer';
   link.textContent='開啟備用登記頁 ↗';$('quickStatus').append(document.createTextNode('　'),link);
  },30000);
  sendPending();
 });
 if(!validURL){
  submit.disabled=true;showQuickMessage('尚未設定 Google 接收網址','error');
 }else initBridge();
}
function sendPending(){
 if(!pendingRequest||!bridgePort||!readyBridge||pendingRequest.sent)return;
 pendingRequest.sent=true;
 $('quickSend').textContent='送出中…';
 showQuickMessage('正在儲存，請勿關閉頁面');
 try{bridgePort.postMessage({type:'submit',requestId:pendingRequest.req,payload:pendingRequest.body});}
 catch(e){submitFailure('無法連接 Google，請重新整理再試');}
}
function submitFailure(why){
 const p=pendingRequest;if(p?.timeout)clearTimeout(p.timeout);
 pendingRequest=null;
 $('quickSend').disabled=false;$('quickSend').textContent='重新送出意向 →';
 showQuickMessage(why,'error');
}
function handleBridgeResult(data){
 if(!pendingRequest||data.requestId!==pendingRequest.req)return;
 const p=pendingRequest;
 if(!data.ok||!data.result?.ok){submitFailure('送出未成功：'+String(data.error||'請稍後再試'));return;}
 clearTimeout(p.timeout);pendingRequest=null;
 try{localStorage.setItem('shirt_receipt_code_v2',data.result.token||p.token);}catch(e){}
 $('quickSend').disabled=false;$('quickSend').textContent='更新意向 →';
 showQuickMessage('登記成功！這筆 '+p.qty+' 件已計入意向統計。','success');
 status('已完成登記 · 更新公開地圖中');
 loadStats();
 setTimeout(loadStats,2400);
}
function initBridge(){
 const nonce=window.crypto?.randomUUID?.().replaceAll('-','')||Math.random().toString(36).slice(2)+Date.now();
 bridgeNonce=nonce;
 window.addEventListener('message',event=>{
  const m=event.data;
  if(!m||m.type!=='shirt-bridge-ready'||m.nonce!==bridgeNonce||!event.ports?.[0])return;
  let hostname='';try{hostname=new URL(event.origin).hostname}catch(e){}
  if(hostname&&hostname!=='script.google.com'&&!hostname.endsWith('.googleusercontent.com'))return;
  if(bridgePort)bridgePort.close();
  bridgePort=event.ports[0];
  bridgePort.onmessage=event=>{if(event.data?.type==='result')handleBridgeResult(event.data);};
  bridgePort.start?.();readyBridge=true;sendPending();
 });
 const frame=$('interestBridge');
 frame.src=APP_URL+'?mode=bridge&nonce='+encodeURIComponent(nonce);
 frame.addEventListener('load',()=>setTimeout(()=>{
   if(!readyBridge&&pendingRequest&&!pendingRequest.sent){
     showQuickMessage('Google 登記服務連線中，資料尚未送出。','info');
   }
 },3500));
}

function bindEvents(){
 document.querySelectorAll('.scope').forEach(b=>b.addEventListener('click',()=>setScope(b.dataset.scope)));
 $('resetMapBtn').onclick=resetMap;
 $('zoomInBtn').onclick=()=>map?.zoomIn();
 $('zoomOutBtn').onclick=()=>map?.zoomOut();
}
async function start(){
 bindEvents();initSearch();refreshTime();setInterval(refreshTime,60000);initQuickForm();restoreCachedStats();
 const catalogs=fetch('./churches.json',{cache:'default'}).then(r=>{
  if(!r.ok)throw Error('無法讀取教會資料');return r.json();
 }).then(x=>{
  if(!Array.isArray(x))throw Error('教會資料格式錯誤');
  catalog=x;byId=new Map(x.map(c=>[c.id,c]));renderFallback();renderMarkers();renderChurchOptions();updateStats();
  status('已收錄 '+catalog.length+' 個教會／聚會點');
 }).catch(()=>status('教會名錄暫時無法讀取'));
 waitForLeaflet().then(got=>{
  if(got){initMap();renderMarkers();}
  else status('地圖服務暫時無法載入，顯示教會位置示意');
 });
 if(validURL){
  loadStats();
  const poll=()=>{if(!document.hidden)loadStats();setTimeout(poll,23000+Math.random()*10000);};
  setTimeout(poll,23000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadStats();});
 }
 await catalogs;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();