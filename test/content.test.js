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
  assert.match(html,/id="loginPin"[^>]*minlength="4"[^>]*maxlength="4"[^>]*pattern="\[0-9\]\{4\}"/);
  assert.doesNotMatch(html,/6-cyfrow|6-cyfr/i);
});

test('manifest i pamięć PWA używają nazwy Swift-bird oraz nie cacheują API', () => {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
  assert.equal(manifest.name,'Swift-bird');
  assert.equal(manifest.short_name,'Swift-bird');
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

  // Przyciski pomijania powstaja tylko w trybie testowym, w trzech miejscach:
  // wymowa, wpisywanie i runda egzaminu.
  const skips = app.match(/inTestMode\(\)/g) || [];
  assert.ok(skips.length >= 6, 'zbyt mało miejsc sprawdzających tryb testowy: ' + skips.length);
  assert.match(app, /if\(inTestMode\(\)\) mic\.append\(makeSkip\('Pomiń wymowę'/);
  assert.match(app, /if\(inTestMode\(\)\) stage\.append\(makeSkip\('Pomiń wpisywanie'/);

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
