'use strict';

/* M3: historyjki.
 *
 * Wąskie czytanie: ci sami bohaterowie w każdej historyjce, ten sam świat.
 * Powtarzalność słownictwa w naturalnym kontekście jest tu ważniejsza
 * niż różnorodność tematów.
 *
 * Bohaterowie: Ann, Tom (rodzeństwo), pies Max, kot Kitty, mama, tata.
 *
 * `main`   - pytanie o główną myśl, wybór z trzech
 * `detail` - pytania o szczegół, odpowiedź wpisywana; `answers` to
 *            dopuszczalne warianty zapisu, porównywane po normalizacji
 */

const STORIES = [
  {
    id: 'story-family',
    title: 'Ann and Tom',
    after: 'people',
    text: [
      'Ann is nine years old.',
      'Tom is her brother.',
      'He is eleven.',
      'They have got a dog.',
      'The dog is Max.',
      'Max is big and brown.',
      'Ann and Tom love Max.'
    ],
    main: { q: 'What is the story about?', options: ['A family and their dog','A school day','A trip to the city'], correct: 0 },
    detail: [
      { q: 'How old is Ann?', answers: ['nine','9'] },
      { q: 'What is the name of the dog?', answers: ['max'] }
    ]
  },
  {
    id: 'story-morning',
    title: 'A morning at home',
    after: 'home',
    text: [
      'It is Monday morning.',
      'Ann is in the kitchen.',
      'She is eating bread and cheese.',
      'Tom is not hungry.',
      'He is drinking milk.',
      'Max is under the table.',
      'The cat is on the chair.'
    ],
    main: { q: 'What is the story about?', options: ['A birthday party','Breakfast at home','A football game'], correct: 1 },
    detail: [
      { q: 'Where is Max?', answers: ['under the table','table','under table'] },
      { q: 'What is Tom drinking?', answers: ['milk'] }
    ]
  },
  {
    id: 'story-school',
    title: 'At school',
    after: 'school',
    text: [
      'Ann goes to school every day.',
      'Her school is near the park.',
      'She walks with Tom.',
      'Ann likes English.',
      'Tom likes sport.',
      'Today they have got a new teacher.',
      'Her name is Mrs Green.'
    ],
    main: { q: 'What is the story about?', options: ['A day at school','A rainy weekend','A visit to the zoo'], correct: 0 },
    detail: [
      { q: 'What is the name of the new teacher?', answers: ['mrs green','green'] },
      { q: 'What does Tom like?', answers: ['sport','sports'] }
    ]
  },
  {
    id: 'story-clothes',
    title: 'A cold day',
    after: 'clothes',
    text: [
      'It is cold today.',
      'Ann is wearing a red coat.',
      'She has got a blue hat.',
      'Tom is wearing black shoes.',
      'His trousers are green.',
      'Mother is looking for her gloves.',
      'They are behind the door.'
    ],
    main: { q: 'What is the story about?', options: ['Clothes on a cold day','A summer holiday','A new bike'], correct: 0 },
    detail: [
      { q: 'What colour is Ann\u2019s coat?', answers: ['red'] },
      { q: 'Where are the gloves?', answers: ['behind the door','door','behind door'] }
    ]
  },
  {
    id: 'story-park',
    title: 'In the park',
    after: 'places',
    text: [
      'On Saturday the family is in the park.',
      'The sun is shining.',
      'Tom is playing football.',
      'Ann is reading a book under a tree.',
      'Max is running after a ball.',
      'Father is sitting on a bench.',
      'Everybody is happy.'
    ],
    main: { q: 'What is the story about?', options: ['A day in the park','A day at school','A day in the shop'], correct: 0 },
    detail: [
      { q: 'What is Tom playing?', answers: ['football'] },
      { q: 'What is Ann doing?', answers: ['reading','reading a book','she is reading'] }
    ]
  },
  {
    id: 'story-food',
    title: 'Dinner',
    after: 'kitchen',
    text: [
      'Mother is cooking soup.',
      'The soup is hot.',
      'Ann does not like onions.',
      'Tom eats everything.',
      'There is bread on the table.',
      'Father is bringing water.',
      'Dinner is at six o\u2019clock.'
    ],
    main: { q: 'What is the story about?', options: ['Dinner at home','A picnic','A shopping day'], correct: 0 },
    detail: [
      { q: 'What is mother cooking?', answers: ['soup'] },
      { q: 'What does Ann not like?', answers: ['onions','onion'] }
    ]
  },
  {
    id: 'story-animals',
    title: 'Max and Kitty',
    after: 'animals-home',
    text: [
      'Max is a dog.',
      'Kitty is a cat.',
      'Max is big and Kitty is small.',
      'Max sleeps in the garden.',
      'Kitty sleeps on Ann\u2019s bed.',
      'They are not friends.',
      'But today they are eating together.'
    ],
    main: { q: 'What is the story about?', options: ['Two animals at home','A trip to the farm','A new pet shop'], correct: 0 },
    detail: [
      { q: 'Where does Kitty sleep?', answers: ['on ann\u2019s bed','on anns bed','bed','on the bed'] },
      { q: 'Is Max big or small?', answers: ['big'] }
    ]
  },
  {
    id: 'story-trip',
    title: 'A trip to the city',
    after: 'transport',
    text: [
      'Today the family is going to the city.',
      'They are taking the train.',
      'The train is fast.',
      'Ann is looking out of the window.',
      'Tom is listening to music.',
      'The city is big and noisy.',
      'They are coming home in the evening.'
    ],
    main: { q: 'What is the story about?', options: ['A train trip to the city','A day at the beach','A football match'], correct: 0 },
    detail: [
      { q: 'How are they going to the city?', answers: ['by train','train','they are taking the train'] },
      { q: 'What is Tom listening to?', answers: ['music'] }
    ]
  }
];

if (typeof window !== 'undefined') window.STORIES = STORIES;
if (typeof module !== 'undefined') module.exports = { STORIES };
