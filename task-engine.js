'use strict';

(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SwiftBirdTasks=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const TASK_SPEC_VERSION=1;
  const QUESTION_PATTERNS=new Set(['to-be-question','wh-questions']);
  const OPERATIONS=new Set(['recognition','recall','controlled_production','production','transfer']);

  function clean(value,max=120){return String(value||'').trim().replace(/[^a-zA-Z0-9:_#.@/\-]/g,'_').slice(0,max);}
  function skillForPattern(patternId){
    if(QUESTION_PATTERNS.has(patternId))return 'question_formation';
    if(patternId==='prepositions')return 'spatial_language';
    if(patternId==='present-simple'||patternId==='present-continuous')return patternId.replace(/-/g,'_');
    if(patternId==='have-got')return 'possession_have_got';
    return 'sentence_building';
  }
  function createTaskSpec(input){
    const raw=input&&typeof input==='object'?input:{};
    const operation=OPERATIONS.has(raw.cognitiveOperation)?raw.cognitiveOperation:'recognition';
    const spec={
      schemaVersion:TASK_SPEC_VERSION,
      id:clean(raw.id,140),
      type:clean(raw.type,60)||operation,
      skill:clean(raw.skill,100),
      cefr:/^(A1|A2|B1|B2|C1|C2)$/.test(raw.cefr)?raw.cefr:null,
      bloom:/^(remember|understand|apply|analyze|evaluate|create)$/.test(raw.bloom)?raw.bloom:'apply',
      targetItems:Array.isArray(raw.targetItems)?raw.targetItems.map(item=>clean(item,100)).filter(Boolean).slice(0,20):[],
      cognitiveOperation:operation,
      inputModality:clean(raw.inputModality,30)||'reading',
      outputModality:clean(raw.outputModality,30)||'touch',
      supports:Array.isArray(raw.supports)?raw.supports.map(item=>clean(item,50)).filter(Boolean).slice(0,12):[],
      evaluation:Object.assign({mode:'deterministic'},raw.evaluation&&typeof raw.evaluation==='object'?raw.evaluation:{}),
      transferValue:Math.max(0,Math.min(1,Number(raw.transferValue)||0)),
      route:raw.route&&typeof raw.route==='object'?{
        screen:clean(raw.route.screen,40),patternId:clean(raw.route.patternId,80),mode:clean(raw.route.mode,40)
      }:null,
      estimatedMinutes:Math.max(1,Math.min(25,Math.round(Number(raw.estimatedMinutes)||6)))
    };
    if(!spec.id||!spec.skill)throw new Error('TaskSpec wymaga id i skill.');
    return spec;
  }
  function makeQuestionFormationTasks(){
    const common={skill:'question_formation',cefr:'A1',route:{screen:'sentences',patternId:'to-be-question',mode:'adaptive'},estimatedMinutes:6};
    return [
      createTaskSpec(Object.assign({},common,{id:'question-formation:recognition',type:'recognition',bloom:'understand',cognitiveOperation:'recognition',inputModality:'reading',outputModality:'touch',supports:['audio','grammar_hint'],transferValue:0.15})),
      createTaskSpec(Object.assign({},common,{id:'question-formation:recall',type:'recall',bloom:'remember',cognitiveOperation:'recall',inputModality:'reading',outputModality:'typing',supports:['optional_hint'],transferValue:0.35})),
      createTaskSpec(Object.assign({},common,{id:'question-formation:controlled',type:'controlled_production',bloom:'apply',cognitiveOperation:'controlled_production',inputModality:'reading',outputModality:'mixed',supports:['blocks','audio','repair'],transferValue:0.50})),
      createTaskSpec(Object.assign({},common,{id:'question-formation:production',type:'contextual_production',bloom:'apply',cognitiveOperation:'production',inputModality:'reading',outputModality:'speaking',supports:['model_audio','asr_fallback'],transferValue:0.75})),
      createTaskSpec(Object.assign({},common,{id:'question-formation:transfer',type:'transfer',bloom:'create',cognitiveOperation:'transfer',inputModality:'reading',outputModality:'typing',supports:['feedback_after_attempt'],transferValue:1,estimatedMinutes:8,route:{screen:'sentences',patternId:'to-be-question',mode:'adaptive-transfer'}}))
    ];
  }
  function buildPatternTask(pattern,item,index,operation='controlled_production'){
    const skill=skillForPattern(pattern.id);
    return createTaskSpec({
      id:'pattern:'+pattern.id+'#'+index+':'+operation,
      type:operation==='production'?'contextual_production':operation,
      skill,
      cefr:QUESTION_PATTERNS.has(pattern.id)?'A1':'A2',
      bloom:operation==='transfer'?'create':(operation==='recognition'?'understand':'apply'),
      targetItems:[pattern.id].concat((item&&item.vocab)||[]),
      cognitiveOperation:operation,
      inputModality:'reading',
      outputModality:operation==='production'?'speaking':(operation==='recall'||operation==='transfer'?'typing':'touch'),
      supports:['audio','grammar_hint','repair'],
      evaluation:{mode:'deterministic',answerKey:item&&item.tokens?item.tokens.join(' '):null},
      transferValue:operation==='transfer'?1:(operation==='production'?0.7:0.35),
      route:{screen:'sentences',patternId:pattern.id,mode:'learning'}
    });
  }
  function findTask(catalog,id){return (catalog||[]).find(task=>task.id===id)||null;}

  return {TASK_SPEC_VERSION,QUESTION_PATTERNS,OPERATIONS,skillForPattern,createTaskSpec,makeQuestionFormationTasks,buildPatternTask,findTask};
});
