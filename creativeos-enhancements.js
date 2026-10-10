(() => {
  const KEY='creativeos_local_v3';
  const MEDIA_DB='creativeos_media_v1';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[m]));
  const uid=p=>p+Math.random().toString(36).slice(2,9);
  const getState=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
  const writeState=st=>localStorage.setItem(KEY,JSON.stringify(st));

  let editingId=null;
  let pendingRefs=[];
  let contextOpen=false;
  let saveTimer=null;

  function openDB(){
    return new Promise((resolve,reject)=>{
      const r=indexedDB.open(MEDIA_DB,1);
      r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('conceptVideos'))db.createObjectStore('conceptVideos',{keyPath:'id'})};
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error);
    });
  }
  async function putBlob(id,file){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('conceptVideos','readwrite');tx.objectStore('conceptVideos').put({id,blob:file,name:file.name,type:file.type,updatedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
  async function getBlob(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('conceptVideos','readonly');const r=tx.objectStore('conceptVideos').get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
  async function deleteBlob(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('conceptVideos','readwrite');tx.objectStore('conceptVideos').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}

  function ensureShell(){
    if(!$('#conceptEditor')){
      document.body.insertAdjacentHTML('beforeend','<div id="conceptEditor"><div class="ce-modal"><div id="ceContent"></div></div></div>');
    }
    if(!$('.cos-save-indicator')) document.body.insertAdjacentHTML('beforeend','<div class="cos-save-indicator">Guardando…</div>');
    if(!$('.cos-context-fab')) document.body.insertAdjacentHTML('beforeend','<button class="cos-context-fab" type="button">◎ Contexto ChatGPT</button><div class="cos-context-drawer"></div>');
  }

  function showSaved(){
    const el=$('.cos-save-indicator');if(!el)return;
    el.textContent='✓ Guardado';el.classList.add('show','ok');
    clearTimeout(saveTimer);saveTimer=setTimeout(()=>el.classList.remove('show'),1100);
  }

  function patchStorage(){
    if(window.__cosStoragePatched)return;window.__cosStoragePatched=true;
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){const r=original.call(this,k,v);if(this===localStorage&&k===KEY){showSaved();setTimeout(()=>{refreshContext();decorateConcepts();injectCoverage();},0)}return r};
  }

  function categories(){return ['Global','Pets','Babies','Sport','Gift','Other']}
  function closeEditor(){const ed=$('#conceptEditor');if(ed)ed.classList.remove('open');editingId=null;pendingRefs=[]}

  function conceptForm(c,isNew=false){
    ensureShell();
    pendingRefs=(c.videoRefs||[]).map(r=>({...r}));
    const catOpts=categories().map(x=>`<option ${c.category===x?'selected':''}>${esc(x)}</option>`).join('');
    const sig=c.signal||'Sin clasificar';
    const content=$('#ceContent');
    content.innerHTML=`
      <div class="ce-head"><div><h2>${isNew?'Nuevo concepto':'Editar concepto'}</h2><p>${isNew?'Crea una ficha reutilizable para futuros productos.':'Edita estructura, métricas, estado y referencias.'}</p></div><button class="ce-close" id="ceClose">×</button></div>
      <div class="ce-body">
        <div class="ce-grid">
          <div class="ce-field"><label>Nombre</label><input id="ceName" value="${esc(c.name||'')}"></div>
          <div class="ce-field"><label>Categoría</label><select id="ceCategory">${catOpts}</select></div>
          <div class="ce-field full"><label>Descripción / estructura</label><textarea id="ceDesc">${esc(c.desc||'')}</textarea></div>
          <div class="ce-field"><label>Fuente / referencia</label><input id="ceSource" value="${esc(c.source||'')}"></div>
          <div class="ce-field"><label>Tags</label><input id="ceTags" value="${esc((c.tags||[]).join(', '))}" placeholder="hook social, reveal, regalo"></div>
          <div class="ce-field"><label>Estado creativo</label><select id="ceSignal">${['Sin clasificar','Prometedor','Ganador','En prueba','Descartado'].map(x=>`<option ${sig===x?'selected':''}>${x}</option>`).join('')}</select></div>
          <div class="ce-field"><label>Último test</label><input id="ceLastTest" type="date" value="${esc(c.lastTest||'')}"></div>
        </div>
        <div class="ce-stats">
          <div class="ce-stat"><label>Tests realizados</label><input id="ceUses" type="number" min="0" value="${Number(c.uses||0)}"></div>
          <div class="ce-stat"><label>Mejor vídeo · views</label><input id="ceBest" type="number" min="0" value="${Number(c.bestViews||0)}"></div>
          <div class="ce-stat"><label>Media de visitas</label><input id="ceAvg" type="number" min="0" value="${Number(c.avgViews||0)}"></div>
          <div class="ce-stat"><label>Productos probados</label><input id="ceProducts" value="${esc((c.productsTried||[]).join(', '))}" placeholder="PawShield, BabyCalm"></div>
        </div>
        <div class="ce-video-box">
          <div class="ce-video-head"><div><h3>Vídeos del concepto</h3><span>Original, referencias o tests ya publicados.</span></div><span class="ce-badge" id="ceVideoCount">${pendingRefs.length} vídeos</span></div>
          <div class="ce-add-video"><input id="ceVideoUrl" type="url" placeholder="https://... enlace del vídeo"><button class="ce-btn" id="ceAddUrl">Añadir enlace</button></div>
          <div class="ce-upload"><input id="ceVideoFiles" type="file" accept="video/*" multiple><div class="ce-note">Los vídeos subidos se guardan en este navegador mediante IndexedDB.</div></div>
          <div class="ce-video-list" id="ceVideoList"></div>
        </div>
      </div>
      <div class="ce-foot"><button class="ce-btn" id="ceCancel">Cancelar</button><button class="ce-btn primary" id="ceSave">${isNew?'Crear concepto':'Guardar cambios'}</button></div>`;
    $('#conceptEditor').classList.add('open');
    renderRefs();
    $('#ceClose').onclick=closeEditor;$('#ceCancel').onclick=closeEditor;
    $('#ceAddUrl').onclick=()=>{const el=$('#ceVideoUrl');const url=el.value.trim();if(!url)return;pendingRefs.push({id:uid('cv'),kind:'url',name:url.split('/').pop()||'Vídeo de referencia',url});el.value='';renderRefs()};
    $('#ceVideoFiles').onchange=async e=>{for(const file of [...e.target.files]){const id=uid('cv');await putBlob(id,file);pendingRefs.push({id,kind:'local',name:file.name,type:file.type,size:file.size})}e.target.value='';renderRefs()};
    $('#ceSave').onclick=()=>saveConcept(isNew);
  }

  async function renderRefs(){
    const list=$('#ceVideoList');if(!list)return;
    const badge=$('#ceVideoCount');if(badge)badge.textContent=`${pendingRefs.length} vídeo${pendingRefs.length===1?'':'s'}`;
    if(!pendingRefs.length){list.innerHTML='<div class="ce-note">Todavía no hay vídeos guardados para este concepto.</div>';return}
    list.innerHTML=pendingRefs.map((r,i)=>`<div class="ce-video-item"><div class="ce-video-preview" id="vp-${esc(r.id)}">${r.kind==='url'?'ENLACE':'CARGANDO…'}</div><div class="ce-video-info"><b>${esc(r.name||'Vídeo')}</b><span>${r.kind==='local'?'Archivo local':esc(r.url||'')}</span></div><button class="ce-remove" data-ref-index="${i}">Eliminar</button></div>`).join('');
    $$('.ce-remove').forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.refIndex);const r=pendingRefs[i];pendingRefs.splice(i,1);if(r?.kind==='local')try{await deleteBlob(r.id)}catch{}renderRefs()});
    for(const r of pendingRefs){const box=$('#vp-'+CSS.escape(r.id));if(!box)continue;if(r.kind==='local'){try{const rec=await getBlob(r.id);if(rec?.blob){const u=URL.createObjectURL(rec.blob);box.innerHTML=`<video src="${u}" muted controls preload="metadata"></video>`}else box.textContent='ARCHIVO NO ENCONTRADO'}catch{box.textContent='ERROR'}}else if(/\.(mp4|webm|mov)(\?|$)/i.test(r.url||'')){box.innerHTML=`<video src="${esc(r.url)}" muted controls preload="metadata"></video>`}else{box.innerHTML=`<a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:#8facff;text-decoration:none;font-size:9px">ABRIR VÍDEO ↗</a>`}}
  }

  function editConcept(id){const st=getState();const c=(st.concepts||[]).find(x=>x.id===id);if(!c)return;editingId=id;conceptForm(c,false)}
  function newConcept(){editingId=null;conceptForm({name:'',category:'Global',desc:'',source:'',tags:[],uses:0,bestViews:0,avgViews:0,productsTried:[],videoRefs:[],signal:'En prueba',lastTest:''},true)}
  function saveConcept(isNew){
    const st=getState();st.concepts=st.concepts||[];
    const data={name:$('#ceName').value.trim()||'Concepto sin nombre',category:$('#ceCategory').value,desc:$('#ceDesc').value.trim(),source:$('#ceSource').value.trim()||'Manual',tags:$('#ceTags').value.split(',').map(x=>x.trim()).filter(Boolean),signal:$('#ceSignal').value,lastTest:$('#ceLastTest').value,uses:Number($('#ceUses').value)||0,bestViews:Number($('#ceBest').value)||0,avgViews:Number($('#ceAvg').value)||0,productsTried:$('#ceProducts').value.split(',').map(x=>x.trim()).filter(Boolean),videoRefs:pendingRefs.map(r=>({...r}))};
    if(isNew)st.concepts.unshift({id:uid('c'),...data});else{const i=st.concepts.findIndex(x=>x.id===editingId);if(i>=0)st.concepts[i]={...st.concepts[i],...data}}
    writeState(st);closeEditor();location.reload();
  }

  function decorateConcepts(){
    const st=getState();
    $$('[data-action="concept-detail"]').forEach(b=>{if(b.textContent!=='Editar ficha')b.textContent='Editar ficha'});
    $$('.concept-card').forEach(card=>{
      const b=card.querySelector('[data-action="concept-detail"]');if(!b)return;
      const c=(st.concepts||[]).find(x=>x.id===b.dataset.id);if(!c)return;
      const top=card.querySelector('.concept-top');if(!top)return;
      let vc=card.querySelector('.concept-video-count');if(!vc){vc=document.createElement('span');vc.className='chip concept-video-count';top.appendChild(vc)}
      const vtxt=`${(c.videoRefs||[]).length} vídeos`;if(vc.textContent!==vtxt)vc.textContent=vtxt;
      let sc=card.querySelector('.concept-signal-chip');if(!sc){sc=document.createElement('span');sc.className='concept-signal-chip';top.appendChild(sc)}
      const stxt=c.signal||'Sin clasificar';if(sc.textContent!==stxt)sc.textContent=stxt;
    });
  }

  function contextData(){
    const st=getState(),products=st.products||[],concepts=st.concepts||[],videos=st.videos||[],assets=products.flatMap(p=>(p.assets||[]).map(a=>({...a,productId:p.id,productName:p.name}))),avatars=products.flatMap(p=>(p.avatars||[]).map(a=>({...a,productId:p.id})));
    const c=st.context||{};
    return {st,c,product:products.find(x=>x.id===c.productId),concept:concepts.find(x=>x.id===c.conceptId),video:videos.find(x=>x.id===c.videoId),avatar:avatars.find(x=>x.id===c.avatarId),assets:(c.assetIds||[]).map(id=>assets.find(x=>x.id===id)).filter(Boolean)};
  }
  function refreshContext(){
    const drawer=$('.cos-context-drawer');if(!drawer)return;
    const d=contextData();
    drawer.innerHTML=`<div class="cos-context-head"><div><b>Contexto ChatGPT</b><span>Selección activa para el siguiente paso</span></div><button class="ce-close" data-cos-close>×</button></div>
      <div class="cos-context-row"><div class="cos-context-label">Producto</div><div class="cos-context-value">${esc(d.product?.name||'Ninguno')}</div></div>
      <div class="cos-context-row"><div class="cos-context-label">Concepto</div><div class="cos-context-value">${esc(d.concept?.name||'Ninguno')}</div></div>
      <div class="cos-context-row"><div class="cos-context-label">Vídeo</div><div class="cos-context-value">${esc(d.video?.title||d.video?.name||'Ninguno')}</div></div>
      <div class="cos-context-row"><div class="cos-context-label">Avatar</div><div class="cos-context-value">${esc(d.avatar?.name||'Ninguno')}</div></div>
      <div class="cos-context-row"><div class="cos-context-label">Assets</div><div class="cos-context-value">${d.assets.length?d.assets.map(a=>esc(a.name)).join(' · '):'Ninguno'}</div></div>
      <div class="cos-context-row"><div class="cos-context-label">Instrucción</div><div class="cos-context-value">${esc(d.c.instruction||'Sin instrucción adicional')}</div></div>
      <div class="cos-context-actions"><button data-cos-clear>Limpiar</button><button class="primary" data-cos-copy>Copiar contexto</button></div>`;
  }
  function clearContext(){const st=getState();st.context={productId:null,conceptId:null,videoId:null,avatarId:null,assetIds:[],mode:null,instruction:'',locks:{camera:true,actions:true,product:false,background:false}};writeState(st);location.reload()}
  async function copyContext(){const d=contextData();const payload={product:d.product||null,concept:d.concept||null,video:d.video||null,avatar:d.avatar||null,assets:d.assets,mode:d.c.mode||null,instruction:d.c.instruction||'',locks:d.c.locks||{}};try{await navigator.clipboard.writeText(JSON.stringify(payload,null,2));const el=$('.cos-context-fab');if(el){const old=el.textContent;el.textContent='✓ Contexto copiado';setTimeout(()=>el.textContent=old,1200)}}catch{}}

  function coverageScore(p,st){
    const vids=(st.videos||[]).filter(v=>v.productId===p.id);
    const concepts=new Set(vids.map(v=>v.conceptId).filter(Boolean));
    const avatars=new Set(vids.map(v=>v.avatarId).filter(Boolean));
    const angles=new Set(vids.map(v=>v.salesAngle||v.angle).filter(Boolean));
    const published=Number(p.published||0);
    const c=Math.max(Number(p.conceptsTested||0),concepts.size),a=Math.max(Number(p.avatarsTested||0),avatars.size),g=Math.max(Number(p.anglesTested||0),angles.size);
    const score=Math.round(Math.min(100,(Math.min(c/5,1)*28+Math.min(a/4,1)*22+Math.min(g/4,1)*22+Math.min(published/18,1)*28)*100)/100);
    let note='Cobertura equilibrada. Sigue explotando las ramas que mejor señal den.';
    if(published<8)note='Todavía hay pocas publicaciones: falta exposición antes de sacar una conclusión fuerte.';
    else if(a<2)note='Hay suficientes vídeos para empezar a leer señal, pero falta probar más avatares/segmentos.';
    else if(g<3)note='La variedad de ángulos sigue siendo baja. Prueba mensajes de venta distintos antes de descartar.';
    else if(c<4)note='Conviene ampliar conceptos: no juzgues el producto solo con la misma estructura creativa.';
    else if(Number(p.bestViews||0)>=15000)note='Hay señal clara en al menos una pieza. Prioriza ramificar el ganador antes de abrir demasiadas ideas nuevas.';
    return {score,c,a,g,published,note};
  }
  function injectCoverage(){
    const st=getState();const pid=st.ui?.openProductId;if(!pid){$('.cos-coverage')?.remove();return}
    const p=(st.products||[]).find(x=>x.id===pid);if(!p)return;
    const anchor=$('.context-bar');if(!anchor)return;
    let box=$('.cos-coverage');if(!box){box=document.createElement('div');box.className='cos-coverage';anchor.after(box)}
    const q=coverageScore(p,st);
    box.innerHTML=`<div class="cos-coverage-head"><div><div class="cos-coverage-title">Test Coverage</div><div class="cos-coverage-sub">Calidad del test, no solo días transcurridos.</div></div><div class="cos-coverage-score">${q.score}%</div></div><div class="cos-coverage-grid"><div class="cos-coverage-item"><b>${q.published}</b><span>Publicados</span></div><div class="cos-coverage-item"><b>${q.c}</b><span>Conceptos</span></div><div class="cos-coverage-item"><b>${q.a}</b><span>Avatares</span></div><div class="cos-coverage-item"><b>${q.g}</b><span>Ángulos</span></div></div><div class="cos-coverage-note">${esc(q.note)}</div>`;
  }

  function refreshAll(){ensureShell();decorateConcepts();refreshContext();injectCoverage()}

  document.addEventListener('click',e=>{
    const detail=e.target.closest('[data-action="concept-detail"]');if(detail){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();editConcept(detail.dataset.id);return}
    const add=e.target.closest('[data-action="add-concept"]');if(add){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();newConcept();return}
    if(e.target.closest('.cos-context-fab')){contextOpen=!contextOpen;$('.cos-context-drawer')?.classList.toggle('open',contextOpen);refreshContext();return}
    if(e.target.closest('[data-cos-close]')){contextOpen=false;$('.cos-context-drawer')?.classList.remove('open');return}
    if(e.target.closest('[data-cos-clear]')){clearContext();return}
    if(e.target.closest('[data-cos-copy]')){copyContext();return}
    setTimeout(refreshAll,0);
  },true);
  document.addEventListener('input',()=>setTimeout(injectCoverage,0),true);
  window.addEventListener('storage',refreshAll);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeEditor();contextOpen=false;$('.cos-context-drawer')?.classList.remove('open')}});

  ensureShell();patchStorage();refreshAll();
})();
