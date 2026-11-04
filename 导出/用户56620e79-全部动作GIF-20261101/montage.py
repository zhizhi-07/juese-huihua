import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageSequence, ImageChops
out=Path(__file__).resolve().parent
meta=json.loads((out/'export-metadata.json').read_text(encoding='utf-8'))
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)
small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',15)
big=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',26)
directions=[('down','正面'),('side','侧面'),('up','背面')]
base=Image.new('RGB',(980,660),'#eeeaf3')
d=ImageDraw.Draw(base);d.fontmode='1'
d.text((30,18),'全部动作 · 用户',font=big,fill='#3d3b50')
d.text((32,56),'5 组动作 / 13 个已有方向 / 原像素 4 倍放大',font=small,fill='#777185')
tracks=[]
for col,s in enumerate(meta['sheets']):
    x=72+col*180
    d.text((x+65,94),s['label'],font=font,fill='#3d3b50',anchor='mt')
    for row,(direction,label) in enumerate(directions):
        y=132+row*168
        d.rounded_rectangle((x+4,y,x+172,y+158),radius=10,fill='#e3dfea')
        a=next((a for a in s['actions'] if a['direction']==direction),None)
        if a is None:
            d.text((x+88,y+72),'—',font=font,fill='#aaa3b4',anchor='mm')
            continue
        frames=[Image.open(out/f['file']).convert('RGBA') for f in a['frames']]
        assert all(im.getbbox() for im in frames)
        delays=[max(10,round(f['duration']/10)*10) for f in a['frames']]
        tracks.append(dict(x=x,y=y,frames=frames,delays=delays,total=sum(delays),seen=set()))
for row,(_,label) in enumerate(directions):
    d.text((16,206+row*168),label,font=font,fill='#645e74',anchor='lm')
# Independent playback within a short overview loop; only sleep gains 10 ms across the loop boundary.
length=4000
events={0,length}
for a in tracks:
    t=0;i=0
    while t<length:
        events.add(t);t+=a['delays'][i];i=(i+1)%len(a['frames'])
events=sorted(events)
frames=[];delays=[]
for t,end in zip(events,events[1:]):
    c=base.convert('RGBA')
    for a in tracks:
        phase=t%a['total'];fi=0
        while phase>=a['delays'][fi]:phase-=a['delays'][fi];fi+=1
        a['seen'].add(fi)
        im=a['frames'][fi];im=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST)
        c.alpha_composite(im,(a['x']+88-im.width//2,a['y']+80-im.height//2))
    frames.append(c.convert('RGB'));delays.append(end-t)
assert all(a['seen']==set(range(len(a['frames']))) for a in tracks)
colors=set()
for im in frames:
    cc=im.getcolors(256);assert cc is not None
    colors.update(color for _,color in cc)
assert len(colors)<=256,len(colors)
pal=Image.new('P',(1,1));rgb=[v for c in sorted(colors) for v in c];pal.putpalette(rgb+[0]*(768-len(rgb)))
indexed=[im.quantize(palette=pal,dither=Image.Dither.NONE) for im in frames]
for a,b in zip(frames,indexed):assert ImageChops.difference(a,b.convert('RGB')).getbbox() is None
file=out/'全部动作-同图预览.gif'
indexed[0].save(file,save_all=True,append_images=indexed[1:],duration=delays,loop=0,optimize=False,disposal=1)
frames[0].save(out/'全部动作-静态预览.png')
with Image.open(file) as gif:
    assert gif.size==(980,660) and gif.info['loop']==0
    decoded=[(f.convert('RGB').copy(),f.info['duration']) for f in ImageSequence.Iterator(gif)]
assert sum(delay for _,delay in decoded)==length
elapsed=0;j=0;boundary=decoded[0][1]
for wanted,delay in zip(frames,delays):
    while elapsed>=boundary:j+=1;boundary+=decoded[j][1]
    assert ImageChops.difference(wanted,decoded[j][0]).getbbox() is None
    elapsed+=delay
# All source cels for visual inspection, including brief sleep cels.
contact=Image.new('RGB',(8*100,13*110),'#eeeaf3')
r=0
for s in meta['sheets']:
    for a in s['actions']:
        for fi,f in enumerate(a['frames']):
            im=Image.open(out/f['file']).convert('RGBA');im=im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST)
            contact.paste(im,(fi*100+(100-im.width)//2,r*110+22),im)
            ImageDraw.Draw(contact).text((fi*100+3,r*110),f'{s["label"]} {a["direction"]} {fi+1}',font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',10),fill='#3d3b50')
        r+=1
contact.save(out/'全部70帧-检查.png')
report={'file':str(file),'size':[980,660],'sourceFrames':70,'directionTracks':len(tracks),'gifFrames':len(decoded),'durationMs':length,'paletteColors':len(colors),'everySourceCelIncluded':True,'decodedPixelsMatch':True,'projectUnchanged':meta['projectUnchanged'],'timingNote':'GIF时长按10ms取整；4秒总循环中睡觉循环衔接多停10ms。','scope':'5组当前常用动作；不含原始动作备份；仅来自API已保存数据。'}
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
