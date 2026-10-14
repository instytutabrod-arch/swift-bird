'use strict';

/* Wyprawa Jerzyka z Jerzykowa.
 *
 * Rama fabularna kursu: 25 sekcji słownictwa to 25 przystanków lotu
 * z Jerzykowa w gminie Pobiedziska aż na Tasmanię. Zdany egzamin sekcji
 * przenosi ptaka na kolejny przystanek.
 *
 * ZASADA: sama wyprawa jest wymyślona, ale KAŻDY fakt jest prawdziwy.
 * `fact` przechowuje wersję polską, a `factEn` angielską do czytania
 * i odsłuchania. Przystanek 13 mówi o tym dziecku wprost, żeby nikt później
 * nie poczuł się wprowadzony w błąd: jerzyk zwyczajny z polskich dachów
 * zimuje w Afryce, a do Australii dolatuje jego azjatycki kuzyn,
 * igłosternik białogardły (Hirundapus caudacutus).
 *
 * Kolejność `section` odpowiada kolejności sekcji w words.js.
 */

const JOURNEY = [
  { stop: 1,  section: 'animals-home',      place: 'Jerzykowo',            country: 'Polska',
    lat: 52.4739, lon: 17.1825,
    fact: 'Nazwa wsi nie pochodzi od ptaka. W dokumencie z 1235 roku książę Władysław Odonic nadaje wieś Vehne, zamieszkałą przez ród Jerzyka.',
    factEn: 'The village name does not come from the bird. In a document from 1235, Duke Władysław Odonic grants the village of Vehne, inhabited by the Jerzyk family.' },

  { stop: 2,  section: 'animals-wild',      place: 'Warszawa',             country: 'Polska',
    lat: 52.2297, lon: 21.0122,
    fact: 'Wisła to najdłuższa rzeka Polski, ma ponad tysiąc kilometrów. Ptaki wędrowne używają dolin rzecznych jako drogowskazów.',
    factEn: 'The Vistula is the longest river in Poland and is more than one thousand kilometres long. Migrating birds use river valleys as signposts.' },

  { stop: 3,  section: 'animals-water-air', place: 'Poznań',               country: 'Polska',
    lat: 52.4064, lon: 16.9252,
    fact: 'Na Ostrowie Tumskim stoi najstarsza katedra w Polsce. Jerzyki co roku gniazdują w szczelinach starych murów właśnie takich budowli.',
    factEn: 'The oldest cathedral in Poland stands on Ostrów Tumski. Swifts nest every year in gaps in the old walls of buildings like this.' },

  { stop: 4,  section: 'fruit',             place: 'Puszcza Zielonka',     country: 'Polska',
    lat: 52.5500, lon: 17.1000,
    fact: 'Tuż obok Jerzykowa leży Jezioro Kowalskie, zbiornik retencyjny na rzece Głównej, około 20 km na wschód od Poznania.',
    factEn: 'Lake Kowalskie lies right next to Jerzykowo. It is a reservoir on the Główna River, about twenty kilometres east of Poznań.' },

  { stop: 5,  section: 'food',              place: 'Puszcza Białowieska',  country: 'Polska',
    lat: 52.7000, lon: 23.8500,
    fact: 'To jeden z ostatnich fragmentów pierwotnej puszczy w Europie i dom największego lądowego ssaka kontynentu, żubra.',
    factEn: 'This is one of the last parts of primeval forest in Europe and the home of the largest land mammal on the continent, the European bison.' },

  { stop: 6,  section: 'kitchen',           place: 'Wilno',                country: 'Litwa',
    lat: 54.6872, lon: 25.2797,
    fact: 'Litwa leży nad Bałtykiem, tym samym morzem co Polska. Bałtyk jest jednym z najmniej słonych mórz świata.',
    factEn: 'Lithuania lies beside the Baltic Sea, the same sea as Poland. The Baltic is one of the least salty seas in the world.' },

  { stop: 7,  section: 'home',              place: 'Moskwa',               country: 'Rosja',
    lat: 55.7558, lon: 37.6173,
    fact: 'Stąd zaczyna się Kolej Transsyberyjska, najdłuższa linia kolejowa świata. Pociąg jedzie nią ponad tydzień.',
    factEn: 'The Trans-Siberian Railway starts here. It is the longest railway line in the world, and a train travels along it for more than a week.' },

  { stop: 8,  section: 'things',            place: 'Ural',                 country: 'Rosja',
    lat: 56.8389, lon: 60.6057,
    fact: 'Góry Ural to umowna granica między Europą a Azją. Przekraczając je, jerzyk opuszcza Europę.',
    factEn: 'The Ural Mountains are the traditional boundary between Europe and Asia. When the swift crosses them, it leaves Europe.' },

  { stop: 9,  section: 'body',              place: 'Nizina Zachodniosyberyjska', country: 'Rosja',
    lat: 58.0000, lon: 75.0000,
    fact: 'To jedna z największych równin świata i największy obszar bagien na Ziemi. Latem roi się tam od owadów, czyli od jedzenia dla jerzyków.',
    factEn: 'This is one of the largest plains in the world and the largest wetland area on Earth. In summer it is full of insects, which are food for swifts.' },

  { stop: 10, section: 'clothes',           place: 'Jezioro Bajkał',       country: 'Rosja',
    lat: 53.5587, lon: 108.1650,
    fact: 'Najgłębsze jezioro świata, ponad 1600 metrów. Mieści około jednej piątej całej niezamarzniętej słodkiej wody na Ziemi.',
    factEn: 'This is the deepest lake in the world, more than sixteen hundred metres deep. It holds about one fifth of all unfrozen fresh water on Earth.' },

  { stop: 11, section: 'nature',            place: 'Ułan Bator',           country: 'Mongolia',
    lat: 47.8864, lon: 106.9057,
    fact: 'Najzimniejsza stolica świata. Zimą temperatura spada tam poniżej minus trzydziestu stopni.',
    factEn: 'This is the coldest capital city in the world. In winter, the temperature falls below minus thirty degrees Celsius.' },

  { stop: 12, section: 'school',            place: 'Pustynia Gobi',        country: 'Mongolia i Chiny',
    lat: 43.0000, lon: 105.0000,
    fact: 'Pustynia, na której bywa mróz. Znaleziono tu pierwsze na świecie skamieniałe jaja dinozaurów.',
    factEn: 'This is a desert where frost can occur. The first fossilised dinosaur eggs ever discovered were found here.' },

  { stop: 13, section: 'people',            place: 'Wielki Mur',           country: 'Chiny',
    lat: 40.4319, lon: 116.5704,
    fact: 'Tu ważna prawda: jerzyk zwyczajny z polskich dachów leci na zimę do Afryki, nie do Australii. Do Australii dolatuje jego azjatycki kuzyn, igłosternik białogardły.',
    factEn: 'Here is an important fact: the common swift from Polish rooftops flies to Africa for winter, not to Australia. Its Asian cousin, the white-throated needletail, reaches Australia.' },

  { stop: 14, section: 'places',            place: 'Szanghaj',             country: 'Chiny',
    lat: 31.2304, lon: 121.4737,
    fact: 'Miasto leży u ujścia Jangcy, najdłuższej rzeki Azji. Mieszka tu więcej ludzi niż w całej Polsce.',
    factEn: 'The city stands at the mouth of the Yangtze, the longest river in Asia. More people live here than in all of Poland.' },

  { stop: 15, section: 'transport',         place: 'Hongkong',             country: 'Chiny',
    lat: 22.3193, lon: 114.1694,
    fact: 'Jedno z najgęściej zabudowanych miejsc na świecie. Jerzyki chętnie gniazdują w wysokich budynkach, bo przypominają im skalne klify.',
    factEn: 'This is one of the most densely built places in the world. Swifts like to nest in tall buildings because the walls remind them of rocky cliffs.' },

  { stop: 16, section: 'actions-one',       place: 'Hanoi',                country: 'Wietnam',
    lat: 21.0278, lon: 105.8342,
    fact: 'Tu jerzyk mija zwrotnik Raka i wlatuje w strefę tropików, gdzie pory roku dzielą się na suchą i deszczową.',
    factEn: 'Here the swift passes the Tropic of Cancer and enters the tropics, where the year is divided into a dry season and a rainy season.' },

  { stop: 17, section: 'actions-two',       place: 'Manila',               country: 'Filipiny',
    lat: 14.5995, lon: 120.9842,
    fact: 'Filipiny to ponad siedem tysięcy wysp. Igłosterniki przelatują nad nimi w drodze na południe.',
    factEn: 'The Philippines are made up of more than seven thousand islands. White-throated needletails fly over them on their journey south.' },

  { stop: 18, section: 'actions-three',     place: 'Borneo',               country: 'Malezja, Indonezja i Brunei',
    lat: 4.0000, lon: 114.0000,
    fact: 'Trzecia co do wielkości wyspa świata i jedno z niewielu miejsc, gdzie żyją orangutany.',
    factEn: 'Borneo is the third largest island in the world and one of the few places where orangutans live.' },

  { stop: 19, section: 'feelings',          place: 'Celebes',              country: 'Indonezja',
    lat: -2.0000, lon: 120.0000,
    fact: 'Jerzyk przekracza tu równik. Od tego miejsca lato i zima zamieniają się miejscami.',
    factEn: 'The swift crosses the equator here. From this point, summer and winter change places.' },

  { stop: 20, section: 'colours-shapes',    place: 'Nowa Gwinea',          country: 'Papua-Nowa Gwinea i Indonezja',
    lat: -5.0000, lon: 141.0000,
    fact: 'Mówi się tu ponad ośmiuset językami, najwięcej ze wszystkich miejsc na Ziemi.',
    factEn: 'People speak more than eight hundred languages here, more than in any other place on Earth.' },

  { stop: 21, section: 'time',              place: 'Cieśnina Torresa',     country: 'Australia',
    lat: -9.9000, lon: 142.5000,
    fact: 'Wąski pas wody między Nową Gwineą a Australią. Po jego przekroczeniu jerzyk jest już na innym kontynencie.',
    factEn: 'This is a narrow stretch of water between New Guinea and Australia. After crossing it, the swift is on another continent.' },

  { stop: 22, section: 'sports',            place: 'Wielka Rafa Koralowa', country: 'Australia',
    lat: -18.2871, lon: 147.6992,
    fact: 'Największy system raf koralowych na świecie, ciągnie się przez ponad dwa tysiące kilometrów.',
    factEn: 'This is the largest coral reef system in the world. It stretches for more than two thousand kilometres.' },

  { stop: 23, section: 'descriptions',      place: 'Uluru',                country: 'Australia',
    lat: -25.3444, lon: 131.0369,
    fact: 'Ogromna skała z piaskowca w środku kontynentu, święta dla Aborygenów z ludu Anangu.',
    factEn: 'This enormous sandstone rock stands in the middle of the continent. It is sacred to the Anangu Aboriginal people.' },

  { stop: 24, section: 'directions',        place: 'Sydney',               country: 'Australia',
    lat: -33.8688, lon: 151.2093,
    fact: 'Gdy w Jerzykowie jest zima, tu trwa lato. Półkula południowa ma pory roku odwrócone.',
    factEn: 'When it is winter in Jerzykowo, it is summer here. The seasons are reversed in the Southern Hemisphere.' },

  { stop: 25, section: 'technology',        place: 'Tasmania',             country: 'Australia',
    lat: -42.0000, lon: 147.0000,
    fact: 'Koniec trasy. Igłosterniki białogardłe docierają w zimowaniu aż tutaj, na wyspę na południe od Australii.',
    factEn: 'This is the end of the route. White-throated needletails travel this far for winter, reaching an island south of mainland Australia.' }
];

if (typeof window !== 'undefined') window.JOURNEY = JOURNEY;
if (typeof module !== 'undefined') module.exports = { JOURNEY };
