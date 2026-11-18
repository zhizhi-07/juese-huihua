from pathlib import Path
from PIL import Image
import json,copy,hashlib,io,base64,urllib.request as U
D=Path(__file__).parent;n=6
def load(path):return json.loads(path.read_bytes())
old=load(D.parent/'freezer-small-slide-20261117/readback.json'); observed=load(D/'before.json')
def layers(p):return [l for l in p['layers'] if l.get('sheetIndex')==n]
def key(i):return f'{n}_0_{i}'
def im(l,i):return Image.open(io.BytesIO(base64.b64decode(l['frameData'][key(i)]['dataURL'].split(',')[1]))).convert('RGBA')
def uri(v):
 b=io.BytesIO();v.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def compose(ls,i):
 v=Image.new('RGBA',(24,16))
 for l in ls:
  if l['visible']:v.alpha_composite(im(l,i))
 return v
def update(p):
 assert p['spriteSheets'][n]==observed['spriteSheets'][n] and layers(p)==layers(observed),'Target changed; review before writing'
 q=copy.deepcopy(p);ls=layers(q);oldls=layers(old)
 for j in [0,3]:
  first=im(ls[j],0); prev=im(oldls[j],0)
  edits={(x,y):first.getpixel((x,y)) for x in range(24) for y in range(16) if first.getpixel((x,y))!=prev.getpixel((x,y))}
  assert len(edits)==[22,151][j==3]
  if j==3:assert not any(4<=x<=19 and 2<=y<=6 for x,y in edits)
  for i in range(1,8):
   v=im(ls[j],i)
   for xy,px in edits.items():v.putpixel(xy,px)
   ls[j]['frameData'][key(i)]['dataURL']=uri(v)
 s=q['spriteSheets'][n];atlas=Image.new('RGBA',(192,16));frames=[compose(ls,i) for i in range(8)]
 for i,v in enumerate(frames):
  atlas.paste(v,(24*i,0))
  assert v.crop((3,8,21,14)).tobytes()==frames[0].crop((3,8,21,14)).tobytes()
  assert v.crop((4,2,20,7)).tobytes()==compose(layers(p),i).crop((4,2,20,7)).tobytes()
 assert len(set(v.tobytes() for v in frames))==8
 s['imageDataURL']=uri(atlas)
 return q
url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
with U.urlopen(url) as r:raw=r.read();tag=r.headers['ETag']
assert hashlib.sha256(raw).hexdigest()==tag.strip('"')
(D/'pre-save.json').write_bytes(raw);(D/'pre-save.etag').write_text(tag);p=json.loads(raw);q=update(p);data=json.dumps(q,ensure_ascii=False,separators=(',',':')).encode();(D/'candidate.json').write_bytes(data)
with U.urlopen(U.Request(url,data,{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':tag},method='PUT')) as r:print('PUT',r.status)
with U.urlopen(url) as r:raw=r.read()
(D/'readback.json').write_bytes(raw);v=json.loads(raw);assert v==q
s=v['spriteSheets'][n];at=Image.open(io.BytesIO(base64.b64decode(s['imageDataURL'].split(',')[1]))).convert('RGBA');prev=[]
for i in range(8):
 frame=compose(layers(v),i);assert frame.tobytes()==at.crop((24*i,0,24*i+24,16)).tobytes()
 b=Image.new('RGBA',(28,20),'#efece6');b.alpha_composite(frame,(2,2));prev.append(b.convert('RGB').resize((224,160),Image.Resampling.NEAREST))
prev[0].save(D/'opening.gif',save_all=True,append_images=prev[1:],duration=[f['duration'] for f in s['actions'][0]['frames']],loop=0,disposal=2,optimize=False);assert Image.open(D/'opening.gif').n_frames==8
assert all(a['frameData'][key(0)]==b['frameData'][key(0)] for a,b in zip(layers(p),layers(v)))
print('verified first frame unchanged, frame 2-8 synced; original interior motion preserved')
