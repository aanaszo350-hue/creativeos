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
      .cos-test-product-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:11px}
      .cos-test-product-name{font-size:13px;font-weight:800}.cos-test-product-note{font-size:9px;color:var(--muted);margin-top:4px;line-height:1.45}
      .cos-test-list{display:grid;gap:8px}
      .cos-test-item{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;gap:10px;align-items:center;border:1px solid #1d2635;background:#0e131c;border-radius:11px;padding:9px 10px}
      .cos-test-number{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:rgba(79,124,255,.13);border:1px solid rgba(79,124,255,.24);font-size:10px;font-weight:800;color:#b9c8ff}
      .cos-test-link{min-width:0}.cos-test-link b{display:block;font-size:10px}.cos-test-link span{display:block;font-size:9px;color:var(--muted2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cos-test-status{font-size:8px;font-weight:800;border:1px solid rgba(242,187,75,.25);background:rgba(242,187,75,.08);color:#f5ce7d;border-radius:999px;padding:5px 7px;text-transform:uppercase;letter-spacing:.04em}
      .cos-test-status.done{border-color:rgba(53,208,127,.25);background:rgba(53,208,127,.08);color:#94f0bb}
      .cos-test-open{border:1px solid #34425c;background:#121927;color:#e9eef8;border-radius:8px;padding:7px 9px;font-size:9px;font-weight:750;text-decoration:none}
      .cos-test-open:hover{border-color:#53698f;background:#172033}
      .cos-test-empty{border:1px dashed #2b3549;border-radius:16px;padding:38px 20px;text-align:center;color:var(--muted);background:#0c1017}.cos-test-empty b{display:block;color:#e3e9f4;font-size:12px;margin-bottom:5px}.cos-test-empty span{font-size:10px}
      .cos-test-error{border:1px solid rgba(255,100,118,.25);background:rgba(255,100,118,.07);color:#ffadb7;border-radius:12px;padding:12px;font-size:10px}
      @media(max-width:760px){.cos-test-item{grid-template-columns:30px minmax(0,1fr) auto}.cos-test-status{display:none}.cos-test-date-head,.cos-test-product-head{align-items:flex-start}.cos-test-products{padding:10px}.cos-test-product{padding:11px}}
    `;
    document.head.appendChild(style);
  }

  function ensureNav(){
    injectStyles();
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar)return;
    let btn=sidebar.querySelector('[data-cos-testing-route]');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='nav-btn cos-test-nav';
      btn.dataset.cosTestingRoute='1';
      btn.innerHTML='<span class="nav-ico">▤</span><span>Testeo</span>';
      const workspaceNav=sidebar.querySelector('.nav');
      if(!workspaceNav)return;
      const radar=[...workspaceNav.querySelectorAll('.nav-btn')].find(x=>/product radar/i.test(x.textContent||''));
      const products=[...workspaceNav.querySelectorAll('.nav-btn')].find(x=>/productos/i.test(x.textContent||''));
      if(radar)radar.insertAdjacentElement('afterend',btn);
      else if(products)products.insertAdjacentElement('afterend',btn);
      else workspaceNav.appendChild(btn);
    }
    btn.classList.toggle('active',isActive());
    if(isActive())sidebar.querySelectorAll('.nav-btn:not([data-cos-testing-route])').forEach(x=>x.classList.remove('active'));
  }

  function todayISO(){
    const d=new Date();
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function plusDaysISO(n){const d=new Date();d.setDate(d.getDate()+n);const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
  function dateLabel(iso){
    if(iso===todayISO())return 'Hoy';
    if(iso===plusDaysISO(1))return 'Mañana';
    try{return new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'2-digit',month:'short'}).format(new Date(`${iso}T12:00:00`));}catch{return iso;}
  }

  async function fetchRows(force=false){
    if(loading||(!force&&loaded))return;
    loading=true;
    try{
      const select='id,product_id,log_date,videos_published,notes,tested_items,created_at,updated_at';
      const url=`${SUPABASE_URL}/rest/v1/creativeos_daily_logs?select=${encodeURIComponent(select)}&order=log_date.asc,created_at.asc`;
      const res=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
      if(!res.ok)throw new Error(`${res.status} ${await res.text()}`);
      const all=await res.json();
      rows=(Array.isArray(all)?all:[]).filter(r=>{
        const t=r?.tested_items||{};
        return t.content_type==='tomorrow_content'||Array.isArray(t.videos);
      });
      loaded=true;
      if(isActive())renderPage();
    }catch(err){
      console.warn('CreativeOS Testeo load failed',err);
      rows=[];loaded=true;
      if(isActive())renderPage(String(err?.message||err));
    }finally{loading=false;}
  }

  function normalizeRows(){
    const map=new Map();
    for(const row of rows){
      const date=row.log_date||'Sin fecha';
      if(!map.has(date))map.set(date,[]);
      map.get(date).push(row);
    }
    return [...map.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  }

  function videoItem(v,i){
    const status=String(v?.status||'planned').toLowerCase();
    const done=['done','published','complete','completed'].includes(status);
    const label=done?'Hecho':'Pendiente';
    const url=String(v?.url||'');
    return `<div class="cos-test-item">
      <div class="cos-test-number">${i+1}</div>
      <div class="cos-test-link"><b>Test ${i+1} · ${esc(v?.platform||'Referencia')}</b><span>${esc(url)}</span></div>
      <span class="cos-test-status ${done?'done':''}">${label}</span>
      ${url?`<a class="cos-test-open" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Abrir Reel ↗</a>`:''}
    </div>`;
  }

  function dateBlock(date,items){
    const tests=items.reduce((n,r)=>n+((r.tested_items?.videos||[]).length),0);
    return `<section class="cos-test-date">
      <div class="cos-test-date-head"><div class="cos-test-date-title"><b>${esc(dateLabel(date))}</b><span>${esc(date)}</span></div><span class="cos-test-count">${tests} test${tests===1?'':'s'}</span></div>
      <div class="cos-test-products">${items.map(row=>{
        const ti=row.tested_items||{},videos=Array.isArray(ti.videos)?ti.videos:[];
        const name=ti.product_name||row.product_id||'Producto';
        return `<article class="cos-test-product"><div class="cos-test-product-head"><div><div class="cos-test-product-name">${esc(name)}</div><div class="cos-test-product-note">${esc(row.notes||'Contenido planificado')}</div></div><span class="badge blue">${videos.length} vídeo${videos.length===1?'':'s'}</span></div><div class="cos-test-list">${videos.length?videos.map(videoItem).join(''):'<div class="cos-test-empty"><b>Sin vídeos</b><span>No hay referencias guardadas para este test.</span></div>'}</div></article>`;
      }).join('')}</div>
    </section>`;
  }

  function renderPage(error=''){
    if(!isActive()||renderLock)return;
    const content=document.querySelector('.main .content');
    if(!content)return;
    renderLock=true;
    try{
      ensureNav();
      const title=document.querySelector('.page-title');if(title)title.textContent='Testeo';
      const breadcrumb=document.querySelector('.breadcrumb');if(breadcrumb)breadcrumb.textContent='CreativeOS';
      const groups=normalizeRows();
      const body=error?`<div class="cos-test-error">No se pudo cargar el contenido planificado · ${esc(error)}</div>`:
        !loaded?'<div class="cos-test-empty"><b>Cargando testeos…</b><span>Consultando el contenido planificado.</span></div>':
        groups.length?groups.map(([date,items])=>dateBlock(date,items)).join(''):'<div class="cos-test-empty"><b>No hay testeos planificados</b><span>Cuando guardemos contenido para mañana aparecerá aquí automáticamente.</span></div>';
      content.innerHTML=`
        <div class="hero"><div><div class="eyebrow">Plan de publicación</div><h1>Testeo</h1><p>Contenido que vas a testear, organizado por fecha y producto. Los enlaces guardados desde el chat aparecen aquí automáticamente.</p></div><div class="hero-stats"><div class="stat-chip"><b>${rows.reduce((n,r)=>n+(r.tested_items?.videos?.length||0),0)}</b><span>tests guardados</span></div></div></div>
        <div class="cos-test-toolbar"><button class="btn" type="button" data-cos-testing-refresh>↻ Recargar</button></div>
        <div id="cosTestingContent">${body}</div>`;
    }finally{renderLock=false;}
    if(!loaded&&!loading)fetchRows();
  }

  document.addEventListener('click',e=>{
    const custom=e.target.closest?.('[data-cos-testing-route]');
    if(custom){
      e.preventDefault();e.stopPropagation();
      sessionStorage.setItem(ROUTE_KEY,ROUTE);
      ensureNav();renderPage();fetchRows();
      return;
    }
    if(e.target.closest?.('[data-cos-testing-refresh]')){loaded=false;fetchRows(true);renderPage();return;}
    const normal=e.target.closest?.('[data-route]');
    if(normal&&isActive())sessionStorage.removeItem(ROUTE_KEY);
  },true);

  const observer=new MutationObserver(()=>{
    clearTimeout(observerTimer);
    observerTimer=setTimeout(()=>{
      ensureNav();
      if(isActive()&&!document.getElementById('cosTestingContent'))renderPage();
    },30);
  });

  function boot(){
    injectStyles();ensureNav();
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
    if(isActive()){renderPage();fetchRows();}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.CreativeOSTesting={version:'1.0',open:()=>{sessionStorage.setItem(ROUTE_KEY,ROUTE);renderPage();fetchRows();},refresh:()=>fetchRows(true)};
})();