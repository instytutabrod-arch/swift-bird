'use strict';

/* Dwie niezależne osie opisu każdego zadania w aplikacji.
 *
 * To jest sedno poprawki z audytu 11.20: poziom to nie jedna liczba.
 *
 *   CEFR  — POZIOM JĘZYKOWY. Jak trudny jest materiał językowo.
 *           A1 → A2 → B1 → B2. Mierzy się go testem i słownictwem.
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
    can:'Swobodnie rozmawia i rozumie złożone teksty.' }
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

/* ---------- tag zadania: para obu osi ---------- */
/* Wygodny konstruktor. Zadanie bez jawnego taga dostaje A1/remember,
   żeby nic nie było nieotagowane — brak taga to też informacja (najniższy). */
function taskTag(cefr, bloom){
  return { cefr: clampCefr(cefr), bloom: clampBloom(bloom) };
}

/* Które moduły aplikacji realizują który poziom Blooma — mapa pokrycia,
   żeby dało się pokazać, czego jeszcze brakuje (Ewaluacja, Tworzenie). */
const BLOOM_COVERAGE = {
  remember:   ['Kolekcja słów', 'Pule'],
  understand: ['Klocki zdań', 'Historyjki'],
  apply:      ['Dialogi', 'Czasy'],
  analyze:    ['Detektyw'],
  evaluate:   [],   // w budowie
  create:     []    // w budowie
};

if (typeof window !== 'undefined'){
  window.LEVELS = {
    CEFR_LEVELS, CEFR_BY_ID, cefrOrder, cefrAtOrAbove, clampCefr,
    BLOOM_LEVELS, BLOOM_BY_ID, bloomOrder, clampBloom,
    taskTag, BLOOM_COVERAGE
  };
}
if (typeof module !== 'undefined'){
  module.exports = {
    CEFR_LEVELS, CEFR_BY_ID, cefrOrder, cefrAtOrAbove, clampCefr,
    BLOOM_LEVELS, BLOOM_BY_ID, bloomOrder, clampBloom,
    taskTag, BLOOM_COVERAGE
  };
}
