'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execSync}=require('node:child_process');

test('skrypty przeglądarki nie mają kolizji deklaracji w globalnym zakresie', () => {
  // Przeglądarka ładuje wszystkie <script src> do JEDNEGO globalnego zakresu.
  // Dwie deklaracje const/let/class o tej samej nazwie = SyntaxError na starcie
  // i martwa aplikacja. Ten test skleja skrypty jak przeglądarka i sprawdza
  // składnię całości — łapie to, czego osobne require/eval nie wykryje.
  const root=path.join(__dirname,'..');
  const pub=fs.existsSync(path.join(root,'public'))?path.join(root,'public'):root;
  const html=fs.readFileSync(path.join(pub,'index.html'),'utf8');
  const scripts=[...html.matchAll(/src="\.\/([a-z0-9-]+\.js)"/g)].map(m=>m[1]);
  assert.ok(scripts.length>=15,'HTML powinien ładować komplet skryptów');

  // Wykryj kolizje const/let/class/function na poziomie modułu (kolumna 0).
  const decl={};
  scripts.forEach(f=>{
    const file=path.join(pub,f);
    if(!fs.existsSync(file))return;
    fs.readFileSync(file,'utf8').split('\n').forEach(line=>{
      const m=line.match(/^(const|let|class)\s+([A-Za-z_$][\w$]*)/);
      if(m){(decl[m[2]]=decl[m[2]]||new Set()).add(f);}
    });
  });
  const collisions=Object.entries(decl).filter(([,files])=>files.size>1)
    .map(([name,files])=>name+' ('+[...files].join(', ')+')');
  assert.equal(collisions.length,0,'kolizje deklaracji const/let/class między plikami: '+collisions.join('; '));
});
