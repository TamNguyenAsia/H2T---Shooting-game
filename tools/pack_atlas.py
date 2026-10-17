# Gộp ảnh trong public/assets thành vài trang atlas WebP (trim viền trong suốt + xếp theo kệ)
import os, sys, json
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
PAGE = 2048; PAD = 2
groups = {}
for root, _, files in os.walk(src):
    for f in files:
        if not f.endswith('.webp'): continue
        rel = os.path.relpath(os.path.join(root, f), src).replace(os.sep, '/')
        g = 'icons' if rel.endswith('i.webp') or rel.startswith('items/') else rel.split('/')[1] if rel.startswith('eq/') else rel.split('/')[0]
        groups.setdefault(g, []).append(rel)
os.makedirs(dst, exist_ok=True)
frames, pages = {}, []
for g, rels in sorted(groups.items()):
    items = []
    for rel in rels:
        im = Image.open(os.path.join(src, rel)).convert('RGBA'); bb = im.getbbox() or (0, 0, 1, 1)
        items.append((rel, im.crop(bb), bb, im.size))
    items.sort(key=lambda t: -t[1].size[1])
    page = None
    def newpage():
        global page
        page = {'im': Image.new('RGBA', (PAGE, PAGE)), 'x': 0, 'y': 0, 'row': 0, 'maxx': 0, 'maxy': 0, 'name': f'{g}{sum(1 for p in pages if p["g"]==g)}', 'g': g}
        pages.append(page)
    newpage()
    for rel, cr, bb, full in items:
        w, h = cr.size
        if page['x'] + w > PAGE: page['x'] = 0; page['y'] += page['row'] + PAD; page['row'] = 0
        if page['y'] + h > PAGE: newpage()
        x, y = page['x'], page['y']; page['im'].paste(cr, (x, y))
        page['x'] += w + PAD; page['row'] = max(page['row'], h); page['maxx'] = max(page['maxx'], x + w); page['maxy'] = max(page['maxy'], y + h)
        frames[rel] = [page['name'], x, y, w, h, bb[0], bb[1], full[0], full[1]]
names = []
for p in pages:
    im = p['im'].crop((0, 0, p['maxx'], p['maxy'])); fn = p['name'] + '.webp'
    im.save(os.path.join(dst, fn), 'WEBP', quality=90, method=4); names.append(fn)
    print(fn, im.size, os.path.getsize(os.path.join(dst, fn)) // 1024, 'KB')
with open(os.path.join(dst, 'atlas.js'), 'w') as f:
    f.write('/* Bản đồ atlas do tools/pack_atlas.py sinh ra. Khung: [trang, x, y, w, h, lệch x, lệch y, rộng gốc, cao gốc] */\n')
    f.write('window.H2T_ATLAS = ' + json.dumps({'frames': frames}, separators=(',', ':')) + ';\n')
print(len(frames), 'frames ->', len(names), 'pages')
