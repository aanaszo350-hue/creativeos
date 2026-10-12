import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

const ROOT=process.cwd(), PORT=5199, CDP_PORT=9222;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  try{
    const raw=(req.url||'/').split('?')[0],rel=raw==='/'?'index.html':decodeURIComponent(raw.replace(/^\//,''));
    const file=normalize(join(ROOT,rel));if(!file.startsWith(ROOT)){res.writeHead(403);return res.end('forbidden');}
    const st=await stat(file);if(!st.isFile())throw new Error('not file');
    const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end('not found');}
});
await new Promise((resolve,reject)=>server.listen(PORT,'127.0.0.1',err=>err?reject(err):resolve()));

let chrome=null;
for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
  const p=spawn('sh',['-lc',`command -v ${cmd}`]);let out='';p.stdout.on('data',d=>out+=d);await new Promise(r=>p.on('close',r));
  if(out.trim()){chrome=out.trim();break;}
}
if(!chrome){server.close();throw new Error('Chrome/Chromium not found');}
const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',`--remote-debugging-port=${CDP_PORT}`,'--remote-allow-origins=*','--user-data-dir=/tmp/creativeos-v3b-smoke','about:blank'],{stdio:['ignore','ignore','pipe']});
let chromeErr='';proc.stderr.on('data',d=>chromeErr+=d);
async function waitJson(url,attempts=80){for(let i=0;i<attempts;i++){try{const r=await fetch(url);if(r.ok)return await r.json();}catch{}await sleep(250);}throw new Error(`Timed out ${url}\n${chromeErr.slice(-1200)}`);}
const version=await waitJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
const tr=await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(`http://localhost:${PORT}/`)}`,{method:'PUT'});if(!tr.ok)throw new Error('Could not create target');
const target=await tr.json(),ws=new WebSocket(target.webSocketDebuggerUrl||version.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let seq=0;const pending=new Map();
ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error(`CDP timeout ${method}`));}},10000);});}
async function evalJS(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails){const desc=r.exceptionDetails.exception?.description||r.exceptionDetails.text;throw new Error(`Browser exception: ${desc}`);}return r.result?.value;}
async function waitFor(expression,label,attempts=120){for(let i=0;i<attempts;i++){try{if(await evalJS(expression))return;}catch{}await sleep(150);}const diag=await evalJS(`({body:document.body?.innerText?.slice(0,2200),view:document.querySelector('#ciHost')?.dataset?.ciView})`).catch(()=>null);throw new Error(`UI timeout: ${label}\n${JSON.stringify(diag)}`);}
async function click(expression,label){const ok=await evalJS(`(()=>{const el=${expression};if(!el)return false;el.click();return true})()`);if(!ok)throw new Error(`Could not click ${label}`);await sleep(150);}

try{
  await cdp('Page.enable');await cdp('Runtime.enable');
  await waitFor(`document.readyState==='complete'||document.readyState==='interactive'`,'document ready');
  await waitFor(`window.CreativeOSIntelligence?.version==='3.0'`,'v3 core loaded');
  await waitFor(`!!window.CreativeOSIntelligenceCRUD`,'CRUD loaded');

  await click(`document.querySelector('[data-ci-route="testing"]')`,'Testing IA');
  await waitFor(`document.querySelectorAll('[data-ci-test-product]').length===3`,'three active products');
  const overview=await evalJS(`JSON.stringify(Array.from(document.querySelectorAll('[data-ci-test-product]'),x=>x.innerText))`);
  if(!overview.includes('StrideShield')||!overview.includes('Día 12'))throw new Error('StrideShield day 12 missing');
  if(!overview.includes('auriculares camara')||!overview.includes('Día 1'))throw new Error('Camera headphones day 1 missing');
  if(!overview.includes('Wildflower Press')||!overview.includes('Día 2'))throw new Error('Flower press day 2 missing');

  await click(`document.querySelector('[data-ci-test-product="strideshield"]')`,'StrideShield card');
  await waitFor(`!!document.querySelector('.ci-workflow-shell')`,'workflow lab');
  await waitFor(`document.querySelectorAll('[data-ci-workflow]').length>=3`,'seeded StrideShield workflows');
  await waitFor(`!!document.querySelector('[data-ci-add-node="avatar"]')`,'workflow palette');

  await click(`document.querySelector('[data-ci-new-workflow="strideshield"]')`,'new workflow');
  await waitFor(`!!document.querySelector('#ciWorkflowName')`,'workflow editor');
  const edited=await evalJS(`(()=>{const n=document.querySelector('#ciWorkflowName');n.value='CI Smoke Workflow';n.dispatchEvent(new Event('input',{bubbles:true}));return n.value==='CI Smoke Workflow'})()`);
  if(!edited)throw new Error('Workflow name is not editable');
  await click(`document.querySelector('[data-ci-add-node="concept"]')`,'add concept node');
  await waitFor(`document.querySelectorAll('.ci-wf-node').length===1`,'concept node added');
  await evalJS(`(()=>{const t=document.querySelector('.ci-wf-node-value');t.value='Temporary smoke concept';t.dispatchEvent(new Event('input',{bubbles:true}));return t.value})()`);
  await click(`document.querySelector('[data-ci-save-workflow]')`,'save workflow');
  await waitFor(`document.body.innerText.includes('Workflow guardado')`,'workflow saved');
  await waitFor(`Array.from(document.querySelectorAll('[data-ci-workflow]')).some(x=>x.innerText.includes('CI Smoke Workflow'))`,'saved workflow listed');
  const wfPersisted=await evalJS(`window.CreativeOSIntelligence.getSnapshot().workflows.some(w=>w.name==='CI Smoke Workflow')`);
  if(!wfPersisted)throw new Error('Workflow did not persist to Supabase');

  await click(`Array.from(document.querySelectorAll('[data-ci-workflow]')).find(x=>x.innerText.includes('CI Smoke Workflow'))`,'temp workflow');
  await evalJS(`window.confirm=()=>true;true`);
  await click(`document.querySelector('[data-ci-delete-workflow]')`,'delete temp workflow');
  await waitFor(`!window.CreativeOSIntelligence.getSnapshot().workflows.some(w=>w.name==='CI Smoke Workflow')`,'workflow deleted');

  await evalJS(`(()=>{document.querySelector('#ciLogDate').value='2099-12-31';document.querySelector('#ciLogVideos').value='2';document.querySelector('#ciLogViews').value='4321';document.querySelector('#ciLogBest').value='3000';document.querySelector('#ciLogSales').value='1';document.querySelector('#ciLogNotes').value='CI smoke';return true})()`);
  await click(`document.querySelector('[data-ci-save-log="strideshield"]')`,'save daily batch');
  await waitFor(`window.CreativeOSIntelligence.getSnapshot().dailyLogs.some(l=>l.product_id==='strideshield'&&l.log_date==='2099-12-31')`,'daily batch persisted');
  await waitFor(`Array.from(document.querySelectorAll('.ci-log-row')).some(x=>x.innerText.includes('2099-12-31'))`,'daily batch rendered');
  await click(`Array.from(document.querySelectorAll('.ci-log-row')).find(x=>x.innerText.includes('2099-12-31')).querySelector('[data-ci-delete-log]')`,'delete daily batch');
  await waitFor(`!window.CreativeOSIntelligence.getSnapshot().dailyLogs.some(l=>l.product_id==='strideshield'&&l.log_date==='2099-12-31')`,'daily batch deleted');

  await click(`document.querySelector('[data-ci-route="concepts"]')`,'Conceptos+');
  await waitFor(`!!document.querySelector('[data-cix-add="concept"]')`,'concept add control');
  await waitFor(`!!document.querySelector('[data-cix-edit="concept"]')`,'concept edit control');
  await click(`document.querySelector('[data-cix-add="concept"]')`,'new concept modal');
  await waitFor(`!!document.querySelector('#cixName')`,'concept input');
  const conceptTyping=await evalJS(`(()=>{const x=document.querySelector('#cixName');x.value='Smoke typing';x.dispatchEvent(new Event('input',{bubbles:true}));return x.value==='Smoke typing'})()`);
  if(!conceptTyping)throw new Error('Concept input not editable');
  await click(`document.querySelector('#cixModalRoot [data-cix-close]')`,'close concept modal');

  await click(`document.querySelector('[data-ci-route="niches"]')`,'Nichos & Hooks');
  await waitFor(`!!document.querySelector('[data-ci-niche="running"]')`,'running niche');
  await click(`document.querySelector('[data-ci-niche="running"]')`,'running niche');
  await waitFor(`document.querySelector('[data-ci-niche="running"]')?.classList.contains('active')`,'running selected');
  await waitFor(`document.body.innerText.includes('Testeado por ti')||document.body.innerText.includes('Guardado / en test')`,'source labels');

  const oldLoaded=await evalJS(`Array.from(document.scripts).some(s=>s.src.includes('creativeos-intelligence-core-v2.js')||s.src.includes('/creativeos-intelligence.js'))`);
  if(oldLoaded)throw new Error('Old Intelligence renderer still loaded');

  console.log('CreativeOS Intelligence v3 smoke: PASS — products, workflows, batch logging, CRUD and niche sources are interactive and persisted');
} finally {
  try{ws.close();}catch{}
  proc.kill('SIGKILL');server.close();
}
