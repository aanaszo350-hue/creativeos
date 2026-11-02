(() => {
  'use strict';

  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','>':'&gt;','<':'&lt;','"':'&quot;',"'":'&#39;'}[m]));
  const data=()=>window.CreativeOSWinnerLab?.getData?.()||{winnerTracks:[],winnerAttempts:[]};

  function currentVideoSplit(){
    const trackId=sessionStorage.getItem('creativeos_winner_track')||'';
    if(!trackId)return null;
    const d=data();
    const track=(d.winnerTracks||[]).find(t=>t.id===trackId);
    if(!track)return null;
    const variants=(d.winnerAttempts||[])
      .filter(a=>a.track_id===trackId&&!a.is_discarded)
      .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const attempt=variants.find(a=>a.id===track.best_attempt_id||a.is_best)||variants[0]||null;
    const c=attempt?.content||{};
    const isVideo=/^Vídeo\s*\d+/i.test(String(track.variable||''))||['new_video_concept','reference_video'].includes(c.mode);
    return isVideo?{track,attempt,c}:null;
  }

  function card(label,value,cls=''){
    if(!String(value??'').trim())return '';
    return `<section class="cos4-card ${cls}"><small>${esc(label)}</small><p>${esc(value)}</p></section>`;
  }

  function patchModal(){
    const root=document.getElementById('cos4Root');
    if(!root)return;
    const row=currentVideoSplit();
    if(!row)return;
    const {track,attempt,c}=row;

    const title=root.querySelector('.cos4-head h2');
    if(title)title.textContent=attempt?.title||track.variable||'Vídeo';
    const icon=root.querySelector('.cos4-bigicon');
    if(icon)icon.textContent='▶';

    const grid=root.querySelector('[data-cos4-view="sheet"] .cos4-grid');
    if(!grid)return;

    const parts=[];
    parts.push(card('Concepto / nuevo vídeo',c.concept_description||c.hook_visual,'full accent'));
    parts.push(card('Hook visual',c.hook_visual,'wide'));
    parts.push(card('Fondo / contexto',c.background,'wide'));
    parts.push(card('Objetivo',c.objective,'wide'));
    parts.push(card('Texto 1',c.text_1));
    parts.push(card('Texto 2',c.text_2));
    parts.push(card('CTA',c.cta));
    parts.push(card('Vídeo de referencia',c.reference_url,'full'));
    parts.push(card('Referencia',c.reference_status,'wide'));

    const html=parts.filter(Boolean).join('');
    if(html)grid.innerHTML=html;
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.ciw-track-card[data-ciw-track]'))setTimeout(patchModal,0);
  },true);

  const observer=new MutationObserver(muts=>{
    if(muts.some(m=>[...m.addedNodes].some(n=>n?.id==='cos4Root'||n?.querySelector?.('#cos4Root'))))setTimeout(patchModal,0);
  });
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});

  window.addEventListener('creativeos:winner-lab-updated',()=>setTimeout(patchModal,0));
  setTimeout(patchModal,150);

  window.CreativeOSSplitVideoDetails={version:'1.0',patchModal};
})();
