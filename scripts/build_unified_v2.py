from pathlib import Path
import runpy

base = Path('base.html')
index = Path('index.html')
if not base.exists():
    raise SystemExit('base.html not found')

# Start every production build from the known-good application source.
index.write_text(base.read_text(encoding='utf-8'), encoding='utf-8')

# Apply the product -> category -> asset workspace directly to the production app.
runpy.run_path('scripts/apply_assets_patch.py', run_name='__main__')

s = index.read_text(encoding='utf-8')

meta = '<meta name="creativeos-build" content="unified-v2" />'
if meta not in s:
    s = s.replace('<meta name="theme-color" content="#090b10" />', '<meta name="theme-color" content="#090b10" />\n  ' + meta)

css_link = '<link rel="stylesheet" href="./creativeos-enhancements.css?v=3" />'
if css_link not in s:
    s = s.replace('</head>', '  ' + css_link + '\n</head>')

shell = '<div id="conceptEditor"><div class="ce-modal"><div id="ceContent"></div></div></div>'
js_link = '<script src="./creativeos-enhancements.js?v=3"></script>'
if shell not in s:
    s = s.replace('</body>', '  ' + shell + '\n  ' + js_link + '\n</body>')
elif js_link not in s:
    s = s.replace('</body>', '  ' + js_link + '\n</body>')

# Production must be a single application document, not an iframe wrapper.
if 'id="appframe"' in s:
    raise SystemExit('Refusing build: iframe wrapper detected')
if 'function assetsPage()' not in s:
    raise SystemExit('Refusing build: Assets page missing')
if 'creativeos-enhancements.js?v=3' not in s:
    raise SystemExit('Refusing build: enhancement script missing')

index.write_text(s, encoding='utf-8')
print('CreativeOS unified-v2 built successfully')
