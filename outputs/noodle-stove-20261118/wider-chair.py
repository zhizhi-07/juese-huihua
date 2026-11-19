from pathlib import Path
from PIL import Image
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61,255)
url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-wider-chair.json').write_bytes(raw);(D/'before-wider-chair.etag').write_text(etag);(D/'before-wider-chair.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='椅子');layer=next(l for l in p['layers'] if l['sheetIndex']==si and l['name']=='椅子');old=dec(layer['frameData'][f'{si}_0_0']['dataURL']);assert old.size==(6,15)
chair=Image.new('RGBA',(8,17))
for y in range(17):
 for x in range(8):
  c=None
  if y==0 or (y<15 and x in (0,7)):c=K
  elif y<12:
   X=1+min(3,(x-1)*4//6);Y=1+(y-1)*10//11;c=old.getpixel((X,Y))
  elif y==12:c=(135,96,87,255)
  elif y==13:c=(172,132,102,255)
  elif y==14:c=K
  elif x in (0,1,2,5,6,7):c=K if y==16 or x in (0,2,5,7) else (145,109,98,255)
  if c:chair.putpixel((x,y),c)
assert chair.getbbox()==(0,0,8,17)
layer['frameData']={f'{si}_0_0':dict(width=8,height=17,dataURL=uri(chair))};s=p['spriteSheets'][si];s.update(frameWidth=8,frameHeight=17,imageDataURL=uri(chair));s['actions'][0]['frames'][0].update(width=8,height=17)
changed_sheets={si};changed_layers={p['layers'].index(layer)};placements=[]
for li,l in enumerate(p['layers']):
 if l['name'] not in ('桌椅','柜台桌椅'):continue
 sheet_i=l['sheetIndex'];updated=False
 for key,data in l['frameData'].items():
  im=dec(data['dataURL']);spots=[]
  for y in range(im.height-old.height+1):
   for x in range(im.width-old.width+1):
    if im.getpixel((x,y))==old.getpixel((0,0)) and im.crop((x,y,x+6,y+15)).tobytes()==old.tobytes():spots.append((x,y))
  for x,y in spots:
   assert x>=1 and y>=2 and x+7<=im.width
   im.paste((0,0,0,0),(x,y,x+6,y+15));im.alpha_composite(chair,(x-1,y-2))
  if spots:data['dataURL']=uri(im);updated=True
  if key.endswith('_0_0'):placements.append((sheet_i,spots))
 if updated:changed_sheets.add(sheet_i);changed_layers.add(li)
assert any(i==17 and len(spots)==8 for i,spots in placements),'All eight scene chairs must be replaced'
for sheet_i in changed_sheets-{si}:
 sheet=p['spriteSheets'][sheet_i];w,h=sheet['frameWidth'],sheet['frameHeight'];cols=sheet['columns'];rows=sheet['rows'];atlas=Image.new('RGBA',(w*cols,h*rows));previews=[]
 for ai,a in enumerate(sheet['actions']):
  for fi,f in enumerate(a['frames']):
   key=f'{sheet_i}_{ai}_{fi}';out=Image.new('RGBA',(f['width'],f['height']))
   for l in p['layers']:
    if l['sheetIndex']==sheet_i and l.get('visible',True) and key in l['frameData']:out.alpha_composite(dec(l['frameData'][key]['dataURL']))
   atlas.alpha_composite(out,(f['sourceX'],f['sourceY']));previews.append(out.convert('RGB').resize((w*6,h*6),Image.Resampling.NEAREST))
 sheet['imageDataURL']=uri(atlas)
 if sheet_i==17:
  previews[0].save(D/'wider-chair-room.png');previews[0].save(D/'wider-chair-room.gif',save_all=True,append_images=previews[1:],duration=140,loop=0,disposal=2)
for i,l in enumerate(p['layers']):
 if i not in changed_layers:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i not in changed_sheets:assert s==before['spriteSheets'][i]
chair.resize((256,544),Image.Resampling.NEAREST).save(D/'wider-chair-preview.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'wider-chair-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified chair 6x15 -> 8x17; wider seat/back and separated legs; eight reference-room chairs replaced; characters/tables untouched.')
