'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {promisify} = require('node:util');
const {Pool} = require('pg');

const scrypt = promisify(crypto.scrypt);
const PORT = Number(process.env.PORT) || 8080;
const DATABASE_URL = process.env.DATABASE_URL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MAX_BODY = 32*1024;
const SESSION_COOKIE = 'swift_bird_session';
const SECTION_IDS = [
  'animals-home','animals-wild','animals-water-air','fruit','food','kitchen','home','things','body','clothes',
  'nature','school','people','places','transport','actions-one','actions-two','actions-three','feelings',
  'colours-shapes','time','sports','descriptions','directions','technology'
];

const SELF_REGISTRATION = String(process.env.ALLOW_SELF_REGISTRATION||'1')!=='0';

let pool = DATABASE_URL ? new Pool({connectionString:DATABASE_URL,max:10,idleTimeoutMillis:30000}) : null;
let databaseReady = false;

async function initializeDatabase(database=pool){
  if(!database) throw new Error('Brak zmiennej DATABASE_URL. Połącz usługę z PostgreSQL.');
  await database.query(`
    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY,
      first_name TEXT NOT NULL,
      first_name_normalized TEXT NOT NULL,
      last_initial TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_active TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS students_login_idx
      ON students(first_name_normalized,last_initial) WHERE active=TRUE;
    CREATE TABLE IF NOT EXISTS student_progress (
      student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
      state JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('student','admin')),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
  `);
  if(database===pool)databaseReady=true;
}

function useDatabaseForTests(database){
  if(require.main===module)throw new Error('Testowa baza nie może zastąpić bazy uruchomionej aplikacji.');
  pool=database;databaseReady=true;
}

function normalizeName(value){return String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pl-PL');}
function cleanFirstName(value){return String(value||'').trim().replace(/\s+/g,' ');}
function cleanInitial(value){return String(value||'').trim().slice(0,1).toLocaleUpperCase('pl-PL');}
function validFirstName(value){return /^\p{L}[\p{L} '\-]{0,39}$/u.test(value);}
function validInitial(value){return /^\p{L}$/u.test(value);}
function validPin(value){return /^\d{4}$/.test(String(value||''));}
const WEAK_PINS=new Set(['0000','1111','2222','3333','4444','5555','6666','7777','8888','9999','1234','4321','1212','2121','0123','9876']);
function generatePin(){return String(crypto.randomInt(1000,10000));}
function tokenHash(token){return crypto.createHash('sha256').update(token).digest('hex');}
function randomToken(){return crypto.randomBytes(32).toString('base64url');}

async function hashSecret(secret){
  const salt=crypto.randomBytes(16);
  const derived=await scrypt(String(secret),salt,64);
  return salt.toString('hex')+':'+Buffer.from(derived).toString('hex');
}
async function verifySecret(secret,stored){
  try{
    const [saltHex,hashHex]=String(stored).split(':');
    const expected=Buffer.from(hashHex,'hex');
    const actual=Buffer.from(await scrypt(String(secret),Buffer.from(saltHex,'hex'),expected.length));
    return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);
  }catch(error){return false;}
}
function safeEqual(left,right){
  const a=crypto.createHash('sha256').update(String(left)).digest();
  const b=crypto.createHash('sha256').update(String(right)).digest();
  return crypto.timingSafeEqual(a,b);
}

function parseCookies(request){
  return Object.fromEntries(String(request.headers.cookie||'').split(';').map(part=>part.trim()).filter(Boolean).map(part=>{
    const index=part.indexOf('=');
    return index<0?[part,'']:[part.slice(0,index),decodeURIComponent(part.slice(index+1))];
  }));
}
function sessionCookie(token,maxAge){
  return SESSION_COOKIE+'='+encodeURIComponent(token)+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+maxAge+(IS_PRODUCTION?'; Secure':'');
}
function clearSessionCookie(){return SESSION_COOKIE+'=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+(IS_PRODUCTION?'; Secure':'');}

function securityHeaders(contentType){
  const headers={
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY',
    'Permissions-Policy':'camera=(), geolocation=(), microphone=(self)',
    'Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  };
  if(IS_PRODUCTION)headers['Strict-Transport-Security']='max-age=31536000; includeSubDomains';
  if(contentType)headers['Content-Type']=contentType;
  return headers;
}
function json(response,status,data,extra={}){
  response.writeHead(status,{...securityHeaders('application/json; charset=utf-8'),'Cache-Control':'no-store',...extra});
  response.end(JSON.stringify(data));
}
function noContent(response,extra={}){response.writeHead(204,{...securityHeaders(),...extra});response.end();}

async function readJson(request){
  return new Promise((resolve,reject)=>{
    let size=0,body='';
    request.setEncoding('utf8');
    request.on('data',chunk=>{size+=Buffer.byteLength(chunk);if(size>MAX_BODY){reject(Object.assign(new Error('Za duże żądanie.'),{status:413}));request.destroy();return;}body+=chunk;});
    request.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch(error){reject(Object.assign(new Error('Nieprawidłowe dane.'),{status:400}));}});
    request.on('error',reject);
  });
}

async function getSession(request){
  if(!databaseReady)return null;
  const token=parseCookies(request)[SESSION_COOKIE];
  if(!token)return null;
  const result=await pool.query(`
    SELECT se.role,se.student_id,st.first_name,st.last_initial,st.active
    FROM sessions se LEFT JOIN students st ON st.id=se.student_id
    WHERE se.token_hash=$1 AND se.expires_at>NOW()
  `,[tokenHash(token)]);
  const row=result.rows[0];
  if(!row||(row.role==='student'&&!row.active))return null;
  return {role:row.role,studentId:row.student_id,firstName:row.first_name,lastInitial:row.last_initial};
}

async function createSession(role,studentId){
  const token=randomToken();
  // Krótsze sesje ograniczają ryzyko pozostawienia otwartego konta na wspólnym tablecie.
  const seconds=role==='admin'?2*60*60:12*60*60;
  const expiresAt=new Date(Date.now()+seconds*1000);
  await pool.query('INSERT INTO sessions(token_hash,role,student_id,expires_at) VALUES($1,$2,$3,$4)',[tokenHash(token),role,studentId,expiresAt]);
  return {token,seconds};
}

function publicUser(session){
  if(session.role==='admin')return {role:'admin',displayName:'Administrator'};
  return {role:'student',id:session.studentId,firstName:session.firstName,lastInitial:session.lastInitial,displayName:session.firstName+' '+session.lastInitial+'.'};
}

const attempts=new Map();
function clientAddress(request){
  // Naglowek x-forwarded-for jest ustawiany przez klienta, a serwer posredniczacy
  // tylko DOPISUJE na koncu prawdziwy adres. Pierwsza wartosc jest wiec do
  // podrobienia i pozwalala obchodzic limit prob. Bierzemy ostatnia.
  const chain=String(request.headers['x-forwarded-for']||'').split(',').map(part=>part.trim()).filter(Boolean);
  return chain.length?chain[chain.length-1]:(request.socket.remoteAddress||'unknown');
}
function attemptKey(request,suffix){
  return clientAddress(request)+':'+suffix;
}
function allowAttempt(key){
  const now=Date.now();const current=attempts.get(key);
  if(!current||current.reset<now){attempts.set(key,{count:1,reset:now+15*60*1000});return true;}
  current.count++;return current.count<=5;
}
function clearAttempts(key){attempts.delete(key);}

function clampNumber(value,low,high,fallback){
  const number=Number(value);
  return Number.isFinite(number)?Math.max(low,Math.min(high,number)):fallback;
}
function clampCount(value,high){
  return Math.max(0,Math.min(high,Math.round(Number(value)||0)));
}
/* Wspólny kształt powtórek: używa go M1 (słowa), M2 (wzorce) i M5 (błędy). */
function sanitizeCardMap(raw,limit){
  const out={};
  Object.entries(raw&&typeof raw==='object'?raw:{}).slice(0,limit).forEach(([id,value])=>{
    if(typeof id!=='string'||id.length>120||!value||typeof value!=='object')return;
    out[id]={
      i:clampCount(value.i,365),
      e:clampNumber(value.e,1.3,2.6,2.2),
      d:Math.max(0,Number(value.d)||0),
      r:clampCount(value.r,10000),
      ok:clampCount(value.ok,100000),
      bad:clampCount(value.bad,100000)
    };
  });
  return out;
}
function sanitizeDoneMap(raw,limit){
  const out={};
  Object.entries(raw&&typeof raw==='object'?raw:{}).slice(0,limit).forEach(([id,value])=>{
    if(typeof id!=='string'||id.length>120||!value||typeof value!=='object')return;
    out[id]={done:clampCount(value.done,10000),ok:clampCount(value.ok,10000)};
  });
  return out;
}
function sanitizeProgress(input){
  const raw=input&&typeof input==='object'?input:{};
  const state={schema:3,cards:{},streak:0,lastDay:null,sessions:0,passedExams:[],
    patterns:{},errorCards:{},stories:{},dialogues:{},
    mistakes:[],feathers:0,badges:[],stages:0};
  state.streak=clampCount(raw.streak,10000);
  state.sessions=clampCount(raw.sessions,100000);
  state.stages=clampCount(raw.stages,1000000);
  state.feathers=clampCount(raw.feathers,1000000);
  state.lastDay=typeof raw.lastDay==='string'?raw.lastDay.slice(0,10):null;
  state.cards=sanitizeCardMap(raw.cards,500);
  state.patterns=sanitizeCardMap(raw.patterns,200);
  state.errorCards=sanitizeCardMap(raw.errorCards,200);
  state.stories=sanitizeDoneMap(raw.stories,100);
  state.dialogues=sanitizeDoneMap(raw.dialogues,100);
  const passed=Array.isArray(raw.passedExams)?raw.passedExams:[];
  state.passedExams=SECTION_IDS.filter(id=>passed.includes(id));
  const badges=Array.isArray(raw.badges)?raw.badges:[];
  state.badges=badges.filter(id=>typeof id==='string'&&id.length<=40).slice(0,40);
  /* Rejestr błędów zasila M5. Trzymamy tylko ostatnie 60 i tylko pola,
     których moduł faktycznie używa. */
  const mistakes=Array.isArray(raw.mistakes)?raw.mistakes.slice(-60):[];
  state.mistakes=mistakes.filter(item=>item&&typeof item==='object').map(item=>({
    kind:String(item.kind||'').slice(0,20),
    ref:String(item.ref||'').slice(0,120),
    at:Math.max(0,Number(item.at)||0)
  }));
  return state;
}

const STATIC_FILES={
  '/':'index.html','/index.html':'index.html','/app.js':'app.js','/words.js':'words.js','/styles.css':'styles.css',
  '/patterns.js':'patterns.js','/stories.js':'stories.js','/dialogues.js':'dialogues.js',
  '/errors.js':'errors.js','/journey.js':'journey.js',
  '/sw.js':'sw.js','/manifest.webmanifest':'manifest.webmanifest','/icon-192.png':'icon-192.png',
  '/icon-512.png':'icon-512.png','/icon-maskable.png':'icon-maskable.png'
};
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png'};
const STATIC_ROOT=fs.existsSync(path.join(__dirname,'public'))?path.join(__dirname,'public'):__dirname;
function serveStatic(request,response,pathname){
  const filename=STATIC_FILES[pathname];if(!filename)return false;
  const full=path.join(STATIC_ROOT,filename);
  fs.stat(full,(error,stat)=>{
    if(error||!stat.isFile())return json(response,404,{error:'Nie znaleziono pliku.'});
    const type=MIME[path.extname(filename)]||'application/octet-stream';
    const cache=filename.startsWith('icon-')?'public, max-age=604800':'no-cache, must-revalidate';
    response.writeHead(200,{...securityHeaders(type),'Cache-Control':cache,'Content-Length':stat.size});
    if(request.method==='HEAD')return response.end();
    fs.createReadStream(full).pipe(response);
  });
  return true;
}

async function requireRole(request,response,role){
  const session=await getSession(request);
  if(!session||session.role!==role){json(response,401,{error:'Sesja wygasła. Zaloguj się ponownie.'});return null;}
  return session;
}

async function handleApi(request,response,pathname){
  if(!databaseReady){
    const message=!pool?'Brak konfiguracji bazy danych. Administrator musi ustawić DATABASE_URL.':'Baza danych jest chwilowo niedostępna.';
    return json(response,503,{error:message});
  }
  if(pathname==='/api/health'&&request.method==='GET'){
    await pool.query('SELECT 1');return json(response,200,{ok:true});
  }
  if(pathname==='/api/me'&&request.method==='GET'){
    const session=await getSession(request);return session?json(response,200,{user:publicUser(session)}):json(response,401,{error:'Zaloguj się.'});
  }
  if(pathname==='/api/student/login'&&request.method==='POST'){
    const body=await readJson(request);const firstName=cleanFirstName(body.firstName);const initial=cleanInitial(body.lastInitial);const pin=String(body.pin||'');
    if(!validFirstName(firstName)||!validInitial(initial)||!validPin(pin))return json(response,400,{error:'Sprawdź imię, literę nazwiska i 4-cyfrowy PIN.'});
    const key=attemptKey(request,'student:'+normalizeName(firstName)+':'+initial);
    if(!allowAttempt(key))return json(response,429,{error:'Za dużo prób. Spróbuj ponownie za 15 minut.'});
    const candidates=await pool.query('SELECT id,first_name,last_initial,pin_hash FROM students WHERE first_name_normalized=$1 AND last_initial=$2 AND active=TRUE',[normalizeName(firstName),initial]);
    let student=null;
    for(const candidate of candidates.rows){if(await verifySecret(pin,candidate.pin_hash)){student=candidate;break;}}
    if(!student)return json(response,401,{error:'Nieprawidłowe dane lub PIN.'});
    clearAttempts(key);await pool.query('UPDATE students SET last_active=NOW() WHERE id=$1',[student.id]);
    const created=await createSession('student',student.id);
    return json(response,200,{user:{role:'student',id:student.id,firstName:student.first_name,lastInitial:student.last_initial,displayName:student.first_name+' '+student.last_initial+'.'}},{'Set-Cookie':sessionCookie(created.token,created.seconds)});
  }
  if(pathname==='/api/config'&&request.method==='GET'){
    return json(response,200,{selfRegistration:SELF_REGISTRATION});
  }
  if(pathname==='/api/student/register'&&request.method==='POST'){
    if(!SELF_REGISTRATION)return json(response,403,{error:'Samodzielne zakładanie konta jest wyłączone.'});
    const key=attemptKey(request,'register');
    if(!allowAttempt(key))return json(response,429,{error:'Za dużo prób. Spróbuj ponownie za 15 minut.'});
    const body=await readJson(request);
    const firstName=cleanFirstName(body.firstName);const initial=cleanInitial(body.lastInitial);
    const pin=String(body.pin||'');const repeat=String(body.pinRepeat||'');
    if(!validFirstName(firstName)||!validInitial(initial))return json(response,400,{error:'Podaj poprawne imię i jedną literę nazwiska.'});
    if(!validPin(pin))return json(response,400,{error:'PIN musi mieć dokładnie 4 cyfry.'});
    if(pin!==repeat)return json(response,400,{error:'Oba PIN-y muszą być takie same.'});
    if(WEAK_PINS.has(pin))return json(response,400,{error:'Ten PIN jest za łatwy. Wybierz inny.'});
    // Dwoje dzieci moze miec to samo imie i inicjal, ale nie ten sam PIN,
    // bo logowanie nie mialoby wtedy jak ich rozroznic.
    const existing=await pool.query('SELECT pin_hash FROM students WHERE first_name_normalized=$1 AND last_initial=$2 AND active=TRUE',[normalizeName(firstName),initial]);
    for(const row of existing.rows){
      if(await verifySecret(pin,row.pin_hash))return json(response,409,{error:'Takie konto już istnieje. Zaloguj się albo wybierz inny PIN.'});
    }
    const pinHash=await hashSecret(pin);const id=crypto.randomUUID();
    await pool.query('INSERT INTO students(id,first_name,first_name_normalized,last_initial,pin_hash) VALUES($1,$2,$3,$4,$5)',[id,firstName,normalizeName(firstName),initial,pinHash]);
    clearAttempts(key);
    const created=await createSession('student',id);
    return json(response,201,{user:{role:'student',id,firstName,lastInitial:initial,displayName:firstName+' '+initial+'.'}},{'Set-Cookie':sessionCookie(created.token,created.seconds)});
  }
  if(pathname==='/api/admin/login'&&request.method==='POST'){
    if(ADMIN_PASSWORD.length<12)return json(response,503,{error:'Administrator nie ma jeszcze ustawionego bezpiecznego hasła.'});
    const key=attemptKey(request,'admin');if(!allowAttempt(key))return json(response,429,{error:'Za dużo prób. Spróbuj ponownie za 15 minut.'});
    const body=await readJson(request);
    if(!safeEqual(body.password||'',ADMIN_PASSWORD))return json(response,401,{error:'Nieprawidłowe hasło administratora.'});
    clearAttempts(key);const created=await createSession('admin',null);
    return json(response,200,{user:{role:'admin',displayName:'Administrator'}},{'Set-Cookie':sessionCookie(created.token,created.seconds)});
  }
  if(pathname==='/api/logout'&&request.method==='POST'){
    const token=parseCookies(request)[SESSION_COOKIE];if(token)await pool.query('DELETE FROM sessions WHERE token_hash=$1',[tokenHash(token)]);
    return noContent(response,{'Set-Cookie':clearSessionCookie()});
  }
  if(pathname==='/api/progress'&&request.method==='GET'){
    const session=await requireRole(request,response,'student');if(!session)return;
    const result=await pool.query('SELECT state FROM student_progress WHERE student_id=$1',[session.studentId]);
    return json(response,200,{state:result.rows[0]?result.rows[0].state:{}});
  }
  if(pathname==='/api/progress'&&request.method==='PUT'){
    const session=await requireRole(request,response,'student');if(!session)return;
    const body=await readJson(request);const state=sanitizeProgress(body.state);
    await pool.query(`INSERT INTO student_progress(student_id,state,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(student_id) DO UPDATE SET state=EXCLUDED.state,updated_at=NOW()`,[session.studentId,state]);
    await pool.query('UPDATE students SET last_active=NOW() WHERE id=$1',[session.studentId]);
    return json(response,200,{ok:true});
  }
  if(pathname==='/api/admin/students'&&request.method==='GET'){
    const session=await requireRole(request,response,'admin');if(!session)return;
    const result=await pool.query(`SELECT st.id,st.first_name,st.last_initial,st.created_at,st.last_active,COALESCE(pr.state,'{}'::jsonb) AS state,pr.updated_at FROM students st LEFT JOIN student_progress pr ON pr.student_id=st.id WHERE st.active=TRUE ORDER BY st.first_name_normalized,st.last_initial,st.created_at`);
    const students=result.rows.map(row=>{
      const state=sanitizeProgress(row.state);const words=Math.min(500,Object.keys(state.cards).length);const exams=state.passedExams.length;
      const sentences=Math.min(70,Object.values(state.patterns).filter(item=>item&&item.ok>0).length);
      return {id:row.id,displayName:row.first_name+' '+row.last_initial+'.',wordsCollected:words,sentencesCompleted:sentences,examsPassed:exams,currentSection:Math.min(25,exams+1),lastActive:row.last_active||row.updated_at||row.created_at};
    });
    return json(response,200,{students});
  }
  if(pathname==='/api/admin/students'&&request.method==='POST'){
    const session=await requireRole(request,response,'admin');if(!session)return;
    const body=await readJson(request);const firstName=cleanFirstName(body.firstName);const initial=cleanInitial(body.lastInitial);
    if(!validFirstName(firstName)||!validInitial(initial))return json(response,400,{error:'Podaj poprawne imię i jedną literę nazwiska.'});
    const pin=generatePin();const pinHash=await hashSecret(pin);const id=crypto.randomUUID();
    await pool.query('INSERT INTO students(id,first_name,first_name_normalized,last_initial,pin_hash) VALUES($1,$2,$3,$4,$5)',[id,firstName,normalizeName(firstName),initial,pinHash]);
    return json(response,201,{student:{id,displayName:firstName+' '+initial+'.',pin}});
  }
  const reset=pathname.match(/^\/api\/admin\/students\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/reset-pin$/i);
  if(reset&&request.method==='POST'){
    const session=await requireRole(request,response,'admin');if(!session)return;
    const pin=generatePin();const pinHash=await hashSecret(pin);
    const result=await pool.query('UPDATE students SET pin_hash=$1 WHERE id=$2 AND active=TRUE RETURNING id,first_name,last_initial',[pinHash,reset[1]]);
    if(!result.rows[0])return json(response,404,{error:'Nie znaleziono ucznia.'});
    await pool.query("DELETE FROM sessions WHERE student_id=$1 AND role='student'",[reset[1]]);
    const student=result.rows[0];return json(response,200,{student:{id:student.id,displayName:student.first_name+' '+student.last_initial+'.',pin}});
  }
  return json(response,404,{error:'Nie znaleziono.'});
}

const server=http.createServer(async(request,response)=>{
  try{
    const url=new URL(request.url,'http://localhost');const pathname=decodeURIComponent(url.pathname);
    if(pathname.startsWith('/api/'))return await handleApi(request,response,pathname);
    if((request.method==='GET'||request.method==='HEAD')&&serveStatic(request,response,pathname))return;
    json(response,404,{error:'Nie znaleziono.'});
  }catch(error){
    console.error('[request]',error);
    if(!response.headersSent)json(response,error.status||500,{error:error.status?error.message:'Wystąpił błąd serwera.'});
    else response.end();
  }
});

if(require.main===module){
  initializeDatabase().catch(error=>{
    console.error('[setup]',error.message);
  });
  server.listen(PORT,'0.0.0.0',()=>console.log('Swift-bird listening on port '+PORT));
  setInterval(()=>{if(databaseReady)pool.query('DELETE FROM sessions WHERE expires_at<=NOW()').catch(()=>{});},60*60*1000).unref();
  let stopping=false;
  const shutdown=()=>{
    if(stopping)return;stopping=true;
    const timeout=setTimeout(()=>process.exit(1),10000);timeout.unref();
    server.close(async()=>{
      try{if(pool)await pool.end();}catch(error){}
      clearTimeout(timeout);process.exit(0);
    });
  };
  process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
}

module.exports={server,initializeDatabase,useDatabaseForTests,normalizeName,cleanFirstName,cleanInitial,validFirstName,validInitial,validPin,sanitizeProgress,hashSecret,verifySecret,safeEqual,clientAddress,WEAK_PINS};
