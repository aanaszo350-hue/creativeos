import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

const ROOT=process.cwd();
const PORT=5199;
const CDP_PORT=9222;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  try{
    const raw=(req.url||'/').split('?')[0];
    const rel=raw==='/'?'index.html':decodeURIComponent(raw.replace(/^\//,''));
    const file=normalize(join(ROOT,rel));
    if(!file.startsWith(ROOT)){res.writeHead(403);return res.end('forbidden');}
    const st=await stat(file);
    if(!st.isFile())throw new Error('not file');
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end('not found');}
});
await new Promise((resolve,reject)=>server.listen(PORT,'127.0.0.1',err=>err?reject(err):resolve()));

const chromeCandidates=['google-chrome','google-chrome-stable','chromium','chromium-browser'];
let chrome=null;
for(const cmd of chromeCandidates){
  const p=spawn('sh',['-lc',`command -v ${cmd}`]);
  let out='';p.stdout.on('data',d=>out+=d);await new Promise(r=>p.on('close',r));
  if(out.trim()){chrome=out.trim();break;}
}
if(!chrome){server.close();throw new Error('Chrome/Chromium not found on runner');}

const proc=spawn(chrome,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP_PORT}`,'--remote-allow-origins=*',
  '--user-data-dir=/tmp/creativeos-smoke-chrome','about:blank'
],{stdio:['ignore','ignore','pipe']});
let chromeErr='';proc.stderr.on('data',d=>chromeErr+=d);

async function waitJson(url,attempts=80){
  for(let i=0;i<attempts;i++){
    try{const r=await fetch(url);if(r.ok)return await r.json();}catch{}
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}\n${chromeErr.slice(-1500)}`);
}

const version=await waitJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
const targetResp=await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(`http://localhost:${PORT}/`)}`,{method:'PUT'});
if(!targetResp.ok)throw new Error(`Could not create Chrome target: ${targetResp.status}`);
const target=await targetResp.json();
const ws=new WebSocket(target.webSocketDebuggerUrl||version.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let seq=0;const pending=new Map();
ws.addEventListener('message',ev=>{const msg=JSON.parse(ev.data);if(msg.id&&pending.has(msg.id)){const {resolve,reject}=pending.get(msg.id);pending.delete(msg.id);if(msg.error)reject(new Error(JSON.stringify(msg.error)));else resolve(msg.result);}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error(`CDP timeout: ${method}`));}},10000);});}
async function evalJS(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(`Browser exception: ${r.exceptionDetails.text}`);return r.result?.value;}
async function waitFor(expression,label,attempts=100){for(let i=0;i<attempts;i++){try{if(await evalJS(expression))return;}catch{}await sleep(150);}const diag=await evalJS(`({body:document.body?.innerText?.slice(0,1600),errors:[...document.querySelectorAll('.ci-error')].map(x=>x.textContent)})`).catch(()=>null);throw new Error(`UI smoke timeout: ${label}\n${JSON.stringify(diag)}`);}
async function click(expression,label){const ok=await evalJS(`(()=>{const el=${expression};if(!el)return false;el.click();return true})()`);if(!ok)throw new Error(`Could not click ${label}`);await sleep(120);}
async function closeModal(){await click(`document.querySelector('#cixModalRoot [data-cix-close]')`,'close modal');await waitFor(`!document.querySelector('#cixModalRoot .cix-modal')`,'modal closed');}

try{
  await cdp('Page.enable');await cdp('Runtime.enable');
  await waitFor(`document.readyState==='complete' || document.readyState==='interactive'`,'document ready');
  await waitFor(`!!window.CreativeOSIntelligence`,'Intelligence core loaded');
  await waitFor(`!!window.CreativeOSIntelligenceCRUD`,'CRUD layer loaded');

  // Open Intelligence and load the real Supabase snapshot.
  await click(`document.querySelector('[data-ci-route="concepts"]')`,'Conceptos+');
  await waitFor(`!!window.CreativeOSIntelligence.getSnapshot?.()`,'Supabase snapshot loaded',160);

  // CONCEPTS: add, type, edit, and delete-control confirmation path without deleting real data.
  await waitFor(`!!document.querySelector('[data-cix-add="concept"]')`,'add concept button');
  await waitFor(`!!document.querySelector('[data-cix-edit="concept"]')`,'edit concept button');
  await click(`document.querySelector('[data-cix-add="concept"]')`,'add concept');
  await waitFor(`!!document.querySelector('#cixModalRoot .cix-modal')`,'new concept modal');
  const conceptEditable=await evalJS(`(()=>{const x=document.querySelector('#cixName');if(!x)return false;x.focus();x.value='Browser smoke';x.dispatchEvent(new Event('input',{bubbles:true}));return document.activeElement===x && x.value==='Browser smoke'})()`);
  if(!conceptEditable)throw new Error('Concept modal input is not editable');
  await closeModal();
  await click(`document.querySelector('[data-cix-edit="concept"]')`,'edit existing concept');
  await waitFor(`!!document.querySelector('#cixModalRoot [data-cix-save="concept"]')`,'concept save button');
  await waitFor(`!!document.querySelector('#cixModalRoot [data-cix-delete="concept"]')`,'concept delete button');
  await evalJS(`window.__creativeosDeletePrompt=false;window.confirm=()=>{window.__creativeosDeletePrompt=true;return false;};true`);
  await click(`document.querySelector('#cixModalRoot [data-cix-delete="concept"]')`,'concept delete control');
  await waitFor(`window.__creativeosDeletePrompt===true`,'delete confirmation invoked');
  await waitFor(`!!document.querySelector('#cixModalRoot .cix-modal')`,'delete cancelled without data loss');
  await closeModal();

  // NICHES & HOOKS: all create controls work, Running switches, and niche editor opens.
  await click(`document.querySelector('[data-ci-route="niches"]')`,'Nichos & Hooks');
  await waitFor(`!!document.querySelector('[data-cix-add="hook"]')`,'add hook button');
  await waitFor(`!!document.querySelector('[data-cix-add="pattern"]')`,'add pattern button');
  await waitFor(`!!document.querySelector('[data-cix-add="niche"]')`,'add niche button');
  await click(`document.querySelector('[data-cix-add="hook"]')`,'add hook');
  await waitFor(`!!document.querySelector('#cixText')`,'hook editor');
  const hookEditable=await evalJS(`(()=>{const x=document.querySelector('#cixText');x.focus();x.value='Hook smoke';x.dispatchEvent(new Event('input',{bubbles:true}));return document.activeElement===x&&x.value==='Hook smoke'})()`);
  if(!hookEditable)throw new Error('Hook text is not editable');
  await closeModal();
  await click(`document.querySelector('[data-cix-add="pattern"]')`,'add pattern');
  await waitFor(`!!document.querySelector('#cixTemplate')`,'pattern editor');
  await closeModal();
  await click(`document.querySelector('[data-cix-add="niche"]')`,'add niche');
  await waitFor(`!!document.querySelector('#cixName')`,'niche creator');
  await closeModal();
  await waitFor(`!!document.querySelector('[data-ci-niche="running"]')`,'running niche card');
  await click(`document.querySelector('[data-ci-niche="running"]')`,'running niche card');
  await waitFor(`document.querySelector('[data-ci-niche="running"]')?.classList.contains('active')`,'running niche selected');
  await waitFor(`sessionStorage.getItem('creativeos_ci_niche')==='running'`,'running niche state persisted');
  await waitFor(`!!document.querySelector('[data-ci-niche="running"] [data-cix-edit="niche"]')`,'niche edit button');
  await click(`document.querySelector('[data-ci-niche="running"] [data-cix-edit="niche"]')`,'edit niche');
  await waitFor(`!!document.querySelector('#cixModalRoot [data-cix-save="niche"]')`,'niche save control');
  await closeModal();

  // ANGLES: add + edit + save controls.
  await click(`document.querySelector('[data-ci-route="angles"]')`,'Ángulos');
  await waitFor(`!!document.querySelector('[data-cix-add="angle"]')`,'add angle button');
  await waitFor(`!!document.querySelector('[data-cix-edit="angle"]')`,'edit angle button');
  await click(`document.querySelector('[data-cix-add="angle"]')`,'add angle');
  await waitFor(`!!document.querySelector('#cixModalRoot [data-cix-save="angle"]')`,'new angle save');
  await closeModal();
  await click(`document.querySelector('[data-cix-edit="angle"]')`,'edit angle');
  await waitFor(`!!document.querySelector('#cixModalRoot [data-cix-delete="angle"]')`,'angle delete control');
  await closeModal();

  // AVATARS: add editor exists and accepts text.
  await click(`document.querySelector('[data-ci-route="avatars"]')`,'Avatares');
  await waitFor(`!!document.querySelector('[data-cix-add="avatar"]')`,'add avatar button');
  await click(`document.querySelector('[data-cix-add="avatar"]')`,'add avatar');
  await waitFor(`!!document.querySelector('#cixName')`,'avatar editor');
  await closeModal();

  // LEARNINGS: add editor exists.
  await click(`document.querySelector('[data-ci-route="learnings"]')`,'Aprendizajes');
  await waitFor(`!!document.querySelector('[data-cix-add="learning"]')`,'add learning button');
  await click(`document.querySelector('[data-cix-add="learning"]')`,'add learning');
  await waitFor(`!!document.querySelector('#cixBody')`,'learning editor');
  await closeModal();

  // Renderer that caused the DOM rewrite loop must not be loaded.
  const oldLoaded=await evalJS(`[...document.scripts].some(s=>s.src.includes('/creativeos-intelligence.js'))`);
  if(oldLoaded)throw new Error('Old looping Intelligence renderer is still loaded');

  console.log('CreativeOS Intelligence browser smoke test: PASS — add/edit/delete controls, typing, niche switching and modals are interactive');
} finally {
  try{ws.close();}catch{}
  proc.kill('SIGKILL');server.close();
}
