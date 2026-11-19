from pathlib import Path
from PIL import Image
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61,255)
src=Image.open('C:/Users/cl/Desktop/绘画/.codex-attachments/e27c46f5-4b51-4d13-8209-5d095e573502/2d72cba3-446e-4ec9-a746-b6f63bf5d988/Screenshot_20261118_230107.jpg').convert('RGB')
im=Image.new('RGBA',(25,8))
wood=[src.getpixel((500,950)),src.getpixel((500,992)),src.getpixel((1055,1028))]
front=src.getpixel((850,1065));brace=src.getpixel((1045,1175))
for x in range(24):im.putpixel((x,0),K)
for y in range(1,5):
 for x in range(25):
  c=K if x in (0,24) else (front+(255,) if y==4 else wood[y-1]+(255,))
  im.putpixel((x,y),c)
for x in range(1,24):im.putpixel((x,5),K)
for x in (2,3,20,21,22):im.putpixel((x,6),K if x in (2,20,22) else brace+(255,))
for x in (3,21,22):im.putpixel((x,7),brace+(255,))
assert im.getbbox()==(0,0,25,8)
url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-wall-shelf.json').write_bytes(raw);(D/'before-wall-shelf.etag').write_text(etag);(D/'before-wall-shelf.sha256').write_text(hashlib.sha256(raw).hexdigest())
assert not any(s['name']=='墙上架子' for s in p['spriteSheets'])
b=io.BytesIO();im.save(b,format='PNG');data='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode();si=len(p['spriteSheets'])
p['spriteSheets'].append(dict(name='墙上架子',frameWidth=25,frameHeight=8,columns=1,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=data,actions=[dict(name='墙上架子',direction='',frames=[dict(sheetIndex=si,sourceX=0,sourceY=0,width=25,height=8,locked=False,lockedRegions=[],status='completed',duration=0,notes='按参考补全空木架，只含木板、描边和下方支架。')])]))
p['currentLayerIndex']=len(p['layers']);p['layers'].append(dict(sheetIndex=si,parent=None,name='空木架',visible=True,locked=False,opacity=1,frameData={f'{si}_0_0':dict(width=25,height=8,dataURL=data)}))
p['currentSheetIndex']=si;p['currentActionIndex']=0;p['currentFrameIndex']=0
assert p['spriteSheets'][:si]==before['spriteSheets'];assert p['layers'][:-1]==before['layers']
im.save(D/'wall-shelf.png');im.resize((800,256),Image.Resampling.NEAREST).save(D/'wall-shelf-preview.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'wall-shelf-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified empty wall shelf 25x8; same project, all previous scenes preserved.')
