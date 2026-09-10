'use strict';

const APP_VERSION = '11.1';
const DAY = 86400000;
const STEPS = [1,2,4,8,16,35,70];
const NEW_PER_SESSION = 4;
const MAX_SESSION_ITEMS = 20;

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

const BADGES = [
  { id:'first-hundred', name:'Pierwsza setka', icon:'💯',
    desc:'100 słów w kolekcji',
    reward:'Jerzyk dostaje zapas na drogę.',
    story:'Jerzyk łapie owady w locie, nigdy na ziemi. Zbiera je w gardle w małą kulkę, sklejoną własną śliną, i dopiero taką porcję zanosi młodym. W jednej kulce potrafi być kilkaset owadów. Twoje sto słów to dokładnie taka kulka: same w sobie drobne, razem wystarczają na długi lot.' },
  { id:'builder', name:'Budowniczy zdań', icon:'🧱',
    desc:'50 zdań ułożonych bez błędu',
    reward:'Gniazdo w gnieździe rośnie.',
    story:'Jerzyk buduje gniazdo z tego, co złapie w powietrzu: piórek, źdźbeł, kawałków liści porwanych przez wiatr. Skleja je własną śliną, która zasycha na twardo. Nic nie zbiera z ziemi, wszystko chwyta w locie. Ty też budujesz zdania z kawałków, które już masz.' },
  { id:'flawless', name:'Bez potknięcia', icon:'🎯',
    desc:'egzamin sekcji bez ani jednej pomyłki',
    reward:'Czysty przelot nad przystankiem.',
    story:'Jerzyk potrafi pić bez lądowania. Zniża lot nad wodą, muska ją dziobem i leci dalej, nie zwalniając. Nie siada, bo z płaskiej ziemi bardzo trudno mu wystartować: ma malutkie nóżki i długie skrzydła. Twój egzamin bez pomyłki wyglądał dokładnie tak: jeden gładki przelot.', manual:true },
  { id:'detective', name:'Detektyw', icon:'🔍',
    desc:'15 zadań detektywa z poprawnym uzasadnieniem',
    reward:'Ostre oko na trasie.',
    story:'Jerzyk poluje na owady tak drobne, że my ich z ziemi nie widzimy. Naukowcy nazywają tę chmurę unoszącą się wysoko nad nami aeroplanktonem. Ptak dostrzega w niej pojedynczą muszkę i chwyta ją przy prędkości, przy której my nie zdążylibyśmy mrugnąć. Wyłapywanie błędu w zdaniu to ta sama umiejętność: widzieć drobiazg, który innym umyka.' },
  { id:'speaker', name:'Rozmówca', icon:'🗣️',
    desc:'30 pełnych zdań powiedzianych na głos',
    reward:'Głos nad dachami.',
    story:'Latem nad polskimi wsiami słychać ostre, przeciągłe piski. To jerzyki krążą stadem nad dachami i wołają do siebie w locie. Ten dźwięk to jeden z niewielu sposobów, w jakie dają o sobie znać, bo widać je rzadko: prawie nie siadają. Ty też właśnie zacząłeś być słyszalny po angielsku.' },
  { id:'golden-word', name:'Złote słowo', icon:'🥇',
    desc:'słowo utrwalone do samego końca',
    reward:'Coś, czego już nie zgubisz.',
    story:'Młody jerzyk po opuszczeniu gniazda potrafi nie usiąść przez wiele miesięcy. Śpi w locie, wznosząc się wieczorem wysoko i drzemiąc krótkimi chwilami. Nie musi się uczyć tego od nowa każdego dnia, po prostu to umie. Twoje złote słowo jest już takie: siedzi w tobie i nie wymaga wysiłku.' },
  { id:'persistent', name:'Wytrwałość', icon:'📆',
    desc:'7 dni z rzędu',
    reward:'Siódmy dzień lotu.',
    story:'Jerzyk zwyczajny spędza w powietrzu prawie całe życie. Je, pije, śpi i łączy się w pary w locie. Nazwa jego rodzaju, Apus, znaczy po grecku „bez nóg", bo dawniej sądzono, że ten ptak wcale nie ląduje. Siedem dni z rzędu to twój pierwszy taki nieprzerwany lot.' }
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
  // Brytyjski akcent brzmi dla polskiego ucha wyrazniej w krotkich slowach.
  if(lang==='en-gb') score+=30;
  else if(lang==='en-us') score+=24;
  else if(lang.startsWith('en-')) score+=10;
  // Glosy sieciowe sa zwykle lepszej jakosci, ale wymagaja internetu.
  if(item.localService===false) score+=6;
  if(item.default) score+=3;
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
  element.textContent='Głos: '+voice.name+' ('+voice.lang+'). '+
    (looksFemale?'Rozpoznany jako kobiecy.':'Nie udało się rozpoznać kobiecego głosu. Doinstaluj dane głosowe English (United Kingdom) w ustawieniach systemu.');
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
  utterance.lang=voice?voice.lang:'en-GB'; utterance.rate=.80; utterance.pitch=1.12; utterance.volume=1;
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
    const finish=()=>{ if(finished)return; finished=true; clearTimeout(fallback); next(); };
    const fallback=setTimeout(finish,Math.max(2600,text.length*190));
    utterance.onend=finish; utterance.onerror=finish;
    try{ window.speechSynthesis.speak(utterance); }catch(error){ finish(); }
  };
  setTimeout(next,120);
}
function say(text){ speakSequence([text]); }

function normalizeSpeech(value){ return (value||'').toLowerCase().replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim(); }
/* Wulgaryzmy, ktore silnik rozpoznawania potrafi zwrocic przy dziecinnej wymowie
   niewinnych slow (klasyczny przypadek: horse). Nigdy nie pokazujemy dziecku
   transkrypcji, ktora nie jest szukanym slowem, a ta lista jest druga zapora. */
const BLOCKED_WORDS=new Set(['whore','hore','hoar','ass','arse','shit','fuck','fucking','bitch','dick','cock','tits','piss','cunt','nigger','nigga','prick','bastard','slut','damn','crap','penis','vagina','sex','porn']);
function containsBlockedWord(value){
  return normalizeSpeech(value).split(' ').some(word=>BLOCKED_WORDS.has(word));
}
/* Pewnosc rozpoznania (confidence) jest w Chrome przy krotkich, pojedynczych
   slowach niemiarodajna: potrafi zwrocic 0.4 dla idealnie wypowiedzianego
   "duck". Progowanie po niej odrzucalo poprawne odpowiedzi, dlatego liczy sie
   wylacznie zgodnosc transkrypcji. */
function pronunciationMatches(heard,target){
  return normalizeSpeech(heard)===normalizeSpeech(target);
}
const SPEECH_ERRORS={
  'not-allowed':'Brak dostępu do mikrofonu. Zezwól na mikrofon w ustawieniach strony.',
  'service-not-allowed':'Przeglądarka zablokowała mikrofon.',
  'no-speech':'Nic nie usłyszałem. Powiedz głośniej.',
  'audio-capture':'Nie znaleziono mikrofonu.',
  'network':'Rozpoznawanie mowy wymaga internetu.',
  'aborted':'Nagrywanie zostało przerwane.'
};
function listen(target,callback){
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
    recognition.lang='en-US'; recognition.interimResults=false; recognition.maxAlternatives=5; recognition.continuous=false;
    recognition.onresult=event=>{
      const alternatives=Array.from(event.results[0]||[]).map(item=>item&&item.transcript||'').filter(Boolean);
      const ok=alternatives.some(text=>pronunciationMatches(text,target));
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

function enterStudent(){
  $('#studentName').textContent=currentUser.displayName;
  $('#welcomeName').textContent='Cześć, '+currentUser.firstName+'!';
  setSync('zapisano');
  renderHome(); show('home');
}

function renderHome(){
  const collected=CARDS.filter(card=>seen(card.id)).length;
  const passed=SECTIONS.filter((section,index)=>sectionPassed(index)).length;
  const open=openSectionCount();
  $('#streakN').textContent=S.streak;
  $('#allCollected').textContent=collected;
  $('#passedN').textContent=passed;
  $('#openN').textContent=open;
  $('#featherN').textContent=S.feathers||0;
  const challenge=challengeProgress();
  $('#challengeLine').textContent=challenge?('Wyzwanie dnia: '+challenge.challenge.text):'';
  const grid=$('#sectionsGrid'); grid.textContent='';
  SECTIONS.forEach((section,index)=>{
    const count=sectionCollected(index);
    const locked=index>=open;
    const passedExam=sectionPassed(index);
    const button=make('button','section-card'+(locked?' locked':'')+(passedExam?' passed':''));
    button.type='button'; button.disabled=locked;
    button.setAttribute('aria-label',locked?'Sekcja '+(index+1)+' zablokowana':'Otwórz sekcję '+section.name);
    button.append(make('span','number','SEKCJA '+String(index+1).padStart(2,'0')));
    button.append(make('span','section-card-icon',locked?'🔒':section.icon));
    button.append(make('strong','',section.name));
    button.append(make('small','',passedExam?'Egzamin zdany':count+' z 20 słów'));
    if(locked) button.append(make('span','lock','🔒'));
    const progress=make('span','card-progress');
    const fill=make('i'); fill.style.width=(passedExam?100:count*5)+'%'; progress.append(fill); button.append(progress);
    if(!locked) button.addEventListener('click',()=>renderSection(index));
    grid.append(button);
  });
}

function renderSection(index){
  if(index>=openSectionCount()) return renderHome();
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

function wordQueue(){ return startLearning(); }

function patternQueue(limit){
  const pool = PATTERN_ITEMS.filter(item => dueIn(S.patterns,item.id));
  const fresh = PATTERN_ITEMS.filter(item => !S.patterns[item.id]);
  const chosen = shuffle(pool.length ? pool : fresh).slice(0,limit);
  return chosen.map(item => ({mode:'pattern',item}));
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
    patterns: collected >= 12,
    stories: collected >= 25 && countOk(S.patterns) >= 5,
    dialogues: collected >= 40 && countOk(S.patterns) >= 12,
    detective: countOk(S.patterns) >= 20 || (S.mistakes||[]).length >= 6
  };
}

/* Rdzeń miesza typy zadań zamiast trzymać jeden: sesja z jednego rodzaju
   ćwiczenia daje lepsze wyniki w trakcie i gorsze po tygodniu. */
function buildStage(id){
  const open = unlockedModules();
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
  shortSession = Boolean(short);
  stagePlan = STAGE_PLAN.filter(stage => !shortSession || stage.short > 0);
  stageIndex = 0;
  done = 0; hits = 0; added = []; sessionRun++;
  startedAt = Date.now();
  dailyCounters = {};
  startStage();
}

function stageBudget(stage){ return shortSession ? stage.short : stage.ms; }

function startStage(){
  const stage = stagePlan[stageIndex];
  if(!stage) return finishLearning();
  queue = buildStage(stage.id);
  if(!queue.length){ stageIndex++; return startStage(); }
  stageStartedAt = Date.now();
  $('#playSectionName').textContent = stage.name + ' · ' + SECTIONS[currentSectionIndex].name;
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
function renderStageBreak(){
  const next = stagePlan[stageIndex];
  const host = $('#breakBody');
  host.textContent = '';
  const stop = JOURNEY_STOPS[journeyIndex()];
  if(stop){
    host.append(make('p','break-place',stop.place + ', ' + stop.country));
    host.append(make('p','break-fact',stop.fact));
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

  const count = sectionCollected(currentSectionIndex);
  $('#dNew').textContent = added.length;
  $('#dOk').textContent = hits;
  $('#dSection').textContent = count;
  $('#dFeathers').textContent = S.feathers || 0;
  $('#doneTitle').textContent = added.length ? 'Kolekcja rośnie!' : 'Sesja zakończona!';

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
  if(count === 20 && !sectionPassed(currentSectionIndex)){
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
    complete.append(make('p','break-fact',stop.fact));
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
  S=emptyState();
  $('#testBanner').hidden=false;
  $('#studentName').textContent='Tryb testowy';
  $('#welcomeName').textContent='Tryb testowy';
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
      row.append(name,make('td','',student.wordsCollected+' / 500'),make('td','',student.currentSection+' / 25'),make('td','',String(student.examsPassed)),make('td','',formatActivity(student.lastActive)));
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
$('#openRegister').addEventListener('click',()=>{$('#registerError').textContent='';show('register');});
$('#backFromRegister').addEventListener('click',()=>show('login'));
$('#studentRegister').addEventListener('submit',async event=>{
  event.preventDefault();
  const error=$('#registerError');error.textContent='';
  const button=event.submitter||event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
  try{
    const data=await api('/api/student/register',{method:'POST',body:{
      firstName:$('#regFirstName').value,
      lastInitial:$('#regLastInitial').value,
      pin:$('#regPin').value,
      pinRepeat:$('#regPinRepeat').value
    }});
    currentUser=data.user;await loadProgress();enterStudent();event.target.reset();
  }catch(problem){error.textContent=problem.message;}finally{button.disabled=false;}
});
/* Przycisk pojawia sie tylko wtedy, gdy serwer dopuszcza samodzielna rejestracje. */
api('/api/config').then(config=>{ if(config&&config.selfRegistration)$('#openRegister').hidden=false; }).catch(()=>{});
$('#openTestMode').addEventListener('click',enterTestMode);
$('#testVoice').addEventListener('click',()=>{pickVoice();say('Hello. This is your English voice.');});
$('#leaveTestMode').addEventListener('click',()=>{stopSpeech();clearTimeout(advanceTimer);enterAdmin();});
$('#openAdminLogin').addEventListener('click',()=>show('admin-login'));
$('#backToStudentLogin').addEventListener('click',()=>show('login'));
$('#studentLogin').addEventListener('submit',async event=>{
  event.preventDefault();const error=$('#loginError');error.textContent='';const button=event.submitter||event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
  try{
    const data=await api('/api/student/login',{method:'POST',body:{firstName:$('#loginFirstName').value,lastInitial:$('#loginLastInitial').value,pin:$('#loginPin').value}});
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
$('#sectionBack').addEventListener('click',()=>{renderHome();show('home');});
$('#quit').addEventListener('click',()=>{sessionRun++;stopSpeech();clearTimeout(advanceTimer);renderSection(currentSectionIndex);});
$('#doneBack').addEventListener('click',()=>renderSection(currentSectionIndex));
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
  story.textContent = badge.story || '';
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
  $('#badgeModal').hidden = true;
  if(badgeQueue.length) setTimeout(showNextBadge,350);
}

$('#badgeStoryButton').addEventListener('click',()=>{
  const story = $('#badgeStory');
  story.hidden = !story.hidden;
  $('#badgeStoryButton').textContent = story.hidden ? 'Przeczytaj historyjkę' : 'Zwiń historyjkę';
});
$('#badgeRewardButton').addEventListener('click',()=>{
  badgeQueue = [];
  $('#badgeModal').hidden = true;
  renderMap();
  show('map');
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

function renderPattern(stage,item){
  const level = patternLevel(item.id);
  const useExtra = level >= 1;
  const showHint = level < 2;

  const prompt = make('div','prompt');
  prompt.append(make('p','ask','Ułóż zdanie po angielsku'));
  prompt.append(make('p','pattern-pl',item.pl));
  if(showHint) prompt.append(make('p','pattern-hint','Przykład: '+item.example));
  stage.append(prompt);

  const line = make('div','sentence-line');
  line.setAttribute('aria-label','Twoje zdanie');
  stage.append(line);

  const bank = make('div','brick-bank');
  stage.append(bank);

  const feedback = make('p','fb','');
  stage.append(feedback);

  const placed = [];
  const target = item.tokens;
  const pool = shuffle(useExtra ? target.concat(item.extra) : target.slice());

  function refreshLine(){
    line.textContent = '';
    placed.forEach((token,index) => {
      const brick = make('button','brick placed',token);
      brick.type = 'button';
      brick.addEventListener('click',()=>{
        placed.splice(index,1);
        const back = bank.querySelector('[data-token="'+cssEscape(token)+'"][disabled]');
        if(back) back.disabled = false;
        refreshLine(); refreshCheck();
      });
      line.append(brick);
    });
    if(!placed.length) line.append(make('span','line-empty','Dotknij klocków poniżej'));
  }
  function refreshCheck(){ checkButton.disabled = placed.length !== target.length; }

  pool.forEach(token => {
    const brick = make('button','brick',token);
    brick.type = 'button';
    brick.dataset.token = token;
    brick.addEventListener('click',()=>{
      if(placed.length >= target.length) return;
      placed.push(token); brick.disabled = true;
      refreshLine(); refreshCheck();
    });
    bank.append(brick);
  });

  const checkButton = make('button','next','Sprawdź');
  checkButton.type = 'button';
  checkButton.disabled = true;
  stage.append(checkButton);

  let attempts = 0;
  checkButton.addEventListener('click',()=>{
    const answer = placed.join(' ');
    const correct = answer === target.join(' ');
    if(correct){
      feedback.className = 'fb good';
      feedback.textContent = target.join(' ');
      checkButton.disabled = true;
      bank.querySelectorAll('.brick').forEach(brick => brick.disabled = true);
      gradeIn(S.patterns,item.id,attempts === 0);
      if(attempts === 0){ hits++; award('patternPerfect'); }
      done++; saveProgress();
      say(target.filter(token => token !== '?').join(' '));
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(nextStep,900);
      return;
    }
    attempts++;
    gradeIn(S.patterns,item.id,false);
    noteMistake('pattern',item.id);
    feedback.className = 'fb bad';
    /* Podpowiedź kierunkowa, nie gotowa odpowiedź: dziecko ma poprawić samo. */
    const firstWrong = placed.findIndex((token,index) => token !== target[index]);
    feedback.textContent = attempts >= 2
      ? 'Zacznij od: ' + target.slice(0,2).join(' ')
      : (firstWrong >= 0 ? 'Pierwsze ' + (firstWrong) + ' słów jest dobrze. Dalej coś się nie zgadza.' : 'Czegoś brakuje.');
    placed.length = 0;
    bank.querySelectorAll('.brick').forEach(brick => brick.disabled = false);
    refreshLine(); refreshCheck();
  });

  refreshLine();
}
function cssEscape(value){ return String(value).replace(/"/g,'\\"'); }

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

  if(!hasSR){
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

function renderMap(){
  const index = journeyIndex();
  $('#mapLead').textContent = 'Jerzyk jest na przystanku ' + (index+1) + ' z ' + JOURNEY_STOPS.length +
    '. Każdy zdany egzamin przenosi go dalej.';
  const list = $('#mapList');
  list.textContent = '';
  JOURNEY_STOPS.forEach((stop,position) => {
    const reached = position <= index;
    const row = make('li','map-stop' + (reached ? ' reached' : '') + (position === index ? ' current' : ''));
    row.append(make('span','map-number',String(position+1)));
    const body = make('div','map-body');
    body.append(make('strong','',reached ? stop.place + ', ' + stop.country : 'Jeszcze przed nami'));
    if(reached) body.append(make('span','map-fact',stop.fact));
    row.append(body);
    list.append(row);
  });

  const badges = $('#badgeList');
  badges.textContent = '';
  BADGES.forEach(badge => {
    const owned = S.badges.includes(badge.id);
    const chip = make('button','badge-card' + (owned ? ' owned' : ''));
    chip.type = 'button';
    chip.append(make('span','badge-icon',owned ? (badge.icon||'🏅') : '🔒'));
    chip.append(make('strong','',badge.name));
    chip.append(make('span','badge-desc',badge.desc));
    /* Zdobyte odznaki dają się otworzyć ponownie, żeby dało się wrócić
       do historyjki później, a nie tylko w chwili zdobycia. */
    if(owned) chip.addEventListener('click',()=>{ badgeQueue=[badge]; showNextBadge(); });
    else chip.disabled = true;
    badges.append(chip);
  });
}

/* ==================== PODPIĘCIA NOWYCH EKRANÓW ==================== */

$('#breakContinue').addEventListener('click',()=>startStage());
$('#breakStop').addEventListener('click',()=>finishLearning());
$('#openMap').addEventListener('click',()=>{ renderMap(); show('map'); });
$('#mapBack').addEventListener('click',()=>{ renderHome(); show('home'); });
