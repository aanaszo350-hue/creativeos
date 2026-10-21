(() => {
  'use strict';

  const SUPABASE_URL='https://naiglzmqpgucfbwfbvxt.supabase.co';
  const SUPABASE_KEY='sb_publishable_h883eAMdoF8IYcPunFFCVQ_SCB42SMf';
  const ROUTE_KEY='creativeos_custom_route';
  const ROUTE='testing-content';
  let rows=[];
  let loading=false;
  let loaded=false;
  let renderLock=false;
  let observerTimer=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const isActive=()=>sessionStorage.getItem(ROUTE_KEY)===ROUTE;
  const arr=x=>Array.isArray(x)?x:[];
  const rowCount=r=>arr(r?.tested_items?.videos).length+arr(r?.tested_items?.concepts).length;

  function injectStyles(){
    if(document.getElementById('cos-testing-style'))return;
    const style=document.createElement('style');
    style.id='cos-testing-style';
    style.textContent=`
      .cos-test-nav .nav-ico{font-size:15px}
      .cos-test-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:18px}
      .cos-test-date{border:1px solid var(--line);background:linear-gradient(180deg,#10151e,#0c1017);border-radius:18px;overflow:hidden;margin-bottom:18px}
      .cos-test-date-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;border-bottom:1px solid var(--line)}
      .cos-test-date-title{display:flex;align-items:center;gap:10px}.cos-test-date-title b{font-size:14px}.cos-test-date-title span{font-size:10px;color:var(--muted)}
      .cos-test-count{font-size:9px;border:1px solid #2b3650;background:#0c111a;border-radius:999px;padding:5px 8px;color:#b9c8ff}
      .cos-test-products{display:grid;gap:12px;padding:14px}
      .cos-test-product{border:1px solid #222b3c;background:#0b0f16;border-radius:14px;padding:14px}
      .cos-test-product-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:12px}
      .cos-test-product-name{font-size:13px;font-weight:800}.cos-test-product-note{font-size:9px;color:var(--muted);margin-top:4px;line-height:1.45}
      .cos-test-section-title{font-size:8px;text-transform:uppercase;letter-spacing:.11em;color:#667188;font-weight:800;margin:12px 1px 7px}
      .cos-test-list{display:grid;gap:8px}
      .cos-test-item{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto auto;gap:10px;align-items:center;border:1px solid #1d2635;background:#0e131c;border-radius:11px;padding:9px 10px;cursor:pointer;transition:.14s ease}
      .cos-test-item:hover{border-color:#394a68;background:#111824;transform:translateY(-1px)}
      .cos-test-item.concept{grid-template-columns:34px minmax(0,1fr) auto auto}
      .cos-test-number{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:rgba(79,124,255,.13);border:1px solid rgba(79,124,255,.24);font-size:10px;font-weight:800;color:#b9c8ff}
      .cos-test-number.concept{background:rgba(141,98,255,.13);border-color:rgba(141,98,255,.28);color:#d2c5ff}
      .cos-test-link{min-width:0}.cos-test-link b{display:block;font-size:10px}.cos-test-link span{display:block;font-size:9px;color:var(--muted2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cos-test-platform{font-size:8px;font-weight:800;border:1px solid rgba(79,124,255,.22);background:rgba(79,124,255,.08);color:#b9c8ff;border-radius:999px;padding:5px 7px;white-space:nowrap}
      .cos-test-platform.concept{border-color:rgba(141,98,255,.25);background:rgba(141,98,255,.09);color:#d2c5ff}
      .cos-test-status{font-size:8px;font-weight:800;border:1px solid rgba(242,187,75,.25);background:rgba(242,187,75,.08);color:#f5ce7d;border-radius:999px;padding:5px 7px;text-transform:uppercase;letter-spacing:.04em}
      .cos-test-status.done{border-color:rgba(53,208,127,.25);background:rgba(53,208,127,.08);color:#94f0bb}
      .cos-test-open,.cos-test-brief{border:1px solid #34425c;background:#121927;color:#e9eef8;border-radius:8px;padding:7px 9px;font-size:9px;font-weight:750;text-decoration:none;white-space:nowrap}
      .cos-test-brief{background:linear-gradient(135deg,rgba(79,124,255,.18),rgba(141,98,255,.14));border-color:rgba(100,137,255,.28)}
      .cos-test-open:hover,.cos-test-brief:hover{border-color:#53698f;background:#172033}
      .cos-test-empty{border:1px dashed #2b3549;border-radius:16px;padding:30px 20px;text-align:center;color:var(--muted);background:#0c1017}.cos-test-empty b{display:block;color:#e3e9f4;font-size:12px;margin-bottom:5px}.cos-test-empty span{font-size:10px}
      .cos-test-error{border:1px solid rgba(255,100,118,.25);background:rgba(255,100,118,.07);color:#ffadb7;border-radius:12px;padding:12px;font-size:10px}
      .cos-test-detail{position:fixed;inset:0;background:rgba(3,5,9,.72);backdrop-filter:blur(8px);display:grid;place-items:center;z-index:99999;padding:24px}
      .cos-test-detail-card{width:min(760px,96vw);max-height:88vh;overflow:auto;border:1px solid #2a3650;background:linear-gradient(180deg,#111722,#0b0f16);border-radius:18px;box-shadow:0 28px 90px rgba(0,0,0,.55)}
      .cos-test-detail-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:18px 19px;border-bottom:1px solid #222b3c}.cos-test-detail-head b{display:block;font-size:15px}.cos-test-detail-head span{display:block;color:var(--muted);font-size:9px;margin-top:4px}
      .cos-test-detail-close{border:1px solid #303c53;background:#111722;color:#dce5f4;border-radius:9px;width:34px;height:34px;cursor:pointer;font-size:17px}
      .cos-test-detail-body{padding:16px 19px 20px;display:grid;gap:11px}
      .cos-test-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .cos-test-field{border:1px solid #202a3b;background:#0c1119;border-radius:12px;padding:12px}.cos-test-field.full{grid-column:1/-1}
      .cos-test-field label{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.09em;color:#69758b;margin-bottom:7px;font-weight:800}
      .cos-test-copy{white-space:pre-wrap;color:#e7edf8;font-size:11px;line-height:1.55}.cos-test-copy.muted{color:#7d899f}
      .cos-test-pending{border:1px solid rgba(242,187,75,.24);background:rgba(242,187,75,.07);color:#f5ce7d;border-radius:11px;padding:10px 12px;font-size:9px;line-height:1.45}
      .cos-test-detail-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}.cos-test-detail-actions a{border:1px solid #34425c;background:#121927;color:#edf2fb;border-radius:9px;padding:8px 11px;font-size:9px;font-weight:800;text-decoration:none}
      @media(max-width:760px){.cos-test-item,.cos-test-item.concept{grid-template-columns:30px minmax(0,1fr) auto}.cos-test-platform,.cos-test-status{display:none}.cos-test-open{display:none}.cos-test-date-head,.cos-test-product-head{align-items:flex-start}.cos-test-products{padding:10px}.cos-test-product{padding:11px}.cos-test-detail-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureNav(){
    injectStyles();
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar)return;
    let btn=sidebar.querySelector('[data-cos-testing-route]');
    if(!btn){
      btn=document.createElement('button');btn.type='button';btn.className='nav-btn cos-test-nav';btn.dataset.cosTestingRoute='1';btn.innerHTML='<span class="nav-ico">▤</span><span>Testeo</span>';
      const workspaceNav=sidebar.querySelector('.nav');if(!workspaceNav)return;
      const radar=[...workspaceNav.querySelectorAll('.nav-btn')].find(x=>/product radar/i.test(x.textContent||''));
      const products=[...workspaceNav.querySelectorAll('.nav-btn')].find(x=>/productos/i.test(x.textContent||''));
      if(radar)radar.insertAdjacentElement('afterend',btn);else if(products)products.insertAdjacentElement('afterend',btn);else workspaceNav.appendChild(btn);
    }
    btn.classList.toggle('active',isActive());
    if(isActive())sidebar.querySelectorAll('.nav-btn:not([data-cos-testing-route])').forEach(x=>x.classList.remove('active'));
  }

  function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function plusDaysISO(n){const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function dateLabel(iso){if(iso===todayISO())return 'Hoy';if(iso===plusDaysISO(1))return 'Mañana';try{return new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'2-digit',month:'short'}).format(new Date(`${iso}T12:00:00`));}catch{return iso;}}

  async function fetchRows(force=false){
    if(loading||(!force&&loaded))return;loading=true;
    try{
      const select='id,product_id,log_date,videos_published,notes,tested_items,created_at,updated_at';
      const url=`${SUPABASE_URL}/rest/v1/creativeos_daily_logs?select=${encodeURIComponent(select)}&order=log_date.asc,created_at.asc`;
      const res=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});if(!res.ok)throw new Error(`${res.status} ${await res.text()}`);
      const all=await res.json();rows=(Array.isArray(all)?all:[]).filter(r=>{const t=r?.tested_items||{};return t.content_type==='tomorrow_content'||Array.isArray(t.videos)||Array.isArray(t.concepts);});
      loaded=true;if(isActive())renderPage();
    }catch(err){console.warn('CreativeOS Testeo load failed',err);rows=[];loaded=true;if(isActive())renderPage(String(err?.message||err));}
    finally{loading=false;}
  }

  function normalizeRows(){const map=new Map();for(const row of rows){const date=row.log_date||'Sin fecha';if(!map.has(date))map.set(date,[]);map.get(date).push(row);}return [...map.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0])));}

  function videoItem(v,i,row){
    const status=String(v?.status||'planned').toLowerCase();const done=['done','published','complete','completed'].includes(status);const label=done?'Hecho':'Pendiente';const url=String(v?.url||'');const hasCopy=!!String(v?.adapted_text||'').trim();
    return `<div class="cos-test-item" data-cos-test-detail data-kind="video" data-row-id="${esc(row.id)}" data-index="${i}"><div class="cos-test-number">${i+1}</div><div class="cos-test-link"><b>Test ${i+1} · ${esc(v?.platform||'Referencia')}</b><span>${hasCopy?'Copy preparado · clic para ver ficha':esc(url)}</span></div><span class="cos-test-platform">${esc(v?.platform||'Referencia')}</span><span class="cos-test-status ${done?'done':''}">${label}</span><div style="display:flex;gap:6px;align-items:center"><button class="cos-test-brief" type="button" data-cos-test-detail data-kind="video" data-row-id="${esc(row.id)}" data-index="${i}">Ver ficha</button>${url?`<a class="cos-test-open" data-cos-open-ref href="${esc(url)}" target="_blank" rel="noopener noreferrer">Abrir Reel ↗</a>`:''}</div></div>`;
  }

  function conceptItem(c,i,row){
    const status=String(c?.status||'planned').toLowerCase();const done=['done','published','complete','completed'].includes(status);const label=done?'Hecho':'Pendiente';
    return `<div class="cos-test-item concept" data-cos-test-detail data-kind="concept" data-row-id="${esc(row.id)}" data-index="${i}"><div class="cos-test-number concept">${i+1}</div><div class="cos-test-link"><b>${esc(c?.title||`Concepto ${i+1}`)}</b><span>${esc(c?.visual_hook||'Concepto escrito · clic para ver producción')}</span></div><span class="cos-test-platform concept">Concepto</span><span class="cos-test-status ${done?'done':''}">${label}</span></div>`;
  }

  function dateBlock(date,items){
    const tests=items.reduce((n,r)=>n+rowCount(r),0);
    return `<section class="cos-test-date"><div class="cos-test-date-head"><div class="cos-test-date-title"><b>${esc(dateLabel(date))}</b><span>${esc(date)}</span></div><span class="cos-test-count">${tests} test${tests===1?'':'s'}</span></div><div class="cos-test-products">${items.map(row=>{const ti=row.tested_items||{},videos=arr(ti.videos),concepts=arr(ti.concepts),name=ti.product_name||row.product_id||'Producto',total=videos.length+concepts.length;return `<article class="cos-test-product"><div class="cos-test-product-head"><div><div class="cos-test-product-name">${esc(name)}</div><div class="cos-test-product-note">${esc(row.notes||'Contenido planificado')}</div></div><span class="badge blue">${total} test${total===1?'':'s'}</span></div>${videos.length?`<div class="cos-test-section-title">Referencias / vídeos</div><div class="cos-test-list">${videos.map((v,i)=>videoItem(v,i,row)).join('')}</div>`:''}${concepts.length?`<div class="cos-test-section-title">Conceptos escritos</div><div class="cos-test-list">${concepts.map((c,i)=>conceptItem(c,i,row)).join('')}</div>`:''}${!total?'<div class="cos-test-empty"><b>Sin testeos</b><span>No hay referencias ni conceptos guardados.</span></div>':''}</article>`;}).join('')}</div></section>`;
  }

  function findItem(rowId,kind,index){const row=rows.find(r=>String(r.id)===String(rowId));if(!row)return null;const list=kind==='concept'?arr(row.tested_items?.concepts):arr(row.tested_items?.videos);const item=list[Number(index)];return item?{row,item,index:Number(index),kind}:null;}

  function openDetail(rowId,kind,index){
    const found=findItem(rowId,kind,index);if(!found)return;const {row,item}=found;const ti=row.tested_items||{};const product=ti.product_name||row.product_id||'Producto';
    document.getElementById('cosTestDetail')?.remove();const modal=document.createElement('div');modal.id='cosTestDetail';modal.className='cos-test-detail';
    if(kind==='concept'){
      const title=item.title||`Concepto ${found.index+1}`,concept=item.concept||'',hook=item.visual_hook||'',dialogue=item.dialogue||'',notes=item.notes||'';
      modal.innerHTML=`<div class="cos-test-detail-card"><div class="cos-test-detail-head"><div><b>${esc(title)}</b><span>${esc(row.log_date||'')} · ${esc(product)}</span></div><button class="cos-test-detail-close" type="button" data-cos-detail-close>×</button></div><div class="cos-test-detail-body"><div class="cos-test-detail-grid">${hook?`<div class="cos-test-field full"><label>Hook visual</label><div class="cos-test-copy">${esc(hook)}</div></div>`:''}<div class="cos-test-field full"><label>Concepto / qué hay que hacer</label><div class="cos-test-copy ${concept?'':'muted'}">${esc(concept||'Sin descripción.')}</div></div>${dialogue?`<div class="cos-test-field full"><label>Diálogo</label><div class="cos-test-copy">${esc(dialogue)}</div></div>`:''}${notes?`<div class="cos-test-field full"><label>Notas</label><div class="cos-test-copy">${esc(notes)}</div></div>`:''}</div></div></div>`;
    }else{
      const v=item,original=String(v.original_text||'').trim(),adapted=String(v.adapted_text||'').trim(),cta=String(v.cta||'').trim(),brief=String(v.brief||'').trim(),notes=String(v.notes||'').trim(),pending=String(v.analysis_status||'').includes('pending')||(!original&&!adapted);
      modal.innerHTML=`<div class="cos-test-detail-card"><div class="cos-test-detail-head"><div><b>Test ${Number(v.order||found.index+1)} · ${esc(product)}</b><span>${esc(row.log_date||'')} · ${esc(v.platform||'Referencia')}</span></div><button class="cos-test-detail-close" type="button" data-cos-detail-close>×</button></div><div class="cos-test-detail-body">${pending?'<div class="cos-test-pending">Pendiente de analizar el texto original del Reel. No se inventa copy: cuando el vídeo/texto sea legible, aquí aparecerán el original, la adaptación y el CTA.</div>':''}<div class="cos-test-detail-grid"><div class="cos-test-field full"><label>Brief del Reel</label><div class="cos-test-copy ${brief?'':'muted'}">${esc(brief||'Sin brief guardado.')}</div></div><div class="cos-test-field full"><label>Texto original</label><div class="cos-test-copy ${original?'':'muted'}">${esc(original||'Pendiente de leer.')}</div></div><div class="cos-test-field full"><label>Adaptación para este producto</label><div class="cos-test-copy ${adapted?'':'muted'}">${esc(adapted||'Pendiente de adaptar.')}</div></div><div class="cos-test-field"><label>CTA</label><div class="cos-test-copy ${cta?'':'muted'}">${esc(cta||'Pendiente.')}</div></div><div class="cos-test-field"><label>Plataforma</label><div class="cos-test-copy">${esc(v.platform||'Referencia')}</div></div>${v.concept?`<div class="cos-test-field full"><label>Concepto</label><div class="cos-test-copy">${esc(v.concept)}</div></div>`:''}${notes?`<div class="cos-test-field full"><label>Notas</label><div class="cos-test-copy">${esc(notes)}</div></div>`:''}</div><div class="cos-test-detail-actions">${v.url?`<a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Abrir Reel ↗</a>`:''}</div></div></div>`;
    }
    document.body.appendChild(modal);
  }

  function renderPage(error=''){
    if(!isActive()||renderLock)return;const content=document.querySelector('.main .content');if(!content)return;renderLock=true;
    try{
      ensureNav();const title=document.querySelector('.page-title');if(title)title.textContent='Testeo';const breadcrumb=document.querySelector('.breadcrumb');if(breadcrumb)breadcrumb.textContent='CreativeOS';const groups=normalizeRows();
      const body=error?`<div class="cos-test-error">No se pudo cargar el contenido planificado · ${esc(error)}</div>`:!loaded?'<div class="cos-test-empty"><b>Cargando testeos…</b><span>Consultando el contenido planificado.</span></div>':groups.length?groups.map(([date,items])=>dateBlock(date,items)).join(''):'<div class="cos-test-empty"><b>No hay testeos planificados</b><span>Cuando guardemos contenido para mañana aparecerá aquí automáticamente.</span></div>';
      const total=rows.reduce((n,r)=>n+rowCount(r),0);
      content.innerHTML=`<div class="hero"><div><div class="eyebrow">Plan de publicación</div><h1>Testeo</h1><p>Contenido y conceptos que vas a testear, organizados por fecha y producto. Las referencias tienen copy; los conceptos propios pueden vivir aquí sin necesitar un Reel.</p></div><div class="hero-stats"><div class="stat-chip"><b>${total}</b><span>tests guardados</span></div></div></div><div class="cos-test-toolbar"><button class="btn" type="button" data-cos-testing-refresh>↻ Recargar</button></div><div id="cosTestingContent">${body}</div>`;
    }finally{renderLock=false;}
    if(!loaded&&!loading)fetchRows();
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-cos-open-ref]'))return;
    if(e.target.closest?.('[data-cos-detail-close]')||e.target.id==='cosTestDetail'){document.getElementById('cosTestDetail')?.remove();return;}
    const detail=e.target.closest?.('[data-cos-test-detail]');if(detail){e.preventDefault();e.stopPropagation();openDetail(detail.dataset.rowId,detail.dataset.kind||'video',detail.dataset.index);return;}
    const custom=e.target.closest?.('[data-cos-testing-route]');if(custom){e.preventDefault();e.stopPropagation();sessionStorage.setItem(ROUTE_KEY,ROUTE);ensureNav();renderPage();fetchRows();return;}
    if(e.target.closest?.('[data-cos-testing-refresh]')){loaded=false;fetchRows(true);renderPage();return;}
    const normal=e.target.closest?.('[data-route]');if(normal&&isActive())sessionStorage.removeItem(ROUTE_KEY);
  },true);

  const observer=new MutationObserver(()=>{clearTimeout(observerTimer);observerTimer=setTimeout(()=>{ensureNav();if(isActive()&&!document.getElementById('cosTestingContent'))renderPage();},30);});
  function boot(){injectStyles();ensureNav();if(document.body)observer.observe(document.body,{childList:true,subtree:true});if(isActive()){renderPage();fetchRows();}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.CreativeOSTesting={version:'1.2',open:()=>{sessionStorage.setItem(ROUTE_KEY,ROUTE);renderPage();fetchRows();},refresh:()=>fetchRows(true)};
})();