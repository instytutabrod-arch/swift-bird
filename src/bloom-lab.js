'use strict';

/* Pracownia domyka dwa najwyższe procesy zrewidowanej taksonomii Blooma.
   EWALUACJA: decyzja według jawnego kryterium + uzasadnienie.
   TWORZENIE: własna wypowiedź + autokontrola + odczytanie jej na głos.
   To nie jest część testu CEFR; opisuje głębokość pracy z materiałem. */

const BLOOM_LAB_TASKS={
  'present-simple':{
    evaluate:{cefr:'A1',knowledge:'procedural',criterion:'Zdanie ma opisywać stały, powtarzalny zwyczaj.',prompt:'Które zdanie lepiej spełnia cel?',options:['I work from home every Monday.','I am working from home right now.'],answer:0,reasons:['„Every Monday” wskazuje na regularność.','Obie formy są poprawne, wybór zależy od gustu.','Druga forma jest lepsza, bo brzmi nowocześniej.'],reason:0},
    create:{cefr:'A1',prompt:'Napisz prawdziwe zdanie o swojej rutynie.',support:'Możesz użyć: every day, usually, often, always, never.',minWords:4,features:[{label:'Dodaj sygnał powtarzalności, np. every day albo usually.',pattern:/\b(every|usually|often|always|never|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i}]}
  },
  'present-continuous':{
    evaluate:{cefr:'A1',knowledge:'procedural',criterion:'Zdanie ma powiedzieć, co dzieje się dokładnie teraz.',prompt:'Które zdanie lepiej spełnia cel?',options:['She is talking to a client now.','She talks to clients every week.'],answer:0,reasons:['„Is talking” i „now” pokazują trwającą chwilę.','„Every week” też mówi o teraz, bo to niedawno.','Obie formy znaczą to samo, różni je tylko długość.'],reason:0},
    create:{cefr:'A1',prompt:'Napisz, co ty albo ktoś obok robi teraz.',support:'Użyj am/is/are + czasownik-ing.',minWords:4,features:[{label:'Użyj am, is lub are oraz formy z -ing.',pattern:/\b(am|is|are)\s+[a-z]+ing\b/i},{label:'Dodaj kontekst chwili obecnej, np. now.',pattern:/\b(now|right now|at the moment|look|listen)\b/i}]}
  },
  'past-simple':{
    evaluate:{cefr:'A2',knowledge:'procedural',criterion:'Zdanie ma opisać zakończone wydarzenie z określonym momentem w przeszłości.',prompt:'Które zdanie jest precyzyjniejsze?',options:['We sent the report yesterday.','We have sent the report.'],answer:0,reasons:['„Yesterday” wskazuje zakończony, określony czas.','Druga wersja jest bezpieczniejsza, bo Present Perfect pasuje zawsze.','Z konkretną datą można użyć obu czasów zamiennie.'],reason:0},
    create:{cefr:'A2',prompt:'Napisz jedno zdanie o czymś, co zrobiłeś lub zrobiłaś wczoraj.',support:'Dodaj yesterday albo last… i użyj formy przeszłej.',minWords:5,features:[{label:'Dodaj określenie zakończonego czasu.',pattern:/\b(yesterday|last (night|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|[0-9]+ (day|days|week|weeks|month|months|year|years) ago|in [12][0-9]{3})\b/i},{label:'Użyj formy przeszłej.',pattern:/\b([a-z]+ed|went|saw|had|did|was|were|made|took|came|got|ate|wrote|read|sent|bought)\b/i}]}
  },
  'past-continuous':{
    evaluate:{cefr:'B1',knowledge:'procedural',criterion:'Zdanie ma pokazać czynność, która trwała, gdy wydarzyło się coś krótszego.',prompt:'Które zdanie lepiej buduje tło wydarzenia?',options:['I was preparing dinner when the phone rang.','I prepared dinner after the phone rang.'],answer:0,reasons:['„Was preparing” pokazuje trwanie, a „rang” krótkie zdarzenie.','Druga wersja mówi to samo, tylko prościej.','Kolejność zdarzeń jest tu bez znaczenia.'],reason:0},
    create:{cefr:'B1',prompt:'Napisz zdanie: co trwało, gdy wydarzyło się coś krótszego?',support:'Użyj was/were + -ing oraz when.',minWords:7,features:[{label:'Zbuduj trwające tło: was/were + -ing.',pattern:/\b(was|were)\s+[a-z]+ing\b/i},{label:'Połącz wydarzenia słowem when albo while.',pattern:/\b(when|while)\b/i}]}
  },
  'present-perfect':{
    evaluate:{cefr:'B1',knowledge:'procedural',criterion:'Zdanie ma podkreślać obecny skutek, bez podawania zakończonej daty.',prompt:'Które zdanie najlepiej pasuje do sytuacji: nie mam teraz kluczy?',options:['I have lost my keys.','I lost my keys last Tuesday.'],answer:0,reasons:['Present Perfect łączy wcześniejsze zdarzenie z obecnym skutkiem.','Druga wersja jest lepsza, bo podaje więcej szczegółów.','Skoro wiadomo kiedy, obie wersje pasują tak samo.'],reason:0},
    create:{cefr:'B1',prompt:'Napisz zdanie o doświadczeniu albo skutku ważnym teraz.',support:'Użyj have/has + trzecia forma; możesz dodać ever, just, already lub yet.',minWords:5,features:[{label:'Użyj have/has + trzecia forma.',pattern:/\b(have|has)\s+(just\s+|already\s+|never\s+)?([a-z]+ed|been|gone|seen|done|made|had|written|read|lost|finished|sent|bought|taken)\b/i}]}
  },
  'future-will':{
    evaluate:{cefr:'A2',knowledge:'procedural',criterion:'Zdanie ma wyrażać decyzję podjętą w tej chwili, a nie wcześniejszy plan.',prompt:'Telefon właśnie dzwoni. Która odpowiedź pasuje lepiej?',options:['I will answer it.','I am going to answer it next Monday.'],answer:0,reasons:['„Will” pasuje do spontanicznej decyzji.','Do decyzji na już pasują oba, bo mówią o przyszłości.','Druga wersja jest grzeczniejsza, więc lepsza.'],reason:0},
    create:{cefr:'A2',prompt:'Napisz spontaniczną obietnicę, decyzję albo przewidywanie.',support:'Użyj will + czasownik.',minWords:4,features:[{label:'Użyj will + czasownik.',pattern:/\bwill\s+[a-z]+\b/i}]}
  },
  'future-going-to':{
    evaluate:{cefr:'A2',knowledge:'procedural',criterion:'Zdanie ma opisywać plan przygotowany wcześniej albo przewidywanie oparte na widocznym dowodzie.',prompt:'Widzisz bardzo ciemne chmury. Co powiesz?',options:['It is going to rain.','It will probably rain one day.'],answer:0,reasons:['„Going to” łączy przewidywanie z widocznym dowodem.','Przy pogodzie oba czasy są równie dobre.','„Probably” czyni drugie zdanie pewniejszym.'],reason:0},
    create:{cefr:'A2',prompt:'Napisz zdanie o swoim wcześniej przygotowanym planie.',support:'Użyj am/is/are going to + czasownik.',minWords:5,features:[{label:'Użyj am/is/are going to + czasownik.',pattern:/\b(am|is|are)\s+going to\s+[a-z]+\b/i}]}
  },
  'present-perfect-continuous':{
    evaluate:{cefr:'B2',knowledge:'procedural',criterion:'Zdanie ma podkreślać długość czynności trwającej do teraz, a nie tylko jej wynik.',prompt:'Które zdanie najlepiej odpowiada na pytanie “How long?”',options:['I have been working here for three years.','I have completed three projects.'],answer:0,reasons:['Have been + -ing oraz „for” podkreślają czas trwania.','Druga wersja też pokazuje trwanie, bo wymienia wynik.','O czasie trwania mówią oba zdania tak samo.'],reason:0},
    create:{cefr:'B2',prompt:'Napisz, jak długo trwa czynność rozpoczęta wcześniej i nadal aktualna.',support:'Użyj have/has been + -ing oraz for albo since.',minWords:6,features:[{label:'Użyj have/has been + czasownik-ing.',pattern:/\b(have|has)\s+been\s+[a-z]+ing\b/i},{label:'Określ czas trwania przez for albo since.',pattern:/\b(for|since)\b/i}]}
  }
};

function inspectCreation(value,task){
  const text=String(value||'').trim();
  const words=(text.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g)||[]);
  const checks=[
    {id:'capital',label:'Zdanie zaczyna się wielką literą.',ok:/^[A-Z]/.test(text)},
    {id:'ending',label:'Zdanie kończy się kropką, pytajnikiem albo wykrzyknikiem.',ok:/[.!?]$/.test(text)},
    {id:'length',label:'Wypowiedź jest pełnym zdaniem.',ok:words.length>=(task.minWords||4)}
  ];
  (task.features||[]).forEach((feature,index)=>{
    const pattern=feature.pattern instanceof RegExp?new RegExp(feature.pattern.source,feature.pattern.flags):null;
    checks.push({id:'feature-'+index,label:feature.label,ok:Boolean(pattern&&pattern.test(text))});
  });
  return {text,checks,passed:Boolean(text)&&checks.every(check=>check.ok)};
}

const bloomLabExports={BLOOM_LAB_TASKS,inspectCreation};
if(typeof window!=='undefined')window.BLOOM_LAB=bloomLabExports;
if(typeof module!=='undefined')module.exports=bloomLabExports;
