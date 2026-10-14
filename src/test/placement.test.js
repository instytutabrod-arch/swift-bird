'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {TENSES}=require('../tenses');
const P=require('../placement');
const BLOOM=require('../bloom-lab');

const bank=P.buildPlacementBank(TENSES);

function runAdaptive(answer){
  const session=P.createAdaptiveSession({seed:'test'});
  while(!session.done){
    const item=P.itemForSession(session,bank);
    assert.ok(item,'silnik zawsze znajduje następne zadanie');
    P.scoreAnswer(session,item,answer(item,session));
  }
  return session;
}

test('bank poziomujący jest proporcjonalny i wykorzystuje 24 zadania czasów',()=>{
  assert.ok(bank.length>=48,'bank ma co najmniej tyle zadań co przed dodaniem C1/C2');
  P.LEVEL_IDS.forEach(level=>assert.equal(bank.filter(item=>item.cefr===level).length,12,level+' ma mieć 12 zadań'));
  assert.equal(bank.filter(item=>item.source==='tenses').length,24);
  bank.forEach(item=>{
    assert.ok(item.options.length>=2,item.id);
    assert.ok(item.options[item.answer]!==undefined,item.id);
    assert.ok(['grammar','meaning','vocabulary','communication','reading'].includes(item.area),item.id);
  });
});

test('adaptacyjne schodki przypisują skrajne i pośrednie poziomy',()=>{
  const allCorrect=runAdaptive(item=>item.answer);
  assert.equal(allCorrect.result.level,'C2');
  // Droga na sam szczyt jest dłuższa o dwa poziomy (C1, C2): 20 pytań.
  assert.equal(allCorrect.answers.length,20);
  assert.equal(allCorrect.result.confidence,'wysoka');

  const allWrong=runAdaptive(item=>(item.answer+1)%item.options.length);
  assert.equal(allWrong.result.level,'A1');
  assert.equal(allWrong.answers.length,8);
  assert.equal(allWrong.result.foundationNeedsWork,true);

  const a2=runAdaptive(item=>item.cefr==='A2'?item.answer:(item.answer+1)%item.options.length);
  assert.equal(a2.result.level,'A2');
  assert.equal(a2.answers.length,8);
});

test('wynik graniczny uruchamia pytania potwierdzające',()=>{
  const session=runAdaptive((item,state)=>{
    const position=state.answers.length-state.blockStart;
    return position%2===0?item.answer:(item.answer+1)%item.options.length;
  });
  assert.ok(session.decisions.some(decision=>decision.confirmed));
  assert.equal(session.result.confidence,'ostrożna');
  assert.ok(session.answers.length>8);
});

test('najdłuższa jawna ścieżka adaptacyjna ma 30 pytań, nie fikcyjne 18',()=>{
  const session=runAdaptive((item,state)=>{
    const position=state.answers.length-state.blockStart;
    if(state.confirming)return item.answer;
    return position<2?item.answer:(item.answer+1)%item.options.length;
  });
  assert.equal(session.result.level,'C2');
  assert.equal(session.answers.length,P.PLACEMENT_POLICY.maxAdaptiveItems);
  assert.equal(P.PLACEMENT_POLICY.maxAdaptiveItems,30);
});

test('ewaluacja poziomu wymaga 6 z 8 i nie korzysta z osi Blooma',()=>{
  const run=correctAnswers=>{
    const session=P.createLevelCheckSession('B1',{seed:'level-'+correctAnswers});
    while(!session.done){
      const item=P.itemForSession(session,bank);const index=session.answers.length<correctAnswers?item.answer:(item.answer+1)%item.options.length;
      P.scoreAnswer(session,item,index);
    }
    return session.result;
  };
  assert.equal(run(6).passed,true);
  assert.equal(run(5).passed,false);
  assert.equal(Object.hasOwn(run(8),'bloom'),false,'test CEFR nie może zwracać wyniku Blooma');
});

test('pracownia sprawdza formę własnej wypowiedzi bez narzucania jednego zdania',()=>{
  const task=BLOOM.BLOOM_LAB_TASKS['present-continuous'].create;
  assert.equal(BLOOM.inspectCreation('She is reading a book now.',task).passed,true);
  const wrong=BLOOM.inspectCreation('she reads',task);
  assert.equal(wrong.passed,false);
  assert.ok(wrong.checks.some(check=>!check.ok));
});

test('interfejs i paczka wdrożeniowa zawierają test oraz pracownię',()=>{
  const root=path.join(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const docker=fs.readFileSync(path.join(root,'Dockerfile'),'utf8');
  const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  ['s-level-center','s-placement','s-bloom-lab'].forEach(id=>assert.ok(html.includes('id="'+id+'"'),id));
  ['placement.js','bloom-lab.js'].forEach(file=>{assert.ok(html.includes('./'+file));assert.ok(docker.includes('COPY public ./public'));assert.ok(fs.existsSync(path.join(root,file)));assert.ok(worker.includes('./'+file));});
  assert.ok(html.includes('A1–C2'));
  assert.ok(!html.includes('Orientacyjny CEFR · A1–B2'));
});
