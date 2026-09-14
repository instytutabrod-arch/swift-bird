'use strict';
process.env.ADMIN_PASSWORD='haslo-testowe-12345';
const test=require('node:test');
const assert=require('node:assert/strict');
const {newDb}=require('pg-mem');
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
