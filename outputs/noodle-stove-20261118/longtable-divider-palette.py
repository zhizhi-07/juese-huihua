from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61);url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-longtable-divider-palette.json').write_bytes(raw);(D/'before-longtable-divider-palette.etag').write_text(etag);(D/'before-longtable-divider-palette.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def recolor(name,rgb):
 if rgb==K:return K
 r,g,b=rgb
 h='9e7565' if r>=150 else '785a55' if r>=125 else '5c4644'
 return tuple(bytes.fromhex(h))
changed=set();pairs={}
for name in ('长桌','隔断'):
 si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']==name);changed.add(si)
 for l in p['layers']:
  if l['sheetIndex']!=si:continue
  for key,data in l['frameData'].items():
   old=dec(data['dataURL']);im=old.copy()
   for y in range(im.height):
    for x in range(im.width):
     r,g,b,a=old.getpixel((x,y))
     if a:c=recolor(name,(r,g,b));assert c in allowed;im.putpixel((x,y),c+(a,))
   assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
   for y in range(im.height):
    for x in range(im.width):assert (old.getpixel((x,y))[:3]==K)==(im.getpixel((x,y))[:3]==K)
   data['dataURL']=uri(im);pairs[name]=(old,im)
 p['spriteSheets'][si]['imageDataURL']=uri(im)
for i,l in enumerate(p['layers']):
 if l['sheetIndex'] not in changed:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i not in changed:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly')
for name,(old,new) in pairs.items():
 scale=14 if name=='长桌' else 14;tw=old.width*scale;th=old.height*scale;out=Image.new('RGB',(tw*2+100,th+100),'#ebf0ee');d=ImageDraw.Draw(out);d.text((30,15),'ORIGINAL',fill='#2f3b3d');d.text((tw+70,15),'OTTERISK 96',fill='#2f3b3d')
 for im,x in [(old,30),(new,tw+70)]:
  large=im.resize((tw,th),Image.Resampling.NEAREST);out.paste(large,(x,50),large)
 out.save(D/('longtable-otterisk-comparison.png' if name=='长桌' else 'divider-otterisk-comparison.png'))
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'longtable-divider-palette-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified exactly long table and divider recolored; palette compliance, exact alpha/outline, untouched other sources/assembly; waiting for pair approval.')

