'use strict';

/* Wyprawa Jerzyka z Jerzykowa.
 *
 * Rama fabularna kursu: 25 sekcji słownictwa to 25 przystanków lotu
 * z Jerzykowa w gminie Pobiedziska aż na Tasmanię. Zdany egzamin sekcji
 * przenosi ptaka na kolejny przystanek.
 *
 * ZASADA: sama wyprawa jest wymyślona, ale KAŻDY fakt w polu `fact` jest
 * prawdziwy. Przystanek 13 mówi o tym dziecku wprost, żeby nikt później
 * nie poczuł się wprowadzony w błąd: jerzyk zwyczajny z polskich dachów
 * zimuje w Afryce, a do Australii dolatuje jego azjatycki kuzyn,
 * igłosternik białogardły (Hirundapus caudacutus).
 *
 * Kolejność `section` odpowiada kolejności sekcji w words.js.
 */

const JOURNEY = [
  { stop: 1,  section: 'animals-home',      place: 'Jerzykowo',            country: 'Polska',
    lat: 52.4739, lon: 17.1825,
    fact: 'Nazwa wsi nie pochodzi od ptaka. W dokumencie z 1235 roku książę Władysław Odonic nadaje wieś Vehne, zamieszkałą przez ród Jerzyka.' },

  { stop: 2,  section: 'animals-wild',      place: 'Puszcza Zielonka',     country: 'Polska',
    lat: 52.5500, lon: 17.1000,
    fact: 'Tuż obok Jerzykowa leży Jezioro Kowalskie, zbiornik retencyjny na rzece Głównej, około 20 km na wschód od Poznania.' },

  { stop: 3,  section: 'animals-water-air', place: 'Poznań',               country: 'Polska',
    lat: 52.4064, lon: 16.9252,
    fact: 'Na Ostrowie Tumskim stoi najstarsza katedra w Polsce. Jerzyki co roku gniazdują w szczelinach starych murów właśnie takich budowli.' },

  { stop: 4,  section: 'fruit',             place: 'Warszawa',             country: 'Polska',
    lat: 52.2297, lon: 21.0122,
    fact: 'Wisła to najdłuższa rzeka Polski, ma ponad tysiąc kilometrów. Ptaki wędrowne używają dolin rzecznych jako drogowskazów.' },

  { stop: 5,  section: 'food',              place: 'Puszcza Białowieska',  country: 'Polska',
    lat: 52.7000, lon: 23.8500,
    fact: 'To jeden z ostatnich fragmentów pierwotnej puszczy w Europie i dom największego lądowego ssaka kontynentu, żubra.' },

  { stop: 6,  section: 'kitchen',           place: 'Wilno',                country: 'Litwa',
    lat: 54.6872, lon: 25.2797,
    fact: 'Litwa leży nad Bałtykiem, tym samym morzem co Polska. Bałtyk jest jednym z najmniej słonych mórz świata.' },

  { stop: 7,  section: 'home',              place: 'Moskwa',               country: 'Rosja',
    lat: 55.7558, lon: 37.6173,
    fact: 'Stąd zaczyna się Kolej Transsyberyjska, najdłuższa linia kolejowa świata. Pociąg jedzie nią ponad tydzień.' },

  { stop: 8,  section: 'things',            place: 'Ural',                 country: 'Rosja',
    lat: 56.8389, lon: 60.6057,
    fact: 'Góry Ural to umowna granica między Europą a Azją. Przekraczając je, jerzyk opuszcza Europę.' },

  { stop: 9,  section: 'body',              place: 'Nizina Zachodniosyberyjska', country: 'Rosja',
    lat: 58.0000, lon: 75.0000,
    fact: 'To jedna z największych równin świata i największy obszar bagien na Ziemi. Latem roi się tam od owadów, czyli od jedzenia dla jerzyków.' },

  { stop: 10, section: 'clothes',           place: 'Jezioro Bajkał',       country: 'Rosja',
    lat: 53.5587, lon: 108.1650,
    fact: 'Najgłębsze jezioro świata, ponad 1600 metrów. Mieści około jednej piątej całej niezamarzniętej słodkiej wody na Ziemi.' },

  { stop: 11, section: 'nature',            place: 'Ułan Bator',           country: 'Mongolia',
    lat: 47.8864, lon: 106.9057,
    fact: 'Najzimniejsza stolica świata. Zimą temperatura spada tam poniżej minus trzydziestu stopni.' },

  { stop: 12, section: 'school',            place: 'Pustynia Gobi',        country: 'Mongolia i Chiny',
    lat: 43.0000, lon: 105.0000,
    fact: 'Pustynia, na której bywa mróz. Znaleziono tu pierwsze na świecie skamieniałe jaja dinozaurów.' },

  { stop: 13, section: 'people',            place: 'Wielki Mur',           country: 'Chiny',
    lat: 40.4319, lon: 116.5704,
    fact: 'Tu ważna prawda: jerzyk zwyczajny z polskich dachów leci na zimę do Afryki, nie do Australii. Do Australii dolatuje jego azjatycki kuzyn, igłosternik białogardły.' },

  { stop: 14, section: 'places',            place: 'Szanghaj',             country: 'Chiny',
    lat: 31.2304, lon: 121.4737,
    fact: 'Miasto leży u ujścia Jangcy, najdłuższej rzeki Azji. Mieszka tu więcej ludzi niż w całej Polsce.' },

  { stop: 15, section: 'transport',         place: 'Hongkong',             country: 'Chiny',
    lat: 22.3193, lon: 114.1694,
    fact: 'Jedno z najgęściej zabudowanych miejsc na świecie. Jerzyki chętnie gniazdują w wysokich budynkach, bo przypominają im skalne klify.' },

  { stop: 16, section: 'actions-one',       place: 'Hanoi',                country: 'Wietnam',
    lat: 21.0278, lon: 105.8342,
    fact: 'Tu jerzyk mija zwrotnik Raka i wlatuje w strefę tropików, gdzie pory roku dzielą się na suchą i deszczową.' },

  { stop: 17, section: 'actions-two',       place: 'Manila',               country: 'Filipiny',
    lat: 14.5995, lon: 120.9842,
    fact: 'Filipiny to ponad siedem tysięcy wysp. Igłosterniki przelatują nad nimi w drodze na południe.' },

  { stop: 18, section: 'actions-three',     place: 'Borneo',               country: 'Malezja, Indonezja i Brunei',
    lat: 4.0000, lon: 114.0000,
    fact: 'Trzecia co do wielkości wyspa świata i jedno z niewielu miejsc, gdzie żyją orangutany.' },

  { stop: 19, section: 'feelings',          place: 'Celebes',              country: 'Indonezja',
    lat: -2.0000, lon: 120.0000,
    fact: 'Jerzyk przekracza tu równik. Od tego miejsca lato i zima zamieniają się miejscami.' },

  { stop: 20, section: 'colours-shapes',    place: 'Nowa Gwinea',          country: 'Papua-Nowa Gwinea i Indonezja',
    lat: -5.0000, lon: 141.0000,
    fact: 'Mówi się tu ponad ośmiuset językami, najwięcej ze wszystkich miejsc na Ziemi.' },

  { stop: 21, section: 'time',              place: 'Cieśnina Torresa',     country: 'Australia',
    lat: -9.9000, lon: 142.5000,
    fact: 'Wąski pas wody między Nową Gwineą a Australią. Po jego przekroczeniu jerzyk jest już na innym kontynencie.' },

  { stop: 22, section: 'sports',            place: 'Wielka Rafa Koralowa', country: 'Australia',
    lat: -18.2871, lon: 147.6992,
    fact: 'Największy system raf koralowych na świecie, ciągnie się przez ponad dwa tysiące kilometrów.' },

  { stop: 23, section: 'descriptions',      place: 'Uluru',                country: 'Australia',
    lat: -25.3444, lon: 131.0369,
    fact: 'Ogromna skała z piaskowca w środku kontynentu, święta dla Aborygenów z ludu Anangu.' },

  { stop: 24, section: 'directions',        place: 'Sydney',               country: 'Australia',
    lat: -33.8688, lon: 151.2093,
    fact: 'Gdy w Jerzykowie jest zima, tu trwa lato. Półkula południowa ma pory roku odwrócone.' },

  { stop: 25, section: 'technology',        place: 'Tasmania',             country: 'Australia',
    lat: -42.0000, lon: 147.0000,
    fact: 'Koniec trasy. Igłosterniki białogardłe docierają w zimowaniu aż tutaj, na wyspę na południe od Australii.' }
];

if (typeof window !== 'undefined') window.JOURNEY = JOURNEY;
if (typeof module !== 'undefined') module.exports = { JOURNEY };
