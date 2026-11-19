from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61);url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-door-utensils.json').write_bytes(raw);(D/'before-door-utensils.etag').write_text(etag);(D/'before-door-utensils.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def recolor(name,rgb):
 if rgb==K:return K
 r,g,b=rgb
 if name=='门':
  if max(rgb)<70:return K
  if r-g>35 and r>125:h='b04a58' if r>=160 else '8f3648'
  else:h='9e7565' if r>=150 else '785a55' if r>=125 else '5c4644'
 elif r>b+12 and r>g+8:h='9e7565' if r>=150 else '785a55'
 else:h='b5b2ac' if r>=158 else '839ea6' if r>=138 else '6c8091' if r>=110 else '5c6163' if r>=90 else '464b4f'
 return tuple(bytes.fromhex(h))
changed=set();pairs={}
for name in ('门','厨具挂架'):
 si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']==name);changed.add(si)
 for l in p['layers']:
  if l['sheetIndex']!=si:continue
  for key,data in l['frameData'].items():
   old=dec(data['dataURL']);im=old.copy()
   for y in range(im.height):
    for x in range(im.width):
     r,g,b,a=old.getpixel((x,y))
     if not a:continue
     c=recolor(name,(r,g,b));assert c in allowed;im.putpixel((x,y),c+(a,))
     if (r,g,b)==K:assert c==K
   assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
   data['dataURL']=uri(im);pairs[name]=(old,im)
 p['spriteSheets'][si]['imageDataURL']=uri(im)
for i,l in enumerate(p['layers']):
 if l['sheetIndex'] not in changed:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i not in changed:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly')
for name,(old,new) in pairs.items():
 scale=12 if name=='门' else 20;tw=old.width*scale;th=old.height*scale;out=Image.new('RGB',(tw*2+100,th+100),'#ebf0ee');d=ImageDraw.Draw(out);d.text((30,15),'ORIGINAL',fill='#2f3b3d');d.text((tw+70,15),'OTTERISK 96',fill='#2f3b3d')
 for im,x in [(old,30),(new,tw+70)]:
  large=im.resize((tw,th),Image.Resampling.NEAREST);out.paste(large,(x,50),large)
 out.save(D/('door-otterisk-comparison.png' if name=='门' else 'utensils-otterisk-comparison.png'))
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'door-utensils-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified door and utensil rack only; palette compliance, exact alpha, original outline pixels retained; other materials/assembly untouched. Await approval.')
