import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

const ROOT=process.cwd(), PORT=5199, CDP_PORT=9225;
const API='https://naiglzmqpgucfbwfbvxt.supabase.co/functions/v1/creativeos-winner-lab';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const raw=(req.url||'/').split('?')[0],rel=raw==='/'?'index.html':decodeURIComponent(raw.replace(/^\//,''));const file=normalize(join(ROOT,rel));if(!file.startsWith(ROOT)){res.writeHead(403);return res.end('forbidden');}const st=await stat(file);if(!st.isFile())throw 0;const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('not found');}});
await new Promise((resolve,reject)=>server.listen(PORT,'127.0.0.1',err=>err?reject(err):resolve()));

let chrome=null;for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const p=spawn('sh',['-lc',`command -v ${cmd}`]);let out='';p.stdout.on('data',d=>out+=d);await new Promise(r=>p.on('close',r));if(out.trim()){chrome=out.trim();break;}}
if(!chrome){server.close();throw new Error('Chrome/Chromium not found');}
const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${CDP_PORT}`,'--remote-allow-origins=*','--user-data-dir=/tmp/creativeos-winner-smoke','about:blank'],{stdio:['ignore','ignore','pipe']});
let chromeErr='';proc.stderr.on('data',d=>chromeErr+=d);
async function waitJson(url,attempts=240){for(let i=0;i<attempts;i++){try{const r=await fetch(url);if(r.ok)return await r.json();}catch{}await sleep(250);}throw new Error(`Timed out ${url}\n${chromeErr.slice(-1000)}`);}
const version=await waitJson(`http://127.0.0.1:${CDP_PORT}/json/version`);const tr=await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(`http://localhost:${PORT}/`)}`,{method:'PUT'});if(!tr.ok)throw new Error('Could not create target');const target=await tr.json(),ws=new WebSocket(target.webSocketDebuggerUrl||version.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});let seq=0;const pending=new Map();ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error(`CDP timeout ${method}`));}},10000);});}
async function evalJS(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails){const desc=r.exceptionDetails.exception?.description||r.exceptionDetails.text;throw new Error(`Browser exception: ${desc}`);}return r.result?.value;}
async function waitFor(expression,label,attempts=150){for(let i=0;i<attempts;i++){try{if(await evalJS(expression))return;}catch{}await sleep(160);}const diag=await evalJS(`({body:document.body?.innerText?.slice(0,3000),view:document.querySelector('#ciHost')?.dataset?.ciView,modal:!!document.querySelector('#ciwModalRoot'),matrix:!!document.querySelector('#cimxModalRoot')})`).catch(()=>null);throw new Error(`UI timeout: ${label}\n${JSON.stringify(diag)}`);}
async function click(expression,label){const ok=await evalJS(`(()=>{const el=${expression};if(!el)return false;el.click();return true})()`);if(!ok)throw new Error(`Could not click ${label}`);await sleep(180);}
async function setValue(sel,value){const ok=await evalJS(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)return false;el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);if(!ok)throw new Error(`Could not set ${sel}`);}
async function api(body){const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Origin':`http://localhost:${PORT}`},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw new Error(`API cleanup failed ${r.status} ${JSON.stringify(d)}`);return d.data;}

let rootId=null,childId=null;
try{
  await cdp('Page.enable');await cdp('Runtime.enable');
  await waitFor(`window.CreativeOSIntelligence?.version==='3.0'`,'core');
  await waitFor(`window.CreativeOSMatrixV2?.version==='2.0'`,'matrix v2');
  await waitFor(`window.CreativeOSWinnerLab?.version==='2.0'`,'winner lab');
  await waitFor(`!!document.querySelector('#ciwSplitNav')`,'split nav');

  await click(`document.querySelector('[data-ci-route="avatars"]')`,'matrix nav');
  await waitFor(`document.querySelectorAll('.cimx-product').length===3`,'three matrix products');
  const varCount=await evalJS(`document.querySelector('.cimx-product')?.querySelectorAll('.cimx-var').length`);if(varCount!==6)throw new Error(`Matrix expected 6 variables, got ${varCount}`);
  const colors=await evalJS(`Array.from(document.querySelectorAll('.cimx-product')).map(x=>getComputedStyle(x).getPropertyValue('--mx')).join('|')`);if(!colors.includes('#60a5fa')||!colors.includes('#a78bfa')||!colors.includes('#34d399'))throw new Error('Product visual isolation colors missing');

  await click(`document.querySelector('.cimx-product [data-cimx-variable="concept"]')`,'concept matrix detail');
  await waitFor(`!!document.querySelector('#cimxModalRoot')`,'matrix modal opens');
  await click(`document.querySelector('#cimxModalRoot [data-cimx-close]')`,'matrix back');
  await waitFor(`!document.querySelector('#cimxModalRoot')`,'matrix modal closes');

  await click(`document.querySelector('.cimx-product [data-cimx-variable="concept"]')`,'concept detail again');
  await waitFor(`!!document.querySelector('#cimxModalRoot [data-cimx-open-testing]')`,'open testing button');
  await click(`document.querySelector('#cimxModalRoot [data-cimx-open-testing]')`,'open testing');
  await waitFor(`document.querySelector('#ciHost')?.dataset?.ciView==='testing'`,'testing view');
  await waitFor(`!!document.querySelector('.ci-workflow-shell')`,'product testing detail');

  await click(`document.querySelector('[data-ci-route="avatars"]')`,'matrix again');
  await waitFor(`!!document.querySelector('.cimx-product')`,'matrix rerendered');
  const editableCard=await evalJS(`(()=>{const p=Array.from(document.querySelectorAll('.cimx-product')).find(x=>x.querySelector('[data-cimx-open-testing="strideshield"]'));return !!p?.querySelector('[data-cimx-variable="concept"]')})()`);if(!editableCard)throw new Error('Stride concept card missing');
  await click(`Array.from(document.querySelectorAll('.cimx-product')).find(x=>x.querySelector('[data-cimx-open-testing="strideshield"]')).querySelector('[data-cimx-variable="concept"]')`,'Stride concept detail');
  await waitFor(`!!document.querySelector('#cimxModalRoot')`,'Stride detail modal');
  const hasWorkflowEdit=await evalJS(`!!document.querySelector('#cimxModalRoot [data-cimx-edit-workflow]')`);
  if(hasWorkflowEdit){await click(`document.querySelector('#cimxModalRoot [data-cimx-edit-workflow]')`,'edit workflow');await waitFor(`!!document.querySelector('#ciWorkflowName')`,'workflow editor reachable');}

  await click(`document.querySelector('#ciwSplitNav')`,'winner split nav');
  await waitFor(`document.querySelector('#ciHost')?.dataset?.ciView==='winner-splits'`,'winner split view');
  await click(`document.querySelector('[data-ciw-product="strideshield"]')`,'Stride winner product');
  await click(`document.querySelector('[data-ciw-new-winner]')`,'new winner');
  await waitFor(`!!document.querySelector('#ciwWinnerName')`,'winner modal');
  await setValue('#ciwWinnerName','CI Winner Smoke');await setValue('#ciwWinnerViews','500000');await setValue('#ciwWinnerSales','5');
  await click(`document.querySelector('[data-ciw-save-winner]')`,'save winner');
  await waitFor(`window.CreativeOSWinnerLab.getData().winnerPlans.some(w=>w.name==='CI Winner Smoke')`,'winner persisted');
  rootId=await evalJS(`window.CreativeOSWinnerLab.getData().winnerPlans.find(w=>w.name==='CI Winner Smoke').id`);
  await waitFor(`document.querySelectorAll('.ciw-track-card').length===6`,'six winner tracks');

  await click(`document.querySelector('.ciw-track-card[data-variable="avatar"]')`,'avatar track');
  await waitFor(`!!document.querySelector('#ciwTrackDetail')`,'avatar track detail');
  await click(`document.querySelector('#ciwTrackDetail [data-ciw-new-attempt]')`,'new avatar attempt');
  await waitFor(`!!document.querySelector('#ciwAttemptTitle')`,'avatar editor');
  await setValue('#ciwAttemptTitle','Jugador negro atlético');await setValue('#ciwAttemptMain','Jugador atlético, energía competitiva');
  await click(`document.querySelector('[data-ciw-save-attempt]')`,'save avatar attempt');
  await waitFor(`window.CreativeOSWinnerLab.getData().winnerAttempts.some(a=>a.title==='Jugador negro atlético')`,'avatar attempt persisted');
  const avatarAttemptId=await evalJS(`window.CreativeOSWinnerLab.getData().winnerAttempts.find(a=>a.title==='Jugador negro atlético').id`);
  await click(`document.querySelector('[data-ciw-data-attempt="${avatarAttemptId}"]')`,'avatar data');
  await waitFor(`!!document.querySelector('#ciwDataViews')`,'data modal');await setValue('#ciwDataViews','760000');await setValue('#ciwDataSales','8');
  await click(`document.querySelector('[data-ciw-save-data]')`,'save avatar data');
  await waitFor(`window.CreativeOSWinnerLab.getData().winnerAttempts.find(a=>a.id==='${avatarAttemptId}')?.views===760000`,'avatar metrics saved');
  await click(`document.querySelector('[data-ciw-best-attempt="${avatarAttemptId}"]')`,'mark best avatar');
  await waitFor(`window.CreativeOSWinnerLab.getData().winnerAttempts.find(a=>a.id==='${avatarAttemptId}')?.is_best===true`,'best avatar saved');

  await click(`document.querySelector('.ciw-track-card[data-variable="text_hook"]')`,'text track');
  await click(`document.querySelector('#ciwTrackDetail [data-ciw-new-attempt]')`,'new text attempt');
  await waitFor(`!!document.querySelector('#ciwAttemptTitle')`,'text editor');await setValue('#ciwAttemptTitle','NEEDS text');await setValue('#ciwAttemptMain','The accessory every basketball player NEEDS');
  await click(`document.querySelector('[data-ciw-save-attempt]')`,'save text attempt');
  await waitFor(`window.CreativeOSWinnerLab.getData().winnerAttempts.some(a=>a.title==='NEEDS text')`,'text attempt persisted');

  await click(`document.querySelector('[data-ciw-mode="tree"]')`,'tree mode');
  await waitFor(`document.querySelectorAll('.ciw-tree-track').length>=6`,'tree six branches');
  await waitFor(`document.body.innerText.includes('Jugador negro atlético')`,'tree attempt visible');
  await click(`document.querySelector('[data-ciw-mode="history"]')`,'history mode');
  await waitFor(`document.querySelectorAll('.ciw-history-row').length>=2`,'history attempts');

  await click(`document.querySelector('[data-ciw-mode="panel"]')`,'panel mode');
  await waitFor(`!!document.querySelector('[data-ciw-next-winner]')`,'next winner CTA');
  await click(`document.querySelector('[data-ciw-next-winner]')`,'create V2');
  await waitFor(`!!document.querySelector('#ciwWinnerName')`,'V2 modal');
  const inheritedName=await evalJS(`document.querySelector('#ciwWinnerName').value`);if(!inheritedName.includes('V2'))throw new Error('V2 name was not inherited');
  await setValue('#ciwWinnerName','CI Winner Smoke V2');
  await click(`document.querySelector('[data-ciw-save-winner]')`,'save V2');
  await waitFor(`window.CreativeOSWinnerLab.getData().winnerPlans.some(w=>w.name==='CI Winner Smoke V2'&&w.parent_winner_id==='${rootId}')`,'V2 lineage persisted');
  childId=await evalJS(`window.CreativeOSWinnerLab.getData().winnerPlans.find(w=>w.name==='CI Winner Smoke V2').id`);

  console.log('CreativeOS Winner Lab smoke: PASS — matrix navigation, six winner splits, custom editors, metrics, best selection, tree, chronology and winner lineage all work');
} finally {
  try{if(childId)await api({action:'delete_winner_plan',id:childId});}catch{}
  try{if(rootId)await api({action:'delete_winner_plan',id:rootId});}catch{}
  try{ws.close();}catch{}proc.kill('SIGKILL');server.close();
}
