(() => {
  'use strict';
  const fmt=n=>n===null||n===undefined||n===''?'—':Number(n).toLocaleString('es-ES');
  const snap=()=>window.CreativeOSIntelligence?.getSnapshot?.()||{};

  function selectedProduct(){
    return document.querySelector('[data-cis-product].active')?.dataset?.cisProduct||sessionStorage.getItem('creativeos_split_product')||'';
  }

  function decorate(){
    const host=document.getElementById('ciHost');
    if(!host||host.dataset.ciView!=='splits')return;
    host.querySelectorAll('.cis-continuation-strip').forEach(x=>x.remove());
    const pid=selectedProduct();if(!pid)return;
    const s=snap(),tests=(s.splitTests||[]).filter(t=>t.product_id===pid),vars=s.splitVariants||[];
    const childParents=new Set(tests.map(t=>t.parent_variant_id).filter(Boolean));
    const candidates=tests.filter(t=>t.status==='completed'&&t.winner_variant_id&&!childParents.has(t.winner_variant_id)).sort((a,b)=>String(b.end_date||b.updated_at||b.created_at).localeCompare(String(a.end_date||a.updated_at||a.created_at)));
    const t=candidates[0];if(!t)return;
    const v=vars.find(x=>x.id===t.winner_variant_id);if(!v)return;
    const section=[...host.querySelectorAll('.cis-section')].find(x=>x.textContent.includes('Árbol de winners'))||host.querySelector('.cis-section:last-of-type');
    if(!section)return;
    const strip=document.createElement('div');strip.className='cis-winner-strip cis-continuation-strip';
    strip.innerHTML=`<div><span>Winner listo para iterar</span><b>${String(t.name||'Split')} · ${String(v.label||'Winner')}</b><small>${fmt(v.views)} views</small></div><button class="ci-btn primary" data-cis-child-test="${String(v.id).replace(/"/g,'&quot;')}">+ Siguiente split desde este winner</button>`;
    section.insertBefore(strip,section.children[1]||null);
  }

  const mo=new MutationObserver(()=>requestAnimationFrame(decorate));
  document.addEventListener('DOMContentLoaded',()=>{const host=document.getElementById('ciHost')||document.body;mo.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-ci-view']});decorate();},{once:true});
  if(document.body){const host=document.getElementById('ciHost')||document.body;mo.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-ci-view']});setTimeout(decorate,120);}
  window.CreativeOSSplitContinuation={decorate,version:'1.0'};
})();