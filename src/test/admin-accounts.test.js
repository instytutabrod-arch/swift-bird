'use strict';
process.env.ADMIN_PASSWORD='bezpieczne-haslo-testowe-123';
const test=require('node:test');
const assert=require('node:assert/strict');
const {newDb}=require('pg-mem');
const {server,initializeDatabase,useDatabaseForTests}=require('../server');

test('administrator może wyłączyć, wyeksportować i usunąć konto ucznia', async () => {
  const db=new (newDb().adapters.createPg().Pool)();
  await initializeDatabase(db); useDatabaseForTests(db);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const post=(p,b,c)=>fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json',...(c?{Cookie:c}:{})},body:JSON.stringify(b)});
  const get=(p,c)=>fetch(base+p,{headers:c?{Cookie:c}:{}});
  const del=(p,c)=>fetch(base+p,{method:'DELETE',headers:c?{Cookie:c}:{}});
  try{
    const cookie=(await post('/api/admin/login',{password:'bezpieczne-haslo-testowe-123'})).headers.get('set-cookie').split(';')[0];
    const created=await (await post('/api/admin/students',{firstName:'Testowy',lastInitial:'X',track:'school'},cookie)).json();
    const id=created.student.id;

    // Eksport zwraca profil i postęp.
    const ex=await (await get('/api/admin/students/'+id+'/export',cookie)).json();
    assert.equal(ex.export.firstName,'Testowy');
    assert.ok('progress' in ex.export,'eksport musi zawierać postęp');

    // Wyłączenie: konto nieaktywne, uczeń nie może się zalogować, ale jest na liście.
    assert.equal((await (await post('/api/admin/students/'+id+'/active',{active:false},cookie)).json()).student.active,false);
    const login=await post('/api/student/login',{firstName:'Testowy',lastInitial:'X',pin:created.student.pin});
    assert.notEqual(login.status,200,'wyłączony uczeń nie może się zalogować');
    const list=await (await get('/api/admin/students',cookie)).json();
    assert.ok(list.students.some(s=>s.id===id&&s.active===false),'wyłączony musi być widoczny, by go włączyć/usunąć');

    // Włączenie z powrotem.
    assert.equal((await (await post('/api/admin/students/'+id+'/active',{active:true},cookie)).json()).student.active,true);

    // Usunięcie: nieodwracalne, znika z listy.
    assert.equal((await (await del('/api/admin/students/'+id,cookie)).json()).deleted,true);
    const after=await (await get('/api/admin/students',cookie)).json();
    assert.ok(!after.students.some(s=>s.id===id),'usunięty musi zniknąć z listy');
  }finally{ await new Promise(r=>server.close(r)); await db.end(); }
});
