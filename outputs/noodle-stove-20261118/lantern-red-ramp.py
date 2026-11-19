from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-lantern-red-ramp.json').write_bytes(raw);(D/'before-lantern-red-ramp.etag').write_text(etag);(D/'before-lantern-red-ramp.sha256').write_text(hashlib.sha256(raw).hexdigest())
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
mapping={tuple(bytes.fromhex(a)):tuple(bytes.fromhex(b)) for a,b in [('bd6f42','cc6764'),('d48d57','e38674'),('e0ac6c','e8a68e'),('80575b','8f3648')]}
assert set(mapping.values())<=allowed
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='灯笼');new=None
for l in p['layers']:
 if l['sheetIndex']!=si:continue
 for key,data in l['frameData'].items():
  old=dec(data['dataURL']);im=old.copy()
  for y in range(im.height):
   for x in range(im.width):
    r,g,b,a=old.getpixel((x,y))
    if a:im.putpixel((x,y),mapping.get((r,g,b),(r,g,b))+(a,))
  assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
  assert all(im.getpixel((x,y))[:3] in allowed for y in range(im.height) for x in range(im.width) if im.getpixel((x,y))[3])
  data['dataURL']=uri(im);new=im
sheet=p['spriteSheets'][si];sheet['imageDataURL']=uri(new)
for i,l in enumerate(p['layers']):
 if l['sheetIndex']!=si:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i!=si:assert s==before['spriteSheets'][i]
reference=Image.open(D/'lantern-before.png').convert('RGBA');preview=Image.new('RGB',(460,330),'#ebf0ee');draw=ImageDraw.Draw(preview);draw.text((35,15),'ORIGINAL',fill='#2f3b3d');draw.text((255,15),'OTTERISK 96',fill='#2f3b3d')
for im,x in [(reference,35),(new,255)]:
 im=im.resize((168,240),Image.Resampling.NEAREST);preview.paste(im,(x,45),im)
preview.save(D/'lantern-red-ramp-comparison.png');new.resize((280,400),Image.Resampling.NEAREST).save(D/'lantern-red-ramp-preview.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'lantern-red-ramp-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified red/coral ramp only: yellow/brown removed, exact silhouette retained, all visible pixels in Otterisk96, other materials unchanged.')
