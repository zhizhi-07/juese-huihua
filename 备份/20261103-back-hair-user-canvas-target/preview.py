from pathlib import Path
from PIL import Image, ImageSequence
import json
p=Path('备份/20261103-back-hair-user-canvas-target')
a=json.loads((p/'candidate.json').read_text('utf-8'))
frames=[]
for fi in range(4):
    im=Image.open(p/f'back-{fi}.png').convert('RGBA').resize((192,216),Image.Resampling.NEAREST)
    bg=Image.new('RGBA',im.size,'#e9e3d5');bg.alpha_composite(im);frames.append(bg.convert('RGB'))
frames[0].save(p/'preview.png')
durations=[f['duration'] for f in a['spriteSheets'][8]['actions'][2]['frames']]
frames[0].save(p/'idle-back.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=2)
assert [f.info['duration'] for f in ImageSequence.Iterator(Image.open(p/'idle-back.gif'))]==durations
print('Preview/GIF checked at original durations.')
