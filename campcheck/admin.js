let stats, lastRender='';
const card=(name,value,extra='')=>`<div class="stat"><span>${esc(name)}</span><strong>${esc(value)}</strong>${extra}</div>`;
function render(){
  const clock=eventClock();
  $('clock').textContent=clock.clock;
  if(!stats)return;
  const key=clock.date+' '+clock.time+' '+stats.serverNow;
  if(lastRender===key)return;
  lastRender=key;
  const staff=stats.staff||stats.teams.find(t=>t.team==='大哥姊')||{checked:0,total:0};
  $('stats').innerHTML=[['學生已到／原報名',stats.original-stats.missing+'／'+stats.original],['學生未到',stats.missing],
    ['學生現場新增',stats.onsite-(stats.staff?0:staff.total)],['大哥姊已到／名單',staff.checked+'／'+staff.total]]
    .map(([name,value])=>card(name,value)).join('');
  $('teams').innerHTML=stats.teams.filter(t=>t.team!=='大哥姊').map(t=>card(t.team,t.checked+'／'+t.total)).join('');
  $('morning').innerHTML=stats.am.filter(g=>g.group).map(g=>{
    const {current,next}=scheduleStatus(g.group,clock);
    const label='第 '+g.group+' 組｜'+AM_LEADERS[g.group];
    const details=(current?'現在 '+current[3]+'｜'+current[2]:'')+(next?'　下一站 '+next[0]+' '+next[3]:'');
    return card(label,g.checked+'／'+g.total,`<small>${esc(details)}</small>`);
  }).join('');
  $('afternoon').innerHTML=stats.pm.filter(g=>g.group<=6).sort((a,b)=>(a.group||7)-(b.group||7))
    .map(g=>card(g.group?'第 '+g.group+' 組｜'+PM_LABELS[g.group]:'待分配',g.checked+'／'+g.total)).join('');
}
async function refresh(){
  try{
    stats=await api('publicStats');
    $('updated').textContent='更新於 '+eventClock().clock+'，每 30 秒更新';
    msg(); render();
  }catch(error){msg(error.message);}
}
refresh();
setInterval(refresh,30000);
setInterval(render,1000);
