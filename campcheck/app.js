let me=null,roster=[],selected='',onsite=false,filter='all',busy=false;
const hash=new URLSearchParams(location.hash.slice(1));if(hash.get('code')){sessionStorage.setItem('campcheck_code',hash.get('code'));history.replaceState(null,'',location.pathname+location.search);}
const STAFF_ROLES={
  黃琮道:[1,'第一組帶隊'],呂昕雅:[2,'第二組帶隊'],林彤穎:[3,'第三組帶隊'],
  黃畀予:[0,'7F 介紹'],蔡基秀:[0,'7F 介紹'],
  黃政偉:[0,'10:40 1F 開場、4F／3F 介紹'],黃韻涵:[0,'4F／3F 介紹']
};
function assignStaffRole(person){
  if(person?.team!=='大哥姊')return person;
  const [am,role]=STAFF_ROLES[person.name]||[0,'依同工安排'];
  return {...person,am,pm:0,role};
}
let lastSchedule='';
function updateClock(){
  if(!me)return;
  const clock=eventClock();
  $('clock').textContent=clock.clock;
  const key=[clock.date,clock.time,me.am,me.role].join('|');
  if(key===lastSchedule)return;
  lastSchedule=key;
  const {entries,current,next,state}=scheduleStatus(me.am,clock);
  const hostFloor=me.role?.startsWith('7F')?'總會 7F':me.role?.includes('4F／3F')?'總會 4F → 3F':'';
  if(hostFloor&&!me.am){
    const hostSlot=entries.find(entry=>entry[0]==='11:00');
    hostSlot[2]='接待各組｜'+me.role;
    hostSlot[3]=hostFloor;
  }
  const note=state==='before'?'活動尚未開始':state==='finished'?'活動已結束':'伸港教會詳細時程待公告';
  $('current').replaceChildren();
  const heading=document.createElement('strong');
  heading.textContent=current?.[3]||note;
  $('current').append(heading);
  if(current)$('current').append(current[2]);
  $('next').textContent=next?'下一站 '+next[0]+'｜'+next[2]+'・'+next[3]:'';
  $('amSchedule').innerHTML=entries.map(entry=>{
    const [start,end,title,place]=entry;
    return `<div class="slot ${entry===current?'active':''}"><span>${start}${end?'–'+end:''}</span><div>${esc(title)}<br><small class="muted">${esc(place)}</small></div></div>`;
  }).join('');
}
function renderRoster(){let q=$('search').value.trim().toLowerCase();let list=roster.filter(x=>(filter==='all'||filter==='staff'&&x.team==='大哥姊'||filter==='checked'&&x.checked||filter==='team'&&x.team===me.team||filter==='am'&&me.am&&x.am===me.am||filter==='pm'&&me.pm&&x.pm===me.pm)&&`${x.name} ${x.team}`.toLowerCase().includes(q));$('total').textContent=`已報到 ${roster.filter(x=>x.checked).length} / ${roster.length} 人`;$('roster').innerHTML=list.map(x=>`<div class="person"><div>${esc(x.name)} ${chip(x.team)}</div><small class="muted">${x.checked?'✓ 已到':'未到'}${x.role?'・'+esc(x.role):'・上午 '+(x.am||'—')+'・下午 '+(x.pm||'待分配')}</small></div>`).join('')||'<p class="muted">目前沒有符合條件的夥伴</p>';}
function show(j){$('login').hidden=true;me=assignStaffRole(j.me);roster=(j.roster||[]).map(assignStaffRole);if(me){$('check').hidden=true;$('ticket').hidden=false;$('person').textContent=me.name;$('personTeam').innerHTML=chip(me.team);$('at').textContent='報到時間 '+me.at.replace('T',' ').replace('+08:00','');$('am').textContent=me.am?'第 '+me.am+' 組｜'+AM_LEADERS[me.am]:me.role||'待同工分配';$('pm').textContent=me.pm?'第 '+me.pm+' 組｜'+PM_LABELS[me.pm]:me.role?'大哥姊':'待同工分配';$('pmPlace').textContent='伸港教會詳細時程待公告。';renderRoster();updateClock();}else{$('ticket').hidden=true;$('check').hidden=false;$('email').textContent=j.email||'';if(j.open===false)msg('目前尚未開放報到。');else msg();}}
let hasGoogleButton=false;
function googleLogin(){
  if(hasGoogleButton)return;
  hasGoogleButton=true;
  startGoogle(status);
}
async function status(){
  try{show(await api('status'));}
  catch(error){
    if(error.status===401){me=null;roster=[];googleLogin();return;}
    throw error;
  }
}
$('teams').innerHTML=Object.keys(TEAMS).filter(t=>t!=='大哥姊').map(t=>`<button type="button" class="team" data-team="${esc(t)}" style="${color(t)}" aria-pressed="false">${esc(t)}</button>`).join('');$('teams').addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(onsite&&selected!==b.dataset.team)$('cancelOnsite').click();selected=b.dataset.team;document.querySelectorAll('.team').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b?'true':'false');});});
$('submit').onclick=async()=>{if(busy)return;busy=true;$('submit').disabled=true;$('submit').textContent='報到處理中，請稍候…';msg();try{let j=await api('checkin',{name:$('name').value,team:$('staffCheck').checked?'大哥姊':selected,code:sessionStorage.getItem('campcheck_code')||'',onsite,school:$('school').value,major:$('major').value});if(j.onsiteRequired&&$('staffCheck').checked){msg('大哥姊名單找不到這個姓名，請核對姓名或洽活動同工。');return;}if(j.onsiteRequired){onsite=true;$('onsite').hidden=false;$('submit').textContent='現場加入並報到';}else{show(j);sessionStorage.removeItem('campcheck_code');}}catch(e){msg(e.message);$('message').scrollIntoView({block:'center',behavior:'smooth'});}finally{busy=false;$('submit').disabled=false;$('submit').textContent=onsite?'現場加入並報到':'完成報到';}};
$('cancelOnsite').onclick=()=>{onsite=false;$('onsite').hidden=true;$('submit').textContent='完成報到';};$('name').addEventListener('input',()=>{if(onsite)$('cancelOnsite').click();});$('switch').onclick=$('logout').onclick=logout;$('refresh').onclick=()=>status().catch(e=>msg(e.message));$('search').oninput=renderRoster;$('tabs').onclick=e=>{let b=e.target.closest('button');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('active',x===b));renderRoster();};setInterval(updateClock,1000);setInterval(()=>{if(me&&!document.hidden)status().catch(e=>msg(e.message));},30000);status().catch(e=>{msg(e.message);googleLogin();});

$('staffCheck').onchange=()=>{
  $('teams').hidden=$('staffCheck').checked;
  if(onsite)$('cancelOnsite').click();
};
