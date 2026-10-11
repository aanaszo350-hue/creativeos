(() => {
  const STORAGE_KEY = 'creativeos_local_v3';
  let recognition = null;
  let listening = false;
  let timeoutId = null;

  function loadState(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}
    catch{return {};}
  }

  function saveBrief(value){
    const state=loadState();
    state.context=state.context||{};
    state.context.instruction=value;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    document.querySelectorAll('[data-co-brief],#homeContextInstruction,#contextInstruction').forEach(el=>{
      if('value' in el) el.value=value;
    });
    try{window.CreativeOSCloud?.syncNow?.();}catch{}
  }

  function toast(message,tone='default'){
    let wrap=document.getElementById('coVoiceSafeToasts');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='coVoiceSafeToasts';
      wrap.style.cssText='position:fixed;right:22px;top:88px;z-index:10010;display:grid;gap:8px;pointer-events:none';
      document.body.appendChild(wrap);
    }
    const el=document.createElement('div');
    const border=tone==='error'?'#813544':tone==='ok'?'#1f7048':'#6b5521';
    const color=tone==='error'?'#ffbac3':tone==='ok'?'#aef0c9':'#f2d486';
    el.textContent=message;
    el.style.cssText=`max-width:340px;padding:10px 12px;border-radius:11px;background:#111722;border:1px solid ${border};color:${color};font-size:11px;box-shadow:0 14px 45px rgba(0,0,0,.35)`;
    wrap.appendChild(el);
    setTimeout(()=>el.remove(),3200);
  }

  function overlay(show,text='Escuchando…'){
    let el=document.getElementById('coVoiceSafeOverlay');
    if(!el){
      el=document.createElement('div');
      el.id='coVoiceSafeOverlay';
      el.style.cssText='position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:10011;padding:11px 16px;border-radius:999px;background:#261015;border:1px solid #ff5b69;color:#ffd9dd;font-size:12px;font-weight:850;box-shadow:0 18px 55px rgba(0,0,0,.45);display:none;align-items:center;gap:9px;pointer-events:none';
      el.innerHTML='<span style="width:8px;height:8px;border-radius:50%;background:#ff5364;box-shadow:0 0 0 5px rgba(255,83,100,.13)"></span><span></span>';
      document.body.appendChild(el);
    }
    el.style.display=show?'flex':'none';
    const label=el.querySelector('span:last-child');
    if(label) label.textContent=text;
  }

  function finish(){
    if(timeoutId){clearTimeout(timeoutId);timeoutId=null;}
    listening=false;
    recognition=null;
    overlay(false);
  }

  function stop(){
    if(!recognition)return;
    try{recognition.stop();}catch{finish();}
  }

  function start(){
    if(listening){stop();return;}

    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){
      try{window.CreativeOSRunner?.open?.();}catch{}
      toast('Este navegador no permite dictado web directo. Usa el dictado del Mac dentro de Brief.','warn');
      setTimeout(()=>document.querySelector('#coRunnerComposer [data-co-brief]')?.focus(),50);
      return;
    }

    let resultText='';
    recognition=new SR();
    recognition.lang='es-ES';
    recognition.continuous=false;
    recognition.interimResults=false;
    recognition.maxAlternatives=1;

    recognition.onstart=()=>{
      listening=true;
      overlay(true,'Escuchando… habla ahora');
      timeoutId=setTimeout(()=>stop(),20000);
    };

    recognition.onresult=(event)=>{
      const parts=[];
      for(let i=event.resultIndex;i<event.results.length;i++){
        const text=event.results[i]?.[0]?.transcript?.trim();
        if(text)parts.push(text);
      }
      resultText=parts.join(' ').trim();
      overlay(true,'Hecho · guardando brief');
    };

    recognition.onerror=(event)=>{
      const err=event?.error||'unknown';
      finish();
      if(err==='not-allowed'||err==='service-not-allowed'){
        toast('Chrome tiene bloqueado el micrófono para esta web. Actívalo en el candado de la barra.','error');
      }else if(err==='no-speech'){
        toast('No he detectado voz. Pulsa el micro y habla justo después.','warn');
      }else if(err!=='aborted'){
        toast(`No se pudo usar el dictado (${err}).`,'error');
      }
    };

    recognition.onend=()=>{
      const text=resultText.trim();
      finish();
      if(text){
        saveBrief(text);
        toast('Brief de voz guardado.','ok');
      }
    };

    try{recognition.start();}
    catch{
      finish();
      toast('No se pudo iniciar el micrófono. Vuelve a pulsar una vez.','error');
    }
  }

  document.addEventListener('click',event=>{
    const mic=event.target.closest('[data-co-mic]');
    if(!mic)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    start();
  },true);

  window.addEventListener('beforeunload',stop);
  window.CreativeOSVoice={start,stop};
})();
