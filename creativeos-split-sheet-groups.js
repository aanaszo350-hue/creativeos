(() => {
  'use strict';
  if (window.CreativeOSSplitSheetGroups?.version === '1.0') return;

  const GROUPS = {
    summary: { label: 'Resumen del test', icon: '◇', color: '#94a3b8', soft: 'rgba(148,163,184,.07)' },
    angle: { label: 'Ángulo de venta', icon: '↗', color: '#22d3ee', soft: 'rgba(34,211,238,.07)' },
    copy: { label: 'Texto / Copy', icon: 'T', color: '#f59e0b', soft: 'rgba(245,158,11,.07)' },
    visual: { label: 'Visual / Ejecución', icon: '◈', color: '#a78bfa', soft: 'rgba(167,139,250,.07)' },
    avatar: { label: 'Avatar', icon: '◎', color: '#f472b6', soft: 'rgba(244,114,182,.07)' },
    context: { label: 'Fondo / Contexto', icon: '▧', color: '#60a5fa', soft: 'rgba(96,165,250,.07)' },
    refs: { label: 'Referencias', icon: '⌕', color: '#818cf8', soft: 'rgba(129,140,248,.07)' },
    strategy: { label: 'Estrategia / Aprendizaje', icon: '✦', color: '#34d399', soft: 'rgba(52,211,153,.065)' }
  };

  function injectCss() {
    if (document.getElementById('cos5GroupStyle')) return;
    const s = document.createElement('style');
    s.id = 'cos5GroupStyle';
    s.textContent = `
      .cos5-sheet-stack{display:grid;gap:14px}
      .cos5-group{--g:#94a3b8;--gs:rgba(148,163,184,.07);border:1px solid color-mix(in srgb,var(--g) 22%,rgba(255,255,255,.05));border-left:3px solid var(--g);border-radius:16px;background:linear-gradient(135deg,var(--gs),rgba(13,20,29,.92) 42%);overflow:hidden}
      .cos5-group-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid color-mix(in srgb,var(--g) 15%,rgba(255,255,255,.045))}
      .cos5-group-icon{width:29px;height:29px;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb,var(--g) 12%,transparent);color:var(--g);font-size:11px;font-weight:900}
      .cos5-group-title{min-width:0}.cos5-group-title small{display:block;margin:0 0 2px!important;color:color-mix(in srgb,var(--g) 72%,#94a3b8)!important;font-size:7px!important;letter-spacing:.11em!important}.cos5-group-title h3{margin:0;font-size:12px;color:#e7edf4}
      .cos5-group-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:9px;padding:11px}
      .cos5-group .cos4-card{background:rgba(7,12,18,.40);border-color:rgba(255,255,255,.055)}
      .cos5-group .cos4-card.accent{border-color:color-mix(in srgb,var(--g) 36%,transparent)!important;background:color-mix(in srgb,var(--g) 8%,#0d141d)!important}
      .cos5-group[data-group="copy"] .cos4-card small{color:#d7a43c}
      .cos5-group[data-group="visual"] .cos4-card small{color:#aa93e7}
      .cos5-group[data-group="strategy"] .cos4-card small{color:#67cda8}
      .cos5-group[data-group="refs"] .cos4-card p{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#c7ccff}
      .cos5-group[data-group="angle"] .cos4-card small{color:#56cad9}
      .cos5-group[data-group="avatar"] .cos4-card small{color:#e28bbd}
      .cos5-group[data-group="context"] .cos4-card small{color:#7eb3ee}
      @media(max-width:1100px){.cos5-group-grid .cos4-card{grid-column:span 6}.cos5-group-grid .cos4-card.full{grid-column:1/-1}}
      @media(max-width:720px){.cos5-group-grid{grid-template-columns:1fr;padding:9px}.cos5-group-grid .cos4-card,.cos5-group-grid .cos4-card.wide,.cos5-group-grid .cos4-card.full{grid-column:1/-1}.cos5-group-head{padding:10px 11px}}
    `;
    document.head.appendChild(s);
  }

  const txt = el => (el?.querySelector('small')?.textContent || '').trim().toLowerCase();
  const body = el => (el?.querySelector('p')?.textContent || el?.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();

  function splitType(root) {
    const h = (root.querySelector('.cos4-head h2')?.textContent || '').toLowerCase();
    if (h.includes('ángulo')) return 'sales_angle';
    if (h.includes('texto')) return 'text_hook';
    if (h.includes('fondo')) return 'background';
    if (h.includes('avatar')) return 'avatar';
    if (h.includes('concepto')) return 'concept';
    return 'other';
  }

  function category(label, type) {
    const l = label.toLowerCase();
    if (l.startsWith('pinterest')) return 'refs';
    if (['hipótesis','aprendizaje','nota','cambio psicológico','pregunta estratégica'].some(x => l.includes(x))) return 'strategy';
    if (['hook de texto','hook control','hook variante','secuencia completa','texto 2','texto 3','cta'].some(x => l.includes(x))) return 'copy';
    if (['hook visual','estructura del vídeo','clip laboral','alternativa'].some(x => l.includes(x))) return 'visual';
    if (l.includes('avatar')) return type === 'sales_angle' ? 'angle' : 'avatar';
    if (l.includes('fondo')) return 'context';
    if (l === 'ángulo') return 'angle';
    if (l.includes('idea / contenido')) {
      if (type === 'sales_angle') return 'angle';
      if (type === 'background') return 'context';
      if (type === 'avatar') return 'avatar';
      if (type === 'text_hook') return 'copy';
      if (type === 'concept') return 'visual';
    }
    if (type === 'background') return 'context';
    if (type === 'avatar') return 'avatar';
    if (type === 'text_hook') return 'copy';
    if (type === 'sales_angle') return 'angle';
    if (type === 'concept') return 'visual';
    return 'summary';
  }

  function groupOrder(type) {
    if (type === 'sales_angle') return ['angle','copy','visual','refs','strategy'];
    if (type === 'text_hook') return ['copy','strategy','refs'];
    if (type === 'background') return ['context','refs','strategy'];
    if (type === 'avatar') return ['avatar','refs','strategy'];
    if (type === 'concept') return ['visual','copy','refs','strategy'];
    return ['summary','copy','visual','refs','strategy'];
  }

  function groupSheet(root) {
    const sheet = root.querySelector('[data-cos4-view="sheet"]');
    const grid = sheet?.querySelector(':scope > .cos4-grid');
    if (!grid || grid.dataset.cos5Grouped === '1') return;

    injectCss();
    const type = splitType(root);
    let cards = [...grid.children].filter(el => el.classList.contains('cos4-card'));
    if (!cards.length) return;

    for (const card of [...cards]) {
      if (txt(card) !== 'idea / contenido') continue;
      const value = body(card);
      if (value && cards.some(other => other !== card && body(other) === value)) {
        card.remove();
        cards = cards.filter(x => x !== card);
      }
    }

    const buckets = new Map();
    cards.forEach(card => {
      const key = category(txt(card), type);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(card);
    });

    const stack = document.createElement('div');
    stack.className = 'cos5-sheet-stack';
    for (const key of groupOrder(type)) {
      const items = buckets.get(key);
      if (!items?.length) continue;
      const g = GROUPS[key] || GROUPS.summary;
      const section = document.createElement('section');
      section.className = 'cos5-group';
      section.dataset.group = key;
      section.style.setProperty('--g', g.color);
      section.style.setProperty('--gs', g.soft);
      section.innerHTML = `<div class="cos5-group-head"><div class="cos5-group-icon">${g.icon}</div><div class="cos5-group-title"><small>BLOQUE</small><h3>${g.label}</h3></div></div><div class="cos5-group-grid"></div>`;
      const target = section.querySelector('.cos5-group-grid');
      items.forEach(card => target.appendChild(card));
      stack.appendChild(section);
      buckets.delete(key);
    }

    for (const [key, items] of buckets) {
      if (!items.length) continue;
      const g = GROUPS[key] || GROUPS.summary;
      const section = document.createElement('section');
      section.className = 'cos5-group';
      section.dataset.group = key;
      section.style.setProperty('--g', g.color);
      section.style.setProperty('--gs', g.soft);
      section.innerHTML = `<div class="cos5-group-head"><div class="cos5-group-icon">${g.icon}</div><div class="cos5-group-title"><small>BLOQUE</small><h3>${g.label}</h3></div></div><div class="cos5-group-grid"></div>`;
      items.forEach(card => section.querySelector('.cos5-group-grid').appendChild(card));
      stack.appendChild(section);
    }

    grid.dataset.cos5Grouped = '1';
    grid.replaceWith(stack);
  }

  function scan() {
    const root = document.getElementById('cos4Root');
    if (root) groupSheet(root);
  }

  const observer = new MutationObserver(scan);
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  scan();

  window.CreativeOSSplitSheetGroups = { version: '1.0', scan };
})();