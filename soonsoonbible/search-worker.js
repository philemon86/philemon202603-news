import {parseCSV,makeIndex,search} from './core.js';
let manifest,full;const loaded=new Map();
async function fetchOK(url){const r=await fetch(url);if(!r.ok)throw Error('資料載入失敗');return r;}
async function indexFor(q){
  if(q.kind==='bible'&&q.book){
    if(!loaded.has(q.book))loaded.set(q.book,fetchOK('./data/'+manifest.books[q.book].file).then(r=>r.json()).then(makeIndex).catch(e=>{loaded.delete(q.book);throw e;}));
    return loaded.get(q.book);
  }
  if(!full)full=fetchOK('./bible.csv?v='+manifest.version).then(r=>r.text()).then(parseCSV).then(makeIndex).catch(e=>{full=null;throw e;});
  return full;
}
self.onmessage=async({data:m})=>{try{if(m.type==='load'){manifest=await(await fetchOK('./data/manifest.json?v=20260906')).json();postMessage({type:'ready',count:manifest.count,chapters:Object.fromEntries(Object.entries(manifest.books).map(([id,b])=>[id,b.chapters]))});}else if(m.type==='search'){postMessage({type:'result',id:m.id,results:search(await indexFor(m.query),m.query,m.scope)});}}catch(e){postMessage({type:'error',id:m.id,message:e.message});}};
