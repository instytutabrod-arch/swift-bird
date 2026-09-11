'use strict';

process.env.ADMIN_PASSWORD = 'bezpieczne-haslo-testowe';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {newDb} = require('pg-mem');
const {server, initializeDatabase, useDatabaseForTests, clientAddress, WEAK_PINS} = require('../server');

test('adres klienta bierze ostatni wpis z x-forwarded-for', () => {
  // Klient moze podrobic poczatek lancucha. Serwer posredniczacy dopisuje
  // prawdziwy adres na koncu, wiec tylko ostatnia wartosc jest wiarygodna.
  const fake = {headers: {'x-forwarded-for': '9.9.9.9, 203.0.113.7'}, socket: {remoteAddress: '10.0.0.1'}};
  assert.equal(clientAddress(fake), '203.0.113.7');

  const direct = {headers: {}, socket: {remoteAddress: '10.0.0.1'}};
  assert.equal(clientAddress(direct), '10.0.0.1');

  const empty = {headers: {'x-forwarded-for': '  ,  '}, socket: {remoteAddress: '10.0.0.2'}};
  assert.equal(clientAddress(empty), '10.0.0.2');
});

test('oczywiste PIN-y są odrzucane', () => {
  for(const pin of ['0000', '1234', '1111', '4321']) assert.ok(WEAK_PINS.has(pin), pin);
  assert.ok(!WEAK_PINS.has('7392'));
});

test('samodzielna rejestracja: zakłada konto, loguje i pilnuje kolizji', async () => {
  const memory = newDb();
  const adapter = memory.adapters.createPg();
  const database = new adapter.Pool();
  await initializeDatabase(database);
  useDatabaseForTests(database);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (p, body) => fetch(base + p, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });

  try{
    const config = await (await fetch(base + '/api/config')).json();
    assert.equal(config.selfRegistration, true);

    const created = await post('/api/student/register', {firstName: 'Marcjanna', lastInitial: 'M', pin: '7392', pinRepeat: '7392'});
    assert.equal(created.status, 201);
    const payload = await created.json();
    assert.equal(payload.user.displayName, 'Marcjanna M.');
    assert.ok(created.headers.get('set-cookie'), 'rejestracja od razu loguje');

    // niezgodne PIN-y
    const mismatch = await post('/api/student/register', {firstName: 'Ala', lastInitial: 'B', pin: '1357', pinRepeat: '2468'});
    assert.equal(mismatch.status, 400);

    // za latwy PIN
    const weak = await post('/api/student/register', {firstName: 'Ala', lastInitial: 'B', pin: '1234', pinRepeat: '1234'});
    assert.equal(weak.status, 400);

    // to samo imie, inicjal i PIN: logowanie nie rozroznilo by kont
    const clash = await post('/api/student/register', {firstName: 'marcjanna', lastInitial: 'm', pin: '7392', pinRepeat: '7392'});
    assert.equal(clash.status, 409);

    // to samo imie i inicjal, ale inny PIN: dozwolone
    const sibling = await post('/api/student/register', {firstName: 'Marcjanna', lastInitial: 'M', pin: '5081', pinRepeat: '5081'});
    assert.equal(sibling.status, 201);

    // konto zalozone samodzielnie dziala w zwyklym logowaniu
    const login = await post('/api/student/login', {firstName: 'marcjanna', lastInitial: 'm', pin: '7392'});
    assert.equal(login.status, 200);
  }finally{
    await new Promise(resolve => server.close(resolve));
    await database.end();
  }
});

/* Rozpoznawanie mowy zyje w app.js, ktory jest kodem przegladarki.
   Wyciagamy z niego dwie czyste funkcje i sprawdzamy je bez DOM. */
function loadSpeechHelpers(){
  const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const pick = name => {
    const start = source.indexOf('function ' + name + '(');
    assert.notEqual(start, -1, 'brak funkcji ' + name);
    let depth = 0, index = source.indexOf('{', start);
    const from = index;
    for(; index < source.length; index++){
      if(source[index] === '{') depth++;
      else if(source[index] === '}'){ depth--; if(depth === 0) break; }
    }
    return source.slice(start, index + 1) + (from ? '' : '');
  };
  const blocked = source.match(/const BLOCKED_WORDS=new Set\(\[[^\]]*\]\);/);
  assert.ok(blocked, 'brak listy zablokowanych słów');
  const equivalents = source.match(/const SPEECH_EQUIVALENTS=Object\.freeze\(\{[\s\S]*?\}\);/);
  assert.ok(equivalents, 'brak bezpiecznych odpowiedników fonetycznych');
  const optionalSentenceWords = source.match(/const OPTIONAL_SENTENCE_WORDS=new Set\(\[[^\]]*\]\);/);
  assert.ok(optionalSentenceWords, 'brak listy opcjonalnych rodzajników w zdaniu');
  const factory = new Function(
    blocked[0] + '\n' + equivalents[0] + '\n' + optionalSentenceWords[0] + '\n' + pick('normalizeSpeech') + '\n' + pick('containsBlockedWord') + '\n' + pick('speechKey') + '\n' + pick('pronunciationMatches') + '\n' + pick('sentenceSpeechTokens') + '\n' + pick('sentencePronunciationMatches') +
    '\nreturn {normalizeSpeech, containsBlockedWord, pronunciationMatches, sentencePronunciationMatches};'
  );
  return factory();
}

test('zgodność wymowy nie zależy już od pewności rozpoznania', () => {
  const {pronunciationMatches} = loadSpeechHelpers();
  // To byl blad z wersji 10.1: "duck" rozpoznane poprawnie, ale odrzucone,
  // bo Chrome zwrocil niska pewnosc. Teraz liczy sie tylko transkrypcja.
  assert.equal(pronunciationMatches('duck', 'duck'), true);
  assert.equal(pronunciationMatches('Duck.', 'duck'), true);
  assert.equal(pronunciationMatches(' DUCK ', 'duck'), true);
  assert.equal(pronunciationMatches('ice cream', 'ice cream'), true);
  assert.equal(pronunciationMatches('B', 'bee'), true);
  assert.equal(pronunciationMatches('be', 'bee'), true);
  assert.equal(pronunciationMatches('the letter B', 'bee'), true);
  assert.equal(pronunciationMatches('a bee', 'bee'), true);
  assert.equal(pronunciationMatches('see', 'sea'), true);
  assert.equal(pronunciationMatches('flour', 'flower'), true);
  assert.equal(pronunciationMatches('bees', 'bee'), false);
  assert.equal(pronunciationMatches('dog', 'duck'), false);
  assert.equal(pronunciationMatches('', 'duck'), false);
});

test('całe zdanie toleruje zapis rozpoznawania, ale nie inną treść', () => {
  const {sentencePronunciationMatches} = loadSpeechHelpers();
  assert.equal(sentencePronunciationMatches("I'm happy", 'I am happy.'), true);
  assert.equal(sentencePronunciationMatches("She's got a dog", 'She has got a dog.'), true);
  assert.equal(sentencePronunciationMatches('I have got cat', 'I have got a cat.'), true,
    'mikrofon może zgubić cichy rodzajnik');
  assert.equal(sentencePronunciationMatches('I have got a dog', 'I have got a cat.'), false);
  assert.equal(sentencePronunciationMatches('Happy I am', 'I am happy.'), false);
  assert.equal(sentencePronunciationMatches('', 'I am happy.'), false);
});

test('wulgaryzmy z rozpoznawania są wyłapywane', () => {
  const {containsBlockedWord} = loadSpeechHelpers();
  // Klasyczny przypadek: dziecko mowi "horse", silnik zwraca wulgaryzm.
  assert.equal(containsBlockedWord('whore'), true);
  assert.equal(containsBlockedWord('Whore!'), true);
  assert.equal(containsBlockedWord('horse'), false);
  assert.equal(containsBlockedWord('duck'), false);
});
