import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / (ROOT / '自检记录/hair-three-studies-path.txt').read_text(encoding='utf-8')
studies = json.loads((OUT / 'studies.json').read_text(encoding='utf-8'))
timing = json.loads((OUT / 'verification.json').read_text(encoding='utf-8'))['timing']
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 16)
small = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 12)
directions = [(1, '正面'), (0, '侧面'), (2, '背面')]


def gif(frames, target, transparent=False):
    colors = sorted({c for f in frames for c in f.get_flattened_data() if not transparent or c[3]})
    assert len(colors) < 256
    lookup = {c: i + 1 for i, c in enumerate(colors)}
    palette = [0, 0, 0] + [n for c in colors for n in c[:3]]
    palette += [0] * (768 - len(palette))
    indexed = []
    for f in frames:
        p = Image.new('P', f.size)
        p.putpalette(palette)
        p.putdata([0 if transparent and not c[3] else lookup[c] for c in f.get_flattened_data()])
        indexed.append(p)
    args = dict(save_all=True, append_images=indexed[1:], duration=timing, loop=0, disposal=2, optimize=False)
    if transparent:
        args['transparency'] = 0
    indexed[0].save(target, **args)
    with Image.open(target) as reopened:
        decoded = [(f.convert('RGBA').copy(), f.info['duration']) for f in ImageSequence.Iterator(reopened)]
        assert sum(d for _, d in decoded) == 400
        assert reopened.info['loop'] == 0
        elapsed = 0
        for expected, delay in zip(frames, timing):
            t = 0
            for actual, length in decoded:
                if t <= elapsed < t + length:
                    assert all((a[3] == b[3] == 0) or a == b for a, b in zip(actual.get_flattened_data(), expected.get_flattened_data()))
                    break
                t += length
            else:
                raise AssertionError('Missing playback frame')
            elapsed += delay


previews = []
for study in studies:
    directory = OUT / study['code']
    frames_by_dir = {}
    for ai, name in directions:
        native = [Image.open(directory / f'frame-{ai}-{q}.png').convert('RGBA') for q in range(8)]
        assert all(f.getbbox() for f in native)
        frames_by_dir[ai] = native
        gif(native, directory / f'{name}-原尺寸透明.gif', True)
    frames = []
    for q in range(8):
        c = Image.new('RGBA', (504, 258), '#e3dfe8')
        d = ImageDraw.Draw(c)
        d.fontmode = '1'
        d.text((12, 5), f"{study['code']} · {study['name']}   /   同速 400ms", font=font, fill='#3c3c52')
        for col, (ai, name) in enumerate(directions):
            x = col * 168
            d.text((x + 65, 32), name, font=small, fill='#55556b')
            f = frames_by_dir[ai][q]
            c.alpha_composite(f.resize((144, 144), Image.Resampling.NEAREST), (x + 12, 52))
            c.alpha_composite(f, (x + 66, 208))
        frames.append(c)
    gif(frames, OUT / f"{study['code']}-{study['name']}-三方向.gif")
    previews.append(frames)
all_in_one = []
for q in range(8):
    c = Image.new('RGBA', (504, 774))
    for row, frames in enumerate(previews):
        c.alpha_composite(frames[q], (0, row * 258))
    all_in_one.append(c)
gif(all_in_one, OUT / '三套九方向-同速对比.gif')
(OUT / 'media-verification.json').write_text(json.dumps({
    'threeDistinctStudies': True, 'directionsPerStudy': 3, 'nativeTransparentAnimations': 9,
    'eachCycleMs': 400, 'allGIFsReopenedAndPixelMatched': True,
    'sharedExactPalette': True, 'previewScale': 4,
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('PASS media: 3 different studies, each with 3 directions; 9 transparent GIFs; exact reopened playback pixels and equal 400ms cycles.')
print(OUT)
