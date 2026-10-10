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

# Add published-test analytics, sales-angle views and safe delete controls.
runpy.run_path('scripts/enhance_testing_workspace.py', run_name='__main__')

s = index.read_text(encoding='utf-8')

meta = '<meta name="creativeos-build" content="unified-v2" />'
if meta not in s:
    s = s.replace('<meta name="theme-color" content="#090b10" />', '<meta name="theme-color" content="#090b10" />\n  ' + meta)

css_link = '<link rel="stylesheet" href="./creativeos-enhancements.css?v=3" />'
ux_css_link = '<link rel="stylesheet" href="./creativeos-ux-v4.css?v=1" />'
if css_link not in s:
    s = s.replace('</head>', '  ' + css_link + '\n</head>')
if ux_css_link not in s:
    s = s.replace('</head>', '  ' + ux_css_link + '\n</head>')

shell = '<div id="conceptEditor"><div class="ce-modal"><div id="ceContent"></div></div></div>'
js_link = '<script src="./creativeos-enhancements.js?v=3"></script>'
ux_js_link = '<script src="./creativeos-ux-v4.js?v=1"></script>'
if shell not in s:
    s = s.replace('</body>', '  ' + shell + '\n  ' + js_link + '\n  ' + ux_js_link + '\n</body>')
else:
    if js_link not in s:
        s = s.replace('</body>', '  ' + js_link + '\n</body>')
    if ux_js_link not in s:
        s = s.replace('</body>', '  ' + ux_js_link + '\n</body>')

# Production must be a single application document, not an iframe wrapper.
if 'id="appframe"' in s:
    raise SystemExit('Refusing build: iframe wrapper detected')
if 'function assetsPage()' not in s:
    raise SystemExit('Refusing build: Assets page missing')
if 'creativeos-enhancements.js?v=3' not in s:
    raise SystemExit('Refusing build: enhancement script missing')
if 'creativeos-ux-v4.js?v=1' not in s:
    raise SystemExit('Refusing build: workflow center missing')
if 'Ángulos de venta probados' not in s:
    raise SystemExit('Refusing build: sales-angle analytics missing')
if 'data-action="delete-asset"' not in s or 'data-action="delete-avatar"' not in s:
    raise SystemExit('Refusing build: delete controls missing')

index.write_text(s, encoding='utf-8')
print('CreativeOS unified-v2 + UX v4 + testing workspace built successfully')
