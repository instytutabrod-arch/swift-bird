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
  },
  { id: 'story-kitty-ball',
    title: 'Kitty and the ball',
    after: 'animals-home',
    text: [
      'Kitty is a small cat.',
      'She has got a red ball.',
      'Kitty is playing with the ball.',
      'The ball is under the chair.',
      'Kitty looks under the chair.',
      'Max is sleeping near the door.',
      'Now the ball is in her bed.'
    ],
    main: {q: 'What is the story about?', options: ['A cat and her ball','A dog at school','A big red car'], correct: 0},
    detail: [
      {q: 'What colour is the ball?', answers: ['red']},
      {q: 'Who is sleeping near the door?', answers: ['max','the dog']}
    ]
  },
  { id: 'story-zoo',
    title: 'At the zoo',
    after: 'animals-wild',
    text: [
      'Today Ann and Tom are at the zoo.',
      'They see a big elephant.',
      'The elephant is eating grass.',
      'Tom loves the monkeys.',
      'The monkeys are climbing a tree.',
      'Ann loves the pandas.',
      'She loves the giraffe because it is very tall.'
    ],
    main: {q: 'What is the story about?', options: ['A day at the zoo','A day at school','A trip by train'], correct: 0},
    detail: [
      {q: 'What is the elephant eating?', answers: ['grass']},
      {q: 'What are the monkeys doing?', answers: ['climbing a tree','climbing','they are climbing a tree','climbing the tree']}
    ]
  },
  { id: 'story-animal-book',
    title: 'A book about animals',
    after: 'animals-water-air',
    text: [
      'Ann has got a book about animals.',
      'There is a dolphin in the book.',
      'The dolphin is big and fast.',
      'There is a penguin too.',
      'The penguin is small.',
      'An owl is sleeping in a tree.',
      'Ann loves the animals in the book.'
    ],
    main: {q: 'What is the story about?', options: ['A book about animals','A day at the zoo','A new pet'], correct: 0},
    detail: [
      {q: 'What is Ann reading about?', answers: ['animals','a book about animals']},
      {q: 'Where is the owl sleeping?', answers: ['in a tree','tree','in the tree']}
    ]
  },
  { id: 'story-market',
    title: 'At the market',
    after: 'fruit',
    text: [
      'On Saturday Mother is at the market.',
      'Ann and Tom are with her.',
      'There are apples, pears and bananas.',
      'Tom wants an orange.',
      'Ann wants strawberries.',
      'Mother says thank you.',
      'They are happy.'
    ],
    main: {q: 'What is the story about?', options: ['A day at the market','A day in the park','A birthday party'], correct: 0},
    detail: [
      {q: 'What does Tom want?', answers: ['an orange','orange','a orange']},
      {q: 'Who is with Mother at the market?', answers: ['ann and tom','tom and ann','ann tom']}
    ]
  },
  { id: 'story-breakfast',
    title: 'A big breakfast',
    after: 'food',
    text: [
      'It is Sunday morning.',
      'Father is cooking breakfast.',
      'There are eggs, bread and cheese on the table.',
      'Ann drinks milk.',
      'Tom eats cereal.',
      'Mother drinks tea.',
      'Max is under the table and he is happy.'
    ],
    main: {q: 'What is the story about?', options: ['Breakfast on Sunday','A school lesson','A trip to the zoo'], correct: 0},
    detail: [
      {q: 'Who is cooking breakfast?', answers: ['father','dad','the father']},
      {q: 'What does Ann drink?', answers: ['milk']}
    ]
  },
  { id: 'story-lost-key',
    title: 'The lost key',
    after: 'things',
    text: [
      'Father is looking for his key.',
      'It is not in his bag.',
      'It is not on the table.',
      'Tom looks under the sofa.',
      'Ann looks in the basket.',
      'Max has got the key in his bed!',
      'Everybody laughs.'
    ],
    main: {q: 'What is the story about?', options: ['Father looks for his key','Mother cooks soup','Tom plays football'], correct: 0},
    detail: [
      {q: 'Who has got the key?', answers: ['max','the dog']},
      {q: 'Where does Tom look?', answers: ['under the sofa','sofa','under sofa']}
    ]
  },
  { id: 'story-doctor',
    title: 'At the doctor',
    after: 'feelings',
    text: [
      'Tom is sick today.',
      'He is tired and his head is hot.',
      'Mother takes Tom to the doctor.',
      'The doctor looks at his eyes and his ears.',
      'The doctor says: Tom, you are not very sick.',
      'Tom drinks tea and sleeps.',
      'The next day he is happy again.'
    ],
    main: {q: 'What is the story about?', options: ['A visit to the doctor','A day at school','A football game'], correct: 0},
    detail: [
      {q: 'Who goes to the doctor with Tom?', answers: ['mother','mum','mom','his mother']},
      {q: 'What does Tom drink?', answers: ['tea']}
    ]
  },
  { id: 'story-rain',
    title: 'A rainy day',
    after: 'nature',
    text: [
      'Today it is raining.',
      'Ann and Tom are at home.',
      'They are not playing in the park.',
      'Tom is looking at the rain through the window.',
      'Then they see a rainbow.',
      'Look! says Ann. A rainbow!',
      'The sun is shining again.'
    ],
    main: {q: 'What is the story about?', options: ['A rainy day at home','A day at the beach','A snowy morning'], correct: 0},
    detail: [
      {q: 'What do Ann and Tom see?', answers: ['a rainbow','rainbow']},
      {q: 'Where are Ann and Tom?', answers: ['at home','home','in the house']}
    ]
  },
  { id: 'story-birthday',
    title: 'Tom\u2019s birthday',
    after: 'time',
    text: [
      'Today is Saturday and it is Tom\u2019s birthday.',
      'He is twelve years old.',
      'In the morning Mother makes a big cake.',
      'His friends bring presents.',
      'Ann gives Tom a book.',
      'In the evening they sing Happy Birthday.',
      'Tom is very happy.'
    ],
    main: {q: 'What is the story about?', options: ['A birthday party','A school day','A trip to the city'], correct: 0},
    detail: [
      {q: 'How old is Tom?', answers: ['twelve','12']},
      {q: 'What does Ann give Tom?', answers: ['a book','book']}
    ]
  },
  { id: 'story-match',
    title: 'The football match',
    after: 'sports',
    text: [
      'On Sunday Tom has got a football match.',
      'His team is in red.',
      'Father and Ann are at the match.',
      'Tom is running fast.',
      'He has got the ball.',
      'Tom scores a goal!',
      'His team wins.'
    ],
    main: {q: 'What is the story about?', options: ['A football match','A music lesson','A day at the zoo'], correct: 0},
    detail: [
      {q: 'What does Tom score?', answers: ['a goal','goal']},
      {q: 'Who is at the match with Ann?', answers: ['father','dad','her father']}
    ]
  },
  { id: 'story-sad-tom',
    title: 'Tom is sad',
    after: 'feelings',
    text: [
      'Today Tom is sad.',
      'His friend is not at school.',
      'He is not hungry and he is not happy.',
      'Ann sits next to him.',
      'She says: Do not be sad, Tom.',
      'Then she gives him a funny picture.',
      'Tom laughs and now he is happy.'
    ],
    main: {q: 'What is the story about?', options: ['A sad boy and his sister','A birthday party','A football game'], correct: 0},
    detail: [
      {q: 'Why is Tom sad?', answers: ['his friend is not at school','friend','his friend is not there']},
      {q: 'What does Ann give Tom?', answers: ['a picture','picture','a funny picture','funny picture']}
    ]
  },
  { id: 'story-painting',
    title: 'Ann paints',
    after: 'colours-shapes',
    text: [
      'Ann has got paper and new crayons.',
      'She draws a red circle.',
      'Next to it she draws a blue square.',
      'She also draws a yellow triangle.',
      'Tom looks at the picture.',
      'It is beautiful, he says.',
      'Ann gives the picture to Mother.'
    ],
    main: {q: 'What is the story about?', options: ['Ann draws a picture','Tom plays football','Mother cooks dinner'], correct: 0},
    detail: [
      {q: 'What colour is the circle?', answers: ['red']},
      {q: 'What does Ann draw next to the circle?', answers: ['a blue square','square','blue square']}
    ]
  },
  { id: 'story-where-kitty',
    title: 'Where is Kitty?',
    after: 'directions',
    text: [
      'Kitty is not in the kitchen.',
      'She is not under the table.',
      'She is not behind the door.',
      'Ann looks in the garden.',
      'Tom looks near the window.',
      'Kitty is inside the box!',
      'She is sleeping and she is warm.'
    ],
    main: {q: 'What is the story about?', options: ['Looking for the cat','A day at the zoo','A new box'], correct: 0},
    detail: [
      {q: 'Where is Kitty?', answers: ['in the box','box','inside the box']},
      {q: 'Is Kitty under the table?', answers: ['no','no she is not','she is not']}
    ]
  },
  { id: 'story-video-call',
    title: 'A call with grandmother',
    after: 'technology',
    text: [
      'Grandmother lives far from Ann and Tom.',
      'On Sunday they have got a video call.',
      'Tom has got the tablet.',
      'Ann sits near the screen.',
      'Grandmother says: Hello, my dear children!',
      'She is in her garden and she has got a big flower.',
      'Ann and Tom send her a picture.'
    ],
    main: {q: 'What is the story about?', options: ['A video call with grandmother','A day at school','A trip to the zoo'], correct: 0},
    detail: [
      {q: 'What has Tom got?', answers: ['the tablet','a tablet','tablet']},
      {q: 'Where is grandmother?', answers: ['in her garden','garden','in the garden']}
    ]
  },
  { id: 'story-helping',
    title: 'Helping at home',
    after: 'actions-two',
    text: [
      'On Saturday everybody helps at home.',
      'Father washes the car.',
      'Mother cooks soup.',
      'Tom cleans his room.',
      'Ann opens the window.',
      'Max waits near the door.',
      'Then they all sit and drink juice.'
    ],
    main: {q: 'What is the story about?', options: ['Everybody helps at home','A day at the market','A school trip'], correct: 0},
    detail: [
      {q: 'Who washes the car?', answers: ['father','dad','the father']},
      {q: 'What does Tom clean?', answers: ['his room','room','the room']}
    ]
  },
  { id: 'story-new-words',
    title: 'New words',
    after: 'actions-three',
    text: [
      'Ann learns new words every day.',
      'She finds a new book in the library.',
      'She reads it and asks Mother questions.',
      'Mother tells her stories.',
      'Ann remembers the words and writes them.',
      'Tom forgets them.',
      'I want to try again, says Tom.'
    ],
    main: {q: 'What is the story about?', options: ['Ann and Tom learn words','A birthday party','A day at the zoo'], correct: 0},
    detail: [
      {q: 'What does Ann learn?', answers: ['new words','words']},
      {q: 'Who forgets the words?', answers: ['tom']}
    ]
  }
];

if (typeof window !== 'undefined') window.STORIES = STORIES;
if (typeof module !== 'undefined') module.exports = { STORIES };
