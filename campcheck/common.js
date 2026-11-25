const $=id=>document.getElementById(id);
const TEAMS={'中百合':['#B8BDE5','#2C304A'],'中興':['#24634F','#F5F3E8'],'朝陽':['#E5E5D6','#243C35'],'小羊':['#195B50','#F5F3E8'],'逢甲':['#F2C51A','#202020'],'東海':['#1F232B','#FFFFFF'],'羅以':['#304F57','#F5F3E8'],'彰真':['#1765B5','#FAF763'],'水沙連':['#202C30','#FFFFFF'],'苗栗':['#23343B','#E9FF60'],'大哥姊':['#795C43','#F5F3E8'],'其他／未加入':['#E9E9E3','#35453D']};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color=t=>{let c=TEAMS[t]||TEAMS['其他／未加入'];return `--team:${c[0]};--fg:${c[1]}`;};
const chip=t=>`<span class="chip" style="${color(t)}">${esc(t)}</span>`;
let token='',serverDelta=0;
function msg(s=''){ $('message').textContent=s;$('message').hidden=!s; }
async function api(action,data={}){const r=await fetch('/api/campcheck',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,action,data}),cache:'no-store'});let j=await r.json();if(r.status===401&&['status','checkin'].includes(action)){sessionStorage.removeItem('campcheck_token');token='';$('login').hidden=false;['check','ticket','dashboard'].forEach(k=>{if($(k))$(k).hidden=true;});}if(!j.ok)throw Object.assign(Error(j.error||'操作失敗'),{status:r.status});if(j.serverNow)serverDelta=j.serverNow-Date.now();return j;}
async function startGoogle(cb){try{const r=await fetch('/api/campcheck',{cache:'no-store'}),j=await r.json();if(!j.clientId)throw Error(j.error||'Google 登入尚未設定');for(let i=0;i<50&&!window.google?.accounts?.id;i++)await new Promise(r=>setTimeout(r,100));if(!window.google?.accounts?.id)throw Error('無法載入 Google 登入，請使用 Safari 或 Chrome');google.accounts.id.initialize({client_id:j.clientId,callback:async res=>{token=res.credential;try{await cb();}catch(e){msg(e.message);}finally{token='';}}});google.accounts.id.renderButton($('google'),{theme:'outline',size:'large',text:'signin_with',locale:'zh-TW'});}catch(e){msg(e.message);}}
async function logout(){try{await api('studentLogout');token='';window.google?.accounts?.id?.disableAutoSelect();location.reload();}catch(e){msg(e.message);}}

const places={1:'1F 腓利門書房',4:'4F 宣道處',7:'7F 主展場'};
const routes={1:[1,4,7],2:[4,7,1],3:[7,1,4]};
function schedule(m){let route=routes[m.am]||[];const stops=route.length?route.map(n=>places[n]):['請洽同工','請洽同工','請洽同工'];return [
['10:40','11:05','全體簡報分享','臺灣總會｜依同工指引'],['11:05','11:09','前往第一站',stops[0]],['11:09','11:24','第一站導覽',stops[0]],['11:24','11:27','樓層移動',stops[1]],['11:27','11:42','第二站導覽',stops[1]],['11:42','11:45','樓層移動',stops[2]],['11:45','11:57','第三站導覽',stops[2]],['11:57','12:00','前往用餐','臺灣總會 B1'],['12:00','12:30','午餐','臺灣總會 B1'],['12:30','13:00','前往伸港教會','車程'],['13:00','16:00','下午活動',m.place||'伸港教會']];}
function eventClock(){const now=new Date(Date.now()+serverDelta),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);let p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`,clock:`${p.hour}:${p.minute}:${p.second}`};}
