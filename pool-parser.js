'use strict';

/* Parser wklejanej listy słówek.
 *
 * Nauczyciel albo uczeń wkleja listę, jeden wpis na linię:
 *   dog - pies
 *   business ; biznes
 *   to run = biegać
 *   invoice — faktura
 *
 * Akceptujemy kilka separatorów, żeby nikt nie musiał się pilnować:
 *   " - ", " – ", " — ", ";", "=", tabulator.
 * Wielosłowne strony są dozwolone, liczy się PIERWSZY separator w linii.
 *
 * Zwraca listę wpisów {en, pl} oraz listę linii odrzuconych z powodem,
 * żeby dało się pokazać podgląd przed zapisem.
 */

const SEPARATORS = [' — ', ' – ', ' - ', '\t', ';', ' = ', '=', '—', '–', ' -', '- '];

function splitLine(line){
  for(const sep of SEPARATORS){
    const idx = line.indexOf(sep);
    if(idx > 0){
      return [line.slice(0, idx), line.slice(idx + sep.length)];
    }
  }
  // ostatnia szansa: pojedynczy dywiz z odstępami po obu stronach już
  // obsłużony wyżej; goły "-" bez spacji zostawiamy, bo bywa w słowach
  return null;
}

function cleanSide(value){
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseWordList(text, options){
  const opts = options || {};
  const maxEntries = opts.maxEntries || 300;
  const maxLen = opts.maxLen || 80;
  const lines = String(text || '').split(/\r?\n/);
  const entries = [];
  const rejected = [];
  const seen = new Set();

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if(!line) return; // puste linie milcząco pomijamy
    if(line.length > maxLen * 2){
      rejected.push({ line: index + 1, text: raw, reason: 'linia jest za długa' });
      return;
    }
    const parts = splitLine(line);
    if(!parts){
      rejected.push({ line: index + 1, text: raw, reason: 'brak separatora (użyj myślnika, średnika lub =)' });
      return;
    }
    const en = cleanSide(parts[0]);
    const pl = cleanSide(parts[1]);
    if(!en || !pl){
      rejected.push({ line: index + 1, text: raw, reason: 'brakuje słowa albo tłumaczenia' });
      return;
    }
    if(en.length > maxLen || pl.length > maxLen){
      rejected.push({ line: index + 1, text: raw, reason: 'wpis jest za długi' });
      return;
    }
    const key = en.toLowerCase();
    if(seen.has(key)) return; // duplikat w tej samej wklejce pomijamy
    seen.add(key);
    entries.push({ en, pl });
  });

  return {
    entries: entries.slice(0, maxEntries),
    rejected,
    truncated: entries.length > maxEntries
  };
}

/* ----- zgadywanie emoji dla ścieżki Szkoła ----- *
 * Egzamin par w Szkole dopasowuje piktogram do słowa, więc wklejone słowa
 * potrzebują emoji. Zgadujemy je ze słownika najczęstszych słów szkolnych.
 * Słowo bez trafienia dostaje neutralny znacznik ◻, a egzamin par po prostu
 * go pomija (obsłuży to część druga). */
const EMOJI_MAP = {
  cat:'🐱', dog:'🐶', horse:'🐴', cow:'🐮', pig:'🐷', sheep:'🐑', goat:'🐐', rabbit:'🐰',
  bird:'🐦', fish:'🐟', lion:'🦁', tiger:'🐯', bear:'🐻', fox:'🦊', frog:'🐸', duck:'🦆',
  mouse:'🐭', monkey:'🐵', elephant:'🐘', owl:'🦉', bee:'🐝', snake:'🐍', chicken:'🐔',
  apple:'🍎', banana:'🍌', orange:'🍊', bread:'🍞', cheese:'🧀', egg:'🥚', milk:'🥛',
  water:'💧', cake:'🍰', cookie:'🍪', pizza:'🍕', soup:'🍲', tea:'🍵', rice:'🍚',
  carrot:'🥕', tomato:'🍅', banana2:'🍌', lemon:'🍋', strawberry:'🍓', grapes:'🍇',
  house:'🏠', door:'🚪', window:'🪟', bed:'🛏️', chair:'🪑', table:'🪑', lamp:'💡',
  clock:'🕐', key:'🔑', book:'📖', pencil:'✏️', bag:'🎒', phone:'📱', box:'📦',
  cup:'☕', plate:'🍽️', spoon:'🥄', fork:'🍴', ball:'⚽', toy:'🧸', car:'🚗', bike:'🚲',
  bus:'🚌', train:'🚂', plane:'✈️', boat:'⛵', hand:'✋', foot:'🦶', eye:'👁️', ear:'👂',
  nose:'👃', mouth:'👄', hair:'💇', tooth:'🦷', head:'🧠', face:'🙂',
  shirt:'👕', trousers:'👖', dress:'👗', shoes:'👟', shoe:'👟', hat:'🧢', socks:'🧦',
  coat:'🧥', sun:'☀️', moon:'🌙', star:'⭐', cloud:'☁️', rain:'🌧️', snow:'❄️',
  tree:'🌳', flower:'🌸', leaf:'🍃', grass:'🌱', mountain:'⛰️', sea:'🌊', fire:'🔥',
  mother:'👩', father:'👨', sister:'👧', brother:'👦', baby:'👶', family:'👨‍👩‍👧',
  school:'🏫', teacher:'👩‍🏫', friend:'🧑‍🤝‍🧑', garden:'🌷', park:'🏞️', shop:'🏪',
  red:'🔴', blue:'🔵', green:'🟢', yellow:'🟡', black:'⚫', white:'⚪',
  happy:'😊', sad:'😢', big:'🐘', small:'🐜', hot:'🔥', cold:'❄️',
  run:'🏃', jump:'🤸', swim:'🏊', sleep:'😴', eat:'😋', read:'📚', write:'✍️', sing:'🎤'
};
const NEUTRAL_ICON = '◻️';

function guessIcon(en){
  const word = String(en || '').toLowerCase().replace(/^to\s+/, '').trim();
  return EMOJI_MAP[word] || NEUTRAL_ICON;
}
function hasIcon(en){
  const word = String(en || '').toLowerCase().replace(/^to\s+/, '').trim();
  return Boolean(EMOJI_MAP[word]);
}

if (typeof window !== 'undefined'){
  window.POOL_PARSER = { parseWordList, guessIcon, hasIcon, NEUTRAL_ICON };
}
if (typeof module !== 'undefined'){
  module.exports = { parseWordList, guessIcon, hasIcon, NEUTRAL_ICON };
}
