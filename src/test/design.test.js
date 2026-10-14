'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname,'..');
const css = fs.readFileSync(path.join(root,'styles.css'),'utf8');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));

function hexToRgb(hex){
  const clean=hex.replace('#','');
  return [0,2,4].map(index=>parseInt(clean.slice(index,index+2),16)/255);
}

function luminance(hex){
  const [r,g,b]=hexToRgb(hex).map(value=>value<=0.03928?value/12.92:Math.pow((value+0.055)/1.055,2.4));
  return 0.2126*r+0.7152*g+0.0722*b;
}

function contrast(first,second){
  const a=luminance(first);const b=luminance(second);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}

function rootColor(name){
  const match=css.match(new RegExp('--'+name+':(#[0-9a-f]{6})','i'));
  assert.ok(match,'brak tokenu koloru --'+name);
  return match[1];
}

test('paleta porcelanowa (doucai/wucai) i fonty hostowane lokalnie',()=>{
  assert.equal(rootColor('ink').toLowerCase(),'#0a1745');
  assert.equal(rootColor('canvas').toLowerCase(),'#f6f8fb');
  assert.equal(rootColor('green').toLowerCase(),'#0a7350');
  assert.match(css,/--display:'Archivo'/);
  assert.match(css,/--body:'Source Sans 3'/);
  assert.doesNotMatch(html,/Baloo|Lexend|Fredoka|Manrope/);
  // Fonty offline: brak linku do Google Fonts, @font-face lokalne, PWA działa bez sieci.
  assert.doesNotMatch(html,/fonts\.googleapis\.com/);
  assert.match(css,/@font-face\{font-family:'Archivo';src:url\('\.\/fonts\//);
  assert.match(css,/@font-face\{font-family:'Source Sans 3'/);
});

test('najważniejsze pary kolorów spełniają kontrast WCAG AA',()=>{
  assert.ok(contrast(rootColor('ink'),rootColor('canvas'))>=7,'tekst główny powinien spełniać AAA');
  assert.ok(contrast(rootColor('muted'),rootColor('canvas'))>=4.5,'tekst pomocniczy powinien spełniać AA');
  assert.ok(contrast(rootColor('pink'),'#ffffff')>=4.5,'biały tekst przycisku powinien spełniać AA');
  assert.ok(contrast(rootColor('danger'),'#ffffff')>=4.5,'komunikat błędu powinien spełniać AA');
});

test('jasny interfejs i identyfikacja PWA są zsynchronizowane',()=>{
  assert.match(css,/\.app-screen\{background:var\(--canvas\);color:var\(--ink\)\}/);
  assert.match(css,/REBRANDING 13\.0/);
  assert.equal(manifest.background_color,'#F6F8FB');
  assert.equal(manifest.theme_color,'#F6F8FB');
  assert.match(html,/<meta name="theme-color" content="#F6F8FB">/);
});

test('główna nawigacja ma cztery stałe obszary i jeden plan na dziś',()=>{
  ['today','learn','progress','profile'].forEach(tab=>{
    assert.match(html,new RegExp('data-rail-tab="'+tab+'"'));
    assert.match(html,new RegExp('data-home-view="'+tab+'"'));
  });
  assert.match(html,/id="studentChrome"/);
  assert.match(html,/id="studentRail"/);
  assert.match(html,/id="todayPrimaryAction"/);
  assert.match(html,/id="todayReason"/);
  assert.match(html,/aria-controls="homeToday"/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,'telefon potrzebuje stałej dolnej nawigacji');
});

test('wszystkie kafelki planu Dzisiaj są prawdziwymi celami dotykowymi',()=>{
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  ['todayPlanExplain','todayCoreAction','todayProgressAction','todayMapAction'].forEach(id=>{
    assert.match(html,new RegExp('<button[^>]*id="'+id+'"[^>]*type="button"'),'kafelek '+id+' powinien być przyciskiem');
    assert.match(app,new RegExp("#"+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'kafelek '+id+' powinien mieć podpięte działanie');
  });
  assert.match(app,/todayCoreAction\.addEventListener\('click',runTodayPrimaryAction\)/,'główny kafelek powinien uruchamiać tę samą rekomendację co przycisk u góry');
  assert.match(app,/todayProgressAction.*goHome\('progress'\)/,'kafelek postępu powinien otwierać Postęp');
  assert.match(app,/todayMapAction.*openJourneyMap/,'kafelek wyprawy powinien otwierać mapę');
  assert.match(css,/\.today-plan-row:focus-visible/,'kafelki planu potrzebują widocznego fokusu');
  assert.match(css,/\.today-note:focus-visible/,'kafelek mapy potrzebuje widocznego fokusu');
});

test('pomoc jest kontekstowa, dobrowolna i możliwa do ponownego otwarcia',()=>{
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(html,/id="learningHelpButton"/);
  assert.match(html,/id="learningHelpLayer"[^>]*hidden/);
  ['home-today','home-learn','home-progress','home-profile'].forEach(context=>assert.match(html,new RegExp('data-help-for="[^"]*'+context)));
  assert.match(app,/homeGuideKey\(\)/);
  assert.match(app,/localStorage\.setItem\(homeGuideKey\(\),'seen'\)/);
  assert.match(app,/setLearningHelpContext\('home-'\+activeHomeTab\)/);
});

test('layout zachowuje czytelne cele dotykowe i nie wymaga samego gestu',()=>{
  assert.match(css,/\.learning-help-button\{[^}]*min-height:48px/);
  assert.match(css,/\.rail-button\{[^}]*min-height:48px/);
  assert.match(html,/Wszystkie gesty przeciągania mają też alternatywę opartą na zwykłym dotknięciu/);
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(ids.length,new Set(ids).size,'identyfikatory HTML nie mogą się powtarzać');
});

test('klocki dają się przestawiać także z klawiatury',()=>{
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(app,/event\.key==='ArrowLeft'/);
  assert.match(app,/event\.key==='ArrowRight'/);
  assert.match(app,/function focusPlacedBrick/);
});

test('ekran Postępu ma działający stan pusty',()=>{
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(html,/id="progressEmpty"[^>]*hidden/);
  assert.match(html,/id="progressEmptyAction"/);
  assert.match(app,/const nothingYet=collected===0&&passed===0/);
});

test('statusy nie polegają wyłącznie na kolorze',()=>{
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(app,/✓ Potwierdzony:/);
  assert.match(app,/🔒 Zdaj ewaluację/);
  assert.match(app,/✓ Własne zdanie i wymowa/);
  assert.match(app,/Jeszcze nie\.|Try again\./);
});
