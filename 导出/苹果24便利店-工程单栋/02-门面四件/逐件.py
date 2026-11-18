from pathlib import Path
from PIL import Image,ImageDraw
from io import BytesIO
import base64,json,hashlib,sys
from urllib.request import urlopen,Request
d=Path(__file__).resolve().parent
url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
def read():
 with urlopen(url) as r:return r.read(),r.headers['ETag']
def sha(b):return hashlib.sha256(b).hexdigest()
def out(name,obj):(d/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf8')
def decode(uri):return Image.open(BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
def enc(im):
 buf=BytesIO();im.save(buf,'PNG');return 'data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()
if sys.argv[1]=='draw':
 raw,tag=read();assert not (d/'原工程.json').exists()
 (d/'原工程.json').write_bytes(raw);out('原版校验.json',dict(sha256=sha(raw),etag=tag))
raw=(d/'原工程.json').read_bytes();p=json.loads(raw);meta=json.loads((d/'原版校验.json').read_text('utf8'));assert sha(raw)==meta['sha256']
si,= [i for i,s in enumerate(p['spriteSheets']) if s['name']=='苹果24便利店 · 外观'];key=f'{si}_0_0';size=(144,112)
parts={}
def component(name):
 global im,pen
 im=Image.new('RGBA',size);pen=ImageDraw.Draw(im);parts[name]=im
def r(x,y,X,Y,c):pen.rectangle((x-32,y,X-32,Y),fill='#'+c)
def shape(x,y,rows,c):
 for yy,row in enumerate(rows):
  for xx,s in enumerate(row):
   if s=='x':r(x+xx,y+yy,x+xx,y+yy,c)
ink='2f3b3d';trim='5c4644';wood='9e7565';light='d1ae8a';glass='346c70';glint='4d8a7e';blush='cc6764';red='b04a58';cream='e8cd97';milk='d6d0b0'
component('橱窗 · 木框与玻璃')
r(51,71,101,91,trim);r(53,73,99,88,glass);r(53,73,99,75,'255461');r(52,90,100,90,light)
for x in (58,74,90):
 r(x,77,x+3,77,glint);r(x-2,78,x+1,78,glint)
component('橱窗 · 窗棂')
for x in (68,83):r(x,74,x+1,89,trim);r(x,76,x,88,wood)
component('橱窗 · 陈列商品')
# Paired drink bottles, folded cartons, and tins; the spaces between silhouettes remain open.
r(54,87,98,88,wood);r(54,87,98,87,light)
for x in (55,62):
 r(x+1,80,x+2,81,'8ac290');r(x,82,x+3,86,'68a88e');r(x,84,x+3,84,milk)
for x in (71,77):
 r(x+1,80,x+4,80,'839ea6');r(x,81,x+4,86,milk);r(x,83,x+4,84,'709fcf')
for x,y in ((86,82),(93,81)):
 r(x,y,x+3,86,red);r(x,y,x+3,y,cream);r(x,y+2,x+3,y+2,blush)
component('入口 · 玻璃门扇')
r(120,72,136,93,ink);r(121,73,135,92,'566178');r(122,74,134,90,glass)
for k in range(4):r(129-2*k,76+k,132-2*k,76+k,glint)
r(133,81,134,86,'255461');r(133,81,133,85,cream);r(121,91,135,91,'839ea6')
component('雨棚 · 红白条纹布')
r(48,63,105,72,trim)
for i,(c,edge) in enumerate([(blush,red),(cream,light)]*4):
 x=49+i*7
 r(x,64,x+6,70,c)
 r(x,71,x+6,73,trim);r(x+1,74,x+5,74,trim)
 r(x,71,x+6,71,edge);r(x+1,72,x+5,73,edge)
component('招牌 · 苹果24灯箱')
r(112,58,142,68,trim);r(113,59,141,67,cream)
shape(116,60,['....xx.','...xx..','.xx.xx.','xxxxxxx','xxxxxxx','.xxxxx.','..xxx..'],red)
r(120,60,121,60,'4b6c2e');r(119,61,120,61,'4b6c2e')
shape(128,61,['xxx','..x','xxx','x..','xxx'],red)
shape(133,61,['x.x','x.x','xxx','..x','..x'],red)
def merge(p):
 im=Image.new('RGBA',size)
 for l in p['layers']:
  if l.get('sheetIndex')==si and l.get('visible',True) and key in l['frameData']:im.alpha_composite(decode(l['frameData'][key]['dataURL']))
 return im
before=merge(p);changes={}
for n,new in parts.items():
 i,=[i for i,l in enumerate(p['layers']) if l['sheetIndex']==si and l['name']==n]
 l=p['layers'][i];assert l['visible'] and not l['locked']
 f=l['frameData'][key];old=decode(f['dataURL']);assert old.size==new.size and f['width']==144 and f['height']==112
 colors=lambda im:len({pix for pix in im.getdata() if pix[3]})
 changes[n]=[colors(old),colors(new)];f['dataURL']=enc(new)
im=merge(p);im.save(d/'单栋.png');im.resize((576,448),Image.Resampling.NEAREST).save(d/'单栋预览.png')
im.crop((13,55,114,97)).resize((606,252),Image.Resampling.NEAREST).save(d/'门面细节.png')
payload=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(d/'候选稿.json').write_bytes(payload)
if sys.argv[1]=='save':
 req=Request(url,method='PUT',data=payload,headers={'If-Match':meta['etag'],'Content-Type':'application/json','X-Pixel-Editor':'1'})
 with urlopen(req) as resp:status=resp.status
 b2,t2=read();saved=json.loads(b2);assert saved==p and merge(saved).tobytes()==im.tobytes()
 old=json.loads(raw)
 for l in saved['layers']:
  if l['sheetIndex']==si and l['name'] in parts:
   i=next(i for i,ll in enumerate(old['layers']) if ll['sheetIndex']==si and ll['name']==l['name']);l['frameData'][key]['dataURL']=old['layers'][i]['frameData'][key]['dataURL']
 assert saved==old
 out('验证.json',dict(status=status,newETag=t2,newSHA256=sha(b2),colorsBeforeAfter=changes,otherFieldsUnchanged=True))
print(changes)
