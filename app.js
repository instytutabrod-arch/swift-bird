'use strict';

const APP_VERSION = '10.3';
const DAY = 86400000;
const STEPS = [1,2,4,8,16,35,70];
const NEW_PER_SESSION = 4;
const MAX_SESSION_ITEMS = 20;
const SESSION_LIMIT = 5*60*1000;
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
  return {schema:2,cards:{},streak:0,lastDay:null,sessions:0,passedExams:[]};
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

function pickVoice(){
  if(!hasTTS) return;
  let voices=[];
  try{ voices=window.speechSynthesis.getVoices() || []; }catch(error){}
  const tag=item=>(item.lang||'').replace('_','-').toLowerCase();
  const english=voices.filter(item=>tag(item)==='en' || tag(item).startsWith('en-'));
  voice=english.find(item=>item.default) || english.find(item=>tag(item)==='en-us') || english.find(item=>tag(item)==='en') || english[0] || null;
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
  utterance.lang=voice?voice.lang:'en-US'; utterance.rate=.82; utterance.pitch=1.03; utterance.volume=1;
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
      // Przy trafieniu pokazujemy szukane slowo, nie surowa transkrypcje.
      // Przy pudle nie pokazujemy nic: dziecko nie ma powodu widziec,
      // ze silnik uslyszal cokolwiek innego, w tym wulgaryzm.
      if(ok)return finish({ok:true,text:target});
      const heardSomething=alternatives.length>0&&!alternatives.every(containsBlockedWord);
      finish({
        ok:false,
        text:'',
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
    button.textContent='Powtórz słowa'; button.addEventListener('click',startLearning);
  }else{
    note.textContent='Nowe słowo trafia do kolekcji dopiero po poprawnej wymowie i wpisaniu.';
    button.textContent=count?'Kontynuuj naukę':'Rozpocznij naukę'; button.addEventListener('click',startLearning);
  }
  action.append(note,button);
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
  done=0;hits=0;added=[];startedAt=Date.now();sessionRun++;
  $('#playSectionName').textContent=SECTIONS[currentSectionIndex].name;
  show('play'); nextStep();
}

function updateLearningProgress(){
  const byCount=done/(done+queue.length||1);
  const byTime=(Date.now()-startedAt)/SESSION_LIMIT;
  $('#barFill').style.width=Math.min(100,Math.max(byCount,byTime)*100)+'%';
}

function nextStep(){
  clearTimeout(advanceTimer); updateLearningProgress();
  if(!queue.length||((Date.now()-startedAt)>SESSION_LIMIT&&done>=8)) return finishLearning();
  const item=queue.shift();
  const stage=$('#stage'); stage.textContent='';
  if(item.mode==='intro') renderIntro(stage,item);
  else if(item.mode==='type-word') renderType(stage,item);
  else renderChoice(stage,item);
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
  touchStreak();S.sessions++;saveProgress();
  const count=sectionCollected(currentSectionIndex);
  $('#dNew').textContent=added.length;$('#dOk').textContent=hits;$('#dSection').textContent=count;
  $('#doneTitle').textContent=added.length?'Kolekcja rośnie!':'Powtórka zakończona!';
  const list=$('#dList');list.textContent='';added.forEach(card=>list.append(make('span','',card.ic+' '+card.en)));
  const action=$('#doneAction');action.textContent='';
  if(inTestMode()||(count===20&&!sectionPassed(currentSectionIndex))){
    const button=make('button','primary wide','Zdaj egzamin');button.type='button';button.addEventListener('click',()=>startExam(currentSectionIndex));action.append(button);
  }
  show('done');
}

/* ==================== EGZAMIN 4 × 5 ==================== */
let examDeck=[],examRoundIndex=0,examMatched=new Set(),selectedImage=null,selectedWord=null,examBusy=false;

function startExam(index){
  if(!inTestMode()&&(index>=openSectionCount()||sectionCollected(index)!==20)){toast('Najpierw zbierz wszystkie 20 słów.');return;}
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
    feedback.textContent='Good';feedback.className='exam-feedback good';
    speakSequence([card.en,'Good'],()=>{
      selectedImage=null;selectedWord=null;examBusy=false;
      $('#examProgress').style.width=((examRoundIndex*5+examMatched.size)/20*100)+'%';
      if(examMatched.size===5)setTimeout(advanceExam,450);
    });
  }else{
    selectedImage.button.classList.add('wrong');selectedWord.button.classList.add('wrong');
    feedback.textContent='Try again';feedback.className='exam-feedback bad';
    const spoken=selectedWord.card.en;
    speakSequence([spoken,'Try again'],()=>{
      clearSelection('image');clearSelection('word');selectedImage=null;selectedWord=null;examBusy=false;
    });
  }
}

function advanceExam(){
  examRoundIndex++;
  if(examRoundIndex<4)return renderExamRound();
  if(!sectionPassed(currentSectionIndex))S.passedExams.push(SECTIONS[currentSectionIndex].id);
  touchStreak();saveProgress();
  $('#examProgress').style.width='100%';$('#matchBoard').hidden=true;$('#examFeedback').textContent='';
  const complete=$('#examComplete');complete.hidden=false;complete.textContent='';
  complete.append(make('div','celebrate','🏆'),make('h1','','Egzamin zdany!'));
  const message=currentSectionIndex<SECTIONS.length-1?'Nowa sekcja została odblokowana.':'Brawo! Wszystkie 25 sekcji zostało ukończonych.';
  complete.append(make('p','',message));
  const button=make('button','primary wide',currentSectionIndex<SECTIONS.length-1?'Otwórz kolejną sekcję':'Wróć do sekcji');button.type='button';
  button.addEventListener('click',()=>renderSection(Math.min(currentSectionIndex+1,SECTIONS.length-1)));complete.append(button);
  speakSequence(['Good','Well done']);
}

/* ==================== PANEL ADMINISTRATORA ==================== */
let lastCredentials=null;

async function enterAdmin(){testMode=false;$('#testBanner').hidden=true;show('admin');await renderStudents();}

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
