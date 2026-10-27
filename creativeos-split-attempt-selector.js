(() => {
  'use strict';
  if (window.CreativeOSSplitAttemptSelector?.version === '1.2') return;

  const KEY_PREFIX = 'creativeos_winner_attempt:';
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const key = trackId => KEY_PREFIX + trackId;
  const rawData = () => window.CreativeOSWinnerLab?.__attemptSelectorOriginalGetData?.() || window.CreativeOSWinnerLab?.getData?.() || {winnerTracks:[],winnerAttempts:[]};
  const currentTrackId = () => sessionStorage.getItem('creativeos_winner_track') || '';

  function attemptsFor(trackId, source = rawData()) {
    return (source.winnerAttempts || [])
      .filter(a => a.track_id === trackId && !a.is_discarded)
      .sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  function selectedId(trackId, rows) {
    let id = sessionStorage.getItem(key(trackId)) || '';
    if (!rows.some(a => a.id === id)) {
      id = rows.length > 1 ? rows[rows.length - 1].id : (rows[0]?.id || '');
      if (id) sessionStorage.setItem(key(trackId), id);
    }
    return id;
  }

  function patchGetData() {
    const lab = window.CreativeOSWinnerLab;
    if (!lab?.getData) return false;
    if (lab.__attemptSelectorPatched) return true;
    const original = lab.getData.bind(lab);
    lab.__attemptSelectorOriginalGetData = original;
    lab.getData = () => {
      const d = original() || {winnerPlans:[],winnerTracks:[],winnerAttempts:[]};
      const rows = (d.winnerAttempts || []).map(a => ({...a, content:a?.content && typeof a.content === 'object' ? {...a.content} : a.content}));
      const tracks = (d.winnerTracks || []).map(t => ({...t}));
      for (const t of tracks) {
        const aa = rows.filter(a => a.track_id === t.id && !a.is_discarded).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
        if (aa.length > 1) {
          const id = selectedId(t.id, aa);
          if (id) t.best_attempt_id = id;
        }
      }
      return {...d, winnerTracks:tracks, winnerAttempts:rows};
    };
    lab.__attemptSelectorPatched = true;
    return true;
  }

  function injectCss() {
    if (document.getElementById('cos6AttemptSelectorStyle')) return;
    const s = document.createElement('style');
    s.id = 'cos6AttemptSelectorStyle';
    s.textContent = `
      .cos6-attempt-switcher{margin:14px 22px 0;padding:12px 13px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(7,12,18,.58)}
      .cos6-attempt-switcher-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px}
      .cos6-attempt-switcher-head small{font-size:7px;text-transform:uppercase;letter-spacing:.11em;color:#6f7d90}
      .cos6-attempt-switcher-head b{font-size:9px;color:#dce5ef}
      .cos6-attempt-list{display:flex;gap:7px;flex-wrap:wrap}
      .cos6-attempt-btn{min-width:150px;max-width:260px;display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px;align-items:center;text-align:left;border:1px solid rgba(255,255,255,.075);background:#0d141d;color:#8f9cad;border-radius:10px;padding:8px 9px;cursor:pointer;transition:.16s ease}
      .cos6-attempt-btn:hover{border-color:var(--c);transform:translateY(-1px);color:#fff}
      .cos6-attempt-btn.active{border-color:color-mix(in srgb,var(--c) 55%,transparent);background:color-mix(in srgb,var(--c) 9%,#0d141d);color:#fff;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 15%,transparent)}
      .cos6-attempt-num{width:24px;height:24px;display:grid;place-items:center;border-radius:7px;background:rgba(255,255,255,.05);font-size:8px;font-weight:900;color:var(--c)}
      .cos6-attempt-copy{min-width:0}.cos6-attempt-copy b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:8px;color:inherit}.cos6-attempt-copy span{display:block;margin-top:2px;font-size:7px;color:#657387}
      .cos6-pinterest-prompt p{font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;color:#d9cbff!important;background:rgba(167,139,250,.07);padding:9px;border-radius:8px}
      .cos6-reference-link a{display:inline-flex;align-items:center;gap:6px;color:#c7ccff;text-decoration:none;font-weight:800}.cos6-reference-link a:hover{text-decoration:underline;color:#fff}
      @media(max-width:720px){.cos6-attempt-switcher{margin:10px 14px 0}.cos6-attempt-btn{min-width:100%;max-width:none}}
    `;
    document.head.appendChild(s);
  }

  function compactTitle(title='') {
    return String(title)
      .replace(/^Agresivo\s*·\s*/i,'')
      .replace(/^Split\s*\d+\s*·\s*/i,'')
      .replace(/^Avatar\s*·\s*/i,'')
      .replace(/^Fondo\s*\+\s*texto\s*·\s*/i,'Fondo + texto · ')
      .trim();
  }

  function productionLabel(status='') {
    return ({waiting_prepare:'Por preparar',recorded:'Grabado',published:'Publicado',waiting_data:'Esperando data',data_ready:'Data lista'})[status] || status || 'Por preparar';
  }

  function injectAttemptSwitcher(root) {
    const trackId = currentTrackId();
    if (!root || !trackId) return;
    const d = window.CreativeOSWinnerLab?.getData?.() || rawData();
    const aa = attemptsFor(trackId, d);
    if (aa.length <= 1) return;
    const selected = selectedId(trackId, aa);
    let box = root.querySelector('.cos6-attempt-switcher');
    if (!box) {
      box = document.createElement('section');
      box.className = 'cos6-attempt-switcher';
      const tabs = root.querySelector('.cos4-tabs');
      if (tabs) tabs.insertAdjacentElement('beforebegin', box);
      else root.querySelector('.cos4-panel')?.prepend(box);
    }
    const signature = [selected, ...aa.map(a => `${a.id}:${a.production_status}:${a.title}`)].join('|');
    if (box.dataset.signature !== signature) {
      box.dataset.signature = signature;
      box.innerHTML = `<div class="cos6-attempt-switcher-head"><small>Variantes dentro de este pilar</small><b>${aa.length} intentos</b></div><div class="cos6-attempt-list">${aa.map((a,i)=>`<button class="cos6-attempt-btn ${a.id===selected?'active':''}" data-cos6-attempt="${esc(a.id)}" data-cos6-track="${esc(trackId)}"><span class="cos6-attempt-num">${String(i+1).padStart(2,'0')}</span><span class="cos6-attempt-copy"><b>${esc(compactTitle(a.title)||`Intento ${i+1}`)}</b><span>${esc(productionLabel(a.production_status))}</span></span></button>`).join('')}</div>`;
    }

    const chosen = aa.find(a => a.id === selected) || aa[0];
    const kicker = root.querySelector('.cos4-kicker');
    const kickerText = `Ficha del split · ${aa.length} variantes · viendo ${aa.indexOf(chosen)+1}/${aa.length}`;
    if (kicker && kicker.textContent !== kickerText) kicker.textContent = kickerText;
  }

  function injectPinterestPrompt(root) {
    const trackId = currentTrackId();
    if (!root || !trackId) return;
    const d = window.CreativeOSWinnerLab?.getData?.() || rawData();
    const aa = attemptsFor(trackId, d);
    const selected = selectedId(trackId, aa);
    const a = aa.find(x => x.id === selected) || aa[0];
    const prompt = a?.content?.pinterest_prompt;
    const existing = root.querySelector('.cos6-pinterest-prompt');
    if (!prompt) { existing?.remove(); return; }
    if (existing) {
      const p = existing.querySelector('p');
      if (p && p.textContent !== prompt) p.textContent = prompt;
      return;
    }

    const card = document.createElement('section');
    card.className = 'cos4-card wide cos6-pinterest-prompt';
    card.innerHTML = `<small>Pinterest · Prompt rápido</small><p>${esc(prompt)}</p>`;
    const refs = root.querySelector('.cos5-group[data-group="refs"] .cos5-group-grid');
    if (refs) { refs.appendChild(card); return; }
    const grid = root.querySelector('[data-cos4-view="sheet"] > .cos4-grid');
    if (grid) grid.appendChild(card);
  }

  function safeReferenceUrl(value='') {
    try {
      const u = new URL(String(value || ''));
      return /^https?:$/.test(u.protocol) ? u.href : '';
    } catch (_) {
      return '';
    }
  }

  function injectReferenceLink(root) {
    const trackId = currentTrackId();
    if (!root || !trackId) return;
    const d = window.CreativeOSWinnerLab?.getData?.() || rawData();
    const aa = attemptsFor(trackId, d);
    const selected = selectedId(trackId, aa);
    const a = aa.find(x => x.id === selected) || aa[0];
    const url = safeReferenceUrl(a?.content?.reference_url);
    const existing = root.querySelector('.cos6-reference-link');
    if (!url) { existing?.remove(); return; }
    if (existing) {
      const link = existing.querySelector('a');
      if (link && link.href !== url) link.href = url;
      return;
    }

    const card = document.createElement('section');
    card.className = 'cos4-card wide cos6-reference-link';
    const label = a?.content?.reference_label || 'Abrir referencia';
    card.innerHTML = `<small>Referencia · Reel</small><p><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a></p>`;
    const refs = root.querySelector('.cos5-group[data-group="refs"] .cos5-group-grid');
    if (refs) { refs.prepend(card); return; }
    const sheetStack = root.querySelector('[data-cos4-view="sheet"] .cos5-sheet-stack');
    if (sheetStack) {
      const section = document.createElement('section');
      section.className = 'cos5-group';
      section.dataset.group = 'refs';
      section.style.setProperty('--g','#818cf8');
      section.style.setProperty('--gs','rgba(129,140,248,.07)');
      section.innerHTML = '<div class="cos5-group-head"><div class="cos5-group-icon">⌕</div><div class="cos5-group-title"><small>BLOQUE</small><h3>Referencias</h3></div></div><div class="cos5-group-grid"></div>';
      section.querySelector('.cos5-group-grid').appendChild(card);
      sheetStack.appendChild(section);
      return;
    }
    const grid = root.querySelector('[data-cos4-view="sheet"] > .cos4-grid');
    if (grid) grid.appendChild(card);
  }

  function decorate() {
    patchGetData();
    injectCss();
    const root = document.getElementById('cos4Root');
    if (!root) return;
    injectAttemptSwitcher(root);
    injectPinterestPrompt(root);
    injectReferenceLink(root);
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest?.('[data-cos6-attempt]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const trackId = btn.dataset.cos6Track || currentTrackId();
    const attemptId = btn.dataset.cos6Attempt || '';
    if (!trackId || !attemptId) return;
    sessionStorage.setItem(key(trackId), attemptId);
    sessionStorage.setItem('creativeos_winner_track', trackId);
    window.CreativeOSSplitBoard?.openTrack?.(trackId);
    setTimeout(decorate, 30);
  }, true);

  const mo = new MutationObserver(() => requestAnimationFrame(decorate));
  if (document.body) mo.observe(document.body, {childList:true, subtree:true});
  window.addEventListener('creativeos:winner-lab-updated', () => setTimeout(decorate, 40));
  document.addEventListener('creativeos:intelligence-render', () => setTimeout(decorate, 40));

  function boot(tries=0) {
    if (patchGetData()) { decorate(); return; }
    if (tries < 40) setTimeout(() => boot(tries+1), 100);
  }
  boot();

  window.CreativeOSSplitAttemptSelector = {version:'1.2', decorate};
})();