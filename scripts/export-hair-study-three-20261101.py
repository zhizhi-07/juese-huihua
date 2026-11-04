import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / (ROOT / '自检记录/hair-study-current-path.txt').read_text(encoding='utf-8')
meta = json.loads((OUT / 'experiment.json').read_text(encoding='utf-8'))
checks = json.loads((OUT / 'verification.json').read_text(encoding='utf-8'))
durations = checks['delays']
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 16)
small = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 12)
directions = [(1, '正面'), (0, '侧面'), (2, '背面')]


def save_gif(frames, target, timing, transparent=False):
    colors = set()
    for frame in frames:
        colors.update(frame.get_flattened_data())
    colors = sorted(c for c in colors if not transparent or c[3])
    assert len(colors) < 256, (target, len(colors))
    palette = [0, 0, 0] + [channel for c in colors for channel in c[:3]]
    palette += [0] * (768 - len(palette))
    indices = {c: i + 1 for i, c in enumerate(colors)}
    indexed = []
    for frame in frames:
        p = Image.new('P', frame.size)
        p.putpalette(palette)
        p.putdata([0 if transparent and not c[3] else indices[c] for c in frame.get_flattened_data()])
        indexed.append(p)
    args = dict(save_all=True, append_images=indexed[1:], duration=timing, loop=0, disposal=2, optimize=False)
    if transparent:
        args['transparency'] = 0
    indexed[0].save(target, **args)
    with Image.open(target) as reopened:
        assert sum(f.info['duration'] for f in ImageSequence.Iterator(reopened)) == sum(timing)
        assert reopened.info['loop'] == 0
        # Compare playback at every original frame boundary, even when GIF merges identical cels.
        decoded = [(f.convert('RGBA').copy(), f.info['duration']) for f in ImageSequence.Iterator(reopened)]
        elapsed = 0
        for wanted, delay in zip(frames, timing):
            t, active = 0, None
            for frame, length in decoded:
                if t <= elapsed < t + length:
                    active = frame
                    break
                t += length
            assert active is not None
            a, b = active.get_flattened_data(), wanted.get_flattened_data()
            assert all((x[3] == y[3] == 0) or x == y for x, y in zip(a, b)), target
            elapsed += delay


all_previews = []
for ai, name in directions:
    native = [Image.open(OUT / f'new-{ai}-{q}.png').convert('RGBA') for q in range(8)]
    assert all(f.getbbox() for f in native)
    save_gif(native, OUT / f'{name}-原尺寸透明.gif', durations, transparent=True)
    previews = []
    for f in native:
        c = Image.new('RGBA', (252, 300), '#e3dfe8')
        d = ImageDraw.Draw(c)
        d.fontmode = '1'
        d.text((14, 5), name + ' · 待机头发动效', font=font, fill='#3c3c52')
        c.alpha_composite(f.resize((216, 216), Image.Resampling.NEAREST), (18, 30))
        c.alpha_composite(f, (108, 252))
        d.text((16, 262), '原尺寸 →', font=small, fill='#55556b')
        previews.append(c)
    save_gif(previews, OUT / f'{name}-动效预览.gif', durations)
    all_previews.append(previews)
combined = []
for q in range(8):
    c = Image.new('RGBA', (756, 300))
    for col, frames in enumerate(all_previews):
        c.alpha_composite(frames[q], (col * 252, 0))
    combined.append(c)
save_gif(combined, OUT / '三方向-动效总览.gif', durations)

# A matched-timing comparison isolates hair changes from the slower playback.
contact = Image.new('RGBA', (864, 3 * 2 * 180), '#e3dfe8')
for row, (ai, name) in enumerate(directions):
    for state in range(2):
        d = ImageDraw.Draw(contact)
        y = (row * 2 + state) * 180
        d.text((5, y + 2), f'{name} / ' + ('原稿同姿态' if state == 0 else '学习实验稿'), font=font, fill='#3c3c52')
        for q in range(8):
            index = checks['map'][q] if state == 0 else q
            f = Image.open(OUT / f'{"old" if state == 0 else "new"}-{ai}-{index}.png').convert('RGBA')
            contact.alpha_composite(f.resize((108, 108), Image.Resampling.NEAREST), (q * 108, y + 30))
            d.text((q * 108 + 5, y + 143), str(q + 1), font=small, fill='#55556b')
contact.save(OUT / '逐帧前后对照.png')
(OUT / 'media-verification.json').write_text(json.dumps({
    'directions': [name for _, name in directions], 'threeSeparateAnimatedPreviews': True,
    'threeNativeTransparentGIFs': True, 'sharedExactPalette': True,
    'reopenedPlaybackPixelsMatchEveryFrame': True, 'totalDurationMs': sum(durations),
    'nearestNeighborScale': 6,
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('PASS media: three separate previews + three transparent native GIFs + overview; exact palette, loop duration and reopened playback pixels verified.')
print(OUT)
