from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-clean-board.json').write_bytes(raw);(D/'before-clean-board.etag').write_text(etag);(D/'before-clean-board.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='灶台');layer=next(l for l in p['layers'] if l['sheetIndex']==si and l['name']=='菜板');oldpreview=None;newpreview=None
for key,data in layer['frameData'].items():
 old=dec(data['dataURL']);im=old.copy();wood=old.getpixel((29,20));assert wood[:3]==(158,117,101)
 for y in range(20,23):
  for x in range(25,29):im.putpixel((x,y),wood)
 assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes()
 for y in range(im.height):
  for x in range(im.width):
   if not(25<=x<=28 and 20<=y<=22):assert im.getpixel((x,y))==old.getpixel((x,y))
 data['dataURL']=uri(im)
 if key==f'{si}_0_0':oldpreview=old;newpreview=im
sheet=p['spriteSheets'][si];atlas=Image.new('RGBA',(320,36))
for f in range(8):
 im=Image.new('RGBA',(40,36))
 for l in p['layers']:
  if l['sheetIndex']==si:im.alpha_composite(dec(l['frameData'][f'{si}_0_{f}']['dataURL']))
 atlas.alpha_composite(im,(f*40,0))
sheet['imageDataURL']=uri(atlas)
for i,l in enumerate(p['layers']):
 if l is not layer:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i!=si:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly')
box=oldpreview.getbbox();out=Image.new('RGB',(680,290),'#ebf0ee');d=ImageDraw.Draw(out);d.text((30,15),'BEFORE',fill='#2f3b3d');d.text((370,15),'CLEAN BOARD',fill='#2f3b3d')
for im,x in [(oldpreview,30),(newpreview,370)]:
 im=im.crop(box);large=im.resize((im.width*24,im.height*24),Image.Resampling.NEAREST);out.paste(large,(x,50),large)
out.save(D/'clean-board-comparison.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'clean-board-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified board residual vegetable pixels and shadows replaced with neighboring palette wood; all frames updated; independent vegetable layer and all unrelated pixels untouched.')
