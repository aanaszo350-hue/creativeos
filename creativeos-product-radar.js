(() => {
  'use strict';

  const RADAR_API='https://naiglzmqpgucfbwfbvxt.supabase.co/functions/v1/creativeos-product-radar';
  const INTEL_API='https://naiglzmqpgucfbwfbvxt.supabase.co/functions/v1/creativeos-intelligence?resource=snapshot';
  const WINNER_API='https://naiglzmqpgucfbwfbvxt.supabase.co/functions/v1/creativeos-winner-lab';
  const STATUS=['Pendiente','Research','Preparado','Testing','Prometedor','Pausado','Descartado','Validado'];
  const RESEARCH=['Sin analizar','Research básico','Research hecho','En test','Validado'];
  const NICHE_LABELS={
    running:'Running',
    'tech-fitness':'Tech / Fitness',
    'hiking-outdoor':'Hiking / Outdoor',
    flores:'Flowers',
    general:'General',
    pets:'Pets',
    dogs:'Dogs',
    cats:'Cats',
    rabbits:'Rabbits',
    gifts:'Gifts',
    coloring:'Coloring',
    beauty:'Beauty',
    home:'Home',
    kids:'Kids'
  };

  const S={
    active:false,
    loading:false,
    radar:[],
    products:[],
    winners:[],
    search:'',
    niche:'Todos',
    status:'Todos',
    modal:null
  };

  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const slug=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'product';
  const score=v=>v===null||v===undefined||v===''?null:Number(v);
  const average=r=>{const a=[score(r.user_score),score(r.ai_score)].filter(v=>v!==null&&!Number.isNaN(v));return a.length?a.reduce((x,y)=>x+y,0)/a.length:null;};
  const validHttp=url=>{try{const u=new URL(String(url||''));return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}};
  const validMedia=url=>{const s=String(url||'');if(/^data:video\//i.test(s))return s;return validHttp(s);};
  const fmtScore=v=>v===null||v===undefined||v===''?'—':Number(v).toFixed(1);

  function injectStyles(){
    if(document.getElementById('cprStyles'))return;
    const style=document.createElement('style');style.id='cprStyles';style.textContent=`
      .cpr-host{display:none;padding:28px;max-width:1600px;margin:0 auto}.cpr-host.active{display:block}
      .cpr-hero{position:relative;overflow:hidden;border:1px solid #26304a;border-radius:22px;padding:24px;background:radial-gradient(700px 260px at 88% -20%,rgba(141,98,255,.22),transparent 62%),radial-gradient(540px 260px at 6% 0%,rgba(70,212,255,.12),transparent 64%),linear-gradient(180deg,#101621,#0c1119);display:flex;justify-content:space-between;gap:24px;align-items:flex-end}
      .cpr-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:#86a2ff;margin-bottom:8px}.cpr-hero h1{margin:0;font-size:34px;letter-spacing:-.05em}.cpr-hero p{margin:8px 0 0;color:#8f99ad;max-width:760px;font-size:13px;line-height:1.55}.cpr-hero-actions{display:flex;gap:8px;flex-wrap:wrap}
      .cpr-btn{border:1px solid #2e3850;background:#111620;color:#f4f7fb;border-radius:11px;padding:9px 12px;font-size:12px;font-weight:700;cursor:pointer}.cpr-btn:hover{border-color:#46577c;background:#151c29}.cpr-btn.primary{border-color:transparent;background:linear-gradient(135deg,#4f7cff,#765cff);box-shadow:0 10px 26px rgba(79,124,255,.2)}.cpr-btn.danger{color:#ffadb7;border-color:rgba(255,100,118,.28);background:rgba(255,100,118,.08)}
      .cpr-overview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}.cpr-kpi{border:1px solid #232a39;background:#0d1119;border-radius:15px;padding:14px}.cpr-kpi span{font-size:10px;color:#758198;text-transform:uppercase;letter-spacing:.08em}.cpr-kpi b{display:block;margin-top:5px;font-size:22px;letter-spacing:-.04em}.cpr-kpi small{display:block;color:#69748a;font-size:10px;margin-top:4px}
      .cpr-priority{border:1px solid #28324a;background:linear-gradient(180deg,#0f141e,#0b1018);border-radius:18px;padding:16px;margin-bottom:16px}.cpr-section-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px}.cpr-section-head h2{font-size:15px;margin:0}.cpr-section-head p{font-size:10px;color:#78849a;margin:3px 0 0}.cpr-priority-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.cpr-priority-card{border:1px solid #28344e;background:#111722;border-radius:14px;padding:12px;display:flex;align-items:center;gap:12px}.cpr-rank{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(79,124,255,.25),rgba(141,98,255,.22));font-weight:900;color:#c9d5ff}.cpr-priority-card b{display:block;font-size:12px}.cpr-priority-card span{display:block;font-size:10px;color:#7f8a9f;margin-top:3px}.cpr-priority-score{margin-left:auto;font-weight:900;font-size:17px;color:#a9c0ff}
      .cpr-toolbar{border:1px solid #232a39;background:#0c1119;border-radius:16px;padding:11px;display:flex;gap:9px;align-items:center;flex-wrap:wrap;position:sticky;top:88px;z-index:8;backdrop-filter:blur(14px)}.cpr-search,.cpr-select{border:1px solid #2e3850;background:#0a0f17;color:#e9eef8;border-radius:10px;padding:9px 11px;outline:none;font-size:12px}.cpr-search{min-width:260px;flex:1}.cpr-chip-row{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0 4px}.cpr-chip{border:1px solid #273149;background:#0f141e;color:#9ca8bc;border-radius:999px;padding:7px 10px;font-size:10px;cursor:pointer}.cpr-chip.active{color:#fff;border-color:#5268aa;background:linear-gradient(135deg,rgba(79,124,255,.24),rgba(141,98,255,.18))}
      .cpr-niche-block{margin-top:22px}.cpr-niche-title{display:flex;align-items:center;gap:10px;margin-bottom:10px}.cpr-niche-icon{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:#111927;border:1px solid #2b3650}.cpr-niche-title h2{margin:0;font-size:15px}.cpr-niche-title span{font-size:10px;color:#77839a}.cpr-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
      .cpr-card{border:1px solid #242c3d;background:linear-gradient(180deg,#111720,#0c1118);border-radius:18px;overflow:hidden;box-shadow:0 10px 28px rgba(0,0,0,.16);transition:.16s ease}.cpr-card:hover{transform:translateY(-2px);border-color:#384763}.cpr-media{height:150px;position:relative;background:radial-gradient(circle at 80% 18%,rgba(79,124,255,.22),transparent 36%),linear-gradient(135deg,#142034,#0b1018 62%);overflow:hidden}.cpr-media video{width:100%;height:100%;object-fit:cover}.cpr-media-placeholder{height:100%;display:grid;place-items:center;color:#72809a;font-size:12px}.cpr-media-placeholder strong{display:block;text-align:center;font-size:38px;color:#c6d2ed;opacity:.78}.cpr-play{position:absolute;left:14px;bottom:12px;border:1px solid rgba(255,255,255,.18);background:rgba(5,8,13,.74);backdrop-filter:blur(8px);border-radius:999px;padding:7px 10px;font-size:10px;font-weight:800;color:white;cursor:pointer}.cpr-status{position:absolute;right:12px;top:12px;border-radius:999px;padding:6px 9px;font-size:9px;font-weight:800;border:1px solid #34415d;background:rgba(8,12,18,.78);backdrop-filter:blur(8px)}.cpr-status.Testing,.cpr-status.Prometedor{color:#a6f1c8;border-color:rgba(53,208,127,.32);background:rgba(23,70,49,.62)}.cpr-status.Validado{color:#b9cbff;border-color:rgba(79,124,255,.38);background:rgba(33,52,105,.68)}.cpr-status.Descartado{color:#ffb0ba;border-color:rgba(255,100,118,.32);background:rgba(84,25,35,.62)}.cpr-status.Pausado{color:#f6d18a;border-color:rgba(242,187,75,.28);background:rgba(76,53,13,.6)}
      .cpr-body{padding:15px}.cpr-card-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.cpr-card h3{font-size:16px;letter-spacing:-.03em;margin:0}.cpr-sub{font-size:10px;color:#77839a;margin-top:4px}.cpr-score-badge{min-width:50px;height:50px;border-radius:14px;border:1px solid #30405f;background:#0b111c;display:grid;place-items:center;text-align:center}.cpr-score-badge b{font-size:16px;color:#a9c0ff}.cpr-score-badge small{font-size:8px;color:#67748d}.cpr-score-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:13px}.cpr-mini{border:1px solid #20283a;background:#0a0f16;border-radius:11px;padding:9px}.cpr-mini span{font-size:8px;color:#66728a;text-transform:uppercase;letter-spacing:.08em}.cpr-mini b{display:block;font-size:12px;margin-top:4px}.cpr-maturity{margin-top:13px}.cpr-maturity-head{display:flex;justify-content:space-between;gap:10px;font-size:9px;color:#78849b;margin-bottom:7px}.cpr-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}.cpr-step{height:5px;border-radius:99px;background:#20283a}.cpr-step.on{background:linear-gradient(90deg,#4f7cff,#8d62ff)}.cpr-signal{margin-top:12px;border:1px solid #222b3e;background:#0b1018;border-radius:11px;padding:10px;font-size:10px;line-height:1.45;color:#9da8bb;min-height:48px}.cpr-signal b{color:#d8dfed}.cpr-actions{display:flex;gap:7px;margin-top:12px}.cpr-actions .cpr-btn{padding:7px 9px;font-size:10px}.cpr-actions .grow{flex:1}
      .cpr-empty{border:1px dashed #2c3650;border-radius:16px;padding:28px;text-align:center;color:#758198;background:#0b1017}.cpr-empty b{display:block;color:#d9e0ed;margin-bottom:5px}.cpr-loading{padding:70px;text-align:center;color:#8995aa}
      .cpr-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.64);backdrop-filter:blur(8px);z-index:1000;display:grid;place-items:center;padding:24px}.cpr-modal{width:min(820px,96vw);max-height:92vh;overflow:auto;border:1px solid #303b53;background:#0d121a;border-radius:20px;box-shadow:0 30px 90px rgba(0,0,0,.55)}.cpr-modal-head{padding:18px 20px;border-bottom:1px solid #222b3a;display:flex;justify-content:space-between;gap:15px}.cpr-modal-head h3{margin:0;font-size:17px}.cpr-modal-head p{margin:4px 0 0;color:#7c8799;font-size:10px}.cpr-close{border:0;background:transparent;color:#9ca8bb;font-size:24px;cursor:pointer}.cpr-modal-body{padding:18px 20px}.cpr-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cpr-field{display:grid;gap:6px}.cpr-field.full{grid-column:1/-1}.cpr-field label{font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:#7d899d}.cpr-field input,.cpr-field select,.cpr-field textarea{width:100%;border:1px solid #2c3650;background:#090e15;color:#edf2fb;border-radius:10px;padding:10px 11px;outline:none;font-size:12px}.cpr-field textarea{min-height:84px;resize:vertical}.cpr-modal-foot{padding:14px 20px;border-top:1px solid #222b3a;display:flex;justify-content:space-between;gap:10px}.cpr-foot-right{display:flex;gap:8px}.cpr-toast-host{position:fixed;right:20px;bottom:20px;z-index:1200;display:grid;gap:8px}.cpr-toast{background:#111823;border:1px solid #34405a;border-radius:11px;padding:10px 12px;font-size:11px;box-shadow:0 15px 40px rgba(0,0,0,.35)}
      @media(max-width:1100px){.cpr-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cpr-overview{grid-template-columns:repeat(2,minmax(0,1fr))}.cpr-priority-grid{grid-template-columns:1fr}}
      @media(max-width:720px){.cpr-host{padding:16px}.cpr-hero{align-items:flex-start;flex-direction:column}.cpr-grid,.cpr-overview{grid-template-columns:1fr}.cpr-form{grid-template-columns:1fr}.cpr-field.full{grid-column:auto}.cpr-toolbar{top:74px}.cpr-search{min-width:100%}}
    `;document.head.appendChild(style);
  }

  function ensureNav(){
    const existing=document.getElementById('cprNav');if(existing)return existing;
    const nativeProducts=document.querySelector('[data-route="products"]');if(!nativeProducts)return null;
    const btn=document.createElement('button');btn.id='cprNav';btn.className='nav-btn';btn.dataset.cprRoute='radar';btn.innerHTML='<span class="nav-ico">◉</span><span>Product Radar</span>';
    nativeProducts.insertAdjacentElement('afterend',btn);return btn;
  }
  function ensureHost(){
    let host=document.getElementById('cprHost');if(host)return host;
    const main=document.querySelector('.main');if(!main)return null;
    host=document.createElement('div');host.id='cprHost';host.className='cpr-host';main.appendChild(host);return host;
  }
  function deactivate(){
    if(!S.active)return;S.active=false;
    document.getElementById('cprNav')?.classList.remove('active');
    document.getElementById('cprHost')?.classList.remove('active');
    const ci=document.getElementById('ciHost');if(ci)ci.style.display='';
  }
  function activate(){
    S.active=true;injectStyles();ensureNav();const host=ensureHost();if(!host)return;
    const native=document.querySelector('.main > .content');if(native)native.style.display='none';
    const ci=document.getElementById('ciHost');if(ci){ci.classList.remove('active');ci.style.display='none';}
    document.querySelectorAll('.nav-btn,.ci-nav-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('cprNav')?.classList.add('active');host.classList.add('active');
    const title=document.querySelector('.page-title');if(title)title.textContent='Product Radar';
    const crumb=document.querySelector('.breadcrumb');if(crumb)crumb.textContent='CreativeOS · Research';
    render();load();
  }

  async function fetchJson(url,options){
    const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok||d.error||d.ok===false)throw new Error(d.detail||d.error||`HTTP ${r.status}`);return d.data;
  }
  async function load(){
    if(S.loading)return;S.loading=true;render();
    try{
      const [radar,intel,winner]=await Promise.all([
        fetchJson(RADAR_API),
        fetchJson(INTEL_API),
        fetchJson(WINNER_API).catch(()=>({winnerPlans:[]}))
      ]);
      S.radar=Array.isArray(radar)?radar:[];S.products=intel?.products||[];S.winners=winner?.winnerPlans||[];
    }catch(e){toast(String(e?.message||e));}
    finally{S.loading=false;render();}
  }

  function nativeNiche(p){
    const slugs=Array.isArray(p?.nicheSlugs)?p.nicheSlugs:[];
    if(!slugs.length)return 'General';
    return slugs.map(x=>NICHE_LABELS[x]||String(x).replace(/-/g,' ')).join(' · ');
  }
  function winnerForProduct(id){return S.winners.filter(w=>w.product_id===id&&w.video_url).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null;}
  function mergedItems(){
    const byLinked=new Map(S.radar.filter(r=>r.linked_product_id).map(r=>[r.linked_product_id,r]));
    const out=[];
    for(const p of S.products){
      const saved=byLinked.get(p.id);const w=winnerForProduct(p.id);
      if(saved)out.push({...saved,_activeProduct:p,_synthetic:false,_video:saved.video_url||w?.video_url||null});
      else out.push({id:`active-${p.id}`,linked_product_id:p.id,name:p.name,niche:nativeNiche(p),subniche:p.label||'',status:p.status||'Testing',user_score:null,ai_score:null,research_level:3,video_url:null,supplier_url:null,signal:'Producto activo en CreativeOS. Puntúalo para colocarlo en la prioridad de test.',notes:'',_activeProduct:p,_synthetic:true,_video:w?.video_url||null});
    }
    for(const r of S.radar){if(!r.linked_product_id||!S.products.some(p=>p.id===r.linked_product_id))out.push({...r,_synthetic:false,_video:r.video_url||null});}
    return out;
  }
  function filteredItems(){
    const q=S.search.trim().toLowerCase();return mergedItems().filter(r=>{
      if(S.niche!=='Todos'&&r.niche!==S.niche)return false;
      if(S.status!=='Todos'&&r.status!==S.status)return false;
      if(q&&!`${r.name} ${r.niche} ${r.subniche||''} ${r.signal||''} ${r.notes||''}`.toLowerCase().includes(q))return false;
      return true;
    });
  }

  function media(r){
    const u=validMedia(r._video||r.video_url);if(u&&(/^data:video\//i.test(u)||/\.(mp4|webm|mov)(\?|$)/i.test(u))){return`<video muted playsinline preload="metadata" src="${esc(u)}"></video>${validHttp(r.video_url||r._video)?`<button class="cpr-play" data-cpr-open-video="${esc(validHttp(r.video_url||r._video))}">▶ Ver vídeo</button>`:''}`;}
    if(validHttp(r.video_url||r._video))return`<div class="cpr-media-placeholder"><div><strong>▶</strong>Referencia externa</div></div><button class="cpr-play" data-cpr-open-video="${esc(validHttp(r.video_url||r._video))}">▶ Ver vídeo</button>`;
    return`<div class="cpr-media-placeholder"><div><strong>${esc((r.name||'?').slice(0,1).toUpperCase())}</strong>Sin vídeo de referencia</div></div>`;
  }
  function statusClass(s){return String(s||'Pendiente').replace(/\s+/g,'');}
  function productCard(r){
    const avg=average(r),lvl=Math.max(0,Math.min(4,Number(r.research_level||0)));
    return`<article class="cpr-card"><div class="cpr-media">${media(r)}<span class="cpr-status ${esc(statusClass(r.status))}">${esc(r.status||'Pendiente')}</span></div><div class="cpr-body">
      <div class="cpr-card-top"><div><h3>${esc(r.name)}</h3><div class="cpr-sub">${esc(r.subniche||r.niche||'General')}</div></div><div class="cpr-score-badge"><div><b>${avg===null?'—':avg.toFixed(1)}</b><small>/ 5</small></div></div></div>
      <div class="cpr-score-grid"><div class="cpr-mini"><span>Tu nota</span><b>${fmtScore(r.user_score)}</b></div><div class="cpr-mini"><span>IA</span><b>${fmtScore(r.ai_score)}</b></div><div class="cpr-mini"><span>Potencial</span><b>${avg===null?'Sin puntuar':avg>=4.5?'Muy alto':avg>=4?'Alto':avg>=3?'Medio':'Bajo'}</b></div></div>
      <div class="cpr-maturity"><div class="cpr-maturity-head"><span>Madurez del test</span><b>${esc(RESEARCH[lvl]||RESEARCH[0])}</b></div><div class="cpr-steps">${[0,1,2,3,4].map(i=>`<i class="cpr-step ${i<=lvl?'on':''}"></i>`).join('')}</div></div>
      <div class="cpr-signal"><b>Señal:</b> ${esc(r.signal||'Todavía sin lectura. Añade por qué merece test.')}</div>
      <div class="cpr-actions">${validHttp(r.video_url||r._video)?`<button class="cpr-btn grow" data-cpr-open-video="${esc(validHttp(r.video_url||r._video))}">▶ Ver producto</button>`:''}<button class="cpr-btn ${validHttp(r.video_url||r._video)?'':'grow'}" data-cpr-edit="${esc(r.id)}">${r._synthetic?'Puntuar':'Editar'}</button></div>
    </div></article>`;
  }
  function priority(items){
    const ranked=items.filter(r=>average(r)!==null&&r.status!=='Descartado').sort((a,b)=>average(b)-average(a)).slice(0,3);
    if(!ranked.length)return`<div class="cpr-empty"><b>La prioridad se construye sola.</b>Puntúa productos con tu nota y/o la nota IA y aquí aparecerán ordenados.</div>`;
    return`<div class="cpr-priority-grid">${ranked.map((r,i)=>`<div class="cpr-priority-card"><div class="cpr-rank">#${i+1}</div><div><b>${esc(r.name)}</b><span>${esc(r.niche)} · ${esc(r.status)}</span></div><div class="cpr-priority-score">${average(r).toFixed(1)}</div></div>`).join('')}</div>`;
  }
  function nicheIcon(n){const s=String(n).toLowerCase();if(s.includes('pet')||s.includes('dog')||s.includes('cat')||s.includes('rabbit'))return'🐾';if(s.includes('run')||s.includes('hiking'))return'↗';if(s.includes('gift')||s.includes('color'))return'✦';if(s.includes('tech'))return'⌁';if(s.includes('flower'))return'❀';return'◈';}
  function render(){
    if(!S.active)return;const host=ensureHost();if(!host)return;
    if(S.loading&&!S.products.length&&!S.radar.length){host.innerHTML='<div class="cpr-loading">Cargando Product Radar…</div>';return;}
    const all=mergedItems(),list=filteredItems();
    const niches=['Todos',...Array.from(new Set(all.map(r=>r.niche||'General'))).sort()];
    const grouped=new Map();for(const r of list){const k=r.niche||'General';if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(r);}
    const high=all.filter(r=>(average(r)||0)>=4).length,testing=all.filter(r=>['Testing','Prometedor','Validado'].includes(r.status)).length;
    host.innerHTML=`
      <div class="cpr-hero"><div><div class="cpr-eyebrow">CreativeOS · Product Intelligence</div><h1>Product Radar</h1><p>Guarda productos, puntúalos, compáralos y ordénalos por nicho. La idea es saber en segundos qué merece tu siguiente test y por qué.</p></div><div class="cpr-hero-actions"><button class="cpr-btn" data-cpr-refresh>↻ Actualizar</button><button class="cpr-btn primary" data-cpr-add>+ Añadir producto</button></div></div>
      <div class="cpr-overview"><div class="cpr-kpi"><span>Productos</span><b>${all.length}</b><small>Radar + productos activos</small></div><div class="cpr-kpi"><span>Potencial alto</span><b>${high}</b><small>Nota combinada ≥ 4</small></div><div class="cpr-kpi"><span>En test</span><b>${testing}</b><small>Testing / Prometedor / Validado</small></div><div class="cpr-kpi"><span>Nichos</span><b>${Math.max(0,niches.length-1)}</b><small>Organización automática</small></div></div>
      <section class="cpr-priority"><div class="cpr-section-head"><div><h2>🔥 Prioridad de test</h2><p>Orden automático según tu nota + lectura IA.</p></div></div>${priority(all)}</section>
      <div class="cpr-toolbar"><input class="cpr-search" data-cpr-search placeholder="Buscar producto, nicho o señal…" value="${esc(S.search)}"><select class="cpr-select" data-cpr-status><option>Todos</option>${STATUS.map(s=>`<option ${S.status===s?'selected':''}>${esc(s)}</option>`).join('')}</select></div>
      <div class="cpr-chip-row">${niches.map(n=>`<button class="cpr-chip ${S.niche===n?'active':''}" data-cpr-niche="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      ${list.length?[...grouped.entries()].map(([n,rows])=>`<section class="cpr-niche-block"><div class="cpr-niche-title"><span class="cpr-niche-icon">${nicheIcon(n)}</span><div><h2>${esc(n)}</h2><span>${rows.length} producto${rows.length===1?'':'s'}</span></div></div><div class="cpr-grid">${rows.map(productCard).join('')}</div></section>`).join(''):`<div class="cpr-empty" style="margin-top:18px"><b>No hay productos con estos filtros.</b>Cambia los filtros o añade un producto nuevo.</div>`}
    `;
  }

  function findItem(id){return mergedItems().find(r=>r.id===id)||null;}
  function openModal(item=null){
    const r=item||{id:`radar-${Date.now().toString(36)}`,name:'',niche:S.niche!=='Todos'?S.niche:'General',subniche:'',status:'Pendiente',user_score:null,ai_score:null,research_level:0,video_url:'',supplier_url:'',signal:'',notes:'',_synthetic:false};
    const id=r._synthetic?`radar-${r.linked_product_id}`:r.id;
    const root=document.createElement('div');root.id='cprModalRoot';root.className='cpr-backdrop';root.innerHTML=`<div class="cpr-modal" role="dialog"><div class="cpr-modal-head"><div><h3>${item?'Editar producto':'Añadir producto al radar'}</h3><p>La puntuación puede ser tuya, de la IA o de ambos. No hace falta rellenarlo todo.</p></div><button class="cpr-close" data-cpr-close>×</button></div><div class="cpr-modal-body"><div class="cpr-form">
      <div class="cpr-field"><label>Nombre</label><input id="cprName" value="${esc(r.name||'')}" placeholder="Ej. Interactive Bunny Ball"></div><div class="cpr-field"><label>Nicho</label><input id="cprNiche" value="${esc(r.niche||'General')}" placeholder="Ej. Pets / Rabbits"></div>
      <div class="cpr-field"><label>Subnicho / producto</label><input id="cprSub" value="${esc(r.subniche||'')}" placeholder="Ej. Enrichment toy"></div><div class="cpr-field"><label>Estado</label><select id="cprStatus">${STATUS.map(s=>`<option ${r.status===s?'selected':''}>${esc(s)}</option>`).join('')}</select></div>
      <div class="cpr-field"><label>Tu nota · 0–5</label><input id="cprUserScore" type="number" min="0" max="5" step="0.1" value="${r.user_score??''}" placeholder="4.5"></div><div class="cpr-field"><label>Nota IA · 0–5</label><input id="cprAiScore" type="number" min="0" max="5" step="0.1" value="${r.ai_score??''}" placeholder="4.2"></div>
      <div class="cpr-field"><label>Madurez</label><select id="cprResearch">${RESEARCH.map((x,i)=>`<option value="${i}" ${Number(r.research_level||0)===i?'selected':''}>${esc(x)}</option>`).join('')}</select></div><div class="cpr-field"><label>Vídeo / referencia</label><input id="cprVideo" value="${esc(r.video_url||'')}" placeholder="https://..."></div>
      <div class="cpr-field full"><label>Proveedor / producto</label><input id="cprSupplier" value="${esc(r.supplier_url||'')}" placeholder="https://..."></div>
      <div class="cpr-field full"><label>Señal clave</label><input id="cprSignal" value="${esc(r.signal||'')}" placeholder="Ej. Hook visual fuerte + mercado rabbit USA"></div>
      <div class="cpr-field full"><label>Notas</label><textarea id="cprNotes" placeholder="Riesgos, ángulos, por qué testearlo…">${esc(r.notes||'')}</textarea></div>
    </div></div><div class="cpr-modal-foot"><div>${item&&!r._synthetic?`<button class="cpr-btn danger" data-cpr-delete="${esc(r.id)}">Eliminar</button>`:''}</div><div class="cpr-foot-right"><button class="cpr-btn" data-cpr-close>Cancelar</button><button class="cpr-btn primary" data-cpr-save="${esc(id)}" data-linked="${esc(r.linked_product_id||'')}">Guardar</button></div></div></div>`;
    document.body.appendChild(root);S.modal=root;
  }
  function closeModal(){document.getElementById('cprModalRoot')?.remove();S.modal=null;}
  async function saveModal(id,linked){
    const name=document.getElementById('cprName')?.value.trim();if(!name)throw new Error('Pon un nombre al producto.');
    const num=id=>{const v=document.getElementById(id)?.value;return v===''||v===undefined?null:Number(v);};
    const body={action:'upsert',id,linked_product_id:linked||null,name,niche:document.getElementById('cprNiche')?.value.trim()||'General',subniche:document.getElementById('cprSub')?.value.trim()||null,status:document.getElementById('cprStatus')?.value||'Pendiente',user_score:num('cprUserScore'),ai_score:num('cprAiScore'),research_level:Number(document.getElementById('cprResearch')?.value||0),video_url:document.getElementById('cprVideo')?.value.trim()||null,supplier_url:document.getElementById('cprSupplier')?.value.trim()||null,signal:document.getElementById('cprSignal')?.value.trim()||null,notes:document.getElementById('cprNotes')?.value.trim()||null};
    await fetchJson(RADAR_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});closeModal();await load();toast('Producto guardado en Product Radar');
  }
  async function deleteRow(id){if(!confirm('¿Eliminar este producto del radar?'))return;await fetchJson(RADAR_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id})});closeModal();await load();toast('Producto eliminado del radar');}
  function toast(text){let h=document.querySelector('.cpr-toast-host');if(!h){h=document.createElement('div');h.className='cpr-toast-host';document.body.appendChild(h);}const e=document.createElement('div');e.className='cpr-toast';e.textContent=text;h.appendChild(e);setTimeout(()=>e.remove(),2600);}
  async function guard(fn){try{await fn();}catch(e){toast(String(e?.message||e));}}

  document.addEventListener('click',e=>{
    const radar=e.target.closest?.('[data-cpr-route]');if(radar){e.preventDefault();activate();return;}
    if(S.active&&e.target.closest?.('.nav-btn:not(#cprNav),.ci-nav-btn')){deactivate();return;}
    if(!S.active)return;
    if(e.target.closest?.('[data-cpr-refresh]')){load();return;}
    if(e.target.closest?.('[data-cpr-add]')){openModal();return;}
    const n=e.target.closest?.('[data-cpr-niche]');if(n){S.niche=n.dataset.cprNiche;render();return;}
    const open=e.target.closest?.('[data-cpr-open-video]');if(open){const u=validHttp(open.dataset.cprOpenVideo);if(u)window.open(u,'_blank','noopener,noreferrer');return;}
    const edit=e.target.closest?.('[data-cpr-edit]');if(edit){openModal(findItem(edit.dataset.cprEdit));return;}
    if(e.target.closest?.('[data-cpr-close]')||e.target.classList?.contains('cpr-backdrop')){closeModal();return;}
    const save=e.target.closest?.('[data-cpr-save]');if(save){guard(()=>saveModal(save.dataset.cprSave,save.dataset.linked));return;}
    const del=e.target.closest?.('[data-cpr-delete]');if(del){guard(()=>deleteRow(del.dataset.cprDelete));return;}
  },true);
  document.addEventListener('input',e=>{if(!S.active)return;if(e.target.matches?.('[data-cpr-search]')){S.search=e.target.value;render();const input=document.querySelector('[data-cpr-search]');input?.focus();if(input)input.setSelectionRange(S.search.length,S.search.length);}},true);
  document.addEventListener('change',e=>{if(!S.active)return;if(e.target.matches?.('[data-cpr-status]')){S.status=e.target.value;render();}},true);

  const mo=new MutationObserver(()=>{ensureNav();ensureHost();});
  document.addEventListener('DOMContentLoaded',()=>{injectStyles();ensureNav();ensureHost();mo.observe(document.body,{childList:true,subtree:true});},{once:true});
  if(document.body){injectStyles();ensureNav();ensureHost();mo.observe(document.body,{childList:true,subtree:true});}

  window.CreativeOSProductRadar={activate,load,version:'1.0'};
})();