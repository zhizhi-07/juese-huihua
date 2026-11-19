from pathlib import Path
from PIL import Image
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61,255)
src=Image.open('C:/Users/cl/Desktop/绘画/.codex-attachments/64bc6b20-2295-49ce-a4ad-afb96eb28abc/c617077f-f8f7-4a2d-bc7b-ad8415218779/Screenshot_20261118_225145.jpg').convert('RGB')
def color(x,y):return src.getpixel((round(x),round(y)))+(255,)
table=Image.new('RGBA',(18,23))
for y in range(23):
 for x in range(18):
  if y==0:
   if x:table.putpixel((x,y),K)
  elif y<=16:
   if x in (0,17):c=K
   else:
    X=285+(x+.5)*28.5;Y=90+(y+.5)*28.5
    # Reconstruct only the area concealed by the diner, steam, and bowl.
    if x>=16 or (x>=10 and y<=11):X=285+(5+(x%3)+.5)*28.5
    c=color(X,Y)
    if max(c[:3])<100:c=(155,117,91,255)
   table.putpixel((x,y),c)
  elif y==17 and x>=1:table.putpixel((x,y),K if x<7 or x>10 else (124,82,83,255))
  elif y==18 and 7<=x<=10:table.putpixel((x,y),K)
  elif x in range(1,5) or x in range(14,18):
   table.putpixel((x,y),K if x in (1,4,14,17) or y==22 else (133,88,85,255))
chair=Image.new('RGBA',(7,20))
for y in range(20):
 for x in range(7):
  if y<18:
   c=K if x in (0,6) or y in (0,17) else color(90+(x+.5)*28,175+(y+.5)*28)
   chair.putpixel((x,y),c)
  elif x!=3:chair.putpixel((x,y),K if y==19 or x in (0,2,4,6) else (134,90,86,255))
url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-table-chair.json').write_bytes(raw);(D/'before-table-chair.etag').write_text(etag);(D/'before-table-chair.sha256').write_text(hashlib.sha256(raw).hexdigest())
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
for name,im in [('桌子',table),('椅子',chair)]:
 assert not any(s['name']==name for s in p['spriteSheets'])
 si=len(p['spriteSheets']);w,h=im.size;data=uri(im)
 p['spriteSheets'].append(dict(name=name,frameWidth=w,frameHeight=h,columns=1,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=data,actions=[dict(name=name,direction='',frames=[dict(sheetIndex=si,sourceX=0,sourceY=0,width=w,height=h,locked=False,lockedRegions=[],status='completed',duration=0)])]))
 p['layers'].append(dict(sheetIndex=si,parent=None,name=name,visible=True,locked=False,opacity=1,frameData={f'{si}_0_0':dict(width=w,height=h,dataURL=data)}))
 im.save(D/(name+'.png'));im.resize((w*24,h*24),Image.Resampling.NEAREST).save(D/(name+'-preview.png'))
layout=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='面馆 · 比例预览');sheet=p['spriteSheets'][layout];w,h=sheet['frameWidth'],sheet['frameHeight']
furniture=next(l for l in p['layers'] if l['sheetIndex']==layout and l['name']=='柜台桌椅')
bowls=next(l for l in p['layers'] if l['sheetIndex']==layout and l['name']=='锅碗食物')
old=dec(furniture['frameData'][f'{layout}_0_0']['dataURL']);new=Image.new('RGBA',(w,h));new.alpha_composite(old.crop((0,0,48,h)),(0,0))
for y in (32,56):
 new.alpha_composite(chair,(51,y+3));new.alpha_composite(table,(59,y));new.alpha_composite(chair,(78,y+3))
food=Image.new('RGBA',(w,h));bowl_si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='碗')
for a,(x,y) in enumerate([(60,37),(68,37),(60,61),(68,61)],1):
 im=Image.new('RGBA',(8,7))
 for l in p['layers']:
  if l['sheetIndex']==bowl_si:im.alpha_composite(dec(l['frameData'][f'{bowl_si}_{a}_0']['dataURL']))
 food.alpha_composite(im,(x,y))
for f in range(8):
 furniture['frameData'][f'{layout}_0_{f}']['dataURL']=uri(new);bowls['frameData'][f'{layout}_0_{f}']['dataURL']=uri(food)
atlas=Image.new('RGBA',(w*8,h));frames=[]
for f in range(8):
 im=Image.new('RGBA',(w,h))
 for l in p['layers']:
  if l['sheetIndex']==layout:im.alpha_composite(dec(l['frameData'][f'{layout}_0_{f}']['dataURL']))
 atlas.alpha_composite(im,(f*w,0));frames.append(im.convert('RGB').resize((768,640),Image.Resampling.NEAREST))
sheet['imageDataURL']=uri(atlas);frames[0].save(D/'table-chair-layout.png');frames[0].save(D/'table-chair-layout.gif',save_all=True,append_images=frames[1:],duration=140,loop=0,disposal=2)
p['currentSheetIndex']=layout;p['currentActionIndex']=0;p['currentFrameIndex']=0;p['currentLayerIndex']=p['layers'].index(furniture)
for i,l in enumerate(before['layers']):
 if l['sheetIndex']!=layout:assert p['layers'][i]==l
for i,s in enumerate(before['spriteSheets']):
 if i!=layout:assert p['spriteSheets'][i]==s
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'table-chair-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified reference table 18x23 and chair 7x20; hidden areas completed; preview furniture replaced; original materials preserved.')
