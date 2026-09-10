'use strict';

/* M5: detektyw.
 *
 * Trzy typy zadań. Wspólna zasada: samo wskazanie i poprawienie błędu
 * to jeszcze nie zaliczenie. Dokument wymaga UZASADNIENIA, więc pełne
 * zaliczenie daje dopiero wybór właściwego wyjaśnienia.
 *
 * Ten plik zawiera bank startowy. Docelowo najważniejszym źródłem zadań
 * są WŁASNE błędy uczennicy, rejestrowane w M2 i M4 i podawane jej
 * ponownie właśnie tutaj.
 *
 * `wrong`  - zdanie z jednym błędem; `bad` to indeks błędnego słowa
 * `fix`    - poprawna forma tego słowa
 * `why`    - trzy wyjaśnienia, `correctWhy` wskazuje właściwe
 */

const ERROR_BANK = [
  { id: 'e-have-3rd', wrong: ['She','have','got','a','cat'], bad: 1, fix: 'has',
    why: ['Przy she, he i it używamy has got.','Przy she zawsze dodajemy końcówkę -ing.','Po she nie stawiamy czasownika.'], correctWhy: 0 },
  { id: 'e-be-am', wrong: ['He','am','happy'], bad: 1, fix: 'is',
    why: ['Am łączy się tylko z I.','Am jest formą przeszłą.','Po he zawsze jest are.'], correctWhy: 0 },
  { id: 'e-article', wrong: ['I','have','got','dog'], bad: 3, fix: 'a dog',
    why: ['Przed policzalnym słowem w liczbie pojedynczej stawiamy a.','Przed zwierzętami zawsze stawiamy the.','Dog to słowo niepoliczalne.'], correctWhy: 0 },
  { id: 'e-third-s', wrong: ['My','sister','play','tennis'], bad: 2, fix: 'plays',
    why: ['W Present Simple po he, she, it dodajemy -s.','Play nigdy nie zmienia formy.','Po sister używamy formy przeszłej.'], correctWhy: 0 },
  { id: 'e-continuous', wrong: ['Look','!','He','runs','now'], bad: 3, fix: 'is running',
    why: ['O tym, co dzieje się teraz, mówimy formą is + -ing.','Runs to forma pytająca.','Po he nie używamy is.'], correctWhy: 0 },
  { id: 'e-question-order', wrong: ['You','are','tired','?'], bad: 0, fix: 'Are you',
    why: ['W pytaniu czasownik idzie przed osobę.','W pytaniu zawsze zaczynamy od do.','Pytanie musi zaczynać się od Wh-.'], correctWhy: 0 },
  { id: 'e-do-does', wrong: ['Do','she','like','apples','?'], bad: 0, fix: 'Does',
    why: ['Przy she, he i it w pytaniu używamy does.','Do jest formą przeszłą.','Przed she nie stawiamy do ani does.'], correctWhy: 0 },
  { id: 'e-negative', wrong: ['I','no','like','onions'], bad: 1, fix: 'do not',
    why: ['Przeczenie w Present Simple tworzymy przez do not.','No stawiamy zawsze na końcu zdania.','Like nie ma formy przeczącej.'], correctWhy: 0 },
  { id: 'e-plural', wrong: ['I','have','got','two','cat'], bad: 4, fix: 'cats',
    why: ['Po liczbie większej niż jeden dodajemy -s.','Cat nie ma liczby mnogiej.','Po two zawsze stawiamy the.'], correctWhy: 0 },
  { id: 'e-adjective-order', wrong: ['I','have','got','a','car','red'], bad: 5, fix: 'a red car',
    why: ['Przymiotnik stoi przed rzeczownikiem.','Przymiotnik zawsze stoi na końcu.','Red to czasownik.'], correctWhy: 0 },
  { id: 'e-there-is', wrong: ['There','are','a','book','on','the','desk'], bad: 1, fix: 'is',
    why: ['Przy jednej rzeczy mówimy there is.','There are stosujemy zawsze.','Book to liczba mnoga.'], correctWhy: 0 },
  { id: 'e-possessive', wrong: ['This','is','the','bag','of','Ann'], bad: 4, fix: 'Ann\u2019s bag',
    why: ['Przy osobach używamy formy z apostrofem i s.','Of jest jedyną poprawną formą.','Przed imieniem zawsze stawiamy the.'], correctWhy: 0 },
  { id: 'e-prep-in', wrong: ['The','apple','is','on','the','box'], bad: 3, fix: 'in',
    why: ['Wewnątrz czegoś to in, na wierzchu to on.','On i in znaczą to samo.','Przed box zawsze jest at.'], correctWhy: 0 },
  { id: 'e-be-age', wrong: ['I','have','ten','years'], bad: 1, fix: 'am',
    why: ['O wieku mówimy przez to be: I am ten.','Have years to poprawna forma angielska.','Po I zawsze stawiamy have.'], correctWhy: 0 },
  { id: 'e-continuous-be', wrong: ['She','reading','a','book','now'], bad: 1, fix: 'is reading',
    why: ['Forma z -ing wymaga wcześniej is, am albo are.','Reading samo w sobie wystarcza.','Po she nie stawiamy is.'], correctWhy: 0 },
  { id: 'e-wh-be', wrong: ['Where','you','are','?'], bad: 1, fix: 'are you',
    why: ['Po słowie pytającym czasownik idzie przed osobę.','Po where zawsze stawiamy do.','Kolejność w pytaniu jest dowolna.'], correctWhy: 0 },
  { id: 'e-much-many', wrong: ['How','much','apples','have','you','got','?'], bad: 1, fix: 'many',
    why: ['Przy rzeczach policzalnych używamy many.','Much i many znaczą to samo.','Apples jest niepoliczalne.'], correctWhy: 0 },
  { id: 'e-his-her', wrong: ['Tom','is','with','her','sister'], bad: 3, fix: 'his',
    why: ['Tom to chłopiec, więc jego to his.','Her odnosi się do każdego.','Przed sister zawsze jest her.'], correctWhy: 0 },
  { id: 'e-double-subject', wrong: ['My','brother','he','is','tall'], bad: 2, fix: '(usuń he)',
    why: ['Podmiot występuje w zdaniu tylko raz.','He wzmacnia zdanie i jest potrzebne.','Bez he zdanie jest niepełne.'], correctWhy: 0 },
  { id: 'e-verb-ing-simple', wrong: ['Every','day','I','am','walking','to','school'], bad: 3, fix: 'walk',
    why: ['O tym, co robimy zwykle, mówimy formą prostą.','Every day wymaga formy z -ing.','Am walking to forma przeszła.'], correctWhy: 0 }
];

/* Porównywanie dwóch opisów. Odpowiedź pełnym zdaniem, oceniana
   tolerancyjnie po elementach kluczowych. */
const COMPARISONS = [
  { id: 'c-hair', left: { icon: '👧', text: 'Anna has got long hair.' }, right: { icon: '👦', text: 'Tom has got short hair.' },
    q: 'What is the difference?', need: [['long'],['short'],['but','and']],
    model: 'Anna has got long hair but Tom has got short hair.' },
  { id: 'c-size', left: { icon: '🐘', text: 'The elephant is big.' }, right: { icon: '🐜', text: 'The ant is small.' },
    q: 'Compare the animals.', need: [['big'],['small']],
    model: 'The elephant is big but the ant is small.' },
  { id: 'c-weather', left: { icon: '☀️', text: 'On Monday it is sunny.' }, right: { icon: '🌧️', text: 'On Tuesday it is raining.' },
    q: 'Compare the two days.', need: [['sunny'],['rain']],
    model: 'On Monday it is sunny but on Tuesday it is raining.' },
  { id: 'c-speed', left: { icon: '🐌', text: 'The snail is slow.' }, right: { icon: '🏃', text: 'The boy is fast.' },
    q: 'Compare them.', need: [['slow'],['fast','quick']],
    model: 'The snail is slow but the boy is fast.' },
  { id: 'c-place', left: { icon: '🏠', text: 'Ann is at home.' }, right: { icon: '🏫', text: 'Tom is at school.' },
    q: 'Where are they?', need: [['home'],['school']],
    model: 'Ann is at home but Tom is at school.' },
  { id: 'c-food', left: { icon: '🍎', text: 'Ann is eating an apple.' }, right: { icon: '🍕', text: 'Tom is eating pizza.' },
    q: 'What are they eating?', need: [['apple'],['pizza']],
    model: 'Ann is eating an apple but Tom is eating pizza.' }
];

/* Układanie tekstu: cztery zdania w złej kolejności.
   `order` podaje poprawną kolejność indeksów z `lines`. */
const ORDERINGS = [
  { id: 'o-morning', lines: ['Then she eats breakfast.','Ann gets up at seven.','She walks to school with Tom.','After breakfast she puts on her coat.'], order: [1,0,3,2] },
  { id: 'o-park', lines: ['They play football for an hour.','On Saturday Tom and Ann go to the park.','Then they go home for dinner.','First they look for a good place.'], order: [1,3,0,2] },
  { id: 'o-rain', lines: ['So they stay at home.','It is Sunday morning.','Ann reads a book and Tom plays a game.','It is raining outside.'], order: [1,3,0,2] },
  { id: 'o-dog', lines: ['Max runs after it.','Tom has got a ball.','Then he brings it back to Tom.','He throws the ball in the garden.'], order: [1,3,0,2] },
  { id: 'o-shop', lines: ['She pays and says thank you.','Mother goes to the shop.','She buys bread, milk and apples.','At home she puts everything on the table.'], order: [1,2,0,3] },
  { id: 'o-birthday', lines: ['Her friends bring presents.','Today is Ann\u2019s birthday.','In the evening everybody is tired but happy.','Mother makes a big cake.'], order: [1,3,0,2] }
];

if (typeof window !== 'undefined'){ window.ERROR_BANK = ERROR_BANK; window.COMPARISONS = COMPARISONS; window.ORDERINGS = ORDERINGS; }
if (typeof module !== 'undefined') module.exports = { ERROR_BANK, COMPARISONS, ORDERINGS };
