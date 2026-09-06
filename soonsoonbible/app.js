import {books,bookName,parseQuery,formatCopy,verseKey,passageKey} from './core.js?v=20260906-copy';
import {track,newSearch} from './telemetry.js';
const $=s=>document.querySelector(s),el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const button=(text,cls,fn,label)=>{const b=el('button',cls,text);b.type='button';if(label)b.setAttribute('aria-label',label);b.addEventListener('click',fn);return b;};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let prefs={format:'legacy',size:'normal',theme:'system',...read('ssb-prefs',{})},recent=read('ssb-history',[]),scope='all';
if(prefs.copyStyleVersion!==2){prefs.format='legacy';prefs.copyStyleVersion=2;save('ssb-prefs',prefs);}
let ready=false,chapters={},results=[],query=null,selection=new Map(),shown=0,searchId=null,generation=0,pending=null,anchor=null,rangeMode=false,seenChapters=new Set(),observer;
const worker=new Worker(new URL('./search-worker.js',import.meta.url),{type:'module'});
applyPrefs();worker.postMessage({type:'load'});
worker.onmessage=({data:m})=>{if(m.type==='ready'){ready=true;chapters=m.chapters;$('#status').textContent='';if(pending){const p=pending;pending=null;run(p.raw,p.options);}else loadURL();}else if(m.type==='result'&&m.id===generation){results=m.results;searchId=newSearch(query,results.length,scope,pendingSource);renderResults();}else if(m.type==='error'){if(m.id&&m.id!==generation)return;$('#status').textContent='資料暫時無法載入。';$('#results').replaceChildren(button('重新載入','quiet',()=>{worker.postMessage({type:'load'});$('#status').textContent='正在載入經文…';}));}};
worker.onerror=()=>{$('#status').textContent='載入中斷，請重新整理後再試。';};
let pendingSource='search';
function applyPrefs(){document.documentElement.dataset.theme=prefs.theme;document.documentElement.style.setProperty('--verse-size',prefs.size==='large'?'1.4rem':prefs.size==='small'?'1.05rem':'1.2rem');}
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,2500);}
function showDialog(id){const d=$(id);d.showModal();}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom||e.clientX<r.left||e.clientX>r.right)d.close();}}));
$('#menuButton').onclick=()=>showDialog('#menu');
document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>{$('#menu').close();openPanel(b.dataset.panel);});
document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>run(b.dataset.query));
$('#searchForm').onsubmit=e=>{e.preventDefault();run($('#query').value);};
function loadURL(){const p=new URLSearchParams(location.search);scope=p.get('scope')||'all';const raw=p.get('q')||p.get('search')||p.get('keyword')||decodeURIComponent(location.hash.slice(1));if(raw)run(raw,{history:false,source:'deep_link'});else reset();}
window.addEventListener('popstate',loadURL);
function reset(){generation++;scope='all';query=null;results=[];clear();$('#query').value='';$('#results').replaceChildren();$('#main').classList.add('home');$('#homeTitle').hidden=false;$('#examples').hidden=false;$('#homeFooter').hidden=false;$('#chapterNav').hidden=true;$('#status').textContent='';$('#filterBadge').hidden=true;document.title='咻咻查聖經';}
$('.brand').onclick=e=>{e.preventDefault();history.pushState({},'',location.pathname);reset();$('#query').focus();};
function remember(q){if(!['bible','keyword'].includes(q.kind))return;recent=[{query:q.label,key:q.key,scope},...recent.filter(r=>r.key!==q.key||r.scope!==scope)].slice(0,20);save('ssb-history',recent);}
function run(raw,options={}){
  const q=parseQuery(raw);if(q.kind==='empty'){$('#query').focus();return;}
  $('#query').value=raw;$('#suggestions').hidden=true;
  if(!ready){pending={raw,options};$('#status').textContent='正在載入經文…';return;}
  query=q;if(q.kind==='bible')$('#query').value=q.label;clear();seenChapters=new Set();observer?.disconnect();$('#results').replaceChildren();$('#chapterNav').hidden=true;
  $('#main').classList.remove('home');$('#homeTitle').hidden=true;$('#examples').hidden=true;$('#homeFooter').hidden=true;
  $('#status').textContent='';$('#filterBadge').hidden=scope==='all'||q.kind!=='keyword';$('#filterBadge').textContent='範圍：'+(scope==='old'?'舊約':scope==='new'?'新約':bookName(scope));
  if(options.history!==false){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('q',q.kind==='bible'?q.label:raw.trim());if(scope!=='all')u.searchParams.set('scope',scope);history.pushState({},'',u);}
  if(options.remember!==false)remember(q);
  document.title=(q.label||raw)+' · 咻咻查聖經';pendingSource=options.source||'search';
  if(matchMedia('(max-width:600px)').matches)$('#query').blur();window.scrollTo({top:0,behavior:'instant'});
  if(q.kind==='error'){generation++;searchId=newSearch(q,0,scope,pendingSource);const empty=el('div','empty');empty.append(el('h2','',q.label),el('p','','也可以輸入「馬太福音5章」或「聖靈 保惠師」。'));$('#results').append(empty);return;}
  $('#status').textContent='搜尋中…';worker.postMessage({type:'search',id:++generation,query:q,scope});
}
$('#filterBadge').onclick=()=>openPanel('advanced');
function highlight(text){const f=document.createDocumentFragment();if(query.kind!=='keyword'){f.append(document.createTextNode(text));return f;}const terms=query.includes.sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));const re=new RegExp('('+terms.join('|')+')','gi');let last=0;for(const m of text.matchAll(re)){f.append(document.createTextNode(text.slice(last,m.index)),el('mark','',m[0]));last=m.index+m[0].length;}f.append(document.createTextNode(text.slice(last)));return f;}
function renderResults(){
  $('#status').textContent='';$('#results').replaceChildren();shown=0;
  if(!results.length){const d=el('div','empty');d.append(el('h2','','沒有找到經文'),el('p','',query.kind==='bible'?'請確認章節是否存在，或從經卷選單直接選擇。':'試著減少一個詞，或在進階搜尋切換範圍。'),button(query.kind==='bible'?'選經卷':'調整搜尋','quiet',()=>openPanel(query.kind==='bible'?'books':'advanced')));$('#results').append(d);return;}
  const head=el('div','result-head'),titles=el('div');titles.append(el('h2','',query.kind==='keyword'?`「${query.label}」`:query.label));if(results.length>1)titles.append(el('p','sub',`${results.length.toLocaleString()} 節`));head.append(titles);
  const actions=el('div','result-actions');
  if(results.length>1){actions.append(button(query.kind==='bible'?'複製整段':'全選','quiet',()=>query.kind==='bible'?copy(results,'passage'):selectAll()));actions.append(button('•••','icon',resultMenu,'結果選項'));}head.append(actions);$('#results').append(head);
  observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const v=results[+entry.target.dataset.index];const k=v.book+' '+v.chapter;if(!seenChapters.has(k)){seenChapters.add(k);track('chapter_view',{search_id:searchId,book:v.book,chapter:v.chapter,query:k,source:query.kind==='keyword'?'keyword_results':'reference'});}observer.unobserve(entry.target);}}, {threshold:.15});
  appendResults();renderNav();
}
function appendResults(){
  $('#loadMore')?.remove();const end=Math.min(shown+60,results.length),single=results.length===1;
  for(let i=shown;i<end;i++){
    const v=results[i],row=el('article','verse'+(single?' single':''));row.id='verse-'+v.id;row.dataset.index=i;row.dataset.id=v.id;
    if(!single){const select=button(String(v.verse),'select-verse',e=>toggle(i,e.shiftKey),`選取 ${bookName(v.book)} ${v.chapter}:${v.verse}`);select.setAttribute('aria-pressed',selection.has(v.id));row.append(select);}
    const body=el('div');if(query.kind==='keyword'||!query.book||query.endChapter&&v.chapter!==query.chapter){body.append(button(`${bookName(v.book)} ${v.chapter}:${v.verse}`,'verse-ref',()=>run(`${v.book} ${v.chapter}:${v.verse}`,{source:'result_reference'})));}
    const p=el('p');p.append(highlight(v.text));body.append(p);row.append(body);
    if(single){const a=el('div','single-copy');a.append(button('複製經文','primary',()=>copy([v],'single')),button('閱讀整章','quiet',()=>run(`${v.book} ${v.chapter}`,{source:'read_chapter'})),button('•••','icon',resultMenu,'經文選項'));row.append(a);}else row.append(button('複製','copy-verse',()=>copy([v],'single'),`複製 ${bookName(v.book)} ${v.chapter}:${v.verse}`));
    $('#results').append(row);observer.observe(row);
  }
  shown=end;syncSelection();if(shown<results.length){const b=button(`顯示更多（${shown} / ${results.length}）`,'load-more',()=>{track('search_action',{search_id:searchId,source:'load_more'});appendResults();});b.id='loadMore';$('#results').append(b);}
}
function renderNav(){const nav=$('#chapterNav');nav.replaceChildren();if(query.kind!=='bible'||!query.book)return;nav.hidden=false;const b=books.find(x=>x.id===query.book);const c=query.chapter;
  const previous=c>1?`${b.id} ${c-1}`:b.index>0?`${books[b.index-1].id} ${chapters[books[b.index-1].id]}`:null;
  const next=c<chapters[b.id]?`${b.id} ${c+1}`:b.index<65?`${books[b.index+1].id} 1`:null;
  const p=button('← 上一章','',()=>run(previous,{source:'chapter_navigation'}));p.disabled=!previous;
  const n=button('下一章 →','',()=>run(next,{source:'chapter_navigation'}));n.disabled=!next;
  nav.append(p,button(bookName(b.id),'',()=>openBooks(b.id)),n);
}
function toggle(index,shift=false){const v=results[index];if((shift||rangeMode)&&anchor!==null){const lo=Math.min(anchor,index),hi=Math.max(anchor,index);for(const entry of results.slice(lo,hi+1))selection.set(entry.id,entry);rangeMode=false;}else if(selection.has(v.id))selection.delete(v.id);else selection.set(v.id,v);anchor=index;track('verse_select',{search_id:searchId,book:v.book,chapter:v.chapter,verse_count:selection.size});syncSelection();}
function syncSelection(){document.querySelectorAll('.verse').forEach(row=>{const selected=selection.has(+row.dataset.id);row.classList.toggle('selected',selected);row.querySelector('.select-verse')?.setAttribute('aria-pressed',selected);});$('#selectionBar').hidden=!selection.size;$('#selectionCount').textContent=`已選 ${selection.size} 節`;$('#rangeButton').setAttribute('aria-pressed',rangeMode);$('#rangeButton').textContent=rangeMode?'點選結束節':'選到這節';}
function clear(){selection.clear();anchor=null;rangeMode=false;syncSelection();}
function selectAll(){results.forEach(v=>selection.set(v.id,v));track('verse_select',{search_id:searchId,verse_count:selection.size,source:'select_all'});syncSelection();}
$('#clearSelection').onclick=clear;$('#copySelection').onclick=()=>copy([...selection.values()],'selection');$('#rangeButton').onclick=()=>{rangeMode=!rangeMode;syncSelection();if(rangeMode)toast('點選最後一節的節號，即可選取整段');};
async function copy(entries,source){
  const text=formatCopy(entries,prefs.format),copySearchId=searchId;let ok=false;
  try{await navigator.clipboard.writeText(text);ok=true;}catch{const t=el('textarea');t.value=text;t.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(t);t.select();try{ok=document.execCommand('copy');}catch{}t.remove();}
  if(ok){const ranges=[];for(const id of entries.map(v=>v.id).sort((a,b)=>a-b)){const last=ranges.at(-1);if(last&&last[1]+1===id)last[1]=id;else ranges.push([id,id]);}track(entries.length===1?'verse_copy':'multi_verse_copy',{search_id:copySearchId,ranges,verse_count:entries.length,copy_format:prefs.format,source});toast(entries.length===1?'已複製經文':`已複製 ${entries.length} 節`);}else{openPanel('copyFallback');$('#panelTitle').textContent='長按文字即可複製';const t=el('textarea');t.value=text;t.style.cssText='width:100%;min-height:200px;font:inherit';$('#panelContent').append(t);t.focus();t.select();}
}
function panel(title){$('#menu').close();$('#panelTitle').textContent=title;$('#panelContent').replaceChildren();if(!$('#panel').open)showDialog('#panel');return $('#panelContent');}
function resultMenu(){const c=panel('經文選項');const list=el('div','menu-list');list.append(button('選取全部經文','',()=>{selectAll();$('#panel').close();}),button('複製全部經文','',()=>copy(results,'all')),button('複製此搜尋連結','',async()=>{try{await navigator.clipboard.writeText(location.href);toast('已複製連結');}catch{toast('請複製瀏覽器網址');}}),button('複製格式','',()=>openPanel('settings')));c.append(list);}
function openBooks(id){const c=panel(id?bookName(id):'選經卷');if(id){c.append(button('← 所有經卷','quiet',()=>openBooks()));const grid=el('div','chapter-grid');for(let n=1;n<=(chapters[id]||1);n++)grid.append(button(n,'',()=>{$('#panel').close();run(`${id} ${n}`,{source:'book_picker'});}));c.append(grid);return;}const tabs=el('div','book-tabs'),grid=el('div','book-grid');let testament=query?.book?books.find(b=>b.id===query.book).index<39?'old':'new':'new';function draw(){grid.replaceChildren();books.filter(b=>testament==='old'?b.index<39:b.index>=39).forEach(b=>grid.append(button(b.short,'',()=>openBooks(b.id),b.name)));tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.testament===testament));}for(const [key,label] of [['old','舊約'],['new','新約']]){const b=button(label,'',()=>{testament=key;draw();});b.dataset.testament=key;tabs.append(b);}c.append(tabs,grid);draw();}
function field(label,options,value,fn){const row=el('label','field');row.append(el('span','',label));const s=el('select');for(const [val,text] of options){const o=el('option','',text);o.value=val;s.append(o);}s.value=value;s.onchange=()=>fn(s.value);row.append(s);return row;}
function openPanel(type){
  if(type==='books'){openBooks();return;}
  if(type==='history'){const c=panel('最近搜尋');if(!recent.length){c.append(el('p','help','搜尋紀錄只保存在這部裝置。'));return;}const list=el('ul','history-list');recent.forEach(r=>{const li=el('li');li.append(button(r.query,'history-query',()=>{$('#panel').close();scope=r.scope||'all';run(r.query,{source:'history'});}),button('×','icon',()=>{recent=recent.filter(v=>v!==r);save('ssb-history',recent);openPanel('history');},`刪除 ${r.query}`));list.append(li);});c.append(list,button('清除搜尋紀錄','quiet',()=>{recent=[];save('ssb-history',recent);openPanel('history');}));}
  else if(type==='advanced'){const c=panel('進階搜尋');c.append(el('p','help','多個詞用空格隔開，會找到同時包含所有詞的經文。用減號排除不需要的詞。'),el('pre','copy-preview','聖靈 保惠師\n信心 -小信'),field('關鍵字範圍',[['all','全部聖經'],['old','舊約'],['new','新約'],...books.map(b=>[b.id,b.name])],scope,v=>scope=v),button('套用並搜尋','primary',()=>{$('#panel').close();if($('#query').value)run($('#query').value,{source:'advanced'});}));}
  else if(type==='settings'){const c=panel('閱讀與複製');c.append(field('字體大小',[['small','較小'],['normal','標準'],['large','較大']],prefs.size,v=>{prefs.size=v;applyPrefs();save('ssb-prefs',prefs);}),field('外觀',[['system','跟隨系統'],['light','淺色'],['dark','深色']],prefs.theme,v=>{prefs.theme=v;applyPrefs();save('ssb-prefs',prefs);}),field('複製格式',[['paragraph','出處在前，經文分行'],['each','每節附出處'],['text','僅經文'],['legacy','簡寫出處，如 (太三2)']],prefs.format,v=>{prefs.format=v;save('ssb-prefs',prefs);preview.textContent=results.length?formatCopy(results.slice(0,2),prefs.format):'搜尋經文後可預覽複製格式。';}));const preview=el('pre','copy-preview',results.length?formatCopy(results.slice(0,2),prefs.format):'搜尋經文後可預覽複製格式。');c.append(preview);}
  else if(type==='help'){const c=panel('使用說明與隱私');const d=el('div','help');for(const t of ['直接輸入約3:16、太5:3-12、伯7.3-8.1、馬太福音5章，或任何關鍵字。','點節號選取經文。選好第一節後，點「選到這節」，再點最後一節。電腦也可按住 Shift 點節號。','按 / 或 ⌘/Ctrl K 聚焦搜尋；選取後按 ⌘/Ctrl C 複製；Esc 取消選取。經文可用網址分享。','經文沿用原站和合本資料及標點。歷史、字體與複製設定只保存在這部裝置。','我們記錄匿名搜尋與複製彙總，改善查經體驗；不建立個人檔案，不在統計資料庫保存姓名、email 或 IP。短暫搜尋識別碼用於計算轉換並在兩天內清除。','GA4 用於整體流量、裝置及互動分析。搜尋內容不送入 GA4；網址中的搜尋詞也會從 GA4 頁面資料移除。'])d.append(el('p','',t));c.append(d,field('匿名使用統計',[['on','開啟'],['off','關閉']],(()=>{try{return localStorage.getItem('ssb-analytics')||'on';}catch{return 'on';}})(),v=>{try{localStorage.setItem('ssb-analytics',v);}catch{}location.reload();}));}
  else panel('複製經文');
}
$('#query').addEventListener('focus',()=>{if(!$('#query').value&&recent.length){const c=$('#suggestions');c.replaceChildren(el('small','','最近搜尋'));for(const r of recent.slice(0,4))c.append(button(r.query,'',()=>{scope=r.scope||'all';run(r.query,{source:'history'});}));c.hidden=false;}});
$('#query').addEventListener('input',()=>$('#suggestions').hidden=true);
document.addEventListener('click',e=>{if(!e.target.closest('.search-area'))$('#suggestions').hidden=true;});
document.addEventListener('keydown',e=>{const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);if((e.key==='/'&&!typing)||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k')){e.preventDefault();$('#query').focus();$('#query').select();}if(e.key==='Escape'&&!$('dialog[open]')){$('#suggestions').hidden=true;clear();}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='c'&&!typing&&selection.size&&!window.getSelection()?.toString()){e.preventDefault();copy([...selection.values()],'keyboard');}});
