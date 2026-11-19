from pathlib import Path
from PIL import Image
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61,255);W,H=22,16
src=Image.open('C:/Users/cl/Desktop/绘画/.codex-attachments/ce3bc75b-91af-412a-ac43-68977473a26b/ece65c5c-9b28-463e-b428-b3e385d28853/Screenshot_20261118_224835.jpg').convert('RGB')
def sample(x,y):return src.getpixel((round(95+(x+.5)*45.2),round(435+(y+.5)*45.2)))+(255,)
table=Image.new('RGBA',(W,H));machine=Image.new('RGBA',(W,H))
for y in range(2,H):
 for x in range(W):
  c=None
  if y in (2,10):c=K
  elif y<10:
   if x in (0,21):c=K
   else:
    X=4 if (7<=x<=14 and y<=4) or x>=14 else x
    c=sample(X,y)
  elif y<15:
   if x in (1,3,19,21):c=K
   elif 4<=x<=18:c=sample(x,y)
  elif x in (1,21) or 3<=x<=19:c=K
  if c:table.putpixel((x,y),c)
rows=['....kkk.','...ksssk','kkkkkssk','.ssssssk','kssssssk','kssssssk','kssssssk','kkkkkkkk']
for y,row in enumerate(rows):
 for x,ch in enumerate(row):
  if ch=='.':continue
  c=K if ch=='k' else sample(14+x,y)
  machine.putpixel((14+x,y),c)
combined=table.copy();combined.alpha_composite(machine)
url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-checkout.json').write_bytes(raw);(D/'before-checkout.etag').write_text(etag);(D/'before-checkout.sha256').write_text(hashlib.sha256(raw).hexdigest())
assert not any(s['name']=='收银台' for s in p['spriteSheets'])
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
si=len(p['spriteSheets'])
p['spriteSheets'].append(dict(name='收银台',frameWidth=W,frameHeight=H,columns=1,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=uri(combined),actions=[dict(name='收银台',direction='',frames=[dict(sheetIndex=si,sourceX=0,sourceY=0,width=W,height=H,locked=False,lockedRegions=[],status='completed',duration=0,notes='参考木制收银桌与收银机；不含人物；桌面补全。')])]))
p['currentLayerIndex']=len(p['layers']);p['currentSheetIndex']=si;p['currentActionIndex']=0;p['currentFrameIndex']=0
for name,im in [('收银桌',table),('收银机',machine)]:
 p['layers'].append(dict(sheetIndex=si,parent=None,name=name,visible=True,locked=False,opacity=1,frameData={f'{si}_0_0':dict(width=W,height=H,dataURL=uri(im))}))
assert p['layers'][:-2]==before['layers'];assert p['spriteSheets'][:-1]==before['spriteSheets'];assert combined.getbbox()==(0,0,W,H)
for y in range(2,10):
 for x in range(W):assert table.getpixel((x,y))[3]==255
combined.save(D/'checkout.png');combined.resize((704,512),Image.Resampling.NEAREST).save(D/'checkout-preview.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'checkout-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified checkout scene 22x16: complete table and separate register, no person, existing scenes unchanged.')
