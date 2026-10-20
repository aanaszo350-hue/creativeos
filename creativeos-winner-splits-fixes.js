(() => {
  'use strict';

  let desiredTrackId=sessionStorage.getItem('creativeos_winner_track')||'';
  let desiredAttemptModal=null;
  let repairTimer=null;
  let burstTimer=null;

  function data(){return window.CreativeOSWinnerLab?.getData?.()||{winnerPlans:[],winnerTracks:[],winnerAttempts:[]};}
  function wantedTrack(){return sessionStorage.getItem('creativeos_winner_track')||desiredTrackId||'';}
  function scheduleRepair(delay=20){clearTimeout(repairTimer);repairTimer=setTimeout(repairSelection,delay);}
  function burstRepair(){clearInterval(burstTimer);let ticks=0;burstTimer=setInterval(()=>{repairSelection();if(++ticks>=24){clearInterval(burstTimer);burstTimer=null;}},35);}

  function fallbackProductName(id,plan){
    if(id==='coloringrobe')return 'Coloring Robe';
    const dna=plan?.baseline_dna||{};
    if(dna.product_name)return String(dna.product_name);
    const raw=String(plan?.name||'').split('·')[0].trim();
    if(raw&&!/^winner/i.test(raw))return raw;
    return String(id||'Producto').replace(/[-_]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
  }

  function patchIntelligenceProducts(){
    const intel=window.CreativeOSIntelligence;
    if(!intel?.getSnapshot||intel.__winnerProductUnionPatched)return;
    const original=intel.getSnapshot.bind(intel);
    intel.getSnapshot=()=>{
      const snap=original()||{};
      const products=Array.isArray(snap.products)?snap.products.slice():[];
      const ids=new Set(products.map(p=>p?.id).filter(Boolean));
      for(const plan of data().winnerPlans||[]){
        const id=plan?.product_id;
        if(!id||ids.has(id))continue;
        products.push({
          id,
          name:fallbackProductName(id,plan),
          label:id==='coloringrobe'?'Bata para colorear':'Producto',
          status:'Testing',
          day:1,
          testMax:7,
          nicheSlugs:['general'],
          brief:''
        });
        ids.add(id);
      }
      return {...snap,products};
    };
    intel.__winnerProductUnionPatched=true;
  }

  function refreshProductTabs(){
    patchIntelligenceProducts();
    document.dispatchEvent(new CustomEvent('creativeos:intelligence-render'));
  }

  function repairSelection(){
    const host=document.getElementById('ciHost');
    if(host?.dataset?.ciView!=='winner-splits')return;
    if(document.getElementById('ciwModalRoot')||document.getElementById('cos4Root'))return;
    const stored=wantedTrack();if(stored)desiredTrackId=stored;
    if(desiredTrackId){const active=document.querySelector('.ciw-track-card.active')?.dataset?.ciwTrack||'';const button=document.querySelector(`[data-ciw-track="${CSS.escape(desiredTrackId)}"]`);if(button&&active!==desiredTrackId){button.click();return;}}
    if(desiredAttemptModal?.type==='new'){const btn=document.querySelector(`[data-ciw-new-attempt="${CSS.escape(desiredAttemptModal.trackId)}"]`);if(btn){desiredAttemptModal=null;btn.click();return;}}
    if(desiredAttemptModal?.type==='data'){const btn=document.querySelector(`[data-ciw-data-attempt="${CSS.escape(desiredAttemptModal.attemptId)}"]`);if(btn){desiredAttemptModal=null;btn.click();return;}const row=data().winnerAttempts?.find?.(a=>a.id===desiredAttemptModal.attemptId);if(row?.track_id){desiredTrackId=row.track_id;sessionStorage.setItem('creativeos_winner_track',desiredTrackId);scheduleRepair(0);}}
  }

  document.addEventListener('click',e=>{
    const editWinner=e.target.closest?.('[data-ciw-edit-winner]');if(editWinner){const id=editWinner.dataset.ciwEditWinner;setTimeout(()=>{const input=document.getElementById('ciwWinnerName');if(!input||input.value.trim())return;const row=window.CreativeOSWinnerLab?.getData?.().winnerPlans?.find?.(w=>w.id===id);if(row?.name)input.value=row.name;},0);}
    const track=e.target.closest?.('[data-ciw-track]');if(track){desiredTrackId=track.dataset.ciwTrack||'';if(desiredTrackId)sessionStorage.setItem('creativeos_winner_track',desiredTrackId);if(window.CreativeOSSplitBoard?.version!=='4.0')burstRepair();}
    const newAttempt=e.target.closest?.('[data-ciw-new-attempt]');if(newAttempt){desiredTrackId=newAttempt.dataset.ciwNewAttempt||wantedTrack();if(desiredTrackId)sessionStorage.setItem('creativeos_winner_track',desiredTrackId);desiredAttemptModal={type:'new',trackId:desiredTrackId};setTimeout(()=>{if(document.getElementById('ciwModalRoot'))desiredAttemptModal=null;else burstRepair();},120);}
    const dataAttempt=e.target.closest?.('[data-ciw-data-attempt]');if(dataAttempt){const attemptId=dataAttempt.dataset.ciwDataAttempt;const row=data().winnerAttempts?.find?.(a=>a.id===attemptId);if(row?.track_id){desiredTrackId=row.track_id;sessionStorage.setItem('creativeos_winner_track',desiredTrackId);}desiredAttemptModal={type:'data',attemptId};setTimeout(()=>{if(document.getElementById('ciwModalRoot'))desiredAttemptModal=null;else burstRepair();},120);}
    if(e.target.closest?.('[data-ciw-save-attempt]')||e.target.closest?.('[data-ciw-save-data]')||e.target.closest?.('[data-ciw-best-attempt]'))burstRepair();
    if(e.target.closest?.('[data-ciw-close]')||e.target.classList?.contains('ciw-backdrop'))desiredAttemptModal=null;
  },true);

  window.addEventListener('creativeos:winner-lab-updated',()=>{
    desiredTrackId=wantedTrack();
    refreshProductTabs();
    if(window.CreativeOSSplitBoard?.version!=='4.0'){repairSelection();burstRepair();}
  });
  const observer=new MutationObserver(()=>{const host=document.getElementById('ciHost');if(host?.dataset?.ciView==='winner-splits'&&window.CreativeOSSplitBoard?.version!=='4.0')scheduleRepair(0);});
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});

  function loadSplitGroups(){
    if(window.CreativeOSSplitSheetGroups?.version==='1.1')return;
    const old=document.querySelector('script[data-cos-split-groups]');old?.remove();
    const script=document.createElement('script');script.src='./creativeos-split-sheet-groups.js?v=2';script.dataset.cosSplitGroups='1';script.defer=true;document.head.appendChild(script);
  }
  function loadSplitBoard(){
    if(window.CreativeOSSplitBoard?.version==='4.0'){loadSplitGroups();return;}
    if(document.querySelector('script[data-cos-split-board-v4]')){loadSplitGroups();return;}
    document.querySelector('script[data-cos-split-board-v3]')?.remove();
    const script=document.createElement('script');script.src='./creativeos-split-board-v3.js?v=2';script.dataset.cosSplitBoardV4='1';script.defer=true;script.addEventListener('load',loadSplitGroups,{once:true});document.head.appendChild(script);
  }
  function loadProductRadar(){
    if(window.CreativeOSProductRadar?.version==='1.0')return;
    if(document.querySelector('script[data-cos-product-radar]'))return;
    const script=document.createElement('script');script.src='./creativeos-product-radar.js?v=1';script.dataset.cosProductRadar='1';script.defer=true;document.head.appendChild(script);
  }

  patchIntelligenceProducts();
  loadSplitBoard();loadSplitGroups();loadProductRadar();
  document.addEventListener('DOMContentLoaded',()=>{patchIntelligenceProducts();loadSplitBoard();loadSplitGroups();loadProductRadar();},{once:true});
  window.CreativeOSWinnerLabFixes={version:'1.8',repairSelection,burstRepair,loadSplitBoard,loadSplitGroups,loadProductRadar,patchIntelligenceProducts};
})();