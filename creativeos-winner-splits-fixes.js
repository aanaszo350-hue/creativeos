(() => {
  'use strict';

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-ciw-edit-winner]');
    if(!btn)return;
    const id=btn.dataset.ciwEditWinner;
    setTimeout(()=>{
      const input=document.getElementById('ciwWinnerName');
      if(!input||input.value.trim())return;
      const row=window.CreativeOSWinnerLab?.getData?.().winnerPlans?.find?.(w=>w.id===id);
      if(row?.name)input.value=row.name;
    },0);
  },true);

  window.CreativeOSWinnerLabFixes={version:'1.0'};
})();