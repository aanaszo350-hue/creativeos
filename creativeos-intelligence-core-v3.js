(() => {
  'use strict';

  const API='https://naiglzmqpgucfbwfbvxt.supabase.co/functions/v1/creativeos-intelligence';
  const VIEWS={
    testing:['◫','Testing IA'],
    niches:['⌘','Nichos & Hooks'],
    concepts:['◇','Conceptos+'],
    angles:['↗','Ángulos'],
    avatars:['◎','Avatares'],
    learnings:['✦','Aprendizajes']
  };
  const TITLES={
    testing:'Testing Intelligence',
    niches:'Inteligencia por nicho',
    concepts:'Concept Library',
    angles:'Ángulos de venta',
    avatars:'Avatar Intelligence',
    learnings:'Aprendizajes'
  };
  const NODE_TYPES=[
    ['avatar','Avatar'],
    ['concept','Concepto'],
    ['sales_angle','Ángulo de venta'],
    ['text_hook','Texto / Hook'],
    ['visual_hook','Hook visual'],
    ['background','Fondo / escenario'],
    ['audio','Audio / SFX'],
    ['product_demo','Demostración'],
    ['bridge_text','Bridge / copy'],
    ['cta','CTA / Payoff'],
    ['format','Formato / cámara']
  ];

  let activeView=sessionStorage.getItem('creativeos_ci_view')||null;
  let selectedNiche=sessionStorage.getItem('creativeos_ci_niche')||'running';
  let selectedProductId=sessionStorage.getItem('creativeos_ci_product')||null;
  let selectedWorkflowId=sessionStorage.getItem('creativeos_ci_workflow')||null;
  let workflowDraft=null;
  let snapshot=null,loading=false,loadError=null;

  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const low=v=>String(v||'').toLowerCase();
  const fmt=n=>n===null||n===undefined||n===''?'—':Number(n).toLocaleString('es-ES');
  const slugify=v=>low(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
  const deep=v=>JSON.parse(JSON.stringify(v));
  const today=()=>new Date().toISOString().slice(0,10);

  async function post(body){
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.error||d.ok===false) throw new Error(d.detail||d.error||`HTTP ${r.status}`);
    return d.data;
  }
  async function fetchSnapshot(){
    const r=await fetch(`${API}?resource=snapshot`,{cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.error||d.ok===false) throw new Error(d.detail||d.error||`HTTP ${r.status}`);
    return d.data||{};
  }
  async function refresh(){
    if(loading) return snapshot;
    loading=true; loadError=null; render();
    try{snapshot=await fetchSnapshot();}
    catch(e){loadError=String(e?.message||e);}
    finally{loading=false; render();}
    return snapshot;
  }

  function inferNiches(p){
    if(Array.isArray(p?.nicheSlugs)&&p.nicheSlugs.length) return p.nicheSlugs;
    const t=low(`${p?.id} ${p?.name} ${p?.label} ${p?.brief}`);
    const out=[];
    if(/dog|perro|paw|orejer|mascota/.test(t))out.push('perros');
    if(/run|trail|stride|dedo|basket|sport/.test(t))out.push('running');
    if(/baby|beb|portabeb|madre|padre/.test(t))out.push('bebes');
    if(/flower|flor|botan/.test(t))out.push('flores');
    if(/hiking|sender|montaña|outdoor/.test(t))out.push('hiking-outdoor');
    if(/camera|cámara|headphone|auricular|gym/.test(t))out.push('tech-fitness');
    return out.length?[...new Set(out)]:['general'];
  }
  function productsForNiche(n){return(snapshot?.products||[]).filter(p=>inferNiches(p).includes(n));}
  function nicheName(slug){return(snapshot?.niches||[]).find(n=>n.slug===slug)?.name||slug||'Global';}
  function productById(id){return(snapshot?.products||[]).find(p=>p.id===id)||null;}
  function productWorkflows(id){return(snapshot?.workflows||[]).filter(w=>w.product_id===id);}
  function productLogs(id){return(snapshot?.dailyLogs||[]).filter(l=>l.product_id===id).sort((a,b)=>String(b.log_date).localeCompare(String(a.log_date)));}
  function productResults(id){return(snapshot?.results||[]).filter(r=>r.product_id===id);}

  function combinedConcepts(){
    const arr=[...(snapshot?.concepts||[])];
    const seen=new Set(arr.map(c=>c.metadata?.sourceConceptId).filter(Boolean));
    for(const c of snapshot?.conceptsLegacy||[]){
      if(seen.has(c.id)) continue;
      arr.push({
        slug:slugify(c.name||c.id),name:c.name,description:c.desc||'',niches:[low(c.category)==='pets'?'perros':low(c.category)==='sport'?'running':low(c.category)==='babies'?'bebes':'general'],
        uses_count:c.uses||0,wins_count:0,avg_views:c.avgViews||0,best_views:c.bestViews||0,
        metadata:{sourceConceptId:c.id,legacy:true,source:c.source||'legacy'},legacy:c
      });
    }
    return arr;
  }

  function productAvatarRows(){
    const out=[];
    for(const p of snapshot?.products||[]){
      const niches=inferNiches(p);
      const imgs=(p.assets||[]).filter(a=>low(a.type).includes('avatar')&&(a.publicUrl||a.url||a.src));
      for(const a of p.avatars||[]){
        const img=imgs.find(x=>low(x.name).includes(low(a.name).split(' ')[0]))||imgs[0]||null;
        out.push({id:a.id,product_id:p.id,name:a.name,image_url:img?.publicUrl||img?.url||img?.src||null,description:[a.role,a.segment].filter(Boolean).join(' · '),niche_slugs:niches,uses_count:0,wins_count:0,best_views:0,avg_views:0,best_concepts:[],best_angles:a.angle?[a.angle]:[],ai_hypothesis:null,metadata:{legacy:true}});
      }
      if(!(p.avatars||[]).length) for(const a of imgs) out.push({id:a.id,product_id:p.id,name:a.name,image_url:a.publicUrl||a.url||a.src,description:'Asset de avatar',niche_slugs:niches,uses_count:0,wins_count:0,best_views:0,avg_views:0,best_concepts:[],best_angles:[],ai_hypothesis:null,metadata:{legacy:true}});
    }
    const map=new Map(out.map(x=>[x.id,x]));
    for(const a of snapshot?.avatars||[]) map.set(a.id,{...map.get(a.id),...a});
    return [...map.values()];
  }

  function nativeContent(){return document.querySelector('.main > .content');}
  function ensureShell(){
    const nav=document.querySelector('.sidebar .nav'),main=document.querySelector('.main');
    if(!nav||!main)return false;
    let created=false;
    if(!document.getElementById('ciNavGroup')){
      const g=document.createElement('div');g.id='ciNavGroup';g.className='ci-nav-group';
      g.innerHTML=`
        <div class="ci-nav-label">Intelligence</div>
        <button class="ci-nav-btn route-testing" data-ci-route="testing"><span class="ci-nav-ico">◫</span><span>Testing IA</span></button>
        <div class="ci-nav-label ci-nav-sub">Biblioteca</div>
        ${['niches','concepts','angles','avatars','learnings'].map(k=>`<button class="ci-nav-btn route-${k}" data-ci-route="${k}"><span class="ci-nav-ico">${VIEWS[k][0]}</span><span>${VIEWS[k][1]}</span></button>`).join('')}
      `;
      nav.insertAdjacentElement('afterend',g);created=true;
    }
    if(!document.getElementById('ciHost')){
      const h=document.createElement('div');h.id='ciHost';h.className='ci-host';main.appendChild(h);created=true;
    }
    if(activeView&&created){
      const native=nativeContent();if(native)native.style.display='none';
      const host=document.getElementById('ciHost');host?.classList.add('active');
      document.querySelectorAll('.ci-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.ciRoute===activeView));
      render();
    }
    return true;
  }
  function activate(view,load=true){
    if(!VIEWS[view])return;
    activeView=view;sessionStorage.setItem('creativeos_ci_view',view);ensureShell();
    const native=nativeContent();if(native)native.style.display='none';
    const host=document.getElementById('ciHost');if(host){host.classList.add('active');host.dataset.ciView=view;}
    document.querySelectorAll('.ci-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.ciRoute===view));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    const title=document.querySelector('.page-title');if(title)title.textContent=TITLES[view]||'CreativeOS Intelligence';
    const crumb=document.querySelector('.breadcrumb');if(crumb)crumb.textContent='CreativeOS Intelligence';
    render();if(load&&!snapshot)refresh();
  }
  function deactivate(){
    activeView=null;sessionStorage.removeItem('creativeos_ci_view');selectedProductId=null;selectedWorkflowId=null;workflowDraft=null;
    const host=document.getElementById('ciHost');if(host){host.classList.remove('active');host.innerHTML='';delete host.dataset.ciView;}
    const native=nativeContent();if(native)native.style.display='';
    document.querySelectorAll('.ci-nav-btn').forEach(b=>b.classList.remove('active'));
  }

  const hero=(title,sub,extra='')=>`<div class="ci-hero"><div><div class="ci-eyebrow">CreativeOS Intelligence</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div><div class="ci-actions">${extra}<button class="ci-btn" data-ci-refresh>↻ Actualizar data</button></div></div>`;
  const badge=(text,cls='')=>`<span class="ci-badge ${cls}">${esc(text)}</span>`;
  const section=(title,sub='')=>`<div class="ci-section"><div><h2>${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}</div></div>`;
  const sourceBadge=source=>{
    const s=String(source||'manual');
    if(s==='user-confirmed-test'||s==='tested_by_user')return badge('Testeado por ti','source-tested');
    if(s==='saved-working-concept'||s==='saved')return badge('Guardado / en test','source-saved');
    if(s==='research'||s==='research-pattern'||s==='chat_learning')return badge('Research','source-research');
    if(s==='ai_hypothesis')return badge('Hipótesis IA','source-ai');
    return badge('Manual','source-manual');
  };

  function metricSummary(p){
    const logs=productLogs(p.id);
    if(logs.length){
      return{
        videos:logs.reduce((s,l)=>s+Number(l.videos_published||0),0),
        views:logs.some(l=>l.total_views!==null)?logs.reduce((s,l)=>s+Number(l.total_views||0),0):null,
        best:logs.some(l=>l.best_views!==null)?Math.max(...logs.map(l=>Number(l.best_views||0))):null,
        sales:logs.some(l=>l.sales!==null)?logs.reduce((s,l)=>s+Number(l.sales||0),0):null,
        loggedDays:logs.length
      };
    }
    const val=k=>p[k]===null||p[k]===undefined?null:Number(p[k]);
    return{videos:val('published'),views:val('views'),best:val('bestViews'),sales:val('sales'),loggedDays:0};
  }

  function qualityFor(p){
    const logs=productLogs(p.id),wfs=productWorkflows(p.id),results=productResults(p.id);
    const populatedNodes=wfs.flatMap(w=>w.nodes||[]).filter(n=>String(n.value||'').trim());
    const types=new Set(populatedNodes.map(n=>n.type));
    const duration=Math.min(100,Math.round(Number(p.day||0)/Math.max(1,Number(p.testMax||7))*100));
    const data=Math.min(100,Math.round((logs.length/3)*60+(results.length/3)*40));
    const workflow=Math.min(100,Math.round((wfs.length/3)*60+(types.size/6)*40));
    const score=Math.round(duration*.25+data*.4+workflow*.35);
    return{score,duration,data,workflow,label:logs.length===0&&results.length===0?'Datos insuficientes':score>=75?'Cobertura alta':score>=45?'Cobertura media':'Cobertura baja'};
  }

  function nextFocus(p){
    const q=qualityFor(p),wfs=productWorkflows(p.id),logs=productLogs(p.id);
    if(!logs.length)return'Registrar el primer lote diario';
    if(!wfs.length)return'Crear un workflow de vídeo';
    if(Number(p.day||0)>Number(p.testMax||7)&&q.data<60)return'Test extendido: ordenar resultados';
    if(q.workflow<60)return'Abrir una nueva variable creativa';
    return'Revisar qué combinación está ganando';
  }

  function testingPage(){
    if(selectedProductId&&productById(selectedProductId)) return testingProductPage(productById(selectedProductId));
    const ps=snapshot?.products||[];
    const active=ps.filter(p=>['Testing','Preparing'].includes(p.status)).length;
    const extended=ps.filter(p=>Number(p.day||0)>Number(p.testMax||7)).length;
    const cards=ps.map(p=>{
      const m=metricSummary(p),q=qualityFor(p),niches=inferNiches(p);
      return`<button class="ci-test-product-card product-${esc(p.id)}" data-ci-test-product="${esc(p.id)}">
        <div class="ci-test-product-top"><div><span class="ci-product-kicker">${esc(p.label||'Producto')}</span><h3>${esc(p.name)}</h3></div>${badge(p.status||'—','good')}</div>
        <div class="ci-test-day"><b>Día ${fmt(p.day)}</b><span>${Number(p.day||0)>Number(p.testMax||7)?'Test extendido':`de ${fmt(p.testMax||7)}`}</span></div>
        <div class="ci-product-mini-metrics">
          <span><b>${fmt(m.videos)}</b><small>vídeos</small></span>
          <span><b>${fmt(m.views)}</b><small>views</small></span>
          <span><b>${fmt(m.best)}</b><small>mejor vídeo</small></span>
          <span><b>${fmt(m.sales)}</b><small>ventas</small></span>
        </div>
        <div class="ci-quality-row"><div><strong>${q.label}</strong><small>Test Quality ${q.score}%</small></div><div class="ci-meter"><i style="width:${q.score}%"></i></div></div>
        <div class="ci-chip-row">${niches.map(n=>`<span class="ci-chip">${esc(nicheName(n))}</span>`).join('')}</div>
        <div class="ci-next-focus"><span>Siguiente foco</span><b>${esc(nextFocus(p))}</b></div>
      </button>`;
    }).join('');
    return`${hero('Testing Intelligence','Un producto = un sistema de test. Entra para registrar lotes diarios, construir workflows y entender qué variable creativa estás probando.')}
      <div class="ci-overview-strip">
        <div><b>${active}</b><span>productos activos</span></div>
        <div><b>${extended}</b><span>tests extendidos</span></div>
        <div><b>${ps.filter(p=>productLogs(p.id).length===0).length}</b><span>sin lote diario registrado</span></div>
      </div>
      <div class="ci-testing-grid">${cards||'<div class="ci-empty">Sin productos activos.</div>'}</div>`;
  }

  function testingProductPage(p){
    const m=metricSummary(p),q=qualityFor(p),logs=productLogs(p.id),wfs=productWorkflows(p.id),results=productResults(p.id);
    if(selectedWorkflowId&&!wfs.some(w=>w.id===selectedWorkflowId)&&!workflowDraft)selectedWorkflowId=null;
    if(!selectedWorkflowId&&!workflowDraft&&wfs.length){selectedWorkflowId=wfs[0].id;sessionStorage.setItem('creativeos_ci_workflow',selectedWorkflowId);}
    const wf=workflowDraft||(selectedWorkflowId?wfs.find(x=>x.id===selectedWorkflowId):null);
    const historical=p.historicalOrders?`<div class="ci-historical-note">Dato histórico separado del test actual: <b>${fmt(p.historicalOrders)} pedidos reportados</b>.</div>`:'';
    return`
      <div class="ci-product-detail-head">
        <button class="ci-back" data-ci-testing-back>← Testing IA</button>
        <div class="ci-product-title-row"><div><span class="ci-product-kicker">${esc(p.label||'Producto')}</span><h1>${esc(p.name)}</h1><p>${esc(p.brief||'')}</p></div><div>${badge(p.status||'Testing','good')} ${badge(`Día ${p.day||0}`,'ai')}</div></div>
      </div>
      <div class="ci-product-stat-grid">
        ${productStat('Vídeos publicados',m.videos,'Desde lotes diarios','videos')}
        ${productStat('Views registradas',m.views,'Solo data introducida','views')}
        ${productStat('Mejor vídeo',m.best,'Máximo registrado','best')}
        ${productStat('Ventas',m.sales,'Atribuidas al test','sales')}
      </div>
      ${historical}
      <div class="ci-grid two ci-quality-grid">
        <div class="ci-card pad">
          <div class="ci-card-head"><div><h3>Test Quality</h3><p>Mide calidad y cobertura de la data, no si el producto es ganador.</p></div><strong class="ci-quality-big">${q.score}%</strong></div>
          ${qualityBar('Duración del test',q.duration)}
          ${qualityBar('Data registrada',q.data)}
          ${qualityBar('Workflow creativo',q.workflow)}
          <div class="ci-quality-explain">${q.label}. ${logs.length?'Hay data diaria registrada.':'Todavía no hay lotes diarios: no se inferirán métricas.'}</div>
        </div>
        <div class="ci-card pad">
          <div class="ci-card-head"><div><h3>Estado del test</h3><p>Qué sabemos realmente ahora.</p></div>${badge(nextFocus(p),'ai')}</div>
          <div class="ci-fact-list">
            <div><span>Día actual</span><b>${fmt(p.day)}</b></div>
            <div><span>Workflows guardados</span><b>${wfs.length}</b></div>
            <div><span>Lotes diarios</span><b>${logs.length}</b></div>
            <div><span>Resultados individuales</span><b>${results.length}</b></div>
            <div><span>Conceptos confirmados</span><b>${fmt(p.conceptsTested||0)}</b></div>
          </div>
        </div>
      </div>
      ${dailyLogSection(p,logs)}
      ${workflowSection(p,wfs,wf)}
    `;
  }

  function productStat(label,value,sub,cls){return`<div class="ci-product-stat ${cls}"><span>${esc(label)}</span><b>${fmt(value)}</b><small>${esc(value===null||value===undefined?'Sin registrar':sub)}</small></div>`;}
  function qualityBar(label,value){return`<div class="ci-quality-line"><div><span>${esc(label)}</span><b>${value}%</b></div><div class="ci-meter"><i style="width:${value}%"></i></div></div>`;}

  function dailyLogSection(p,logs){
    const rows=logs.slice(0,14).map(l=>`<div class="ci-log-row">
      <div><b>${esc(l.log_date)}</b><small>${esc(l.notes||'')}</small></div>
      <span>${fmt(l.videos_published)} vídeos</span><span>${fmt(l.total_views)} views</span><span>${fmt(l.best_views)} best</span><span>${fmt(l.sales)} ventas</span>
      <button class="ci-icon-btn danger" data-ci-delete-log="${esc(l.id)}" title="Eliminar">×</button>
    </div>`).join('');
    return`${section('Registro diario por lote','No metas vídeo por vídeo. Registra el total del día y CreativeOS calcula el acumulado.')}
      <div class="ci-card pad ci-daily-log-card">
        <div class="ci-daily-form">
          <label>Fecha<input id="ciLogDate" type="date" value="${today()}"></label>
          <label>Vídeos publicados<input id="ciLogVideos" type="number" min="0" placeholder="Ej. 3"></label>
          <label>Views del lote<input id="ciLogViews" type="number" min="0" placeholder="Ej. 12400"></label>
          <label>Mejor vídeo<input id="ciLogBest" type="number" min="0" placeholder="Ej. 7800"></label>
          <label>Ventas<input id="ciLogSales" type="number" min="0" placeholder="Ej. 2"></label>
          <label class="wide">Notas<input id="ciLogNotes" type="text" placeholder="Qué cambiaste hoy, qué señal viste..."></label>
          <button class="ci-btn primary" data-ci-save-log="${esc(p.id)}">Guardar lote del día</button>
        </div>
        <div class="ci-log-list">${rows||'<div class="ci-empty">Todavía no hay lotes diarios. Las métricas quedan en blanco hasta que introduzcas data real.</div>'}</div>
      </div>`;
  }

  function workflowSection(p,wfs,wf){
    const cards=wfs.map(w=>`<button class="ci-wf-card ${selectedWorkflowId===w.id&&!workflowDraft?'active':''}" data-ci-workflow="${esc(w.id)}">
      <div><span class="ci-wf-status ${esc(w.status||'draft')}">${esc(workflowStatusLabel(w.status))}</span><h4>${esc(w.name)}</h4><p>${esc(w.notes||'')}</p></div>
      <div class="ci-wf-node-count">${(w.nodes||[]).length} bloques</div>
    </button>`).join('');
    return`${section('Video Workflow Lab','Desglosa el ADN de cada vídeo: avatar, concepto, ángulo, texto, visual, fondo, audio y payoff. Puedes reutilizar cualquier workflow después.')}
      <div class="ci-workflow-shell">
        <div class="ci-workflow-sidebar">
          <div class="ci-card-head"><div><h3>Workflows del producto</h3><p>${wfs.length} guardados</p></div><button class="ci-btn primary" data-ci-new-workflow="${esc(p.id)}">+ Workflow</button></div>
          <div class="ci-wf-list">${cards||'<div class="ci-empty">Crea el primer workflow de este producto.</div>'}</div>
        </div>
        <div class="ci-workflow-main">${wf?workflowEditor(p,wf):'<div class="ci-workflow-empty"><b>Selecciona o crea un workflow</b><span>Aquí aparecerá el desglose completo del vídeo.</span></div>'}</div>
      </div>`;
  }

  function workflowStatusLabel(s){return s==='tested'?'Testeado':s==='testing'?'En test':s==='planned'?'Planificado':'Borrador';}
  function nodeLabel(type){return NODE_TYPES.find(x=>x[0]===type)?.[1]||type||'Bloque';}

  function workflowEditor(p,w){
    const nodes=(w.nodes||[]).map((n,i)=>`<div class="ci-wf-node" data-node-index="${i}" data-node-type="${esc(n.type||'custom')}">
      <div class="ci-wf-node-head"><span>${esc(n.label||nodeLabel(n.type))}</span><div><button data-ci-node-up="${i}" title="Subir">↑</button><button data-ci-node-down="${i}" title="Bajar">↓</button><button class="danger" data-ci-node-delete="${i}" title="Quitar">×</button></div></div>
      <textarea class="ci-wf-node-value" data-node-value="${i}" placeholder="Escribe el contenido de este bloque...">${esc(n.value||'')}</textarea>
    </div>`).join('');
    const suggestions=workflowSuggestions(p);
    return`<div class="ci-workflow-editor">
      <div class="ci-workflow-editor-head">
        <div class="ci-workflow-name-fields">
          <input id="ciWorkflowName" value="${esc(w.name||'')}" placeholder="Nombre del workflow">
          <select id="ciWorkflowStatus">
            ${['draft','planned','testing','tested'].map(s=>`<option value="${s}" ${w.status===s?'selected':''}>${workflowStatusLabel(s)}</option>`).join('')}
          </select>
        </div>
        <div class="ci-actions">
          <button class="ci-btn danger" data-ci-delete-workflow="${esc(w.id)}">Eliminar</button>
          <button class="ci-btn primary" data-ci-save-workflow="${esc(w.id)}" data-product="${esc(p.id)}">Guardar workflow</button>
        </div>
      </div>
      <textarea id="ciWorkflowNotes" class="ci-workflow-notes" placeholder="Qué estás aprendiendo o qué quieres probar...">${esc(w.notes||'')}</textarea>
      <div class="ci-wf-canvas">${nodes||'<div class="ci-wf-drop-empty">Añade bloques desde abajo para construir el workflow.</div>'}</div>
      <div class="ci-wf-builder">
        <div><h4>Añadir bloque</h4><p>Clica y aparece directamente en el workflow.</p></div>
        <div class="ci-wf-palette">${NODE_TYPES.map(([type,label])=>`<button data-ci-add-node="${type}">+ ${esc(label)}</button>`).join('')}</div>
      </div>
      <div class="ci-wf-library">
        <div><h4>Añadir desde tu biblioteca</h4><p>Datos ya guardados para este producto/nicho.</p></div>
        <div class="ci-wf-suggestions">${suggestions||'<span class="ci-meta">Todavía no hay elementos reutilizables.</span>'}</div>
      </div>
    </div>`;
  }

  function workflowSuggestions(p){
    const niches=inferNiches(p);
    const items=[];
    for(const a of productAvatarRows().filter(x=>x.product_id===p.id)) items.push(['avatar',a.name,'Avatar']);
    for(const c of combinedConcepts().filter(c=>(c.niches||[]).some(n=>niches.includes(n))).slice(0,8)) items.push(['concept',c.name,'Concepto']);
    for(const a of (snapshot?.angles||[]).filter(a=>(a.niches||[]).some(n=>niches.includes(n))).slice(0,8)) items.push(['sales_angle',a.name,'Ángulo']);
    for(const h of (snapshot?.hooks||[]).filter(h=>h.product_id===p.id||niches.includes(h.niche_slug)).slice(0,10)) items.push(['text_hook',h.text,'Hook']);
    return items.slice(0,24).map(([type,value,label])=>`<button data-ci-add-suggestion data-type="${esc(type)}" data-value="${esc(value)}"><span>${esc(label)}</span>${esc(value)}</button>`).join('');
  }

  function nichePage(){
    const ns=(snapshot?.niches||[]).filter(n=>n.slug!=='mascotas');
    if(!ns.some(n=>n.slug===selectedNiche))selectedNiche=ns.find(n=>productsForNiche(n.slug).length)?.slug||ns[0]?.slug||'running';
    const cards=ns.map(n=>{
      const hooks=(snapshot?.hooks||[]).filter(h=>h.niche_slug===n.slug).length;
      const patterns=(snapshot?.patterns||[]).filter(p=>(p.niches||[]).includes(n.slug)).length;
      const concepts=combinedConcepts().filter(c=>(c.niches||[]).includes(n.slug)).length;
      const products=productsForNiche(n.slug).length;
      return`<div class="ci-card pad ci-niche ${selectedNiche===n.slug?'active':''}" data-ci-niche="${esc(n.slug)}"><h3>${esc(n.name)}</h3><p>${esc(n.description||'Biblioteca de inteligencia creativa')}</p><div class="ci-niche-counts"><span class="ci-kpi"><b>${products}</b> productos</span><span class="ci-kpi"><b>${patterns}</b> patrones</span><span class="ci-kpi"><b>${hooks}</b> hooks</span><span class="ci-kpi"><b>${concepts}</b> conceptos</span></div></div>`;
    }).join('');
    const patterns=(snapshot?.patterns||[]).filter(p=>(p.niches||[]).includes(selectedNiche));
    const hooks=(snapshot?.hooks||[]).filter(h=>h.niche_slug===selectedNiche);
    const angles=(snapshot?.angles||[]).filter(a=>(a.niches||[]).includes(selectedNiche));
    const concepts=combinedConcepts().filter(c=>(c.niches||[]).includes(selectedNiche));
    const learnings=(snapshot?.learnings||[]).filter(l=>l.niche_slug===selectedNiche).slice(0,8);
    return`${hero('Inteligencia por nicho','Research, patrones y datos propios separados claramente. Nada se considera ganador sin rendimiento registrado.')}
      <div class="ci-grid three">${cards}</div>
      ${section(`${nicheName(selectedNiche)} · Estructuras de texto`,'Patrones reutilizables. Research no equivale a test propio.')}
      <div class="ci-grid two">
        <div class="ci-card"><div class="ci-card-head"><div><h3>Patrones</h3><p>Mecanismos de copy reutilizables.</p></div>${badge(`${patterns.length}`,'source-research')}</div>
          ${patterns.map(p=>`<div class="ci-pattern"><div class="ci-list-top"><b>${esc(p.name)}</b>${sourceBadge(p.metadata?.classification||'research')}</div><div class="ci-template">${esc(p.template)}</div><div class="ci-meta">${esc(p.description||'')}</div></div>`).join('')||'<div class="ci-empty">Sin patrones.</div>'}
        </div>
        <div class="ci-card"><div class="ci-card-head"><div><h3>Hooks guardados</h3><p>Etiqueta clara de origen.</p></div>${badge(`${hooks.length}`)}</div>
          <div class="ci-list">${hooks.map(h=>`<div class="ci-list-item"><div class="ci-list-top"><b>${esc(h.text)}</b>${sourceBadge(h.source_type)}</div><p>${[h.hook_type,h.emotion,(h.keywords||[]).join(', ')].filter(Boolean).join(' · ')||'Sin clasificación'}</p>${h.views!=null?`<div class="ci-meta">${fmt(h.views)} views registradas</div>`:'<div class="ci-meta">Sin rendimiento registrado</div>'}</div>`).join('')||'<div class="ci-empty">Aún no hay hooks guardados.</div>'}</div>
        </div>
      </div>
      ${section('Mapa del nicho','Conceptos y ángulos guardados; el origen indica si están testeados o solo preparados.')}
      <div class="ci-grid two">
        <div class="ci-card"><div class="ci-card-head"><h3>Conceptos</h3>${badge(`${concepts.length}`)}</div><div class="ci-list">${concepts.map(c=>`<div class="ci-list-item"><div class="ci-list-top"><b>${esc(c.name)}</b>${sourceBadge(c.metadata?.source)}</div><p>${esc(c.description||'')}</p></div>`).join('')||'<div class="ci-empty">Sin conceptos.</div>'}</div></div>
        <div class="ci-card"><div class="ci-card-head"><h3>Ángulos</h3>${badge(`${angles.length}`)}</div><div class="ci-list">${angles.map(a=>`<div class="ci-list-item"><div class="ci-list-top"><b>${esc(a.name)}</b>${sourceBadge(a.metadata?.source)}</div><p>${esc(a.description||'')}</p></div>`).join('')||'<div class="ci-empty">Sin ángulos.</div>'}</div></div>
      </div>
      ${section('Aprendizajes del nicho','Manual, data e hipótesis IA permanecen separados.')}
      <div class="ci-card"><div class="ci-list">${learnings.map(learningItem).join('')||'<div class="ci-empty">Sin aprendizajes todavía.</div>'}</div></div>`;
  }

  function conceptsPage(){
    const cs=combinedConcepts().sort((a,b)=>Number(b.uses_count||0)-Number(a.uses_count||0));
    return`${hero('Concept Library','Biblioteca reusable. Los usos solo cuentan cuando están registrados; las ideas guardadas no se presentan como ganadoras.')}
      <div class="ci-library-summary"><b>${cs.length}</b><span>conceptos guardados</span><i></i><b>${cs.filter(c=>c.metadata?.source==='user-confirmed-test').length}</b><span>confirmados como testeados</span></div>
      <div class="ci-grid three">${cs.map(c=>`<div class="ci-card pad"><div class="ci-list-top"><h3>${esc(c.name)}</h3>${sourceBadge(c.metadata?.source)}</div><p>${esc(c.description||'')}</p><div class="ci-concept-metrics"><span><b>${fmt(c.uses_count||0)}</b> usos</span><span><b>${fmt(c.wins_count||0)}</b> wins</span><span><b>${c.avg_views?fmt(c.avg_views):'—'}</b> avg views</span><span><b>${c.best_views?fmt(c.best_views):'—'}</b> best</span></div><div class="ci-chip-row">${(c.niches||[]).map(n=>`<span class="ci-chip">${esc(nicheName(n))}</span>`).join('')}</div></div>`).join('')||'<div class="ci-empty">Sin conceptos.</div>'}</div>`;
  }

  function anglesPage(){
    const arr=snapshot?.angles||[];
    return`${hero('Ángulos de venta','Qué problema, deseo o motivación estás vendiendo. Separado del concepto visual.')}
      <div class="ci-grid three">${arr.map(a=>`<div class="ci-card pad"><div class="ci-list-top"><h3>${esc(a.name)}</h3>${sourceBadge(a.metadata?.source)}</div><p>${esc(a.description||'')}</p><div class="ci-concept-metrics"><span><b>${fmt(a.uses_count||0)}</b> usos</span><span><b>${fmt(a.wins_count||0)}</b> wins</span><span><b>${a.best_views?fmt(a.best_views):'—'}</b> best</span></div><div class="ci-chip-row">${(a.niches||[]).map(n=>`<span class="ci-chip">${esc(nicheName(n))}</span>`).join('')}</div></div>`).join('')||'<div class="ci-empty">Sin ángulos.</div>'}</div>`;
  }

  function avatarsPage(){
    const arr=productAvatarRows();
    return`${hero('Avatar Intelligence','Qué tipo de persona aparece, en qué producto y qué rendimiento tiene. La explicación causal se marca siempre como hipótesis.')}
      <div class="ci-grid three">${arr.map(a=>`<div class="ci-card pad ci-avatar">${a.image_url?`<img class="ci-avatar-img" src="${esc(a.image_url)}" alt="">`:'<div class="ci-avatar-placeholder">◎</div>'}<div class="ci-list-top"><b>${esc(a.name)}</b>${badge(productById(a.product_id)?.name||'Sin producto')}</div><p>${esc(a.description||'')}</p><div class="ci-concept-metrics"><span><b>${fmt(a.uses_count||0)}</b> usos</span><span><b>${fmt(a.wins_count||0)}</b> wins</span><span><b>${a.best_views?fmt(a.best_views):'—'}</b> best</span></div>${a.ai_hypothesis?`<div class="ci-ai-note"><b>Hipótesis IA</b>${esc(a.ai_hypothesis)}</div>`:''}</div>`).join('')||'<div class="ci-empty">Todavía no hay avatares intelligence.</div>'}</div>`;
  }

  function learningItem(l){
    const cls=l.kind==='data_insight'?'source-tested':l.kind==='ai_hypothesis'?'source-ai':'source-manual';
    const label=l.kind==='data_insight'?'Insight de datos':l.kind==='ai_hypothesis'?'Hipótesis IA':'Aprendizaje tuyo';
    return`<div class="ci-list-item"><div class="ci-list-top"><b>${esc(l.title)}</b>${badge(label,cls)}</div><p>${esc(l.body||'')}</p><div class="ci-meta">${[l.niche_slug?nicheName(l.niche_slug):'',l.product_id?productById(l.product_id)?.name:''].filter(Boolean).join(' · ')}</div></div>`;
  }
  function learningsPage(){
    const arr=snapshot?.learnings||[];
    const counts={manual:arr.filter(x=>x.kind==='manual').length,data:arr.filter(x=>x.kind==='data_insight').length,ai:arr.filter(x=>x.kind==='ai_hypothesis').length};
    return`${hero('Aprendizajes','La memoria estructurada del negocio: lo que sabes, lo que muestran los datos y lo que todavía es hipótesis.')}
      <div class="ci-overview-strip learning"><div><b>${counts.manual}</b><span>tuyos</span></div><div><b>${counts.data}</b><span>insights de datos</span></div><div><b>${counts.ai}</b><span>hipótesis IA</span></div></div>
      <div class="ci-card"><div class="ci-list">${arr.map(learningItem).join('')||'<div class="ci-empty">Sin aprendizajes todavía.</div>'}</div></div>`;
  }

  function render(){
    ensureShell();
    const host=document.getElementById('ciHost');if(!host||!activeView)return;
    host.dataset.ciView=activeView;
    if(loading&&!snapshot){host.innerHTML='<div class="ci-loading">Cargando Intelligence…</div>';return;}
    if(loadError&&!snapshot){host.innerHTML=`<div class="ci-error"><b>No se pudo cargar Intelligence</b><span>${esc(loadError)}</span><button class="ci-btn" data-ci-refresh>Reintentar</button></div>`;return;}
    const pages={testing:testingPage,niches:nichePage,concepts:conceptsPage,angles:anglesPage,avatars:avatarsPage,learnings:learningsPage};
    host.innerHTML=(pages[activeView]||testingPage)();
    requestAnimationFrame(()=>document.dispatchEvent(new CustomEvent('creativeos:intelligence-render')));
  }

  function captureWorkflowFromDom(){
    if(!workflowDraft&&selectedWorkflowId){
      const w=productWorkflows(selectedProductId).find(x=>x.id===selectedWorkflowId);
      if(w)workflowDraft=deep(w);
    }
    if(!workflowDraft)return;
    workflowDraft.name=document.getElementById('ciWorkflowName')?.value?.trim()||workflowDraft.name||'Workflow';
    workflowDraft.status=document.getElementById('ciWorkflowStatus')?.value||workflowDraft.status||'draft';
    workflowDraft.notes=document.getElementById('ciWorkflowNotes')?.value||'';
    workflowDraft.nodes=[...document.querySelectorAll('.ci-wf-node')].map(el=>{
      const i=Number(el.dataset.nodeIndex||0),old=workflowDraft.nodes?.[i]||{};
      return{...old,type:el.dataset.nodeType||old.type||'custom',label:old.label||nodeLabel(el.dataset.nodeType),value:el.querySelector('.ci-wf-node-value')?.value||''};
    });
  }
  function beginWorkflow(id){
    const w=productWorkflows(selectedProductId).find(x=>x.id===id);if(!w)return;
    selectedWorkflowId=id;sessionStorage.setItem('creativeos_ci_workflow',id);workflowDraft=deep(w);render();
  }
  function newWorkflow(productId){
    selectedProductId=productId;const id=`wf-${productId}-${Date.now().toString(36)}`;
    selectedWorkflowId=id;workflowDraft={id,product_id:productId,name:'Nuevo workflow',status:'draft',nodes:[],notes:'',source_type:'manual'};sessionStorage.setItem('creativeos_ci_workflow',id);render();
  }
  function addNode(type,value=''){
    captureWorkflowFromDom();if(!workflowDraft)return;
    workflowDraft.nodes=workflowDraft.nodes||[];workflowDraft.nodes.push({type,label:nodeLabel(type),value});render();
  }
  function moveNode(index,delta){
    captureWorkflowFromDom();if(!workflowDraft)return;
    const arr=workflowDraft.nodes||[],to=index+delta;if(to<0||to>=arr.length)return;
    [arr[index],arr[to]]=[arr[to],arr[index]];render();
  }
  function deleteNode(index){captureWorkflowFromDom();if(!workflowDraft)return;workflowDraft.nodes.splice(index,1);render();}
  async function saveWorkflow(productId){
    captureWorkflowFromDom();if(!workflowDraft)return;
    if(!workflowDraft.name.trim())throw new Error('Pon un nombre al workflow.');
    await post({action:'upsert_workflow',...workflowDraft,product_id:productId});
    workflowDraft=null;await refresh();selectedWorkflowId=sessionStorage.getItem('creativeos_ci_workflow')||selectedWorkflowId;render();toast('Workflow guardado');
  }
  async function deleteWorkflow(id){
    if(!confirm('¿Eliminar este workflow?'))return;
    await post({action:'delete_workflow',id});workflowDraft=null;selectedWorkflowId=null;sessionStorage.removeItem('creativeos_ci_workflow');await refresh();toast('Workflow eliminado');
  }
  async function saveDailyLog(productId){
    const date=document.getElementById('ciLogDate')?.value||today();
    const videos=document.getElementById('ciLogVideos')?.value;
    if(videos===''||videos===undefined)throw new Error('Indica cuántos vídeos publicaste ese día.');
    const num=id=>{const v=document.getElementById(id)?.value;return v===''||v===undefined?null:Number(v);};
    await post({action:'upsert_daily_log',product_id:productId,log_date:date,videos_published:Number(videos),total_views:num('ciLogViews'),best_views:num('ciLogBest'),sales:num('ciLogSales'),notes:document.getElementById('ciLogNotes')?.value?.trim()||null,tested_items:{}});
    await refresh();toast('Lote diario guardado');
  }
  async function deleteDailyLog(id){if(!confirm('¿Eliminar este lote diario?'))return;await post({action:'delete_daily_log',id});await refresh();toast('Lote eliminado');}

  function toast(text,kind='ok'){
    let host=document.getElementById('ciToastHost');if(!host){host=document.createElement('div');host.id='ciToastHost';host.className='ci-toast-host';document.body.appendChild(host);}
    const el=document.createElement('div');el.className=`ci-toast ${kind}`;el.textContent=text;host.appendChild(el);setTimeout(()=>el.remove(),2600);
  }
  async function guard(fn){try{await fn();}catch(e){toast(String(e?.message||e),'error');}}

  document.addEventListener('click',e=>{
    const route=e.target.closest?.('[data-ci-route]');if(route){e.preventDefault();selectedProductId=null;workflowDraft=null;activate(route.dataset.ciRoute);return;}
    if(e.target.closest?.('.nav-btn')){deactivate();return;}
    if(e.target.closest?.('[data-ci-refresh]')){e.preventDefault();refresh();return;}
    const niche=e.target.closest?.('[data-ci-niche]');if(niche&&!e.target.closest('[data-cix-edit]')){selectedNiche=niche.dataset.ciNiche;sessionStorage.setItem('creativeos_ci_niche',selectedNiche);render();return;}
    const product=e.target.closest?.('[data-ci-test-product]');if(product){selectedProductId=product.dataset.ciTestProduct;sessionStorage.setItem('creativeos_ci_product',selectedProductId);selectedWorkflowId=null;workflowDraft=null;render();return;}
    if(e.target.closest?.('[data-ci-testing-back]')){selectedProductId=null;selectedWorkflowId=null;workflowDraft=null;sessionStorage.removeItem('creativeos_ci_product');sessionStorage.removeItem('creativeos_ci_workflow');render();return;}
    const newW=e.target.closest?.('[data-ci-new-workflow]');if(newW){newWorkflow(newW.dataset.ciNewWorkflow);return;}
    const wf=e.target.closest?.('[data-ci-workflow]');if(wf){beginWorkflow(wf.dataset.ciWorkflow);return;}
    const add=e.target.closest?.('[data-ci-add-node]');if(add){addNode(add.dataset.ciAddNode);return;}
    const sug=e.target.closest?.('[data-ci-add-suggestion]');if(sug){addNode(sug.dataset.type,sug.dataset.value);return;}
    const up=e.target.closest?.('[data-ci-node-up]');if(up){moveNode(Number(up.dataset.ciNodeUp),-1);return;}
    const down=e.target.closest?.('[data-ci-node-down]');if(down){moveNode(Number(down.dataset.ciNodeDown),1);return;}
    const delNode=e.target.closest?.('[data-ci-node-delete]');if(delNode){deleteNode(Number(delNode.dataset.ciNodeDelete));return;}
    const saveW=e.target.closest?.('[data-ci-save-workflow]');if(saveW){guard(()=>saveWorkflow(saveW.dataset.product));return;}
    const delW=e.target.closest?.('[data-ci-delete-workflow]');if(delW){guard(()=>deleteWorkflow(delW.dataset.ciDeleteWorkflow));return;}
    const saveLog=e.target.closest?.('[data-ci-save-log]');if(saveLog){guard(()=>saveDailyLog(saveLog.dataset.ciSaveLog));return;}
    const delLog=e.target.closest?.('[data-ci-delete-log]');if(delLog){guard(()=>deleteDailyLog(delLog.dataset.ciDeleteLog));return;}
  },true);

  const mo=new MutationObserver(()=>{if(!document.getElementById('ciNavGroup')||!document.getElementById('ciHost'))ensureShell();});
  document.addEventListener('DOMContentLoaded',()=>{ensureShell();mo.observe(document.body,{childList:true,subtree:true});if(activeView)activate(activeView);},{once:true});
  if(document.body){ensureShell();mo.observe(document.body,{childList:true,subtree:true});if(activeView)setTimeout(()=>activate(activeView),30);}

  window.CreativeOSIntelligence={refresh,getSnapshot:()=>snapshot,post,render,activate,getSelectedProductId:()=>selectedProductId,version:'3.0'};
})();