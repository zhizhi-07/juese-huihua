from PIL import Image,ImageDraw
from pathlib import Path
import urllib.request as u,json,base64,io,sys,hashlib
D=Path(__file__).resolve().parent
url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
def get():
 with u.urlopen(url) as r:return r.read(),r.headers['ETag']
def write(n,x):(D/n).write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
def sha(b):return hashlib.sha256(b).hexdigest()
def readpic(s):return Image.open(io.BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGBA')
def putpic(im):
 b=io.BytesIO(); im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
orig=D/'保存前.json'
if sys.argv[1]=='draw':
 assert not orig.exists();raw,tag=get();orig.write_bytes(raw);write('原版校验.json',dict(sha256=sha(raw),etag=tag))
raw=orig.read_bytes();p=json.loads(raw);meta=json.loads((D/'原版校验.json').read_text('utf8'));assert sha(raw)==meta['sha256']
si,=[i for i,s in enumerate(p['spriteSheets']) if s['name']=='苹果24便利店 · 外观']; key=f'{si}_0_0';size=(144,112)
def merged(p):
 im=Image.new('RGBA',size)
 for l in p['layers']:
  if l['sheetIndex']==si and l['visible'] and key in l['frameData']:
   assert l['opacity']==1; im.alpha_composite(readpic(l['frameData'][key]['dataURL']))
 return im
before=merged(p)
roof=Image.new('RGBA',size);trim=Image.new('RGBA',size);rd=ImageDraw.Draw(roof);td=ImageDraw.Draw(trim)
# Draw each column on the same staircase for all parallel eaves and tile courses.
for x in range(5,139):
 delta=abs(x-71);h=(delta*30+33)//67
 side=x<=71
 def stripe(y1,y2,col):rd.line((x,h+y1,x,h+y2),fill='#'+col)
 stripe(3,33,'2f3b3d'); stripe(5,30,'4d8a7e' if side else '346c70')
 for j,y in enumerate((9,16,23,29)):
  phase=(delta+(0,9,4,14)[j])%23
  if 2<=phase<=15:
   stripe(y,y,'346c70' if side else '255461')
  if phase in (6,7,8,9,10,11) and y!=29:
   stripe(y+1,y+1,'68a88e' if side else '4d8a7e')
  if phase==15 and j%2==0:stripe(y-1,y,'346c70' if side else '255461')
 def edge(off,height,color):td.line((x,h+off,x,h+off+height-1),fill='#'+color)
 edge(2,1,'5c4644');edge(3,2,'ba9273' if side else '9e7565');edge(5,1,'785a55')
 edge(30,1,'5c4644');edge(31,2,'ba9273' if side else '9e7565');edge(33,1,'785a55');edge(34,1,'2f3b3d')
# Front gable sits below both roof slopes, behind the front timber edging.
rd.polygon([(9,60),(71,32),(134,60)],fill='#d6d0b0',outline='#5c4644')
rd.polygon([(16,57),(71,32),(127,57),(121,57),(71,37),(22,57)],fill='#bdb395')
rd.rectangle((12,58,131,60),fill='#785a55')
for ends in ((48,57,69,40),(73,40,94,57)):
 rd.line(ends,fill='#785a55',width=2)
rd.rectangle((69,33,73,58),fill='#5c4644');rd.rectangle((70,34,71,57),fill='#9e7565')
td.rectangle((69,2,73,33),fill='#5c4644');td.rectangle((70,1,71,33),fill='#ba9273');td.line((72,3,72,32),fill='#9e7565')
replacements=[('屋顶 · 青绿金属板','屋顶 · 青瓦双坡与山墙',roof),('屋顶 · 后檐压顶','屋顶 · 木屋脊与斜檐',trim)]
for old,new,img in replacements:
 l,=[l for l in p['layers'] if l['sheetIndex']==si and l['name']==old];assert not l['locked'] and l['visible']
 l['name']=new;l['frameData'][key]['dataURL']=putpic(img)
im=merged(p);assert before.crop((0,66,144,112)).tobytes()==im.crop((0,66,144,112)).tobytes()
pal={tuple(v[c] for c in 'rgb') for v in p['palette']}
for im0 in (roof,trim):assert all(rgb[:3] in pal for count,rgb in im0.getcolors(1000) if rgb[3])
im.save(D/'双坡便利店.png');im.resize((576,448),Image.Resampling.NEAREST).save(D/'双坡预览.png')
b=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(D/'候选稿.json').write_bytes(b)
if sys.argv[1]=='save':
 with u.urlopen(u.Request(url,method='PUT',data=b,headers={'If-Match':meta['etag'],'X-Pixel-Editor':'1','Content-Type':'application/json'})) as r:status=r.status
 b2,t=get();q=json.loads(b2); assert q==p and merged(q).tobytes()==im.tobytes()
 old=json.loads(raw)
 for i,l in enumerate(q['layers']):
  if l['sheetIndex']==si and l['name'] in [e[1] for e in replacements]:
   l['name']=old['layers'][i]['name'];l['frameData'][key]['dataURL']=old['layers'][i]['frameData'][key]['dataURL']
 assert old==q
 write('验证.json',dict(status=status,etag=t,sha256=sha(b2),changed=[x[1] for x in replacements],otherFieldsUnchanged=True))
