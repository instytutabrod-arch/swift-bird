'use strict';

/* Osiem czasów angielskich.
 *
 * ZASADA, o którą prosił użytkownik: uczymy przez KONTRAST, nie przez regułę.
 * Każdy czas jest zestawiony z czasem, z którym najczęściej się myli, w tej
 * samej sytuacji. Dziecko/dorosły widzi RÓŻNICĘ w działaniu, a nie definicję.
 *
 * Każdy czas niesie tagi obu osi:
 *   cefr  — poziom językowy (A1–B2)
 *   bloom — najwyższy poziom poznawczy, jaki jego zadania osiągają
 *
 * Pola:
 *   short   — jednozdaniowe „do czego służy", językiem ucznia, bez żargonu
 *   form    — wzór budowy, pokazany na przykładzie, nie jako regułka
 *   signals — słowa-sygnały, które zdradzają ten czas (now, yesterday, ever…)
 *   examples— 3–4 zdania wzorcowe
 *   contrast— {with, prompt, a, b} — para zdań różniących się tylko czasem
 *   drills  — zadania: wybór formy, uzupełnienie, kontrast dwóch czasów
 */

const TENSES = [
  {
    id:'present-simple', name:'Present Simple', cefr:'A1', bloom:'apply',
    short:'Mówisz o tym, co robisz zwykle, regularnie, codziennie.',
    form:'I/you/we/they play · he/she/it plays',
    signals:['every day','usually','always','on Mondays','never','often'],
    examples:['I play football every day.','She reads before bed.','We go to school by bus.'],
    contrast:{
      with:'present-continuous',
      prompt:'To samo zdanie, dwa czasy. Poczuj różnicę.',
      a:'She reads every evening.',
      b:'She is reading right now.',
      note:'Zwykle kontra właśnie teraz.'
    },
    drills:[
      { type:'choose', cefr:'A1', bloom:'remember',
        q:'___ to school every day.', options:['I walk','I am walking'], correct:0,
        why:'„every day" to sygnał Present Simple.' },
      { type:'fill', cefr:'A2', bloom:'apply',
        q:'He ___ (eat) breakfast at seven.', answer:'eats',
        why:'Po he/she/it dodajemy -s.' },
      { type:'contrast', cefr:'A2', bloom:'analyze',
        prompt:'Które zdanie mówi o codziennym zwyczaju?',
        a:'I drink tea every morning.', b:'I am drinking tea now.', correct:0 }
    ]
  },
  {
    id:'present-continuous', name:'Present Continuous', cefr:'A1', bloom:'apply',
    short:'Mówisz o tym, co dzieje się właśnie teraz, w tej chwili.',
    form:'am/is/are + czasownik-ing',
    signals:['now','right now','at the moment','look!','listen!'],
    examples:['I am reading a book now.','They are playing outside.','Look! It is raining.'],
    contrast:{
      with:'present-simple',
      prompt:'Teraz kontra zwykle.',
      a:'He is running now.',
      b:'He runs every morning.',
      note:'W tej chwili kontra regularnie.'
    },
    drills:[
      { type:'choose', cefr:'A1', bloom:'remember',
        q:'Look! The baby ___.', options:['sleeps','is sleeping'], correct:1,
        why:'„Look!" to sygnał: dzieje się teraz.' },
      { type:'fill', cefr:'A2', bloom:'apply',
        q:'We ___ (watch) television at the moment.', answer:'are watching',
        why:'am/is/are + -ing dla teraz.' },
      { type:'contrast', cefr:'A2', bloom:'analyze',
        prompt:'Które zdanie mówi o czymś, co dzieje się w tej chwili?',
        a:'She plays tennis on Sundays.', b:'She is playing tennis now.', correct:1 }
    ]
  },
  {
    id:'past-simple', name:'Past Simple', cefr:'A2', bloom:'apply',
    short:'Mówisz o tym, co wydarzyło się i skończyło w przeszłości.',
    form:'czasownik + -ed · albo forma nieregularna (go → went)',
    signals:['yesterday','last week','in 2020','ago','last night'],
    examples:['I played football yesterday.','She went to school by bus.','We watched a film last night.'],
    contrast:{
      with:'present-perfect',
      prompt:'Kiedy dokładnie kontra kiedyś w życiu.',
      a:'I visited Rome in 2019.',
      b:'I have visited Rome.',
      note:'Znany czas w przeszłości kontra doświadczenie bez daty.'
    },
    drills:[
      { type:'choose', cefr:'A2', bloom:'remember',
        q:'I ___ my friend yesterday.', options:['see','saw'], correct:1,
        why:'„yesterday" to sygnał Past Simple; see → saw.' },
      { type:'fill', cefr:'A2', bloom:'apply',
        q:'They ___ (play) in the garden last Sunday.', answer:'played',
        why:'Regularny czasownik: + -ed.' },
      { type:'contrast', cefr:'B1', bloom:'analyze',
        prompt:'Które zdanie podaje konkretny moment w przeszłości?',
        a:'I have seen that film.', b:'I saw that film last week.', correct:1 }
    ]
  },
  {
    id:'past-continuous', name:'Past Continuous', cefr:'B1', bloom:'apply',
    short:'Mówisz o tym, co trwało w jakimś momencie przeszłości.',
    form:'was/were + czasownik-ing',
    signals:['while','when','at 8 o\u2019clock yesterday','all day'],
    examples:['I was reading when you called.','They were playing at six.','It was raining all day.'],
    contrast:{
      with:'past-simple',
      prompt:'Coś trwało, gdy coś się wydarzyło.',
      a:'I was cooking when he arrived.',
      b:'He arrived. I cooked dinner.',
      note:'Tło (trwało) kontra pojedyncze zdarzenie.'
    },
    drills:[
      { type:'choose', cefr:'B1', bloom:'remember',
        q:'I ___ a book when the phone rang.', options:['read','was reading'], correct:1,
        why:'Czynność trwała w tle: was + -ing.' },
      { type:'fill', cefr:'B1', bloom:'apply',
        q:'They ___ (play) football at five o\u2019clock.', answer:'were playing',
        why:'was/were + -ing dla trwania w przeszłości.' },
      { type:'contrast', cefr:'B1', bloom:'analyze',
        prompt:'Które zdanie opisuje czynność, która TRWAŁA?',
        a:'She was sleeping when I came in.', b:'She woke up and smiled.', correct:0 }
    ]
  },
  {
    id:'present-perfect', name:'Present Perfect', cefr:'B1', bloom:'apply',
    short:'Łączysz przeszłość z teraz: doświadczenie albo skutek widoczny dziś.',
    form:'have/has + trzecia forma (go → gone, see → seen)',
    signals:['ever','never','already','just','yet','since','for'],
    examples:['I have seen this film.','She has just arrived.','We have lived here for five years.'],
    contrast:{
      with:'past-simple',
      prompt:'Bez daty, ważny skutek — kontra konkretny czas.',
      a:'I have lost my keys.',
      b:'I lost my keys yesterday.',
      note:'Skutek trwa (wciąż ich nie mam) kontra znany moment.'
    },
    drills:[
      { type:'choose', cefr:'B1', bloom:'remember',
        q:'___ you ever ___ sushi?', options:['Did / eat','Have / eaten'], correct:1,
        why:'„ever" o doświadczeniu w życiu: Present Perfect.' },
      { type:'fill', cefr:'B1', bloom:'apply',
        q:'She ___ (finish) her homework already.', answer:'has finished',
        why:'has + trzecia forma; „already" to sygnał.' },
      { type:'contrast', cefr:'B2', bloom:'analyze',
        prompt:'Które zdanie NIE podaje, kiedy dokładnie?',
        a:'I have broken my phone.', b:'I broke my phone on Monday.', correct:0 }
    ]
  },
  {
    id:'future-will', name:'Future: will', cefr:'A2', bloom:'apply',
    short:'Decydujesz teraz, przewidujesz albo obiecujesz coś na przyszłość.',
    form:'will + czasownik',
    signals:['tomorrow','I think','probably','maybe','I promise'],
    examples:['I will help you.','It will rain tomorrow.','She will be ten next year.'],
    contrast:{
      with:'future-going-to',
      prompt:'Decyzja w tej chwili kontra wcześniejszy plan.',
      a:'The phone is ringing. I will answer it.',
      b:'I am going to answer emails later.',
      note:'Decyzja spontaniczna kontra plan zrobiony wcześniej.'
    },
    drills:[
      { type:'choose', cefr:'A2', bloom:'remember',
        q:'It\u2019s cold. I ___ close the window.', options:['will','am going to'], correct:0,
        why:'Decyzja w tej chwili: will.' },
      { type:'fill', cefr:'A2', bloom:'apply',
        q:'I think it ___ (be) sunny tomorrow.', answer:'will be',
        why:'Przewidywanie: will + czasownik.' },
      { type:'contrast', cefr:'B1', bloom:'analyze',
        prompt:'W którym zdaniu decyzja zapada właśnie teraz?',
        a:'I will carry that bag for you.', b:'We are going to move house.', correct:0 }
    ]
  },
  {
    id:'future-going-to', name:'Future: going to', cefr:'A2', bloom:'apply',
    short:'Mówisz o planie albo o tym, co widać, że się wydarzy.',
    form:'am/is/are going to + czasownik',
    signals:['next week','plan','look at those clouds','tonight'],
    examples:['I am going to visit my grandma.','Look! It is going to rain.','They are going to buy a car.'],
    contrast:{
      with:'future-will',
      prompt:'Plan albo dowód kontra decyzja na poczekaniu.',
      a:'Look at those clouds! It is going to rain.',
      b:'Maybe it will rain later.',
      note:'Widać, że nastąpi kontra przypuszczenie.'
    },
    drills:[
      { type:'choose', cefr:'A2', bloom:'remember',
        q:'We ___ visit Spain next summer. (plan)', options:['will','are going to'], correct:1,
        why:'Wcześniejszy plan: going to.' },
      { type:'fill', cefr:'B1', bloom:'apply',
        q:'Look at the sky! It ___ (snow).', answer:'is going to snow',
        why:'Widoczny dowód: going to.' },
      { type:'contrast', cefr:'B1', bloom:'analyze',
        prompt:'Które zdanie opiera się na tym, co widać teraz?',
        a:'She is going to have a baby.', b:'I will call you if I have time.', correct:0 }
    ]
  },
  {
    id:'present-perfect-continuous', name:'Present Perfect Continuous', cefr:'B2', bloom:'apply',
    short:'Podkreślasz, jak długo coś trwa aż do teraz, i że wciąż trwa.',
    form:'have/has been + czasownik-ing',
    signals:['for','since','all morning','how long','lately'],
    examples:['I have been waiting for an hour.','She has been studying since morning.','It has been raining all day.'],
    contrast:{
      with:'present-perfect',
      prompt:'Ile trwało kontra co się dokonało.',
      a:'I have been reading this book.',
      b:'I have read this book.',
      note:'Nacisk na trwanie (wciąż czytam) kontra na wynik (skończyłem).'
    },
    drills:[
      { type:'choose', cefr:'B2', bloom:'remember',
        q:'How long ___ you ___ here?', options:['have / been waiting','did / wait'], correct:0,
        why:'„How long" o trwaniu do teraz: have been + -ing.' },
      { type:'fill', cefr:'B2', bloom:'apply',
        q:'She ___ (study) English for three years.', answer:'has been studying',
        why:'have/has been + -ing; „for" to sygnał trwania.' },
      { type:'contrast', cefr:'B2', bloom:'analyze',
        prompt:'Które zdanie podkreśla, że czynność TRWAŁA długo?',
        a:'I have painted the room.', b:'I have been painting the room all day.', correct:1 }
    ]
  }
];

const TENSE_BY_ID = Object.fromEntries(TENSES.map(t => [t.id, t]));

/* Kolejność wprowadzania: od A1 w górę, pary kontrastowe blisko siebie.
   To decyduje, co odblokowuje się najpierw w programie czasów. */
const TENSE_ORDER = [
  'present-simple','present-continuous',
  'past-simple','past-continuous',
  'future-will','future-going-to',
  'present-perfect','present-perfect-continuous'
];

if (typeof window !== 'undefined'){
  window.TENSES = TENSES;
  window.TENSE_BY_ID = TENSE_BY_ID;
  window.TENSE_ORDER = TENSE_ORDER;
}
if (typeof module !== 'undefined'){
  module.exports = { TENSES, TENSE_BY_ID, TENSE_ORDER };
}
