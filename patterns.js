'use strict';

/* M2: klocki zdań.
 *
 * Każdy wzorzec ma własny cykl powtórek, dokładnie jak słowo w M1.
 * ZASADA: na ekranie nie ma reguł gramatycznych. Dziecko widzi przykłady
 * i układa kolejne zdanie. Nazwy czasów pojawiają się dopiero w M5,
 * gdy trzeba uzasadnić wybór.
 *
 * `tokens`  - poprawna kolejność klocków
 * `extra`   - klocki zbędne, dobrane pod typowe błędy polskiego ucznia
 *             (brak "a", "am" zamiast "is", szyk pytania jak w twierdzeniu)
 * `pl`      - tłumaczenie, pokazywane jako polecenie
 * `hint`    - zdanie-wzór tego samego typu, znika na wyższych poziomach
 */

const PATTERNS = [
  {
    id: 'to-be-positive',
    name: 'Kim jestem, jaki jestem',
    example: 'She is happy.',
    items: [
      { tokens: ['I','am','happy'], extra: ['is','are'], pl: 'Jestem szczęśliwy.' },
      { tokens: ['She','is','tired'], extra: ['am','be'], pl: 'Ona jest zmęczona.' },
      { tokens: ['We','are','hungry'], extra: ['is','am'], pl: 'Jesteśmy głodni.' },
      { tokens: ['The','cat','is','small'], extra: ['are','a'], pl: 'Ten kot jest mały.' },
      { tokens: ['My','brother','is','tall'], extra: ['are','am'], pl: 'Mój brat jest wysoki.' },
      { tokens: ['They','are','friendly'], extra: ['is','am'], pl: 'Oni są przyjaźni.' },
      { tokens: ['The','soup','is','hot'], extra: ['are','a'], pl: 'Zupa jest gorąca.' },
      { tokens: ['You','are','clever'], extra: ['is','am'], pl: 'Jesteś mądry.' },
      { tokens: ['The','dog','is','big'], extra: ['are','an'], pl: 'Ten pies jest duży.' },
      { tokens: ['I','am','a','student'], extra: ['is','the'], pl: 'Jestem uczniem.' }
    ]
  },
  {
    id: 'to-be-question',
    name: 'Pytanie i przeczenie z to be',
    example: 'Is she happy?',
    items: [
      { tokens: ['Is','she','happy','?'], extra: ['Does','are'], pl: 'Czy ona jest szczęśliwa?' },
      { tokens: ['Are','you','tired','?'], extra: ['Is','Do'], pl: 'Czy jesteś zmęczony?' },
      { tokens: ['She','is','not','sad'], extra: ['no','does'], pl: 'Ona nie jest smutna.' },
      { tokens: ['I','am','not','cold'], extra: ['no','is'], pl: 'Nie jest mi zimno.' },
      { tokens: ['Is','the','box','empty','?'], extra: ['Are','Does'], pl: 'Czy pudełko jest puste?' },
      { tokens: ['They','are','not','here'], extra: ['no','is'], pl: 'Ich tu nie ma.' },
      { tokens: ['Are','the','apples','sweet','?'], extra: ['Is','Do'], pl: 'Czy te jabłka są słodkie?' },
      { tokens: ['The','water','is','not','warm'], extra: ['no','are'], pl: 'Woda nie jest ciepła.' },
      { tokens: ['Is','your','sister','young','?'], extra: ['Are','Has'], pl: 'Czy twoja siostra jest młoda?' },
      { tokens: ['We','are','not','late'], extra: ['no','is'], pl: 'Nie jesteśmy spóźnieni.' }
    ]
  },
  {
    id: 'have-got',
    name: 'Co mam',
    example: 'I have got a sister.',
    items: [
      { tokens: ['I','have','got','a','sister'], extra: ['has','the'], pl: 'Mam siostrę.' },
      { tokens: ['She','has','got','two','cats'], extra: ['have','a'], pl: 'Ona ma dwa koty.' },
      { tokens: ['We','have','got','a','garden'], extra: ['has','an'], pl: 'Mamy ogród.' },
      { tokens: ['He','has','got','long','hair'], extra: ['have','a'], pl: 'On ma długie włosy.' },
      { tokens: ['They','have','got','a','dog'], extra: ['has','the'], pl: 'Oni mają psa.' },
      { tokens: ['My','mother','has','got','a','car'], extra: ['have','an'], pl: 'Moja mama ma samochód.' },
      { tokens: ['I','have','not','got','a','bike'], extra: ['has','no'], pl: 'Nie mam roweru.' },
      { tokens: ['Have','you','got','a','pencil','?'], extra: ['Has','Do'], pl: 'Czy masz ołówek?' },
      { tokens: ['Has','she','got','a','brother','?'], extra: ['Have','Does'], pl: 'Czy ona ma brata?' },
      { tokens: ['The','house','has','got','five','windows'], extra: ['have','a'], pl: 'Ten dom ma pięć okien.' }
    ]
  },
  {
    id: 'present-simple',
    name: 'Co robię zwykle',
    example: 'We play football on Monday.',
    items: [
      { tokens: ['We','play','football','on','Monday'], extra: ['plays','are'], pl: 'Gramy w piłkę w poniedziałek.' },
      { tokens: ['She','reads','a','book','every','day'], extra: ['read','is'], pl: 'Ona czyta książkę codziennie.' },
      { tokens: ['I','walk','to','school'], extra: ['walks','am'], pl: 'Chodzę do szkoły pieszo.' },
      { tokens: ['He','eats','bread','for','breakfast'], extra: ['eat','is'], pl: 'On je chleb na śniadanie.' },
      { tokens: ['They','swim','on','Friday'], extra: ['swims','are'], pl: 'Oni pływają w piątek.' },
      { tokens: ['My','father','drives','a','car'], extra: ['drive','is'], pl: 'Mój tata prowadzi samochód.' },
      { tokens: ['I','do','not','like','onions'], extra: ['does','am'], pl: 'Nie lubię cebuli.' },
      { tokens: ['Do','you','play','tennis','?'], extra: ['Does','Are'], pl: 'Czy grasz w tenisa?' },
      { tokens: ['Does','she','sing','?'], extra: ['Do','Is'], pl: 'Czy ona śpiewa?' },
      { tokens: ['We','watch','television','in','the','evening'], extra: ['watches','are'], pl: 'Oglądamy telewizję wieczorem.' }
    ]
  },
  {
    id: 'present-continuous',
    name: 'Co dzieje się teraz',
    example: 'He is running now.',
    items: [
      { tokens: ['He','is','running','now'], extra: ['runs','are'], pl: 'On teraz biegnie.' },
      { tokens: ['I','am','eating','an','apple'], extra: ['eat','is'], pl: 'Jem właśnie jabłko.' },
      { tokens: ['She','is','reading','a','book'], extra: ['reads','are'], pl: 'Ona właśnie czyta książkę.' },
      { tokens: ['We','are','playing','in','the','garden'], extra: ['play','is'], pl: 'Bawimy się właśnie w ogrodzie.' },
      { tokens: ['They','are','singing','now'], extra: ['sing','is'], pl: 'Oni teraz śpiewają.' },
      { tokens: ['The','dog','is','sleeping'], extra: ['sleeps','are'], pl: 'Pies właśnie śpi.' },
      { tokens: ['I','am','not','listening'], extra: ['do','is'], pl: 'Nie słucham w tej chwili.' },
      { tokens: ['Is','she','writing','?'], extra: ['Does','Are'], pl: 'Czy ona właśnie pisze?' },
      { tokens: ['Are','you','watching','television','?'], extra: ['Do','Is'], pl: 'Czy właśnie oglądasz telewizję?' },
      { tokens: ['My','mother','is','cooking','soup'], extra: ['cooks','are'], pl: 'Moja mama gotuje właśnie zupę.' }
    ]
  },
  {
    id: 'prepositions',
    name: 'Gdzie to jest',
    example: 'The cat is under the table.',
    items: [
      { tokens: ['The','cat','is','under','the','table'], extra: ['in','are'], pl: 'Kot jest pod stołem.' },
      { tokens: ['The','book','is','on','the','desk'], extra: ['at','are'], pl: 'Książka jest na biurku.' },
      { tokens: ['The','apple','is','in','the','box'], extra: ['on','are'], pl: 'Jabłko jest w pudełku.' },
      { tokens: ['The','bird','is','in','the','tree'], extra: ['under','are'], pl: 'Ptak jest na drzewie.' },
      { tokens: ['My','bag','is','behind','the','door'], extra: ['on','are'], pl: 'Moja torba jest za drzwiami.' },
      { tokens: ['The','lamp','is','next','to','the','bed'], extra: ['in','are'], pl: 'Lampa stoi obok łóżka.' },
      { tokens: ['The','shoes','are','under','the','chair'], extra: ['is','on'], pl: 'Buty są pod krzesłem.' },
      { tokens: ['The','fish','is','in','the','water'], extra: ['on','are'], pl: 'Ryba jest w wodzie.' },
      { tokens: ['The','picture','is','on','the','wall'], extra: ['in','are'], pl: 'Obrazek wisi na ścianie.' },
      { tokens: ['The','ball','is','between','the','trees'], extra: ['under','are'], pl: 'Piłka jest między drzewami.' }
    ]
  },
  {
    id: 'wh-questions',
    name: 'Pytania Wh-',
    example: 'Where is my bag?',
    items: [
      { tokens: ['Where','is','my','bag','?'], extra: ['What','are'], pl: 'Gdzie jest moja torba?' },
      { tokens: ['What','is','your','name','?'], extra: ['Where','are'], pl: 'Jak masz na imię?' },
      { tokens: ['Who','is','that','girl','?'], extra: ['What','are'], pl: 'Kim jest tamta dziewczynka?' },
      { tokens: ['When','do','you','get','up','?'], extra: ['Where','does'], pl: 'O której wstajesz?' },
      { tokens: ['Why','are','you','sad','?'], extra: ['What','is'], pl: 'Dlaczego jesteś smutny?' },
      { tokens: ['How','old','are','you','?'], extra: ['What','is'], pl: 'Ile masz lat?' },
      { tokens: ['What','colour','is','the','car','?'], extra: ['Where','are'], pl: 'Jakiego koloru jest ten samochód?' },
      { tokens: ['Where','does','she','live','?'], extra: ['What','do'], pl: 'Gdzie ona mieszka?' },
      { tokens: ['Who','has','got','my','pencil','?'], extra: ['What','have'], pl: 'Kto ma mój ołówek?' },
      { tokens: ['What','are','you','doing','?'], extra: ['Where','is'], pl: 'Co robisz?' }
    ]
  }
];

if (typeof window !== 'undefined') window.PATTERNS = PATTERNS;
if (typeof module !== 'undefined') module.exports = { PATTERNS };
