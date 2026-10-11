(() => {
  'use strict';

  let recognition = null;
  let listening = false;
  let timeoutId = null;
  let finalText = '';
  let lastError = null;

  function toast(message, tone = 'default') {
    let wrap = document.getElementById('coVoiceToasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'coVoiceToasts';
      wrap.style.cssText = 'position:fixed;right:22px;top:132px;z-index:10030;display:grid;gap:8px;pointer-events:none';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    const border = tone === 'error' ? '#813544' : tone === 'ok' ? '#1f7048' : '#6b5521';
    const color = tone === 'error' ? '#ffbac3' : tone === 'ok' ? '#aef0c9' : '#f2d486';
    el.textContent = message;
    el.style.cssText = `max-width:360px;padding:10px 12px;border-radius:11px;background:#111722;border:1px solid ${border};color:${color};font-size:11px;box-shadow:0 14px 45px rgba(0,0,0,.35)`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  function setUi(on, label = 'Listo para dictar') {
    document.querySelectorAll('.co-inline-mic[data-co-mic]').forEach(btn => {
      btn.classList.toggle('listening', on);
      btn.textContent = on ? '■' : '🎙';
      btn.title = on ? 'Parar dictado' : 'Hablar';
    });
    document.querySelectorAll('.co-mic[data-co-mic]').forEach(btn => {
      btn.classList.toggle('listening', on);
      btn.textContent = on ? '■ Parar' : '🎙 Hablar';
    });
    const status = document.getElementById('coVoiceStatus');
    if (status) status.textContent = label;
  }

  function saveDiagnostic(error, detail = '') {
    lastError = { error, detail, at: new Date().toISOString(), userAgent: navigator.userAgent };
    try { localStorage.setItem('creativeos_voice_diag_v1', JSON.stringify(lastError)); } catch {}
  }

  function cleanup() {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    recognition = null;
    listening = false;
    setUi(false, 'Listo para dictar');
  }

  function stop() {
    if (!recognition) {
      cleanup();
      return;
    }
    try { recognition.stop(); }
    catch { cleanup(); }
  }

  function unsupportedFallback() {
    window.CreativeOSRunner?.open?.();
    setTimeout(() => document.querySelector('#coRunnerComposer [data-co-brief]')?.focus(), 40);
    toast('El dictado web de este navegador no es estable. He dejado el campo Brief listo para el dictado del Mac.', 'warn');
  }

  function start() {
    if (listening) {
      stop();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      saveDiagnostic('unsupported');
      unsupportedFallback();
      return;
    }

    finalText = '';
    lastError = null;
    recognition = new SR();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      listening = true;
      setUi(true, 'Escuchando… habla ahora');
      timeoutId = setTimeout(() => stop(), 25000);
    };

    recognition.onresult = event => {
      const parts = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i]?.[0]?.transcript?.trim();
        if (text) parts.push(text);
      }
      finalText = parts.join(' ').trim();
      setUi(true, finalText ? 'Texto capturado · terminando…' : 'Escuchando…');
    };

    recognition.onerror = event => {
      const error = event?.error || 'unknown';
      const message = event?.message || '';
      saveDiagnostic(error, message);
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        toast('Chrome tiene bloqueado el micrófono para esta web. Actívalo en el candado y vuelve a probar.', 'error');
      } else if (error === 'audio-capture') {
        toast('Chrome no pudo abrir el micrófono. Revisa que otra app no lo esté usando.', 'error');
      } else if (error === 'no-speech') {
        toast('No he detectado voz. Pulsa otra vez y habla justo después.', 'warn');
      } else if (error !== 'aborted') {
        toast(`Falló el dictado (${error}). La app sigue funcionando.`, 'error');
      }
    };

    recognition.onend = () => {
      const text = finalText.trim();
      cleanup();
      if (text) {
        window.CreativeOSRunner?.setBrief?.(text);
        window.CreativeOSRunner?.open?.();
        toast('Brief de voz guardado.', 'ok');
      }
    };

    try {
      recognition.start();
    } catch (err) {
      saveDiagnostic(err?.name || 'start-failed', err?.message || '');
      cleanup();
      unsupportedFallback();
    }
  }

  function toggle() {
    if (listening) stop();
    else start();
  }

  function bindOwnedButton(button) {
    if (!button || button.dataset.coVoiceOwned === '1') return;
    const clone = button.cloneNode(true);
    clone.dataset.coVoiceOwned = '1';
    clone.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });
    button.replaceWith(clone);
  }

  function claimMicButtons(root = document) {
    root.querySelectorAll?.('[data-co-mic]').forEach(bindOwnedButton);
  }

  function initOwnership() {
    claimMicButtons();
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.('[data-co-mic]')) bindOwnedButton(node);
          claimMicButtons(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.CreativeOSVoice = {
    start,
    stop,
    toggle,
    isListening: () => listening,
    diagnostics: () => lastError
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initOwnership, { once: true });
  else initOwnership();
})();
