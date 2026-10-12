from pathlib import Path
import runpy

base = Path('base.html')
index = Path('index.html')
if not base.exists():
    raise SystemExit('base.html not found')

# Start every production build from the known-good application source.
index.write_text(base.read_text(encoding='utf-8'), encoding='utf-8')

# Keep the strong existing product workspace and editable product knowledge.
runpy.run_path('scripts/apply_assets_patch.py', run_name='__main__')
runpy.run_path('scripts/enhance_testing_workspace.py', run_name='__main__')

s = index.read_text(encoding='utf-8')

meta = '<meta name="creativeos-build" content="unified-v3-workflow-intelligence" />'
s = s.replace('<meta name="creativeos-build" content="unified-v2" />', meta)
if meta not in s:
    s = s.replace('<meta name="theme-color" content="#090b10" />', '<meta name="theme-color" content="#090b10" />\n  ' + meta)

css_links = [
    '<link rel="stylesheet" href="./creativeos-enhancements.css?v=3" />',
    '<link rel="stylesheet" href="./creativeos-ux-v4.css?v=1" />',
    '<link rel="stylesheet" href="./creativeos-intelligence.css?v=2" />',
    '<link rel="stylesheet" href="./creativeos-intelligence-v3.css?v=1" />',
    '<link rel="stylesheet" href="./creativeos-intelligence-crud.css?v=2" />',
]
cloud_js_link = '<script src="./creativeos-cloud.js?v=2"></script>'
for link in (*css_links, cloud_js_link):
    if link not in s:
        s = s.replace('</head>', '  ' + link + '\n</head>')

shell = '<div id="conceptEditor"><div class="ce-modal"><div id="ceContent"></div></div></div>'
js_links = [
    '<script src="./creativeos-enhancements.js?v=3"></script>',
    '<script src="./creativeos-ux-v4.js?v=1"></script>',
    '<script src="./creativeos-intelligence-core-v3.js?v=1"></script>',
    '<script src="./creativeos-intelligence-crud.js?v=2"></script>',
]
if shell not in s:
    s = s.replace('</body>', '  ' + shell + '\n  ' + '\n  '.join(js_links) + '\n</body>')
else:
    for link in js_links:
        if link not in s:
            s = s.replace('</body>', '  ' + link + '\n</body>')

# Production uses exactly one Intelligence renderer: v3.
checks = {
    'no iframe wrapper': 'id="appframe"' not in s,
    'assets workspace': 'function assetsPage()' in s,
    'enhancement script': 'creativeos-enhancements.js?v=3' in s,
    'workflow center': 'creativeos-ux-v4.js?v=1' in s,
    'cloud media bridge': 'creativeos-cloud.js?v=2' in s,
    'intelligence base styles': 'creativeos-intelligence.css?v=2' in s,
    'intelligence hierarchy styles': 'creativeos-intelligence-v3.css?v=1' in s,
    'workflow intelligence core': 'creativeos-intelligence-core-v3.js?v=1' in s,
    'old v2 intelligence core disabled': 'creativeos-intelligence-core-v2.js?v=2' not in s,
    'old v1 intelligence disabled': 'creativeos-intelligence.js?v=1' not in s,
    'intelligence crud styles': 'creativeos-intelligence-crud.css?v=2' in s,
    'intelligence crud controls': 'creativeos-intelligence-crud.js?v=2' in s,
    'editable sales angles': 'data-action="add-sales-angle"' in s and 'data-action="edit-sales-angle"' in s,
    'manual tested concepts': 'data-action="add-tested-concept"' in s,
    'delete controls': 'data-action="delete-asset"' in s and 'data-action="delete-avatar"' in s,
}
failed = [k for k, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Refusing build: ' + ', '.join(failed))

index.write_text(s, encoding='utf-8')
print('CreativeOS unified-v3 workflow intelligence built successfully')
