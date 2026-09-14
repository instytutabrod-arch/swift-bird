'use strict';

/* Generator zdań dla M2.
 *
 * Filozofia: KOTWICA uczy, GENERATOR utrwala.
 *
 * Każdy wzorzec ma jedno lub kilka ręcznie napisanych, sensownych zdań
 * (kotwice). To one pojawiają się jako pierwsze i to na nich dziecko
 * poznaje strukturę. Dopiero gdy wzorzec jest opanowany, generator
 * podstawia do szablonu słowa z KOLEKCJI dziecka, żeby wariantów było
 * dużo i zawsze ze słów, które już zna.
 *
 * Żeby generator nie tworzył bezsensu w rodzaju "The cheese has got a
 * happy nose", słowa są opisane rolami semantycznymi (SEM), a sloty
 * szablonu przyjmują tylko pasujące role. Zdanie, którego nie da się
 * sensownie wypełnić z kolekcji, po prostu nie powstaje — wtedy używamy
 * kotwicy.
 */

/* ----- role semantyczne: które słowo może wejść w który slot ----- */
const SEM = {
  // osoby i istoty, które mogą coś "mieć" i coś "robić"
  animate: ['cat','dog','horse','cow','pig','sheep','goat','rabbit','mother','father','sister','brother',
            'grandmother','grandfather','baby','child','boy','girl','teacher','friend','bird','fish','lion',
            'tiger','monkey','elephant','frog','duck','chicken','mouse','bear','fox','owl'],
  // rzeczy nieożywione
  thing: ['book','pencil','bag','ball','box','key','cup','plate','spoon','lamp','clock','phone','chair',
          'table','bed','door','window','apple','banana','bread','cheese','egg','car','bike','hat','coat',
          'shoe','shirt','flower','tree','stone','cake','toy'],
  // przymiotniki opisujące wygląd i stan
  adjective: ['happy','sad','tired','hungry','big','small','tall','short','young','old','new','fast','slow',
              'hot','cold','warm','clean','red','blue','green','yellow','black','white','long','funny','nice','kind'],
  // przymiotniki tylko o uczuciach (dla to be z osobą)
  feeling: ['happy','sad','tired','hungry','angry','afraid','excited','bored','proud','calm'],
  // czasowniki czynności (Present Simple / Continuous)
  action: ['play','read','walk','run','swim','sing','dance','eat','drink','jump','sleep','write','draw','cook','look','listen'],
  // rzeczy, które mają miejsce w przestrzeni
  locatable: ['cat','dog','ball','book','bag','cup','apple','key','toy','bird','shoe','hat','pencil'],
  // miejsca / pojemniki dla przyimków
  place: ['table','box','chair','bed','tree','bag','room','garden','desk','shelf','wall','floor'],
  // przyimki miejsca
  preposition: ['on','in','under','behind','next to','between'],
  // liczby
  number: ['two','three','four','five','six'],
  // słowa pytające
  wh: ['where','what','who','when','why','how']
};

function semSet(role){ return new Set(SEM[role] || []); }

/* Rzeczowniki wymagające "an" zamiast "a". */
const VOWEL_START = /^[aeiou]/i;
function article(word){ return VOWEL_START.test(word) ? 'an' : 'a'; }

/* Prosta liczba mnoga na potrzeby "have got two cats". */
function plural(word){
  if(/(s|sh|ch|x|z)$/.test(word)) return word + 'es';
  if(/[^aeiou]y$/.test(word)) return word.slice(0,-1) + 'ies';
  return word + 's';
}

/* Trzecia osoba Present Simple: she reads, he watches. */
function thirdPerson(verb){
  if(/(s|sh|ch|x|z)$/.test(verb)) return verb + 'es';
  if(/[^aeiou]y$/.test(verb)) return verb.slice(0,-1) + 'ies';
  return verb + 's';
}

/* Imiesłów -ing: run → running, write → writing. */
function ing(verb){
  if(/[^aeiou][aeiou][^aeiouwxy]$/.test(verb)) return verb + verb.slice(-1) + 'ing';
  if(/e$/.test(verb) && !/ee$/.test(verb)) return verb.slice(0,-1) + 'ing';
  return verb + 'ing';
}

/* ----- szablony wzorców ----- *
 * `slots` opisuje, jak zbudować zdanie z wylosowanych słów.
 * `anchors` to gotowe, sensowne zdania — pierwsze, jakie dziecko widzi.
 * `distractorPool` to klocki-pułapki dobrane pod typowe błędy.
 */
const TEMPLATES = {
  'to-be-positive': {
    name: 'Kim jestem, jaki jestem',
    promptPl: 'Ułóż zdanie opisujące osobę lub rzecz.',
    pos: ['zaimek/rzecz.', 'to be', 'przymiotnik'],
    anchors: [
      ['She','is','happy','.'],
      ['The','cat','is','small','.'],
      ['I','am','tired','.'],
      ['We','are','hungry','.']
    ],
    distractors: ['am','are','be','a'],
    build(pick){
      const who = pick('animate');
      const adj = pick('feeling') || pick('adjective');
      if(!who || !adj) return null;
      return ['The', who, 'is', adj, '.'];
    }
  },
  'to-be-question': {
    name: 'Pytanie i przeczenie z to be',
    promptPl: 'Ułóż pytanie o osobę lub rzecz.',
    anchors: [
      ['Is','she','happy','?'],
      ['Are','you','tired','?'],
      ['She','is','not','sad','.'],
      ['They','are','not','here','.']
    ],
    distractors: ['Does','Do','no','a'],
    build(pick){
      const who = pick('animate');
      const adj = pick('feeling') || pick('adjective');
      if(!who || !adj) return null;
      return ['Is','the', who, adj, '?'];
    }
  },
  'have-got': {
    name: 'Co mam',
    promptPl: 'Ułóż zdanie mówiące, co ktoś ma.',
    anchors: [
      ['I','have','got','a','sister','.'],
      ['She','has','got','two','cats','.'],
      ['We','have','got','a','dog','.'],
      ['He','has','got','a','ball','.']
    ],
    distractors: ['has','have','the','an'],
    build(pick){
      const thing = pick('thing') || pick('animate');
      if(!thing) return null;
      return ['I','have','got', article(thing), thing, '.'];
    }
  },
  'present-simple': {
    name: 'Co robię zwykle',
    promptPl: 'Ułóż zdanie o codziennej czynności.',
    anchors: [
      ['We','play','football','on','Monday','.'],
      ['She','reads','a','book','.'],
      ['I','walk','to','school','.'],
      ['He','eats','bread','.']
    ],
    distractors: ['plays','is','am','are'],
    build(pick){
      const verb = pick('action');
      if(!verb) return null;
      return ['I', verb, 'every', 'day', '.'];
    }
  },
  'present-continuous': {
    name: 'Co dzieje się teraz',
    promptPl: 'Ułóż zdanie o tym, co dzieje się teraz.',
    anchors: [
      ['He','is','running','now','.'],
      ['I','am','eating','an','apple','.'],
      ['She','is','reading','a','book','.'],
      ['We','are','playing','now','.']
    ],
    distractors: ['runs','run','is','am'],
    build(pick){
      const verb = pick('action');
      if(!verb) return null;
      return ['She','is', ing(verb), 'now', '.'];
    }
  },
  'prepositions': {
    name: 'Gdzie to jest',
    promptPl: 'Ułóż zdanie mówiące, gdzie znajduje się rzecz.',
    anchors: [
      ['The','cat','is','under','the','table','.'],
      ['The','book','is','on','the','desk','.'],
      ['The','ball','is','in','the','box','.'],
      ['The','bird','is','in','the','tree','.']
    ],
    distractors: ['are','a','at'],
    build(pick){
      const item = pick('locatable');
      const prep = pick('preposition');
      const place = pick('place');
      if(!item || !prep || !place) return null;
      return ['The', item, 'is', prep, 'the', place, '.'];
    }
  },
  'wh-questions': {
    name: 'Pytania Wh-',
    promptPl: 'Ułóż pytanie o miejsce rzeczy.',
    anchors: [
      ['Where','is','my','bag','?'],
      ['What','is','your','name','?'],
      ['Who','is','that','girl','?'],
      ['How','old','are','you','?']
    ],
    distractors: ['are','do','a'],
    build(pick){
      const thing = pick('thing');
      if(!thing) return null;
      return ['Where','is','the', thing, '?'];
    }
  }
};

/* Zamienia zdanie (tablicę tokenów) na wersję do wyświetlenia i porównania. */
function tokensToSentence(tokens){
  let text = '';
  tokens.forEach((token,index) => {
    if(/^[?.!,]$/.test(token)) text += token;
    else text += (index === 0 ? '' : ' ') + token;
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* Buduje jedno zadanie dla wzorca.
 *
 * `collected` to zbiór angielskich słów, które dziecko już zebrało.
 * `level` (liczba udanych powtórek) decyduje o dwóch rzeczach:
 *   - czy używamy kotwicy (niski poziom) czy generatora (wyższy),
 *   - ile klocków-pułapek dokładamy.
 * Gdy generator nie potrafi ułożyć sensownego zdania z kolekcji,
 * spada z powrotem na kotwicę — zdanie zawsze powstaje.
 */
function makeSentenceTask(patternId, collected, level){
  const template = TEMPLATES[patternId];
  /* Pierwsze dwa spotkania korzystają z dokładnie przetłumaczonych zdań
     zapisanych w patterns.js. Generator służy dopiero do utrwalania. */
  if(!template || level < 2 || Math.random() >= 0.6) return null;
  const owned = collected instanceof Set ? collected : new Set(collected || []);

  // Kolekcja bywa zapisana małymi literami, więc porównujemy po lowercase.
  const has = word => owned.has(word) || owned.has(word.toLowerCase());
  const pickFrom = role => {
    const candidates = (SEM[role] || []).filter(has);
    if(!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  const tokens = template.build ? template.build(pickFrom) : null;
  /* Brak odpowiednich, już poznanych słów oznacza powrót do bieżącego
     zdania z patterns.js, zamiast podstawiania dziecku obcych wyrazów. */
  if(!tokens)return null;

  // Klocki-pułapki: więcej na wyższych poziomach, nigdy nie dublują
  // klocka poprawnego.
  const extraCount = level <= 0 ? 0 : (level === 1 ? 1 : 2);
  const pool = template.distractors.filter(token => !tokens.includes(token));
  const extra = [];
  const shuffledPool = pool.slice().sort(() => Math.random() - 0.5);
  for(let i = 0; i < extraCount && i < shuffledPool.length; i++) extra.push(shuffledPool[i]);

  return {
    patternId,
    tokens,
    extra,
    sentence: tokensToSentence(tokens),
    promptPl: template.promptPl,
    fromGenerator: true
  };
}

/* Które wzorce są w ogóle dostępne przy danym stanie kolekcji.
 * Wzorzec wymaga, żeby dało się z niego ułożyć choć kotwicę (zawsze można)
 * — więc realnie ogranicza go progresja z app.js, nie ten plik. */
const PATTERN_ORDER = ['to-be-positive','prepositions','have-got','to-be-question','present-simple','present-continuous','wh-questions'];

if (typeof window !== 'undefined'){
  window.SENTENCE_GEN = { TEMPLATES, SEM, makeSentenceTask, tokensToSentence, PATTERN_ORDER, article, plural, thirdPerson, ing };
}
if (typeof module !== 'undefined'){
  module.exports = { TEMPLATES, SEM, makeSentenceTask, tokensToSentence, PATTERN_ORDER, article, plural, thirdPerson, ing };
}
