'use strict';

(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SwiftBirdEvents=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const EVENT_SCHEMA_VERSION=1;
  const TASK_TYPES=new Set([
    'recognition','recall','controlled_production','contextual_production',
    'conversation','listening','reading','writing','pronunciation','transfer','review','assessment'
  ]);
  const OPERATIONS=new Set(['recognition','recall','controlled_production','production','transfer']);
  const MODALITIES=new Set(['touch','typing','speaking','listening','reading','mixed']);
  const OUTCOMES=new Set(['correct','incorrect','partial','inconclusive']);
  const BLOOM_LEVELS=new Set(['remember','understand','apply','analyze','evaluate','create']);
  const CEFR_LEVELS=new Set(['A1','A2','B1','B2','C1','C2']);
  const EVENT_TYPES=new Set(['task_attempt','repair_attempt','review_attempt','assessment_attempt']);

  function clamp(value,min,max,fallback){
    const number=Number(value);
    return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback;
  }
  function cleanId(value,max=120){
    return String(value||'').trim().replace(/[^a-zA-Z0-9:_#.@/\-]/g,'_').slice(0,max);
  }
  function makeId(){
    if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
    return 'evt-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
  }
  function cleanTimestamp(value){
    const date=value?new Date(value):new Date();
    return Number.isFinite(date.getTime())?date.toISOString():new Date().toISOString();
  }
  function cleanStringList(value,limit=12,maxLength=80){
    if(!Array.isArray(value))return [];
    return [...new Set(value.map(item=>cleanId(item,maxLength)).filter(Boolean))].slice(0,limit);
  }
  function inferOutcome(raw){
    const outcome=raw&&typeof raw==='object'?raw:{};
    let status=OUTCOMES.has(outcome.status)?outcome.status:null;
    if(!status&&outcome.correct===true)status='correct';
    if(!status&&outcome.correct===false)status='incorrect';
    if(!status)status='inconclusive';
    const correct=status==='correct'?true:(status==='incorrect'?false:null);
    const defaultScore=status==='correct'?1:(status==='partial'?0.5:(status==='incorrect'?0:null));
    return {
      status,
      correct,
      score:defaultScore===null?null:clamp(outcome.score,0,1,defaultScore),
      partialCredit:clamp(outcome.partialCredit,0,1,status==='partial'?0.5:0),
      errorTypes:cleanStringList(outcome.errorTypes,8,60)
    };
  }
  function normalizeEvent(input){
    const raw=input&&typeof input==='object'?input:{};
    const taskType=TASK_TYPES.has(raw.taskType)?raw.taskType:'review';
    const operation=OPERATIONS.has(raw.cognitiveOperation)?raw.cognitiveOperation:
      (OPERATIONS.has(taskType)?taskType:(taskType==='contextual_production'?'production':'recognition'));
    const rawSupport=raw.support&&typeof raw.support==='object'?raw.support:{};
    const rawTiming=raw.timing&&typeof raw.timing==='object'?raw.timing:{};
    const rawContext=raw.context&&typeof raw.context==='object'?raw.context:{};
    const responseMs=Number(rawTiming.responseMs);
    const event={
      schemaVersion:EVENT_SCHEMA_VERSION,
      id:cleanId(raw.id,140)||makeId(),
      sessionId:cleanId(raw.sessionId,100)||'session-unknown',
      timestamp:cleanTimestamp(raw.timestamp),
      eventType:EVENT_TYPES.has(raw.eventType)?raw.eventType:'task_attempt',
      taskId:cleanId(raw.taskId,140),
      taskType,
      skill:cleanId(raw.skill,100),
      languageItems:cleanStringList(raw.languageItems,20,100),
      cefr:CEFR_LEVELS.has(raw.cefr)?raw.cefr:null,
      bloomLevel:BLOOM_LEVELS.has(raw.bloomLevel)?raw.bloomLevel:'apply',
      cognitiveOperation:operation,
      modality:MODALITIES.has(raw.modality)?raw.modality:'mixed',
      outcome:inferOutcome(raw.outcome),
      support:{
        hints:Math.round(clamp(rawSupport.hints,0,20,0)),
        retries:Math.round(clamp(rawSupport.retries,0,20,0)),
        revealedAnswer:Boolean(rawSupport.revealedAnswer)
      },
      timing:{responseMs:Number.isFinite(responseMs)?Math.round(clamp(responseMs,0,60*60*1000,0)):null},
      context:{
        mode:cleanId(rawContext.mode,40)||'learning',
        source:cleanId(rawContext.source,80)||'swift-bird',
        track:['school','world'].includes(rawContext.track)?rawContext.track:null,
        delayedRetrieval:Boolean(rawContext.delayedRetrieval),
        generatedVariation:Boolean(rawContext.generatedVariation)
      }
    };
    return event;
  }
  function validateEvent(input){
    const event=normalizeEvent(input);
    const errors=[];
    if(!event.taskId)errors.push('taskId jest wymagane');
    if(!event.skill)errors.push('skill jest wymagane');
    if(event.outcome.status!=='inconclusive'&&event.outcome.score===null)errors.push('wynik jest wymagany');
    return {valid:errors.length===0,errors,event};
  }
  function createEvent(input){
    const result=validateEvent(input);
    if(!result.valid){
      const error=new Error('Nieprawidłowe zdarzenie nauki: '+result.errors.join(', '));
      error.code='INVALID_LEARNING_EVENT';
      throw error;
    }
    return result.event;
  }

  return {
    EVENT_SCHEMA_VERSION,TASK_TYPES,OPERATIONS,MODALITIES,OUTCOMES,BLOOM_LEVELS,CEFR_LEVELS,EVENT_TYPES,
    normalizeEvent,validateEvent,createEvent
  };
});
