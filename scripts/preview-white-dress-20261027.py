from pathlib import Path
from PIL import Image
import json

out = Path(__file__).resolve().parent.parent / '自检记录/白裙侧面呼吸与鞋子-20261027'
p = json.loads((out / 'candidate.json').read_text(encoding='utf-8'))
frames = []
for f in range(4):
    im = Image.new('RGBA', (96, 32), '#ddd5ed')
    for a in range(3):
        im.alpha_composite(Image.open(out / f'idle-{a}-{f}.png').convert('RGBA'), (a * 32, 0))
    frames.append(im.convert('RGB').resize((576, 192), Image.Resampling.NEAREST))
durations = [f.get('duration', 100) for f in p['spriteSheets'][8]['actions'][1]['frames']]
frames[0].save(out / 'idle-loop.gif', save_all=True, append_images=frames[1:], duration=durations, loop=0, disposal=2)
assert all(d > 0 for d in durations)
