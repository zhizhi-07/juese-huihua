from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61);url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-checkout-poster.json').write_bytes(raw);(D/'before-checkout-poster.etag').write_text(etag);(D/'before-checkout-poster.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def nearest(rgb,hexes):
 colors=[tuple(bytes.fromhex(c)) for c in hexes.split()];assert set(colors)<=allowed
 return min(colors,key=lambda c:sum((rgb[i]-c[i])**2 for i in range(3)))
def recolor(name,layer,rgb):
 if rgb==K:return K
 r,g,b=rgb
 if layer=='收银机':return nearest(rgb,'2f3b3d 464b4f 5c6163 7b7d77 999991 b5b2ac d4d0cd ebf0ee')
 if name=='收银台':h='ba9273' if r>=165 else '9e7565' if r>=145 else '785a55' if r>=112 else '5c4644'
 elif r-b>45 and g-b>30:return nearest(rgb,'ba9745 ccb45c e3d176 e0ac6c e8cd97')
 elif min(rgb)>=190:h='d6d0b0'
 elif min(rgb)>=150:h='bdb395'
 elif r<135 and r-g>35:h='8f3648'
 else:h='9e7565'
 return tuple(bytes.fromhex(h))
changed=set();pairs={}
for name in ('收银台','海报'):
 si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']==name);changed.add(si);s=p['spriteSheets'][si];w,h=s['frameWidth'],s['frameHeight'];oldcomp=Image.new('RGBA',(w,h));newcomp=Image.new('RGBA',(w,h))
 for l in p['layers']:
  if l['sheetIndex']!=si:continue
  for key,data in l['frameData'].items():
   old=dec(data['dataURL']);im=old.copy()
   for y in range(im.height):
    for x in range(im.width):
     r,g,b,a=old.getpixel((x,y))
     if a:c=recolor(name,l['name'],(r,g,b));assert c in allowed;im.putpixel((x,y),c+(a,))
     if (r,g,b)==K:assert im.getpixel((x,y))[:3]==K
   assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
   data['dataURL']=uri(im)
   if key==f'{si}_0_0':oldcomp.alpha_composite(old);newcomp.alpha_composite(im)
 assert oldcomp.getchannel('A').tobytes()==newcomp.getchannel('A').tobytes()
 s['imageDataURL']=uri(newcomp);pairs[name]=(oldcomp,newcomp)
for i,l in enumerate(p['layers']):
 if l['sheetIndex'] not in changed:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i not in changed:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly')
for name,(old,new) in pairs.items():
 scale=16 if name=='收银台' else 20;tw=old.width*scale;th=old.height*scale;out=Image.new('RGB',(tw*2+100,th+100),'#ebf0ee');d=ImageDraw.Draw(out);d.text((30,15),'ORIGINAL',fill='#2f3b3d');d.text((tw+70,15),'OTTERISK 96',fill='#2f3b3d')
 for im,x in [(old,30),(new,tw+70)]:
  large=im.resize((tw,th),Image.Resampling.NEAREST);out.paste(large,(x,50),large)
 out.save(D/('checkout-otterisk-comparison.png' if name=='收银台' else 'poster-otterisk-comparison.png'))
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'checkout-poster-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified checkout and poster only; all palette colors, neutral register grays, alpha/outline positions unchanged, unrelated materials/assembly untouched. Await approval.')
