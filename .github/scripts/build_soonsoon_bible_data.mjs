import fs from 'node:fs';
import crypto from 'node:crypto';
import {parseCSV,books} from '../../soonsoonbible/core.js';
const root=new URL('../../soonsoonbible/',import.meta.url);
const raw=fs.readFileSync(new URL('bible.csv',root),'utf8'),data=parseCSV(raw);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,12);
const manifest={version:hash(raw.replace(/\r\n/g,'\n')),count:data.length,books:{}};
fs.mkdirSync(new URL('data/',root),{recursive:true});
for(const book of books){const rows=data.filter(v=>v.book===book.id),text=JSON.stringify(rows),file=book.id+'.'+hash(text).slice(0,10)+'.json';fs.writeFileSync(new URL('data/'+file,root),text);manifest.books[book.id]={file,chapters:Math.max(...rows.map(v=>v.chapter))};}
fs.writeFileSync(new URL('data/manifest.json',root),JSON.stringify(manifest));
console.log(`Verified ${data.length} verses; generated ${books.length} book files.`);
