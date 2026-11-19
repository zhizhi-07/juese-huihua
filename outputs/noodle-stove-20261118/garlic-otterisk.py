from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61);url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-garlic-otterisk.json').write_bytes(raw);(D/'before-garlic-otterisk.etag').write_text(etag);(D/'before-garlic-otterisk.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
M={K:K}
for originals,target in [
 ('a99789','b89184'),('947e71','9e7565'),('7c736a','7b7d77'),('9a8375','9c756a'),
 ('c1bca8 bbb79e b2a594 b3a491','bdb395'),
 ('d8d2bc d5caae d1caad ded8be d5cfb7 d7d3b6 e2ddca dfd8be cfc8b5 dcd0b6 dad4ba dad3b6 d9d3b9 ddd1b9 d1ccaf','d6d0b0'),
 ('a99a83 a18e7f 9f8d7f af9f86 a59e8b','a3987a'),
 ('877970 8a7f6d 908373 877768','8a7b63')]:
 for c in originals.split():M[tuple(bytes.fromhex(c))]=tuple(bytes.fromhex(target))
assert set(M.values())<=allowed
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='大蒜挂串');old=None;new=None
for l in p['layers']:
 if l['sheetIndex']!=si:continue
 for key,data in l['frameData'].items():
  original=dec(data['dataURL']);im=original.copy()
  for y in range(im.height):
   for x in range(im.width):
    r,g,b,a=original.getpixel((x,y))
    if a:assert (r,g,b) in M,('Unmapped user color',r,g,b);im.putpixel((x,y),M[(r,g,b)]+(a,))
  assert im.getchannel('A').tobytes()==original.getchannel('A').tobytes()
  for y in range(im.height):
   for x in range(im.width):assert (im.getpixel((x,y))[:3]==K)==(original.getpixel((x,y))[:3]==K)
  data['dataURL']=uri(im);old=original;new=im
p['spriteSheets'][si]['imageDataURL']=uri(new)
for i,l in enumerate(p['layers']):
 if l['sheetIndex']!=si:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i!=si:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly')
out=Image.new('RGB',(520,490),'#ebf0ee');d=ImageDraw.Draw(out);d.text((35,15),'ORIGINAL',fill='#2f3b3d');d.text((295,15),'OTTERISK 96',fill='#2f3b3d')
for im,x in [(old,30),(new,290)]:
 large=im.resize((196,392),Image.Resampling.NEAREST);out.paste(large,(x,55),large)
out.save(D/'garlic-otterisk-comparison.png');new.save(D/'garlic-otterisk.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'garlic-otterisk-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified garlic only: palette colors, exact alpha and outline, existing material regions retained, all other sources/assembly unchanged; await approval.')
