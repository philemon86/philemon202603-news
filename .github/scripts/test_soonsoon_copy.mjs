import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCSV,formatCopy} from '../../soonsoonbible/core.js';

const verses=parseCSV(readFileSync(new URL('../../soonsoonbible/bible.csv',import.meta.url),'utf8'));
const verse=(book,chapter,number)=>verses.find(v=>v.book===book&&v.chapter===chapter&&v.verse===number);
const john=[1,2,3].map(v=>verse('Jhn',3,v));

test('consecutive verses have blank lines and one trailing range',()=>{
  assert.equal(formatCopy(john),`${john[0].text}\n\n${john[1].text}\n\n${john[2].text} (約三1-3)`);
});
test('separate books retain their own references',()=>{
  const a=verse('Mat',9,11),b=verse('Luk',6,40),c=verse('Jhn',4,11);
  assert.equal(formatCopy([c,a,b]),`${a.text} (太九11)\n\n${b.text} (路六40)\n\n${c.text} (約四11)`);
});
test('a gap in the same chapter must not become a continuous range',()=>{
  assert.equal(formatCopy([john[0],john[2]]),`${john[0].text} (約三1)\n\n${john[2].text} (約三3)`);
});
test('mixed selections group each continuous run separately',()=>{
  const five=verse('Jhn',3,5);
  assert.equal(formatCopy([five,john[1],john[0]]),`${john[0].text}\n\n${john[1].text} (約三1-2)\n\n${five.text} (約三5)`);
});
test('continuous verses crossing chapters show both chapter numbers',()=>{
  const a=verse('Jhn',3,36),b=verse('Jhn',4,1);
  assert.equal(formatCopy([a,b]),`${a.text}\n\n${b.text} (約三36-四1)`);
});
test('single verse and explicit alternative formats remain usable',()=>{
  assert.equal(formatCopy([john[0]]),`${john[0].text} (約三1)`);
  assert.equal(formatCopy([], 'legacy'),'');
  assert.equal(formatCopy(john.slice(0,2),'text'),`${john[0].text}\n\n${john[1].text}`);
  assert.equal(formatCopy(john.slice(0,2),'each'),`${john[0].text} (約三1)\n\n${john[1].text} (約三2)`);
  assert.equal(formatCopy(john.slice(0,2),'paragraph'),`(約三1-2)\n${john[0].text}\n\n${john[1].text}`);
});
