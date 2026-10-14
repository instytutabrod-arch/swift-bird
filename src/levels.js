'use strict';

/* Dwie niezależne osie opisu każdego zadania w aplikacji.
 *
 * To jest sedno poprawki z audytu 11.20: poziom to nie jedna liczba.
 *
 *   CEFR  — POZIOM JĘZYKOWY. Jak trudny jest materiał językowo.
 *           A1 → A2 → B1 → B2 → C1 → C2. Mierzy się go testem i słownictwem.
 *
 *   BLOOM — GŁĘBOKOŚĆ POZNAWCZA. Co uczeń musi ZROBIĆ z materiałem.
 *           Od rozpoznania do tworzenia. Nie zależy od poziomu językowego:
 *           można tworzyć na A1 i tylko rozpoznawać na B2.
 *
 * Te osie są PROSTOPADŁE. Zadanie „ułóż zdanie w Present Perfect" może być
 * B1 językowo, ale dopiero Zastosowaniem w Bloomie. Zadanie „wybierz lepsze
 * z dwóch sformułowań i uzasadnij" jest Ewaluacją niezależnie od tego, czy
 * słownictwo jest A1 czy B2.
 *
 * Każde zadanie w aplikacji docelowo niesie parę {cefr, bloom}. Ten plik
 * definiuje skale i pomocnicze funkcje; kolejne moduły tylko przypisują tagi.
 */

/* ---------- oś CEFR: poziom językowy ---------- */
const CEFR_LEVELS = [
  { id:'A1', order:1, name:'A1 · Początkujący',
    can:'Rozumie i używa bardzo prostych, codziennych zwrotów.' },
  { id:'A2', order:2, name:'A2 · Podstawowy',
    can:'Radzi sobie w prostych, rutynowych sytuacjach.' },
  { id:'B1', order:3, name:'B1 · Średni',
    can:'Rozumie główne myśli i opisuje doświadczenia oraz plany.' },
  { id:'B2', order:4, name:'B2 · Wyższy średni',
    can:'Swobodnie rozmawia i rozumie złożone teksty.' },
  { id:'C1', order:5, name:'C1 · Zaawansowany',
    can:'Wyraża się płynnie i spontanicznie, rozumie ukryte znaczenia i niuanse.' },
  { id:'C2', order:6, name:'C2 · Biegły',
    can:'Rozumie praktycznie wszystko i wyraża subtelne odcienie znaczeń precyzyjnie.' }
];
const CEFR_BY_ID = Object.fromEntries(CEFR_LEVELS.map(l => [l.id, l]));

function cefrOrder(id){ return (CEFR_BY_ID[id] || {}).order || 0; }
function cefrAtOrAbove(level, threshold){ return cefrOrder(level) >= cefrOrder(threshold); }
function clampCefr(id){ return CEFR_BY_ID[id] ? id : 'A1'; }

/* ---------- oś Bloom: głębokość poznawcza ---------- */
/* Zrewidowana taksonomia. EWALUACJA i TWORZENIE to DWA OSOBNE poziomy —
   to była błędna zbitka w starym README, tu rozdzielona. */
const BLOOM_LEVELS = [
  { id:'remember',   order:1, name:'Zapamiętanie',  verb:'rozpoznaj',
    desc:'Przypomnij sobie słowo lub formę.' },
  { id:'understand', order:2, name:'Rozumienie',    verb:'zrozum',
    desc:'Uchwyć znaczenie zdania albo tekstu.' },
  { id:'apply',      order:3, name:'Zastosowanie',  verb:'użyj',
    desc:'Użyj formy w nowej sytuacji.' },
  { id:'analyze',    order:4, name:'Analiza',       verb:'rozłóż',
    desc:'Znajdź błąd, porównaj, rozłóż na części.' },
  { id:'evaluate',   order:5, name:'Ewaluacja',     verb:'oceń',
    desc:'Wybierz lepsze rozwiązanie i uzasadnij wybór.' },
  { id:'create',     order:6, name:'Tworzenie',     verb:'stwórz',
    desc:'Samodzielnie zbuduj własną wypowiedź.' }
];
const BLOOM_BY_ID = Object.fromEntries(BLOOM_LEVELS.map(l => [l.id, l]));

function bloomOrder(id){ return (BLOOM_BY_ID[id] || {}).order || 0; }
function clampBloom(id){ return BLOOM_BY_ID[id] ? id : 'remember'; }

/* ---------- wymiar wiedzy Andersona i Krathwohla ---------- */
/* Bloom nie jest jedną drabiną trudności. Ten sam proces poznawczy może
   dotyczyć faktu, relacji między pojęciami, procedury albo świadomego
   kierowania własną nauką. Dlatego zadania zapisują także knowledge. */
const KNOWLEDGE_DIMENSIONS = [
  { id:'factual', order:1, name:'Wiedza faktyczna', short:'słowa, formy i sygnały',
    desc:'Podstawowe elementy potrzebne do wykonania zadania.' },
  { id:'conceptual', order:2, name:'Wiedza pojęciowa', short:'znaczenie i zależności',
    desc:'Relacje między formą, znaczeniem i sytuacją komunikacyjną.' },
  { id:'procedural', order:3, name:'Wiedza proceduralna', short:'jak użyć języka',
    desc:'Sposoby budowania, sprawdzania i poprawiania wypowiedzi.' },
  { id:'metacognitive', order:4, name:'Wiedza metapoznawcza', short:'jak się uczę',
    desc:'Świadomy wybór strategii, kryteriów i kolejnego celu nauki.' }
];
const KNOWLEDGE_BY_ID = Object.fromEntries(KNOWLEDGE_DIMENSIONS.map(item => [item.id,item]));
function clampKnowledge(id){ return KNOWLEDGE_BY_ID[id] ? id : 'factual'; }

/* ---------- tag zadania: CEFR + proces + rodzaj wiedzy ---------- */
/* Wygodny konstruktor. Zadanie bez jawnego taga dostaje A1/remember,
   żeby nic nie było nieotagowane — brak taga to też informacja (najniższy). */
function taskTag(cefr, bloom, knowledge='factual'){
  return { cefr: clampCefr(cefr), bloom: clampBloom(bloom), knowledge: clampKnowledge(knowledge) };
}

/* Cel ma czasownik możliwy do zaobserwowania. Dzięki temu „zrozum czas” nie
   jest pozornym celem: aplikacja wie, czy uczeń ma rozpoznać, wyjaśnić,
   zastosować, przeanalizować, ocenić czy stworzyć wypowiedź. */
function learningObjective(cefr,bloom,knowledge,action,criteria=[]){
  return {
    ...taskTag(cefr,bloom,knowledge),
    action:String(action||'').trim(),
    criteria:Array.isArray(criteria)?criteria.map(String).filter(Boolean):[]
  };
}

/* Które moduły aplikacji realizują który poziom Blooma — mapa pokrycia.
   Moduły bywają na dwóch poziomach naraz: klocki zdań układa się (rozumienie),
   a potem stosuje wzorzec w nowej sytuacji (zastosowanie); detektyw analizuje
   błąd, a uzasadnienie wyboru to już ewaluacja. Wpisujemy je tam, gdzie realnie
   pracują, zgodnie z definicjami Andersona i Krathwohla. */
const BLOOM_COVERAGE = {
  remember:   ['Kolekcja słów', 'Pule'],
  understand: ['Klocki zdań', 'Historyjki'],
  apply:      ['Dialogi', 'Czasy', 'Klocki zdań'],
  analyze:    ['Detektyw', 'Czasy: kontrast'],
  evaluate:   ['Pracownia: wybór według kryteriów', 'Detektyw: uzasadnienie', 'Autokorekta'],
  create:     ['Pracownia: własna wypowiedź', 'Czytanie własnego zdania']
};

if (typeof window !== 'undefined'){
  window.LEVELS = {
    CEFR_LEVELS, CEFR_BY_ID, cefrOrder, cefrAtOrAbove, clampCefr,
    BLOOM_LEVELS, BLOOM_BY_ID, bloomOrder, clampBloom,
    KNOWLEDGE_DIMENSIONS, KNOWLEDGE_BY_ID, clampKnowledge,
    taskTag, learningObjective, BLOOM_COVERAGE
  };
}
if (typeof module !== 'undefined'){
  module.exports = {
    CEFR_LEVELS, CEFR_BY_ID, cefrOrder, cefrAtOrAbove, clampCefr,
    BLOOM_LEVELS, BLOOM_BY_ID, bloomOrder, clampBloom,
    KNOWLEDGE_DIMENSIONS, KNOWLEDGE_BY_ID, clampKnowledge,
    taskTag, learningObjective, BLOOM_COVERAGE
  };
}
