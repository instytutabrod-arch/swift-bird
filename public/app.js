'use strict';

const APP_VERSION = '16.4';
const DAY = 86400000;
const STEPS = [1,2,4,8,16,35,70];
const NEW_PER_SESSION = 4;
const MAX_SESSION_ITEMS = 20;
const SENTENCE_UNLOCK_WORDS = 4;
const SENTENCE_UNLOCK_SUCCESSES = 3;

/* Sesja ma cztery etapy i twardy limit 25 minut. Dwadzieścia pięć minut
   jednego typu zadania to dla dziesięciolatki za dużo: po kilkunastu
   minutach spada jakość odpowiedzi, więc utrwala się byle jakie wykonanie.
   Stąd podział na etapy i ekran przejściowy między nimi. */
const SESSION_LIMIT = 25*60*1000;
const SHORT_LIMIT = 8*60*1000;
const STAGE_PLAN = [
  { id:'warmup',  name:'Rozgrzewka', done:'Rozgrzewka zrobiona', ms: 5*60*1000, short: 3*60*1000, hint:'Powtarzasz to, co już znasz, żeby głowa weszła w angielski.' },
  { id:'core',    name:'Główna część', done:'Główna część zrobiona', ms:12*60*1000, short: 5*60*1000, hint:'Nowe słowa i różne zadania, na przykład zdania, dialogi i szukanie błędów.' },
  { id:'closing', name:'Na koniec', done:'Wszystko zrobione', ms: 6*60*1000, short: 0, hint:'Krótkie podsumowanie, żeby to, co dziś ćwiczysz, zostało w głowie na dłużej.' }
];

const PATTERN_LIST = (window.PATTERNS || []);
const PATTERN_ITEMS = PATTERN_LIST.flatMap(pattern =>
  pattern.items.map((item, index) => ({ ...item, id: pattern.id+'#'+index, pattern: pattern.id, patternName: pattern.name, example: pattern.example })));
const STORY_LIST = (window.STORIES || []);
const DIALOGUE_LIST = (window.DIALOGUES || []);
const ERROR_ITEMS = (window.ERROR_BANK || []);
const COMPARE_ITEMS = (window.COMPARISONS || []);
const ORDER_ITEMS = (window.ORDERINGS || []);
const JOURNEY_STOPS = (window.JOURNEY || []);
const LEARNING_EVENT_API=window.SwiftBirdEvents||null;
const LEARNER_MODEL_API=window.SwiftBirdLearnerModel||null;
const MASTERY_API=window.SwiftBirdMastery||null;
const TASK_API=window.SwiftBirdTasks||null;
const EVIDENCE_DIMENSIONS=['recognition','recall','controlled_production','production','transfer'];
const EVIDENCE_LABELS={
  recognition:'Rozpoznanie',recall:'Przypomnienie',controlled_production:'Użycie ze wsparciem',
  production:'Samodzielna produkcja',transfer:'Nowy kontekst'
};

/* Pomoc jest dobrowolna i dostepna na kazdym poziomie trudnosci. Dziecko
   najpierw probuje odkryc wzorzec, ale nigdy nie zostaje bez wyjasnienia. */
const GRAMMAR_TERMS=Object.freeze({
  noun:{label:'Rzeczownik',english:'noun',definition:'Nazywa osobę, zwierzę, rzecz lub miejsce.',examples:['sister','cat','book','school']},
  pronoun:{label:'Zaimek',english:'pronoun',definition:'Zastępuje nazwę osoby albo rzeczy.',examples:['I','you','he','she','it','we','they']},
  verb:{label:'Czasownik',english:'verb',definition:'Mówi, co ktoś robi albo w jakim jest stanie.',examples:['run','read','is','have']},
  adjective:{label:'Przymiotnik',english:'adjective',definition:'Opisuje osobę, zwierzę albo rzecz.',examples:['happy','tall','blue','small']},
  preposition:{label:'Przyimek',english:'preposition',definition:'Pokazuje miejsce albo kierunek.',examples:['in','on','under','behind','to']},
  question:{label:'Słowo pytające',english:'question word',definition:'Pokazuje, jakiej informacji szukasz.',examples:['who','what','where','when','why','how']}
});
const GRAMMAR_GUIDES=Object.freeze({
  'to-be-positive':{
    formula:[{pl:'Osoba lub rzecz'},{en:['am','is','are']},{pl:'informacja albo opis'}],
    examples:[['She','is','tired','.'],['This','is','a','cat','.']],
    tip:[{en:['I']},{pl:'łączymy z'},{en:['am']},{pl:'·'},{en:['he','she','it']},{pl:'z'},{en:['is']},{pl:'·'},{en:['you','we','they']},{pl:'z'},{en:['are']}],
    terms:['noun','pronoun','verb','adjective']
  },
  'to-be-question':{
    formula:[{pl:'Pytanie:'},{en:['Am','Is','Are']},{pl:'osoba lub rzecz'},{pl:'opis'},{en:['?']},{pl:'Przeczenie: osoba lub rzecz'},{en:['am','is','are','not']},{pl:'reszta zdania'}],
    examples:[['Is','this','a','cat','?'],['She','is','not','sad','.']],
    tip:[{pl:'W pytaniu'},{en:['am','is','are']},{pl:'stawiamy przed osobą lub rzeczą. W przeczeniu po czasowniku stoi'},{en:['not']}],
    terms:['noun','pronoun','verb','adjective']
  },
  'have-got':{
    formula:[{pl:'Osoba'},{en:['have','has','got']},{pl:'to, co ma'}],
    examples:[['I','have','got','a','cat','.'],['She','has','got','a','dog','.']],
    tip:[{en:['he','she','it']},{pl:'wybierają'},{en:['has']},{pl:'·'},{en:['I','you','we','they']},{pl:'wybierają'},{en:['have']}],
    terms:['noun','pronoun','verb']
  },
  'present-simple':{
    formula:[{pl:'Osoba lub rzecz'},{pl:'czynność wykonywana zwykle'},{pl:'szczegóły'}],
    examples:[['We','play','football','on','Monday','.'],['She','reads','a','book','.']],
    tip:[{pl:'Przy'},{en:['he','she','it']},{pl:'czasownik zwykle dostaje końcówkę'},{en:['-s']},{pl:'Sygnałami mogą być'},{en:['every day','always']}],
    terms:['noun','pronoun','verb','preposition']
  },
  'present-continuous':{
    formula:[{pl:'Osoba lub rzecz'},{en:['am','is','are']},{pl:'czynność z końcówką'},{en:['-ing']}],
    examples:[['The','cat','is','sleeping','.'],['We','are','playing','.']],
    tip:[{pl:'Ten wzór mówi o tym, co dzieje się właśnie teraz. Sygnałem może być'},{en:['now']}],
    terms:['noun','pronoun','verb']
  },
  prepositions:{
    formula:[{pl:'Osoba lub rzecz'},{en:['is','are']},{pl:'przyimek miejsca'},{pl:'miejsce'}],
    examples:[['The','cat','is','under','the','table','.']],
    tip:[{pl:'Najpierw znajdź rzecz, potem jej miejsce:'},{en:['in','on','under','behind','between']}],
    terms:['noun','verb','preposition']
  },
  'wh-questions':{
    formula:[{pl:'Słowo pytające'},{pl:'czasownik pomocniczy'},{pl:'osoba lub rzecz'},{pl:'reszta'},{en:['?']}],
    examples:[['Where','is','the','cat','?'],['When','do','you','play','?']],
    tip:[{pl:'Najpierw ustal, o co pytasz. Potem wybierz właściwy klocek:'},{en:['who','what','where','when','why','how']}],
    terms:['question','noun','pronoun','verb']
  }
});

const BADGES = [
  { id:'first-hundred', name:'Pierwsza setka', icon:'💯',
    desc:'100 słów w kolekcji',
    reward:'Jerzyk dostaje zapas na drogę.',
    story:'Jerzyk łapie owady w locie, nigdy na ziemi. Zbiera je w gardle w małą kulkę, sklejoną własną śliną, i dopiero taką porcję zanosi młodym. W jednej kulce potrafi być kilkaset owadów. Twoje sto słów to dokładnie taka kulka: same w sobie drobne, razem wystarczają na długi lot.',
    storyEn:'A swift catches insects while flying, never on the ground. It gathers them in its throat and makes a small ball held together with saliva. Only then does it carry the meal to its chicks. One ball can contain hundreds of insects. Your one hundred words are just like that ball: tiny on their own, but strong enough together for a long flight.' },
  { id:'builder', name:'Budowniczy zdań', icon:'🧱',
    desc:'50 zdań ułożonych bez błędu',
    reward:'Gniazdo w gnieździe rośnie.',
    story:'Jerzyk buduje gniazdo z tego, co złapie w powietrzu: piórek, źdźbeł, kawałków liści porwanych przez wiatr. Skleja je własną śliną, która zasycha na twardo. Nic nie zbiera z ziemi, wszystko chwyta w locie. Ty też budujesz zdania z kawałków, które już masz.',
    storyEn:'A swift builds its nest from things caught in the air: feathers, blades of grass and pieces of leaves carried by the wind. It joins them with its own saliva, which dries hard. It collects nothing from the ground and catches everything in flight. You are building sentences from pieces you already have, too.' },
  { id:'flawless', name:'Bez potknięcia', icon:'🎯',
    desc:'egzamin sekcji bez ani jednej pomyłki',
    reward:'Czysty przelot nad przystankiem.',
    story:'Jerzyk potrafi pić bez lądowania. Zniża lot nad wodą, muska ją dziobem i leci dalej, nie zwalniając. Nie siada, bo z płaskiej ziemi bardzo trudno mu wystartować: ma malutkie nóżki i długie skrzydła. Twój egzamin bez pomyłki wyglądał dokładnie tak: jeden gładki przelot.',
    storyEn:'A swift can drink without landing. It flies low over the water, touches the surface with its beak and carries on without slowing down. It avoids the flat ground because taking off is very difficult with tiny feet and long wings. Your perfect exam looked exactly like that: one smooth flight from beginning to end.', manual:true },
  { id:'detective', name:'Detektyw', icon:'🔍',
    desc:'15 zadań detektywa z poprawnym uzasadnieniem',
    reward:'Ostre oko na trasie.',
    story:'Jerzyk poluje na owady tak drobne, że my ich z ziemi nie widzimy. Naukowcy nazywają tę chmurę unoszącą się wysoko nad nami aeroplanktonem. Ptak dostrzega w niej pojedynczą muszkę i chwyta ją przy prędkości, przy której my nie zdążylibyśmy mrugnąć. Wyłapywanie błędu w zdaniu to ta sama umiejętność: widzieć drobiazg, który innym umyka.',
    storyEn:'A swift hunts insects so tiny that we cannot see them from the ground. Scientists call this cloud high above us aeroplankton. The bird spots one small fly inside it and catches it at a speed that is faster than our blink. Finding an error in a sentence uses the same skill: noticing a tiny detail that other people miss.' },
  { id:'speaker', name:'Rozmówca', icon:'🗣️',
    desc:'30 pełnych zdań powiedzianych na głos',
    reward:'Głos nad dachami.',
    story:'Latem nad polskimi wsiami słychać ostre, przeciągłe piski. To jerzyki krążą stadem nad dachami i wołają do siebie w locie. Ten dźwięk to jeden z niewielu sposobów, w jakie dają o sobie znać, bo widać je rzadko: prawie nie siadają. Ty też właśnie zacząłeś być słyszalny po angielsku.',
    storyEn:'In summer, sharp and drawn-out calls can be heard above Polish villages. Swifts circle in groups over the roofs and call to one another while flying. Their voice is one of the few ways they make themselves known because they are rarely seen sitting down. You have just started to make your own voice heard in English, too.' },
  { id:'golden-word', name:'Złote słowo', icon:'🥇',
    desc:'słowo utrwalone do samego końca',
    reward:'Coś, czego już nie zgubisz.',
    story:'Młody jerzyk po opuszczeniu gniazda potrafi nie usiąść przez wiele miesięcy. Śpi w locie, wznosząc się wieczorem wysoko i drzemiąc krótkimi chwilami. Nie musi się uczyć tego od nowa każdego dnia, po prostu to umie. Twoje złote słowo jest już takie: siedzi w tobie i nie wymaga wysiłku.',
    storyEn:'After leaving the nest, a young swift may stay in the air for many months. It sleeps in flight by climbing high in the evening and taking very short naps. It does not have to learn this again every day; it simply knows how. Your golden word is like that now: it stays inside you and no longer needs hard work.' },
  { id:'persistent', name:'Wytrwałość', icon:'📆',
    desc:'7 dni z rzędu',
    reward:'Siódmy dzień lotu.',
    story:'Jerzyk zwyczajny spędza w powietrzu prawie całe życie. Je, pije, śpi i łączy się w pary w locie. Nazwa jego rodzaju, Apus, znaczy po grecku „bez nóg", bo dawniej sądzono, że ten ptak wcale nie ląduje. Siedem dni z rzędu to twój pierwszy taki nieprzerwany lot.',
    storyEn:'A common swift spends almost its entire life in the air. It eats, drinks, sleeps and even finds a partner while flying. Its genus name, Apus, means without feet in Greek because people once believed that the bird never landed at all. Seven days in a row are your first long and unbroken flight.' }
];
const BADGE_TESTS = {
  'first-hundred': state => collectedTotal(state) >= 100,
  'detective':     state => countOk(state.errorCards) >= 15,
  'speaker':       state => countOk(state.dialogues) >= 30,
  'golden-word':   state => Object.values(state.cards).some(card => card.i >= 35),
  'builder':       state => countOk(state.patterns) >= 50,
  'persistent':    state => state.streak >= 7
};

const DAILY_CHALLENGES = [
  { id:'d-sentences', text:'Dziś ułóż pięć zdań bez błędu.',                  goal:5, counter:'patternPerfect' },
  { id:'d-speak',     text:'Dziś powiedz trzy pełne zdania na głos.',         goal:3, counter:'spoken' },
  { id:'d-words',     text:'Dziś dodaj do kolekcji trzy nowe słowa.',         goal:3, counter:'newWords' },
  { id:'d-detective', text:'Dziś znajdź i uzasadnij dwa błędy.',              goal:2, counter:'errorsFixed' },
  { id:'d-story',     text:'Dziś przeczytaj jedną historyjkę do końca.',      goal:1, counter:'stories' }
];
const PRAISES = ['Good job','Well done','You are doing great','Keep it going','You are the best','Nice','Great'];

const SECTIONS = (window.WORD_SECTIONS || []).map((section, sectionIndex) => ({
  ...section,
  sectionIndex,
  cards: section.words.map(([en,pl,ic]) => ({
    id: section.id + ':' + en.toLowerCase(), en, pl, ic, sectionIndex
  }))
}));
const CARDS = SECTIONS.flatMap(section => section.cards);
const BY_ID = Object.fromEntries(CARDS.map(card => [card.id, card]));

const $ = selector => document.querySelector(selector);
const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if(className) element.className = className;
  if(text !== undefined && text !== null) element.textContent = text;
  return element;
};
const shuffle = values => {
  const copy = values.slice();
  for(let i=copy.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]] = [copy[j],copy[i]];
  }
  return copy;
};
const clampInt = (value,min,max,fallback=0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min,Math.min(max,Math.round(number))) : fallback;
};
const today = () => new Date().toISOString().slice(0,10);

let toastTimer = null;
function toast(message){
  const element = $('#toast');
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, 2800);
}

let currentScreenName='login';
function show(name){
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('on'));
  const target = $('#s-' + name);
  if(target) target.classList.add('on');
  currentScreenName=name;
  document.body.classList.toggle('screen-home',name==='home');
  const helpButton=$('#learningHelpButton');
  if(helpButton)helpButton.hidden=['login','register','admin-login','admin'].includes(name);
  updateStudentChrome(name);
  setLearningHelpContext(name);
  if(name!=='home')closeLearningHelp(false);
  window.scrollTo(0,0);
}

/* Pomoc jest dostępna w stałym miejscu, ale jej pierwsze pozycje wynikają
   z aktualnego ekranu. Nie uruchamia się sama i nie zasłania zadania. */
let helpReturnFocus=null;
const HELP_SCREEN_NAMES={
  home:'planie i nawigacji','home-today':'dzisiejszym planie','home-learn':'wyborze materiału','home-progress':'postępie','home-profile':'profilu',
  vocabulary:'kolekcji słów',section:'sekcji słówek',play:'bieżącym zadaniu',
  sentences:'budowaniu zdań',placement:'teście poziomującym','level-center':'poziomie i planie',
  tenses:'gramatyce i czasach',tense:'wybranym czasie','tense-drill':'ćwiczeniu gramatycznym',
  'bloom-lab':'Pracowni Blooma',map:'Wyprawie Jerzyka',pools:'własnych pulach słówek',exam:'egzaminie sekcji'
};
function setLearningHelpContext(name=currentScreenName){
  const context=$('#learningHelpContext');if(!context)return;
  context.textContent='Pomoc dotycząca '+(HELP_SCREEN_NAMES[name]||'tego miejsca')+'. Wybierz tylko to, czego potrzebujesz teraz.';
  document.querySelectorAll('.learning-help-list details').forEach(item=>{
    const screens=String(item.dataset.helpFor||'').split(/\s+/);
    const contextual=screens.includes(name)||screens.includes('all');
    item.classList.toggle('contextual',contextual);
    if(!contextual)item.open=false;
  });
}
function openLearningHelp(){
  const layer=$('#learningHelpLayer');const button=$('#learningHelpButton');if(!layer||!button)return;
  helpReturnFocus=document.activeElement;setLearningHelpContext();layer.hidden=false;document.body.classList.add('help-open');button.setAttribute('aria-expanded','true');
  const first=layer.querySelector('.learning-help-close');if(first)first.focus();
}
function closeLearningHelp(restore=true){
  const layer=$('#learningHelpLayer');const button=$('#learningHelpButton');if(!layer)return;
  layer.hidden=true;document.body.classList.remove('help-open');if(button)button.setAttribute('aria-expanded','false');
  if(restore&&helpReturnFocus&&typeof helpReturnFocus.focus==='function')helpReturnFocus.focus();
  helpReturnFocus=null;
}

async function api(path, options={}){
  // credentials:'include' jest KONIECZNE, by przeglądarka wysyłała i przyjmowała
  // ciasteczko sesji (swift_bird_session). Bez tego logowanie przechodzi na
  // serwerze, ale sesja nie zostaje utrzymana i każde żądanie jest niezalogowane.
  const config = {credentials:'include', ...options, headers:{...(options.headers || {})}};
  if(config.body && typeof config.body !== 'string'){
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }
  const response = await fetch(path, config);
  const type = response.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await response.json() : null;
  if(!response.ok){
    const error = new Error((data && data.error) || 'Nie udało się połączyć z serwerem.');
    error.status = response.status;
    throw error;
  }
  return data;
}

/* ==================== KONTO I POSTĘPY ==================== */
let currentUser = null;
let S = emptyState();
let syncTimer = null;
let syncRevision = 0;
let learningSessionId='';
let learningEventFlushPromise=null;
let adaptiveModel=null;
let adaptiveRecommendation=null;
let adaptiveRequestRevision=0;
let activeAdaptiveTask=null;
/* Domyślnie zachowujemy dotychczasową ścieżkę. Serwer jawnie włącza nową
   rekomendację przez /api/config, co pozwala wdrażać ją etapami. */
let adaptiveHomeEnabled=false;

function emptyState(){
  return {schema:4,cards:{},streak:0,lastDay:null,sessions:0,passedExams:[],
    patterns:{},errorCards:{},stories:{},dialogues:{},poolCards:{},tenses:{},business:{},
    mistakes:[],feathers:0,badges:[],stages:0,bloom:{},
    cefr:{level:null,unlockedLevel:'A1',confidence:null,completedAt:null,correct:0,answered:0,evidence:null,evaluations:{},goals:[],history:[]}};
}

function collectedTotal(state){ return Object.keys(state.cards||{}).length; }
function countOk(map){ return Object.values(map||{}).reduce((sum,item)=>sum+(item.ok||0),0); }

/* Rejestr błędów. Powstaje już teraz, przy M2 i M4, choć korzysta z niego
   dopiero M5: gdyby dokładać go później, bank byłby przez pierwsze
   tygodnie pusty i moduł detektywa wystartowałby bez materiału. */
function noteMistake(kind,ref){
  if(!S.mistakes) S.mistakes=[];
  S.mistakes.push({kind:String(kind),ref:String(ref),at:Date.now()});
  if(S.mistakes.length>60) S.mistakes=S.mistakes.slice(-60);
}

function normalizeState(raw){
  const state = emptyState();
  if(!raw || typeof raw !== 'object') return state;
  state.streak = clampInt(raw.streak,0,10000);
  state.sessions = clampInt(raw.sessions,0,100000);
  state.lastDay = typeof raw.lastDay === 'string' ? raw.lastDay.slice(0,10) : null;
  if(raw.cards && typeof raw.cards === 'object'){
    Object.entries(raw.cards).forEach(([id,value]) => {
      if(!BY_ID[id] || !value || typeof value !== 'object') return;
      state.cards[id] = {
        i:clampInt(value.i,0,365), e:Math.max(1.3,Math.min(2.6,Number(value.e)||2.2)),
        d:Math.max(0,Number(value.d)||0), r:clampInt(value.r,0,10000),
        ok:clampInt(value.ok,0,100000), bad:clampInt(value.bad,0,100000)
      };
    });
  }
  const passed = Array.isArray(raw.passedExams) ? raw.passedExams : [];
  state.passedExams = SECTIONS.map(s=>s.id).filter(id=>passed.includes(id));

  const copyCards = (source,allowed) => {
    const out = {};
    Object.entries(source && typeof source === 'object' ? source : {}).forEach(([id,value]) => {
      if(!allowed.has(id) || !value || typeof value !== 'object') return;
      out[id] = {
        i:clampInt(value.i,0,365), e:Math.max(1.3,Math.min(2.6,Number(value.e)||2.2)),
        d:Math.max(0,Number(value.d)||0), r:clampInt(value.r,0,10000),
        ok:clampInt(value.ok,0,100000), bad:clampInt(value.bad,0,100000)
      };
    });
    return out;
  };
  const copyDone = (source,allowed) => {
    const out = {};
    Object.entries(source && typeof source === 'object' ? source : {}).forEach(([id,value]) => {
      if(!allowed.has(id) || !value || typeof value !== 'object') return;
      out[id] = { done:clampInt(value.done,0,10000), ok:clampInt(value.ok,0,10000) };
    });
    return out;
  };
  state.patterns   = copyCards(raw.patterns,   new Set(PATTERN_ITEMS.map(item=>item.id)));
  state.errorCards = copyCards(raw.errorCards, new Set(ERROR_ITEMS.map(item=>item.id)));
  state.stories    = copyDone(raw.stories,     new Set(STORY_LIST.map(item=>item.id)));
  state.dialogues  = copyDone(raw.dialogues,   new Set(DIALOGUE_LIST.map(item=>item.id)));
  state.feathers   = clampInt(raw.feathers,0,1000000);
  state.stages     = clampInt(raw.stages,0,1000000);
  const badgeIds = new Set(BADGES.map(badge=>badge.id));
  state.badges = (Array.isArray(raw.badges)?raw.badges:[]).filter(id=>badgeIds.has(id));
  state.mistakes = (Array.isArray(raw.mistakes)?raw.mistakes.slice(-60):[])
    .filter(item=>item && typeof item === 'object')
    .map(item=>({kind:String(item.kind||''),ref:String(item.ref||''),at:Math.max(0,Number(item.at)||0)}));
  // Postęp pul ma otwarty zbiór kluczy (pool:<id>:<słowo>), więc akceptujemy
  // każdy klucz z tym prefiksem zamiast listy dozwolonych.
  state.poolCards = {};
  if(raw.poolCards && typeof raw.poolCards === 'object'){
    Object.entries(raw.poolCards).slice(0,2000).forEach(([id,value]) => {
      if(!/^pool:/.test(id) || !value || typeof value !== 'object') return;
      state.poolCards[id] = {
        i:clampInt(value.i,0,365), e:Math.max(1.3,Math.min(2.6,Number(value.e)||2.2)),
        d:Math.max(0,Number(value.d)||0), r:clampInt(value.r,0,10000),
        ok:clampInt(value.ok,0,100000), bad:clampInt(value.bad,0,100000)
      };
    });
  }
  // Starsza wersja klienta gubiła postęp czasów podczas każdego wczytania.
  // Przy migracji schematu 4 kopiujemy wyłącznie istniejące identyfikatory.
  const tenseIds=new Set((window.TENSES||[]).map(item=>item.id));
  state.tenses={};
  Object.entries(raw.tenses&&typeof raw.tenses==='object'?raw.tenses:{}).forEach(([id,value])=>{
    if(!tenseIds.has(id)||!value||typeof value!=='object')return;
    state.tenses[id]={ok:clampInt(value.ok,0,100000),done:clampInt(value.done,0,100000)};
  });
  // Postęp sytuacji biznesowych: done = ukończone sesje, ok = łączna liczba
  // odpowiedzi zaliczonych za pierwszym razem.
  state.business={};
  Object.entries(raw.business&&typeof raw.business==='object'?raw.business:{}).slice(0,100).forEach(([id,value])=>{
    if(!value||typeof value!=='object')return;
    state.business[id]={done:clampInt(value.done,0,10000),ok:clampInt(value.ok,0,10000)};
  });
  // Dowody Blooma są osią nauki, nie wynikiem testu poziomującego.
  state.bloom={};
  Object.entries(raw.bloom&&typeof raw.bloom==='object'?raw.bloom:{}).forEach(([id,value])=>{
    if(!tenseIds.has(id)||!value||typeof value!=='object')return;
    state.bloom[id]={
      evaluate:clampInt(value.evaluate,0,10000),
      create:clampInt(value.create,0,10000),
      spoken:clampInt(value.spoken,0,10000),
      reflection:typeof value.reflection==='string'?value.reflection.slice(0,40):''
    };
  });
  const cefrRaw=raw.cefr&&typeof raw.cefr==='object'?raw.cefr:{};
  const levelIds=new Set(['A1','A2','B1','B2','C1','C2']);
  const cleanLevel=value=>levelIds.has(value)?value:null;
  const level=cleanLevel(cefrRaw.level);
  const unlocked=cleanLevel(cefrRaw.unlockedLevel)||(level||'A1');
  const evaluations={};
  Object.entries(cefrRaw.evaluations&&typeof cefrRaw.evaluations==='object'?cefrRaw.evaluations:{}).forEach(([id,value])=>{
    if(!levelIds.has(id)||!value||typeof value!=='object')return;
    evaluations[id]={passed:Boolean(value.passed),correct:clampInt(value.correct,0,8),total:clampInt(value.total,0,8),completedAt:typeof value.completedAt==='string'?value.completedAt.slice(0,40):null};
  });
  const goals=(Array.isArray(cefrRaw.goals)?cefrRaw.goals:[]).filter(id=>tenseIds.has(id)).slice(0,30);
  const history=(Array.isArray(cefrRaw.history)?cefrRaw.history:[]).slice(-10).filter(item=>item&&typeof item==='object').map(item=>({
    level:cleanLevel(item.level)||'A1',confidence:['ostrożna','średnia','wysoka'].includes(item.confidence)?item.confidence:'średnia',
    correct:clampInt(item.correct,0,30),answered:clampInt(item.answered,0,30),completedAt:typeof item.completedAt==='string'?item.completedAt.slice(0,40):null
  }));
  state.cefr={
    level,unlockedLevel:unlocked,confidence:['ostrożna','średnia','wysoka'].includes(cefrRaw.confidence)?cefrRaw.confidence:null,
    completedAt:typeof cefrRaw.completedAt==='string'?cefrRaw.completedAt.slice(0,40):null,
    correct:clampInt(cefrRaw.correct,0,30),answered:clampInt(cefrRaw.answered,0,30),
    evidence:cefrRaw.evidence&&typeof cefrRaw.evidence==='object'?cefrRaw.evidence:null,
    evaluations,goals,history
  };
  return state;
}

function hasMeaningfulProgress(state){
  return Boolean(Object.keys(state.cards||{}).length||Object.keys(state.poolCards||{}).length||
    Object.keys(state.tenses||{}).length||Object.keys(state.bloom||{}).length||
    (state.cefr&&state.cefr.level));
}

function storageKey(){ return currentUser ? 'swift-bird-progress-' + currentUser.id : ''; }

async function loadProgress(){
  const result = await api('/api/progress');
  S = normalizeState(result && result.state);
  if(!hasMeaningfulProgress(S)){
    let local = null;
    try{ local = JSON.parse(localStorage.getItem(storageKey()) || 'null'); }catch(error){}
    S = normalizeState(local || S);
    if(hasMeaningfulProgress(S)) saveProgress();
  }
  try{ localStorage.setItem(storageKey(),JSON.stringify(S)); }catch(error){}
}

function setSync(message,isError=false){
  const element = $('#syncStatus');
  if(!element) return;
  element.textContent = 'Wersja ' + APP_VERSION + (message ? ' · ' + message : '');
  element.classList.toggle('error',isError);
}

function saveProgress(){
  if(!currentUser || currentUser.role !== 'student') return;
  try{ localStorage.setItem(storageKey(),JSON.stringify(S)); }catch(error){}
  const revision = ++syncRevision;
  clearTimeout(syncTimer);
  setSync('zapisywanie…');
  syncTimer = setTimeout(async () => {
    try{
      await api('/api/progress',{method:'PUT',body:{state:S}});
      if(revision === syncRevision) setSync('zapisano');
    }catch(error){
      if(revision === syncRevision) setSync('zapisano na tym urządzeniu',true);
    }
  },350);
}

/* v13 zapisuje najpierw zminimalizowany event lokalnie, a potem wysyła go
   idempotentnie do serwera. Nie ma tu nagrania ani treści swobodnej
   wypowiedzi dziecka: tylko identyfikator zadania, wynik i użyte wsparcie. */
function eventQueueKey(){return currentUser&&currentUser.id?'swift-bird-events-'+currentUser.id:'';}
function newLearningSessionId(){
  if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();
  return 'session-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
}
function readEventQueue(){
  if(!eventQueueKey())return [];
  try{
    const parsed=JSON.parse(localStorage.getItem(eventQueueKey())||'[]');
    return Array.isArray(parsed)?parsed.slice(-120):[];
  }catch(error){return [];}
}
function writeEventQueue(events){
  if(!eventQueueKey())return;
  try{localStorage.setItem(eventQueueKey(),JSON.stringify((events||[]).slice(-120)));}catch(error){}
}
function recordLearningEvent(input){
  if(inTestMode()||!currentUser||currentUser.role!=='student'||!LEARNING_EVENT_API)return null;
  let event=null;
  try{
    event=LEARNING_EVENT_API.createEvent(Object.assign({},input,{
      sessionId:learningSessionId||newLearningSessionId(),
      context:Object.assign({},input.context||{},{track:currentTrack()})
    }));
  }catch(error){return null;}
  const queue=readEventQueue();
  if(!queue.some(item=>item.id===event.id)){queue.push(event);writeEventQueue(queue);}
  flushLearningEvents();
  return event.id;
}
async function flushLearningEvents(){
  if(learningEventFlushPromise||!currentUser||currentUser.role!=='student')return learningEventFlushPromise;
  learningEventFlushPromise=(async()=>{
    let queue=readEventQueue();
    while(queue.length){
      const event=queue[0];
      try{
        const result=await api('/api/events',{method:'POST',body:{event}});
        adaptiveModel=result.model||adaptiveModel;
        adaptiveRecommendation=result.nextTask||adaptiveRecommendation;
        /* W czasie oczekiwania na serwer mogła dojść kolejna próba. Czytamy
           kolejkę ponownie, aby usunięcie wysłanego eventu nie nadpisało
           świeżo dopisanego elementu starszą kopią tablicy. */
        writeEventQueue(readEventQueue().filter(item=>item.id!==event.id));
        queue=readEventQueue();
        renderAdaptiveEvidence(adaptiveModel);
      }catch(error){break;}
    }
  })().finally(()=>{learningEventFlushPromise=null;});
  return learningEventFlushPromise;
}

function emptyEvidenceDimension(){return MASTERY_API?MASTERY_API.emptyDimension():{evidenceScore:null,evidenceWeight:0,confidence:'brak danych',label:'brak danych'};}
function renderAdaptiveEvidence(model){
  const host=$('#adaptiveEvidenceRows');if(!host)return;
  const skill=model&&model.skills&&model.skills.question_formation;
  host.textContent='';
  EVIDENCE_DIMENSIONS.forEach(id=>{
    const value=skill&&skill.dimensions&&skill.dimensions[id]?skill.dimensions[id]:emptyEvidenceDimension();
    const row=make('div','evidence-row');
    row.append(make('strong','',EVIDENCE_LABELS[id]||id));
    row.append(make('span','',value.label||(value.evidenceScore===null?'brak danych':'rozwijane')));
    row.append(make('small','',value.evidenceWeight?('pewność: '+value.confidence+' · '+value.observations+' prób'):'potrzebna pierwsza próba'));
    host.append(row);
  });
  const due=model&&Number(model.dueReviews)||0;
  const dueNode=$('#adaptiveDueReviews');if(dueNode)dueNode.textContent=due+' '+(due===1?'powtórka czeka':'powtórek czeka');
  const status=$('#adaptiveEvidenceStatus');
  if(status)status.textContent=!model||!model.statistics||!model.statistics.events?'Zbieramy pierwsze wyniki':
    (due?'Czas na utrwalenie':'Profil aktualny');
}

function adaptiveTaskTitle(operation){
  return {
    recognition:'Rozpoznaj szyk pytania',recall:'Przypomnij sobie budowę pytania',
    controlled_production:'Zbuduj pytanie ze wsparciem',production:'Powiedz pełne pytanie',
    transfer:'Użyj pytania w nowym kontekście'
  }[operation]||'Ćwicz zadawanie pytań';
}
function canUseAdaptiveRecommendation(task){
  if(currentTrack()!=='school'||collectedTotal(S)<SENTENCE_UNLOCK_WORDS)return false;
  const index=recommendedSectionIndex();
  if(sectionCollected(index)===20&&!sectionPassed(index))return false;
  const patternId=task&&task.route&&task.route.patternId;
  if(patternId){
    const patternIndex=PATTERN_LIST.findIndex(pattern=>pattern.id===patternId);
    if(patternIndex<0||!patternUnlocked(patternIndex)||!readyPatternItems(patternId).length)return false;
  }
  return true;
}
function applyAdaptiveRecommendation(recommendation,model){
  if(!adaptiveHomeEnabled||!recommendation||!recommendation.task||recommendation.task.skill!=='question_formation'||!canUseAdaptiveRecommendation(recommendation.task))return;
  const task=recommendation.task;adaptiveRecommendation=recommendation;
  $('#todayGoalTitle').textContent=adaptiveTaskTitle(task.cognitiveOperation);
  $('#todayGoalCopy').textContent='Krótka aktywność rozwinie zadawanie pytań na podstawie Twoich dotychczasowych prób.';
  $('#todayGoalMeta').textContent=task.estimatedMinutes+'–'+(task.estimatedMinutes+2)+' min · '+EVIDENCE_LABELS[task.cognitiveOperation].toLowerCase()+' · decyzja adaptacyjna';
  const reasons=(recommendation.reasonText||[]).slice(0,2);
  $('#todayReason').textContent=reasons.length?reasons.join(' '):'To bezpieczny kolejny krok przy tym, co już zrobione.';
  $('#todayPrimaryAction').textContent='Ćwicz zadawanie pytań';
  $('#todayCoreTitle').textContent=adaptiveTaskTitle(task.cognitiveOperation);
  $('#todayCoreCopy').textContent='Zadanie dobrane osobno do rozpoznania, pamięci, produkcji lub transferu.';
  $('#todayCoreTime').textContent=task.estimatedMinutes+'–'+(task.estimatedMinutes+2)+' min';
  todayPrimaryHandler=()=>beginAdaptiveTask(task);
  renderAdaptiveEvidence(model);
}
async function refreshAdaptiveLearning(){
  if(!adaptiveHomeEnabled||!currentUser||currentUser.role!=='student')return;
  const revision=++adaptiveRequestRevision;
  try{
    const result=await api('/api/learner/next-task');
    if(revision!==adaptiveRequestRevision)return;
    adaptiveModel=result.model||adaptiveModel;adaptiveRecommendation=result.recommendation||null;
    renderAdaptiveEvidence(adaptiveModel);
    if(adaptiveModel&&adaptiveModel.statistics&&adaptiveModel.statistics.events>0)applyAdaptiveRecommendation(adaptiveRecommendation,adaptiveModel);
  }catch(error){renderAdaptiveEvidence(adaptiveModel);}
}

function touchStreak(){
  const day = today();
  if(S.lastDay === day) return;
  const yesterday = new Date(Date.now()-DAY).toISOString().slice(0,10);
  S.streak = S.lastDay === yesterday ? S.streak+1 : 1;
  S.lastDay = day;
}

function seen(id){ return Boolean(S.cards[id]); }
function isDue(id){ return seen(id) && S.cards[id].d <= Date.now(); }
function mastery(id){ const card=S.cards[id]; return !card?0:(card.i>=8?2:1); }
function grade(id,correct){
  const card = S.cards[id] || (S.cards[id]={i:0,e:2.2,d:0,r:0,ok:0,bad:0});
  if(correct){
    card.ok++; card.r++; card.e=Math.min(2.6,card.e+0.05);
    const base=STEPS[Math.min(card.r-1,STEPS.length-1)];
    card.i=Math.round(base*(card.e/2.2)); card.d=Date.now()+card.i*DAY;
  }else{
    card.bad++; card.r=Math.max(0,card.r-2); card.e=Math.max(1.3,card.e-0.15);
    card.i=0; card.d=Date.now();
  }
}

function sectionCollected(index){ return SECTIONS[index].cards.filter(card=>seen(card.id)).length; }
function sectionPassed(index){ return S.passedExams.includes(SECTIONS[index].id); }
function openSectionCount(){
  if(inTestMode()) return SECTIONS.length;
  let count=1;
  for(let i=0;i<SECTIONS.length-1;i++){
    if(sectionCollected(i)===20 && sectionPassed(i)) count=i+2;
    else break;
  }
  return Math.min(SECTIONS.length,count);
}

/* ==================== MOWA ==================== */
const hasTTS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeechRecognition = Boolean(SpeechRecognitionClass);
let voice = null;
let speechToken = 0;
let recognition = null;
const MAX_SPEECH_GATE_ATTEMPTS=2;
const VOICE_STORAGE_KEY='swift-bird:english-voice';
const SPEECH_RECOGNITION_LANGUAGE='en-US';

/* Web Speech udostepnia na kazdym urzadzeniu inny zestaw glosow. Nie
   zgadujemy juz jakosci po plci: to wlasnie potrafilo wybrac sztuczny albo
   efektowy glos. Najpierw wybieramy zwykly angielski glos systemowy, potem
   stabilny glos lokalny. Administrator moze nadpisac wybor dla urzadzenia. */
const NATURAL_VOICE_HINTS=['natural','neural','premium','enhanced'];
const TRUSTED_VOICE_HINTS=[
  'google us english','google uk english','samantha','serena','karen','moira',
  'tessa','ava','allison','zira','hazel','sonia','aria','jenny','libby','emma'
];
const NOVELTY_VOICE_HINTS=[
  'bad news','bahh','bells','boing','bubbles','cellos','jester','organ',
  'superstar','trinoids','whisper','wobble','zarvox','novelty'
];

function voiceScore(item){
  const name=(item.name||'').toLowerCase();
  const lang=(item.lang||'').replace('_','-').toLowerCase();
  let score=0;
  if(NOVELTY_VOICE_HINTS.some(token=>name.includes(token))) return -2000;
  if(item.default) score+=120;
  if(item.localService===true) score+=55;
  if(item.localService===false) score-=20;
  if(NATURAL_VOICE_HINTS.some(token=>name.includes(token))) score+=40;
  if(TRUSTED_VOICE_HINTS.some(token=>name.includes(token))) score+=32;
  // Popularne warianty brytyjski i amerykanski maja ten sam priorytet.
  // Nie oceniamy akcentu ucznia wzgledem akcentu lektora.
  if(lang==='en-gb'||lang==='en-us') score+=24;
  else if(lang.startsWith('en-')) score+=10;
  return score;
}

function voiceIdentity(item){
  return [item.voiceURI||'',item.name||'',item.lang||''].join('::');
}
function savedVoiceIdentity(){
  try{return window.localStorage.getItem(VOICE_STORAGE_KEY)||'';}catch(error){return '';}
}
function storeVoiceIdentity(value){
  try{
    if(value)window.localStorage.setItem(VOICE_STORAGE_KEY,value);
    else window.localStorage.removeItem(VOICE_STORAGE_KEY);
  }catch(error){}
}
function refreshVoiceSelect(voices,automaticVoice){
  const saved=savedVoiceIdentity();
  document.querySelectorAll('#voiceSelect,#studentVoiceSelect').forEach(select=>{
    select.textContent='';
    const automatic=document.createElement('option');
    automatic.value='';
    automatic.textContent='Automatycznie'+(automaticVoice?' — '+automaticVoice.name:'');
    select.append(automatic);
    voices.forEach(item=>{
      const option=document.createElement('option');
      option.value=voiceIdentity(item);
      option.textContent=item.name+' · '+String(item.lang||'en').replace('_','-')+(item.localService===true?' · lokalny':'');
      select.append(option);
    });
    select.disabled=!voices.length;
    select.value=saved&&voices.some(item=>voiceIdentity(item)===saved)?saved:'';
  });
}

function pickVoice(preferredIdentity){
  if(!hasTTS) return;
  let voices=[];
  try{ voices=window.speechSynthesis.getVoices() || []; }catch(error){}
  const tag=item=>(item.lang||'').replace('_','-').toLowerCase();
  const english=voices.filter(item=>tag(item)==='en' || tag(item).startsWith('en-'));
  if(!english.length){ voice=null; refreshVoiceSelect([],null); updateVoiceInfo(); return; }
  const ranked=english.slice().sort((a,b)=>voiceScore(b)-voiceScore(a));
  const requested=arguments.length?String(preferredIdentity||''):savedVoiceIdentity();
  voice=(requested&&english.find(item=>voiceIdentity(item)===requested))||ranked[0];
  refreshVoiceSelect(ranked,ranked[0]);
  updateVoiceInfo();
}

/* Nazwa wybranego glosu i jawna kontrola na wypadek roznych zestawow
   glosow na tabletach. Wybor jest lokalny dla tej przegladarki. */
function updateVoiceInfo(){
  document.querySelectorAll('#voiceInfo,#studentVoiceInfo').forEach(element=>{
    if(!hasTTS){ element.textContent='Ta przeglądarka nie ma syntezatora mowy.'; return; }
    if(!voice){ element.textContent='System nie ma angielskiego głosu. Doinstaluj angielskie dane głosowe w ustawieniach urządzenia.'; return; }
    element.textContent='Aktywny głos: '+voice.name+' ('+voice.lang+'). Naturalne tempo 1.0 i neutralna wysokość.';
  });
}
if(hasTTS){
  pickVoice();
  try{ window.speechSynthesis.addEventListener('voiceschanged',()=>pickVoice()); }catch(error){}
}

function stopSpeech(){
  speechToken++;
  try{ window.speechSynthesis.cancel(); }catch(error){}
  if(recognition){
    try{recognition.onresult=null;recognition.onerror=null;recognition.onend=null;recognition.abort();}catch(error){}
    recognition=null;
  }
}

function makeUtterance(text){
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang=voice?voice.lang:'en-US'; utterance.rate=1; utterance.pitch=1; utterance.volume=1;
  if(voice) utterance.voice=voice;
  return utterance;
}

function speakSequence(phrases,onDone){
  const list=phrases.filter(Boolean);
  const token=++speechToken;
  if(!hasTTS || !list.length){ if(onDone) onDone(); return; }
  try{ window.speechSynthesis.cancel(); }catch(error){}
  let index=0;
  const next=()=>{
    if(token!==speechToken) return;
    if(index>=list.length){ if(onDone) onDone(); return; }
    const text=list[index++];
    const utterance=makeUtterance(text);
    let finished=false;
    const finish=(timedOut=false)=>{
      if(finished)return;
      finished=true;
      clearTimeout(fallback);
      // Nie wolno uruchomic kolejnej wypowiedzi na niedokonczonej. Na
      // niektorych tabletach brak zdarzenia onend powodowal nakladanie sie
      // glosow i charakterystyczne, znieksztalcone brzmienie.
      if(timedOut){try{window.speechSynthesis.cancel();}catch(error){}}
      setTimeout(next,timedOut?90:0);
    };
    const fallback=setTimeout(()=>finish(true),Math.max(7000,Math.min(45000,text.length*170)));
    utterance.onend=()=>finish(false); utterance.onerror=()=>finish(true);
    try{ window.speechSynthesis.speak(utterance); }catch(error){ finish(); }
  };
  setTimeout(next,60);
}
function say(text){ speakSequence([text]); }

/* Cale zdanie jest jedna naturalna wypowiedzia. Nie rozdzielamy go na
   slowa, nie dodajemy sztucznego opoznienia i nie zmieniamy tempa glosu. */
function speakSentence(text,onDone){
  speakSequence([String(text||'').trim()],onDone);
}

function normalizeSpeech(value){
  return String(value||'').toLowerCase()
    .replace(/[\u2018\u2019]/g,"'")
    .replace(/\bi'm\b/g,'i am')
    .replace(/\b(you|we|they)'re\b/g,'$1 are')
    .replace(/\b(i|you|we|they)'ve\b/g,'$1 have')
    .replace(/\b(he|she|it)'s got\b/g,'$1 has got')
    .replace(/\b(he|she|it|this|that|what|who|where|when|why|how)'s\b/g,'$1 is')
    .replace(/\b(is|are|was|were|have|has|do|does|did|can|could|will|would|should)n't\b/g,'$1 not')
    .replace(/\bwon't\b/g,'will not')
    .replace(/\bcan't\b/g,'can not')
    .replace(/[^a-z0-9 ]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
/* Wulgaryzmy, ktore silnik rozpoznawania potrafi zwrocic przy dziecinnej wymowie
   niewinnych slow (klasyczny przypadek: horse). Nigdy nie pokazujemy dziecku
   transkrypcji, ktora nie jest szukanym slowem, a ta lista jest druga zapora. */
const BLOCKED_WORDS=new Set(['whore','hore','hoar','ass','arse','shit','fuck','fucking','bitch','dick','cock','tits','piss','cunt','nigger','nigga','prick','bastard','slut','damn','crap','penis','vagina','sex','porn']);
function containsBlockedWord(value){
  return normalizeSpeech(value).split(' ').some(word=>BLOCKED_WORDS.has(word));
}
/* Rozpoznawanie mowy zapisuje homofony według znaczenia, którego nie zna.
   Dlatego poprawnie wymówione "bee" może wrócić jako "B" albo "be". Poniżej
   są wyłącznie bezpieczne odpowiedniki o tej samej wymowie — nie stosujemy
   luźnej odległości tekstowej, która przepuszczałaby inne słowa. */
const SPEECH_EQUIVALENTS=Object.freeze({
  b:'bee',be:'bee','letter b':'bee',
  c:'sea',see:'sea','letter c':'sea',
  i:'eye','letter i':'eye',
  t:'tea',tee:'tea','letter t':'tea',
  son:'sun',pair:'pear',plain:'plane',flour:'flower',blew:'blue',
  won:'one',to:'two',too:'two',for:'four',write:'right',
  their:'there','they re':'there',hear:'here',weak:'week',knows:'nose',
  knew:'new',by:'buy',bye:'buy',knight:'night',bare:'bear',dear:'deer',rode:'road'
});
function speechKey(value){
  const normalized=normalizeSpeech(value).replace(/^(?:a|an|the)\s+/,'');
  return SPEECH_EQUIVALENTS[normalized]||normalized;
}
/* Pewność rozpoznania (confidence) jest w Chrome przy krótkich słowach
   niemiarodajna. Liczy się zgodna wymowa zapisana w jednej z równoważnych form. */
function pronunciationMatches(heard,target){
  const heardKey=speechKey(heard);const targetKey=speechKey(target);
  if(!heardKey||!targetKey)return false;
  if(heardKey===targetKey)return true;
  // Powtorzenie tego samego slowa nie jest bledem wymowy. Chrome czesto
  // zapisuje dwie proby jako jedna alternatywe (np. "bee bee").
  const heardWords=normalizeSpeech(heard).split(' ').filter(Boolean).map(word=>speechKey(word));
  return Boolean(heardWords.length)&&heardWords.every(word=>word===targetKey);
}

/* Przy dluzszej wypowiedzi Chrome czasem zapisuje poprawne brzmienie jako
   homofon albo gubi cichy rodzajnik. Najpierw normalizujemy bezpieczne
   odpowiedniki, a potem wymagamy tej samej kolejnosci wszystkich wyrazow
   niosacych znaczenie. Nie stosujemy przyblizonej odleglosci tekstowej. */
const OPTIONAL_SENTENCE_WORDS=new Set(['a','an','the']);
function sentenceSpeechTokens(value){
  return normalizeSpeech(value).split(' ')
    .map(word=>SPEECH_EQUIVALENTS[word]||word)
    .filter(word=>word&&!OPTIONAL_SENTENCE_WORDS.has(word));
}
function sentencePronunciationMatches(heard,target){
  const heardTokens=sentenceSpeechTokens(heard);
  const targetTokens=sentenceSpeechTokens(target);
  return Boolean(heardTokens.length)&&heardTokens.length===targetTokens.length&&
    heardTokens.every((word,index)=>word===targetTokens[index]);
}
const SPEECH_ERRORS={
  'not-allowed':'Brak dostępu do mikrofonu. Zezwól na mikrofon w ustawieniach strony.',
  'service-not-allowed':'Przeglądarka zablokowała mikrofon.',
  'no-speech':'Nic nie usłyszałem. Powiedz głośniej.',
  'audio-capture':'Nie znaleziono mikrofonu.',
  'network':'Rozpoznawanie mowy wymaga internetu.',
  'aborted':'Nagrywanie zostało przerwane.'
};
function listen(target,callback,matcher=pronunciationMatches){
  stopSpeech();
  let settled=false;
  const finish=result=>{
    if(settled)return; settled=true;
    try{ recognition&&recognition.stop(); }catch(error){}
    recognition=null;
    callback(result);
  };
  try{
    recognition=new SpeechRecognitionClass();
    // Rozpoznawanie jest niezalezne od wybranego lektora. Zmiana glosu z
    // brytyjskiego na amerykanski nie moze zmieniac zasad zaliczenia.
    recognition.lang=SPEECH_RECOGNITION_LANGUAGE;
    recognition.interimResults=false; recognition.maxAlternatives=10; recognition.continuous=false;
    recognition.onresult=event=>{
      const alternatives=Array.from(event.results||[]).flatMap(result=>Array.from(result||[])).map(item=>item&&item.transcript||'').filter(Boolean);
      const safeAlternatives=alternatives.filter(text=>!containsBlockedWord(text));
      // Przeglądarka zwraca kilka hipotez. Używamy tej, która naprawdę
      // spełnia kryterium zadania, zamiast zawsze oceniać tylko pierwszą.
      const matched=safeAlternatives.find(text=>matcher(text,target));
      const ok=Boolean(matched);
      const raw=matched||safeAlternatives[0]||'';
      // Przy trafieniu pokazujemy szukane slowo, nie surowa transkrypcje.
      // Przy pudle nie pokazujemy nic: dziecko nie ma powodu widziec,
      // ze silnik uslyszal cokolwiek innego, w tym wulgaryzm.
      if(ok)return finish({ok:true,text:typeof target==='string'?target:matched,raw,alternatives:safeAlternatives});
      const heardSomething=safeAlternatives.length>0;
      finish({
        ok:false,
        text:'',
        raw:raw,
        alternatives:safeAlternatives,
        msg:heardSomething?'Mikrofon zapisał inną formę i nie potrafi potwierdzić słowa.':'Mikrofon nie zebrał wystarczającego sygnału, aby potwierdzić słowo.'
      });
    };
    recognition.onerror=event=>finish({ok:false,text:'',fatal:['not-allowed','service-not-allowed','audio-capture','network'].includes(event.error),msg:SPEECH_ERRORS[event.error]||'Nie udało się rozpoznać słowa.'});
    recognition.onend=()=>finish({ok:false,text:'',msg:'Nic nie usłyszałem. Spróbuj jeszcze raz.'});
    recognition.start();
  }catch(error){ callback({ok:false,text:'',fatal:true,msg:'Nie mogę uruchomić mikrofonu. Otwórz aplikację w Chrome i zezwól na mikrofon.'}); }
}

/* ==================== STRONA UCZNIA ==================== */
let currentSectionIndex=0;
/* Tryb testowy: wlaczany WYLACZNIE z panelu administratora, po zalogowaniu
   haslem z ADMIN_PASSWORD. Uczen nie ma jak go wlaczyc, bo warunkiem jest
   rola 'admin' w sesji po stronie serwera. saveProgress i tak odrzuca zapis
   dla roli innej niz 'student', wiec klikanie tu nie rusza zadnego konta. */
let testMode=false;
function inTestMode(){ return testMode && currentUser && currentUser.role==='admin'; }

function patternItems(patternId){ return PATTERN_ITEMS.filter(item=>item.pattern===patternId); }
/* Ścieżka steruje tym, co widać: 'school' to wyprawa Jerzyka i gramatyka
   z lekcji, 'world' to angielski użytkowy. Nieznane wartości traktujemy
   jak 'school', żeby stare konta działały bez zmian. */
let testTrack='school';
function currentTrack(){
  // W trybie testowym ścieżka jest lokalna: admin nie ma konta ucznia,
  // więc nie ma czego czytać ani zapisywać.
  if(inTestMode()) return testTrack;
  const track = currentUser && currentUser.track;
  return track==='world' ? 'world' : 'school';
}
function applyTrackToInterface(){
  const world = currentTrack()==='world';
  document.body.classList.toggle('track-world', world);
  document.body.classList.toggle('track-school', !world);
  const chromeTrack=$('#chromeTrack');
  if(chromeTrack)chromeTrack.textContent=world?'Student':'Uczeń';
  const toggle=$('#trackToggle');
  if(toggle) toggle.textContent = world ? 'Przełącz na Ucznia' : 'Przełącz na Studenta';
  const title=$('#profileTrackTitle');
  if(title)title.textContent=world?'Student':'Uczeń';
  const copy=$('#profileTrackCopy');
  if(copy)copy.textContent=world
    ? 'Angielski do życia i pracy, własne cele, CEFR oraz praktyczna gramatyka.'
    : 'Angielski szkolny, kolekcja słów, zdania i wyprawa Jerzyka.';
}
function collectedVocabulary(){
  const vocab=new Set(CARDS.filter(card=>seen(card.id)).map(card=>card.en.toLowerCase()));
  // Słowa z pul dokładamy do generatora, ale TYLKO te, które pasują do ról
  // semantycznych szablonów. Biznesowe czy podróżne słowa nie mają roli,
  // więc generator i tak by ich nie użył — nie wciskamy ich na siłę, bo
  // dałoby to zdania bez sensu. To działa realnie dla pul szkolnych.
  if(typeof SENTENCE_GEN!=='undefined' && SENTENCE_GEN.SEM && S.poolCards){
    const roleWords=new Set();
    Object.values(SENTENCE_GEN.SEM).forEach(list=>list.forEach(w=>roleWords.add(String(w).toLowerCase())));
    Object.keys(S.poolCards).forEach(key=>{
      const en=key.split(':').slice(2).join(':').toLowerCase();
      if(en && roleWords.has(en)) vocab.add(en);
    });
  }
  return vocab;
}
function itemVocabularyReady(item,vocabulary=collectedVocabulary()){
  return inTestMode()||(item.vocab||[]).every(word=>vocabulary.has(word.toLowerCase()));
}
function readyPatternItems(patternId){
  const vocabulary=collectedVocabulary();
  return patternItems(patternId).filter(item=>itemVocabularyReady(item,vocabulary));
}
function learnedSentenceCount(patternId){
  return patternItems(patternId).filter(item=>(S.patterns[item.id]||{}).ok>0).length;
}
function totalLearnedSentences(){
  return PATTERN_ITEMS.filter(item=>(S.patterns[item.id]||{}).ok>0).length;
}
function patternUnlocked(index){
  if(inTestMode())return true;
  if(collectedTotal(S)<SENTENCE_UNLOCK_WORDS)return false;
  if(index===0)return true;
  return learnedSentenceCount(PATTERN_LIST[index-1].id)>=SENTENCE_UNLOCK_SUCCESSES;
}
function openPatternCount(){ return PATTERN_LIST.filter((pattern,index)=>patternUnlocked(index)).length; }

function kanwaPlural(n,one,few,many){const m10=n%10,m100=n%100;if(n===1)return one;if(m10>=2&&m10<=4&&!(m100>=12&&m100<=14))return few;return many;}
function renderVocabularyLaunch(){
  const collected=collectedTotal(S);
  const idx=recommendedSectionIndex();const sec=sectionCollected(idx);const done=sectionPassed(idx);
  const place=(window.JOURNEY&&window.JOURNEY[idx]&&window.JOURNEY[idx].place)||'';
  const remain=Math.max(0,20-sec);
  const words={1:'Jedno słowo',2:'Dwa słowa',3:'Trzy słowa',4:'Cztery słowa'};
  $('#vocabularyLaunchText').textContent='Sekcja '+(idx+1)+(place?', '+place:'')+': '+sec+' z 20 słów. Łącznie '+collected+' z '+CARDS.length+'.';
  const short=$('#vocabularyLaunchShort');if(short)short.textContent='Sekcja '+(idx+1)+': '+sec+' z 20 słów';
  const hint=$('#vocabularyLaunchHint');
  if(hint)hint.textContent=done?'Sekcja '+(idx+1)+' zdana. Kolejna czeka.':(remain>0?(words[remain]||(remain+' '+kanwaPlural(remain,'słowo','słowa','słów')))+' do końca sekcji '+(idx+1)+(place?', '+place:'')+'. Potem egzamin.':'Komplet słów w sekcji '+(idx+1)+'. Czas na egzamin.');
  const count=$('#vocabularyLaunchCount');if(count)count.textContent=sec+' / 20 słów';
  $('#vocabularyLaunchFill').style.width=(sec/20*100)+'%';
}

function renderSentenceLaunch(){
  const collected=collectedTotal(S);const learned=totalLearnedSentences();const ready=inTestMode()||collected>=SENTENCE_UNLOCK_WORDS;
  const button=$('#openSentences');button.disabled=!ready;
  $('#sentenceLaunchText').textContent=ready
    ? learned+' z '+PATTERN_ITEMS.length+' zdań poznanych'
    : 'Zbierz jeszcze '+(SENTENCE_UNLOCK_WORDS-collected)+' '+((SENTENCE_UNLOCK_WORDS-collected)===1?'słowo':'słowa')+', aby zacząć układać zdania.';
  $('#sentenceLaunchFill').style.width=(ready?(learned/PATTERN_ITEMS.length*100):(collected/SENTENCE_UNLOCK_WORDS*100))+'%';
  $('#sentenceLaunchText').dataset.short=ready?learned+' z '+PATTERN_ITEMS.length+' zdań':'Zbierz '+(SENTENCE_UNLOCK_WORDS-collected)+' '+kanwaPlural(SENTENCE_UNLOCK_WORDS-collected,'słowo','słowa','słów');

  // Kafelki modułów: otwarte pokazują postęp, zamknięte jasny warunek (plan v13.7).
  const mods=unlockedModules();
  const setModule=(launchId,textId,open,openText,lockedText,lockedLabel,unlockTarget)=>{
    const launch=$(launchId); const text=$(textId);
    if(launch){
      launch.classList.toggle('locked',!open);
      const action=launch.querySelector('button.primary');
      if(action){action.textContent=open?'Otwórz':lockedLabel;if(open)delete action.dataset.unlock;else action.dataset.unlock=unlockTarget;}
    }
    if(text)text.textContent=open?openText:lockedText;
  };
  const sentencesOk=countOk(S.patterns);
  setModule('#storiesLaunch','#storiesLaunchText',mods.stories,
    Object.values(S.stories||{}).filter(r=>r.done).length+' z '+STORY_LIST.length+' historyjek przeczytanych.',
    'Masz '+collected+' z 25 słów i '+sentencesOk+' z 5 zdań.','Zbieraj słowa','#openVocabulary');
  setModule('#dialoguesLaunch','#dialoguesLaunchText',mods.dialogues,
    Object.values(S.dialogues||{}).filter(r=>r.done).length+' z '+DIALOGUE_LIST.length+' dialogów przećwiczonych.',
    'Masz '+collected+' z 40 słów i '+sentencesOk+' z 12 zdań.','Zbieraj słowa','#openVocabulary');
  setModule('#detectiveLaunch','#detectiveLaunchText',mods.detective,
    'Analiza błędów gotowa. Znajdziesz i poprawisz pomyłki.',
    'Masz '+sentencesOk+' z 20 zdań.','Układaj zdania','#openSentences');
  const closedHeading=$('#nuClosedHeading');
  if(closedHeading)closedHeading.hidden=!document.querySelector('.nu-modules .module-launch.locked:not(.track-hidden)')||currentTrack()==='world';
  const grammarText=$('#grammarLaunchText');
  if(grammarText&&TENSE_LIST.length){const lv=TENSE_LIST.map(t=>t.level||t.cefr).filter(Boolean);grammarText.textContent=TENSE_LIST.length+' '+kanwaPlural(TENSE_LIST.length,'czas','czasy','czasów')+(lv.length?', poziomy '+lv[0]+' do '+lv[lv.length-1]:'');grammarText.dataset.short=TENSE_LIST.length+' '+kanwaPlural(TENSE_LIST.length,'czas','czasy','czasów')+(lv.length?', '+lv[0]+' do '+lv[lv.length-1]:'');}
}

function renderSentenceHub(){
  if(!inTestMode()&&collectedTotal(S)<SENTENCE_UNLOCK_WORDS){renderHome();show('home');return;}
  const learned=totalLearnedSentences();
  $('#sentenceKnownN').textContent=learned;
  $('#sentenceTotalLabel').textContent='z '+PATTERN_ITEMS.length+' zdań';
  $('#sentenceOpenN').textContent=openPatternCount();
  $('#sentenceFeatherN').textContent=S.feathers||0;
  $('#sentenceHubNote').textContent='Każdy temat otwiera się po ułożeniu '+SENTENCE_UNLOCK_SUCCESSES+' różnych zdań w poprzednim. Zdania korzystają ze słów, które masz już w kolekcji. Reguł nie trzeba zapamiętywać — zauważasz wzorzec podczas układania.';
  const grid=$('#patternGrid');grid.textContent='';
  PATTERN_LIST.forEach((pattern,index)=>{
    const learnedHere=learnedSentenceCount(pattern.id);const unlocked=patternUnlocked(index);const available=readyPatternItems(pattern.id);const canPractice=unlocked&&available.length>0;const complete=learnedHere===pattern.items.length;
    const button=make('button','pattern-card'+(unlocked?'':' locked')+(!available.length&&unlocked?' waiting':'')+(complete?' complete':''));
    button.type='button';
    button.setAttribute('aria-label',canPractice?'Ćwicz temat: '+pattern.name:(unlocked?'Zbierz potrzebne słowa do tematu: '+pattern.name:'Temat zablokowany: '+pattern.name));
    button.append(make('span','pattern-number','ETAP '+(index+1)+' Z '+PATTERN_LIST.length));
    button.append(make('span','pattern-icon',unlocked?(available.length?'🧱':'⏳'):'🔒'));
    button.append(make('strong','',pattern.name));
    if(canPractice)button.append(make('span','pattern-example',pattern.example));
    const status=make('span','pattern-status');
    if(unlocked&&!available.length)status.textContent='Nowe zdania pojawią się wraz ze słowami w kolekcji';
    else if(unlocked)status.textContent=complete?'Wszystkie zdania poznane':learnedHere+' z '+pattern.items.length+' zdań poznanych · '+available.length+' dostępnych';
    else if(index===0)status.textContent='Najpierw zbierz '+SENTENCE_UNLOCK_WORDS+' słowa';
    else status.textContent='Najpierw ułóż '+SENTENCE_UNLOCK_SUCCESSES+' zdania w poprzednim etapie';
    button.append(status);
    const progress=make('span','pattern-progress');const fill=make('i');fill.style.width=(learnedHere/pattern.items.length*100)+'%';progress.append(fill);button.append(progress);
    if(canPractice)button.addEventListener('click',()=>beginPatternSession(pattern.id));
    else button.addEventListener('click',()=>{
      if(unlocked&&!available.length){
        toast('Ten temat czeka na słowa. Zbierz kilka nowych słów, a zdania się pojawią.');
        goHome('learn');
      }else if(!unlocked&&index===0){
        toast('Najpierw zbierz '+SENTENCE_UNLOCK_WORDS+' słowa w kolekcji. Zabieram cię do słów.');
        goHome('learn');
      }else{
        toast('Ten etap otworzy się po ułożeniu '+SENTENCE_UNLOCK_SUCCESSES+' zdań w poprzednim. Zaczynamy od niego.');
        const prev=PATTERN_LIST[index-1];
        if(prev&&patternUnlocked(index-1)&&readyPatternItems(prev.id).length)beginPatternSession(prev.id);
      }
    });
    grid.append(button);
  });
  show('sentences');
}

/* Główna nawigacja ma cztery stałe miejsca. Zmienia się zawartość, nie
   położenie elementów, dzięki czemu dziecko i dorosły uczą się jednego
   modelu aplikacji. */
let activeHomeTab='today';
let todayPrimaryHandler=null;
function openHomeTab(tab='today'){
  const allowed=new Set(['today','learn','progress','profile']);
  activeHomeTab=allowed.has(tab)?tab:'today';
  document.querySelectorAll('[data-home-view]').forEach(view=>{view.hidden=view.dataset.homeView!==activeHomeTab;});
  document.querySelectorAll('[data-rail-tab]').forEach(button=>{
    const active=button.dataset.railTab===activeHomeTab;
    button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
  if(activeHomeTab!=='today')setHomeGuideVisible(false);
  setLearningHelpContext('home-'+activeHomeTab);
  window.scrollTo(0,0);
}
/* Stała rama ucznia upraszcza orientację między modułami. Podczas zadania
   zostaje tylko znak i profil; boczna/dolna nawigacja znika, by nie kusić
   przypadkowym opuszczeniem niezapisanej próby. */
const CHROME_HIDDEN=new Set(['login','register','admin-login','admin']);
const RAIL_FOCUS_SCREENS=new Set(['play','exam','placement','tense-drill','bloom-lab']);
function updateStudentChrome(name){
  const student=Boolean(currentUser&&(currentUser.role==='student'||inTestMode())&&!CHROME_HIDDEN.has(name));
  const railVisible=student&&!RAIL_FOCUS_SCREENS.has(name);
  const chrome=$('#studentChrome');const rail=$('#studentRail');
  if(chrome)chrome.hidden=!student;
  if(rail)rail.hidden=!railVisible;
  document.body.classList.toggle('has-student-chrome',student);
  document.body.classList.toggle('has-student-rail',railVisible);
  if(!student)return;
  const nameNode=$('#chromeName');if(nameNode)nameNode.textContent=inTestMode()?'Tryb testowy':(currentUser.firstName||currentUser.displayName||'Uczeń');
  const trackNode=$('#chromeTrack');if(trackNode)trackNode.textContent=currentTrack()==='world'?'Student':'Uczeń';
  const avatarNode=$('#chromeAvatar');if(avatarNode)avatarNode.textContent=kanwaInitials((currentUser&&(currentUser.displayName||currentUser.firstName))||'Uczeń');
  document.querySelectorAll('[data-rail-tab]').forEach(button=>{
    const active=name==='home'&&button.dataset.railTab===activeHomeTab;
    button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
}
function goHome(tab=activeHomeTab){renderHome();show('home');openHomeTab(tab);}
function homeGuideKey(){return 'swift-bird:guidance:13.10:'+(currentUser&&currentUser.id?currentUser.id:'test')+':today';}
function setHomeGuideVisible(visible){
  const guide=$('#homeFirstGuide');const recommendation=$('#todayRecommendation');
  if(guide)guide.hidden=!visible;
  if(recommendation)recommendation.classList.toggle('guide-visible',Boolean(visible));
}
function dismissHomeGuide(){
  setHomeGuideVisible(false);
  try{localStorage.setItem(homeGuideKey(),'seen');}catch(error){}
}
function maybeShowHomeGuide(force=false){
  const guide=$('#homeFirstGuide');if(!guide||activeHomeTab!=='today'||!currentUser||currentUser.role!=='student')return;
  let seen=false;try{seen=localStorage.getItem(homeGuideKey())==='seen';}catch(error){}
  setHomeGuideVisible(force||!seen);
}
function runTodayPrimaryAction(){
  dismissHomeGuide();
  if(typeof todayPrimaryHandler==='function')todayPrimaryHandler();
}
function explainTodayPlan(){
  dismissHomeGuide();
  const rationale=document.querySelector('.today-rationale');
  if(!rationale)return;
  rationale.open=true;
  const summary=rationale.querySelector('summary');
  rationale.scrollIntoView({behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  if(summary)summary.focus({preventScroll:true});
}
function recommendedSectionIndex(){
  const open=openSectionCount();
  for(let index=0;index<open;index++)if(sectionCollected(index)<20||!sectionPassed(index))return index;
  return Math.max(0,open-1);
}
function renderTodayDashboard(){
  const date=$('#todayDateLabel');
  if(date){
    let label='';try{label=new Intl.DateTimeFormat('pl-PL',{weekday:'long',day:'numeric',month:'long'}).format(new Date());}catch(error){label=today();}
    date.textContent=label.charAt(0).toUpperCase()+label.slice(1);
  }
  const title=$('#todayGoalTitle');const copy=$('#todayGoalCopy');const meta=$('#todayGoalMeta');const reason=$('#todayReason');const action=$('#todayPrimaryAction');
  const coreTitle=$('#todayCoreTitle');const coreCopy=$('#todayCoreCopy');const coreTime=$('#todayCoreTime');
  let progress=0;
  if(currentTrack()==='world'){
    const cefr=ensureCefrState();
    const goals=Array.isArray(cefr.goals)?cefr.goals:[];
    const completed=goals.filter(id=>{const value=(S.tenses||{})[id];return value&&value.done>0;}).length;
    const businessDone=Object.values(S.business||{}).reduce((sum,item)=>sum+(item.done||0),0);
    const advancedWorld=LV.cefrOrder(cefr.unlockedLevel||cefr.level)>=LV.cefrOrder('B2');
    progress=goals.length?Math.round(completed/goals.length*100):(cefr.level?25:0);
    if(!cefr.level){
      title.textContent='Znajdź dobry punkt startu';
      copy.textContent='Krótki test orientacyjny dopasuje zakres A1–C2, żeby nie zaczynać od zera, jeśli część materiału już znasz.';
      meta.textContent='około 10 min · wynik orientacyjny · bez certyfikacji';
      reason.textContent='Nie znamy jeszcze Twojego punktu startu. Test zapobiega rozpoczynaniu od materiału, który już umiesz.';
      action.textContent='Rozpocznij test poziomujący';
      coreTitle.textContent='Test poziomujący';coreCopy.textContent='Schodkowe pytania z kilku obszarów języka.';coreTime.textContent='około 10 min';
      todayPrimaryHandler=startAdaptivePlacement;
    }else if(advancedWorld&&!businessDone){
      title.textContent='Użyj angielskiego w sytuacji zawodowej';
      copy.textContent='Wynik CEFR otworzył scenariusze dopasowane do Twojego poziomu. Zacznij od pełnej odpowiedzi w realnym kontekście.';
      meta.textContent='6–8 min · poziom '+cefr.level+' · mówienie lub wpisywanie';
      reason.textContent='Na poziomie '+cefr.level+' ważne jest zastosowanie języka, nie samo rozpoznanie poprawnej formy.';
      action.textContent='Otwórz sytuacje zawodowe';
      coreTitle.textContent='Praktyka zawodowa';coreCopy.textContent='Kontekst, kryteria treści i naturalna pełna odpowiedź.';coreTime.textContent='6–8 min';
      todayPrimaryHandler=openBusiness;
    }else if(!goals.length){
      title.textContent='Ułóż własny plan nauki';
      copy.textContent='Wybierz tematy, które są Ci teraz potrzebne. Wynik CEFR otworzył właściwy zakres programu.';
      meta.textContent='2 min · poziom '+cefr.level+' · cele można zmienić';
      reason.textContent='Poziom jest już oszacowany, ale bez wybranego celu program nie wie, które zastosowania są dla Ciebie najważniejsze.';
      action.textContent='Wybierz cele';
      coreTitle.textContent='Wybór celu';coreCopy.textContent='Zdecyduj, czego chcesz używać w praktyce.';coreTime.textContent='2 min';
      todayPrimaryHandler=renderLevelCenter;
    }else{
      title.textContent='Przejdź do wybranego celu';
      copy.textContent='Program zacznie od pierwszego wskazanego tematu i zachowa dostęp do wcześniejszych poziomów na powtórkę.';
      meta.textContent='8–12 min · poziom '+cefr.level+' · '+goals.length+' wybrane '+(goals.length===1?'temat':'tematy');
      reason.textContent='To pierwszy z wybranych przez Ciebie celów dostępny na aktualnym poziomie.';
      action.textContent='Kontynuuj gramatykę';
      coreTitle.textContent='Praktyczna gramatyka';coreCopy.textContent='Kontrast, zastosowanie i własna wypowiedź.';coreTime.textContent='8–12 min';
      todayPrimaryHandler=openTenses;
    }
  }else{
    const sectionIndex=recommendedSectionIndex();const count=sectionCollected(sectionIndex);const passed=sectionPassed(sectionIndex);const collected=collectedTotal(S);
    progress=passed?100:count*5;
    if(count===20&&!passed){
      title.textContent='Zdaj egzamin sekcji '+(sectionIndex+1);
      copy.textContent='Masz już komplet 20 słów. Dopasuj obrazki do słów, aby otworzyć następny etap wyprawy.';
      meta.textContent='około 6 min · 4 rundy · 20 par';action.textContent='Rozpocznij egzamin';
      reason.textContent='Masz komplet słów w tej sekcji. Sprawdzenie jest teraz warunkiem odblokowania kolejnego etapu.';
      coreTitle.textContent='Egzamin sekcji';coreCopy.textContent='Sprawdzenie znaczenia i rozpoznawania słów.';coreTime.textContent='około 6 min';
      todayPrimaryHandler=()=>{currentSectionIndex=sectionIndex;startExam(sectionIndex);};
    }else if(collected<SENTENCE_UNLOCK_WORDS){
      const missing=SENTENCE_UNLOCK_WORDS-collected;
      title.textContent='Zbierz '+missing+' '+(missing===1?'pierwsze słowo':'pierwsze słowa');
      copy.textContent='Po czterech słowach otworzy się moduł zdań. Każde słowo przećwiczysz głosem i samodzielnym wpisaniem.';
      meta.textContent='6–8 min · sekcja '+(sectionIndex+1)+' · postęp '+count+'/20';action.textContent=count?'Kontynuuj słowa':'Rozpocznij naukę';
      reason.textContent='Pierwsze cztery utrwalone słowa otwierają zdania, więc ten krok uruchamia kolejną część programu.';
      coreTitle.textContent='Pierwsze słowa';coreCopy.textContent='Wymowa, znaczenie i pisownia.';coreTime.textContent='6–8 min';
      todayPrimaryHandler=()=>{currentSectionIndex=sectionIndex;renderSection(sectionIndex);};
    }else{
      const due=CARDS.filter(card=>isDue(card.id)).length;
      title.textContent=due?'Powtórz i zbuduj zdanie':'Krótka sesja nauki';
      copy.textContent=due
        ? 'Najpierw wrócimy do słów gotowych do powtórki, potem użyjesz znanego materiału w zdaniu.'
        : 'Poznasz kolejne słowa i zastosujesz już zebrane elementy w krótkim zdaniu.';
      meta.textContent='8 min · '+(due?due+' słów czeka na powtórkę':'nowy materiał')+' · zapis postępu';action.textContent='Kontynuuj naukę';
      reason.textContent=due?'Te słowa są gotowe do powtórki według zapisanego postępu. Po nich zastosujesz materiał w zdaniu.':'Nie ma pilnych powtórek, dlatego program może bezpiecznie dodać nowy materiał.';
      coreTitle.textContent='Powtórka i zdanie';coreCopy.textContent='Krótka sesja dopasowana do aktualnego postępu.';coreTime.textContent='8 min';
      todayPrimaryHandler=()=>{currentSectionIndex=sectionIndex;beginSession(true);};
    }
  }
  progress=Math.max(0,Math.min(100,progress));
  const percent=$('#todayWeekPercent');if(percent)percent.textContent=progress+'%';
  const ring=document.querySelector('.today-progress-ring');if(ring)ring.style.setProperty('--week-progress',(progress*3.6)+'deg');
  const progressNode=document.querySelector('.today-progress');if(progressNode)progressNode.setAttribute('aria-valuenow',String(progress));
}

function renderWorldProgressSnapshot(){
  const state=ensureCefrState();const goals=Array.isArray(state.goals)?state.goals:[];
  const grammar=TENSE_LIST.filter(tense=>tenseProgress(tense.id).done>=tense.drills.length).length;
  const own=Object.values(S.bloom||{}).filter(record=>record&&record.create>0&&record.spoken>0).length;
  const goalNode=$('#worldGoalN');const grammarNode=$('#worldGrammarN');const bloomNode=$('#worldBloomN');
  if(goalNode)goalNode.textContent=String(goals.length);if(grammarNode)grammarNode.textContent=String(grammar);if(bloomNode)bloomNode.textContent=String(own);
  const summary=$('#worldProgressSummary');if(summary)summary.textContent=state.level
    ? 'Punkt startu '+state.level+' · '+grammar+' z '+TENSE_LIST.length+' tematów ukończonych.'
    : 'Najpierw wykonaj test poziomujący i wybierz cele.';
}

function enterStudent(){
  learningSessionId=newLearningSessionId();adaptiveModel=null;adaptiveRecommendation=null;activeAdaptiveTask=null;
  const welcome=$('#welcomeName');if(welcome)welcome.textContent='Cześć, '+currentUser.firstName+'!';
  applyTrackToInterface();
  setSync('zapisano');
  /* Po aktualizacji aplikacji sprawdzamy także wcześniejsze osiągnięcia.
     Dzięki temu uczeń, który spełnił warunek przed dodaniem galerii,
     nie musi wykonywać tego samego zadania ponownie. */
  const restoredBadges=checkBadges();
  if(restoredBadges.length)saveProgress();
  activeHomeTab='today';renderHome();show('home');openHomeTab('today');maybeShowHomeGuide();
  flushLearningEvents().then(refreshAdaptiveLearning);
  announceBadges(restoredBadges);
}

function renderSectionsGrid(){
  const open=openSectionCount();
  const grid=$('#sectionsGrid');grid.textContent='';
  SECTIONS.forEach((section,index)=>{
    const count=sectionCollected(index);
    const locked=index>=open;
    const passedExam=sectionPassed(index);
    const button=make('button','section-card'+(locked?' locked':'')+(passedExam?' passed':''));
    button.type='button';
    // Zablokowany kafelek NIE jest martwy: dotknięcie mówi, czego brakuje,
    // i prowadzi do najbliższej otwartej sekcji, gdzie zdobędziesz postęp.
    button.setAttribute('aria-label',locked?'Sekcja '+(index+1)+' — jeszcze zamknięta, dotknij, aby zobaczyć, co odblokować':'Otwórz sekcję '+section.name);
    button.append(make('span','number','SEKCJA '+String(index+1).padStart(2,'0')));
    button.append(make('span','section-card-icon',locked?'🔒':section.icon));
    button.append(make('strong','',section.name));
    button.append(make('small','',passedExam?'Egzamin zdany':count+' z 20 słów'));
    if(locked)button.append(make('span','lock','🔒'));
    const progress=make('span','card-progress');
    const fill=make('i');fill.style.width=(passedExam?100:count*5)+'%';progress.append(fill);button.append(progress);
    if(!locked)button.addEventListener('click',()=>renderSection(index));
    else button.addEventListener('click',()=>{
      const lastOpen=Math.max(0,open-1);
      toast('Sekcja '+(index+1)+' otworzy się, gdy zdasz egzamin w sekcji '+open+'. Zabieram cię tam.');
      renderSection(lastOpen);
    });
    grid.append(button);
  });
}

function renderVocabularyHub(){
  const collected=collectedTotal(S);const passed=S.passedExams.length;const open=openSectionCount();
  $('#vocabularyCollectedN').textContent=collected;
  $('#vocabularyPassedN').textContent=passed;
  $('#vocabularyOpenN').textContent=open;
  renderSectionsGrid();
  show('vocabulary');
}

function renderHome(){
  const collected=CARDS.filter(card=>seen(card.id)).length;
  const passed=SECTIONS.filter((section,index)=>sectionPassed(index)).length;
  const open=openSectionCount();
  const badgeCount=(S.badges||[]).length;
  const poolProgress=Boolean(S.poolCards&&Object.keys(S.poolCards).length);
  const nothingYet=collected===0&&passed===0&&(S.feathers||0)===0&&!poolProgress&&(S.sessions||0)===0;
  const progressEmpty=$('#progressEmpty');if(progressEmpty)progressEmpty.hidden=!nothingYet;
  document.querySelectorAll('#homeProgress .overview, #homeProgress .home-progress-detail, #adaptiveEvidenceCard')
    .forEach(block=>block.classList.toggle('dimmed-empty',nothingYet));
  $('#streakN').textContent=S.streak;
  $('#allCollected').textContent=collected;
  $('#passedN').textContent=passed;
  $('#openN').textContent=open;
  $('#featherN').textContent=S.feathers||0;
  $('#badgeN').textContent=badgeCount;
  $('#homeBadgeCount').textContent=badgeCount+' z '+BADGES.length+' zdobytych';
  renderBadgeGallery($('#homeBadgeList'));
  renderVocabularyLaunch();
  renderSentenceLaunch();
  renderHomeLevel();
  renderWorldProgressSnapshot();
  renderTodayDashboard();
  renderKanwaToday(collected,passed);
  renderAdaptiveEvidence(adaptiveModel);
  if(adaptiveModel&&adaptiveModel.statistics&&adaptiveModel.statistics.events>0)applyAdaptiveRecommendation(adaptiveRecommendation,adaptiveModel);
  applyTrackToInterface();
  const challenge=challengeProgress();
  $('#challengeLine').textContent=challenge?('Wyzwanie dnia: '+challenge.challenge.text):'';
}

function renderSection(index){
  if(index>=openSectionCount())return renderVocabularyHub();
  currentSectionIndex=index;
  const section=SECTIONS[index];
  const count=sectionCollected(index);
  const passed=sectionPassed(index);
  $('#sectionNumber').textContent='Sekcja '+(index+1)+' z 25';
  $('#sectionIcon').textContent=section.icon;
  $('#sectionEyebrow').textContent='Sekcja '+String(index+1).padStart(2,'0');
  $('#sectionTitle').textContent=section.name;
  $('#sectionProgress').textContent=passed?'20 słów · egzamin zdany':count+' z 20 słów zebranych';
  const grid=$('#wordGrid'); grid.textContent='';
  section.cards.forEach(card=>{
    const collected=seen(card.id);
    const button=make('button','word-tile'+(collected?' collected':''),collected?card.ic:'•');
    button.type='button'; button.disabled=!collected;
    button.setAttribute('aria-label',collected?card.en:'Słowo jeszcze nieodkryte');
    if(collected) button.addEventListener('click',()=>{say(card.en);toast(card.en+' – '+card.pl);});
    grid.append(button);
  });
  const action=$('#sectionAction'); action.textContent='';
  const note=make('p','');
  const button=make('button','primary wide'); button.type='button';
  if(count===20&&!passed){
    note.textContent='Wszystkie słowa zebrane. Czas dopasować 20 par.';
    button.textContent='Zdaj egzamin'; button.addEventListener('click',()=>startExam(index));
  }else if(passed){
    note.textContent=index===SECTIONS.length-1?'Cały kurs ukończony. Możesz nadal utrwalać słowa.':'Ta sekcja jest ukończona. Kolejna została odblokowana.';
    button.textContent='Powtórz słowa'; button.addEventListener('click',()=>beginSession(false));
  }else{
    note.textContent='Nowe słowo wymaga próby wymowy i poprawnego wpisania. Jeśli mikrofon nie ma pewności, możesz iść dalej; poprawna pisownia nie zostanie przez to obniżona.';
    button.textContent=count?'Kontynuuj naukę':'Rozpocznij naukę'; button.addEventListener('click',()=>beginSession(false));
  }
  action.append(note,button);
  if(!passed){
    const quick=make('button','secondary wide','Mam tylko chwilę (8 minut)');
    quick.type='button';
    quick.addEventListener('click',()=>beginSession(true));
    action.append(quick);
  }
  /* Tryb testowy nie omija bramki egzaminu: uzupelnia sekcje do 20 slow,
     po czym egzamin otwiera sie normalna droga, tak jak u ucznia. */
  if(inTestMode() && count<20){
    action.append(makeSkip('Uzupełnij sekcję do 20 słów',()=>{
      section.cards.forEach(card=>{ if(!seen(card.id)) grade(card.id,true); });
      renderSection(index);
    }));
  }
  show('section');
}

/* ==================== SESJA NAUKI ==================== */
let queue=[],done=0,hits=0,added=[],startedAt=0,advanceTimer=null,sessionRun=0;
let stageTotal=0,introTotal=0,introShown=0;

function distractors(card,count){
  const sectionCards=shuffle(SECTIONS[card.sectionIndex].cards.filter(item=>item.id!==card.id));
  return sectionCards.slice(0,count);
}

function startLearning(){
  const cards=SECTIONS[currentSectionIndex].cards;
  const fresh=shuffle(cards.filter(card=>!seen(card.id))).slice(0,NEW_PER_SESSION);
  const due=shuffle(cards.filter(card=>isDue(card.id))).slice(0,MAX_SESSION_ITEMS-fresh.length*2);
  queue=[];
  fresh.forEach(card=>queue.push({card,mode:'intro'},{card,mode:'type-word'}));
  due.forEach(card=>{
    const repetitions=(S.cards[card.id]||{}).r||0;
    const modes=repetitions>=1?['type-word','type-word','pick-icon','hear-icon']:['type-word','pick-icon','hear-icon'];
    queue.push({card,mode:modes[Math.floor(Math.random()*modes.length)]});
  });
  if(!queue.length){
    shuffle(cards).slice(0,12).forEach(card=>{
      const modes=['type-word','pick-icon','hear-icon'];
      queue.push({card,mode:modes[Math.floor(Math.random()*modes.length)]});
    });
  }else{
    const learning=queue.slice(0,fresh.length*2);
    const reviews=shuffle(queue.slice(fresh.length*2));
    queue=[];
    while(learning.length||reviews.length){
      for(let i=0;i<2&&learning.length;i++) queue.push(learning.shift());
      for(let i=0;i<3&&reviews.length;i++) queue.push(reviews.shift());
    }
  }
  return queue;
}

/* ==================== SESJA CZTEROETAPOWA ==================== */

let stagePlan = [], stageIndex = 0, stageStartedAt = 0, shortSession = false;
let sessionOrigin = 'section', focusedPatternId = '';
/* Sesja puli. Karty puli żyją tylko w pamięci na czas sesji; ich postęp
   trzymamy w S.poolCards pod kluczem 'pool:<poolId>:<en>', osobno od 500
   słów głównych, żeby jedno nie zaburzało drugiego. */
let poolCards = [], activePoolId = '', activePoolName = '';

function wordQueue(){ return startLearning(); }

/* Kolejka nauki puli. Ten sam zestaw trybów co przy słowach głównych,
   ale karty pochodzą z wybranej puli, a postęp siedzi w S.poolCards. */
function poolSeen(id){ return Boolean((S.poolCards||{})[id]); }
function poolDue(id){ const c=(S.poolCards||{})[id]; return !c || c.d<=Date.now(); }
function poolQueue(){
  if(!S.poolCards) S.poolCards={};
  const spokenPractice=currentTrack()==='world'&&hasSpeechRecognition;
  const fresh=shuffle(poolCards.filter(c=>!poolSeen(c.id))).slice(0,NEW_PER_SESSION);
  const freshCost=spokenPractice?3:2;
  const due=shuffle(poolCards.filter(c=>poolSeen(c.id)&&poolDue(c.id))).slice(0,Math.max(0,MAX_SESSION_ITEMS-fresh.length*freshCost));
  const q=[];
  fresh.forEach(card=>{
    q.push({card,mode:'pool-intro'});
    if(spokenPractice)q.push({card,mode:'pool-speak'});
    q.push({card,mode:'pool-type'});
  });
  due.forEach(card=>{
    const reps=(S.poolCards[card.id]||{}).r||0;
    const modes=spokenPractice
      ? (reps>=1?['pool-speak','pool-type','pool-pick']:['pool-speak','pool-type'])
      : (reps>=1?['pool-type','pool-type','pool-pick']:['pool-type','pool-pick']);
    q.push({card,mode:modes[Math.floor(Math.random()*modes.length)]});
  });
  if(!q.length) shuffle(poolCards).slice(0,10).forEach(card=>q.push({card,mode:'pool-type'}));
  return q;
}
function gradePool(id,correct){
  if(!S.poolCards) S.poolCards={};
  const card=S.poolCards[id]||(S.poolCards[id]={i:0,e:2.2,d:0,r:0,ok:0,bad:0});
  if(correct){ card.ok++;card.r++;card.e=Math.min(2.6,card.e+0.05);
    card.i=Math.round(STEPS[Math.min(card.r-1,STEPS.length-1)]*(card.e/2.2));card.d=Date.now()+card.i*DAY; }
  else{ card.bad++;card.r=Math.max(0,card.r-2);card.e=Math.max(1.3,card.e-0.15);card.i=0;card.d=Date.now(); }
  return card;
}

function patternQueue(limit){
  const unlockedIds=new Set(PATTERN_LIST.filter((pattern,index)=>patternUnlocked(index)).map(pattern=>pattern.id));
  const vocabulary=collectedVocabulary();
  const available=PATTERN_ITEMS.filter(item=>unlockedIds.has(item.pattern)&&itemVocabularyReady(item,vocabulary));
  const due=available.filter(item=>S.patterns[item.id]&&dueIn(S.patterns,item.id));
  const fresh=available.filter(item=>!S.patterns[item.id]);
  const fallback=available.filter(item=>S.patterns[item.id]&&!dueIn(S.patterns,item.id));
  const chosen=shuffle(fresh).concat(shuffle(due),shuffle(fallback)).slice(0,limit);
  return chosen.map(item => ({mode:'pattern',item}));
}
function focusedPatternQueue(patternId,limit){
  const available=readyPatternItems(patternId);
  const fresh=available.filter(item=>!S.patterns[item.id]);
  const due=available.filter(item=>S.patterns[item.id]&&dueIn(S.patterns,item.id));
  const fallback=available.filter(item=>S.patterns[item.id]&&!dueIn(S.patterns,item.id));
  return shuffle(fresh).concat(shuffle(due),shuffle(fallback)).slice(0,limit).map(item=>({mode:'pattern',item}));
}
/* Historyjka albo dialog otwiera się, gdy uczeń zebrał słowa z sekcji,
   której dotyczy. Dzięki temu nie czyta o zoo, zanim zna zwierzęta. */
const CONTENT_UNLOCK_WORDS = 15;
function contentSectionIndex(item){ return SECTIONS.findIndex(section => section.id===item.after); }
function contentAvailable(item){
  if(inTestMode()) return true;
  const index=contentSectionIndex(item);
  return index<0 || sectionCollected(index)>=CONTENT_UNLOCK_WORDS;
}
function contentLockText(item){
  const index=contentSectionIndex(item);
  return index<0 ? '' : 'Odblokuje się po zebraniu słów z sekcji „'+SECTIONS[index].name+'”';
}
function contentInOrder(list){
  return list.map((item,order)=>({item,order,section:contentSectionIndex(item)}))
    .sort((a,b)=>(a.section-b.section)||(a.order-b.order)).map(entry=>entry.item);
}
function availableContent(list){
  const open=list.filter(contentAvailable);
  return open.length ? open : list.slice(0,1);
}
function storyQueue(limit){
  const list = availableContent(STORY_LIST);
  const unseen = list.filter(story => !(S.stories[story.id] || {}).done);
  const pool = unseen.length ? unseen : list;
  return shuffle(pool).slice(0,limit).map(story => ({mode:'story',item:story}));
}
function dialogueQueue(limit){
  const list = availableContent(DIALOGUE_LIST);
  const unseen = list.filter(dialogue => !(S.dialogues[dialogue.id] || {}).done);
  const pool = unseen.length ? unseen : list;
  return shuffle(pool).slice(0,limit).map(dialogue => ({mode:'dialogue',item:dialogue}));
}

/* M5 czerpie przede wszystkim z WŁASNYCH błędów uczennicy. Bank startowy
   uzupełnia tylko to, czego jeszcze nie ma z czego zbudować. */
function detectiveQueue(limit){
  const mistakePatterns = new Set((S.mistakes||[]).filter(item=>item.kind==='pattern').map(item=>item.ref));
  const ownErrors = ERROR_ITEMS.filter(item => dueIn(S.errorCards,item.id));
  const items = [];
  shuffle(ownErrors).slice(0,limit).forEach(item => items.push({mode:'error',item}));
  if(mistakePatterns.size){
    const repeat = PATTERN_ITEMS.filter(item => mistakePatterns.has(item.id));
    shuffle(repeat).slice(0,2).forEach(item => items.push({mode:'pattern',item}));
  }
  if(COMPARE_ITEMS.length) items.push({mode:'compare',item:shuffle(COMPARE_ITEMS.slice())[0]});
  if(ORDER_ITEMS.length) items.push({mode:'ordering',item:shuffle(ORDER_ITEMS.slice())[0]});
  return shuffle(items).slice(0,limit+2);
}

function unlockedModules(){
  const collected = collectedTotal(S);
  return {
    patterns: collected >= SENTENCE_UNLOCK_WORDS,
    stories: collected >= 25 && countOk(S.patterns) >= 5,
    dialogues: collected >= 40 && countOk(S.patterns) >= 12,
    detective: countOk(S.patterns) >= 20 || (S.mistakes||[]).length >= 6
  };
}

/* Główna część miesza typy zadań zamiast trzymać jeden: sesja z jednego rodzaju
   ćwiczenia daje lepsze wyniki w trakcie i gorsze po tygodniu. */
function buildStage(id){
  const open = unlockedModules();
  if(id === 'adaptive' && activeAdaptiveTask){
    const patternId=(activeAdaptiveTask.route&&activeAdaptiveTask.route.patternId)||'to-be-question';
    const items=readyPatternItems(patternId);
    if(!items.length)return [];
    return [{mode:'question-transfer',item:shuffle(items)[0],task:activeAdaptiveTask}];
  }
  if(id === 'pool') return poolQueue();
  if(id === 'sentences') return focusedPatternQueue(focusedPatternId,6);
  if(id === 'warmup') return wordQueue();
  if(id === 'core'){
    const items = [];
    if(open.patterns) items.push(...patternQueue(shortSession ? 3 : 6));
    if(open.stories && !shortSession) items.push(...storyQueue(1));
    if(open.dialogues && !shortSession) items.push(...dialogueQueue(1));
    if(!items.length) return wordQueue();
    const words = wordQueue().slice(0,shortSession ? 3 : 6);
    const mixed = [];
    while(items.length || words.length){
      if(items.length) mixed.push(items.shift());
      if(words.length) mixed.push(words.shift());
      if(items.length) mixed.push(items.shift());
    }
    return mixed;
  }
  if(id === 'closing'){
    if(open.detective) return detectiveQueue(4);
    return wordQueue().slice(0,6);
  }
  return [];
}

function beginSession(short){
  sessionOrigin = 'section';focusedPatternId='';activeAdaptiveTask=null;
  shortSession = Boolean(short);
  stagePlan = STAGE_PLAN.filter(stage => !shortSession || stage.short > 0);
  stageIndex = 0;
  done = 0; hits = 0; added = []; sessionRun++;
  startedAt = Date.now();
  dailyCounters = {};sessionFeathers = 0;
  startStage();
}

function beginPatternSession(patternId){
  const preserveAdaptive=Boolean(arguments[1]);
  if(!preserveAdaptive)activeAdaptiveTask=null;
  const index=PATTERN_LIST.findIndex(pattern=>pattern.id===patternId);
  if(index<0||!patternUnlocked(index))return;
  if(!readyPatternItems(patternId).length){toast('Najpierw zbierz słowa potrzebne do tych zdań.');return;}
  const pattern=PATTERN_LIST[index];
  sessionOrigin='sentences';focusedPatternId=patternId;shortSession=false;
  stagePlan=[{id:'sentences',name:pattern.name,ms:10*60*1000,short:10*60*1000}];
  stageIndex=0;done=0;hits=0;added=[];sessionRun++;startedAt=Date.now();dailyCounters={};sessionFeathers=0;
  startStage();
}

function beginAdaptiveTask(task){
  if(!task||!task.route)return;
  const patternId=task.route.patternId||'to-be-question';
  if(task.cognitiveOperation!=='transfer'){
    const index=PATTERN_LIST.findIndex(pattern=>pattern.id===patternId);
    if(index<0||!patternUnlocked(index)||!readyPatternItems(patternId).length){
      activeAdaptiveTask=null;
      toast('Najpierw otwórz wzorzec pytań w module zdań.');
      return renderSentenceHub();
    }
    activeAdaptiveTask=task;
    return beginPatternSession(patternId,true);
  }
  const index=PATTERN_LIST.findIndex(pattern=>pattern.id===patternId);
  if(index<0||!patternUnlocked(index)||!readyPatternItems(patternId).length){
    activeAdaptiveTask=null;
    toast('Najpierw otwórz wzorzec pytań w module zdań.');
    return renderSentenceHub();
  }
  activeAdaptiveTask=task;sessionOrigin='sentences';focusedPatternId=patternId;shortSession=false;
  stagePlan=[{id:'adaptive',name:'Pytanie w nowym kontekście',ms:8*60*1000,short:8*60*1000}];
  stageIndex=0;done=0;hits=0;added=[];sessionRun++;startedAt=Date.now();dailyCounters={};sessionFeathers=0;startStage();
}

function beginPoolSession(poolId,name,cards){
  if(!cards||!cards.length){toast('Ta pula jest pusta.');return;}
  activePoolId=poolId;activePoolName=name;
  poolCards=cards.map((word,index)=>({
    id:'pool:'+poolId+':'+String(word.en).toLowerCase(),
    en:word.en, pl:word.pl,
    ic:(word.icon&&word.icon!=='◻️')?word.icon:'◻️'
  }));
  sessionOrigin='pool';focusedPatternId='';activeAdaptiveTask=null;shortSession=false;
  const minutes=Math.min(15,Math.max(6,Math.ceil(poolCards.length*0.7)));
  stagePlan=[{id:'pool',name:name,ms:minutes*60*1000,short:minutes*60*1000}];
  stageIndex=0;done=0;hits=0;added=[];sessionRun++;startedAt=Date.now();dailyCounters={};sessionFeathers=0;
  startStage();
}

function stageBudget(stage){ return shortSession ? stage.short : stage.ms; }

function startStage(){
  const stage = stagePlan[stageIndex];
  if(!stage) return finishLearning();
  queue = buildStage(stage.id);
  if(!queue.length){ stageIndex++; return startStage(); }
  stageStartedAt = Date.now();
  stageTotal=queue.length; introTotal=queue.filter(item=>item.mode==='intro').length; introShown=0;
  $('#playStageName').textContent = sessionOrigin==='pool' ? '' : stage.name;
  $('#playSectionName').textContent =
    sessionOrigin==='pool' ? ('Pula: '+activePoolName) :
    sessionOrigin==='sentences' ? 'Klocki zdań' :
    SECTIONS[currentSectionIndex].name;
  show('play');
  nextStep();
}

function endStage(){
  S.stages = (S.stages||0) + 1;
  saveProgress();
  stageIndex++;
  if(stageIndex >= stagePlan.length) return finishLearning();
  renderStageBreak();
}

/* Ekran przejściowy nie jest ozdobnikiem: krótka przerwa poznawcza
   między blokami różnych zadań poprawia to, co z nich zostaje. */
function appendBilingualJourneyFact(host,stop){
  const block=make('div','swift-fact');
  block.append(make('strong','fact-language','Polski'));
  block.append(make('p','break-fact fact-polish',stop.fact));
  block.append(make('strong','fact-language','English'));
  block.append(make('p','break-fact fact-english',stop.factEn));
  const listenEnglish=make('button','fact-listen','🔊 Posłuchaj po angielsku');
  listenEnglish.type='button';
  listenEnglish.setAttribute('aria-label','Odtwórz angielską wersję opowieści');
  listenEnglish.addEventListener('click',()=>speakSentence(stop.factEn));
  block.append(listenEnglish);
  host.append(block);
}

function plFeathers(n){
  if(n===1) return 'piórko';
  const last=n%10, two=n%100;
  return (last>=2&&last<=4&&!(two>=12&&two<=14)) ? 'piórka' : 'piórek';
}
function plMinutes(n){ return n===1 ? '1 minuta' : (n%10>=2&&n%10<=4&&!(n%100>=12&&n%100<=14) ? n+' minuty' : n+' minut'); }

function renderStageBreak(){
  const next = stagePlan[stageIndex];
  const finished = stagePlan[stageIndex-1];
  const total = stagePlan.length;

  $('#breakKicker').textContent = 'Etap ' + stageIndex + ' z ' + total + ' zrobiony';
  $('#breakTitle').textContent = (finished && finished.done) || 'Etap zrobiony';
  $('#breakLead').textContent = 'Możesz chwilę odpocząć. Gdy chcesz, przejdź do następnego etapu.';

  const steps = $('#breakSteps'); steps.textContent = '';
  stagePlan.forEach((stage,index)=>{
    const state = index<stageIndex ? 'done' : (index===stageIndex ? 'next' : 'later');
    const item = make('li','br-step '+state);
    item.append(make('span','br-step-dot', state==='done' ? '✓' : String(index+1)));
    item.append(make('span','br-step-name', stage.name));
    item.append(make('span','br-step-state', state==='done' ? 'zrobione' : (state==='next' ? 'następne' : 'później')));
    if(state==='next') item.setAttribute('aria-current','step');
    steps.append(item);
  });

  const gained = sessionFeathers || 0;
  $('#breakFeathers').textContent = gained;
  $('#breakFeathersUnit').textContent = plFeathers(gained);
  $('#breakFeathersText').textContent = gained
    ? 'Dostajesz je za trudniejsze rzeczy: zdanie bez błędu, poprawiony błąd, nowe słowo.'
    : 'Piórka dostajesz za trudniejsze rzeczy: zdanie bez błędu, poprawiony błąd, nowe słowo. Na razie jeszcze żadnego nie ma, ale w następnym etapie będzie okazja.';
  const sum = S.feathers || 0;
  $('#breakFeathersTotal').textContent = 'Razem na koncie: ' + sum + ' ' + plFeathers(sum);

  $('#breakNextTitle').textContent = next.name;
  $('#breakNextText').textContent = next.hint || 'Kolejna część dzisiejszej nauki.';
  const ms = stageBudget(next);
  $('#breakNextTime').textContent = 'Około ' + plMinutes(Math.max(1,Math.round(ms/60000)));
  $('#breakContinue').textContent = 'Lecimy dalej: ' + next.name;

  const progress = challengeProgress();
  const box = $('#breakChallenge');
  if(progress){
    const done = Math.min(progress.done,progress.challenge.goal), goal = progress.challenge.goal;
    box.hidden = false;
    $('#breakChallengeText').textContent = progress.challenge.text;
    $('#breakChallengeCount').textContent = progress.complete ? 'Wykonane!' : ('Zrobione ' + done + ' z ' + goal + '. Dokończ w następnym etapie.');
    const bar = $('#breakChallengeBar');
    bar.setAttribute('aria-valuenow',String(done)); bar.setAttribute('aria-valuemax',String(goal));
    bar.setAttribute('aria-label','Wyzwanie dnia: '+done+' z '+goal);
    $('#breakChallengeFill').style.width = Math.round(done/goal*100)+'%';
    box.classList.toggle('complete',progress.complete);
  } else box.hidden = true;

  const host = $('#breakBody');
  host.textContent = '';
  const stop = JOURNEY_STOPS[journeyIndex()];
  if(stop){
    host.append(make('p','break-place',stop.place + ', ' + stop.country));
    appendBilingualJourneyFact(host,stop);
  } else $('.br-journey').hidden = true;
  show('break');
  window.scrollTo(0,0);
}

function updateLearningProgress(){
  const byCount=done/(done+queue.length||1);
  const byTime=(Date.now()-startedAt)/SESSION_LIMIT;
  $('#barFill').style.width=Math.min(100,Math.max(byCount,byTime)*100)+'%';
}

function nextStep(){
  clearTimeout(advanceTimer); updateLearningProgress();
  const totalOver = (Date.now()-startedAt) > (shortSession ? SHORT_LIMIT : SESSION_LIMIT);
  if(totalOver) return finishLearning();
  const current = stagePlan[stageIndex];
  const stageOver = current && (Date.now()-stageStartedAt) > stageBudget(current);
  if(!queue.length || stageOver) return endStage();

  const item = queue.shift();
  const stage = $('#stage'); stage.textContent = ''; stage.className = '';
  const taskNo = Math.max(1,stageTotal-queue.length);
  $('#playCounter').textContent = 'Zadanie ' + taskNo + ' z ' + Math.max(stageTotal,taskNo);
  if(item.mode==='intro') return renderIntro(stage,item);
  if(item.mode==='type-word') return renderType(stage,item);
  if(item.mode==='pattern') return renderPattern(stage,item.item);
  if(item.mode==='story') return renderStory(stage,item.item);
  if(item.mode==='dialogue') return renderDialogue(stage,item.item,0);
  if(item.mode==='error') return renderErrorHunt(stage,item.item);
  if(item.mode==='compare') return renderCompare(stage,item.item);
  if(item.mode==='ordering') return renderOrdering(stage,item.item);
  if(item.mode==='pool-intro') return renderPoolIntro(stage,item);
  if(item.mode==='pool-speak') return renderPoolSpeak(stage,item);
  if(item.mode==='pool-type') return renderPoolType(stage,item);
  if(item.mode==='pool-pick') return renderPoolPick(stage,item);
  if(item.mode==='question-transfer') return renderQuestionTransfer(stage,item.item,item.task);
  return renderChoice(stage,item);
}

const ICON_SPEAKER='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14V10a2 2 0 0 1 2-2h2.5L14 4v16l-5.5-4H6a2 2 0 0 1-2-2Z"/><path d="M17.5 9a4.5 4.5 0 0 1 0 6"/></svg>';
const ICON_MIC='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
/* Przycisk z ikoną: tekst zmieniamy w osobnym spanie, żeby nie kasować ikony. */
function iconButton(className,icon,label){
  const button=make('button',className); button.type='button';
  button.insertAdjacentHTML('afterbegin',icon);
  button.append(make('span','btn-label',label));
  button.setLabel=text=>{button.querySelector('.btn-label').textContent=text;};
  return button;
}

function renderIntro(stage,item){
  const card=item.card;
  const speechStarted=Date.now();
  introShown++;
  $('#playCounter').textContent='Słowo '+introShown+' z '+Math.max(introTotal,introShown);
  stage.classList.add('word-stage');
  const panel=make('section','word-card');
  const top=make('div','wc-top',''); top.append(make('span','wc-pill','Nowe słowo'));
  const hear=iconButton('wc-hear',ICON_SPEAKER,'Posłuchaj'); hear.addEventListener('click',()=>say(card.en)); top.append(hear);
  const pic=make('div','wc-pic',card.ic); pic.setAttribute('role','img'); pic.setAttribute('aria-label',card.pl);
  panel.append(top,pic,make('div','wc-en',card.en),make('div','wc-pl',card.pl));
  const ipa=window.WORD_IPA&&window.WORD_IPA[card.en];
  if(ipa) panel.append(make('div','wc-ipa','/'+ipa+'/'));
  stage.append(panel);
  const mic=make('div','mic wc-mic');
  const status=make('p','mic-status','Powiedz to słowo do mikrofonu.');
  const actions=make('div','wc-actions');
  const button=iconButton('wc-say',ICON_MIC,'Powiedz to słowo');
  const skip=make('button','wc-skip','Pomiń wymowę'); skip.type='button';
  actions.append(button,skip);
  const heard=make('p','heard','');
  mic.append(status,actions,heard); stage.append(mic);
  let attempts=0;
  const accept=(verified=true)=>{
    recordLearningEvent({
      eventType:'task_attempt',taskId:'word-pronunciation:'+card.id,taskType:'pronunciation',skill:'vocabulary_pronunciation',
      languageItems:[card.id],bloomLevel:'apply',cognitiveOperation:'production',modality:'speaking',
      outcome:{status:verified?'correct':'inconclusive',score:verified?1:null},
      support:{hints:1,retries:attempts,revealedAnswer:true},timing:{responseMs:Date.now()-speechStarted},
      context:{mode:'learning',source:'core-vocabulary-pronunciation'}
    });
    if(!verified)stopSpeech();
    nextStep();
  };
  /* "Pomiń wymowę" nie zalicza wymowy i nie jest błędem: słowo wróci w powtórce. */
  skip.addEventListener('click',()=>{clearTimeout(advanceTimer);accept(false);});
  if(!hasSpeechRecognition){
    status.textContent='Ta przeglądarka nie potrafi sprawdzić wymowy. Możesz iść dalej, nie zapisujemy tego jako błędu.';
    button.disabled=true;button.setLabel('Mikrofon niedostępny');setTimeout(()=>say(card.en),250);return;
  }
  button.addEventListener('click',()=>{
    button.disabled=true;button.setLabel('Słucham…');status.textContent='Mów teraz.';heard.textContent='';mic.classList.remove('good');
    listen(card.en,result=>{
      button.disabled=false;
      if(result.ok){
        mic.classList.add('good');heard.textContent='Usłyszałem: '+card.en;
        status.textContent='Dobra wymowa.';button.setLabel('Zaliczone');button.disabled=true;
        skip.hidden=true;
        advanceTimer=setTimeout(()=>accept(true),750);return;
      }
      mic.classList.remove('good');heard.textContent='';
      attempts++;
      if(result.fatal){
        button.setLabel('Mikrofon niedostępny');button.disabled=true;
        status.textContent=(result.msg||'Mikrofon jest niedostępny.')+' To nie zatrzyma nauki ani nie obniży wyniku pisowni.';
        return;
      }
      button.setLabel('Powiedz jeszcze raz');
      if(attempts>=MAX_SPEECH_GATE_ATTEMPTS){
        status.textContent='Mikrofon nie potwierdził słowa, ale może się mylić. Spróbuj jeszcze raz albo pomiń wymowę. To słowo wróci później.';
      }else{
        status.textContent='Nie mam jeszcze pewności. Posłuchaj wzoru i spróbuj ponownie.';
      }
      say(card.en);
    });
  });
  setTimeout(()=>say(card.en),250);
}

/* Administracyjny przycisk pominiecia. Powstaje tylko w trybie testowym.
   Zwykla sciezka ucznia ma osobny bezpiecznik po dwoch probach, ktory nie
   zalicza wymowy i kieruje material do powtorki. */
function makeSkip(label,action){
  const button=make('button','skip-test',label);
  button.type='button';
  button.addEventListener('click',()=>{stopSpeech();clearTimeout(advanceTimer);action();});
  return button;
}

function escapeHtml(value){return value.replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));}
function markedAnswer(typed,target){
  return [...typed].map((char,index)=>'<span class="ch '+(char===target[index]?'y':'n')+'">'+escapeHtml(char)+'</span>').join('');
}
function maskedWord(word,reveal){return [...word].map((char,index)=>char===' '?' ':(index<reveal?char:'·')).join('');}

function renderType(stage,item){
  const card=item.card;
  const prompt=make('div','prompt');prompt.append(make('p','ask','Jedna podpowiedź pasuje do obrazka. Wpisz ją poniżej.'),make('div','big',card.ic));stage.append(prompt);
  const hints=make('div','hints');
  shuffle([card,...distractors(card,3)]).forEach(option=>{
    const button=make('button','hint',option.en);button.type='button';button.setAttribute('aria-label','Odsłuchaj: '+option.en);button.addEventListener('click',()=>say(option.en));hints.append(button);
  });
  stage.append(hints);
  const input=make('input','inp');input.type='text';input.placeholder='wpisz słowo';input.autocapitalize='off';input.autocomplete='off';input.spellcheck=false;input.setAttribute('autocorrect','off');input.setAttribute('enterkeyhint','done');input.setAttribute('aria-label','Wpisz angielskie słowo');
  const feedback=make('p','fb','');
  const checkButton=make('button','next','Sprawdź');checkButton.type='button';stage.append(input,feedback,checkButton);
  let tries=0;
  const check=()=>{
    const value=input.value.trim().toLowerCase();if(!value)return;
    const target=card.en.toLowerCase();
    if(value===target){
      feedback.className='fb good';delete feedback.dataset.guidanceLevel;feedback.textContent='Dobrze!';input.disabled=true;checkButton.disabled=true;
      const wasCollected=seen(card.id);
      /* Pisownia i rozpoznawanie mowy są różnymi dowodami. Nie wolno
         zamieniać poprawnie wpisanego słowa w błąd tylko dlatego, że ASR
         wcześniej nie potwierdził wymowy. */
      const clean=tries===0;
      grade(card.id,clean);if(!wasCollected)added.push(card);if(clean)hits++;done++;saveProgress();
      const run=sessionRun;const praise=PRAISES[Math.floor(Math.random()*PRAISES.length)];
      speakSequence([card.en,praise],()=>{if(run===sessionRun&&$('#s-play').classList.contains('on'))advanceTimer=setTimeout(nextStep,180);});
      return;
    }
    tries++;feedback.className='fb';feedback.dataset.guidanceLevel=String(Math.min(3,tries));
    const message=tries===1?'Sprawdź zaznaczone litery i spróbuj jeszcze raz.':tries===2?'Posłuchaj słowa i wykorzystaj odsłonięty początek.':'Znasz już większą część zapisu. Uzupełnij słowo samodzielnie.';
    feedback.innerHTML='<span class="guidance-copy">'+message+'</span><span class="spelling-marked">'+markedAnswer(value,target)+'</span>';
    if(tries>=2)feedback.innerHTML+='<span class="peekword">'+escapeHtml(maskedWord(card.en,tries-1))+'</span>';
    say(card.en);try{input.focus();input.select();}catch(error){}
  };
  checkButton.addEventListener('click',check);input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();check();}});setTimeout(()=>input.focus(),130);
  // Pominiecie wpisuje poprawne slowo i uruchamia normalna sciezke sprawdzenia,
  // zeby test przechodzil przez ten sam kod co uczen, a nie obok niego.
  if(inTestMode()) stage.append(makeSkip('Pomiń wpisywanie',()=>{input.value=card.en;check();}));
}

function renderChoice(stage,item){
  const card=item.card;const prompt=make('div','prompt');
  if(item.mode==='pick-icon'){
    prompt.append(make('p','ask','Co to znaczy?'),make('div','word',card.en));
    const hear=make('button','hear','Posłuchaj');hear.type='button';hear.addEventListener('click',()=>say(card.en));prompt.append(hear);
  }else{
    prompt.append(make('p','ask','Posłuchaj i wybierz obrazek'));
    const hear=make('button','hear solo','🔊');hear.type='button';hear.setAttribute('aria-label','Powtórz słowo');hear.addEventListener('click',()=>say(card.en));prompt.append(hear);setTimeout(()=>say(card.en),250);
  }
  stage.append(prompt);
  const options=make('div','opts');
  shuffle([card,...distractors(card,3)]).forEach(option=>{
    const button=make('button','opt',option.ic);button.type='button';button.setAttribute('aria-label','Wybierz '+option.pl);
    button.addEventListener('click',()=>answerChoice(button,options,option.id===card.id,card));options.append(button);
  });stage.append(options);
}

/* Wspólne elementy zadań z wyborem odpowiedzi (makieta Zadanie-D):
   notatka po złej próbie, pasek wyniku z przyciskiem Dalej, „Nie wiem”,
   żółta wskazówka. Wynik czeka na ucznia, żeby zdążył przeczytać wyjaśnienie. */
function answerNote(feedback,title,text){
  feedback.className='fb answer-note bad';feedback.textContent='';
  feedback.append(make('b','',title+' '),document.createTextNode(text));
}
function answerStrip(kind,title,text,onNext){
  const strip=make('div','answer-strip '+kind);
  const copy=make('div','answer-copy');
  copy.append(make('div','answer-title',title));
  if(text) copy.append(make('div','answer-text',text));
  const next=make('button','answer-next','Dalej');next.type='button';
  next.addEventListener('click',()=>{next.disabled=true;clearTimeout(advanceTimer);onNext();});
  strip.append(copy,next);
  setTimeout(()=>{try{next.focus();}catch(error){}},60);
  return strip;
}
function dontKnowBlock(onPick){
  const wrap=make('div','dont-know-wrap');
  const button=make('button','dont-know','Nie wiem, pomiń bez zgadywania');button.type='button';
  button.addEventListener('click',()=>{button.disabled=true;onPick();});
  wrap.append(button,make('p','dont-know-note','Zobaczysz poprawną odpowiedź, a zadanie wróci później.'));
  return wrap;
}
function answerHint(text){return make('div','answer-hint','Wskazówka: '+text);}

function answerChoice(button,container,correct,card){
  [...container.children].forEach(item=>item.disabled=true);button.classList.add(correct?'right':'wrong');
  if(correct)hits++;else{
    const right=[...container.children].find(item=>item.getAttribute('aria-label')==='Wybierz '+card.pl);if(right)right.classList.add('right');
    queue.splice(Math.min(3,queue.length),0,{card,mode:'type-word'});
  }
  grade(card.id,correct);done++;saveProgress();say(card.en);advanceTimer=setTimeout(nextStep,correct?750:1500);
}

function finishLearning(){
  stopSpeech(); clearTimeout(advanceTimer);
  touchStreak(); S.sessions++;
  const earned = checkBadges();
  saveProgress();

  const sentenceSession=sessionOrigin==='sentences';
  const poolSession=sessionOrigin==='pool';
  const count=sectionCollected(currentSectionIndex);
  const poolLearned=poolSession?poolCards.filter(c=>poolSeen(c.id)).length:0;
  $('#dNew').textContent=poolSession?poolLearned:(sentenceSession?done:added.length);
  $('#dOk').textContent=hits;
  $('#dSection').textContent=poolSession?poolCards.length:(sentenceSession?totalLearnedSentences():count);
  $('#dFeathers').textContent = S.feathers || 0;
  $('#dNewLabel').textContent=poolSession?'słów w nauce':(sentenceSession?'wykonanych zadań':'nowe słowa');
  $('#dOkLabel').textContent=sentenceSession?'bez błędu':'trafione';
  $('#dSectionLabel').textContent=poolSession?('słów w puli '+activePoolName):(sentenceSession?'z '+PATTERN_ITEMS.length+' zdań poznanych':'z 20 zebranych');
  $('#doneTitle').textContent=poolSession?'Pula przećwiczona!':(sentenceSession?'Zdania przećwiczone!':(added.length?'Kolekcja rośnie!':'Sesja zakończona!'));
  $('#doneBack').textContent=poolSession?'Wróć do pul':(sentenceSession?'Wróć do klocków zdań':'Wróć do sekcji');

  const list = $('#dList'); list.textContent = '';
  added.forEach(card => list.append(make('span','',card.ic+' '+card.en)));
  earned.forEach(badge => list.append(make('span','badge-chip','🏅 '+badge.name)));

  const progress = challengeProgress();
  const note = $('#doneChallenge');
  if(progress){
    note.textContent = progress.complete
      ? 'Wyzwanie dnia wykonane: ' + progress.challenge.text
      : progress.challenge.text + '  (' + Math.min(progress.done,progress.challenge.goal) + ' z ' + progress.challenge.goal + ')';
    note.className = progress.complete ? 'done-challenge good' : 'done-challenge';
  }else note.textContent = '';

  const action = $('#doneAction'); action.textContent = '';
  // FLOW: po sesji zawsze jest jeden jasny „następny krok" naprzód, żeby uczeń
  // nie musiał się cofać i szukać, co dalej. Przycisk zależy od typu sesji.
  const nextStepButton=(label,handler)=>{
    const button=make('button','primary wide',label);button.type='button';
    button.addEventListener('click',handler);action.append(button);
  };
  if(!sentenceSession&&!poolSession&&count===20&&!sectionPassed(currentSectionIndex)){
    nextStepButton('Zdaj egzamin →',()=>startExam(currentSectionIndex));
    $('#doneBack').textContent='Później';
  }else if(!sentenceSession&&!poolSession&&sectionPassed(currentSectionIndex)&&currentSectionIndex<SECTIONS.length-1&&openSectionCount()>currentSectionIndex+1){
    nextStepButton('Następna sekcja →',()=>renderSection(currentSectionIndex+1));
  }else if(!sentenceSession&&!poolSession&&count<20){
    nextStepButton('Ucz się dalej →',()=>{renderSection(currentSectionIndex);});
  }else if(sentenceSession){
    nextStepButton('Kolejne zdania →',()=>renderSentenceHub());
  }else if(poolSession){
    nextStepButton('Ćwicz dalej →',()=>(activePoolId&&activePoolId.indexOf('vocab-')===0?openVocabBase():openPools()));
  }
  announceBadges(earned);
  show('done');
}

/* ==================== EGZAMIN 4 × 5 ==================== */
let examDeck=[],examRoundIndex=0,examMatched=new Set(),selectedImage=null,selectedWord=null,examBusy=false,examMisses=0;

function startExam(index){
  examMisses=0;
  if(index>=openSectionCount()||sectionCollected(index)!==20){toast('Najpierw zbierz wszystkie 20 słów.');return;}
  currentSectionIndex=index;examDeck=shuffle(SECTIONS[index].cards);examRoundIndex=0;
  $('#examSectionName').textContent=SECTIONS[index].name;$('#examTitle').textContent=SECTIONS[index].name;
  $('#matchBoard').hidden=false;$('#examComplete').hidden=true;show('exam');renderExamRound();
}

function renderExamRound(){
  examMatched=new Set();selectedImage=null;selectedWord=null;examBusy=false;
  const cards=examDeck.slice(examRoundIndex*5,examRoundIndex*5+5);
  $('#examRound').textContent='Runda '+(examRoundIndex+1)+' z 4';
  $('#examProgress').style.width=(examRoundIndex*25)+'%';
  const feedback=$('#examFeedback');feedback.textContent='';feedback.className='exam-feedback';
  const images=$('#examImages'),words=$('#examWords');images.textContent='';words.textContent='';
  shuffle(cards).forEach(card=>images.append(createMatchButton('image',card)));
  shuffle(cards).forEach(card=>words.append(createMatchButton('word',card)));
  const skipHost=$('#examSkip');
  if(skipHost){
    skipHost.textContent='';
    if(inTestMode()){
      skipHost.hidden=false;
      skipHost.append(makeSkip('Pomiń rundę '+(examRoundIndex+1),()=>{examBusy=false;advanceExam();}));
    }else{
      skipHost.hidden=true;
    }
  }
}

function createMatchButton(kind,card){
  const button=make('button','match-item '+(kind==='image'?'image':'word'),kind==='image'?card.ic:'🔊  '+card.en);
  button.type='button';button.dataset.cardId=card.id;button.setAttribute('aria-label',(kind==='image'?'Obrazek: ':'Słowo: ')+card.en);
  button.addEventListener('click',()=>selectMatch(kind,card,button));return button;
}

function clearSelection(kind){
  const root=kind==='image'?$('#examImages'):$('#examWords');
  [...root.children].forEach(item=>{if(!item.classList.contains('matched'))item.classList.remove('selected','wrong');});
}

function selectMatch(kind,card,button){
  if(examBusy||examMatched.has(card.id))return;
  clearSelection(kind);button.classList.add('selected');say(card.en);
  if(kind==='image')selectedImage={card,button};else selectedWord={card,button};
  if(!selectedImage||!selectedWord)return;
  examBusy=true;
  const correct=selectedImage.card.id===selectedWord.card.id;
  const feedback=$('#examFeedback');
  if(correct){
    examMatched.add(card.id);selectedImage.button.classList.add('matched');selectedWord.button.classList.add('matched');
    // Bez pochwaly przy trafionej parze: na egzaminie liczy sie rytm,
    // a powtarzane "Good" dwadziescia razy tylko wydluza rundy.
    feedback.textContent='';feedback.className='exam-feedback';
    speakSequence([card.en],()=>{
      selectedImage=null;selectedWord=null;examBusy=false;
      $('#examProgress').style.width=((examRoundIndex*5+examMatched.size)/20*100)+'%';
      if(examMatched.size===5)setTimeout(advanceExam,450);
    });
  }else{
    selectedImage.button.classList.add('wrong');selectedWord.button.classList.add('wrong');
    feedback.textContent='Try again';feedback.className='exam-feedback bad';
    const spoken=selectedWord.card.en;
    examMisses++;
    speakSequence([spoken,'Try again'],()=>{
      clearSelection('image');clearSelection('word');selectedImage=null;selectedWord=null;examBusy=false;
    });
  }
}

function advanceExam(){
  examRoundIndex++;
  if(examRoundIndex<4)return renderExamRound();
  const firstTime = !sectionPassed(currentSectionIndex);
  if(firstTime) S.passedExams.push(SECTIONS[currentSectionIndex].id);
  touchStreak();
  const earned = [];
  if(firstTime){
    award('examPerfect');
    if(examMisses === 0){ const badge = grantBadge('flawless'); if(badge) earned.push(badge); }
  }
  earned.push(...checkBadges());
  saveProgress();
  $('#examProgress').style.width='100%';$('#matchBoard').hidden=true;$('#examFeedback').textContent='';
  const complete=$('#examComplete');complete.hidden=false;complete.textContent='';
  complete.append(make('div','celebrate','🏆'),make('h1','','Egzamin zdany!'));
  const message=currentSectionIndex<SECTIONS.length-1?'Nowa sekcja została odblokowana.':'Brawo! Wszystkie 25 sekcji zostało ukończonych.';
  complete.append(make('p','',message));
  const stop = JOURNEY_STOPS[journeyIndex()];
  if(stop){
    complete.append(make('p','break-place','Jerzyk doleciał do: '+stop.place+', '+stop.country));
    appendBilingualJourneyFact(complete,stop);
  }
  if(examMisses === 0) complete.append(make('p','break-challenge','Egzamin bez ani jednej pomyłki.'));
  announceBadges(earned);
  const button=make('button','primary wide',currentSectionIndex<SECTIONS.length-1?'Otwórz kolejną sekcję':'Wróć do sekcji');button.type='button';
  button.addEventListener('click',()=>renderSection(Math.min(currentSectionIndex+1,SECTIONS.length-1)));complete.append(button);
  speakSequence(['Good','Well done']);
}

/* ==================== PANEL ADMINISTRATORA ==================== */
let lastCredentials=null;

async function enterAdmin(){testMode=false;$('#testBanner').hidden=true;pickVoice();updateVoiceInfo();show('admin');await renderStudents();}

/* Wejscie w tryb testowy. Stan startowy jest lokalny i pusty, zadne
   /api/progress nie jest wolane, wiec konta uczniow pozostaja nietkniete. */
function enterTestMode(){
  if(!currentUser||currentUser.role!=='admin')return;
  testMode=true;
  testTrack='school';
  S=emptyState();
  $('#testBanner').hidden=false;
  const welcome=$('#welcomeName');if(welcome)welcome.textContent='Tryb testowy';
  applyTrackToInterface();
  setSync('tryb testowy, bez zapisu');
  renderHome();show('home');
}
function formatActivity(value){
  if(!value)return '—';
  try{return new Intl.DateTimeFormat('pl-PL',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));}catch(error){return '—';}
}
async function renderStudents(){
  const body=$('#studentsBody'),empty=$('#studentsEmpty'),error=$('#adminError');body.textContent='';error.textContent='';
  try{
    const data=await api('/api/admin/students');const students=data.students||[];empty.hidden=students.length>0;
    students.forEach(student=>{
      const row=make('tr');
      const name=make('td');name.append(make('strong','',student.displayName));
      row.append(name,make('td','',student.track==='world'?'Student':'Uczeń'),make('td','',student.cefrLevel||'—'),make('td','',student.wordsCollected+' / 500'),make('td','',(student.sentencesCompleted||0)+' / '+PATTERN_ITEMS.length),make('td','',student.currentSection+' / 25'),make('td','',String(student.examsPassed)),make('td','',formatActivity(student.lastActive)));
      const action=make('td','admin-actions');
      const reset=make('button','reset-pin','Nowy PIN');reset.type='button';reset.addEventListener('click',()=>resetStudentPin(student));
      const toggle=make('button','admin-toggle',student.active===false?'Włącz':'Wyłącz');toggle.type='button';toggle.addEventListener('click',()=>toggleStudentActive(student));
      const exportBtn=make('button','admin-export','Eksport');exportBtn.type='button';exportBtn.addEventListener('click',()=>exportStudent(student));
      const del=make('button','admin-delete','Usuń');del.type='button';del.addEventListener('click',()=>deleteStudent(student));
      action.append(reset,toggle,exportBtn,del);
      row.append(action);
      if(student.active===false)row.classList.add('student-inactive');
      body.append(row);
    });
  }catch(problem){error.textContent=problem.message;if(problem.status===401)show('admin-login');}
}

function displayCredentials(credentials){
  lastCredentials=credentials;$('#credentialsName').textContent=credentials.displayName;$('#credentialsPin').textContent=credentials.pin;$('#credentialsCard').hidden=false;window.scrollTo({top:0,behavior:'smooth'});
}
function clearCredentials(){
  lastCredentials=null;$('#credentialsName').textContent='';$('#credentialsPin').textContent='';$('#credentialsCard').hidden=true;
}
async function toggleStudentActive(student){
  const next=student.active===false; // jeśli był nieaktywny → włączamy
  try{
    await api('/api/admin/students/'+encodeURIComponent(student.id)+'/active',{method:'POST',body:{active:next}});
    toast(next?'Konto włączone.':'Konto wyłączone. Uczeń nie może się teraz zalogować.');
    await renderStudents();
  }catch(problem){ toast('Nie udało się zmienić stanu konta.'); }
}

async function exportStudent(student){
  try{
    const data=await api('/api/admin/students/'+encodeURIComponent(student.id)+'/export');
    // Pobierz jako plik JSON, żeby nauczyciel miał kopię danych ucznia.
    const blob=new Blob([JSON.stringify(data.export,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='lingling-'+student.displayName.replace(/[^a-zA-Z0-9]/g,'_')+'.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Dane ucznia wyeksportowane.');
  }catch(problem){ toast('Nie udało się wyeksportować danych.'); }
}

async function deleteStudent(student){
  // Usunięcie jest nieodwracalne — wymagamy wyraźnego potwierdzenia z imieniem.
  if(!confirm('Trwale usunąć konto '+student.displayName+'? Cały postęp zostanie skasowany. Tej operacji nie da się cofnąć.'))return;
  try{
    await api('/api/admin/students/'+encodeURIComponent(student.id),{method:'DELETE'});
    toast('Konto '+student.displayName+' zostało usunięte.');
    await renderStudents();
  }catch(problem){ toast('Nie udało się usunąć konta.'); }
}

async function resetStudentPin(student){
  if(!window.confirm('Wygenerować nowy PIN dla '+student.displayName+'? Poprzedni PIN przestanie działać.'))return;
  try{const data=await api('/api/admin/students/'+encodeURIComponent(student.id)+'/reset-pin',{method:'POST'});displayCredentials(data.student);toast('Nowy PIN został wygenerowany.');}
  catch(problem){$('#adminError').textContent=problem.message;}
}

/* ==================== ZDARZENIA I START ==================== */
['loginPin','regPin','regPinRepeat'].forEach(id=>{
  const input=$('#'+id);
  input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,4);});
});
$('#openRegister').addEventListener('click',()=>{$('#registerError').textContent='';show('register');});
$('#backFromRegister').addEventListener('click',()=>show('login'));
$('#studentRegister').addEventListener('submit',async event=>{
  event.preventDefault();
  const error=$('#registerError');error.textContent='';
  const pin=$('#regPin').value;const repeat=$('#regPinRepeat').value;
  if(!/^\d{4}$/.test(pin)){error.textContent='PIN musi mieć dokładnie 4 cyfry.';$('#regPin').focus();return;}
  if(pin!==repeat){error.textContent='Oba PIN-y muszą być takie same.';$('#regPinRepeat').focus();return;}
  const button=event.submitter||event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
  try{
    const trackChoice=document.querySelector('input[name="track"]:checked');
    const data=await api('/api/student/register',{method:'POST',body:{
      firstName:$('#regFirstName').value,
      lastInitial:$('#regLastInitial').value,
      pin,
      pinRepeat:repeat,
      track:trackChoice?trackChoice.value:'school'
    }});
    currentUser=data.user;await loadProgress();enterStudent();event.target.reset();
  }catch(problem){error.textContent=problem.message;}finally{button.disabled=false;}
});
$('#openTestMode').addEventListener('click',enterTestMode);
document.querySelectorAll('#voiceSelect,#studentVoiceSelect').forEach(control=>control.addEventListener('change',event=>{
  const requested=event.target.value;storeVoiceIdentity(requested);pickVoice(requested);say('Hello. This is your English voice.');
}));
document.querySelectorAll('#testVoice,#studentTestVoice').forEach(control=>control.addEventListener('click',()=>{
  if(!voice)pickVoice();say('Hello. This is your English voice.');
}));
document.querySelectorAll('[data-rail-tab]').forEach(button=>button.addEventListener('click',()=>goHome(button.dataset.railTab)));
const chromeHome=$('#chromeHome');if(chromeHome)chromeHome.addEventListener('click',()=>goHome('today'));
const progressEmptyAction=$('#progressEmptyAction');if(progressEmptyAction)progressEmptyAction.addEventListener('click',()=>goHome('today'));
/* Menu nawigacji przy logo: najechanie (z opóźnieniem zamykania), klik,
   klawiatura (Escape), klik poza panelem. Na wąskich ekranach panel jest
   pomijany (dolny pasek działa jak wcześniej), więc te zdarzenia są tam
   nieszkodliwe. */
(function initChromeMenu(){
  const toggle=$('#chromeMenuToggle');const header=$('#studentChrome');const rail=$('#studentRail');
  if(!toggle||!header||!rail)return;
  let closeTimer=null;
  function setOpen(open){
    document.body.classList.toggle('rail-menu-open',open);
    toggle.setAttribute('aria-expanded',String(open));
  }
  function scheduleClose(){clearTimeout(closeTimer);closeTimer=setTimeout(()=>setOpen(false),220);}
  function cancelClose(){clearTimeout(closeTimer);}
  header.addEventListener('mouseenter',cancelClose);
  header.addEventListener('mouseleave',scheduleClose);
  rail.addEventListener('mouseenter',cancelClose);
  rail.addEventListener('mouseleave',scheduleClose);
  toggle.addEventListener('click',()=>{cancelClose();setOpen(!document.body.classList.contains('rail-menu-open'));});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('rail-menu-open')){setOpen(false);toggle.focus();}});
  document.addEventListener('click',event=>{
    if(!document.body.classList.contains('rail-menu-open'))return;
    if(header.contains(event.target)||rail.contains(event.target))return;
    setOpen(false);
  });
  document.querySelectorAll('[data-rail-tab]').forEach(button=>button.addEventListener('click',()=>setOpen(false)));
})();
const railToggle=$('#railToggle');
if(railToggle)railToggle.addEventListener('click',()=>{
  const collapsed=document.body.classList.toggle('rail-collapsed');
  railToggle.setAttribute('aria-expanded',String(!collapsed));
  railToggle.setAttribute('aria-label',collapsed?'Rozwiń nawigację':'Zwiń nawigację');
});
const quickProfile=$('#quickProfile');const chromeProfile=$('#chromeProfile');
function openQuickProfile(){
  if(!quickProfile||!currentUser)return;
  const name=$('#quickProfileName');if(name)name.textContent=(inTestMode()?'Tryb testowy':(currentUser.displayName||currentUser.firstName||'Uczeń'))+' · '+(currentTrack()==='world'?'Student':'Uczeń');
  const exit=$('#quickProfileLogout');if(exit)exit.textContent=inTestMode()?'Wróć do panelu administratora':'Wyloguj';
  quickProfile.hidden=false;
  document.body.classList.add('quick-profile-open');
  const close=$('#quickProfileClose');if(close)close.focus();
}
function closeQuickProfile(returnFocus=true){
  if(!quickProfile) return;
  quickProfile.hidden=true;
  document.body.classList.remove('quick-profile-open');
  if(returnFocus&&chromeProfile)chromeProfile.focus();
}
if(chromeProfile)chromeProfile.addEventListener('click',openQuickProfile);
const quickProfileClose=$('#quickProfileClose');if(quickProfileClose)quickProfileClose.addEventListener('click',()=>closeQuickProfile());
if(quickProfile)quickProfile.addEventListener('click',event=>{if(event.target===quickProfile)closeQuickProfile();});
const quickProfileFull=$('#quickProfileFull');if(quickProfileFull)quickProfileFull.addEventListener('click',()=>{closeQuickProfile(false);goHome('profile');});
const quickProfileTrack=$('#quickProfileTrack');if(quickProfileTrack)quickProfileTrack.addEventListener('click',()=>{closeQuickProfile(false);const toggle=$('#trackToggle');if(toggle)toggle.click();});
const quickProfileLogout=$('#quickProfileLogout');if(quickProfileLogout)quickProfileLogout.addEventListener('click',()=>{closeQuickProfile(false);if(inTestMode())enterAdmin();else logout();});
const todayPrimaryAction=$('#todayPrimaryAction');
if(todayPrimaryAction)todayPrimaryAction.addEventListener('click',runTodayPrimaryAction);
const todayCoreAction=$('#todayCoreAction');if(todayCoreAction)todayCoreAction.addEventListener('click',runTodayPrimaryAction);
const todayPlanExplain=$('#todayPlanExplain');if(todayPlanExplain)todayPlanExplain.addEventListener('click',explainTodayPlan);
const todayProgressAction=$('#todayProgressAction');if(todayProgressAction)todayProgressAction.addEventListener('click',()=>goHome('progress'));
const todayMapAction=$('#todayMapAction');if(todayMapAction)todayMapAction.addEventListener('click',openJourneyMap);
const homeGuideClose=$('#homeFirstGuideClose');if(homeGuideClose)homeGuideClose.addEventListener('click',dismissHomeGuide);
const learningHelpButton=$('#learningHelpButton');if(learningHelpButton)learningHelpButton.addEventListener('click',openLearningHelp);
const learningHelpClose=$('#learningHelpClose');if(learningHelpClose)learningHelpClose.addEventListener('click',()=>closeLearningHelp());
const learningHelpScrim=$('#learningHelpScrim');if(learningHelpScrim)learningHelpScrim.addEventListener('click',()=>closeLearningHelp());
const reopenHomeGuide=$('#reopenHomeGuide');if(reopenHomeGuide)reopenHomeGuide.addEventListener('click',()=>{closeLearningHelp(false);goHome('today');maybeShowHomeGuide(true);});
document.addEventListener('keydown',event=>{
  if(quickProfile&&!quickProfile.hidden&&event.key==='Escape'){
    event.preventDefault();closeQuickProfile();return;
  }
  const layer=$('#learningHelpLayer');if(!layer||layer.hidden)return;
  if(event.key==='Escape'){event.preventDefault();closeLearningHelp();return;}
  if(event.key!=='Tab')return;
  const focusable=[...layer.querySelectorAll('button:not([disabled]),summary,[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]
    .filter(element=>element.offsetParent!==null);
  if(!focusable.length)return;
  const first=focusable[0];const last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
$('#leaveTestMode').addEventListener('click',()=>{stopSpeech();clearTimeout(advanceTimer);enterAdmin();});
const trackToggle=$('#trackToggle');
if(trackToggle) trackToggle.addEventListener('click',async ()=>{
  const next=currentTrack()==='world'?'school':'world';
  if(inTestMode()){
    // Tryb testowy nie dotyka żadnego konta: przełączamy tylko lokalnie.
    testTrack=next;
    applyTrackToInterface();
    renderHome();
    return;
  }
  try{
    await api('/api/student/track',{method:'POST',body:{track:next}});
    currentUser.track=next;
    applyTrackToInterface();
    renderHome();
  }catch(problem){ toast('Nie udało się zmienić ścieżki.'); }
});
$('#openAdminLogin').addEventListener('click',()=>show('admin-login'));
$('#backToStudentLogin').addEventListener('click',()=>show('login'));
$('#studentLogin').addEventListener('submit',async event=>{
  event.preventDefault();const error=$('#loginError');error.textContent='';const pin=$('#loginPin').value;
  if(!/^\d{4}$/.test(pin)){error.textContent='PIN musi mieć dokładnie 4 cyfry.';$('#loginPin').focus();return;}
  const button=event.submitter||event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
  try{
    const data=await api('/api/student/login',{method:'POST',body:{firstName:$('#loginFirstName').value,lastInitial:$('#loginLastInitial').value,pin}});
    currentUser=data.user;await loadProgress();enterStudent();event.target.reset();
  }catch(problem){error.textContent=problem.message;}finally{button.disabled=false;}
});
$('#adminLogin').addEventListener('submit',async event=>{
  event.preventDefault();const error=$('#adminLoginError');error.textContent='';const button=event.submitter||event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
  try{const data=await api('/api/admin/login',{method:'POST',body:{password:$('#adminPassword').value}});currentUser=data.user;event.target.reset();await enterAdmin();}
  catch(problem){error.textContent=problem.message;}finally{button.disabled=false;}
});
async function logout(){
  sessionRun++;syncRevision++;stopSpeech();clearTimeout(syncTimer);try{await api('/api/logout',{method:'POST'});}catch(error){}
  clearCredentials();currentUser=null;S=emptyState();learningSessionId='';adaptiveModel=null;adaptiveRecommendation=null;activeAdaptiveTask=null;show('login');
}
const adminLogout=$('#adminLogout');if(adminLogout)adminLogout.addEventListener('click',logout);
$('#openVocabulary').addEventListener('click',renderVocabularyHub);
$('#vocabularyBack').addEventListener('click',()=>goHome('learn'));
$('#sectionBack').addEventListener('click',renderVocabularyHub);
$('#openSentences').addEventListener('click',renderSentenceHub);
$('#sentencesBack').addEventListener('click',()=>goHome('learn'));
$('#quit').addEventListener('click',()=>{sessionRun++;stopSpeech();clearTimeout(advanceTimer);if(sessionOrigin==='pool')(activePoolId&&activePoolId.indexOf('vocab-')===0?openVocabBase():openPools());else if(sessionOrigin==='sentences')renderSentenceHub();else renderSection(currentSectionIndex);});
$('#doneBack').addEventListener('click',()=>{if(sessionOrigin==='pool')(activePoolId&&activePoolId.indexOf('vocab-')===0?openVocabBase():openPools());else if(sessionOrigin==='sentences')renderSentenceHub();else renderSection(currentSectionIndex);});
$('#examQuit').addEventListener('click',()=>{stopSpeech();renderSection(currentSectionIndex);});
$('#refreshStudents').addEventListener('click',renderStudents);
$('#createStudent').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter||event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;$('#adminError').textContent='';
  try{
    const data=await api('/api/admin/students',{method:'POST',body:{firstName:$('#newFirstName').value,lastInitial:$('#newLastInitial').value,track:$('#newTrack').value}});
    displayCredentials(data.student);event.target.reset();await renderStudents();
  }catch(problem){$('#adminError').textContent=problem.message;}finally{button.disabled=false;}
});
$('#copyCredentials').addEventListener('click',async()=>{
  if(!lastCredentials)return;const text='LingLing\nUczeń: '+lastCredentials.displayName+'\nPIN: '+lastCredentials.pin;
  try{await navigator.clipboard.writeText(text);toast('Dane skopiowane.');}catch(error){toast('Zapisz PIN: '+lastCredentials.pin);}
});
$('#printCredentials').addEventListener('click',()=>window.print());

async function boot(){
  if(SECTIONS.length!==25||CARDS.length!==500){$('#loginError').textContent='Błąd słownika aplikacji.';return;}
  /* Najpierw pobieramy publiczne flagi, aby uczeń od pierwszego renderu
     zobaczył spójną wersję interfejsu. Awaria konfiguracji zachowuje
     dotychczasową kolejność nauki i ukrywa samodzielną rejestrację. */
  try{
    const config=await api('/api/config');
    if(config&&config.selfRegistration)$('#openRegister').hidden=false;
    adaptiveHomeEnabled=Boolean(config&&config.features&&config.features.adaptiveHome);
    const evidenceCard=$('#adaptiveEvidenceCard');if(evidenceCard)evidenceCard.hidden=!adaptiveHomeEnabled;
  }catch(error){adaptiveHomeEnabled=false;}
  try{
    const data=await api('/api/me');currentUser=data.user;
    if(currentUser.role==='student'){await loadProgress();enterStudent();}
    else if(currentUser.role==='admin')await enterAdmin();
  }catch(problem){
    if(problem.status!==401)$('#loginError').textContent=problem.message;
    show('login');
  }
}

if('serviceWorker' in navigator&&location.protocol==='https:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}));
}
boot();

/* ==================== NAGRODY ==================== */

/* Piórka wyłącznie za rzeczy trudne, nigdy za czas spędzony w aplikacji.
   Nagradzanie samej obecności uczy przesiadywania, nie uczenia się. */
const FEATHER_VALUES = { patternPerfect:2, errorFixed:3, examPerfect:10, dialogueTurn:2, storyDetail:1, newWord:1 };
let dailyCounters = {};
let sessionFeathers = 0;

function award(kind,times){
  const value = FEATHER_VALUES[kind] || 0;
  S.feathers = (S.feathers||0) + value*(times||1);
  sessionFeathers += value*(times||1);
  dailyCounters[kind] = (dailyCounters[kind]||0) + (times||1);
}

function todaysChallenge(){
  if(!DAILY_CHALLENGES.length) return null;
  const day = Math.floor(Date.now()/DAY);
  return DAILY_CHALLENGES[day % DAILY_CHALLENGES.length];
}
function challengeProgress(){
  const challenge = todaysChallenge();
  if(!challenge) return null;
  const map = { patternPerfect:'patternPerfect', spoken:'dialogueTurn', newWords:'newWord', errorsFixed:'errorFixed', stories:'storyDetail' };
  const done = dailyCounters[map[challenge.counter]] || 0;
  return { challenge, done, complete: done >= challenge.goal };
}

/* Odznaki za konkretne dokonania, nie za frekwencję. */
function checkBadges(){
  const earned = [];
  BADGES.forEach(badge => {
    if(S.badges.includes(badge.id) || badge.manual) return;
    const test = BADGE_TESTS[badge.id];
    if(test && test(S)){ S.badges.push(badge.id); earned.push(badge); }
  });
  return earned;
}
function grantBadge(id){
  const badge = BADGES.find(item => item.id === id);
  if(!badge || S.badges.includes(id)) return null;
  S.badges.push(id);
  return badge;
}

/* Ikony odznak: SVG w stylu aplikacji zamiast emoji (spójność między
   urządzeniami, zgodność z zasadą "bez emoji jako ikon"). Kolor tarczy
   cyklicznie z palety porcelanowej, żeby galeria odznak nie była monochromatyczna. */
const BADGE_ICON_SVG = {
  'first-hundred': '<path d="M4 19V10M10 19V5M16 19V13M4 19h16"/>',
  'builder': '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  'flawless': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>',
  'detective': '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>',
  'speaker': '<path d="M4 14V10a2 2 0 0 1 2-2h2.5L14 4v16l-5.5-4H6a2 2 0 0 1-2-2Z"/><path d="M17.5 9a4.5 4.5 0 0 1 0 6"/>',
  'golden-word': '<path d="M12 3.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 15.5l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76Z"/>',
  'persistent': '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/><path d="M8.5 13.5l2.3 2.3 4.7-4.7"/>'
};
const BADGE_TINTS = ['kobalt','cynober','zolc','mieta','oberzynia'];
function badgeAccent(index){
  const name = BADGE_TINTS[index % BADGE_TINTS.length];
  const fillByName = { kobalt:'var(--kobalt)', cynober:'var(--cynober)', zolc:'var(--zolc)', mieta:'var(--mieta)', oberzynia:'var(--oberzynia)' };
  const inkOn = name==='zolc' || name==='mieta' ? 'var(--tusz)' : '#fff';
  return { name, fill:fillByName[name], ink:inkOn };
}

function renderBadgeGallery(host){
  if(!host)return;
  host.textContent='';
  BADGES.forEach(badge=>{
    const owned=(S.badges||[]).includes(badge.id);
    const chip=make('button','badge-card '+(owned?'owned':'locked'));
    chip.type='button';
    chip.title=owned?'Otwórz opowieść odznaki':'Warunek: '+badge.desc;
    chip.setAttribute('aria-label',owned
      ? 'Zdobyta odznaka '+badge.name+'. Otwórz opowieść.'
      : 'Odznaka '+badge.name+' jeszcze niezdobyta. Warunek: '+badge.desc+'.');
    const accent=badgeAccent(BADGES.indexOf(badge));
    const disc=make('span','badge-icon-disc');
    disc.style.background=accent.fill; disc.style.color=accent.ink; disc.dataset.tint=accent.name;
    disc.innerHTML='<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(BADGE_ICON_SVG[badge.id]||'<circle cx="12" cy="12" r="8"/>')+'</svg>';
    if(!owned) disc.classList.add('is-locked');
    chip.append(disc);
    chip.append(make('strong','',badge.name));
    chip.append(make('span','badge-desc',badge.desc));
    chip.append(make('span','badge-state',owned?'✓ Zdobyta · przeczytaj opowieść':'Do zdobycia'));
    if(owned)chip.addEventListener('click',()=>{badgeQueue=[badge];showNextBadge();});
    else chip.addEventListener('click',()=>toast('Warunek odznaki „'+badge.name+'”: '+badge.desc+'.'));
    host.append(chip);
  });
}
/* Odznaki pokazujemy w oknie, nie jako znikający napis: zdobycie odznaki
   ma być momentem, a nie komunikatem, który dziecko przegapi.
   Kilka odznak naraz ustawia się w kolejce, jedna po drugiej. */
let badgeQueue = [];

function announceBadges(list){
  if(!list || !list.length) return;
  badgeQueue = badgeQueue.concat(list);
  if($('#badgeModal').hidden) showNextBadge();
}

function showNextBadge(){
  const badge = badgeQueue.shift();
  const modal = $('#badgeModal');
  if(!badge){ modal.hidden = true; return; }
  $('#badgeBigIcon').innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(BADGE_ICON_SVG[badge.id]||'<circle cx="12" cy="12" r="8"/>')+'</svg>';
  $('#badgeName').textContent = badge.name;
  $('#badgeDesc').textContent = badge.desc;
  $('#badgeReward').textContent = badge.reward || '';
  const story = $('#badgeStory');
  story.textContent = '';
  if(badge.story){
    story.append(make('strong','story-language','Polski'));
    story.append(make('p','story-language-text',badge.story));
  }
  if(badge.storyEn){
    story.append(make('strong','story-language','English'));
    story.append(make('p','story-language-text',badge.storyEn));
    const listenEnglish=make('button','hear story-listen','🔊 Posłuchaj po angielsku');
    listenEnglish.type='button';
    listenEnglish.addEventListener('click',()=>speakSentence(badge.storyEn));
    story.append(listenEnglish);
  }
  story.hidden = true;
  $('#badgeStoryButton').textContent = 'Przeczytaj historyjkę';
  $('#badgeStoryButton').hidden = !badge.story;
  $('#badgeQueueNote').textContent = badgeQueue.length
    ? 'Czeka jeszcze ' + badgeQueue.length + (badgeQueue.length === 1 ? ' odznaka.' : ' odznaki.')
    : '';
  modal.hidden = false;
  stopSpeech();
}

function closeBadge(){
  stopSpeech();
  $('#badgeModal').hidden = true;
  if(badgeQueue.length) setTimeout(showNextBadge,350);
}

$('#badgeStoryButton').addEventListener('click',()=>{
  const story = $('#badgeStory');
  story.hidden = !story.hidden;
  if(story.hidden)stopSpeech();
  $('#badgeStoryButton').textContent = story.hidden ? 'Przeczytaj historyjkę' : 'Zwiń historyjkę';
});
$('#badgeRewardButton').addEventListener('click',()=>{
  stopSpeech();
  badgeQueue = [];
  $('#badgeModal').hidden = true;
  show('map');
  renderMap();
});
$('#badgeClose').addEventListener('click',closeBadge);

/* Postęp wyprawy wynika z liczby zdanych egzaminów, więc nie trzeba
   przechowywać go osobno i nie da się rozjechać ze stanem sekcji. */
function journeyIndex(){ return Math.min(JOURNEY_STOPS.length-1, S.passedExams.length); }

/* ==================== POWTÓRKI DLA WZORCÓW I BŁĘDÓW ==================== */

function gradeIn(map,id,correct){
  const card = map[id] || (map[id] = {i:0,e:2.2,d:0,r:0,ok:0,bad:0});
  if(correct){
    card.ok++; card.r++; card.e = Math.min(2.6, card.e+0.05);
    card.i = Math.round(STEPS[Math.min(card.r-1,STEPS.length-1)] * (card.e/2.2));
    card.d = Date.now() + card.i*DAY;
  }else{
    card.bad++; card.r = Math.max(0,card.r-2); card.e = Math.max(1.3,card.e-0.15);
    card.i = 0; card.d = Date.now();
  }
  return card;
}
function dueIn(map,id){ const card = map[id]; return !card || card.d <= Date.now(); }

function normalizeAnswer(value){
  return String(value||'').toLowerCase()
    .replace(/[\u2019']/g,'')
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
/* Ocena wypowiedzi w M4 i M5: liczy się obecność elementów kluczowych,
   nie identyczność z wzorcem. `need` to lista list, z każdej musi trafić
   przynajmniej jeden wariant. */
function answerCovers(answer,need){
  if(window.BUSINESS_MATCHING&&window.BUSINESS_MATCHING.answerCovers){
    return window.BUSINESS_MATCHING.answerCovers(answer,need);
  }
  const text = ' '+normalizeAnswer(answer)+' ';
  if(text==='  ') return false;
  return (need||[]).every(group => group.some(token => text.includes(' '+normalizeAnswer(token)+' ')));
}
function answerAvoids(answer,avoid){
  if(window.BUSINESS_MATCHING&&window.BUSINESS_MATCHING.answerAvoids){
    return window.BUSINESS_MATCHING.answerAvoids(answer,avoid);
  }
  const text = ' '+normalizeAnswer(answer)+' ';
  return !(avoid||[]).some(token => text.includes(' '+normalizeAnswer(token)+' '));
}
function communicativeAnswerMatches(answer,turn){
  return answerCovers(answer,turn.need)&&answerAvoids(answer,turn.avoid);
}

/* ==================== M2: KLOCKI ZDAŃ ==================== */

/* Trudność rośnie sama: na starcie tylko potrzebne klocki i widoczny wzór,
   potem dochodzą klocki zbędne, na końcu wzór znika. Poziom liczy się
   z liczby udanych powtórek tego konkretnego zdania. */
function patternLevel(id){ return (S.patterns[id]||{}).r || 0; }

/* Najdłuższy wspólny podciąg zaznacza fragmenty, które zachowują dobrą
   kolejność. Dzięki temu jeden zbędny klocek nie koloruje całego zdania
   na czerwono tylko dlatego, że przesunął dalsze słowa o jedno miejsce. */
function sentenceMatchMarks(placed,target){
  const rows=placed.length+1;const columns=target.length+1;
  const table=Array.from({length:rows},()=>Array(columns).fill(0));
  for(let i=placed.length-1;i>=0;i--){
    for(let j=target.length-1;j>=0;j--){
      table[i][j]=placed[i]===target[j]
        ? table[i+1][j+1]+1
        : Math.max(table[i+1][j],table[i][j+1]);
    }
  }
  const marks=Array(placed.length).fill(false);let i=0;let j=0;
  while(i<placed.length&&j<target.length){
    if(placed[i]===target[j]&&table[i][j]===table[i+1][j+1]+1){marks[i]=true;i++;j++;continue;}
    if(table[i+1][j]>=table[i][j+1])i++;else j++;
  }
  return marks;
}

function sentenceTextFromTokens(tokens){
  const question=tokens.includes('?');
  const words=tokens.filter(token=>token!=='?');
  return words.join(' ')+(question?'?':'.');
}

/* Pisownia jest osobną umiejętnością od układania. Pomijamy wyłącznie
   przypadkowe spacje na początku i końcu; wielka litera, odstępy wewnątrz
   zdania oraz znak końcowy muszą zgadzać się dokładnie. */
function sentenceSpellingMatches(typed,target){
  return String(typed||'').trim()===String(target||'');
}

function markedSentenceAnswer(typed,target){
  const answer=[...String(typed||'').trim()];
  const model=[...String(target||'')];
  const length=Math.max(answer.length,model.length);
  let html='';
  for(let index=0;index<length;index++){
    const actual=answer[index];
    const expected=model[index];
    if(actual===undefined){html+='<span class="ch missing">□</span>';continue;}
    const shown=actual===' '?'·':actual;
    html+='<span class="ch '+(actual===expected?'y':'n')+'">'+escapeHtml(shown)+'</span>';
  }
  return html;
}

function sentenceSpellingHint(typed,target){
  const answer=String(typed||'').trim();
  if(!answer)return 'Najpierw wpisz całe zdanie.';
  if(answer.toLowerCase()===target.toLowerCase()&&answer!==target)return 'Sprawdź wielką literę na początku zdania.';
  if(/\s{2,}/.test(answer))return 'Między wyrazami zostawiamy jedną spację.';
  if(!/[?.!]$/.test(answer))return 'Na końcu brakuje kropki albo znaku zapytania.';
  if(answer.endsWith('.')&&target.endsWith('?'))return 'To jest pytanie — zakończ je znakiem zapytania.';
  if(answer.endsWith('?')&&target.endsWith('.'))return 'To nie jest pytanie — zakończ zdanie kropką.';
  return 'Porównaj kolorowe znaki ze wzorem i popraw czerwone miejsca.';
}

function grammarExampleTokens(text){
  return String(text||'').match(/[A-Za-z]+(?:['’][A-Za-z]+)?|-[A-Za-z]+|[?.!,]/g)||[];
}

function grammarSpeechText(token){
  const spoken={
    '?':'question mark',
    '.':'full stop',
    ',':'comma',
    '!':'exclamation mark',
    '-s':'s ending',
    '-ing':'ing ending'
  };
  return spoken[token]||token;
}

function appendGrammarBricks(host,tokens,className='grammar-bricks'){
  const row=make('span',className);
  (tokens||[]).forEach(token=>{
    const spoken=grammarSpeechText(token);
    const brick=make('button','grammar-brick grammar-audio'+(/^[?.!,]$/.test(token)?' punctuation':''),token);
    brick.type='button';
    brick.title='Posłuchaj wymowy';
    brick.setAttribute('aria-label','Odtwórz po angielsku: '+spoken);
    const icon=make('span','grammar-audio-icon','🔊');
    icon.setAttribute('aria-hidden','true');
    brick.append(icon);
    brick.addEventListener('click',()=>say(spoken));
    row.append(brick);
  });
  host.append(row);
  return row;
}

function appendGrammarParts(host,parts,formula=false){
  (parts||[]).forEach((part,index)=>{
    if(formula&&index)host.append(make('span','grammar-plus','+'));
    if(part.pl)host.append(make('span','grammar-polish',part.pl));
    if(part.en)appendGrammarBricks(host,part.en,'grammar-bricks inline');
  });
}

function buildGrammarHelp(patternId){
  const guide=GRAMMAR_GUIDES[patternId]||GRAMMAR_GUIDES['to-be-positive'];
  const details=make('details','sentence-help');
  details.append(make('summary','','Potrzebuję podpowiedzi'));
  const body=make('div','sentence-help-body');
  body.append(make('strong','grammar-label','Plan zdania'));
  const formula=make('div','grammar-formula');
  appendGrammarParts(formula,guide.formula,true);
  body.append(formula);
  body.append(make('strong','grammar-label','Przykład z klocków'));
  const examples=make('div','grammar-examples');
  guide.examples.forEach(tokens=>appendGrammarBricks(examples,tokens));
  body.append(examples);
  body.append(make('strong','grammar-label','Zapamiętaj'));
  const tip=make('div','grammar-tip');
  appendGrammarParts(tip,guide.tip);
  body.append(tip);
  body.append(make('strong','grammar-label','Mały słownik'));
  const terms=make('ul','grammar-list');
  guide.terms.forEach(term=>{
    const entry=GRAMMAR_TERMS[term];
    const row=make('li','grammar-term');
    const heading=make('div','grammar-term-title');
    heading.append(make('strong','',entry.label));
    appendGrammarBricks(heading,[entry.english],'grammar-bricks inline');
    row.append(heading,make('p','grammar-definition',entry.definition));
    appendGrammarBricks(row,entry.examples);
    terms.append(row);
  });
  body.append(terms);
  body.append(make('strong','grammar-label','Dobre nawyki'));
  const habits=make('ul','grammar-list grammar-habits');
  [
    'Pierwszy wyraz zdania zaczynamy wielką literą.',
    'Pytanie kończymy znakiem zapytania. Zdanie oznajmujące kończymy kropką.',
    'Najpierw znajdź osobę lub rzecz, potem czasownik, a na końcu szczegóły.',
    'Przed sprawdzeniem przeczytaj zdanie od lewej do prawej i posłuchaj, czy brzmi logicznie.',
    'Po ułożeniu przepisz całe zdanie. Dopiero potem posłuchaj wzoru i przeczytaj zdanie na głos.'
  ].forEach(text=>habits.append(make('li','',text)));
  body.append(habits);
  details.append(body);
  return details;
}

function patternSkillId(item){
  return TASK_API?TASK_API.skillForPattern(item.pattern):(['to-be-question','wh-questions'].includes(item.pattern)?'question_formation':'sentence_building');
}
function patternTaskType(operation){
  if(operation==='production')return 'contextual_production';
  return ['recognition','recall','controlled_production','transfer'].includes(operation)?operation:'controlled_production';
}
function recordPatternEvidence(item,step,operation,outcome,support={},timing={},context={}){
  const adaptive=activeAdaptiveTask&&activeAdaptiveTask.skill===patternSkillId(item)?activeAdaptiveTask:null;
  return recordLearningEvent({
    eventType:context.eventType||'task_attempt',
    taskId:adaptive?adaptive.id:('pattern:'+item.id+':'+step),
    taskType:patternTaskType(operation),
    skill:patternSkillId(item),
    languageItems:[item.pattern].concat(item.vocab||[]),
    cefr:['to-be-question','wh-questions'].includes(item.pattern)?'A1':'A2',
    bloomLevel:operation==='transfer'?'create':(operation==='recognition'?'understand':'apply'),
    cognitiveOperation:operation,
    modality:context.modality||(operation==='production'?'speaking':(operation==='recall'||operation==='transfer'?'typing':'touch')),
    outcome,
    support,
    timing,
    context:{mode:sessionOrigin||'learning',source:'sentence-module',delayedRetrieval:Boolean(context.delayedRetrieval),generatedVariation:Boolean(context.generatedVariation)}
  });
}

/* Pierwszy pełny transfer v13: nowe pytanie bez klocków i bez widocznego
   wzoru. Wzór pojawia się dopiero po próbie, więc wynik nie jest mylony
   z rozpoznaniem ani mechanicznym kopiowaniem. */
function renderQuestionTransfer(stage,item,task){
  const started=Date.now();const target=sentenceTextFromTokens(item.tokens);
  const prompt=make('div','prompt');
  prompt.append(make('p','ask','Zastosuj w nowym kontekście'));
  prompt.append(make('p','pattern-pl',item.pl));
  prompt.append(make('p','sentence-arrange-help','Napisz całe pytanie z pamięci. Zacznij wielką literą i zakończ znakiem zapytania.'));
  stage.append(prompt);
  const input=make('input','inp sentence-copy-input');input.type='text';input.placeholder='Wpisz pytanie po angielsku';input.autocomplete='off';input.autocapitalize='off';input.spellcheck=false;
  const feedback=make('div','sentence-copy-feedback','');feedback.setAttribute('aria-live','polite');
  const check=make('button','next','Sprawdź pytanie');check.type='button';
  const hear=make('button','secondary','🔊 Posłuchaj poprawnego pytania');hear.type='button';hear.hidden=true;hear.addEventListener('click',()=>speakSentence(target));
  const next=make('button','next','Zakończ zadanie');next.type='button';next.hidden=true;next.addEventListener('click',()=>{activeAdaptiveTask=null;nextStep();});
  stage.append(input,feedback,check,hear,next);input.focus();
  let attempts=0;let completed=false;
  function evaluate(){
    if(completed)return;
    if(sentenceSpellingMatches(input.value,target)){
      completed=true;
      recordPatternEvidence(item,'transfer','transfer',{status:'correct',score:1},{hints:attempts?1:0,retries:attempts,revealedAnswer:attempts>0},{responseMs:Date.now()-started},{generatedVariation:true});
      gradeIn(S.patterns,item.id,attempts===0);if(attempts===0){hits++;award('patternPerfect');}done++;saveProgress();
      input.disabled=true;check.hidden=true;hear.hidden=false;next.hidden=false;
      feedback.className='sentence-copy-feedback good';feedback.textContent='Pytanie działa w nowym kontekście. To jest dowód transferu, nie tylko rozpoznania wzoru.';
      speakSentence(target);
      return;
    }
    const answer=String(input.value||'');
    recordPatternEvidence(item,'transfer','transfer',{status:'incorrect',score:0,errorTypes:['question_formation',/[?]$/.test(answer)?'word_order':'missing_word']},{hints:attempts?1:0,retries:attempts,revealedAnswer:false},{responseMs:Date.now()-started},{generatedVariation:true});
    attempts++;noteMistake('pattern',item.id);
    feedback.className='sentence-copy-feedback bad';
    feedback.innerHTML='<span class="guidance-copy">Jeszcze nie. Popraw tylko wskazane miejsce i spróbuj ponownie.</span><span class="spelling-hint">'+escapeHtml(sentenceSpellingHint(answer,target))+'</span>';
    if(attempts>=2){hear.hidden=false;feedback.append(make('span','spelling-hint','Możesz odsłuchać wzór. Użycie wzoru zostanie zapisane jako pomoc, nie samodzielna odpowiedź.'));}
    input.focus();
  }
  check.addEventListener('click',evaluate);input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();evaluate();}});
}

function renderPattern(stage,item){
  const taskStartedAt=Date.now();
  const level = patternLevel(item.id);
  const useExtra = level >= 1;
  const showHint = level < 2;

  const prompt = make('div','prompt');
  prompt.append(make('p','ask','Krok 1 z 3 · Ułóż zdanie po angielsku'));
  const patternPrompt=make('p','pattern-pl',item.pl);
  prompt.append(patternPrompt);
  if(showHint){
    const hint=make('div','pattern-hint');
    hint.append(make('span','pattern-hint-label','Przykład'));
    appendGrammarBricks(hint,grammarExampleTokens(item.example));
    prompt.append(hint);
  }
  stage.append(prompt);

  const grammarHelp=buildGrammarHelp(item.pattern);
  const grammarSummary=grammarHelp.querySelector('summary');
  stage.append(grammarHelp);

  const arrangeHelp=make('p','sentence-arrange-help','Dotknij klocków, aby je dodać. Przed sprawdzeniem możesz przeciągać ułożone słowa palcem i zmieniać ich kolejność.');
  stage.append(arrangeHelp);

  const line = make('div','sentence-line');
  line.setAttribute('aria-label','Twoje zdanie');
  stage.append(line);

  const bank = make('div','brick-bank');
  stage.append(bank);

  const feedback = make('p','fb','');
  feedback.setAttribute('aria-live','polite');
  stage.append(feedback);

  const placed = [];
  /* Pierwsze spotkania korzystają z ręcznie przygotowanych item.tokens.
     Dopiero przy utrwalaniu generator może ułożyć wariant ze słów, które
     dziecko ma w kolekcji. Jeśli nie ma bezpiecznego wariantu, zostaje
     bieżące, sprawdzone zdanie z patterns.js. */
  let target = item.tokens;
  let extraBricks = item.extra;
  let generatedVariation=false;
  if(typeof SENTENCE_GEN !== 'undefined' && item.pattern){
    const task = SENTENCE_GEN.makeSentenceTask(item.pattern, collectedVocabulary(), level);
    if(task && task.tokens && task.tokens.length){
      target=task.tokens;extraBricks=task.extra;
      generatedVariation=true;
      if(task.promptPl)patternPrompt.textContent=task.promptPl;
    }
  }
  const sentenceText=sentenceTextFromTokens(target);
  const pool = shuffle(useExtra ? target.concat(extraBricks) : target.slice());
  let reviewed = false;
  let arrangementReady = false;
  let spellingReady = false;
  let completed = false;
  let pronunciationConfirmed = false;
  let placedDrag=null;
  let suppressPlacedClick=false;

  function clearPlacedDragVisuals(){
    if(placedDrag&&placedDrag.slot){
      placedDrag.slot.classList.remove('dragging');
      placedDrag.slot.style.transform='';
    }
    line.classList.remove('reordering');
    line.querySelectorAll('.brick-slot').forEach(slot=>slot.classList.remove('drag-target'));
  }

  function startPlacedDrag(event,index,slot,brick){
    if(reviewed||placed.length<2||(event.pointerType==='mouse'&&event.button!==0))return;
    const centers=[...line.querySelectorAll('.brick-slot')].map((candidate,candidateIndex)=>{
      const rect=candidate.getBoundingClientRect();
      return {index:candidateIndex,x:rect.left+rect.width/2,y:rect.top+rect.height/2};
    });
    placedDrag={pointerId:event.pointerId,from:index,target:index,startX:event.clientX,startY:event.clientY,moved:false,slot,brick,centers};
    try{brick.setPointerCapture(event.pointerId);}catch(error){}
  }

  function movePlacedDrag(event){
    if(!placedDrag||event.pointerId!==placedDrag.pointerId)return;
    const dx=event.clientX-placedDrag.startX;
    const dy=event.clientY-placedDrag.startY;
    if(!placedDrag.moved&&Math.hypot(dx,dy)<8)return;
    placedDrag.moved=true;
    event.preventDefault();
    line.classList.add('reordering');
    placedDrag.slot.classList.add('dragging');
    placedDrag.slot.style.transform='translate('+dx+'px,'+dy+'px) scale(1.04)';
    let nearest=placedDrag.centers[0];
    placedDrag.centers.forEach(candidate=>{
      if(Math.hypot(event.clientX-candidate.x,event.clientY-candidate.y)<Math.hypot(event.clientX-nearest.x,event.clientY-nearest.y))nearest=candidate;
    });
    placedDrag.target=nearest.index;
    line.querySelectorAll('.brick-slot').forEach((slot,slotIndex)=>slot.classList.toggle('drag-target',slotIndex===nearest.index&&slot!==placedDrag.slot));
  }

  function finishPlacedDrag(event,cancelled=false){
    if(!placedDrag||event.pointerId!==placedDrag.pointerId)return;
    const drag=placedDrag;
    try{drag.brick.releasePointerCapture(event.pointerId);}catch(error){}
    clearPlacedDragVisuals();
    placedDrag=null;
    if(cancelled||!drag.moved)return;
    suppressPlacedClick=true;
    if(drag.from!==drag.target){
      const moving=placed.splice(drag.from,1)[0];
      placed.splice(drag.target,0,moving);
    }
    refreshLine();refreshCheck();
    setTimeout(()=>{suppressPlacedClick=false;},0);
  }

  line.addEventListener('pointermove',movePlacedDrag);
  line.addEventListener('pointerup',event=>finishPlacedDrag(event));
  line.addEventListener('pointercancel',event=>finishPlacedDrag(event,true));

  function refreshLine(){
    line.textContent = '';
    const tokens=placed.map(item=>item.token);
    const marks=reviewed?sentenceMatchMarks(tokens,target):[];
    placed.forEach((item,index) => {
      const correct=reviewed&&marks[index];
      const slot=make('span','brick-slot'+(reviewed?(correct?' correct':' incorrect'):''));
      const brick=make('button','brick placed'+(reviewed?(correct?' right':' wrong'):''),item.token);
      brick.type = 'button';
      if(correct){
        brick.disabled=true;
        brick.setAttribute('aria-label',item.token+' — poprawne miejsce');
      }else{
        if(!reviewed){
          brick.classList.add('reorderable');
          brick.setAttribute('aria-label',item.token+' — Enter odkłada, strzałki lewo i prawo zmieniają kolejność; można też przeciągnąć');
          brick.addEventListener('pointerdown',event=>startPlacedDrag(event,index,slot,brick));
          brick.addEventListener('keydown',event=>{
            if(event.key==='ArrowLeft'){
              event.preventDefault();moveBrick(index,-1);focusPlacedBrick(index-1);
            }else if(event.key==='ArrowRight'){
              event.preventDefault();moveBrick(index,1);focusPlacedBrick(index+1);
            }
          });
        }else brick.setAttribute('aria-label','Usuń błędny klocek: '+item.token);
        brick.addEventListener('click',()=>{
          if(suppressPlacedClick){suppressPlacedClick=false;return;}
          const removed=placed.splice(index,1)[0];
          if(removed&&removed.source)removed.source.disabled=false;
          refreshLine();refreshCheck();
        });
      }
      slot.append(brick);
      if(reviewed&&!correct){
        const controls=make('span','brick-moves');
        const left=make('button','brick-move','←');left.type='button';left.disabled=index===0;
        left.setAttribute('aria-label','Przesuń '+item.token+' w lewo');
        left.addEventListener('click',()=>moveBrick(index,-1));
        const right=make('button','brick-move','→');right.type='button';right.disabled=index===placed.length-1;
        right.setAttribute('aria-label','Przesuń '+item.token+' w prawo');
        right.addEventListener('click',()=>moveBrick(index,1));
        controls.append(left,right);slot.append(controls);
      }
      line.append(slot);
    });
    if(!placed.length) line.append(make('span','line-empty','Dotknij klocków poniżej. Ułożone słowa możesz przeciągać; klawiaturą przesuniesz je strzałkami.'));
    if(reviewed&&tokens.length===target.length&&marks.every(Boolean)){
      feedback.className='fb good';
      feedback.textContent='Wszystkie klocki są zielone. Sprawdź poprawione zdanie.';
    }
  }
  function moveBrick(index,direction){
    const destination=index+direction;
    if(destination<0||destination>=placed.length)return;
    const moving=placed[index];placed[index]=placed[destination];placed[destination]=moving;
    refreshLine();refreshCheck();
  }
  function focusPlacedBrick(index){
    if(index<0||index>=placed.length)return;
    const bricks=line.querySelectorAll('.brick-slot .brick');
    if(bricks[index])setTimeout(()=>bricks[index].focus(),0);
  }
  function refreshCheck(){
    checkButton.disabled=placed.length!==target.length;
    checkButton.textContent=reviewed?'Sprawdź ponownie':'Sprawdź';
  }

  pool.forEach(token => {
    const brick = make('button','brick brick-audio',token);
    brick.type = 'button';
    /* Klocek do układania wypowiada swoje słowo po dotknięciu. Przykłady
       w podpowiedziach także mają własny dźwięk. Interpunkcja milczy. */
    const isPunctuation=/^[?.!,]$/.test(token);
    if(!isPunctuation){
      const icon=make('span','brick-audio-icon','🔊');
      icon.setAttribute('aria-hidden','true');
      brick.append(icon);
      brick.setAttribute('aria-label',token+', dotknij, aby ułożyć i usłyszeć');
    }
    brick.addEventListener('click',()=>{
      if(!isPunctuation) say(grammarSpeechText(token));
      if(placed.length >= target.length) return;
      placed.push({token,source:brick});brick.disabled=true;
      refreshLine(); refreshCheck();
    });
    bank.append(brick);
  });

  const checkButton = make('button','next','Sprawdź');
  checkButton.type = 'button';
  checkButton.disabled = true;
  stage.append(checkButton);

  const copyPanel=make('section','sentence-copy');
  copyPanel.hidden=true;
  copyPanel.append(make('p','sentence-copy-step','Krok 2 z 3'));
  copyPanel.append(make('p','sentence-copy-title','Teraz przepisz całe zdanie'));
  copyPanel.append(make('p','sentence-copy-instruction',level>=2?'Wpisz zdanie z pamięci. Jeśli utkniesz, możesz odsłonić wzór — pomoc zostanie uwzględniona w profilu.':'Przepisz dokładnie. Pamiętaj o wielkiej literze, jednej spacji między wyrazami i znaku na końcu.'));
  const copyModel=make('div','sentence-copy-model',sentenceText);copyModel.hidden=level>=2;
  const revealCopyModel=make('button','secondary','Pokaż wzór');revealCopyModel.type='button';revealCopyModel.hidden=level<2;
  copyPanel.append(copyModel,revealCopyModel);
  const copyInput=make('input','inp sentence-copy-input');
  copyInput.type='text';copyInput.placeholder='Wpisz tutaj całe zdanie';
  copyInput.autocapitalize='off';copyInput.autocomplete='off';copyInput.spellcheck=false;
  copyInput.setAttribute('autocorrect','off');copyInput.setAttribute('enterkeyhint','done');
  copyInput.setAttribute('aria-label','Przepisz całe angielskie zdanie');
  const copyFeedback=make('div','sentence-copy-feedback','');
  copyFeedback.setAttribute('aria-live','polite');
  const copyCheckButton=make('button','next','Sprawdź pisownię');
  copyCheckButton.type='button';
  copyPanel.append(copyInput,copyFeedback,copyCheckButton);
  stage.append(copyPanel);

  const speechPanel=make('section','sentence-speech');
  speechPanel.hidden=true;
  speechPanel.append(make('p','sentence-copy-step','Krok 3 z 3'));
  speechPanel.append(make('p','sentence-speech-title','Teraz przeczytaj całe zdanie'));
  const speechStatus=make('p','mic-status','Najpierw posłuchaj wzoru.');
  speechStatus.setAttribute('aria-live','polite');
  const readButton=make('button','next','Przeczytaj zdanie na głos');
  readButton.type='button';readButton.disabled=true;
  const heard=make('p','heard','');
  const speechContinueButton=make('button','speech-continue','Przejdź dalej · powtórzę zdanie później');
  speechContinueButton.type='button';speechContinueButton.hidden=true;
  const contrastBox=make('div','sentence-contrast');
  contrastBox.hidden=true;
  contrastBox.append(make('p','contrast-intro','Porównaj brzmienie dopiero po poprawieniu układu.'));
  const wrongContrast=make('div','contrast-line wrong');
  wrongContrast.append(make('strong','','Wcześniejsza błędna wersja'));
  const wrongContrastText=make('span','','');wrongContrast.append(wrongContrastText);
  const correctContrast=make('div','contrast-line correct');
  correctContrast.append(make('strong','','Poprawna wersja'));
  const correctContrastText=make('span','','');correctContrast.append(correctContrastText);
  const contrastButton=make('button','secondary contrast-listen','🔊 Porównaj: błędne → poprawne');
  contrastButton.type='button';contrastButton.disabled=true;
  contrastBox.append(wrongContrast,correctContrast,contrastButton);
  const resultActions=make('div','sentence-result-actions');
  resultActions.hidden=true;
  const replayButton=make('button','secondary','🔊 Posłuchaj jeszcze raz');
  replayButton.type='button';
  const nextSentenceButton=make('button','next','Następne zdanie');
  nextSentenceButton.type='button';
  resultActions.append(replayButton,nextSentenceButton);
  speechPanel.append(speechStatus,contrastBox,readButton,heard,speechContinueButton,resultActions);
  stage.append(speechPanel);

  let attempts = 0;
  let copyAttempts = 0;
  let speechAttempts = 0;
  let copyStartedAt=0;
  let speechStartedAt=0;
  let spellingModelRevealed=level<2;
  let testSkip=null;
  let copySkip=null;
  let lastIncorrectSentence='';

  function finishSentence(speechVerified=true){
    if(completed||!spellingReady)return;
    completed=true;pronunciationConfirmed=speechVerified;
    speechPanel.classList.add(speechVerified?'passed':'needs-review');
    speechStatus.textContent=speechVerified
      ? 'Świetnie! Zdanie zostało ułożone, przepisane i przeczytane poprawnie.'
      : 'Próba została wykonana. Mikrofon nie potwierdził wymowy, ale nie uznajemy tego za błąd ucznia.';
    heard.textContent=speechVerified?'Zaliczone: '+sentenceText:'Wymowa nierozstrzygnięta: '+sentenceText;
    readButton.hidden=true;
    speechContinueButton.hidden=true;
    if(!contrastBox.hidden)contrastButton.disabled=!hasTTS;
    if(testSkip)testSkip.hidden=true;
    resultActions.hidden=false;
    const independentLanguage=attempts===0&&copyAttempts===0;
    const flawless=speechVerified&&speechAttempts===0&&independentLanguage;
    /* Ułożenie i pisownia są oceniane z wykonania. ASR tworzy osobny
       dowód wymowy; wynik nierozstrzygnięty nie może cofnąć poprawnego
       zadania językowego ani zablokować dalszej ścieżki. */
    gradeIn(S.patterns,item.id,independentLanguage);
    if(flawless){ hits++; award('patternPerfect'); }
    done++;saveProgress();
  }

  function enableReading(){
    if(completed||!arrangementReady||!spellingReady)return;
    if(!contrastBox.hidden)contrastButton.disabled=!hasTTS;
    if(!hasSpeechRecognition){
      speechStatus.textContent='Ta przeglądarka nie potrafi sprawdzić wymowy. Wykonaj próbę dla siebie i przejdź dalej; brak ASR nie obniży wyniku zdania.';
      readButton.textContent='Mikrofon niedostępny';readButton.disabled=true;
      speechContinueButton.hidden=false;
      return;
    }
    speechStatus.textContent='Teraz przeczytaj całe zdanie od początku do końca.';
    readButton.textContent='Przeczytaj zdanie na głos';readButton.disabled=false;
  }

  function playSentenceModel(){
    readButton.disabled=true;
    contrastButton.disabled=true;
    speechStatus.textContent='Słuchaj uważnie. Zdanie brzmi w naturalnym tempie.';
    speakSentence(sentenceText,enableReading);
  }

  function acceptSpelling(){
    if(spellingReady)return;
    recordPatternEvidence(item,'spelling','recall',{status:'correct',score:1},{hints:spellingModelRevealed?1:0,retries:copyAttempts,revealedAnswer:spellingModelRevealed},{responseMs:Date.now()-(copyStartedAt||taskStartedAt)},{generatedVariation});
    spellingReady=true;
    copyPanel.classList.add('passed');
    copyInput.value=sentenceText;copyInput.disabled=true;
    copyCheckButton.hidden=true;
    if(copySkip)copySkip.hidden=true;
    copyFeedback.className='sentence-copy-feedback good';
    copyFeedback.textContent='Pisownia poprawna. Teraz posłuchaj i przeczytaj zdanie na głos.';
    speechPanel.hidden=false;
    playSentenceModel();
  }

  function checkSpelling(){
    if(spellingReady)return;
    if(sentenceSpellingMatches(copyInput.value,sentenceText)){acceptSpelling();return;}
    recordPatternEvidence(item,'spelling','recall',{status:'incorrect',score:0,errorTypes:['spelling']},{hints:spellingModelRevealed?1:0,retries:copyAttempts,revealedAnswer:spellingModelRevealed},{responseMs:Date.now()-(copyStartedAt||taskStartedAt)},{generatedVariation});
    copyAttempts++;
    noteMistake('sentence-spelling',item.id);
    copyFeedback.className='sentence-copy-feedback bad';
    copyFeedback.innerHTML='<span class="spelling-marked" aria-hidden="true">'+markedSentenceAnswer(copyInput.value,sentenceText)+'</span><span class="spelling-hint">'+escapeHtml(sentenceSpellingHint(copyInput.value,sentenceText))+'</span>';
    copyInput.focus();
  }

  copyCheckButton.addEventListener('click',checkSpelling);
  copyInput.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();checkSpelling();}
  });
  revealCopyModel.addEventListener('click',()=>{
    spellingModelRevealed=true;copyModel.hidden=false;line.hidden=false;revealCopyModel.hidden=true;
    copyFeedback.className='sentence-copy-feedback';copyFeedback.textContent='Wzór jest widoczny. Dokończ samodzielnie; system zapisze, że użyto pomocy.';
    copyInput.focus();
  });

  readButton.addEventListener('click',()=>{
    speechStartedAt=Date.now();
    readButton.disabled=true;readButton.textContent='Słucham…';
    contrastButton.disabled=true;
    speechStatus.textContent='Czytaj teraz całe zdanie.';heard.textContent='';
    listen(sentenceText,result=>{
      if(result.fatal){
        speechAttempts++;
        recordPatternEvidence(item,'speech','production',{status:'inconclusive',score:null,errorTypes:[]},{hints:1,retries:speechAttempts-1,revealedAnswer:true},{responseMs:Date.now()-speechStartedAt},{generatedVariation});
        speechStatus.textContent=(result.msg||'Mikrofon jest niedostępny.')+' Możesz przejść dalej; nie zapisujemy tego jako błędu.';
        readButton.textContent='Mikrofon niedostępny';readButton.disabled=true;
        speechContinueButton.hidden=false;
        return;
      }
      if(result.ok){
        recordPatternEvidence(item,'speech','production',{status:'correct',score:1},{hints:1,retries:speechAttempts,revealedAnswer:true},{responseMs:Date.now()-speechStartedAt},{generatedVariation});
        speechPanel.classList.add('good');
        finishSentence(true);
        return;
      }
      speechAttempts++;
      recordPatternEvidence(item,'speech','production',{status:'inconclusive',score:null,errorTypes:[]},{hints:1,retries:speechAttempts-1,revealedAnswer:true},{responseMs:Date.now()-speechStartedAt},{generatedVariation});
      speechStatus.textContent=speechAttempts>=MAX_SPEECH_GATE_ATTEMPTS
        ? 'Mikrofon nadal nie ma pewności. Możesz spróbować ponownie albo przejść dalej — to nie obniży wyniku zdania.'
        : 'Nie udało się jeszcze potwierdzić całego zdania. Posłuchaj wzoru i spróbuj ponownie.';
      readButton.textContent='Powiedz jeszcze raz';readButton.disabled=true;
      if(speechAttempts>=MAX_SPEECH_GATE_ATTEMPTS)speechContinueButton.hidden=false;
      speakSentence(sentenceText,()=>{
        if(!completed){
          speechStatus.textContent=speechAttempts>=MAX_SPEECH_GATE_ATTEMPTS
            ? 'Spróbuj ponownie albo wybierz przejście dalej. Nie zatrzymujemy nauki przez niedokładność mikrofonu.'
            : 'Spróbuj jeszcze raz. Czytaj spokojnie od pierwszego do ostatniego słowa.';
          readButton.disabled=false;
          if(!contrastBox.hidden)contrastButton.disabled=!hasTTS;
        }
      });
    },sentencePronunciationMatches);
  });

  speechContinueButton.addEventListener('click',()=>{
    if(!speechAttempts)recordPatternEvidence(item,'speech','production',{status:'inconclusive',score:null,errorTypes:[]},{hints:1,retries:0,revealedAnswer:true},{responseMs:Date.now()-(speechStartedAt||taskStartedAt)},{generatedVariation});
    stopSpeech();finishSentence(false);
  });

  /* Nie odtwarzamy błędu automatycznie. Dopiero po samodzielnej korekcie
     dziecko może świadomie porównać jedną wcześniejszą próbę z prawidłowym
     wzorcem, który zawsze wybrzmiewa jako drugi i ostatni. */
  contrastButton.addEventListener('click',()=>{
    if(!lastIncorrectSentence||!hasTTS)return;
    contrastButton.disabled=true;readButton.disabled=true;replayButton.disabled=true;
    speechStatus.textContent='Najpierw wcześniejsza błędna wersja…';
    speakSentence(lastIncorrectSentence,()=>{
      const comparisonToken=speechToken;
      speechStatus.textContent='Teraz poprawna wersja.';
      setTimeout(()=>{
        if(comparisonToken!==speechToken)return;
        speakSentence(sentenceText,()=>{
          replayButton.disabled=false;
          contrastButton.disabled=false;
          if(completed){
            speechStatus.textContent='Porównanie zakończone. Poprawna wersja zawsze była ostatnia.';
          }else{
            enableReading();
          }
        });
      },550);
    });
  });

  replayButton.addEventListener('click',()=>{
    replayButton.disabled=true;contrastButton.disabled=true;
    speechStatus.textContent='Słuchaj jeszcze raz.';
    speakSentence(sentenceText,()=>{
      replayButton.disabled=false;
      if(!contrastBox.hidden)contrastButton.disabled=!hasTTS;
      speechStatus.textContent=pronunciationConfirmed
        ? 'Zdanie zaliczone. Możesz posłuchać ponownie albo przejść dalej.'
        : 'Wymowa pozostaje do powtórki. Możesz posłuchać ponownie albo przejść dalej.';
    });
  });
  nextSentenceButton.addEventListener('click',()=>{
    stopSpeech();clearTimeout(advanceTimer);nextStep();
  });

  if(inTestMode()){
    copySkip=makeSkip('Pomiń przepisywanie zdania',acceptSpelling);
    copyPanel.append(copySkip);
    testSkip=makeSkip('Pomiń czytanie zdania',()=>finishSentence(false));
    speechPanel.append(testSkip);
  }

  checkButton.addEventListener('click',()=>{
    const answer = placed.map(entry=>entry.token).join(' ');
    const correct = answer === target.join(' ');
    if(correct){
      const arrangementOperation=level===0?'recognition':'controlled_production';
      recordPatternEvidence(item,'arrangement',arrangementOperation,{status:'correct',score:1},{hints:(showHint?1:0)+(attempts>=2?1:0),retries:attempts,revealedAnswer:showHint||grammarHelp.open},{responseMs:Date.now()-taskStartedAt},{eventType:attempts?'repair_attempt':'task_attempt',generatedVariation});
      reviewed=true;arrangementReady=true;refreshLine();
      feedback.className = 'fb good';
      delete feedback.dataset.guidanceLevel;
      feedback.textContent = 'Zdanie jest ułożone poprawnie: '+sentenceText;
      checkButton.disabled = true;checkButton.hidden=true;bank.hidden=true;
      arrangeHelp.hidden=true;
      bank.querySelectorAll('.brick').forEach(brick => brick.disabled = true);
      if(lastIncorrectSentence){
        wrongContrastText.textContent=lastIncorrectSentence;
        correctContrastText.textContent=sentenceText;
        contrastBox.hidden=false;
      }
      copyPanel.hidden=false;
      copyStartedAt=Date.now();
      if(level>=2)line.hidden=true;
      copyInput.focus();
      return;
    }
    const arrangementOperation=level===0?'recognition':'controlled_production';
    recordPatternEvidence(item,'arrangement',arrangementOperation,{status:'incorrect',score:0,errorTypes:[patternSkillId(item)==='question_formation'?'question_formation':'word_order']},{hints:(showHint?1:0)+(attempts>=1?1:0),retries:attempts,revealedAnswer:showHint||grammarHelp.open},{responseMs:Date.now()-taskStartedAt},{generatedVariation});
    attempts++;
    lastIncorrectSentence=sentenceTextFromTokens(placed.map(entry=>entry.token));
    gradeIn(S.patterns,item.id,false);
    noteMistake('pattern',item.id);
    feedback.className = 'fb bad';
    feedback.dataset.guidanceLevel=String(Math.min(3,attempts));
    reviewed=true;refreshLine();
    arrangeHelp.textContent='Po sprawdzeniu poprawne części zostają zielone. Czerwone klocki przesuń strzałką albo dotknij, aby je wymienić.';
    /* Zdanie zostaje na miejscu. Kolory i strzałki prowadzą do samodzielnej
       korekty, zamiast kasować dziecku całą wykonaną pracę. */
    if(attempts===1){
      feedback.textContent='Zielone części są już dobrze. Zmień tylko czerwone klocki — możesz je przesunąć strzałką albo dotknąć, aby wymienić.';
    }else if(attempts===2){
      feedback.textContent='Wskazówka: znajdź najpierw osobę lub rzecz, a potem czasownik mówiący, co robi. Otworzyłem krótką regułę poniżej.';
      if(grammarSummary)grammarSummary.textContent='Wskazówka 2 · reguła i przykłady';
      grammarHelp.open=true;
    }else{
      feedback.textContent='Przykład początku: „'+target.slice(0,2).join(' ')+'”. Ułóż dalej samodzielnie, korzystając z zielonych części i reguły poniżej.';
      if(grammarSummary)grammarSummary.textContent='Wskazówka 3 · przykład krok po kroku';
      grammarHelp.open=true;
    }
    refreshCheck();
  });

  refreshLine();
}

/* ==================== M3: HISTORYJKI ==================== */

function renderStory(stage,story){
  const card = make('div','card story-card');
  card.append(make('p','tag','Historyjka'));
  card.append(make('h3','story-title',story.title));
  const body = make('div','story-text');
  story.text.forEach(sentence => {
    const row = make('button','story-line',sentence);
    row.type = 'button';
    row.addEventListener('click',()=>say(sentence));
    body.append(row);
  });
  card.append(body);
  const listen = make('button','hear','Posłuchaj całości');
  listen.type = 'button';
  listen.addEventListener('click',()=>speakSequence(story.text,()=>{}));
  card.append(listen);
  stage.append(card);

  const next = make('button','next','Przejdź do pytań');
  next.type = 'button';
  next.addEventListener('click',()=>{
    stopSpeech();
    stage.textContent = '';
    renderStoryMain(stage,story);
  });
  stage.append(next);
}

function renderStoryMain(stage,story){
  const prompt = make('div','prompt');
  prompt.append(make('p','ask','Główna myśl'));
  prompt.append(make('p','story-question',story.main.q));
  stage.append(prompt);

  const options = make('div','opts wide-opts');
  const buttons = [];
  let finished = false;
  const proceed = ()=>{ stage.textContent=''; renderStoryDetail(stage,story,0); };
  const finish = (kind,title,text)=>{
    finished = true;
    [...options.children].forEach(child => child.disabled = true);
    dontKnow.remove();
    done++;
    stage.append(answerStrip(kind,title,text,proceed));
  };
  shuffle(story.main.options.map((text,index)=>({text,index}))).forEach(option => {
    const button = make('button','opt text-opt',option.text);
    button.type = 'button';
    buttons[option.index] = button;
    button.addEventListener('click',()=>{
      if(finished) return;
      const correct = option.index === story.main.correct;
      button.classList.add(correct?'right':'wrong');
      if(!correct){
        buttons[story.main.correct].classList.add('right');
        noteMistake('story',story.id);
        finish('bad','Jeszcze nie.','Poprawna odpowiedź jest zaznaczona. To zadanie wróci w powtórce.');
      }else{
        hits++;
        finish('ok','Dobrze!','To główna myśl tej historyjki.');
      }
    });
    options.append(button);
  });
  const dontKnow = dontKnowBlock(()=>{
    if(finished) return;
    buttons[story.main.correct].classList.add('right');
    noteMistake('story',story.id);
    finish('skip','Poprawna odpowiedź jest zaznaczona.','To zadanie wróci w powtórce.');
  });
  stage.append(options,dontKnow);
}

function renderStoryDetail(stage,story,index){
  const question = story.detail[index];
  if(!question){
    const record = S.stories[story.id] || (S.stories[story.id] = {done:0,ok:0});
    record.done++;
    saveProgress();
    return nextStep();
  }
  const prompt = make('div','prompt');
  prompt.append(make('p','ask','Szczegół, pytanie '+(index+1)+' z '+story.detail.length));
  prompt.append(make('p','story-question',question.q));
  stage.append(prompt);

  const recall = make('button','hear','Przypomnij historyjkę');
  recall.type = 'button';
  recall.addEventListener('click',()=>speakSequence(story.text,()=>{}));
  stage.append(recall);

  const input = document.createElement('input');
  input.type = 'text'; input.className = 'inp'; input.placeholder = 'odpowiedz po angielsku';
  input.autocapitalize = 'off'; input.autocomplete = 'off'; input.spellcheck = false;
  input.setAttribute('autocorrect','off');
  stage.append(input);

  const feedback = make('p','fb','');
  stage.append(feedback);

  const check = make('button','next','Sprawdź');
  check.type = 'button';
  stage.append(check);

  let attempts = 0;
  function verify(){
    const value = normalizeAnswer(input.value);
    if(!value) return;
    const ok = question.answers.some(answer => normalizeAnswer(answer) === value || value.includes(normalizeAnswer(answer)));
    if(ok){
      feedback.className = 'fb good'; feedback.textContent = 'Dobrze.';
      input.disabled = true; check.disabled = true;
      const record = S.stories[story.id] || (S.stories[story.id] = {done:0,ok:0});
      record.ok++;
      if(attempts === 0){ hits++; award('storyDetail'); }
      done++; saveProgress();
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(()=>{ stage.textContent=''; renderStoryDetail(stage,story,index+1); },800);
      return;
    }
    attempts++;
    noteMistake('story',story.id);
    feedback.className = 'fb bad';
    feedback.textContent = attempts >= 2
      ? 'Odpowiedź jest w historyjce. Posłuchaj jej jeszcze raz.'
      : 'To nie to. Poszukaj w tekście.';
    if(attempts >= 3){
      feedback.textContent = 'Poprawna odpowiedź: ' + question.answers[0];
      input.disabled = true; check.disabled = true;
      done++;
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(()=>{ stage.textContent=''; renderStoryDetail(stage,story,index+1); },1800);
    }
  }
  check.addEventListener('click',verify);
  input.addEventListener('keydown',event=>{ if(event.key==='Enter'){ event.preventDefault(); verify(); } });
  setTimeout(()=>input.focus(),130);
}

/* ==================== M4: SYTUACJE ==================== */

function renderDialogue(stage,dialogue,turnIndex){
  const turn = dialogue.turns[turnIndex];
  if(!turn){
    const record = S.dialogues[dialogue.id] || (S.dialogues[dialogue.id] = {done:0,ok:0});
    record.done++;
    saveProgress();
    return nextStep();
  }

  const card = make('div','card dialogue-card');
  card.append(make('p','tag',dialogue.title+' · '+(turnIndex+1)+' z '+dialogue.turns.length));
  if(turnIndex === 0) card.append(make('p','dialogue-intro',dialogue.intro));
  card.append(make('p','dialogue-ask',turn.ask));
  const replay = make('button','hear','Posłuchaj pytania');
  replay.type = 'button';
  replay.addEventListener('click',()=>say(turn.ask));
  card.append(replay);
  stage.append(card);

  const mic = make('div','mic');
  const status = make('p','mic-status',turn.pl);
  const speak = make('button','next','Odpowiedz na głos');
  speak.type = 'button';
  const heard = make('p','heard','');
  mic.append(status,speak,heard);
  stage.append(mic);

  const record = S.dialogues[dialogue.id] || (S.dialogues[dialogue.id] = {done:0,ok:0});
  let attempts = 0;

  function accept(scored){
    if(scored){ record.ok++; hits++; award('dialogueTurn'); }
    done++; saveProgress();
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(()=>{ stage.textContent=''; renderDialogue(stage,dialogue,turnIndex+1); },900);
  }

  if(!hasSpeechRecognition){
    status.textContent = 'Mikrofon niedostępny, więc wpisz odpowiedź.';
    speak.remove();
    const input = document.createElement('input');
    input.type='text'; input.className='inp'; input.placeholder='odpowiedz pełnym zdaniem';
    input.autocapitalize='off'; input.autocomplete='off'; input.spellcheck=false;
    const check = make('button','next','Sprawdź');
    check.type='button';
    stage.append(input,check);
    check.addEventListener('click',()=>{
      const ok = answerCovers(input.value,turn.need) && answerAvoids(input.value,turn.avoid);
      status.textContent = ok ? 'Dobrze.' : 'Wzór: '+turn.model;
      if(!ok) noteMistake('dialogue',dialogue.id);
      input.disabled = true; check.disabled = true;
      accept(ok);
    });
    return;
  }

  speak.addEventListener('click',()=>{
    speak.disabled = true; speak.textContent = 'Słucham…'; status.textContent = 'Mów teraz.'; heard.textContent = '';
    listen(turn,result => {
      speak.disabled = false;
      const said = result.raw || '';
      const shown = containsBlockedWord(said) ? '' : said;
      const ok = result.ok;
      if(result.fatal){
        status.textContent = result.msg || 'Mikrofon jest niedostępny.';
        speak.textContent = 'Spróbuj jeszcze raz';
        const skip = make('button','link','Pomiń i idź dalej');
        skip.type='button';
        skip.addEventListener('click',()=>accept(false));
        mic.append(skip);
        return;
      }
      if(ok){
        mic.classList.add('good');
        status.textContent = 'Dobra odpowiedź.';
        heard.textContent = shown ? 'Usłyszałem: '+shown : '';
        speak.textContent = 'Zaliczone'; speak.disabled = true;
        return accept(attempts === 0);
      }
      attempts++;
      noteMistake('dialogue',dialogue.id);
      heard.textContent = shown ? 'Usłyszałem: '+shown : '';
      if(attempts >= 2){
        status.textContent = 'Wzór: '+turn.model;
        say(turn.model);
        speak.textContent = 'Powiedz według wzoru';
      }else{
        status.textContent = 'Prawie. Odpowiedz pełnym zdaniem.';
        speak.textContent = 'Powiedz jeszcze raz';
      }
      if(attempts >= 3) accept(false);
    },communicativeAnswerMatches);
  });
  setTimeout(()=>say(turn.ask),300);
}

/* ==================== M5: DETEKTYW ==================== */

/* Trzy typy zadań. Samo wskazanie i poprawienie błędu to jeszcze nie
   zaliczenie: dokument wymaga uzasadnienia, więc pełne zaliczenie daje
   dopiero wybór właściwego wyjaśnienia. */
function renderErrorHunt(stage,item){
  const prompt = make('div','prompt');
  prompt.append(make('p','ask','Znajdź błąd w zdaniu'));
  stage.append(prompt);

  const sentence = make('div','sentence-line');
  item.wrong.forEach((token,index) => {
    const word = make('button','brick',token);
    word.type = 'button';
    word.addEventListener('click',()=>pick(index,word));
    sentence.append(word);
  });
  stage.append(sentence);

  const feedback = make('p','fb','');
  stage.append(feedback);

  let found = false, attempts = 0;

  function pick(index,button){
    if(found) return;
    if(index !== item.bad){
      attempts++;
      button.classList.add('wrong');
      setTimeout(()=>button.classList.remove('wrong'),700);
      feedback.className = 'fb bad';
      feedback.textContent = 'To słowo jest w porządku. Szukaj dalej.';
      gradeIn(S.errorCards,item.id,false);
      return;
    }
    found = true;
    button.classList.add('right');
    feedback.className = 'fb good';
    feedback.textContent = 'Poprawnie powinno być: ' + item.fix;
    say(item.wrong.map((token,i)=>i===item.bad?item.fix:token).filter(t=>t!=='?').join(' '));
    setTimeout(()=>askWhy(),900);
  }

  function askWhy(){
    stage.textContent = '';
    const head = make('div','prompt');
    head.append(make('p','ask','Dlaczego tak jest?'));
    head.append(make('p','story-question',item.wrong.join(' ')+'  →  '+item.fix));
    stage.append(head);

    const options = make('div','opts wide-opts');
    const buttons = [];
    const fixed = item.wrong.map((token,i)=>i===item.bad?item.fix:token).filter(t=>t!=='?').join(' ');
    let answered = false;
    const finish = (kind,title,text,correct)=>{
      answered = true;
      [...options.children].forEach(child => child.disabled = true);
      dontKnow.remove();
      gradeIn(S.errorCards,item.id,correct && attempts === 0);
      if(correct && attempts === 0){ hits++; award('errorFixed'); }
      done++; saveProgress();
      stage.append(answerStrip(kind,title,text,nextStep));
    };
    shuffle(item.why.map((text,index)=>({text,index}))).forEach(option => {
      const button = make('button','opt text-opt',option.text);
      button.type = 'button';
      buttons[option.index] = button;
      button.addEventListener('click',()=>{
        if(answered) return;
        const correct = option.index === item.correctWhy;
        button.classList.add(correct?'right':'wrong');
        if(correct){
          finish('ok','Dobrze!','Poprawnie: '+fixed,true);
        }else{
          buttons[item.correctWhy].classList.add('right');
          noteMistake('why',item.id);
          finish('bad','Jeszcze nie.','Poprawna odpowiedź jest zaznaczona. Poprawnie: '+fixed+'. To zadanie wróci w powtórce.',false);
        }
      });
      options.append(button);
    });
    const dontKnow = dontKnowBlock(()=>{
      if(answered) return;
      buttons[item.correctWhy].classList.add('right');
      noteMistake('why',item.id);
      finish('skip','Poprawna odpowiedź jest zaznaczona.','Poprawnie: '+fixed+'. To zadanie wróci w powtórce.',false);
    });
    stage.append(options,dontKnow);
  }
}

function renderCompare(stage,item){
  const prompt = make('div','prompt');
  prompt.append(make('p','ask','Porównaj i odpowiedz pełnym zdaniem'));
  stage.append(prompt);

  const pair = make('div','compare-pair');
  [item.left,item.right].forEach(side => {
    const box = make('div','compare-side');
    box.append(make('div','big',side.icon));
    const line = make('button','story-line',side.text);
    line.type = 'button';
    line.addEventListener('click',()=>say(side.text));
    box.append(line);
    pair.append(box);
  });
  stage.append(pair);
  stage.append(make('p','story-question',item.q));

  const input = document.createElement('input');
  input.type='text'; input.className='inp'; input.placeholder='napisz jedno zdanie';
  input.autocapitalize='off'; input.autocomplete='off'; input.spellcheck=false;
  stage.append(input);

  const feedback = make('p','fb','');
  const check = make('button','next','Sprawdź');
  check.type='button';
  stage.append(feedback,check);

  let attempts = 0;
  check.addEventListener('click',()=>{
    const ok = answerCovers(input.value,item.need);
    if(ok){
      feedback.className='fb good'; feedback.textContent='Dobrze.';
      input.disabled=true; check.disabled=true;
      if(attempts===0) hits++;
      done++; saveProgress();
      say(item.model);
      clearTimeout(advanceTimer);
      advanceTimer=setTimeout(nextStep,1100);
      return;
    }
    attempts++;
    feedback.className='fb bad';
    feedback.textContent = attempts>=2 ? ('Wzór: '+item.model) : 'Wymień w zdaniu obie rzeczy, które się różnią.';
    if(attempts>=3){ input.disabled=true; check.disabled=true; done++; clearTimeout(advanceTimer); advanceTimer=setTimeout(nextStep,1600); }
  });
}

function renderOrdering(stage,item){
  const prompt = make('div','prompt');
  prompt.append(make('p','ask','Ułóż zdania w dobrej kolejności'));
  stage.append(prompt);

  const chosen = [];
  const target = item.order;
  const list = make('div','order-list');
  const bank = make('div','order-bank');
  stage.append(list,bank);

  const feedback = make('p','fb','');
  const check = make('button','next','Sprawdź');
  check.type='button'; check.disabled = true;
  stage.append(feedback,check);

  function refresh(){
    list.textContent='';
    chosen.forEach((index,position) => {
      const row = make('button','order-row',(position+1)+'. '+item.lines[index]);
      row.type='button';
      row.addEventListener('click',()=>{
        chosen.splice(position,1);
        const back = bank.querySelector('[data-index="'+index+'"]');
        if(back) back.disabled = false;
        refresh();
      });
      list.append(row);
    });
    if(!chosen.length) list.append(make('span','line-empty','Dotknij zdań poniżej'));
    check.disabled = chosen.length !== item.lines.length;
  }

  shuffle(item.lines.map((text,index)=>({text,index}))).forEach(entry => {
    const row = make('button','order-row',entry.text);
    row.type='button';
    row.dataset.index = entry.index;
    row.addEventListener('click',()=>{
      chosen.push(entry.index); row.disabled = true; refresh();
    });
    bank.append(row);
  });

  let attempts = 0;
  check.addEventListener('click',()=>{
    const ok = chosen.join(',') === target.join(',');
    if(ok){
      feedback.className='fb good'; feedback.textContent='Dobrze.';
      check.disabled=true;
      if(attempts===0) hits++;
      done++; saveProgress();
      speakSequence(target.map(index=>item.lines[index]),()=>{});
      clearTimeout(advanceTimer);
      advanceTimer=setTimeout(nextStep,1200);
      return;
    }
    attempts++;
    feedback.className='fb bad';
    const firstWrong = chosen.findIndex((value,index)=>value!==target[index]);
    feedback.textContent = attempts>=2
      ? 'Zacznij od: '+item.lines[target[0]]
      : (firstWrong>=0 ? ('Pierwsze '+firstWrong+' zdań pasuje. Dalej coś się nie zgadza.') : 'Jeszcze nie ta kolejność.');
    chosen.length=0;
    bank.querySelectorAll('.order-row').forEach(row=>row.disabled=false);
    refresh();
  });
  refresh();
}

/* ==================== EKRAN WYPRAWY ==================== */

const MAP_TILE_SIZE=256;
const MAP_MIN_ZOOM=1;
const MAP_MAX_ZOOM=6;
let journeyMapState={zoom:2,centerLat:18,centerLon:83};
let journeyMapResizeBound=false;
let journeyMapResizeTimer=null;

/* Standardowa projekcja Web Mercator używana przez OpenStreetMap. Dzięki
   niej każdy punkt szlaku leży na prawdziwych współrzędnych mapy, a nie
   na ręcznie narysowanym przybliżeniu kontynentów. */
function mapWorldPoint(lat,lon,zoom){
  const world=MAP_TILE_SIZE*Math.pow(2,zoom);
  const safeLat=Math.max(-85.05112878,Math.min(85.05112878,Number(lat)));
  const sin=Math.sin(safeLat*Math.PI/180);
  return {
    x:(Number(lon)+180)/360*world,
    y:(0.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*world
  };
}

function mapLatLon(point,zoom){
  const world=MAP_TILE_SIZE*Math.pow(2,zoom);
  const lon=(point.x/world)*360-180;
  const n=Math.PI-(2*Math.PI*point.y/world);
  return {lat:180/Math.PI*Math.atan(Math.sinh(n)),lon:((lon+540)%360)-180};
}

function fitJourneyMap(width,height){
  const safeWidth=Math.max(320,width||860);
  const safeHeight=Math.max(300,height||480);
  let chosen=MAP_MIN_ZOOM;let bounds=null;
  for(let zoom=MAP_MAX_ZOOM;zoom>=MAP_MIN_ZOOM;zoom--){
    const points=JOURNEY_STOPS.map(stop=>mapWorldPoint(stop.lat,stop.lon,zoom));
    const xs=points.map(point=>point.x);const ys=points.map(point=>point.y);
    const candidate={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
    if(candidate.maxX-candidate.minX<=safeWidth-72&&candidate.maxY-candidate.minY<=safeHeight-82){chosen=zoom;bounds=candidate;break;}
  }
  if(!bounds){
    const points=JOURNEY_STOPS.map(stop=>mapWorldPoint(stop.lat,stop.lon,chosen));
    const xs=points.map(point=>point.x);const ys=points.map(point=>point.y);
    bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  }
  const center=mapLatLon({x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2},chosen);
  journeyMapState={zoom:chosen,centerLat:center.lat,centerLon:center.lon};
}

/* Na mapie całej trasy blisko położone miasta miałyby znaczniki jeden na
   drugim. Rozsuwamy tylko same przyciski, a cienka linia nadal wskazuje ich
   prawdziwą pozycję geograficzną na podkładzie OpenStreetMap. */
function spreadJourneyMarkers(points,width,height){
  const threshold=30;
  const positions=points.map(point=>({x:point.x,y:point.y,anchorX:point.x,anchorY:point.y,fanned:false}));
  const used=new Array(points.length).fill(false);
  for(let start=0;start<points.length;start++){
    if(used[start])continue;
    const cluster=[start];used[start]=true;
    for(let cursor=0;cursor<cluster.length;cursor++){
      const origin=points[cluster[cursor]];
      for(let candidate=0;candidate<points.length;candidate++){
        if(used[candidate])continue;
        if(Math.hypot(points[candidate].x-origin.x,points[candidate].y-origin.y)<threshold){
          cluster.push(candidate);used[candidate]=true;
        }
      }
    }
    if(cluster.length<2)continue;
    const centerX=cluster.reduce((sum,index)=>sum+points[index].x,0)/cluster.length;
    const centerY=cluster.reduce((sum,index)=>sum+points[index].y,0)/cluster.length;
    const radius=cluster.length>=5?(width<500?36:45):(width<500?29:35);
    const fullCircle=cluster.length>=4;
    const spread=fullCircle?Math.PI*2:Math.PI;
    const firstAngle=fullCircle?-Math.PI/2:-Math.PI;
    cluster.forEach((pointIndex,order)=>{
      const angle=firstAngle+(fullCircle?spread*order/cluster.length:spread*order/(cluster.length-1));
      positions[pointIndex]={
        x:Math.max(24,Math.min(width-24,centerX+Math.cos(angle)*radius)),
        y:Math.max(24,Math.min(height-24,centerY+Math.sin(angle)*radius)),
        anchorX:points[pointIndex].x,anchorY:points[pointIndex].y,fanned:true
      };
    });
  }
  return positions;
}

function lockedStopMessage(position){
  const stop=JOURNEY_STOPS[position];
  const passedCount=S.passedExams.length;
  const currentSectionIndex=Math.min(passedCount,SECTIONS.length-1);
  const section=SECTIONS[currentSectionIndex];
  const collected=sectionCollected(currentSectionIndex);
  const missingWords=Math.max(0,20-collected);
  const remainingExams=Math.max(1,position-passedCount);
  const firstStep=missingWords>0
    ? 'Najpierw zbierz jeszcze '+missingWords+' '+(missingWords===1?'słowo':'słów')+' w sekcji '+(currentSectionIndex+1)+' „'+section.name+'”, a potem zdaj jej egzamin.'
    : 'Masz już 20 słów. Zdaj egzamin sekcji '+(currentSectionIndex+1)+' „'+section.name+'”.';
  const distance=remainingExams===1
    ? 'To otworzy ten przystanek.'
    : 'Liczba egzaminów pozostałych do tego miejsca: '+remainingExams+'.';
  return 'Przystanek '+(position+1)+' — '+stop.place+' jest jeszcze zablokowany. '+firstStep+' '+distance;
}

function showJourneyStopHint(position){
  const hint=$('#mapHint');
  const reached=position<=journeyIndex();
  hint.className='map-hint '+(reached?'reached':'locked');
  hint.textContent=reached
    ? 'Przystanek '+(position+1)+' — '+JOURNEY_STOPS[position].place+', '+JOURNEY_STOPS[position].country+' jest odblokowany. Jego polską i angielską opowieść znajdziesz poniżej mapy.'
    : lockedStopMessage(position);
  document.querySelectorAll('.route-marker').forEach(marker=>marker.classList.toggle('selected',Number(marker.dataset.stop)===position));
}

function renderJourneyRoute(index){
  const host=$('#journeyRouteMap');
  host.textContent='';
  const width=Math.max(320,Math.round(host.clientWidth||860));
  const height=Math.max(300,Math.round(host.clientHeight||480));
  fitJourneyMap(width,height);
  drawJourneyMap(index,width,height);
  if(!journeyMapResizeBound){
    journeyMapResizeBound=true;
    window.addEventListener('resize',()=>{
      clearTimeout(journeyMapResizeTimer);
      journeyMapResizeTimer=setTimeout(()=>{
        const mapHost=$('#journeyRouteMap');
        if(!mapHost||!$('#s-map').classList.contains('on'))return;
        fitJourneyMap(mapHost.clientWidth,mapHost.clientHeight);
        drawJourneyMap(journeyIndex(),mapHost.clientWidth,mapHost.clientHeight);
      },160);
    });
  }
}

function drawJourneyMap(index,requestedWidth,requestedHeight){
  const host=$('#journeyRouteMap');
  const width=Math.max(320,Math.round(requestedWidth||host.clientWidth||860));
  const height=Math.max(300,Math.round(requestedHeight||host.clientHeight||480));
  const zoom=journeyMapState.zoom;
  const center=mapWorldPoint(journeyMapState.centerLat,journeyMapState.centerLon,zoom);
  const left=center.x-width/2;const top=center.y-height/2;
  host.textContent='';

  const canvas=make('div','journey-map-canvas');
  host.append(canvas);

  const minTileX=Math.floor(left/MAP_TILE_SIZE);
  const maxTileX=Math.floor((left+width)/MAP_TILE_SIZE);
  const minTileY=Math.max(0,Math.floor(top/MAP_TILE_SIZE));
  const maxTileY=Math.min(Math.pow(2,zoom)-1,Math.floor((top+height)/MAP_TILE_SIZE));
  const tileStatus=make('p','map-tile-status','Do wyświetlenia mapy potrzebne jest połączenie z internetem.');
  tileStatus.hidden=true;
  let tileFailureShown=false;
  for(let tileY=minTileY;tileY<=maxTileY;tileY++){
    for(let rawTileX=minTileX;rawTileX<=maxTileX;rawTileX++){
      const tileX=((rawTileX%Math.pow(2,zoom))+Math.pow(2,zoom))%Math.pow(2,zoom);
      const tile=make('img','map-tile');
      tile.alt='';tile.draggable=false;tile.decoding='async';
      tile.src='https://tile.openstreetmap.org/'+zoom+'/'+tileX+'/'+tileY+'.png';
      tile.style.left=(rawTileX*MAP_TILE_SIZE-left)+'px';
      tile.style.top=(tileY*MAP_TILE_SIZE-top)+'px';
      tile.addEventListener('error',()=>{
        if(tileFailureShown)return;
        tileFailureShown=true;tileStatus.hidden=false;
      });
      canvas.append(tile);
    }
  }

  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('class','journey-map-overlay');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('viewBox','0 0 '+width+' '+height);
  const addLine=(className,points)=>{
    const line=document.createElementNS(ns,'polyline');line.setAttribute('class',className);
    line.setAttribute('points',points.map(point=>point.x.toFixed(1)+','+point.y.toFixed(1)).join(' '));
    svg.append(line);
  };
  const points=JOURNEY_STOPS.map(stop=>{
    const point=mapWorldPoint(stop.lat,stop.lon,zoom);
    return {x:point.x-left,y:point.y-top};
  });
  addLine('route-track',points);
  addLine('route-progress',points.slice(0,index+1));
  const markerPoints=spreadJourneyMarkers(points,width,height);
  markerPoints.forEach(point=>{
    if(!point.fanned)return;
    const leader=document.createElementNS(ns,'line');
    leader.setAttribute('class','route-leader');
    leader.setAttribute('x1',point.anchorX.toFixed(1));leader.setAttribute('y1',point.anchorY.toFixed(1));
    leader.setAttribute('x2',point.x.toFixed(1));leader.setAttribute('y2',point.y.toFixed(1));
    svg.append(leader);
  });
  canvas.append(svg);

  JOURNEY_STOPS.forEach((stop,position)=>{
    const point=markerPoints[position];
    const reached=position<=index;
    const marker=make('button','route-marker '+(reached?'reached':'locked')+(position===index?' current':''),String(position+1));
    marker.type='button';marker.dataset.stop=String(position);
    marker.style.left=point.x+'px';marker.style.top=point.y+'px';
    marker.title=stop.place+', '+stop.country;
    marker.setAttribute('aria-label',reached
      ? 'Przystanek '+(position+1)+': '+stop.place+', '+stop.country+(position===index?'. Obecne miejsce.':'. Odblokowany.')
      : 'Przystanek '+(position+1)+': '+stop.place+'. Zablokowany. Dotknij, aby sprawdzić wymagania.');
    const label=make('span','route-marker-label',stop.place);
    label.setAttribute('aria-hidden','true');
    if(point.x<110)label.classList.add('align-left');
    else if(point.x>width-110)label.classList.add('align-right');
    if(point.y<58)label.classList.add('below');
    marker.append(label);
    marker.addEventListener('click',()=>showJourneyStopHint(position));
    canvas.append(marker);
  });

  const attribution=make('div','osm-attribution');
  const attributionLink=make('a','','© OpenStreetMap contributors');
  attributionLink.href='https://www.openstreetmap.org/copyright';attributionLink.target='_blank';attributionLink.rel='noopener noreferrer';
  attribution.append(attributionLink);host.append(attribution,tileStatus);
}

function renderMap(){
  const index = journeyIndex();
  $('#mapLead').textContent = 'Jerzyk jest na przystanku ' + (index+1) + ' z ' + JOURNEY_STOPS.length +
    '. Każdy zdany egzamin przenosi go dalej.';
  $('#mapHint').className='map-hint';
  $('#mapHint').textContent='Najedź na punkt, aby zobaczyć nazwę miejsca. Dotknij go, aby sprawdzić przystanek lub warunki odblokowania.';
  renderJourneyRoute(index);
  const list = $('#mapList');
  list.textContent = '';
  JOURNEY_STOPS.forEach((stop,position) => {
    const reached = position <= index;
    const row = make('li','map-stop' + (reached ? ' reached' : '') + (position === index ? ' current' : ''));
    row.id='mapStop-'+position;
    const action=make(reached?'div':'button','map-stop-action');
    if(!reached){
      action.type='button';
      action.setAttribute('aria-label','Sprawdź, jak odblokować przystanek '+(position+1)+': '+stop.place);
      action.addEventListener('click',()=>showJourneyStopHint(position));
    }
    action.append(make('span','map-number',String(position+1)));
    const body = make('div','map-body');
    body.append(make('strong','',reached ? stop.place + ', ' + stop.country : stop.place+' — zablokowany'));
    if(reached) appendBilingualJourneyFact(body,stop);
    else body.append(make('span','map-lock-copy','Dotknij, aby sprawdzić, co trzeba zrobić.'));
    action.append(body);row.append(action);
    list.append(row);
  });

  /* Ta sama galeria jest widoczna na stronie głównej i przy mapie.
     Zdobyte odznaki otwierają opowieść, a zablokowane przypominają warunek. */
  renderBadgeGallery($('#badgeList'));
}

/* ==================== PODPIĘCIA NOWYCH EKRANÓW ==================== */

$('#breakContinue').addEventListener('click',()=>startStage());
$('#breakStop').addEventListener('click',()=>finishLearning());
function openJourneyMap(){show('map');renderMap();}
$('#openMap').addEventListener('click',openJourneyMap);
$('#mapBack').addEventListener('click',()=>goHome('progress'));

/* ==================== PULE SŁÓWEK ==================== */

/* Podgląd parsuje listę tym samym parserem co serwer, więc uczeń widzi
   dokładnie to, co zostanie zapisane, wraz z liniami do poprawy. */
function renderPoolPreview(){
  const box=$('#poolPreviewBox');
  const text=$('#poolList').value;
  if(!window.POOL_PARSER){ box.hidden=true; return; }
  const parsed=window.POOL_PARSER.parseWordList(text);
  box.hidden=false;
  box.textContent='';
  if(!parsed.entries.length){
    box.append(make('p','pool-preview-empty','Nie rozpoznano żadnego słowa. Sprawdź format: słowo - tłumaczenie.'));
    $('#poolCreate').disabled=true;
    return;
  }
  const world=currentTrack()==='world';
  box.append(make('p','pool-preview-count','Rozpoznano '+parsed.entries.length+' słów.'));
  const list=make('div','pool-preview-words');
  parsed.entries.slice(0,40).forEach(entry=>{
    const chip=make('span','pool-chip');
    if(!world){ const ic=window.POOL_PARSER.guessIcon(entry.en); chip.append(make('span','pool-chip-icon',ic)); }
    chip.append(make('span','',entry.en+' → '+entry.pl));
    list.append(chip);
  });
  box.append(list);
  if(parsed.entries.length>40) box.append(make('p','fine-print','…i '+(parsed.entries.length-40)+' więcej.'));
  if(parsed.rejected.length){
    const warn=make('div','pool-preview-rejected');
    warn.append(make('p','','Pominięto '+parsed.rejected.length+' linii:'));
    parsed.rejected.slice(0,5).forEach(r=>warn.append(make('p','pool-reject-line','linia '+r.line+': '+r.reason)));
    box.append(warn);
  }
  $('#poolCreate').disabled=false;
}

async function loadPools(){
  const listBox=$('#poolsList'), empty=$('#poolsEmpty');
  listBox.textContent='';
  try{
    const data=await api('/api/pools');
    const pools=data.pools||[];
    empty.hidden=pools.length>0;
    pools.forEach(poolItem=>{
      const card=make('div','pool-card');
      const info=make('div','pool-card-info');
      info.append(make('strong','',poolItem.name));
      info.append(make('span','pool-card-meta',poolItem.words+' słów'+(poolItem.createdBy==='teacher'?' · od nauczyciela':'')));
      card.append(info);
      const actions=make('div','pool-card-actions');
      const learn=make('button','pool-learn','Ucz się');
      learn.type='button';
      learn.disabled=poolItem.words===0;
      learn.addEventListener('click',()=>startPoolLearning(poolItem));
      const del=make('button','pool-delete','Usuń');
      del.type='button';
      del.addEventListener('click',async ()=>{
        if(!confirm('Usunąć pulę „'+poolItem.name+'”?'))return;
        try{
          await api('/api/pools/'+poolItem.id,{method:'DELETE'});
          // Usuwamy też postęp tej puli ze stanu, żeby nie zostawał sierotą.
          if(S.poolCards){
            const prefix='pool:'+poolItem.id+':';
            Object.keys(S.poolCards).forEach(key=>{ if(key.indexOf(prefix)===0) delete S.poolCards[key]; });
            saveProgress();
          }
          loadPools();
        }
        catch(problem){ toast('Nie udało się usunąć.'); }
      });
      actions.append(learn,del);
      card.append(actions);
      listBox.append(card);
    });
  }catch(problem){ empty.hidden=false; empty.textContent='Nie udało się wczytać pul.'; }
}

async function startPoolLearning(poolItem){
  if(inTestMode()){ toast('W trybie testowym pule nie są zapisywane.'); }
  try{
    const data=await api('/api/pools/'+poolItem.id);
    const words=data.words||[];
    if(!words.length){ toast('Ta pula jest pusta.'); return; }
    beginPoolSession(poolItem.id,poolItem.name,words);
  }catch(problem){ toast('Nie udało się wczytać puli.'); }
}

function openPools(){
  $('#poolName').value=''; $('#poolList').value='';
  $('#poolPreviewBox').hidden=true; $('#poolError').textContent='';
  $('#poolCreate').disabled=true;
  loadPools();
  show('pools');
}

const poolPreviewButton=$('#poolPreview');
if(poolPreviewButton) poolPreviewButton.addEventListener('click',renderPoolPreview);
// Przycisk #openPools nie istnieje od czasu zamiany 'Moje pule' na bazę słówek — openPools() zostaje jako trasa zapasowa dla starych kont z activePoolId spoza prefiksu vocab-.
const poolsBackButton=$('#poolsBack');
if(poolsBackButton) poolsBackButton.addEventListener('click',()=>goHome('learn'));

const poolCreateButton=$('#poolCreate');
if(poolCreateButton) poolCreateButton.addEventListener('click',async ()=>{
  const error=$('#poolError'); error.textContent='';
  const name=$('#poolName').value.trim();
  if(!name){ error.textContent='Podaj nazwę puli.'; $('#poolName').focus(); return; }
  if(inTestMode()){ toast('W trybie testowym pule nie są zapisywane.'); return; }
  poolCreateButton.disabled=true;
  try{
    const result=await api('/api/pools',{method:'POST',body:{
      name, track:currentTrack(), list:$('#poolList').value
    }});
    let message='Utworzono pulę „'+name+'” z '+result.pool.words+' słowami.';
    if(result.rejected && result.rejected.length) message+=' Pominięto '+result.rejected.length+' linii.';
    toast(message);
    $('#poolName').value=''; $('#poolList').value=''; $('#poolPreviewBox').hidden=true;
    loadPools();
  }catch(problem){ error.textContent=problem.message||'Nie udało się utworzyć puli.'; }
  finally{ poolCreateButton.disabled=false; }
});

/* ==================== ZADANIA PULI ==================== */

function renderPoolIntro(stage,item){
  const card=item.card;
  const box=make('div','card');
  box.append(make('p','tag','Nowe słowo z puli: '+activePoolName));
  if(card.ic&&card.ic!=='◻️') box.append(make('div','big',card.ic));
  box.append(make('div','en',card.en));
  box.append(make('div','pl',card.pl));
  const hear=make('button','hear','Posłuchaj'); hear.type='button';
  hear.addEventListener('click',()=>say(card.en));
  box.append(hear); stage.append(box);
  const next=make('button','next','Dodaję do nauki'); next.type='button';
  next.addEventListener('click',()=>{
    // Samo pokazanie słowa to nie odtworzenie z pamięci: tworzymy kartę
    // jako widzianą, ale z zerowym postępem, żeby weszła do powtórek.
    if(!S.poolCards) S.poolCards={};
    if(!poolSeen(card.id)) S.poolCards[card.id]={i:0,e:2.2,d:Date.now(),r:0,ok:0,bad:0};
    saveProgress(); nextStep();
  });
  stage.append(next);
  setTimeout(()=>say(card.en),250);
}

/* Dobrowolna próba mówienia w ścieżce Świat. Rozpoznawanie przeglądarki
   nie jest egzaminatorem wymowy: trafienie jest dodatnim dowodem, ale brak
   trafienia pozostaje nierozstrzygnięty i nigdy nie obniża wyniku karty. */
function renderPoolSpeak(stage,item){
  const card=item.card;const started=Date.now();let attempts=0;let finished=false;
  const prompt=make('div','prompt');
  prompt.append(make('p','ask','Dobrowolna praktyka mówienia'),make('div','word',card.en),make('p','pattern-pl',card.pl));
  stage.append(prompt);
  const hear=make('button','hear','🔊 Posłuchaj naturalnego wzoru');hear.type='button';hear.addEventListener('click',()=>say(card.en));stage.append(hear);
  const mic=make('div','mic');const status=make('p','mic-status','Powiedz słowo albo przejdź dalej, jak wolisz.');
  const speak=make('button','next','🎙️ Powiedz teraz');speak.type='button';
  const skip=make('button','speech-continue','Pomiń · wrócę do tego później');skip.type='button';
  mic.append(status,speak,skip);stage.append(mic);
  const finish=outcome=>{
    if(finished)return;finished=true;stopSpeech();
    recordLearningEvent({
      eventType:'task_attempt',taskId:'pool-pronunciation:'+card.id,taskType:'pronunciation',skill:'vocabulary_pronunciation',
      languageItems:[card.id],bloomLevel:'apply',cognitiveOperation:'production',modality:'speaking',outcome,
      support:{hints:0,retries:attempts,revealedAnswer:false},timing:{responseMs:Date.now()-started},
      context:{mode:'learning',source:'world-pool-pronunciation'}
    });
    clearTimeout(advanceTimer);advanceTimer=setTimeout(nextStep,outcome.status==='correct'?700:120);
  };
  skip.addEventListener('click',()=>finish({status:'inconclusive',score:null}));
  speak.addEventListener('click',()=>{
    speak.disabled=true;status.textContent='Słucham…';
    listen(card.en,result=>{
      speak.disabled=false;
      if(result.ok){mic.classList.add('good');status.textContent='Rozpoznane. Dobra robota.';speak.disabled=true;skip.hidden=true;return finish({status:'correct',score:1});}
      attempts++;
      if(result.fatal){status.textContent='Mikrofon jest niedostępny. To nie jest błąd ucznia.';speak.disabled=true;return;}
      status.textContent='Mikrofon nie był pewny. Spróbuj jeszcze raz albo idź dalej. To słowo wróci w powtórce.';
      speak.textContent='🎙️ Spróbuj ponownie';say(card.en);
    },pronunciationMatches);
  });
}

/* Wpisywanie z podpowiedziami. Podpowiedzi to inne słowa z tej samej puli. */
function renderPoolType(stage,item){
  const card=item.card;
  const others=shuffle(poolCards.filter(c=>c.id!==card.id)).slice(0,3);
  const options=shuffle([card,...others]);
  const prompt=make('div','prompt');
  prompt.append(make('p','ask','Wpisz po angielsku'));
  if(card.ic&&card.ic!=='◻️') prompt.append(make('div','big',card.ic));
  prompt.append(make('p','pattern-pl',card.pl));
  stage.append(prompt);
  const hints=make('div','hints');
  options.forEach(o=>{ const b=make('button','hint',o.en); b.type='button'; b.setAttribute('aria-label','Odsłuchaj: '+o.en); b.addEventListener('click',()=>say(o.en)); hints.append(b); });
  stage.append(hints);
  const input=document.createElement('input');
  input.type='text';input.className='inp';input.placeholder='wpisz tutaj';
  input.autocapitalize='off';input.autocomplete='off';input.spellcheck=false;input.setAttribute('autocorrect','off');
  stage.append(input);
  const fb=make('p','fb',''); stage.append(fb);
  const go=make('button','next','Sprawdź'); go.type='button'; stage.append(go);
  let attempts=0;
  function check(){
    const v=input.value.trim().toLowerCase();
    if(!v)return;
    if(v===card.en.toLowerCase()){
      fb.className='fb good';fb.textContent='Dobrze.';input.disabled=true;go.disabled=true;
      gradePool(card.id,attempts===0); if(attempts===0)hits++; done++; saveProgress(); say(card.en);
      clearTimeout(advanceTimer);advanceTimer=setTimeout(nextStep,800);return;
    }
    // Karę za błąd stosujemy RAZ, przy pierwszej pomyłce, nie przy każdej próbie.
    if(attempts===0) gradePool(card.id,false);
    attempts++; fb.className='fb bad';
    fb.textContent=attempts>=2?('Podpowiedź: zaczyna się od „'+card.en.slice(0,2)+'”'):'Jeszcze nie. Posłuchaj podpowiedzi.';
    say(card.en);
    if(attempts>=3){ fb.textContent='Poprawnie: '+card.en; input.disabled=true;go.disabled=true;done++;clearTimeout(advanceTimer);advanceTimer=setTimeout(nextStep,1600); }
  }
  go.addEventListener('click',check);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
  setTimeout(()=>input.focus(),120);
}

/* Wybór: w Szkole obrazek→słowo, w Świecie polskie→angielskie. */
function renderPoolPick(stage,item){
  const card=item.card;
  const world=currentTrack()==='world';
  const others=shuffle(poolCards.filter(c=>c.id!==card.id)).slice(0,3);
  const options=shuffle([card,...others]);
  const prompt=make('div','prompt');
  if(world||!card.ic||card.ic==='◻️'){
    prompt.append(make('p','ask','Które słowo to znaczy?'));
    prompt.append(make('p','pattern-pl',card.pl));
  }else{
    prompt.append(make('p','ask','Które słowo pasuje?'));
    prompt.append(make('div','big',card.ic));
  }
  stage.append(prompt);
  const opts=make('div','opts');
  options.forEach(o=>{
    const b=make('button','opt',o.en); b.type='button';
    b.addEventListener('click',()=>{
      [...opts.children].forEach(c=>c.disabled=true);
      const ok=o.id===card.id; b.classList.add(ok?'right':'wrong');
      if(!ok){ const right=[...opts.children].find(c=>c.textContent===card.en); if(right)right.classList.add('right'); }
      gradePool(card.id,ok); if(ok)hits++; done++; saveProgress(); say(card.en);
      clearTimeout(advanceTimer);advanceTimer=setTimeout(nextStep,ok?800:1500);
    });
    opts.append(b);
  });
  stage.append(opts);
}

/* ==================== CZASY ANGIELSKIE ==================== */

const TENSE_LIST = (window.TENSES || []);
const TENSE_ORDER_LIST = (window.TENSE_ORDER || []);
const LV = (window.LEVELS || {});
let activeTense = null, tenseDrillQueue = [], tenseDrillDone = 0, tenseDrillHits = 0;

/* Postęp czasów w S.tenses: {ok, done} per czas. Osobno od słów i pul. */
function tenseProgress(id){ return (S.tenses && S.tenses[id]) || {ok:0,done:0}; }
function assignedCefr(){ return (S.cefr&&S.cefr.level)||null; }
function unlockedCefr(){ return inTestMode()?'C2':((S.cefr&&S.cefr.unlockedLevel)||assignedCefr()||'A1'); }
function tenseAccessible(tense){ return (LV.cefrOrder?LV.cefrOrder(tense.cefr):1)<=(LV.cefrOrder?LV.cefrOrder(unlockedCefr()):1); }

function renderTensesList(){
  const host = $('#tensesList');
  host.textContent = '';
  const assigned=assignedCefr();const unlocked=unlockedCefr();const goals=new Set((S.cefr&&S.cefr.goals)||[]);
  const guidance=$('#tensesGuidance');
  if(guidance)guidance.textContent=assigned
    ? 'Twój punkt startu: '+assigned+'. Dostępny program: do '+unlocked+'. Niższe poziomy są powtórką; po zdaniu ewaluacji poziomu otworzysz kolejny.'
    : 'Bez testu możesz zacząć od A1. Test poziomujący otworzy materiał do twojego orientacyjnego poziomu i ustawi rekomendowany start.';
  const ordered=TENSE_ORDER_LIST.slice().sort((left,right)=>{
    const a=TENSE_LIST.find(item=>item.id===left),b=TENSE_LIST.find(item=>item.id===right);
    if(!a||!b)return 0;
    const goalDifference=Number(goals.has(right))-Number(goals.has(left));if(goalDifference)return goalDifference;
    if(assigned){const aStart=a.cefr===assigned?0:1,bStart=b.cefr===assigned?0:1;if(aStart!==bStart)return aStart-bStart;}
    return TENSE_ORDER_LIST.indexOf(left)-TENSE_ORDER_LIST.indexOf(right);
  });
  ordered.forEach(id => {
    const tense = TENSE_LIST.find(t => t.id === id);
    if(!tense) return;
    const prog = tenseProgress(id);
    const accessible=tenseAccessible(tense);const recommended=assigned&&tense.cefr===assigned;
    const card = make('button','tense-card'+(accessible?'':' locked')+(recommended?' recommended':'')+(goals.has(id)?' goal':''));
    card.type = 'button';
    card.setAttribute('aria-disabled',accessible?'false':'true');
    const head = make('div','tense-card-head');
    head.append(make('strong','',tense.name));
    const tags = make('span','tense-card-tags');
    tags.append(make('span','tag-cefr',tense.cefr));
    const bloom = LV.BLOOM_BY_ID ? LV.BLOOM_BY_ID[tense.bloom] : null;
    tags.append(make('span','tag-bloom',bloom?bloom.name:tense.bloom));
    head.append(tags);
    card.append(head);
    card.append(make('span','tense-card-short',tense.short));
    let meta='';
    if(!accessible)meta='🔒 Zdaj ewaluację '+unlocked+', aby odblokować';
    else if(recommended)meta='Polecany punkt startu';
    else if(assigned&&LV.cefrOrder(tense.cefr)<LV.cefrOrder(assigned))meta='Powtórka wcześniejszego poziomu';
    if(goals.has(id))meta=(meta?meta+' · ':'')+'Twój cel';
    if(prog.done>0)meta=(meta?meta+' · ':'')+prog.ok+' / '+prog.done+' za pierwszym razem';
    if(meta)card.append(make('span','tense-card-meta',meta));
    card.addEventListener('click',()=>{
      if(!accessible){toast('Najpierw sprawdź poziom '+unlocked+' w centrum poziomu.');return;}
      openTense(tense.id);
    });
    host.append(card);
  });
}

function openTense(id){
  const tense = TENSE_LIST.find(t => t.id === id);
  if(!tense) return;
  activeTense = tense;
  $('#tenseHeaderName').textContent = tense.name;
  $('#tenseCefr').textContent = tense.cefr;
  const bloom = LV.BLOOM_BY_ID ? LV.BLOOM_BY_ID[tense.bloom] : null;
  $('#tenseBloom').textContent = bloom ? bloom.name : tense.bloom;
  $('#tenseShort').textContent = tense.short;
  $('#tenseForm').textContent = tense.form;

  const ex = $('#tenseExamples'); ex.textContent = '';
  tense.examples.forEach(sentence => {
    const line = make('button','tense-example',sentence);
    line.type = 'button';
    line.addEventListener('click',()=>say(sentence));
    ex.append(line);
  });

  // Kontrast: dwa zdania różniące się tylko czasem, każde do odsłuchania.
  $('#tenseContrastPrompt').textContent = tense.contrast.prompt;
  const a = $('#tenseContrastA'), b = $('#tenseContrastB');
  a.textContent = tense.contrast.a; b.textContent = tense.contrast.b;
  a.onclick = () => say(tense.contrast.a);
  b.onclick = () => say(tense.contrast.b);
  $('#tenseContrastNote').textContent = tense.contrast.note || '';

  const deep=(S.bloom&&S.bloom[tense.id])||{};
  $('#tenseBloomStatus').textContent=(deep.evaluate?'✓ Ocena według kryterium':'○ Ocena według kryterium')+' · '+(deep.create&&deep.spoken?'✓ Własne zdanie i wymowa':'○ Własne zdanie i wymowa');

  show('tense');
}

function startTenseDrills(){
  if(!activeTense) return;
  tenseDrillQueue = activeTense.drills.slice();
  tenseDrillDone = 0; tenseDrillHits = 0;
  $('#tenseDrillName').textContent = activeTense.name;
  show('tense-drill');
  nextTenseDrill();
}

function nextTenseDrill(){
  const stage = $('#tenseDrillStage');
  stage.textContent = '';
  const total = activeTense.drills.length;
  $('#tenseDrillFill').style.width = Math.min(100,Math.round(tenseDrillDone/total*100))+'%';
  if(!tenseDrillQueue.length) return finishTenseDrills();
  const drill = tenseDrillQueue.shift();
  if(drill.type==='choose') return renderTenseChoose(stage,drill);
  if(drill.type==='fill') return renderTenseFill(stage,drill);
  return renderTenseContrast(stage,drill);
}

function drillTagRow(drill){
  const row = make('div','drill-tags');
  row.append(make('span','tag-cefr',drill.cefr));
  const bloom = LV.BLOOM_BY_ID ? LV.BLOOM_BY_ID[drill.bloom] : null;
  row.append(make('span','tag-bloom',bloom?bloom.name:drill.bloom));
  const knowledgeId=drill.knowledge||(window.PLACEMENT?window.PLACEMENT.knowledgeForBloom(drill.bloom):'factual');
  const knowledge=LV.KNOWLEDGE_BY_ID?LV.KNOWLEDGE_BY_ID[knowledgeId]:null;
  row.append(make('span','tag-knowledge',knowledge?knowledge.name:knowledgeId));
  const total=activeTense.drills.length;
  row.append(make('span','drill-count','Pytanie '+Math.min(tenseDrillDone+1,total)+' z '+total));
  return row;
}

function recordTenseResult(correct){
  if(!S.tenses) S.tenses={};
  const p = S.tenses[activeTense.id] || (S.tenses[activeTense.id]={ok:0,done:0});
  p.done++; if(correct){ p.ok++; tenseDrillHits++; }
  tenseDrillDone++;
  saveProgress();
}

function renderTenseChoose(stage,drill){
  stage.append(drillTagRow(drill));
  const prompt = make('div','prompt');
  prompt.append(make('p','ask','Wybierz poprawną formę'));
  prompt.append(make('p','tense-drill-q',drill.q));
  stage.append(prompt);
  const opts = make('div','opts');
  const feedback=make('p','fb','');
  const buttons=[];
  let attempts=0;let finished=false;let hint=null;
  const finish=(kind,title)=>{
    finished=true;[...opts.children].forEach(c=>c.disabled=true);
    dontKnow.remove();feedback.remove();if(hint)hint.remove();
    stage.append(answerStrip(kind,title,drill.why||'',nextTenseDrill));
  };
  drill.options.map((text,index)=>({text,index})).forEach(o=>{
    const b = make('button','opt text-opt',o.text); b.type='button';
    buttons[o.index]=b;
    b.addEventListener('click',()=>{
      if(finished)return;
      const correct = o.index===drill.correct;
      if(!correct){
        attempts++;b.classList.add('wrong');b.disabled=true;
        answerNote(feedback,'Jeszcze nie.','Wróć do znaczenia zdania i spróbuj jeszcze raz.');
        if(attempts>=2&&!hint&&drill.why){hint=answerHint(drill.why);feedback.after(hint);}
        return;
      }
      b.classList.add('right');
      recordTenseResult(attempts===0);
      finish('ok','Dobrze!');
    });
    opts.append(b);
  });
  const dontKnow=dontKnowBlock(()=>{
    if(finished)return;
    buttons[drill.correct].classList.add('right');
    recordTenseResult(false);tenseDrillQueue.push(drill);
    finish('skip','Poprawna odpowiedź jest zaznaczona.');
  });
  stage.append(opts,feedback,dontKnow);
}

function renderTenseFill(stage,drill){
  stage.append(drillTagRow(drill));
  const prompt = make('div','prompt');
  prompt.append(make('p','ask','Uzupełnij zdanie'));
  prompt.append(make('p','tense-drill-q',drill.q));
  stage.append(prompt);
  const input=document.createElement('input');
  input.type='text';input.className='inp';input.placeholder='wpisz formę';
  input.autocapitalize='off';input.autocomplete='off';input.spellcheck=false;input.setAttribute('autocorrect','off');
  stage.append(input);
  const fb=make('p','fb',''); stage.append(fb);
  const go=make('button','next','Sprawdź'); go.type='button'; stage.append(go);
  let attempts=0;
  function check(){
    const v=input.value.trim().toLowerCase().replace(/\s+/g,' ');
    if(!v)return;
    if(v===drill.answer.toLowerCase()){
      fb.className='fb good'; fb.textContent='Dobrze. '+(drill.why||'');
      input.disabled=true; go.disabled=true;
      recordTenseResult(attempts===0);
      clearTimeout(advanceTimer); advanceTimer=setTimeout(nextTenseDrill,1300);
      return;
    }
    attempts++;
    fb.className='fb bad';
    fb.textContent = attempts===1
      ? 'Jeszcze nie. Zwróć uwagę na czas i osobę.'
      : 'Wskazówka: '+(drill.why||activeTense.form)+' Spróbuj ponownie — poprawna forma jest potrzebna, aby przejść dalej.';
  }
  go.addEventListener('click',check);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
  setTimeout(()=>input.focus(),120);
}

function renderTenseContrast(stage,drill){
  stage.append(drillTagRow(drill));
  const prompt = make('div','prompt');
  prompt.append(make('p','ask','Kontrast dwóch czasów'));
  prompt.append(make('p','tense-drill-q',drill.prompt));
  stage.append(prompt);
  const opts = make('div','opts wide-opts');
  const feedback=make('p','fb','');let attempts=0;let finished=false;
  const buttons=[];
  const finish=(kind,title,text)=>{
    finished=true;[...opts.children].forEach(c=>c.disabled=true);
    dontKnow.remove();feedback.remove();
    stage.append(answerStrip(kind,title,text,nextTenseDrill));
  };
  [{text:drill.a,index:0},{text:drill.b,index:1}].forEach(o=>{
    const b = make('button','opt text-opt',o.text); b.type='button';
    buttons[o.index]=b;
    b.addEventListener('click',()=>{
      if(finished)return;
      const correct = o.index===drill.correct;
      if(!correct){
        attempts++;b.classList.add('wrong');b.disabled=true;
        answerNote(feedback,'Jeszcze nie.','Przeczytaj cel jeszcze raz i porównaj znaczenie obu zdań.');
        return;
      }
      b.classList.add('right');
      say(o.text);recordTenseResult(attempts===0);
      finish('ok','Dobrze!','To zdanie spełnia podany cel.');
    });
    opts.append(b);
  });
  const dontKnow=dontKnowBlock(()=>{
    if(finished)return;
    buttons[drill.correct].classList.add('right');
    recordTenseResult(false);tenseDrillQueue.push(drill);
    finish('skip','Poprawna odpowiedź jest zaznaczona.','');
  });
  stage.append(opts,feedback,dontKnow);
}

function finishTenseDrills(){
  const stage = $('#tenseDrillStage');
  stage.textContent = '';
  const done = make('div','done');
  done.append(make('h2','',activeTense.name+': gotowe'));
  done.append(make('p','',tenseDrillHits+' z '+activeTense.drills.length+' za pierwszym razem.'));
  const again = make('button','primary wide','Wróć do czasów'); again.type='button';
  again.addEventListener('click',()=>{ renderTensesList(); show('tenses'); });
  done.append(again);
  stage.append(done);
}

function openTenses(){ renderTensesList(); show('tenses'); }

// Podpięcia
const openTensesBtn=$('#openTenses');
if(openTensesBtn) openTensesBtn.addEventListener('click',openTenses);
const tensesBackBtn=$('#tensesBack');
if(tensesBackBtn) tensesBackBtn.addEventListener('click',()=>goHome('learn'));
const tenseBackBtn=$('#tenseBack');
if(tenseBackBtn) tenseBackBtn.addEventListener('click',()=>{ renderTensesList(); show('tenses'); });
const tenseStartBtn=$('#tenseStartDrills');
if(tenseStartBtn) tenseStartBtn.addEventListener('click',startTenseDrills);
const tenseDrillBackBtn=$('#tenseDrillBack');
if(tenseDrillBackBtn) tenseDrillBackBtn.addEventListener('click',()=>{ clearTimeout(advanceTimer); openTense(activeTense.id); });

/* ==================== TEST CEFR I PLAN NAUKI ==================== */
const PL=(window.PLACEMENT||{});
const PLACEMENT_BANK=PL.buildPlacementBank?PL.buildPlacementBank(TENSE_LIST):[];
const APP_AREA_LABELS=(window.AREA_LABELS)||{grammar:'gramatyka',meaning:'znaczenie',vocabulary:'słownictwo',communication:'komunikacja',reading:'czytanie'};
let placementSession=null;let placementItem=null;

function ensureCefrState(){
  if(!S.cefr)S.cefr=emptyState().cefr;
  if(!S.cefr.evaluations)S.cefr.evaluations={};
  if(!Array.isArray(S.cefr.goals))S.cefr.goals=[];
  if(!Array.isArray(S.cefr.history))S.cefr.history=[];
  return S.cefr;
}
function renderHomeLevel(){
  const state=ensureCefrState();const level=state.level;
  const badge=$('#homeCefrBadge');if(!badge)return;
  badge.textContent=level||'?';
  $('#levelHomeTitle').textContent=level?'Twój punkt startu: '+level:'Sprawdź, od czego zacząć';
  $('#homeCefrSummary').textContent=level
    ? 'Orientacyjny wynik · pewność '+(state.confidence||'średnia')+' · program otwarty do '+(state.unlockedLevel||level)+'.'
    : 'Krótki test wskaże orientacyjny poziom A1–C2. Nie jest certyfikatem CEFR.';
  $('#openPlacement').textContent=level?'Powtórz test poziomujący':'Zrób test poziomujący';
  const profileTitle=$('#profileLevelTitle');const profileCopy=$('#profileLevelCopy');
  if(profileTitle)profileTitle.textContent=level?'Orientacyjny poziom '+level:'Punkt startu nieustalony';
  if(profileCopy)profileCopy.textContent=level
    ? 'Pewność: '+(state.confidence||'średnia')+'. Dostępny program do '+(state.unlockedLevel||level)+'. W centrum poziomu możesz wybrać cele i zrobić ewaluację.'
    : 'Test orientacyjny pomaga ominąć materiał, który już znasz, i nie zamyka wcześniejszych powtórek.';
}
function areaSummaryPills(host,evidence){
  const areas=evidence&&Array.isArray(evidence.areas)?evidence.areas:[];
  if(!areas.length)return;
  // Profil sprawności CEFR: dla każdej sprawności pokazujemy jej poziom i
  // deskryptor „potrafię" z oficjalnej tabeli samooceny Rady Europy.
  areas.forEach(area=>{
    const label=(window.AREA_LABELS&&window.AREA_LABELS[area.id])||APP_AREA_LABELS[area.id]||area.id;
    const cefr=area.cefr||null;
    const card=make('div','skill-card '+(cefr?'has-level':'no-level'));
    const head=make('div','skill-card-head');
    head.append(make('strong','',label));
    head.append(make('span','skill-cefr',cefr||'—'));
    card.append(head);
    // Deskryptor can-do; funkcja z can-do.js, z bezpiecznym fallbackiem.
    const canDo=(window.canDoFor?window.canDoFor(area.id,cefr):null);
    if(canDo)card.append(make('span','skill-cando',canDo));
    card.append(make('small','skill-count',area.correct+' z '+area.asked+' zadań tej sprawności'));
    host.append(card);
  });
}
function renderLevelCenter(){
  const state=ensureCefrState();const level=state.level;const descriptor=level&&LV.CEFR_BY_ID?LV.CEFR_BY_ID[level]:null;
  $('#levelCenterBadge').textContent=level||'?';
  $('#levelResultTitle').textContent=descriptor?descriptor.name:'Test jeszcze niewykonany';
  $('#levelResultCopy').textContent=descriptor?descriptor.can:'Zaczynamy od A2 i poruszamy się schodkowo. Przy niepewnym wyniku dostaniesz dwa pytania potwierdzające.';
  $('#levelResultMeta').textContent=level
    ? ((state.correct||0)+' z '+(state.answered||0)+' odpowiedzi · pewność '+(state.confidence||'średnia')+' · dostępny program do '+(state.unlockedLevel||level))
    : 'Zakres testu: A1–C2. Wynik orientacyjny, bez deklaracji certyfikacji.';
  const savedEvidence=$('#levelEvidence');savedEvidence.textContent='';if(state.evidence)areaSummaryPills(savedEvidence,state.evidence);
  $('#levelAdaptiveStart').textContent=level?'Powtórz pełny test':'Rozpocznij test';

  const checks=$('#levelChecks');checks.textContent='';
  (PL.LEVEL_IDS||['A1','A2','B1','B2','C1','C2']).forEach(levelId=>{
    const evaluation=state.evaluations[levelId];
    const button=make('button','level-check-card'+(evaluation&&evaluation.passed?' passed':''));button.type='button';
    button.append(make('strong','',levelId));
    const info=LV.CEFR_BY_ID&&LV.CEFR_BY_ID[levelId];button.append(make('span','',info?info.can:''));
    const status=evaluation
      ? (evaluation.passed?'✓ Potwierdzony: ':'Do powtórki: ')+evaluation.correct+' / '+evaluation.total
      : '8 zadań · próg 6 / 8';
    button.append(make('span','level-check-state',status));
    button.addEventListener('click',()=>startLevelCheck(levelId));checks.append(button);
  });

  const goals=$('#learningGoals');goals.textContent='';const unlocked=state.unlockedLevel||level||'A1';const selected=new Set(state.goals);
  TENSE_ORDER_LIST.forEach(id=>{
    const tense=TENSE_LIST.find(item=>item.id===id);if(!tense)return;
    const available=LV.cefrOrder(tense.cefr)<=LV.cefrOrder(unlocked);
    const label=make('label','goal-card'+(available?'':' locked'));
    const input=document.createElement('input');input.type='checkbox';input.value=id;input.checked=selected.has(id);input.disabled=!available;
    const body=make('span','goal-card-body');body.append(make('span','goal-check','✓'));
    const copy=make('span','goal-copy');copy.append(make('strong','',tense.name),make('small','',available?tense.cefr+' · '+tense.short:'🔒 Najpierw potwierdź wcześniejszy poziom'));
    body.append(copy);label.append(input,body);
    input.addEventListener('change',()=>{
      const set=new Set(ensureCefrState().goals);if(input.checked)set.add(id);else set.delete(id);
      S.cefr.goals=[...set];saveProgress();$('#goalsStatus').textContent='Plan zapisany. Wybrane tematy pojawią się pierwsze na liście czasów.';
    });
    goals.append(label);
  });
  const goalsStatus=$('#goalsStatus');
  if(goalsStatus)goalsStatus.textContent=LV.cefrOrder(unlocked)>LV.cefrOrder('B2')
    ? 'Program czasów obejmuje obecnie A1–B2. Praktykę C1–C2 znajdziesz w pilotażowych sytuacjach zawodowych; wynik nadal jest orientacyjny.'
    : '';

  const bloomHost=$('#bloomMap');bloomHost.textContent='';const deep=S.bloom||{};
  const completedTenseSessions=TENSE_LIST.filter(tense=>tenseProgress(tense.id).done>=tense.drills.length).length;
  const evaluated=TENSE_LIST.filter(tense=>(deep[tense.id]||{}).evaluate>0).length;
  const created=TENSE_LIST.filter(tense=>(deep[tense.id]||{}).create>0&&(deep[tense.id]||{}).spoken>0).length;
  (LV.BLOOM_LEVELS||[]).forEach(item=>{
    let amount=completedTenseSessions;
    if(item.id==='evaluate')amount=evaluated;if(item.id==='create')amount=created;
    const cell=make('div','bloom-cell'+(amount?' active':'')+(amount===TENSE_LIST.length?' complete':''));
    cell.append(make('b','',item.name),make('strong','',amount+' / '+TENSE_LIST.length),make('span','',item.id==='evaluate'?'ocenionych tematów':item.id==='create'?'własnych wypowiedzi':'przećwiczonych tematów'));
    bloomHost.append(cell);
  });
  show('level-center');
}

function startAdaptivePlacement(){
  if(!PL.createAdaptiveSession||!PLACEMENT_BANK.length){toast('Test nie jest dostępny. Odśwież aplikację.');return;}
  placementSession=PL.createAdaptiveSession({track:currentTrack(),seed:Date.now()});
  $('#placementHeader').textContent='Test poziomujący';$('#placementEyebrow').textContent='Orientacyjny CEFR · A1–C2';
  $('#placementTitle').textContent='Znajdźmy dobry punkt startu';
  $('#placementIntro').textContent='Odpowiadaj samodzielnie. Gdy nie wiesz, wybierz „Nie wiem”. To daje rzetelniejszy wynik niż zgadywanie.';
  show('placement');renderPlacementQuestion();
}
function startLevelCheck(level){
  if(!PL.createLevelCheckSession||!PLACEMENT_BANK.length)return;
  placementSession=PL.createLevelCheckSession(level,{track:currentTrack(),seed:Date.now()});
  $('#placementHeader').textContent='Ewaluacja poziomu '+level;$('#placementEyebrow').textContent='Ewaluacja wiedzy · '+level;
  $('#placementTitle').textContent='Sprawdź, co już jest trwałe';
  $('#placementIntro').textContent='Osiem zadań z jednego poziomu. Potrzebujesz 6 poprawnych odpowiedzi. Wynik nie obniży wcześniejszego poziomu.';
  show('placement');renderPlacementQuestion();
}
function renderPlacementQuestion(){
  const stage=$('#placementStage');stage.textContent='';
  if(!placementSession)return renderLevelCenter();
  if(placementSession.done)return finishPlacementUi();
  placementItem=PL.itemForSession(placementSession,PLACEMENT_BANK);
  if(!placementItem){
    stage.append(make('p','fb bad','Brakuje pytań dla tego etapu. Wróć do centrum poziomu.'));return;
  }
  const answered=placementSession.answers.length;
  const blockAnswered=answered-placementSession.blockStart;
  const blockTarget=placementSession.blockTarget;
  $('#placementLevelBadge').textContent=placementSession.currentLevel;
  // Test jest adaptacyjny, więc z góry nie znamy liczby pytań. Pasek pokazuje
  // postęp bieżącego, jawnie opisanego etapu — nie udaje stałej sumy.
  $('#placementFill').style.width=Math.min(100,Math.round(blockAnswered/blockTarget*100))+'%';
  $('#placementCounter').textContent=placementSession.mode==='level'
    ? 'Pytanie '+(answered+1)+' z 8'
    : 'Poziom '+placementSession.currentLevel+' · pytanie '+(blockAnswered+1)+' z '+blockTarget+' w tym etapie · łącznie odpowiedziano: '+answered;
  const card=make('section','placement-question');
  card.append(make('span','question-area',APP_AREA_LABELS[placementItem.area]||placementItem.area));
  card.append(make('h2','',placementItem.prompt));stage.append(card);
  const options=make('div','placement-options');
  const shuffled=shuffle(placementItem.options.map((text,index)=>({text,index})));
  shuffled.forEach(option=>{
    const button=make('button','placement-option',option.text);button.type='button';
    button.addEventListener('click',()=>submitPlacementAnswer(option.index));options.append(button);
  });
  const unsure=make('button','placement-option unsure','Nie wiem — pomiń bez zgadywania');unsure.type='button';
  unsure.addEventListener('click',()=>submitPlacementAnswer(null));options.append(unsure);stage.append(options);
}
function submitPlacementAnswer(index){
  if(!placementSession||!placementItem)return;
  PL.scoreAnswer(placementSession,placementItem,index);placementItem=null;
  renderPlacementQuestion();
}
function storePlacementResult(result){
  const state=ensureCefrState();
  if(result.mode==='placement'){
    state.level=result.level;state.unlockedLevel=PL.maxLevel(state.unlockedLevel||'A1',result.level);
    state.confidence=result.confidence;state.completedAt=result.completedAt;state.correct=result.correct;state.answered=result.answered;state.evidence=result.evidence;
    state.history.push({level:result.level,confidence:result.confidence,correct:result.correct,answered:result.answered,completedAt:result.completedAt});
    state.history=state.history.slice(-10);
  }else{
    state.evaluations[result.level]={passed:result.passed,correct:result.correct,total:result.total,completedAt:result.completedAt};
    if(result.passed){
      if(!state.level)state.level=result.level;
      else state.level=PL.maxLevel(state.level,result.level);
      state.unlockedLevel=PL.maxLevel(state.unlockedLevel||'A1',PL.nextLevel(result.level));
      state.confidence=state.confidence||'średnia';state.completedAt=state.completedAt||result.completedAt;
    }
  }
  saveProgress();renderHomeLevel();
}
function finishPlacementUi(){
  const result=placementSession.result;storePlacementResult(result);
  const stage=$('#placementStage');stage.textContent='';$('#placementFill').style.width='100%';$('#placementCounter').textContent='';
  const card=make('section','placement-result');const head=make('div','placement-result-head');
  const badge=make('span','cefr-badge hero',result.level);head.append(badge);
  const title=make('div');title.append(make('p','eyebrow',result.mode==='placement'?'Orientacyjny punkt startu':'Ewaluacja poziomu'));
  title.append(make('h2','',result.mode==='placement'?(result.level+' · '+(LV.CEFR_BY_ID[result.level]||{}).name.split(' · ').slice(1).join(' · ')):(result.passed?'Poziom '+result.level+' potwierdzony':'Poziom '+result.level+' wymaga jeszcze pracy')));head.append(title);card.append(head);
  if(result.mode==='placement'){
    card.append(make('p','',result.foundationNeedsWork?'Zaczniemy od fundamentów A1. To nie ocena, tylko najbezpieczniejszy punkt startu.':'Program nie każe ci zaczynać od zera. Materiał do '+result.level+' jest dostępny, a niższe poziomy możesz traktować jako powtórkę.'));
    card.append(make('p','level-result-meta','Pewność wyniku: '+result.confidence+' · '+result.correct+' z '+result.answered+' odpowiedzi.'));
  }else{
    card.append(make('p','',result.passed?'Masz co najmniej 6 z 8 poprawnych odpowiedzi. Otworzyliśmy następny poziom programu.':'Wynik '+result.correct+' z '+result.total+'. Wybierz wskazane obszary do nauki i wróć do ewaluacji później.'));
  }
  card.append(make('p','evidence-caption','Poprawne odpowiedzi na każdym poziomie'));
  const evidence=make('div','evidence-grid');
  Object.entries(result.evidence.levels||{}).filter(([,value])=>value.asked).forEach(([level,value])=>{
    const box=make('div','evidence-item '+(value.correct>=value.asked?'full':(value.correct*2>=value.asked?'part':'low')));box.append(make('b','',value.correct+' / '+value.asked),make('span','','poziom '+level));evidence.append(box);
  });
  card.append(evidence);const areas=make('div','area-list');areaSummaryPills(areas,result.evidence);card.append(areas);
  const back=make('button','primary wide','Przejdź do planu nauki');back.type='button';back.addEventListener('click',renderLevelCenter);card.append(back);
  const again=make('button','secondary wide',result.mode==='placement'?'Powtórz test':'Powtórz ewaluację');again.type='button';again.addEventListener('click',()=>result.mode==='placement'?startAdaptivePlacement():startLevelCheck(result.level));card.append(again);
  card.append(make('p','fine-print','To orientacyjne przypisanie w zakresie A1–C2, a nie certyfikowany pomiar CEFR. Test nie ocenia głębokości Blooma.'));
  stage.append(card);
}

/* ==================== PRACOWNIA: EWALUACJA I TWORZENIE ==================== */
const BLOOM_DATA=window.BLOOM_LAB||{};let bloomLabStep='evaluate';
function bloomRecord(){
  if(!S.bloom)S.bloom={};
  return S.bloom[activeTense.id]||(S.bloom[activeTense.id]={evaluate:0,create:0,spoken:0,reflection:''});
}
function bloomTagRow(stage,process,knowledge,cefr){
  const row=make('div','bloom-task-tags');const bloom=LV.BLOOM_BY_ID&&LV.BLOOM_BY_ID[process];const kind=LV.KNOWLEDGE_BY_ID&&LV.KNOWLEDGE_BY_ID[knowledge];
  row.append(make('span','tag-cefr',cefr),make('span','tag-bloom',bloom?bloom.name:process),make('span','tag-knowledge',kind?kind.name:knowledge));stage.append(row);
}
function openBloomLab(){
  if(!activeTense||!BLOOM_DATA.BLOOM_LAB_TASKS||!BLOOM_DATA.BLOOM_LAB_TASKS[activeTense.id]){toast('To zadanie nie jest jeszcze dostępne.');return;}
  bloomLabStep='evaluate';$('#bloomLabHeader').textContent=activeTense.name+' · Pracownia';show('bloom-lab');renderBloomEvaluation();
}
function renderBloomEvaluation(){
  const task=BLOOM_DATA.BLOOM_LAB_TASKS[activeTense.id].evaluate;const stage=$('#bloomLabStage');stage.textContent='';$('#bloomLabFill').style.width='50%';
  const card=make('section','bloom-task-card');const head=make('div','bloom-task-head');const title=make('div');title.append(make('p','eyebrow','Krok 1 z 2'),make('h1','','Oceń według kryterium'));head.append(title);bloomTagRow(head,'evaluate',task.knowledge||'procedural',task.cefr);card.append(head);
  card.append(make('p','criterion-box','Kryterium: '+task.criterion),make('p','creation-prompt',task.prompt));
  const choices=make('div','bloom-choices');const feedback=make('p','fb','');let chosenCorrect=false;
  task.options.forEach((text,index)=>{
    const button=make('button','bloom-choice',text);button.type='button';
    button.addEventListener('click',()=>{
      if(chosenCorrect)return;const correct=index===task.answer;
      if(!correct){button.classList.add('wrong');feedback.className='fb bad';feedback.textContent='Ta odpowiedź nie spełnia podanego kryterium. Porównaj znaczenie i spróbuj ponownie.';return;}
      chosenCorrect=true;button.classList.add('right');feedback.className='fb good';feedback.textContent='Dobra decyzja. Teraz ją uzasadnij.';renderReasons();
    });choices.append(button);
  });
  card.append(choices,feedback);const reasonHost=make('div','reason-panel');reasonHost.hidden=true;card.append(reasonHost);stage.append(card);
  function renderReasons(){
    reasonHost.hidden=false;reasonHost.append(make('h3','','Dlaczego ta odpowiedź jest lepsza?'));const list=make('div','bloom-choices');const reasonFeedback=make('p','fb','');
    task.reasons.forEach((text,index)=>{
      const button=make('button','bloom-choice',text);button.type='button';button.addEventListener('click',()=>{
        if(index!==task.reason){button.classList.add('wrong');reasonFeedback.className='fb bad';reasonFeedback.textContent='To uzasadnienie nie korzysta z podanego kryterium. Spróbuj ponownie.';return;}
        button.classList.add('right');[...list.children].forEach(item=>item.disabled=true);reasonFeedback.className='fb good';reasonFeedback.textContent='Dobrze: decyzja i uzasadnienie są zgodne z kryterium.';
        const record=bloomRecord();record.evaluate++;saveProgress();
        const next=make('button','primary wide','Stwórz własne zdanie');next.type='button';next.addEventListener('click',renderBloomCreation);reasonHost.append(next);
      });list.append(button);
    });reasonHost.append(list,reasonFeedback);
  }
}
function renderBloomCreation(){
  bloomLabStep='create';const task=BLOOM_DATA.BLOOM_LAB_TASKS[activeTense.id].create;const stage=$('#bloomLabStage');stage.textContent='';$('#bloomLabFill').style.width='100%';
  const card=make('section','bloom-task-card');const head=make('div','bloom-task-head');const title=make('div');title.append(make('p','eyebrow','Krok 2 z 2'),make('h1','','Stwórz własną wypowiedź'));head.append(title);bloomTagRow(head,'create','metacognitive',task.cefr);card.append(head);
  card.append(make('p','creation-prompt',task.prompt),make('p','creation-support',task.support));
  const input=document.createElement('textarea');input.className='creation-input';input.rows=5;input.placeholder='Napisz własne zdanie po angielsku…';input.spellcheck=false;card.append(input);
  const checkButton=make('button','primary wide','Sprawdź mój szkic');checkButton.type='button';card.append(checkButton);
  const checks=make('div','creation-checks');const feedback=make('p','fb','');card.append(checks,feedback);const continuation=make('div','');card.append(continuation);stage.append(card);
  checkButton.addEventListener('click',()=>{
    checks.textContent='';continuation.textContent='';const report=BLOOM_DATA.inspectCreation(input.value,task);
    report.checks.forEach(item=>{const row=make('div','creation-check'+(item.ok?' ok':''),(item.ok?'✓ ':'○ ')+item.label);checks.append(row);});
    if(!report.passed){feedback.className='fb bad';feedback.textContent='Szkic jest blisko. Popraw niezaznaczone kryteria — system nie poda gotowej odpowiedzi.';return;}
    feedback.className='fb good';feedback.textContent='Zdanie ma wszystkie potrzebne części. Ostatni sąd należy do ciebie: czy brzmi naturalnie?';renderReflection(continuation,report.text);
  });
}
function renderReflection(host,sentence){
  const box=make('section','reflection-box');box.append(make('h3','','Co pomogło ci zbudować to zdanie?'));
  const list=make('div','reflection-options');const choices=['słowo-sygnał','wzór budowy','porównanie z innym czasem','przeczytanie na głos'];let selected='';
  choices.forEach(text=>{const button=make('button','reflection-option',text);button.type='button';button.addEventListener('click',()=>{selected=text;[...list.children].forEach(item=>item.classList.toggle('selected',item===button));speechButton.disabled=false;});list.append(button);});box.append(list);
  const speech=make('section','own-speech');speech.append(make('h3','','Przeczytaj własne zdanie'));
  speech.append(make('p','',hasSpeechRecognition?'Najpierw możesz posłuchać naturalnego wzoru. Potem przeczytaj dokładnie swoją wypowiedź.':'Sprawdzanie wymowy wymaga Chrome z dostępem do mikrofonu.'));
  const hear=make('button','hear','🔊 Posłuchaj');hear.type='button';hear.addEventListener('click',()=>speakSentence(sentence));speech.append(hear);
  const status=make('p','mic-status','Wybierz najpierw strategię autokontroli.');speech.append(status);
  const speechButton=make('button','primary wide',inTestMode()?'Zalicz w trybie testowym':'🎙️ Przeczytaj na głos');speechButton.type='button';speechButton.disabled=true;
  const speechContinue=make('button','speech-continue','Zakończ · wymowę powtórzę później');speechContinue.type='button';speechContinue.hidden=true;
  let speechAttempts=0;
  speechButton.addEventListener('click',()=>{
    if(!selected)return;
    if(inTestMode()){speechButton.disabled=true;return finishOwnSentence(selected,sentence,status,true);}
    if(!hasSpeechRecognition){status.textContent='Ta przeglądarka nie sprawdzi wymowy. Możesz zakończyć, a wypowiedź pozostanie do powtórki.';speechContinue.hidden=false;return;}
    speechButton.disabled=true;status.textContent='Słucham…';
    listen(sentence,result=>{
      speechButton.disabled=false;
      if(!result.ok){
        speechAttempts++;
        status.textContent=result.fatal
          ? (result.msg||'Mikrofon jest niedostępny.')+' Możesz zakończyć i wrócić do wymowy później.'
          : (speechAttempts>=MAX_SPEECH_GATE_ATTEMPTS?'Mikrofon nadal nie ma pewności. Spróbuj ponownie albo zakończ i wróć do wymowy później.':'Posłuchaj wzoru i spróbuj jeszcze raz.');
        if(result.fatal)speechButton.disabled=true;
        if(result.fatal||speechAttempts>=MAX_SPEECH_GATE_ATTEMPTS)speechContinue.hidden=false;
        return;
      }
      speechButton.disabled=true;speechContinue.hidden=true;finishOwnSentence(selected,sentence,status,true);
    },sentencePronunciationMatches);
  });
  speechContinue.addEventListener('click',()=>{
    stopSpeech();speechContinue.disabled=true;speechButton.disabled=true;
    finishOwnSentence(selected,sentence,status,false);
  });
  speech.append(speechButton,speechContinue);box.append(speech);host.append(box);
}
function finishOwnSentence(reflection,sentence,status,speechVerified=true){
  const record=bloomRecord();record.create++;if(speechVerified)record.spoken++;record.reflection=reflection;saveProgress();status.textContent=speechVerified
    ? '✓ Własna wypowiedź została napisana, sprawdzona i przeczytana.'
    : 'Wypowiedź została napisana i sprawdzona. Wymowa pozostaje do powtórki.';
  const stage=$('#bloomLabStage');const done=make('div','done');done.append(make('div','done-mark','✓'),make('h2','',activeTense.name+': pełny cykl Blooma'));
  if(!speechVerified)done.querySelector('h2').textContent=activeTense.name+': wymowa do powtórki';
  done.append(make('p','',sentence));
  // Ostatni krok metapoznania: uczeń sam ocenia, czy użyłby zdania w rozmowie.
  // To nie zmienia zaliczenia, tylko domyka świadomą autokontrolę.
  const selfCheck=make('div','self-check');
  selfCheck.append(make('p','self-check-q','Czy użyłbyś tego zdania w prawdziwej rozmowie?'));
  const scRow=make('div','self-check-row');
  const back=make('button','primary wide','Wróć do czasu');back.type='button';back.addEventListener('click',()=>openTense(activeTense.id));
  [['Tak, brzmi naturalnie','yes'],['Jeszcze nad nim popracuję','no']].forEach(([label,val])=>{
    const b=make('button','self-check-option',label);b.type='button';
    b.addEventListener('click',()=>{
      [...scRow.children].forEach(x=>x.classList.remove('selected'));b.classList.add('selected');
      const rec=bloomRecord();rec.selfNatural=val;saveProgress();
      back.hidden=false;
    });
    scRow.append(b);
  });
  selfCheck.append(scRow);done.append(selfCheck);
  back.hidden=true;
  done.append(back);stage.append(done);window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
}

const openPlacementButton=$('#openPlacement');if(openPlacementButton)openPlacementButton.addEventListener('click',startAdaptivePlacement);
const openLevelCenterButton=$('#openLevelCenter');if(openLevelCenterButton)openLevelCenterButton.addEventListener('click',renderLevelCenter);
const profileOpenLevelCenterButton=$('#profileOpenLevelCenter');if(profileOpenLevelCenterButton)profileOpenLevelCenterButton.addEventListener('click',renderLevelCenter);
const levelAdaptiveButton=$('#levelAdaptiveStart');if(levelAdaptiveButton)levelAdaptiveButton.addEventListener('click',startAdaptivePlacement);
const levelCenterBackButton=$('#levelCenterBack');if(levelCenterBackButton)levelCenterBackButton.addEventListener('click',()=>goHome('progress'));
const placementBackButton=$('#placementBack');if(placementBackButton)placementBackButton.addEventListener('click',()=>{placementSession=null;renderLevelCenter();});
const tenseBloomButton=$('#tenseStartBloom');if(tenseBloomButton)tenseBloomButton.addEventListener('click',openBloomLab);
const bloomBackButton=$('#bloomLabBack');if(bloomBackButton)bloomBackButton.addEventListener('click',()=>{stopSpeech();openTense(activeTense.id);});

/* ==================== SYTUACJE BIZNESOWE (Świat, B2-C2) ==================== */

const BUSINESS_LIST = (window.BUSINESS_SITUATIONS || []);
let activeBusiness = null, businessTurn = 0, businessHits = 0;

function businessRecord(id){ if(!S.business)S.business={}; return S.business[id]||(S.business[id]={done:0,ok:0}); }
function businessAvailable(situation){
  const unlocked=unlockedCefr();
  return window.BUSINESS_MATCHING&&window.BUSINESS_MATCHING.isAvailable
    ? window.BUSINESS_MATCHING.isAvailable(situation.cefr,unlocked)
    : LV.cefrAtOrAbove(unlocked,situation.cefr);
}

function renderBusinessList(){
  const host = $('#businessList'); host.textContent = '';
  BUSINESS_LIST.forEach(situation => {
    const rec = (S.business&&S.business[situation.id])||{done:0,ok:0};
    const available=businessAvailable(situation);
    const card = make('button','business-card'+(available?'':' locked')); card.type='button';
    const head = make('div','business-card-head');
    head.append(make('strong','',situation.title));
    const tags = make('span','business-card-tags');
    tags.append(make('span','tag-cefr',situation.cefr));
    const bloom = LV.BLOOM_BY_ID ? LV.BLOOM_BY_ID[situation.bloom] : null;
    tags.append(make('span','tag-bloom',bloom?bloom.name:situation.bloom));
    head.append(tags); card.append(head);
    card.append(make('span','business-card-context',situation.context));
    if(rec.done>0){
      const label=window.BUSINESS_MATCHING&&window.BUSINESS_MATCHING.progressLabel
        ? window.BUSINESS_MATCHING.progressLabel(rec)
        : 'Przećwiczone '+rec.done+' razy · '+rec.ok+' odpowiedzi za pierwszym razem łącznie';
      card.append(make('span','business-card-meta',label));
    }
    if(!available)card.append(make('span','business-card-lock','🔒 Wymaga poziomu '+situation.cefr+' · dotknij, aby sprawdzić drogę odblokowania'));
    card.addEventListener('click',()=>{
      if(available)return startBusiness(situation.id);
      toast('Ta sytuacja wymaga poziomu '+situation.cefr+'. Zrób test albo ewaluację wcześniejszego poziomu.');
      renderLevelCenter();
    });
    host.append(card);
  });
}

function startBusiness(id){
  const situation = BUSINESS_LIST.find(s => s.id === id);
  if(!situation) return;
  if(!businessAvailable(situation)){
    toast('Najpierw odblokuj poziom '+situation.cefr+'.');
    return renderLevelCenter();
  }
  activeBusiness = situation; businessTurn = 0; businessHits = 0;
  $('#businessRunName').textContent = situation.title;
  show('business-run'); renderBusinessTurn();
}

function renderBusinessTurn(){
  const stage = $('#businessStage'); stage.textContent = '';
  const situation = activeBusiness;
  $('#businessFill').style.width = Math.round(businessTurn/situation.turns.length*100)+'%';
  if(businessTurn >= situation.turns.length) return finishBusiness();
  const turn = situation.turns[businessTurn];

  const card = make('div','card dialogue-card');
  const bloom = LV.BLOOM_BY_ID ? LV.BLOOM_BY_ID[turn.bloom] : null;
  const tags = make('div','drill-tags');
  tags.append(make('span','tag-cefr',turn.cefr));
  tags.append(make('span','tag-bloom',bloom?bloom.name:turn.bloom));
  card.append(tags);
  if(businessTurn === 0) card.append(make('p','dialogue-intro',situation.intro));
  card.append(make('p','dialogue-ask',turn.ask));
  const replay = make('button','hear','🔊 Posłuchaj pytania'); replay.type='button';
  replay.addEventListener('click',()=>say(turn.ask));
  card.append(replay); stage.append(card);

  const mic = make('div','mic');
  const status = make('p','mic-status',turn.pl);
  const speak = make('button','next',inTestMode()?'Zalicz w trybie testowym':'🎙️ Odpowiedz na głos'); speak.type='button';
  const heard = make('p','heard','');
  const skip = make('button','speech-continue','Wpisz zamiast mówić'); skip.type='button'; skip.hidden=true;
  mic.append(status,speak,heard,skip); stage.append(mic);

  function accept(scored){
    const rec = businessRecord(situation.id);
    if(businessTurn === situation.turns.length-1) rec.done++;
    if(scored){ rec.ok++; businessHits++; }
    saveProgress(); businessTurn++;
    clearTimeout(advanceTimer); advanceTimer=setTimeout(renderBusinessTurn,900);
  }

  function offerTyping(){
    speak.hidden=true; skip.hidden=true;
    const input=document.createElement('input');
    input.type='text';input.className='inp';input.placeholder='odpowiedz pełnym zdaniem';
    input.autocapitalize='off';input.autocomplete='off';input.spellcheck=false;
    const check=make('button','next','Sprawdź'); check.type='button';
    stage.append(input,check);
    check.addEventListener('click',()=>{
      const ok=answerCovers(input.value,turn.need)&&answerAvoids(input.value,turn.avoid);
      status.textContent=ok?'Dobrze.':'Wzór: '+turn.model;
      input.disabled=true;check.disabled=true;accept(ok);
    });
    setTimeout(()=>input.focus(),120);
  }

  if(!hasSpeechRecognition){ status.textContent='Mikrofon niedostępny, więc wpisz odpowiedź.'; offerTyping(); return; }

  let attempts=0;
  speak.addEventListener('click',()=>{
    if(inTestMode()){ speak.disabled=true; return accept(true); }
    speak.disabled=true; status.textContent='Słucham…'; heard.textContent='';
    listen(turn,result=>{
      speak.disabled=false;
      const said=result.raw||'';
      const shown=said&&!containsBlockedWord(said)?said:'';
      const ok=result.ok;
      if(result.fatal){ status.textContent=result.msg||'Mikrofon jest niedostępny.'; skip.hidden=false; skip.addEventListener('click',offerTyping); return; }
      if(ok){ mic.classList.add('good'); status.textContent='Dobra odpowiedź.'; heard.textContent=shown?'Usłyszałem: '+shown:''; speak.textContent='Zaliczone'; speak.disabled=true; return accept(attempts===0); }
      attempts++;
      heard.textContent=shown?'Usłyszałem: '+shown:'';
      if(attempts>=2){ status.textContent='Wzór: '+turn.model; say(turn.model); skip.hidden=false; skip.addEventListener('click',()=>accept(false)); }
      else status.textContent='Prawie. Odpowiedz pełnym, naturalnym zdaniem.';
    },communicativeAnswerMatches);
  });
  setTimeout(()=>say(turn.ask),300);
}

function finishBusiness(){
  const stage=$('#businessStage'); stage.textContent='';
  const done=make('div','done');
  done.append(make('div','done-mark','✓'),make('h2','',activeBusiness.title+': gotowe'));
  done.append(make('p','',businessHits+' z '+activeBusiness.turns.length+' odpowiedzi za pierwszym razem.'));
  // FLOW: następna sytuacja jako jasny krok naprzód, nie tylko powrót.
  const idx=BUSINESS_LIST.findIndex(s=>s.id===activeBusiness.id);
  const nextSit=BUSINESS_LIST.slice(idx+1).find(businessAvailable);
  if(nextSit){
    const next=make('button','primary wide','Następna sytuacja → '+nextSit.title); next.type='button';
    next.addEventListener('click',()=>startBusiness(nextSit.id)); done.append(next);
  }
  const back=make('button','secondary wide','Wróć do listy'); back.type='button';
  back.addEventListener('click',()=>{ renderBusinessList(); show('business'); }); done.append(back);
  stage.append(done);
}

function openBusiness(){ renderBusinessList(); show('business'); }

const openBusinessBtn=$('#openBusiness');
if(openBusinessBtn)openBusinessBtn.addEventListener('click',openBusiness);
const businessBackBtn=$('#businessBack');
if(businessBackBtn)businessBackBtn.addEventListener('click',()=>goHome('learn'));
const businessRunBackBtn=$('#businessRunBack');
if(businessRunBackBtn)businessRunBackBtn.addEventListener('click',()=>{clearTimeout(advanceTimer);stopSpeech();renderBusinessList();show('business');});

/* ==================== BIBLIOTEKA: HISTORYJKI, DIALOGI, DETEKTYW ====================
   Druga blokada z planu domknięcia: te moduły działały tylko losowo w sesji
   mieszanej. Teraz każdy ma własny kafelek i listę, więc uczeń rozumie program
   i może wrócić celowo. Otwarty → lista; zamknięty → jasny warunek. */

let moduleReturn=null;
function moduleStage(){ const host=$('#moduleRunStage'); host.textContent=''; return host; }
(function bindModuleBack(){ const b=$('#moduleRunBack'); if(b)b.addEventListener('click',()=>{clearTimeout(advanceTimer);stopSpeech();if(moduleReturn)moduleReturn();}); })();

function moduleListItem(title, meta, done, onClick, locked){
  const card=make('button','module-list-item'+(locked?' locked':'')); card.type='button';
  if(locked) card.disabled=true;
  const head=make('div','module-list-head');
  head.append(make('strong','',title));
  if(done) head.append(make('span','module-list-done','✓ przećwiczone'));
  card.append(head);
  if(meta) card.append(make('span','module-list-meta',meta));
  if(!locked) card.addEventListener('click',onClick);
  return card;
}

/* ---- Historyjki ---- */
function openStoriesLibrary(){
  const open=unlockedModules();
  if(!open.stories){ toast('Historyjki otworzą się po zebraniu 25 słów i ułożeniu 5 zdań. Zabieram Cię do słów.'); goHome('learn'); return; }
  const host=$('#storiesList'); host.textContent='';
  contentInOrder(STORY_LIST).forEach(story=>{
    const rec=S.stories[story.id]||{done:0,ok:0};
    const open=contentAvailable(story);
    host.append(moduleListItem(story.title, open ? story.text.length+' zdań'+(rec.done?' · '+rec.ok+' pyt. dobrze':'') : contentLockText(story), open&&rec.done>0, ()=>{
      moduleReturn=()=>openStoriesLibrary();
      $('#moduleRunName').textContent='Historyjka'; show('module-run');
      renderStory(moduleStage(), story);
    }, !open));
  });
  show('stories');
}

/* ---- Dialogi ---- */
function openDialoguesLibrary(){
  const open=unlockedModules();
  if(!open.dialogues){ toast('Dialogi otworzą się po zebraniu 40 słów i ułożeniu 12 zdań. Zabieram Cię do słów.'); goHome('learn'); return; }
  const host=$('#dialoguesList'); host.textContent='';
  contentInOrder(DIALOGUE_LIST).forEach(dialogue=>{
    const rec=S.dialogues[dialogue.id]||{done:0,ok:0};
    const open=contentAvailable(dialogue);
    host.append(moduleListItem(dialogue.title, open ? dialogue.turns.length+' tur'+(rec.done?' · przećwiczone':'') : contentLockText(dialogue), open&&rec.done>0, ()=>{
      moduleReturn=()=>openDialoguesLibrary();
      $('#moduleRunName').textContent=dialogue.title; show('module-run');
      renderDialogue(moduleStage(), dialogue, 0);
    }, !open));
  });
  show('dialogues');
}

/* ---- Detektyw ---- */
function openDetectiveLibrary(){
  const open=unlockedModules();
  if(!open.detective){ toast('Detektyw otworzy się po ułożeniu 20 zdań albo popełnieniu 6 własnych błędów do poprawy. Zabieram Cię do zdań.'); goHome('learn'); return; }
  const host=$('#detectiveList'); host.textContent='';
  const queue=detectiveQueue(8);
  if(!queue.length){ host.append(make('p','module-list-meta','Brak nowych błędów do analizy. Wróć po kolejnej sesji zdań.')); show('detective'); return; }
  queue.forEach((item,i)=>{
    host.append(moduleListItem('Zadanie '+(i+1), item.mode==='error'?'znajdź i popraw błąd':'analiza', false, ()=>{
      moduleReturn=()=>openDetectiveLibrary();
      $('#moduleRunName').textContent='Detektyw'; show('module-run');
      if(item.mode==='error') renderErrorHunt(moduleStage(), item.item);
      else { const st=moduleStage(); st.textContent=''; if(typeof renderChoice==='function') renderChoice(st,item); }
    }));
  });
  show('detective');
}

// Podpięcia kafelków i przycisków powrotu
[['#openStories',openStoriesLibrary],['#openDialogues',openDialoguesLibrary],['#openDetective',openDetectiveLibrary],
 ['#storiesBack',()=>goHome('learn')],['#dialoguesBack',()=>goHome('learn')],['#detectiveBack',()=>goHome('learn')]
].forEach(([sel,fn])=>{ const el=$(sel); if(el) el.addEventListener('click',fn); });

/* ==================== KOLOKACJE BIZNESOWE (Świat, B2-C2) ==================== */

const COLLOCATION_LIST = (window.COLLOCATION_SETS || []);

function openCollocations(){ renderCollocationSets(); show('collocations'); }

function renderCollocationSets(){
  const host = $('#collocationSets'); host.textContent = '';
  COLLOCATION_LIST.forEach(set => {
    const card = make('button','collocation-set-card'); card.type='button';
    const head = make('div','collocation-set-head');
    head.append(make('strong','',set.title));
    head.append(make('span','tag-cefr',set.cefr));
    card.append(head);
    card.append(make('span','collocation-set-meta',set.words.length+' słów · '+set.words.reduce((n,w)=>n+w.goes.length,0)+' połączeń'));
    card.addEventListener('click',()=>openCollocationSet(set.id));
    host.append(card);
  });
}

function openCollocationSet(id){
  const set = COLLOCATION_LIST.find(s => s.id === id);
  if(!set) return;
  $('#collocationSetName').textContent = set.title;
  const host = $('#collocationWords'); host.textContent = '';
  set.words.forEach(entry => {
    const card = make('div','collocation-card');
    const head = make('div','collocation-word-head');
    head.append(make('strong','collocation-word',entry.word));
    head.append(make('span','tag-cefr',entry.cefr));
    const say1 = make('button','collocation-say','🔊'); say1.type='button';
    say1.setAttribute('aria-label','Posłuchaj: '+entry.word);
    say1.addEventListener('click',()=>say(entry.word.replace(/^to /,'')));
    head.append(say1);
    card.append(head);
    card.append(make('span','collocation-pl',entry.pl));

    // Naturalne połączenia — sedno nauki na tym poziomie.
    const goesBox = make('div','collocation-goes');
    goesBox.append(make('span','collocation-goes-label','Chodzi z:'));
    entry.goes.forEach(g => {
      const chip = make('button','collocation-chip',g); chip.type='button';
      chip.addEventListener('click',()=>say(g));
      goesBox.append(chip);
    });
    card.append(goesBox);

    // Przykład w kontekście.
    const ex = make('button','collocation-example',entry.example); ex.type='button';
    ex.addEventListener('click',()=>say(entry.example));
    card.append(ex);

    // Częsty błąd — to odróżnia poprawne od naturalnego.
    const pit = make('div','collocation-pitfall');
    pit.append(make('span','collocation-pitfall-label','Uwaga: '));
    pit.append(document.createTextNode(entry.pitfall));
    card.append(pit);

    host.append(card);
  });
  show('collocation-set');
}

const openCollocationsBtn=$('#openCollocations');
if(openCollocationsBtn)openCollocationsBtn.addEventListener('click',openCollocations);
const collocationsBackBtn=$('#collocationsBack');
if(collocationsBackBtn)collocationsBackBtn.addEventListener('click',()=>goHome('learn'));
const collocationSetBackBtn=$('#collocationSetBack');
if(collocationSetBackBtn)collocationSetBackBtn.addEventListener('click',()=>{renderCollocationSets();show('collocations');});

/* ==================== BAZA SŁÓWEK TEMATYCZNYCH ==================== */

const VOCAB_LIST = (window.VOCAB_DOMAINS || []);

// Ile słów dziedziny uczeń już ćwiczył (postęp zapisany pod kluczem pool:domena:słowo).
function domainProgress(domain){
  if(!S.poolCards) return 0;
  let learned=0;
  domain.words.forEach(w=>{
    const key='pool:vocab-'+domain.id+':'+w.en.toLowerCase();
    if(S.poolCards[key]) learned++;
  });
  return learned;
}

// Dziedzina odblokowana, jeśli jest pierwsza, albo poprzednią opanowano
// w co najmniej 70%. To realizuje "dziedziny jak poziomy".
function domainUnlocked(index){
  if(index===0) return true;
  const prev=VOCAB_LIST[index-1];
  return domainProgress(prev) >= Math.ceil(prev.words.length*0.7);
}

function openVocabBase(){ renderVocabDomains(); show('vocab-base'); }

function renderVocabDomains(){
  const host=$('#vocabDomains'); host.textContent='';
  VOCAB_LIST.forEach((domain,index)=>{
    const unlocked=domainUnlocked(index);
    const learned=domainProgress(domain);
    const mastered=unlocked&&learned>=Math.ceil(domain.words.length*0.7);
    const card=make('button','vocab-domain-card'+(unlocked?'':' locked')+(mastered?' mastered':'')); card.type='button';
    const head=make('div','vocab-domain-head');
    const dot=make('span','vocab-domain-dot');
    dot.classList.add(unlocked?(learned>=Math.ceil(domain.words.length*0.7)?'done':'open'):'shut');
    head.append(dot);
    head.append(make('strong','',domain.title));
    card.append(head);
    card.append(make('span','vocab-domain-intro',domain.intro));
    if(unlocked){
      card.append(make('span','vocab-domain-meta',learned+' / '+domain.words.length+' słów przećwiczonych'));
      card.addEventListener('click',()=>startVocabDomain(domain));
    }else{
      const prev=VOCAB_LIST[index-1];
      card.append(make('span','vocab-domain-lock','🔒 Otworzy się po opanowaniu: '+prev.title));
      card.addEventListener('click',()=>{
        toast('Najpierw opanuj dziedzinę „'+prev.title+'" w co najmniej 70%. Zabieram Cię do niej.');
        startVocabDomain(prev);
      });
    }
    host.append(card);
  });
}

function startVocabDomain(domain){
  // Zasilamy istniejącą mechanikę nauki (mówienie + wpisywanie) słowami z bazy.
  const cards=domain.words.map(w=>({en:w.en, pl:w.pl})); // bez ikon
  beginPoolSession('vocab-'+domain.id, domain.title, cards);
}

const openVocabBaseBtn=$('#openVocabBase');
if(openVocabBaseBtn)openVocabBaseBtn.addEventListener('click',openVocabBase);
const vocabBaseBackBtn=$('#vocabBaseBack');
if(vocabBaseBackBtn)vocabBaseBackBtn.addEventListener('click',()=>goHome('learn'));


/* ======================================================================
   Wersja 16: elementy ekranu Dzisiaj przeniesione z zatwierdzonej kanwy.
   ====================================================================== */
function kanwaInitials(name){
  const parts=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return 'U';
  return (parts.length>1?parts[0][0]+parts[parts.length-1][0]:parts[0].slice(0,2)).toUpperCase();
}
const KANWA_BIRD='<path d="M50,19 C52.6,25 53.6,33 53.0,43 L55.4,71 L50,63 L44.6,71 L47.0,43 C46.4,33 47.4,25 50,19 Z"/><path d="M48.2,36 C36,37 20.5,44 8,63 C21,50.5 35,44.5 49.2,44.8 Z"/><path d="M51.8,36 C64,37 79.5,44 92,63 C79,50.5 65,44.5 50.8,44.8 Z"/>';
const KANWA_ROUTES={
  big:{vb:'0 0 320 260',d:'M30,215 C80,120 130,230 175,150 C220,70 260,60 290,40',stops:[[104,177,'#D1361D',6],[175,150,'#6CE8BE',6],[238,73,'#7A3B94',6]],start:[30,215,10],end:[290,40,9],bird:0.5,birdOff:[-25,-47],
       labelStart:[44,246,'start'],labelEnd:[300,20,'end']},
  flat:{vb:'0 0 350 76',d:'M14,54 C60,54 90,20 140,28 C190,36 260,60 336,18',stops:[[75,38,'#D1361D',5],[140,28,'#6CE8BE',5],[228,42,'#7A3B94',5]],start:[14,54,8],end:[336,18,8],bird:0.36,birdOff:[-16,-42],
       labelStart:[24,72,'start'],labelEnd:[336,44,'end']}
};
function kanwaRouteSvg(kind,position,total,place){
  const r=KANWA_ROUTES[kind];
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',r.vb);svg.setAttribute('role','img');svg.setAttribute('aria-label','Trasa lotu: przystanek '+(position+1)+' z '+total);
  const path=document.createElementNS(ns,'path');path.setAttribute('d',r.d);path.setAttribute('fill','none');path.setAttribute('stroke','#1E4FBF');path.setAttribute('stroke-width','3');path.setAttribute('stroke-dasharray','1 9');path.setAttribute('stroke-linecap','round');svg.append(path);
  svg.style.display='block';svg.style.width='100%';svg.style.height='auto';
  document.body.append(svg);const length=path.getTotalLength();const t=total>1?Math.min(1,position/(total-1)):0;const here=path.getPointAtLength(length*t);svg.remove();
  const circle=(x,y,rad,fill,stroke,sw)=>{const c=document.createElementNS(ns,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',rad);c.setAttribute('fill',fill);if(stroke){c.setAttribute('stroke',stroke);c.setAttribute('stroke-width',sw);}return c;};
  r.stops.forEach(([x,y,fill,rad])=>{const near=Math.hypot(x-here.x,y-here.y)<rad+12;if(!near)svg.append(circle(x,y,rad,fill,'#0A1745',2));});
  svg.append(circle(r.end[0],r.end[1],r.end[2],'#0A1745'));
  const bird=document.createElementNS(ns,'g');bird.setAttribute('fill','#0A1745');bird.setAttribute('transform','translate('+(here.x+r.birdOff[0])+','+(here.y+r.birdOff[1])+') scale('+r.bird+')');bird.innerHTML=KANWA_BIRD;svg.append(bird);
  svg.append(circle(here.x,here.y,r.start[2],'#FFC629','#0A1745',kind==='big'?3:2.5));
  const text=(x,y,anchor,value)=>{const e=document.createElementNS(ns,'text');e.setAttribute('x',x);e.setAttribute('y',y);e.setAttribute('text-anchor',anchor);e.setAttribute('font-family','Source Sans 3,sans-serif');e.setAttribute('font-size',kind==='big'?14:13);e.setAttribute('font-weight','600');e.setAttribute('fill','#4F6275');e.textContent=value;return e;};
  const startLabel=position===0?'Jerzykowo':(place||'');
  const sl=r.labelStart;svg.append(text(position===0?sl[0]:Math.min(here.x+14,r.vb.split(' ')[2]-60),position===0?sl[1]:here.y+(kind==='big'?30:22),position===0?sl[2]:'start',startLabel));
  const el=r.labelEnd;svg.append(text(el[0],el[1],el[2],'Tasmania'));
  return svg;
}
function renderKanwaToday(collected,passed){
  const welcome=$('#welcomeName');const raw=welcome?welcome.textContent.replace(/!\s*$/,''):'';
  const greet=$('#tdGreet');if(greet)greet.textContent=raw?raw+' · ':'';
  const title=$('#todayGoalTitle');if(title)title.dataset.hello=raw?raw+'. ':'';
  const summary=$('#todayPlanSummary');const core=$('#todayCoreTime');
  if(summary)summary.textContent='łącznie '+(core?core.textContent:'6–8 min');
  const jr=window.JOURNEY||[];const total=jr.length||25;const pos=Math.min(passed,total-1);
  const place=jr[pos]?jr[pos].place:'';
  const big=$('#tdRouteBig'),flat=$('#tdRouteFlat');
  if(big){big.textContent='';big.append(kanwaRouteSvg('big',pos,total,place));}
  if(flat){flat.textContent='';flat.append(kanwaRouteSvg('flat',pos,total,place));}
  const cap=$('#tdRouteCaption');if(cap)cap.textContent='Przystanek '+(pos+1)+' z '+total;
  const sentencesOk=countOk(S.patterns);
  const defs=[{name:'Pierwsza setka',val:collected,max:100,unit:'słów',unitFew:'słowa',unitMany:'słów',one:'słowo',tint:'#FFF0BF',fill:'#FFC629'},
              {name:'Budowniczy zdań',val:sentencesOk,max:50,unit:'zdań',one:'zdanie',unitFew:'zdania',unitMany:'zdań',tint:'#DCE6FA',fill:'#1E4FBF'},
              {name:'Wytrwałość',val:S.streak||0,max:7,unit:'dni z rzędu',tint:'#FBE0DA',fill:'#D1361D'}];
  const list=$('#tdStamps');
  if(list){
    list.textContent='';
    defs.forEach(def=>{
      const val=Math.min(def.val,def.max);
      const li=make('li','td-stamp');li.style.setProperty('--tint',def.tint);
      const tile=make('span','td-stamp-tile');tile.setAttribute('aria-hidden','true');
      const info=make('span','td-stamp-info');
      const name=make('strong','td-stamp-name',def.name);
      let sub;
      if(val>=def.max)sub='Zdobyty';
      else sub=val+' z '+def.max+' '+def.unit;
      const subEl=make('span','td-stamp-sub',sub);
      const hint=def.one?('Jeszcze '+(def.max-val)+' '+kanwaPlural(def.max-val,def.one,def.unitFew,def.unitMany)+' do znaczka'):('Jeszcze '+(def.max-val)+' '+kanwaPlural(def.max-val,'dzień','dni','dni')+' do znaczka');
      const subShort=make('span','td-stamp-sub td-stamp-sub-m',val>=def.max?'Zdobyty':hint);
      const bar=make('span','td-stamp-bar');bar.setAttribute('aria-hidden','true');const fill=make('i');fill.style.width=(val/def.max*100)+'%';fill.style.background=def.fill;bar.append(fill);
      info.append(name,subEl,subShort,bar);li.append(tile,info);list.append(li);
      if(val>=def.max)li.classList.add('earned');
    });
    const first=[...list.children].find(li=>!li.classList.contains('earned'));
    [...list.children].forEach(li=>li.classList.toggle('td-first',li===first));
  }
}
(function kanwaInit(){
  const link=$('#todayBadgesLink');if(link)link.addEventListener('click',()=>openHomeTab('progress'));
  document.addEventListener('click',event=>{
    const button=event.target.closest&&event.target.closest('.nu-modules button.primary[data-unlock]');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    const target=$(button.dataset.unlock);if(target&&!target.disabled)target.click();
  },true);
})();
