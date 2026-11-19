from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61);url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-stove-pot-smoke.json').write_bytes(raw);(D/'before-stove-pot-smoke.etag').write_text(etag);(D/'before-stove-pot-smoke.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def nearest(rgb,hexes):
 choices=[tuple(bytes.fromhex(c)) for c in hexes.split()];assert set(choices)<=allowed
 return min(choices,key=lambda c:sum((rgb[i]-c[i])**2 for i in range(3)))
def recolor(name,rgb):
 if rgb==K:return K
 r,g,b=rgb
 if name=='烟雾':return nearest(rgb,'b5b2ac d4d0cd ebf0ee')
 if r>g+12 and r>b+18:return nearest(rgb,'5c4644 785a55 9e5333 bd6f42 d48d57 9e7565 ba9273 d1ae8a e8cd97')
 return nearest(rgb,'464b4f 5c6163 7b7d77 999991 b5b2ac d4d0cd ebf0ee')
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='灶台');changed=[];pairs={}
for li,l in enumerate(p['layers']):
 if l['sheetIndex']!=si or l['name'] not in ('锅','烟雾'):continue
 changed.append(li)
 for key,data in l['frameData'].items():
  old=dec(data['dataURL']);im=old.copy();meta={k:v for k,v in data.items() if k!='dataURL'}
  for y in range(im.height):
   for x in range(im.width):
    r,g,b,a=old.getpixel((x,y))
    if a:c=recolor(l['name'],(r,g,b));assert c in allowed;im.putpixel((x,y),c+(a,))
  assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
  for y in range(im.height):
   for x in range(im.width):assert (old.getpixel((x,y))[:3]==K)==(im.getpixel((x,y))[:3]==K)
  data['dataURL']=uri(im);assert {k:v for k,v in data.items() if k!='dataURL'}==meta
  if key==f'{si}_0_0':pairs[l['name']]=(old,im)
assert len(changed)==2
sheet=p['spriteSheets'][si];atlas=Image.new('RGBA',(320,36));anim=[]
for f in range(8):
 out=Image.new('RGBA',(40,36))
 for l in p['layers']:
  if l['sheetIndex']==si:
   im=dec(l['frameData'][f'{si}_0_{f}']['dataURL']);assert all(im.getpixel((x,y))[:3] in allowed for y in range(im.height) for x in range(im.width) if im.getpixel((x,y))[3]);out.alpha_composite(im)
 atlas.alpha_composite(out,(f*40,0));bg=Image.new('RGBA',(40,36),'#b5b2ac');bg.alpha_composite(out);anim.append(bg.convert('RGB').resize((480,432),Image.Resampling.NEAREST))
sheet['imageDataURL']=uri(atlas)
for i,l in enumerate(p['layers']):
 if i not in changed:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i!=si:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly');assert sheet['actions']==before['spriteSheets'][si]['actions']
for name,(old,new) in pairs.items():
 box=old.getbbox();old=old.crop(box);new=new.crop(box);scale=18;tw=old.width*scale;th=old.height*scale;out=Image.new('RGB',(tw*2+100,th+100),'#b5b2ac' if name=='烟雾' else '#ebf0ee');d=ImageDraw.Draw(out);d.text((30,15),'ORIGINAL',fill='#2f3b3d');d.text((tw+70,15),'OTTERISK 96',fill='#2f3b3d')
 for im,x in [(old,30),(new,tw+70)]:
  large=im.resize((tw,th),Image.Resampling.NEAREST);out.paste(large,(x,50),large)
 out.save(D/('stove-pot-otterisk-comparison.png' if name=='锅' else 'stove-smoke-otterisk-comparison.png'))
anim[0].save(D/'stove-all-otterisk.gif',save_all=True,append_images=anim[1:],duration=110,loop=0,disposal=2)
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'stove-pot-smoke-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified only stove pot/smoke recolored; all stove layers now palette compliant; exact alpha, shape, frame timing preserved; unrelated sources/assembly untouched. Await approval.')
