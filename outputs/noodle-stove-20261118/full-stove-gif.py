from pathlib import Path
from PIL import Image
import urllib.request, json, base64, io

D = Path(__file__).parent
with urllib.request.urlopen('http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118') as response:
    raw = response.read()
p = json.loads(raw)
(D / 'full-gif-source.json').write_bytes(raw)
stove = next(i for i, s in enumerate(p['spriteSheets']) if s['name'] == '灶台')
pot = next(i for i, s in enumerate(p['spriteSheets']) if s['name'] == '锅')

def image(layer, key):
    return Image.open(io.BytesIO(base64.b64decode(layer['frameData'][key]['dataURL'].split(',', 1)[1]))).convert('RGBA')

frames = []
for f in range(8):
    canvas = Image.new('RGBA', (40, 40), '#b8c8c3')
    # The separate pot scene was offset (+1,+5) from the original stove pot.
    # Reverse that offset to place the edited pot and broth on the complete stove.
    for layer in p['layers']:
        if layer['sheetIndex'] == stove and layer['name'] not in ('锅', '烟雾', '火'):
            canvas.alpha_composite(image(layer, f'{stove}_0_{f}'), (0, 4))
    for layer in p['layers']:
        if layer['sheetIndex'] == pot:
            native = image(layer, f'{pot}_0_{f}')
            canvas.alpha_composite(native.crop((1, 1, 24, 32)), (0, 0))
    fire = next(l for l in p['layers'] if l['sheetIndex'] == stove and l['name'] == '火')
    canvas.alpha_composite(image(fire, f'{stove}_0_{f}'), (0, 4))
    frames.append(canvas.convert('RGB').resize((640, 640), Image.Resampling.NEAREST))

out = D / 'full-stove.gif'
frames[0].save(out, save_all=True, append_images=frames[1:], duration=140, loop=0, disposal=2, optimize=False)
with Image.open(out) as check:
    assert check.n_frames == 8 and check.size == (640, 640) and check.info['loop'] == 0
frames[0].save(D / 'full-stove-preview.png')
print(out)

