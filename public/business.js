'use strict';

/* Sytuacje biznesowe — angielski zawodowy, poziomy B2 → C2.
 *
 * Dwa cele w jednym: (1) angielski do pracy, o który prosił użytkownik, i
 * (2) materiał wyższych poziomów CEFR, którego wcześniej brakowało. To nie
 * przypadek — język zawodowy naturalnie żyje na B2-C1: dyplomacja, niuans,
 * rejestr, precyzja. Dlatego biznes JEST materiałem C1/C2.
 *
 * Format zgodny z dialogues.js (ask/need/avoid/model/pl), więc wpina się w
 * istniejący mechanizm mówionych sytuacji. Każda sytuacja i tura niesie tagi
 * obu osi: CEFR (poziom) i Bloom (głębokość).
 *
 * Ocena jest tolerancyjna: liczy się obecność elementów kluczowych (need) i
 * brak typowych błędów (avoid). W rozmowie liczy się komunikacja, nie formuła.
 * Trudność rośnie: B2 to sprawna komunikacja, C1 to niuans i dyplomacja,
 * C2 to precyzja i subtelność rejestru.
 */

const BUSINESS_SITUATIONS = [
  /* ---------- B2: sprawna komunikacja zawodowa ---------- */
  {
    id: 'biz-introduce', title: 'Przedstawienie się na spotkaniu', cefr: 'B2', bloom: 'apply',
    context: 'Pierwszy dzień w nowym projekcie. Przedstawiasz się zespołowi.',
    intro: 'Poznajesz zespół. Krótko, konkretnie, profesjonalnie.',
    turns: [
      { ask: 'Welcome aboard. Could you tell us a bit about yourself?',
        need: [['my name is','i\u2019m','i am']], avoid: ['i have name','i am called mister'],
        model: 'Hello, I am Anna, and I have joined as the new project lead.',
        pl: 'Przedstaw się: imię i rola w zespole.', cefr: 'B2', bloom: 'apply' },
      { ask: 'What is your background?',
        need: [['i have','i\u2019ve','worked','experience','spent','years','background']], avoid: ['i am work','i working since'],
        model: 'I have spent the last five years managing software teams.',
        pl: 'Opisz swoje doświadczenie (użyj Present Perfect).', cefr: 'B2', bloom: 'apply' },
      { ask: 'What are you hoping to achieve here?',
        need: [['i hope','i\u2019d like','my goal','i want to','aim']], avoid: ['i will do everything'],
        model: 'I\u2019d like to streamline how we deliver projects.',
        pl: 'Powiedz, co chcesz osiągnąć.', cefr: 'B2', bloom: 'create' }
    ]
  },
  {
    id: 'biz-update', title: 'Status projektu', cefr: 'B2', bloom: 'analyze',
    context: 'Cotygodniowy przegląd. Raportujesz jasno: zrobione, w toku, ryzyko.',
    intro: 'Zdajesz raport. Struktura: co gotowe, co trwa, co zagraża.',
    turns: [
      { ask: 'Where do we stand on the project?',
        need: [['have','completed','finished','delivered','done','on track','so far']], avoid: ['it is good','all fine'],
        model: 'We have completed the first phase and we\u2019re on track.',
        pl: 'Powiedz, co już zrobione (Present Perfect).', cefr: 'B2', bloom: 'analyze' },
      { ask: 'And the current focus?',
        need: [['we are','we’re'],['working','integrating','testing','developing','preparing','building','reviewing','focusing']], avoid: ['we focus now','we work on'],
        model: 'We are currently integrating the payment system.',
        pl: 'Powiedz, nad czym pracujecie teraz.', cefr: 'B2', bloom: 'apply' },
      { ask: 'Any risks I should flag upward?',
        need: [['risk','delay','concern','depends','waiting','bottleneck','however','although']], avoid: ['no risk everything perfect'],
        model: 'There is a risk of delay, as we depend on a third-party API.',
        pl: 'Zgłoś ryzyko i jego przyczynę.', cefr: 'B2', bloom: 'analyze' }
    ]
  },
  {
    id: 'biz-email', title: 'Prośba w mailu', cefr: 'B2', bloom: 'apply',
    context: 'Piszesz do partnera z prośbą. Ton uprzejmy, treść precyzyjna.',
    intro: 'Formułujesz prośbę na głos, tak jak wpiszesz ją do maila.',
    turns: [
      { ask: 'How do you open a polite request?',
        need: [['would you','could you','i would appreciate','would it be possible']], avoid: ['send me','give me','i want you to'],
        model: 'Would it be possible to share the updated figures?',
        pl: 'Poproś uprzejmie o zaktualizowane dane.', cefr: 'B2', bloom: 'apply' },
      { ask: 'How do you specify the deadline without sounding pushy?',
        need: [['by','before','if possible','ideally','no later than','would help']], avoid: ['right now','immediately or else'],
        model: 'Ideally by Thursday, if that works on your end.',
        pl: 'Podaj termin, ale niekonfrontacyjnie.', cefr: 'C1', bloom: 'evaluate' },
      { ask: 'And a professional closing?',
        need: [['thank you','many thanks','best regards','i appreciate','look forward']], avoid: ['bye','see ya','cheers mate'],
        model: 'Many thanks in advance. Best regards, Anna.',
        pl: 'Zakończ maila profesjonalnie.', cefr: 'B2', bloom: 'apply' }
    ]
  },
  /* ---------- C1: niuans, dyplomacja, negocjacja ---------- */
  {
    id: 'biz-negotiate', title: 'Negocjacja ceny', cefr: 'C1', bloom: 'evaluate',
    context: 'Klient naciska na obniżkę. Bronisz wartości, ale szukasz porozumienia.',
    intro: 'Negocjujesz. Nie ustępujesz od razu, wiążesz ustępstwo z warunkiem.',
    turns: [
      { ask: 'Frankly, your quote is higher than we expected.',
        need: [['i understand','i appreciate','i see','the price reflects','value','because']], avoid: ['ok i lower','fine cheaper'],
        model: 'I appreciate that, though the price reflects the full scope.',
        pl: 'Uznaj obawę, ale obroń wartość oferty.', cefr: 'C1', bloom: 'evaluate' },
      { ask: 'Still, we have budget limits.',
        need: [['if you','provided','in that case','i could','we might','on condition','as long as']], avoid: ['ok take it','fine whatever'],
        model: 'If you commit to a longer term, I could offer a discount.',
        pl: 'Zaproponuj ustępstwo warunkowe.', cefr: 'C1', bloom: 'create' },
      { ask: 'That could work. Let\u2019s explore it.',
        need: [['i\u2019m glad','let\u2019s','i\u2019ll draft','shall i','i will send','put together']], avoid: [],
        model: 'I\u2019m glad we\u2019re aligned. I\u2019ll draft the revised terms.',
        pl: 'Potwierdź kierunek i zaproponuj następny krok.', cefr: 'C1', bloom: 'apply' }
    ]
  },
  {
    id: 'biz-disagree', title: 'Dyplomatyczna różnica zdań', cefr: 'C1', bloom: 'evaluate',
    context: 'Na spotkaniu pada propozycja, z którą się nie zgadzasz. Sprzeciwiasz się z szacunkiem.',
    intro: 'Nie zgadzasz się, ale kulturalnie: uznaj rację, wskaż lukę, zaproponuj alternatywę.',
    turns: [
      { ask: 'I propose we launch next Monday.',
        need: [['i see the appeal','i take your point','i understand','that said','however','while i']], avoid: ['you are wrong','bad idea','no'],
        model: 'I take your point. That said, I have some reservations about timing.',
        pl: 'Uznaj propozycję, ale zasygnalizuj wątpliwość.', cefr: 'C1', bloom: 'evaluate' },
      { ask: 'What exactly worries you?',
        need: [['because','my concern','the issue is','we haven\u2019t','risk of','without']], avoid: ['just feel','dont know really'],
        model: 'My concern is that we haven\u2019t finished load testing.',
        pl: 'Uzasadnij wątpliwość konkretnie.', cefr: 'C1', bloom: 'analyze' },
      { ask: 'So what would you propose instead?',
        need: [['i\u2019d suggest','what if we','i recommend','we could','a safer option','rather than']], avoid: ['do whatever'],
        model: 'I\u2019d suggest a soft launch first, rather than a full release.',
        pl: 'Zaproponuj przemyślaną alternatywę.', cefr: 'C1', bloom: 'create' }
    ]
  },
  /* ---------- C2: precyzja, rejestr, subtelność ---------- */
  {
    id: 'biz-feedback', title: 'Trudna informacja zwrotna', cefr: 'C2', bloom: 'create',
    context: 'Musisz przekazać współpracownikowi krytyczną uwagę, nie zrażając go.',
    intro: 'Dajesz trudny feedback. Konkret, szacunek, droga naprzód, bez owijania i bez ataku.',
    turns: [
      { ask: 'You wanted to talk about my report?',
        need: [['i\u2019d like to','let\u2019s','i want to discuss','there\u2019s something','i think we can']], avoid: ['your report is bad','you failed'],
        model: 'I\u2019d like to talk through a few things we can strengthen.',
        pl: 'Otwórz rozmowę tak, by nie zabrzmiała jak atak.', cefr: 'C2', bloom: 'create' },
      { ask: 'Okay, go on.',
        need: [['the analysis','while','the conclusion','however','one thing','it would help if','i noticed']], avoid: ['everything wrong','you never'],
        model: 'The analysis is solid; however, the conclusion overstates the data.',
        pl: 'Wskaż mocną stronę, potem precyzyjny problem.', cefr: 'C2', bloom: 'evaluate' },
      { ask: 'Fair enough. How should I fix it?',
        need: [['i\u2019d recommend','it might help','consider','you could','one option','what if you']], avoid: ['just redo it','figure it out'],
        model: 'I\u2019d recommend softening the claim and citing the source.',
        pl: 'Zaproponuj konkretną, wykonalną poprawę.', cefr: 'C2', bloom: 'create' }
    ]
  }
];

/* Słownictwo zawodowe wyłania się ze zdań powyżej. Nie oderwane fiszki —
   każde słowo pochodzi z realnego zdania w sytuacji. */
const BUSINESS_GLOSSARY = [
  { en:'project lead', pl:'kierownik projektu' },
  { en:'background', pl:'doświadczenie, przeszłość zawodowa' },
  { en:'to streamline', pl:'usprawnić' },
  { en:'on track', pl:'zgodnie z planem' },
  { en:'to integrate', pl:'zintegrować' },
  { en:'bottleneck', pl:'wąskie gardło' },
  { en:'to flag', pl:'zasygnalizować' },
  { en:'quote', pl:'wycena, oferta cenowa' },
  { en:'scope', pl:'zakres' },
  { en:'to commit', pl:'zobowiązać się' },
  { en:'revised terms', pl:'zmienione warunki' },
  { en:'reservations', pl:'zastrzeżenia' },
  { en:'load testing', pl:'testy obciążeniowe' },
  { en:'soft launch', pl:'ograniczone wdrożenie próbne' },
  { en:'to overstate', pl:'wyolbrzymiać' },
  { en:'to cite', pl:'przytoczyć źródło' },
  { en:'aligned', pl:'zgodni, na jednej linii' },
  { en:'to draft', pl:'sporządzić wstępną wersję' },
  { en:'pushy', pl:'nachalny' },
  { en:'to acquiesce', pl:'przystać na coś niechętnie' }
];

/* Dopasowanie odpowiedzi komunikacyjnych działa na całych słowach i frazach.
   Dzięki temu krótki warunek "are" nie przechodzi przypadkiem w słowie
   "care", a poprawna dalsza hipoteza ASR może zostać zaakceptowana. */
function normalizeBusinessAnswer(value){
  return String(value||'').toLowerCase()
    .replace(/[\u2019']/g,'')
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function containsPhrase(answer,phrase){
  const text=normalizeBusinessAnswer(answer);const token=normalizeBusinessAnswer(phrase);
  if(String(phrase||'').startsWith('@suffix:')){
    const suffix=normalizeBusinessAnswer(String(phrase).slice(8));
    return Boolean(text&&suffix)&&text.split(' ').some(word=>word.length>suffix.length+1&&word.endsWith(suffix));
  }
  return Boolean(text&&token)&&(' '+text+' ').includes(' '+token+' ');
}
function answerCovers(answer,need){
  return (need||[]).every(group=>group.some(token=>containsPhrase(answer,token)));
}
function answerAvoids(answer,avoid){
  return !(avoid||[]).some(token=>containsPhrase(answer,token));
}
function answerMatches(answer,turn){
  return Boolean(turn)&&answerCovers(answer,turn.need)&&answerAvoids(answer,turn.avoid);
}
function matchingAlternative(alternatives,turn){
  return (alternatives||[]).find(answer=>answerMatches(answer,turn))||'';
}
const BUSINESS_LEVEL_ORDER={A1:1,A2:2,B1:3,B2:4,C1:5,C2:6};
function isAvailable(situationLevel,unlockedLevel){
  return (BUSINESS_LEVEL_ORDER[unlockedLevel]||1)>=(BUSINESS_LEVEL_ORDER[situationLevel]||1);
}
function progressLabel(record){
  const done=Math.max(0,Number(record&&record.done)||0);
  const ok=Math.max(0,Number(record&&record.ok)||0);
  return 'Przećwiczone '+done+(done===1?' raz':' razy')+' · '+ok+' odpowiedzi za pierwszym razem łącznie';
}

const BUSINESS_MATCHING={
  normalizeBusinessAnswer,containsPhrase,answerCovers,answerAvoids,answerMatches,
  matchingAlternative,isAvailable,progressLabel
};

if (typeof window !== 'undefined'){
  window.BUSINESS_SITUATIONS = BUSINESS_SITUATIONS;
  window.BUSINESS_GLOSSARY = BUSINESS_GLOSSARY;
  window.BUSINESS_MATCHING = BUSINESS_MATCHING;
}
if (typeof module !== 'undefined'){
  module.exports = { BUSINESS_SITUATIONS, BUSINESS_GLOSSARY, BUSINESS_MATCHING };
}
