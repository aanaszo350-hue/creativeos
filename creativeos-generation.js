(() => {
  const QUEUE_URL = 'https://naiglzmqpgucfbwfbvxt.supabase.co/functions/v1/creativeos-queue';
  const STORAGE_KEY = 'creativeos_local_v3';

  let recognition = null;
  let listening = false;
  let activeMode = 'REMIX';

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function toast(message, tone = 'default') {
    let wrap = document.getElementById('coRunnerToasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'coRunnerToasts';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = `co-runner-toast ${tone}`;
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function findAvatar(state, id) {
    if (!id) return null;
    for (const p of state.products || []) {
      const avatar = (p.avatars || []).find(a => a.id === id);
      if (avatar) return avatar;
    }
    return null;
  }

  function durableUrl(item) {
    const values = [item?.publicUrl, item?.url, item?.src, item?.resultUrl];
    return values.find(v => /^https:\/\//i.test(String(v || ''))) || null;
  }

  function localContextSnapshot(state) {
    const c = state.context || {};
    const product = (state.products || []).find(p => p.id === c.productId) || null;
    const concept = (state.concepts || []).find(x => x.id === c.conceptId) || null;
    const selectedVideo = (state.videos || []).find(v => v.id === c.videoId) || null;
    const avatar = findAvatar(state, c.avatarId);
    const selectedIds = new Set(c.assetIds || []);
    const mediaRefs = [];
    const assets = [];

    for (const p of state.products || []) {
      for (const a of p.assets || []) {
        if (!selectedIds.has(a.id)) continue;
        assets.push({ id: a.id, name: a.name, type: a.type || a.category || null, productId: p.id });
        const url = durableUrl(a);
        if (url) mediaRefs.push({
          role: 'asset', id: a.id, name: a.name || 'Asset', category: a.type || a.category || null,
          productId: p.id, url, storagePath: a.storagePath || null,
          mimeType: a.mimeType || null, sizeBytes: a.sizeBytes || null
        });
      }
    }

    for (const ref of concept?.videoRefs || []) {
      const url = durableUrl(ref);
      if (!url) continue;
      mediaRefs.push({
        role: 'concept_video', id: ref.id, name: ref.name || 'Vídeo de concepto', conceptId: concept.id,
        url, storagePath: ref.storagePath || null, mimeType: ref.type || ref.mimeType || 'video/mp4',
        sizeBytes: ref.size || ref.sizeBytes || null
      });
    }

    const selectedVideoUrl = durableUrl(selectedVideo);
    if (selectedVideo && selectedVideoUrl) {
      mediaRefs.push({
        role: 'selected_video', id: selectedVideo.id, name: selectedVideo.title || selectedVideo.name || 'Vídeo seleccionado',
        productId: selectedVideo.productId || product?.id || null, url: selectedVideoUrl,
        storagePath: selectedVideo.storagePath || null, mimeType: selectedVideo.mimeType || 'video/mp4'
      });
    }

    return {
      product: product ? { id: product.id, name: product.name, label: product.label, brief: product.brief || '' } : null,
      concept: concept ? { id: concept.id, name: concept.name, description: concept.desc || '', source: concept.source || '' } : null,
      video: selectedVideo ? { id: selectedVideo.id, title: selectedVideo.title || '', productId: selectedVideo.productId || null } : null,
      avatar: avatar ? { id: avatar.id, name: avatar.name, segment: avatar.segment || '', role: avatar.role || '' } : null,
      assets,
      mediaRefs,
      instruction: c.instruction || '',
      locks: c.locks || {},
      mode: c.mode || null
    };
  }

  async function snapshotContext() {
    if (window.CreativeOSCloud?.syncNow) {
      try { await window.CreativeOSCloud.syncNow(); } catch {}
    }
    const snap = localContextSnapshot(loadState());
    if (window.CreativeOSCloud?.getMediaRefs) {
      try {
        const cloudRefs = window.CreativeOSCloud.getMediaRefs();
        if (Array.isArray(cloudRefs) && cloudRefs.length) snap.mediaRefs = cloudRefs;
      } catch {}
    }
    return snap;
  }

  function getBrief() {
    return (loadState().context?.instruction || '').trim();
  }

  function setBrief(value) {
    const state = loadState();
    state.context = state.context || {};
    state.context.instruction = value;
    saveState(state);
    document.querySelectorAll('[data-co-brief], #homeContextInstruction, #contextInstruction').forEach(el => {
      if (el.value !== value) el.value = value;
    });
    refreshInlineSummary();
  }

  function selectMode(mode) {
    activeMode = mode === 'CREATE' ? 'CREATE' : 'REMIX';
    document.querySelectorAll('[data-co-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.coMode === activeMode));
    const select = document.getElementById('coRunnerMode');
    if (select) select.value = activeMode;
  }

  function stopVoice() {
    if (recognition && listening) {
      try { recognition.stop(); } catch {}
    }
  }

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      openComposer();
      toast('Este navegador no admite transcripción directa. Puedes usar el dictado del sistema en el campo de brief.', 'warn');
      document.querySelector('[data-co-brief]')?.focus();
      return;
    }
    if (listening) {
      stopVoice();
      return;
    }

    openComposer();
    setBrief('');
    recognition = new SR();
    listening = true;
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalText = '';
    setVoiceUi(true);

    recognition.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += `${text} `;
        else interim += text;
      }
      setBrief(`${finalText}${interim}`.trim());
    };
    recognition.onerror = event => {
      listening = false;
      setVoiceUi(false);
      if (event.error !== 'aborted') toast('No he podido transcribir el audio.', 'error');
    };
    recognition.onend = () => {
      listening = false;
      setVoiceUi(false);
      if (getBrief()) toast('Brief de voz guardado.', 'ok');
    };
    try { recognition.start(); }
    catch {
      listening = false;
      setVoiceUi(false);
    }
  }

  function setVoiceUi(on) {
    document.querySelectorAll('[data-co-mic]').forEach(btn => {
      btn.classList.toggle('listening', on);
      btn.innerHTML = on ? '<span class="co-rec-dot"></span> Parar' : '🎙 Hablar';
    });
    const status = document.getElementById('coVoiceStatus');
    if (status) status.textContent = on ? 'Escuchando… habla normal' : 'Listo para dictar';
  }

  function renderContextLine() {
    const state = loadState();
    const c = state.context || {};
    const p = (state.products || []).find(x => x.id === c.productId);
    const concept = (state.concepts || []).find(x => x.id === c.conceptId);
    const count = (c.assetIds || []).length;
    const parts = [p?.name, concept?.name, count ? `${count} asset${count === 1 ? '' : 's'}` : null].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Selecciona producto, concepto y assets';
  }

  function refreshInlineSummary() {
    document.querySelectorAll('[data-co-context-summary]').forEach(el => el.textContent = renderContextLine());
    const brief = getBrief();
    document.querySelectorAll('[data-co-brief-summary]').forEach(el => el.textContent = brief || 'Sin brief todavía');
  }

  function openComposer() {
    let panel = document.getElementById('coRunnerComposer');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'coRunnerComposer';
      panel.innerHTML = `
        <div class="co-runner-head">
          <div><b>Creative Runner</b><span data-co-context-summary></span></div>
          <button class="co-close" data-co-close>×</button>
        </div>
        <div class="co-runner-body">
          <div class="co-voice-row">
            <button class="co-mic" data-co-mic>🎙 Hablar</button>
            <span id="coVoiceStatus">Listo para dictar</span>
          </div>
          <textarea data-co-brief placeholder="Di o escribe exactamente qué quieres cambiar y qué debe mantenerse…"></textarea>
          <div class="co-mode-row">
            <button data-co-mode="REMIX" class="active">REMIX</button>
            <button data-co-mode="CREATE">CREATE</button>
          </div>
          <div class="co-runner-actions">
            <button class="co-clear" data-co-clear>Limpiar brief</button>
            <button class="co-generate" data-co-generate>⚡ GENERAR</button>
          </div>
          <div class="co-runner-note">Se crea un Job con una copia fija de este contexto. Puedes cambiar al siguiente mientras éste queda en cola.</div>
        </div>`;
      document.body.appendChild(panel);
      const area = panel.querySelector('[data-co-brief]');
      area.value = getBrief();
      area.addEventListener('input', () => setBrief(area.value));
      panel.querySelector('[data-co-mic]').addEventListener('click', startVoice);
      panel.querySelector('[data-co-close]').addEventListener('click', () => panel.classList.remove('open'));
      panel.querySelector('[data-co-clear]').addEventListener('click', () => setBrief(''));
      panel.querySelector('[data-co-generate]').addEventListener('click', () => enqueueJob(activeMode));
      panel.querySelectorAll('[data-co-mode]').forEach(btn => btn.addEventListener('click', () => selectMode(btn.dataset.coMode)));
    }
    panel.classList.add('open');
    const area = panel.querySelector('[data-co-brief]');
    area.value = getBrief();
    selectMode(activeMode);
    refreshInlineSummary();
  }

  async function enqueueJob(mode = activeMode) {
    const generateButtons = document.querySelectorAll('[data-co-generate]');
    generateButtons.forEach(btn => { btn.disabled = true; btn.textContent = 'Enviando…'; });
    try {
      const snap = await snapshotContext();
      if (!snap.product) throw new Error('Selecciona primero un producto.');
      if (!snap.instruction.trim()) throw new Error('Graba o escribe primero el brief.');
      if (!snap.mediaRefs.length) throw new Error('No hay archivos reales listos en este contexto todavía.');

      const unresolvedSelected = snap.assets.length && snap.mediaRefs.filter(r => r.role === 'asset').length < snap.assets.length;
      if (unresolvedSelected) throw new Error('Algún asset seleccionado todavía se está subiendo. Espera unos segundos y vuelve a generar.');

      const id = crypto.randomUUID();
      const model = mode === 'CREATE' ? 'Seedance 2.5 · 480p · 9:16' : 'Wan 3.0 · 480p · 9:16';
      const titleBase = snap.concept?.name || snap.product.name || 'Generación';
      const title = `${titleBase} · ${mode === 'CREATE' ? 'Create' : 'Remix'}`;
      const payload = {
        source: 'creativeos_web',
        queueVersion: 1,
        instruction: snap.instruction,
        locks: snap.locks,
        mediaRefs: snap.mediaRefs,
        contextSnapshot: snap,
        requestedMode: mode,
        requestedModel: model,
        requestedResolution: '480p',
        requestedAspectRatio: '9:16',
        workerState: 'waiting_for_worker'
      };

      const queueRes = await fetch(QUEUE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          product_id: snap.product.id,
          concept_id: snap.concept?.id || null,
          avatar_id: snap.avatar?.id || null,
          model,
          mode: mode === 'CREATE' ? 'Create' : 'Remix',
          title,
          version: 1,
          note: snap.instruction,
          payload
        })
      });
      if (!queueRes.ok) {
        const detail = await queueRes.text();
        throw new Error(`No se pudo crear el Job (${queueRes.status}): ${detail}`);
      }

      if (window.CreativeOSCloud?.pullJobs) {
        try { await window.CreativeOSCloud.pullJobs(); } catch {}
      }
      toast('Job creado ✓ Ya puedes preparar el siguiente.', 'ok');
      const panel = document.getElementById('coRunnerComposer');
      if (panel) panel.classList.remove('open');
    } catch (err) {
      toast(err?.message || String(err), 'error');
    } finally {
      generateButtons.forEach(btn => { btn.disabled = false; btn.textContent = '⚡ GENERAR'; });
    }
  }

  function injectInlineControls() {
    document.querySelectorAll('.context-bar').forEach(bar => {
      if (bar.querySelector('.co-inline-runner')) return;
      const wrap = document.createElement('div');
      wrap.className = 'co-inline-runner';
      wrap.innerHTML = `
        <button class="co-inline-mic" data-co-mic>🎙</button>
        <button class="co-inline-brief" data-co-open><span>Brief</span><small data-co-brief-summary>Sin brief todavía</small></button>
        <select id="coRunnerMode" class="co-inline-mode"><option value="REMIX">REMIX</option><option value="CREATE">CREATE</option></select>
        <button class="co-inline-generate" data-co-generate>⚡ Generar</button>`;
      bar.appendChild(wrap);
      wrap.querySelector('[data-co-mic]').addEventListener('click', startVoice);
      wrap.querySelector('[data-co-open]').addEventListener('click', openComposer);
      wrap.querySelector('[data-co-generate]').addEventListener('click', () => enqueueJob(activeMode));
      wrap.querySelector('select').addEventListener('change', e => selectMode(e.target.value));
    });
    refreshInlineSummary();
  }

  function injectStyle() {
    if (document.getElementById('coRunnerStyle')) return;
    const style = document.createElement('style');
    style.id = 'coRunnerStyle';
    style.textContent = `
      .co-inline-runner{margin-left:auto;display:flex;align-items:center;gap:7px;min-width:0}
      .co-inline-mic,.co-inline-generate,.co-inline-brief,.co-inline-mode{border:1px solid #343b49;background:#11151d;color:#fff;border-radius:10px;min-height:34px;font:inherit}
      .co-inline-mic{width:38px;cursor:pointer;font-size:15px}.co-inline-mic.listening{background:#421318;border-color:#ff5b69}
      .co-inline-brief{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:5px 10px;max-width:210px;cursor:pointer}.co-inline-brief span{font-size:10px;font-weight:800}.co-inline-brief small{font-size:9px;color:#7f899d;max-width:185px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .co-inline-mode{padding:0 9px;font-size:10px;outline:none}
      .co-inline-generate,.co-generate{cursor:pointer;font-weight:900;color:#1b1400;border-color:#f1c13a;background:linear-gradient(135deg,#ffe472,#ffbf23);box-shadow:0 7px 24px rgba(255,191,35,.22)}
      .co-inline-generate{padding:0 13px}.co-inline-generate:hover,.co-generate:hover{filter:brightness(1.05);transform:translateY(-1px)}
      #coRunnerComposer{position:fixed;right:22px;bottom:22px;width:min(440px,calc(100vw - 24px));z-index:9999;background:#0b0e14;border:1px solid #313948;border-radius:18px;box-shadow:0 28px 90px rgba(0,0,0,.58);display:none;overflow:hidden;color:#f6f8fb}
      #coRunnerComposer.open{display:block;animation:coIn .15s ease-out}@keyframes coIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      .co-runner-head{display:flex;align-items:center;justify-content:space-between;padding:14px 15px;border-bottom:1px solid #242b37;background:linear-gradient(180deg,#141820,#0e1118)}.co-runner-head b{display:block;font-size:13px}.co-runner-head span{display:block;margin-top:3px;font-size:9px;color:#818ca0}.co-close{border:0;background:transparent;color:#8f98a8;font-size:22px;cursor:pointer}
      .co-runner-body{padding:14px}.co-voice-row{display:flex;align-items:center;gap:9px;margin-bottom:9px}.co-voice-row span{font-size:10px;color:#8994a8}.co-mic{border:1px solid #3a4352;background:#171c26;color:#fff;border-radius:10px;padding:8px 11px;cursor:pointer;font-weight:750}.co-mic.listening{border-color:#ff5f70;background:#391218}.co-rec-dot{width:7px;height:7px;border-radius:50%;display:inline-block;background:#ff5264;box-shadow:0 0 0 5px rgba(255,82,100,.12);animation:coPulse 1s infinite}@keyframes coPulse{50%{transform:scale(1.22);opacity:.65}}
      #coRunnerComposer textarea{width:100%;min-height:122px;resize:vertical;background:#090c11;border:1px solid #2a3341;border-radius:12px;padding:11px 12px;color:#f4f7fb;outline:none;line-height:1.45;font-size:12px}#coRunnerComposer textarea:focus{border-color:#6b7fae;box-shadow:0 0 0 3px rgba(91,119,179,.1)}
      .co-mode-row{display:flex;gap:7px;margin-top:9px}.co-mode-row button{border:1px solid #303846;background:#111620;color:#9099a8;border-radius:9px;padding:7px 10px;font-size:9px;font-weight:850;cursor:pointer}.co-mode-row button.active{background:#282108;color:#ffd65e;border-color:#735a14}
      .co-runner-actions{display:flex;justify-content:space-between;gap:9px;margin-top:12px}.co-clear{border:1px solid #303846;background:#111620;color:#9ba4b4;border-radius:10px;padding:9px 11px;cursor:pointer}.co-generate{border-radius:11px;padding:10px 18px;border-style:solid}.co-generate:disabled,.co-inline-generate:disabled{opacity:.6;cursor:wait}.co-runner-note{font-size:9px;color:#6f7888;line-height:1.45;margin-top:10px}
      #coRunnerToasts{position:fixed;right:22px;top:88px;z-index:10000;display:grid;gap:8px}.co-runner-toast{max-width:330px;padding:10px 12px;border-radius:11px;background:#111722;border:1px solid #303949;color:#e9eef6;font-size:11px;box-shadow:0 14px 45px rgba(0,0,0,.35)}.co-runner-toast.ok{border-color:#1f7048;color:#aef0c9}.co-runner-toast.error{border-color:#813544;color:#ffbac3}.co-runner-toast.warn{border-color:#6b5521;color:#f2d486}
      @media(max-width:900px){.co-inline-brief{display:none}.co-inline-runner{width:100%;margin-left:0}.co-inline-generate{margin-left:auto}#coRunnerComposer{right:12px;bottom:12px}}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    injectStyle();
    injectInlineControls();
    const observer = new MutationObserver(() => injectInlineControls());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('storage', refreshInlineSummary);
    window.CreativeOSRunner = {
      open: openComposer,
      startVoice,
      stopVoice,
      enqueueJob,
      getBrief,
      setBrief
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
