/**
 * 百週年紀念衫意向地圖：Google Apps Script + Google 試算表
 * 由表單擁有者（建議 zalmunna17@gmail.com）在 script.google.com 新建專案。
 * 1. 將本單一 Code.gs 全部貼上到 Apps Script 專案。
 * 2. 手動執行 setupOnce() 授權（資料表已由 ChatGPT 建立）。
 * 3. 部署 -> 新增部署 -> 網頁應用程式 -> 執行身分：我；誰可以存取：所有人。
 * 4. 把部署後 /exec 網址貼入網站的 shirt/config.js。
 * 5. 到回覆試算表「審核狀態」選「已確認」，已確認件數便會納入製作門檻。
 * 支援台／臺、繁體／簡體和英文教會名稱搜尋。僅收集教會、姓氏、尺寸件數，不要求全名、郵件、電話、地址或登入。姓氏加教會仍可能間接識別個人。
 */
const APP = {
  SPREADSHEET_ID: '1YeD69Wnvbwvf76ouee0qbKuwsMgRM491HlErmONOUXc',
  CATALOG_URL: 'https://www.philemon.com.tw/shirt/churches.json',
  CLOSE_AT: '2027-12-10T23:59:59+08:00',
  TAB: '意向回覆',
  HEADERS: ['建立時間','回覆代碼','教會ID','姓氏','各尺寸明細','總件數','審核狀態','更新時間'],
  SIZES: ['110cm','120cm','2XS','XS','S','M','L','XL','2XL','3XL','4XL']
};
function setupOnce() {
  const s = SpreadsheetApp.openById(APP.SPREADSHEET_ID);
  if (!s.getSheetByName(APP.TAB)) throw new Error('找不到意向回覆分頁');
  Logger.log('試算表已準備完成：' + s.getUrl());
}
function sheet_() {
  const s = SpreadsheetApp.openById(APP.SPREADSHEET_ID);
  const sh = s.getSheetByName(APP.TAB);
  if (!sh) throw new Error('找不到意向回覆分頁');
  return sh;
}
function getChurches(){return catalog_().map(c=>({id:c.id,name:c.name,en:c.en,region:c.region,country:c.country,c:c.c}));}
function catalog_(){
  const cache=CacheService.getScriptCache(),data=cache.get('shirt_churches_v1');
  if(data) return JSON.parse(data);
  const resp=UrlFetchApp.fetch(APP.CATALOG_URL,{muteHttpExceptions:true});
  if(resp.getResponseCode()!==200)throw new Error('教會清單無法取得，請確認網站已有 /shirt/churches.json');
  const list=JSON.parse(resp.getContentText('UTF-8'));
  if(!Array.isArray(list)||list.length<300)throw new Error('教會清單內容錯誤');
  // CacheService 單筆儲存有長度限制，601 筆完整 JSON 不直接快取；下次由 UrlFetch 重新取得。
  return list;
}
function doGet(e){
  const p=e && e.parameter || {};
  if(p.mode==='public'){
    const callback=String(p.callback||'');
    if(!/^[A-Za-z_$][A-Za-z0-9_$]{0,48}$/.test(callback))return ContentService.createTextOutput('invalid callback').setMimeType(ContentService.MimeType.TEXT);
    const obj=publicStats_();
    const safe=JSON.stringify(obj).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
    return ContentService.createTextOutput(callback+'('+safe+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return HtmlService.createHtmlOutput(FORM_HTML)
    .setTitle('百週年紀念衫｜意向登記')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function submitInterest(payload){
  if(Date.now()>new Date(APP.CLOSE_AT).getTime())throw new Error('本次調查已截止');
  if(!payload || payload.honey)throw new Error('無法送出，請重新載入');
  const cId=String(payload.churchId||'');
  if(!/^tjc_[a-f0-9]{16}$/.test(cId) || !catalog_().some(c=>c.id===cId))throw new Error('請選擇有效的教會或聚會點');
  const surname=String(payload.surname||'').trim().normalize('NFKC');
  if(!/^[\p{L}\p{M}.'’\-\s]{1,16}$/u.test(surname))throw new Error('請填寫中文或英文姓氏（最多16字），不要填全名');
  const counts={},raw=payload.sizes||{};
  for(const size of APP.SIZES){
    const value=Number(raw[size]||0);
    if(!Number.isInteger(value)||value<0||value>10)throw new Error('每個尺寸請填0到10件');
    counts[size]=value;
  }
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  if(total<1||total>10)throw new Error('每次登記最多10件、至少1件；大量需求請來信書房');
  let token=String(payload.token||'');
  if(!/^[0-9a-f-]{36}$/.test(token))throw new Error('回覆代碼格式不正確，請重新整理頁面');
  const now=new Date(),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const sh=sheet_(),last=sh.getLastRow();
    let found=-1;
    if(last>1){const tokens=sh.getRange(2,2,last-1,1).getValues();found=tokens.findIndex(x=>String(x[0])===token);}
    const row=[now,token,cId,surname,JSON.stringify(counts),total,'待確認',now];
    if(found>=0){ const rowNo=found+2;row[0]=sh.getRange(rowNo,1).getValue();sh.getRange(rowNo,1,1,8).setValues([row]); }
    else sh.appendRow(row);
    CacheService.getScriptCache().remove('shirt_public_v1');
    return {ok:true,token:token,total:total,message:'意向已收到，待書房核對後列入正式達標統計'};
  }finally{lock.releaseLock();}
}
function publicStats_(){
  const cache=CacheService.getScriptCache();const saved=cache.get('shirt_public_v1');
  if(saved)return JSON.parse(saved);
  const sh=sheet_(),n=sh.getLastRow();
  const rows=n>1?sh.getRange(2,1,n-1,8).getValues():[];
  const stats=new Map();let verified=0,pending=0;const recent=[];
  for(const r of rows){
    const id=String(r[2]||''),qty=Number(r[5])||0,status=String(r[6]||'待確認');
    if(!/^tjc_[a-f0-9]{16}$/.test(id)||qty<1||qty>10||status==='排除')continue;
    if(!stats.has(id))stats.set(id,{id:id,confirmed:0,pending:0});
    const record=stats.get(id);
    if(status==='已確認'){
      verified+=qty;record.confirmed+=qty;
      if(r[3])recent.push({id:id,surname:String(r[3]).slice(0,16),qty:qty,when:(r[7] instanceof Date?r[7].getTime():0)});
    }else{ pending+=qty;record.pending+=qty; }
  }
  recent.sort((a,b)=>b.when-a.when);
  const result={total:verified+pending,verified:verified,pending:pending,churches:Array.from(stats.values()),recent:recent.slice(0,12).map(({when,...rest})=>rest),updatedAt:new Date().toISOString()};
  const json=JSON.stringify(result);
  if(json.length<95000)cache.put('shirt_public_v1',json,40);
  return result;
}

// 嵌入式登記表單；在部署時與主頁右側表單面板一起使用。
const FORM_HTML = "<!doctype html>\n<html lang=\"zh-Hant\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<base target=\"_top\">\n<style>\n:root{--navy:#193654;--ink:#1d3851;--gold:#aa864d;--sub:#7c8b95;--line:#e3e8ea;font-family:system-ui,-apple-system,\"Noto Sans TC\",sans-serif;color:var(--ink)}\n*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;font-size:13px}body{padding:18px 22px 22px;line-height:1.6}button,input{font:inherit}button{cursor:pointer}.field{position:relative;margin:0 0 16px}.field label{display:block;font-weight:800;margin-bottom:7px;color:#2b4358;font-size:12px;letter-spacing:.01em}.field input{width:100%;background:white;border:1px solid #dbe2e6;border-radius:10px;color:#203c55;padding:10px 12px;outline:none;font-size:14px}.field input:focus{border-color:#b3935e;box-shadow:0 0 0 3px #c8ac772b}.hint{color:#87939a;font-size:10px;margin-top:5px}.selected{color:#3c735b;font-size:11px;font-weight:750;margin-top:6px;display:none}.results{position:absolute;z-index:20;left:0;right:0;top:100%;max-height:175px;overflow:auto;background:white;border-radius:9px;border:1px solid #dee6e9;box-shadow:0 9px 24px #112e4b2a;display:none}.results button{display:block;width:100%;text-align:left;font-size:12px;background:#fff;color:#233b54;border:0;border-bottom:1px solid #eef0f0;padding:10px 13px}.results button:hover,.results button:focus{background:#f5f6f2}.sizes-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}.sizes-head strong{font-size:12px;font-weight:800}.total{padding:5px 9px;background:#faf2e5;color:#936e37;font-size:12px;font-weight:800;border-radius:8px}.size-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.size{padding:8px 5px;background:#f9faf9;border:1px solid var(--line);border-radius:9px;text-align:center;min-width:0}.size.active{border-color:#bd9d67;background:#fcf7eb}.size-name{font-size:12px;font-weight:800;color:#213a55;margin-bottom:6px;display:block}.size-actions{display:flex;align-items:center;justify-content:space-around;gap:3px}.size-actions button{width:22px;height:24px;background:white;border:1px solid #dfe5e7;border-radius:6px;font-size:14px;line-height:1;font-weight:800;color:#506271;padding:0}.size-actions output{min-width:12px;font-size:12px;font-weight:850;color:#96723c}.details{margin-top:14px;background:#f7f8f6;padding:10px 11px;border-radius:9px;color:#647789;font-size:11px;line-height:1.8}.details strong{color:#38526a}.button-submit{margin-top:13px;width:100%;background:var(--navy);color:white;border:0;border-radius:10px;padding:13px;font-weight:800;font-size:13px}.button-submit:hover{background:#2a5072}.button-submit:disabled{opacity:.55;cursor:default}.error{color:#a54545;font-size:12px;padding:8px 0}.success{color:#236547;font-size:12px;padding:8px 0}.receipt{padding:8px;background:#edf4f1;border-radius:7px;overflow-wrap:anywhere;margin:5px 0;font-size:11px}.change{margin-top:15px;font-size:11px;border-top:1px solid #edf0f0;padding-top:10px;color:#677986}.change summary{cursor:pointer;font-weight:700}.change input{margin-top:8px;font-size:12px;width:100%;padding:9px;border:1px solid #dbe2e6;border-radius:8px}.hidden-field{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.closed{padding:50px 12px;text-align:center;color:#906343;font-weight:800}@media(max-width:470px){body{padding:13px 13px 19px}.size-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}\n</style>\n</head>\n<body>\n<form id=\"form\" autocomplete=\"off\">\n <div class=\"field\"><label for=\"churchSearch\">01　所屬教會</label><input id=\"churchSearch\" type=\"search\" required placeholder=\"教會／教会／Church（台／臺皆可）\" autocomplete=\"off\" aria-autocomplete=\"list\"><div class=\"results\" id=\"results\"></div><div class=\"selected\" id=\"selected\"></div></div>\n <div class=\"field\"><label for=\"surname\">02　姓氏</label><input id=\"surname\" type=\"text\" required maxlength=\"16\" placeholder=\"黃、Chen、Wong\"><div class=\"hint\">僅填姓氏，不需要全名。</div></div>\n <div class=\"sizes-head\"><strong>03　選擇尺寸與件數</strong><span id=\"total\" class=\"total\">共 0 件</span></div>\n <div id=\"sizeGrid\" class=\"size-grid\"></div>\n <div class=\"hint\" style=\"margin-top:7px\">每次可登記 1–10 件，可選多種尺寸。</div>\n <div class=\"details\"><strong>截止：2027/12/10（五）23:59。</strong> 這是再製作意向調查，無須付款。公開地圖會顯示你填寫的教會、姓氏及件數。</div>\n <input id=\"website\" class=\"hidden-field\" tabindex=\"-1\" autocomplete=\"off\" aria-hidden=\"true\">\n <button class=\"button-submit\" type=\"submit\" id=\"submitButton\">送出意向</button>\n <div id=\"message\" role=\"status\" aria-live=\"polite\"></div>\n <details class=\"change\"><summary>修改先前登記</summary><input id=\"existingToken\" type=\"text\" placeholder=\"原回覆代碼\" maxlength=\"36\"><div class=\"hint\">若未填入，同一瀏覽器將沿用上次回覆代碼。</div></details>\n</form>\n<script>\n(()=>{\n'use strict';\nconst SIZES=['110cm','120cm','2XS','XS','S','M','L','XL','2XL','3XL','4XL'];\nconst $=id=>document.getElementById(id);\nconst CHAR_PAIRS=\"乾干亞亚來来俱具倫伦傘伞傳传僑侨內内務务勝胜勢势區区員员問问啟启國国圍围園园圓圆報报壇坛壢坜壩坝壽寿奧奥學学實实寧宁寶宝專专岡冈島岛峽峡崙仑嶼屿巒峦師师庫库廈厦廣广廬庐強强後后復复愛爱慶庆應应戶户擔担昇升晉晋書书會会東东柵栅棧栈楊杨榮荣樂乐樓楼樹树橋桥橫横權权歷历歸归涼凉溝沟滿满漁渔漢汉漬渍澤泽濱滨灣湾烏乌營营爾尔獅狮現现瑪玛璉琏環环發发磯矶禱祷穌稣篤笃簡简紅红納纳紐纽組组綠绿維维線线縣县繼继羅罗義义聖圣腦脑腳脚臥卧臺台興兴莊庄華华萊莱萬万葉叶蓋盖蓮莲蘆芦蘇苏蘭兰號号裡里見见親亲觀观觸触詩诗豐丰貝贝貞贞財财貢贡貴贵賓宾輝辉轄辖農农連连遊游運运達达遠远邊边鄉乡鄰邻醃腌銅铜鋪铺錦锦鎮镇鐵铁長长門门開开間间閣阁閩闽關关阪坂陽阳際际雙双雲云霧雾靈灵靜静韓韩頂顶順顺領领頭头館馆馬马鬧闹魯鲁鰲鳌鳥鸟鳳凤鴨鸭鶯莺鶴鹤鹽盐麗丽麥麦龍龙龜龟\";\nconst CHAR_MAP=new Map(Array.from({length:CHAR_PAIRS.length/2},(_,i)=>[CHAR_PAIRS[i*2],CHAR_PAIRS[i*2+1]]));\nconst normalizeSearch=s=>Array.from(String(s??'').normalize('NFKC').toLowerCase()).map(c=>CHAR_MAP.get(c)||c).join('').replace(/[\\s\\-_.·・（）()]/g,'');\n\nconst state={church:null,churches:[],counts:Object.fromEntries(SIZES.map(s=>[s,0])),token:''};\nconst grid=$('sizeGrid');\nconst key='shirt_receipt_code_v2';\ntry{state.token=localStorage.getItem(key)||'';}catch(e){}\nconst total=()=>Object.values(state.counts).reduce((a,b)=>a+b,0);\nfunction repaint(){\n $('total').textContent='共 '+total()+' 件';\n grid.querySelectorAll('.size').forEach(node=>{let v=state.counts[node.dataset.size];node.classList.toggle('active',v>0);node.querySelector('output').textContent=v;});\n}\nfor(const s of SIZES){\n const card=document.createElement('div');card.className='size';card.dataset.size=s;\n const name=document.createElement('strong');name.className='size-name';name.textContent=s;\n const ctr=document.createElement('div');ctr.className='size-actions';\n const less=document.createElement('button');less.type='button';less.textContent='−';less.setAttribute('aria-label',s+'減一件');\n const count=document.createElement('output');count.textContent='0';\n const more=document.createElement('button');more.type='button';more.textContent='＋';more.setAttribute('aria-label',s+'加一件');\n less.addEventListener('click',()=>{state.counts[s]=Math.max(0,state.counts[s]-1);repaint();});\n more.addEventListener('click',()=>{if(total()<10){state.counts[s]++;repaint();}});\n ctr.append(less,count,more);card.append(name,ctr);grid.append(card);\n}\nfunction showError(message){$('message').className='error';$('message').textContent=message;$('submitButton').disabled=false;}\nfunction choose(church){state.church=church;$('churchSearch').value=church.name;$('results').style.display='none';$('selected').textContent='✓ '+church.name+' · '+church.country;$('selected').style.display='block';}\nfunction search(){\n state.church=null;$('selected').style.display='none';\n const q=normalizeSearch($('churchSearch').value),root=$('results');root.replaceChildren();\n if(!q){root.style.display='none';return;}\n const found=state.churches.filter(c=>[c.name,c.en,c.country,c.region,c.name+'教會'].some(x=>normalizeSearch(x).includes(q))).slice(0,12);\n for(const c of found){const item=document.createElement('button');item.type='button';item.textContent=c.name+' · '+c.country;item.addEventListener('click',()=>choose(c));root.append(item);}\n root.style.display=found.length?'block':'none';\n}\n$('churchSearch').addEventListener('input',search);\n$('churchSearch').addEventListener('focus',search);\ndocument.addEventListener('click',e=>{if(!e.target.closest('.field'))$('results').style.display='none';});\nif(Date.now()>new Date('2027-12-10T23:59:59+08:00').getTime()){$('form').innerHTML='<div class=\"closed\">本次意向調查已截止</div>';return;}\nif(!window.google?.script?.run){showError('請從紀念衫意向地圖的正式登記頁開啟');$('submitButton').disabled=true;return;}\ngoogle.script.run.withSuccessHandler(c=>{state.churches=c||[];}).withFailureHandler(e=>showError(e?.message||String(e))).getChurches();\n$('form').addEventListener('submit',event=>{\n event.preventDefault();\n if(!state.church){showError('請從搜尋結果選擇教會');return;}\n const surname=$('surname').value.trim();if(!surname){showError('請填寫姓氏');return;}\n const n=total();if(n<1||n>10){showError('件數請填 1–10 件');return;}\n let token=$('existingToken').value.trim()||state.token;\n if(!/^[0-9a-f-]{36}$/.test(token)){token=window.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return(c==='x'?r:(r&3|8)).toString(16);});}\n $('submitButton').disabled=true;$('message').className='';$('message').textContent='傳送中…';\n google.script.run.withSuccessHandler(res=>{\n  state.token=res.token;try{localStorage.setItem(key,res.token);}catch(e){}\n  $('message').className='success';$('message').textContent='已收到 '+res.total+' 件意向。';\n  const box=document.createElement('div');box.className='receipt';box.textContent='修改用回覆代碼：'+res.token;$('message').append(box);\n  $('submitButton').disabled=false;\n  try{window.parent.postMessage({type:'shirt-submitted'},'https://www.philemon.com.tw');}catch(e){}\n }).withFailureHandler(e=>showError('無法送出：'+(e?.message||String(e)))).submitInterest({churchId:state.church.id,surname,sizes:state.counts,honey:$('website').value,token});\n});\n})();\n</script>\n</body>\n</html>\n";