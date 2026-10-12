(() => {
  'use strict';

  const VARS=[
    ['concept','Concepto / Hook visual'],
    ['text_hook','Texto'],
    ['sales_angle','Ángulo de venta'],
    ['background','Fondo'],
    ['audio','Música / Audio'],
    ['avatar','Avatar']
  ];
  const STATUS=[
    ['waiting_record','Por grabar'],
    ['recorded','Grabado'],
    ['published','Publicado'],
    ['waiting_data','Esperando data'],
    ['data_ready','Data lista']
  ];
  const S={
    custom:false,
    productId:sessionStorage.getItem('creativeos_split_product')||'',
    detailMode:sessionStorage.getItem('creativeos_split_detail_mode')||'tree',
    modal:null
  };

  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=n=>n===null||n===undefined||n===''?'—':Number(n).toLocaleString('es-ES');
  const snap=()=>window.CreativeOSIntelligence?.getSnapshot?.()||{};
  const post=b=>window.CreativeOSIntelligence?.post?.(b);
  const products=()=>snap().products||[];
  const product=id=>products().find(p=>p.id===id)||null;
  const tests=(pid=S.productId)=> (snap().splitTests||[]).filter(t=>t.product_id===pid);
  const variants=testId=> (snap().splitVariants||[]).filter(v=>v.test_id===testId).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const varLabel=k=>VARS.find(x=>x[0]===k)?.[1]||k||'Variable';
  const statusLabel=k=>STATUS.find(x=>x[0]===k)?.[1]||k||'Estado';
  const uid=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const today=()=>new Date().toISOString().slice(0,10);
  const isoNow=()=>new Date().toISOString();
  const cleanObj=o=>Object.fromEntries(Object.entries(o||{}).filter(([,v])=>String(v??'').trim()!==''));
  const resolvedDNA=(t,v)=>({...t?.baseline_dna||{},...v?.overrides||{},...v?.derived_changes||{}});

  function toast(text,kind='ok'){
    let h=document.getElementById('cisToastHost');if(!h){h=document.createElement('div');h.id='cisToastHost';h.className='cis-toast-host';document.body.appendChild(h);}
    const n=document.createElement('div');n.className=`cis-toast ${kind}`;n.textContent=text;h.appendChild(n);setTimeout(()=>n.remove(),2600);
  }
  async function refresh(){await window.CreativeOSIntelligence?.refresh?.();if(S.custom)render();}
  async function guard(fn){try{await fn();}catch(e){console.error(e);toast(String(e?.message||e),'error');}}

  function ensureNav(){
    const matrix=document.querySelector('[data-ci-route="avatars"]');if(!matrix)return;
    let btn=document.getElementById('cisSplitNav');
    if(!btn){
      btn=document.createElement('button');btn.id='cisSplitNav';btn.className='ci-nav-btn route-splits';btn.dataset.cisSplitRoute='1';
      btn.innerHTML='<span class="ci-nav-ico">⑂</span><span>Split Tests</span>';
      matrix.insertAdjacentElement('afterend',btn);
    }
  }

  function enhanceMatrix(){
    const host=document.getElementById('ciHost');if(!host||host.dataset.ciView!=='avatars')return;
    host.querySelectorAll('.cio-variable[data-variable="format"],.cio-variable[data-variable="visual_hook"]').forEach(x=>x.remove());
    host.querySelectorAll('.cio-variable[data-variable="concept"] .cio-variable-top b').forEach(x=>x.textContent='Concepto / Hook visual');
    host.querySelectorAll('.cio-variable').forEach(card=>{
      if(card.dataset.cisReady)return;card.dataset.cisReady='1';card.classList.add('cis-matrix-clickable');
      const parent=card.closest('.cio-matrix-product');const pid=parent?.querySelector('[data-cio-open-testing]')?.dataset?.cioOpenTesting;
      if(pid){card.dataset.cisMatrixProduct=pid;card.title='Abrir detalle de esta variable';}
    });
  }

  function activate(){
    S.custom=true;sessionStorage.setItem('creativeos_ci_custom_view','splits');ensureNav();
    document.querySelectorAll('.ci-nav-btn').forEach(b=>b.classList.toggle('active',b.id==='cisSplitNav'));
    const native=document.querySelector('.main > .content');if(native)native.style.display='none';
    const host=document.getElementById('ciHost');if(host){host.classList.add('active');host.dataset.ciView='splits';}
    const title=document.querySelector('.page-title');if(title)title.textContent='Split Tests';
    const crumb=document.querySelector('.breadcrumb');if(crumb)crumb.textContent='CreativeOS Intelligence';
    if(!S.productId||!product(S.productId)){S.productId=products()[0]?.id||'';sessionStorage.setItem('creativeos_split_product',S.productId);}
    render();
  }
  function deactivate(){S.custom=false;sessionStorage.removeItem('creativeos_ci_custom_view');const b=document.getElementById('cisSplitNav');b?.classList.remove('active');}

  function productTabs(){return`<div class="cis-product-tabs">${products().map(p=>`<button class="${S.productId===p.id?'active':''}" data-cis-product="${esc(p.id)}"><span>${esc(p.name)}</span><small>Día ${fmt(p.day)}</small></button>`).join('')}</div>`;}
  function hero(p){return`<div class="ci-hero cis-hero"><div><div class="ci-eyebrow">CreativeOS · Experimentos</div><h1>Split Tests</h1><p>Convierte cada winner en una cadena de tests. El test se clasifica por la <b>variable principal</b>; si esa decisión obliga a adaptar otra cosa, se guarda como ajuste derivado sin cambiar la clasificación.</p></div><div class="ci-actions"><button class="ci-btn primary" data-cis-new-test>+ Nuevo split</button><button class="ci-btn" data-cis-refresh>↻ Actualizar</button></div></div>${productTabs()}<div class="cis-product-context"><span>Producto activo</span><b>${esc(p?.name||'—')}</b><i></i><span>${tests().filter(t=>t.status==='active'||t.status==='planned').length} tests activos</span><i></i><span>${tests().length} tests totales</span></div>`;}

  function productionPlan(){
    const active=tests().filter(t=>['active','planned'].includes(t.status));
    const cards=[];
    for(const t of active){
      for(const v of variants(t.id)){
        const dna=resolvedDNA(t,v);
        cards.push(`<article class="cis-plan-card ${esc(v.production_status)}">
          <div class="cis-plan-head"><div><span>${esc(varLabel(t.primary_variable))}</span><h3>${esc(t.name)} · ${esc(v.label)}</h3></div><b>${fmt(v.views)} views</b></div>
          <div class="cis-primary-value"><small>Variable principal</small><strong>${esc(v.primary_value||dna[t.primary_variable]||'Por definir')}</strong></div>
          <div class="cis-mini-dna">${VARS.filter(([k])=>k!==t.primary_variable).map(([k,l])=>dna[k]?`<span><small>${esc(l)}</small>${esc(dna[k])}</span>`:'').join('')}</div>
          ${statusSteps(v)}
          <div class="cis-plan-actions"><button data-cis-edit-variant="${esc(v.id)}">Editar plan</button>${['published','waiting_data','data_ready'].includes(v.production_status)?`<button data-cis-metrics="${esc(v.id)}">Meter data</button>`:''}</div>
        </article>`);
      }
    }
    return`<section class="cis-section"><div class="cis-section-head"><div><span>Producción</span><h2>Qué tengo que hacer ahora</h2><p>Checklist viva de los vídeos de tus tests activos.</p></div><b>${cards.length} variantes</b></div><div class="cis-plan-grid">${cards.join('')||'<div class="cis-empty"><b>No hay split tests activos</b><span>Crea uno desde un winner y aquí aparecerá tu plan de producción.</span><button class="ci-btn primary" data-cis-new-test>Crear primer split</button></div>'}</div></section>`;
  }

  function statusSteps(v){
    const current=STATUS.findIndex(x=>x[0]===v.production_status);
    return`<div class="cis-status-steps">${STATUS.map(([k,l],i)=>`<button class="${i<=current?'done':''} ${i===current?'current':''}" data-cis-status="${k}" data-variant="${esc(v.id)}"><i>${i<current?'✓':i+1}</i><span>${esc(l)}</span></button>`).join('')}</div>`;
  }

  function experimentCards(){
    const active=tests().filter(t=>['active','planned'].includes(t.status));
    return`<section class="cis-section"><div class="cis-section-head"><div><span>Experimento activo</span><h2>Qué variable estás intentando aislar</h2><p>Los cambios secundarios necesarios no convierten el test en multivariable: se registran como ajustes derivados.</p></div></div><div class="cis-test-stack">${active.map(testCard).join('')||'<div class="cis-empty"><span>Sin experimentos activos.</span></div>'}</div></section>`;
  }

  function testCard(t){
    const vs=variants(t.id),winner=vs.find(v=>v.id===t.winner_variant_id||v.is_winner);
    return`<article class="cis-test-card">
      <div class="cis-test-accent" data-var="${esc(t.primary_variable)}"></div>
      <div class="cis-test-head"><div><div class="cis-kickers"><span class="cis-var-chip">Split · ${esc(varLabel(t.primary_variable))}</span><span>${esc(t.start_date||'Sin fecha')}</span></div><h3>${esc(t.name)}</h3><p>${esc(t.goal||'Sin objetivo añadido.')}</p></div><div class="cis-test-head-actions"><button data-cis-edit-test="${esc(t.id)}">Editar</button><button class="danger" data-cis-delete-test="${esc(t.id)}">Eliminar</button></div></div>
      <div class="cis-source-row"><span>Parte de</span><b>${esc(t.source_label||'Winner / control')}</b>${t.source_views!=null?`<strong>${fmt(t.source_views)} views</strong>`:''}</div>
      <div class="cis-lock-row"><span>Intención de mantener</span>${VARS.filter(([k])=>k!==t.primary_variable).map(([,l])=>`<small>${esc(l)}</small>`).join('')}<em>Si alguno debe adaptarse para que la variante tenga sentido, se registra como ajuste derivado.</em></div>
      <div class="cis-variant-grid">${vs.map(v=>variantCard(t,v)).join('')}</div>
      ${winner?`<div class="cis-winner-strip"><div><span>Winner</span><b>${esc(winner.label)} · ${esc(winner.primary_value||'Variante ganadora')}</b><small>${fmt(winner.views)} views</small></div><button class="ci-btn primary" data-cis-child-test="${esc(winner.id)}">+ Siguiente split desde este winner</button></div>`:''}
    </article>`;
  }

  function variantCard(t,v){
    const dna=resolvedDNA(t,v);const secondary=Object.entries(v.derived_changes||{}).filter(([k,val])=>k!==t.primary_variable&&String(val||'').trim());
    return`<div class="cis-variant-card ${v.is_winner?'winner':''}">
      <div class="cis-variant-top"><span class="cis-variant-label">${esc(v.label)}</span><span class="cis-status-pill ${esc(v.production_status)}">${esc(statusLabel(v.production_status))}</span></div>
      <h4>${esc(v.title||v.primary_value||`Variante ${v.label}`)}</h4>
      <div class="cis-primary-value compact"><small>${esc(varLabel(t.primary_variable))}</small><strong>${esc(v.primary_value||dna[t.primary_variable]||'Por definir')}</strong></div>
      ${secondary.length?`<div class="cis-derived"><small>Ajustes derivados</small>${secondary.map(([k,val])=>`<span><b>${esc(varLabel(k))}</b>${esc(val)}</span>`).join('')}</div>`:''}
      <div class="cis-result-numbers"><span><b>${fmt(v.views)}</b>views</span><span><b>${fmt(v.sales)}</b>ventas</span></div>
      <div class="cis-variant-actions"><button data-cis-edit-variant="${esc(v.id)}">Editar</button><button data-cis-metrics="${esc(v.id)}">Data</button>${!v.is_winner?`<button class="winner" data-cis-winner="${esc(v.id)}" data-test="${esc(t.id)}">Marcar winner</button>`:'<b>★ Winner</b>'}</div>
    </div>`;
  }

  function treeSection(){
    const ts=tests().slice().sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
    if(!ts.length)return`<section class="cis-section"><div class="cis-section-head"><div><span>Evolución</span><h2>Árbol de winners</h2></div></div><div class="cis-empty"><span>El árbol aparecerá cuando crees tu primer split.</span></div></section>`;
    const byParent=new Map();for(const t of ts){const k=t.parent_variant_id||'root';if(!byParent.has(k))byParent.set(k,[]);byParent.get(k).push(t);}
    const renderNode=t=>{
      const vs=variants(t.id);return`<li><div class="cis-tree-test ${esc(t.status)}"><span>${esc(varLabel(t.primary_variable))}</span><b>${esc(t.name)}</b><small>${t.status==='completed'?'Cerrado':'Activo'}</small></div><ul class="cis-tree-variants">${vs.map(v=>{const child=byParent.get(v.id)||[];return`<li class="${v.is_winner?'winner':''}"><div class="cis-tree-variant"><span>${esc(v.label)}</span><b>${esc(v.primary_value||'Variante')}</b><small>${fmt(v.views)} views</small>${v.is_winner?'<i>★</i>':''}</div>${child.length?`<ul>${child.map(renderNode).join('')}</ul>`:''}</li>`;}).join('')}</ul></li>`;
    };
    const roots=byParent.get('root')||ts.filter(t=>!ts.some(x=>variants(x.id).some(v=>v.id===t.parent_variant_id)));
    return`<section class="cis-section"><div class="cis-section-head"><div><span>Evolución</span><h2>Árbol de winners</h2><p>Un winner puede convertirse en la raíz del siguiente split.</p></div><div class="cis-view-toggle"><button class="${S.detailMode==='tree'?'active':''}" data-cis-detail-mode="tree">Árbol</button><button class="${S.detailMode==='list'?'active':''}" data-cis-detail-mode="list">Cronología</button></div></div>${S.detailMode==='tree'?`<div class="cis-tree"><ul>${roots.map(renderNode).join('')}</ul></div>`:historyList(ts)}</section>`;
  }

  function historyList(ts=tests().slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))){
    return`<div class="cis-history">${ts.map((t,i)=>{const vs=variants(t.id),winner=vs.find(v=>v.is_winner||v.id===t.winner_variant_id),best=Math.max(0,...vs.map(v=>Number(v.views||0)));return`<div class="cis-history-row"><span class="cis-history-num">${String(ts.length-i).padStart(2,'0')}</span><div><small>${esc(t.start_date||String(t.created_at||'').slice(0,10))} · ${esc(varLabel(t.primary_variable))}</small><b>${esc(t.name)}</b><p>${esc(t.source_label||'Sin fuente')} → ${vs.length} variantes</p></div><div class="cis-history-results"><span><b>${fmt(best||null)}</b> best views</span><span><b>${winner?esc(winner.label):'—'}</b> winner</span><em class="${esc(t.status)}">${t.status==='completed'?'Cerrado':t.status==='paused'?'Pausado':'Activo'}</em></div></div>`;}).join('')}</div>`;
  }

  function render(){
    if(!S.custom)return;const host=document.getElementById('ciHost');if(!host)return;
    const p=product(S.productId)||products()[0]||null;if(p&&S.productId!==p.id){S.productId=p.id;sessionStorage.setItem('creativeos_split_product',p.id);}
    host.dataset.ciView='splits';host.innerHTML=`${hero(p)}${productionPlan()}${experimentCards()}${treeSection()}`;
  }

  function matrixDetail(pid,type){
    const p=product(pid),wfs=(snap().workflows||[]).filter(w=>w.product_id===pid);const occurrences=[];
    for(const w of wfs)for(const n of w.nodes||[])if(n.type===type&&String(n.value||'').trim())occurrences.push({workflow:w,value:String(n.value).trim()});
    const unique=[];const seen=new Set();for(const x of occurrences)if(!seen.has(x.value)){seen.add(x.value);unique.push(x);}
    const root=modalRoot();root.innerHTML=`<div class="cis-backdrop"></div><div class="cis-modal cis-matrix-modal"><div class="cis-modal-head"><div><span>Matriz · ${esc(p?.name||'Producto')}</span><h2>${esc(varLabel(type))}</h2></div><button data-cis-close>×</button></div><div class="cis-matrix-detail-list">${unique.map(x=>`<div><div><b>${esc(x.value)}</b><small>${esc(x.workflow.name)} · ${esc(x.workflow.status||'workflow')}</small></div><button data-cis-open-workflow="${esc(x.workflow.id)}" data-product="${esc(pid)}">Editar en workflow →</button></div>`).join('')||'<div class="cis-empty"><span>No hay variantes registradas todavía.</span></div>'}</div><div class="cis-modal-foot"><button class="ci-btn" data-cis-close>Cerrar</button><button class="ci-btn primary" data-cis-open-testing="${esc(pid)}">Abrir Testing</button></div></div>`;
  }

  function modalRoot(){let r=document.getElementById('cisModalRoot');if(!r){r=document.createElement('div');r.id='cisModalRoot';document.body.appendChild(r);}return r;}
  function closeModal(){document.getElementById('cisModalRoot')?.replaceChildren();S.modal=null;}

  function testModal(item=null,parentVariantId=null){
    const p=product(S.productId);let inherited={},sourceLabel='',sourceViews='';
    if(parentVariantId){
      const pv=(snap().splitVariants||[]).find(v=>v.id===parentVariantId);const pt=(snap().splitTests||[]).find(t=>t.id===pv?.test_id);
      inherited=resolvedDNA(pt,pv);sourceLabel=`${pt?.name||'Test'} · ${pv?.label||'Winner'}`;sourceViews=pv?.views??'';
    }else if(item){inherited=item.baseline_dna||{};sourceLabel=item.source_label||'';sourceViews=item.source_views??'';}
    const root=modalRoot();const variable=item?.primary_variable||'avatar';
    root.innerHTML=`<div class="cis-backdrop"></div><div class="cis-modal cis-test-modal"><div class="cis-modal-head"><div><span>${item?'Editar experimento':'Nuevo experimento'} · ${esc(p?.name||'')}</span><h2>${item?esc(item.name):'Crear split test'}</h2></div><button data-cis-close>×</button></div>
      <div class="cis-form-grid">
        <label class="wide">Nombre del test<input id="cisTestName" value="${esc(item?.name||'')}" placeholder="Ej. Winner 500K → Avatar test"></label>
        <label>Variable principal<select id="cisPrimaryVar">${VARS.map(([k,l])=>`<option value="${k}" ${variable===k?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
        <label>Estado<select id="cisTestStatus">${['planned','active','paused','completed'].map(k=>`<option value="${k}" ${(item?.status||'active')===k?'selected':''}>${k==='planned'?'Planificado':k==='active'?'Activo':k==='paused'?'Pausado':'Cerrado'}</option>`).join('')}</select></label>
        <label>Fecha inicio<input id="cisStartDate" type="date" value="${esc(item?.start_date||today())}"></label>
        <label>Fuente / winner<input id="cisSourceLabel" value="${esc(sourceLabel)}" placeholder="Vídeo basketball winner"></label>
        <label>Views de la fuente<input id="cisSourceViews" type="number" min="0" value="${esc(sourceViews)}" placeholder="500000"></label>
        <label class="wide">Objetivo<textarea id="cisGoal" placeholder="Qué quieres aprender con este split">${esc(item?.goal||'')}</textarea></label>
      </div>
      <div class="cis-form-block"><div><b>ADN del control / winner</b><span>Es lo que intentas mantener. Si una variante obliga a adaptar algo, lo guardas después como ajuste derivado.</span></div><div class="cis-dna-form">${VARS.map(([k,l])=>`<label>${esc(l)}<input data-cis-baseline="${k}" value="${esc(inherited[k]||'')}" placeholder="${esc(l)} del control"></label>`).join('')}</div></div>
      ${!item?`<div class="cis-form-grid compact"><label>Nº de variantes<select id="cisVariantCount">${[2,3,4,5,6].map(n=>`<option value="${n}" ${n===3?'selected':''}>${n}</option>`).join('')}</select></label><div class="cis-rule-note"><b>Regla de clasificación</b><span>Si eliges Avatar y tienes que adaptar el texto, el test sigue siendo <strong>Avatar</strong>. El texto se guarda como ajuste derivado.</span></div></div>`:''}
      <div class="cis-modal-foot"><button class="ci-btn" data-cis-close>Cancelar</button><button class="ci-btn primary" data-cis-save-test="${esc(item?.id||'')}" data-parent="${esc(parentVariantId||item?.parent_variant_id||'')}">${item?'Guardar cambios':'Crear split'}</button></div></div>`;
  }

  function variantModal(v){
    const t=(snap().splitTests||[]).find(x=>x.id===v.test_id);if(!t)return;const dna=resolvedDNA(t,v);
    const root=modalRoot();root.innerHTML=`<div class="cis-backdrop"></div><div class="cis-modal cis-variant-modal"><div class="cis-modal-head"><div><span>${esc(t.name)}</span><h2>${esc(v.label)} · ${esc(varLabel(t.primary_variable))}</h2></div><button data-cis-close>×</button></div>
      <div class="cis-primary-editor"><label><span>VARIABLE PRINCIPAL · ${esc(varLabel(t.primary_variable))}</span><input id="cisPrimaryValue" value="${esc(v.primary_value||dna[t.primary_variable]||'')}" placeholder="Qué cambia en esta variante"></label></div>
      <div class="cis-derived-editor"><div><b>Plan completo del vídeo</b><span>Los demás campos son contexto. Solo los que cambien respecto al control cuentan como ajustes derivados.</span></div><div class="cis-dna-form">${VARS.filter(([k])=>k!==t.primary_variable).map(([k,l])=>`<label>${esc(l)}<input data-cis-derived="${k}" value="${esc((v.derived_changes||{})[k]||'')}" placeholder="Mantener: ${esc((t.baseline_dna||{})[k]||l)}"></label>`).join('')}</div></div>
      <div class="cis-form-grid compact"><label>Título / nota corta<input id="cisVariantTitle" value="${esc(v.title||'')}"></label><label>Estado<select id="cisVariantStatus">${STATUS.map(([k,l])=>`<option value="${k}" ${v.production_status===k?'selected':''}>${esc(l)}</option>`).join('')}</select></label><label class="wide">Notas<textarea id="cisVariantNotes">${esc(v.notes||'')}</textarea></label></div>
      <div class="cis-modal-foot"><button class="ci-btn danger" data-cis-delete-variant="${esc(v.id)}">Eliminar variante</button><span></span><button class="ci-btn" data-cis-close>Cancelar</button><button class="ci-btn primary" data-cis-save-variant="${esc(v.id)}">Guardar variante</button></div></div>`;
  }

  function metricsModal(v){
    const t=(snap().splitTests||[]).find(x=>x.id===v.test_id);const root=modalRoot();
    root.innerHTML=`<div class="cis-backdrop"></div><div class="cis-modal cis-metrics-modal"><div class="cis-modal-head"><div><span>${esc(t?.name||'Split test')} · ${esc(v.label)}</span><h2>Registrar resultado</h2></div><button data-cis-close>×</button></div><div class="cis-metrics-big"><label>Views<input id="cisViews" type="number" min="0" value="${esc(v.views??'')}" placeholder="0"></label><label>Ventas<input id="cisSales" type="number" min="0" value="${esc(v.sales??'')}" placeholder="0"></label><label>Likes<input id="cisLikes" type="number" min="0" value="${esc(v.likes??'')}" placeholder="0"></label><label>Comentarios<input id="cisComments" type="number" min="0" value="${esc(v.comments??'')}" placeholder="0"></label></div><label class="cis-modal-notes">Notas<textarea id="cisMetricNotes">${esc(v.notes||'')}</textarea></label><div class="cis-modal-foot"><button class="ci-btn" data-cis-close>Cancelar</button><button class="ci-btn primary" data-cis-save-metrics="${esc(v.id)}">Guardar data</button></div></div>`;
  }

  async function saveTest(id,parentVariantId){
    const name=document.getElementById('cisTestName')?.value.trim();if(!name)throw new Error('Pon un nombre al split test.');
    const primary=document.getElementById('cisPrimaryVar')?.value||'avatar';const baseline={};document.querySelectorAll('[data-cis-baseline]').forEach(x=>{if(x.value.trim())baseline[x.dataset.cisBaseline]=x.value.trim();});
    const body={action:'upsert_split_test',id:id||uid('st'),product_id:S.productId,name,primary_variable:primary,status:document.getElementById('cisTestStatus')?.value||'active',source_kind:parentVariantId?'split_winner':'winner',source_label:document.getElementById('cisSourceLabel')?.value.trim()||null,source_views:valueNum('cisSourceViews'),parent_variant_id:parentVariantId||null,baseline_dna:baseline,locked_variables:VARS.map(x=>x[0]).filter(k=>k!==primary),goal:document.getElementById('cisGoal')?.value.trim()||null,start_date:document.getElementById('cisStartDate')?.value||today()};
    await post(body);
    if(!id){const count=Number(document.getElementById('cisVariantCount')?.value||3);for(let i=0;i<count;i++)await post({action:'upsert_split_variant',id:uid('sv'),test_id:body.id,label:String.fromCharCode(65+i),title:`Variante ${String.fromCharCode(65+i)}`,primary_value:'',overrides:{},derived_changes:{},production_status:'waiting_record',sort_order:i});}
    closeModal();await refresh();toast(id?'Split actualizado':'Split creado');
  }
  const valueNum=id=>{const v=document.getElementById(id)?.value;return v===''||v===undefined?null:Number(v);};

  async function saveVariant(id){
    const v=(snap().splitVariants||[]).find(x=>x.id===id);const t=(snap().splitTests||[]).find(x=>x.id===v?.test_id);if(!v||!t)return;
    const derived={};document.querySelectorAll('[data-cis-derived]').forEach(x=>{if(x.value.trim())derived[x.dataset.cisDerived]=x.value.trim();});
    const primary=document.getElementById('cisPrimaryValue')?.value.trim()||'';
    await post({action:'upsert_split_variant',...v,primary_value:primary,overrides:primary?{[t.primary_variable]:primary}:{},derived_changes:derived,title:document.getElementById('cisVariantTitle')?.value.trim()||v.title,production_status:document.getElementById('cisVariantStatus')?.value||v.production_status,notes:document.getElementById('cisVariantNotes')?.value.trim()||null});
    closeModal();await refresh();toast('Variante guardada');
  }

  async function setStatus(id,status){const v=(snap().splitVariants||[]).find(x=>x.id===id);if(!v)return;await post({action:'upsert_split_variant',...v,production_status:status,posted_at:status==='published'&&!v.posted_at?isoNow():v.posted_at,metric_date:status==='data_ready'?today():v.metric_date});await refresh();}
  async function saveMetrics(id){const v=(snap().splitVariants||[]).find(x=>x.id===id);if(!v)return;await post({action:'upsert_split_variant',...v,views:valueNum('cisViews'),sales:valueNum('cisSales'),likes:valueNum('cisLikes'),comments:valueNum('cisComments'),notes:document.getElementById('cisMetricNotes')?.value.trim()||null,production_status:'data_ready',metric_date:today()});closeModal();await refresh();toast('Data guardada');}
  async function markWinner(testId,variantId){if(!confirm('¿Marcar esta variante como winner y cerrar este split?'))return;await post({action:'set_split_winner',test_id:testId,variant_id:variantId,end_date:today()});await refresh();toast('Winner marcado');}
  async function deleteTest(id){if(!confirm('¿Eliminar este split test y sus variantes?'))return;await post({action:'delete_split_test',id});await refresh();toast('Split eliminado');}
  async function deleteVariant(id){if(!confirm('¿Eliminar esta variante?'))return;await post({action:'delete_split_variant',id});closeModal();await refresh();toast('Variante eliminada');}

  function openTesting(pid,wid=null){document.querySelector('[data-ci-route="testing"]')?.click();setTimeout(()=>{document.querySelector(`[data-ci-test-product="${CSS.escape(pid)}"]`)?.click();if(wid)setTimeout(()=>document.querySelector(`[data-ci-workflow="${CSS.escape(wid)}"]`)?.click(),150);},130);}

  document.addEventListener('click',e=>{
    ensureNav();
    if(e.target.closest?.('[data-cis-split-route]')){e.preventDefault();e.stopPropagation();activate();return;}
    if(e.target.closest?.('[data-ci-route],.nav-btn')&&!e.target.closest?.('[data-cis-split-route]')){deactivate();return;}
    if(!S.custom){
      const matrix=e.target.closest?.('[data-cis-matrix-product]');if(matrix){matrixDetail(matrix.dataset.cisMatrixProduct,matrix.dataset.variable);return;}
      return;
    }
    const p=e.target.closest?.('[data-cis-product]');if(p){S.productId=p.dataset.cisProduct;sessionStorage.setItem('creativeos_split_product',S.productId);render();return;}
    if(e.target.closest?.('[data-cis-refresh]')){guard(refresh);return;}
    if(e.target.closest?.('[data-cis-new-test]')){testModal();return;}
    const et=e.target.closest?.('[data-cis-edit-test]');if(et){testModal((snap().splitTests||[]).find(x=>x.id===et.dataset.cisEditTest));return;}
    const dt=e.target.closest?.('[data-cis-delete-test]');if(dt){guard(()=>deleteTest(dt.dataset.cisDeleteTest));return;}
    const child=e.target.closest?.('[data-cis-child-test]');if(child){testModal(null,child.dataset.cisChildTest);return;}
    const ev=e.target.closest?.('[data-cis-edit-variant]');if(ev){variantModal((snap().splitVariants||[]).find(x=>x.id===ev.dataset.cisEditVariant));return;}
    const met=e.target.closest?.('[data-cis-metrics]');if(met){metricsModal((snap().splitVariants||[]).find(x=>x.id===met.dataset.cisMetrics));return;}
    const st=e.target.closest?.('[data-cis-status]');if(st){guard(()=>setStatus(st.dataset.variant,st.dataset.cisStatus));return;}
    const win=e.target.closest?.('[data-cis-winner]');if(win){guard(()=>markWinner(win.dataset.test,win.dataset.cisWinner));return;}
    const mode=e.target.closest?.('[data-cis-detail-mode]');if(mode){S.detailMode=mode.dataset.cisDetailMode;sessionStorage.setItem('creativeos_split_detail_mode',S.detailMode);render();return;}
    const close=e.target.closest?.('[data-cis-close]');if(close){closeModal();return;}
    const saveT=e.target.closest?.('[data-cis-save-test]');if(saveT){guard(()=>saveTest(saveT.dataset.cisSaveTest||null,saveT.dataset.parent||null));return;}
    const saveV=e.target.closest?.('[data-cis-save-variant]');if(saveV){guard(()=>saveVariant(saveV.dataset.cisSaveVariant));return;}
    const saveM=e.target.closest?.('[data-cis-save-metrics]');if(saveM){guard(()=>saveMetrics(saveM.dataset.cisSaveMetrics));return;}
    const delV=e.target.closest?.('[data-cis-delete-variant]');if(delV){guard(()=>deleteVariant(delV.dataset.cisDeleteVariant));return;}
    const ow=e.target.closest?.('[data-cis-open-workflow]');if(ow){closeModal();openTesting(ow.dataset.product,ow.dataset.cisOpenWorkflow);return;}
    const ot=e.target.closest?.('[data-cis-open-testing]');if(ot){closeModal();openTesting(ot.dataset.cisOpenTesting);return;}
  },true);

  document.addEventListener('creativeos:intelligence-render',()=>requestAnimationFrame(()=>{ensureNav();if(S.custom)render();else enhanceMatrix();}));
  const mo=new MutationObserver(()=>requestAnimationFrame(()=>{ensureNav();enhanceMatrix();}));
  document.addEventListener('DOMContentLoaded',()=>{ensureNav();mo.observe(document.body,{childList:true,subtree:true});if(sessionStorage.getItem('creativeos_ci_custom_view')==='splits')setTimeout(activate,100);else setTimeout(enhanceMatrix,120);},{once:true});
  if(document.body){ensureNav();mo.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{if(sessionStorage.getItem('creativeos_ci_custom_view')==='splits')activate();else enhanceMatrix();},120);}

  window.CreativeOSSplitTests={activate,render,version:'1.0'};
})();