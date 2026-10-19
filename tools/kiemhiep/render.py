"""Xuất bộ hình kiếm hiệp ra WebP.

Cách dùng:
    pip install playwright pillow && playwright install chromium
    python tools/kiemhiep/render.py <thư-mục-ra>          # vẽ toàn bộ hình theo tên file của game
    python tools/pack_atlas.py <thư-mục-ra> public/assets  # gộp lại thành atlas
    python tools/kiemhiep/render.py --preview "<biểu thức JS trả về mảng SVG>" out.png

Hình được vẽ bằng SVG trong tools/kiemhiep/*.js, Chromium chuyển sang ảnh, Pillow lưu WebP.
"""
import base64, io, os, sys, json
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = ['art.js', 'gear.js', 'items.js', 'preview.js']
RASTER = """async ([svg, w, h]) => {
  const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await im.decode();
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
  return c.toDataURL('image/png');
}"""


def open_page(p):
    exe = os.environ.get('CHROMIUM')
    b = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
    pg = b.new_page()
    pg.set_content('<html><body></body></html>')
    for f in PARTS:
        fp = os.path.join(HERE, f)
        if os.path.exists(fp):
            pg.add_script_tag(path=fp)
    return b, pg


def raster(pg, svg, w, h):
    url = pg.evaluate(RASTER, [svg, w, h])
    return Image.open(io.BytesIO(base64.b64decode(url.split(',', 1)[1]))).convert('RGBA')


def main():
    with sync_playwright() as p:
        b, pg = open_page(p)
        if sys.argv[1] == '--preview':
            svgs = pg.evaluate(sys.argv[2])
            ims = [raster(pg, s['svg'], s['w'], s['h']) for s in svgs]
            cols = int(sys.argv[4]) if len(sys.argv) > 4 else len(ims)
            cw = max(i.size[0] for i in ims); chh = max(i.size[1] for i in ims)
            rows = (len(ims) + cols - 1) // cols
            sheet = Image.new('RGBA', (cw * cols, chh * rows), (52, 44, 40, 255))
            for k, im in enumerate(ims):
                sheet.alpha_composite(im, ((k % cols) * cw, (k // cols) * chh))
            sheet.save(sys.argv[3])
        else:
            out = sys.argv[1]
            assets = pg.evaluate('KH.ASSETS()')
            for a in assets:
                im = raster(pg, a['svg'], a['w'], a['h'])
                fp = os.path.join(out, a['path'])
                os.makedirs(os.path.dirname(fp), exist_ok=True)
                im.save(fp, 'WEBP', lossless=True)
            print(len(assets), 'hình ->', out)
        b.close()


if __name__ == '__main__':
    main()
