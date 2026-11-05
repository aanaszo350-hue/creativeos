(() => {
  'use strict';

  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','>':'&gt;','<':'&lt;','"':'&quot;',"'":'&#39;'}[m]));
  const data=()=>window.CreativeOSWinnerLab?.getData?.()||{winnerTracks:[],winnerAttempts:[]};
  let patchTimer=null;

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
    if(c.reference_url&&/^https?:\/\//.test(String(c.reference_url))){
      parts.push(`<section class="cos4-card full"><small>Vídeo de referencia</small><p><a href="${esc(c.reference_url)}" target="_blank" rel="noopener noreferrer" style="color:#b9c8ff;text-decoration:underline">Abrir Reel de Instagram ↗</a></p></section>`);
    }
    parts.push(card('Referencia',c.reference_status,'wide'));

    const html=parts.filter(Boolean).join('');
    if(html&&grid.dataset.videoDetailsPatched!==attempt?.id){
      grid.innerHTML=html;
      grid.dataset.videoDetailsPatched=attempt?.id||'1';
    }
  }

  function schedulePatch(delay=0){
    clearTimeout(patchTimer);
    patchTimer=setTimeout(()=>requestAnimationFrame(patchModal),delay);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.ciw-track-card[data-ciw-track]'))schedulePatch(0);
  },true);

  document.addEventListener('creativeos:intelligence-render',()=>schedulePatch(20));
  window.addEventListener('creativeos:winner-lab-updated',()=>schedulePatch(20));
  schedulePatch(120);

  window.CreativeOSSplitVideoDetails={version:'1.2',patchModal,schedulePatch};
})();
