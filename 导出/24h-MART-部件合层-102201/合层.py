from PIL import Image
from io import BytesIO
from pathlib import Path
import json,copy,base64,hashlib,urllib.request as u
D=Path(__file__).parent;raw=(D/'保存前.json').read_bytes();meta=json.loads((D/'原版校验.json').read_text());assert hashlib.sha256(raw).hexdigest()==meta['sha256']
p=json.loads(raw);old=copy.deepcopy(p);si=10;k='10_0_0';size=(80,64)
assert p['spriteSheets'][si]['name']=='24h MART · 标准房尺寸'
target=[(i,l) for i,l in enumerate(p['layers']) if l['sheetIndex']==si];indices=[i for i,l in target];assert indices==list(range(indices[0],len(p['layers'])))
assert all(l.get('parent') is None and not l.get('isGroup') and not l['locked'] and l['opacity']==1 and set(l['frameData'])=={k} for i,l in target)
def dec(s):return Image.open(BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGBA')
def enc(im):
 b=BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def category(name,x=None,y=None):
 if name=='绘画图层 76':
  if y<26:return '屋顶'
  if y<35:return '招牌'
  if 11<=x<31:return '门'
  if 32<=x<51 and y<48:return '窗户'
  return '墙体'
 if name.startswith('屋顶'):return '屋顶'
 if name.startswith(('门楣','招牌')):return '招牌'
 if name.startswith(('入口','补绘')):return '门'
 if name.startswith('橱窗'):return '窗户'
 if name=='右侧 · 红色售货机':return '饮料机'
 if name.startswith(('左侧','门前','右侧')):return '其他设施'
 return '墙体'
names=['墙体','屋顶','招牌','窗户','门','饮料机','其他设施']
images={n:Image.new('RGBA',size) for n in names};visible={n:set() for n in names};before=Image.new('RGBA',size)
for i,l in target:
 a=dec(l['frameData'][k]['dataURL']);assert a.size==size
 if l['visible']:before.alpha_composite(a)
 for y in range(size[1]):
  for x in range(size[0]):
   pix=a.getpixel((x,y))
   if not pix[3]:continue
   assert pix[3]==255
   n=category(l['name'],x,y);visible[n].add(l['visible'])
   if l['visible']:
    for nn in names:
     if nn not in ('饮料机','其他设施'):images[nn].putpixel((x,y),(0,0,0,0))
   images[n].putpixel((x,y),pix)
assert all(len(v)==1 for v in visible.values())
layers=[]
for n in names:
 assert images[n].getbbox()
 layers.append(dict(sheetIndex=si,parent=None,name=n,visible=next(iter(visible[n])),locked=False,opacity=1,frameData={k:dict(width=80,height=64,dataURL=enc(images[n]))}))
p['layers']=p['layers'][:indices[0]]+layers
selected=old['layers'][old['currentLayerIndex']]['name']
if old['currentLayerIndex']>=indices[0]:p['currentLayerIndex']=indices[0]+names.index(category(selected,20,40) if selected=='绘画图层 76' else category(selected))
def merged(project):
 out=Image.new('RGBA',size)
 for l in project['layers']:
  if l['sheetIndex']==si and l['visible']:out.alpha_composite(dec(l['frameData'][k]['dataURL']))
 return out
after=merged(p);assert before.tobytes()==after.tobytes()
after.save(D/'合层后.png');after.resize((480,384),Image.Resampling.NEAREST).save(D/'合层后-6倍.png')
payload=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(D/'候选稿.json').write_bytes(payload)
url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
with u.urlopen(u.Request(url,data=payload,method='PUT',headers={'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta['etag']})) as r:status=r.status
with u.urlopen(url) as r:b=r.read();etag=r.headers['ETag']
q=json.loads(b);assert q==p and merged(q).tobytes()==before.tobytes();assert q['spriteSheets']==old['spriteSheets'] and q['layers'][:indices[0]]==old['layers'][:indices[0]]
report=dict(status=status,etag=etag,sha256=hashlib.sha256(b).hexdigest(),beforeLayers=len(target),afterLayers=len(layers),pixelExact=True,names=names,hidden=['饮料机','其他设施'],otherSheetsUnchanged=True)
(D/'验证.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8');print(json.dumps(report,ensure_ascii=False))
