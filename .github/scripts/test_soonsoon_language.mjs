import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {books,parseCSV,parseQuery,makeIndex,search,formatCopy} from '../../soonsoonbible/core.js';
import {simplified} from '../../soonsoonbible/chinese.js';
const data=parseCSV(readFileSync(new URL('../../soonsoonbible/bible.csv',import.meta.url),'utf8'));
const index=makeIndex(data);
test('all 66 book names accept either script',()=>{
  for(const b of books){assert.equal(parseQuery(simplified(b.name)+'1章1节').book,b.id);assert.equal(parseQuery(b.name+'1:1').book,b.id);}
});
test('reference variants share the same canonical analytics key',()=>{
  const keys=['約3:16','约 3：16','约翰福音3章16节','約翰福音三章十六節'].map(x=>parseQuery(x).key);
  assert.equal(new Set(keys).size,1);
});
test('keywords and exclusions match across scripts',()=>{
  for(const pair of [['聖靈 保惠師','圣灵 保惠师'],['裡面','里面'],['信心 -聖靈','信心 -圣灵']]){
    const a=search(index,parseQuery(pair[0])),b=search(index,parseQuery(pair[1]));
    assert.ok(a.length);assert.deepEqual(a.map(v=>v.id),b.map(v=>v.id));
  }
});
test('simplified copy preserves paragraph spacing and compact references',()=>{
  const verses=search(index,parseQuery('约3:1-3'));
  const copied=simplified(formatCopy(verses));
  assert.equal(copied.split('\n\n').length,3);
  assert.ok(copied.endsWith('(约三1-3)'));
  assert.ok(copied.includes('有一个法利赛人'));
  assert.ok(verses[0].text.includes('有一個法利賽人'));
});
