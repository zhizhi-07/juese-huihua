from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-cat-face-adjust.json').write_bytes(raw);(D/'before-cat-face-adjust.etag').write_text(etag);(D/'before-cat-face-adjust.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='招财猫');layer=next(l for l in p['layers'] if l['sheetIndex']==si);key=f'{si}_0_0';old=dec(layer['frameData'][key]['dataURL']);im=old.copy();assert im.size==(8,11)
forehead=old.getpixel((3,2));white=old.getpixel((3,3));assert white[:3]==(235,240,238)
edits={(1,3):forehead,(3,3):forehead,(5,3):forehead,(2,4):forehead,(4,4):white,(1,1):forehead,(5,1):forehead}
for xy,c in edits.items():im.putpixel(xy,c)
assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
for y in range(im.height):
 for x in range(im.width):
  if (x,y) not in edits:assert im.getpixel((x,y))==old.getpixel((x,y))
assert im.getpixel((1,1))==im.getpixel((5,1)) and im.getpixel((1,2))==im.getpixel((5,2))
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()}
assert all(im.getpixel((x,y))[:3] in allowed for y in range(im.height) for x in range(im.width) if im.getpixel((x,y))[3])
layer['frameData'][key]['dataURL']=uri(im);p['spriteSheets'][si]['imageDataURL']=uri(im)
for i,l in enumerate(p['layers']):
 if l is not layer:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i!=si:assert s==before['spriteSheets'][i]
preview=Image.new('RGB',(560,420),'#ebf0ee');d=ImageDraw.Draw(preview);d.text((35,15),'BEFORE',fill='#2f3b3d');d.text((315,15),'AFTER',fill='#2f3b3d')
for pic,x in [(old,30),(im,310)]:
 large=pic.resize((224,308),Image.Resampling.NEAREST);preview.paste(large,(x,55),large)
preview.save(D/'cat-face-adjust-comparison.png');im.save(D/'cat-face-adjust.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'cat-face-adjust-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified eye-row forehead color, white nose pixel to red right, symmetric ears, palette compliance and unchanged unrelated pixels.')
