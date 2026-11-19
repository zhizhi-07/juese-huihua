from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy,math
D=Path(__file__).parent
palette_hex=(D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()
assert len(palette_hex)==len(set(palette_hex))==96
palette=[tuple(bytes.fromhex(c)) for c in palette_hex];allowed=set(palette)
assert (47,59,61) in allowed
def lab(rgb):
 rgb=[v/3294.6 if v<=10.31475 else ((v/255+.055)/1.055)**2.4 for v in rgb];r,g,b=rgb
 l=(.4122214708*r+.5363325363*g+.0514459929*b)**(1/3);m=(.2119034982*r+.6806995451*g+.1073969566*b)**(1/3);s=(.0883024619*r+.2817188376*g+.6299787005*b)**(1/3)
 return (.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s)
labs=[lab(c) for c in palette];mapping={}
def nearest(rgb):
 if rgb not in mapping:
  v=lab(rgb);mapping[rgb]=min(zip(palette,labs),key=lambda item:sum((a-b)**2 for a,b in zip(v,item[1])))[0]
 return mapping[rgb]
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-lantern-palette.json').write_bytes(raw);(D/'before-lantern-palette.etag').write_text(etag);(D/'before-lantern-palette.sha256').write_text(hashlib.sha256(raw).hexdigest())
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='灯笼');old=None;new=None
for l in p['layers']:
 if l['sheetIndex']!=si:continue
 for key,data in l['frameData'].items():
  original=dec(data['dataURL']);result=original.copy()
  for y in range(result.height):
   for x in range(result.width):
    r,g,b,a=original.getpixel((x,y))
    if a:result.putpixel((x,y),nearest((r,g,b))+(a,))
  assert result.getchannel('A').tobytes()==original.getchannel('A').tobytes()
  assert all(px[:3] in allowed for px in result.getdata() if px[3])
  data['dataURL']=uri(result)
  if old is None:old=original;new=result
sheet=p['spriteSheets'][si];atlas=Image.new('RGBA',(sheet['columns']*sheet['frameWidth'],sheet['rows']*sheet['frameHeight']))
for ai,a in enumerate(sheet['actions']):
 for fi,f in enumerate(a['frames']):
  out=Image.new('RGBA',(f['width'],f['height']))
  for l in p['layers']:
   if l['sheetIndex']==si:out.alpha_composite(dec(l['frameData'][f'{si}_{ai}_{fi}']['dataURL']))
  assert all(px[:3] in allowed for px in out.getdata() if px[3]);atlas.alpha_composite(out,(f['sourceX'],f['sourceY']))
sheet['imageDataURL']=uri(atlas)
# Only this source material changes; retain all placed instances and other source pixels.
assert p.get('sceneAssembly')==before.get('sceneAssembly')
for i,l in enumerate(p['layers']):
 if l['sheetIndex']!=si:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i!=si:assert s==before['spriteSheets'][i]
old.save(D/'lantern-before.png');new.save(D/'lantern-otterisk.png')
scale=24;preview=Image.new('RGB',(460,340),'#ebf0ee');draw=ImageDraw.Draw(preview)
draw.text((42,18),'BEFORE',fill='#2f3b3d');draw.text((253,18),'OTTERISK 96',fill='#2f3b3d')
preview.paste(old.resize((old.width*scale,old.height*scale),Image.Resampling.NEAREST),(35,50),old.resize((old.width*scale,old.height*scale),Image.Resampling.NEAREST))
large=new.resize((new.width*scale,new.height*scale),Image.Resampling.NEAREST);preview.paste(large,(255,50),large)
draw.text((35,310),'Same shape / same size',fill='#2f3b3d');preview.save(D/'lantern-palette-comparison.png')
report={'palette':'https://lospec.com/palette-list/otterisk-96','material':'灯笼','size':new.size,'before_color_count':len({px[:3] for px in old.getdata() if px[3]}),'after_color_count':len({px[:3] for px in new.getdata() if px[3]}),'off_palette_pixels':0,'mapping':{'#'+bytes(a).hex():'#'+bytes(b).hex() for a,b in mapping.items()}}
(D/'lantern-palette-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'lantern-palette-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print(json.dumps(report,ensure_ascii=True))
