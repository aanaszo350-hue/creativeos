(() => {
  const KEY='creativeos_local_v3';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[m]));
  let drawerOpen=false,paletteOpen=false,lastSig='';

  const getState=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
  const saveState=st=>localStorage.setItem(KEY,JSON.stringify(st));
  const allAssets=st=>(st.products||[]).flatMap(p=>(p.assets||[]).map(a=>({...a,productId:p.id,productName:p.name})));
  const allAvatars=st=>(st.products||[]).flatMap(p=>(p.avatars||[]).map(a=>({...a,productId:p.id,productName:p.name})));

  function selectedContext(){
    const st=getState(),c=st.context||{};
    const products=st.products||[],concepts=st.concepts||[],videos=st.videos||[],assets=allAssets(st),avatars=allAvatars(st);
    const product=products.find(x=>x.id===c.productId)||null;
    const concept=concepts.find(x=>x.id===c.conceptId)||null;
    const video=videos.find(x=>x.id===c.videoId)||null;
    const avatar=avatars.find(x=>x.id===c.avatarId)||null;
    return {state:st,context:c,product,concept,video,avatar,assets:(c.assetIds||[]).map(id=>assets.find(x=>x.id===id)).filter(Boolean)};
  }

  function readiness(d){
    const c=d.context||{};
    const parts=[
      [!!d.product,25,'producto'],[!!d.concept,25,'concepto'],[!!d.video,12,'vídeo'],[!!d.avatar,12,'avatar'],
      [d.assets.length>0,14,'assets'],[!!String(c.instruction||'').trim(),12,'instrucción']
    ];
    return {score:parts.reduce((n,[ok,w])=>n+(ok?w:0),0),missing:parts.filter(x=>!x[0]).map(x=>x[2])};
  }

  function testingSnapshot(product,st){
    if(!product)return null;
    const vids=(st.videos||[]).filter(v=>v.productId===product.id);
    const concepts=new Set(vids.map(v=>v.conceptId).filter(Boolean));
    const avatars=new Set(vids.map(v=>v.avatarId).filter(Boolean));
    const angles=new Set(vids.map(v=>v.salesAngle||v.angle).filter(Boolean));
    const published=Math.max(Number(product.published||0),vids.filter(v=>v.published).length);
    const snapshot={published,concepts:Math.max(Number(product.conceptsTested||0),concepts.size),avatars:Math.max(Number(product.avatarsTested||0),avatars.size),angles:Math.max(Number(product.anglesTested||0),angles.size),views:Number(product.views||0),comments:Number(product.comments||0),sales:Number(product.sales||0),bestViews:Number(product.bestViews||0)};
    const ratios={concepts:snapshot.concepts/4,avatars:snapshot.avatars/3,angles:snapshot.angles/3};
    const weakest=Object.entries(ratios).sort((a,b)=>a[1]-b[1])[0]?.[0];
    snapshot.next=weakest==='avatars'?'Probar un avatar / segmento de cliente distinto':weakest==='angles'?'Probar un ángulo de venta distinto':'Probar un concepto distinto';
    return snapshot;
  }

  function bridgePayload(){
    const d=selectedContext();
    return {
      schemaVersion:'creativeos.bridge.v1',
      generatedAt:new Date().toISOString(),
      selectedContext:{
        product:d.product,
        concept:d.concept,
        video:d.video,
        avatar:d.avatar,
        assets:d.assets,
        mode:d.context?.mode||null,
        instruction:d.context?.instruction||'',
        locks:d.context?.locks||{}
      },
      testing:testingSnapshot(d.product,d.state)
    };
  }

  window.CreativeOSBridge={
    version:'1.0',
    getState:()=>getState(),
    listProducts:()=>getState().products||[],
    getProduct:id=>(getState().products||[]).find(x=>x.id===id)||null,
    listConcepts:()=>getState().concepts||[],
    getConcept:id=>(getState().concepts||[]).find(x=>x.id===id)||null,
    getSelectedContext:()=>bridgePayload(),
    setSelectedContext:patch=>{const st=getState();st.context={...(st.context||{}),...(patch||{})};saveState(st);window.dispatchEvent(new CustomEvent('creativeos:context-changed'));return bridgePayload()},
    clearSelectedContext:()=>{const st=getState();st.context={productId:null,conceptId:null,videoId:null,avatarId:null,assetIds:[],mode:null,instruction:'',locks:{camera:true,actions:true,product:false,background:false}};saveState(st);window.dispatchEvent(new CustomEvent('creativeos:context-changed'));return bridgePayload()},
    getAutomationPayload:()=>bridgePayload()
  };

  function ensureUI(){
    if(!$('.cos4-fab')) document.body.insertAdjacentHTML('beforeend',`<button class="cos4-fab" type="button"><span>⚡ Workflow</span><span class="cos4-fab-score">0%</span></button><aside class="cos4-drawer"></aside>`);
    if(!$('.cos4-palette-backdrop')) document.body.insertAdjacentHTML('beforeend',`<div class="cos4-palette-backdrop"><div class="cos4-palette"><div class="cos4-search-wrap"><span>⌕</span><input class="cos4-search" placeholder="Buscar producto, concepto o acción…"><span class="cos4-key">ESC</span></div><div class="cos4-results"></div></div></div>`);
  }

  function nextStep(d,r){
    if(!d.product)return ['Selecciona un producto','Es la base del contexto y del test.'];
    if(!d.concept)return ['Añade un concepto al contexto','Así ChatGPT sabrá qué estructura creativa quieres aplicar.'];
    if(!d.avatar)return ['Selecciona un avatar','Define el segmento de cliente para adaptar la pieza.'];
    if(!d.assets.length)return ['Selecciona assets del producto','Añade producto, uso, packaging, fondo o referencias visuales.'];
    if(!String(d.context?.instruction||'').trim())return ['Añade una instrucción breve','Ejemplo: “aplica este concepto manteniendo cámara y acciones”.'];
    const t=testingSnapshot(d.product,d.state);
    return [t?.next||'Contexto preparado','Ya puedes usarlo como paquete estructurado para ChatGPT.'];
  }

  function briefText(){
    const p=bridgePayload(),s=p.selectedContext,t=p.testing;
    return [
      'CREATIVEOS · CONTEXTO PARA CHATGPT',
      '',
      `Producto: ${s.product?.name||'No seleccionado'}${s.product?.label?' — '+s.product.label:''}`,
      `Concepto: ${s.concept?.name||'No seleccionado'}`,
      `Avatar: ${s.avatar?.name||'No seleccionado'}`,
      `Vídeo base: ${s.video?.title||s.video?.name||'No seleccionado'}`,
      `Assets: ${s.assets?.length?s.assets.map(a=>a.name).join(', '):'Ninguno'}`,
      `Modo: ${s.mode||'No definido'}`,
      `Instrucción: ${s.instruction||'Sin instrucción adicional'}`,
      `Locks: ${Object.entries(s.locks||{}).filter(([,v])=>v).map(([k])=>k).join(', ')||'Ninguno'}`,
      '',
      t?`Test: ${t.published} publicados · ${t.concepts} conceptos · ${t.avatars} avatares · ${t.angles} ángulos · ${t.views} views · ${t.sales} ventas`:'',
      t?`Siguiente hueco sugerido: ${t.next}`:'',
      '',
      'Usa este contexto como fuente de verdad para la siguiente acción creativa. No cambies los elementos bloqueados.'
    ].filter(Boolean).join('\n');
  }

  async function copy(text,ok='Copiado'){try{await navigator.clipboard.writeText(text);toast(ok)}catch{toast('No se pudo copiar')}}
  function toast(msg){let el=document.createElement('div');el.textContent=msg;Object.assign(el.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',zIndex:120,background:'#111722',border:'1px solid #31405b',color:'#e7eef9',padding:'9px 12px',borderRadius:'10px',fontSize:'10px',boxShadow:'0 12px 35px rgba(0,0,0,.35)'});document.body.appendChild(el);setTimeout(()=>el.remove(),1600)}

  function renderDrawer(){
    ensureUI();const d=selectedContext(),r=readiness(d),next=nextStep(d,r),t=testingSnapshot(d.product,d.state),drawer=$('.cos4-drawer');
    $('.cos4-fab-score').textContent=r.score+'%';
    drawer.classList.toggle('open',drawerOpen);
    drawer.innerHTML=`
      <div class="cos4-head"><div><b>Workflow Center</b><span>Contexto estructurado para trabajar rápido y automatizar después con ChatGPT.</span></div><button class="cos4-close" data-cos4-close>×</button></div>
      <div class="cos4-body">
        <div class="cos4-ready"><div class="cos4-ready-top"><b>Preparación del contexto</b><strong>${r.score}%</strong></div><div class="cos4-ready-track"><div class="cos4-ready-fill" style="width:${r.score}%"></div></div><div class="cos4-ready-note">${r.missing.length?'Falta: '+r.missing.join(' · '):'Contexto completo para el siguiente paso.'}</div></div>
        <div class="cos4-section"><div class="cos4-section-title">Contexto activo</div>
          <div class="cos4-kv"><span>Producto</span><b>${esc(d.product?.name||'—')}</b></div>
          <div class="cos4-kv"><span>Concepto</span><b>${esc(d.concept?.name||'—')}</b></div>
          <div class="cos4-kv"><span>Avatar</span><b>${esc(d.avatar?.name||'—')}</b></div>
          <div class="cos4-kv"><span>Vídeo</span><b>${esc(d.video?.title||d.video?.name||'—')}</b></div>
          <div class="cos4-kv"><span>Assets</span><div class="cos4-pill-wrap">${d.assets.length?d.assets.slice(0,5).map(a=>`<span class="cos4-pill">${esc(a.name)}</span>`).join(''):'<b>—</b>'}</div></div>
        </div>
        <div class="cos4-next"><div class="cos4-next-ico">→</div><div><b>${esc(next[0])}</b><span>${esc(next[1])}</span></div></div>
        ${t?`<div class="cos4-section"><div class="cos4-section-title">Test coverage</div><div class="cos4-pill-wrap"><span class="cos4-pill">${t.published} publicados</span><span class="cos4-pill">${t.concepts} conceptos</span><span class="cos4-pill">${t.avatars} avatares</span><span class="cos4-pill">${t.angles} ángulos</span><span class="cos4-pill">${t.bestViews} mejor vídeo</span></div></div>`:''}
        <div class="cos4-actions">
          <button class="cos4-btn primary full" data-cos4-copy-brief>Copiar para ChatGPT</button>
          <button class="cos4-btn" data-cos4-copy-json>Copiar JSON</button>
          <button class="cos4-btn" data-cos4-open-context>Contexto visual</button>
          <button class="cos4-btn" data-cos4-go="concepts">Conceptos</button>
          <button class="cos4-btn" data-cos4-go="assets">Assets</button>
          <button class="cos4-btn subtle full" data-cos4-clear>Limpiar selección</button>
        </div>
        <div class="cos4-shortcuts">⌘ K · buscar / navegar &nbsp;&nbsp; · &nbsp;&nbsp; ⌘ ⇧ C · copiar para ChatGPT</div>
      </div>`;
  }

  const baseActions=[
    ['⌂','Dashboard','Ver productos activos y estado general','dashboard'],['◫','Productos','Gestionar productos y tests','products'],['◇','Conceptos','Abrir biblioteca de conceptos','concepts'],['▧','Assets','Abrir biblioteca visual','assets'],['⌘','Creative Tree','Explotar ganadores y ramas','tree'],['◉','Review','Revisar generaciones','review'],['▦','Results','Resultados publicados','results']
  ];
  function actionItems(q=''){
    const st=getState(),term=q.trim().toLowerCase();
    const actions=baseActions.map(([ico,name,desc,route])=>({ico,name,desc,type:'Acción',run:()=>go(route)}));
    actions.push({ico:'◎',name:'Abrir contexto ChatGPT',desc:'Ver selección activa',type:'Acción',run:()=>{$('.cos-context-fab')?.click();closePalette()}});
    actions.push({ico:'⧉',name:'Copiar contexto para ChatGPT',desc:'Copia un brief estructurado',type:'Acción',run:()=>{copy(briefText(),'Contexto copiado');closePalette()}});
    const products=(st.products||[]).map(p=>({ico:'◫',name:p.name,desc:p.label||'Producto',type:'Producto',run:()=>selectProduct(p.id)}));
    const concepts=(st.concepts||[]).map(c=>({ico:'◇',name:c.name,desc:c.category+' · '+(c.signal||'Concepto'),type:'Concepto',run:()=>selectConcept(c.id)}));
    return [...actions,...products,...concepts].filter(x=>!term||(x.name+' '+x.desc+' '+x.type).toLowerCase().includes(term)).slice(0,18);
  }
  function renderPalette(){ensureUI();const wrap=$('.cos4-palette-backdrop'),input=$('.cos4-search'),results=$('.cos4-results');wrap.classList.toggle('open',paletteOpen);if(!paletteOpen)return;const items=actionItems(input.value);results.innerHTML=items.length?items.map((x,i)=>`<button class="cos4-result ${i===0?'active':''}" data-cos4-result="${i}"><span class="cos4-result-ico">${x.ico}</span><span><b>${esc(x.name)}</b><span>${esc(x.desc)}</span></span><span class="cos4-result-type">${x.type}</span></button>`).join(''):'<div class="cos4-empty">Sin resultados</div>';results.__items=items;setTimeout(()=>input.focus(),0)}
  function openPalette(){paletteOpen=true;renderPalette()}
  function closePalette(){paletteOpen=false;$('.cos4-palette-backdrop')?.classList.remove('open')}
  function go(route){const el=document.querySelector(`[data-route="${CSS.escape(route)}"]`);if(el){closePalette();drawerOpen=false;el.click()}else{toast('No encuentro esa sección')}}
  function selectProduct(id){const st=getState();st.context=st.context||{};st.context.productId=id;saveState(st);toast('Producto seleccionado');closePalette();setTimeout(()=>location.reload(),180)}
  function selectConcept(id){const st=getState();st.context=st.context||{};st.context.conceptId=id;saveState(st);toast('Concepto seleccionado');closePalette();setTimeout(()=>location.reload(),180)}

  document.addEventListener('click',e=>{
    const fab=e.target.closest('.cos4-fab');if(fab){drawerOpen=!drawerOpen;renderDrawer();return}
    if(e.target.closest('[data-cos4-close]')){drawerOpen=false;renderDrawer();return}
    if(e.target.closest('[data-cos4-copy-brief]')){copy(briefText(),'Contexto copiado para ChatGPT');return}
    if(e.target.closest('[data-cos4-copy-json]')){copy(JSON.stringify(bridgePayload(),null,2),'JSON copiado');return}
    if(e.target.closest('[data-cos4-open-context]')){$('.cos-context-fab')?.click();return}
    const goBtn=e.target.closest('[data-cos4-go]');if(goBtn){go(goBtn.dataset.cos4Go);return}
    if(e.target.closest('[data-cos4-clear]')){window.CreativeOSBridge.clearSelectedContext();toast('Contexto limpiado');setTimeout(()=>location.reload(),160);return}
    const result=e.target.closest('[data-cos4-result]');if(result){const items=$('.cos4-results').__items||[];items[Number(result.dataset.cos4Result)]?.run();return}
    if(e.target.classList.contains('cos4-palette-backdrop'))closePalette();
  },true);

  document.addEventListener('input',e=>{if(e.target.classList.contains('cos4-search'))renderPalette()});
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();paletteOpen?closePalette():openPalette();return}
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==='c'){e.preventDefault();copy(briefText(),'Contexto copiado para ChatGPT');return}
    if(e.key==='Escape'){if(paletteOpen)closePalette();else if(drawerOpen){drawerOpen=false;renderDrawer()}}
    if(paletteOpen&&e.key==='Enter'){const active=$('.cos4-result.active')||$('.cos4-result');if(active)active.click()}
    if(paletteOpen&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();const rows=$$('.cos4-result');if(!rows.length)return;let i=rows.findIndex(x=>x.classList.contains('active'));rows.forEach(x=>x.classList.remove('active'));i=e.key==='ArrowDown'?(i+1)%rows.length:(i-1+rows.length)%rows.length;rows[i].classList.add('active');rows[i].scrollIntoView({block:'nearest'})}
  });

  window.addEventListener('creativeos:context-changed',()=>renderDrawer());
  function sync(){ensureUI();const d=selectedContext(),sig=JSON.stringify([d.context,d.product?.published,d.product?.conceptsTested,d.product?.avatarsTested,d.product?.anglesTested,d.product?.views,d.product?.sales]);if(sig!==lastSig){lastSig=sig;renderDrawer()}}
  ensureUI();renderDrawer();setInterval(sync,1400);
})();
