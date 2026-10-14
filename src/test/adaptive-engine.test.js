'use strict';

process.env.ADMIN_PASSWORD='bezpieczne-haslo-testowe';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {newDb}=require('pg-mem');
const Events=require('../learning-events');
const Mastery=require('../mastery-engine');
const Review=require('../review-engine');
const Learner=require('../learner-model');
const Tasks=require('../task-engine');
const Adaptation=require('../adaptation-engine');
const {server,initializeDatabase,useDatabaseForTests}=require('../server');

function event(overrides={}){
  return Events.createEvent(Object.assign({
    id:'event-1',sessionId:'session-1',timestamp:'2026-09-01T10:00:00.000Z',
    eventType:'task_attempt',taskId:'question-formation:recognition',taskType:'recognition',
    skill:'question_formation',languageItems:['to-be-question'],cefr:'A1',bloomLevel:'understand',
    cognitiveOperation:'recognition',modality:'touch',outcome:{status:'correct',score:1},
    support:{hints:0,retries:0,revealedAnswer:false},timing:{responseMs:2500},
    context:{mode:'learning',source:'test',delayedRetrieval:false}
  },overrides));
}

test('event jest zminimalizowany, walidowany i nie przechowuje odpowiedzi ucznia',()=>{
  const clean=Events.createEvent(Object.assign(event(),{input:{answer:'wrażliwa treść'},outcome:{correct:true,errorTypes:['word order']}}));
  assert.equal(clean.outcome.status,'correct');
  assert.equal(clean.outcome.errorTypes[0],'word_order');
  assert.equal(Object.prototype.hasOwnProperty.call(clean,'input'),false);
  assert.throws(()=>Events.createEvent({taskId:'x'}),/skill jest wymagane/);
});

test('rozpoznanie nie podnosi produkcji, a pomoc osłabia wagę dowodu',()=>{
  const independent=event();
  const supported=event({id:'event-2',support:{hints:1,retries:1,revealedAnswer:true}});
  const first=Mastery.updateSkillState(null,independent);
  const second=Mastery.updateSkillState(null,supported);
  assert.ok(first.dimensions.recognition.evidenceWeight>second.dimensions.recognition.evidenceWeight);
  assert.equal(first.dimensions.production.evidenceScore,null);
  assert.equal(first.dimensions.production.observations,0);
});

test('nierozstrzygnięty wynik ASR nie obniża profilu wymowy',()=>{
  const speech=event({id:'speech-1',taskId:'question-formation:production',taskType:'contextual_production',cognitiveOperation:'production',modality:'speaking',outcome:{status:'inconclusive',score:null}});
  const state=Mastery.updateSkillState(null,speech);
  assert.equal(state.dimensions.production.evidenceScore,null);
  assert.equal(state.dimensions.production.evidenceWeight,0);
  assert.equal(state.modalities.speaking.inconclusive,1);
});

test('model jest odtwarzalny z eventów i rozróżnia naprawę od błędu',()=>{
  const wrong=event({id:'a',timestamp:'2026-09-01T10:00:00.000Z',outcome:{status:'incorrect',score:0,errorTypes:['question_formation']}});
  const repair=event({id:'b',timestamp:'2026-09-01T10:01:00.000Z',eventType:'repair_attempt',outcome:{status:'correct',score:1},support:{hints:1,retries:1,revealedAnswer:false}});
  const first=Learner.rebuildFromEvents([repair,wrong],'student-1');
  const second=Learner.rebuildFromEvents([wrong,repair],'student-1');
  assert.deepEqual(first,second);
  assert.equal(first.statistics.events,2);
  assert.equal(first.errors['question_formation:question_formation'].frequency,1);
  assert.ok(first.skills.question_formation.dimensions.recognition.evidenceWeight>0);
});

test('powtórka oddziela trwałość dowodu od bieżącego terminu',()=>{
  const first=Review.scheduleReview(null,event());
  assert.equal(first.lastResult,'independent_success');
  assert.ok(new Date(first.dueAt)>new Date(first.lastReviewedAt));
  const failed=Review.scheduleReview(first,event({id:'e2',timestamp:'2026-09-05T10:00:00.000Z',outcome:{status:'incorrect',score:0}}));
  assert.equal(failed.lastResult,'needs_repair');
  assert.equal(Review.getDueReviews({x:failed},'2026-09-05T10:11:00.000Z').length,1);
});

test('rekomendacja jest deterministyczna, ma reason code i nie skacze za wcześnie do transferu',()=>{
  const catalog=Tasks.makeQuestionFormationTasks();
  const transferTask=catalog.find(task=>task.cognitiveOperation==='transfer');
  assert.equal(transferTask.route.patternId,'to-be-question','transfer ma używać odblokowanego wzorca pytań, nie przeskakiwać do późniejszego modułu');
  const blank=Learner.createLearnerModel('student-1');
  const a=Adaptation.selectNextBestTask(catalog,blank,{now:'2026-09-10T10:00:00.000Z'});
  const b=Adaptation.selectNextBestTask(catalog,blank,{now:'2026-09-10T10:00:00.000Z'});
  assert.equal(a.task.id,b.task.id);
  assert.equal(a.task.cognitiveOperation,'recognition');
  assert.ok(a.reasons.length);
  assert.notEqual(a.task.cognitiveOperation,'transfer');

  let ready=blank;
  const operations=['recognition','recall','controlled_production','production'];
  operations.forEach((operation,index)=>{
    for(let pass=0;pass<5;pass++)ready=Learner.updateFromEvent(ready,event({
      id:'ready-'+index+'-'+pass,taskId:'question-formation:'+operation,cognitiveOperation:operation,
      taskType:operation==='production'?'contextual_production':operation,timestamp:new Date(Date.UTC(2026,8,1,index,pass)).toISOString()
    }));
  });
  const transfer=Adaptation.selectNextBestTask(catalog,ready,{now:'2026-09-20T10:00:00.000Z'});
  assert.ok(transfer.reasons.length);
  assert.ok(transfer.task);
});

test('API zapisuje event append-only, jest idempotentne i zwraca profil',async()=>{
  const memory=newDb();const adapter=memory.adapters.createPg();const database=new adapter.Pool();
  await initializeDatabase(database);useDatabaseForTests(database);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const post=(path,body,cookie)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
  try{
    const registration=await post('/api/student/register',{firstName:'Ewa',lastInitial:'N',pin:'7391',pinRepeat:'7391',track:'school'});
    assert.equal(registration.status,201);const cookie=registration.headers.get('set-cookie').split(';')[0];
    const attempt=event({id:'api-event-1'});
    const first=await post('/api/events',{event:attempt},cookie);assert.equal(first.status,201);
    const firstBody=await first.json();assert.equal(firstBody.duplicate,false);assert.ok(firstBody.nextTask.reasons.length);
    const duplicate=await post('/api/events',{event:attempt},cookie);assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).duplicate,true);
    const profile=await fetch(base+'/api/learner/model',{headers:{Cookie:cookie}});assert.equal(profile.status,200);
    const model=(await profile.json()).model;assert.equal(model.statistics.events,1);assert.ok(model.skills.question_formation);
    const secondRegistration=await post('/api/student/register',{firstName:'Ola',lastInitial:'R',pin:'8642',pinRepeat:'8642',track:'school'});
    assert.equal(secondRegistration.status,201);const secondCookie=secondRegistration.headers.get('set-cookie').split(';')[0];
    const sameClientId=await post('/api/events',{event:attempt},secondCookie);
    assert.equal(sameClientId.status,201,'identyczny identyfikator klienta u innego ucznia nie może blokować zapisu');
    const rows=await database.query('SELECT event_id FROM learning_events');assert.equal(rows.rows.length,2);

    // Cache nie jest źródłem prawdy: po zmianie wersji ma się odtworzyć
    // z append-only eventów, bez podwójnego naliczenia próby.
    const firstStudent=(await database.query("SELECT id FROM students WHERE first_name='Ewa'")).rows[0].id;
    await database.query('UPDATE learner_models SET model_version=0,model=$1 WHERE student_id=$2',[{version:0,statistics:{events:999}},firstStudent]);
    const rebuilt=await fetch(base+'/api/learner/model',{headers:{Cookie:cookie}});
    assert.equal(rebuilt.status,200);
    const rebuiltModel=(await rebuilt.json()).model;
    assert.equal(rebuiltModel.version,Learner.MODEL_VERSION);
    assert.equal(rebuiltModel.statistics.events,1);
    const cache=(await database.query('SELECT model_version FROM learner_models WHERE student_id=$1',[firstStudent])).rows[0];
    assert.equal(cache.model_version,Learner.MODEL_VERSION);
  }finally{await new Promise(resolve=>server.close(resolve));await database.end();}
});

test('pakiet przeglądarkowy i Docker zawierają cały pionowy slice v13',()=>{
  const root=path.join(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const serviceWorker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  const docker=fs.readFileSync(path.join(root,'Dockerfile'),'utf8');
  const modules=['learning-events.js','mastery-engine.js','review-engine.js','learner-model.js','task-engine.js','adaptation-engine.js'];
  modules.forEach(file=>{
    assert.match(html,new RegExp('<script src="\\./'+file.replace('.','\\.')+'"'));
    assert.match(serviceWorker,new RegExp("'\\./"+file.replace('.','\\.')+"'"));
    assert.match(docker,new RegExp(file.replace('.','\\.')));
  });
  assert.match(html,/id="adaptiveEvidenceCard"/);
  assert.match(html,/id="studentChrome"/);
  assert.match(app,/writeEventQueue\(readEventQueue\(\)\.filter\(/,'wysłanie eventu nie może nadpisać nowszego wpisu w kolejce');
  assert.match(app,/adaptiveHomeEnabled/,'adaptacyjny ekran ma flagę bezpiecznego wdrożenia');
});

test('praktyka mówienia w Świecie jest dobrowolna i nie obniża karty przy nierozstrzygniętym ASR',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
  const speak=app.slice(app.indexOf('function renderPoolSpeak('),app.indexOf('function renderPoolType('));
  assert.match(speak,/Pomiń · wrócę do tego później/);
  assert.match(speak,/status:'inconclusive'/);
  assert.doesNotMatch(speak,/gradePool\(/);
});
