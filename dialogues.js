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
        need: [['have','i have','have got']], avoid: ['i have got a'],
        model: 'Yes, I have got a sister.', pl: 'Powiedz, czy masz rodzeństwo.' },
      { ask: 'How old is she?',
        need: [['is','she is']], avoid: ['she have','she has years'],
        model: 'She is ten.', pl: 'Powiedz, ile ona ma lat.' },
      { ask: 'What is your mother doing now?',
        need: [['is'],['ing']], avoid: ['she cook','she work'],
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
        need: [['am'],['ing']], avoid: ['i speak now','i learn now'],
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
        need: [['is'],['sunny','rain','cold','warm','hot','cloud','snow','wind']], avoid: ['weather are'],
        model: 'It is cold and windy today.', pl: 'Powiedz, jaka jest dziś pogoda.' },
      { ask: 'Is it raining now?',
        need: [['is','no','yes']], avoid: ['it rain now'],
        model: 'No, it is not raining now.', pl: 'Powiedz, czy właśnie pada.' },
      { ask: 'What do you wear when it is cold?',
        need: [['wear','i']], avoid: ['i am wear'],
        model: 'I wear a warm coat and a hat.', pl: 'Powiedz, co nosisz, gdy jest zimno.' }
    ]
  }
];

if (typeof window !== 'undefined') window.DIALOGUES = DIALOGUES;
if (typeof module !== 'undefined') module.exports = { DIALOGUES };
