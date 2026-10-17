# Vẽ icon dây chuyền, vòng tay (5 kiểu x 6 bậc) và nguyên liệu bằng PIL, vẽ 512px rồi thu nhỏ 160px cho mịn.
import os, sys, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops
OUT = sys.argv[1]; S = 512; FIN = 160
TIER = ['#c3bad0', '#f0c94a', '#a77bff', '#e08a3c', '#49c6ff', '#ff4d6d']
METAL = [('#8a7e74', '#d9d0c6', '#4a423c'), ('#c8961e', '#ffe9a0', '#6a4a08'), ('#8f8ab8', '#ecebff', '#3e3a62'),
         ('#c0704a', '#ffd2b8', '#5a2a16'), ('#7fb8d8', '#f2fbff', '#2a5a78'), ('#d4a12a', '#fff3c0', '#7a1a26')]
GEM = ['#9fb0c8', '#ff4058', '#8a4dff', '#ff8a2a', '#36d0ff', '#ff2a5a']
def hx(c): c = c.lstrip('#'); return tuple(int(c[i:i+2], 16) for i in (0, 2, 4))
def mix(a, b, t): a, b = hx(a) if isinstance(a, str) else a, hx(b) if isinstance(b, str) else b; return tuple(int(a[i] + (b[i]-a[i])*t) for i in range(3))
OL = (28, 16, 36, 255)

def radial(size, cx, cy, r, c0, c1):
    im = Image.new('RGBA', (size, size)); px = im.load()
    for y in range(0, size, 2):
        for x in range(0, size, 2):
            d = min(1, math.hypot(x-cx, y-cy)/r); c = mix(c0, c1, d)
            for dy in (0, 1):
                for dx in (0, 1):
                    if x+dx < size and y+dy < size: px[x+dx, y+dy] = c + (255,)
    return im
def shape_fill(base, drawfn, c0, c1, light=(0.35, 0.3), r=None):
    m = Image.new('L', (S, S)); drawfn(ImageDraw.Draw(m))
    bb = m.getbbox()
    if not bb: return
    cx = bb[0] + (bb[2]-bb[0])*light[0]; cy = bb[1] + (bb[3]-bb[1])*light[1]; rr = r or max(bb[2]-bb[0], bb[3]-bb[1])*0.85
    g = radial(S, cx, cy, rr, c0, c1); base.paste(g, (0, 0), m)
def outline(base, drawfn, w=7):
    m = Image.new('L', (S, S)); drawfn(ImageDraw.Draw(m))
    ed = m.filter(ImageFilter.MaxFilter(w*2+1)); ring = ImageChops.subtract(ed, m)
    base.paste(Image.new('RGBA', (S, S), OL), (0, 0), ring)
def part(base, drawfn, c0, c1, ol=6, light=(0.35, 0.3)):
    outline(base, drawfn, ol); shape_fill(base, drawfn, c0, c1, light)
def gem(base, cx, cy, r, col, kind='round'):
    c = hx(col); hi = mix(c, (255, 255, 255), .55); lo = mix(c, (0, 0, 0), .45)
    if kind == 'round':
        f = lambda d: d.ellipse((cx-r, cy-r, cx+r, cy+r), fill=255)
    elif kind == 'drop':
        f = lambda d: d.polygon([(cx, cy-r*1.35), (cx+r*.95, cy+r*.2), (cx+r*.6, cy+r*.85), (cx, cy+r*1.05), (cx-r*.6, cy+r*.85), (cx-r*.95, cy+r*.2)], fill=255)
    elif kind == 'heart':
        def f(d):
            d.ellipse((cx-r, cy-r*.8, cx+r*.05, cy+r*.25), fill=255); d.ellipse((cx-r*.05, cy-r*.8, cx+r, cy+r*.25), fill=255)
            d.polygon([(cx-r*.97, cy-r*.12), (cx+r*.97, cy-r*.12), (cx, cy+r*1.1)], fill=255)
    else:  # diamond
        f = lambda d: d.polygon([(cx, cy-r*1.2), (cx+r, cy), (cx, cy+r*1.2), (cx-r, cy)], fill=255)
    outline(base, f, max(4, int(r*.14))); shape_fill(base, f, hi, lo, (0.35, 0.28))
    d = ImageDraw.Draw(base)
    d.polygon([(cx-r*.15, cy-r*.55), (cx+r*.45, cy-r*.2), (cx+r*.1, cy+r*.05)], fill=mix(c, (255, 255, 255), .75) + (170,))
    d.ellipse((cx-r*.5, cy-r*.6, cx-r*.18, cy-r*.28), fill=(255, 255, 255, 230))
def glow(base, tier, cy=256, rad=210):
    if tier < 1: return
    c = hx(TIER[tier]); a = [0, 55, 85, 110, 140, 170][tier]
    g = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(g); d.ellipse((256-rad, cy-rad, 256+rad, cy+rad), fill=c + (a,))
    g = g.filter(ImageFilter.GaussianBlur(60)); base.alpha_composite(g)
def sparkles(base, tier, seed):
    if tier < 3: return
    rnd = random.Random(seed); d = ImageDraw.Draw(base); n = [0, 0, 0, 3, 5, 8][tier]
    for _ in range(n):
        x, y, r = rnd.randint(60, 452), rnd.randint(50, 460), rnd.randint(10, 22)
        col = (255, 255, 255, 235)
        d.polygon([(x, y-r), (x+r*.22, y-r*.22), (x+r, y), (x+r*.22, y+r*.22), (x, y+r), (x-r*.22, y+r*.22), (x-r, y), (x-r*.22, y-r*.22)], fill=col)
def halo(base, tier):
    if tier < 5: return
    g = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(g)
    d.ellipse((70, 60, 442, 470), outline=hx('#ffd36b') + (200,), width=10); g = g.filter(ImageFilter.GaussianBlur(3)); base.alpha_composite(g)
def finish(base): return base.resize((FIN, FIN), Image.LANCZOS)

# ---------- dây chuyền ----------
def chain_arc(base, t, cy0=110, depth=200, links=True, col=None):
    m0, m1, m2 = METAL[t]
    pts = [(256 + 170*math.cos(a), cy0 + depth*math.sin(a)) for a in [math.pi*(0.05 + 0.9*i/22) for i in range(23)]]
    d = ImageDraw.Draw(base)
    if links:
        for i, (x, y) in enumerate(pts[1:-1]):
            r = 13
            f = (lambda x=x, y=y: (lambda dd: dd.ellipse((x-r, y-r*.75, x+r, y+r*.75), fill=255)))()
            part(base, f, m1, m0, 4)
    else:
        d.line(pts, fill=hx(col or '#6a4a2a') + (255,), width=12, joint='curve')
    return pts
def necklace(typ, t):
    b = Image.new('RGBA', (S, S)); glow(b, t, 300); halo(b, t); m0, m1, m2 = METAL[t]; gc = GEM[t]
    if typ == 'pendant':
        pts = chain_arc(b, t); x, y = pts[11]
        part(b, lambda d: d.ellipse((x-22, y-6, x+22, y+40), fill=255), m1, m0, 5)
        gem(b, x, y+110, 62 + t*4, gc, 'drop')
        if t >= 2:
            for s in (-1, 1): gem(b, x + s*58, y+70, 16, TIER[t], 'round')
    elif typ == 'amulet':
        pts = chain_arc(b, t, links=False, col=METAL[t][2]); x, y = pts[11]; R = 92 + t*4
        part(b, lambda d: d.ellipse((x-R, y+20, x+R, y+20+2*R), fill=255), m1, m0, 7)
        part(b, lambda d: d.ellipse((x-R*.72, y+20+R*.28, x+R*.72, y+20+R*1.72), fill=255), mix(m0, '#000000', .1), m2, 4)
        gem(b, x, y+20+R, 40 + t*3, gc, 'diamond')
        if t >= 1:
            for k in range(8 if t >= 3 else 4):
                a = k*math.pi*2/(8 if t >= 3 else 4) + math.pi/4; gem(b, x + math.cos(a)*R*.86, y+20+R + math.sin(a)*R*.86, 10, TIER[t])
    elif typ == 'pearl':
        pts = [(256 + 165*math.cos(a), 110 + 190*math.sin(a)) for a in [math.pi*(0.06 + 0.88*i/16) for i in range(17)]]
        pc = mix('#fff8f0', TIER[t], .25 if t else 0)
        for i, (x, y) in enumerate(pts):
            r = 19 + (8 if i == 8 else 0)
            if i == 8: gem(b, x, y+30, 46 + t*4, gc, 'round'); continue
            part(b, (lambda x=x, y=y, r=r: (lambda d: d.ellipse((x-r, y-r, x+r, y+r), fill=255)))(), (255, 255, 255), mix(pc, '#7a6a80', .35), 4, (0.3, 0.25))
    elif typ == 'heart':
        pts = chain_arc(b, t); x, y = pts[11]
        R = 80 + t*4
        part(b, lambda d: (d.ellipse((x-R*1.15, y+30, x+R*.1, y+30+R*1.15), fill=255), d.ellipse((x-R*.1, y+30, x+R*1.15, y+30+R*1.15), fill=255),
                           d.polygon([(x-R*1.1, y+30+R*.7), (x+R*1.1, y+30+R*.7), (x, y+30+R*2.0)], fill=255)), m1, m0, 7)
        gem(b, x, y+30+R*.85, R*.62, gc, 'heart')
    else:  # fang
        pts = chain_arc(b, t, links=False, col='#5a3a22'); x, y = pts[11]
        for s, sz in ((-1, .7), (1, .7), (0, 1)):
            fx = x + s*62; fy = y + (10 if s else 18); L = 120*sz + t*6
            part(b, (lambda fx=fx, fy=fy, L=L: (lambda d: d.polygon([(fx-20, fy), (fx+20, fy), (fx+6, fy+L*.7), (fx, fy+L), (fx-8, fy+L*.6)], fill=255)))(), '#fffaf0', '#b8a888', 5)
            part(b, (lambda fx=fx, fy=fy: (lambda d: d.rectangle((fx-24, fy-12, fx+24, fy+8), fill=255)))(), m1, m0, 4)
        for s in (-1, 1): gem(b, x + s*120, y - 10, 15 + t, TIER[t])
        if t >= 2: gem(b, x, y + 5, 20, gc, 'diamond')
    sparkles(b, t, hash((typ, t)) & 0xffff); return finish(b)

# ---------- vòng tay ----------
def ellpts(cx, cy, rx, ry, n, a0=0):
    return [(cx + rx*math.cos(a0 + 2*math.pi*i/n), cy + ry*math.sin(a0 + 2*math.pi*i/n)) for i in range(n)]
def bracelet(typ, t):
    b = Image.new('RGBA', (S, S)); glow(b, t, 270); halo(b, t); m0, m1, m2 = METAL[t]; gc = GEM[t]
    cx, cy, RX, RY = 256, 280, 170, 110
    if typ in ('bangle', 'cuff'):
        th = 38 if typ == 'bangle' else 70
        def ring(d): d.ellipse((cx-RX, cy-RY, cx+RX, cy+RY), fill=255); d.ellipse((cx-RX+th, cy-RY+th*.7, cx+RX-th, cy+RY-th*.7), fill=0)
        part(b, ring, m1, m0, 7, (0.3, 0.2))
        d = ImageDraw.Draw(b); d.arc((cx-RX+10, cy-RY+8, cx+RX-10, cy+RY-8), 200, 330, fill=(255, 255, 255, 170), width=8)
        if typ == 'cuff':
            for i, (x, y) in enumerate(ellpts(cx, cy, RX-th/2, RY-th*.35, 12)):
                if y > cy - 10 and t >= 1: gem(b, x, y, 9 + t, TIER[t])
            gem(b, cx, cy + RY - th*.35, 42 + t*3, gc, 'diamond')
        else:
            n = [1, 1, 3, 3, 5, 5][t]
            for k in range(n):
                a = math.pi/2 + (k - (n-1)/2)*0.32; gem(b, cx + (RX-th/2)*math.cos(a), cy + (RY-th*.35)*math.sin(a), 22 if k == n//2 else 14, gc if k == n//2 else TIER[t])
    elif typ == 'beads':
        pts = ellpts(cx, cy, RX-15, RY-10, 18)
        for i, (x, y) in sorted(enumerate(pts), key=lambda p: p[1][1]):
            r = 26 if i % 3 else 30
            if i % 3 == 0: gem(b, x, y, r, gc if i % 6 == 0 else TIER[t])
            else: part(b, (lambda x=x, y=y, r=r: (lambda d: d.ellipse((x-r, y-r, x+r, y+r), fill=255)))(), m1, m0, 4)
    elif typ == 'chain':
        pts = ellpts(cx, cy, RX-10, RY-8, 16)
        for i, (x, y) in sorted(enumerate(pts), key=lambda p: p[1][1]):
            a = math.atan2(y-cy, x-cx) + math.pi/2; rx, ry = 30, 16
            def link(d, x=x, y=y, a=a):
                poly = [(x + rx*math.cos(q)*math.cos(a) - ry*math.sin(q)*math.sin(a), y + rx*math.cos(q)*math.sin(a) + ry*math.sin(q)*math.cos(a)) for q in [2*math.pi*k/24 for k in range(24)]]
                d.polygon(poly, fill=255)
                inner = [(x + rx*.55*math.cos(q)*math.cos(a) - ry*.35*math.sin(q)*math.sin(a), y + rx*.55*math.cos(q)*math.sin(a) + ry*.35*math.sin(q)*math.cos(a)) for q in [2*math.pi*k/24 for k in range(24)]]
                d.polygon(inner, fill=0)
            part(b, link, m1, m0, 4)
        gem(b, cx, cy + RY - 4, 30 + t*3, gc, 'round')
    else:  # charm
        def ring(d): d.ellipse((cx-RX, cy-RY, cx+RX, cy+RY), fill=255); d.ellipse((cx-RX+16, cy-RY+12, cx+RX-16, cy+RY-12), fill=0)
        part(b, ring, m1, m0, 6)
        charms = [(-0.55, 'star'), (0, 'gem'), (0.55, 'heart')] + ([(-1.0, 'gem2'), (1.0, 'gem2')] if t >= 3 else [])
        for off, kind in charms:
            a = math.pi/2 + off*0.6; x = cx + (RX-8)*math.cos(a); y = cy + (RY-6)*math.sin(a)
            d = ImageDraw.Draw(b); d.line((x, y, x, y+34), fill=hx(m2) + (255,), width=6)
            if kind == 'star':
                R = 30; poly = [(x + (R if k % 2 == 0 else R*.45)*math.cos(-math.pi/2 + k*math.pi/5), y+62 + (R if k % 2 == 0 else R*.45)*math.sin(-math.pi/2 + k*math.pi/5)) for k in range(10)]
                part(b, lambda dd, poly=poly: dd.polygon(poly, fill=255), m1, m0, 5)
            elif kind == 'heart': gem(b, x, y+60, 26, TIER[t], 'heart')
            elif kind == 'gem': gem(b, x, y+66, 30 + t*2, gc, 'drop')
            else: gem(b, x, y+56, 16, TIER[t])
    sparkles(b, t, hash((typ, t, 1)) & 0xffff); return finish(b)

# ---------- nguyên liệu ----------
def mats():
    out = {}
    b = Image.new('RGBA', (S, S)); glow(b, 1, 280, 200)  # vàng
    for i, (x, y) in enumerate([(200, 330), (312, 330), (256, 240)]):
        part(b, (lambda x=x, y=y: (lambda d: d.ellipse((x-95, y-95, x+95, y+95), fill=255)))(), '#ffe9a0', '#c8901e', 7)
        part(b, (lambda x=x, y=y: (lambda d: d.ellipse((x-62, y-62, x+62, y+62), fill=255)))(), '#ffd55a', '#e0a020', 4)
        d = ImageDraw.Draw(b); d.rectangle((x-12, y-42, x+12, y+42), fill=(200, 140, 30, 255)); d.rectangle((x-36, y-12, x+36, y+12), fill=(200, 140, 30, 255))
    out['gold'] = finish(b)
    b = Image.new('RGBA', (S, S)); glow(b, 4, 280, 180)  # đá cường hoá
    poly = [(256, 70), (400, 190), (370, 420), (150, 430), (110, 200)]
    part(b, lambda d: d.polygon(poly, fill=255), '#d8e6ff', '#5a6e96', 8)
    d = ImageDraw.Draw(b); d.polygon([(256, 70), (300, 210), (210, 210)], fill=(240, 248, 255, 200)); d.line([(210, 210), (150, 430)], fill=(40, 50, 80, 120), width=6); d.line([(300, 210), (370, 420)], fill=(40, 50, 80, 120), width=6)
    gem(b, 260, 300, 38, '#7fc8ff', 'diamond'); out['stone'] = finish(b)
    for t in range(1, 6):  # tinh thạch
        b = Image.new('RGBA', (S, S)); glow(b, t, 290, 200); c = TIER[t]
        for (x, w, hgt, tilt) in [(170, 70, 200, -0.25), (340, 70, 210, 0.25), (256, 95, 300, 0)]:
            top = 430 - hgt
            poly = [(x - w/2, 430), (x - w/2 + tilt*120, top + 60), (x + tilt*120, top), (x + w/2 + tilt*120, top + 60), (x + w/2, 430)]
            part(b, lambda d, poly=poly: d.polygon(poly, fill=255), mix(c, '#ffffff', .6), mix(c, '#000000', .35), 7, (0.3, 0.2))
            d = ImageDraw.Draw(b); d.line([(x + tilt*120, top), (x, 430)], fill=(255, 255, 255, 120), width=6)
        part(b, lambda d: d.ellipse((120, 400, 392, 470), fill=255), '#7a6a5a', '#3a2e24', 6)
        sparkles(b, max(3, t), t); out['t%d' % t] = finish(b)
    b = Image.new('RGBA', (S, S)); glow(b, 1, 260, 200)  # bùa may mắn: cỏ 4 lá trong khung vàng
    part(b, lambda d: d.rounded_rectangle((120, 70, 392, 450), 40, fill=255), '#fff2c0', '#e8b84a', 8)
    for a in range(4):
        ang = a*math.pi/2 + math.pi/4; x = 256 + 62*math.cos(ang); y = 250 + 62*math.sin(ang)
        part(b, (lambda x=x, y=y: (lambda d: d.ellipse((x-58, y-58, x+58, y+58), fill=255)))(), '#a8f08a', '#2f8a3a', 5)
    d = ImageDraw.Draw(b); d.line([(256, 250), (300, 400)], fill=(40, 110, 50, 255), width=14); gem(b, 256, 250, 22, '#ffd36b')
    out['luck'] = finish(b)
    b = Image.new('RGBA', (S, S)); glow(b, 2, 260, 200)  # bùa bảo hộ: khiên tím
    sh = [(256, 60), (410, 120), (395, 300), (256, 460), (117, 300), (102, 120)]
    part(b, lambda d: d.polygon(sh, fill=255), '#d8c8ff', '#5a3aa8', 9)
    sh2 = [(256, 110), (365, 150), (352, 290), (256, 405), (160, 290), (147, 150)]
    part(b, lambda d: d.polygon(sh2, fill=255), '#8a6ae0', '#3a2470', 4)
    gem(b, 256, 255, 62, '#fff3a0', 'diamond'); sparkles(b, 3, 9); out['guard'] = finish(b)
    return out

def save(im, rel):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True); im.save(p, 'WEBP', quality=90, method=4)
for typ in ['pendant', 'amulet', 'pearl', 'heart', 'fang']:
    for t in range(6): save(necklace(typ, t), f'eq/necklace/{typ}/{t}i.webp')
for typ in ['bangle', 'beads', 'chain', 'cuff', 'charm']:
    for t in range(6): save(bracelet(typ, t), f'eq/bracelet/{typ}/{t}i.webp')
for k, im in mats().items(): save(im, f'mats/{k}.webp')
print('done')
