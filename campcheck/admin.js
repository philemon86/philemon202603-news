let rows=[],code='',stats=null,busy=false,unlocked=false,batch=[],epoch=0;
function renderRows(){let q=$('query').value.toLowerCase().trim(),f=$('filter').value,t=$('teamFilter').value;const list=rows.filter(x=>(!t||x.team===t)&&(f==='all'||f==='checked'&&x.checked||f==='missing'&&!x.checked||f==='onsite'&&x.source==='現場新增'||f==='unassigned'&&!x.pm&&x.team!=='大哥姊')&&[x.name,x.team,x.school,x.major,x.email].join(' ').toLowerCase().includes(q));$('rows').innerHTML=list.map(x=>`<tr data-id="${esc(x.id)}"><td>${esc(x.name)}<br>${chip(x.team)}</td><td>${esc(x.school)}<br><small>${esc(x.major)}</small></td><td>${x.checked?'✓ 已報到':'未報到'}<br><small>${esc(x.source)}<br>${esc(x.at)}</small></td><td>${esc(x.email||'—')}</td><td>${['水沙連','其他／未加入'].includes(x.team)?`<select aria-label="上午組別" class="am"><option value="">請選擇</option>${[1,2,3].map(g=>`<option value="${g}" ${g===x.am?'selected':''}>第 ${g} 組</option>`).join('')}</select><button class="btn sub" data-op="am">儲存</button>`:x.team==='大哥姊'?'不列入學生分組':x.am?'第 '+x.am+' 組':'待分配'}</td><td>${x.team==='大哥姊'?'不列入學生分組':`<select aria-label="下午組別" class="pm">${Array.from({length:8},(_,i)=>`<option value="${i}" ${i===x.pm?'selected':''}>${i?'第 '+i+' 組':'未分配'}</option>`).join('')}</select><input aria-label="個別集合位置" class="place" value="${esc(x.place)}" placeholder="集合位置"><button class="btn sub" data-op="assign">儲存</button>`}</td><td><button class="btn ${x.checked?'sub':''}" data-op="${x.checked?'undo':'check'}">${x.checked?'撤銷':'代報到'}</button></td></tr>`).join('')||'<tr><td colspan="7">無符合資料</td></tr>';}
$('export').onclick=()=>{const columns=['報名編號','姓名','團契','學校','科系','報到狀態','報到時間','Google Email','上午組','下午組','下午集合位置','來源'];const cell=x=>'"'+String(x??'').replace(/^(?:\s*[=+@-]|[\t\r\n])/,"'$&").replace(/"/g,'""')+'"';const csv='\ufeff'+[columns,...rows.map(x=>[x.id,x.name,x.team,x.school,x.major,x.checked?'已報到':'未報到',x.at,x.email,x.am,x.pm,x.place,x.source])].map(r=>r.map(cell).join(',')).join('\r\n');let u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='福音成功嶺-同工報到名單.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
function renderClock(){
  const time=eventClock();
  $('clock').textContent=time.clock;
  if(!stats)return;
  const key=time.date+' '+time.time;
  if(renderClock.key===key&&renderClock.stats===stats)return;
  renderClock.key=key;renderClock.stats=stats;
  const card=(period,g)=>{
    const itinerary=schedule({am:period==='上午'?g.group:0,place:g.place});
    const index=time.date==='2026-12-06'?itinerary.findIndex(s=>s[0]<=time.time&&time.time<s[1]):-1;
    const before=time.date<'2026-12-06'||time.date==='2026-12-06'&&time.time<itinerary[0][0];
    const now=itinerary[index],next=before?itinerary[0]:index>=0?itinerary[index+1]:null;
    return `<div class="stat"><span>${period}${g.group?'第 '+g.group+' 組':'待分配'}</span>
      <strong>${g.checked} / ${g.total}</strong><small>已到／組別人數</small>
      <div>${esc(now?now[2]+' · '+now[3]:before?'活動尚未開始':'活動已結束')}</div>
      ${next?`<small>下一站 ${esc(next[0]+' '+next[3])}</small>`:''}</div>`;
  };
  $('groups').innerHTML=[...stats.am.slice(1),stats.am[0]].map(g=>card('上午',g)).join('')
    +[...stats.pm.slice(1),stats.pm[0]].map(g=>card('下午',g)).join('');
}
async function loadPublic(){
  try{
    stats=await api('publicStats');
    const {original,checked,missing,onsite}=stats;
    $('stats').innerHTML=[['原始報名',original],['已報到（含現場）',checked],['原報名未到',missing],['現場新增',onsite],
      ['原報名報到率',original?Math.round(100*(original-missing)/original)+'%':'—']]
      .map(([name,value])=>`<div class="stat"><span>${esc(name)}</span><strong>${esc(value)}</strong></div>`).join('');
    $('teams').innerHTML=stats.teams.map(({team,total,checked})=>
      `<div class="stat">${chip(team)}<strong>${checked} / ${total}</strong><progress max="${total||1}" value="${checked}" aria-label="${esc(team)}報到進度"></progress></div>`
    ).join('');
    $('updated').textContent='更新於 '+eventClock().clock+'，每 30 秒更新';
    renderClock();
  }catch(e){$('updated').textContent='統計更新失敗 · '+e.message;}
}
const drafts=new Map();
function drawRows(){
  renderRows();
  for(const tr of $('rows').querySelectorAll('tr[data-id]')){
    for(const [field,value] of Object.entries(drafts.get(tr.dataset.id)||{})){
      const control=tr.querySelector('.'+field);
      if(control)control.value=value;
    }
  }
}
function lock(){
  epoch++;
  unlocked=false;
  rows=[];
  code='';
  drafts.clear();
  preview([]);
  $('rows').replaceChildren();
  $('management').hidden=true;
  $('unlock').hidden=false;
}
function showAdmin(j){
  rows=j.rows;
  code=j.code;
  unlocked=true;
  drawRows();
  $('management').hidden=false;
  $('unlock').hidden=true;
  $('login').hidden=true;
}
async function loadAdmin(silent=false){
  const current=epoch;
  try{const j=await api('adminList');if(current===epoch)showAdmin(j);}
  catch(e){if(current!==epoch)return;if(e.status===401)lock();if(!silent)msg(e.message);}
}
async function change(data,button){
  if(!unlocked||busy)return false;
  busy=true;
  button.disabled=true;
  const current=++epoch;
  try{
    const j=await api('adminUpdate',data);
    if(current!==epoch)return false;
    const draft=drafts.get(data.id);
    for(const field of data.op==='am'?['am']:data.op==='assign'?['pm','place']:[]){
      if(draft?.[field]===data[field])delete draft[field];
    }
    showAdmin(j);
    loadPublic();
    msg('已儲存');
    return true;
  }catch(e){if(e.status===401)lock();msg(e.message);return false;}
  finally{busy=false;button.disabled=false;}
}
$('unlock').onclick=()=>{$('login').hidden=!$('login').hidden;if(!$('login').hidden)$('password').focus();};
$('login').onsubmit=async e=>{
  e.preventDefault();
  if(busy)return;
  busy=true;
  epoch++;
  const button=e.currentTarget.querySelector('button');
  button.disabled=true;
  try{await api('adminLogin',{password:$('password').value});msg();await loadAdmin();}
  catch(error){msg(error.message);}
  finally{busy=false;button.disabled=false;$('password').value='';}
};
$('logout').onclick=async()=>{
  lock();
  try{await api('adminLogout');msg('管理模式已鎖定');}catch(e){msg(e.message);}
};
$('refresh').onclick=()=>{if(!busy)loadAdmin();};
const teamOptions=Object.keys(TEAMS).map(t=>`<option>${esc(t)}</option>`).join('');
$('teamFilter').innerHTML+=teamOptions;
$('addTeam').innerHTML=teamOptions;
$('placeGroup').innerHTML=Array.from({length:7},(_,i)=>`<option value="${i+1}">第 ${i+1} 組</option>`).join('');
$('placeGroup').onchange=()=>{$('groupLocation').value=stats?.pm[Number($('placeGroup').value)]?.place||'';};
$('query').oninput=drawRows;
$('filter').onchange=drawRows;
$('teamFilter').onchange=drawRows;
$('rows').oninput=e=>{
  const field=['am','pm','place'].find(name=>e.target.classList.contains(name));
  if(!field)return;
  const id=e.target.closest('tr').dataset.id;
  if(!drafts.has(id))drafts.set(id,{});
  drafts.get(id)[field]=e.target.value;
};
$('rows').onclick=e=>{
  const button=e.target.closest('button[data-op]');
  if(!button||busy)return;
  const tr=button.closest('tr'),op=button.dataset.op;
  if(['undo','check'].includes(op)&&!confirm(op==='undo'?'確定撤銷報到？':'確定替這位人員報到？'))return;
  change({id:tr.dataset.id,op,am:tr.querySelector('.am')?.value,pm:tr.querySelector('.pm')?.value,place:tr.querySelector('.place')?.value},button);
};
for(const op of ['add','groupPlace']){
  $(op).onsubmit=async e=>{
    e.preventDefault();
    const form=e.currentTarget;
    if(!confirm(op==='add'?'確定新增人員並報到？':'確定更新全組集合地點？'))return;
    if(await change({op,...Object.fromEntries(new FormData(form))},form.querySelector('button'))&&op==='add')form.reset();
  };
}
function preview(assignments){
  batch=assignments;
  $('commitBatch').hidden=!batch.length;
  $('batchPreview').innerHTML=batch.length?`<p>待確認 ${batch.length} 筆</p><ul>${batch.map(({id,pm})=>
    `<li>${esc(rows.find(r=>r.id===id)?.name)} · ${pm?'第 '+pm+' 組':'待分配'}</li>`).join('')}</ul>`:'';
}
$('suggest').onclick=()=>{
  const groups=Array.from({length:7},(_,i)=>({pm:i+1,count:rows.filter(r=>r.pm===i+1).length,majors:new Map()}));
  for(const row of rows.filter(r=>r.pm&&r.major)){
    const majors=groups[row.pm-1].majors;
    majors.set(row.major,(majors.get(row.major)||0)+1);
  }
  preview(rows.filter(r=>!r.pm&&r.team!=='大哥姊').sort((a,b)=>a.major.localeCompare(b.major,'zh-TW')).map(r=>{
    const min=Math.min(...groups.map(g=>g.count));
    const group=groups.filter(g=>g.count<=min+1)
      .sort((a,b)=>(b.majors.get(r.major)||0)-(a.majors.get(r.major)||0)||a.count-b.count)[0];
    group.count++;
    if(r.major)group.majors.set(r.major,(group.majors.get(r.major)||0)+1);
    return {id:r.id,pm:group.pm};
  }));
  if(!batch.length)msg('目前沒有人員待分配。');
};
function parseCsv(input){
  input=input.replace(/^\ufeff/,'');
  const result=[];
  let row=[],value='',quoted=false;
  for(let i=0;i<input.length;i++){
    const char=input[i];
    if(char==='"'){
      if(quoted&&input[i+1]==='"'){value+='"';i++;}
      else quoted=!quoted;
    }else if(!quoted&&char===','){row.push(value);value='';}
    else if(!quoted&&(char==='\n'||char==='\r')){
      if(char==='\r'&&input[i+1]==='\n')i++;
      row.push(value);if(row.some(Boolean))result.push(row);row=[];value='';
    }else value+=char;
  }
  if(quoted)throw Error('CSV 引號未結束');
  row.push(value);
  if(row.some(Boolean))result.push(row);
  return result;
}
$('import').onchange=async e=>{
  const input=e.target,file=input.files[0],current=epoch;
  if(!file)return;
  try{
    if(file.size>256000)throw Error('CSV 檔案太大');
    const [head,...records]=parseCsv(await file.text());
    if(current!==epoch)return;
    const idIndex=head?.indexOf('報名編號')??-1,pmIndex=head?.indexOf('下午組')??-1;
    if(idIndex<0||pmIndex<0)throw Error('CSV 必須有報名編號及下午組欄位');
    const ids=new Set();
    preview(records.map((record,i)=>{
      const id=record[idIndex],pm=record[pmIndex]?.trim();
      if(!rows.some(r=>r.id===id)||ids.has(id)||!/^[0-7]$/.test(pm||''))throw Error('CSV 第 '+(i+2)+' 列資料有誤');
      ids.add(id);
      return {id,pm:Number(pm)};
    }));
  }catch(error){if(current===epoch){preview([]);msg(error.message);}}
  finally{input.value='';}
};
$('commitBatch').onclick=async e=>{
  if(batch.length&&confirm('確認寫入 '+batch.length+' 筆下午分組？')){
    if(await change({op:'batch',assignments:batch},e.currentTarget))preview([]);
  }
};
function checkinLink(){
  if(!code)throw Error('現場報到驗證碼尚未設定');
  return 'https://www.philemon.com.tw/campcheck/#code='+encodeURIComponent(code);
}
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(checkinLink());msg('已複製現場報到連結');}catch(e){msg(e.message);}};
$('qr').onclick=()=>{
  try{
    const qr=qrcode(0,'Q');
    qr.addData(checkinLink());qr.make();
    const scale=24,pad=4,count=qr.getModuleCount();
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=(count+2*pad)*scale;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#000';
    for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr.isDark(y,x))ctx.fillRect((pad+x)*scale,(pad+y)*scale,scale,scale);
    const link=document.createElement('a');
    link.href=canvas.toDataURL('image/png');link.download='福音成功嶺-現場報到.png';link.click();
  }catch(e){msg(e.message);}
};
setInterval(loadPublic,30000);
setInterval(()=>{if(unlocked&&!busy&&!document.hidden)loadAdmin(true);},30000);
setInterval(renderClock,1000);
loadPublic();
loadAdmin(true);
