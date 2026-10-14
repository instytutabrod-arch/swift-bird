'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('żaden krytyczny plik nie jest pusty (0 bajtów)', () => {
  // Pusta paczka to najgorszy rodzaj awarii: ZIP jest poprawny, testy logiki
  // przechodzą, a aplikacja ładuje się bez stylów i skryptów. Ten test
  // sprawdza rozmiar KAŻDEGO pliku wymaganego do działania.
  const root=path.join(__dirname,'..');
  const pub=fs.existsSync(path.join(root,'public'))?path.join(root,'public'):root;
  // Każdy skrypt ładowany przez HTML + CSS + manifest + ikony.
  const html=fs.readFileSync(path.join(pub,'index.html'),'utf8');
  const scripts=[...html.matchAll(/src="\.\/([a-z0-9-]+\.js)"/g)].map(m=>m[1]);
  const critical=[...scripts,'index.html','styles.css','manifest.webmanifest','sw.js','icon-192.png','icon-512.png','icon-maskable.png'];
  const empty=[];
  critical.forEach(f=>{
    const p=path.join(pub,f);
    if(!fs.existsSync(p)){ empty.push(f+' (BRAK)'); return; }
    if(fs.statSync(p).size===0) empty.push(f+' (0 bajtów)');
  });
  assert.equal(empty.length,0,'krytyczne pliki puste lub brakujące: '+empty.join(', '));
});
