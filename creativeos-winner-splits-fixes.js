(() => {
  'use strict';

  let desiredTrackId=sessionStorage.getItem('creativeos_winner_track')||'';
  let desiredAttemptModal=null;
  let repairTimer=null;
  let burstTimer=null;

  function data(){return window.CreativeOSWinnerLab?.getData?.()||{winnerPlans:[],winnerTracks:[],winnerAttempts:[]};}
  function wantedTrack(){return sessionStorage.getItem('creativeos_winner_track')||desiredTrackId||'';}
  function scheduleRepair(delay=80){
    if(window.CreativeOSSplitBoard?.version==='4.0')return;
    clearTimeout(repairTimer);
    repairTimer=setTimeout(repairSelection,delay);
  }
  function burstRepair(){
    if(window.CreativeOSSplitBoard?.version==='4.0')return;
    clearInterval(burstTimer);
    burstTimer=null;
    scheduleRepair(80);
  }

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
        products.push({id,name:fallbackProductName(id,plan),label:id==='coloringrobe'?'Bata para colorear':'Producto',status:'Testing',day:1,testMax:7,nicheSlugs:['general'],brief:''});
        ids.add(id);
      }
      return {...snap,products};
    };
    intel.__winnerProductUnionPatched=true;
  }

  function refreshProductTabs(){patchIntelligenceProducts();document.dispatchEvent(new CustomEvent('creativeos:intelligence-render'));}

  async function refreshSplitTestsView(){
    try{
      await window.CreativeOSIntelligence?.refresh?.();
      window.CreativeOSSplitTests?.render?.();
    }catch(err){
      console.error('CreativeOS Split Tests refresh failed',err);
    }
  }

  function repairSelection(){
    if(window.CreativeOSSplitBoard?.version==='4.0')return;
    const host=document.getElementById('ciHost');
    if(host?.dataset?.ciView!=='winner-splits')return;
    if(document.getElementById('ciwModalRoot')||document.getElementById('cos4Root'))return;
    const stored=wantedTrack();if(stored)desiredTrackId=stored;
    if(desiredTrackId){
      const active=document.querySelector('.ciw-track-card.active')?.dataset?.ciwTrack||'';
      const button=document.querySelector(`[data-ciw-track="${CSS.escape(desiredTrackId)}"]`);
      if(button&&active!==desiredTrackId){
        button.classList.add('active');
        return;
      }
    }
  }

  document.addEventListener('click',e=>{
    const splitNav=e.target.closest?.('#cisSplitNav,[data-cis-split-route]');if(splitNav){setTimeout(refreshSplitTestsView,0);}
    const editWinner=e.target.closest?.('[data-ciw-edit-winner]');if(editWinner){const id=editWinner.dataset.ciwEditWinner;setTimeout(()=>{const input=document.getElementById('ciwWinnerName');if(!input||input.value.trim())return;const row=window.CreativeOSWinnerLab?.getData?.().winnerPlans?.find?.(w=>w.id===id);if(row?.name)input.value=row.name;},0);}
    const track=e.target.closest?.('[data-ciw-track]');if(track){desiredTrackId=track.dataset.ciwTrack||'';if(desiredTrackId)sessionStorage.setItem('creativeos_winner_track',desiredTrackId);}
    const newAttempt=e.target.closest?.('[data-ciw-new-attempt]');if(newAttempt){desiredTrackId=newAttempt.dataset.ciwNewAttempt||wantedTrack();if(desiredTrackId)sessionStorage.setItem('creativeos_winner_track',desiredTrackId);desiredAttemptModal={type:'new',trackId:desiredTrackId};}
    const dataAttempt=e.target.closest?.('[data-ciw-data-attempt]');if(dataAttempt){const attemptId=dataAttempt.dataset.ciwDataAttempt;const row=data().winnerAttempts?.find?.(a=>a.id===attemptId);if(row?.track_id){desiredTrackId=row.track_id;sessionStorage.setItem('creativeos_winner_track',desiredTrackId);}desiredAttemptModal={type:'data',attemptId};}
    if(e.target.closest?.('[data-ciw-close]')||e.target.classList?.contains('ciw-backdrop'))desiredAttemptModal=null;
  },true);

  window.addEventListener('creativeos:winner-lab-updated',()=>{desiredTrackId=wantedTrack();refreshProductTabs();});

  function loadAttemptSelector(){
    if(window.CreativeOSSplitAttemptSelector?.version==='1.4')return;
    document.querySelector('script[data-cos-attempt-selector]')?.remove();
    const script=document.createElement('script');script.src='./creativeos-split-attempt-selector.js?v=4';script.dataset.cosAttemptSelector='1';script.defer=true;document.head.appendChild(script);
  }
  function loadSplitGroups(){
    if(window.CreativeOSSplitSheetGroups?.version==='1.3'){loadAttemptSelector();return;}
    const old=document.querySelector('script[data-cos-split-groups]');old?.remove();
    const script=document.createElement('script');script.src='./creativeos-split-sheet-groups.js?v=4';script.dataset.cosSplitGroups='1';script.defer=true;script.addEventListener('load',loadAttemptSelector,{once:true});document.head.appendChild(script);
  }
  function loadProductRadar(){
    if(window.CreativeOSProductRadar?.version==='1.0')return;
    if(document.querySelector('script[data-cos-product-radar]'))return;
    const script=document.createElement('script');script.src='./creativeos-product-radar.js?v=1';script.dataset.cosProductRadar='1';script.defer=true;document.head.appendChild(script);
  }
  function loadTesting(){
    if(window.CreativeOSTesting?.version==='1.4')return;
    document.querySelector('script[data-cos-testing]')?.remove();
    const script=document.createElement('script');script.src='./creativeos-testing.js?v=4';script.dataset.cosTesting='1';script.defer=true;document.head.appendChild(script);
  }
  function loadVideoDetails(){
    if(window.CreativeOSSplitVideoDetails?.version==='1.1')return;
    document.querySelector('script[data-cos-video-details]')?.remove();
    const script=document.createElement('script');
    script.src='./creativeos-split-video-details-fix.js?v=2';
    script.dataset.cosVideoDetails='1';
    script.defer=true;
    document.head.appendChild(script);
  }
  function loadDependentModules(){
    loadSplitGroups();
    loadProductRadar();
    loadTesting();
    loadVideoDetails();
  }

  function installSplitObserverGuard(){
    if(window.__creativeOSSplitObserverGuard)return;
    const NativeMutationObserver=window.MutationObserver;
    if(!NativeMutationObserver)return;
    window.__creativeOSSplitObserverGuard=true;
    window.MutationObserver=class CreativeOSMutationObserver extends NativeMutationObserver{
      observe(target,options){
        const isDangerousSplitObserver=window.__creativeOSLoadingSplitBoard===true&&target===document.body&&options?.childList===true&&options?.subtree===true;
        if(isDangerousSplitObserver)return;
        return super.observe(target,options);
      }
    };
  }

  function loadSplitBoard(){
    if(window.CreativeOSSplitBoard?.version==='4.0'){loadDependentModules();return;}
    installSplitObserverGuard();
    const existing=document.querySelector('script[data-cos-split-board-v4]');
    if(existing){
      existing.addEventListener('load',loadDependentModules,{once:true});
      return;
    }
    document.querySelector('script[data-cos-split-board-v3]')?.remove();
    window.__creativeOSLoadingSplitBoard=true;
    const script=document.createElement('script');
    script.src='./creativeos-split-board-v3.js?v=3';
    script.dataset.cosSplitBoardV4='1';
    script.defer=true;
    const done=()=>{window.__creativeOSLoadingSplitBoard=false;};
    script.addEventListener('load',()=>{done();loadDependentModules();},{once:true});
    script.addEventListener('error',done,{once:true});
    document.head.appendChild(script);
  }

  function installPerformanceGuard(){
    if(window.__creativeOSPerformanceGuard)return;
    window.__creativeOSPerformanceGuard=true;
    const KEY='creativeos_local_v3';
    let syncTimer=null;
    let nativeSetItem=null;
    try{
      const iframe=document.createElement('iframe');
      iframe.style.display='none';
      document.documentElement.appendChild(iframe);
      nativeSetItem=iframe.contentWindow?.Storage?.prototype?.setItem||null;
      iframe.remove();
    }catch{}
    if(!nativeSetItem)return;
    try{
      localStorage.setItem=function(key,value){
        nativeSetItem.call(localStorage,key,value);
        if(key===KEY){
          clearTimeout(syncTimer);
          syncTimer=setTimeout(()=>window.CreativeOSCloud?.syncNow?.(),900);
        }
      };
    }catch{}
  }

  installSplitObserverGuard();
  patchIntelligenceProducts();
  loadSplitBoard();
  installPerformanceGuard();
  document.addEventListener('DOMContentLoaded',()=>{installSplitObserverGuard();patchIntelligenceProducts();loadSplitBoard();installPerformanceGuard();},{once:true});
  window.CreativeOSWinnerLabFixes={version:'1.20',repairSelection,burstRepair,loadSplitBoard,loadSplitGroups,loadAttemptSelector,loadProductRadar,loadTesting,loadVideoDetails,patchIntelligenceProducts,refreshSplitTestsView};
})();
