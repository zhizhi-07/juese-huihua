from pathlib import Path
from PIL import Image
from collections import Counter
import copy,json,io,base64,hashlib,urllib.request as U,sys
D=Path(__file__).parent;original=json.loads((D/'before.json').read_bytes());n=next(i for i,s in enumerate(original['spriteSheets']) if s['name']=='卧式冰柜 32×24')
def layers(p):return [l for l in p['layers'] if l.get('sheetIndex')==n]
def dec(u):return Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
def uri(im):
 f=io.BytesIO();im.save(f,'PNG');return 'data:image/png;base64,'+base64.b64encode(f.getvalue()).decode()
def blank():return Image.new('RGBA',(24,16))
def reduce(im):
 o=blank();o.paste(im.crop((1,1,31,23)).resize((20,15),Image.Resampling.NEAREST),(2,0));return o
L=layers(original);assert [l['visible'] for l in L]==[True,True,False,True]
def get(l,j):return dec(l['frameData'][f'{n}_0_{j}']['dataURL'])
def composite(ims):
 out=ims[0].copy()
 for s in ims[1:]:out.alpha_composite(s)
 return out
stock=reduce(get(L[1],0));body=reduce(get(L[0],0));open_=composite([body,stock])
closed=reduce(composite([get(l,0) for l in L if l['visible']]))
assert open_.getbbox()==closed.getbbox()==(2,0,22,15)
assert reduce(composite([get(l,7) for l in L if l['visible']])).tobytes()==open_.tobytes()
# Remove the stationary reflection from the tinted stock, then translate only the glass hardware.
glassless=get(L[0],0);glassless.alpha_composite(get(L[1],0));shut=glassless.copy();shut.alpha_composite(get(L[3],0))
tints={}
for y in range(4,12):
 for x in range(4,28):
  if x in (15,16):continue
  tints.setdefault(glassless.getpixel((x,y)),Counter())[shut.getpixel((x,y))]+=1
tinted=shut.copy()
for y in range(4,12):
 for x in (15,16):
  p=glassless.getpixel((x,y)); c=tints.get(p);tinted.putpixel((x,y),c.most_common(1)[0][0] if c else p)
tinted=reduce(tinted)
positions=[0,1,3,6,9,12,15,16];frames=[];doors=[]
for j,dx in enumerate(positions):
 door=blank()
 for y in range(16):
  for x in range(24):
   c=closed.getpixel((x,y)) if j==0 else tinted.getpixel((x,y))
   if j!=7 and (j==0 or x>=4+dx) and c!=open_.getpixel((x,y)): door.putpixel((x,y),c)
 if 0<j<7:
  for y in range(2,8):
   x=4+dx;door.putpixel((x,y),(131,158,166,255) if y not in (4,5) else (86,97,120,255))
   if 12+dx<=19:door.putpixel((12+dx,y),(190,212,200,255))
 result=composite([open_,door]);frames.append(result);doors.append(door)
 assert all(result.getpixel((x,y))==open_.getpixel((x,y)) for x in range(4,4+dx) for y in range(2,8))
assert frames[0].tobytes()==closed.tobytes() and frames[-1].tobytes()==open_.tobytes()
assert len(set(f.tobytes() for f in frames))==8
atlas=Image.new('RGBA',(192,16))
for i,im in enumerate(frames):atlas.paste(im,(24*i,0))
atlas.save(D/'opening-strip.png');open_.save(D/'open.png');times=[f['duration'] for f in original['spriteSheets'][n]['actions'][0]['frames']]
def preview(im):
 q=Image.new('RGBA',(28,20),'#efece6');q.alpha_composite(im,(2,2));return q.convert('RGB').resize((224,160),Image.Resampling.NEAREST)
pre=list(map(preview,frames));pre[0].save(D/'opening.gif',save_all=True,append_images=pre[1:],duration=times,disposal=2,loop=0,optimize=False)
def apply(p):
 assert p['spriteSheets'][n]==original['spriteSheets'][n] and layers(p)==L,'Target changed; compare before saving'
 q=copy.deepcopy(p);s=q['spriteSheets'][n];s.update(name='卧式冰柜 24×16',frameWidth=24,frameHeight=16,imageDataURL=uri(atlas));a=s['actions'][0];a['name']='玻璃门向右滑开'
 for i,f in enumerate(a['frames']):
  f.update(width=24,height=16,sourceX=i*24,notes='玻璃门自左向右开启，商品固定。')
  for l,im in zip(layers(q),(body,stock,reduce(get(L[2],i)),doors[i]),strict=True):
   l['frameData'][f'{n}_0_{i}'].update(width=24,height=16,dataURL=uri(im))
 return q
enc=lambda q:json.dumps(q,ensure_ascii=False,separators=(',',':')).encode()
(D/'candidate.json').write_bytes(enc(apply(original)))
if '--save' in sys.argv:
 url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
 with U.urlopen(url) as r:raw=r.read();tag=r.headers['ETag']
 assert hashlib.sha256(raw).hexdigest()==tag.strip('"')
 (D/'pre-save.json').write_bytes(raw);(D/'pre-save.etag').write_text(tag)
 q=apply(json.loads(raw))
 with U.urlopen(U.Request(url,data=enc(q),method='PUT',headers={'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':tag})) as r:print('PUT',r.status)
 with U.urlopen(url) as r:raw=r.read()
 (D/'readback.json').write_bytes(raw);p=json.loads(raw);assert p==q
 at=dec(p['spriteSheets'][n]['imageDataURL']);assert Image.open(D/'opening.gif').n_frames==8
 for i,frame in enumerate(frames):
  im=composite([get(l,i) for l in layers(p) if l['visible']]);assert im.tobytes()==frame.tobytes()==at.crop((24*i,0,24*i+24,16)).tobytes();assert im.getbbox()==(2,0,22,15)
 print('verified 20x15 visible, 24x16 canvas, 8 horizontal opening frames')
