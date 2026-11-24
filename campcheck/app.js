let me=null,roster=[],selected='',onsite=false,filter='all',busy=false;
const hash=new URLSearchParams(location.hash.slice(1));if(hash.get('code')){sessionStorage.setItem('campcheck_code',hash.get('code'));history.replaceState(null,'',location.pathname+location.search);}
function updateClock(){if(!me)return;let t=eventClock(),s=schedule(me),index=t.date==='2026-12-06'?s.findIndex(x=>x[0]<=t.time&&t.time<x[1]):-1;$('clock').textContent=t.clock;let title,place,next;
if(index>=0){let cur=s[index];title=cur[2];place=cur[3];next=s[index+1];$('current').innerHTML=`<small>${cur[0]}–${cur[1]} ｜ 現在應在</small><strong>${esc(place)}</strong>${esc(title)}`;}
else{const before=t.date<'2026-12-06'||(t.date==='2026-12-06'&&t.time<'10:40');$('current').innerHTML=before?'<strong>活動尚未開始</strong>12/6 10:40 全體簡報分享':'<strong>今日活動已結束</strong>感謝你的參與！';next=before?s[0]:null;}
$('next').textContent=next?`下一站 ${next[0]}｜${next[2]}・${next[3]}`:'';
const render=(x,i)=>`<div class="slot ${index===i?'active':''}"><span>${x[0]}–${x[1]}</span><div>${esc(x[2])}<br><small class="muted">${esc(x[3])}</small></div></div>`;$('amSchedule').innerHTML=s.slice(0,9).map(render).join('');$('pmSchedule').innerHTML=s.slice(9).map((x,i)=>render(x,i+9)).join('');}
function renderRoster(){let q=$('search').value.trim().toLowerCase();let list=roster.filter(x=>(filter==='all'||filter==='checked'&&x.checked||filter==='team'&&x.team===me.team||filter==='am'&&me.am&&x.am===me.am||filter==='pm'&&me.pm&&x.pm===me.pm)&&`${x.name} ${x.team}`.toLowerCase().includes(q));$('total').textContent=`已報到 ${roster.filter(x=>x.checked).length} / ${roster.length} 人`;$('roster').innerHTML=list.map(x=>`<div class="person"><div>${esc(x.name)} ${chip(x.team)}</div><small class="muted">${x.checked?'✓ 已到':'未到'}・上午 ${x.am||'—'}・下午 ${x.pm||'待分配'}</small></div>`).join('')||'<p class="muted">目前沒有符合條件的夥伴</p>';}
function show(j){$('login').hidden=true;me=j.me;roster=j.roster||[];if(me){$('check').hidden=true;$('ticket').hidden=false;$('person').textContent=me.name;$('personTeam').innerHTML=chip(me.team);$('at').textContent='報到時間 '+me.at.replace('T',' ').replace('+08:00','');$('am').textContent=me.am?`第 ${me.am} 組`:'待同工分配';$('pm').textContent=me.pm?`第 ${me.pm} 組`:'待同工分配';$('pmPlace').textContent=me.place?`下午集合位置：${me.place}`:'下午分組及集合位置以同工公告為準。';renderRoster();updateClock();}else{$('ticket').hidden=true;$('check').hidden=false;$('email').textContent=j.email||'';if(j.open===false)msg('目前尚未開放報到，請於活動當天掃描現場 QR Code。');else if(!sessionStorage.getItem('campcheck_code'))msg('請掃描現場 QR Code 完成報到。');}}
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
$('teams').innerHTML=Object.keys(TEAMS).map(t=>`<button type="button" class="team" data-team="${esc(t)}" style="${color(t)}" aria-pressed="false">${esc(t)}</button>`).join('');$('teams').addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(onsite&&selected!==b.dataset.team)$('cancelOnsite').click();selected=b.dataset.team;document.querySelectorAll('.team').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b?'true':'false');});});
$('submit').onclick=async()=>{if(busy)return;busy=true;$('submit').disabled=true;msg();try{let j=await api('checkin',{name:$('name').value,team:selected,code:sessionStorage.getItem('campcheck_code')||'',onsite,school:$('school').value,major:$('major').value});if(j.onsiteRequired){onsite=true;$('onsite').hidden=false;$('submit').textContent='現場加入並報到';}else{show(j);sessionStorage.removeItem('campcheck_code');}}catch(e){msg(e.message);}finally{busy=false;$('submit').disabled=false;}};
$('cancelOnsite').onclick=()=>{onsite=false;$('onsite').hidden=true;$('submit').textContent='完成報到';};$('name').addEventListener('input',()=>{if(onsite)$('cancelOnsite').click();});$('switch').onclick=$('logout').onclick=logout;$('refresh').onclick=()=>status().catch(e=>msg(e.message));$('search').oninput=renderRoster;$('tabs').onclick=e=>{let b=e.target.closest('button');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('active',x===b));renderRoster();};setInterval(updateClock,1000);setInterval(()=>{if(me&&!document.hidden)status().catch(e=>msg(e.message));},30000);status().catch(e=>{msg(e.message);googleLogin();});
