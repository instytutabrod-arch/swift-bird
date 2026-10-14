'use strict';

/* Baza słownictwa tematycznego dla dorosłych — bez symboli, z czytaniem na
 * głos i wpisywaniem. Zastępuje pustą funkcję "moje pule" gotową treścią.
 *
 * Cztery dziedziny, odblokowywane jak poziomy: uczeń kończy jedną, otwiera
 * następną. Kolejność od najbardziej podstawowej do bardziej sytuacyjnej.
 *
 * Każde słowo: en (angielskie), pl (polskie). Bez ikon — te słowa są
 * użytkowe i abstrakcyjne, ilustracja nie pomaga. Nauka przez wymowę i
 * pisownię, nie przez obrazek.
 *
 * Kolejność dziedzin w tablicy = kolejność odblokowywania.
 */

const VOCAB_DOMAINS = [
  {
    id: 'daily', title: 'Codzienne czynności', order: 1,
    intro: 'Podstawa: to, co robisz każdego dnia.',
    words: [
      {en:'to wake up', pl:'budzić się'},
      {en:'to get up', pl:'wstawać'},
      {en:'to brush teeth', pl:'myć zęby'},
      {en:'to take a shower', pl:'brać prysznic'},
      {en:'to get dressed', pl:'ubierać się'},
      {en:'to have breakfast', pl:'jeść śniadanie'},
      {en:'to leave home', pl:'wychodzić z domu'},
      {en:'to go to work', pl:'iść do pracy'},
      {en:'to make a call', pl:'wykonać telefon'},
      {en:'to run errands', pl:'załatwiać sprawy'},
      {en:'to do the shopping', pl:'robić zakupy'},
      {en:'to cook dinner', pl:'gotować obiad'},
      {en:'to do the laundry', pl:'robić pranie'},
      {en:'to clean up', pl:'sprzątać'},
      {en:'to take out the rubbish', pl:'wynosić śmieci'},
      {en:'to relax', pl:'odpoczywać'},
      {en:'to watch television', pl:'oglądać telewizję'},
      {en:'to go to bed', pl:'kłaść się spać'},
      {en:'to fall asleep', pl:'zasypiać'},
      {en:'to set an alarm', pl:'nastawić budzik'}
    ]
  },
  {
    id: 'travel', title: 'Podróże', order: 2,
    intro: 'W drodze: lotnisko, hotel, orientacja.',
    words: [
      {en:'departure', pl:'odlot, odjazd'},
      {en:'arrival', pl:'przylot, przyjazd'},
      {en:'boarding pass', pl:'karta pokładowa'},
      {en:'luggage', pl:'bagaż'},
      {en:'carry-on', pl:'bagaż podręczny'},
      {en:'to check in', pl:'odprawić się'},
      {en:'gate', pl:'bramka'},
      {en:'delay', pl:'opóźnienie'},
      {en:'connecting flight', pl:'lot przesiadkowy'},
      {en:'customs', pl:'odprawa celna'},
      {en:'passport control', pl:'kontrola paszportowa'},
      {en:'to book a room', pl:'zarezerwować pokój'},
      {en:'reception', pl:'recepcja'},
      {en:'to check out', pl:'wymeldować się'},
      {en:'vacancy', pl:'wolny pokój'},
      {en:'sightseeing', pl:'zwiedzanie'},
      {en:'landmark', pl:'punkt orientacyjny, zabytek'},
      {en:'to get lost', pl:'zgubić się'},
      {en:'directions', pl:'wskazówki dojazdu'},
      {en:'currency exchange', pl:'kantor'}
    ]
  },
  {
    id: 'restaurant', title: 'Restauracja', order: 3,
    intro: 'Przy stole: zamawianie, płacenie, rozmowa.',
    words: [
      {en:'to book a table', pl:'zarezerwować stolik'},
      {en:'menu', pl:'karta dań'},
      {en:'starter', pl:'przystawka'},
      {en:'main course', pl:'danie główne'},
      {en:'side dish', pl:'dodatek'},
      {en:'dessert', pl:'deser'},
      {en:'to order', pl:'zamawiać'},
      {en:'the bill', pl:'rachunek'},
      {en:'tip', pl:'napiwek'},
      {en:'still water', pl:'woda niegazowana'},
      {en:'sparkling water', pl:'woda gazowana'},
      {en:'course', pl:'danie'},
      {en:'rare', pl:'krwisty (o mięsie)'},
      {en:'well done', pl:'dobrze wysmażony'},
      {en:'to be allergic to', pl:'być uczulonym na'},
      {en:'vegetarian', pl:'wegetariański'},
      {en:'to recommend', pl:'polecać'},
      {en:'refill', pl:'dolewka'},
      {en:'takeaway', pl:'na wynos'},
      {en:'service charge', pl:'opłata za obsługę'}
    ]
  },
  {
    id: 'transport', title: 'Komunikacja miejska', order: 4,
    intro: 'W mieście: bilety, przystanki, przesiadki.',
    words: [
      {en:'ticket', pl:'bilet'},
      {en:'single ticket', pl:'bilet jednorazowy'},
      {en:'return ticket', pl:'bilet powrotny'},
      {en:'season ticket', pl:'bilet okresowy'},
      {en:'to validate', pl:'skasować bilet'},
      {en:'fare', pl:'opłata za przejazd'},
      {en:'stop', pl:'przystanek'},
      {en:'to get on', pl:'wsiadać'},
      {en:'to get off', pl:'wysiadać'},
      {en:'to change', pl:'przesiadać się'},
      {en:'platform', pl:'peron'},
      {en:'timetable', pl:'rozkład jazdy'},
      {en:'rush hour', pl:'godziny szczytu'},
      {en:'delay', pl:'opóźnienie'},
      {en:'route', pl:'trasa'},
      {en:'line', pl:'linia'},
      {en:'terminus', pl:'przystanek końcowy'},
      {en:'to miss the bus', pl:'spóźnić się na autobus'},
      {en:'fine', pl:'mandat'},
      {en:'to top up a card', pl:'doładować kartę'}
    ]
  },
  {
    id: 'parenting', title: 'Wychowanie', order: 5,
    intro: 'Dzieci na co dzień: opieka, rozwój, codzienność.',
    words: [
      {en:'to raise a child', pl:'wychowywać dziecko'},
      {en:'to bring up', pl:'wychowywać'},
      {en:'toddler', pl:'małe dziecko, brzdąc'},
      {en:'nappy', pl:'pieluszka'},
      {en:'to feed', pl:'karmić'},
      {en:'to soothe', pl:'uspokajać'},
      {en:'bedtime', pl:'pora spania'},
      {en:'to behave', pl:'zachowywać się'},
      {en:'to misbehave', pl:'źle się zachowywać'},
      {en:'tantrum', pl:'napad złości'},
      {en:'to set boundaries', pl:'wyznaczać granice'},
      {en:'chores', pl:'obowiązki domowe'},
      {en:'allowance', pl:'kieszonkowe'},
      {en:'to praise', pl:'chwalić'},
      {en:'to scold', pl:'karcić'},
      {en:'milestone', pl:'kamień milowy rozwoju'},
      {en:'to grow up', pl:'dorastać'},
      {en:'sibling', pl:'rodzeństwo'},
      {en:'upbringing', pl:'wychowanie'},
      {en:'to look after', pl:'opiekować się'}
    ]
  },
  {
    id: 'pharmacy', title: 'Apteka', order: 6,
    intro: 'W aptece: leki, dawkowanie, dolegliwości.',
    words: [
      {en:'prescription', pl:'recepta'},
      {en:'over-the-counter', pl:'bez recepty'},
      {en:'painkiller', pl:'środek przeciwbólowy'},
      {en:'dose', pl:'dawka'},
      {en:'dosage', pl:'dawkowanie'},
      {en:'side effect', pl:'skutek uboczny'},
      {en:'tablet', pl:'tabletka'},
      {en:'capsule', pl:'kapsułka'},
      {en:'ointment', pl:'maść'},
      {en:'cough syrup', pl:'syrop na kaszel'},
      {en:'plaster', pl:'plaster'},
      {en:'bandage', pl:'bandaż'},
      {en:'to relieve', pl:'łagodzić (ból)'},
      {en:'allergy', pl:'alergia'},
      {en:'refill', pl:'ponowna realizacja recepty'},
      {en:'expiry date', pl:'data ważności'},
      {en:'to take on an empty stomach', pl:'przyjmować na czczo'},
      {en:'twice a day', pl:'dwa razy dziennie'},
      {en:'to consult a pharmacist', pl:'skonsultować się z farmaceutą'},
      {en:'supplement', pl:'suplement'}
    ]
  },
  {
    id: 'hospital', title: 'Szpital', order: 7,
    intro: 'W szpitalu: badania, zabiegi, personel.',
    words: [
      {en:'emergency room', pl:'izba przyjęć, SOR'},
      {en:'appointment', pl:'wizyta, termin'},
      {en:'to admit', pl:'przyjąć do szpitala'},
      {en:'to discharge', pl:'wypisać ze szpitala'},
      {en:'ward', pl:'oddział'},
      {en:'surgery', pl:'operacja'},
      {en:'to undergo', pl:'przechodzić (zabieg)'},
      {en:'diagnosis', pl:'diagnoza'},
      {en:'symptom', pl:'objaw'},
      {en:'to examine', pl:'badać'},
      {en:'X-ray', pl:'prześwietlenie'},
      {en:'blood test', pl:'badanie krwi'},
      {en:'referral', pl:'skierowanie'},
      {en:'painful', pl:'bolesny'},
      {en:'to recover', pl:'wracać do zdrowia'},
      {en:'recovery', pl:'powrót do zdrowia'},
      {en:'anaesthetic', pl:'znieczulenie'},
      {en:'stitches', pl:'szwy'},
      {en:'to feel dizzy', pl:'mieć zawroty głowy'},
      {en:'to be in pain', pl:'odczuwać ból'}
    ]
  },
  {
    id: 'driving', title: 'Transport i prowadzenie', order: 8,
    intro: 'Za kierownicą i w drodze: auto, tankowanie, przepisy.',
    words: [
      {en:'to drive', pl:'prowadzić'},
      {en:'driving licence', pl:'prawo jazdy'},
      {en:'to fill up', pl:'zatankować'},
      {en:'petrol', pl:'benzyna'},
      {en:'diesel', pl:'olej napędowy'},
      {en:'to park', pl:'parkować'},
      {en:'car park', pl:'parking'},
      {en:'traffic jam', pl:'korek'},
      {en:'speed limit', pl:'ograniczenie prędkości'},
      {en:'roundabout', pl:'rondo'},
      {en:'junction', pl:'skrzyżowanie'},
      {en:'to overtake', pl:'wyprzedzać'},
      {en:'to pull over', pl:'zjechać na pobocze'},
      {en:'seatbelt', pl:'pas bezpieczeństwa'},
      {en:'to give way', pl:'ustąpić pierwszeństwa'},
      {en:'toll', pl:'opłata za autostradę'},
      {en:'breakdown', pl:'awaria'},
      {en:'to tow', pl:'holować'},
      {en:'detour', pl:'objazd'},
      {en:'to run out of fuel', pl:'zabraknąć paliwa'}
    ]
  }
];

if (typeof window !== 'undefined'){
  window.VOCAB_DOMAINS = VOCAB_DOMAINS;
}
if (typeof module !== 'undefined'){
  module.exports = { VOCAB_DOMAINS };
}
