from pathlib import Path
import re

path = Path("index.html")
s = path.read_text(encoding="utf-8")

css = r'''
/* Assets workspace — product → category → file */
.assets-shell{display:grid;grid-template-columns:230px minmax(0,1fr) 300px;gap:14px;align-items:start}
.assets-side,.assets-context{border:1px solid var(--line);background:linear-gradient(180deg,#10151e,#0c1017);border-radius:16px;padding:14px;position:sticky;top:96px;max-height:calc(100vh - 125px);overflow:auto}
.assets-side-title{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted2);margin:4px 5px 9px}
.assets-nav{display:grid;gap:5px;margin-bottom:16px}
.assets-nav-btn{width:100%;border:1px solid transparent;background:transparent;color:#a4aec0;border-radius:10px;padding:9px 10px;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;text-align:left;font-size:10px}
.assets-nav-btn:hover{background:#131924;border-color:#222c3d;color:#fff}
.assets-nav-btn.active{background:linear-gradient(90deg,rgba(79,124,255,.18),rgba(141,98,255,.08));border-color:rgba(79,124,255,.28);color:#fff}
.assets-nav-main{display:flex;gap:8px;align-items:center;min-width:0}.assets-nav-main span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.assets-count{font-size:8px;color:#8490a6;border:1px solid #2a3448;background:#0b0f16;border-radius:999px;padding:3px 6px;flex:0 0 auto}
.assets-center{min-width:0}
.assets-top{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:12px}
.assets-top h2{font-size:16px;margin:0 0 4px}.assets-top p{margin:0;color:var(--muted);font-size:10px}
.assets-search{width:100%;border:1px solid var(--line2);background:#0d1119;color:#e9eef8;border-radius:11px;padding:10px 12px;outline:none;margin-bottom:12px}
.assets-search:focus{border-color:#516baf;box-shadow:0 0 0 3px rgba(79,124,255,.09)}
.assets-center .asset-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.assets-center .asset-preview{height:165px}
.assets-context h3{font-size:13px;margin:2px 0 12px}
.assets-context-row{border-top:1px solid var(--line);padding:11px 0}.assets-context-row:first-of-type{border-top:0}
.assets-context-label{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted2);margin-bottom:5px}
.assets-context-value{font-size:10px;color:#d8dfed;line-height:1.45}
.assets-selected-list{display:grid;gap:6px}.assets-selected-item{border:1px solid #273149;background:#0b0f16;border-radius:9px;padding:7px 8px;font-size:9px;color:#c9d3e6}
.assets-empty{border:1px dashed #2b3549;border-radius:15px;padding:34px 20px;text-align:center;color:var(--muted);background:#0c1017;grid-column:1/-1}.assets-empty b{display:block;color:#dce3ef;font-size:11px;margin-bottom:5px}.assets-empty span{font-size:9px}
@media(max-width:1200px){.assets-shell{grid-template-columns:210px minmax(0,1fr)}.assets-context{grid-column:1/-1;position:static;max-height:none}.assets-center .asset-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:850px){.assets-shell{grid-template-columns:1fr}.assets-side,.assets-context{position:static;max-height:none}.assets-center .asset-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.assets-center .asset-grid{grid-template-columns:1fr}}
'''
if "/* Assets workspace — product → category → file */" not in s:
    s = s.replace(".mobile-menu{display:none}\n", ".mobile-menu{display:none}\n" + css + "\n")

new_assets = r'''  function assetsPage(){
    const categories=[
      ["Producto","Producto"],["Producto en uso","Producto en uso"],["Packaging","Packaging"],
      ["Avatar","Avatar"],["Ropa","Ropa"],["Fondo","Fondo"],["Ambiente","Ambiente"]
    ];
    const activePid=state.ui.assetsProductId || state.context.productId || state.products[0]?.id;
    const p=product(activePid) || state.products[0];
    if(!p) return shell(`<div class="empty"><b>Sin productos</b><span>Crea un producto antes de guardar referencias.</span></div>`,"Assets");
    const activeCat=state.ui.assetsCategory || categories[0][0];
    const query=(state.ui.assetSearch||"").trim().toLowerCase();
    const allAssets=state.products.flatMap(prod=>(prod.assets||[]).map(a=>({...a,productId:prod.id,productName:prod.name})));
    let shown=(p.assets||[]).filter(a=>a.type===activeCat);
    if(query){
      shown=allAssets.filter(a=>[a.name,a.type,a.productName].join(" ").toLowerCase().includes(query));
    }
    const selected=(state.context.assetIds||[]).map(id=>allAssets.find(a=>a.id===id)).filter(Boolean);
    const assetCards=shown.length?shown.map(a=>{
      const sel=(state.context.assetIds||[]).includes(a.id);
      const media=a.src?(a.src.startsWith("data:video")?`<video src="${a.src}" muted></video>`:`<img src="${a.src}" alt="">`):`<div class="asset-fallback">${esc((a.type||"A").slice(0,1))}</div>`;
      return `<div class="asset-card">
        <div class="asset-preview">${media}</div>
        <div class="asset-check ${sel?'selected':''}" data-select-asset="${a.id}" data-product-id="${a.productId||p.id}">${sel?'✓':'+'}</div>
        <div class="asset-meta"><b>${esc(a.name)}</b><span>${query?esc(a.productName)+" · ":""}${esc(a.type)}</span></div>
      </div>`;
    }).join(""):`<div class="assets-empty"><b>${query?'No hay resultados':'Esta categoría está vacía'}</b><span>${query?'Prueba otra búsqueda.':'Añade la primera referencia de este tipo para '+esc(p.name)+'.'}</span></div>`;
    return shell(`
      <div class="hero"><div><div class="eyebrow">Reference library</div><h1>Assets</h1><p>Producto → categoría → archivo. Cada referencia queda ordenada dentro de su producto y puede añadirse al contexto de ChatGPT.</p></div><button class="btn primary" data-action="upload-asset" data-product-id="${p.id}">${icon("upload")} Añadir asset</button></div>
      ${contextStrip()}
      <div style="height:14px"></div>
      <div class="assets-shell">
        <aside class="assets-side">
          <div class="assets-side-title">Productos</div>
          <div class="assets-nav">${state.products.map(prod=>`<button class="assets-nav-btn ${prod.id===p.id?'active':''}" data-action="assets-pick-product" data-product-id="${prod.id}"><span class="assets-nav-main"><span>◫</span><span>${esc(prod.name)}</span></span><span class="assets-count">${(prod.assets||[]).length}</span></button>`).join("")}</div>
          <div class="assets-side-title">Categorías</div>
          <div class="assets-nav">${categories.map(([key,label])=>`<button class="assets-nav-btn ${!query&&key===activeCat?'active':''}" data-action="assets-pick-category" data-category="${esc(key)}"><span class="assets-nav-main"><span>${key==="Producto"?'◆':key==="Producto en uso"?'◈':key==="Packaging"?'▣':key==="Avatar"?'●':key==="Ropa"?'◇':key==="Fondo"?'▤':'▧'}</span><span>${esc(label)}</span></span><span class="assets-count">${(p.assets||[]).filter(a=>a.type===key).length}</span></button>`).join("")}</div>
        </aside>
        <section class="assets-center">
          <input class="assets-search" id="assetGlobalSearch" value="${esc(state.ui.assetSearch||"")}" placeholder="Buscar asset por nombre, producto o categoría...">
          <div class="assets-top"><div><h2>${query?'Resultados de búsqueda':esc(p.name)+' · '+esc(activeCat)}</h2><p>${shown.length} archivo${shown.length===1?'':'s'}${query?' en toda la biblioteca':' en esta categoría'}</p></div><button class="btn" data-action="upload-asset" data-product-id="${p.id}">${icon("plus")} Añadir</button></div>
          <div class="asset-grid">${assetCards}</div>
        </section>
        <aside class="assets-context">
          <h3>Contexto ChatGPT</h3>
          <div class="assets-context-row"><div class="assets-context-label">Producto</div><div class="assets-context-value">${esc(product(state.context.productId)?.name||p.name)}</div></div>
          <div class="assets-context-row"><div class="assets-context-label">Concepto</div><div class="assets-context-value">${esc(concept(state.context.conceptId)?.name||"Ninguno")}</div></div>
          <div class="assets-context-row"><div class="assets-context-label">Avatar</div><div class="assets-context-value">${esc(avatarById(state.context.avatarId)?.name||"Ninguno")}</div></div>
          <div class="assets-context-row"><div class="assets-context-label">Assets seleccionados</div><div class="assets-selected-list">${selected.length?selected.map(a=>`<div class="assets-selected-item">${esc(a.name)} · ${esc(a.productName)}</div>`).join(""):`<div class="assets-context-value">Ninguno</div>`}</div></div>
          <button class="btn primary" style="width:100%;margin-top:8px" data-action="copy-context">Copiar contexto completo</button>
          <button class="btn ghost" style="width:100%;margin-top:7px" data-action="clear-context">Limpiar selección</button>
        </aside>
      </div>
    `,"Assets");
  }

'''
pat = re.compile(r"  function assetsPage\(\)\{.*?\n  function treePage\(\)\{", re.S)
m = pat.search(s)
if not m:
    raise SystemExit("assetsPage block not found")
s = s[:m.start()] + new_assets + "  function treePage(){" + s[m.end():]

needle = '    const tp=document.getElementById("treeProduct");\n'
insert = '    const ags=document.getElementById("assetGlobalSearch");\n    if(ags) ags.addEventListener("input",e=>{state.ui.assetSearch=e.target.value;save();render();setTimeout(()=>{const x=document.getElementById("assetGlobalSearch");if(x){x.focus();x.setSelectionRange(x.value.length,x.value.length);}},0);});\n'
if 'const ags=document.getElementById("assetGlobalSearch")' not in s:
    s = s.replace(needle, insert + needle)

needle2 = '    else if(a==="upload-asset") uploadAssetModal(t.dataset.productId);\n'
insert2 = '    else if(a==="assets-pick-product"){state.ui.assetsProductId=t.dataset.productId;state.ui.assetSearch="";state.context.productId=t.dataset.productId;save();render();}\n    else if(a==="assets-pick-category"){state.ui.assetsCategory=t.dataset.category;state.ui.assetSearch="";save();render();}\n'
if 'a==="assets-pick-product"' not in s:
    s = s.replace(needle2, insert2 + needle2)

path.write_text(s, encoding="utf-8")
print("Assets layout applied")
