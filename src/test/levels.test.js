'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const L=require('../levels');
const {TENSES,TENSE_ORDER,TENSE_BY_ID}=require('../tenses');

test('osie CEFR i Bloom są rozdzielone i uporządkowane', () => {
  assert.deepEqual(L.CEFR_LEVELS.map(l=>l.id),['A1','A2','B1','B2','C1','C2']);
  // Ewaluacja i Tworzenie to DWA osobne poziomy — sedno poprawki z audytu.
  assert.notEqual(L.BLOOM_BY_ID.evaluate.order, L.BLOOM_BY_ID.create.order);
  assert.equal(L.BLOOM_BY_ID.evaluate.order, 5);
  assert.equal(L.BLOOM_BY_ID.create.order, 6);
  assert.equal(L.BLOOM_LEVELS.length, 6, 'sześć poziomów Blooma');
  // Osie są niezależne: porównania CEFR nie mieszają się z Bloomem.
  assert.equal(L.cefrAtOrAbove('B1','A2'), true);
  assert.equal(L.cefrAtOrAbove('A1','B1'), false);
});

test('tag zadania łączy CEFR, proces Blooma i wymiar wiedzy', () => {
  assert.deepEqual(L.taskTag('B2','create','metacognitive'), {cefr:'B2',bloom:'create',knowledge:'metacognitive'});
  assert.deepEqual(L.taskTag('X','Y','Z'), {cefr:'A1',bloom:'remember',knowledge:'factual'});
  assert.deepEqual(L.KNOWLEDGE_DIMENSIONS.map(item=>item.id),['factual','conceptual','procedural','metacognitive']);
});

test('mapa pokrycia Blooma obejmuje wszystkie sześć procesów', () => {
  assert.ok(L.BLOOM_COVERAGE.evaluate.length > 0, 'Ewaluacja musi być realizowana');
  assert.ok(L.BLOOM_COVERAGE.create.length > 0, 'Tworzenie musi być realizowane');
  assert.ok(L.BLOOM_COVERAGE.remember.length > 0);
  assert.ok(L.BLOOM_COVERAGE.analyze.length > 0);
});

test('osiem czasów, każdy otagowany obiema osiami, z kontrastem', () => {
  assert.equal(TENSES.length, 8);
  assert.equal(TENSE_ORDER.length, 8);
  const cefrs = new Set(TENSES.map(t=>t.cefr));
  assert.ok(['A1','A2','B1','B2'].every(c=>cefrs.has(c)), 'czasy pokrywają A1-B2');
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
      assert.ok(L.KNOWLEDGE_BY_ID[d.knowledge], where+': zły wymiar wiedzy');
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
  ['levels.js','tenses.js','placement.js','bloom-lab.js'].forEach(file => {
    assert.ok(fs.readFileSync(path.join(root,'server.js'),'utf8').includes("'/"+file+"'"), 'serwer nie wystawia '+file);
    assert.ok(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes("'./"+file+"'"), file+' nie w pamięci offline');
    assert.ok(html.includes('src="./'+file+'"'), file+' nie w HTML');
    // Dockerfile kopiuje cały katalog public/ jedną komendą (COPY public ./public),
    // więc plik trafia do obrazu bez wymieniania go po nazwie — sprawdzamy oba fakty.
    assert.ok(fs.readFileSync(path.join(root,'Dockerfile'),'utf8').includes('COPY public ./public'), 'Dockerfile nie kopiuje całego public/');
    assert.ok(fs.existsSync(path.join(root,file)), file+' nie istnieje w public/, nie trafi do obrazu');
  });
});

test('dystraktory ewaluacji są wiarygodnymi błędami, nie jawnymi absurdami', () => {
  const bl = require('../bloom-lab');
  const tasks = bl.BLOOM_LAB_TASKS;
  const sillyPatterns = [
    /zawsze krótsza/i, /opisuje tylko przyszłość/i, /oznacza dokładnie teraz/i,
    /opisują? (wyłącznie )?przeszłość/i, /wymaga czasu przyszłego/i,
    /zawsze zawiera datę/i, /zawsze opisuje nagłą decyzję/i
  ];
  Object.entries(tasks).forEach(([id, task]) => {
    const evaluation = task.evaluate;
    evaluation.reasons.forEach((reason, index) => {
      if (index === evaluation.reason) return;
      sillyPatterns.forEach(pattern => {
        assert.ok(!pattern.test(reason), id + ': dystraktor to jawny absurd, nie realny błąd: "' + reason + '"');
      });
    });
  });
});

test('mapa pokrycia Blooma nie ma pustych poziomów', () => {
  const levels = require('../levels');
  Object.entries(levels.BLOOM_COVERAGE).forEach(([level, modules]) => {
    assert.ok(modules.length > 0, 'poziom Blooma bez pokrycia: ' + level);
  });
});

test('oś CEFR sięga C1 i C2 z właściwym porządkiem', () => {
  const L = require('../levels');
  assert.equal(L.CEFR_BY_ID.C1.order, 5);
  assert.equal(L.CEFR_BY_ID.C2.order, 6);
  assert.equal(L.cefrAtOrAbove('C1','B2'), true);
  assert.equal(L.cefrAtOrAbove('B2','C1'), false);
});

test('sytuacje biznesowe: poziomy B2-C2, tagi obu osi, wzorce spełniają kryteria', () => {
  const { BUSINESS_SITUATIONS, BUSINESS_MATCHING } = require('../business');
  const L = require('../levels');
  assert.ok(BUSINESS_SITUATIONS.length >= 6, 'za mało sytuacji');
  const levels = new Set();
  BUSINESS_SITUATIONS.forEach(s => {
    assert.ok(L.CEFR_BY_ID[s.cefr], s.id+': zły CEFR');
    s.turns.forEach((turn, i) => {
      levels.add(turn.cefr);
      assert.ok(L.CEFR_BY_ID[turn.cefr] && L.BLOOM_BY_ID[turn.bloom], s.id+'#'+i+': zły tag');
      assert.ok(turn.need.length && turn.model, s.id+'#'+i+': brak need/model');
      // Wzorzec musi przejść własne kryteria — inaczej uczeń powtarzający go
      // za aplikacją dostawałby informację, że odpowiedział źle.
      assert.ok(BUSINESS_MATCHING.answerMatches(turn.model,turn), s.id+'#'+i+': wzorzec nie przechodzi kryteriów');
    });
  });
  ['B2','C1','C2'].forEach(l => assert.ok(levels.has(l), 'brak poziomu '+l+' w sytuacjach'));
});

test('ocena komunikacyjna używa granic słów i każdej alternatywy ASR',()=>{
  const { BUSINESS_MATCHING }=require('../business');
  const turn={need:[['we are'],['working','integrating']],avoid:['we work on']};
  assert.equal(BUSINESS_MATCHING.answerMatches('We are working on the report.',turn),true);
  assert.equal(BUSINESS_MATCHING.answerMatches('We care about the report.',{need:[['are']],avoid:[]}),false,'are nie może przejść wewnątrz care');
  assert.equal(BUSINESS_MATCHING.matchingAlternative(['We care about it.','We are integrating the system.'],turn),'We are integrating the system.');
});

test('dostęp i opis sytuacji biznesowych nie tworzą wyniku 6 z 3',()=>{
  const { BUSINESS_MATCHING }=require('../business');
  assert.equal(BUSINESS_MATCHING.isAvailable('B2','B1'),false);
  assert.equal(BUSINESS_MATCHING.isAvailable('C1','C1'),true);
  const label=BUSINESS_MATCHING.progressLabel({done:2,ok:6});
  assert.match(label,/2 razy/);assert.match(label,/6 odpowiedzi/);assert.ok(!label.includes('6 z 3'));
});
