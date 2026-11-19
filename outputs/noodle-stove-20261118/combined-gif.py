from pathlib import Path
from PIL import Image
import urllib.request, json, base64, io

D = Path(__file__).parent
with urllib.request.urlopen('http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118') as response:
    raw = response.read()
p = json.loads(raw)
(D / 'gif-source.json').write_bytes(raw)
pot_si = next(i for i, s in enumerate(p['spriteSheets']) if s['name'] == '锅')
stove_si = next(i for i, s in enumerate(p['spriteSheets']) if s['name'] == '灶台')
fire = next(l for l in p['layers'] if l['sheetIndex'] == stove_si and l['name'] == '火')

def image(layer, key):
    data = layer['frameData'][key]['dataURL'].split(',', 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(data))).convert('RGBA')

frames = []
for f in range(8):
    canvas = Image.new('RGBA', (24, 40), '#b8c8c3')
    # Use the saved native layers, including the user's current first-frame edits.
    for layer in p['layers']:
        if layer['sheetIndex'] == pot_si:
            canvas.alpha_composite(image(layer, f'{pot_si}_0_{f}'))
    flame = image(fire, f'{stove_si}_0_{f}').crop((7, 28, 15, 34))
    canvas.alpha_composite(flame, (8, 31))
    frames.append(canvas.convert('RGB').resize((384, 640), Image.Resampling.NEAREST))
out = D / '锅-飘烟-沸腾-火焰.gif'
frames[0].save(out, save_all=True, append_images=frames[1:], duration=140, loop=0, disposal=2, optimize=False)
with Image.open(out) as check:
    assert check.n_frames == 8
    assert check.size == (384, 640)
    assert check.info['loop'] == 0
frames[0].save(D / 'combined-preview.png')
print(out)
