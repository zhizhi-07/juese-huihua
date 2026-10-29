import json
from pathlib import Path
from PIL import Image, ImageChops

folder = Path(__file__).resolve().parents[1] / '发型素材/08-灰色长发-分层试稿/尖发束待机'
metrics = json.loads((folder / '自检.json').read_text(encoding='utf-8'))['metrics']
durations = [round((m['duration'] or 200) / 10) * 10 for m in metrics if m['ai'] == 0]
assert len(durations) == 4
for prefix, name in [('idle', '三方向待机.gif'), ('dressed', '三方向搭配预览.gif')]:
    frames = []
    for fi in range(4):
        canvas = Image.new('RGB', (768, 256), '#eee8ef')
        for ai in range(3):
            sprite = Image.open(folder / f'{prefix}-{ai}-{fi}.png').convert('RGBA')
            assert sprite.size == (32, 32) and sprite.getbbox()
            sprite = sprite.resize((256, 256), Image.Resampling.NEAREST)
            canvas.paste(sprite, (ai * 256, 0), sprite)
        frames.append(canvas)
    palette = frames[0].quantize(colors=64, dither=Image.Dither.NONE)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    indexed[0].save(folder / name, save_all=True, append_images=indexed[1:], duration=durations, loop=0, disposal=2, optimize=False)
    result = Image.open(folder / name)
    total = 0
    for index in range(result.n_frames):
        result.seek(index)
        total += result.info['duration']
        assert ImageChops.difference(result.convert('RGB'), frames[index]).getbbox() is None
    assert total == sum(durations) and result.info['loop'] == 0
    print(name, result.n_frames, 'encoded frames;', total, 'ms loop')
