const $=id=>document.getElementById(id);
const TEAMS={'中百合':['#B8BDE5','#2C304A'],'中興':['#24634F','#F5F3E8'],'朝陽':['#E5E5D6','#243C35'],'小羊':['#195B50','#F5F3E8'],'逢甲':['#F2C51A','#202020'],'東海':['#1F232B','#FFFFFF'],'羅以':['#304F57','#F5F3E8'],'彰真':['#1765B5','#FAF763'],'水沙連':['#202C30','#FFFFFF'],'苗栗':['#23343B','#E9FF60'],'大哥姊':['#795C43','#F5F3E8'],'其他／未加入':['#E9E9E3','#35453D']};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color=t=>{let c=TEAMS[t]||TEAMS['其他／未加入'];return `--team:${c[0]};--fg:${c[1]}`;};
const chip=t=>`<span class="chip" style="${color(t)}">${esc(t)}</span>`;
let token='',serverDelta=0;
function msg(s=''){ $('message').textContent=s;$('message').hidden=!s; }
async function api(action,data={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),40000);let r,j;try{r=await fetch('/api/campcheck',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,action,data}),cache:'no-store',signal:controller.signal});j=await r.json();}catch(e){if(e.name==='AbortError')throw Error('伺服器回應逾時，請重新整理確認是否已報到，再重試。');throw Error('資料服務暫時無法連線，請重新整理後再試。');}finally{clearTimeout(timer);}if(r.status===401&&['status','checkin'].includes(action)){sessionStorage.removeItem('campcheck_token');token='';$('login').hidden=false;['check','ticket','dashboard'].forEach(k=>{if($(k))$(k).hidden=true;});}if(!j.ok)throw Object.assign(Error(j.error||'操作失敗'),{status:r.status});if(j.serverNow)serverDelta=j.serverNow-Date.now();return j;}
async function startGoogle(cb){try{const r=await fetch('/api/campcheck',{cache:'no-store'}),j=await r.json();if(!j.clientId)throw Error(j.error||'Google 登入尚未設定');for(let i=0;i<50&&!window.google?.accounts?.id;i++)await new Promise(r=>setTimeout(r,100));if(!window.google?.accounts?.id)throw Error('無法載入 Google 登入，請使用 Safari 或 Chrome');google.accounts.id.initialize({client_id:j.clientId,callback:async res=>{token=res.credential;try{await cb();}catch(e){msg(e.message);}finally{token='';}}});google.accounts.id.renderButton($('google'),{theme:'outline',size:'large',text:'signin_with',locale:'zh-TW'});}catch(e){msg(e.message);}}
async function logout(){try{await api('studentLogout');token='';window.google?.accounts?.id?.disableAutoSelect();location.reload();}catch(e){msg(e.message);}}

const AM_LEADERS={1:'黃琮道大哥',2:'呂昕雅大姊',3:'林彤穎大姊'};
const PM_LABELS=['','商業財經與管理','資訊智慧與電子科技','工程製造與自然環境','醫療照護與生命科學','教育人文與社會發展','設計藝術與傳播'];
const TOUR_STOPS={
  7:['總會 7F','7F 導覽｜黃畀予、蔡基秀'],
  4:['總會 4F → 3F','4F、3F 導覽｜黃政偉、黃韻涵'],
  1:['總會 1F 腓利門','腓利門導覽']
};
const TOUR_ROUTES={1:[7,4,1],2:[1,7,4],3:[4,1,7]};
function schedule(group) {
  const times=['11:00','11:20','11:40','12:00'];
  const route=TOUR_ROUTES[group]||[];
  return [
    ['08:30','09:00','報到','臺灣總會'],
    ['09:00','10:30','專題講座｜領受真耶穌教會傳入台灣史','總會 1F｜王惠姬長老娘'],
    ['10:30','10:40','全體大合照','總會 1F 會堂'],
    ['10:40','11:00','尋根之旅介紹｜宣道處、理事會各 10 分鐘','總會 1F｜政偉大哥'],
    ...(route.length?route.map((stop,i)=>[times[i],times[i+1],TOUR_STOPS[stop][1],TOUR_STOPS[stop][0]]):
      [['11:00','12:00','尋根之旅①｜分組參觀總會','依同工指引']]),
    ['12:00','12:40','午餐｜原 2F 兩個印章移至 B1','總會 B1 餐廳'],
    ['12:40',null,'集合、禱告、出發前往伸港教會','總會 1F']
  ];
}
function scheduleStatus(group,clock=eventClock()){
  const entries=schedule(group);
  if(clock.date<'2026-12-06'||(clock.date==='2026-12-06'&&clock.time<entries[0][0]))return {entries,next:entries[0],state:'before'};
  if(clock.date>'2026-12-06')return {entries,state:'finished'};
  const index=entries.findIndex(([start,end])=>start<=clock.time&&end&&clock.time<end);
  if(index>=0)return {entries,current:entries[index],next:entries[index+1],state:'active'};
  if(clock.time===entries.at(-1)[0])return {entries,current:entries.at(-1),state:'active'};
  return {entries,state:'pending'};
}
function eventClock(){const now=new Date(Date.now()+serverDelta),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);let p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`,clock:`${p.hour}:${p.minute}:${p.second}`};}
