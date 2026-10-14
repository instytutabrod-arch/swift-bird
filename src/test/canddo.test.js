'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../can-do');
const P=require('../placement');
const T=require('../tenses');

test('deskryptory can-do pokrywają 5 sprawności × 6 poziomów CEFR', () => {
  const areas=Object.keys(C.CAN_DO);
  assert.equal(areas.length,5,'pięć sprawności');
  ['A1','A2','B1','B2','C1','C2'].forEach(level=>{
    areas.forEach(area=>{
      assert.ok(C.CAN_DO[area][level],area+' '+level+': brak deskryptora');
      assert.ok(C.CAN_DO[area][level].length>20,area+' '+level+': deskryptor za krótki');
    });
  });
});

test('canDoFor zwraca deskryptor, a przy braku poziomu zachętę', () => {
  assert.match(C.canDoFor('reading','B1'),/Rozumiem/);
  assert.match(C.canDoFor('vocabulary',null),/zbudować podstawy/);
  assert.equal(C.canDoFor('nieistnieje','A1'),null);
});

test('evidenceReport przypisuje poziom CEFR każdej sprawności osobno', () => {
  const bank=P.buildPlacementBank(T.TENSES);
  function run(pick){let s=P.createAdaptiveSession(bank,{seed:'t'});let g=0;while(!s.done&&g++<200){const it=P.itemForSession(s,bank);if(!it)break;s=P.scoreAnswer(s,it,pick(it));}return s;}
  const s=run(it=>it.area==='vocabulary'?(it.answer+1)%it.options.length:it.answer);
  const areas=s.result.evidence.areas;
  const vocab=areas.find(a=>a.id==='vocabulary');
  const grammar=areas.find(a=>a.id==='grammar');
  assert.equal(vocab.cefr,null,'słownictwo z samymi błędami nie ma poziomu');
  assert.ok(grammar.cefr,'gramatyka poprawna ma przypisany poziom CEFR');
  areas.forEach(a=>assert.ok('cefr' in a,a.id+': brak pola cefr'));
});

test('can-do.js jest serwowane i w pamięci offline', () => {
  const root=path.join(__dirname,'..');
  assert.ok(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes("'./can-do.js'"));
  assert.ok(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('src="./can-do.js"'));
});
