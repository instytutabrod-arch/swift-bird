'use strict';

(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SwiftBirdMastery=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const DIMENSIONS=['recognition','recall','controlled_production','production','transfer'];
  const PEDAGOGY_CONFIG=Object.freeze({
    version:'evidence-v1',
    operationWeight:Object.freeze({
      recognition:0.55,
      recall:0.80,
      controlled_production:0.95,
      production:1.10,
      transfer:1.25
    }),
    hintPenalty:0.16,
    retryPenalty:0.10,
    revealedAnswerFactor:0.40,
    delayedRetrievalFactor:1.10,
    minimumEvidenceWeight:0.20,
    priorPositive:1.5,
    priorNegative:1.5
  });

  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function emptyDimension(){
    return {
      evidenceScore:null,
      positiveEvidence:0,
      negativeEvidence:0,
      evidenceWeight:0,
      observations:0,
      independentSuccesses:0,
      supportedSuccesses:0,
      lastPracticed:null,
      confidence:'brak danych'
    };
  }
  function normalizeDimension(raw){
    const source=raw&&typeof raw==='object'?raw:{};
    const dimension=emptyDimension();
    Object.keys(dimension).forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(source,key))dimension[key]=source[key];
    });
    dimension.positiveEvidence=Math.max(0,Number(dimension.positiveEvidence)||0);
    dimension.negativeEvidence=Math.max(0,Number(dimension.negativeEvidence)||0);
    dimension.evidenceWeight=Math.max(0,Number(dimension.evidenceWeight)||0);
    dimension.observations=Math.max(0,Math.round(Number(dimension.observations)||0));
    dimension.independentSuccesses=Math.max(0,Math.round(Number(dimension.independentSuccesses)||0));
    dimension.supportedSuccesses=Math.max(0,Math.round(Number(dimension.supportedSuccesses)||0));
    return dimension;
  }
  function confidenceLabel(weight){
    if(weight<0.01)return 'brak danych';
    if(weight<1.5)return 'wstępne';
    if(weight<4)return 'rozwijające się';
    if(weight<8)return 'umiarkowane';
    return 'mocne';
  }
  function evidenceLabel(score,confidence){
    if(score===null||confidence==='brak danych')return 'brak danych';
    if(confidence==='wstępne')return 'pierwsze wyniki';
    if(score<0.45)return 'wymaga wsparcia';
    if(score<0.68)return 'rozwijane';
    if(score<0.84)return 'dobrze potwierdzone';
    return 'silnie potwierdzone';
  }
  function evidenceWeight(event,config=PEDAGOGY_CONFIG){
    const operation=event.cognitiveOperation;
    let weight=config.operationWeight[operation]||config.operationWeight.recognition;
    const support=event.support||{};
    weight*=Math.max(config.minimumEvidenceWeight,1-(Number(support.hints)||0)*config.hintPenalty-(Number(support.retries)||0)*config.retryPenalty);
    if(support.revealedAnswer)weight*=config.revealedAnswerFactor;
    if(event.context&&event.context.delayedRetrieval)weight*=config.delayedRetrievalFactor;
    return clamp(weight,config.minimumEvidenceWeight,1.5);
  }
  function outcomeQuality(event){
    const outcome=event.outcome||{};
    if(outcome.status==='inconclusive')return null;
    if(outcome.status==='correct')return clamp(Number.isFinite(Number(outcome.score))?Number(outcome.score):1,0,1);
    if(outcome.status==='partial')return clamp(Number.isFinite(Number(outcome.partialCredit))?Number(outcome.partialCredit):0.5,0,1);
    return clamp(Number.isFinite(Number(outcome.score))?Number(outcome.score):0,0,1);
  }
  function updateDimension(previous,event,config=PEDAGOGY_CONFIG){
    const state=normalizeDimension(previous);
    const quality=outcomeQuality(event);
    /* Brak rozstrzygnięcia (np. zawodny ASR) nie jest dowodem błędu ucznia. */
    if(quality===null)return state;
    const weight=evidenceWeight(event,config);
    state.positiveEvidence+=weight*quality;
    state.negativeEvidence+=weight*(1-quality);
    state.evidenceWeight+=weight;
    state.observations+=1;
    if(quality>=0.999){
      const support=event.support||{};
      if(!support.hints&&!support.retries&&!support.revealedAnswer)state.independentSuccesses+=1;
      else state.supportedSuccesses+=1;
    }
    state.evidenceScore=(state.positiveEvidence+config.priorPositive)/
      (state.positiveEvidence+state.negativeEvidence+config.priorPositive+config.priorNegative);
    state.evidenceScore=Math.round(state.evidenceScore*1000)/1000;
    state.lastPracticed=event.timestamp||state.lastPracticed;
    state.confidence=confidenceLabel(state.evidenceWeight);
    state.label=evidenceLabel(state.evidenceScore,state.confidence);
    return state;
  }
  function emptySkillState(skillId){
    const dimensions={};DIMENSIONS.forEach(id=>{dimensions[id]=emptyDimension();});
    return {skillId,dimensions,observations:0,lastPracticed:null,modalities:{}};
  }
  function updateSkillState(previous,event,config=PEDAGOGY_CONFIG){
    const skillId=event.skill||'unknown';
    const state=previous&&typeof previous==='object'?JSON.parse(JSON.stringify(previous)):emptySkillState(skillId);
    if(!state.dimensions)state.dimensions={};
    DIMENSIONS.forEach(id=>{state.dimensions[id]=normalizeDimension(state.dimensions[id]);});
    const operation=DIMENSIONS.includes(event.cognitiveOperation)?event.cognitiveOperation:'recognition';
    state.dimensions[operation]=updateDimension(state.dimensions[operation],event,config);
    if(event.outcome&&event.outcome.status!=='inconclusive')state.observations=(Number(state.observations)||0)+1;
    state.lastPracticed=event.timestamp||state.lastPracticed;
    const modality=event.modality||'mixed';
    if(!state.modalities)state.modalities={};
    if(!state.modalities[modality])state.modalities[modality]={attempts:0,correct:0,inconclusive:0};
    state.modalities[modality].attempts++;
    if(event.outcome&&event.outcome.status==='correct')state.modalities[modality].correct++;
    if(event.outcome&&event.outcome.status==='inconclusive')state.modalities[modality].inconclusive++;
    return state;
  }
  function weakestDimension(skillState){
    if(!skillState||!skillState.dimensions)return {id:'recognition',score:null,confidence:'brak danych'};
    const ranked=DIMENSIONS.map(id=>{
      const value=normalizeDimension(skillState.dimensions[id]);
      return {id,score:value.evidenceScore,confidence:value.confidence,evidenceWeight:value.evidenceWeight};
    }).sort((a,b)=>{
      if(a.score===null&&b.score!==null)return -1;
      if(a.score!==null&&b.score===null)return 1;
      if(a.score===b.score)return a.evidenceWeight-b.evidenceWeight;
      return a.score-b.score;
    });
    return ranked[0];
  }

  return {
    DIMENSIONS,PEDAGOGY_CONFIG,emptyDimension,normalizeDimension,confidenceLabel,evidenceLabel,
    evidenceWeight,outcomeQuality,updateDimension,emptySkillState,updateSkillState,weakestDimension
  };
});
