from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read()
p=json.loads(raw);scene=p['sceneAssembly'];W,H=scene['width'],scene['height'];assert scene['version']==1
(D/'user-assembly-export-source.json').write_bytes(raw);(D/'user-assembly-export-source.sha256').write_text(hashlib.sha256(raw).hexdigest())
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()}
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
cache={}
def delay(s,f):return f.get('duration',0) if s.get('useFrameDurations',True) and f.get('duration',0)>0 else 1000/s.get('fps',8)
def material(o,time):
 si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']==o['material']);s=p['spriteSheets'][si];ai=next(i for i,a in enumerate(s['actions']) if a['name']==o['variant']);a=s['actions'][ai];durations=[delay(s,f) for f in a['frames']];t=time%sum(durations);fi=0
 for i,d in enumerate(durations):
  fi=i
  if t<d:break
  t-=d
 key=f'{si}_{ai}_{fi}'
 if key not in cache:
  f=a['frames'][fi];out=Image.new('RGBA',(f['width'],f['height']))
  for l in p['layers']:
   if l.get('sheetIndex')!=si or l.get('isGroup') or not l.get('visible',True) or key not in l.get('frameData',{}):continue
   data=l['frameData'][key];im=dec(data['dataURL']);assert all(px[:3] in allowed for px in im.getdata() if px[3]),o['material']
   placement=data.get('placement')
   if placement:
    size=(round(placement['w']),round(placement['h']));pos=(round(placement['x']),round(placement['y']))
    if im.size!=size:im=im.resize(size,Image.Resampling.NEAREST)
   else:pos=(0,0)
   if l.get('opacity',1)!=1:im.putalpha(im.getchannel('A').point(lambda a:round(a*l['opacity'])))
   out.alpha_composite(im,pos)
  cache[key]=out
 im=cache[key]
 return im.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if o.get('flip') else im
frames=[];native=[]
for f in range(8):
 out=Image.new('RGBA',(W,H))
 for o in scene['objects']:
  im=material(o,f*110);out.alpha_composite(im,(o['x'],o['y']))
 native.append(out)
 bg=Image.new('RGBA',(W,H),'#d6d0b0');bg.alpha_composite(out);frames.append(bg.convert('RGB').resize((W*5,H*5),Image.Resampling.NEAREST))
native[0].save(D/'user-assembly-transparent.png');frames[0].save(D/'user-assembly-latest.png')
frames[0].save(D/'user-assembly-latest.gif',save_all=True,append_images=frames[1:],duration=110,loop=0,disposal=2,optimize=False)
with Image.open(D/'user-assembly-latest.gif') as check:assert check.n_frames==8 and check.info['loop']==0
with U.urlopen(url) as r:assert r.read()==raw,'Project changed during export; preview is from saved source snapshot'
print('Verified exact saved sceneAssembly: '+str(len(scene['objects']))+' objects, '+str(W)+'x'+str(H)+', original order/positions/flip/variants, latest palette sources and native placement. Export only, project unchanged.')
