from pathlib import Path
from io import BytesIO
import urllib.request as u,json,base64,hashlib
from PIL import Image,ImageDraw
D=Path(__file__).resolve().parent;url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
def read():
 with u.urlopen(url) as r:return r.read(),r.headers['ETag']
def sha(b):return hashlib.sha256(b).hexdigest()
def dec(uri):return Image.open(BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
def enc(im):
 b=BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def write(n,v):(D/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
raw,tag=read();p=json.loads(raw);s,=[i for i,v in enumerate(p['spriteSheets']) if v['name']=='苹果24便利店 · 外观'];k=f'{s}_0_0'
assert not (D/'原工程.json').exists()
(D/'原工程.json').write_bytes(raw);write('备份校验.json',dict(sha256=sha(raw),etag=tag))
by={l['name']:l for l in p['layers'] if l['sheetIndex']==s}
def img(n):return dec(by[n]['frameData'][k]['dataURL'])
def store(n,im):
 assert not by[n]['locked'] and by[n]['visible']
 by[n]['frameData'][k]['dataURL']=enc(im)
frame,door,sill='入口 · 门套','入口 · 玻璃门扇','入口 · 门槛'
base=img('墙体 · 奶油色外墙').getbbox()[3]-1
leaf=img(door);frameim=img(frame);oldSill=img(sill)
a,b,c,e=leaf.getbbox();x0,y0,x1,y1=frameim.getbbox();sx,sy,ex,ey=oldSill.getbbox()
dy=base-e;assert 0<dy<12 and (sx<a<c<ex) and (x0<a<c<x1)
# Keep the lintel under the sign; extend its jambs and inset a glass transom above the shifted leaf.
new=Image.new('RGBA',leaf.size);new.alpha_composite(leaf,(0,dy));store(door,new)
for y in range(y1,base+1):frameim.paste(frameim.crop((x0,y1-1,x1,y1)),(x0,y))
fd=ImageDraw.Draw(frameim);fd.rectangle((a,b,c-1,b+dy-2),fill='#346c70');fd.line((a,b+dy-1,c-1,b+dy-1),fill='#2f3b3d');store(frame,frameim)
th=Image.new('RGBA',leaf.size);ImageDraw.Draw(th).line((sx,base,ex-1,base),fill='#b89184');store(sill,th)
def composite(pr):
 im=Image.new('RGBA',leaf.size)
 for l in pr['layers']:
  if l['sheetIndex']==s and l['visible'] and k in l['frameData']: im.alpha_composite(dec(l['frameData'][k]['dataURL']))
 return im
final=composite(p);final.resize((576,448),Image.Resampling.NEAREST).save(D/'平地入口.png')
assert new.getbbox()[3]-1==base-1 and th.getbbox()[1:4:2]==(base,base+1)
assert all(final.getpixel((x,base+1))[3]==0 for x in range(sx,ex))
payload=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(D/'候选稿.json').write_bytes(payload)
with u.urlopen(u.Request(url,method='PUT',data=payload,headers={'Content-Type':'application/json','If-Match':tag,'X-Pixel-Editor':'1'})) as r:status=r.status
raw2,t2=read();q=json.loads(raw2);assert q==p and composite(q).tobytes()==final.tobytes();old=json.loads(raw)
for i,l in enumerate(q['layers']):
 if l['sheetIndex']==s and l['name'] in (frame,door,sill):l['frameData'][k]['dataURL']=old['layers'][i]['frameData'][k]['dataURL']
assert q==old
record=dict(status=status,newETag=t2,sha256=sha(raw2),doorShift=dy,thresholdY=base,changed=[frame,door,sill]);write('验证.json',record);print(record)
