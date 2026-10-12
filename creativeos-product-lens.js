(() => {
  'use strict';

  const state={
    conceptProduct:sessionStorage.getItem('creativeos_ci_concept_product')||'all',
    angleProduct:sessionStorage.getItem('creativeos_ci_angle_product')||'',
    learningMode:sessionStorage.getItem('creativeos_ci_learning_mode')||'product',
    learningProduct:sessionStorage.getItem('creativeos_ci_learning_product')||'',
    learningNiche:sessionStorage.getItem('creativeos_ci_learning_niche')||''
  };

  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const low=v=>String(v||'').toLowerCase();
  const fmt=n=>n===null||n===undefined||n===''?'—':Number(n).toLocaleString('es-ES');
  const snap=()=>window.CreativeOSIntelligence?.getSnapshot?.()||{};
  const products=()=>snap().products||[];
  const product=id=>products().find(p=>p.id===id)||null;
  const activeView=()=>document.querySelector('.ci-nav-btn.active')?.dataset?.ciRoute||null;
  const niches=()=>snap().niches||[];
  const nicheName=slug=>niches().find(n=>n.slug===slug)?.name||slug||'Global';
  const inferNiches=p=>Array.isArray(p?.nicheSlugs)&&p.nicheSlugs.length?p.nicheSlugs:[];
  const productIds=item=>{
    const raw=item?.metadata?.product_ids;
    if(Array.isArray(raw))return raw;
    if(item?.metadata?.product_id)return[item.metadata.product_id];
    if(item?.product_id)return[item.product_id];
    return[];
  };
  const sourceLabel=source=>{
    const s=String(source||'manual');
    if(s==='user-confirmed-test'||s==='tested_by_user'||s==='user-confirmed-angle')return['Testeado por ti','source-tested'];
    if(s==='saved-working-concept'||s==='saved'||s==='saved-angle')return['Guardado / en test','source-saved'];
    if(s==='research'||s==='research-pattern'||s==='chat_learning')return['Research','source-research'];
    if(s==='ai_hypothesis')return['Hipótesis IA','source-ai'];
    return['Manual','source-manual'];
  };
  const badge=(text,cls='')=>`<span class="ci-badge ${cls}">${esc(text)}</span>`;
  const sourceBadge=source=>{const [t,c]=sourceLabel(source);return badge(t,c);};
  const productTabs=(selected,attr,all=false)=>`<div class="cio-product-tabs">${all?`<button class="${selected==='all'?'active':''}" ${attr}="all">Todos</button>`:''}${products().map(p=>`<button class="${selected===p.id?'active':''}" ${attr}="${esc(p.id)}"><span>${esc(p.name)}</span><small>Día ${fmt(p.day)}</small></button>`).join('')}</div>`;
  const editActions=(entity,key)=>`<div class="cio-inline-actions"><button data-cix-edit="${entity}" data-cix-key="${esc(key)}">Editar</button><button class="danger" data-cix-delete="${entity}" data-cix-key="${esc(key)}">Eliminar</button></div>`;

  function renameAvatarNav(){
    const btn=document.querySelector('[data-ci-route="avatars"]');
    if(!btn)return;
    const spans=btn.querySelectorAll('span');
    if(spans[1])spans[1].textContent='Matriz de Tests';
    btn.classList.add('route-matrix');
    const title=document.querySelector('.page-title');
    if(activeView()==='avatars'&&title)title.textContent='Matriz de Tests';
  }

  function hero(title,sub,actions=''){
    return`<div class="ci-hero cio-hero"><div><div class="ci-eyebrow">CreativeOS Intelligence</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>${actions?`<div class="ci-actions">${actions}</div>`:''}</div>`;
  }

  function combinedConcepts(){
    const s=snap(),arr=[...(s.concepts||[])];
    const seen=new Set(arr.map(c=>c.metadata?.sourceConceptId).filter(Boolean));
    for(const c of s.conceptsLegacy||[]){
      if(seen.has(c.id))continue;
      arr.push({slug:low(c.name||c.id).replace(/[^a-z0-9]+/g,'-'),name:c.name,description:c.desc||'',niches:[],uses_count:c.uses||0,wins_count:0,avg_views:c.avgViews||0,best_views:c.bestViews||0,metadata:{sourceConceptId:c.id,legacy:true,source:c.source||'legacy'},legacy:c});
    }
    return arr;
  }

  function renderMatrix(host){
    const defs=[
      ['concept','Concepto','Qué historia/situación estás probando'],
      ['text_hook','Texto / Hook','La promesa o frase que abre el vídeo'],
      ['sales_angle','Ángulo de venta','Problema, deseo o motivación'],
      ['background','Fondo','Escenario y contexto visual'],
      ['audio','Música / Audio','Música, sonido y ritmo'],
      ['visual_hook','Hook visual','Primer estímulo visual'],
      ['format','Formato / cámara','POV, UGC, close-up, etc.'],
      ['avatar','Avatar','Variable puntual dentro del vídeo, no una biblioteca reusable']
    ];
    const s=snap();
    const cards=products().map(p=>{
      const wfs=(s.workflows||[]).filter(w=>w.product_id===p.id);
      const counts={};
      const examples={};
      for(const [type] of defs){
        const vals=[];
        for(const w of wfs)for(const n of w.nodes||[])if(n.type===type&&String(n.value||'').trim())vals.push(String(n.value).trim());
        const unique=[...new Set(vals)];counts[type]=unique.length;examples[type]=unique.slice(0,2);
      }
      const priority=['concept','text_hook','sales_angle','background','audio','visual_hook','format'];
      const min=Math.min(...priority.map(k=>counts[k]||0));
      const next=priority.find(k=>(counts[k]||0)===min)||'concept';
      const nextLabel=defs.find(d=>d[0]===next)?.[1]||'Concepto';
      return`<div class="cio-matrix-product">
        <div class="cio-matrix-head"><div><span>Producto activo · Día ${fmt(p.day)}</span><h3>${esc(p.name)}</h3><p>${wfs.length} workflows guardados</p></div><button data-cio-open-testing="${esc(p.id)}">Abrir Testing →</button></div>
        <div class="cio-variable-grid">${defs.map(([type,label,desc])=>{
          const count=counts[type]||0,level=count===0?'empty':count===1?'one':'multi';
          return`<div class="cio-variable ${level}" data-variable="${type}"><div class="cio-variable-top"><b>${esc(label)}</b><span>${count===0?'Sin registrar':count===1?'1 variante':`${count} variantes`}</span></div><p>${esc(desc)}</p>${examples[type].length?`<div class="cio-variable-examples">${examples[type].map(v=>`<small>${esc(v)}</small>`).join('')}</div>`:''}<div class="cio-variable-bar"><i style="width:${Math.min(100,count*34)}%"></i></div></div>`;
        }).join('')}</div>
        <div class="cio-matrix-next"><span>Variable con menos cobertura</span><b>${esc(nextLabel)}</b><small>No significa que debas cambiarla ya; sirve para ver dónde tienes menos data.</small></div>
      </div>`;
    }).join('');
    host.innerHTML=`${hero('Matriz de Tests','Sustituye la antigua biblioteca de avatares. Aquí ves, por producto, qué variables creativas estás cubriendo y cuáles apenas has probado.')}
      <div class="cio-context-note"><b>Avatar cambia de rol:</b> ya no es una biblioteca independiente. Se queda como una variable puntual dentro de cada workflow, porque lo generas según el vídeo.</div>
      <div class="cio-matrix-stack">${cards||'<div class="ci-empty">Sin productos activos.</div>'}</div>`;
  }

  function renderAngles(host){
    const ps=products();
    if(!ps.some(p=>p.id===state.angleProduct))state.angleProduct=ps[0]?.id||'';
    const p=product(state.angleProduct);
    const arr=(snap().angles||[]).filter(a=>productIds(a).includes(state.angleProduct));
    host.innerHTML=`${hero('Ángulos por producto','Los ángulos dejan de estar sueltos: cada uno vive dentro del producto al que estás vendiendo.',`<button class="ci-btn primary" data-cix-add="angle">+ Ángulo</button>`)}
      ${productTabs(state.angleProduct,'data-cio-angle-product')}
      <div class="cio-lens-summary"><span>Producto</span><b>${esc(p?.name||'—')}</b><i></i><span>Ángulos guardados</span><b>${arr.length}</b></div>
      <div class="cio-angle-grid">${arr.map(a=>`<article class="cio-angle-card"><div class="cio-card-accent"></div><div class="cio-card-top"><div><span class="cio-card-kicker">Ángulo de venta</span><h3>${esc(a.name)}</h3></div>${sourceBadge(a.metadata?.source)}</div><p>${esc(a.description||'')}</p><div class="cio-result-row"><span><b>${fmt(a.uses_count||0)}</b> usos</span><span><b>${fmt(a.wins_count||0)}</b> wins</span><span><b>${a.best_views?fmt(a.best_views):'—'}</b> best views</span></div><div class="cio-chip-row">${(a.niches||[]).map(n=>`<span>${esc(nicheName(n))}</span>`).join('')}</div>${editActions('angle',a.slug)}</article>`).join('')||`<div class="cio-empty-panel"><b>Aún no hay ángulos para ${esc(p?.name||'este producto')}</b><span>Añade el primer ángulo cuando empieces a probar una promesa o motivación distinta.</span></div>`}</div>`;
  }

  function renderConcepts(host){
    const all=combinedConcepts();
    if(state.conceptProduct!=='all'&&!product(state.conceptProduct))state.conceptProduct='all';
    const arr=state.conceptProduct==='all'?all:all.filter(c=>productIds(c).includes(state.conceptProduct));
    host.innerHTML=`${hero('Concept Library','Biblioteca visual de conceptos reutilizables. Filtra por producto para no perderte entre ideas de tests distintos.',`<button class="ci-btn primary" data-cix-add="concept">+ Concepto</button>`)}
      ${productTabs(state.conceptProduct,'data-cio-concept-product',true)}
      <div class="cio-concept-grid">${arr.map(c=>{
        const pids=productIds(c),source=c.metadata?.source;
        return`<article class="cio-concept-card ${esc(source||'manual')}"><div class="cio-card-accent"></div><div class="cio-card-top"><div><span class="cio-card-kicker">Concepto</span><h3>${esc(c.name)}</h3></div>${sourceBadge(source)}</div><p>${esc(c.description||'')}</p><div class="cio-result-row"><span><b>${fmt(c.uses_count||0)}</b> usos</span><span><b>${fmt(c.wins_count||0)}</b> wins</span><span><b>${c.avg_views?fmt(c.avg_views):'—'}</b> avg</span><span><b>${c.best_views?fmt(c.best_views):'—'}</b> best</span></div><div class="cio-card-sections"><div><small>Productos</small><div class="cio-chip-row">${pids.length?pids.map(id=>`<span>${esc(product(id)?.name||id)}</span>`).join(''):'<span>Cross-product / sin asignar</span>'}</div></div><div><small>Nichos</small><div class="cio-chip-row">${(c.niches||[]).map(n=>`<span>${esc(nicheName(n))}</span>`).join('')||'<span>Sin nicho</span>'}</div></div></div>${editActions('concept',c.slug||c.metadata?.sourceConceptId)}</article>`;
      }).join('')||'<div class="cio-empty-panel"><b>Sin conceptos en este filtro</b><span>Cambia de producto o añade uno nuevo.</span></div>'}</div>`;
  }

  function learningCard(l){
    const type=l.kind==='data_insight'?['Insight de datos','source-tested']:l.kind==='ai_hypothesis'?['Hipótesis IA','source-ai']:['Aprendizaje tuyo','source-manual'];
    return`<article class="cio-learning-card"><div class="cio-card-top"><div><span class="cio-card-kicker">${esc(type[0])}</span><h3>${esc(l.title)}</h3></div>${badge(type[0],type[1])}</div><p>${esc(l.body||'')}</p><div class="cio-learning-context">${l.product_id?`<span>Producto · <b>${esc(product(l.product_id)?.name||l.product_id)}</b></span>`:''}${l.niche_slug?`<span>Nicho · <b>${esc(nicheName(l.niche_slug))}</b></span>`:''}${l.confidence!==null&&l.confidence!==undefined?`<span>Confianza · <b>${Math.round(Number(l.confidence)*100)}%</b></span>`:''}</div>${editActions('learning',l.id)}</article>`;
  }

  function renderLearnings(host){
    const s=snap(),ls=s.learnings||[],ps=products();
    if(!ps.some(p=>p.id===state.learningProduct))state.learningProduct=ps[0]?.id||'';
    const activeNiches=[...new Set(ps.flatMap(inferNiches))];
    if(!activeNiches.includes(state.learningNiche))state.learningNiche=activeNiches[0]||'';
    const modes=`<div class="cio-mode-tabs"><button class="${state.learningMode==='product'?'active':''}" data-cio-learning-mode="product">Por producto</button><button class="${state.learningMode==='niche'?'active':''}" data-cio-learning-mode="niche">Por nicho</button><button class="${state.learningMode==='global'?'active':''}" data-cio-learning-mode="global">Global</button></div>`;
    let controls='',arr=[],context='';
    if(state.learningMode==='product'){
      controls=productTabs(state.learningProduct,'data-cio-learning-product');
      arr=ls.filter(l=>l.product_id===state.learningProduct);
      context=product(state.learningProduct)?.name||'';
    }else if(state.learningMode==='niche'){
      controls=`<div class="cio-product-tabs">${activeNiches.map(n=>`<button class="${state.learningNiche===n?'active':''}" data-cio-learning-niche="${esc(n)}"><span>${esc(nicheName(n))}</span></button>`).join('')}</div>`;
      arr=ls.filter(l=>l.niche_slug===state.learningNiche);
      context=nicheName(state.learningNiche);
    }else{
      arr=ls.filter(l=>!l.product_id&&!l.niche_slug);context='Global / cross-product';
    }
    host.innerHTML=`${hero('Aprendizajes','La memoria deja de ser una lista suelta. Decide si el aprendizaje pertenece a un producto, a un nicho o a todo el sistema.',`<button class="ci-btn primary" data-cix-add="learning">+ Aprendizaje</button>`)}
      ${modes}${controls}
      <div class="cio-learning-head"><div><span>Viendo</span><h2>${esc(context||'Sin contexto')}</h2></div><b>${arr.length} aprendizajes</b></div>
      <div class="cio-learning-grid">${arr.map(learningCard).join('')||`<div class="cio-empty-panel"><b>No hay aprendizajes aquí todavía</b><span>Cuando detectes algo útil, guárdalo directamente en este contexto en vez de dejarlo mezclado con todo.</span>${state.learningMode==='product'?`<button data-cio-add-learning-product="${esc(state.learningProduct)}">+ Añadir a ${esc(context)}</button>`:''}</div>`}</div>`;
  }

  function decorateNiche(host){
    const s=snap();
    const concepts=combinedConcepts();
    const conceptCard=[...host.querySelectorAll('.ci-card')].find(c=>c.querySelector('h3')?.textContent?.trim()==='Conceptos');
    if(conceptCard){
      conceptCard.querySelectorAll('.ci-list-item').forEach(el=>{
        const name=el.querySelector('b')?.textContent?.trim(),item=concepts.find(c=>c.name===name);
        if(!item||el.querySelector('.cio-inline-actions'))return;
        el.insertAdjacentHTML('beforeend',editActions('concept',item.slug||item.metadata?.sourceConceptId));
        el.classList.add('cio-editable-niche-item');
      });
    }
    const angleCard=[...host.querySelectorAll('.ci-card')].find(c=>c.querySelector('h3')?.textContent?.trim()==='Ángulos');
    if(angleCard){
      angleCard.querySelectorAll('.ci-list-item').forEach(el=>{
        const name=el.querySelector('b')?.textContent?.trim(),item=(s.angles||[]).find(a=>a.name===name);
        if(!item||el.querySelector('.cio-inline-actions'))return;
        el.insertAdjacentHTML('beforeend',editActions('angle',item.slug));
        el.classList.add('cio-editable-niche-item');
      });
    }
    const hookCard=[...host.querySelectorAll('.ci-card')].find(c=>c.querySelector('h3')?.textContent?.trim()==='Hooks guardados');
    if(hookCard){
      hookCard.querySelectorAll('.ci-list-item').forEach(el=>{
        if(el.querySelector('.cio-why'))return;
        const text=el.querySelector('b')?.textContent?.trim(),h=(s.hooks||[]).find(x=>x.text===text);
        if(!h)return;
        const hasPerf=h.views!==null&&h.views!==undefined;
        const why=hasPerf&&h.notes?h.notes:hasPerf?'Hay rendimiento registrado, pero todavía no has guardado una explicación causal.':'Aún no hay suficiente evidencia para decir por qué funciona; está guardado como texto/patrón, no como conclusión.';
        el.insertAdjacentHTML('beforeend',`<div class="cio-why"><span>${hasPerf?'Lectura del hook':'Estado de evidencia'}</span><p>${esc(why)}</p></div>`);
      });
    }
  }

  function enhance(){
    renameAvatarNav();
    const host=document.getElementById('ciHost');
    if(!host||!host.classList.contains('active'))return;
    const view=activeView();
    if(view==='avatars')renderMatrix(host);
    else if(view==='angles')renderAngles(host);
    else if(view==='concepts')renderConcepts(host);
    else if(view==='learnings')renderLearnings(host);
    else if(view==='niches')decorateNiche(host);
  }

  document.addEventListener('creativeos:intelligence-render',()=>requestAnimationFrame(enhance));
  document.addEventListener('click',e=>{
    const concept=e.target.closest?.('[data-cio-concept-product]');
    if(concept){state.conceptProduct=concept.dataset.cioConceptProduct;sessionStorage.setItem('creativeos_ci_concept_product',state.conceptProduct);enhance();return;}
    const angle=e.target.closest?.('[data-cio-angle-product]');
    if(angle){state.angleProduct=angle.dataset.cioAngleProduct;sessionStorage.setItem('creativeos_ci_angle_product',state.angleProduct);enhance();return;}
    const mode=e.target.closest?.('[data-cio-learning-mode]');
    if(mode){state.learningMode=mode.dataset.cioLearningMode;sessionStorage.setItem('creativeos_ci_learning_mode',state.learningMode);enhance();return;}
    const lp=e.target.closest?.('[data-cio-learning-product]');
    if(lp){state.learningProduct=lp.dataset.cioLearningProduct;sessionStorage.setItem('creativeos_ci_learning_product',state.learningProduct);enhance();return;}
    const ln=e.target.closest?.('[data-cio-learning-niche]');
    if(ln){state.learningNiche=ln.dataset.cioLearningNiche;sessionStorage.setItem('creativeos_ci_learning_niche',state.learningNiche);enhance();return;}
    const addLearn=e.target.closest?.('[data-cio-add-learning-product]');
    if(addLearn){
      window.CreativeOSIntelligenceCRUD?.open?.('learning');
      setTimeout(()=>{const sel=document.getElementById('cixProduct');if(sel)sel.value=addLearn.dataset.cioAddLearningProduct;},20);
      return;
    }
    const open=e.target.closest?.('[data-cio-open-testing]');
    if(open){
      const id=open.dataset.cioOpenTesting;
      const nav=document.querySelector('[data-ci-route="testing"]');
      nav?.click();
      setTimeout(()=>document.querySelector(`[data-ci-test-product="${CSS.escape(id)}"]`)?.click(),120);
      return;
    }
  },true);

  setTimeout(enhance,80);
  window.CreativeOSProductLens={enhance,version:'1.0'};
})();