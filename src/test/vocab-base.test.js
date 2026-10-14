'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {VOCAB_DOMAINS}=require('../vocab-base');

test('baza słówek: cztery dziedzine, słowa bez ikon, poprawna struktura', () => {
  assert.ok(VOCAB_DOMAINS.length>=8,'co najmniej osiem dziedzin');
  const ids=new Set();
  VOCAB_DOMAINS.forEach((d,i)=>{
    assert.ok(d.id&&d.title&&d.intro,d.id+': brak pól opisowych');
    assert.equal(d.order,i+1,d.id+': kolejność musi rosnąć (odblokowywanie)');
    assert.ok(!ids.has(d.id),'zduplikowane id dziedziny: '+d.id); ids.add(d.id);
    assert.ok(d.words.length>=15,d.id+': za mało słów');
    const wseen=new Set();
    d.words.forEach(w=>{
      assert.ok(w.en&&w.pl,d.id+': słowo bez tłumaczenia');
      assert.ok(!('icon' in w)&&!('ic' in w),d.id+': baza ma być BEZ ikon');
      assert.ok(!wseen.has(w.en),d.id+': duplikat '+w.en); wseen.add(w.en);
    });
  });
});
