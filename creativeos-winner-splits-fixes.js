(() => {
  'use strict';

  let desiredTrackId=sessionStorage.getItem('creativeos_winner_track')||'';
  let desiredAttemptModal=null;
  let repairTimer=null;

  function data(){return window.CreativeOSWinnerLab?.getData?.()||{winnerTracks:[],winnerAttempts:[]};}
  function scheduleRepair(delay=80){
    clearTimeout(repairTimer);
    repairTimer=setTimeout(repairSelection,delay);
  }
  function repairSelection(){
    const host=document.getElementById('ciHost');
    if(host?.dataset?.ciView!=='winner-splits')return;
    if(document.getElementById('ciwModalRoot'))return;

    if(desiredTrackId){
      const active=document.querySelector('.ciw-track-card.active')?.dataset?.ciwTrack||'';
      const button=document.querySelector(`[data-ciw-track="${CSS.escape(desiredTrackId)}"]`);
      if(button&&active!==desiredTrackId){
        button.click();
        scheduleRepair(100);
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
      if(row?.track_id&&row.track_id!==desiredTrackId){desiredTrackId=row.track_id;sessionStorage.setItem('creativeos_winner_track',desiredTrackId);scheduleRepair(40);}
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
    if(track){desiredTrackId=track.dataset.ciwTrack||'';if(desiredTrackId)sessionStorage.setItem('creativeos_winner_track',desiredTrackId);scheduleRepair(120);}

    const newAttempt=e.target.closest?.('[data-ciw-new-attempt]');
    if(newAttempt){
      desiredTrackId=newAttempt.dataset.ciwNewAttempt||desiredTrackId;
      if(desiredTrackId)sessionStorage.setItem('creativeos_winner_track',desiredTrackId);
      desiredAttemptModal={type:'new',trackId:desiredTrackId};
      setTimeout(()=>{if(document.getElementById('ciwModalRoot'))desiredAttemptModal=null;else scheduleRepair(0);},140);
    }

    const dataAttempt=e.target.closest?.('[data-ciw-data-attempt]');
    if(dataAttempt){
      const attemptId=dataAttempt.dataset.ciwDataAttempt;
      const row=data().winnerAttempts?.find?.(a=>a.id===attemptId);
      if(row?.track_id){desiredTrackId=row.track_id;sessionStorage.setItem('creativeos_winner_track',desiredTrackId);}
      desiredAttemptModal={type:'data',attemptId};
      setTimeout(()=>{if(document.getElementById('ciwModalRoot'))desiredAttemptModal=null;else scheduleRepair(0);},140);
    }

    if(e.target.closest?.('[data-ciw-close]')||e.target.classList?.contains('ciw-backdrop'))desiredAttemptModal=null;
  },true);

  const observer=new MutationObserver(()=>{
    const host=document.getElementById('ciHost');
    if(host?.dataset?.ciView==='winner-splits')scheduleRepair(90);
  });
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});

  window.CreativeOSWinnerLabFixes={version:'1.1',repairSelection};
})();