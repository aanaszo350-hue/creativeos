(() => {
  'use strict';
  if (window.CreativeOSSplitSheetGroups?.version === '1.2') return;

  const GROUPS = {
    summary: { label: 'Resumen del test', icon: '◇', color: '#94a3b8', soft: 'rgba(148,163,184,.07)' },
    angle: { label: 'Ángulo / Contexto', icon: '↗', color: '#22d3ee', soft: 'rgba(34,211,238,.07)' },
    copy: { label: 'Texto / Copy', icon: 'T', color: '#f59e0b', soft: 'rgba(245,158,11,.07)' },
    visual: { label: 'Visual / Ejecución', icon: '◈', color: '#a78bfa', soft: 'rgba(167,139,250,.07)' },
    avatar: { label: 'Avatar', icon: '◎', color: '#f472b6', soft: 'rgba(244,114,182,.07)' },
    context: { label: 'Fondo / Contexto', icon: '▧', color: '#60a5fa', soft: 'rgba(96,165,250,.07)' },
    refs: { label: 'Referencias', icon: '⌕', color: '#818cf8', soft: 'rgba(129,140,248,.07)' },
    strategy: { label: 'Estrategia / Aprendizaje', icon: '✦', color: '#34d399', soft: 'rgba(52,211,153,.065)' }
  };

  function injectCss() {
    if (document.getElementById('cos5GroupStyle')) return;
    const s = document.createElement('style');
    s.id = 'cos5GroupStyle';
    s.textContent = `
      .cos5-sheet-stack{display:grid;gap:14px}
      .cos5-group{--g:#94a3b8;--gs:rgba(148,163,184,.07);border:1px solid color-mix(in srgb,var(--g) 22%,rgba(255,255,255,.05));border-left:3px solid var(--g);border-radius:16px;background:linear-gradient(135deg,var(--gs),rgba(13,20,29,.92) 42%);overflow:hidden}
      .cos5-group-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid color-mix(in srgb,var(--g) 15%,rgba(255,255,255,.045))}
      .cos5-group-icon{width:29px;height:29px;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb,var(--g) 12%,transparent);color:var(--g);font-size:11px;font-weight:900}
      .cos5-group-title small{display:block;margin:0 0 2px!important;color:color-mix(in srgb,var(--g) 72%,#94a3b8)!important;font-size:7px!important;letter-spacing:.11em!important}.cos5-group-title h3{margin:0;font-size:12px;color:#e7edf4}
      .cos5-group-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:9px;padding:11px}
      .cos5-group .cos4-card{background:rgba(7,12,18,.40);border-color:rgba(255,255,255,.055)}
      .cos5-group .cos4-card.accent{border-color:color-mix(in srgb,var(--g) 36%,transparent)!important;background:color-mix(in srgb,var(--g) 8%,#0d141d)!important}
      .cos5-group[data-group="copy"] .cos4-card small{color:#d7a43c}.cos5-group[data-group="visual"] .cos4-card small{color:#aa93e7}.cos5-group[data-group="strategy"] .cos4-card small{color:#67cda8}.cos5-group[data-group="refs"] .cos4-card p{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#c7ccff}.cos5-group[data-group="angle"] .cos4-card small{color:#56cad9}.cos5-group[data-group="avatar"] .cos4-card small{color:#e28bbd}.cos5-group[data-group="context"] .cos4-card small{color:#7eb3ee}
      .cos5-extra-badge{display:inline-flex;margin:8px 0 0;padding:5px 8px;border-radius:999px;border:1px solid rgba(167,139,250,.28);background:rgba(167,139,250,.10);color:#cbbcff;font-size:7px;font-weight:900;letter-spacing:.08em}
      @media(max-width:1100px){.cos5-group-grid .cos4-card{grid-column:span 6}.cos5-group-grid .cos4-card.full{grid-column:1/-1}}
      @media(max-width:720px){.cos5-group-grid{grid-template-columns:1fr;padding:9px}.cos5-group-grid .cos4-card,.cos5-group-grid .cos4-card.wide,.cos5-group-grid .cos4-card.full{grid-column:1/-1}.cos5-group-head{padding:10px 11px}}
    `;
    document.head.appendChild(s);
  }

  const txt = el => (el?.querySelector('small')?.textContent || '').trim().toLowerCase();
  const body = el => (el?.querySelector('p')?.textContent || el?.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function current(){
    const d=window.CreativeOSWinnerLab?.getData?.()||{winnerTracks:[],winnerAttempts:[]};
    const id=sessionStorage.getItem('creativeos_winner_track')||'';
    const t=(d.winnerTracks||[]).find(x=>x.id===id);
    const aa=(d.winnerAttempts||[]).filter(x=>x.track_id===id&&!x.is_discarded).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const a=aa.find(x=>x.id===t?.best_attempt_id||x.is_best)||aa[0]||null;
    return {t,a,c:a?.content||{}};
  }
  function card(label,value,cls='wide'){
    const el=document.createElement('section');el.className=`cos4-card ${cls}`;el.innerHTML=`<small>${esc(label)}</small><p>${esc(value)}</p>`;return el;
  }

  function splitType(root) {
    const h=(root.querySelector('.cos4-head h2')?.textContent||'').toLowerCase();
    if(h.includes('ángulo'))return 'sales_angle'; if(h.includes('texto'))return 'text_hook'; if(h.includes('fondo'))return 'background'; if(h.includes('avatar'))return 'avatar'; if(h.includes('concepto')||h.includes('replicar'))return 'concept'; if(h.includes('música')||h.includes('audio'))return 'audio'; return 'other';
  }
  function category(label,type){
    const l=label.toLowerCase();
    if(l.startsWith('pinterest'))return 'refs';
    if(['hipótesis','aprendizaje','nota','cambio psicológico','pregunta estratégica'].some(x=>l.includes(x)))return 'strategy';
    if(/^texto [1-4]$/.test(l)||l==='cta'||l==='hook de texto'||l==='hook variante')return 'copy';
    if(l==='hook control'||l.includes('tipo de test'))return 'summary';
    if(['hook visual','estructura del vídeo','clip laboral','clip ','alternativa'].some(x=>l.includes(x)))return 'visual';
    if(l.includes('avatar'))return type==='sales_angle'?'angle':'avatar'; if(l.includes('fondo'))return 'context'; if(l==='ángulo')return 'angle';
    if(l.includes('idea / contenido')){if(type==='sales_angle')return'angle';if(type==='background')return'context';if(type==='avatar')return'avatar';if(type==='text_hook')return'copy';if(type==='concept')return'visual'}
    if(type==='background')return'context';if(type==='avatar')return'avatar';if(type==='text_hook')return'copy';if(type==='sales_angle')return'angle';if(type==='concept')return'visual';return'summary';
  }
  function groupOrder(type){
    if(type==='sales_angle')return['angle','copy','visual','refs','strategy'];
    if(type==='text_hook')return['summary','copy','strategy','refs'];
    if(type==='background')return['context','copy','refs','strategy'];
    if(type==='avatar')return['avatar','copy','refs','strategy'];
    if(type==='concept')return['summary','visual','copy','refs','strategy'];
    if(type==='audio')return['summary','copy','visual','strategy'];
    return['summary','copy','visual','refs','strategy'];
  }

  function addNumberedCopy(grid){
    const {c}=current(); if(!c)return;
    const firstText=c.text_1||c.hook_text||'';
    const values=[['Texto 1',firstText],['Texto 2',c.text_2||''],['Texto 3',c.text_3||''],['Texto 4',c.text_4||''],['CTA',c.cta||'']].filter(([,v])=>String(v).trim());
    if(!values.length)return;
    [...grid.children].forEach(el=>{const l=txt(el);if(['hook variante','secuencia completa','hook de texto','texto 1','texto 2','texto 3','texto 4','cta'].includes(l))el.remove()});
    values.forEach(([l,v],i)=>grid.appendChild(card(l,v,i===0?'wide accent':'wide')));
  }

  function decorateReplication(root,grid){
    const {c}=current(); if(c?.mode!=='control_replication')return;
    const h=root.querySelector('.cos4-head h2'); if(h)h.textContent='Extra · Replicar control';
    if(![...grid.children].some(x=>txt(x)==='tipo de test'))grid.prepend(card('Tipo de test','REPLICACIÓN 1:1 · No crear un concepto nuevo. Rehacer la receta del control y cambiar solo detalles mínimos necesarios.','full accent'));
  }

  function decorateBoard(){
    const d=window.CreativeOSWinnerLab?.getData?.()||{winnerTracks:[],winnerAttempts:[]};
    for(const t of d.winnerTracks||[]){
      const a=(d.winnerAttempts||[]).find(x=>x.track_id===t.id&&!x.is_discarded); if(a?.content?.mode!=='control_replication')continue;
      const el=document.querySelector(`[data-ciw-track="${CSS.escape(t.id)}"]`); if(!el||el.querySelector('.cos5-extra-badge'))continue;
      const b=document.createElement('div');b.className='cos5-extra-badge';b.textContent='EXTRA · REPLICAR CONTROL 1:1';(el.querySelector('.ciw-track-body')||el).prepend(b);
    }
  }

  function groupSheet(root){
    const sheet=root.querySelector('[data-cos4-view="sheet"]'); const grid=sheet?.querySelector(':scope > .cos4-grid'); if(!grid||grid.dataset.cos5Grouped==='1')return;
    injectCss(); addNumberedCopy(grid); decorateReplication(root,grid);
    const type=splitType(root); let cards=[...grid.children].filter(el=>el.classList.contains('cos4-card')); if(!cards.length)return;
    for(const c of [...cards]){if(txt(c)!=='idea / contenido')continue;const v=body(c);if(v&&cards.some(o=>o!==c&&body(o)===v)){c.remove();cards=cards.filter(x=>x!==c)}}
    const buckets=new Map();cards.forEach(c=>{const k=category(txt(c),type);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(c)});
    const stack=document.createElement('div');stack.className='cos5-sheet-stack';
    const addGroup=(key,items)=>{if(!items?.length)return;const g=GROUPS[key]||GROUPS.summary;const sec=document.createElement('section');sec.className='cos5-group';sec.dataset.group=key;sec.style.setProperty('--g',g.color);sec.style.setProperty('--gs',g.soft);sec.innerHTML=`<div class="cos5-group-head"><div class="cos5-group-icon">${g.icon}</div><div class="cos5-group-title"><small>BLOQUE</small><h3>${g.label}</h3></div></div><div class="cos5-group-grid"></div>`;items.forEach(c=>sec.querySelector('.cos5-group-grid').appendChild(c));stack.appendChild(sec)};
    for(const k of groupOrder(type)){addGroup(k,buckets.get(k));buckets.delete(k)} for(const [k,v] of buckets)addGroup(k,v);
    grid.dataset.cos5Grouped='1';grid.replaceWith(stack);
  }
  function scan(){injectCss();decorateBoard();const root=document.getElementById('cos4Root');if(root)groupSheet(root)}
  const observer=new MutationObserver(scan);if(document.body)observer.observe(document.body,{childList:true,subtree:true});scan();
  window.CreativeOSSplitSheetGroups={version:'1.2',scan};
})();