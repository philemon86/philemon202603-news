import { aliases, books } from './books.js';
export { books };
const aliasMap = {...aliases, ...Object.fromEntries(books.map(b=>[b.id.toLowerCase(),b.id])), '约':'Jhn','约翰福音':'Jhn','马太福音':'Mat','诗篇':'Psm','圣经':'', 'John':'Jhn','Matthew':'Mat','Psalms':'Psm','Psalm':'Psm'};
const names=Object.keys(aliasMap).filter(k=>aliasMap[k]).sort((a,b)=>b.length-a.length);
const nums='零〇一二兩三四五六七八九十百';
function number(s) {
  if (/^\d+$/.test(s)) return Number(s);
  if(!s||![...s].every(c=>nums.includes(c))) return NaN;
  const values={'零':0,'〇':0,'一':1,'二':2,'兩':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
  let total=0,n=0; for(const c of s){if(c==='十'||c==='百'){total+=(n||1)*(c==='十'?10:100);n=0;}else n=values[c];}return total+n;
}
export function normalizeInput(raw) {return String(raw||'').normalize('NFKC').trim().replace(/[‐‑–—−~～至到]/g,'-').replace(/[：.．。,，]/g,':').replace(/\s+/g,' ');}
export function bookName(id){return books.find(b=>b.id===id)?.name||id;}
export function refLabel(q){
  if(q.kind!=='bible')return q.label||q.key;
  const prefix=q.book?bookName(q.book):'全經卷';
  const start=`${q.chapter}${q.verse?':'+q.verse:''}`;
  const end=q.endChapter?(q.endChapter===q.chapter&&q.verse&&q.endVerse?String(q.endVerse):`${q.endChapter}${q.endVerse?':'+q.endVerse:''}`):'';
  return `${prefix} ${start}${end?'-'+end:(!q.verse?(q.book==='Psm'?' 篇':' 章'):'')}`;
}
export function parseQuery(raw){
  const source=normalizeInput(raw); if(!source)return {kind:'empty'};
  if(source.length>160)return {kind:'error',code:'too_long',label:'搜尋內容請控制在 160 字以內。'};
  let compact=source.replace(/\s/g,'').replace(/^\*/,''),book=null;
  const alias=names.find(n=>compact.toLowerCase().startsWith(n.toLowerCase()) && (!/[a-z]$/i.test(n)||!/[a-z]/i.test(compact[n.length]||'')));
  if(alias){book=aliasMap[alias];compact=compact.slice(alias.length);}
  const looksRef=book && (!compact || /^[第\d零〇一二兩三四五六七八九十百:章篇節-]/.test(compact)) || /^\d+[:]/.test(compact);
  if(looksRef){
    if(!compact && book)compact='1';
    compact=compact.replace(/第/g,'').replace(/([零〇一二兩三四五六七八九十百])(?=\d)/g,'$1:').replace(/[章篇](?=-|$)/g,'').replace(/[章篇]/g,':').replace(/節/g,'');
    const parts=compact.split('-');
    const bad=()=>({kind:'error',code:'invalid_reference',format:source.replace(/[0-9零〇一二兩三四五六七八九十百]+/g,'#'),label:'經文格式不完整。試試「約3:16」或「太5:3-12」。'});
    if(parts.length>2)return bad();
    function point(s){const p=s.split(':');if(p.length>2)return null;const a=p.map(number);return a.some(n=>!Number.isInteger(n)||n<1||n>176)?null:{chapter:a[0],verse:a[1]||null};}
    const a=point(parts[0]);if(!a||!book&&!a.verse)return bad();
    let b=null;
    if(parts[1]!==undefined){b=point(parts[1]);if(!b)return bad();if(!parts[1].includes(':')&&a.verse)b={chapter:a.chapter,verse:b.chapter};if(b.chapter<a.chapter||b.chapter===a.chapter&&a.verse&&b.verse&&b.verse<a.verse)return {...bad(),code:'reversed_range',label:'結束經文應在起始經文之後。'};}
    if(b&&b.chapter===a.chapter&&b.verse===a.verse)b=null;
    const q={kind:'bible',book,chapter:a.chapter,verse:a.verse,endChapter:b?.chapter||null,endVerse:b?.verse||null};
    q.key=`${book||'*'} ${q.chapter}${q.verse?':'+q.verse:''}${b?'-'+b.chapter+(b.verse?':'+b.verse:''):''}`;q.label=refLabel(q);return q;
  }
  const tokens=source.toLowerCase().replace(/([^\s])-\s*/g,'$1 -').split(/\s+/).filter(Boolean);
  const includes=[...new Set(tokens.filter(t=>!t.startsWith('-')))].sort();
  const excludes=[...new Set(tokens.filter(t=>t.startsWith('-')&&t.length>1).map(t=>t.slice(1)))].sort();
  if(!includes.length)return {kind:'error',code:'exclude_only',format:'-關鍵字',label:'請加上要找的詞，例如「信心 -小信」。'};
  const key=[...includes,...excludes.map(t=>'-'+t)].join(' ');
  return {kind:'keyword',key,label:key,includes,excludes};
}
export function punctuation(text){return text.replace(/『/g,'「').replace(/』/g,'」').replace(/、/g,'，').replace(/．(?=\s*$|[」〕）]|[〔（])/g,'。').replace(/．/g,'；').replace(/，。|；。|。；|。，/g,'。').replace(/，；|；，/g,'；').replace(/[，；]」/g,'。」').replace(/，，+/g,'，').replace(/；；+/g,'；');}
export function parseCSV(csv){
  return csv.replace(/^\uFEFF/,'').split(/\r?\n/).slice(1).filter(Boolean).map((line,i)=>{const m=line.match(/^([^,]+),(\d+),(\d+),(.*)$/);if(!m)throw Error('Invalid Bible row '+i);const text=m[4].startsWith('"')&&m[4].endsWith('"')?m[4].slice(1,-1).replace(/""/g,'"'):m[4];return {id:i,book:m[1].trim(),chapter:+m[2],verse:+m[3],text:punctuation(text.trim())};});
}
export function makeIndex(data){const byBook=new Map(),byChapter=new Map(),searchText=[];for(const v of data){if(!byBook.has(v.book))byBook.set(v.book,[]);byBook.get(v.book).push(v);const k=v.book+' '+v.chapter;if(!byChapter.has(k))byChapter.set(k,[]);byChapter.get(k).push(v);searchText[v.id]=v.text.normalize('NFKC').toLowerCase();}const newStart=data.findIndex(v=>v.book===books[39].id);return {data,byBook,byChapter,searchText,newStart};}
export function search(index,q,scope='all'){
  if(q.kind==='bible'){
    const pool=q.book?(q.endChapter?index.byBook.get(q.book):index.byChapter.get(q.book+' '+q.chapter))||[]:index.data;
    if(q.book&&(!index.byChapter.has(q.book+' '+q.chapter)||q.verse&&!index.byChapter.get(q.book+' '+q.chapter)?.some(v=>v.verse===q.verse)||q.endChapter&&(!index.byChapter.has(q.book+' '+q.endChapter)||q.endVerse&&!index.byChapter.get(q.book+' '+q.endChapter)?.some(v=>v.verse===q.endVerse))))return [];
    const low=q.chapter*1000+(q.verse||0),high=(q.endChapter||q.chapter)*1000+(q.endChapter?(q.endVerse||999):(q.verse||999));
    return pool.filter(v=>v.chapter*1000+v.verse>=low&&v.chapter*1000+v.verse<=high);
  }
  if(q.kind!=='keyword')return [];
  const pool=scope==='old'?index.data.slice(0,index.newStart):scope==='new'?index.data.slice(index.newStart):scope==='all'?index.data:index.byBook.get(scope)||[];
  return pool.filter(v=>{const t=index.searchText[v.id];return q.includes.every(k=>t.includes(k))&&!q.excludes.some(k=>t.includes(k));});
}
export function verseKey(v){return `${v.book} ${v.chapter}:${v.verse}`;}
export function passageKey(entries){
  const sorted=[...entries].sort((a,b)=>a.id-b.id);const groups=[];
  for(const v of sorted){const g=groups.at(-1);if(g&&g.at(-1).book===v.book&&g.at(-1).id+1===v.id)g.push(v);else groups.push([v]);}
  return groups.map(g=>{const a=g[0],b=g.at(-1);return `${a.book} ${a.chapter}:${a.verse}${g.length>1?'-'+b.chapter+':'+b.verse:''}`;}).join('; ');
}
export function formatCopy(entries,format='paragraph'){
  const sorted=[...entries].sort((a,b)=>a.id-b.id);if(!sorted.length)return '';
  if(format==='text')return sorted.map(v=>v.text).join('\n');
  if(format==='each')return sorted.map(v=>`${v.text}（${bookName(v.book)} ${v.chapter}:${v.verse}）`).join('\n');
  if(format==='legacy'){const cn=n=>{const d='零一二三四五六七八九';if(n<10)return d[n];if(n<20)return '十'+(n%10?d[n%10]:'');if(n<100)return d[Math.floor(n/10)]+'十'+(n%10?d[n%10]:'');return '一百'+(n%100<10&&n%100?'零':'')+(n%100?cn(n%100):'');};return sorted.map(v=>`${v.text} (${books.find(b=>b.id===v.book)?.short}${cn(v.chapter)}${v.verse})`).join('\n');}
  const refs=passageKey(sorted).split('; ').map(s=>refLabel(parseQuery(s))).join('；');
  return `${refs}\n${sorted.map(v=>v.text).join('\n')}`;
}
