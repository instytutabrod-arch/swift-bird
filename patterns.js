'use strict';

/* M2: klocki zdań.
 *
 * Każdy wzorzec ma własny cykl powtórek, dokładnie jak słowo w M1.
 * ZASADA: dziecko najpierw odkrywa wzorzec przez przykład i układanie.
 * Dobrowolna pomoc gramatyczna w app.js objaśnia części zdania prostym
 * językiem i pozostaje dostępna na każdym poziomie trudności.
 *
 * `tokens`  - poprawna kolejność klocków
 * `extra`   - klocki zbędne, dobrane pod typowe błędy polskiego ucznia
 * `pl`      - tłumaczenie, pokazywane jako polecenie
 * `vocab`   - słowa treściowe, które muszą już być w kolekcji ucznia
 *             (zaimki, rodzajniki i elementy ćwiczonego wzorca są rusztowaniem)
 */

const PATTERNS = [
  {
    id: 'to-be-positive',
    name: 'Kim jestem, jaki jestem',
    example: 'This is a cat.',
    items: [
      { tokens: ['This','is','a','cat'], extra: ['are','an'], pl: 'To jest kot.', vocab: ['cat'] },
      { tokens: ['This','is','a','dog'], extra: ['am','the'], pl: 'To jest pies.', vocab: ['dog'] },
      { tokens: ['This','is','a','horse'], extra: ['are','an'], pl: 'To jest koń.', vocab: ['horse'] },
      { tokens: ['This','is','a','cow'], extra: ['am','the'], pl: 'To jest krowa.', vocab: ['cow'] },
      { tokens: ['I','am','happy'], extra: ['is','are'], pl: 'Jestem szczęśliwy.', vocab: ['happy'] },
      { tokens: ['She','is','tired'], extra: ['am','be'], pl: 'Ona jest zmęczona.', vocab: ['tired'] },
      { tokens: ['We','are','hungry'], extra: ['is','am'], pl: 'Jesteśmy głodni.', vocab: ['hungry'] },
      { tokens: ['They','are','friendly'], extra: ['is','am'], pl: 'Oni są przyjaźni.', vocab: ['friendly'] },
      { tokens: ['My','brother','is','tall'], extra: ['are','am'], pl: 'Mój brat jest wysoki.', vocab: ['brother','tall'] },
      { tokens: ['The','soup','is','hot'], extra: ['are','a'], pl: 'Zupa jest gorąca.', vocab: ['soup','hot'] }
    ]
  },
  {
    id: 'to-be-question',
    name: 'Pytanie i przeczenie z to be',
    example: 'Is this a cat?',
    items: [
      { tokens: ['Is','this','a','cat','?'], extra: ['Does','are'], pl: 'Czy to jest kot?', vocab: ['cat'] },
      { tokens: ['Is','this','a','dog','?'], extra: ['Do','am'], pl: 'Czy to jest pies?', vocab: ['dog'] },
      { tokens: ['This','is','not','a','horse'], extra: ['no','are'], pl: 'To nie jest koń.', vocab: ['horse'] },
      { tokens: ['Is','this','a','cow','?'], extra: ['Are','does'], pl: 'Czy to jest krowa?', vocab: ['cow'] },
      { tokens: ['She','is','not','sad'], extra: ['no','does'], pl: 'Ona nie jest smutna.', vocab: ['sad'] },
      { tokens: ['Are','you','tired','?'], extra: ['Is','Do'], pl: 'Czy jesteś zmęczony?', vocab: ['tired'] },
      { tokens: ['I','am','not','cold'], extra: ['no','is'], pl: 'Nie jest mi zimno.', vocab: ['cold'] },
      { tokens: ['The','water','is','not','warm'], extra: ['no','are'], pl: 'Woda nie jest ciepła.', vocab: ['water','warm'] },
      { tokens: ['Is','your','sister','young','?'], extra: ['Are','Has'], pl: 'Czy twoja siostra jest młoda?', vocab: ['sister','young'] },
      { tokens: ['They','are','not','friendly'], extra: ['no','is'], pl: 'Oni nie są przyjaźni.', vocab: ['friendly'] }
    ]
  },
  {
    id: 'have-got',
    name: 'Co mam',
    example: 'I have got a cat.',
    items: [
      { tokens: ['I','have','got','a','cat'], extra: ['has','the'], pl: 'Mam kota.', vocab: ['cat'] },
      { tokens: ['She','has','got','a','dog'], extra: ['have','an'], pl: 'Ona ma psa.', vocab: ['dog'] },
      { tokens: ['We','have','got','a','horse'], extra: ['has','the'], pl: 'Mamy konia.', vocab: ['horse'] },
      { tokens: ['Have','you','got','a','rabbit','?'], extra: ['Has','Do'], pl: 'Czy masz królika?', vocab: ['rabbit'] },
      { tokens: ['He','has','got','a','mouse'], extra: ['have','the'], pl: 'On ma mysz.', vocab: ['mouse'] },
      { tokens: ['They','have','got','a','cow'], extra: ['has','an'], pl: 'Oni mają krowę.', vocab: ['cow'] },
      { tokens: ['I','have','not','got','a','pig'], extra: ['has','no'], pl: 'Nie mam świni.', vocab: ['pig'] },
      { tokens: ['Has','she','got','a','sister','?'], extra: ['Have','Does'], pl: 'Czy ona ma siostrę?', vocab: ['sister'] },
      { tokens: ['My','mother','has','got','a','car'], extra: ['have','an'], pl: 'Moja mama ma samochód.', vocab: ['mother','car'] },
      { tokens: ['The','house','has','got','four','windows'], extra: ['have','a'], pl: 'Ten dom ma cztery okna.', vocab: ['house','four','window'] }
    ]
  },
  {
    id: 'present-simple',
    name: 'Co robię zwykle',
    example: 'The cats sleep.',
    items: [
      { tokens: ['The','cats','sleep'], extra: ['sleeps','are'], pl: 'Koty śpią.', vocab: ['cat','sleep'] },
      { tokens: ['The','dogs','run'], extra: ['runs','are'], pl: 'Psy biegają.', vocab: ['dog','run'] },
      { tokens: ['The','horses','jump'], extra: ['jumps','are'], pl: 'Konie skaczą.', vocab: ['horse','jump'] },
      { tokens: ['The','rabbits','eat'], extra: ['eats','are'], pl: 'Króliki jedzą.', vocab: ['rabbit','eat'] },
      { tokens: ['The','frogs','swim'], extra: ['swims','are'], pl: 'Żaby pływają.', vocab: ['frog','swim'] },
      { tokens: ['We','play','football','on','Monday'], extra: ['plays','are'], pl: 'Gramy w piłkę w poniedziałek.', vocab: ['play','football','Monday'] },
      { tokens: ['She','reads','a','book','every','day'], extra: ['read','is'], pl: 'Ona czyta książkę codziennie.', vocab: ['read','book','day'] },
      { tokens: ['I','walk','to','school'], extra: ['walks','am'], pl: 'Chodzę do szkoły pieszo.', vocab: ['walk','school'] },
      { tokens: ['He','eats','bread'], extra: ['eat','is'], pl: 'On je chleb.', vocab: ['eat','bread'] },
      { tokens: ['They','sing','on','Friday'], extra: ['sings','are'], pl: 'Oni śpiewają w piątek.', vocab: ['sing','Friday'] }
    ]
  },
  {
    id: 'present-continuous',
    name: 'Co dzieje się teraz',
    example: 'The cat is sleeping.',
    items: [
      { tokens: ['The','cat','is','sleeping'], extra: ['sleeps','are'], pl: 'Kot właśnie śpi.', vocab: ['cat','sleep'] },
      { tokens: ['The','dog','is','running','now'], extra: ['runs','are'], pl: 'Pies teraz biegnie.', vocab: ['dog','run'] },
      { tokens: ['The','horse','is','eating'], extra: ['eats','are'], pl: 'Koń właśnie je.', vocab: ['horse','eat'] },
      { tokens: ['The','rabbit','is','jumping'], extra: ['jumps','are'], pl: 'Królik właśnie skacze.', vocab: ['rabbit','jump'] },
      { tokens: ['The','frog','is','swimming'], extra: ['swims','are'], pl: 'Żaba właśnie pływa.', vocab: ['frog','swim'] },
      { tokens: ['I','am','eating','an','apple'], extra: ['eat','is'], pl: 'Jem właśnie jabłko.', vocab: ['eat','apple'] },
      { tokens: ['She','is','reading','a','book'], extra: ['reads','are'], pl: 'Ona właśnie czyta książkę.', vocab: ['read','book'] },
      { tokens: ['We','are','playing'], extra: ['play','is'], pl: 'Właśnie się bawimy.', vocab: ['play'] },
      { tokens: ['They','are','singing','now'], extra: ['sing','is'], pl: 'Oni teraz śpiewają.', vocab: ['sing'] },
      { tokens: ['My','mother','is','cooking','soup'], extra: ['cooks','are'], pl: 'Moja mama gotuje właśnie zupę.', vocab: ['mother','cook','soup'] }
    ]
  },
  {
    id: 'prepositions',
    name: 'Gdzie to jest',
    example: 'The cat is under the table.',
    items: [
      { tokens: ['The','cat','is','under','the','table'], extra: ['in','are'], pl: 'Kot jest pod stołem.', vocab: ['cat','under','table'] },
      { tokens: ['The','dog','is','on','the','sofa'], extra: ['at','are'], pl: 'Pies jest na sofie.', vocab: ['dog','on','sofa'] },
      { tokens: ['The','apple','is','in','the','box'], extra: ['on','are'], pl: 'Jabłko jest w pudełku.', vocab: ['apple','in','box'] },
      { tokens: ['The','owl','is','in','the','tree'], extra: ['under','are'], pl: 'Sowa jest na drzewie.', vocab: ['owl','in','tree'] },
      { tokens: ['My','bag','is','behind','the','door'], extra: ['on','are'], pl: 'Moja torba jest za drzwiami.', vocab: ['bag','behind','door'] },
      { tokens: ['The','lamp','is','near','the','bed'], extra: ['in','are'], pl: 'Lampa stoi blisko łóżka.', vocab: ['lamp','near','bed'] },
      { tokens: ['The','shoes','are','under','the','chair'], extra: ['is','on'], pl: 'Buty są pod krzesłem.', vocab: ['shoes','under','chair'] },
      { tokens: ['The','fish','is','in','the','water'], extra: ['on','are'], pl: 'Ryba jest w wodzie.', vocab: ['fish','in','water'] },
      { tokens: ['The','picture','is','on','the','wall'], extra: ['in','are'], pl: 'Obrazek wisi na ścianie.', vocab: ['picture','on','wall'] },
      { tokens: ['The','ball','is','between','the','trees'], extra: ['under','are'], pl: 'Piłka jest między drzewami.', vocab: ['ball','between','tree'] }
    ]
  },
  {
    id: 'wh-questions',
    name: 'Pytania Wh-',
    example: 'Where is the cat?',
    items: [
      { tokens: ['Where','is','the','cat','?'], extra: ['What','are'], pl: 'Gdzie jest kot?', vocab: ['cat'] },
      { tokens: ['What','colour','is','the','dog','?'], extra: ['Where','are'], pl: 'Jakiego koloru jest pies?', vocab: ['dog'] },
      { tokens: ['Who','has','got','the','horse','?'], extra: ['What','have'], pl: 'Kto ma konia?', vocab: ['horse'] },
      { tokens: ['Where','is','the','cow','?'], extra: ['When','are'], pl: 'Gdzie jest krowa?', vocab: ['cow'] },
      { tokens: ['Who','is','that','girl','?'], extra: ['What','are'], pl: 'Kim jest tamta dziewczynka?', vocab: ['girl'] },
      { tokens: ['When','do','you','play','football','?'], extra: ['Where','does'], pl: 'Kiedy grasz w piłkę?', vocab: ['play','football'] },
      { tokens: ['Why','are','you','sad','?'], extra: ['What','is'], pl: 'Dlaczego jesteś smutny?', vocab: ['sad'] },
      { tokens: ['How','old','is','your','dog','?'], extra: ['What','are'], pl: 'Ile lat ma twój pies?', vocab: ['old','dog'] },
      { tokens: ['Where','does','she','live','?'], extra: ['What','do'], pl: 'Gdzie ona mieszka?', vocab: ['live'] },
      { tokens: ['What','is','the','dog','doing','?'], extra: ['Where','does'], pl: 'Co robi pies?', vocab: ['dog'] }
    ]
  }
];

if (typeof window !== 'undefined') window.PATTERNS = PATTERNS;
if (typeof module !== 'undefined') module.exports = { PATTERNS };
