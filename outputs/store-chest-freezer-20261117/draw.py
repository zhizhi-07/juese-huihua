from pathlib import Path
from PIL import Image, ImageDraw
import io,base64,copy,hashlib,json,sys,urllib.request as U
D=Path(__file__).parent
W,H=32,16
palette=set((D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split())
P=dict(k='2f3b3d',K='464b4f',s='6c8091',t='839ea6',m='99bab5',l='bed4c8',h='ebf0ee',g='4d8a7e',G='346c70',c='80c2ac',b='709fcf',B='566178',i='add6e0',r='cc6764',p='e8a68e',R='80575b',w='e8cd97',o='ba9273',v='d6d0b0')
assert set(P.values())<=palette
def blank():return Image.new('RGBA',(W,H))
body,food,lid=blank(),blank(),blank()
def rect(im,x,y,X,Y,c):ImageDraw.Draw(im).rectangle((x,y,X,Y),fill='#'+P[c])
def grid(im,x,y,rows):
 for j,row in enumerate(rows.split()):
  for a,c in enumerate(row):
   if c!='.':rect(im,x+a,y+j,x+a,y+j,c)
# Broad, low case: the rail at the near edge separates the opening from the apron.
rect(body,3,1,28,14,'k');rect(body,4,0,27,14,'k')
rect(body,4,1,27,9,'l');rect(body,5,1,26,1,'h')
rect(body,5,2,26,8,'s');rect(body,6,3,25,8,'m')
rect(body,4,10,27,12,'c');rect(body,4,10,27,10,'g')
rect(body,4,13,27,13,'m');rect(body,5,14,26,14,'K')
# Different wrappers read as piles within baskets, rather than a row of bottles.
grid(food,6,3,'rrR.. .ppR. rrrR.')
grid(food,6,6,'pppr. rhrR. rrrR.')
grid(food,11,4,'wwwo .hwo .ooo')
grid(food,11,7,'wwoo wovo')
grid(food,17,3,'bbbi. bhbb. BBBB.')
grid(food,17,6,'.iib. bbhb. BBBB.')
grid(food,22,4,'cclg clcg gggG')
grid(food,22,7,'cccg lcgg')
# Two sliding panes, their slim divider, and a short reflection near the back.
rect(lid,15,2,15,8,'l');rect(lid,16,2,16,8,'t')
rect(lid,14,5,14,6,'K');rect(lid,17,5,17,6,'K')
rect(lid,6,2,9,2,'i');rect(lid,18,2,21,2,'i')
grid(lid,9,3,'..l .l. m..');grid(lid,23,5,'..l .l. m..');rect(lid,5,9,26,9,'h');rect(lid,4,9,4,9,'m');rect(lid,27,9,27,9,'m')
rect(lid,5,11,8,11,'l');rect(lid,5,12,6,12,'l')
for x in (22,24,26):rect(lid,x,11,x,12,'g')
def uri(im):
 f=io.BytesIO();im.save(f,'PNG');return 'data:image/png;base64,'+base64.b64encode(f.getvalue()).decode()
def dec(u):return Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
ims=[('搪瓷柜体',body),('冷冻商品',food),('滑盖、拉手与散热孔',lid)];im=blank()
for _,i in ims:im.alpha_composite(i)
assert im.getbbox()==(3,0,29,15)
im.save(D/'freezer.png')
# Show the asset at the same pixel pitch as the existing 15px scale figure.
src=Image.open(D.parent/'store-coffee-scale-20261117-081958/comparison.png').convert('RGBA')
person=src.resize((src.width//9,src.height//9),Image.Resampling.NEAREST).crop((3,3,16,18))
comp=Image.new('RGBA',(49,21),'#eeebe5');comp.alpha_composite(person,(3,3));comp.alpha_composite(im,(16,3));comp.resize((392,168),Image.Resampling.NEAREST).save(D/'comparison.png')
name='卧式冰柜 32×16'
def add(base):
 p=copy.deepcopy(base);n=len(p['spriteSheets']);assert name not in [s['name'] for s in p['spriteSheets']]
 s=copy.deepcopy(p['spriteSheets'][3]);s.update(name=name,frameWidth=W,frameHeight=H,imageDataURL=uri(im))
 assert len(s['actions'])==len(s['actions'][0]['frames'])==1
 s['actions'][0]['frames'][0].update(sheetIndex=n,width=W,height=H,sourceX=0,sourceY=0,notes='卧式双滑盖冰柜，正向俯视；机身宽26像素、高15像素，Otterisk 96 限色。')
 p['spriteSheets'].append(s)
 for label,img in ims:p['layers'].append(dict(sheetIndex=n,parent=None,name=label,visible=True,locked=False,opacity=1,frameData={f'{n}_0_0':dict(width=W,height=H,dataURL=uri(img))}))
 return p
enc=lambda p:json.dumps(p,ensure_ascii=False,separators=(',',':')).encode()
(D/'candidate.json').write_bytes(enc(add(json.loads((D/'before.json').read_bytes()))))
if '--save' in sys.argv:
 url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
 with U.urlopen(url) as r:raw=r.read();tag=r.headers['ETag']
 assert hashlib.sha256(raw).hexdigest()==tag.strip('"')
 (D/'pre-save.json').write_bytes(raw);(D/'pre-save.etag').write_text(tag)
 base=json.loads(raw);p=add(base);n=len(base['spriteSheets'])
 with U.urlopen(U.Request(url,enc(p),{'If-Match':tag,'X-Pixel-Editor':'1','Content-Type':'application/json'},method='PUT')) as r:print('PUT',r.status)
 with U.urlopen(url) as r:raw=r.read()
 (D/'readback.json').write_bytes(raw);q=json.loads(raw);assert q==p
 out=blank()
 for l in q['layers'][-3:]:out.alpha_composite(dec(l['frameData'][f'{n}_0_0']['dataURL']))
 assert out.tobytes()==dec(q['spriteSheets'][-1]['imageDataURL']).tobytes()==Image.open(D/'freezer.png').tobytes()
 assert {**q,'spriteSheets':q['spriteSheets'][:-1],'layers':q['layers'][:-3]}==base
 print('Verified native pixels, palette, retained project contents; sheet',n+1)

