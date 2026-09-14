'use strict';

process.env.ADMIN_PASSWORD='bezpieczne-haslo-testowe';

const test = require('node:test');
const assert = require('node:assert/strict');
const {newDb}=require('pg-mem');
const {
  server,initializeDatabase,useDatabaseForTests,
  normalizeName,cleanFirstName,cleanInitial,validFirstName,validInitial,validPin,
  sanitizeProgress,hashSecret,verifySecret,safeEqual
}=require('../server');

test('schemat PostgreSQL tworzy wszystkie tabele aplikacji', async () => {
  const memory=newDb();
  const adapter=memory.adapters.createPg();
  const database=new adapter.Pool();
  await initializeDatabase(database);
  const result=await database.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  assert.deepEqual(result.rows.map(row=>row.table_name),['sessions','student_progress','students']);
  await database.end();
});

test('pełny przepływ API: administrator, konto ucznia i postęp', async () => {
  const memory=newDb();
  const adapter=memory.adapters.createPg();
  const database=new adapter.Pool();
  await initializeDatabase(database);useDatabaseForTests(database);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();const base='http://127.0.0.1:'+address.port;
  const post=(path,body,cookie)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
  try{
    const health=await fetch(base+'/api/health');assert.equal(health.status,200);
    assert.equal(health.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
    assert.match(health.headers.get('content-security-policy'),/img-src[^;]*https:\/\/tile\.openstreetmap\.org/);

    const adminLogin=await post('/api/admin/login',{password:'bezpieczne-haslo-testowe'});
    assert.equal(adminLogin.status,200);const adminCookie=adminLogin.headers.get('set-cookie').split(';')[0];

    const createdResponse=await post('/api/admin/students',{firstName:'Maja',lastInitial:'K'},adminCookie);
    assert.equal(createdResponse.status,201);const created=(await createdResponse.json()).student;
    assert.match(created.pin,/^\d{4}$/);

    const studentLogin=await post('/api/student/login',{firstName:'maja',lastInitial:'k',pin:created.pin});
    assert.equal(studentLogin.status,200);const studentCookie=studentLogin.headers.get('set-cookie').split(';')[0];

    const saved=await fetch(base+'/api/progress',{method:'PUT',headers:{'Content-Type':'application/json',Cookie:studentCookie},body:JSON.stringify({state:{cards:{'animals-home:cat':{i:1,e:2.2,d:1,r:1,ok:1,bad:0}},patterns:{'to-be-positive#0':{i:1,e:2.2,d:1,r:1,ok:1,bad:0}},passedExams:[]}})});
    assert.equal(saved.status,200);
    const progress=await fetch(base+'/api/progress',{headers:{Cookie:studentCookie}});assert.equal(progress.status,200);
    assert.ok((await progress.json()).state.cards['animals-home:cat']);

    const list=await fetch(base+'/api/admin/students',{headers:{Cookie:adminCookie}});assert.equal(list.status,200);
    const students=(await list.json()).students;assert.equal(students.length,1);assert.equal(students[0].displayName,'Maja K.');assert.equal(students[0].wordsCollected,1);assert.equal(students[0].sentencesCompleted,1);

    const reset=await post('/api/admin/students/'+created.id+'/reset-pin',{},adminCookie);
    assert.equal(reset.status,200);const newPin=(await reset.json()).student.pin;assert.match(newPin,/^\d{4}$/);
    const expiredSession=await fetch(base+'/api/progress',{headers:{Cookie:studentCookie}});assert.equal(expiredSession.status,401);
    const oldLogin=await post('/api/student/login',{firstName:'Maja',lastInitial:'K',pin:created.pin});assert.equal(oldLogin.status,401);
    const newLogin=await post('/api/student/login',{firstName:'Maja',lastInitial:'K',pin:newPin});assert.equal(newLogin.status,200);
  }finally{
    await new Promise(resolve=>server.close(resolve));await database.end();
  }
});

test('dane logowania ucznia są czyszczone i sprawdzane', () => {
  assert.equal(cleanFirstName('  Żaneta   Maria '),'Żaneta Maria');
  assert.equal(normalizeName('  ŻANETA   Maria '),'żaneta maria');
  assert.equal(cleanInitial(' źródło '),'Ź');
  assert.equal(validFirstName("Anne-Marie"),true);
  assert.equal(validFirstName(''),false);
  assert.equal(validInitial('Ł'),true);
  assert.equal(validPin('1234'),true);
  assert.equal(validPin('12345'),false);
});

test('PIN jest haszowany i można go bezpiecznie sprawdzić', async () => {
  const encoded=await hashSecret('4829');
  assert.notEqual(encoded,'4829');
  assert.equal(await verifySecret('4829',encoded),true);
  assert.equal(await verifySecret('4830',encoded),false);
  assert.equal(safeEqual('sekret','sekret'),true);
  assert.equal(safeEqual('sekret','inny'),false);
});

test('postęp z żądania jest ograniczony do bezpiecznego formatu', () => {
  const state=sanitizeProgress({
    streak:-8,sessions:4.4,lastDay:'2026-09-09-extra',
    cards:{'animals-home:cat':{i:999,e:99,d:-2,r:-1,ok:3,bad:2}},
    passedExams:['animals-home','nie-istnieje']
  });
  assert.equal(state.streak,0);
  assert.equal(state.sessions,4);
  assert.equal(state.lastDay,'2026-09-09');
  assert.deepEqual(state.passedExams,['animals-home']);
  assert.equal(state.cards['animals-home:cat'].i,365);
  assert.equal(state.cards['animals-home:cat'].e,2.6);
  assert.equal(state.cards['animals-home:cat'].d,0);
});
