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
 const dots=$('fallbackPins');dots.replaceChildren();
 $('fallbackTw').style.display=scope==='TW'?'':'none';
 $('fallbackWorld').style.display=scope==='TW'?'none':'';
 const seen=new Set();
 for(const c of catalog){
   if(!Number.isFinite(+c.lat)||!Number.isFinite(+c.lng))continue;
   if(scope==='TW'&&c.c!=='TW')continue;
   if(scope==='ALL'&&c.loc==='country_center_approximate'&&seen.has(c.c))continue;
   if(scope==='ALL'&&c.loc==='country_center_approximate')seen.add(c.c);
   const x=scope==='TW'?((c.lng-119.0)/3.7)*100:((c.lng+180)/360)*100;
   const y=scope==='TW'?((25.8-c.lat)/4.2)*100:((90-c.lat)/180)*100;
   if(x<0||x>100||y<0||y>100)continue;
   const dot=document.createElement('span');dot.className='offline-dot';
   const item=(live?.churches||[]).find(v=>v.id===c.id);
   if(item&&countOf(item)>0)dot.classList.add('active');
   dot.style.left=x+'%';dot.style.top=y+'%';dot.title=churchTitle(c);dots.append(dot);
 }
 $('fallbackCaption').textContent=scope==='TW'?'臺灣教會位置示意':'全球教會分布示意';
}
async function waitForLeaflet(){
 if(window.L)return true;
 const css=document.createElement('link');css.rel='stylesheet';css.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';document.head.append(css);
 return new Promise(resolve=>{
   const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';s.async=true;
   let finished=false;
   const finish=val=>{if(finished)return;finished=true;clearTimeout(timeout);resolve(val);};
   s.onload=()=>finish(!!window.L);s.onerror=()=>finish(false);
   const timeout=setTimeout(()=>finish(false),9000);
   document.head.append(s);
 });
}
function initMap(){
 if(!window.L)return;
 try{
 map=L.map('mapStage',{zoomControl:false,attributionControl:true,scrollWheelZoom:true,preferCanvas:true,minZoom:2,maxZoom:17,worldCopyJump:true});
 // OpenStreetMap Standard tiles do not require a CARTO API key.
 // Leave browser caching enabled and retain the attribution / HTTP Referer.
 const tile=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
   maxZoom:19,attribution:'&copy; OpenStreetMap contributors',crossOrigin:true,
   updateWhenIdle:true,keepBuffer:2
 });
 tile.on('tileload',fallbackReady);
 tile.on('tileerror',()=>status('底圖服務暫時無法使用，仍可查看教會位置'));
 tile.addTo(map);
 base=L.layerGroup().addTo(map);
 hot=L.layerGroup().addTo(map);
 resetMap();
 map.on('zoomend moveend',renderMarkers);
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
 renderFallback();
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
     L.circleMarker([c.lat,c.lng],{radius:zoom>11?6.5:4.8,weight:1,color:'#fff',fillColor:'#7197a9',fillOpacity:.8})
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
function loadStats(){
 if(!validURL||loadingStats)return Promise.resolve();
 loadingStats=true;
 const cb='__shirtMap_'+Date.now()+'_'+Math.floor(Math.random()*99999);
 return new Promise(resolve=>{
  const script=document.createElement('script');let done=false;
  const finish=data=>{
    if(done)return;done=true;clearTimeout(timer);delete window[cb];script.remove();loadingStats=false;
    if(data&&Array.isArray(data.churches)){
      live=data;updateStats();renderMarkers();status('意向統計更新 '+new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}));
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
function initForm(){
 const box=$('formWrapper');box.replaceChildren();
 if(!validURL){box.innerHTML='<div class="form-loading">Google 表單尚未連接</div>';return;}
 const frame=document.createElement('iframe');
 frame.id='interestForm';frame.title='選擇尺寸、件數及填寫教會姓氏';
 frame.src=APP_URL+'?mode=form';
 frame.referrerPolicy='strict-origin-when-cross-origin';
 frame.setAttribute('scrolling','no');
 box.append(frame);
 window.addEventListener('message',e=>{
  let source='';try{source=new URL(e.origin).hostname;}catch(error){return;}
  const fromScript=source==='script.google.com'||source.endsWith('.googleusercontent.com');
  if(!fromScript||!e.data||typeof e.data!=='object')return;
  if(e.data.type==='shirt-submitted'){setTimeout(loadStats,950);return;}
  if(e.data.type==='shirt-church-selected'){
    const item=byId.get(String(e.data.churchId||''));
    if(!item)return;
    $('churchSearch').value=churchTitle(item);
    if(item.c!=='TW'&&scope==='TW')setScope('ALL');
    if(map&&Number.isFinite(Number(item.lat))&&Number.isFinite(Number(item.lng))){
      map.flyTo([Number(item.lat),Number(item.lng)],item.loc==='country_center_approximate'?5:12,{duration:.7});
    }
    status('已選擇 '+churchTitle(item));
  }
 });
}
function bindEvents(){
 document.querySelectorAll('.scope').forEach(b=>b.addEventListener('click',()=>setScope(b.dataset.scope)));
 $('resetMapBtn').onclick=resetMap;
 $('zoomInBtn').onclick=()=>map?.zoomIn();
 $('zoomOutBtn').onclick=()=>map?.zoomOut();
}
async function start(){
 bindEvents();initSearch();refreshTime();setInterval(refreshTime,60000);initForm();
 try{
  const req=await fetch('./churches.json',{cache:'no-cache'});
  if(!req.ok)throw Error('無法讀取教會資料');
  const x=await req.json();
  if(!Array.isArray(x))throw Error('教會資料格式錯誤');
  catalog=x;byId=new Map(x.map(c=>[c.id,c]));renderFallback();
  status('已收錄 '+catalog.length+' 個教會／聚會點');
 }catch(e){status('教會資料暫時無法取得');}
 const got=await waitForLeaflet();
 if(got){initMap();renderMarkers();}
 else status('顯示教會位置示意（地圖服務未連線）');
 if(validURL){await loadStats();setInterval(()=>{if(!document.hidden)loadStats();},45000);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();