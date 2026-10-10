from pathlib import Path

path = Path('index.html')
s = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'Patch failed: {label}')
    s = s.replace(old, new, 1)


def replace_between(start, end, new, label):
    global s
    a = s.find(start)
    if a < 0:
        raise SystemExit(f'Patch failed: {label} start')
    b = s.find(end, a)
    if b < 0:
        raise SystemExit(f'Patch failed: {label} end')
    s = s[:a] + new + s[b:]

# Product workspace: Sales Angles is first-class test knowledge, not a performance report.
replace_once(
    '    const tabs=["overview","assets","avatars","videos","concepts"];\n    const labels={overview:"Resumen",assets:"Assets",avatars:"Avatares",videos:"Vídeos publicados",concepts:"Conceptos probados"};',
    '    const tabs=["overview","assets","avatars","videos","concepts","angles"];\n    const labels={overview:"Resumen",assets:"Assets",avatars:"Avatares",videos:"Vídeos publicados",concepts:"Conceptos probados",angles:"Ángulos de venta"};',
    'product workspace tabs'
)

# Only published creatives are test units.
s = s.replace(
    '      const list=state.videos.filter(v=>v.productId===p.id);',
    '      const list=state.videos.filter(v=>v.productId===p.id && v.published);',
    1
)

# Replace the product Concepts section and add the editable Sales Angles section.
start = '    if(tab==="concepts"){'
end = '    return `<div class="split">'
block = r'''    if(tab==="angles"){
      const list=(p.salesAngles||[]);
      const statusClass=x=>x==="Ganador"?"green":x==="Prometedor"?"blue":x==="Flojo"||x==="Descartado"?"red":"yellow";
      return `<div class="section-title"><div><h2>Ángulos de venta probados</h2><p>Guarda qué ángulos has testeado y qué lectura sacaste. No hace falta mezclar aquí views o comentarios.</p></div><button class="btn primary" data-action="add-sales-angle" data-product-id="${p.id}">${icon("plus")} Añadir ángulo</button></div>
      ${list.length?`<div class="grid cols-3">${list.map(a=>`<div class="card pad"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div class="concept-name">${esc(a.title||"Ángulo sin título")}</div><span class="badge ${statusClass(a.status)}">${esc(a.status||"En prueba")}</span></div><div class="concept-desc">${esc(a.note||"Sin notas todavía.")}</div><div class="chips"><span class="chip">${Number(a.tests||0)} test${Number(a.tests||0)===1?'':'s'}</span>${a.lastTest?`<span class="chip">Último · ${esc(a.lastTest)}</span>`:""}</div><div class="card-actions" style="margin-top:12px"><button class="btn small primary" data-action="use-sales-angle" data-angle="${esc(a.title||"")}">Usar en ChatGPT</button><button class="btn small" data-action="edit-sales-angle" data-product-id="${p.id}" data-angle-id="${a.id}">Editar</button><button class="btn small danger" data-action="delete-sales-angle" data-product-id="${p.id}" data-angle-id="${a.id}">Eliminar</button></div></div>`).join("")}</div>`:`<div class="empty"><b>Aún no has guardado ángulos de venta</b><span>Añade los que ya hayas testeado. Cuando un vídeo publicado lleve un ángulo nuevo, CreativeOS también podrá incorporarlo automáticamente.</span></div>`}`;
    }
    if(tab==="concepts"){
      const publishedIds=state.videos.filter(v=>v.productId===p.id && v.published).map(v=>v.conceptId).filter(Boolean);
      const ids=[...new Set([...(p.testedConceptIds||[]),...publishedIds])];
      const list=ids.map(id=>concept(id)).filter(Boolean);
      return `<div class="section-title"><div><h2>Conceptos probados</h2><p>${list.length} concepto${list.length===1?'':'s'} guardado${list.length===1?'':'s'} como parte del test de ${esc(p.name)}.</p></div><div style="display:flex;gap:8px"><button class="btn primary" data-action="add-tested-concept" data-product-id="${p.id}">${icon("plus")} Añadir concepto probado</button><button class="btn" data-route="concepts">Biblioteca global</button></div></div>
      ${list.length?`<div class="grid cols-3">${list.map(c=>{const used=state.videos.filter(v=>v.productId===p.id&&v.published&&v.conceptId===c.id).length;return `<div class="card pad"><div style="display:flex;justify-content:space-between;gap:10px"><div class="concept-name">${esc(c.name)}</div>${used?`<span class="badge green">${used} publicado${used===1?'':'s'}</span>`:`<span class="badge">Manual</span>`}</div><div class="concept-desc">${esc(c.desc||"Sin descripción")}</div><div class="chips">${(c.tags||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div><div class="card-actions" style="margin-top:12px"><button class="btn small primary" data-select-concept="${c.id}">Seleccionar</button><button class="btn small" data-action="concept-detail" data-id="${c.id}">Editar ficha</button><button class="btn small danger" data-action="unlink-tested-concept" data-product-id="${p.id}" data-concept-id="${c.id}">Quitar del test</button></div></div>`}).join("")}</div>`:`<div class="empty"><b>Aún no hay conceptos probados</b><span>Puedes añadir uno existente o crear uno nuevo desde este mismo producto.</span></div>`}`;
    }
'''
replace_between(start, end, block, 'product concepts and angles')

# Assets: allow deletion from both product workspace and global Assets page.
replace_once(
    '        <div class="asset-meta"><b>${esc(a.name)}</b><span>${esc(a.type)}</span></div>\n      </div>`;',
    '        <div class="asset-meta"><b>${esc(a.name)}</b><span>${esc(a.type)}</span></div>\n        <div class="card-actions" style="padding:0 10px 10px"><button class="btn small danger" data-action="delete-asset" data-product-id="${pid}" data-asset-id="${a.id}">Eliminar</button></div>\n      </div>`;',
    'product asset delete button'
)
replace_once(
    '        <div class="asset-meta"><b>${esc(a.name)}</b><span>${query?esc(a.productName)+" · ":""}${esc(a.type)}</span></div>\n      </div>`;',
    '        <div class="asset-meta"><b>${esc(a.name)}</b><span>${query?esc(a.productName)+" · ":""}${esc(a.type)}</span></div>\n        <div class="card-actions" style="padding:0 10px 10px"><button class="btn small danger" data-action="delete-asset" data-product-id="${a.productId||p.id}" data-asset-id="${a.id}">Eliminar</button></div>\n      </div>`;',
    'global asset delete button'
)

# Avatars: delete from the current library while preserving historical labels.
replace_once(
    '      <div class="card-actions" style="margin-top:11px"><button class="btn small ${sel?\'green\':\'primary\'}" data-select-avatar="${a.id}" data-product-id="${pid}">${sel?\'Seleccionado ✓\':\'Seleccionar para ChatGPT\'}</button></div>',
    '      <div class="card-actions" style="margin-top:11px"><button class="btn small ${sel?\'green\':\'primary\'}" data-select-avatar="${a.id}" data-product-id="${pid}">${sel?\'Seleccionado ✓\':\'Seleccionar para ChatGPT\'}</button><button class="btn small danger" data-action="delete-avatar" data-product-id="${pid}" data-avatar-id="${a.id}">Eliminar</button></div>',
    'avatar delete button'
)

s = s.replace(
    '<td>${esc(avatarById(v.avatarId)?.name||"—")}</td>',
    '<td>${esc(avatarById(v.avatarId)?.name||v.avatarName||"—")}</td>',
    1
)
s = s.replace(
    '<span class="chip">${esc(avatarById(j.avatarId)?.name||"Sin avatar")}</span>',
    '<span class="chip">${esc(avatarById(j.avatarId)?.name||j.avatarName||"Sin avatar")}</span>',
    1
)

# Recalculation: totals come from published creatives, while test knowledge can also be added manually.
replace_once(
    '    p.conceptsTested=new Set(vs.map(v=>v.conceptId).filter(Boolean)).size || p.conceptsTested;\n    p.avatarsTested=new Set(vs.map(v=>v.avatarId).filter(Boolean)).size || p.avatarsTested;\n    p.anglesTested=new Set(vs.map(v=>v.angle).filter(Boolean)).size || p.anglesTested;',
    '''    p.testedConceptIds=[...new Set([...(p.testedConceptIds||[]),...vs.map(v=>v.conceptId).filter(Boolean)])];
    p.conceptsTested=p.testedConceptIds.length;
    p.avatarsTested=new Set(vs.map(v=>v.avatarId||v.avatarName).filter(Boolean)).size;
    p.salesAngles=p.salesAngles||[];
    p.hiddenSalesAngleTitles=p.hiddenSalesAngleTitles||[];
    const angleCounts=new Map();
    vs.forEach(v=>{const title=String(v.angle||"").trim();if(title)angleCounts.set(title,(angleCounts.get(title)||0)+1)});
    angleCounts.forEach((count,title)=>{
      if(p.hiddenSalesAngleTitles.includes(title))return;
      let item=p.salesAngles.find(a=>String(a.title||"").trim().toLowerCase()===title.toLowerCase());
      if(!item){item={id:uid("ang"),title,status:"En prueba",tests:count,note:"Añadido automáticamente desde un vídeo publicado.",lastTest:""};p.salesAngles.push(item)}
      else item.tests=Math.max(Number(item.tests||0),count);
    });
    p.anglesTested=p.salesAngles.length;''',
    'published derived counters'
)

# New products are ready for manual tested concepts and sales angles.
replace_once(
    'brief:document.getElementById("f-brief").value,assets:[],avatars:[]};',
    'brief:document.getElementById("f-brief").value,assets:[],avatars:[],testedConceptIds:[],salesAngles:[],hiddenSalesAngleTitles:[]};',
    'new product testing fields'
)

# Store the avatar name as a snapshot when publishing.
replace_once(
    '      const v={id:uid("v"),productId:pid,title:document.getElementById("f-title").value||"Creativo publicado",conceptId:document.getElementById("f-concept").value||null,avatarId:document.getElementById("f-avatar").value||null,angle:document.getElementById("f-angle").value||"",published:true,views:Number(document.getElementById("f-views").value)||0,comments:Number(document.getElementById("f-comments").value)||0,sales:Number(document.getElementById("f-sales").value)||0,parentId:document.getElementById("f-parent").value||null,variation:document.getElementById("f-variation").value||"Original",createdAt:now()};',
    '      const selectedAvatarId=document.getElementById("f-avatar").value||null;\n      const selectedAvatar=(product(pid)?.avatars||[]).find(a=>a.id===selectedAvatarId);\n      const v={id:uid("v"),productId:pid,title:document.getElementById("f-title").value||"Creativo publicado",conceptId:document.getElementById("f-concept").value||null,avatarId:selectedAvatarId,avatarName:selectedAvatar?.name||"",angle:document.getElementById("f-angle").value||"",published:true,views:Number(document.getElementById("f-views").value)||0,comments:Number(document.getElementById("f-comments").value)||0,sales:Number(document.getElementById("f-sales").value)||0,parentId:document.getElementById("f-parent").value||null,variation:document.getElementById("f-variation").value||"Original",createdAt:now()};',
    'avatar snapshot on publish'
)

# Add compact modals for product-level test knowledge.
modal_anchor = '  function retryModal(j){'
modal_code = r'''  function salesAngleModal(pid,angleId=null){
    const p=product(pid);if(!p)return;
    const a=(p.salesAngles||[]).find(x=>x.id===angleId)||{title:"",status:"En prueba",tests:1,note:"",lastTest:""};
    modal(formModal(angleId?"Editar ángulo de venta":"Añadir ángulo de venta","Guarda la hipótesis comercial y tu lectura del test. Las métricas del vídeo viven en Vídeos publicados.",`
      <div class="form-grid">
        <div class="field full"><label>Ángulo de venta</label><input id="f-angle-title" value="${esc(a.title||"")}" placeholder="Ej: Evitar dolor en los dedos durante running"></div>
        <div class="field"><label>Lectura</label><select id="f-angle-status">${["En prueba","Prometedor","Ganador","Flojo","Descartado"].map(x=>`<option ${a.status===x?'selected':''}>${x}</option>`).join("")}</select></div>
        <div class="field"><label>Nº de tests</label><input id="f-angle-tests" type="number" min="0" value="${Number(a.tests||0)}"></div>
        <div class="field"><label>Último test</label><input id="f-angle-date" type="date" value="${esc(a.lastTest||"")}"></div>
        <div class="field full"><label>Qué aprendiste</label><textarea id="f-angle-note" placeholder="Ej: conecta mejor cuando hablamos de evitar dolor en tiradas largas.">${esc(a.note||"")}</textarea></div>
      </div>`,`save-sales-angle`,`data-product-id="${pid}" data-angle-id="${angleId||""}"`));
  }

  function testedConceptModal(pid){
    const p=product(pid);if(!p)return;
    const linked=new Set(p.testedConceptIds||[]);
    const options=state.concepts.filter(c=>!linked.has(c.id)).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
    modal(formModal("Añadir concepto probado","Puedes vincular uno de tu biblioteca o crear un concepto nuevo aquí mismo.",`
      <div class="form-grid">
        <div class="field full"><label>Concepto existente</label><select id="f-tested-concept"><option value="">— Seleccionar —</option>${options}</select></div>
        <div class="field full"><div class="review-note"><b>O crea uno nuevo</b> si este concepto salió de un vídeo que acabas de replicar y todavía no existe en tu biblioteca.</div></div>
        <div class="field"><label>Nombre nuevo</label><input id="f-new-concept-name" placeholder="Ej: Reacción exagerada + reveal"></div>
        <div class="field"><label>Categoría</label><select id="f-new-concept-category"><option>Global</option><option>Pets</option><option>Babies</option><option>Sport</option><option>Gift</option></select></div>
        <div class="field full"><label>Descripción / estructura</label><textarea id="f-new-concept-desc" placeholder="Hook, acciones, reveal, payoff..."></textarea></div>
        <div class="field"><label>Fuente</label><input id="f-new-concept-source" placeholder="Vídeo replicado / referencia / idea propia"></div>
        <div class="field"><label>Tags</label><input id="f-new-concept-tags" placeholder="reveal, reacción, demostración"></div>
      </div>`,`save-tested-concept`,`data-product-id="${pid}"`));
  }

'''
replace_once(modal_anchor, modal_code + modal_anchor, 'testing knowledge modals')

# Interactive handlers: delete controls + editable sales angles + tested concept management.
needle = '    else if(a==="upload-asset") uploadAssetModal(t.dataset.productId);'
insert = r'''    else if(a==="delete-avatar"){
      const p=product(t.dataset.productId);if(!p)return;
      const av=(p.avatars||[]).find(x=>x.id===t.dataset.avatarId);if(!av)return;
      if(!confirm(`¿Eliminar el avatar “${av.name}”? Los vídeos publicados conservarán su nombre como histórico.`))return;
      state.videos.filter(v=>v.productId===p.id && v.avatarId===av.id).forEach(v=>{v.avatarName=v.avatarName||av.name;v.avatarId=null;});
      state.jobs.filter(j=>j.productId===p.id && j.avatarId===av.id).forEach(j=>{j.avatarName=j.avatarName||av.name;j.avatarId=null;});
      p.avatars=(p.avatars||[]).filter(x=>x.id!==av.id);
      if(state.context.avatarId===av.id)state.context.avatarId=null;
      recalcProduct(p.id);save();render();toast("Avatar eliminado; historial conservado");
    }
    else if(a==="delete-asset"){
      const p=product(t.dataset.productId);if(!p)return;
      const asset=(p.assets||[]).find(x=>x.id===t.dataset.assetId);if(!asset)return;
      if(!confirm(`¿Eliminar el asset “${asset.name}”?`))return;
      p.assets=(p.assets||[]).filter(x=>x.id!==asset.id);
      state.context.assetIds=(state.context.assetIds||[]).filter(id=>id!==asset.id);
      save();render();toast("Asset eliminado");
    }
    else if(a==="add-sales-angle") salesAngleModal(t.dataset.productId);
    else if(a==="edit-sales-angle") salesAngleModal(t.dataset.productId,t.dataset.angleId);
    else if(a==="save-sales-angle"){
      const p=product(t.dataset.productId);if(!p)return;
      p.salesAngles=p.salesAngles||[];p.hiddenSalesAngleTitles=p.hiddenSalesAngleTitles||[];
      const title=document.getElementById("f-angle-title")?.value.trim();if(!title){toast("Escribe el ángulo de venta");return;}
      const id=t.dataset.angleId;const existing=p.salesAngles.find(x=>x.id===id);const oldTitle=existing?.title||"";
      const data={title,status:document.getElementById("f-angle-status").value,tests:Number(document.getElementById("f-angle-tests").value)||0,lastTest:document.getElementById("f-angle-date").value,note:document.getElementById("f-angle-note").value.trim()};
      if(existing)Object.assign(existing,data);else p.salesAngles.push({id:uid("ang"),...data});
      if(oldTitle&&oldTitle!==title)state.videos.filter(v=>v.productId===p.id&&String(v.angle||"").trim()===oldTitle).forEach(v=>v.angle=title);
      p.hiddenSalesAngleTitles=p.hiddenSalesAngleTitles.filter(x=>x.toLowerCase()!==title.toLowerCase());
      recalcProduct(p.id);save();closeModal();render();toast("Ángulo guardado");
    }
    else if(a==="delete-sales-angle"){
      const p=product(t.dataset.productId);if(!p)return;const item=(p.salesAngles||[]).find(x=>x.id===t.dataset.angleId);if(!item)return;
      if(!confirm(`¿Eliminar el ángulo “${item.title}” de este producto?`))return;
      p.salesAngles=(p.salesAngles||[]).filter(x=>x.id!==item.id);p.hiddenSalesAngleTitles=[...new Set([...(p.hiddenSalesAngleTitles||[]),item.title])];
      p.anglesTested=p.salesAngles.length;save();render();toast("Ángulo eliminado");
    }
    else if(a==="use-sales-angle"){
      const angle=t.dataset.angle||"";state.context.productId=state.ui.openProductId||state.context.productId;
      const line=`Ángulo de venta: ${angle}.`;if(!String(state.context.instruction||"").includes(line))state.context.instruction=[state.context.instruction,line].filter(Boolean).join(" ");
      save();render();toast("Ángulo añadido al contexto de ChatGPT");
    }
    else if(a==="add-tested-concept") testedConceptModal(t.dataset.productId);
    else if(a==="save-tested-concept"){
      const p=product(t.dataset.productId);if(!p)return;p.testedConceptIds=p.testedConceptIds||[];
      let cid=document.getElementById("f-tested-concept")?.value||"";
      const newName=document.getElementById("f-new-concept-name")?.value.trim()||"";
      if(newName){const c={id:uid("c"),name:newName,category:document.getElementById("f-new-concept-category").value,desc:document.getElementById("f-new-concept-desc").value.trim(),source:document.getElementById("f-new-concept-source").value.trim()||"Manual",uses:0,bestViews:0,avgViews:0,tags:(document.getElementById("f-new-concept-tags").value||"").split(",").map(x=>x.trim()).filter(Boolean),signal:"En prueba",videoRefs:[]};state.concepts.unshift(c);cid=c.id;}
      if(!cid){toast("Selecciona un concepto o crea uno nuevo");return;}
      if(!p.testedConceptIds.includes(cid))p.testedConceptIds.push(cid);p.conceptsTested=p.testedConceptIds.length;
      save();closeModal();render();toast("Concepto añadido al test");
    }
    else if(a==="unlink-tested-concept"){
      const p=product(t.dataset.productId);if(!p)return;const cid=t.dataset.conceptId;
      const used=state.videos.some(v=>v.productId===p.id&&v.published&&v.conceptId===cid);
      if(used){toast("Ese concepto está ligado a un vídeo publicado y se conserva como histórico");return;}
      p.testedConceptIds=(p.testedConceptIds||[]).filter(id=>id!==cid);p.conceptsTested=p.testedConceptIds.length;save();render();toast("Concepto quitado del test");
    }
    else if(a==="upload-asset") uploadAssetModal(t.dataset.productId);'''
replace_once(needle, insert, 'test knowledge handlers')

path.write_text(s, encoding='utf-8')
print('Editable test knowledge applied')
