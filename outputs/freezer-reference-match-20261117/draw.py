from pathlib import Path
import json,io,base64,copy,sys,hashlib,urllib.request as U
from PIL import Image
D=Path(__file__).parent
src=Path('E:/工作/素材/00这里/现代室内素材_v41.2/现代室内/01_室内/16x16/主题分类_单图_无阴影/16_杂货店_单图_无阴影')
ref=[Image.open(src/f'Grocery_Store_Singles_Shadowless_{k}.png').convert('RGBA') for k in (148,149)]
pal=set((D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split())
def lut(s):
 a=s.split();return dict(zip(a[::2],a[1::2],strict=True))
M=lut('''
46465e 464b4f   ebe4f2 ebf0ee   c6bdd5 99bab5   565972 566178   3a3a50 2f3b3d
d8d0e0 bed4c8   8b8bab 839ea6   a79796 7b7d77   6c6e85 6c8091   b2aecb 839ea6
e63f38 b04a58   fc5c46 cc6764   ff8575 e38674   e0b870 e0ac6c   c78c59 bd6f42
f1ce8e e8cd97   f8d239 e3d176   4280dd 4761ad   50a7e8 709fcf   4995e3 5782ba
9bc246 aabd68   64b63b 6d8740
c6c6d9 bed4c8   72798c 6c8091   b98878 b89184   e2f2f3 ebf0ee   d7c298 d1ae8a
cce6ec add6e0   c6a689 ccad9b   a5dfe3 add6e0   bcd279 cfd496   7c8599 839ea6
78b7e7 8cbade   d5f1f0 ebf0ee   d2b494 d1ae8a   ba9781 b89184   a9c97d aabd68
6a7183 566178   b8bcd3 99bab5   e2d1ac e8cd97   9da3b7 99bab5
''');assert set(M.values())<=pal
def blank():return Image.new('RGBA',(32,24))
def map_ref(im):
 o=blank();im=im.crop((0,17,32,41))
 for y in range(24):
  for x in range(32):
   px=im.getpixel((x,y))
   if px[3]:o.putpixel((x,y),tuple(bytes.fromhex(M[bytes(px[:3]).hex()]))+(px[3],))
 return o
closed,opened=map(map_ref,ref)
# Editable product silhouettes: omit the case walls and the empty back of the well.
goods=blank();case=opened.copy()
for x,start in enumerate([5]*7+[8]*6+[8]*6+[6]*5, start=4):
 for y in range(start+1,12):
  px=opened.getpixel((x,y));goods.putpixel((x,y),px);case.putpixel((x,y),tuple(bytes.fromhex('99bab5'))+(255,))
# Fixed stock, lifting glass: reveal from the near rail toward the rear. The glass
# coloration is taken from 148; the unobstructed end pose is exactly 149.
assert (closed.getbbox()==opened.getbbox()==(1,1,31,23))
dists=[0,1,2,4,5,7,8,10];times=[600,100,90,90,90,90,100,850];frames=[];doors=[]
for step in dists:
 door=blank();limit=12-step
 if step<10:
  for y in range(3,limit+1):
   for x in range(3,29):
    a=closed.getpixel((x,y))
    if a!=opened.getpixel((x,y)):door.putpixel((x,y),a)
  if step:
   for x in range(3,29):door.putpixel((x,limit),closed.getpixel((x,12)))
 im=case.copy();im.alpha_composite(goods);im.alpha_composite(door);frames.append(im);doors.append(door)
assert frames[0].tobytes()==closed.tobytes() and frames[-1].tobytes()==opened.tobytes()
def uri(im):
 f=io.BytesIO();im.save(f,'PNG');return 'data:image/png;base64,'+base64.b64encode(f.getvalue()).decode()
def dec(u):return Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
strip=Image.new('RGBA',(32*len(frames),24))
for i,im in enumerate(frames):strip.paste(im,(32*i,0))
strip.save(D/'strip.png');closed.save(D/'closed.png');opened.save(D/'open.png')
def large(im):
 b=Image.new('RGBA',im.size,'#efece6');b.alpha_composite(im);return b.convert('RGB').resize((224,168),Image.Resampling.NEAREST)
gif=list(map(large,frames));gif[0].save(D/'opening.gif',save_all=True,append_images=gif[1:],duration=times,loop=0,disposal=2,optimize=False)
compare=Image.new('RGB',(448,168));compare.paste(large(ref[1].crop((0,17,32,41))),(0,0));compare.paste(gif[-1],(224,0));compare.save(D/'comparison.png')
orig=json.loads((D/'before.json').read_bytes());n=next(i for i,s in enumerate(orig['spriteSheets']) if s['name']=='卧式冰柜 32×16')
def relevant(p):return [l for l in p['layers'] if l.get('sheetIndex')==n]
def apply(p):
 assert p['spriteSheets'][n]==orig['spriteSheets'][n] and relevant(p)==relevant(orig),'Target has changed'
 q=copy.deepcopy(p);s=q['spriteSheets'][n];s.update(name='卧式冰柜 32×24',frameHeight=24,columns=len(frames),imageDataURL=uri(strip));a=s['actions'][0];a['name']='玻璃门打开'
 assert len(a['frames'])==len(times)
 for i,f in enumerate(a['frames']): f.update(height=24,sourceX=i*32,duration=times[i],notes='按参考 148 闭门、149 开门；Otterisk 96 色。')
 ls=relevant(q);assert len(ls)==4 and [l['visible'] for l in ls]==[True,True,False,True]
 for i in range(len(frames)):
  key=f'{n}_0_{i}'
  for l,v in zip(ls,(case,goods,None,doors[i])):
   fd=l['frameData'][key]
   if v is None:
    # Keep the hidden legacy trim intact at its original pixel scale.
    v=blank();v.paste(dec(fd['dataURL']),(0,0))
   fd.update(height=24,width=32,dataURL=uri(v))
 return q
enc=lambda p:json.dumps(p,ensure_ascii=False,separators=(',',':')).encode()
(D/'candidate.json').write_bytes(enc(apply(orig)))
if '--save' in sys.argv:
 url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
 with U.urlopen(url) as r:raw=r.read();tag=r.headers['ETag']
 assert hashlib.sha256(raw).hexdigest()==tag.strip('"')
 (D/'pre-save.json').write_bytes(raw);(D/'pre-save.etag').write_text(tag)
 q=apply(json.loads(raw))
 with U.urlopen(U.Request(url,enc(q),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':tag},method='PUT')) as r:print('PUT',r.status)
 with U.urlopen(url) as r:raw=r.read()
 (D/'readback.json').write_bytes(raw);v=json.loads(raw); assert v==q
 sheet=v['spriteSheets'][n];atlas=dec(sheet['imageDataURL'])
 for j,t in enumerate(times):
  b=blank()
  for l in relevant(v):
   if l['visible']:b.alpha_composite(dec(l['frameData'][f'{n}_0_{j}']['dataURL']))
  assert b.tobytes()==atlas.crop((32*j,0,32*j+32,24)).tobytes()==frames[j].tobytes() and sheet['actions'][0]['frames'][j]['duration']==t
 assert len(set(im.tobytes() for im in frames))==Image.open(D/'opening.gif').n_frames==8
 print('Verified both source-mapped poses, full palette, all 8 frames and layers.')
