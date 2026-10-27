from pathlib import Path
import json
from PIL import Image, ImageDraw

out = Path(__file__).resolve().parent.parent / '自检记录/整套外观同步全部动作-20261027'
p = json.loads((out / 'candidate.json').read_text(encoding='utf-8'))
poster = Image.new('RGB', (960, 224), '#ddd5ed')
labels = ['Walk', 'Idle', 'Pickup', 'Sit', 'Sleep']
for column, si in enumerate([7, 8, 9, 10, 11]):
    sheet = p['spriteSheets'][si]
    count = max(len(a['frames']) for a in sheet['actions'])
    frames = []
    for fi in range(count):
        im = Image.new('RGBA', (40 * len(sheet['actions']), 40), '#ddd5ed')
        for ai, action in enumerate(sheet['actions']):
            n = fi % len(action['frames'])
            tile = Image.open(out / f'{si}-{ai}-{n}.png').convert('RGBA')
            im.alpha_composite(tile, (ai * 40 + (40 - tile.width) // 2, 40 - tile.height))
            if fi == 0 and ai == (1 if len(sheet['actions']) > 1 else 0):
                frame = Image.new('RGBA', (40, 40), '#ddd5ed')
                frame.alpha_composite(tile, ((40 - tile.width) // 2, 40 - tile.height))
                poster.paste(frame.convert('RGB').resize((192, 192), Image.Resampling.NEAREST), (column * 192, 24))
        frames.append(im.convert('RGB').resize((im.width * 5, 200), Image.Resampling.NEAREST))
    durations = [sheet['actions'][0]['frames'][f % len(sheet['actions'][0]['frames'])].get('duration', 100) for f in range(count)]
    assert all(d > 0 for d in durations)
    frames[0].save(out / f'action-{si}.gif', save_all=True, append_images=frames[1:], duration=durations, loop=0, disposal=2)
    ImageDraw.Draw(poster).text((column * 192 + 8, 6), labels[column], fill='#30353a')
poster.save(out / 'all-actions-overview.png')
print('Generated five action loops at original frame timings.')
