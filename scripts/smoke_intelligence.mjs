import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

const ROOT=process.cwd();
const PORT=5199;
const CDP_PORT=9222;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const stamp=Date.now();
const TEMP_CONCEPT_NAME=`CI Browser Smoke ${stamp}`;
const TEMP_CONCEPT_SLUG=`ci-browser-smoke-${stamp}`;
const TEMP_HOOK_TEXT=`CI browser smoke hook ${stamp}`;

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
async function waitFor(expression,label,attempts=120){for(let i=0;i<attempts;i++){try{if(await evalJS(expression))return;}catch{}await sleep(150);}const diag=await evalJS(`({body:document.body?.innerText?.slice(0,1800),errors:[...document.querySelectorAll('.ci-error')].map(x=>x.textContent),toasts:[...document.querySelectorAll('.cix-toast')].map(x=>x.textContent)})`).catch(()=>null);throw new Error(`UI smoke timeout: ${label}\n${JSON.stringify(diag)}`);}
async function click(expression,label){const ok=await evalJS(`(()=>{const el=${expression};if(!el)return false;el.click();return true})()`);if(!ok)throw new Error(`Could not click ${label}`);await sleep(140);}
async function closeModal(){await click(`document.querySelector('#cixModalRoot [data-cix-close]')`,'close modal');await waitFor(`!document.querySelector('#cixModalRoot .cix-modal')`,'modal closed');}
async function setValue(selector,value){const ok=await evalJS(`(()=>{const x=document.querySelector(${JSON.stringify(selector)});if(!x)return false;x.focus();x.value=${JSON.stringify(value)};x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));return document.activeElement===x&&x.value===${JSON.stringify(value)}})()`);if(!ok)throw new Error(`Could not edit ${selector}`);}
async function directCleanup(){
  await evalJS(`(async()=>{
    const API='https://naiglzmqpgucfbwfbvxt.supabase.co/functions/v1/creativeos-intelligence';
    const post=async body=>fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(()=>null);
    await post({action:'delete_concept',slug:${JSON.stringify(TEMP_CONCEPT_SLUG)}});
    const snap=window.CreativeOSIntelligence?.getSnapshot?.();
    const hook=(snap?.hooks||[]).find(h=>h.text===${JSON.stringify(TEMP_HOOK_TEXT)});
    if(hook?.id) await post({action:'delete_hook',id:hook.id});
    return true;
  })()`).catch(()=>null);
}

try{
  await cdp('Page.enable');await cdp('Runtime.enable');
  await waitFor(`document.readyState==='complete' || document.readyState==='interactive'`,'document ready');
  await waitFor(`!!window.CreativeOSIntelligence`,'Intelligence core loaded');
  await waitFor(`!!window.CreativeOSIntelligenceCRUD`,'CRUD layer loaded');

  // Open Intelligence and load the real Supabase snapshot.
  await click(`document.querySelector('[data-ci-route="concepts"]')`,'Conceptos+');
  await waitFor(`!!window.CreativeOSIntelligence.getSnapshot?.()`,'Supabase snapshot loaded',180);

  // CONCEPTS: real CREATE -> UPDATE -> DELETE round trip through the UI and Supabase.
  await waitFor(`!!document.querySelector('[data-cix-add="concept"]')`,'add concept button');
  await waitFor(`!!document.querySelector('[data-cix-edit="concept"]')`,'existing concept edit button');
  await click(`document.querySelector('[data-cix-add="concept"]')`,'add concept');
  await waitFor(`!!document.querySelector('#cixModalRoot .cix-modal')`,'new concept modal');
  await setValue('#cixName',TEMP_CONCEPT_NAME);
  await setValue('#cixSlug',TEMP_CONCEPT_SLUG);
  await setValue('#cixDescription','Created by automated browser verification');
  await click(`document.querySelector('#cixModalRoot [data-cix-save="concept"]')`,'save new concept');
  await waitFor(`!document.querySelector('#cixModalRoot .cix-modal')`,'concept modal closes after save',180);
  await waitFor(`window.CreativeOSIntelligence.getSnapshot?.().concepts?.some(c=>c.slug===${JSON.stringify(TEMP_CONCEPT_SLUG)})`,'new concept persisted in Supabase',180);
  await waitFor(`[...document.querySelectorAll('.ci-grid.three > .ci-card.pad h3')].some(x=>x.textContent.trim()===${JSON.stringify(TEMP_CONCEPT_NAME)})`,'new concept rendered');
  await click(`[...document.querySelectorAll('.ci-grid.three > .ci-card.pad')].find(x=>x.querySelector('h3')?.textContent.trim()===${JSON.stringify(TEMP_CONCEPT_NAME)})?.querySelector('[data-cix-edit="concept"]')`,'edit saved concept');
  await waitFor(`!!document.querySelector('#cixDescription')`,'saved concept editor');
  await setValue('#cixDescription','Updated by automated browser verification');
  await click(`document.querySelector('#cixModalRoot [data-cix-save="concept"]')`,'update saved concept');
  await waitFor(`window.CreativeOSIntelligence.getSnapshot?.().concepts?.some(c=>c.slug===${JSON.stringify(TEMP_CONCEPT_SLUG)}&&c.description==='Updated by automated browser verification')`,'concept update persisted',180);
  await click(`[...document.querySelectorAll('.ci-grid.three > .ci-card.pad')].find(x=>x.querySelector('h3')?.textContent.trim()===${JSON.stringify(TEMP_CONCEPT_NAME)})?.querySelector('[data-cix-edit="concept"]')`,'reopen concept for delete');
  await waitFor(`!!document.querySelector('#cixModalRoot [data-cix-delete="concept"]')`,'concept delete button');
  await evalJS(`window.confirm=()=>true;true`);
  await click(`document.querySelector('#cixModalRoot [data-cix-delete="concept"]')`,'delete temporary concept');
  await waitFor(`!window.CreativeOSIntelligence.getSnapshot?.().concepts?.some(c=>c.slug===${JSON.stringify(TEMP_CONCEPT_SLUG)})`,'concept deletion persisted',180);

  // NICHES & HOOKS: switch Running and perform a real Hook CREATE -> DELETE round trip.
  await click(`document.querySelector('[data-ci-route="niches"]')`,'Nichos & Hooks');
  await waitFor(`!!document.querySelector('[data-cix-add="hook"]')`,'add hook button');
  await waitFor(`!!document.querySelector('[data-cix-add="pattern"]')`,'add pattern button');
  await waitFor(`!!document.querySelector('[data-cix-add="niche"]')`,'add niche button');
  await waitFor(`!!document.querySelector('[data-ci-niche="running"]')`,'running niche card');
  await click(`document.querySelector('[data-ci-niche="running"]')`,'running niche card');
  await waitFor(`document.querySelector('[data-ci-niche="running"]')?.classList.contains('active')`,'running niche selected');
  await waitFor(`sessionStorage.getItem('creativeos_ci_niche')==='running'`,'running niche state persisted');
  await click(`document.querySelector('[data-cix-add="hook"]')`,'add hook');
  await waitFor(`!!document.querySelector('#cixText')`,'hook editor');
  await setValue('#cixText',TEMP_HOOK_TEXT);
  await setValue('#cixNiche','running');
  await click(`document.querySelector('#cixModalRoot [data-cix-save="hook"]')`,'save temporary hook');
  await waitFor(`window.CreativeOSIntelligence.getSnapshot?.().hooks?.some(h=>h.text===${JSON.stringify(TEMP_HOOK_TEXT)})`,'hook persisted in Supabase',180);
  await waitFor(`[...document.querySelectorAll('.ci-list-item b')].some(x=>x.textContent.trim()===${JSON.stringify(TEMP_HOOK_TEXT)})`,'saved hook rendered');
  await click(`[...document.querySelectorAll('.ci-list-item')].find(x=>x.querySelector('b')?.textContent.trim()===${JSON.stringify(TEMP_HOOK_TEXT)})?.querySelector('[data-cix-edit="hook"]')`,'edit saved hook');
  await waitFor(`!!document.querySelector('#cixModalRoot [data-cix-delete="hook"]')`,'hook delete control');
  await evalJS(`window.confirm=()=>true;true`);
  await click(`document.querySelector('#cixModalRoot [data-cix-delete="hook"]')`,'delete temporary hook');
  await waitFor(`!window.CreativeOSIntelligence.getSnapshot?.().hooks?.some(h=>h.text===${JSON.stringify(TEMP_HOOK_TEXT)})`,'hook deletion persisted',180);

  // Pattern and niche creation/editors are interactive.
  await click(`document.querySelector('[data-cix-add="pattern"]')`,'add pattern');
  await waitFor(`!!document.querySelector('#cixTemplate')`,'pattern editor');
  await setValue('#cixTemplate','[avatar] + [problem] + [trigger]');
  await closeModal();
  await click(`document.querySelector('[data-cix-add="niche"]')`,'add niche');
  await waitFor(`!!document.querySelector('#cixName')`,'niche creator');
  await setValue('#cixName','Smoke niche');
  await closeModal();
  await waitFor(`!!document.querySelector('[data-ci-niche="running"] [data-cix-edit="niche"]')`,'niche edit button');
  await click(`document.querySelector('[data-ci-niche="running"] [data-cix-edit="niche"]')`,'edit Running niche');
  await waitFor(`!!document.querySelector('#cixModalRoot [data-cix-save="niche"]')`,'niche save control');
  await closeModal();

  // ANGLES: add/edit/delete controls and editable fields.
  await click(`document.querySelector('[data-ci-route="angles"]')`,'Ángulos');
  await waitFor(`!!document.querySelector('[data-cix-add="angle"]')`,'add angle button');
  await waitFor(`!!document.querySelector('[data-cix-edit="angle"]')`,'edit angle button');
  await click(`document.querySelector('[data-cix-add="angle"]')`,'add angle');
  await waitFor(`!!document.querySelector('#cixModalRoot [data-cix-save="angle"]')`,'new angle save');
  await setValue('#cixName','Smoke angle');
  await closeModal();
  await click(`document.querySelector('[data-cix-edit="angle"]')`,'edit angle');
  await waitFor(`!!document.querySelector('#cixModalRoot [data-cix-delete="angle"]')`,'angle delete control');
  await closeModal();

  // AVATARS: add editor exists and accepts text.
  await click(`document.querySelector('[data-ci-route="avatars"]')`,'Avatares');
  await waitFor(`!!document.querySelector('[data-cix-add="avatar"]')`,'add avatar button');
  await click(`document.querySelector('[data-cix-add="avatar"]')`,'add avatar');
  await waitFor(`!!document.querySelector('#cixName')`,'avatar editor');
  await setValue('#cixName','Smoke avatar');
  await closeModal();

  // LEARNINGS: add editor exists and accepts text.
  await click(`document.querySelector('[data-ci-route="learnings"]')`,'Aprendizajes');
  await waitFor(`!!document.querySelector('[data-cix-add="learning"]')`,'add learning button');
  await click(`document.querySelector('[data-cix-add="learning"]')`,'add learning');
  await waitFor(`!!document.querySelector('#cixBody')`,'learning editor');
  await setValue('#cixTitle','Smoke learning');
  await setValue('#cixBody','Editable learning body');
  await closeModal();

  // Renderer that caused the DOM rewrite loop must not be loaded.
  const oldLoaded=await evalJS(`[...document.scripts].some(s=>s.src.includes('/creativeos-intelligence.js'))`);
  if(oldLoaded)throw new Error('Old looping Intelligence renderer is still loaded');

  console.log('CreativeOS Intelligence browser smoke test: PASS — real create/update/delete round trips, typing, niche switching and editors are interactive');
} finally {
  await directCleanup();
  try{ws.close();}catch{}
  proc.kill('SIGKILL');server.close();
}
