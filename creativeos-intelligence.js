(() => {
  const API = 'https://naiglzmqpgucfbwfbvxt.supabase.co/functions/v1/creativeos-intelligence';
  const VIEWS = {
    testing: ['◫','Testing IA'],
    niches: ['⌘','Nichos & Hooks'],
    concepts: ['◇','Conceptos+'],
    angles: ['↗','Ángulos'],
    avatars: ['◎','Avatares'],
    learnings: ['✦','Aprendizajes']
  };
  const TITLES = {
    testing:'Testing Intelligence', niches:'Inteligencia por nicho', concepts:'Concept Library',
    angles:'Ángulos de venta', avatars:'Avatar Intelligence', learnings:'Aprendizajes'
  };
  let activeView = sessionStorage.getItem('creativeos_ci_view') || null;
  let selectedNiche = sessionStorage.getItem('creativeos_ci_niche') || 'perros';
  let snapshot = null;
  let loading = false;
  let loadError = null;
  let scheduled = false;

  const esc = (v='') => String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const fmt = n => Number(n||0).toLocaleString('es-ES');
  const pct = (a,b) => b ? Math.round((Number(a||0)/Number(b))*100) : 0;
  const low = v => String(v||'').toLowerCase();
  const slugify = v => low(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);

  async function api(resource='snapshot', options={}) {
    const url = resource === 'snapshot' ? `${API}?resource=snapshot` : `${API}?resource=${encodeURIComponent(resource)}`;
    const res = await fetch(url, { cache:'no-store', ...options, headers:{ 'Content-Type':'application/json', ...(options.headers||{}) } });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || data?.ok === false || data?.error) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
    return data.data;
  }
  async function post(body){
    const res = await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data?.error) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
    return data.data;
  }
  async function refresh(force=false){
    if(loading || (snapshot && !force)) return snapshot;
    loading=true; loadError=null; render();
    try { snapshot = await api('snapshot'); }
    catch(err){ loadError=String(err?.message||err); }
    finally { loading=false; render(); }
    return snapshot;
  }

  function inferNiche(p){
    const t=low(`${p?.id} ${p?.name} ${p?.label} ${p?.brief}`);
    if(/dog|perro|paw|orejer|mascota/.test(t)) return 'perros';
    if(/run|trail|stride|dedo|basket|sport/.test(t)) return 'running';
    if(/baby|beb|portabeb|madre|padre/.test(t)) return 'bebes';
    return 'general';
  }
  function productsForNiche(n){ return (snapshot?.products||[]).filter(p=>inferNiche(p)===n); }
  function nicheName(slug){ return (snapshot?.niches||[]).find(n=>n.slug===slug)?.name || slug; }
  function conceptForLegacyId(id){
    return (snapshot?.concepts||[]).find(c=>c.metadata?.sourceConceptId===id) || null;
  }
  function productAvatarRows(){
    const out=[];
    for(const p of snapshot?.products||[]){
      const niche=inferNiche(p);
      const imageAssets=(p.assets||[]).filter(a=>low(a.type).includes('avatar') && (a.publicUrl||a.url||a.src));
      for(const a of p.avatars||[]){
        const img=imageAssets.find(x=>low(x.name).includes(low(a.name).split(' ')[0])) || imageAssets[0] || null;
        out.push({ id:a.id, product_id:p.id, name:a.name, image_url:img?.publicUrl||img?.url||img?.src||null,
          description:[a.role,a.segment].filter(Boolean).join(' · '), niche_slugs:[niche], uses_count:0,wins_count:0,best_views:0,avg_views:0,
          best_concepts:[],best_angles:a.angle?[a.angle]:[],ai_hypothesis:null, metadata:{legacy:true,age:a.age||null} });
      }
      if(!(p.avatars||[]).length){
        for(const a of imageAssets) out.push({id:a.id,product_id:p.id,name:a.name,image_url:a.publicUrl||a.url||a.src,description:'Asset de avatar',niche_slugs:[niche],uses_count:0,wins_count:0,best_views:0,avg_views:0,best_concepts:[],best_angles:[],ai_hypothesis:null,metadata:{legacy:true}});
      }
    }
    const persisted = snapshot?.avatars||[];
    const map=new Map(out.map(x=>[x.id,x]));
    for(const a of persisted) map.set(a.id,{...map.get(a.id),...a});
    return [...map.values()];
  }
  function combinedConcepts(){
    const arr=[...(snapshot?.concepts||[])];
    const seen=new Set(arr.map(c=>c.metadata?.sourceConceptId).filter(Boolean));
    for(const c of snapshot?.conceptsLegacy||[]){
      if(seen.has(c.id)) continue;
      arr.push({slug:slugify(c.name||c.id),name:c.name,description:c.desc,niches:[low(c.category)==='pets'?'perros':low(c.category)==='sport'?'running':low(c.category)==='babies'?'bebes':'general'],uses_count:c.uses||0,wins_count:0,avg_views:c.avgViews||0,best_views:c.bestViews||0,metadata:{sourceConceptId:c.id,legacy:true}});
    }
    return arr;
  }

  function installShell(){
    const nav=document.querySelector('.sidebar .nav');
    const main=document.querySelector('.main');
    if(!nav||!main) return;
    if(!document.getElementById('ciNavGroup')){
      const group=document.createElement('div'); group.id='ciNavGroup'; group.className='ci-nav-group';
      group.innerHTML=`<div class="ci-nav-label">Intelligence</div>${Object.entries(VIEWS).map(([k,[ico,label]])=>`<button class="ci-nav-btn" data-ci-route="${k}"><span class="ci-nav-ico">${ico}</span><span>${label}</span></button>`).join('')}`;
      nav.insertAdjacentElement('afterend',group);
    }
    if(!document.getElementById('ciHost')){
      const host=document.createElement('div'); host.id='ciHost'; host.className='ci-host';
      main.appendChild(host);
    }
    if(activeView) activate(activeView,false);
  }
  function nativeContent(){ return document.querySelector('.main > .content'); }
  function activate(view,load=true){
    if(!VIEWS[view]) return;
    activeView=view; sessionStorage.setItem('creativeos_ci_view',view);
    const native=nativeContent(); if(native) native.style.display='none';
    const host=document.getElementById('ciHost'); if(host) host.classList.add('active');
    document.querySelectorAll('.ci-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.ciRoute===view));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    const title=document.querySelector('.page-title'); if(title) title.textContent=TITLES[view]||'CreativeOS Intelligence';
    const crumb=document.querySelector('.breadcrumb'); if(crumb) crumb.textContent='CreativeOS Intelligence';
    render(); if(load) refresh(false);
  }
  function deactivate(){
    activeView=null; sessionStorage.removeItem('creativeos_ci_view');
    const host=document.getElementById('ciHost'); if(host){host.classList.remove('active');host.innerHTML='';}
    const native=nativeContent(); if(native) native.style.display='';
    document.querySelectorAll('.ci-nav-btn').forEach(b=>b.classList.remove('active'));
  }

  function hero(title,sub,actions=''){
    return `<div class="ci-hero"><div><div class="ci-eyebrow">CreativeOS Intelligence</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div><div class="ci-actions">${actions}<button class="ci-btn" data-ci-refresh>↻ Actualizar data</button></div></div>`;
  }
  function stats(items){ return `<div class="ci-stats">${items.map(([v,l])=>`<div class="ci-stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>`; }
  function badge(text,cls=''){ return `<span class="ci-badge ${cls}">${esc(text)}</span>`; }
  function section(title,sub=''){ return `<div class="ci-section"><div><h2>${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}</div></div>`; }
  function stateBlock(){
    if(loading && !snapshot) return `<div class="ci-loading">Cargando inteligencia de CreativeOS…</div>`;
    if(loadError && !snapshot) return `<div class="ci-error">No se pudo cargar la inteligencia: ${esc(loadError)}</div>`;
    return '';
  }

  function testingPage(){
    const products=snapshot?.products||[];
    const active=products.filter(p=>['Testing','Preparing'].includes(p.status)).length;
    const totalVideos=products.reduce((s,p)=>s+Number(p.published||0),0);
    const totalSales=products.reduce((s,p)=>s+Number(p.sales||0),0);
    const totalViews=products.reduce((s,p)=>s+Number(p.views||0),0);
    const review=products.filter(p=>Number(p.day||0)>=Number(p.testMax||7) && !Number(p.sales||0)).length;
    const rows=products.map(p=>{
      const day=Number(p.day||0), max=Number(p.testMax||7), best=Number(p.bestViews||0), sales=Number(p.sales||0);
      let focus='Seguir recopilando data', cls='';
      if(p.status==='Paused'){focus='Pausado'; cls='warn';}
      else if(day>=max && sales===0 && best<2000){focus='Revisar / parar'; cls='warn';}
      else if(sales>0 || best>=10000){focus='Iterar ganador'; cls='good';}
      else if(Number(p.conceptsTested||0)<3){focus='Probar concepto nuevo';}
      else if(Number(p.anglesTested||0)<3){focus='Abrir ángulo nuevo';}
      const q=Math.min(100,Math.round((Math.min(day,max)/max)*35 + Math.min(Number(p.published||0),max*2)/(max*2)*30 + Math.min(Number(p.conceptsTested||0),5)/5*20 + Math.min(Number(p.anglesTested||0),4)/4*15));
      return `<tr><td><b>${esc(p.name)}</b><div class="ci-meta">${esc(p.label||'')}</div></td><td>${badge(p.status||'—',p.status==='Testing'?'good':p.status==='Paused'?'warn':'')}</td><td>Día ${day}/${max}</td><td>${fmt(p.published)}</td><td>${fmt(best)}</td><td>${fmt(p.sales)}</td><td><div class="ci-meter"><i style="width:${q}%"></i></div><div class="ci-meta" style="margin-top:4px">${q}% cobertura</div></td><td>${badge(focus,cls)}</td></tr>`;
    }).join('');
    return `${hero('Testing Intelligence','Tu centro operativo: días de test, cobertura creativa, señal y siguiente foco. No sustituye tu criterio; organiza la data que ya tienes.')}${stats([[active,'productos activos'],[totalVideos,'vídeos publicados'],[fmt(totalViews),'views acumuladas'],[totalSales,'ventas registradas'],[review,'tests a revisar']])}
      <div class="ci-note">La recomendación de “siguiente foco” usa reglas simples basadas en tu estado actual. Más adelante la cruzaremos con hooks, conceptos, ángulos y resultados reales por creativo.</div>
      ${section('Productos y cobertura','Conservamos tu apartado de Productos como fuente principal y aquí lo resumimos para decidir qué falta probar.')}
      <div class="ci-table-wrap"><table class="ci-table"><thead><tr><th>Producto</th><th>Estado</th><th>Test</th><th>Vídeos</th><th>Mejor vídeo</th><th>Ventas</th><th>Test Quality</th><th>Siguiente foco</th></tr></thead><tbody>${rows||'<tr><td colspan="8">Sin productos</td></tr>'}</tbody></table></div>`;
  }

  function nichesPage(){
    const niches=(snapshot?.niches||[]).filter(n=>n.slug!=='mascotas');
    if(!niches.some(n=>n.slug===selectedNiche)) selectedNiche=niches[0]?.slug||'perros';
    const cards=niches.map(n=>{
      const hooks=(snapshot?.hooks||[]).filter(h=>h.niche_slug===n.slug).length;
      const patterns=(snapshot?.patterns||[]).filter(p=>(p.niches||[]).includes(n.slug)).length;
      const concepts=combinedConcepts().filter(c=>(c.niches||[]).includes(n.slug)).length;
      const products=productsForNiche(n.slug).length;
      return `<div class="ci-card pad ci-niche ${selectedNiche===n.slug?'active':''}" data-ci-niche="${esc(n.slug)}"><h3>${esc(n.name)}</h3><p>${esc(n.description||'Biblioteca de inteligencia creativa')}</p><div class="ci-niche-counts"><span class="ci-kpi"><b>${products}</b> productos</span><span class="ci-kpi"><b>${patterns}</b> patrones</span><span class="ci-kpi"><b>${hooks}</b> hooks</span><span class="ci-kpi"><b>${concepts}</b> conceptos</span></div></div>`;
    }).join('');
    const patterns=(snapshot?.patterns||[]).filter(p=>(p.niches||[]).includes(selectedNiche));
    const hooks=(snapshot?.hooks||[]).filter(h=>h.niche_slug===selectedNiche);
    const angles=(snapshot?.angles||[]).filter(a=>(a.niches||[]).includes(selectedNiche));
    const concepts=combinedConcepts().filter(c=>(c.niches||[]).includes(selectedNiche));
    const learnings=(snapshot?.learnings||[]).filter(l=>l.niche_slug===selectedNiche).slice(0,8);
    const patternHtml=patterns.map(p=>`<div class="ci-pattern"><div class="ci-list-top"><b>${esc(p.name)}</b>${badge(`${p.uses_count||0} usos`)}</div><div class="ci-template">${esc(p.template)}</div><div class="ci-meta">${esc(p.description||'')} ${(p.niches||[]).map(n=>`· ${esc(nicheName(n))}`).join('')}</div>${(p.examples||[])[0]?`<div class="ci-example">${esc((p.examples||[])[0])}</div>`:''}</div>`).join('') || '<div class="ci-empty">Todavía no hay patrones.</div>';
    const hookHtml=hooks.map(h=>`<div class="ci-list-item"><div class="ci-list-top"><b>${esc(h.text)}</b>${h.views!=null?badge(`${fmt(h.views)} views`,'good'):badge(h.source_type||'manual')}</div><p>${[h.hook_type,h.emotion,(h.keywords||[]).join(', ')].filter(Boolean).join(' · ')||'Sin clasificación todavía'}</p></div>`).join('') || '<div class="ci-empty">Aún no has guardado hooks virales concretos en este nicho. Las estructuras de arriba ya están disponibles.</div>';
    return `${hero('Inteligencia por nicho','Guarda research viral, patrones, keywords y tus propios resultados para que el siguiente producto llegue preparado.')}
      <div class="ci-grid three">${cards}</div>
      ${section(`${nicheName(selectedNiche)} · Estructuras detectadas`,'Patrones reutilizables: la frase cambia, el mecanismo se conserva.')}
      <div class="ci-grid two"><div class="ci-card"><div class="ci-card-head"><div><h3>Patrones de hook</h3><p>Biblioteca reusable entre productos.</p></div>${badge(`${patterns.length} patrones`,'ai')}</div>${patternHtml}</div>
      <div class="ci-card pad"><h3 style="margin-bottom:10px">Guardar hook viral</h3><div class="ci-form"><div><div class="ci-label">Texto exacto</div><textarea class="ci-textarea" id="ciHookText" placeholder="Ej: My dog gets so stressed every time…"></textarea></div><div class="ci-form-row"><div><div class="ci-label">Patrón</div><select class="ci-select" id="ciHookPattern"><option value="">Sin clasificar</option>${patterns.map(p=>`<option value="${esc(p.slug)}">${esc(p.name)}</option>`).join('')}</select></div><div><div class="ci-label">Views del original</div><input class="ci-input" id="ciHookViews" type="number" min="0" placeholder="Opcional"></div></div><div><div class="ci-label">Notas / por qué te interesa</div><input class="ci-input" id="ciHookNotes" placeholder="Opcional"></div><button class="ci-btn primary" data-ci-save-hook>Guardar en ${esc(nicheName(selectedNiche))}</button></div></div></div>
      ${section('Hooks guardados','Textos exactos del research o de tus propios tests.')}
      <div class="ci-card">${hookHtml}</div>
      ${section('Mapa del nicho','Qué conceptos y ángulos tienes ya disponibles para reutilizar.')}
      <div class="ci-grid two"><div class="ci-card"><div class="ci-card-head"><div><h3>Conceptos</h3><p>Ordenados por mejor resultado registrado.</p></div>${badge(`${concepts.length}`)}</div><div class="ci-list">${concepts.slice(0,8).map(c=>`<div class="ci-list-item"><div class="ci-list-top"><b>${esc(c.name)}</b>${badge(`${fmt(c.best_views)} best`)}</div><p>${esc(c.description||'')}</p></div>`).join('')||'<div class="ci-empty">Sin conceptos.</div>'}</div></div><div class="ci-card"><div class="ci-card-head"><div><h3>Ángulos</h3><p>Mensajes de venta reutilizables.</p></div>${badge(`${angles.length}`)}</div><div class="ci-list">${angles.map(a=>`<div class="ci-list-item"><b>${esc(a.name)}</b><p>${esc(a.description||'')}</p></div>`).join('')||'<div class="ci-empty">Sin ángulos.</div>'}</div></div></div>
      ${section('Aprendizajes del nicho','Lo que tú has dicho, insights de datos e hipótesis IA deben permanecer separados.')}
      <div class="ci-card"><div class="ci-list">${learnings.map(l=>learningItem(l)).join('')||'<div class="ci-empty">Sin aprendizajes todavía.</div>'}</div></div>`;
  }

  function conceptsPage(){
    const concepts=combinedConcepts().sort((a,b)=>Number(b.best_views||0)-Number(a.best_views||0));
    const top=concepts[0];
    return `${hero('Concept Library','Una biblioteca reusable de mecanismos creativos: cuántas veces los usas, en qué nichos y qué resultados suelen producir.')}${stats([[concepts.length,'conceptos'],[concepts.reduce((s,c)=>s+Number(c.uses_count||0),0),'usos registrados'],[fmt(top?.best_views||0),'mejor resultado'],[top?.name||'—','concepto top'],[(snapshot?.products||[]).length,'productos conectados']])}<div class="ci-grid three">${concepts.map(c=>`<div class="ci-card pad"><div class="ci-list-top"><div><h3>${esc(c.name)}</h3><p>${esc(c.description||'')}</p></div>${badge(`${fmt(c.best_views)} best`,Number(c.best_views)>=10000?'good':'')}</div><div class="ci-niche-counts"><span class="ci-kpi"><b>${c.uses_count||0}</b> usos</span><span class="ci-kpi"><b>${c.wins_count||0}</b> wins</span><span class="ci-kpi"><b>${fmt(c.avg_views||0)}</b> avg</span></div><div class="ci-meta" style="margin-top:12px">${(c.niches||[]).map(n=>nicheName(n)).join(' · ')||'Global'}</div></div>`).join('')||'<div class="ci-empty">Sin conceptos.</div>'}</div>`;
  }

  function anglesPage(){
    const angles=snapshot?.angles||[];
    return `${hero('Ángulos de venta','No solo qué vídeo hiciste, sino qué promesa o motivación estabas vendiendo y dónde vuelve a ser aplicable.')}${stats([[angles.length,'ángulos'],[angles.reduce((s,a)=>s+Number(a.uses_count||0),0),'usos'],[angles.reduce((s,a)=>s+Number(a.wins_count||0),0),'wins'],[fmt(Math.max(0,...angles.map(a=>Number(a.best_views||0)))),'mejor resultado'],[(snapshot?.niches||[]).length-1,'nichos']])}<div class="ci-grid three">${angles.map(a=>`<div class="ci-card pad"><div class="ci-list-top"><h3>${esc(a.name)}</h3>${badge((a.niches||[]).map(n=>nicheName(n)).join(' / ')||'Global')}</div><p>${esc(a.description||'')}</p><div class="ci-niche-counts"><span class="ci-kpi"><b>${a.uses_count||0}</b> usos</span><span class="ci-kpi"><b>${a.wins_count||0}</b> wins</span><span class="ci-kpi"><b>${fmt(a.best_views||0)}</b> best</span></div></div>`).join('')||'<div class="ci-empty">Sin ángulos.</div>'}</div>`;
  }

  function avatarsPage(){
    const avatars=productAvatarRows();
    return `${hero('Avatar Intelligence','Relaciona quién aparece en el creativo con producto, nicho, concepto, ángulo y resultado. Las explicaciones causales se marcan como hipótesis.')}${stats([[avatars.length,'avatares'],[avatars.filter(a=>a.image_url).length,'con imagen'],[avatars.reduce((s,a)=>s+Number(a.uses_count||0),0),'usos'],[avatars.reduce((s,a)=>s+Number(a.wins_count||0),0),'wins'],[fmt(Math.max(0,...avatars.map(a=>Number(a.best_views||0)))),'best views']])}<div class="ci-avatar-grid">${avatars.map(a=>{const p=(snapshot?.products||[]).find(x=>x.id===a.product_id);const ini=esc((a.name||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase());return `<div class="ci-avatar"><div class="ci-avatar-img">${a.image_url?`<img src="${esc(a.image_url)}" alt="">`:ini}</div><b>${esc(a.name)}</b><small>${esc(p?.name||a.product_id||'')} · ${(a.niche_slugs||[]).map(n=>esc(nicheName(n))).join(', ')}</small><small>${esc(a.description||'Sin descripción')}</small><div class="ci-niche-counts"><span class="ci-kpi"><b>${a.uses_count||0}</b> usos</span><span class="ci-kpi"><b>${fmt(a.best_views||0)}</b> best</span></div><div class="ci-hyp">${a.ai_hypothesis?`Hipótesis IA: ${esc(a.ai_hypothesis)}`:'Aún sin hipótesis IA. Primero necesitamos más resultados por creativo.'}</div></div>`}).join('')||'<div class="ci-empty">Sin avatares.</div>'}</div>`;
  }

  function learningItem(l){
    const cls=l.kind==='ai_hypothesis'?'ai':l.kind==='data_insight'?'good':'';
    const label=l.kind==='manual'?'Aprendizaje tuyo':l.kind==='data_insight'?'Insight de datos':'Hipótesis IA';
    return `<div class="ci-list-item"><div class="ci-list-top"><div><b>${esc(l.title)}</b><div class="ci-meta" style="margin-top:4px">${esc(nicheName(l.niche_slug||''))}${l.product_id?` · ${esc(l.product_id)}`:''}</div></div>${badge(label,cls)}</div><p>${esc(l.body)}</p></div>`;
  }
  function learningsPage(){
    const ls=snapshot?.learnings||[];
    const manual=ls.filter(l=>l.kind==='manual').length, insights=ls.filter(l=>l.kind==='data_insight').length, ai=ls.filter(l=>l.kind==='ai_hypothesis').length;
    return `${hero('Aprendizajes','Tu memoria de marketing estructurada. Separamos claramente lo que tú afirmas, lo que muestran los datos y lo que la IA solo propone como hipótesis.')}${stats([[ls.length,'aprendizajes'],[manual,'tuyos'],[insights,'insights de datos'],[ai,'hipótesis IA'],[(snapshot?.niches||[]).length-1,'nichos']])}<div class="ci-grid two"><div class="ci-card"><div class="ci-card-head"><div><h3>Memoria acumulada</h3><p>Lo más reciente primero.</p></div></div><div class="ci-list">${ls.map(l=>learningItem(l)).join('')||'<div class="ci-empty">Sin aprendizajes.</div>'}</div></div><div class="ci-card pad"><h3 style="margin-bottom:10px">Añadir aprendizaje</h3><div class="ci-form"><div class="ci-form-row"><div><div class="ci-label">Nicho</div><select id="ciLearnNiche" class="ci-select"><option value="">Global</option>${(snapshot?.niches||[]).filter(n=>n.slug!=='mascotas').map(n=>`<option value="${esc(n.slug)}">${esc(n.name)}</option>`).join('')}</select></div><div><div class="ci-label">Producto</div><select id="ciLearnProduct" class="ci-select"><option value="">Todos</option>${(snapshot?.products||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div></div><div><div class="ci-label">Título</div><input id="ciLearnTitle" class="ci-input" placeholder="Ej: Primera persona funciona mejor"></div><div><div class="ci-label">Aprendizaje</div><textarea id="ciLearnBody" class="ci-textarea" placeholder="Qué has observado y quieres recordar"></textarea></div><button class="ci-btn primary" data-ci-save-learning>Guardar como aprendizaje tuyo</button></div></div></div>`;
  }

  function render(){
    const host=document.getElementById('ciHost'); if(!host||!activeView) return;
    if(loading&&!snapshot){host.innerHTML=`<div class="ci-wrap">${stateBlock()}</div>`;return;}
    if(loadError&&!snapshot){host.innerHTML=`<div class="ci-wrap">${stateBlock()}</div>`;return;}
    if(!snapshot){host.innerHTML=`<div class="ci-wrap"><div class="ci-loading">Preparando CreativeOS Intelligence…</div></div>`;return;}
    let html='';
    if(activeView==='testing') html=testingPage();
    else if(activeView==='niches') html=nichesPage();
    else if(activeView==='concepts') html=conceptsPage();
    else if(activeView==='angles') html=anglesPage();
    else if(activeView==='avatars') html=avatarsPage();
    else if(activeView==='learnings') html=learningsPage();
    host.innerHTML=`<div class="ci-wrap">${html}${loadError?`<div class="ci-error" style="margin-top:16px">Última actualización falló: ${esc(loadError)}</div>`:''}</div>`;
  }

  async function saveHook(){
    const text=document.getElementById('ciHookText')?.value?.trim(); if(!text) return alert('Escribe el hook.');
    const pattern_slug=document.getElementById('ciHookPattern')?.value||null;
    const viewsRaw=document.getElementById('ciHookViews')?.value;
    const notes=document.getElementById('ciHookNotes')?.value?.trim()||null;
    try{
      await post({action:'add_hook',niche_slug:selectedNiche,text,pattern_slug,views:viewsRaw?Number(viewsRaw):null,notes,source_type:'research'});
      snapshot=null; await refresh(true);
    }catch(err){alert(`No se pudo guardar: ${err.message||err}`)}
  }
  async function saveLearning(){
    const title=document.getElementById('ciLearnTitle')?.value?.trim(); const body=document.getElementById('ciLearnBody')?.value?.trim();
    if(!title||!body) return alert('Añade título y aprendizaje.');
    try{
      await post({action:'add_learning',kind:'manual',niche_slug:document.getElementById('ciLearnNiche')?.value||null,product_id:document.getElementById('ciLearnProduct')?.value||null,title,body,evidence:[],metadata:{source:'web'}});
      snapshot=null; await refresh(true);
    }catch(err){alert(`No se pudo guardar: ${err.message||err}`)}
  }

  document.addEventListener('click',e=>{
    const custom=e.target.closest?.('[data-ci-route]');
    if(custom){ e.preventDefault(); activate(custom.dataset.ciRoute,true); return; }
    const niche=e.target.closest?.('[data-ci-niche]');
    if(niche){ selectedNiche=niche.dataset.ciNiche; sessionStorage.setItem('creativeos_ci_niche',selectedNiche); render(); return; }
    if(e.target.closest?.('[data-ci-refresh]')){ snapshot=null; refresh(true); return; }
    if(e.target.closest?.('[data-ci-save-hook]')){ saveHook(); return; }
    if(e.target.closest?.('[data-ci-save-learning]')){ saveLearning(); return; }
    if(e.target.closest?.('[data-route]')) deactivate();
  },true);

  const observer=new MutationObserver(()=>{
    if(scheduled) return; scheduled=true;
    requestAnimationFrame(()=>{ scheduled=false; installShell(); });
  });
  if(document.body) observer.observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{childList:true,subtree:true}),{once:true});
  installShell();
  if(activeView) refresh(false);

  window.CreativeOSIntelligence={
    refresh:()=>refresh(true), getSnapshot:()=>snapshot,
    addHook:(data)=>post({action:'add_hook',...data}),
    addLearning:(data)=>post({action:'add_learning',...data}),
    upsertResult:(data)=>post({action:'upsert_result',...data}),
    open:(view='testing')=>activate(view,true)
  };
})();
