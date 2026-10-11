(() => {
  const STORAGE_KEY = 'creativeos_local_v3';
  let rec = null;
  let listening = false;
  let previousBrief = '';
  let transcript = '';
  let stopTimer = null;

  function getBrief() {
    try { return (JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').context?.instruction || '').trim(); }
    catch { return ''; }
  }

  function setDraftUi(value) {
    document.querySelectorAll('[data-co-brief], #homeContextInstruction, #contextInstruction').forEach(el => {
      if ('value' in el) el.value = value;
    });
  }

  function toast(message, tone = 'default') {
    let wrap = document.getElementById('coVoiceHotfixToasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'coVoiceHotfixToasts';
      wrap.style.cssText = 'position:fixed;right:22px;top:88px;z-index:10001;display:grid;gap:8px';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.textContent = message;
    const border = tone === 'error' ? '#813544' : tone === 'ok' ? '#1f7048' : '#6b5521';
    const color = tone === 'error' ? '#ffbac3' : tone === 'ok' ? '#aef0c9' : '#f2d486';
    el.style.cssText = `max-width:330px;padding:10px 12px;border-radius:11px;background:#111722;border:1px solid ${border};color:${color};font-size:11px;box-shadow:0 14px 45px rgba(0,0,0,.35)`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function setMicUi(on) {
    document.querySelectorAll('.co-inline-mic[data-co-mic]').forEach(btn => {
      btn.classList.toggle('listening', on);
      btn.textContent = on ? '■' : '🎙';
      btn.title = on ? 'Parar grabación' : 'Hablar';
    });
    document.querySelectorAll('.co-mic[data-co-mic]').forEach(btn => {
      btn.classList.toggle('listening', on);
      btn.innerHTML = on ? '<span class="co-rec-dot"></span> Parar' : '🎙 Hablar';
    });
    const status = document.getElementById('coVoiceStatus');
    if (status) status.textContent = on ? 'Escuchando… habla normal' : 'Listo para dictar';
  }

  function commitTranscript() {
    const value = transcript.trim();
    if (value) {
      window.CreativeOSRunner?.setBrief?.(value);
      setDraftUi(value);
      toast('Brief de voz guardado.', 'ok');
    } else {
      setDraftUi(previousBrief);
    }
  }

  function stopVoice() {
    if (stopTimer) clearTimeout(stopTimer);
    stopTimer = null;
    if (rec && listening) {
      try { rec.stop(); } catch {}
    }
  }

  function startVoiceStable() {
    if (listening) {
      stopVoice();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    window.CreativeOSRunner?.open?.();

    if (!SR) {
      toast('Este navegador no admite transcripción directa. Usa el dictado del sistema dentro del campo Brief.', 'warn');
      setTimeout(() => document.querySelector('#coRunnerComposer [data-co-brief]')?.focus(), 0);
      return;
    }

    previousBrief = getBrief();
    transcript = '';
    setDraftUi('');

    rec = new SR();
    rec.lang = 'es-ES';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      listening = true;
      setMicUi(true);
      stopTimer = setTimeout(() => stopVoice(), 60000);
    };

    rec.onresult = event => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += text + ' ';
        else interimText += text;
      }
      transcript = `${finalText}${interimText}`.trim();
      setDraftUi(transcript);
      const status = document.getElementById('coVoiceStatus');
      if (status) status.textContent = transcript ? 'Escuchando… ya te estoy transcribiendo' : 'Escuchando… habla normal';
    };

    rec.onerror = event => {
      if (stopTimer) clearTimeout(stopTimer);
      stopTimer = null;
      listening = false;
      setMicUi(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setDraftUi(previousBrief);
        toast('Necesitas permitir el micrófono para esta web en el navegador.', 'error');
      } else if (event.error === 'no-speech') {
        setDraftUi(previousBrief);
        toast('No he detectado voz. Pulsa el micro y vuelve a hablar.', 'warn');
      } else if (event.error !== 'aborted') {
        setDraftUi(previousBrief);
        toast('El dictado falló. Puedes volver a pulsar el micro sin recargar la app.', 'error');
      }
    };

    rec.onend = () => {
      if (stopTimer) clearTimeout(stopTimer);
      stopTimer = null;
      const wasListening = listening;
      listening = false;
      setMicUi(false);
      if (wasListening || transcript.trim()) commitTranscript();
    };

    try {
      rec.start();
    } catch {
      listening = false;
      setMicUi(false);
      setDraftUi(previousBrief);
      toast('No se pudo iniciar el micrófono. Vuelve a intentarlo.', 'error');
    }
  }

  document.addEventListener('click', event => {
    const mic = event.target.closest('[data-co-mic]');
    if (!mic) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    startVoiceStable();
  }, true);

  window.addEventListener('beforeunload', stopVoice);
  window.CreativeOSVoice = { start: startVoiceStable, stop: stopVoice };
})();
