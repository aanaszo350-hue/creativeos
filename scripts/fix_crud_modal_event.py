from pathlib import Path

p = Path('creativeos-intelligence-crud.js')
s = p.read_text(encoding='utf-8')
old = '<div class="cix-backdrop" data-cix-close>'
new = '<div class="cix-backdrop">'

if old in s:
    s = s.replace(old, new, 1)
    p.write_text(s, encoding='utf-8')
    print('Fixed CRUD modal backdrop click ownership')
elif new in s:
    print('CRUD modal backdrop already fixed')
else:
    raise SystemExit('Expected CRUD modal backdrop markup not found')
