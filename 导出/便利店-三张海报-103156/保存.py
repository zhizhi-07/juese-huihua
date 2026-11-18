from pathlib import Path
from PIL import Image
from io import BytesIO
from urllib.request import urlopen,Request
import json,base64,copy,hashlib
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
with urlopen(url) as r:raw=r.read();tag=r.headers['ETag']
assert not (D/'保存前.json').exists();(D/'保存前.json').write_bytes(raw);(D/'原版校验.json').write_text(json.dumps(dict(etag=tag,sha256=hashlib.sha256(raw).hexdigest())))
old=json.loads(raw);p=copy.deepcopy(old);si=len(p['spriteSheets']);key=f'{si}_0_0';size=(56,32)
def data(im):
 b=BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def dec(s):return Image.open(BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGBA')
name='便利店 · 三张海报';assert not any(s['name']==name for s in p['spriteSheets'])
f=dict(sheetIndex=si,sourceX=0,sourceY=0,width=56,height=32,locked=False,lockedRegions=[],status='completed',duration=0,notes='饮品海报、风景海报、日历，同一小画布。')
p['spriteSheets'].append(dict(name=name,frameWidth=56,frameHeight=32,columns=1,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=data(Image.new('RGBA',size)),actions=[dict(name='海报',direction='none',frames=[f])]))
pal={tuple(v[c] for c in 'rgb') for v in p['palette']};merged=Image.new('RGBA',size)
for n in ('饮品海报','风景海报','日历海报'):
 im=Image.open(D/'out'/'scenes'/'三张海报'/f'{n}.png').convert('RGBA');assert im.size==size and im.getbbox()
 assert all(px[:3] in pal for px in im.get_flattened_data() if px[3]);merged.alpha_composite(im)
 p['layers'].append(dict(sheetIndex=si,parent=None,name=n,visible=True,locked=False,opacity=1,frameData={key:dict(width=56,height=32,dataURL=data(im))}))
p.update(currentSheetIndex=si,currentActionIndex=0,currentFrameIndex=0,currentLayerIndex=len(old['layers']))
assert merged.tobytes()==Image.open(D/'out'/'scenes'/'三张海报.png').convert('RGBA').tobytes()
merged.save(D/'三张海报.png');merged.resize((448,256),Image.Resampling.NEAREST).save(D/'三张海报-8倍.png')
b=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(D/'候选稿.json').write_bytes(b)
with urlopen(Request(url,data=b,method='PUT',headers={'If-Match':tag,'Content-Type':'application/json','X-Pixel-Editor':'1'})) as r:status=r.status
with urlopen(url) as r:b2=r.read();tag2=r.headers['ETag']
q=json.loads(b2);assert q==p and q['spriteSheets'][:si]==old['spriteSheets'] and q['layers'][:len(old['layers'])]==old['layers']
im=Image.new('RGBA',size)
for l in q['layers'][len(old['layers']):]:im.alpha_composite(dec(l['frameData'][key]['dataURL']))
assert im.tobytes()==merged.tobytes()
report=dict(status=status,sheet=si+1,size=size,layers=3,etag=tag2,sha256=hashlib.sha256(b2).hexdigest(),pixelsVerified=True,oldArtUnchanged=True);(D/'验证.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8');print(report)
