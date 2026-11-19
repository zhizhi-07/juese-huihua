from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id='
def fetch(id):
 with U.urlopen(url+id) as r:return r.read(),r.headers['ETag']
raw,etag=fetch('scene-noodle-shop-20261118');p=json.loads(raw);before=copy.deepcopy(p);source_raw,_=fetch('base-outlined-1794365455561')
(D/'before-character-otterisk.json').write_bytes(raw);(D/'before-character-otterisk.etag').write_text(etag);(D/'before-character-otterisk.sha256').write_text(hashlib.sha256(raw).hexdigest())
allowed={tuple(bytes.fromhex(c)) for c in (D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split()};assert len(allowed)==96
M={tuple(bytes.fromhex(a)):tuple(bytes.fromhex(b)) for a,b in [('46465e','444a66'),('525252','464b4f'),('636363','5c6163'),('7c5e4b','785a55'),('9b7862','9e7565'),('b97a45','bd6f42'),('dda15e','e0ac6c'),('e0c5b4','decbbf'),('f3c98b','e8cd97'),('feede1','ebcbbc'),('ffe0e0','ebc7ca')]};assert set(M.values())<=allowed
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='人物 · 原版描边');sheet=p['spriteSheets'][si];pairs={};changed=[]
for li,l in enumerate(p['layers']):
 if l['sheetIndex']!=si:continue
 changed.append(li)
 for key,data in l['frameData'].items():
  old=dec(data['dataURL']);im=old.copy()
  for y in range(im.height):
   for x in range(im.width):
    r,g,b,a=old.getpixel((x,y))
    if a:assert (r,g,b) in M,('Unexpected new user color',r,g,b);im.putpixel((x,y),M[(r,g,b)]+(a,))
  assert im.getchannel('A').tobytes()==old.getchannel('A').tobytes();data['dataURL']=uri(im);pairs[key]=(old,im)
atlas=Image.new('RGBA',(sheet['frameWidth']*sheet['columns'],sheet['frameHeight']*sheet['rows']))
for ai,a in enumerate(sheet['actions']):
 for fi,f in enumerate(a['frames']):atlas.alpha_composite(pairs[f'{si}_{ai}_{fi}'][1],(f['sourceX'],f['sourceY']))
sheet['imageDataURL']=uri(atlas)
for i,l in enumerate(p['layers']):
 if i not in changed:assert l==before['layers'][i]
for i,s in enumerate(p['spriteSheets']):
 if i!=si:assert s==before['spriteSheets'][i]
assert p.get('sceneAssembly')==before.get('sceneAssembly');assert sheet['actions']==before['spriteSheets'][si]['actions']
for ai,filename in [(0,'character-standing-otterisk-comparison.png'),(2,'character-sitting-otterisk-comparison.png')]:
 old,new=pairs[f'{si}_{ai}_0'];scale=12;w,h=old.size;out=Image.new('RGB',(w*scale*2+100,h*scale+100),'#d6d0b0');d=ImageDraw.Draw(out);d.text((30,15),'ORIGINAL',fill='#2f3b3d');d.text((w*scale+70,15),'OTTERISK 96',fill='#2f3b3d')
 for im,x in [(old,30),(new,w*scale+70)]:
  large=im.resize((w*scale,h*scale),Image.Resampling.NEAREST);out.paste(large,(x,50),large)
 out.save(D/filename)
req=U.Request(url+'scene-noodle-shop-20261118',json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
back,_=fetch('scene-noodle-shop-20261118');assert json.loads(back)==p
source_after,_=fetch('base-outlined-1794365455561');assert source_after==source_raw
(D/'character-otterisk-readback.json').write_bytes(back)
print('Verified imported character standing/side/sitting palette colors, alpha and frame geometry unchanged; character master byte-identical; other materials and assembly unchanged. Await approval.')
