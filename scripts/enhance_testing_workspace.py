from pathlib import Path

path = Path('index.html')
s = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'Patch failed: {label}')
    s = s.replace(old, new, 1)

# Product workspace: add Sales Angles as a first-class tab.
replace_once(
    '    const tabs=["overview","assets","avatars","videos","concepts"];\n    const labels={overview:"Resumen",assets:"Assets",avatars:"Avatares",videos:"Vídeos publicados",concepts:"Conceptos probados"};',
    '    const tabs=["overview","assets","avatars","videos","concepts","angles"];\n    const labels={overview:"Resumen",assets:"Assets",avatars:"Avatares",videos:"Vídeos publicados",concepts:"Conceptos probados",angles:"Ángulos de venta"};',
    'product workspace tabs'
)

# Published videos only: generations/retries do not count as tests.
s = s.replace(
    '      const list=state.videos.filter(v=>v.productId===p.id);',
    '      const list=state.videos.filter(v=>v.productId===p.id && v.published);',
    1
)
s = s.replace(
    '      const ids=new Set(state.videos.filter(v=>v.productId===p.id).map(v=>v.conceptId));',
    '      const ids=new Set(state.videos.filter(v=>v.productId===p.id && v.published).map(v=>v.conceptId));',
    1
)

# Insert a visual Sales Angles tab before Concepts.
concept_block = '''    if(tab==="concepts"){
      const ids=new Set(state.videos.filter(v=>v.productId===p.id && v.published).map(v=>v.conceptId));'''
angle_block = '''    if(tab==="angles"){
      const published=state.videos.filter(v=>v.productId===p.id && v.published && String(v.angle||"").trim());
      const groups=new Map();
      published.forEach(v=>{
        const key=String(v.angle||"").trim();
        if(!groups.has(key)) groups.set(key,{name:key,videos:[],views:0,comments:0,sales:0,best:0});
        const g=groups.get(key);g.videos.push(v);g.views+=Number(v.views||0);g.comments+=Number(v.comments||0);g.sales+=Number(v.sales||0);g.best=Math.max(g.best,Number(v.views||0));
      });
      const list=[...groups.values()].sort((a,b)=>b.views-a.views || b.sales-a.sales);
      return `<div class="section-title"><div><h2>Ángulos de venta probados</h2><p>${list.length} ángulo${list.length===1?'':'s'} contabilizado${list.length===1?'':'s'} a partir de vídeos publicados.</p></div></div>
      ${list.length?`<div class="grid cols-3">${list.map(g=>`<div class="card pad"><div class="concept-name">${esc(g.name)}</div><div class="concept-desc">Rendimiento acumulado de este ángulo dentro de ${esc(p.name)}.</div><div class="concept-stats"><div class="concept-stat"><b>${g.videos.length}</b><span>Publicados</span></div><div class="concept-stat"><b>${fmt(g.views)}</b><span>Views</span></div><div class="concept-stat"><b>${fmt(Math.round(g.views/Math.max(g.videos.length,1)))}</b><span>Media</span></div></div><div class="concept-stats" style="margin-top:8px"><div class="concept-stat"><b>${fmt(g.best)}</b><span>Mejor</span></div><div class="concept-stat"><b>${g.comments}</b><span>Comentarios</span></div><div class="concept-stat"><b>${g.sales}</b><span>Ventas</span></div></div><div class="card-actions" style="margin-top:12px"><button class="btn small primary" data-action="use-sales-angle" data-angle="${esc(g.name)}">Usar en ChatGPT</button></div></div>`).join("")}</div>`:`<div class="empty"><b>Aún no hay ángulos de venta probados</b><span>Cuando publiques un vídeo y rellenes “Ángulo de venta”, aparecerá aquí automáticamente.</span></div>`}`;
    }
'''
if angle_block.strip() not in s:
    replace_once(concept_block, angle_block + concept_block, 'sales angle tab')

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

# Avatars: delete from the current library while preserving historical published-test labels.
replace_once(
    '      <div class="card-actions" style="margin-top:11px"><button class="btn small ${sel?\'green\':\'primary\'}" data-select-avatar="${a.id}" data-product-id="${pid}">${sel?\'Seleccionado ✓\':\'Seleccionar para ChatGPT\'}</button></div>',
    '      <div class="card-actions" style="margin-top:11px"><button class="btn small ${sel?\'green\':\'primary\'}" data-select-avatar="${a.id}" data-product-id="${pid}">${sel?\'Seleccionado ✓\':\'Seleccionar para ChatGPT\'}</button><button class="btn small danger" data-action="delete-avatar" data-product-id="${pid}" data-avatar-id="${a.id}">Eliminar</button></div>',
    'avatar delete button'
)

# Historical avatar snapshots survive avatar deletion.
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

# Recalculation is fully derived from published creatives, never stale manual counters.
replace_once(
    '    p.conceptsTested=new Set(vs.map(v=>v.conceptId).filter(Boolean)).size || p.conceptsTested;\n    p.avatarsTested=new Set(vs.map(v=>v.avatarId).filter(Boolean)).size || p.avatarsTested;\n    p.anglesTested=new Set(vs.map(v=>v.angle).filter(Boolean)).size || p.anglesTested;',
    '    p.conceptsTested=new Set(vs.map(v=>v.conceptId).filter(Boolean)).size;\n    p.avatarsTested=new Set(vs.map(v=>v.avatarId||v.avatarName).filter(Boolean)).size;\n    p.anglesTested=new Set(vs.map(v=>String(v.angle||"").trim()).filter(Boolean)).size;',
    'published derived counters'
)

# Store the avatar name as a snapshot when publishing.
replace_once(
    '      const v={id:uid("v"),productId:pid,title:document.getElementById("f-title").value||"Creativo publicado",conceptId:document.getElementById("f-concept").value||null,avatarId:document.getElementById("f-avatar").value||null,angle:document.getElementById("f-angle").value||"",published:true,views:Number(document.getElementById("f-views").value)||0,comments:Number(document.getElementById("f-comments").value)||0,sales:Number(document.getElementById("f-sales").value)||0,parentId:document.getElementById("f-parent").value||null,variation:document.getElementById("f-variation").value||"Original",createdAt:now()};',
    '      const selectedAvatarId=document.getElementById("f-avatar").value||null;\n      const selectedAvatar=(product(pid)?.avatars||[]).find(a=>a.id===selectedAvatarId);\n      const v={id:uid("v"),productId:pid,title:document.getElementById("f-title").value||"Creativo publicado",conceptId:document.getElementById("f-concept").value||null,avatarId:selectedAvatarId,avatarName:selectedAvatar?.name||"",angle:document.getElementById("f-angle").value||"",published:true,views:Number(document.getElementById("f-views").value)||0,comments:Number(document.getElementById("f-comments").value)||0,sales:Number(document.getElementById("f-sales").value)||0,parentId:document.getElementById("f-parent").value||null,variation:document.getElementById("f-variation").value||"Original",createdAt:now()};',
    'avatar snapshot on publish'
)

# Interactive handlers: safe delete + reuse a proven angle in ChatGPT context.
needle = '    else if(a==="upload-asset") uploadAssetModal(t.dataset.productId);'
insert = '''    else if(a==="delete-avatar"){
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
    else if(a==="use-sales-angle"){
      const angle=t.dataset.angle||"";
      state.context.productId=state.ui.openProductId||state.context.productId;
      const line=`Ángulo de venta: ${angle}.`;
      if(!String(state.context.instruction||"").includes(line))state.context.instruction=[state.context.instruction,line].filter(Boolean).join(" ");
      save();render();toast("Ángulo añadido al contexto de ChatGPT");
    }
    else if(a==="upload-asset") uploadAssetModal(t.dataset.productId);'''
replace_once(needle, insert, 'delete and angle handlers')

path.write_text(s, encoding='utf-8')
print('Testing workspace enhancements applied')
