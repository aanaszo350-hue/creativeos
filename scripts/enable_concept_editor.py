from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

css = '<link rel="stylesheet" href="./concept-editor.css?v=2">'
overlay = '<div id="conceptEditor"><div class="ce-modal"><div id="ceContent"></div></div></div>'
script = '<script src="./concept-editor.js?v=2"></script>'

if css not in s:
    s = s.replace('</head>', css + '</head>')
if overlay not in s:
    s = s.replace('</body>', overlay + script + '</body>')
elif script not in s:
    s = s.replace('</body>', script + '</body>')

p.write_text(s, encoding='utf-8')
