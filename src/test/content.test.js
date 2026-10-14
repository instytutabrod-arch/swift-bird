'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname,'..');

test('słownik ma dokładnie 25 sekcji po 20 unikalnych słów', () => {
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'words.js'),'utf8'),context);
  const sections=context.window.WORD_SECTIONS;
  assert.equal(sections.length,25);
  assert.equal(new Set(sections.map(section=>section.id)).size,25);
  sections.forEach(section => {
    assert.equal(section.words.length,20,section.id);
    assert.equal(new Set(section.words.map(item=>item[2])).size,20,'powtórzony piktogram w '+section.id);
    section.words.forEach(item => {
      assert.equal(item.length,3);
      assert.match(item[0],/^[A-Za-z ]+$/);
      assert.ok(item[1].trim());
      assert.ok(item[2].trim());
    });
  });
  const words=sections.flatMap(section=>section.words.map(item=>item[0].toLowerCase()));
  assert.equal(words.length,500);
  assert.equal(new Set(words).size,500);
});

test('wszystkie stałe elementy używane przez aplikację istnieją w HTML', () => {
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const htmlIds=new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]));
  const requested=[...app.matchAll(/\$\('#([^']+)'\)/g)].map(match=>match[1]);
  const missing=[...new Set(requested.filter(id=>!htmlIds.has(id)))];
  assert.deepEqual(missing,[]);
  assert.doesNotMatch(html,/>\s*Dalej\s*</i);
});

test('formularz logowania wymaga dokładnie 4 cyfr PIN-u', () => {
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(html,/id="studentLogin"[^>]*novalidate/);
  assert.match(html,/id="loginPin"[^>]*inputmode="numeric"[^>]*maxlength="4"/);
  assert.match(app,/PIN musi mieć dokładnie 4 cyfry/);
  assert.doesNotMatch(html,/6-cyfrow|6-cyfr/i);
});

test('manifest i pamięć PWA używają nazwy LingLing oraz nie cacheują API', () => {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
  assert.equal(manifest.name,'LingLing');
  assert.equal(manifest.short_name,'LingLing');
  const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  // Wersja pamieci podrecznej musi zgadzac sie z wersja pakietu, inaczej
  // wdrozenie nie wypchnie nowych plikow na tablet. Nie przypinamy tu
  // konkretnej liczby, zeby test nie pekal przy kazdym podbiciu wersji.
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const expected='swift-bird-v'+pkg.version.split('.').slice(0,2).join('-');
  assert.match(worker,new RegExp("const VERSION = '"+expected+"';"));
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(app,new RegExp("const APP_VERSION = '"+pkg.version.split('.').slice(0,2).join('.')+"';"));
  assert.match(worker,/pathname\.startsWith\('\/api\/'\)/);
});

test('tryb testowy jest dostępny tylko dla sesji administratora', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  // Warunkiem jest rola 'admin', a nie sama flaga, wiec podmiana zmiennej
  // w konsoli przez ucznia nie wystarczy do wlaczenia pomijania.
  assert.match(app, /function inTestMode\(\)\{ return testMode && currentUser && currentUser\.role==='admin'; \}/);

  // Administracyjne przyciski makeSkip powstaja tylko w trybie testowym:
  // zwykły bezpiecznik mikrofonu nie zalicza odpowiedzi, tylko ustawia powtórkę.
  const skips = app.match(/inTestMode\(\)/g) || [];
  assert.ok(skips.length >= 6, 'zbyt mało miejsc sprawdzających tryb testowy: ' + skips.length);
  // Karta słowa ma dla każdego ucznia przycisk 'Pomiń wymowę' (makieta), ale nie zalicza
  // wymowy: zapisuje 'inconclusive' i słowo wraca w powtórce.
  const introSrc = app.slice(app.indexOf('function renderIntro('), app.indexOf('function makeSkip('));
  assert.match(introSrc, /skip\.addEventListener\('click',\(\)=>\{clearTimeout\(advanceTimer\);accept\(false\);\}\)/);
  assert.match(app, /if\(inTestMode\(\)\) stage\.append\(makeSkip\('Pomiń wpisywanie'/);
  assert.match(app, /makeSkip\('Pomiń przepisywanie zdania'/);

  // Wejscie tylko z panelu i tylko dla admina.
  assert.match(app, /function enterTestMode\(\)\{\s*if\(!currentUser\|\|currentUser\.role!=='admin'\)return;/);
  // Wejscie w panel gasi tryb, zeby nie zostal wlaczony po powrocie.
  assert.match(app, /async function enterAdmin\(\)\{testMode=false;/);

  // Przycisk uruchamiajacy tryb istnieje wylacznie w ekranie administratora.
  const adminSection = html.slice(html.indexOf('id="s-admin"'), html.indexOf('id="s-exam"') > html.indexOf('id="s-admin"') ? html.length : html.length);
  assert.ok(adminSection.includes('id="openTestMode"'), 'przycisk trybu testowego poza panelem administratora');
});

test('postęp nigdy nie jest zapisywany dla roli innej niż uczeń', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  // To jest druga, niezalezna zapora: nawet gdyby tryb testowy przeciekl,
  // klikanie w nim nie zapisze niczego na koncie ucznia.
  assert.match(app, /function saveProgress\(\)\{[\s\S]{0,120}currentUser\.role !== 'student'\) return;/);
});

test('dobór głosu preferuje zwykły głos systemowy i odrzuca głosy efektowe', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const start = app.indexOf('const NATURAL_VOICE_HINTS=');
  const end = app.indexOf('function voiceIdentity(');
  assert.ok(start !== -1 && end > start, 'brak modułu doboru głosu');
  const score = new Function(app.slice(start, end) + '\nreturn voiceScore;')();

  const rank = list => list.slice().sort((a, b) => score(b) - score(a))[0].name;

  // Głos domyślny urządzenia ma pierwszeństwo przed zgadywaniem płci po nazwie.
  assert.equal(rank([
    {name: 'English system voice', lang: 'en-US', default: true, localService:true},
    {name: 'Google UK English Female', lang: 'en-GB', localService:true}
  ]), 'English system voice');

  // Stabilny głos lokalny wygrywa z podobnym głosem wymagającym sieci.
  assert.equal(rank([
    {name: 'English Voice', lang: 'en-US', localService:true},
    {name: 'English Natural Online', lang: 'en-US', localService:false}
  ]), 'English Voice');

  assert.ok(score({name: 'Zarvox', lang: 'en-US', default:true}) < -1000);
  assert.ok(score({name: 'Google UK English Female', lang: 'en-GB', localService:true}) > 0);
  assert.equal(
    score({name: 'English Voice', lang: 'en-GB'}),
    score({name: 'English Voice', lang: 'en-US'}),
    'aplikacja nie może narzucać brytyjskiego ani amerykańskiego dialektu'
  );
});

test('wybór lektora można zapisać dla urządzenia i odsłuchać w panelu', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html,/id="voiceSelect"/);
  assert.match(html,/Posłuchaj wybranego głosu/);
  assert.match(app,/VOICE_STORAGE_KEY='swift-bird:english-voice'/);
  assert.match(app,/storeVoiceIdentity\(requested\)/);
  assert.match(app,/addEventListener\('voiceschanged',\(\)=>pickVoice\(\)\)/);
});

test('lektor mówi w naturalnym tempie i z neutralną wysokością', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const utterance = app.slice(app.indexOf('function makeUtterance('), app.indexOf('function speakSequence('));
  assert.match(utterance,/utterance\.rate=1;/);
  assert.match(utterance,/utterance\.pitch=1;/);
  assert.doesNotMatch(utterance,/rate=\.[0-9]+|pitch=1\.[0-9]+/);
});

test('zdania i słowa są czytane bez sztucznego opóźnienia', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app,/function say\(text\)\{ speakSequence\(\[text\]\); \}/);
  const sentence = app.slice(app.indexOf('function speakSentence('), app.indexOf('function normalizeSpeech('));
  assert.match(sentence,/speakSequence\(\[String\(text\|\|''\)\.trim\(\)\],onDone\)/);
  assert.doesNotMatch(sentence,/split|setTimeout|PAUSE|pauseMs/);
  assert.doesNotMatch(sentence,/\.rate\s*=|\.pitch\s*=/);
});

test('mikrofon wspiera naukę, ale po dwóch próbach nie blokuje sesji', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app,/const MAX_SPEECH_GATE_ATTEMPTS=2;/);
  const intro=app.slice(app.indexOf('function renderIntro('),app.indexOf('function makeSkip('));
  assert.match(intro,/Pomiń wymowę/);
  assert.match(intro,/accept\(false\)/);
  assert.match(intro,/attempts>=MAX_SPEECH_GATE_ATTEMPTS/);
  assert.match(intro,/verified\?'correct':'inconclusive'/);
  const typing=app.slice(app.indexOf('function renderType('),app.indexOf('function renderChoice('));
  assert.match(typing,/const clean=tries===0;/,
    'wynik ASR nie może obniżać osobnej, poprawnej próby pisowni');
  assert.doesNotMatch(typing,/speechReviewIds/);
  const sentence=app.slice(app.indexOf('function renderPattern('),app.indexOf('function renderStory('));
  assert.match(sentence,/Przejdź dalej · powtórzę zdanie później/);
  assert.match(sentence,/finishSentence\(false\)/);
  assert.match(sentence,/speechAttempts>=MAX_SPEECH_GATE_ATTEMPTS/);
  assert.match(sentence,/gradeIn\(S\.patterns,item\.id,independentLanguage\)/);
  assert.doesNotMatch(sentence,/noteMistake\('sentence-speech'/);
});

test('trafiona para na egzaminie nie wywołuje pochwały', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  // Wypowiadane jest samo słowo, bez "Good".
  assert.match(app, /speakSequence\(\[card\.en\],\(\)=>\{/);
  assert.doesNotMatch(app, /speakSequence\(\[card\.en,'Good'\]/);
  // Komunikat przy błędzie zostaje, bo to informacja, nie pochwała.
  assert.match(app, /feedback\.textContent='Try again'/);
});

test('egzamin otwiera się dopiero po 20 zebranych słowach, także w trybie testowym', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

  // startExam nie ma zadnej furtki dla trybu testowego.
  const guard = app.slice(app.indexOf('function startExam('), app.indexOf('function renderExamRound('));
  assert.match(guard, /sectionCollected\(index\)!==20/);
  assert.doesNotMatch(guard, /inTestMode/, 'startExam nie może omijać bramki 20 słów');

  // Oba przyciski "Zdaj egzamin" wymagaja count===20 i nie sa warunkowane trybem.
  // Trzy miejsca po dodaniu „następnego kroku" w podsumowaniu sesji.
  const occurrences = app.match(/[^\n]*'Zdaj egzamin[^']*'[^\n]*/g) || [];
  assert.ok(occurrences.length >= 2, 'przyciski egzaminu muszą istnieć');
  // Sedno testu: żadne z nich nie omija bramki przez tryb testowy.
  occurrences.forEach(line => assert.doesNotMatch(line, /inTestMode/));
  assert.match(app, /if\(count\s*===\s*20\s*&&\s*!passed\)\{/);
  assert.match(app, /if\(!sentenceSession\s*&&\s*!poolSession\s*&&\s*count\s*===\s*20\s*&&\s*!sectionPassed\(currentSectionIndex\)\)\{/);

  // Tryb testowy skraca droge DO bramki, uzupelniajac sekcje.
  assert.match(app, /if\(inTestMode\(\) && count<20\)\{/);
  assert.match(app, /makeSkip\('Uzupełnij sekcję do 20 słów'/);
});
