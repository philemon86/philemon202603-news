'use strict';
(function(){
 const root=document.getElementById('shirtBanner');
 if(!root)return;
 const $=id=>document.getElementById(id);
 const API=(window.SHIRT_CONFIG||{}).scriptUrl||'';
 const END=new Date('2026-12-20T23:59:59+08:00').getTime();
 const SIZES=['110cm','120cm','2XS','XS','S','M','L','XL','2XL','3XL','4XL','5XL'];
 const Q=Object.fromEntries(SIZES.map(k=>[k,0]));
 const P="乾干亞亚來来俱具倫伦傘伞傳传僑侨內内務务勝胜勢势區区員员問问啟启國国圍围園园圓圆報报壇坛壢坜壩坝壽寿奧奥學学實实寧宁寶宝專专岡冈島岛峽峡崙仑嶼屿巒峦師师庫库廈厦廣广廬庐強强後后復复愛爱慶庆應应戶户擔担昇升晉晋書书會会東东柵栅棧栈楊杨榮荣樂乐樓楼樹树橋桥橫横權权歷历歸归涼凉溝沟滿满漁渔漢汉漬渍澤泽濱滨灣湾烏乌營营爾尔獅狮現现瑪玛璉琏環环發发磯矶禱祷穌稣篤笃簡简紅红納纳紐纽組组綠绿維维線线縣县繼继羅罗義义聖圣腦脑腳脚臥卧臺台興兴莊庄華华萊莱萬万葉叶蓋盖蓮莲蘆芦蘇苏蘭兰號号裡里見见親亲觀观觸触詩诗豐丰貝贝貞贞財财貢贡貴贵賓宾輝辉轄辖農农連连遊游運运達达遠远邊边鄉乡鄰邻醃腌銅铜鋪铺錦锦鎮镇鐵铁長长門门開开間间閣阁閩闽關关阪坂陽阳際际雙双雲云霧雾靈灵靜静韓韩頂顶順顺領领頭头館馆馬马鬧闹魯鲁鰲鳌鳥鸟鳳凤鴨鸭鶯莺鶴鹤鹽盐麗丽麥麦龍龙龜龟";
 const dict=new Map(Array.from({length:P.length/2},(_,i)=>[P[2*i],P[2*i+1]]));
 const norm=v=>Array.from(String(v||'').normalize('NFKC').toLowerCase()).map(x=>dict.get(x)||x).join('').replace(/[\s\-_.·・（）()]/g,'');
 const title=c=>c.c==='TW'&&!/(教會|教会|祈禱所|祈祷所|聚會所|聚会所|福音中心|禱告所|祷告所)$/.test(c.name||'')?c.name+'教會':c.name;
 const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('zh-TW');
 let catalog=[],selected=null,port=null,ready=false,req=null;
 const deadlineTimer=()=>{
  const rest=Math.max(0,END-Date.now()),d=Math.floor(rest/86400000),h=Math.floor(rest/3600000)%24,m=Math.floor(rest/60000)%60,s=Math.floor(rest/1000)%60;
  $('bwDays').textContent=String(d);$('bwHours').textContent=String(h).padStart(2,'0');$('bwMinutes').textContent=String(m).padStart(2,'0');$('bwSeconds').textContent=String(s).padStart(2,'0');
  $('bwClock').classList.toggle('ended',rest===0);
  if(rest===0){$('bwSend').disabled=true;$('bwSend').textContent='登記已截止';}
 };
 deadlineTimer();setInterval(deadlineTimer,1000);
 const setStatus=(msg,level='')=>{const e=$('bwStatus');e.textContent=msg;e.className='status '+level;sendHeight();};
 const total=()=>Object.values(Q).reduce((a,b)=>a+b,0);
 function paint(){
  $('bwTotal').textContent='共 '+total()+' 件';
  root.querySelectorAll('.size-tile').forEach(t=>{
   t.querySelector('output').textContent=Q[t.dataset.size];
   t.classList.toggle('picked',Q[t.dataset.size]>0);
  });
 }
 root.querySelectorAll('.size-tile').forEach(t=>{
  t.querySelector('.minus').addEventListener('click',()=>{
   Q[t.dataset.size]=Math.max(0,Q[t.dataset.size]-1);paint();
  });
  t.querySelector('.plus').addEventListener('click',()=>{
   if(total()>=10)return;
   Q[t.dataset.size]=Math.min(10,Q[t.dataset.size]+1);paint();
  });
 });
 paint();
 const search=$('bwChurch'),box=$('bwOptions');
 function options(){
  box.replaceChildren();
  const q=norm(search.value);
  if(!q){box.hidden=true;return;}
  const found=catalog.filter(c=>[c.name,title(c),c.en,c.region,c.country,c.label,...(Array.isArray(c.aliases)?c.aliases:[])].some(x=>norm(x).includes(q)))
    .map((c,i)=>({c,i,score:norm(title(c))===q?0:norm(title(c)).startsWith(q)?1:c.kind==='customer'?2:3}))
    .sort((a,b)=>a.score-b.score||a.i-b.i).slice(0,12);
  for(const {c} of found){
   const b=document.createElement('button');b.type='button';
   b.textContent=title(c)+(c.kind==='customer'?' · 客戶':' · '+c.country);
   b.addEventListener('click',()=>{
    selected=c;search.value=title(c);search.classList.add('selected');box.hidden=true;$('bwName').focus();
   });
   box.append(b);
  }
  box.hidden=!found.length;
  sendHeight();
 }
 search.addEventListener('input',()=>{selected=null;search.classList.remove('selected');options();});
 search.addEventListener('focus',options);
 document.addEventListener('click',e=>{if(!e.target.closest('.field'))box.hidden=true;});
 fetch('./churches.json?v=20261108customers1',{cache:'default'}).then(r=>{if(!r.ok)throw Error('名錄無法讀取');return r.json();})
 .then(a=>{if(!Array.isArray(a))throw Error('名錄格式異常');catalog=a;options();})
 .catch(()=>setStatus('教會／客戶名錄載入失敗，請重新整理頁面。','error'));
 function loadStats(){
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(API))return;
  const key='__bwStat_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
  const script=document.createElement('script');let finished=false;
  const done=()=>{if(finished)return;finished=true;clearTimeout(timer);script.remove();delete window[key];};
  window[key]=data=>{
   done();if(!data||!Number.isFinite(Number(data.total)))return;
   $('bwPieces').textContent=fmt(data.total);
   const people=Number.isFinite(Number(data.people))?Number(data.people):Number(data.total)===1?1:null;
   $('bwPeople').textContent=people==null?'—':fmt(people);
  };
  script.onerror=done;
  const timer=setTimeout(done,11000);
  script.src=API+'?mode=public&callback='+key+'&ts='+Date.now();
  document.head.append(script);
 }
 loadStats();setInterval(()=>{if(!document.hidden)loadStats();},28000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadStats();});
 function createToken(){
  try{return crypto.randomUUID();}catch(e){}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,k=>{
   const r=Math.floor(Math.random()*16);return(k==='x'?r:(r&3|8)).toString(16);
  });
 }
 let storedToken=(()=>{try{return localStorage.getItem('shirt-banner-token-v1')||'';}catch(e){return '';}})();
 function markFailed(msg){
  if(req?.timer)clearTimeout(req.timer);req=null;
  $('bwSend').disabled=false;$('bwSend').textContent='重新送出意向 →';
  setStatus(msg,'error');
 }
 function sendRequest(){
  if(!req||!ready||!port||req.sent)return;
  req.sent=true;
  setStatus('資料傳送中，請勿關閉頁面。');
  $('bwSend').textContent='送出中…';
  try{port.postMessage({type:'submit',requestId:req.id,payload:req.payload});}
  catch(e){markFailed('連線中斷，請重新送出。');}
 }
 function bridge(){
  if(!API)return;
  const nonce=createToken().replace(/-/g,'');
  window.addEventListener('message',event=>{
   const m=event.data;if(!m||m.type!=='shirt-bridge-ready'||m.nonce!==nonce||!event.ports?.[0])return;
   let host='';try{host=new URL(event.origin).hostname;}catch(e){return;}
   if(host!=='script.google.com'&&!host.endsWith('.googleusercontent.com'))return;
   if(m.protocol!=='named-notice-v3'){
    $('bwSend').disabled=true;
    setStatus('Google 登記端尚未更新，請管理員重新部署最新版 Code.gs。','error');
    return;
   }
   if(ready||port)return;
   port=event.ports[0];ready=true;
   port.onmessage=e=>{
    const data=e.data;
    if(!req||data?.type!=='result'||data.requestId!==req.id)return;
    if(!data.ok||!data.result?.ok){markFailed('登記失敗：'+String(data.error||'請稍後重試'));return;}
    const n=req.count;clearTimeout(req.timer);req=null;
    storedToken='';try{localStorage.removeItem('shirt-banner-token-v1');}catch(e){}
    Object.keys(Q).forEach(k=>Q[k]=0);paint();$('bwName').value='';
    $('bwSend').disabled=false;$('bwSend').textContent='繼續填寫下一位 →';
    setStatus('登記成功，已送出 '+n+' 件意向。','success');loadStats();setTimeout(loadStats,1800);
   };
   port.start?.();sendRequest();
  });
  $('bwBridge').src=API+'?mode=bridge&nonce='+encodeURIComponent(nonce);
 }
 bridge();
 $('bwForm').addEventListener('submit',event=>{
  event.preventDefault();
  if(Date.now()>END){setStatus('意向登記已截止。','error');return;}
  if(req){setStatus('上一筆正在送出，請勿重複提交。');return;}
  if(!selected){setStatus('請從搜尋清單選擇教會或客戶。','error');search.focus();return;}
  const name=$('bwName').value.trim().normalize('NFKC');
  if(!/^[\p{L}\p{M}][\p{L}\p{M}.'’\-\s]{1,39}$/u.test(name)){setStatus('請輸入書報組或中文／英文全名（2～40字）。','error');$('bwName').focus();return;}
  const count=total();if(count<1||count>10){setStatus('請選擇合計 1～10 件。','error');return;}
  if(!/^[0-9a-f-]{36}$/.test(storedToken))storedToken=createToken();
  try{localStorage.setItem('shirt-banner-token-v1',storedToken);}catch(e){}
  req={id:Date.now()+'-'+Math.random().toString(36).slice(2),count,payload:{churchId:selected.id,name,sizes:{...Q},honey:'',token:storedToken},sent:false};
  $('bwSend').disabled=true;$('bwSend').textContent='連線中…';
  setStatus(ready?'正在儲存意向…':'正在連接 Google 登記系統…');
  req.timer=setTimeout(()=>markFailed('Google 尚未確認儲存，請稍後重新送出。'),30000);
  sendRequest();
 });
 function sendHeight(){
  if(window.parent===window)return;
  const height=Math.ceil(Math.max(root.getBoundingClientRect().height,document.documentElement.scrollHeight)+4);
  window.parent.postMessage({type:'philemon-shirt-banner-height',height},'*');
 }
 if('ResizeObserver' in window){new ResizeObserver(sendHeight).observe(root);}
 window.addEventListener('load',sendHeight);window.addEventListener('resize',sendHeight);
 setTimeout(sendHeight,120);setTimeout(sendHeight,800);
})();
