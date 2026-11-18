import json,io,base64,hashlib,sys,copy,urllib.request as U
from pathlib import Path
from PIL import Image
D=Path(__file__).parent
def read(n):return json.loads((D/n).read_bytes())
def decode(uri):return Image.open(io.BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
def uri(im):
 out=io.BytesIO();im.save(out,format='PNG');return 'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()
# Read only the body parts for the scale ruler; no hair or eye offsets affect the measurement.
char=read('character.json');f=char['spriteSheets'][1]['actions'][1]['frames'][0];person=Image.new('RGBA',(f['width'],f['height']))
for l in char['layers']:
 v=l.get('frameData',{}).get('1_1_0')
 if v and l.get('visible') and l['name'] in ['head','hand','body','hand 2']:person.alpha_composite(decode(v['dataURL']))
person=person.crop(person.getbbox())
P={'k':'464b4f','a':'d6d0b0','d':'bdb395','v':'839ea6','u':'9e7565','b':'57483b','m':'99bab5','s':'5c6163','h':'ebf0ee','r':'cc6764','g':'4d8a7e'}
pal=set((D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split())
def art(rows):
 im=Image.new('RGBA',(8,8))
 for y,row in enumerate(rows.split()):
  assert len(row)==8
  for x,c in enumerate(row):
   if c!='.':assert P[c] in pal; im.putpixel((x,y),tuple(bytes.fromhex(P[c]))+(255,))
 return im
body=art('........ .kkkkkk. kaaaaadk kddddddk kdsssddk kdsssddk kmvvvvdk .kkkkkk.')
head=art('.kuuk... .kbbka.. ..kk.... .gm..r.. ...k.... ........ ........ ........')
cup=art('........ ........ ........ ........ ........ ..hbh... ...rd... ........')
layers=[body,head,cup]; im=Image.new('RGBA',(8,8))
for l in layers: im.alpha_composite(l)
assert im.getbbox()==(0,0,8,8)
im.save(D/'coffee.png')
comp=Image.new('RGBA',(person.width+im.width+11,max(person.height,im.height)+6),'#eeebe5');y=comp.height-3
comp.alpha_composite(person,(3,y-person.height));comp.alpha_composite(im,(person.width+8,y-8));comp.resize((comp.width*9,comp.height*9),Image.Resampling.NEAREST).save(D/'comparison.png')
p=read('before.json'); n=4; old=p['spriteSheets'][n];oldlayers=[l for l in p['layers'] if l.get('sheetIndex')==n]
print('body',person.size,'old',decode(old['imageDataURL']).getbbox(),'new',im.size)
def apply(base):
 assert base['spriteSheets'][n]==old and [l for l in base['layers'] if l.get('sheetIndex')==n]==oldlayers
 q=copy.deepcopy(base);s=q['spriteSheets'][n];s.update(name='自助咖啡机 8×8',frameWidth=8,frameHeight=8,imageDataURL=uri(im));f=s['actions'][0]['frames'][0];f.update(width=8,height=8,notes='柜台小家电，8×8 原生像素，俯视机顶、豆仓与杯口。Otterisk 96 限色。')
 for l,img in zip([l for l in q['layers'] if l.get('sheetIndex')==n],layers,strict=True):
  l['frameData']['4_0_0'].update(width=8,height=8,dataURL=uri(img))
 return q
enc=lambda q:json.dumps(q,ensure_ascii=False,separators=(',',':')).encode()
(D/'candidate.json').write_bytes(enc(apply(p)))
if '--save' in sys.argv:
 url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
 with U.urlopen(url) as r: raw=r.read();tag=r.headers['ETag']
 assert hashlib.sha256(raw).hexdigest()==tag.strip('"')
 (D/'pre-save.json').write_bytes(raw);(D/'pre-save.etag').write_text(tag)
 q=apply(json.loads(raw))
 with U.urlopen(U.Request(url,data=enc(q),method='PUT',headers={'If-Match':tag,'X-Pixel-Editor':'1','Content-Type':'application/json'})) as r: print('PUT',r.status)
 with U.urlopen(url) as r: raw=r.read()
 (D/'readback.json').write_bytes(raw);check=json.loads(raw);assert check==q
 composite=Image.new('RGBA',(8,8))
 for l in check['layers']:
  if l.get('sheetIndex')==n: composite.alpha_composite(decode(l['frameData']['4_0_0']['dataURL']))
 assert composite.tobytes()==decode(check['spriteSheets'][n]['imageDataURL']).tobytes()==Image.open(D/'coffee.png').tobytes()
 print('verified')

