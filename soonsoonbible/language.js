import {simplified} from './chinese.js';
const valid=v=>v==='zh-Hans'||v==='zh-Hant';
let saved;try{saved=localStorage.getItem('ssb-language');}catch{}
const requested=new URLSearchParams(location.search).get('lang');
let language=valid(requested)?requested:valid(saved)?saved:'zh-Hant';
export const currentLanguage=()=>language;
export const displayText=text=>language==='zh-Hans'?simplified(String(text)):String(text);
const originals=new WeakMap();
const attributes=['aria-label','title','placeholder','content'];
function update(node,key,value,set){
  let records=originals.get(node);if(!records){records={};originals.set(node,records);}
  let record=records[key];if(!record||value!==record.output)record={source:value};
  const output=displayText(record.source);records[key]={source:record.source,output};if(value!==output)set(output);
}
function translate(root){
  if(root.nodeType===3){if(!root.parentElement?.closest('script,style,[data-no-translate]'))update(root,'text',root.nodeValue,v=>root.nodeValue=v);return;}
  if(root.nodeType!==1||root.matches('script,style,[data-no-translate]'))return;
  for(const name of attributes){if(root.hasAttribute(name)&&!(name==='content'&&!root.matches('meta[name=description]')))update(root,name,root.getAttribute(name),v=>root.setAttribute(name,v));}
  for(const child of root.childNodes)translate(child);
}
let observer;
function refresh(){observer?.disconnect();document.documentElement.lang=language;translate(document.documentElement);const b=document.querySelector('#languageButton');if(b){b.textContent=language==='zh-Hans'?'繁':'簡';b.setAttribute('aria-label',language==='zh-Hans'?'切换为繁体中文':'切換為簡體中文');b.title=b.getAttribute('aria-label');}observer?.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});}
export function setLanguage(value){
  if(!valid(value))return;language=value;try{localStorage.setItem('ssb-language',language);}catch{}
  const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState({},'',url);
  refresh();window.dispatchEvent(new CustomEvent('bible-language-change'));refresh();
}
function init(){
  if(!document.querySelector('#languageButton')){let footer=document.querySelector('#homeFooter');if(!footer){footer=document.createElement('footer');footer.className='language-footer';footer.append('Philemon Studio');document.body.append(footer);}const b=document.createElement('button');b.id='languageButton';b.className='language-button';b.dataset.noTranslate='';b.type='button';b.onclick=()=>setLanguage(language==='zh-Hans'?'zh-Hant':'zh-Hans');footer.append(b);}
  observer=new MutationObserver(records=>{observer.disconnect();for(const r of records){if(r.type==='childList')for(const n of r.addedNodes)translate(n);else translate(r.target);}observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});});
  if(valid(requested)){try{localStorage.setItem('ssb-language',language);}catch{}}
  refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
