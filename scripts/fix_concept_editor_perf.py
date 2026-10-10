from pathlib import Path

js_path = Path('concept-editor.js')
idx_path = Path('index.html')

s = js_path.read_text()
old1 = "doc.querySelectorAll('[data-action=\"concept-detail\"]').forEach(b=>{b.textContent='Editar ficha'});"
new1 = "doc.querySelectorAll('[data-action=\"concept-detail\"]').forEach(b=>{if(b.textContent!=='Editar ficha') b.textContent='Editar ficha'});"
old2 = "if(x)x.textContent=`${(c.videoRefs||[]).length} vídeos`;"
new2 = "if(x){const label=`${(c.videoRefs||[]).length} vídeos`;if(x.textContent!==label)x.textContent=label;}"

if old1 in s:
    s = s.replace(old1, new1)
if old2 in s:
    s = s.replace(old2, new2)

js_path.write_text(s)

idx = idx_path.read_text()
idx = idx.replace('concept-editor.js?v=2', 'concept-editor.js?v=3')
idx = idx.replace('concept-editor.css?v=2', 'concept-editor.css?v=3')
idx_path.write_text(idx)
