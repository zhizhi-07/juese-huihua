from PIL import Image,ImageDraw
from pathlib import Path
from io import BytesIO
from urllib.request import urlopen,Request
import json,base64,hashlib,copy,sys
D=Path(__file__).parent;raw=(D/'保存前.json').read_bytes();meta=json.loads((D/'原版校验.json').read_text());assert hashlib.sha256(raw).hexdigest()==meta['sha256'];old=json.loads(raw);p=copy.deepcopy(old);si=10;k=f'{si}_0_0';size=(80,64)
ref=Image.open(r'C:/Users/Administrator/Desktop/Hana Caraka - TopdownTileset/Hana Caraka - Topdown Tileset/House/House.png').convert('RGBA');snowRGB={(235,240,238),(173,214,224),(140,186,222)}
sample=ref.crop((0,98,63,143))
sample.putdata([px if px[:3] in snowRGB and px[3] else (0,0,0,0) for px in sample.get_flattened_data()])
cover=sample.resize((63,23),Image.Resampling.NEAREST);snow=Image.new('RGBA',size);snow.paste(cover,(0,5))
# Retain the reference's native one-pixel icicles instead of compressing them to nothing.
pen=ImageDraw.Draw(snow)
pen.line((5,26,5,29),fill='#8cbade');pen.line((6,26,6,28),fill='#add6e0');pen.line((57,26,57,28),fill='#8cbade')
def enc(im):
 b=BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def dec(uri):return Image.open(BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
def merge(q):
 im=Image.new('RGBA',size)
 for l in q['layers']:
  if l['sheetIndex']==si and l['visible'] and k in l['frameData']:im.alpha_composite(dec(l['frameData'][k]['dataURL']))
 return im
assert not any(l['sheetIndex']==si and l['name']=='屋顶积雪' for l in p['layers'])
p['layers'].append(dict(sheetIndex=si,parent=None,name='屋顶积雪',visible=True,locked=False,opacity=1,frameData={k:dict(width=80,height=64,dataURL=enc(snow))}))
before=merge(old);after=merge(p)
for y in range(64):
 for x in range(80):
  if not snow.getpixel((x,y))[3]:assert after.getpixel((x,y))==before.getpixel((x,y))
assert set(px[:3] for px in snow.get_flattened_data() if px[3])==snowRGB
after.save(D/'雪顶便利店.png');after.resize((480,384),Image.Resampling.NEAREST).save(D/'雪顶预览.png');snow.save(D/'屋顶积雪.png')
payload=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(D/'候选稿.json').write_bytes(payload)
if sys.argv[1]=='save':
 url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
 with urlopen(Request(url,method='PUT',data=payload,headers={'If-Match':meta['etag'],'X-Pixel-Editor':'1','Content-Type':'application/json'})) as r:status=r.status
 with urlopen(url) as r:b=r.read();tag=r.headers['ETag']
 q=json.loads(b);assert q==p and merge(q).tobytes()==after.tobytes();assert q['layers'][:-1]==old['layers'] and q['spriteSheets']==old['spriteSheets'];q['layers'].pop();assert q==old
 report=dict(status=status,etag=tag,sha256=hashlib.sha256(b).hexdigest(),onlyNewLayer='屋顶积雪',snowColors=['#ebf0ee','#add6e0','#8cbade'],size=size,snowBBox=snow.getbbox(),existingArtworkUnchanged=True)
 (D/'验证.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8');print(report)
