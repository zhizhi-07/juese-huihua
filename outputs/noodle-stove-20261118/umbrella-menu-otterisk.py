from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61);url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-umbrella-menu-otterisk.json').write_bytes(raw);(D/'before-umbrella-menu-otterisk.etag').write_text(etag);(D/'before-umbrella-menu-otterisk.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def closest(rgb,colors):
 choices=[tuple(bytes.fromhex(c)) for c in colors.split()];assert set(choices)<=allowed
 return min(choices,key=lambda c:sum((c[i]-rgb[i])**2 for i in range(3)))
def recolor(name,layer,rgb):
 if rgb==K:return K
 r,g,b=rgb
 if name=='菜单':return tuple(bytes.fromhex('d6d0b0' if r>180 else '5c6163' if r<105 else '7b7d77'))
 if max(rgb)<55:return K
 if layer=='雨伞':
  if min(rgb)>180:return tuple(bytes.fromhex('d4d0cd'))
  if b>=r:return closest(rgb,'444a66 566178 6c8091 839ea6 255269 336c7a')
 return closest(rgb,'5c4644 785a55 9c756a b89184 ccad9b 57483b 6e5f4d 8a7b63 9e7565 ba9273')
changed_sheets=set();pairs={}
for name in ('雨伞桶','菜单'):
 si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']==name);changed_sheets.add(si);s=p['spriteSheets'][si];w,h=s['frameWidth'],s['frameHeight'];oldcomp=Image.new('RGBA',(w,h));newcomp=Image.new('RGBA',(w,h))
 for l in p['layers']:
  if l['sheetIndex']!=si:continue
  for key,data in l['frameData'].items():
   old=dec(data['dataURL']);im=old.copy()
   for y in range(im.height):
    for x in range(im.width):
     r,g,b,a=old.getpixel((x,y))
     if not a:continue
     c=recolor(name,l['name'],(r,g,b));assert c in allowed;im.putpixel((x,y),c+(a,))
     if (r,g,b)==K:assert c==K
     if name=='菜单' and (r,g,b)!=K:assert (r>180)==(c[0]>180),'Menu lettering must stay in place'
   assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
   data['dataURL']=uri(im)
   if key==f'{si}_0_0':oldcomp.alpha_composite(old);newcomp.alpha_composite(im)
 assert all(newcomp.getpixel((x,y))[:3] in allowed for y in range(h) for x in range(w) if newcomp.getpixel((x,y))[3])
 assert oldcomp.getchannel('A').tobytes()==newcomp.getchannel('A').tobytes()
 s['imageDataURL']=uri(newcomp);pairs[name]=(oldcomp,newcomp)
for i,l in enumerate(p['layers']):
 if l['sheetIndex'] not in changed_sheets:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i not in changed_sheets:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly')
for name,(old,new) in pairs.items():
 scale=26;tw=old.width*scale;th=old.height*scale;out=Image.new('RGB',(tw*2+90,th+95),'#ebf0ee');d=ImageDraw.Draw(out);d.text((30,15),'ORIGINAL',fill='#2f3b3d');d.text((tw+60,15),'OTTERISK 96',fill='#2f3b3d')
 for im,x in [(old,30),(new,tw+60)]:
  large=im.resize((tw,th),Image.Resampling.NEAREST);out.paste(large,(x,50),large)
 file='umbrella-otterisk-comparison.png' if name=='雨伞桶' else 'menu-otterisk-comparison.png';out.save(D/file)
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'umbrella-menu-otterisk-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified exactly umbrella stand and menu recolored; 96-color compliance; alpha, original outline pixels, and menu lettering positions retained; other materials/assembly unchanged; awaiting approval.')
