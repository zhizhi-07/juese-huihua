from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118';K=(47,59,61)
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-flag-otterisk.json').write_bytes(raw);(D/'before-flag-otterisk.etag').write_text(etag);(D/'before-flag-otterisk.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def cream(c):return c[0]>=190 and c[1]>=160 and c[2]>=140
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='小旗帜');original=None;changed=None
for l in p['layers']:
 if l['sheetIndex']!=si:continue
 for key,data in l['frameData'].items():
  old=dec(data['dataURL']);im=old.copy()
  for y in range(im.height):
   for x in range(im.width):
    r,g,b,a=old.getpixel((x,y))
    if not a:continue
    if (r,g,b)==K:c=K
    elif cream((r,g,b)):c=(214,208,176)
    elif y<=5:c=(128,87,91)
    elif r>=185:c=(204,103,100)
    else:c=(176,74,88)
    assert c in allowed;im.putpixel((x,y),c+(a,))
  assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
  for y in range(im.height):
   for x in range(im.width):
    a=old.getpixel((x,y));b=im.getpixel((x,y))
    assert (a[:3]==K)==(b[:3]==K)
    if a[3]:assert cream(a)==cream(b),'Lettering boundary must stay exact'
  data['dataURL']=uri(im);original=old;changed=im
sheet=p['spriteSheets'][si];sheet['imageDataURL']=uri(changed)
for i,l in enumerate(p['layers']):
 if l['sheetIndex']!=si:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i!=si:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly')
preview=Image.new('RGB',(640,440),'#ebf0ee');d=ImageDraw.Draw(preview);d.text((35,12),'ORIGINAL',fill='#2f3b3d');d.text((355,12),'OTTERISK 96',fill='#2f3b3d')
for im,x in [(original,20),(changed,340)]:
 large=im.resize((286,352),Image.Resampling.NEAREST);preview.paste(large,(x,40),large)
preview.save(D/'flag-otterisk-comparison.png');changed.save(D/'flag-otterisk.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'flag-otterisk-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified flag only: all colors in Otterisk96; exact alpha, outline, lettering boundaries; lantern and all other materials unchanged. Await approval before next material.')
