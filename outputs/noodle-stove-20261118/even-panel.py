from pathlib import Path
from PIL import Image
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-even-panel.json').write_bytes(raw);(D/'before-even-panel.etag').write_text(etag);(D/'before-even-panel.sha256').write_text(hashlib.sha256(raw).hexdigest())
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='收银台');layer=next(l for l in p['layers'] if l['sheetIndex']==si and l['name']=='收银桌');key=f'{si}_0_0'
def decode(uri):return Image.open(io.BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
im=decode(layer['frameData'][key]['dataURL']);old=im.copy();assert im.size==(22,16)
positions=[3,8,13,18]
for y in range(12,15):
 for x in (12,16):im.putpixel((x,y),old.getpixel((x+1,y)))
 for x in positions:im.putpixel((x,y),old.getpixel((3,y)))
assert all(positions[i+1]-positions[i]==5 for i in range(3))
for y in range(im.height):
 for x in range(im.width):
  if not(12<=y<=14 and x in [3,8,12,13,16,18]):assert im.getpixel((x,y))==old.getpixel((x,y))
layer['frameData'][key]['dataURL']=uri(im)
combined=Image.new('RGBA',im.size)
for l in p['layers']:
 if l['sheetIndex']==si:combined.alpha_composite(decode(l['frameData'][key]['dataURL']))
p['spriteSheets'][si]['imageDataURL']=uri(combined)
for i,l in enumerate(p['layers']):
 if l is not layer:assert l==before['layers'][i]
combined.resize((704,512),Image.Resampling.NEAREST).save(D/'even-panel-preview.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'even-panel-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified lower panel vertical lines at 3,8,13,18; equal 5px spacing; unrelated pixels and layers unchanged.')
