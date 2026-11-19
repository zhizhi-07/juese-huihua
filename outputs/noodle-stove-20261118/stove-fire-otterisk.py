from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61);url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-stove-fire.json').write_bytes(raw);(D/'before-stove-fire.etag').write_text(etag);(D/'before-stove-fire.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
firemap={tuple(bytes.fromhex(a)):tuple(bytes.fromhex(b)) for a,b in [('a94733','8a3c24'),('b14c33','9e5333'),('b95133','bd6f42'),('e27e3a','d48d57'),('f7b84f','e0ac6c'),('ffd882','e8cd97')]};assert set(firemap.values())<=allowed
neutral=[tuple(bytes.fromhex(c)) for c in '464b4f 5c6163 7b7d77 999991 b5b2ac d4d0cd'.split()]
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='灶台');changed_layers=[]
for li,l in enumerate(p['layers']):
 if l['sheetIndex']!=si or l['name'] not in ('灶台本体','火'):continue
 changed_layers.append(li)
 for key,data in l['frameData'].items():
  old=dec(data['dataURL']);im=old.copy()
  for y in range(im.height):
   for x in range(im.width):
    r,g,b,a=old.getpixel((x,y));rgb=(r,g,b)
    if not a:continue
    if rgb==K:c=K
    elif l['name']=='火':assert rgb in firemap,('Unexpected user color',rgb);c=firemap[rgb]
    else:c=min(neutral,key=lambda n:sum((n[i]-rgb[i])**2 for i in range(3)))
    assert c in allowed;im.putpixel((x,y),c+(a,))
  assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
  data['dataURL']=uri(im)
assert len(changed_layers)==2
def composite(project,f):
 out=Image.new('RGBA',(40,36))
 for l in project['layers']:
  if l['sheetIndex']==si:out.alpha_composite(dec(l['frameData'][f'{si}_0_{f}']['dataURL']))
 return out
sheet=p['spriteSheets'][si];atlas=Image.new('RGBA',(320,36));animated=[]
for f in range(8):
 im=composite(p,f);atlas.alpha_composite(im,(f*40,0));bg=Image.new('RGBA',(40,36),'#b5b2ac');bg.alpha_composite(im);animated.append(bg.convert('RGB').resize((480,432),Image.Resampling.NEAREST))
sheet['imageDataURL']=uri(atlas)
for i,l in enumerate(p['layers']):
 if i not in changed_layers:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i!=si:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly');assert sheet['actions']==before['spriteSheets'][si]['actions']
comparison=Image.new('RGB',(720,390),'#ebf0ee');d=ImageDraw.Draw(comparison);d.text((25,15),'ORIGINAL',fill='#2f3b3d');d.text((385,15),'OTTERISK 96',fill='#2f3b3d')
for im,x in [(composite(before,0),20),(composite(p,0),380)]:
 large=im.resize((320,288),Image.Resampling.NEAREST);comparison.paste(large,(x,55),large)
comparison.save(D/'stove-otterisk-comparison.png')
fireidx=next(i for i,l in enumerate(p['layers']) if l['sheetIndex']==si and l['name']=='火');firebefore=dec(before['layers'][fireidx]['frameData'][f'{si}_0_0']['dataURL']);bounds=firebefore.getbbox()
strip=Image.new('RGB',(700,220),'#ebf0ee');d=ImageDraw.Draw(strip);d.text((20,8),'ORIGINAL - 8 FRAMES',fill='#2f3b3d');d.text((20,118),'OTTERISK 96 - SAME SHAPE / TIMING',fill='#2f3b3d')
for project,y in [(before,35),(p,145)]:
 layer=project['layers'][fireidx]
 for f in range(8):
  im=dec(layer['frameData'][f'{si}_0_{f}']['dataURL']).crop(bounds);im=im.resize((im.width*9,im.height*9),Image.Resampling.NEAREST);strip.paste(im,(20+f*84,y),im)
strip.save(D/'fire-otterisk-comparison.png');animated[0].save(D/'stove-otterisk-animation.gif',save_all=True,append_images=animated[1:],duration=110,loop=0,disposal=2)
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'stove-fire-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified only stove-body and flame layers, all 8 frames: palette compliant, exact alpha/geometry/timing preserved; other layers/materials/assembly untouched. Await approval.')
