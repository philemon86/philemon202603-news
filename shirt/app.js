
'use strict';
(()=>{
const $=id=>document.getElementById(id),cfg=window.SHIRT_CONFIG||{};
const allowed=/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(cfg.scriptUrl||'');
let catalog=[],lookup={},map=null,layer=null,scope='TW',live=null;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[x]));
const num=n=>Math.max(0,Number(n)||0).toLocaleString('zh-TW');
const color=n=>n>=25?'#b99852':n>=12?'#193b65':n>=6?'#32608a':n>=3?'#6d96b5':'#a7bfd0';
function current(){return(live?.churches||[]).map(x=>({...x,meta:lookup[x.id],qty:Number(x.confirmed||0)+Number(x.pending||0)})).filter(x=>x.meta&&x.qty>0&&(scope==='ALL'||x.meta.c==='TW')).sort((a,b)=>b.qty-a.qty);}
function initMap(){
 if(!window.L){$('map').innerHTML='<div class="empty-state">地圖暫時無法載入</div>';return;}
 map=L.map('map',{scrollWheelZoom:false,worldCopyJump:true}).setView([23.78,120.95],7);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:18}).addTo(map);
 layer=L.layerGroup().addTo(map);
}
function showMap(){
 if(!layer)return;
 layer.clearLayers();
 for(const x of current()){
   const m=x.meta,r=Math.min(27,7+Math.sqrt(x.qty)*3.7),c=L.circleMarker([m.lat,m.lng],{radius:r,fillColor:color(x.qty),fillOpacity:.82,color:'#fff',weight:2});
   const approx=m.loc==='country_center_approximate'?'國家概略位置':m.loc==='taiwan_historical_reference'?'歷史座標，可能有偏差':'位置參考';
   c.bindPopup('<b>'+esc(m.name)+'</b><br><small>'+esc(m.country)+' · '+esc(m.region)+'</small><br>收到 '+num(x.qty)+' 件意向<br><small>已核對 '+num(x.confirmed)+' 件；'+approx+'</small>').addTo(layer);
 }
}
function showList(){
 const q=($('churchSearch').value||'').trim().toLowerCase(),a=current().filter(x=>!q||[x.meta.name,x.meta.en,x.meta.region,x.meta.country].some(y=>String(y||'').toLowerCase().includes(q)));
 const root=$('churchList');root.replaceChildren();
 $('churchCountLabel').textContent=live?'共 '+a.length+' 處':'依件數排序';
 if(!a.length){root.innerHTML='<div class="empty-state">'+(live?'目前尚無符合的教會意向':'即時服務啟用後，將顯示教會意向與件數')+'</div>';return;}
 for(const x of a.slice(0,80)){
  const b=document.createElement('button');b.className='church-row';b.type='button';
  b.innerHTML='<span class="church-bullet" style="background:'+color(x.qty)+'"></span><span><span class="church-name">'+esc(x.meta.name)+'</span><span class="church-sub">'+esc(x.meta.country)+' · '+esc(x.meta.region)+'</span></span><span class="church-qty">'+num(x.qty)+' <small>件</small></span>';
  b.addEventListener('click',()=>{if(map){map.setView([x.meta.lat,x.meta.lng],x.meta.loc==='country_center_approximate'?5:12);$('map').scrollIntoView({behavior:'smooth',block:'center'});}});
  root.append(b);
 }
}
function showRecent(){
 const root=$('recentList');root.replaceChildren();
 const data=(live?.recent||[]).filter(x=>lookup[x.id]);
 if(!data.length){root.innerHTML='<div class="empty-state">尚無已核對的公開意向</div>';return;}
 for(const x of data.slice(0,9)){
  const c=lookup[x.id],name=x.surname?x.surname+(x.title||''):'匿名';
  const d=document.createElement('div');d.className='recent-item';
  d.innerHTML='<span class="recent-avatar">'+esc(x.surname?.slice(0,1)||'匿')+'</span><span class="recent-main"><b>'+esc(name)+'</b><small>'+esc(c.name)+' · '+esc(c.country)+'</small></span><span class="recent-qty">'+num(x.qty)+' 件</span>';
  root.append(d);
 }
}
function render(){
 const v=Number(live?.verified||0);
 $('interestTotal').textContent=live?num(live.total):'—';
 $('verifiedTotal').textContent=live?num(v):'—';
 $('activeChurches').textContent=live?num((live.churches||[]).filter(x=>Number(x.confirmed)+Number(x.pending)>0).length):'—';
 $('remaining').textContent=live?num(Math.max(0,101-v)):'—';
 $('progressbar').style.width=live?Math.min(100,v/101*100)+'%':'0%';
 showMap();showList();showRecent();
}
function load(){
 if(!allowed)return;
 const fn='__shirt_'+Date.now()+'_'+Math.floor(Math.random()*99999),script=document.createElement('script');
 let handled=false;
 const done=(value,err)=>{
   if(handled)return;handled=true;delete window[fn];script.remove();clearTimeout(timer);
   if(value){live=value;render();$('updatedAt').textContent='最近更新 '+new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'});}
   else if(err)$('updatedAt').textContent='連線中斷，稍後自動重試';
 };
 window[fn]=data=>done(data,false);
 script.onerror=()=>done(null,true);
 const timer=setTimeout(()=>done(null,true),13000);
 script.src=cfg.scriptUrl+'?mode=public&callback='+fn+'&t='+Date.now();
 document.head.append(script);
}
async function start(){
 try{
  const r=await fetch('./churches.json',{cache:'no-store'});if(!r.ok)throw Error();
  catalog=await r.json();lookup=Object.fromEntries(catalog.map(x=>[x.id,x]));
 }catch(e){$('churchList').innerHTML='<div class="empty-state">教會資料無法讀取，請稍後再試。</div>';}
 initMap();
 document.querySelectorAll('[data-scope]').forEach(b=>b.addEventListener('click',()=>{
  scope=b.dataset.scope;document.querySelectorAll('[data-scope]').forEach(x=>x.classList.toggle('active',x===b));
  map?.setView(scope==='TW'?[23.78,120.95]:[22,15],scope==='TW'?7:2);render();
 }));
 $('churchSearch').addEventListener('input',showList);
 window.addEventListener('message',e=>{if((e.origin==='https://script.google.com'||e.origin.endsWith('.googleusercontent.com'))&&e.data?.type==='shirt-submitted')setTimeout(load,1500);});
 if(allowed){
  const frame=document.createElement('iframe');frame.src=cfg.scriptUrl+'?mode=form';frame.className='form-frame';frame.title='意向登記';frame.loading='lazy';
  $('formWrapper').replaceChildren(frame);load();
  setInterval(()=>{if(document.visibilityState==='visible')load();},60000+Math.round(Math.random()*6000));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load();});
 }else{$('updatedAt').textContent='即時統計尚未啟用';render();}
}
start();
})();
