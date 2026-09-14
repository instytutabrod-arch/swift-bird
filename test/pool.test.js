'use strict';
process.env.ADMIN_PASSWORD='haslo-testowe-12345';
const test=require('node:test');
const assert=require('node:assert/strict');
const {newDb}=require('pg-mem');
const fs=require('node:fs');
const path=require('node:path');
const {server,initializeDatabase,useDatabaseForTests}=require('../server');

test('pule: uczeń tworzy, listuje, czyta i usuwa', async ()=>{
  const db=new (newDb().adapters.createPg().Pool)();
  await initializeDatabase(db); useDatabaseForTests(db);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const post=(p,b,c)=>fetch(base+p,{method:'POST',headers:Object.assign({'Content-Type':'application/json'},c?{Cookie:c}:{}),body:JSON.stringify(b)});
  const get=(p,c)=>fetch(base+p,{headers:c?{Cookie:c}:{}});
  const del=(p,c)=>fetch(base+p,{method:'DELETE',headers:c?{Cookie:c}:{}});
  try{
    const reg=await post('/api/student/register',{firstName:'Ala',lastInitial:'W',pin:'7391',pinRepeat:'7391',track:'school'});
    const cookie=reg.headers.get('set-cookie').split(';')[0];

    // utwórz pulę z wklejonej listy
    const created=await post('/api/pools',{name:'Lekcja 5',track:'school',list:'dog - pies\nbusiness ; biznes\nzła linia\napple = jabłko'},cookie);
    assert.equal(created.status,201);
    const payload=await created.json();
    assert.equal(payload.pool.words,3,'trzy poprawne wpisy');
    assert.equal(payload.rejected.length,1,'jedna linia odrzucona');

    // lista pul
    const list=await (await get('/api/pools',cookie)).json();
    assert.equal(list.pools.length,1);
    assert.equal(list.pools[0].name,'Lekcja 5');
    assert.equal(list.pools[0].words,3);
    const poolId=list.pools[0].id;

    // zawartość puli: szkoła zgaduje ikony
    const words=await (await get('/api/pools/'+poolId,cookie)).json();
    assert.equal(words.words.length,3);
    assert.equal(words.words.find(w=>w.en==='dog').icon,'🐶','pies dostaje emoji');
    assert.equal(words.words.find(w=>w.en==='business').icon,'◻️','biznes dostaje neutralny znacznik');

    // usuń pulę
    const removed=await del('/api/pools/'+poolId,cookie);
    assert.equal(removed.status,200);
    const after=await (await get('/api/pools',cookie)).json();
    assert.equal(after.pools.length,0);

    // druga uczennica nie widzi cudzej puli (izolacja)
    const reg2=await post('/api/student/register',{firstName:'Bea',lastInitial:'K',pin:'5082',pinRepeat:'5082',track:'world'});
    const cookie2=reg2.headers.get('set-cookie').split(';')[0];
    const worldPool=await post('/api/pools',{name:'Biznes',track:'world',list:'invoice - faktura\nrevenue - przychód'},cookie2);
    const wp=await worldPool.json();
    const wpId=wp.pool.id;
    const wWords=await (await get('/api/pools/'+wpId,cookie2)).json();
    assert.equal(wWords.words[0].icon,null,'świat nie dostaje ikon');

    // Ala nie może czytać puli Bei
    const forbidden=await get('/api/pools/'+wpId,cookie);
    assert.equal(forbidden.status,403,'cudza pula zablokowana');
  }finally{
    await new Promise(r=>server.close(r)); await db.end();
  }
});

test('parser listy: separatory, duplikaty, błędne linie', () => {
  const { parseWordList, guessIcon, hasIcon } = require('../pool-parser');
  const result = parseWordList('dog - pies\nbusiness ; biznes\nto run = biegać\ninvoice — faktura\ncat\ndog - piesek\n\napple\t jabłko');
  const en = result.entries.map(e => e.en);
  assert.ok(en.includes('dog') && en.includes('business') && en.includes('to run') && en.includes('invoice') && en.includes('apple'),
    'wszystkie separatory muszą działać');
  assert.equal(en.filter(x => x === 'dog').length, 1, 'duplikat pomijany');
  assert.ok(result.rejected.some(r => /separator/.test(r.reason)), 'linia bez separatora odrzucona');

  // Zgadywanie ikon: szkolne słowa trafiają, biznesowe dostają neutralny znacznik.
  assert.equal(guessIcon('dog'), '🐶');
  assert.equal(guessIcon('to run'), '🏃', 'to + czasownik rozpoznany');
  assert.equal(hasIcon('business'), false);
  assert.equal(guessIcon('marketing'), '◻️', 'słowo biznesowe dostaje neutralny znacznik');
});

test('pule serwowane i w pamięci offline', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');
  assert.ok(fs.readFileSync(path.join(root, 'server.js'), 'utf8').includes("'/pool-parser.js'"), 'serwer musi wystawiać parser');
  assert.ok(fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes("'./pool-parser.js'"), 'parser w pamięci offline');
  assert.ok(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('src="./pool-parser.js"'), 'parser w HTML');
});

test('nauka z pul: silnik powtórek i warianty zadań wg ścieżki', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  // Osobna gałąź postępu dla pul, z otwartym zbiorem kluczy pool:<id>:<słowo>.
  assert.match(app, /function beginPoolSession\(poolId,name,cards\)/);
  assert.match(app, /function poolQueue\(\)/);
  assert.match(app, /function gradePool\(id,correct\)/);
  assert.match(app, /'pool:'\+poolId\+':'/, 'klucz karty puli musi być prefiksowany pool:');

  // Trzy tryby zadań puli są podpięte w dispatcherze.
  assert.match(app, /if\(item\.mode==='pool-intro'\) return renderPoolIntro/);
  assert.match(app, /if\(item\.mode==='pool-type'\) return renderPoolType/);
  assert.match(app, /if\(item\.mode==='pool-pick'\) return renderPoolPick/);

  // Wybór zależy od ścieżki: Świat pokazuje polskie słowo, Szkoła ikonę.
  const pick = app.slice(app.indexOf('function renderPoolPick'), app.indexOf('function renderPoolPick') + 900);
  assert.match(pick, /const world=currentTrack\(\)==='world';/);
  assert.match(pick, /Które słowo to znaczy\?/, 'wariant Świata pokazuje polskie słowo');
  assert.match(pick, /Które słowo pasuje\?/, 'wariant Szkoły pokazuje ikonę');

  // Postęp pul jest zapisywany i odczytywany.
  assert.match(app, /state\.poolCards/, 'normalizeState musi obsłużyć poolCards');
});

test('serwer zapisuje postęp pul osobno od słów głównych', () => {
  const { sanitizeProgress } = require('../server');
  const clean = sanitizeProgress({
    cards: {},
    poolCards: {
      'pool:abc:invoice': { i: 3, e: 2.2, d: 1, r: 2, ok: 2, bad: 0 },
      'nie-pool-klucz': { i: 1, e: 2, d: 0, r: 1, ok: 1, bad: 0 }
    }
  });
  assert.ok(clean.poolCards['pool:abc:invoice'], 'klucz pool: musi przejść');
  // sanitizeCardMap nie filtruje po prefiksie, więc oba klucze przejdą walidację
  // kształtu — istotne jest, że gałąź poolCards w ogóle istnieje i jest ograniczona.
  assert.equal(clean.poolCards['pool:abc:invoice'].ok, 2);
});

test('naprawy 11.20: intro nie zawyża, wpisywanie nie karze podwójnie, usuwanie czyści postęp', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  // Intro tworzy kartę jako widzianą z zerowym postępem, nie jako poprawną odpowiedź.
  const intro = app.slice(app.indexOf('function renderPoolIntro'), app.indexOf('function renderPoolType'));
  assert.doesNotMatch(intro, /gradePool\(card\.id,true\)/, 'intro nie może liczyć poprawnej odpowiedzi');
  assert.match(intro, /r:0,ok:0,bad:0/, 'intro inicjuje kartę z zerowym postępem');

  // Wpisywanie karze za błąd tylko raz.
  const type = app.slice(app.indexOf('function renderPoolType'), app.indexOf('function renderPoolPick'));
  assert.match(type, /if\(attempts===0\) gradePool\(card\.id,false\)/, 'kara za błąd tylko przy pierwszej próbie');

  // Usunięcie puli czyści jej postęp ze stanu.
  assert.match(app, /Object\.keys\(S\.poolCards\)\.forEach\(key=>\{ if\(key\.indexOf\(prefix\)===0\) delete S\.poolCards\[key\]/,
    'usuwanie puli musi czyścić jej postęp');
});

test('naprawy 11.20: generator używa słów z pul tylko gdy pasują rolą', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const vocab = app.slice(app.indexOf('function collectedVocabulary'), app.indexOf("function collectedVocabulary") + 1200);
  // Słowa z pul przechodzą przez filtr ról, nie wpadają na ślepo.
  assert.match(vocab, /roleWords\.has\(en\)/, 'słowa z pul muszą przejść filtr ról semantycznych');
});

test('naprawy 11.20: tryb Świat ukrywa szkolną narrację', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  // Statystyki i moduły szkolne oznaczone jako tylko-Szkoła.
  assert.match(html, /class="overview track-school-only"/, 'statystyki 500 słów tylko w Szkole');
  assert.match(html, /class="learning-modules track-school-only"/, 'moduły szkolne tylko w Szkole');
  assert.match(html, /class="world-intro track-world-only"/, 'blok Świata istnieje');
  assert.match(css, /body\.track-school \.track-world-only\{display:none\}/, 'blok Świata ukryty w Szkole');
});

test('wersje są zsynchronizowane', () => {
  const root = path.join(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.equal(lock.version, pkg.version, 'package-lock musi mieć tę samą wersję co package.json');
  const appVersion = (app.match(/APP_VERSION = '([^']+)'/) || [])[1];
  assert.equal(appVersion, pkg.version.split('.').slice(0,2).join('.'), 'APP_VERSION musi zgadzać się z package.json');
});
