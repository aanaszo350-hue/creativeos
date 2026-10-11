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

# Add editable product-level test knowledge and safe delete controls.
runpy.run_path('scripts/enhance_testing_workspace.py', run_name='__main__')

s = index.read_text(encoding='utf-8')

meta = '<meta name="creativeos-build" content="unified-v2" />'
if meta not in s:
    s = s.replace('<meta name="theme-color" content="#090b10" />', '<meta name="theme-color" content="#090b10" />\n  ' + meta)

css_link = '<link rel="stylesheet" href="./creativeos-enhancements.css?v=3" />'
ux_css_link = '<link rel="stylesheet" href="./creativeos-ux-v4.css?v=1" />'
intel_css_link = '<link rel="stylesheet" href="./creativeos-intelligence.css?v=1" />'
intel_crud_css_link = '<link rel="stylesheet" href="./creativeos-intelligence-crud.css?v=1" />'
cloud_js_link = '<script src="./creativeos-cloud.js?v=2"></script>'
if css_link not in s:
    s = s.replace('</head>', '  ' + css_link + '\n</head>')
if ux_css_link not in s:
    s = s.replace('</head>', '  ' + ux_css_link + '\n</head>')
if intel_css_link not in s:
    s = s.replace('</head>', '  ' + intel_css_link + '\n</head>')
if intel_crud_css_link not in s:
    s = s.replace('</head>', '  ' + intel_crud_css_link + '\n</head>')
# Load cloud/media bridge in <head> so it can observe localStorage writes from the main app.
if cloud_js_link not in s:
    s = s.replace('</head>', '  ' + cloud_js_link + '\n</head>')

shell = '<div id="conceptEditor"><div class="ce-modal"><div id="ceContent"></div></div></div>'
js_link = '<script src="./creativeos-enhancements.js?v=3"></script>'
ux_js_link = '<script src="./creativeos-ux-v4.js?v=1"></script>'
intel_js_link = '<script src="./creativeos-intelligence.js?v=1"></script>'
intel_crud_js_link = '<script src="./creativeos-intelligence-crud.js?v=1"></script>'
if shell not in s:
    s = s.replace('</body>', '  ' + shell + '\n  ' + js_link + '\n  ' + ux_js_link + '\n  ' + intel_js_link + '\n  ' + intel_crud_js_link + '\n</body>')
else:
    if js_link not in s:
        s = s.replace('</body>', '  ' + js_link + '\n</body>')
    if ux_js_link not in s:
        s = s.replace('</body>', '  ' + ux_js_link + '\n</body>')
    if intel_js_link not in s:
        s = s.replace('</body>', '  ' + intel_js_link + '\n</body>')
    if intel_crud_js_link not in s:
        s = s.replace('</body>', '  ' + intel_crud_js_link + '\n</body>')

# Production must be a single application document, not an iframe wrapper.
checks = {
    'no iframe wrapper': 'id="appframe"' not in s,
    'assets workspace': 'function assetsPage()' in s,
    'enhancement script': 'creativeos-enhancements.js?v=3' in s,
    'workflow center': 'creativeos-ux-v4.js?v=1' in s,
    'cloud media bridge': 'creativeos-cloud.js?v=2' in s,
    'intelligence styles': 'creativeos-intelligence.css?v=1' in s,
    'intelligence workspace': 'creativeos-intelligence.js?v=1' in s,
    'intelligence crud styles': 'creativeos-intelligence-crud.css?v=1' in s,
    'intelligence crud controls': 'creativeos-intelligence-crud.js?v=1' in s,
    'editable sales angles': 'data-action="add-sales-angle"' in s and 'data-action="edit-sales-angle"' in s,
    'manual tested concepts': 'data-action="add-tested-concept"' in s,
    'delete controls': 'data-action="delete-asset"' in s and 'data-action="delete-avatar"' in s,
}
failed = [k for k, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Refusing build: ' + ', '.join(failed))

index.write_text(s, encoding='utf-8')
print('CreativeOS unified-v2 + durable media bridge + editable marketing intelligence built successfully')
