from pathlib import Path
import json
from PIL import Image

out = Path(__file__).resolve().parent.parent / '自检记录/待机发梢延迟弯动-20261027'
project = json.loads((out / 'candidate.json').read_text(encoding='utf-8'))
frames = []
durations = []
for f in range(4):
    canvas = Image.new('RGBA', (96, 32), '#ddd5ed')
    for a in range(3):
        tile = Image.open(out / f'idle-{a}-{f}.png').convert('RGBA')
        canvas.alpha_composite(tile, (a * 32, 0))
    frames.append(canvas.convert('RGB').resize((576, 192), Image.Resampling.NEAREST))
    durations.append(project['spriteSheets'][8]['actions'][1]['frames'][f].get('duration', 200))
frames[0].save(out / 'idle-loop.gif', save_all=True, append_images=frames[1:], duration=durations, loop=0, disposal=2)
assert len(frames) == 4 and all(d > 0 for d in durations)
print('GIF timing (ms):', durations)
