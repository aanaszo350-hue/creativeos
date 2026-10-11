(() => {
  const STORAGE_KEY = 'creativeos_local_v3';
  let recognition = null;
  let listening = false;
  let previousBrief = '';
  let finalTranscript = '';
  let stopTimer = null;
  let starting = false;

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  function getBrief() {
    return (loadState().context?.instruction || '').trim();
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

  function ensureStatusPill() {
    let pill = document.getElementById('coVoiceFloatingStatus');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'coVoiceFloatingStatus';
      pill.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:10002;padding:10px 14px;border-radius:999px;background:#2a1116;border:1px solid #ff5b69;color:#ffd8dc;font-size:12px;font-weight:800;box-shadow:0 18px 55px rgba(0,0,0,.4);display:none;align-items:center;gap:9px';
      pill.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#ff5364;box-shadow:0 0 0 5px rgba(255,83,100,.13)"></span><span>Escuchando…</span>';
      document.body.appendChild(pill);
    }
    return pill;
  }

  function setMicUi(on, label = 'Escuchando…') {
    document.querySelectorAll('.co-inline-mic[data-co-mic]').forEach(btn => {
      btn.classList.toggle('listening', on);
      btn.textContent = on ? '■' : '🎙';
      btn.title = on ? 'Parar' : 'Hablar';
      btn.disabled = starting && !on;
    });
    document.querySelectorAll('.co-mic[data-co-mic]').forEach(btn => {
      btn.classList.toggle('listening', on);
      btn.innerHTML = on ? '<span class="co-rec-dot"></span> Parar' : '🎙 Hablar';
      btn.disabled = starting && !on;
    });
    const status = document.getElementById('coVoiceStatus');
    if (status) status.textContent = on ? label : (starting ? 'Preparando micrófono…' : 'Listo para dictar');
    const pill = ensureStatusPill();
    pill.style.display = on ? 'flex' : 'none';
    const text = pill.querySelector('span:last-child');
    if (text) text.textContent = label;
  }

  function commitTranscript() {
    const value = finalTranscript.trim();
    if (!value) {
      setDraftUi(previousBrief);
      toast('No he detectado una frase completa. Vuelve a pulsar y habla normal.', 'warn');
      return;
    }
    window.CreativeOSRunner?.setBrief?.(value);
    setDraftUi(value);
    window.CreativeOSRunner?.open?.();
    toast('Brief de voz guardado.', 'ok');
  }

  function cleanup() {
    if (stopTimer) clearTimeout(stopTimer);
    stopTimer = null;
    listening = false;
    starting = false;
    setMicUi(false);
  }

  function stopVoice() {
    if (stopTimer) clearTimeout(stopTimer);
    stopTimer = null;
    if (recognition && listening) {
      try { recognition.stop(); } catch {}
    } else {
      cleanup();
    }
  }

  async function requestMicPermission() {
    if (!navigator.mediaDevices?.getUserMedia) return true;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        toast('El navegador tiene bloqueado el micrófono para CreativeOS. Permítelo en el candado de la barra de direcciones.', 'error');
      } else {
        toast('No he podido abrir el micrófono.', 'error');
      }
      return false;
    } finally {
      try { stream?.getTracks().forEach(t => t.stop()); } catch {}
    }
  }

  async function startVoiceStable() {
    if (listening) {
      stopVoice();
      return;
    }
    if (starting) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      window.CreativeOSRunner?.open?.();
      toast('Este navegador no admite transcripción directa. El campo Brief sigue disponible para dictado del sistema.', 'warn');
      setTimeout(() => document.querySelector('#coRunnerComposer [data-co-brief]')?.focus(), 0);
      return;
    }

    starting = true;
    setMicUi(false);
    const allowed = await requestMicPermission();
    if (!allowed) {
      cleanup();
      return;
    }

    previousBrief = getBrief();
    finalTranscript = '';
    recognition = new SR();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      starting = false;
      listening = true;
      setMicUi(true, 'Escuchando… habla ahora');
      stopTimer = setTimeout(() => stopVoice(), 30000);
    };

    recognition.onresult = event => {
      const parts = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript?.trim();
        if (text) parts.push(text);
      }
      if (parts.length) finalTranscript = [finalTranscript, ...parts].filter(Boolean).join(' ').trim();
      setMicUi(true, finalTranscript ? 'Perfecto, terminando…' : 'Escuchando…');
    };

    recognition.onerror = event => {
      const error = event?.error || 'unknown';
      cleanup();
      setDraftUi(previousBrief);
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        toast('Permite el micrófono para esta web en Chrome y vuelve a pulsar.', 'error');
      } else if (error === 'no-speech') {
        toast('No he detectado voz. Vuelve a pulsar y habla justo después.', 'warn');
      } else if (error !== 'aborted') {
        toast(`El reconocimiento de voz falló (${error}).`, 'error');
      }
    };

    recognition.onend = () => {
      const hadText = finalTranscript.trim().length > 0;
      cleanup();
      if (hadText) commitTranscript();
    };

    try {
      recognition.start();
    } catch (err) {
      cleanup();
      toast('No se pudo iniciar el dictado. Vuelve a pulsar una vez.', 'error');
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
