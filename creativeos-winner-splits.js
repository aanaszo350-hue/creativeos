(() => {
  'use strict';

  const API='https://naiglzmqpgucfbwfbvxt.supabase.co/functions/v1/creativeos-winner-lab';
  const VARS=[
    ['concept','Concepto / Hook visual','◈'],
    ['text_hook','Texto','T'],
    ['sales_angle','Ángulo de venta','↗'],
    ['background','Fondo','▧'],
    ['audio','Música / Audio','♪'],
    ['avatar','Avatar','◎']
  ];
  const STATUS=[
    ['waiting_prepare','Por preparar'],
    ['recorded','Grabado'],
    ['published','Publicado'],
    ['waiting_data','Esperando data'],
    ['data_ready','Data lista']
  ];

  const S={
    active:false,
    productId:sessionStorage.getItem('creativeos_winner_product')||'',
    winnerId:sessionStorage.getItem('creativeos_winner_id')||'',
    trackId:sessionStorage.getItem('creativeos_winner_track')||'',
    mode:sessionStorage.getItem('creativeos_winner_mode')||'panel',
    data:{winnerPlans:[],winnerTracks:[],winnerAttempts:[]},
    loading:false,
    modal:null
  };

  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=n=>n===null||n===undefined||n===''?'—':Number(n).toLocaleString('es-ES');
  const uid=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const core=()=>window.CreativeOSIntelligence?.getSnapshot?.()||{};
  const products=()=>core().products||[];
  const product=id=>products().find(p=>p.id===id)||null;
  const varLabel=k=>VARS.find(v=>v[0]===k)?.[1]||k;
  const varIcon=k=>VARS.find(v=>v[0]===k)?.[2]||'•';
  const statusLabel=k=>k==='discarded'?'Descartado':STATUS.find(x=>x[0]===k)?.[1]||k||'Por preparar';
  const plans=()=>S.data.winnerPlans.filter(x=>x.product_id===S.productId);
  const winner=id=>S.data.winnerPlans.find(x=>x.id===id)||null;
  const tracks=wid=>S.data.winnerTracks.filter(x=>x.winner_id===wid).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const track=id=>S.data.winnerTracks.find(x=>x.id===id)||null;
  const attempts=tid=>S.data.winnerAttempts.filter(x=>x.track_id===tid).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const attempt=id=>S.data.winnerAttempts.find(x=>x.id===id)||null;
  const bestAttempt=t=>attempts(t.id).find(a=>a.id===t.best_attempt_id||a.is_best)||null;
  const today=()=>new Date().toISOString().slice(0,10);

  async function api(body=null){
    const r=await fetch(API,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.error||d.ok===false)throw new Error(d.detail||d.error||`HTTP ${r.status}`);
    return d.data;
  }
  async function load(){
    if(S.loading)return;S.loading=true;
    try{S.data=await api();}
    finally{S.loading=false;}
    normalizeSelection();render();
    window.dispatchEvent(new CustomEvent('creativeos:winner-lab-updated',{detail:S.data}));
  }
  function normalizeSelection(){
    const ps=products();
    if(!ps.some(p=>p.id===S.productId))S.productId=ps[0]?.id||'';
    const list=plans();
    if(!list.some(w=>w.id===S.winnerId))S.winnerId=list[0]?.id||'';
    const ts=tracks(S.winnerId);
    if(!ts.some(t=>t.id===S.trackId))S.trackId=ts[0]?.id||'';
    sessionStorage.setItem('creativeos_winner_product',S.productId);
    if(S.winnerId)sessionStorage.setItem('creativeos_winner_id',S.winnerId);else sessionStorage.removeItem('creativeos_winner_id');
    if(S.trackId)sessionStorage.setItem('creativeos_winner_track',S.trackId);else sessionStorage.removeItem('creativeos_winner_track');
  }

  function ensureNav(){
    const matrix=document.querySelector('[data-ci-route="avatars"]');if(!matrix)return;
    let btn=document.getElementById('ciwSplitNav');
    if(!btn){
      btn=document.createElement('button');btn.id='ciwSplitNav';btn.className='ci-nav-btn route-winner-splits';btn.dataset.ciwRoute='winner-splits';
      btn.innerHTML='<span class="ci-nav-ico">⑂</span><span>Split Tests</span>';
      matrix.insertAdjacentElement('afterend',btn);
    }
  }
  function activate(){
    S.active=true;ensureNav();
    const native=document.querySelector('.main > .content');if(native)native.style.display='none';
    const host=document.getElementById('ciHost');if(host){host.classList.add('active');host.dataset.ciView='winner-splits';}
    document.querySelectorAll('.ci-nav-btn').forEach(b=>b.classList.toggle('active',b.id==='ciwSplitNav'));
    const title=document.querySelector('.page-title');if(title)title.textContent='Split Tests';
    const crumb=document.querySelector('.breadcrumb');if(crumb)crumb.textContent='CreativeOS Intelligence';
    normalizeSelection();render();load().catch(e=>toast(String(e.message||e),'error'));
  }
  function deactivate(){S.active=false;document.getElementById('ciwSplitNav')?.classList.remove('active');}

  function toast(text,kind='ok'){
    let h=document.getElementById('ciwToastHost');if(!h){h=document.createElement('div');h.id='ciwToastHost';h.className='ciw-toast-host';document.body.appendChild(h);}
    const el=document.createElement('div');el.className=`ciw-toast ${kind}`;el.textContent=text;h.appendChild(el);setTimeout(()=>el.remove(),2600);
  }
  async function guard(fn){try{await fn();}catch(e){console.error(e);toast(String(e?.message||e),'error');}}

  function preview(url,type,name='Media'){
    if(!url)return'<div class="ciw-media-empty"><span>＋</span><small>Sin media</small></div>';
    if(String(type||'').startsWith('image/'))return`<img src="${esc(url)}" alt="${esc(name)}" loading="lazy">`;
    if(String(type||'').startsWith('audio/'))return`<div class="ciw-audio-preview">♪<audio controls preload="metadata" src="${esc(url)}"></audio></div>`;
    return`<video controls preload="metadata" src="${esc(url)}"></video>`;
  }

  function productTabs(){return`<div class="ciw-product-tabs">${products().map(p=>`<button class="${p.id===S.productId?'active':''}" data-ciw-product="${esc(p.id)}"><span>${esc(p.name)}</span><small>Día ${fmt(p.day)}</small></button>`).join('')}</div>`;}
  function modeTabs(){return`<div class="ciw-mode-tabs"><button class="${S.mode==='panel'?'active':''}" data-ciw-mode="panel">Panel</button><button class="${S.mode==='tree'?'active':''}" data-ciw-mode="tree">Árbol</button><button class="${S.mode==='history'?'active':''}" data-ciw-mode="history">Cronología</button></div>`;}

  function render(){
    if(!S.active)return;const host=document.getElementById('ciHost');if(!host)return;
    host.dataset.ciView='winner-splits';
    const p=product(S.productId);
    if(S.loading&&!S.data.winnerPlans.length){host.innerHTML='<div class="ci-loading">Cargando Split Tests…</div>';return;}
    const body=S.mode==='tree'?treeView():S.mode==='history'?historyView():panelView();
    host.innerHTML=`<div class="ciw-hero"><div><div class="ci-eyebrow">CreativeOS · Winner Lab</div><h1>Split Tests</h1><p>Un vídeo ganador abre seis direcciones de optimización: concepto, texto, ángulo, fondo, música y avatar. Cada dirección puede tener todos los intentos que necesites.</p></div><div class="ci-actions"><button class="ci-btn primary" data-ciw-new-winner>+ Vídeo winner</button><button class="ci-btn" data-ciw-refresh>↻ Actualizar</button></div></div>${productTabs()}<div class="ciw-context"><span>Producto</span><b>${esc(p?.name||'—')}</b><i></i><span>${plans().length} winners</span><i></i><span>${plans().filter(x=>x.status==='active').length} activos</span>${modeTabs()}</div>${body}`;
  }

  function panelView(){
    const list=plans();
    if(!list.length)return`<section class="ciw-empty-state"><div class="ciw-empty-icon">★</div><h2>Añade tu primer vídeo winner</h2><p>Sube el vídeo o guarda su referencia. CreativeOS creará automáticamente los seis bloques de split testing.</p><button class="ci-btn primary" data-ciw-new-winner>+ Crear winner</button></section>`;
    const w=winner(S.winnerId)||list[0];
    return`${winnerRail(list,w)}${winnerDetail(w)}`;
  }
  function winnerRail(list,current){return`<div class="ciw-winner-rail">${list.map((w,i)=>`<button class="${w.id===current.id?'active':''}" data-ciw-winner="${esc(w.id)}"><span>Winner ${list.length-i}</span><b>${esc(w.name)}</b><small>${fmt(w.views)} views · ${w.winner_date||'Sin fecha'}</small></button>`).join('')}</div>`;}
  function winnerDetail(w){
    const ts=tracks(w.id),selected=track(S.trackId)||ts[0]||null;
    return`<section class="ciw-winner-card">
      <div class="ciw-winner-head">
        <div class="ciw-winner-media">${preview(w.video_url,w.video_name?.match(/\.(jpg|jpeg|png|webp)$/i)?'image/*':'video/*',w.video_name)}</div>
        <div class="ciw-winner-info"><span class="ciw-kicker">Vídeo winner</span><h2>${esc(w.name)}</h2><div class="ciw-winner-metrics"><span><b>${fmt(w.views)}</b> views</span><span><b>${fmt(w.sales)}</b> ventas</span><span><b>${esc(w.winner_date||'—')}</b> fecha</span></div><p>${esc(w.notes||'Sin notas todavía.')}</p><div class="ciw-inline-actions"><button data-ciw-edit-winner="${esc(w.id)}">Editar winner</button><button data-ciw-next-winner="${esc(w.id)}">Crear Winner V2</button><button class="danger" data-ciw-delete-winner="${esc(w.id)}">Eliminar</button></div></div>
      </div>
      <div class="ciw-section-head"><div><span>Plan de optimización</span><h2>Seis splits del mismo vídeo</h2><p>Cada bloque guarda sus propios intentos, estado, media, data y mejor variante.</p></div></div>
      <div class="ciw-track-grid">${ts.map(trackCard).join('')}</div>
      ${selected?trackDetail(selected):''}
    </section>`;
  }
  function trackCard(t){
    const as=attempts(t.id),best=bestAttempt(t),current=as.filter(a=>!a.is_discarded).sort((a,b)=>Number(b.views||0)-Number(a.views||0))[0]||null;
    return`<button class="ciw-track-card ${t.id===S.trackId?'active':''}" data-ciw-track="${esc(t.id)}" data-variable="${esc(t.variable)}"><div class="ciw-track-top"><span class="ciw-track-icon">${esc(varIcon(t.variable))}</span><div><small>Split test</small><h3>${esc(varLabel(t.variable))}</h3></div><b>${as.length}</b></div><div class="ciw-track-body">${best?`<div class="ciw-best-mini"><span>★ Mejor</span><b>${esc(best.title)}</b><small>${fmt(best.views)} views</small></div>`:current?`<div class="ciw-best-mini neutral"><span>Mejor data actual</span><b>${esc(current.title)}</b><small>${fmt(current.views)} views</small></div>`:'<div class="ciw-no-attempt">Sin intentos todavía</div>'}</div><div class="ciw-track-foot"><span>${best?'Mejor definido':as.length?'En progreso':'Por empezar'}</span><strong>Abrir →</strong></div></button>`;
  }

  function trackDetail(t){
    const as=attempts(t.id),best=bestAttempt(t);
    return`<div class="ciw-track-detail" id="ciwTrackDetail"><div class="ciw-track-detail-head"><div><span>${esc(varIcon(t.variable))} ${esc(varLabel(t.variable))}</span><h2>Intentos de este split</h2><p>Añade tantas versiones como necesites. Marca con ★ la que quieras conservar como mejor referencia.</p></div><button class="ci-btn primary" data-ciw-new-attempt="${esc(t.id)}">+ Nuevo intento</button></div><div class="ciw-attempt-grid">${as.map(a=>attemptCard(t,a)).join('')||`<div class="ciw-empty-track"><b>No has probado nada aquí todavía.</b><span>Crea el primer intento de ${esc(varLabel(t.variable).toLowerCase())}.</span><button data-ciw-new-attempt="${esc(t.id)}">+ Añadir intento</button></div>`}</div>${best?`<div class="ciw-best-strip"><span>★ Mejor ${esc(varLabel(t.variable))}</span><b>${esc(best.title)}</b><strong>${fmt(best.views)} views</strong><button data-ciw-new-attempt="${esc(t.id)}">Seguir testeando</button></div>`:''}</div>`;
  }

  function attemptSummary(t,a){
    const c=a.content||{};
    if(t.variable==='avatar')return c.avatar_description||c.avatar_name||'';
    if(t.variable==='text_hook')return c.text_sequence||c.hook_text||'';
    if(t.variable==='concept')return c.concept_description||c.visual_hook||'';
    if(t.variable==='sales_angle')return c.angle_description||c.promise||'';
    if(t.variable==='background')return c.background_description||'';
    if(t.variable==='audio')return c.audio_name||c.audio_description||'';
    return'';
  }
  function attemptCard(t,a){
    return`<article class="ciw-attempt ${a.is_best?'best':''} ${a.is_discarded?'discarded':''}"><div class="ciw-attempt-media">${preview(a.media_url,a.media_type,a.media_name)}</div><div class="ciw-attempt-content"><div class="ciw-attempt-top"><span class="ciw-status ${esc(a.production_status)}">${esc(statusLabel(a.production_status))}</span>${a.is_best?'<span class="ciw-star">★ Mejor</span>':''}${a.is_discarded?'<span class="ciw-discarded">Descartado</span>':''}</div><h3>${esc(a.title)}</h3><p>${esc(attemptSummary(t,a)||'Sin detalle añadido.')}</p><div class="ciw-attempt-metrics"><span><b>${fmt(a.views)}</b> views</span><span><b>${fmt(a.sales)}</b> ventas</span><span><b>${fmt(a.likes)}</b> likes</span></div><div class="ciw-attempt-actions"><button data-ciw-edit-attempt="${esc(a.id)}">Editar</button><button data-ciw-data-attempt="${esc(a.id)}">Data</button>${!a.is_best&&!a.is_discarded?`<button class="best" data-ciw-best-attempt="${esc(a.id)}" data-track="${esc(t.id)}">☆ Mejor</button>`:''}${!a.is_discarded?`<button class="danger" data-ciw-discard-attempt="${esc(a.id)}">Descartar</button>`:`<button data-ciw-restore-attempt="${esc(a.id)}">Restaurar</button>`}<button class="danger ghost" data-ciw-delete-attempt="${esc(a.id)}">Eliminar</button></div></div></article>`;
  }

  function treeView(){
    const list=plans().slice().sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
    if(!list.length)return`<section class="ciw-empty-state"><h2>El árbol aparecerá con tu primer winner</h2><button class="ci-btn primary" data-ciw-new-winner>+ Vídeo winner</button></section>`;
    const children=new Map();for(const w of list){const key=w.parent_winner_id||'root';if(!children.has(key))children.set(key,[]);children.get(key).push(w);}
    const renderWinner=w=>`<li><div class="ciw-tree-winner"><div class="ciw-tree-winner-head"><span>★ Winner</span><b>${esc(w.name)}</b><small>${fmt(w.views)} views</small></div><div class="ciw-tree-tracks">${tracks(w.id).map(t=>{const as=attempts(t.id),best=bestAttempt(t);return`<div class="ciw-tree-track" data-variable="${esc(t.variable)}"><span>${esc(varLabel(t.variable))}</span>${as.length?`<div>${as.map(a=>`<small class="${a.is_best?'best':''} ${a.is_discarded?'discarded':''}">${a.is_best?'★ ':''}${esc(a.title)} · ${fmt(a.views)}</small>`).join('')}</div>`:'<small>Sin intentos</small>'}${best?`<b>Mejor: ${esc(best.title)}</b>`:''}</div>`;}).join('')}</div></div>${(children.get(w.id)||[]).length?`<ul>${children.get(w.id).map(renderWinner).join('')}</ul>`:''}</li>`;
    const roots=children.get('root')||list.filter(w=>!w.parent_winner_id);
    return`<section class="ciw-tree-section"><div class="ciw-section-head"><div><span>Evolución</span><h2>Árbol de winners</h2><p>Cada winner conserva sus seis ramas y puede convertirse en la base del siguiente vídeo ganador.</p></div></div><div class="ciw-tree"><ul>${roots.map(renderWinner).join('')}</ul></div></section>`;
  }

  function historyView(){
    const all=[];
    for(const w of plans())for(const t of tracks(w.id))for(const a of attempts(t.id))all.push({w,t,a});
    all.sort((x,y)=>String(y.a.created_at).localeCompare(String(x.a.created_at)));
    return`<section class="ciw-history-section"><div class="ciw-section-head"><div><span>Historial</span><h2>Cronología</h2><p>Qué has probado, cuándo y con qué resultado.</p></div></div><div class="ciw-history-list">${all.map(({w,t,a})=>`<button class="ciw-history-row" data-ciw-jump="${esc(w.id)}" data-track="${esc(t.id)}"><span class="ciw-history-date">${esc(String(a.created_at||'').slice(0,10)||'—')}</span><div><small>${esc(w.name)} · ${esc(varLabel(t.variable))}</small><b>${a.is_best?'★ ':''}${esc(a.title)}</b><p>${esc(attemptSummary(t,a)||a.notes||'')}</p></div><strong>${fmt(a.views)} views</strong><em class="${esc(a.production_status)}">${esc(statusLabel(a.production_status))}</em></button>`).join('')||'<div class="ciw-empty-track">Todavía no hay intentos registrados.</div>'}</div></section>`;
  }

  function modal(html){
    closeModal();const root=document.createElement('div');root.id='ciwModalRoot';root.className='ciw-modal-root';root.innerHTML=`<div class="ciw-backdrop"></div><div class="ciw-modal">${html}</div>`;document.body.appendChild(root);S.modal=root;
  }
  function closeModal(){document.getElementById('ciwModalRoot')?.remove();S.modal=null;}
  const input=(id,label,value='',type='text',placeholder='')=>`<label>${esc(label)}<input id="${id}" type="${type}" value="${esc(value??'')}" placeholder="${esc(placeholder)}"></label>`;
  const textarea=(id,label,value='',placeholder='')=>`<label>${esc(label)}<textarea id="${id}" placeholder="${esc(placeholder)}">${esc(value??'')}</textarea></label>`;

  function openWinnerModal(existing=null,parent=null){
    const w=existing||{};const isEdit=!!existing;
    modal(`<div class="ciw-modal-head"><div><span>${isEdit?'Editar':'Nuevo'} vídeo winner</span><h2>${isEdit?'Actualizar winner':'Crear plan de split testing'}</h2><p>Con esto se crean automáticamente los seis bloques del vídeo.</p></div><button data-ciw-close>×</button></div><div class="ciw-form-grid">${input('ciwWinnerName','Nombre del vídeo',w.name||parent?`${parent?.name||''}${parent?' · V2':''}`:'','text','Ej. Basketball bag winner')}${input('ciwWinnerDate','Fecha',w.winner_date||today(),'date')}${input('ciwWinnerViews','Views',w.views??'','number','Ej. 500000')}${input('ciwWinnerSales','Ventas',w.sales??'','number','Ej. 7')}<label class="wide">Vídeo / media<input id="ciwWinnerFile" type="file" accept="video/*,image/*"></label>${w.video_url?`<div class="ciw-existing-media wide">${preview(w.video_url,w.video_name?.match(/\.(jpg|png|jpeg|webp)$/i)?'image/*':'video/*',w.video_name)}<span>Media actual</span></div>`:''}${textarea('ciwWinnerNotes','Notas',w.notes||'','Qué funcionó, contexto, hipótesis...')}</div><div class="ciw-modal-actions"><button data-ciw-close>Cancelar</button><button class="primary" data-ciw-save-winner="${esc(w.id||'')}" data-parent="${esc(parent?.id||w.parent_winner_id||'')}">${isEdit?'Guardar':'Crear winner + 6 splits'}</button></div>`);
  }

  function variableFields(variable,c={}){
    if(variable==='avatar')return`${input('ciwAttemptTitle','Nombre del intento',c.avatar_name||'','text','Ej. Jugador negro atlético')}${textarea('ciwAttemptMain','Descripción del avatar',c.avatar_description||'','Edad, estilo, energía, ropa, físico...')}`;
    if(variable==='text_hook')return`${input('ciwAttemptTitle','Nombre del intento',c.title||'','text','Ej. Texto NEEDS')}${textarea('ciwAttemptMain','Secuencia de texto',c.text_sequence||c.hook_text||'','Escribe el hook y el resto de textos en orden')}`;
    if(variable==='concept')return`${input('ciwAttemptTitle','Nombre del concepto',c.title||'','text','Ej. Producto dentro de la bolsa')}${textarea('ciwAttemptMain','Concepto / hook visual',c.concept_description||c.visual_hook||'','Qué ocurre visualmente y cómo empieza el vídeo')}`;
    if(variable==='sales_angle')return`${input('ciwAttemptTitle','Nombre del ángulo',c.title||'','text','Ej. Protección en entrenamiento')}${textarea('ciwAttemptMain','Promesa / motivación',c.angle_description||c.promise||'','Qué problema, deseo o motivación estás vendiendo')}`;
    if(variable==='background')return`${input('ciwAttemptTitle','Nombre del fondo',c.title||'','text','Ej. Pista exterior')}${textarea('ciwAttemptMain','Descripción del fondo',c.background_description||'','Lugar, luz, ambiente, contexto...')}`;
    return`${input('ciwAttemptTitle','Nombre del audio',c.audio_name||'','text','Ej. Audio tendencia X')}${textarea('ciwAttemptMain','Música / audio',c.audio_description||'','Nombre, momento del beat, SFX o referencia')}`;
  }
  function contentFromForm(variable,title,main){
    if(variable==='avatar')return{avatar_name:title,avatar_description:main};
    if(variable==='text_hook')return{title,text_sequence:main};
    if(variable==='concept')return{title,concept_description:main,visual_hook:main};
    if(variable==='sales_angle')return{title,angle_description:main,promise:main};
    if(variable==='background')return{title,background_description:main};
    return{audio_name:title,audio_description:main};
  }

  function openAttemptModal(t,a=null){
    const c=a?.content||{},isEdit=!!a;
    modal(`<div class="ciw-modal-head"><div><span>${esc(varLabel(t.variable))}</span><h2>${isEdit?'Editar intento':'Nuevo intento'}</h2><p>Este editor cambia según el tipo de split.</p></div><button data-ciw-close>×</button></div><div class="ciw-form-grid">${variableFields(t.variable,c)}<label>Estado<select id="ciwAttemptStatus">${STATUS.map(([k,l])=>`<option value="${k}" ${a?.production_status===k?'selected':''}>${esc(l)}</option>`).join('')}</select></label><label class="wide">Imagen / vídeo / audio<input id="ciwAttemptFile" type="file" accept="image/*,video/*,audio/*"></label>${a?.media_url?`<div class="ciw-existing-media wide">${preview(a.media_url,a.media_type,a.media_name)}<span>Media actual</span></div>`:''}${textarea('ciwAttemptNotes','Nota',a?.notes||'','Qué cambiaste, qué esperas, contexto...')}</div><div class="ciw-modal-actions"><button data-ciw-close>Cancelar</button><button class="primary" data-ciw-save-attempt="${esc(a?.id||'')}" data-track="${esc(t.id)}">Guardar intento</button></div>`);
  }
  function openDataModal(a){
    modal(`<div class="ciw-modal-head"><div><span>Rendimiento</span><h2>${esc(a.title)}</h2><p>Añade la data cuando el vídeo haya tenido tiempo suficiente para distribuirse.</p></div><button data-ciw-close>×</button></div><div class="ciw-form-grid">${input('ciwDataViews','Views',a.views??'','number')}${input('ciwDataSales','Ventas',a.sales??'','number')}${input('ciwDataLikes','Likes',a.likes??'','number')}${input('ciwDataComments','Comentarios',a.comments??'','number')}${input('ciwDataDate','Fecha de métrica',a.metric_date||today(),'date')}${textarea('ciwDataNotes','Nota',a.notes||'','Lectura rápida del resultado...')}</div><div class="ciw-modal-actions"><button data-ciw-close>Cancelar</button><button class="primary" data-ciw-save-data="${esc(a.id)}">Guardar data</button></div>`);
  }

  async function uploadSelected(file,kind,id){
    if(!file)return null;if(!window.CreativeOSMedia?.upload)throw new Error('El uploader todavía no está disponible.');
    toast('Subiendo media…');return window.CreativeOSMedia.upload(file,{kind,id,productId:S.productId});
  }
  async function saveWinner(id,parentId=''){
    const name=document.getElementById('ciwWinnerName')?.value.trim();if(!name)throw new Error('Pon un nombre al vídeo winner.');
    const existing=id?winner(id):null;const file=document.getElementById('ciwWinnerFile')?.files?.[0]||null;const media=file?await uploadSelected(file,'winner-video',id||uid('winner')):null;
    const row={id:id||uid('winner'),product_id:S.productId,name,status:'active',source_kind:parentId?'evolved_winner':'manual',parent_winner_id:parentId||existing?.parent_winner_id||null,parent_attempt_id:existing?.parent_attempt_id||null,video_url:media?.url||existing?.video_url||null,video_storage_path:media?.storagePath||existing?.video_storage_path||null,video_name:media?.name||existing?.video_name||null,views:num('ciwWinnerViews'),sales:num('ciwWinnerSales'),winner_date:document.getElementById('ciwWinnerDate')?.value||today(),notes:document.getElementById('ciwWinnerNotes')?.value.trim()||null,baseline_dna:existing?.baseline_dna||baselineFromBest(parentId)};
    if(existing)await api({action:'upsert_winner_plan',...row});else await api({action:'create_winner_plan',...row});
    closeModal();S.winnerId=row.id;await load();toast(existing?'Winner actualizado':'Winner creado con 6 splits');
  }
  function baselineFromBest(parentId){
    if(!parentId)return{};const out={};for(const t of tracks(parentId)){const b=bestAttempt(t);if(b)out[t.variable]={title:b.title,content:b.content||{},views:b.views,media_url:b.media_url||null};}return out;
  }
  const num=id=>{const v=document.getElementById(id)?.value;return v===''||v===undefined?null:Number(v)};

  async function saveAttempt(id,trackId){
    const t=track(trackId);if(!t)throw new Error('Split no encontrado.');const old=id?attempt(id):null;
    const title=document.getElementById('ciwAttemptTitle')?.value.trim();if(!title)throw new Error('Pon un nombre al intento.');
    const main=document.getElementById('ciwAttemptMain')?.value.trim()||'';const file=document.getElementById('ciwAttemptFile')?.files?.[0]||null;const media=file?await uploadSelected(file,`split-${t.variable}`,id||uid('attempt')):null;
    const list=attempts(trackId);const row={id:id||uid('attempt'),track_id:trackId,product_id:S.productId,title,production_status:document.getElementById('ciwAttemptStatus')?.value||'waiting_prepare',content:contentFromForm(t.variable,title,main),media_url:media?.url||old?.media_url||null,media_storage_path:media?.storagePath||old?.media_storage_path||null,media_name:media?.name||old?.media_name||null,media_type:media?.type||old?.media_type||null,views:old?.views??null,likes:old?.likes??null,comments:old?.comments??null,sales:old?.sales??null,revenue:old?.revenue??null,posted_at:old?.posted_at||null,metric_date:old?.metric_date||null,is_best:old?.is_best||false,is_discarded:old?.is_discarded||false,notes:document.getElementById('ciwAttemptNotes')?.value.trim()||null,sort_order:old?.sort_order??list.length};
    await api({action:'upsert_attempt',...row});
    await api({action:'upsert_track',...t,status:'active'});
    closeModal();await load();S.trackId=trackId;render();toast(id?'Intento actualizado':'Intento añadido');
  }
  async function saveData(id){
    const a=attempt(id);if(!a)throw new Error('Intento no encontrado.');
    await api({action:'upsert_attempt',...a,views:num('ciwDataViews'),sales:num('ciwDataSales'),likes:num('ciwDataLikes'),comments:num('ciwDataComments'),metric_date:document.getElementById('ciwDataDate')?.value||today(),production_status:'data_ready',notes:document.getElementById('ciwDataNotes')?.value.trim()||a.notes||null});
    closeModal();await load();toast('Data guardada');
  }
  async function setBest(id,trackId){await api({action:'set_best_attempt',attempt_id:id,track_id:trackId});await load();toast('Marcado como mejor');}
  async function discard(id,val=true){const a=attempt(id);await api({action:'discard_attempt',id,is_discarded:val,production_status:val?'discarded':(a?.production_status==='discarded'?'waiting_prepare':a?.production_status)});await load();toast(val?'Intento descartado':'Intento restaurado');}
  async function deleteAttempt(id){if(!confirm('¿Eliminar este intento?'))return;await api({action:'delete_attempt',id});await load();toast('Intento eliminado');}
  async function deleteWinner(id){if(!confirm('¿Eliminar este winner y todos sus splits e intentos?'))return;await api({action:'delete_winner_plan',id});S.winnerId='';S.trackId='';await load();toast('Winner eliminado');}

  function openTesting(pid,workflowId=null){
    deactivate();sessionStorage.setItem('creativeos_ci_product',pid);if(workflowId)sessionStorage.setItem('creativeos_ci_workflow',workflowId);
    window.CreativeOSIntelligence?.activate?.('testing');
    setTimeout(()=>{document.querySelector(`[data-ci-test-product="${CSS.escape(pid)}"]`)?.click();if(workflowId)setTimeout(()=>document.querySelector(`[data-ci-workflow="${CSS.escape(workflowId)}"]`)?.click(),180);},120);
  }

  window.addEventListener('click',e=>{
    const split=e.target.closest?.('#ciwSplitNav');if(split){e.preventDefault();e.stopImmediatePropagation();activate();return;}
    if(S.active&&e.target.closest?.('[data-ci-route]')){deactivate();return;}
    if(!S.active)return;
    const productBtn=e.target.closest?.('[data-ciw-product]');if(productBtn){S.productId=productBtn.dataset.ciwProduct;S.winnerId='';S.trackId='';normalizeSelection();render();return;}
    const winnerBtn=e.target.closest?.('[data-ciw-winner]');if(winnerBtn){S.winnerId=winnerBtn.dataset.ciwWinner;S.trackId=tracks(S.winnerId)[0]?.id||'';normalizeSelection();render();return;}
    const trackBtn=e.target.closest?.('[data-ciw-track]');if(trackBtn){S.trackId=trackBtn.dataset.ciwTrack;sessionStorage.setItem('creativeos_winner_track',S.trackId);render();setTimeout(()=>document.getElementById('ciwTrackDetail')?.scrollIntoView({behavior:'smooth',block:'start'}),40);return;}
    const mode=e.target.closest?.('[data-ciw-mode]');if(mode){S.mode=mode.dataset.ciwMode;sessionStorage.setItem('creativeos_winner_mode',S.mode);render();return;}
    if(e.target.closest?.('[data-ciw-refresh]')){guard(load);return;}
    if(e.target.closest?.('[data-ciw-new-winner]')){openWinnerModal();return;}
    const ew=e.target.closest?.('[data-ciw-edit-winner]');if(ew){openWinnerModal(winner(ew.dataset.ciwEditWinner));return;}
    const nw=e.target.closest?.('[data-ciw-next-winner]');if(nw){openWinnerModal(null,winner(nw.dataset.ciwNextWinner));return;}
    const dw=e.target.closest?.('[data-ciw-delete-winner]');if(dw){guard(()=>deleteWinner(dw.dataset.ciwDeleteWinner));return;}
    const na=e.target.closest?.('[data-ciw-new-attempt]');if(na){openAttemptModal(track(na.dataset.ciwNewAttempt));return;}
    const ea=e.target.closest?.('[data-ciw-edit-attempt]');if(ea){const a=attempt(ea.dataset.ciwEditAttempt);openAttemptModal(track(a.track_id),a);return;}
    const da=e.target.closest?.('[data-ciw-data-attempt]');if(da){openDataModal(attempt(da.dataset.ciwDataAttempt));return;}
    const ba=e.target.closest?.('[data-ciw-best-attempt]');if(ba){guard(()=>setBest(ba.dataset.ciwBestAttempt,ba.dataset.track));return;}
    const disc=e.target.closest?.('[data-ciw-discard-attempt]');if(disc){guard(()=>discard(disc.dataset.ciwDiscardAttempt,true));return;}
    const restore=e.target.closest?.('[data-ciw-restore-attempt]');if(restore){guard(()=>discard(restore.dataset.ciwRestoreAttempt,false));return;}
    const dela=e.target.closest?.('[data-ciw-delete-attempt]');if(dela){guard(()=>deleteAttempt(dela.dataset.ciwDeleteAttempt));return;}
    const jump=e.target.closest?.('[data-ciw-jump]');if(jump){S.winnerId=jump.dataset.ciwJump;S.trackId=jump.dataset.track;S.mode='panel';render();return;}
    if(e.target.closest?.('[data-ciw-close]')||e.target.classList?.contains('ciw-backdrop')){closeModal();return;}
    const sw=e.target.closest?.('[data-ciw-save-winner]');if(sw){guard(()=>saveWinner(sw.dataset.ciwSaveWinner,sw.dataset.parent));return;}
    const sa=e.target.closest?.('[data-ciw-save-attempt]');if(sa){guard(()=>saveAttempt(sa.dataset.ciwSaveAttempt,sa.dataset.track));return;}
    const sd=e.target.closest?.('[data-ciw-save-data]');if(sd){guard(()=>saveData(sd.dataset.ciwSaveData));return;}
  },true);

  document.addEventListener('creativeos:intelligence-render',()=>{ensureNav();if(S.active)render();});
  document.addEventListener('DOMContentLoaded',()=>{ensureNav();setTimeout(ensureNav,200);},{once:true});
  if(document.body){ensureNav();setTimeout(ensureNav,200);}

  window.CreativeOSWinnerLab={activate,load,getData:()=>S.data,getProductId:()=>S.productId,openTesting,version:'2.0'};
})();