from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-utensils-neutral.json').write_bytes(raw);(D/'before-utensils-neutral.etag').write_text(etag);(D/'before-utensils-neutral.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
M={tuple(bytes.fromhex(a)):tuple(bytes.fromhex(b)) for a,b in [('6c8091','7b7d77'),('839ea6','999991')]}
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert set(M.values())<=allowed
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='厨具挂架');l=next(l for l in p['layers'] if l['sheetIndex']==si);key=f'{si}_0_0';old=dec(l['frameData'][key]['dataURL']);im=old.copy()
for y in range(im.height):
 for x in range(im.width):
  r,g,b,a=old.getpixel((x,y))
  if a and (r,g,b) in M:im.putpixel((x,y),M[(r,g,b)]+(a,))
  else:assert im.getpixel((x,y))==old.getpixel((x,y))
assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
assert all(im.getpixel((x,y))[:3] in allowed for y in range(im.height) for x in range(im.width) if im.getpixel((x,y))[3])
l['frameData'][key]['dataURL']=uri(im);p['spriteSheets'][si]['imageDataURL']=uri(im)
for i,layer in enumerate(p['layers']):
 if layer is not l:assert layer==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i!=si:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly')
out=Image.new('RGB',(780,340),'#ebf0ee');d=ImageDraw.Draw(out);d.text((30,15),'BEFORE',fill='#2f3b3d');d.text((410,15),'NEUTRAL GRAY',fill='#2f3b3d')
for pic,x in [(old,30),(im,410)]:
 large=pic.resize((340,240),Image.Resampling.NEAREST);out.paste(large,(x,50),large)
out.save(D/'utensils-neutral-comparison.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'utensils-neutral-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified only utensil blue-gray pixels replaced with palette neutral grays; wood and other colors/shape untouched; all colors compliant.')
