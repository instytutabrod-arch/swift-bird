'use strict';

/* M4: sytuacje.
 *
 * Uczennica gra jedną stronę dialogu i odpowiada GŁOSEM, pełnym zdaniem.
 * Ocena jest tolerancyjna: liczy się obecność elementów kluczowych
 * (`need`) i brak elementów zakazanych (`avoid`), a nie identyczność
 * z odpowiedzią wzorcową.
 *
 * `need`  - lista list. Odpowiedź musi zawierać po jednym elemencie
 *           z każdej listy wewnętrznej. ['is','\u2019s'] znaczy: albo to, albo to.
 * `avoid` - typowe błędy; ich obecność zaznacza odpowiedź jako do poprawy
 *           i trafia do rejestru błędów, z którego korzysta M5.
 * `model` - odpowiedź wzorcowa, pokazywana dopiero po dwóch próbach.
 */

const DIALOGUES = [
  {
    id: 'dlg-family',
    title: 'Rodzina',
    after: 'people',
    intro: 'Ann pyta cię o twoją rodzinę. Odpowiadaj pełnym zdaniem.',
    turns: [
      { ask: 'Have you got a brother or a sister?',
        need: [['have','i have','have got']], avoid: ['i have a got','i got have'],
        model: 'Yes, I have got a sister.', pl: 'Powiedz, czy masz rodzeństwo.' },
      { ask: 'How old is she?',
        need: [['is','she is']], avoid: ['she have','she has years'],
        model: 'She is ten.', pl: 'Powiedz, ile ona ma lat.' },
      { ask: 'What is your mother doing now?',
        need: [['is'],['@suffix:ing']], avoid: ['she cook','she work'],
        model: 'She is cooking dinner.', pl: 'Powiedz, co robi teraz twoja mama.' }
    ]
  },
  {
    id: 'dlg-school',
    title: 'Szkoła',
    after: 'school',
    intro: 'Nowy kolega pyta cię o szkołę.',
    turns: [
      { ask: 'Where is your school?',
        need: [['is'],['in','near','next']], avoid: ['school are'],
        model: 'My school is near the park.', pl: 'Powiedz, gdzie jest twoja szkoła.' },
      { ask: 'What is your favourite subject?',
        need: [['is','like']], avoid: ['i am like'],
        model: 'My favourite subject is English.', pl: 'Powiedz, jaki przedmiot lubisz najbardziej.' },
      { ask: 'Do you walk to school?',
        need: [['i walk','i go','yes','no']], avoid: ['i am walk'],
        model: 'Yes, I walk to school every day.', pl: 'Powiedz, jak docierasz do szkoły.' }
    ]
  },
  {
    id: 'dlg-hobby',
    title: 'Hobby',
    after: 'sports',
    intro: 'Rozmawiasz o tym, co lubisz robić.',
    turns: [
      { ask: 'What is your hobby?',
        need: [['is','like','play']], avoid: ['i am like'],
        model: 'My hobby is football.', pl: 'Powiedz, jakie masz hobby.' },
      { ask: 'How often do you play?',
        need: [['play','every','on','week']], avoid: ['i am play'],
        model: 'I play every Monday.', pl: 'Powiedz, jak często to robisz.' },
      { ask: 'Are you playing now?',
        need: [['am','no','yes']], avoid: ['i play now'],
        model: 'No, I am not playing now.', pl: 'Odpowiedz, czy robisz to właśnie teraz.' }
    ]
  },
  {
    id: 'dlg-appearance',
    title: 'Jak ktoś wygląda',
    after: 'body',
    intro: 'Opisujesz koleżankę ze zdjęcia.',
    turns: [
      { ask: 'Has she got long hair?',
        need: [['has','she has','yes','no']], avoid: ['she have'],
        model: 'Yes, she has got long hair.', pl: 'Powiedz, czy ona ma długie włosy.' },
      { ask: 'What colour are her eyes?',
        need: [['are','eyes']], avoid: ['her eyes is'],
        model: 'Her eyes are blue.', pl: 'Powiedz, jakiego koloru są jej oczy.' },
      { ask: 'Is she tall?',
        need: [['is','she is','yes','no']], avoid: ['she have'],
        model: 'No, she is not tall.', pl: 'Powiedz, czy ona jest wysoka.' }
    ]
  },
  {
    id: 'dlg-day',
    title: 'Mój dzień',
    after: 'time',
    intro: 'Opowiadasz o swoim zwykłym dniu.',
    turns: [
      { ask: 'When do you get up?',
        need: [['get up','i get','at']], avoid: ['i am get'],
        model: 'I get up at seven o\u2019clock.', pl: 'Powiedz, o której wstajesz.' },
      { ask: 'What do you do after school?',
        need: [['i']], avoid: ['i am play every'],
        model: 'After school I play with my dog.', pl: 'Powiedz, co robisz po szkole.' },
      { ask: 'What are you doing right now?',
        need: [['am'],['@suffix:ing']], avoid: ['i speak now','i learn now'],
        model: 'I am speaking English now.', pl: 'Powiedz, co robisz w tej chwili.' }
    ]
  },
  {
    id: 'dlg-shop',
    title: 'W sklepie',
    after: 'food',
    intro: 'Jesteś w sklepie i chcesz coś kupić.',
    turns: [
      { ask: 'Good morning. What would you like?',
        need: [['bread','milk','apple','cheese','water','like','want']], avoid: [],
        model: 'I would like some bread, please.', pl: 'Powiedz, co chcesz kupić.' },
      { ask: 'How many apples do you want?',
        need: [['one','two','three','four','five','six','seven','eight','nine','ten']], avoid: [],
        model: 'I want three apples.', pl: 'Powiedz, ile chcesz sztuk.' },
      { ask: 'Anything else?',
        need: [['no','thank','yes']], avoid: [],
        model: 'No, thank you.', pl: 'Zakończ rozmowę grzecznie.' }
    ]
  },
  {
    id: 'dlg-room',
    title: 'Mój pokój',
    after: 'directions',
    intro: 'Opisujesz swój pokój.',
    turns: [
      { ask: 'What is in your room?',
        need: [['is','are','have','got']], avoid: [],
        model: 'There is a bed and a desk in my room.', pl: 'Powiedz, co masz w pokoju.' },
      { ask: 'Where is your bed?',
        need: [['is'],['near','next','under','in','on','behind','between']], avoid: ['bed are'],
        model: 'My bed is next to the window.', pl: 'Powiedz, gdzie stoi twoje łóżko.' },
      { ask: 'What is under your desk?',
        need: [['is','are']], avoid: [],
        model: 'My bag is under my desk.', pl: 'Powiedz, co jest pod biurkiem.' }
    ]
  },
  {
    id: 'dlg-weather',
    title: 'Pogoda',
    after: 'nature',
    intro: 'Rozmawiasz o pogodzie za oknem.',
    turns: [
      { ask: 'What is the weather like today?',
        need: [['is'],['sunny','raining','rainy','cold','warm','hot','cloudy','snowing','snowy','windy']], avoid: ['weather are'],
        model: 'It is cold and windy today.', pl: 'Powiedz, jaka jest dziś pogoda.' },
      { ask: 'Is it raining now?',
        need: [['is','no','yes']], avoid: ['it rain now'],
        model: 'No, it is not raining now.', pl: 'Powiedz, czy właśnie pada.' },
      { ask: 'What do you wear when it is cold?',
        need: [['wear','i']], avoid: ['i am wear'],
        model: 'I wear a warm coat and a hat.', pl: 'Powiedz, co nosisz, gdy jest zimno.' }
    ]
  },
  {
    id: 'dlg-pet',
    title: 'Zwierzak w domu',
    after: 'animals-home',
    intro: 'Kolega pyta cię o zwierzęta w twoim domu.',
    turns: [
      { ask: 'Have you got a dog or a cat?',
        need: [['yes','no','i'],['have','got']], avoid: ['i has','i have a got'],
        model: 'Yes, I have got a dog.', pl: 'Powiedz, czy masz psa albo kota.' },
      { ask: 'What is its name?',
        need: [['name'],['is']], avoid: ['name are'],
        model: 'His name is Max.', pl: 'Powiedz, jak ma na imię twoje zwierzę.' },
      { ask: 'What does it eat?',
        need: [['eat','eats']], avoid: ['it eat','it eating'],
        model: 'It eats bread.', pl: 'Powiedz, co ono je.' }
    ]
  },
  {
    id: 'dlg-wild',
    title: 'W zoo',
    after: 'animals-wild',
    intro: 'Jesteś w zoo z kolegą.',
    turns: [
      { ask: 'What is your favourite animal?',
        need: [['is','love','loves']], avoid: ['animal are'],
        model: 'My favourite animal is the lion.', pl: 'Powiedz, jakie jest twoje ulubione zwierzę.' },
      { ask: 'Is it big or small?',
        need: [['is'],['big','small','tall','long','short','strong','fast','slow']], avoid: ['it are'],
        model: 'It is big.', pl: 'Powiedz, czy ono jest duże, czy małe.' },
      { ask: 'Where does it live?',
        need: [['live','lives','zoo','farm','forest']], avoid: ['it live','it living'],
        model: 'It lives in the zoo.', pl: 'Powiedz, gdzie ono mieszka.' }
    ]
  },
  {
    id: 'dlg-fruit',
    title: 'Owoce',
    after: 'fruit',
    intro: 'Rozmawiasz o owocach.',
    turns: [
      { ask: 'Do you eat fruit every day?',
        need: [['yes','no','i'],['eat','do','not']], avoid: ['i am eat','i eating'],
        model: 'Yes, I eat an apple every day.', pl: 'Powiedz, czy jesz owoce codziennie.' },
      { ask: 'What fruit do you like?',
        need: [['apple','apples','banana','bananas','orange','oranges','pear','pears','peach','peaches','plum','plums','cherry','cherries','strawberry','strawberries','raspberry','raspberries','blueberry','blueberries','grapes','watermelon','melon','pineapple','mango','kiwi','lemon','lemons','coconut']], avoid: [],
        model: 'I love strawberries.', pl: 'Powiedz, jaki owoc lubisz.' },
      { ask: 'What colour is a banana?',
        need: [['yellow']], avoid: ['banana are'],
        model: 'A banana is yellow.', pl: 'Powiedz, jakiego koloru jest banan.' }
    ]
  },
  {
    id: 'dlg-breakfast',
    title: 'Śniadanie',
    after: 'food',
    intro: 'Mama pyta, co zjesz na śniadanie.',
    turns: [
      { ask: 'What do you eat for breakfast?',
        need: [['bread','egg','eggs','cheese','cereal','butter','jam','honey','yogurt','sandwich','rice','pasta','salad','soup','chocolate','milk']], avoid: ['i am eat'],
        model: 'I eat bread and cheese.', pl: 'Powiedz, co jesz na śniadanie.' },
      { ask: 'What do you drink in the morning?',
        need: [['milk','tea','water','juice','cocoa','coffee','lemonade']], avoid: ['i eat milk','i eat tea','i eat water','i eat juice'],
        model: 'I drink milk.', pl: 'Powiedz, co pijesz rano.' },
      { ask: 'Is your soup hot or cold?',
        need: [['hot','cold','warm']], avoid: ['soup are'],
        model: 'It is hot.', pl: 'Powiedz, czy zupa jest gorąca, czy zimna.' }
    ]
  },
  {
    id: 'dlg-lost',
    title: 'Zgubiona rzecz',
    after: 'things',
    intro: 'Szukasz rzeczy, którą zgubiłeś.',
    turns: [
      { ask: 'What are you looking for?',
        need: [['looking','look'],['for']], avoid: ['i am look for'],
        model: 'I am looking for my key.', pl: 'Powiedz, czego szukasz.' },
      { ask: 'Where is it?',
        need: [['is'],['near','next','under','in','on','behind','between','over']], avoid: ['it are'],
        model: 'It is under the table.', pl: 'Powiedz, gdzie to jest.' },
      { ask: 'Is it in your bag?',
        need: [['yes','no']], avoid: [],
        model: 'No, it is not in my bag.', pl: 'Odpowiedz, czy to jest w torbie.' }
    ]
  },
  {
    id: 'dlg-doctor',
    title: 'U lekarza',
    after: 'body',
    intro: 'Jesteś u lekarza.',
    turns: [
      { ask: 'What is the matter?',
        need: [['i','my'],['am','have','has','is','hurts','hurt']], avoid: ['i is','i has'],
        model: 'I am sick.', pl: 'Powiedz, co ci jest.' },
      { ask: 'Is it your head or your stomach?',
        need: [['head','stomach','back','leg','arm','hand','foot','knee','neck','tooth','ear','eye','nose','mouth','finger','face']], avoid: [],
        model: 'It is my head.', pl: 'Powiedz, co cię boli.' },
      { ask: 'Do you sleep at night?',
        need: [['yes','no'],['sleep','do']], avoid: ['i am sleep'],
        model: 'Yes, I sleep at night.', pl: 'Powiedz, czy w nocy śpisz.' }
    ]
  },
  {
    id: 'dlg-clothes',
    title: 'Co dziś zakładasz',
    after: 'clothes',
    intro: 'Mama pyta, w co się ubierasz.',
    turns: [
      { ask: 'What are you wearing today?',
        need: [['wearing'],['i','am']], avoid: ['i wear now','i am wear'],
        model: 'I am wearing a blue coat.', pl: 'Powiedz, co masz dziś na sobie.' },
      { ask: 'What colour are your shoes?',
        need: [['are'],['red','blue','green','yellow','black','white','brown','pink','purple','grey']], avoid: ['shoes is'],
        model: 'My shoes are black.', pl: 'Powiedz, jakiego koloru są twoje buty.' },
      { ask: 'Is your coat warm?',
        need: [['yes','no','is']], avoid: [],
        model: 'Yes, it is very warm.', pl: 'Powiedz, czy twój płaszcz jest ciepły.' }
    ]
  },
  {
    id: 'dlg-bag',
    title: 'Torba szkolna',
    after: 'school',
    intro: 'Pakujesz torbę do szkoły.',
    turns: [
      { ask: 'What have you got in your bag?',
        need: [['have','got'],['pen','pencil','book','notebook','ruler','crayon','crayons','eraser','glue','paper','map','pencils','books']], avoid: ['i has got'],
        model: 'I have got a pencil and a notebook.', pl: 'Powiedz, co masz w torbie.' },
      { ask: 'Is your pen new or old?',
        need: [['new','old'],['is']], avoid: ['pen are'],
        model: 'My pen is new.', pl: 'Powiedz, czy twój długopis jest nowy, czy stary.' },
      { ask: 'Who is your teacher?',
        need: [['teacher'],['is']], avoid: ['teacher are'],
        model: 'My teacher is Mrs Green.', pl: 'Powiedz, kto jest twoim nauczycielem.' }
    ]
  },
  {
    id: 'dlg-way',
    title: 'Droga w mieście',
    after: 'places',
    intro: 'Turysta pyta cię o drogę.',
    turns: [
      { ask: 'Where is the library?',
        need: [['is'],['near','next','under','in','on','behind','between','over','opposite']], avoid: ['library are'],
        model: 'The library is near the park.', pl: 'Powiedz, gdzie jest biblioteka.' },
      { ask: 'Is there a shop near here?',
        need: [['yes','no']], avoid: [],
        model: 'Yes, there is a shop near the park.', pl: 'Odpowiedz, czy w pobliżu jest sklep.' },
      { ask: 'Thank you very much!',
        need: [['welcome','problem','pleasure']], avoid: [],
        model: 'You are welcome.', pl: 'Odpowiedz grzecznie na podziękowanie.' }
    ]
  },
  {
    id: 'dlg-travel',
    title: 'Jak podróżujesz',
    after: 'transport',
    intro: 'Kolega pyta cię o podróże.',
    turns: [
      { ask: 'How do you go to school?',
        need: [['i'],['go','walk','ride','take','bus','car','train','bicycle','bike','foot']], avoid: ['i am go'],
        model: 'I go by bus.', pl: 'Powiedz, jak jedziesz do szkoły.' },
      { ask: 'Is your bus fast?',
        need: [['yes','no'],['is','it']], avoid: ['bus are'],
        model: 'No, it is not very fast.', pl: 'Odpowiedz, czy twój autobus jest szybki.' },
      { ask: 'Have you got a bicycle?',
        need: [['yes','no'],['have','got','has']], avoid: ['i has got'],
        model: 'Yes, I have got a bicycle.', pl: 'Powiedz, czy masz rower.' }
    ]
  },
  {
    id: 'dlg-can',
    title: 'Co potrafisz',
    after: 'actions-one',
    intro: 'Opowiadasz, co umiesz robić.',
    turns: [
      { ask: 'Can you swim?',
        need: [['yes','no'],['can','cannot','cant','not']], avoid: ['i can to','i can swims'],
        model: 'Yes, I can swim.', pl: 'Powiedz, czy umiesz pływać.' },
      { ask: 'Can you jump high?',
        need: [['yes','no'],['can','cannot','cant','not']], avoid: ['i can to','i can jumps'],
        model: 'No, I cannot jump high.', pl: 'Powiedz, czy umiesz wysoko skakać.' },
      { ask: 'What do you do on Saturday?',
        need: [['i'],['play','read','walk','run','swim','sing','dance','sleep','eat','ride']], avoid: ['i am play'],
        model: 'I play football on Saturday.', pl: 'Powiedz, co robisz w sobotę.' }
    ]
  },
  {
    id: 'dlg-feelings',
    title: 'Jak się czujesz',
    after: 'feelings',
    intro: 'Koleżanka pyta, jak się czujesz.',
    turns: [
      { ask: 'How are you today?',
        need: [['am','im'],['happy','sad','angry','afraid','tired','hungry','thirsty','sick','excited','bored','fine','good','shy']], avoid: ['i is','me is'],
        model: 'I am tired.', pl: 'Powiedz, jak się dziś czujesz.' },
      { ask: 'Why are you tired?',
        need: [['because']], avoid: [],
        model: 'Because I play football every day.', pl: 'Powiedz, dlaczego tak się czujesz.' },
      { ask: 'Are you hungry?',
        need: [['yes','no'],['am','not','i']], avoid: ['i is'],
        model: 'Yes, I am hungry.', pl: 'Odpowiedz, czy jesteś głodny.' }
    ]
  },
  {
    id: 'dlg-birthday',
    title: 'Urodziny',
    after: 'time',
    intro: 'Kolega pyta cię o urodziny.',
    turns: [
      { ask: 'When is your birthday?',
        need: [['birthday'],['is','on','in']], avoid: ['birthday are'],
        model: 'My birthday is in May.', pl: 'Powiedz, kiedy masz urodziny.' },
      { ask: 'How old are you?',
        need: [['am','im'],['ten','nine','eleven','twelve','eight','seven','six','five']], avoid: ['i have'],
        model: 'I am ten.', pl: 'Powiedz, ile masz lat.' },
      { ask: 'What do you want for your birthday?',
        need: [['want','would','i']], avoid: ['i am want'],
        model: 'I want a new book.', pl: 'Powiedz, czego chcesz na urodziny.' }
    ]
  },
  {
    id: 'dlg-music',
    title: 'Muzyka',
    after: 'sports',
    intro: 'Rozmawiasz o muzyce.',
    turns: [
      { ask: 'Do you play the guitar or the piano?',
        need: [['guitar','piano','drum','drums','no','not']], avoid: ['i am play'],
        model: 'I play the piano.', pl: 'Powiedz, na czym grasz.' },
      { ask: 'Do you love music?',
        need: [['yes','no'],['i','do']], avoid: [],
        model: 'Yes, I love music.', pl: 'Powiedz, czy lubisz muzykę.' },
      { ask: 'What is your favourite song?',
        need: [['is'],['song','favourite']], avoid: ['song are'],
        model: 'My favourite song is very funny.', pl: 'Powiedz, jaka jest twoja ulubiona piosenka.' }
    ]
  },
  {
    id: 'dlg-describe',
    title: 'Mój dom',
    after: 'descriptions',
    intro: 'Opisujesz swój dom.',
    turns: [
      { ask: 'Is your house big or small?',
        need: [['big','small','old','new','beautiful'],['is']], avoid: ['house are'],
        model: 'My house is big.', pl: 'Powiedz, czy twój dom jest duży, czy mały.' },
      { ask: 'Is your street long or short?',
        need: [['long','short'],['is']], avoid: ['street are'],
        model: 'My street is short.', pl: 'Powiedz, czy twoja ulica jest długa, czy krótka.' },
      { ask: 'Is your room warm?',
        need: [['yes','no']], avoid: [],
        model: 'Yes, it is warm.', pl: 'Odpowiedz, czy twój pokój jest ciepły.' }
    ]
  },
  {
    id: 'dlg-gadgets',
    title: 'Technologia',
    after: 'technology',
    intro: 'Kolega pyta cię o telefon i komputer.',
    turns: [
      { ask: 'Have you got a phone or a tablet?',
        need: [['phone','tablet','computer','no','not']], avoid: ['i has got'],
        model: 'I have got a tablet.', pl: 'Powiedz, czy masz telefon albo tablet.' },
      { ask: 'What do you do on the computer?',
        need: [['i'],['play','read','write','draw','watch','listen','learn','look']], avoid: ['i am play'],
        model: 'I play games on the computer.', pl: 'Powiedz, co robisz na komputerze.' },
      { ask: 'Do you listen to the radio?',
        need: [['yes','no'],['i','do']], avoid: [],
        model: 'No, I do not listen to the radio.', pl: 'Powiedz, czy słuchasz radia.' }
    ]
  }
];

if (typeof window !== 'undefined') window.DIALOGUES = DIALOGUES;
if (typeof module !== 'undefined') module.exports = { DIALOGUES };
