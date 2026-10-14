'use strict';

(function(root,factory){
  const mastery=typeof module!=='undefined'&&module.exports?require('./mastery-engine'):(root&&root.SwiftBirdMastery);
  const review=typeof module!=='undefined'&&module.exports?require('./review-engine'):(root&&root.SwiftBirdReview);
  const api=factory(mastery,review);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SwiftBirdAdaptation=api;
})(typeof window!=='undefined'?window:globalThis,function(Mastery,Review){
  const ADAPTATION_CONFIG=Object.freeze({
    version:'transparent-ranking-v1',
    dueWeight:0.34,
    errorWeight:0.22,
    needWeight:0.30,
    evidenceWeight:0.14,
    repetitionPenalty:0.24,
    readinessThreshold:0.56,
    supportedEvidenceThreshold:1.2
  });
  const PROGRESSION=['recognition','recall','controlled_production','production','transfer'];
  const REASON_TEXT=Object.freeze({
    DUE_REVIEW:'Ta umiejętność jest gotowa do przypomnienia po przerwie.',
    RECENT_ERROR:'Niedawny błąd wskazuje, że krótka naprawa będzie teraz użyteczna.',
    WEAK_DIMENSION:'Ten sposób użycia języka wychodzi na razie słabiej niż pozostałe.',
    BUILD_EVIDENCE:'Mamy jeszcze za mało niezależnych prób, aby uczciwie ocenić tę umiejętność.',
    TRANSFER_READY:'Podstawy są potwierdzone, więc pora użyć języka w nowym kontekście.',
    DIVERSITY_ROTATION:'Zmieniamy rodzaj aktywności, aby nie ćwiczyć wciąż tego samego mechanicznie.',
    SAFE_CURRICULUM_FALLBACK:'Brakuje jeszcze danych adaptacyjnych, dlatego zaczynamy od bezpiecznego kroku programu.'
  });

  function dimension(model,task){
    const skill=model&&model.skills&&model.skills[task.skill];
    return skill&&skill.dimensions&&skill.dimensions[task.cognitiveOperation]
      ? skill.dimensions[task.cognitiveOperation]
      : Mastery.emptyDimension();
  }
  function prerequisitesReady(model,task,config=ADAPTATION_CONFIG){
    const index=PROGRESSION.indexOf(task.cognitiveOperation);
    if(index<=0)return true;
    const skill=model&&model.skills&&model.skills[task.skill];
    if(!skill||!skill.dimensions)return false;
    const required=PROGRESSION.slice(0,index);
    /* Produkcja i transfer nie wymagają perfekcji, ale muszą istnieć
       choć umiarkowane dowody z wcześniejszego poziomu rusztowania. */
    return required.slice(Math.max(0,required.length-2)).every(id=>{
      const state=skill.dimensions[id];
      return state&&state.evidenceWeight>=config.supportedEvidenceThreshold&&state.evidenceScore>=config.readinessThreshold;
    });
  }
  function matchingReviews(model,task,now){
    return Review.getDueReviews(model&&model.review,now).filter(item=>item.skill===task.skill&&item.operation===task.cognitiveOperation);
  }
  function matchingErrors(model,task,now){
    const stamp=new Date(now).getTime();
    return Object.values(model&&model.errors?model.errors:{})
      .filter(error=>error.skill===task.skill)
      .map(error=>{
        const age=Math.max(0,(stamp-new Date(error.lastSeen||0).getTime())/(24*60*60*1000));
        return error.frequency*error.severity*error.communicativeImpact/(1+age/7);
      });
  }
  function scoreTask(task,model,options={}){
    const config=options.config||ADAPTATION_CONFIG;const now=options.now||Date.now();
    const state=dimension(model,task);const reasons=[];
    const due=matchingReviews(model,task,now);
    const dueNeed=due.length?Math.max(...due.map(item=>Review.reviewUrgency(item,now))):0;
    if(dueNeed>0)reasons.push('DUE_REVIEW');
    const errors=matchingErrors(model,task,now);
    const errorNeed=errors.length?Math.min(1,Math.max(...errors)):0;
    if(errorNeed>0.1)reasons.push('RECENT_ERROR');
    const masteryNeed=state.evidenceScore===null?0.62:Math.max(0,1-state.evidenceScore);
    if(state.evidenceScore!==null&&state.evidenceScore<0.68)reasons.push('WEAK_DIMENSION');
    const confidenceNeed=state.evidenceWeight<4?Math.max(0,1-state.evidenceWeight/4):0;
    if(confidenceNeed>0.35)reasons.push('BUILD_EVIDENCE');
    const ready=prerequisitesReady(model,task,config);
    if(task.cognitiveOperation==='transfer'&&ready)reasons.push('TRANSFER_READY');
    const recent=(model&&model.statistics&&Array.isArray(model.statistics.recentTasks))?model.statistics.recentTasks:[];
    const repeated=recent.slice(-2).includes(task.id)?1:0;
    if(recent.length&&recent[recent.length-1]===task.id)reasons.push('DIVERSITY_ROTATION');
    let score=config.dueWeight*dueNeed+config.errorWeight*errorNeed+config.needWeight*masteryNeed+config.evidenceWeight*confidenceNeed;
    if(task.cognitiveOperation==='transfer'&&ready)score+=0.08;
    if(!ready)score-=0.55;
    score-=repeated*config.repetitionPenalty;
    return {task,score:Math.round(score*1000)/1000,reasons:[...new Set(reasons)],ready,components:{dueNeed,errorNeed,masteryNeed,confidenceNeed,repetitionPenalty:repeated*config.repetitionPenalty}};
  }
  function selectNextBestTask(tasks,model,options={}){
    const candidates=(Array.isArray(tasks)?tasks:[]).map(task=>scoreTask(task,model,options))
      .filter(candidate=>candidate.ready)
      .sort((a,b)=>b.score-a.score||a.task.id.localeCompare(b.task.id));
    if(candidates.length){
      const selected=candidates[0];
      if(!selected.reasons.length)selected.reasons=['SAFE_CURRICULUM_FALLBACK'];
      return Object.assign(selected,{reasonText:selected.reasons.map(code=>REASON_TEXT[code]).filter(Boolean)});
    }
    const fallback=(Array.isArray(tasks)?tasks:[]).find(task=>task.cognitiveOperation==='recognition')||(tasks||[])[0]||null;
    if(!fallback)return null;
    return {task:fallback,score:0,reasons:['SAFE_CURRICULUM_FALLBACK'],reasonText:[REASON_TEXT.SAFE_CURRICULUM_FALLBACK],ready:true,components:{}};
  }

  return {ADAPTATION_CONFIG,PROGRESSION,REASON_TEXT,prerequisitesReady,scoreTask,selectNextBestTask};
});
