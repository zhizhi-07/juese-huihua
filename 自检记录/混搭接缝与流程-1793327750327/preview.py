from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json, re

root = Path.cwd()
p = Path(__file__).parent
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 18)
all_frames = Image.new('RGB', (864, 648), '#d7dbd7')
for ai in range(3):
    for fi in range(4):
        tile = Image.open(p / f'引擎回验-{ai}-{fi}.png').convert('RGBA').resize((216, 216), Image.Resampling.NEAREST)
        bg = Image.new('RGB', (216, 216), '#35434b' if fi % 2 else '#d7dbd7')
        bg.paste(tile, (0, 0), tile)
        all_frames.paste(bg, (fi*216, ai*216))
all_frames.save(p / '全部待机核对.png')

compare = Image.open(p / '左旧右新-同背景.png').crop((0, 0, 432, 216))
out = Image.new('RGB', (432, 246), '#f3f3ef')
out.paste(compare, (0, 30))
d = ImageDraw.Draw(out)
d.text((24, 4), '修改前：竖缝', font=font, fill='#293c34')
d.text((240, 4), '修改后：色块相接', font=font, fill='#293c34')
out.save(p / '接缝修整前后.png')
out.save(root / '教程配图/头发素材流程/03-侧面接缝前后.png')

frames = []
for fi in range(4):
    im = Image.new('RGB', (432, 144), '#35434b')
    for ai in range(3):
        tile = Image.open(p / f'引擎回验-{ai}-{fi}.png').convert('RGBA').resize((144, 144), Image.Resampling.NEAREST)
        im.paste(tile, (ai*144, 0), tile)
    frames.append(im)
frames[0].save(p / '接缝融合待机.gif', save_all=True, append_images=frames[1:], duration=220, loop=0, disposal=2)
gif = Image.open(p / '接缝融合待机.gif')
assert gif.n_frames == 4
for name in ['接缝修整前后.png', '全部待机核对.png']:
    Image.open(p / name).load()

doc = root / '头发素材混搭与像素化流程.md'
for link in re.findall(r'!\[[^\]]*\]\(([^)]+)\)', doc.read_text(encoding='utf8')):
    assert (root / link).is_file(), link
for record in json.loads((root / '教程配图/头发素材流程/原素材索引与SHA256.json').read_text(encoding='utf8')):
    assert hashlib.sha256(Path(record['copy']).read_bytes()).hexdigest() == record['sha256']
assert doc.name in (root / 'AGENTS.md').read_text(encoding='utf8')
print('PASS: four-frame GIF and PNGs reopened; document images resolve; five source SHA256 copies match; AGENTS entry linked')
