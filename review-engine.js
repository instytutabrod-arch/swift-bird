'use strict';

(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SwiftBirdReview=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const REVIEW_CONFIG=Object.freeze({
    version:'review-heuristic-v1',
    intervalsDays:Object.freeze([1,3,7,14,30,60]),
    repairDelayMinutes:10,
    supportedFactor:0.55,
    transferFactor:1.20
  });
  const DAY=24*60*60*1000;

  function reviewKey(event){
    const item=(event.languageItems&&event.languageItems[0])||event.skill;
    return [event.skill,event.cognitiveOperation,item].filter(Boolean).join(':');
  }
  function isoAt(timestamp){
    const date=new Date(timestamp||Date.now());
    return Number.isFinite(date.getTime())?date:new Date();
  }
  function scheduleReview(previous,event,config=REVIEW_CONFIG){
    if(!event||!event.outcome||event.outcome.status==='inconclusive')return previous||null;
    const now=isoAt(event.timestamp);
    const state=previous&&typeof previous==='object'?Object.assign({},previous):{
      key:reviewKey(event),stage:0,attempts:0,successes:0,dueAt:null,lastReviewedAt:null,intervalDays:0
    };
    state.key=state.key||reviewKey(event);
    state.skill=event.skill;
    state.operation=event.cognitiveOperation;
    state.languageItem=(event.languageItems&&event.languageItems[0])||null;
    state.attempts=(Number(state.attempts)||0)+1;
    state.lastReviewedAt=now.toISOString();
    const success=event.outcome.status==='correct'&&Number(event.outcome.score)>=0.75;
    if(!success){
      state.stage=Math.max(0,(Number(state.stage)||0)-1);
      state.intervalDays=0;
      state.dueAt=new Date(now.getTime()+config.repairDelayMinutes*60*1000).toISOString();
      state.lastResult='needs_repair';
      return state;
    }
    state.successes=(Number(state.successes)||0)+1;
    const support=event.support||{};
    const independent=!support.hints&&!support.retries&&!support.revealedAnswer;
    state.stage=Math.min(config.intervalsDays.length-1,(Number(state.stage)||0)+(independent?1:0));
    const base=config.intervalsDays[Math.max(0,state.stage)]||config.intervalsDays[0];
    let interval=base*(independent?1:config.supportedFactor);
    if(event.cognitiveOperation==='transfer'&&independent)interval*=config.transferFactor;
    state.intervalDays=Math.max(0.25,Math.round(interval*100)/100);
    state.dueAt=new Date(now.getTime()+state.intervalDays*DAY).toISOString();
    state.lastResult=independent?'independent_success':'supported_success';
    return state;
  }
  function getDueReviews(reviewMap,now=Date.now()){
    const stamp=isoAt(now).getTime();
    return Object.values(reviewMap&&typeof reviewMap==='object'?reviewMap:{})
      .filter(item=>item&&item.dueAt&&new Date(item.dueAt).getTime()<=stamp)
      .sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt));
  }
  function reviewUrgency(item,now=Date.now()){
    if(!item||!item.dueAt)return 0;
    const due=new Date(item.dueAt).getTime();
    const stamp=isoAt(now).getTime();
    if(due>stamp)return 0;
    const overdueDays=(stamp-due)/DAY;
    return Math.min(1,0.55+overdueDays/14);
  }

  return {REVIEW_CONFIG,reviewKey,scheduleReview,getDueReviews,reviewUrgency};
});
