'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {COLLOCATION_SETS}=require('../collocations');

test('kolokacje B2-C2: struktura, poziomy, przykłady i pułapki', () => {
  assert.ok(COLLOCATION_SETS.length>=3,'co najmniej trzy zestawy');
  const levels=new Set();
  let words=0;
  COLLOCATION_SETS.forEach(set=>{
    assert.ok(['B2','C1','C2'].includes(set.cefr),set.id+': zły poziom zestawu');
    set.words.forEach(w=>{
      words++; levels.add(w.cefr);
      assert.ok(['B2','C1','C2'].includes(w.cefr),w.word+': zły poziom');
      assert.ok(w.goes&&w.goes.length>=3,w.word+': za mało kolokacji (sedno tej funkcji)');
      // przykład musi zawierać słowo (bez "to"), inaczej nie uczy użycia
      const stem=w.word.replace(/^to /,'').split(' ')[0].toLowerCase();
      assert.ok(w.example.toLowerCase().includes(stem),w.word+': przykład nie zawiera słowa');
      assert.ok(w.pitfall&&w.pitfall.length>10,w.word+': brak sensownej pułapki');
      assert.ok(w.pl,w.word+': brak tłumaczenia');
    });
  });
  ['B2','C1','C2'].forEach(l=>assert.ok(levels.has(l),'brak poziomu '+l));
  assert.ok(words>=15,'za mało słów łącznie');
});
