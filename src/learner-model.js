'use strict';

(function(root,factory){
  const mastery=typeof module!=='undefined'&&module.exports?require('./mastery-engine'):(root&&root.SwiftBirdMastery);
  const review=typeof module!=='undefined'&&module.exports?require('./review-engine'):(root&&root.SwiftBirdReview);
  const api=factory(mastery,review);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SwiftBirdLearnerModel=api;
})(typeof window!=='undefined'?window:globalThis,function(Mastery,Review){
  const MODEL_VERSION=1;
  const ERROR_IMPACT=Object.freeze({
    word_order:0.85,question_formation:0.90,auxiliary:0.80,negation:0.75,
    meaning:1.00,missing_word:0.75,spelling:0.45,article:0.35,pronunciation:0.60,unknown:0.50
  });

  function createLearnerModel(userId,profile={}){
    return {
      version:MODEL_VERSION,
      evidenceModelVersion:Mastery.PEDAGOGY_CONFIG.version,
      reviewModelVersion:Review.REVIEW_CONFIG.version,
      userId:String(userId||''),
      updatedAt:null,
      cefrProfile:profile.cefrProfile||{},
      skills:{},
      languageItems:{},
      errors:{},
      review:{},
      fluency:{},
      preferences:profile.preferences||{},
      statistics:{events:0,conclusiveEvents:0,correct:0,partial:0,incorrect:0,inconclusive:0,recentTasks:[]},
      appliedEventIds:[]
    };
  }
  function cloneModel(model,userId){
    if(!model||typeof model!=='object')return createLearnerModel(userId);
    const copy=JSON.parse(JSON.stringify(model));
    copy.version=MODEL_VERSION;
    copy.userId=String(copy.userId||userId||'');
    copy.skills=copy.skills||{};copy.languageItems=copy.languageItems||{};copy.errors=copy.errors||{};copy.review=copy.review||{};
    copy.statistics=copy.statistics||{events:0,conclusiveEvents:0,correct:0,partial:0,incorrect:0,inconclusive:0,recentTasks:[]};
    copy.statistics.recentTasks=Array.isArray(copy.statistics.recentTasks)?copy.statistics.recentTasks.slice(-12):[];
    copy.appliedEventIds=Array.isArray(copy.appliedEventIds)?copy.appliedEventIds.slice(-500):[];
    return copy;
  }
  function errorKey(event,type){return [event.skill,type].filter(Boolean).join(':');}
  function updateErrorProfile(model,event){
    const outcome=event.outcome||{};
    if(outcome.status==='correct'||outcome.status==='inconclusive')return;
    const types=outcome.errorTypes&&outcome.errorTypes.length?outcome.errorTypes:['unknown'];
    types.forEach(type=>{
      const key=errorKey(event,type);
      const previous=model.errors[key]||{
        id:key,skill:event.skill,errorType:type,frequency:0,severity:ERROR_IMPACT[type]||ERROR_IMPACT.unknown,
        communicativeImpact:ERROR_IMPACT[type]||ERROR_IMPACT.unknown,lastSeen:null,examples:0
      };
      previous.frequency++;
      previous.examples++;
      previous.lastSeen=event.timestamp;
      previous.languageItem=(event.languageItems&&event.languageItems[0])||previous.languageItem||null;
      model.errors[key]=previous;
    });
  }
  function updateFromEvent(previous,event){
    const model=cloneModel(previous,previous&&previous.userId);
    if(model.appliedEventIds.includes(event.id))return model;
    model.skills[event.skill]=Mastery.updateSkillState(model.skills[event.skill],event);
    (event.languageItems||[]).forEach(itemId=>{
      const itemEvent=Object.assign({},event,{skill:itemId});
      model.languageItems[itemId]=Mastery.updateSkillState(model.languageItems[itemId],itemEvent);
    });
    updateErrorProfile(model,event);
    const key=Review.reviewKey(event);
    const scheduled=Review.scheduleReview(model.review[key],event);
    if(scheduled)model.review[key]=scheduled;
    const status=(event.outcome&&event.outcome.status)||'inconclusive';
    model.statistics.events=(Number(model.statistics.events)||0)+1;
    model.statistics[status]=(Number(model.statistics[status])||0)+1;
    if(status!=='inconclusive')model.statistics.conclusiveEvents=(Number(model.statistics.conclusiveEvents)||0)+1;
    model.statistics.recentTasks.push(event.taskId);model.statistics.recentTasks=model.statistics.recentTasks.slice(-12);
    model.updatedAt=event.timestamp;
    model.appliedEventIds.push(event.id);model.appliedEventIds=model.appliedEventIds.slice(-500);
    return model;
  }
  function rebuildFromEvents(events,userId,profile={}){
    const ordered=(Array.isArray(events)?events:[]).slice().sort((a,b)=>{
      const byTime=String(a.timestamp||'').localeCompare(String(b.timestamp||''));
      return byTime||String(a.id||'').localeCompare(String(b.id||''));
    });
    return ordered.reduce((model,event)=>updateFromEvent(model,event),createLearnerModel(userId,profile));
  }
  function getSkillMastery(model,skillId){
    return model&&model.skills&&model.skills[skillId]?model.skills[skillId]:Mastery.emptySkillState(skillId);
  }
  function getWeakestSkills(model,limit=5){
    return Object.values(model&&model.skills?model.skills:{})
      .map(skill=>({skillId:skill.skillId,weakest:Mastery.weakestDimension(skill),lastPracticed:skill.lastPracticed}))
      .sort((a,b)=>{
        if(a.weakest.score===null&&b.weakest.score!==null)return -1;
        if(a.weakest.score!==null&&b.weakest.score===null)return 1;
        return (a.weakest.score===b.weakest.score?a.weakest.evidenceWeight-b.weakest.evidenceWeight:a.weakest.score-b.weakest.score);
      }).slice(0,Math.max(0,limit));
  }
  function getRecentErrors(model,now=Date.now(),limit=8){
    const stamp=new Date(now).getTime();
    return Object.values(model&&model.errors?model.errors:{})
      .map(error=>{
        const ageDays=Math.max(0,(stamp-new Date(error.lastSeen||0).getTime())/(24*60*60*1000));
        const recency=1/(1+ageDays/7);
        return Object.assign({},error,{priority:Math.round(error.frequency*error.severity*error.communicativeImpact*recency*1000)/1000});
      })
      .sort((a,b)=>b.priority-a.priority).slice(0,Math.max(0,limit));
  }
  function publicSnapshot(model,now=Date.now()){
    const clean=cloneModel(model,model&&model.userId);
    delete clean.userId;
    delete clean.appliedEventIds;
    clean.dueReviews=Review.getDueReviews(clean.review,now).length;
    clean.weakestSkills=getWeakestSkills(clean,5);
    clean.recentErrors=getRecentErrors(clean,now,5);
    return clean;
  }

  return {
    MODEL_VERSION,ERROR_IMPACT,createLearnerModel,updateFromEvent,rebuildFromEvents,getSkillMastery,
    getWeakestSkills,getRecentErrors,publicSnapshot
  };
});
