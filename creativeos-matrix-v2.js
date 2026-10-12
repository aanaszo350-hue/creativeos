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
  const COLORS={strideshield:'#60a5fa',plnwzcp:'#a78bfa',flowerpress:'#34d399'};
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const snap=()=>window.CreativeOSIntelligence?.getSnapshot?.()||{};
  const products=()=>snap().products||[];
  const workflows=pid=>(snap().workflows||[]).filter(w=>w.product_id===pid);
  const winnerData=()=>window.CreativeOSWinnerLab?.getData?.()||{winnerPlans:[],winnerTracks:[],winnerAttempts:[]};
  const fmt=n=>n===null||n===undefined||n===''?'—':Number(n).toLocaleString('es-ES');

  function valuesFor(pid,type){
    const vals=[];
    for(const w of workflows(pid))for(const n of w.nodes||[])if(n.type===type&&String(n.value||'').trim())vals.push({value:String(n.value).trim(),source:`Workflow · ${w.name}`,workflowId:w.id,views:null,isBest:false});
    const wd=winnerData();const planIds=(wd.winnerPlans||[]).filter(w=>w.product_id===pid).map(w=>w.id);const ts=(wd.winnerTracks||[]).filter(t=>planIds.includes(t.winner_id)&&t.variable===type);
    for(const t of ts)for(const a of (wd.winnerAttempts||[]).filter(a=>a.track_id===t.id))vals.push({value:a.title,source:'Winner Lab',attemptId:a.id,views:a.views,isBest:a.is_best,discarded:a.is_discarded});
    const seen=new Set();return vals.filter(x=>{const k=`${x.value}|${x.source}|${x.workflowId||x.attemptId||''}`;if(seen.has(k))return false;seen.add(k);return true;});
  }

  function render(){
    const host=document.getElementById('ciHost');if(!host||host.dataset.ciView!=='avatars')return;
    const cards=products().map(p=>{
      const color=COLORS[p.id]||'#64748b';
      const items=VARS.map(([key,label])=>{const vals=valuesFor(p.id,key);const best=vals.find(v=>v.isBest);return`<button class="cimx-var" data-cimx-variable="${esc(key)}" data-product="${esc(p.id)}"><div><span>${esc(label)}</span><b>${vals.length?`${vals.length} ${vals.length===1?'variante':'variantes'}`:'Sin registrar'}</b></div><p>${best?`★ ${esc(best.value)}${best.views!=null?` · ${fmt(best.views)} views`:''}`:vals[0]?esc(vals[0].value):'Clica para abrir esta variable'}</p><strong>Abrir →</strong></button>`;}).join('');
      return`<section class="cimx-product" style="--mx:${color}"><div class="cimx-product-head"><div><span>Producto · Día ${fmt(p.day)}</span><h2>${esc(p.name)}</h2><p>${workflows(p.id).length} workflows · ${winnerData().winnerPlans?.filter(w=>w.product_id===p.id).length||0} winners</p></div><div><button data-cimx-open-testing="${esc(p.id)}">Abrir Testing</button><button data-cimx-open-splits="${esc(p.id)}">Split Tests</button></div></div><div class="cimx-grid">${items}</div></section>`;
    }).join('');
    host.innerHTML=`<div class="ci-hero cimx-hero"><div><div class="ci-eyebrow">CreativeOS Intelligence</div><h1>Matriz de Tests</h1><p>Memoria histórica por producto. Clica cualquier variable para ver exactamente qué has probado, desde qué workflow y qué resultados tienes.</p></div></div><div class="cimx-stack">${cards}</div>`;
  }

  function openVariable(pid,type){
    const p=products().find(x=>x.id===pid),label=VARS.find(x=>x[0]===type)?.[1]||type,vals=valuesFor(pid,type);const wf=workflows(pid).find(w=>(w.nodes||[]).some(n=>n.type===type));
    close();const root=document.createElement('div');root.id='cimxModalRoot';root.className='cimx-modal-root';root.innerHTML=`<div class="cimx-backdrop"></div><div class="cimx-modal" style="--mx:${COLORS[pid]||'#64748b'}"><div class="cimx-modal-head"><div><span>${esc(p?.name||pid)}</span><h2>${esc(label)}</h2><p>${vals.length} registros encontrados</p></div><button data-cimx-close>×</button></div><div class="cimx-list">${vals.map(v=>`<article class="${v.isBest?'best':''} ${v.discarded?'discarded':''}"><div><small>${esc(v.source)}</small><b>${v.isBest?'★ ':''}${esc(v.value)}</b></div><span>${v.views!=null?`${fmt(v.views)} views`:'Sin data'}</span></article>`).join('')||'<div class="cimx-empty">Todavía no hay nada registrado en esta variable.</div>'}</div><div class="cimx-modal-actions"><button data-cimx-close>Volver</button><button data-cimx-open-testing="${esc(pid)}">Abrir Testing</button>${wf?`<button class="primary" data-cimx-edit-workflow="${esc(wf.id)}" data-product="${esc(pid)}">Editar workflow</button>`:''}<button data-cimx-open-splits="${esc(pid)}">Abrir Split Tests</button></div></div>`;document.body.appendChild(root);
  }
  function close(){document.getElementById('cimxModalRoot')?.remove();}
  function openTesting(pid,workflowId=null){
    close();sessionStorage.setItem('creativeos_ci_product',pid);if(workflowId)sessionStorage.setItem('creativeos_ci_workflow',workflowId);
    window.CreativeOSIntelligence?.activate?.('testing');
    setTimeout(()=>{document.querySelector(`[data-ci-test-product="${CSS.escape(pid)}"]`)?.click();if(workflowId)setTimeout(()=>document.querySelector(`[data-ci-workflow="${CSS.escape(workflowId)}"]`)?.click(),180);},120);
  }
  function openSplits(pid){close();sessionStorage.setItem('creativeos_winner_product',pid);const lab=window.CreativeOSWinnerLab;if(lab){lab.activate();setTimeout(()=>document.querySelector(`[data-ciw-product="${CSS.escape(pid)}"]`)?.click(),80);}}

  window.addEventListener('click',e=>{
    const v=e.target.closest?.('[data-cimx-variable]');if(v){e.preventDefault();e.stopImmediatePropagation();openVariable(v.dataset.product,v.dataset.cimxVariable);return;}
    if(e.target.closest?.('[data-cimx-close]')||e.target.classList?.contains('cimx-backdrop')){e.preventDefault();close();return;}
    const ot=e.target.closest?.('[data-cimx-open-testing]');if(ot){e.preventDefault();e.stopImmediatePropagation();openTesting(ot.dataset.cimxOpenTesting);return;}
    const ew=e.target.closest?.('[data-cimx-edit-workflow]');if(ew){e.preventDefault();e.stopImmediatePropagation();openTesting(ew.dataset.product,ew.dataset.cimxEditWorkflow);return;}
    const os=e.target.closest?.('[data-cimx-open-splits]');if(os){e.preventDefault();e.stopImmediatePropagation();openSplits(os.dataset.cimxOpenSplits);return;}
  },true);

  document.addEventListener('creativeos:intelligence-render',()=>setTimeout(render,0));
  window.addEventListener('creativeos:winner-lab-updated',()=>{if(document.getElementById('ciHost')?.dataset?.ciView==='avatars')render();});
  const mo=new MutationObserver(()=>{const host=document.getElementById('ciHost');if(host?.dataset?.ciView==='avatars'&&!host.querySelector('.cimx-product'))setTimeout(render,0);});
  if(document.body)mo.observe(document.body,{childList:true,subtree:true});

  window.CreativeOSMatrixV2={render,openVariable,version:'2.0'};
})();