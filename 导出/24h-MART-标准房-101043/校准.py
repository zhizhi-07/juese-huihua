import base64,copy,hashlib,io,json,sys
from pathlib import Path
from urllib.request import urlopen,Request
from PIL import Image,ImageDraw
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
def read():
 with urlopen(url) as r:return r.read(),r.headers['ETag']
def sha(b):return hashlib.sha256(b).hexdigest()
def write(n,j):(D/n).write_text(json.dumps(j,ensure_ascii=False,indent=2),'utf8')
def dec(s):return Image.open(io.BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGBA')
def enc(im):
 b=io.BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
if sys.argv[1]=='draw':
 raw,tag=read();assert not (D/'保存前.json').exists();(D/'保存前.json').write_bytes(raw);write('原版校验.json',dict(sha256=sha(raw),etag=tag))
raw=(D/'保存前.json').read_bytes();meta=json.loads((D/'原版校验.json').read_text('utf8'));assert sha(raw)==meta['sha256'];old=json.loads(raw);p=copy.deepcopy(old);si,=[i for i,s in enumerate(p['spriteSheets']) if s['name']=='24h MART · 原图一比一'];s=p['spriteSheets'][si];assert (s['frameWidth'],s['frameHeight'])==(540,356) and len(s['actions'])==len(s['actions'][0]['frames'])==1
ref=Image.open(r'C:/Users/Administrator/Desktop/Hana Caraka - TopdownTileset/Hana Caraka - Topdown Tileset/House/House.png').convert('RGBA').crop((0,0,64,80));ref=ref.crop(ref.getbbox());assert ref.size==(59,54)
size=(80,64);k=f'{si}_0_0';layers=[l for l in p['layers'] if l['sheetIndex']==si];pal=[(v['r'],v['g'],v['b']) for v in p['palette']];assert len(pal)==96
from functools import lru_cache
@lru_cache(None)
def color(rgb):return min(pal,key=lambda c:sum((a-b)**2 for a,b in zip(rgb,c)))
def resize(im):
 a=im.resize((74,49),Image.Resampling.NEAREST);a.putdata([(*color(c[:3]),255) if c[3] else (0,0,0,0) for c in a.get_flattened_data()]);b=Image.new('RGBA',size);b.paste(a,(2,7));return b
s.update(name='24h MART · 标准房尺寸',frameWidth=80,frameHeight=64,imageDataURL=enc(resize(dec(s['imageDataURL']))))
f=s['actions'][0]['frames'][0];assert f['sourceX']==f['sourceY']==0 and not f['lockedRegions'];f.update(width=80,height=64,notes='平顶房屋宽度按 House.png 左上单栋的 59 px 对齐。')
merged=Image.new('RGBA',size);body=Image.new('RGBA',size)
for l in layers:
 assert set(l['frameData'])=={k};f=l['frameData'][k];im=resize(dec(f['dataURL']));assert im.getbbox()
 if l['name']=='招牌 · 24h MART':
  x0,y0,x1,y1=im.getbbox();dr=ImageDraw.Draw(im);dr.rectangle((x0,y0,x1-1,y1-1),fill='#d4d0cd');dr.rectangle((x0+1,y0,x1-2,y1-2),fill='#ebf0ee')
  letters=['111/001/111/100/111','101/101/111/001/001','10/10/11/11/11','101/111/111/101/101','010/101/111/101/101','110/101/110/101/101','111/010/010/010/010']
  pos=x0
  for j,char in enumerate(letters):
   if j==3:pos+=0
   for dy,row in enumerate(char.split('/')):
    for dx,v in enumerate(row):
     if v=='1':dr.point((pos+dx,y0+1+dy),fill='#b04a58' if j<3 else '#6d8740')
   pos+=len(row)+1
  assert pos-1<=x1
 f.update(width=80,height=64,dataURL=enc(im))
 if l['visible']:merged.alpha_composite(im)
 if l['name'] in ['屋顶 · 木框与檐口','墙体与基脚','门楣 · 三色条带','入口 · 双开玻璃门','屋顶 · 青蓝拼接板','招牌 · 24h MART','橱窗 · 窗框与陈列架','立柱 · 左','立柱 · 右']:body.alpha_composite(im)
box=body.getbbox();bw=box[2]-box[0];assert bw==59,(bw,box);print(box)
merged.save(D/'24h-MART.png');cmp=Image.new('RGBA',(151,68),'#313b3d');cmp.alpha_composite(ref,(3,61-ref.height));cmp.alpha_composite(merged,(68,61-box[3]));cmp.resize((604,272),Image.Resampling.NEAREST).save(D/'同尺度对照.png')
if sys.argv[1]=='save':
 payload=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(D/'候选稿.json').write_bytes(payload)
 with urlopen(Request(url,method='PUT',data=payload,headers={'If-Match':meta['etag'],'X-Pixel-Editor':'1','Content-Type':'application/json'})) as r:status=r.status
 b,t=read();q=json.loads(b);assert q==p;test=Image.new('RGBA',size)
 for l in q['layers']:
  if l['sheetIndex']==si and l['visible']:test.alpha_composite(dec(l['frameData'][k]['dataURL']))
 assert test.tobytes()==merged.tobytes();q['spriteSheets'][si]=old['spriteSheets'][si]
 for i,l in enumerate(q['layers']):
  if l['sheetIndex']==si:l['frameData']=old['layers'][i]['frameData']
 assert q==old
 write('回读校验.json',dict(status=status,etag=t,sha256=sha(b),canvas=size,body=box,refSize=ref.size,layerCount=len(layers),otherSheetsUnchanged=True))



