(() => {
  const KEY='creativeos_local_v3';
  const frame=document.getElementById('appframe');
  const editor=document.getElementById('conceptEditor');
  const content=document.getElementById('ceContent');
  if(!frame || !editor || !content) return;

  let editingId=null;
  let pendingRefs=[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[m]));
  const uid=p=>p+Math.random().toString(36).slice(2,9);
  const getState=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
  const saveState=st=>localStorage.setItem(KEY,JSON.stringify(st));
  const categories=()=>['Global','Pets','Babies','Sport','Gift','Other'];

  function openDB(){
    return new Promise((resolve,reject)=>{
      const r=indexedDB.open('creativeos_media_v1',1);
      r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('conceptVideos'))db.createObjectStore('conceptVideos',{keyPath:'id'})};
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error);
    });
  }
  async function putBlob(id,file){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('conceptVideos','readwrite');tx.objectStore('conceptVideos').put({id,blob:file,name:file.name,type:file.type,updatedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
  async function getBlob(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('conceptVideos','readonly');const r=tx.objectStore('conceptVideos').get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
  async function deleteBlob(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('conceptVideos','readwrite');tx.objectStore('conceptVideos').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}

  function closeEditor(){editor.classList.remove('open');editingId=null;pendingRefs=[]}

  function conceptForm(c,isNew=false){
    pendingRefs=(c.videoRefs||[]).map(r=>({...r}));
    const catOpts=categories().map(x=>`<option ${c.category===x?'selected':''}>${esc(x)}</option>`).join('');
    content.innerHTML=`
      <div class="ce-head"><div><h2>${isNew?'Nuevo concepto':'Editar concepto'}</h2><p>${isNew?'Crea la ficha completa del concepto.':'Edita la ficha, métricas y vídeos de referencia.'}</p></div><button class="ce-close" id="ceClose">×</button></div>
      <div class="ce-body">
        <div class="ce-grid">
          <div class="ce-field"><label>Nombre</label><input id="ceName" value="${esc(c.name||'')}"></div>
          <div class="ce-field"><label>Categoría</label><select id="ceCategory">${catOpts}</select></div>
          <div class="ce-field full"><label>Descripción / estructura</label><textarea id="ceDesc">${esc(c.desc||'')}</textarea></div>
          <div class="ce-field"><label>Fuente / referencia</label><input id="ceSource" value="${esc(c.source||'')}"></div>
          <div class="ce-field"><label>Tags</label><input id="ceTags" value="${esc((c.tags||[]).join(', '))}" placeholder="Hook social, paneo, reveal"></div>
        </div>
        <div class="ce-stats">
          <div class="ce-stat"><label>Tests realizados</label><input id="ceUses" type="number" min="0" value="${Number(c.uses||0)}"></div>
          <div class="ce-stat"><label>Mejor vídeo · views</label><input id="ceBest" type="number" min="0" value="${Number(c.bestViews||0)}"></div>
          <div class="ce-stat"><label>Media de visitas</label><input id="ceAvg" type="number" min="0" value="${Number(c.avgViews||0)}"></div>
        </div>
        <div class="ce-video-box">
          <div class="ce-video-head"><div><h3>Vídeos del concepto</h3><span>Añade el vídeo original, referencias o ejemplos que ya has testeado.</span></div><span class="ce-badge" id="ceVideoCount">${pendingRefs.length} vídeos</span></div>
          <div class="ce-add-video"><input id="ceVideoUrl" type="url" placeholder="https://... enlace del vídeo"><button class="ce-btn" id="ceAddUrl">Añadir enlace</button></div>
          <div class="ce-upload"><input id="ceVideoFiles" type="file" accept="video/*" multiple><div class="ce-note">También puedes subir vídeos desde el ordenador. Se guardan en este navegador.</div></div>
          <div class="ce-video-list" id="ceVideoList"></div>
        </div>
      </div>
      <div class="ce-foot"><button class="ce-btn" id="ceCancel">Cancelar</button><button class="ce-btn primary" id="ceSave">${isNew?'Crear concepto':'Guardar cambios'}</button></div>`;
    editor.classList.add('open');
    renderRefs();
    document.getElementById('ceClose').onclick=closeEditor;
    document.getElementById('ceCancel').onclick=closeEditor;
    document.getElementById('ceAddUrl').onclick=()=>{const el=document.getElementById('ceVideoUrl');const url=el.value.trim();if(!url)return;pendingRefs.push({id:uid('cv'),kind:'url',name:url.split('/').pop()||'Vídeo de referencia',url});el.value='';renderRefs()};
    document.getElementById('ceVideoFiles').onchange=async e=>{for(const file of [...e.target.files]){const id=uid('cv');await putBlob(id,file);pendingRefs.push({id,kind:'local',name:file.name,type:file.type,size:file.size})}e.target.value='';renderRefs()};
    document.getElementById('ceSave').onclick=()=>saveConcept(isNew);
  }

  async function renderRefs(){
    const list=document.getElementById('ceVideoList'); if(!list)return;
    document.getElementById('ceVideoCount').textContent=`${pendingRefs.length} vídeo${pendingRefs.length===1?'':'s'}`;
    if(!pendingRefs.length){list.innerHTML='<div class="ce-note">Todavía no hay vídeos guardados para este concepto.</div>';return}
    list.innerHTML=pendingRefs.map((r,i)=>`<div class="ce-video-item"><div class="ce-video-preview" id="vp-${esc(r.id)}">${r.kind==='url'?'ENLACE':'CARGANDO…'}</div><div class="ce-video-info"><b>${esc(r.name||'Vídeo')}</b><span>${r.kind==='local'?'Archivo local':esc(r.url||'')}</span></div><button class="ce-remove" data-ref-index="${i}">Eliminar</button></div>`).join('');
    list.querySelectorAll('.ce-remove').forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.refIndex);const r=pendingRefs[i];pendingRefs.splice(i,1);if(r?.kind==='local')try{await deleteBlob(r.id)}catch{}renderRefs()});
    for(const r of pendingRefs){
      const box=document.getElementById('vp-'+r.id);if(!box)continue;
      if(r.kind==='local'){
        try{const rec=await getBlob(r.id);if(rec?.blob){const u=URL.createObjectURL(rec.blob);box.innerHTML=`<video src="${u}" muted controls preload="metadata"></video>`}else box.textContent='ARCHIVO NO ENCONTRADO'}catch{box.textContent='ERROR'}
      }else if(/\.(mp4|webm|mov)(\?|$)/i.test(r.url||'')){box.innerHTML=`<video src="${esc(r.url)}" muted controls preload="metadata"></video>`}else{box.innerHTML=`<a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:#8facff;text-decoration:none;font-size:9px">ABRIR VÍDEO ↗</a>`}
    }
  }

  function editConcept(id){const st=getState();const c=(st.concepts||[]).find(x=>x.id===id);if(!c)return;editingId=id;conceptForm(c,false)}
  function newConcept(){editingId=null;conceptForm({name:'',category:'Global',desc:'',source:'',tags:[],uses:0,bestViews:0,avgViews:0,videoRefs:[]},true)}

  function saveConcept(isNew){
    const st=getState();st.concepts=st.concepts||[];
    const data={
      name:document.getElementById('ceName').value.trim()||'Concepto sin nombre',
      category:document.getElementById('ceCategory').value,
      desc:document.getElementById('ceDesc').value.trim(),
      source:document.getElementById('ceSource').value.trim()||'Manual',
      tags:document.getElementById('ceTags').value.split(',').map(x=>x.trim()).filter(Boolean),
      uses:Number(document.getElementById('ceUses').value)||0,
      bestViews:Number(document.getElementById('ceBest').value)||0,
      avgViews:Number(document.getElementById('ceAvg').value)||0,
      videoRefs:pendingRefs.map(r=>({...r}))
    };
    if(isNew){st.concepts.unshift({id:uid('c'),...data})}
    else{const i=st.concepts.findIndex(x=>x.id===editingId);if(i>=0)st.concepts[i]={...st.concepts[i],...data}}
    saveState(st);
    closeEditor();
    location.reload();
  }

  function enhance(doc){
    if(!doc || doc.__conceptEnhanced)return;
    doc.__conceptEnhanced=true;
    doc.addEventListener('click',e=>{
      const detail=e.target.closest('[data-action="concept-detail"]');
      if(detail){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();editConcept(detail.dataset.id);return}
      const add=e.target.closest('[data-action="add-concept"]');
      if(add){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();newConcept();return}
    },true);
    const decorate=()=>{
      doc.querySelectorAll('[data-action="concept-detail"]').forEach(b=>{if(b.textContent!=='Editar ficha') b.textContent='Editar ficha'});
      const st=getState();
      doc.querySelectorAll('.concept-card').forEach(card=>{
        const b=card.querySelector('[data-action="concept-detail"]');if(!b)return;
        const c=(st.concepts||[]).find(x=>x.id===b.dataset.id);if(!c)return;
        let x=card.querySelector('.concept-video-count');
        if(!x){x=doc.createElement('span');x.className='chip concept-video-count';const top=card.querySelector('.concept-top');if(top)top.appendChild(x)}
        if(x){const label=`${(c.videoRefs||[]).length} vídeos`;if(x.textContent!==label)x.textContent=label;}
      });
    };
    decorate();
    new MutationObserver(decorate).observe(doc.body,{childList:true,subtree:true});
  }

  function wire(){try{enhance(frame.contentDocument)}catch{}}
  frame.addEventListener('load',()=>{setTimeout(wire,50);setTimeout(wire,300)});
  setInterval(wire,1000);
  editor.addEventListener('click',e=>{if(e.target===editor)closeEditor()});
})();