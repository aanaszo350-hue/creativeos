import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

const ROOT=process.cwd(), PORT=5200, CDP_PORT=9224;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const raw=(req.url||'/').split('?')[0],rel=raw==='/'?'index.html':decodeURIComponent(raw.replace(/^\//,''));const file=normalize(join(ROOT,rel));if(!file.startsWith(ROOT)){res.writeHead(403);return res.end('forbidden');}const st=await stat(file);if(!st.isFile())throw 0;const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('not found');}});
await new Promise((resolve,reject)=>server.listen(PORT,'127.0.0.1',err=>err?reject(err):resolve()));

let chrome=null;for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const p=spawn('sh',['-lc',`command -v ${cmd}`]);let out='';p.stdout.on('data',d=>out+=d);await new Promise(r=>p.on('close',r));if(out.trim()){chrome=out.trim();break;}}
if(!chrome){server.close();throw new Error('Chrome/Chromium not found');}
const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${CDP_PORT}`,'--remote-allow-origins=*','--user-data-dir=/tmp/creativeos-split-smoke','about:blank'],{stdio:['ignore','ignore','pipe']});
let chromeErr='';proc.stderr.on('data',d=>chromeErr+=d);
async function waitJson(url,attempts=240){for(let i=0;i<attempts;i++){try{const r=await fetch(url);if(r.ok)return await r.json();}catch{}await sleep(250);}throw new Error(`Timed out ${url}\n${chromeErr.slice(-1200)}`);}
const version=await waitJson(`http://127.0.0.1:${CDP_PORT}/json/version`);const tr=await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(`http://localhost:${PORT}/`)}`,{method:'PUT'});if(!tr.ok)throw new Error('Could not create target');const target=await tr.json(),ws=new WebSocket(target.webSocketDebuggerUrl||version.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});let seq=0;const pending=new Map();ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error(`CDP timeout ${method}`));}},10000);});}
async function evalJS(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails){const desc=r.exceptionDetails.exception?.description||r.exceptionDetails.text;throw new Error(`Browser exception: ${desc}`);}return r.result?.value;}
async function waitFor(expression,label,attempts=140){for(let i=0;i<attempts;i++){try{if(await evalJS(expression))return;}catch{}await sleep(160);}const diag=await evalJS(`({body:document.body?.innerText?.slice(0,2600),view:document.querySelector('#ciHost')?.dataset?.ciView})`).catch(()=>null);throw new Error(`UI timeout: ${label}\n${JSON.stringify(diag)}`);}
async function click(expression,label){const ok=await evalJS(`(()=>{const el=${expression};if(!el)return false;el.click();return true})()`);if(!ok)throw new Error(`Could not click ${label}`);await sleep(180);}
async function setValue(sel,value){return evalJS(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)return false;el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);}

try{
  await cdp('Page.enable');await cdp('Runtime.enable');
  await waitFor(`window.CreativeOSIntelligence?.version==='3.0'`,'intelligence core');
  await waitFor(`window.CreativeOSSplitTests?.version==='1.0'`,'split system');
  await waitFor(`!!document.querySelector('#cisSplitNav')`,'split nav');

  await click(`document.querySelector('[data-ci-route="avatars"]')`,'matrix nav');
  await waitFor(`!!document.querySelector('.cio-matrix-product')`,'matrix rendered');
  const banned=await evalJS(`document.querySelectorAll('.cio-variable[data-variable="format"],.cio-variable[data-variable="visual_hook"]').length`);
  if(banned!==0)throw new Error('Matrix still exposes format/camera or separate visual hook');
  await waitFor(`!!document.querySelector('.cis-matrix-clickable')`,'matrix variable clickable');

  await click(`document.querySelector('#cisSplitNav')`,'split nav');
  await waitFor(`document.querySelector('#ciHost')?.dataset?.ciView==='splits'`,'split view');
  await click(`document.querySelector('[data-cis-product="strideshield"]')`,'StrideShield tab');
  await click(`document.querySelector('[data-cis-new-test]')`,'new split');
  await waitFor(`!!document.querySelector('#cisTestName')`,'split modal');
  await setValue('#cisTestName','CI Split Smoke');
  await setValue('#cisPrimaryVar','avatar');
  await setValue('#cisSourceLabel','500K winner smoke');
  await setValue('#cisSourceViews','500000');
  await setValue('[data-cis-baseline="text_hook"]','Control text');
  await setValue('[data-cis-baseline="background"]','Control background');
  await setValue('#cisVariantCount','2');
  await click(`document.querySelector('[data-cis-save-test]')`,'create split');
  await waitFor(`window.CreativeOSIntelligence.getSnapshot().splitTests?.some(t=>t.name==='CI Split Smoke')`,'split persisted');
  await waitFor(`Array.from(document.querySelectorAll('.cis-test-card h3')).some(x=>x.textContent.includes('CI Split Smoke'))`,'split rendered');

  const testId=await evalJS(`window.CreativeOSIntelligence.getSnapshot().splitTests.find(t=>t.name==='CI Split Smoke').id`);
  await waitFor(`window.CreativeOSIntelligence.getSnapshot().splitVariants.filter(v=>v.test_id===${JSON.stringify(testId)}).length===2`,'two variants');
  const variantId=await evalJS(`window.CreativeOSIntelligence.getSnapshot().splitVariants.find(v=>v.test_id===${JSON.stringify(testId)}&&v.label==='A').id`);

  await click(`document.querySelector('[data-cis-edit-variant="${variantId}"]')`,'edit variant A');
  await waitFor(`!!document.querySelector('#cisPrimaryValue')`,'variant modal');
  await setValue('#cisPrimaryValue','Avatar smoke A');
  await setValue('[data-cis-derived="text_hook"]','Adapted text because avatar changed');
  await click(`document.querySelector('[data-cis-save-variant]')`,'save variant');
  await waitFor(`(()=>{const s=window.CreativeOSIntelligence.getSnapshot();const t=s.splitTests.find(x=>x.id===${JSON.stringify(testId)}),v=s.splitVariants.find(x=>x.id===${JSON.stringify(variantId)});return t?.primary_variable==='avatar'&&v?.derived_changes?.text_hook==='Adapted text because avatar changed'})()`,'primary variable remains avatar with derived text');

  await click(`document.querySelector('[data-cis-status="recorded"][data-variant="${variantId}"]')`,'mark recorded');
  await waitFor(`window.CreativeOSIntelligence.getSnapshot().splitVariants.find(v=>v.id===${JSON.stringify(variantId)})?.production_status==='recorded'`,'recorded persisted');
  await click(`document.querySelector('[data-cis-metrics="${variantId}"]')`,'metrics modal');
  await setValue('#cisViews','12345');await setValue('#cisSales','1');
  await click(`document.querySelector('[data-cis-save-metrics]')`,'save metrics');
  await waitFor(`(()=>{const v=window.CreativeOSIntelligence.getSnapshot().splitVariants.find(x=>x.id===${JSON.stringify(variantId)});return v?.views===12345&&v?.production_status==='data_ready'})()`,'metrics persisted');

  await evalJS(`window.confirm=()=>true;true`);
  await click(`document.querySelector('[data-cis-winner="${variantId}"]')`,'mark winner');
  await waitFor(`(()=>{const s=window.CreativeOSIntelligence.getSnapshot();const t=s.splitTests.find(x=>x.id===${JSON.stringify(testId)}),v=s.splitVariants.find(x=>x.id===${JSON.stringify(variantId)});return t?.status==='completed'&&t?.winner_variant_id===v?.id&&v?.is_winner===true})()`,'winner persisted');
  await waitFor(`!!document.querySelector('[data-cis-child-test="${variantId}"]')`,'child CTA');

  await click(`document.querySelector('[data-cis-child-test="${variantId}"]')`,'next split');
  await waitFor(`!!document.querySelector('#cisTestName')`,'child modal');
  await setValue('#cisTestName','CI Child Split Smoke');
  await setValue('#cisPrimaryVar','text_hook');
  await setValue('#cisVariantCount','2');
  await click(`document.querySelector('[data-cis-save-test]')`,'create child split');
  await waitFor(`window.CreativeOSIntelligence.getSnapshot().splitTests?.some(t=>t.name==='CI Child Split Smoke'&&t.parent_variant_id===${JSON.stringify(variantId)})`,'child linked to winner');
  await click(`document.querySelector('[data-cis-detail-mode="tree"]')`,'tree mode');
  await waitFor(`document.querySelectorAll('.cis-tree-test').length>=2`,'tree shows lineage');

  const childId=await evalJS(`window.CreativeOSIntelligence.getSnapshot().splitTests.find(t=>t.name==='CI Child Split Smoke').id`);
  await click(`document.querySelector('[data-cis-delete-test="${childId}"]')`,'delete child');
  await waitFor(`!window.CreativeOSIntelligence.getSnapshot().splitTests.some(t=>t.id===${JSON.stringify(childId)})`,'child deleted');
  await click(`document.querySelector('[data-cis-delete-test="${testId}"]')`,'delete root');
  await waitFor(`!window.CreativeOSIntelligence.getSnapshot().splitTests.some(t=>t.id===${JSON.stringify(testId)})`,'root deleted');

  console.log('CreativeOS Split Tests smoke: PASS — primary-variable classification, derived changes, checklist, metrics, winner lineage, tree and cleanup all work');
} finally {
  try{ws.close();}catch{}
  proc.kill('SIGKILL');server.close();
}
