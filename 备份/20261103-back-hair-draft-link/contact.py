from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageSequence
import json
p=Path('备份/20261103-back-hair-draft-link')
a=json.loads((p/'candidate.json').read_text('utf-8'))
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',14)
out=Image.new('RGB',(8*168,8*190),'white');d=ImageDraw.Draw(out)
for r,s in enumerate([8,7,9,10]):
    frames=[];dur=[]
    for fi,f in enumerate(a['spriteSheets'][s]['actions'][2]['frames']):
        im=Image.open(p/f'frame-{s}-{fi}.png').convert('RGBA');frames.append(im.resize((im.width*6,im.height*6),Image.Resampling.NEAREST));dur.append(f['duration'])
        for bi,bg in enumerate(['#e9e3d5','#30303e']):
            x=fi*168;y=(r*2+bi)*190
            d.rectangle((x,y,x+167,y+189),fill=bg)
            d.text((x+3,y+3),f"{a['spriteSheets'][s]['name'][11:]} {fi+1}",font=font,fill='white' if bi else 'black')
            tile=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST);out.paste(tile,(x+(168-tile.width)//2,y+24),tile)
    if s==8:
        frames[0].save(p/'idle-back.gif',save_all=True,append_images=frames[1:],duration=dur,loop=0,disposal=2)
        preview=Image.new('RGB',(216,216),'#e9e3d5');preview.paste(frames[0],(0,0),frames[0]);preview.save(p/'back-shadow-preview.png')
        gif=Image.open(p/'idle-back.gif');assert [f.info['duration'] for f in ImageSequence.Iterator(gif)]==dur
out.save(p/'all-synced-frames.png')
print('Contact sheet + true-duration idle GIF written and decoded.')
