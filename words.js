'use strict';

/* 25 sekcji po 20 unikalnych słów. Format: [angielski, polski, piktogram]. */
window.WORD_SECTIONS = [
  {id:'animals-home', name:'Zwierzęta wokół nas', icon:'🐾', words:[
    ['cat','kot','🐱'],['dog','pies','🐶'],['horse','koń','🐴'],['cow','krowa','🐮'],
    ['pig','świnia','🐷'],['sheep','owca','🐑'],['goat','koza','🐐'],['rabbit','królik','🐰'],
    ['mouse','mysz','🐭'],['hamster','chomik','🐹'],['donkey','osioł','🫏'],['chicken','kurczak','🐔'],
    ['rooster','kogut','🐓'],['duck','kaczka','🦆'],['goose','gęś','🪿'],['turkey','indyk','🦃'],
    ['bee','pszczoła','🐝'],['butterfly','motyl','🦋'],['snail','ślimak','🐌'],['frog','żaba','🐸']
  ]},
  {id:'animals-wild', name:'Dzikie zwierzęta', icon:'🦁', words:[
    ['lion','lew','🦁'],['tiger','tygrys','🐯'],['elephant','słoń','🐘'],['giraffe','żyrafa','🦒'],
    ['zebra','zebra','🦓'],['monkey','małpa','🐵'],['gorilla','goryl','🦍'],['bear','niedźwiedź','🐻'],
    ['fox','lis','🦊'],['wolf','wilk','🐺'],['deer','jeleń','🦌'],['moose','łoś','🫎'],
    ['kangaroo','kangur','🦘'],['koala','koala','🐨'],['panda','panda','🐼'],['crocodile','krokodyl','🐊'],
    ['snake','wąż','🐍'],['turtle','żółw','🐢'],['lizard','jaszczurka','🦎'],['camel','wielbłąd','🐫']
  ]},
  {id:'animals-water-air', name:'Woda i powietrze', icon:'🐬', words:[
    ['fish','ryba','🐟'],['shark','rekin','🦈'],['whale','wieloryb','🐋'],['dolphin','delfin','🐬'],
    ['octopus','ośmiornica','🐙'],['crab','krab','🦀'],['lobster','homar','🦞'],['seal','foka','🦭'],
    ['penguin','pingwin','🐧'],['swan','łabędź','🦢'],['owl','sowa','🦉'],['eagle','orzeł','🦅'],
    ['parrot','papuga','🦜'],['peacock','paw','🦚'],['sparrow','wróbel','🐦'],['pigeon','gołąb','🕊️'],
    ['bat','nietoperz','🦇'],['ant','mrówka','🐜'],['spider','pająk','🕷️'],['worm','dżdżownica','🪱']
  ]},
  {id:'fruit', name:'Owoce', icon:'🍎', words:[
    ['apple','jabłko','🍎'],['banana','banan','🍌'],['orange','pomarańcza','🍊'],['pear','gruszka','🍐'],
    ['peach','brzoskwinia','🍑'],['plum','śliwka','🟣'],['cherry','wiśnia','🍒'],['strawberry','truskawka','🍓'],
    ['raspberry','malina','🔴🫐'],['blueberry','borówka','🔵🫐'],['blackberry','jeżyna','⚫🫐'],['grapes','winogrona','🍇'],
    ['watermelon','arbuz','🍉'],['melon','melon','🍈'],['pineapple','ananas','🍍'],['mango','mango','🥭'],
    ['kiwi','kiwi','🥝'],['lemon','cytryna','🍋'],['lime','limonka','🟢'],['coconut','kokos','🥥']
  ]},
  {id:'food', name:'Jedzenie', icon:'🍞', words:[
    ['bread','chleb','🍞'],['cheese','ser','🧀'],['egg','jajko','🥚'],['milk','mleko','🥛'],
    ['butter','masło','🧈'],['yogurt','jogurt','🥛🥣'],['rice','ryż','🍚'],['pasta','makaron','🍝'],
    ['pizza','pizza','🍕'],['soup','zupa','🍲'],['salad','sałatka','🥗'],['sandwich','kanapka','🥪'],
    ['cereal','płatki','🌾🥣'],['flour','mąka','🌾'],['sugar','cukier','🍬🧂'],['salt','sól','🧂'],
    ['pepper','pieprz','🌶️'],['honey','miód','🍯'],['jam','dżem','🫙'],['chocolate','czekolada','🍫']
  ]},
  {id:'kitchen', name:'Kuchnia i napoje', icon:'🥤', words:[
    ['water','woda','💧'],['tea','herbata','🍵'],['coffee','kawa','☕🫘'],['juice','sok','🧃'],
    ['lemonade','lemoniada','🥤'],['cocoa','kakao','☕🍫'],['bottle','butelka','🍼'],['cup','filiżanka','☕'],
    ['glass','szklanka','🥛'],['plate','talerz','🍽️'],['bowl','miska','🥣'],['spoon','łyżka','🥄'],
    ['fork','widelec','🍴'],['knife','nóż','🔪'],['pan','patelnia','🍳'],['pot','garnek','🍲'],
    ['kettle','czajnik','🫖'],['fridge','lodówka','🧊'],['oven','piekarnik','♨️'],['microwave','mikrofalówka','📻']
  ]},
  {id:'home', name:'Dom i meble', icon:'🏠', words:[
    ['house','dom','🏠'],['room','pokój','🚪🛋️'],['kitchen','kuchnia','🍳'],['bedroom','sypialnia','🛏️🌙'],
    ['bathroom','łazienka','🛁'],['lounge','salon','🛋️📺'],['garden','ogród','🌷'],['door','drzwi','🚪'],
    ['window','okno','🪟'],['wall','ściana','🧱'],['floor','podłoga','🟫'],['roof','dach','🏠🔝'],
    ['stairs','schody','🪜'],['bed','łóżko','🛏️'],['chair','krzesło','🪑'],['table','stół','🪵'],
    ['sofa','sofa','🛋️'],['lamp','lampa','💡'],['desk','biurko','🖥️'],['shelf','półka','📚']
  ]},
  {id:'things', name:'Przedmioty codzienne', icon:'🎒', words:[
    ['clock','zegar','🕐'],['key','klucz','🔑'],['book','książka','📖'],['pencil','ołówek','✏️'],
    ['scissors','nożyczki','✂️'],['bag','torba','👜'],['phone','telefon','📱'],['box','pudełko','📦'],
    ['basket','koszyk','🧺'],['candle','świeca','🕯️'],['umbrella','parasol','☂️'],['toothbrush','szczoteczka','🪥'],
    ['towel','ręcznik','🧻'],['soap','mydło','🧼'],['pillow','poduszka','🛏️'],['blanket','koc','🛌'],
    ['toy','zabawka','🧸'],['ball','piłka','⚽'],['bin','kosz na śmieci','🗑️'],['vacuum','odkurzacz','🧹']
  ]},
  {id:'body', name:'Ciało', icon:'🧒', words:[
    ['head','głowa','🙂'],['face','twarz','😀'],['hair','włosy','💇'],['eye','oko','👁️'],
    ['ear','ucho','👂'],['nose','nos','👃'],['mouth','usta','👄'],['tooth','ząb','🦷'],
    ['neck','szyja','🧣'],['shoulder','ramię','🤷'],['arm','ręka','💪'],['hand','dłoń','✋'],
    ['finger','palec','☝️'],['leg','noga','🦵'],['knee','kolano','🦵⭕'],['foot','stopa','🦶'],
    ['toe','palec u stopy','🦶☝️'],['back','plecy','🔙'],['stomach','brzuch','🤰'],['heart','serce','❤️']
  ]},
  {id:'clothes', name:'Ubrania', icon:'👕', words:[
    ['shirt','koszula','👔'],['top','koszulka','👕'],['trousers','spodnie','👖'],['dress','sukienka','👗✨'],
    ['shoes','buty','👟'],['hat','czapka','🧢'],['socks','skarpetki','🧦'],['coat','płaszcz','🧥❄️'],
    ['glasses','okulary','👓'],['ring','pierścionek','💍'],['gloves','rękawiczki','🧤'],['skirt','spódnica','👗✂️'],
    ['shorts','krótkie spodenki','🩳'],['sweater','sweter','🧶'],['jacket','kurtka','🧥'],['boots','kozaki','🥾'],
    ['scarf','szalik','🧣'],['belt','pasek','➰'],['pocket','kieszeń','👖🟦'],['button','guzik','🔘']
  ]},
  {id:'nature', name:'Przyroda i pogoda', icon:'🌈', words:[
    ['sun','słońce','☀️'],['moon','księżyc','🌙'],['star','gwiazda','⭐'],['cloud','chmura','☁️'],
    ['rain','deszcz','🌧️'],['snow','śnieg','❄️'],['wind','wiatr','🌬️'],['rainbow','tęcza','🌈'],
    ['tree','drzewo','🌳'],['flower','kwiat','🌸'],['leaf','liść','🍃'],['grass','trawa','🌱'],
    ['mountain','góra','⛰️'],['sea','morze','🌊🐚'],['fire','ogień','🔥'],['stone','kamień','🪨'],
    ['beach','plaża','🏖️'],['mushroom','grzyb','🍄'],['river','rzeka','🏞️'],['lake','jezioro','🌊🏞️']
  ]},
  {id:'school', name:'Szkoła', icon:'🏫', words:[
    ['school','szkoła','🏫'],['teacher','nauczyciel','🧑‍🏫'],['pupil','uczeń','🧑‍🎓'],['class','klasa','👩‍🏫'],
    ['lesson','lekcja','📘'],['homework','praca domowa','📝'],['notebook','zeszyt','📓'],['pen','długopis','🖊️'],
    ['crayon','kredka','🖍️'],['ruler','linijka','📏'],['eraser','gumka','🧽'],['glue','klej','🧴'],
    ['paper','papier','📄'],['board','tablica','⬛'],['computer','komputer','💻'],['map','mapa','🗺️'],
    ['number','liczba','🔢'],['letter','litera','🔤'],['question','pytanie','❓'],['answer','odpowiedź','✅']
  ]},
  {id:'people', name:'Rodzina i ludzie', icon:'👨‍👩‍👧‍👦', words:[
    ['mother','mama','👩👶'],['father','tata','👨👶'],['sister','siostra','👧👧'],['brother','brat','👦👦'],
    ['grandmother','babcia','👵'],['grandfather','dziadek','👴'],['baby','niemowlę','👶'],['child','dziecko','🧒'],
    ['girl','dziewczynka','👧'],['boy','chłopiec','👦'],['woman','kobieta','👩'],['man','mężczyzna','👨'],
    ['friend','przyjaciel','🫂'],['family','rodzina','👪'],['parent','rodzic','🧑'],['cousin','kuzyn','🧒👪'],
    ['aunt','ciocia','👩🎁'],['uncle','wujek','👨🎁'],['neighbour','sąsiad','🏘️'],['doctor','lekarz','🧑‍⚕️']
  ]},
  {id:'places', name:'Miejsca', icon:'🏙️', words:[
    ['street','ulica','🏘️🛣️'],['road','droga','🛣️'],['park','park','🌳'],['shop','sklep','🏪'],
    ['market','targ','🛒'],['hospital','szpital','🏥'],['library','biblioteka','📚'],['cinema','kino','🎬'],
    ['museum','muzeum','🏛️'],['restaurant','restauracja','🍽️'],['cafe','kawiarnia','☕'],['station','stacja','🚉'],
    ['airport','lotnisko','🛫'],['hotel','hotel','🏨'],['bank','bank','🏦'],['post office','poczta','📮'],
    ['police station','komisariat','🚓'],['playground','plac zabaw','🛝'],['farm','gospodarstwo','🚜'],['zoo','zoo','🦁']
  ]},
  {id:'transport', name:'Transport', icon:'🚗', words:[
    ['car','samochód','🚗'],['bus','autobus','🚌'],['train','pociąg','🚆'],['bicycle','rower','🚲'],
    ['motorcycle','motocykl','🏍️'],['scooter','hulajnoga','🛴'],['taxi','taksówka','🚕'],['truck','ciężarówka','🚚'],
    ['van','furgonetka','🚐'],['tractor','traktor','🚜'],['boat','łódź','⛵'],['ship','statek','🚢'],
    ['plane','samolot','✈️'],['helicopter','helikopter','🚁'],['rocket','rakieta','🚀'],['wheel','koło','🛞'],
    ['ticket','bilet','🎫'],['driver','kierowca','🧑‍✈️'],['passenger','pasażer','🧍'],['traffic light','sygnalizacja świetlna','🚦']
  ]},
  {id:'actions-one', name:'Czynności I', icon:'🏃', words:[
    ['run','biegać','🏃'],['jump','skakać','🤸'],['swim','pływać','🏊'],['sleep','spać','😴'],
    ['eat','jeść','😋'],['drink','pić','🥤'],['read','czytać','📚'],['write','pisać','✍️'],
    ['sing','śpiewać','🎤'],['dance','tańczyć','💃'],['walk','iść','🚶'],['climb','wspinać się','🧗'],
    ['laugh','śmiać się','😂'],['cry','płakać','😢'],['think','myśleć','🤔'],['listen','słuchać','🎧'],
    ['look','patrzeć','👀'],['ride','jechać','🚴'],['sit','siedzieć','🪑'],['stand','stać','🧍']
  ]},
  {id:'actions-two', name:'Czynności II', icon:'🎨', words:[
    ['open','otwierać','📂'],['close','zamykać','📕'],['give','dawać','🎁'],['take','brać','🤲'],
    ['bring','przynosić','📦'],['carry','nieść','🧳'],['throw','rzucać','🥎'],['catch','łapać','🤾'],
    ['push','pchać','➡️'],['pull','ciągnąć','⬅️'],['wash','myć','🧼'],['clean','sprzątać','🧹'],
    ['cook','gotować','🧑‍🍳'],['cut','kroić','🔪'],['draw','rysować','✏️'],['paint','malować','🎨'],
    ['build','budować','🧱'],['play','bawić się','🎲'],['help','pomagać','🤝'],['wait','czekać','⏳']
  ]},
  {id:'actions-three', name:'Czynności III', icon:'💬', words:[
    ['speak','mówić','🗣️'],['say','powiedzieć','💬'],['ask','pytać','❓'],['tell','opowiadać','🗨️'],
    ['learn','uczyć się','📖'],['teach','uczyć kogoś','🧑‍🏫'],['remember','pamiętać','🧠'],['forget','zapominać','💭'],
    ['find','znajdować','🔎'],['lose','gubić','❌'],['buy','kupować','🛍️'],['pay','płacić','💳'],
    ['choose','wybierać','☑️'],['start','zaczynać','▶️'],['finish','kończyć','🏁'],['win','wygrywać','🏆'],
    ['try','próbować','🎯'],['work','pracować','💼'],['live','mieszkać','🏡'],['love','kochać','❤️']
  ]},
  {id:'feelings', name:'Uczucia i cechy', icon:'😊', words:[
    ['happy','szczęśliwy','😊'],['sad','smutny','😢'],['angry','zły','😠'],['afraid','przestraszony','😨'],
    ['tired','zmęczony','🥱🛏️'],['hungry','głodny','😋'],['thirsty','spragniony','🥵'],['sick','chory','🤒'],
    ['healthy','zdrowy','💪'],['excited','podekscytowany','🤩'],['surprised','zaskoczony','😮'],['bored','znudzony','🥱⏳'],
    ['calm','spokojny','😌🧘'],['brave','odważny','🦸'],['kind','życzliwy','🤗'],['funny','zabawny','😄'],
    ['clever','mądry','🧠'],['friendly','przyjazny','🙂'],['shy','nieśmiały','🫣'],['proud','dumny','😌🏆']
  ]},
  {id:'colours-shapes', name:'Kolory, kształty i liczby', icon:'🔷', words:[
    ['red','czerwony','🔴'],['blue','niebieski','🔵'],['green','zielony','🟢'],['yellow','żółty','🟡'],
    ['black','czarny','⚫'],['white','biały','⚪'],['purple','fioletowy','🟣'],['brown','brązowy','🟤'],
    ['pink','różowy','🩷'],['grey','szary','🩶'],['circle','koło','⭕'],['square','kwadrat','⬜'],
    ['triangle','trójkąt','🔺'],['rectangle','prostokąt','▭'],['line','linia','➖'],['point','punkt','▪️'],
    ['one','jeden','1️⃣'],['two','dwa','2️⃣'],['three','trzy','3️⃣'],['four','cztery','4️⃣']
  ]},
  {id:'time', name:'Czas i kalendarz', icon:'📅', words:[
    ['time','czas','⏰'],['day','dzień','🌞'],['night','noc','🌙'],['morning','rano','🌅'],
    ['afternoon','popołudnie','🌤️'],['evening','wieczór','🌆'],['today','dzisiaj','📍'],['tomorrow','jutro','➡️'],
    ['yesterday','wczoraj','⬅️'],['week','tydzień','🗓️'],['month','miesiąc','📅'],['year','rok','🎆'],
    ['Monday','poniedziałek','1️⃣'],['Tuesday','wtorek','2️⃣'],['Wednesday','środa','3️⃣'],['Thursday','czwartek','4️⃣'],
    ['Friday','piątek','5️⃣'],['Saturday','sobota','6️⃣'],['Sunday','niedziela','7️⃣'],['birthday','urodziny','🎂']
  ]},
  {id:'sports', name:'Sport i hobby', icon:'⚽', words:[
    ['football','piłka nożna','⚽'],['basketball','koszykówka','🏀'],['tennis','tenis','🎾'],['volleyball','siatkówka','🏐'],
    ['hockey','hokej','🏒'],['golf','golf','⛳'],['skiing','narciarstwo','⛷️'],['skating','łyżwiarstwo','⛸️'],
    ['running','bieganie','🏃'],['cycling','jazda na rowerze','🚴'],['fishing','wędkarstwo','🎣'],['music','muzyka','🎵'],
    ['song','piosenka','🎶'],['game','gra','🎮'],['puzzle','układanka','🧩'],['doll','lalka','🪆'],
    ['camera','aparat','📷'],['guitar','gitara','🎸'],['piano','pianino','🎹'],['drum','bęben','🥁']
  ]},
  {id:'descriptions', name:'Opisujemy świat', icon:'📏', words:[
    ['big','duży','🐘'],['small','mały','🐜'],['long','długi','📏'],['short','krótki','✂️'],
    ['tall','wysoki','🦒'],['low','niski','⬇️'],['high','wysoko','⬆️'],['fast','szybki','⚡'],
    ['slow','wolny','🐌'],['hot','gorący','🔥'],['cold','zimny','🧊'],['warm','ciepły','🌤️'],
    ['new','nowy','✨'],['old','stary','⌛'],['young','młody','🧒'],['good','dobry','👍'],
    ['bad','zły','👎'],['beautiful','piękny','🌺'],['ugly','brzydki','👹'],['strong','silny','💪']
  ]},
  {id:'directions', name:'Położenie i kierunki', icon:'🧭', words:[
    ['in','w','📥'],['on','na','🔛'],['under','pod','⬇️📦'],['over','nad','⬆️📦'],
    ['behind','za','↩️'],['between','pomiędzy','↔️'],['near','blisko','🤏'],['far','daleko','🔭'],
    ['left','lewo','⬅️✋'],['right','prawo','➡️✋'],['up','góra','⬆️'],['down','dół','⬇️'],
    ['inside','wewnątrz','📦'],['outside','na zewnątrz','🌳'],['here','tutaj','📍'],['there','tam','👉'],
    ['north','północ','⬆️🧭'],['south','południe','⬇️🧭'],['east','wschód','➡️🧭'],['west','zachód','⬅️🧭']
  ]},
  {id:'technology', name:'Technologia', icon:'💻', words:[
    ['internet','internet','🌐'],['television','telewizor','📺'],['radio','radio','📻'],['tablet','tablet','📱'],
    ['keyboard','klawiatura','⌨️'],['screen','ekran','🖥️'],['charger','ładowarka','🔌'],['battery','bateria','🔋'],
    ['robot','robot','🤖'],['watch','zegarek','⌚'],['calendar','kalendarz','📆'],['picture','obrazek','🖼️'],
    ['email','e-mail','📧'],['message','wiadomość','💬'],['video','film','🎥'],['headphones','słuchawki','🎧'],
    ['speaker','głośnik','🔊'],['mousepad','podkładka pod mysz','🖱️'],['printer','drukarka','🖨️'],['password','hasło','🔐']
  ]}
];
