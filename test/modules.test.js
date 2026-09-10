'use strict';

process.env.ADMIN_PASSWORD = 'bezpieczne-haslo-testowe';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { PATTERNS } = require('../patterns');
const { STORIES } = require('../stories');
const { DIALOGUES } = require('../dialogues');
const { ERROR_BANK, COMPARISONS, ORDERINGS } = require('../errors');
const { JOURNEY } = require('../journey');
const { WORD_SECTIONS } = (() => {
  const source = fs.readFileSync(path.join(root, 'words.js'), 'utf8');
  const sandbox = { window: {}, module: { exports: {} } };
  new Function('window', 'module', source)(sandbox.window, sandbox.module);
  return { WORD_SECTIONS: sandbox.window.WORD_SECTIONS || sandbox.module.exports.WORD_SECTIONS };
})();

test('M2: każde zdanie da się ułożyć, a dystraktory nie dublują klocków', () => {
  let count = 0;
  PATTERNS.forEach(pattern => {
    assert.ok(pattern.items.length >= 8, pattern.id + ': za mało zdań');
    pattern.items.forEach((item, index) => {
      count++;
      const where = pattern.id + '#' + index;
      assert.ok(item.tokens.length >= 3, where);
      item.tokens.forEach(token => assert.ok(typeof token === 'string' && token.length, where + ': pusty klocek'));
      assert.ok(item.extra.length >= 2, where + ': za mało dystraktorów');
      // Dystraktor identyczny z klockiem poprawnym uczyniłby zadanie nierozwiązywalnym.
      const clash = item.tokens.filter(token => item.extra.includes(token));
      assert.deepEqual(clash, [], where + ': dystraktor duplikuje klocek');
      assert.ok(item.pl && item.pl.length, where + ': brak tłumaczenia');
    });
  });
  assert.ok(count >= 60, 'za mało zdań w sumie: ' + count);
});

test('M2 pokrywa całą gramatykę wymaganą w klasie 4', () => {
  const ids = PATTERNS.map(pattern => pattern.id);
  ['to-be-positive','to-be-question','have-got','present-simple','present-continuous','prepositions','wh-questions']
    .forEach(required => assert.ok(ids.includes(required), 'brak wzorca: ' + required));
});

test('M3: historyjki mają pytanie o główną myśl i pytania o szczegół', () => {
  STORIES.forEach(story => {
    assert.ok(story.text.length >= 6, story.id + ': za krótka');
    assert.equal(story.main.options.length, 3, story.id);
    assert.ok(story.main.options[story.main.correct], story.id + ': zły indeks odpowiedzi');
    assert.ok(story.detail.length >= 2, story.id + ': za mało pytań o szczegół');
    story.detail.forEach(question => assert.ok(question.answers.length >= 1, story.id));
  });
});

test('M4: każda tura ma kryteria oceny i odpowiedź wzorcową', () => {
  let turns = 0;
  DIALOGUES.forEach(dialogue => {
    dialogue.turns.forEach((turn, index) => {
      turns++;
      const where = dialogue.id + '#' + index;
      assert.ok(turn.need.length, where + ': brak kryteriów');
      turn.need.forEach(group => assert.ok(Array.isArray(group) && group.length, where));
      assert.ok(turn.model, where + ': brak wzorca');
      assert.ok(turn.pl, where + ': brak polecenia po polsku');
    });
  });
  assert.ok(turns >= 20, 'za mało tur: ' + turns);
});

test('M4: odpowiedź wzorcowa przechodzi własne kryteria', () => {
  // Gdyby wzorzec nie spełniał kryteriów, dziecko powtarzające go za
  // aplikacją i tak dostawałoby informację, że odpowiedziało źle.
  const normalize = value => String(value || '').toLowerCase().replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const covers = (answer, need) => {
    const text = normalize(answer);
    return need.every(group => group.some(token => text.includes(normalize(token))));
  };
  DIALOGUES.forEach(dialogue => {
    dialogue.turns.forEach((turn, index) => {
      assert.ok(covers(turn.model, turn.need), dialogue.id + '#' + index + ': wzorzec nie przechodzi kryteriów');
    });
  });
});

test('M5: bank błędów jest spójny, a układanki są prawidłowymi permutacjami', () => {
  ERROR_BANK.forEach(item => {
    assert.ok(item.wrong[item.bad], item.id + ': zły indeks błędu');
    assert.equal(item.why.length, 3, item.id + ': potrzeba trzech wyjaśnień');
    assert.ok(item.correctWhy >= 0 && item.correctWhy <= 2, item.id);
    assert.ok(item.fix && item.fix.length, item.id + ': brak poprawnej formy');
  });
  assert.ok(ERROR_BANK.length >= 15, 'bank startowy za mały');
  ORDERINGS.forEach(item => {
    assert.equal(item.lines.length, 4, item.id);
    assert.deepEqual([...item.order].sort(), [0, 1, 2, 3], item.id + ': zła permutacja');
  });
  COMPARISONS.forEach(item => {
    assert.ok(item.need.length >= 2, item.id + ': porównanie musi wymagać obu stron');
    assert.ok(item.model, item.id);
  });
});

test('wyprawa ma po jednym przystanku na sekcję i eksportuje się do przeglądarki', () => {
  assert.equal(JOURNEY.length, WORD_SECTIONS.length);
  assert.deepEqual(JOURNEY.map(stop => stop.section), WORD_SECTIONS.map(section => section.id));
  JOURNEY.forEach(stop => {
    assert.ok(stop.fact && stop.fact.length > 20, stop.place + ': brak faktu');
    assert.equal(typeof stop.lat, 'number');
    assert.equal(typeof stop.lon, 'number');
  });
  assert.equal(JOURNEY[0].place, 'Jerzykowo');
  // Bez tego eksportu mapa i ekrany przerw byłyby w przeglądarce puste.
  const source = fs.readFileSync(path.join(root, 'journey.js'), 'utf8');
  assert.match(source, /window\.JOURNEY = JOURNEY/);
  ['patterns.js', 'stories.js', 'dialogues.js', 'errors.js'].forEach(file => {
    assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /typeof window !== 'undefined'/, file);
  });
});

test('wszystkie pliki modułów są serwowane i trafiają do pamięci offline', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  ['patterns.js', 'stories.js', 'dialogues.js', 'errors.js', 'journey.js'].forEach(file => {
    assert.ok(server.includes("'/" + file + "'"), 'serwer nie wystawia ' + file);
    assert.ok(worker.includes("'./" + file + "'"), 'brak w pamięci offline: ' + file);
    assert.ok(html.includes('src="./' + file + '"'), 'brak w HTML: ' + file);
  });
});

test('sesja trwa maksymalnie 25 minut i dzieli się na etapy', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /const SESSION_LIMIT = 25\*60\*1000;/);
  assert.match(app, /const SHORT_LIMIT = 8\*60\*1000;/);
  const plan = app.slice(app.indexOf('const STAGE_PLAN'), app.indexOf('const PATTERN_LIST'));
  ['warmup', 'core', 'closing'].forEach(id => assert.ok(plan.includes("id:'" + id + "'"), 'brak etapu ' + id));
  // Suma etapów nie może przekroczyć limitu całej sesji.
  const budgets = [...plan.matchAll(/ms:\s*(\d+)\*60\*1000/g)].map(match => Number(match[1]));
  assert.equal(budgets.reduce((sum, value) => sum + value, 0), 23);
  assert.ok(app.includes('function renderStageBreak'), 'brak ekranu przerwy');
});

test('nagrody: piórka tylko za trudne rzeczy, nigdy za czas', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const values = app.slice(app.indexOf('const FEATHER_VALUES'), app.indexOf('let dailyCounters'));
  ['patternPerfect', 'errorFixed', 'examPerfect', 'dialogueTurn'].forEach(key =>
    assert.ok(values.includes(key + ':'), 'brak nagrody za ' + key));
  // Żadna nagroda nie może być powiązana z upływem czasu ani z samym wejściem.
  ['minute', 'seconds', 'timeSpent', 'login', 'openApp'].forEach(forbidden =>
    assert.ok(!values.includes(forbidden), 'piórka nie mogą zależeć od: ' + forbidden));
  assert.match(app, /const BADGES = \[/);
  assert.ok(!app.includes('leaderboard') && !app.includes('ranking'), 'nie może być rankingu między dziećmi');
});

test('serwer zapisuje i ogranicza dane nowych modułów', () => {
  const { sanitizeProgress } = require('../server');
  const clean = sanitizeProgress({
    streak: 3,
    patterns: { 'have-got#0': { i: 4, e: 9, d: 1, r: 2, ok: 2, bad: 0 }, 'zły klucz': null },
    errorCards: { 'e-be-am': { i: 1, e: 2.2, d: 2, r: 1, ok: 1, bad: 3 } },
    stories: { 'story-family': { done: 2, ok: 4 } },
    dialogues: { 'dlg-family': { done: 1, ok: 3 } },
    feathers: 42,
    badges: ['detective', 'nieistniejąca'.repeat(20)],
    mistakes: Array.from({ length: 200 }, (_, index) => ({ kind: 'pattern', ref: 'p#' + index, at: index })),
    nieznanePole: 'powinno zniknąć'
  });
  assert.equal(clean.schema, 3);
  assert.equal(clean.feathers, 42);
  assert.equal(clean.patterns['have-got#0'].e, 2.6, 'wartość poza zakresem musi być przycięta');
  assert.equal(clean.stories['story-family'].ok, 4);
  assert.equal(clean.dialogues['dlg-family'].ok, 3);
  assert.equal(clean.mistakes.length, 60, 'rejestr błędów trzyma tylko ostatnie 60');
  assert.equal(clean.badges.length, 1, 'zbyt długi identyfikator odznaki musi wypaść');
  assert.equal(clean.nieznanePole, undefined, 'nieznane pola nie mogą przechodzić');
});
