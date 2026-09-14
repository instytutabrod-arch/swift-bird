'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const L=require('../levels');
const {TENSES,TENSE_ORDER,TENSE_BY_ID}=require('../tenses');

test('osie CEFR i Bloom są rozdzielone i uporządkowane', () => {
  assert.deepEqual(L.CEFR_LEVELS.map(l=>l.id),['A1','A2','B1','B2']);
  // Ewaluacja i Tworzenie to DWA osobne poziomy — sedno poprawki z audytu.
  assert.notEqual(L.BLOOM_BY_ID.evaluate.order, L.BLOOM_BY_ID.create.order);
  assert.equal(L.BLOOM_BY_ID.evaluate.order, 5);
  assert.equal(L.BLOOM_BY_ID.create.order, 6);
  assert.equal(L.BLOOM_LEVELS.length, 6, 'sześć poziomów Blooma');
  // Osie są niezależne: porównania CEFR nie mieszają się z Bloomem.
  assert.equal(L.cefrAtOrAbove('B1','A2'), true);
  assert.equal(L.cefrAtOrAbove('A1','B1'), false);
});

test('tag zadania sprowadza nieznane wartości do najniższych', () => {
  assert.deepEqual(L.taskTag('B2','create'), {cefr:'B2',bloom:'create'});
  assert.deepEqual(L.taskTag('X','Y'), {cefr:'A1',bloom:'remember'});
});

test('mapa pokrycia Blooma pokazuje, że Ewaluacja i Tworzenie są puste', () => {
  assert.equal(L.BLOOM_COVERAGE.evaluate.length, 0, 'Ewaluacja jeszcze nie realizowana');
  assert.equal(L.BLOOM_COVERAGE.create.length, 0, 'Tworzenie jeszcze nie realizowane');
  assert.ok(L.BLOOM_COVERAGE.remember.length > 0);
  assert.ok(L.BLOOM_COVERAGE.analyze.length > 0);
});

test('osiem czasów, każdy otagowany obiema osiami, z kontrastem', () => {
  assert.equal(TENSES.length, 8);
  assert.equal(TENSE_ORDER.length, 8);
  const cefrs = new Set(TENSES.map(t=>t.cefr));
  assert.ok(['A1','A2','B1','B2'].every(c=>cefrs.has(c)), 'pełne pokrycie CEFR A1-B2');
  TENSES.forEach(tense => {
    assert.ok(L.CEFR_BY_ID[tense.cefr], tense.id+': zły tag CEFR');
    assert.ok(L.BLOOM_BY_ID[tense.bloom], tense.id+': zły tag Bloom');
    assert.ok(TENSE_ORDER.includes(tense.id), tense.id+': brak w kolejności');
    // Kontrast wskazuje istniejący czas — bez tego nie ma z czym porównać.
    assert.ok(TENSE_BY_ID[tense.contrast.with], tense.id+': kontrast do nieistniejącego czasu');
    assert.ok(tense.examples.length >= 3, tense.id+': za mało przykładów');
    // Każde zadanie niesie oba tagi i ma poprawną odpowiedź.
    tense.drills.forEach((d,i) => {
      const where = tense.id+' drill'+i;
      assert.ok(L.CEFR_BY_ID[d.cefr], where+': zły CEFR');
      assert.ok(L.BLOOM_BY_ID[d.bloom], where+': zły Bloom');
      if(d.type==='choose'){ assert.ok(d.options[d.correct]!==undefined, where); }
      if(d.type==='fill'){ assert.ok(d.answer, where+': brak odpowiedzi'); }
      if(d.type==='contrast'){ assert.ok(d.correct===0||d.correct===1, where); }
    });
  });
});

test('czasy: ekrany, wejście i podpięcie plików', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
  ['s-tenses','s-tense','s-tense-drill'].forEach(id => assert.ok(html.includes('id="'+id+'"'), 'brak ekranu '+id));
  assert.ok(html.includes('id="openTenses"'), 'brak wejścia do czasów');
  assert.match(app, /function renderTenseContrast/, 'brak zadania kontrastowego');
  // Nowe pliki serwowane, w pamięci offline, w HTML i w Dockerfile.
  ['levels.js','tenses.js'].forEach(file => {
    assert.ok(fs.readFileSync(path.join(root,'server.js'),'utf8').includes("'/"+file+"'"), 'serwer nie wystawia '+file);
    assert.ok(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes("'./"+file+"'"), file+' nie w pamięci offline');
    assert.ok(html.includes('src="./'+file+'"'), file+' nie w HTML');
    assert.ok(fs.readFileSync(path.join(root,'Dockerfile'),'utf8').includes(file), file+' nie w Dockerfile');
  });
});
