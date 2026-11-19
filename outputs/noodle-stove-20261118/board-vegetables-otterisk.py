from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61);url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-board-vegetables.json').write_bytes(raw);(D/'before-board-vegetables.etag').write_text(etag);(D/'before-board-vegetables.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
greens=[tuple(bytes.fromhex(c)) for c in '32571d 4b6c2e 6d8740 8aa355 aabd68 cfd496'.split()]
def recolor(name,rgb):
 if rgb==K:return K
 r,g,b=rgb
 if name=='菜' or (g>=r and g>b*1.15):return min(greens,key=lambda c:sum((rgb[i]-c[i])**2 for i in range(3)))
 if max(rgb)-min(rgb)<15:h='999991' if r>=135 else '7b7d77'
 else:h='ba9273' if r>=180 else '9e7565' if r>=145 else '785a55' if r>=125 else '5c4644'
 return tuple(bytes.fromhex(h))
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='灶台');changed_layers=[];pairs={}
for li,l in enumerate(p['layers']):
 if l['sheetIndex']!=si or l['name'] not in ('菜板','菜'):continue
 changed_layers.append(li)
 for key,data in l['frameData'].items():
  old=dec(data['dataURL']);im=old.copy()
  for y in range(im.height):
   for x in range(im.width):
    r,g,b,a=old.getpixel((x,y))
    if a:c=recolor(l['name'],(r,g,b));assert c in allowed;im.putpixel((x,y),c+(a,))
  assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
  for y in range(im.height):
   for x in range(im.width):assert (old.getpixel((x,y))[:3]==K)==(im.getpixel((x,y))[:3]==K)
  data['dataURL']=uri(im)
  if key==f'{si}_0_0':pairs[l['name']]=(old,im)
assert len(changed_layers)==2
sheet=p['spriteSheets'][si];atlas=Image.new('RGBA',(320,36))
for f in range(8):
 im=Image.new('RGBA',(40,36))
 for l in p['layers']:
  if l['sheetIndex']==si:im.alpha_composite(dec(l['frameData'][f'{si}_0_{f}']['dataURL']))
 atlas.alpha_composite(im,(f*40,0))
sheet['imageDataURL']=uri(atlas)
for i,l in enumerate(p['layers']):
 if i not in changed_layers:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i!=si:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly');assert sheet['actions']==before['spriteSheets'][si]['actions']
for name,(old,new) in pairs.items():
 box=old.getbbox();old=old.crop(box);new=new.crop(box);scale=24;tw=old.width*scale;th=old.height*scale;out=Image.new('RGB',(tw*2+100,th+100),'#ebf0ee');d=ImageDraw.Draw(out);d.text((30,15),'ORIGINAL',fill='#2f3b3d');d.text((tw+70,15),'OTTERISK 96',fill='#2f3b3d')
 for im,x in [(old,30),(new,tw+70)]:
  large=im.resize((tw,th),Image.Resampling.NEAREST);out.paste(large,(x,50),large)
 out.save(D/('board-otterisk-comparison.png' if name=='菜板' else 'vegetables-otterisk-comparison.png'))
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'board-vegetables-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified only board and vegetables across all stove frames: palette colors, exact alpha/outline, source geometry/timing and unrelated layers/assembly preserved. Await approval.')
