'use strict';

const APP_VERSION = '11.18';
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
  { id:'warmup',  name:'Rozgrzewka',   ms: 5*60*1000, short: 3*60*1000 },
  { id:'core',    name:'Rdzeń',        ms:12*60*1000, short: 5*60*1000 },
  { id:'closing', name:'Domknięcie',   ms: 6*60*1000, short: 0 }
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

function show(name){
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('on'));
  const target = $('#s-' + name);
  if(target) target.classList.add('on');
  window.scrollTo(0,0);
}

async function api(path, options={}){
  const config = {...options, headers:{...(options.headers || {})}};
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

function emptyState(){
  return {schema:3,cards:{},streak:0,lastDay:null,sessions:0,passedExams:[],
    patterns:{},errorCards:{},stories:{},dialogues:{},
    mistakes:[],feathers:0,badges:[],stages:0};
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
  return state;
}

function storageKey(){ return currentUser ? 'swift-bird-progress-' + currentUser.id : ''; }

async function loadProgress(){
  const result = await api('/api/progress');
  S = normalizeState(result && result.state);
  if(!Object.keys(S.cards).length){
    let local = null;
    try{ local = JSON.parse(localStorage.getItem(storageKey()) || 'null'); }catch(error){}
    S = normalizeState(local || S);
    if(Object.keys(S.cards).length) saveProgress();
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

/* Kobiece glosy angielskie w systemach, na ktorych aplikacja realnie chodzi.
   Interfejs przegladarki nie udostepnia pola z plcia glosu, wiec jedynym
   sposobem jest rozpoznanie po nazwie. */
const FEMALE_VOICES=[
  // Android i Chrome
  'google uk english female','google us english','google english female',
  // Apple
  'samantha','serena','kate','karen','moira','tessa','fiona','ava','allison','susan','victoria','zoe','nicky','siri female',
  // Windows
  'zira','hazel','sonia','aria','jenny','michelle','libby','emma','eva','catherine','linda','heera'
];
const MALE_VOICES=['male','daniel','alex','fred','oliver','tom','rishi','aaron','arthur','george','james','david','mark','guy','ryan','brian','gordon','lee','rocko','junior','ralph','albert','bad news','bahh','bells','boing','bubbles','cellos','jester','organ','superstar','trinoids','whisper','wobble','zarvox'];
const NATURAL_VOICE_HINTS=['natural','neural','premium','enhanced','online'];

/* Dopasowanie po calych slowach, nie po fragmentach. Bez tego "male"
   trafialoby w "Google UK English Female", a "lee" w "Kathleen". */
function hasWord(name,token){
  return new RegExp('\\b'+token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(name);
}
function voiceScore(item){
  const name=(item.name||'').toLowerCase();
  const lang=(item.lang||'').replace('_','-').toLowerCase();
  const female=hasWord(name,'female');
  let score=0;
  if(!female && MALE_VOICES.some(token=>hasWord(name,token))) score-=1000;
  if(female) score+=200;
  if(FEMALE_VOICES.some(token=>name.includes(token))) score+=140;
  // Nie narzucamy dialektu: popularne warianty brytyjski i amerykański
  // dostają dokładnie tę samą wagę. Wygrywa jakość i naturalność głosu.
  if(lang==='en-gb'||lang==='en-us') score+=24;
  else if(lang.startsWith('en-')) score+=10;
  if(NATURAL_VOICE_HINTS.some(token=>name.includes(token))) score+=80;
  // Glosy sieciowe sa zwykle lepszej jakosci, ale wymagaja internetu.
  if(item.localService===false) score+=6;
  if(item.default) score+=18;
  return score;
}

function pickVoice(){
  if(!hasTTS) return;
  let voices=[];
  try{ voices=window.speechSynthesis.getVoices() || []; }catch(error){}
  const tag=item=>(item.lang||'').replace('_','-').toLowerCase();
  const english=voices.filter(item=>tag(item)==='en' || tag(item).startsWith('en-'));
  if(!english.length){ voice=null; return; }
  const ranked=english.slice().sort((a,b)=>voiceScore(b)-voiceScore(a));
  voice=ranked[0];
  updateVoiceInfo();
}

/* Nazwa wybranego glosu, do sprawdzenia w panelu administratora.
   Jesli system ma tylko glos meski, zadne sortowanie tego nie naprawi
   i trzeba doinstalowac dane glosowe. */
function updateVoiceInfo(){
  const element=document.getElementById('voiceInfo');
  if(!element) return;
  if(!hasTTS){ element.textContent='Ta przeglądarka nie ma syntezatora mowy.'; return; }
  if(!voice){ element.textContent='System nie ma głosu angielskiego. Doinstaluj dane głosowe: Ustawienia, Tekst na mowę, silnik Google, English.'; return; }
  const name=(voice.name||'').toLowerCase();
  const looksFemale=hasWord(name,'female')||FEMALE_VOICES.some(token=>name.includes(token));
  element.textContent='Głos: '+voice.name+' ('+voice.lang+'). Tempo i wysokość: naturalne. '+
    (looksFemale?'Rozpoznany jako kobiecy.':'Nie udało się rozpoznać kobiecego głosu. Doinstaluj angielskie dane głosowe w ustawieniach systemu.');
}
if(hasTTS){
  pickVoice();
  try{ window.speechSynthesis.addEventListener('voiceschanged',pickVoice); }catch(error){}
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
  try{ window.speechSynthesis.cancel(); window.speechSynthesis.resume(); }catch(error){}
  let index=0;
  const next=()=>{
    if(token!==speechToken) return;
    if(index>=list.length){ if(onDone) onDone(); return; }
    const text=list[index++];
    const utterance=makeUtterance(text);
    let finished=false;
    const finish=()=>{
      if(finished)return;
      finished=true;
      clearTimeout(fallback);
      next();
    };
    const fallback=setTimeout(finish,Math.max(2600,text.length*190));
    utterance.onend=finish; utterance.onerror=finish;
    try{ window.speechSynthesis.speak(utterance); }catch(error){ finish(); }
  };
  setTimeout(next,120);
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
  knew:'new',by:'buy',bye:'buy',knight:'night'
});
function speechKey(value){
  const normalized=normalizeSpeech(value).replace(/^(?:a|an|the)\s+/,'');
  return SPEECH_EQUIVALENTS[normalized]||normalized;
}
/* Pewność rozpoznania (confidence) jest w Chrome przy krótkich słowach
   niemiarodajna. Liczy się zgodna wymowa zapisana w jednej z równoważnych form. */
function pronunciationMatches(heard,target){
  const heardKey=speechKey(heard);const targetKey=speechKey(target);
  return Boolean(heardKey)&&heardKey===targetKey;
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
    const voiceLang=voice&&String(voice.lang||'').replace('_','-');
    recognition.lang=/^en(?:-|$)/i.test(voiceLang)?voiceLang:'en-US';
    recognition.interimResults=false; recognition.maxAlternatives=10; recognition.continuous=false;
    recognition.onresult=event=>{
      const alternatives=Array.from(event.results||[]).flatMap(result=>Array.from(result||[])).map(item=>item&&item.transcript||'').filter(Boolean);
      const ok=alternatives.some(text=>matcher(text,target));
      const raw=alternatives.find(text=>!containsBlockedWord(text))||'';
      // Przy trafieniu pokazujemy szukane slowo, nie surowa transkrypcje.
      // Przy pudle nie pokazujemy nic: dziecko nie ma powodu widziec,
      // ze silnik uslyszal cokolwiek innego, w tym wulgaryzm.
      if(ok)return finish({ok:true,text:target,raw:raw});
      const heardSomething=alternatives.length>0&&!alternatives.every(containsBlockedWord);
      finish({
        ok:false,
        text:'',
        raw:raw,
        msg:heardSomething?'To brzmiało jak inne słowo. Posłuchaj i spróbuj ponownie.':'Nie rozpoznałem słowa. Posłuchaj i spróbuj ponownie.'
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
  const label=$('#trackLabel');
  if(label) label.textContent = world ? 'Ścieżka: Świat' : 'Ścieżka: Szkoła';
  const toggle=$('#trackToggle');
  if(toggle) toggle.textContent = world ? 'Przełącz na Szkołę' : 'Przełącz na Świat';
}
function collectedVocabulary(){
  return new Set(CARDS.filter(card=>seen(card.id)).map(card=>card.en.toLowerCase()));
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

function renderVocabularyLaunch(){
  const collected=collectedTotal(S);const open=openSectionCount();
  $('#vocabularyLaunchText').textContent=collected+' z '+CARDS.length+' słów · otwarte sekcje: '+open+' z '+SECTIONS.length+'.';
  $('#vocabularyLaunchFill').style.width=(collected/CARDS.length*100)+'%';
}

function renderSentenceLaunch(){
  const collected=collectedTotal(S);const learned=totalLearnedSentences();const ready=inTestMode()||collected>=SENTENCE_UNLOCK_WORDS;
  const button=$('#openSentences');button.disabled=!ready;
  $('#sentenceLaunchText').textContent=ready
    ? learned+' z '+PATTERN_ITEMS.length+' zdań poznanych · '+openPatternCount()+' z '+PATTERN_LIST.length+' tematów otwartych.'
    : 'Zbierz jeszcze '+(SENTENCE_UNLOCK_WORDS-collected)+' '+((SENTENCE_UNLOCK_WORDS-collected)===1?'słowo':'słowa')+', aby zacząć układać zdania.';
  $('#sentenceLaunchFill').style.width=(ready?(learned/PATTERN_ITEMS.length*100):(collected/SENTENCE_UNLOCK_WORDS*100))+'%';
}

function renderSentenceHub(){
  if(!inTestMode()&&collectedTotal(S)<SENTENCE_UNLOCK_WORDS){renderHome();show('home');return;}
  const learned=totalLearnedSentences();
  $('#sentenceKnownN').textContent=learned;
  $('#sentenceOpenN').textContent=openPatternCount();
  $('#sentenceFeatherN').textContent=S.feathers||0;
  $('#sentenceHubNote').textContent='Każdy temat otwiera się po ułożeniu '+SENTENCE_UNLOCK_SUCCESSES+' różnych zdań w poprzednim. Zdania korzystają ze słów, które masz już w kolekcji. Reguł nie trzeba zapamiętywać — zauważasz wzorzec podczas układania.';
  const grid=$('#patternGrid');grid.textContent='';
  PATTERN_LIST.forEach((pattern,index)=>{
    const learnedHere=learnedSentenceCount(pattern.id);const unlocked=patternUnlocked(index);const available=readyPatternItems(pattern.id);const canPractice=unlocked&&available.length>0;const complete=learnedHere===pattern.items.length;
    const button=make('button','pattern-card'+(unlocked?'':' locked')+(!available.length&&unlocked?' waiting':'')+(complete?' complete':''));
    button.type='button';button.disabled=!canPractice;
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
    grid.append(button);
  });
  show('sentences');
}

function enterStudent(){
  $('#studentName').textContent=currentUser.displayName;
  $('#welcomeName').textContent='Cześć, '+currentUser.firstName+'!';
  applyTrackToInterface();
  setSync('zapisano');
  /* Po aktualizacji aplikacji sprawdzamy także wcześniejsze osiągnięcia.
     Dzięki temu uczeń, który spełnił warunek przed dodaniem galerii,
     nie musi wykonywać tego samego zadania ponownie. */
  const restoredBadges=checkBadges();
  if(restoredBadges.length)saveProgress();
  renderHome(); show('home');
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
    button.type='button';button.disabled=locked;
    button.setAttribute('aria-label',locked?'Sekcja '+(index+1)+' zablokowana':'Otwórz sekcję '+section.name);
    button.append(make('span','number','SEKCJA '+String(index+1).padStart(2,'0')));
    button.append(make('span','section-card-icon',locked?'🔒':section.icon));
    button.append(make('strong','',section.name));
    button.append(make('small','',passedExam?'Egzamin zdany':count+' z 20 słów'));
    if(locked)button.append(make('span','lock','🔒'));
    const progress=make('span','card-progress');
    const fill=make('i');fill.style.width=(passedExam?100:count*5)+'%';progress.append(fill);button.append(progress);
    if(!locked)button.addEventListener('click',()=>renderSection(index));
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
    note.textContent='Nowe słowo trafia do kolekcji dopiero po poprawnej wymowie i wpisaniu.';
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

function wordQueue(){ return startLearning(); }

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
function storyQueue(limit){
  const unseen = STORY_LIST.filter(story => !(S.stories[story.id] || {}).done);
  const pool = unseen.length ? unseen : STORY_LIST;
  return shuffle(pool).slice(0,limit).map(story => ({mode:'story',item:story}));
}
function dialogueQueue(limit){
  const unseen = DIALOGUE_LIST.filter(dialogue => !(S.dialogues[dialogue.id] || {}).done);
  const pool = unseen.length ? unseen : DIALOGUE_LIST;
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

/* Rdzeń miesza typy zadań zamiast trzymać jeden: sesja z jednego rodzaju
   ćwiczenia daje lepsze wyniki w trakcie i gorsze po tygodniu. */
function buildStage(id){
  const open = unlockedModules();
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
  sessionOrigin = 'section';focusedPatternId='';
  shortSession = Boolean(short);
  stagePlan = STAGE_PLAN.filter(stage => !shortSession || stage.short > 0);
  stageIndex = 0;
  done = 0; hits = 0; added = []; sessionRun++;
  startedAt = Date.now();
  dailyCounters = {};
  startStage();
}

function beginPatternSession(patternId){
  const index=PATTERN_LIST.findIndex(pattern=>pattern.id===patternId);
  if(index<0||!patternUnlocked(index))return;
  if(!readyPatternItems(patternId).length){toast('Najpierw zbierz słowa potrzebne do tych zdań.');return;}
  const pattern=PATTERN_LIST[index];
  sessionOrigin='sentences';focusedPatternId=patternId;shortSession=false;
  stagePlan=[{id:'sentences',name:pattern.name,ms:10*60*1000,short:10*60*1000}];
  stageIndex=0;done=0;hits=0;added=[];sessionRun++;startedAt=Date.now();dailyCounters={};
  startStage();
}

function stageBudget(stage){ return shortSession ? stage.short : stage.ms; }

function startStage(){
  const stage = stagePlan[stageIndex];
  if(!stage) return finishLearning();
  queue = buildStage(stage.id);
  if(!queue.length){ stageIndex++; return startStage(); }
  stageStartedAt = Date.now();
  $('#playSectionName').textContent = sessionOrigin==='sentences'
    ? 'Klocki zdań · '+stage.name
    : stage.name + ' · ' + SECTIONS[currentSectionIndex].name;
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

function renderStageBreak(){
  const next = stagePlan[stageIndex];
  const host = $('#breakBody');
  host.textContent = '';
  const stop = JOURNEY_STOPS[journeyIndex()];
  if(stop){
    host.append(make('p','break-place',stop.place + ', ' + stop.country));
    appendBilingualJourneyFact(host,stop);
  }
  host.append(make('p','break-next','Następny etap: ' + next.name));
  const progress = challengeProgress();
  if(progress) host.append(make('p','break-challenge',
    progress.challenge.text + '  (' + Math.min(progress.done,progress.challenge.goal) + ' z ' + progress.challenge.goal + ')'));
  $('#breakFeathers').textContent = S.feathers || 0;
  show('break');
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
  const stage = $('#stage'); stage.textContent = '';
  if(item.mode==='intro') return renderIntro(stage,item);
  if(item.mode==='type-word') return renderType(stage,item);
  if(item.mode==='pattern') return renderPattern(stage,item.item);
  if(item.mode==='story') return renderStory(stage,item.item);
  if(item.mode==='dialogue') return renderDialogue(stage,item.item,0);
  if(item.mode==='error') return renderErrorHunt(stage,item.item);
  if(item.mode==='compare') return renderCompare(stage,item.item);
  if(item.mode==='ordering') return renderOrdering(stage,item.item);
  return renderChoice(stage,item);
}

function renderIntro(stage,item){
  const card=item.card;
  const panel=make('div','card');
  panel.append(make('p','tag','Nowe słowo'),make('div','big',card.ic),make('div','en',card.en),make('div','pl',card.pl));
  const hear=make('button','hear','Posłuchaj'); hear.type='button'; hear.addEventListener('click',()=>say(card.en)); panel.append(hear); stage.append(panel);
  const mic=make('div','mic');
  const status=make('p','mic-status','Powiedz to słowo do mikrofonu.');
  const button=make('button','next','Powiedz to słowo'); button.type='button';
  const heard=make('p','heard',''); mic.append(status,button,heard); stage.append(mic);
  if(!hasSpeechRecognition){ status.textContent='Ta przeglądarka nie obsługuje sprawdzania wymowy. Otwórz aplikację w Chrome.';button.disabled=true;button.textContent='Mikrofon jest wymagany';return; }
  const accept=()=>{
    nextStep();
  };
  button.addEventListener('click',()=>{
    button.disabled=true;button.textContent='Słucham…';status.textContent='Mów teraz.';heard.textContent='';mic.classList.remove('good');
    listen(card.en,result=>{
      button.disabled=false;
      if(result.ok){
        mic.classList.add('good');heard.textContent='Usłyszałem: '+card.en;
        status.textContent='Dobra wymowa.';button.textContent='Zaliczone';button.disabled=true;
        advanceTimer=setTimeout(accept,750);return;
      }
      mic.classList.remove('good');heard.textContent='';
      if(result.fatal){status.textContent=result.msg||'Mikrofon jest niedostępny.';button.textContent='Mikrofon niedostępny';button.disabled=true;return;}
      status.textContent=result.msg||'Spróbuj jeszcze raz.';button.textContent='Powiedz jeszcze raz';say(card.en);
    });
  });
  if(inTestMode()) mic.append(makeSkip('Pomiń wymowę',accept));
  setTimeout(()=>say(card.en),250);
}

/* Przycisk pominiecia. Powstaje tylko w trybie testowym, wiec w zwyklej
   sesji ucznia nie istnieje w drzewie dokumentu, a nie jest jedynie ukryty. */
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
      feedback.className='fb good';feedback.textContent='Dobrze!';input.disabled=true;checkButton.disabled=true;
      const wasCollected=seen(card.id);
      const clean=tries===0;grade(card.id,clean);if(!wasCollected)added.push(card);if(clean)hits++;done++;saveProgress();
      const run=sessionRun;const praise=PRAISES[Math.floor(Math.random()*PRAISES.length)];
      speakSequence([card.en,praise],()=>{if(run===sessionRun&&$('#s-play').classList.contains('on'))advanceTimer=setTimeout(nextStep,180);});
      return;
    }
    tries++;feedback.className='fb';feedback.innerHTML=markedAnswer(value,target);
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
  const count=sectionCollected(currentSectionIndex);
  $('#dNew').textContent=sentenceSession?done:added.length;
  $('#dOk').textContent=hits;
  $('#dSection').textContent=sentenceSession?totalLearnedSentences():count;
  $('#dFeathers').textContent = S.feathers || 0;
  $('#dNewLabel').textContent=sentenceSession?'wykonanych zadań':'nowe słowa';
  $('#dOkLabel').textContent=sentenceSession?'bez błędu':'trafione';
  $('#dSectionLabel').textContent=sentenceSession?'z 70 zdań poznanych':'z 20 zebranych';
  $('#doneTitle').textContent=sentenceSession?'Zdania przećwiczone!':(added.length?'Kolekcja rośnie!':'Sesja zakończona!');
  $('#doneBack').textContent=sentenceSession?'Wróć do klocków zdań':'Wróć do sekcji';

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
  if(!sentenceSession&&count === 20 && !sectionPassed(currentSectionIndex)){
    const button = make('button','primary wide','Zdaj egzamin'); button.type = 'button';
    button.addEventListener('click',()=>startExam(currentSectionIndex));
    action.append(button);
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
  $('#studentName').textContent='Tryb testowy';
  $('#welcomeName').textContent='Tryb testowy';
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
      row.append(name,make('td','',student.wordsCollected+' / 500'),make('td','',(student.sentencesCompleted||0)+' / 70'),make('td','',student.currentSection+' / 25'),make('td','',String(student.examsPassed)),make('td','',formatActivity(student.lastActive)));
      const action=make('td');const reset=make('button','reset-pin','Nowy PIN');reset.type='button';reset.addEventListener('click',()=>resetStudentPin(student));action.append(reset);row.append(action);body.append(row);
    });
  }catch(problem){error.textContent=problem.message;if(problem.status===401)show('admin-login');}
}

function displayCredentials(credentials){
  lastCredentials=credentials;$('#credentialsName').textContent=credentials.displayName;$('#credentialsPin').textContent=credentials.pin;$('#credentialsCard').hidden=false;window.scrollTo({top:0,behavior:'smooth'});
}
function clearCredentials(){
  lastCredentials=null;$('#credentialsName').textContent='';$('#credentialsPin').textContent='';$('#credentialsCard').hidden=true;
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
/* Przycisk pojawia sie tylko wtedy, gdy serwer dopuszcza samodzielna rejestracje. */
api('/api/config').then(config=>{ if(config&&config.selfRegistration)$('#openRegister').hidden=false; }).catch(()=>{});
$('#openTestMode').addEventListener('click',enterTestMode);
$('#testVoice').addEventListener('click',()=>{pickVoice();say('Hello. This is your English voice.');});
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
  clearCredentials();currentUser=null;S=emptyState();show('login');
}
$('#studentLogout').addEventListener('click',logout);$('#adminLogout').addEventListener('click',logout);
$('#openVocabulary').addEventListener('click',renderVocabularyHub);
$('#vocabularyBack').addEventListener('click',()=>{renderHome();show('home');});
$('#sectionBack').addEventListener('click',renderVocabularyHub);
$('#openSentences').addEventListener('click',renderSentenceHub);
$('#sentencesBack').addEventListener('click',()=>{renderHome();show('home');});
$('#quit').addEventListener('click',()=>{sessionRun++;stopSpeech();clearTimeout(advanceTimer);if(sessionOrigin==='sentences')renderSentenceHub();else renderSection(currentSectionIndex);});
$('#doneBack').addEventListener('click',()=>{if(sessionOrigin==='sentences')renderSentenceHub();else renderSection(currentSectionIndex);});
$('#examQuit').addEventListener('click',()=>{stopSpeech();renderSection(currentSectionIndex);});
$('#refreshStudents').addEventListener('click',renderStudents);
$('#createStudent').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter||event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;$('#adminError').textContent='';
  try{
    const data=await api('/api/admin/students',{method:'POST',body:{firstName:$('#newFirstName').value,lastInitial:$('#newLastInitial').value}});
    displayCredentials(data.student);event.target.reset();await renderStudents();
  }catch(problem){$('#adminError').textContent=problem.message;}finally{button.disabled=false;}
});
$('#copyCredentials').addEventListener('click',async()=>{
  if(!lastCredentials)return;const text='Swift-bird\nUczeń: '+lastCredentials.displayName+'\nPIN: '+lastCredentials.pin;
  try{await navigator.clipboard.writeText(text);toast('Dane skopiowane.');}catch(error){toast('Zapisz PIN: '+lastCredentials.pin);}
});
$('#printCredentials').addEventListener('click',()=>window.print());

async function boot(){
  if(SECTIONS.length!==25||CARDS.length!==500){$('#loginError').textContent='Błąd słownika aplikacji.';return;}
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

function award(kind,times){
  const value = FEATHER_VALUES[kind] || 0;
  S.feathers = (S.feathers||0) + value*(times||1);
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
    chip.append(make('span','badge-icon',badge.icon||'🏅'));
    chip.append(make('strong','',badge.name));
    chip.append(make('span','badge-desc',badge.desc));
    chip.append(make('span','badge-state',owned?'✓ Zdobyta · przeczytaj opowieść':'🔒 Do zdobycia'));
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
  $('#badgeBigIcon').textContent = badge.icon || '🏅';
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
  const text = normalizeAnswer(answer);
  if(!text) return false;
  return (need||[]).every(group => group.some(token => text.includes(normalizeAnswer(token))));
}
function answerAvoids(answer,avoid){
  const text = normalizeAnswer(answer);
  return !(avoid||[]).some(token => text.includes(normalizeAnswer(token)));
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

function renderPattern(stage,item){
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
  if(typeof SENTENCE_GEN !== 'undefined' && item.pattern){
    const task = SENTENCE_GEN.makeSentenceTask(item.pattern, collectedVocabulary(), level);
    if(task && task.tokens && task.tokens.length){
      target=task.tokens;extraBricks=task.extra;
      if(task.promptPl)patternPrompt.textContent=task.promptPl;
    }
  }
  const sentenceText=sentenceTextFromTokens(target);
  const pool = shuffle(useExtra ? target.concat(extraBricks) : target.slice());
  let reviewed = false;
  let arrangementReady = false;
  let spellingReady = false;
  let completed = false;
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
          brick.setAttribute('aria-label',item.token+' — dotknij, aby odłożyć, albo przeciągnij, aby zmienić miejsce');
          brick.addEventListener('pointerdown',event=>startPlacedDrag(event,index,slot,brick));
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
    if(!placed.length) line.append(make('span','line-empty','Dotknij klocków poniżej. Ułożone słowa możesz przeciągać.'));
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
  copyPanel.append(make('p','sentence-copy-instruction','Przepisz dokładnie. Pamiętaj o wielkiej literze, jednej spacji między wyrazami i znaku na końcu.'));
  copyPanel.append(make('div','sentence-copy-model',sentenceText));
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
  speechPanel.append(speechStatus,contrastBox,readButton,heard,resultActions);
  stage.append(speechPanel);

  let attempts = 0;
  let copyAttempts = 0;
  let testSkip=null;
  let copySkip=null;
  let lastIncorrectSentence='';

  function finishSentence(){
    if(completed||!spellingReady)return;
    completed=true;
    speechPanel.classList.add('passed');
    speechStatus.textContent='Świetnie! Zdanie zostało ułożone, przepisane i przeczytane poprawnie.';
    heard.textContent='Zaliczone: '+sentenceText;
    readButton.hidden=true;
    if(!contrastBox.hidden)contrastButton.disabled=!hasTTS;
    if(testSkip)testSkip.hidden=true;
    resultActions.hidden=false;
    const flawless=attempts===0&&copyAttempts===0;
    gradeIn(S.patterns,item.id,flawless);
    if(flawless){ hits++; award('patternPerfect'); }
    done++;saveProgress();
  }

  function enableReading(){
    if(completed||!arrangementReady||!spellingReady)return;
    if(!contrastBox.hidden)contrastButton.disabled=!hasTTS;
    if(!hasSpeechRecognition){
      speechStatus.textContent='Do zaliczenia zdania potrzebny jest mikrofon. Otwórz aplikację w Chrome i zezwól na dostęp.';
      readButton.textContent='Mikrofon jest wymagany';readButton.disabled=true;
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

  readButton.addEventListener('click',()=>{
    readButton.disabled=true;readButton.textContent='Słucham…';
    contrastButton.disabled=true;
    speechStatus.textContent='Czytaj teraz całe zdanie.';heard.textContent='';
    listen(sentenceText,result=>{
      if(result.fatal){
        speechStatus.textContent=result.msg||'Mikrofon jest niedostępny.';
        readButton.textContent='Mikrofon niedostępny';readButton.disabled=true;
        return;
      }
      if(result.ok){
        speechPanel.classList.add('good');
        finishSentence();
        return;
      }
      noteMistake('sentence-speech',item.id);
      speechStatus.textContent='Nie udało się jeszcze potwierdzić całego zdania. Posłuchaj wzoru i spróbuj ponownie.';
      readButton.textContent='Powiedz jeszcze raz';readButton.disabled=true;
      speakSentence(sentenceText,()=>{
        if(!completed){
          speechStatus.textContent='Spróbuj jeszcze raz. Czytaj spokojnie od pierwszego do ostatniego słowa.';
          readButton.disabled=false;
          if(!contrastBox.hidden)contrastButton.disabled=!hasTTS;
        }
      });
    },sentencePronunciationMatches);
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
      speechStatus.textContent='Zdanie zaliczone. Możesz posłuchać ponownie albo przejść dalej.';
    });
  });
  nextSentenceButton.addEventListener('click',()=>{
    stopSpeech();clearTimeout(advanceTimer);nextStep();
  });

  if(inTestMode()){
    copySkip=makeSkip('Pomiń przepisywanie zdania',acceptSpelling);
    copyPanel.append(copySkip);
    testSkip=makeSkip('Pomiń czytanie zdania',finishSentence);
    speechPanel.append(testSkip);
  }

  checkButton.addEventListener('click',()=>{
    const answer = placed.map(entry=>entry.token).join(' ');
    const correct = answer === target.join(' ');
    if(correct){
      reviewed=true;arrangementReady=true;refreshLine();
      feedback.className = 'fb good';
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
      copyInput.focus();
      return;
    }
    attempts++;
    lastIncorrectSentence=sentenceTextFromTokens(placed.map(entry=>entry.token));
    gradeIn(S.patterns,item.id,false);
    noteMistake('pattern',item.id);
    feedback.className = 'fb bad';
    reviewed=true;refreshLine();
    arrangeHelp.textContent='Po sprawdzeniu poprawne części zostają zielone. Czerwone klocki przesuń strzałką albo dotknij, aby je wymienić.';
    /* Zdanie zostaje na miejscu. Kolory i strzałki prowadzą do samodzielnej
       korekty, zamiast kasować dziecku całą wykonaną pracę. */
    feedback.textContent = attempts >= 2
      ? 'Podpowiedź: zdanie zaczyna się od „'+target.slice(0,2).join(' ')+'”. Przesuwaj czerwone klocki strzałkami. Po poprawieniu będzie można porównać brzmienie obu wersji.'
      : 'Zielone części są ułożone dobrze. Przesuń czerwony klocek strzałką albo dotknij go, aby go wymienić. Po poprawieniu będzie można porównać brzmienie.';
    if(attempts>=2)grammarHelp.open=true;
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
  shuffle(story.main.options.map((text,index)=>({text,index}))).forEach(option => {
    const button = make('button','opt text-opt',option.text);
    button.type = 'button';
    button.addEventListener('click',()=>{
      [...options.children].forEach(child => child.disabled = true);
      const correct = option.index === story.main.correct;
      button.classList.add(correct?'right':'wrong');
      if(!correct){
        const right = [...options.children].find(child => child.textContent === story.main.options[story.main.correct]);
        if(right) right.classList.add('right');
        noteMistake('story',story.id);
      }else{ hits++; }
      done++;
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(()=>{ stage.textContent=''; renderStoryDetail(stage,story,0); }, correct?800:1500);
    });
    options.append(button);
  });
  stage.append(options);
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
    listen(turn.model,result => {
      speak.disabled = false;
      /* Rozpoznawanie zwraca tu całe zdanie, więc nie porównujemy go ze
         wzorcem, tylko sprawdzamy elementy kluczowe. */
      const said = result.raw || '';
      const shown = containsBlockedWord(said) ? '' : said;
      const ok = answerCovers(said,turn.need) && answerAvoids(said,turn.avoid);
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
    });
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
    shuffle(item.why.map((text,index)=>({text,index}))).forEach(option => {
      const button = make('button','opt text-opt',option.text);
      button.type = 'button';
      button.addEventListener('click',()=>{
        [...options.children].forEach(child => child.disabled = true);
        const correct = option.index === item.correctWhy;
        button.classList.add(correct?'right':'wrong');
        if(!correct){
          const right = [...options.children].find(child => child.textContent === item.why[item.correctWhy]);
          if(right) right.classList.add('right');
          noteMistake('why',item.id);
        }
        gradeIn(S.errorCards,item.id,correct && attempts === 0);
        if(correct && attempts === 0){ hits++; award('errorFixed'); }
        done++; saveProgress();
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(nextStep,correct?900:1900);
      });
      options.append(button);
    });
    stage.append(options);
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
$('#openMap').addEventListener('click',()=>{ show('map'); renderMap(); });
$('#mapBack').addEventListener('click',()=>{ renderHome(); show('home'); });

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
      const del=make('button','pool-delete','Usuń');
      del.type='button';
      del.addEventListener('click',async ()=>{
        if(!confirm('Usunąć pulę „'+poolItem.name+'”?'))return;
        try{ await api('/api/pools/'+poolItem.id,{method:'DELETE'}); loadPools(); }
        catch(problem){ toast('Nie udało się usunąć.'); }
      });
      card.append(del);
      listBox.append(card);
    });
  }catch(problem){ empty.hidden=false; empty.textContent='Nie udało się wczytać pul.'; }
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
const openPoolsButton=$('#openPools');
if(openPoolsButton) openPoolsButton.addEventListener('click',openPools);
const poolsBackButton=$('#poolsBack');
if(poolsBackButton) poolsBackButton.addEventListener('click',()=>{ renderHome(); show('home'); });

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
