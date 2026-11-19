from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61);url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-bowl-pot.json').write_bytes(raw);(D/'before-bowl-pot.etag').write_text(etag);(D/'before-bowl-pot.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def nearest(rgb,hexes):
 colors=[tuple(bytes.fromhex(c)) for c in hexes.split()];assert set(colors)<=allowed
 return min(colors,key=lambda c:sum((c[i]-rgb[i])**2 for i in range(3)))
def recolor(layer,rgb,variant):
 if rgb==K:return K
 r,g,b=rgb
 if layer in ('锅体','完整空碗','烟雾'):return nearest(rgb,'464b4f 5c6163 7b7d77 999991 b5b2ac d4d0cd ebf0ee')
 if g>r and g>b*1.12:return nearest(rgb,'4b6c2e 6d8740 8aa355 aabd68 cfd496')
 if min(rgb)>215:return nearest(rgb,'d6d0b0 ebf0ee')
 if variant=='番茄汤' and r>g*1.55 and r>=165:return nearest(rgb,'8f3648 b04a58 cc6764 e38674')
 if r-b>=40 and g-b>25 and g/r>=.7:return nearest(rgb,'9e7a36 ba9745 ccb45c e3d176 e6dfa1 e0ac6c e8cd97 d1ae8a d6d0b0')
 return nearest(rgb,'57483b 5c4644 785a55 9e5333 bd6f42 d48d57 9e7565 ba9273 d1ae8a e8cd97 d6d0b0')
changed=set();pairs={};frames_out={}
for name in ('碗','锅'):
 si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']==name);changed.add(si);s=p['spriteSheets'][si]
 for l in p['layers']:
  if l['sheetIndex']!=si:continue
  for key,data in l['frameData'].items():
   ai=int(key.split('_')[1]);variant=s['actions'][ai]['name'];old=dec(data['dataURL']);im=old.copy();meta={k:v for k,v in data.items() if k!='dataURL'}
   for y in range(im.height):
    for x in range(im.width):
     r,g,b,a=old.getpixel((x,y))
     if a:c=recolor(l['name'],(r,g,b),variant);assert c in allowed;im.putpixel((x,y),c+(a,))
     if (r,g,b)==K:assert im.getpixel((x,y))[:3]==K
   assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes();data['dataURL']=uri(im);assert {k:v for k,v in data.items() if k!='dataURL'}==meta
 cols=s['columns'];rows=s['rows'];w,h=s['frameWidth'],s['frameHeight'];atlas=Image.new('RGBA',(cols*w,rows*h));oldvariants=[];newvariants=[];anim=[]
 for ai,a in enumerate(s['actions']):
  for fi,f in enumerate(a['frames']):
   key=f'{si}_{ai}_{fi}';oldcomp=Image.new('RGBA',(f['width'],f['height']));newcomp=Image.new('RGBA',oldcomp.size)
   for li,l in enumerate(p['layers']):
    if l['sheetIndex']==si:
     oldcomp.alpha_composite(dec(before['layers'][li]['frameData'][key]['dataURL']));newcomp.alpha_composite(dec(l['frameData'][key]['dataURL']))
   assert newcomp.getchannel('A').tobytes()==oldcomp.getchannel('A').tobytes()
   atlas.alpha_composite(newcomp,(f['sourceX'],f['sourceY']))
   if fi==0:oldvariants.append(oldcomp);newvariants.append(newcomp)
   if ai==0:anim.append(newcomp)
 s['imageDataURL']=uri(atlas);pairs[name]=(oldvariants,newvariants)
 if name=='锅':
  oldsteam=next(l for l in before['layers'] if l['sheetIndex']==si and l['name']=='烟雾');newsteam=next(l for l in p['layers'] if l['sheetIndex']==si and l['name']=='烟雾')
  for k in oldsteam['frameData']:assert dec(oldsteam['frameData'][k]['dataURL']).getchannel('A').tobytes()==dec(newsteam['frameData'][k]['dataURL']).getchannel('A').tobytes()
  output=[]
  for im in anim:
   bg=Image.new('RGBA',im.size,'#b5b2ac');bg.alpha_composite(im);output.append(bg.convert('RGB').resize((240,320),Image.Resampling.NEAREST))
  output[0].save(D/'pot-otterisk-preview.gif',save_all=True,append_images=output[1:],duration=140,loop=0,disposal=2)
for i,l in enumerate(p['layers']):
 if l['sheetIndex'] not in changed:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i not in changed:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly')
for name,(olds,news) in pairs.items():
 scale=16 if name=='碗' else 6;cellw=olds[0].width*scale;cellh=olds[0].height*scale;n=len(olds);out=Image.new('RGB',(n*(cellw+12)+28,cellh*2+100),'#ebf0ee');d=ImageDraw.Draw(out);d.text((20,8),'ORIGINAL',fill='#2f3b3d');d.text((20,cellh+55),'OTTERISK 96',fill='#2f3b3d')
 for group,y in [(olds,30),(news,cellh+80)]:
  for i,im in enumerate(group):
   large=im.resize((cellw,cellh),Image.Resampling.NEAREST);out.paste(large,(20+i*(cellw+12),y),large)
 out.save(D/('bowl-otterisk-comparison.png' if name=='碗' else 'pot-otterisk-comparison.png'))
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'bowl-pot-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified bowl and pot variants/all frames recolored; all source RGB in palette; exact alpha/outline pixels, frame geometry/timing and smoke-alpha animation preserved; other sources/assembly unchanged.')
