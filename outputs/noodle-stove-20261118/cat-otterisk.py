from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61);url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-cat-otterisk.json').write_bytes(raw);(D/'before-cat-otterisk.etag').write_text(etag);(D/'before-cat-otterisk.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
# Map the existing material regions explicitly, retaining every outline/feature pixel.
M={}
for originals,target in [
 ('e7d7c7 e7d8c5 e1d2bb','decbbf'),
 ('e5ddc8 dfdac6 e4dec8 e6e2c9 e4d9c5 eae1c4 e5dec2 eae1c2 e0d9bc dfdabd e7e1c9 e2dbbf','d6d0b0'),
 ('ebdecb ede0cf ede0cd','ebf0ee'),
 ('b15b4e a15651 a25e53','b04a58'),('be6857','cc6764'),('a65041','8f3648'),('85635a','80575b'),
 ('417954','4b6c2e'),('467a56','6d8740'),('ccb766','ccb45c'),
 ('c0b19a','bdb395'),('997d68','8a7b63'),('a2724a 94714b a17747','9e7a36'),
 ('e9d69e','e8cd97'),('deb871 d1b178 cfa76a','e0ac6c'),('a78057','ba9745')]:
 for c in originals.split():M[tuple(bytes.fromhex(c))]=tuple(bytes.fromhex(target))
M[K]=K;assert set(M.values())<=allowed
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='招财猫');old=None;new=None
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
out=Image.new('RGB',(560,420),'#ebf0ee');d=ImageDraw.Draw(out);d.text((35,15),'ORIGINAL',fill='#2f3b3d');d.text((315,15),'OTTERISK 96',fill='#2f3b3d')
for im,x in [(old,30),(new,310)]:
 im=im.resize((224,308),Image.Resampling.NEAREST);out.paste(im,(x,55),im)
out.save(D/'cat-otterisk-comparison.png');new.save(D/'cat-otterisk.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'cat-otterisk-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified cat only: all visible colors in Otterisk96; alpha, outline and facial pixel positions retained; all other materials and assembly unchanged.')
