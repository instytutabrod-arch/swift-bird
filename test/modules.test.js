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

test('M2 buduje zdania tylko z poznanego słownictwa', () => {
  const vocabulary = new Set(WORD_SECTIONS.flatMap(section => section.words.map(item => item[0].toLowerCase())));
  PATTERNS.forEach(pattern => pattern.items.forEach((item,index) => {
    const where=pattern.id+'#'+index;
    assert.ok(Array.isArray(item.vocab)&&item.vocab.length,where+': brak wymagań słownikowych');
    item.vocab.forEach(word=>assert.ok(vocabulary.has(word.toLowerCase()),where+': słowa „'+word+'” nie ma w kolekcji'));
  }));

  // Po pierwszych czterech słowach są już co najmniej trzy zadania w każdym
  // z trzech pierwszych wzorców, więc ścieżka nie kończy się na pustym ekranie.
  const firstFour = new Set(WORD_SECTIONS[0].words.slice(0,4).map(item=>item[0].toLowerCase()));
  PATTERNS.slice(0,3).forEach(pattern => {
    const available=pattern.items.filter(item=>item.vocab.every(word=>firstFour.has(word.toLowerCase())));
    assert.ok(available.length>=3,pattern.id+': za mało zdań po otwarciu modułu');
  });
});

test('M2 jest widocznym modułem i prowadzi przez wzorce po kolei', () => {
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  ['sentenceLaunch','openSentences','s-sentences','patternGrid','sentenceKnownN']
    .forEach(id=>assert.ok(html.includes('id="'+id+'"'),'brak elementu M2: '+id));
  assert.match(app,/const SENTENCE_UNLOCK_WORDS = 4;/);
  assert.match(app,/function patternUnlocked\(index\)/);
  assert.match(app,/learnedSentenceCount\(PATTERN_LIST\[index-1\]\.id\)>=SENTENCE_UNLOCK_SUCCESSES/);
  assert.match(app,/function beginPatternSession\(patternId\)/);
  assert.match(app,/if\(id === 'sentences'\) return focusedPatternQueue/);
  assert.match(app,/function itemVocabularyReady\(item,vocabulary=collectedVocabulary\(\)\)/);
  assert.match(app,/itemVocabularyReady\(item,vocabulary\)/);
});

test('M1 jest osobnym modułem, a lista sekcji otwiera się dopiero po kliknięciu', () => {
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  ['vocabularyLaunch','vocabularyLaunchText','vocabularyLaunchFill','openVocabulary','s-vocabulary','vocabularyBack','vocabularyCollectedN','sectionsGrid']
    .forEach(id=>assert.ok(html.includes('id="'+id+'"'),'brak elementu M1: '+id));
  const home=html.slice(html.indexOf('id="s-home"'),html.indexOf('id="s-vocabulary"'));
  const vocabulary=html.slice(html.indexOf('id="s-vocabulary"'),html.indexOf('id="s-sentences"'));
  assert.ok(!home.includes('id="sectionsGrid"'),'lista sekcji nadal jest rozwinięta na stronie głównej');
  assert.ok(vocabulary.includes('id="sectionsGrid"'),'lista sekcji nie trafiła do modułu słówek');
  assert.match(app,/function renderVocabularyHub\(\)/);
  assert.match(app,/\$\('#openVocabulary'\)\.addEventListener\('click',renderVocabularyHub\)/);
  assert.match(app,/\$\('#sectionBack'\)\.addEventListener\('click',renderVocabularyHub\)/);
});

test('M2 zachowuje zdanie po błędzie i wskazuje klocek do przesunięcia', () => {
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const start=app.indexOf('function sentenceMatchMarks(');
  assert.notEqual(start,-1,'brak algorytmu oznaczania fragmentów zdania');
  let depth=0,index=app.indexOf('{',start);
  for(;index<app.length;index++){
    if(app[index]==='{')depth++;
    else if(app[index]==='}'){depth--;if(depth===0)break;}
  }
  const marks=new Function(app.slice(start,index+1)+'\nreturn sentenceMatchMarks;')();
  assert.deepEqual(marks(['I','am','happy'],['I','am','happy']),[true,true,true]);
  assert.deepEqual(marks(['wrong','I','am'],['I','am','happy']),[false,true,true]);
  assert.deepEqual(marks(['I','happy','am'],['I','am','happy']),[true,false,true]);

  const pattern=app.slice(app.indexOf('function renderPattern('),app.indexOf('function renderStory('));
  assert.match(pattern,/brick-move/);
  assert.match(pattern,/reviewed=true;refreshLine\(\)/);
  assert.doesNotMatch(pattern,/placed\.length\s*=\s*0/,'błędne zdanie nie może być kasowane');
  assert.match(pattern,/Zielone części są ułożone dobrze/);
});

test('M2 wymaga przeczytania zdania i czeka na decyzję dziecka', () => {
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const pattern=app.slice(app.indexOf('function renderPattern('),app.indexOf('function renderStory('));
  assert.match(pattern,/speakSentence\(sentenceText,enableReading\)/,'brak naturalnego wzoru zdania');
  assert.match(pattern,/listen\(sentenceText[\s\S]*sentencePronunciationMatches\)/,'brak oceny całego zdania');
  assert.match(pattern,/Przeczytaj zdanie na głos/);
  assert.match(pattern,/Posłuchaj jeszcze raz/);
  assert.match(pattern,/Następne zdanie/);
  assert.match(pattern,/Pomiń czytanie zdania/,'admin musi móc sprawdzić ścieżkę bez mikrofonu');
  assert.doesNotMatch(pattern,/setTimeout\(nextStep/,'zadanie nie może przechodzić samo do kolejnego zdania');
});

test('M2 wymaga dokładnego przepisania zdania przed włączeniem lektora i mikrofonu', () => {
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const start=app.indexOf('function sentenceSpellingMatches(');
  assert.notEqual(start,-1,'brak osobnej kontroli pisowni zdania');
  let depth=0,index=app.indexOf('{',start);
  for(;index<app.length;index++){
    if(app[index]==='{')depth++;
    else if(app[index]==='}'){depth--;if(depth===0)break;}
  }
  const matches=new Function(app.slice(start,index+1)+'\nreturn sentenceSpellingMatches;')();
  assert.equal(matches('This is a cat.','This is a cat.'),true);
  assert.equal(matches('  This is a cat.  ','This is a cat.'),true,'zewnętrzne spacje nie powinny blokować dziecka');
  assert.equal(matches('this is a cat.','This is a cat.'),false,'wielka litera jest obowiązkowa');
  assert.equal(matches('This is a cat','This is a cat.'),false,'znak końcowy jest obowiązkowy');
  assert.equal(matches('This  is a cat.','This is a cat.'),false,'odstępy wewnątrz zdania są sprawdzane');

  const pattern=app.slice(app.indexOf('function renderPattern('),app.indexOf('function renderStory('));
  assert.match(pattern,/Teraz przepisz całe zdanie/);
  assert.match(pattern,/Sprawdź pisownię/);
  assert.match(pattern,/noteMistake\('sentence-spelling',item\.id\)/);
  assert.match(pattern,/copyPanel\.hidden=false;[\s\S]*copyInput\.focus\(\)/);
  assert.match(pattern,/function acceptSpelling\(\)[\s\S]*speechPanel\.hidden=false;[\s\S]*playSentenceModel\(\)/,
    'lektor może ruszyć dopiero po poprawnym przepisaniu');
  assert.match(pattern,/if\(completed\|\|!spellingReady\)return;/,'zaliczenie nie może ominąć pisowni');
  assert.match(pattern,/const flawless=attempts===0&&copyAttempts===0/,'błąd pisowni musi odebrać wynik bezbłędny');
  assert.match(pattern,/Pomiń przepisywanie zdania/,'admin potrzebuje pełnej ścieżki testowej');
});

test('M2 porównuje błędne brzmienie dopiero po samodzielnej korekcie', () => {
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const pattern=app.slice(app.indexOf('function renderPattern('),app.indexOf('function renderStory('));
  assert.match(pattern,/lastIncorrectSentence=sentenceTextFromTokens/,'brak zapisu wcześniejszej próby');
  assert.match(pattern,/Porównaj: błędne → poprawne/);
  assert.match(pattern,/if\(lastIncorrectSentence\)[\s\S]*contrastBox\.hidden=false/,
    'porównanie powinno pojawić się dopiero po poprawieniu układu');
  const comparison=pattern.slice(pattern.indexOf("contrastButton.addEventListener('click'"),pattern.indexOf("replayButton.addEventListener('click'"));
  const wrongAt=comparison.indexOf('speakSentence(lastIncorrectSentence');
  const correctAt=comparison.indexOf('speakSentence(sentenceText');
  assert.ok(wrongAt!==-1&&correctAt>wrongAt,'prawidłowa wersja musi być czytana jako ostatnia');
  const errorStart=pattern.lastIndexOf('attempts++;');
  const errorFlow=pattern.slice(errorStart);
  assert.doesNotMatch(errorFlow,/speakSentence\(lastIncorrectSentence/,
    'błędna odpowiedź nie może zostać odtworzona automatycznie');
});

test('M2 ma pomoc gramatyczną dla każdego wzorca i dobre nawyki', () => {
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const start=app.indexOf('const GRAMMAR_TERMS=');
  const end=app.indexOf('const BADGES = [');
  assert.ok(start!==-1&&end>start,'brak danych pomocy gramatycznej');
  const grammar=new Function(app.slice(start,end)+'\nreturn {GRAMMAR_TERMS,GRAMMAR_GUIDES};')();
  PATTERNS.forEach(pattern=>assert.ok(grammar.GRAMMAR_GUIDES[pattern.id],pattern.id+': brak podpowiedzi'));
  ['noun','pronoun','verb','adjective','preposition','question']
    .forEach(term=>assert.ok(grammar.GRAMMAR_TERMS[term],term+': brak definicji'));
  const helper=app.slice(app.indexOf('function grammarSpeechText('),app.indexOf('function renderPattern('));
  assert.match(helper,/Potrzebuję podpowiedzi/);
  assert.match(helper,/wielką literą/);
  assert.match(helper,/znakiem zapytania/);
  assert.match(helper,/appendGrammarBricks/,'angielskie przykłady powinny być osobnymi klockami');
  assert.match(helper,/make\('button','grammar-brick grammar-audio'/,'klocki podpowiedzi powinny być przyciskami');
  assert.match(helper,/brick\.addEventListener\('click',\(\)=>say\(spoken\)\)/,'każdy klocek powinien odtwarzać własną wymowę');
  assert.match(helper,/Odtwórz po angielsku:/,'przycisk odsłuchu potrzebuje dostępnej etykiety');
  const speechStart=helper.indexOf('function grammarSpeechText(');
  const speechEnd=helper.indexOf('\nfunction appendGrammarBricks(',speechStart);
  const grammarSpeechText=new Function(helper.slice(speechStart,speechEnd)+'\nreturn grammarSpeechText;')();
  assert.equal(grammarSpeechText('?'),'question mark');
  assert.equal(grammarSpeechText('.'),'full stop');
  assert.equal(grammarSpeechText('-ing'),'ing ending');
  assert.equal(grammarSpeechText('cat'),'cat');
  const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  assert.match(styles,/\.grammar-brick\{/);
  assert.match(styles,/\.grammar-audio-icon\{/);
  assert.equal(grammar.GRAMMAR_TERMS.noun.english,'noun');
  assert.deepEqual(grammar.GRAMMAR_TERMS.adjective.examples,['happy','tall','blue','small']);
  assert.match(app,/if\(attempts>=2\)grammarHelp\.open=true/);
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

test('M4 korzysta z istniejącego wykrywania mikrofonu', () => {
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(app,/if\(!hasSpeechRecognition\)/);
  assert.doesNotMatch(app,/\bhasSR\b/);
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
    assert.ok(stop.factEn && stop.factEn.length > 20, stop.place + ': brak angielskiej wersji faktu');
    assert.equal(typeof stop.lat, 'number');
    assert.equal(typeof stop.lon, 'number');
  });
  assert.equal(JOURNEY[0].place, 'Jerzykowo');
  assert.equal(JOURNEY[1].place, 'Warszawa');
  // Bez tego eksportu mapa i ekrany przerw byłyby w przeglądarce puste.
  const source = fs.readFileSync(path.join(root, 'journey.js'), 'utf8');
  assert.match(source, /window\.JOURNEY = JOURNEY/);
  ['patterns.js', 'stories.js', 'dialogues.js', 'errors.js'].forEach(file => {
    assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /typeof window !== 'undefined'/, file);
  });
});

test('wyprawa ma statyczną, wbudowaną mapę SVG bez połączeń sieciowych', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

  assert.match(html, /id="journeyRouteMap"/);

  // Mapa jest rysowana w SVG z wbudowanych kształtów, nie z kafelków.
  assert.match(app, /const LAND_SHAPES = \{/, 'brak wbudowanych zarysów lądów');
  assert.match(app, /function drawJourneyMap\(index\)/);
  assert.match(app, /svgEl\('path'/, 'lądy muszą być rysowane jako ścieżki SVG');

  // Żadnego obcego serwera map: ani w kodzie, ani w CSP.
  assert.doesNotMatch(app, /tile\.openstreetmap|https?:\/\/[^'"]*tile/, 'mapa nie może pobierać kafelków z sieci');
  assert.doesNotMatch(server, /tile\.openstreetmap/, 'CSP nie może dopuszczać obcego serwera kafelków');
  assert.match(server, /img-src 'self' data:;/, 'CSP obrazów powinno być zawężone do self i data');

  // Nakładające się przystanki (1-4) rozsuwamy wachlarzem z nicią do punktu.
  assert.match(app, /function mapMarkerPositions\(\)/);
  assert.match(app, /map-fan-thread/, 'zbite punkty muszą mieć nić do prawdziwego miejsca');
  // Budujemy mapMarkerPositions z jego zależnościami: kształty, wymiary,
  // granice projekcji i sama funkcja projekcji.
  const slice = (from, to) => app.slice(app.indexOf(from), app.indexOf(to));
  const positions = new Function('JOURNEY_STOPS',
    slice('const LAND_SHAPES =', 'const SVG_NS =') +
    '\nreturn mapMarkerPositions();')(JOURNEY);
  assert.equal(positions.length, JOURNEY.length);
  const fanned = positions.filter(p => p.fanned).length;
  assert.ok(fanned >= 4, 'co najmniej pierwsze cztery przystanki powinny być rozsunięte, było ' + fanned);
  // Rozsunięte znaczniki nie mogą już leżeć na sobie.
  const fannedPts = positions.filter(p => p.fanned);
  for(let i = 0; i < fannedPts.length; i++){
    for(let j = i + 1; j < fannedPts.length; j++){
      const dist = Math.hypot(fannedPts[i].x - fannedPts[j].x, fannedPts[i].y - fannedPts[j].y);
      assert.ok(dist > 12, 'rozsunięte znaczniki wciąż się nakładają: ' + dist.toFixed(1));
    }
  }

  // Punkty są klikalne i odsłaniają nazwę oraz stan.
  assert.match(app, /marker\.addEventListener\('click',\(\)=>showJourneyStopHint\(position\)\)/,
    'punkty mapy muszą reagować na dotknięcie');
  assert.match(app, /'aria-label', reached/, 'znacznik potrzebuje etykiety dostępności');

  // Mapa jest nieruchoma: bez zoomu, przeciągania i przerysowań przy resize.
  assert.doesNotMatch(app, /journey-map-controls|Powiększ mapę|pointerdown|addEventListener\('resize'/,
    'mapa ma pozostać statyczna');
});

test('wszystkie pliki modułów są serwowane i trafiają do pamięci offline', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  ['patterns.js', 'stories.js', 'dialogues.js', 'errors.js', 'journey.js'].forEach(file => {
    assert.ok(server.includes("'/" + file + "'"), 'serwer nie wystawia ' + file);
    assert.ok(worker.includes("'./" + file + "'"), 'brak w pamięci offline: ' + file);
    assert.ok(html.includes('src="./' + file + '"'), 'brak w HTML: ' + file);
    assert.ok(dockerfile.includes(file), 'Docker pomija ' + file);
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

test('każda odznaka ma ikonę, nagrodę i historyjkę do przeczytania', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const start = app.indexOf('const BADGES = [');
  const end = app.indexOf('const BADGE_TESTS');
  assert.ok(start !== -1 && end > start, 'brak definicji odznak');
  const badges = new Function(app.slice(start, end) + 'return BADGES;')();
  assert.ok(badges.length >= 7, 'za mało odznak');
  badges.forEach(badge => {
    assert.ok(badge.icon, badge.id + ': brak ikony');
    assert.ok(badge.reward, badge.id + ': brak opisu nagrody');
    assert.ok(badge.story && badge.story.split(' ').length >= 30, badge.id + ': historyjka za krótka');
    assert.ok(badge.storyEn && badge.storyEn.split(' ').length >= 30, badge.id + ': brak angielskiej historyjki');
  });
  // Okno, nie znikający napis: zdobycie odznaki ma być momentem.
  assert.match(app, /function showNextBadge\(\)/);
  assert.match(app, /let badgeQueue = \[\]/, 'kilka odznak naraz musi ustawić się w kolejce');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  ['badgeModal', 'badgeStory', 'badgeStoryButton', 'badgeRewardButton', 'badgeClose', 'badgeQueueNote']
    .forEach(id => assert.ok(html.includes('id="' + id + '"'), 'brak elementu ' + id));
  ['badgeN','homeBadgeCount','homeBadgeList','badgeList']
    .forEach(id=>assert.ok(html.includes('id="'+id+'"'),'odznaki nie są widoczne w interfejsie: '+id));
  assert.match(app,/function renderBadgeGallery\(host\)/,'brak wspólnej galerii odznak');
  assert.match(app,/renderBadgeGallery\(\$\('#homeBadgeList'\)\)/,'galeria odznak nie jest renderowana na stronie głównej');
  assert.match(app,/const restoredBadges=checkBadges\(\)/,'wcześniejsze osiągnięcia nie są odzyskiwane po logowaniu');
  assert.match(app,/Warunek odznaki/,'zablokowana odznaka powinna wyjaśniać warunek');
  assert.match(app,/speakSentence\(badge\.storyEn\)/,'angielska historyjka odznaki nie ma lektora');
});

test('opowieść o jerzyku jest dwujęzyczna i ma angielskiego lektora', () => {
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const helper=app.slice(app.indexOf('function appendBilingualJourneyFact('),app.indexOf('function renderStageBreak('));
  assert.match(helper,/Polski/);
  assert.match(helper,/English/);
  assert.match(helper,/stop\.factEn/);
  assert.match(helper,/speakSentence\(stop\.factEn\)/);
  assert.match(app,/appendBilingualJourneyFact\(host,stop\)/);
  assert.match(app,/appendBilingualJourneyFact\(complete,stop\)/);
  assert.match(app,/appendBilingualJourneyFact\(body,stop\)/);
});

test('warunek odznaki detektywa jest osiągalny', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const start = app.indexOf('const BADGE_TESTS');
  const end = app.indexOf('const DAILY_CHALLENGES');
  const tests = new Function('collectedTotal', 'countOk', app.slice(start, end) + 'return BADGE_TESTS;')(
    state => Object.keys(state.cards || {}).length,
    map => Object.values(map || {}).reduce((sum, item) => sum + (item.ok || 0), 0)
  );
  // Wcześniej próg wynosił 20 przy banku liczącym dokładnie 20 pozycji,
  // więc odznaka wymagała trafienia wszystkich za pierwszym razem.
  const threshold = ERROR_BANK.length;
  const almost = Object.fromEntries(Array.from({ length: threshold - 1 }, (_, i) => ['e' + i, { ok: 1 }]));
  assert.equal(tests.detective({ errorCards: almost }), true,
    'odznaka musi być osiągalna bez kompletu bezbłędnych trafień');
  const few = Object.fromEntries(Array.from({ length: 3 }, (_, i) => ['e' + i, { ok: 1 }]));
  assert.equal(tests.detective({ errorCards: few }), false, 'próg nie może być trywialny');
});

test('generator zdań tworzy sensowne warianty i zawsze zwraca zdanie', () => {
  const gen = require('../sentence-gen');
  const owned = new Set(['cat','dog','sister','ball','box','table','happy','sad','key','apple','bird','tree','book','desk']);

  Object.keys(gen.TEMPLATES).forEach(patternId => {
    // Poziom 0: zawsze kotwica, nigdy generator.
    const anchor = gen.makeSentenceTask(patternId, owned, 0);
    assert.ok(anchor && anchor.tokens.length >= 3, patternId + ': brak kotwicy');
    assert.equal(anchor.fromGenerator, false, patternId + ': poziom 0 musi dać kotwicę');
    assert.ok(/[?.!]/.test(anchor.tokens[anchor.tokens.length-1]), patternId + ': brak znaku końca');

    // Wyższy poziom: zdanie nadal powstaje i jest strukturalnie poprawne.
    for(let i = 0; i < 30; i++){
      const task = gen.makeSentenceTask(patternId, owned, 4);
      assert.ok(task && task.tokens.length >= 3, patternId + ': generator zwrócił puste');
      const dup = task.extra.filter(e => task.tokens.includes(e));
      assert.deepEqual(dup, [], patternId + ': pułapka dubluje poprawny klocek');
    }
  });

  // Pusta kolekcja: generator nie ma z czego brać, ale kotwica ratuje.
  const empty = gen.makeSentenceTask('have-got', new Set(), 5);
  assert.ok(empty && empty.tokens.length >= 3, 'przy pustej kolekcji musi zadziałać kotwica');
});

test('M2: dźwięk niosą klocki do układania, nie klocki przykładu', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  // Klocki banku wołają say() po dotknięciu.
  const bankBlock = app.slice(app.indexOf('pool.forEach(token =>'), app.indexOf('bank.append(brick);') + 30);
  assert.match(bankBlock, /say\(grammarSpeechText\(token\)\)/, 'klocek do układania musi wypowiadać słowo');
  assert.match(bankBlock, /brick-audio-icon/, 'klocek do układania potrzebuje ikony dźwięku');
  // Przykład używa niemej wersji.
  assert.match(app, /function appendSilentBricks/, 'brak niemej wersji klocków przykładu');
  assert.match(app, /appendSilentBricks\(hint,grammarExampleTokens/, 'przykład musi używać niemych klocków');
  // Generator jest wpięty w renderPattern.
  assert.match(app, /SENTENCE_GEN\.makeSentenceTask\(item\.pattern/, 'generator nie jest wpięty do układania zdań');
});
