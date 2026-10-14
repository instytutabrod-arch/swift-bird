'use strict';

/*
 * Orientacyjny test poziomujący LingLing.
 *
 * Mierzy wyłącznie oś CEFR (poziom językowy) w zakresie A1-C2. Nie mierzy
 * Blooma i nie udaje certyfikowanego egzaminu. Progi są jawne, dobrane
 * projektowo i zapisane poniżej. Test ma jeden cel: wskazać sensowne miejsce
 * startu, żeby osoba, która już coś umie, nie musiała zaczynać od zera.
 *
 * Schodki:
 *   1. start od A2;
 *   2. blok 4 zadań: 3-4 poprawne = krok wyżej, 0-1 = krok niżej;
 *   3. wynik 2/4 uruchamia 2 zadania potwierdzające; łącznie potrzeba 4/6;
 *   4. zwykle test trwa 8-20 zadań; przy granicznym wyniku na każdym
 *      kolejnym schodku może dojść do 30 zadań.
 *
 * Bank jest proporcjonalny: zadania na każdym poziomie A1-C2. Dwadzieścia
 * cztery pozycje powstają z istniejących ćwiczeń czasów; pozostałe równoważą
 * słownictwo, rozumienie, funkcje komunikacyjne i krótkie czytanie.
 */

const LEVEL_IDS=['A1','A2','B1','B2','C1','C2'];
const LEVEL_INDEX=Object.fromEntries(LEVEL_IDS.map((id,index)=>[id,index]));
const PLACEMENT_POLICY=Object.freeze({
  startLevel:'A2',
  baseBlockSize:4,
  confirmationSize:2,
  basePass:3,
  baseFail:1,
  confirmedPass:4,
  levelCheckSize:8,
  levelCheckPass:6,
  maxAdaptiveItems:30,
  scope:'A1-C2',
  claim:'orientacyjny poziom startowy, nie certyfikat CEFR'
});

const FILL_OPTIONS=Object.freeze({
  'present-simple:1':{options:['eats','eat','is eating','ate'],answer:0},
  'present-continuous:1':{options:['are watching','watch','watched','have watched'],answer:0},
  'past-simple:1':{options:['played','play','are playing','have played'],answer:0},
  'past-continuous:1':{options:['were playing','played','are playing','have played'],answer:0},
  'present-perfect:1':{options:['has finished','finished','finishes','is finishing'],answer:0},
  'future-will:1':{options:['will be','is','was','is being'],answer:0},
  'future-going-to:1':{options:['is going to snow','snows','snowed','has snowed'],answer:0},
  'present-perfect-continuous:1':{options:['has been studying','studied','studies','is studying'],answer:0}
});

function knowledgeForBloom(bloom){
  if(bloom==='understand'||bloom==='analyze')return 'conceptual';
  if(bloom==='apply'||bloom==='evaluate')return 'procedural';
  if(bloom==='create')return 'metacognitive';
  return 'factual';
}

function tensePlacementItems(tenses){
  return (tenses||[]).flatMap(tense=>(tense.drills||[]).map((drill,index)=>{
    const key=tense.id+':'+index;
    const fill=FILL_OPTIONS[key];
    let options=[];let answer=0;let prompt=drill.q||drill.prompt||'';
    if(drill.type==='fill'){
      options=fill?fill.options.slice():[drill.answer];answer=fill?fill.answer:0;
    }else if(drill.type==='contrast'){
      options=[drill.a,drill.b];answer=drill.correct;
    }else{
      options=(drill.options||[]).slice();answer=drill.correct;
    }
    return {
      id:'tense:'+key,
      cefr:drill.cefr,
      area:drill.type==='contrast'?'meaning':'grammar',
      source:'tenses',
      prompt,
      options,
      answer,
      bloom:drill.bloom,
      knowledge:drill.knowledge||knowledgeForBloom(drill.bloom),
      track:'both'
    };
  }));
}

/* Zadania uzupełniające nie sprawdzają encyklopedycznej wiedzy o regułach.
   Uczeń wybiera znaczenie albo formę w krótkiej sytuacji komunikacyjnej. */
const SUPPLEMENT_ITEMS=[
  {id:'a1-greeting',cefr:'A1',area:'communication',prompt:'Someone says: “How are you?” What is the best answer?',options:['I am fine, thank you.','I have ten years.','It is a pencil.','On Monday.'],answer:0},
  {id:'a1-name',cefr:'A1',area:'grammar',prompt:'My name ___ Ola.',options:['is','are','am','be'],answer:0},
  {id:'a1-family',cefr:'A1',area:'vocabulary',prompt:'Which word means “siostra”?',options:['sister','brother','mother','cousin'],answer:0},
  {id:'a1-sign',cefr:'A1',area:'reading',prompt:'A sign says “CLOSED”. What does it mean?',options:['The place is not open.','Come inside now.','Food is free.','Turn left.'],answer:0},
  {id:'a1-routine',cefr:'A1',area:'meaning',prompt:'Which sentence describes a daily routine?',options:['I go to school every day.','I went to school yesterday.','I am going to school now.','I have gone home.'],answer:0},
  {id:'a1-possessive',cefr:'A1',area:'grammar',prompt:'This is Anna. ___ book is blue.',options:['Her','His','Their','Our'],answer:0},
  {id:'a1-can',cefr:'A1',area:'communication',prompt:'Choose the sentence about an ability.',options:['I can swim.','I am swim.','I swimming.','I swam tomorrow.'],answer:0},
  {id:'a1-where',cefr:'A1',area:'grammar',prompt:'___ is my bag? It is under the chair.',options:['Where','Who','When','Why'],answer:0},
  {id:'a1-weather',cefr:'A1',area:'vocabulary',prompt:'It is very cold and white snow is falling. The weather is ___.',options:['snowy','sunny','dry','hot'],answer:0},
  {id:'a1-read',cefr:'A1',area:'reading',prompt:'“Ben has a red bike. He rides it to school.” How does Ben travel?',options:['By bike.','By bus.','On foot.','By train.'],answer:0},

  {id:'a2-shop',cefr:'A2',area:'communication',prompt:'You want to know the price. What do you ask?',options:['How much is it?','How old is it?','Where are you from?','What time is it?'],answer:0},
  {id:'a2-comparison',cefr:'A2',area:'grammar',prompt:'A train is usually ___ than a bicycle.',options:['faster','fastest','more fast','fast'],answer:0},
  {id:'a2-read',cefr:'A2',area:'reading',prompt:'“The museum opens at ten, but on Sundays it opens at noon.” When does it open on Sunday?',options:['At 12:00.','At 10:00.','In the evening.','It is closed.'],answer:0},

  {id:'b1-condition',cefr:'B1',area:'grammar',prompt:'If it rains tomorrow, we ___ at home.',options:['will stay','stayed','would stay','have stayed'],answer:0},
  {id:'b1-purpose',cefr:'B1',area:'communication',prompt:'You did not hear the last sentence in a meeting. What is the best response?',options:['Could you say that again, please?','You must say it yesterday.','I do not listening.','Repeat because yes.'],answer:0},
  {id:'b1-inference',cefr:'B1',area:'reading',prompt:'“Maya took an umbrella although the sky was clear.” What can we infer?',options:['She thought it might rain later.','It was already raining heavily.','She wanted to buy an umbrella.','She could not see the sky.'],answer:0},

  {id:'b2-passive',cefr:'B2',area:'grammar',prompt:'The final decision ___ by the whole team yesterday.',options:['was made','made','has making','was make'],answer:0},
  {id:'b2-reported',cefr:'B2',area:'grammar',prompt:'Sara said, “I am tired.” Choose the correct report.',options:['Sara said that she was tired.','Sara said that I am tired.','Sara says she tired yesterday.','Sara told that she is tired.'],answer:0},
  {id:'b2-condition',cefr:'B2',area:'grammar',prompt:'If I ___ more time, I would learn another language.',options:['had','have','will have','would have'],answer:0},
  {id:'b2-deduction',cefr:'B2',area:'meaning',prompt:'The lights are off and nobody answers. They ___ be at home.',options:['cannot','must','should to','have to'],answer:0},
  {id:'b2-linker',cefr:'B2',area:'meaning',prompt:'The plan is expensive. ___, it could save us time later.',options:['Nevertheless','Because','Unless','Therefore of'],answer:0},
  {id:'b2-attitude',cefr:'B2',area:'reading',prompt:'“The proposal is ambitious, though its timetable seems optimistic.” What is the writer’s attitude?',options:['Interested but doubtful about timing.','Completely opposed to the idea.','Certain it will finish early.','Unaware of the timetable.'],answer:0},
  {id:'b2-collocation',cefr:'B2',area:'vocabulary',prompt:'Choose the natural expression.',options:['meet a deadline','catch a deadline','arrive a deadline','win a deadline'],answer:0},
  {id:'b2-register',cefr:'B2',area:'communication',prompt:'Which sentence is most appropriate in a professional email?',options:['Could you please confirm the delivery date?','Tell me the date right now.','What about my stuff?','You confirm date, yes?'],answer:0},
  {id:'c1-inversion',cefr:'C1',area:'grammar',prompt:'___ had we started than the system crashed.',options:['No sooner','Hardly when','Not until','As soon'],answer:0},
  {id:'c1-cleft',cefr:'C1',area:'grammar',prompt:'It was her patience ___ finally solved the conflict.',options:['that','which was','what','who'],answer:0},
  {id:'c1-phrasal',cefr:'C1',area:'vocabulary',prompt:'The negotiations ___ at the last minute over one clause.',options:['fell through','fell off','fell down','fell out'],answer:0},
  {id:'c1-nuance',cefr:'C1',area:'meaning',prompt:'“I couldn\u2019t agree more.” What does the speaker mean?',options:['They fully agree.','They slightly disagree.','They are unsure.','They refuse to answer.'],answer:0},
  {id:'c1-tone',cefr:'C1',area:'reading',prompt:'“One might argue the strategy was, at best, courageous.” The tone is:',options:['Subtly critical.','Openly enthusiastic.','Purely neutral.','Strongly supportive.'],answer:0},
  {id:'c1-hedging',cefr:'C1',area:'communication',prompt:'Choose the most diplomatically worded objection.',options:['I wonder whether that fully addresses the risk.','That is simply wrong.','No, we will not do that.','That makes no sense at all.'],answer:0},
  {id:'c2-idiom',cefr:'C2',area:'vocabulary',prompt:'The new hire really ___ the ground running.',options:['hit','ran','took','caught'],answer:0},
  {id:'c2-subjunctive',cefr:'C2',area:'grammar',prompt:'The board insisted that every proposal ___ reviewed independently.',options:['be','is','was','being'],answer:0},
  {id:'c2-collocation',cefr:'C2',area:'vocabulary',prompt:'Her argument, though elegant, ___ close scrutiny.',options:['does not withstand','does not resist','does not hold up with','does not support'],answer:0},
  {id:'c2-implicature',cefr:'C2',area:'meaning',prompt:'“The report was, shall we say, creative with the figures.” This implies the figures were:',options:['Manipulated.','Highly accurate.','Carefully audited.','Missing entirely.'],answer:0},
  {id:'c2-cohesion',cefr:'C2',area:'reading',prompt:'“The policy succeeded; its critics, notwithstanding, remained unconvinced.” What does notwithstanding signal?',options:['Concession despite success.','Cause of success.','Agreement with critics.','A time sequence.'],answer:0},
  {id:'c2-precision',cefr:'C2',area:'communication',prompt:'Which verb most precisely conveys reluctant agreement?',options:['acquiesce','celebrate','demand','announce'],answer:0},
  {id:'c1-relative',cefr:'C1',area:'grammar',prompt:'The proposal, ___ merits are clear, still needs funding.',options:['whose','which','that','who\u2019s'],answer:0},
  {id:'c1-modal-past',cefr:'C1',area:'grammar',prompt:'They ___ have warned us; the risk was obvious.',options:['should','must','will','would'],answer:0},
  {id:'c1-lexis',cefr:'C1',area:'vocabulary',prompt:'A ___ decline in sales worried the board.',options:['marked','marking','remarkable of','marked up'],answer:0},
  {id:'c1-gist',cefr:'C1',area:'reading',prompt:'“The results, while encouraging, warrant caution.” The writer is:',options:['Positive but careful.','Entirely dismissive.','Wholly certain.','Indifferent.'],answer:0},
  {id:'c1-function',cefr:'C1',area:'meaning',prompt:'“I\u2019d rather we didn\u2019t rush this.” The speaker is:',options:['Advising delay politely.','Demanding speed.','Refusing to help.','Agreeing eagerly.'],answer:0},
  {id:'c2-inversion',cefr:'C2',area:'grammar',prompt:'Not only ___ the deadline, but they exceeded the brief.',options:['did they meet','they met','they did meet','met they'],answer:0},
  {id:'c2-nuance2',cefr:'C2',area:'meaning',prompt:'“That\u2019s one way of putting it.” This usually signals:',options:['Polite disagreement.','Full endorsement.','Total confusion.','A direct order.'],answer:0},
  {id:'c2-collocation2',cefr:'C2',area:'vocabulary',prompt:'The scandal ___ serious doubts about governance.',options:['raised','lifted','arose','rose'],answer:0},
  {id:'c2-register2',cefr:'C2',area:'communication',prompt:'Most formal way to decline in writing?',options:['We regret that we are unable to proceed.','No thanks, not for us.','Nah, we\u2019ll pass.','We don\u2019t want it.'],answer:0},
  {id:'c2-cohesion2',cefr:'C2',area:'reading',prompt:'“Its logic is sound; its tone, however, alienates readers.” The critique targets:',options:['Style, not reasoning.','Reasoning, not style.','Length only.','Grammar only.'],answer:0},
  {id:'c1-emphasis',cefr:'C1',area:'grammar',prompt:'Only after the review ___ apparent.',options:['did the true cost become','the true cost became','became the true cost','the true cost did become'],answer:0},
  {id:'c2-formal-verb',cefr:'C2',area:'vocabulary',prompt:'The committee ___ the findings before publication.',options:['scrutinised','looked','watched','stared at'],answer:0}
].map(item=>({...item,source:'supplement',bloom:'understand',knowledge:'conceptual',track:'both'}));

function buildPlacementBank(tenses){
  const bank=tensePlacementItems(tenses).concat(SUPPLEMENT_ITEMS).filter(item=>LEVEL_INDEX[item.cefr]!==undefined);
  return bank.map(item=>Object.freeze({...item,options:Object.freeze(item.options.slice())}));
}

function hash(value){
  let h=2166136261;
  for(const char of String(value)){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}
  return h>>>0;
}
function countBy(items,key){
  return items.reduce((out,item)=>{const id=item[key]||'other';out[id]=(out[id]||0)+1;return out;},{});
}
function itemForSession(session,bank){
  if(session.done)return null;
  const asked=new Set(session.answers.map(answer=>answer.id));
  const blockAnswers=session.answers.slice(session.blockStart);
  const inBlock=countBy(blockAnswers,'area');
  const overall=countBy(session.answers,'area');
  const candidates=bank.filter(item=>item.cefr===session.currentLevel&&!asked.has(item.id)&&(item.track==='both'||item.track===session.track));
  candidates.sort((left,right)=>{
    const a=(inBlock[left.area]||0)*100+(overall[left.area]||0)*10+(hash(left.id+session.seed)%10);
    const b=(inBlock[right.area]||0)*100+(overall[right.area]||0)*10+(hash(right.id+session.seed)%10);
    return a-b;
  });
  return candidates[0]||null;
}

function createAdaptiveSession(options={}){
  return {
    mode:'placement',track:options.track==='world'?'world':'school',seed:String(options.seed||Date.now()),
    currentLevel:PLACEMENT_POLICY.startLevel,blockStart:0,blockTarget:PLACEMENT_POLICY.baseBlockSize,
    confirming:false,baseCorrect:0,answers:[],decisions:[],done:false,result:null
  };
}
function createLevelCheckSession(level,options={}){
  const selected=LEVEL_INDEX[level]===undefined?'A1':level;
  return {
    mode:'level',track:options.track==='world'?'world':'school',seed:String(options.seed||Date.now()),
    currentLevel:selected,blockStart:0,blockTarget:PLACEMENT_POLICY.levelCheckSize,
    confirming:false,baseCorrect:0,answers:[],decisions:[],done:false,result:null
  };
}

function evidenceReport(answers){
  const levels={};const areas={};
  LEVEL_IDS.forEach(level=>{levels[level]={asked:0,correct:0};});
  answers.forEach(answer=>{
    const target=levels[answer.cefr]||(levels[answer.cefr]={asked:0,correct:0});
    target.asked++;if(answer.correct)target.correct++;
    const area=areas[answer.area]||(areas[answer.area]={asked:0,correct:0,byLevel:{}});
    if(!area.byLevel)area.byLevel={};
    area.asked++;if(answer.correct)area.correct++;
    const lvl=area.byLevel[answer.cefr]||(area.byLevel[answer.cefr]={asked:0,correct:0});
    lvl.asked++;if(answer.correct)lvl.correct++;
  });
  // Poziom CEFR sprawności: najwyższy poziom, na którym uczeń odpowiadał
  // poprawnie (co najmniej połowę pytań tego poziomu w tym obszarze).
  const areaCefr=area=>{
    let best=null;
    LEVEL_IDS.forEach(level=>{
      const cell=area.byLevel&&area.byLevel[level];
      if(cell&&cell.asked>0&&cell.correct/cell.asked>=0.5) best=level;
    });
    return best;
  };
  const areaList=Object.entries(areas).map(([id,value])=>({id,...value,ratio:value.asked?value.correct/value.asked:0,cefr:areaCefr(value)})).sort((a,b)=>b.ratio-a.ratio||b.asked-a.asked);
  return {levels,areas:areaList};
}
function placementResult(session,level,foundationNeedsWork=false){
  const evidence=evidenceReport(session.answers);
  const unsure=session.answers.filter(answer=>answer.unsure).length;
  const hadConfirmation=session.decisions.some(item=>item.confirmed);
  let confidence='średnia';
  if(hadConfirmation||unsure/session.answers.length>0.2)confidence='ostrożna';
  else if(session.answers.length>=12&&unsure===0)confidence='wysoka';
  return {
    mode:'placement',level,unlockedLevel:level,confidence,foundationNeedsWork,
    answered:session.answers.length,correct:session.answers.filter(answer=>answer.correct).length,
    evidence,completedAt:new Date().toISOString(),policy:PLACEMENT_POLICY.claim
  };
}
function levelCheckResult(session){
  const correct=session.answers.filter(answer=>answer.correct).length;
  const passed=correct>=PLACEMENT_POLICY.levelCheckPass;
  return {
    mode:'level',level:session.currentLevel,passed,correct,total:session.answers.length,
    evidence:evidenceReport(session.answers),completedAt:new Date().toISOString()
  };
}

function finishAdaptiveDecision(session,passed,confirmed){
  const level=session.currentLevel;
  session.decisions.push({level,passed,confirmed});
  if(level==='A1'){
    session.done=true;session.result=placementResult(session,'A1',!passed);return;
  }
  if(level==='A2'){
    session.currentLevel=passed?'B1':'A1';
  }else if(level==='B1'){
    if(passed)session.currentLevel='B2';
    else{session.done=true;session.result=placementResult(session,'A2');return;}
  }else if(level==='B2'){
    if(passed)session.currentLevel='C1';
    else{session.done=true;session.result=placementResult(session,'B1');return;}
  }else if(level==='C1'){
    if(passed)session.currentLevel='C2';
    else{session.done=true;session.result=placementResult(session,'B2');return;}
  }else if(level==='C2'){
    session.done=true;session.result=placementResult(session,passed?'C2':'C1');return;
  }
  session.blockStart=session.answers.length;session.blockTarget=PLACEMENT_POLICY.baseBlockSize;
  session.confirming=false;session.baseCorrect=0;
}

function scoreAnswer(session,item,selectedIndex){
  if(session.done||!item||item.cefr!==session.currentLevel)return session;
  const unsure=selectedIndex===null||selectedIndex===undefined;
  session.answers.push({id:item.id,cefr:item.cefr,area:item.area,source:item.source,correct:!unsure&&Number(selectedIndex)===item.answer,unsure});
  const block=session.answers.slice(session.blockStart);
  if(session.mode==='level'){
    if(block.length>=session.blockTarget){session.done=true;session.result=levelCheckResult(session);}
    return session;
  }
  if(block.length<session.blockTarget)return session;
  const correct=block.filter(answer=>answer.correct).length;
  if(!session.confirming){
    if(correct>=PLACEMENT_POLICY.basePass)return finishAdaptiveDecision(session,true,false)||session;
    if(correct<=PLACEMENT_POLICY.baseFail)return finishAdaptiveDecision(session,false,false)||session;
    session.confirming=true;session.baseCorrect=correct;
    session.blockStart=session.answers.length;session.blockTarget=PLACEMENT_POLICY.confirmationSize;
    return session;
  }
  const passed=session.baseCorrect+correct>=PLACEMENT_POLICY.confirmedPass;
  finishAdaptiveDecision(session,passed,true);
  return session;
}

function nextLevel(level){
  const index=LEVEL_INDEX[level]===undefined?0:LEVEL_INDEX[level];
  return LEVEL_IDS[Math.min(LEVEL_IDS.length-1,index+1)];
}
function maxLevel(left,right){
  return (LEVEL_INDEX[right]||0)>(LEVEL_INDEX[left]||0)?right:left;
}

const placementExports={
  LEVEL_IDS,LEVEL_INDEX,PLACEMENT_POLICY,SUPPLEMENT_ITEMS,
  knowledgeForBloom,tensePlacementItems,buildPlacementBank,
  createAdaptiveSession,createLevelCheckSession,itemForSession,scoreAnswer,
  evidenceReport,nextLevel,maxLevel
};
if(typeof window!=='undefined')window.PLACEMENT=placementExports;
if(typeof module!=='undefined')module.exports=placementExports;
