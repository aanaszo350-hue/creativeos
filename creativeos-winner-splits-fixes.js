(() => {
  'use strict';

  let desiredTrackId=sessionStorage.getItem('creativeos_winner_track')||'';
  let desiredAttemptModal=null;
  let repairTimer=null;
  let burstTimer=null;

  function data(){return window.CreativeOSWinnerLab?.getData?.()||{winnerTracks:[],winnerAttempts:[]};}
  function wantedTrack(){return sessionStorage.getItem('creativeos_winner_track')||desiredTrackId||'';}
  function scheduleRepair(delay=20){
    clearTimeout(repairTimer);
    repairTimer=setTimeout(repairSelection,delay);
  }
  function burstRepair(){
    clearInterval(burstTimer);
    let ticks=0;
    burstTimer=setInterval(()=>{
      repairSelection();
      if(++ticks>=24){clearInterval(burstTimer);burstTimer=null;}
    },35);
  }
  function repairSelection(){
    const host=document.getElementById('ciHost');
    if(host?.dataset?.ciView!=='winner-splits')return;
    if(document.getElementById('ciwModalRoot')||document.getElementById('cos4Root'))return;

    const stored=wantedTrack();
    if(stored)desiredTrackId=stored;
    if(desiredTrackId){
      const active=document.querySelector('.ciw-track-card.active')?.dataset?.ciwTrack||'';
      const button=document.querySelector(`[data-ciw-track="${CSS.escape(desiredTrackId)}"]`);
      if(button&&active!==desiredTrackId){
        button.click();
        return;
      }
    }

    if(desiredAttemptModal?.type==='new'){
      const btn=document.querySelector(`[data-ciw-new-attempt="${CSS.escape(desiredAttemptModal.trackId)}"]`);
      if(btn){desiredAttemptModal=null;btn.click();return;}
    }
    if(desiredAttemptModal?.type==='data'){
      const btn=document.querySelector(`[data-ciw-data-attempt="${CSS.escape(desiredAttemptModal.attemptId)}"]`);
      if(btn){desiredAttemptModal=null;btn.click();return;}
      const row=data().winnerAttempts?.find?.(a=>a.id===desiredAttemptModal.attemptId);
      if(row?.track_id){
        desiredTrackId=row.track_id;
        sessionStorage.setItem('creativeos_winner_track',desiredTrackId);
        scheduleRepair(0);
      }
    }
  }

  document.addEventListener('click',e=>{
    const editWinner=e.target.closest?.('[data-ciw-edit-winner]');
    if(editWinner){
      const id=editWinner.dataset.ciwEditWinner;
      setTimeout(()=>{
        const input=document.getElementById('ciwWinnerName');
        if(!input||input.value.trim())return;
        const row=window.CreativeOSWinnerLab?.getData?.().winnerPlans?.find?.(w=>w.id===id);
        if(row?.name)input.value=row.name;
      },0);
    }

    const track=e.target.closest?.('[data-ciw-track]');
    if(track){
      desiredTrackId=track.dataset.ciwTrack||'';
      if(desiredTrackId)sessionStorage.setItem('creativeos_winner_track',desiredTrackId);
      if(window.CreativeOSSplitBoard?.version!=='4.0')burstRepair();
    }

    const newAttempt=e.target.closest?.('[data-ciw-new-attempt]');
    if(newAttempt){
      desiredTrackId=newAttempt.dataset.ciwNewAttempt||wantedTrack();
      if(desiredTrackId)sessionStorage.setItem('creativeos_winner_track',desiredTrackId);
      desiredAttemptModal={type:'new',trackId:desiredTrackId};
      setTimeout(()=>{if(document.getElementById('ciwModalRoot'))desiredAttemptModal=null;else burstRepair();},120);
    }

    const dataAttempt=e.target.closest?.('[data-ciw-data-attempt]');
    if(dataAttempt){
      const attemptId=dataAttempt.dataset.ciwDataAttempt;
      const row=data().winnerAttempts?.find?.(a=>a.id===attemptId);
      if(row?.track_id){desiredTrackId=row.track_id;sessionStorage.setItem('creativeos_winner_track',desiredTrackId);}
      desiredAttemptModal={type:'data',attemptId};
      setTimeout(()=>{if(document.getElementById('ciwModalRoot'))desiredAttemptModal=null;else burstRepair();},120);
    }

    if(e.target.closest?.('[data-ciw-save-attempt]')||e.target.closest?.('[data-ciw-save-data]')||e.target.closest?.('[data-ciw-best-attempt]'))burstRepair();
    if(e.target.closest?.('[data-ciw-close]')||e.target.classList?.contains('ciw-backdrop'))desiredAttemptModal=null;
  },true);

  window.addEventListener('creativeos:winner-lab-updated',()=>{
    desiredTrackId=wantedTrack();
    if(window.CreativeOSSplitBoard?.version!=='4.0'){
      repairSelection();
      burstRepair();
    }
  });

  const observer=new MutationObserver(()=>{
    const host=document.getElementById('ciHost');
    if(host?.dataset?.ciView==='winner-splits'&&window.CreativeOSSplitBoard?.version!=='4.0')scheduleRepair(0);
  });
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});

  function loadSplitBoard(){
    if(window.CreativeOSSplitBoard?.version==='4.0')return;
    if(document.querySelector('script[data-cos-split-board-v4]'))return;
    const old=document.querySelector('script[data-cos-split-board-v3]');
    old?.remove();
    const script=document.createElement('script');
    script.src='./creativeos-split-board-v3.js?v=2';
    script.dataset.cosSplitBoardV4='1';
    script.defer=true;
    document.head.appendChild(script);
  }

  loadSplitBoard();
  document.addEventListener('DOMContentLoaded',loadSplitBoard,{once:true});

  window.CreativeOSWinnerLabFixes={version:'1.4',repairSelection,burstRepair,loadSplitBoard};
})();