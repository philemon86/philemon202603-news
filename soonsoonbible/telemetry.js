import {parseQuery} from './core.js';
export const API='https://soonsoon-bible-analytics.ppss10103s.chatgpt.site';
const disabled=()=>['localhost','127.0.0.1'].includes(location.hostname)||localStorageSafe('ssb-analytics')==='off'||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';
function localStorageSafe(k){try{return localStorage.getItem(k);}catch{return null;}}
const gaQueue=[];let flushTimer,queue=[],sending=false;
const id=()=>crypto.randomUUID();
export function safeQuery(q){if(!q)return '';if(q.kind==='bible')return q.key;const value=q.kind==='error'?q.format||q.code:q.key;return /@|https?:|www\.|\b\d{7,}\b/i.test(value||'')?'[已略去個資格式]':String(value||'').slice(0,160);}
export function track(event,parameters={}){
  if(disabled())return;
  const e={id:id(),event,...parameters};queue.push(e);clearTimeout(flushTimer);flushTimer=setTimeout(flush,150);
  if(typeof window.gtag==='function')window.gtag('event',event,{search_type:parameters.kind||'none',bible_book:parameters.book||'',bible_chapter:parameters.chapter||0,result_count:parameters.result_count||0,verse_count:parameters.verse_count||0,copy_format:parameters.copy_format||'',copy_mode:event==='multi_verse_copy'?'batch':'single',source:parameters.source||'search',page_path:'/soonsoonbible/',page_location:'https://news.pbooks.com.tw/soonsoonbible/'});
}
export function newSearch(q,count,scope,source){const search_id=id();track(q.kind==='bible'?'bible_search':q.kind==='keyword'?'keyword_search':'search_error',{search_id,query:safeQuery(q),kind:q.kind,book:q.book||'',chapter:q.chapter||0,result_count:count,scope,source,error:q.code||''});if(count===0&&['bible','keyword'].includes(q.kind))track('zero_result',{search_id});return search_id;}
async function flush(){if(sending||!queue.length||disabled())return;sending=true;const batch=queue.splice(0,100);try{const response=await fetch(API+'/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:batch}),keepalive:true});if(!response.ok)throw Error('Analytics unavailable');}catch{for(const e of batch){e.retry=(e.retry||0)+1;if(e.retry<3)queue.push(e);}}finally{sending=false;if(queue.length)flushTimer=setTimeout(flush,3000);}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&queue.length&&!disabled()){const data=JSON.stringify({events:queue.splice(0,100)});if(!navigator.sendBeacon(API+'/api/events',new Blob([data],{type:'text/plain'})))fetch(API+'/api/events',{method:'POST',body:data,keepalive:true}).catch(()=>{});}});
if(!disabled()&&!['localhost','127.0.0.1'].includes(location.hostname)){
  window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag('js',new Date());window.gtag('config','G-ZKC664K4M1',{page_title:'咻咻查聖經',page_location:'https://news.pbooks.com.tw/soonsoonbible/',page_referrer:document.referrer?new URL(document.referrer).origin:'',allow_google_signals:false,allow_ad_personalization_signals:false});
  const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id=G-ZKC664K4M1';document.head.append(script);
  setTimeout(()=>{if(document.visibilityState==='visible')track('qualified_visitor_counted');},10000);
}
