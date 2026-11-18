from pathlib import Path
from PIL import Image,ImageDraw
from io import BytesIO
import json,base64,copy,sys,hashlib,urllib.request as u
D=Path(__file__).parent;old=json.loads((D/'原工程.json').read_bytes());p=copy.deepcopy(old)
def dec(s):return Image.open(BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGBA')
def enc(im):
 b=BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def cell_render(cell,size):
 out=Image.new('RGBA',size);im=dec(cell['dataURL']);r=cell.get('placement')
 if r:
  assert all(float(r[k]).is_integer() for k in ('x','y','w','h'))
  im=im.resize((r['w'],r['h']),Image.Resampling.NEAREST);out.alpha_composite(im,(r['x'],r['y']))
 else:out.alpha_composite(im)
 return out
# Self-check the shared placement path, including clipping at the frame boundary.
z=Image.new('RGBA',(2,2),'red');test=cell_render(dict(dataURL=enc(z),placement=dict(x=3,y=2,w=2,h=2)),(4,4));assert test.getbbox()==(3,2,4,4)
def render(pr,si,ai=0,fi=0,snow=None):
 f=pr['spriteSheets'][si]['actions'][ai]['frames'][fi];size=(f['width'],f['height']);out=Image.new('RGBA',size)
 for l in pr['layers']:
  if l['sheetIndex']!=si:continue
  visible=snow if l['name']=='屋顶积雪' and snow is not None else l['visible'];cell=l['frameData'].get(f'{si}_{ai}_{fi}')
  if visible and cell:
   assert l['opacity']==1;out.alpha_composite(cell_render(cell,size))
 return out
normal=render(p,10,snow=False);left=normal.crop((12,41,21,51));right=normal.crop((21,41,29,51));patchlayer,=[l for l in p['layers'] if l['sheetIndex']==10 and l['name']=='滑门动画']
for ai in (1,2):
 for fi,shift in enumerate((0,2,4,6,8,9)):
  patch=Image.new('RGBA',(80,64))
  if shift:
   interior=Image.new('RGBA',(17,10),'#2f3b3d');dr=ImageDraw.Draw(interior);dr.rectangle((0,6,16,9),fill='#464b4f');dr.line((0,9,16,9),fill='#7b7d77')
   interior.paste(left,(-shift,0));interior.paste(right,(9+shift,0));patch.paste(interior,(12,41))
  patchlayer['frameData'][f'10_{ai}_{fi}']=dict(width=80,height=64,dataURL=enc(patch))
  im=render(p,10,ai,fi);static=render(p,10,snow=ai==2)
  assert im.crop((12,37,29,41)).tobytes()==static.crop((12,37,29,41)).tobytes()
  if not shift:assert im.tobytes()==static.tobytes()
  for y in range(64):
   for x in range(80):
    if not(12<=x<29 and 41<=y<51):assert im.getpixel((x,y))==static.getpixel((x,y))
rack=Image.open(D/'out'/'sprites'/'壁挂烟架.png').convert('RGBA');layer,=[l for l in p['layers'] if l['sheetIndex']==12 and l['name']=='壁挂烟架'];assert not layer['locked'];layer['frameData']['12_0_0']=dict(width=22,height=24,dataURL=enc(rack))
poster=render(p,11);assert poster.getbbox()==(2,1,19,15),poster.getbbox()
# The actual art fills the frame when placement is respected; no redraw needed.
assert all(poster.getpixel((x,y))[3]==255 for y in range(7,14) for x in range(6,10))
for n,im in [('壁挂烟架',rack),('三张海报',poster.crop(poster.getbbox()))]:
 im.save(D/(n+'.png'));im.resize((im.width*8,im.height*8),Image.Resampling.NEAREST).save(D/(n+'-预览.png'))
doorstrip=Image.new('RGBA',(64*6,24))
for fi in range(6):doorstrip.alpha_composite(render(p,10,1,fi).crop((0,32,64,56)),(fi*64,0))
doorstrip.resize((768,48),Image.Resampling.NEAREST).save(D/'开门逐帧.png')
(D/'候选工程.json').write_text(json.dumps(p,ensure_ascii=False,separators=(',',':')),'utf8')
if sys.argv[1]=='save':
 url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116';meta=json.loads((D/'原版校验.json').read_text());payload=(D/'候选工程.json').read_bytes()
 with u.urlopen(u.Request(url,data=payload,method='PUT',headers={'If-Match':meta['etag'],'Content-Type':'application/json','X-Pixel-Editor':'1'})) as r:status=r.status
 with u.urlopen(url) as r:b=r.read();tag=r.headers['ETag']
 q=json.loads(b);assert q==p;assert render(q,11).tobytes()==poster.tobytes()
 a=copy.deepcopy(q);a['layers'][p['layers'].index(patchlayer)]=old['layers'][p['layers'].index(patchlayer)];a['layers'][p['layers'].index(layer)]=old['layers'][p['layers'].index(layer)];assert a==old
 (D/'已保存工程.json').write_bytes(b);(D/'保存验证.json').write_text(json.dumps(dict(status=status,etag=tag,sha256=hashlib.sha256(b).hexdigest(),curtainFixedFrames=12,posterSourceUnchanged=True,otherDataUnchanged=True),ensure_ascii=False,indent=2),'utf8');print(status,tag)
