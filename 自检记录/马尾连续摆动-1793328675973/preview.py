from PIL import Image
from pathlib import Path
import json
p=Path(__file__).parent
project=json.loads((p/'candidate.json').read_text(encoding='utf-8-sig'))
for si,label in [(8,'待机'),(10,'坐下')]:
    size=36 if si==8 else 32
    sheet=Image.new('RGB',(size*24,size*18),'#d7dbd7')
    frames=[]
    for fi in range(4):
        frame=Image.new('RGB',(size*15,size*5),'#35434b')
        for ai in range(3):
            tile=Image.open(p/f'帧-{si}-{ai}-{fi}.png').convert('RGBA')
            large=tile.resize((size*6,size*6),Image.Resampling.NEAREST)
            bg=Image.new('RGB',large.size,'#35434b' if fi%2 else '#d7dbd7')
            bg.paste(large,(0,0),large)
            sheet.paste(bg,(fi*size*6,ai*size*6))
            anim=tile.resize((size*5,size*5),Image.Resampling.NEAREST)
            frame.paste(anim,(ai*size*5,0),anim)
        frames.append(frame)
    sheet.save(p/f'{label}全部帧.png')
    durations=[f['duration'] for f in project['spriteSheets'][si]['actions'][0]['frames']]
    frames[0].save(p/f'{label}实际帧时长.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=2)
    frames[0].save(p/f'{label}三方向.png')
    im=Image.open(p/f'{label}实际帧时长.gif')
    assert im.n_frames==4
    for fi in range(4):
        im.seek(fi)
        assert im.info['duration']==durations[fi]
    print(label,durations,'PNG/GIF reopened')
