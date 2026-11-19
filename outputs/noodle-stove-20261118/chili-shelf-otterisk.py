from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61);url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-chili-shelf-otterisk.json').write_bytes(raw);(D/'before-chili-shelf-otterisk.etag').write_text(etag);(D/'before-chili-shelf-otterisk.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
shelfmap={a:tuple(bytes.fromhex(b)) for a,b in [('a5866a','ba9273'),('a58367','9e7565'),('a88871','b89184'),('735958','785a55'),('6c5756','5c4644')]}
def recolor(name,rgb):
 if rgb==K:return K
 h=bytes(rgb).hex();r,g,b=rgb
 if name=='墙上架子':return shelfmap[h]
 if h=='a68e76':return tuple(bytes.fromhex('a3987a'))
 if h=='7f7261':return tuple(bytes.fromhex('8a7b63'))
 if g>r:return tuple(bytes.fromhex('6d8740'))
 return tuple(bytes.fromhex('cc6764' if r>=175 else 'b04a58' if r>=145 else '8f3648' if r>=122 else '5e4452'))
changed_sheets=set();pairs={}
for name in ('辣椒挂串','墙上架子'):
 si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']==name);changed_sheets.add(si)
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
    for x in range(im.width):assert (im.getpixel((x,y))[:3]==K)==(old.getpixel((x,y))[:3]==K)
   data['dataURL']=uri(im);pairs[name]=(old,im)
 p['spriteSheets'][si]['imageDataURL']=uri(im)
for i,l in enumerate(p['layers']):
 if l['sheetIndex'] not in changed_sheets:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i not in changed_sheets:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly')
for name,(old,new) in pairs.items():
 if name=='辣椒挂串':
  preview=Image.new('RGB',(540,510),'#ebf0ee');d=ImageDraw.Draw(preview);d.text((35,15),'ORIGINAL',fill='#2f3b3d');d.text((305,15),'OTTERISK 96',fill='#2f3b3d')
  for im,x in [(old,30),(new,300)]:
   im=im.resize((208,416),Image.Resampling.NEAREST);preview.paste(im,(x,55),im)
  file='chili-otterisk-comparison.png'
 else:
  preview=Image.new('RGB',(675,470),'#ebf0ee');d=ImageDraw.Draw(preview)
  for im,y,label in [(old,45,'ORIGINAL'),(new,270,'OTTERISK 96')]:
   d.text((35,y-22),label,fill='#2f3b3d');im=im.resize((600,192),Image.Resampling.NEAREST);preview.paste(im,(35,y),im)
  file='shelf-otterisk-comparison.png'
 preview.save(D/file)
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'chili-shelf-otterisk-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified exactly two materials recolored: chili and wall shelf; all visible colors in palette; outline/alpha unchanged; other sources/assembly untouched. Await pair approval.')
