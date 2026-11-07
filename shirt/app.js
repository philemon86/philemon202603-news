'use strict';
(()=>{
const $=id=>document.getElementById(id);
const config=window.SHIRT_CONFIG||{};
const validScriptUrl=/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(config.scriptUrl||'');
let catalog=[],byId=new Map(),map=null,pins=null,live=null,scope='TW',refreshing=false,activeSearchIndex=-1;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nfmt=n=>Math.max(0,Number(n)||0).toLocaleString('zh-TW');
const churchName=c=>c.c==='TW'&&c.name&&!/(教會|祈禱所|聚會所|福音中心|禱告所)$/.test(c.name)?c.name+'教會':c.name;
const qtyColor=n=>n>=20?'#142f51':n>=10?'#3b6382':n>=4?'#779aa9':'#b5c9d4';
const effectiveQty=r=>Math.max(0,Number(r.confirmed)||0)+Math.max(0,Number(r.pending)||0);
function setStatus(t){$('updatedAt').textContent=t;}
function toggleModal(id,open){
 const el=$(id);el.classList.toggle('open',open);el.setAttribute('aria-hidden',String(!open));
 if(open){const close=el.querySelector('.close-btn');close?.focus();}
}
function bindUI(){
 $('topShirtBtn').addEventListener('click',()=>toggleModal('productBackdrop',true));
 $('openProductBtn').addEventListener('click',()=>toggleModal('productBackdrop',true));
 $('formOpenSizeGuideBtn').addEventListener('click',()=>toggleModal('productBackdrop',true));
 $('closeProductBtn').addEventListener('click',()=>toggleModal('productBackdrop',false));
 $('openRegisterBtn').addEventListener('click',()=>toggleModal('registerBackdrop',true));
 $('closeRegisterBtn').addEventListener('click',()=>toggleModal('registerBackdrop',false));
 for(const id of ['productBackdrop','registerBackdrop']){
   $(id).addEventListener('click',e=>{if(e.target===$(id))toggleModal(id,false);});
 }
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){toggleModal('productBackdrop',false);toggleModal('registerBackdrop',false);$('churchSuggestions').hidden=true;}
 });
 document.querySelectorAll('[data-scope]').forEach(b=>b.addEventListener('click',()=>{
   scope=b.dataset.scope;
   document.querySelectorAll('[data-scope]').forEach(x=>x.classList.toggle('active',x===b));
   resetView();renderMap();
 }));
 $('resetMapBtn').addEventListener('click',resetView);
 $('zoomInBtn').addEventListener('click',()=>map?.zoomIn());
 $('zoomOutBtn').addEventListener('click',()=>map?.zoomOut());
 const search=$('churchSearch');
 search.addEventListener('input',()=>showSuggestions(search.value));
 search.addEventListener('focus',()=>showSuggestions(search.value));
 search.addEventListener('keydown',e=>{if(e.key==='Escape'){$('churchSuggestions').hidden=true;search.blur();}});
 document.addEventListener('click',e=>{if(!e.target.closest('#searchPanel'))$('churchSuggestions').hidden=true;});
}
function resetView(){if(!map)return;const taiwan=scope==='TW';map.setView(taiwan?[23.72,120.95]:[24,20],taiwan?8:2,{animate:true});}
function initMap(){
 if(!window.L){setStatus('地圖載入失敗');return;}
 map=L.map('mapStage',{zoomControl:false,scrollWheelZoom:true,worldCopyJump:true,minZoom:2,maxZoom:17,preferCanvas:true});
 L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
  subdomains:'abcd',maxZoom:19,attribution:'© OpenStreetMap © CARTO'
 }).addTo(map);
 pins=L.layerGroup().addTo(map);
 resetView();
}
function showSuggestions(value){
 const root=$('churchSuggestions');root.replaceChildren();
 const term=String(value||'').trim().toLowerCase();
 if(!term){root.hidden=true;return;}
 const matches=catalog.filter(c=>[c.name,c.en,c.label,c.country,c.region].some(x=>String(x||'').toLowerCase().includes(term))).slice(0,12);
 if(!matches.length){root.hidden=true;return;}
 for(const c of matches){
  const btn=document.createElement('button');
  btn.type='button';btn.className='search-result';
  const name=document.createElement('strong');name.textContent=churchName(c);
  const sub=document.createElement('small');sub.textContent=c.country+' · '+c.region;
  btn.append(name,sub);
  btn.addEventListener('click',()=>{
    $('churchSearch').value=churchName(c);
    root.hidden=true;
    if(c.c==='TW'&&scope!=='TW'){scope='TW';document.querySelectorAll('[data-scope]').forEach(x=>x.classList.toggle('active',x.dataset.scope==='TW'));}
    else if(c.c!=='TW'&&scope!=='ALL'){scope='ALL';document.querySelectorAll('[data-scope]').forEach(x=>x.classList.toggle('active',x.dataset.scope==='ALL'));}
    renderMap();
    if(map&&Number.isFinite(+c.lat)&&Number.isFinite(+c.lng)){map.flyTo([c.lat,c.lng],c.loc==='country_center_approximate'?5:12,{duration:.8});}
  });
  root.append(btn);
 }
 root.hidden=false;
}
function renderStats(){
 if(!live){
  for(const id of ['totalQtyNum','verifiedNum','churchesNum'])$(id).textContent='—';
  $('recentStatus').textContent=validScriptUrl?'連線中':'未開放';
  return;
 }
 $('totalQtyNum').textContent=nfmt(live.total);
 $('verifiedNum').textContent=nfmt(live.verified);
 $('churchesNum').textContent=nfmt((live.churches||[]).filter(x=>effectiveQty(x)>0).length);
 $('recentStatus').textContent='已更新';
}
function makePopup(item,meta){
 const people=(live?.recent||[]).filter(x=>x.id===item.id);
 let s='<div class="popup-name">'+esc(churchName(meta))+'</div>';
 s+='<div class="popup-qty">意向 <b>'+nfmt(effectiveQty(item))+'</b> 件　·　已確認 '+nfmt(item.confirmed)+' 件</div>';
 for(const p of people.slice(0,6)){
  const name=(p.surname||'匿名')+(p.surname?(p.title||''):'');
  s+='<div class="popup-person"><span>'+esc(name)+'</span><strong>'+nfmt(p.qty)+' 件</strong></div>';
 }
 if(meta.loc!=='directory')s+='<div class="popup-foot">位置為概略標示</div>';
 return s;
}
function renderMap(){
 if(!pins)return;
 pins.clearLayers();
 if(!live)return;
 const valid=(live.churches||[]).map(r=>({r,m:byId.get(r.id)}))
 .filter(x=>x.m&&effectiveQty(x.r)>0&&(scope==='ALL'||x.m.c==='TW')&&Number.isFinite(Number(x.m.lat))&&Number.isFinite(Number(x.m.lng)));
 for(const {r,m} of valid){
  const num=effectiveQty(r);
  const size=Math.min(61,Math.round(27+Math.sqrt(num)*5));
  const bg=qtyColor(num);
  const text='<div class="map-pin"><span class="pin-circle" style="width:'+size+'px;height:'+size+'px;background:'+bg+'">'+nfmt(num)+'</span><span class="pin-label">'+esc(churchName(m))+'</span></div>';
  const icon=L.divIcon({html:text,className:'custom-map-pin',iconSize:[110,83],iconAnchor:[55,35],popupAnchor:[0,-30]});
  const marker=L.marker([m.lat,m.lng],{icon,keyboard:true,title:churchName(m)});
  marker.bindPopup(makePopup(r,m),{maxWidth:290});
  marker.addTo(pins);
 }
}
function renderRecent(){
 const root=$('recentList');root.replaceChildren();
 const list=(live?.recent||[]).filter(r=>byId.has(r.id));
 if(!list.length){
  const p=document.createElement('p');p.className='recent-empty';
  p.textContent=live?'目前沒有公開意向':'尚無公開意向';root.append(p);return;
 }
 for(const item of list.slice(0,8)){
  const meta=byId.get(item.id);
  const name=(item.surname||'匿名')+(item.surname?(item.title||''):'');
  const row=document.createElement('div');row.className='recent-item';
  const avatar=document.createElement('span');avatar.className='recent-avatar';avatar.textContent=(item.surname||'匿').slice(0,1);
  const desc=document.createElement('span');desc.className='recent-desc';
  const title=document.createElement('strong');title.textContent=name;
  const sub=document.createElement('small');sub.textContent=churchName(meta)+' · '+meta.country;
  desc.append(title,sub);
  const qty=document.createElement('span');qty.className='recent-qty';qty.textContent=nfmt(item.qty)+'件';
  row.append(avatar,desc,qty);root.append(row);
 }
}
function render(){renderStats();renderMap();renderRecent();}
async function loadLive(){
 if(!validScriptUrl||refreshing)return;
 refreshing=true;
 const callback='__shirtPublic_'+Date.now()+'_'+Math.floor(Math.random()*99999);
 const script=document.createElement('script');
 await new Promise(resolve=>{
  let done=false;
  const finish=data=>{
   if(done)return;done=true;
   clearTimeout(timeout);delete window[callback];script.remove();
   if(data&&typeof data==='object'&&Array.isArray(data.churches)){
    live=data;render();setStatus('最近更新 '+new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}));
   }else{
    setStatus('統計暫時無法連線，稍後自動重試');
   }
   resolve();
  };
  window[callback]=finish;
  script.onerror=()=>finish(null);
  const timeout=setTimeout(()=>finish(null),14500);
  script.async=true;
  script.src=config.scriptUrl+'?mode=public&callback='+encodeURIComponent(callback)+'&t='+Date.now();
  document.head.append(script);
 });
 refreshing=false;
}
function initForm(){
 const root=$('formWrapper');
 if(!validScriptUrl){root.innerHTML='<div class="form-unavailable">登記尚未開放</div>';return;}
 root.replaceChildren();
 const frame=document.createElement('iframe');
 frame.src=config.scriptUrl+'?mode=form';
 frame.className='form-frame';
 frame.title='紀念衫意向登記';
 frame.referrerPolicy='strict-origin-when-cross-origin';
 root.append(frame);
 window.addEventListener('message',event=>{
   let host='';try{host=new URL(event.origin).hostname;}catch(e){return;}
   if(host!=='script.google.com'&&!host.endsWith('.googleusercontent.com'))return;
   if(event.data&&event.data.type==='shirt-submitted')loadLive();
 });
}
async function start(){
 bindUI();initMap();initForm();render();
 try{
  const response=await fetch('./churches.json',{cache:'no-cache'});
  if(!response.ok)throw Error('churches data');
  const data=await response.json();
  if(!Array.isArray(data))throw Error('bad data');
  catalog=data;byId=new Map(data.map(c=>[c.id,c]));
 }catch(err){setStatus('教會資料暫時無法讀取');return;}
 if(validScriptUrl){
  await loadLive();
  setInterval(()=>{if(document.visibilityState==='visible')loadLive();},62000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadLive();});
 }else{
  setStatus('登記尚未開放');
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();