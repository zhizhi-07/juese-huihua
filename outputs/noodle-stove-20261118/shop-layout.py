from pathlib import Path
from PIL import Image, ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;W,H=96,80;K='#2f3b3d'
url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-layout.json').write_bytes(raw);(D/'before-layout.etag').write_text(etag);(D/'before-layout.sha256').write_text(hashlib.sha256(raw).hexdigest())
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def image(l,key):return Image.open(io.BytesIO(base64.b64decode(l['frameData'][key]['dataURL'].split(',')[1]))).convert('RGBA')
def material(name,action=0,frame=0):
 si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']==name);s=p['spriteSheets'][si];out=Image.new('RGBA',(s['frameWidth'],s['frameHeight']))
 for l in p['layers']:
  if l['sheetIndex']==si:out.alpha_composite(image(l,f'{si}_{action}_{frame}'))
 return out
existing=next((i for i,s in enumerate(p['spriteSheets']) if s['name']=='面馆 · 比例预览'),None)
if existing is not None:
 p['spriteSheets']=p['spriteSheets'][:existing];p['layers']=[l for l in p['layers'] if l['sheetIndex']!=existing];before=copy.deepcopy(p)
room=Image.new('RGBA',(W,H),K);d=ImageDraw.Draw(room)
d.rectangle((2,2,93,30),fill='#c4c1a2');d.rectangle((2,31,93,77),fill='#8d5952')
for y in range(33,77,11):
 for x in range(3,93,11):
  d.rectangle((x,y,x+9,min(y+9,77)),fill='#bd9258' if (x//11+y//11)%3==0 else '#aa6c55')
d.rectangle((2,29,93,31),fill=K);d.rectangle((48,2,49,77),fill='#805a50')
furniture=Image.new('RGBA',(W,H));d=ImageDraw.Draw(furniture)
# A preparation counter and two dining tables supply a consistent size reference.
d.rectangle((3,49,46,61),fill=K);d.rectangle((4,50,45,53),fill='#bd9470');d.rectangle((4,54,45,60),fill='#916b55')
for x in range(7,46,7):d.line((x,55,x,60),fill='#75534b')
for y in [36,60]:
 d.rectangle((57,y+12,59,y+17),fill=K);d.rectangle((80,y+12,82,y+17),fill=K)
 d.rectangle((54,y,85,y+12),fill=K);d.rectangle((55,y+1,84,y+10),fill='#b98d68');d.line((56,y+6,83,y+6),fill='#95705a')
 d.rectangle((49,y+3,52,y+11),fill=K);d.rectangle((50,y+4,51,y+8),fill='#a77e61')
 d.rectangle((88,y+3,91,y+11),fill=K);d.rectangle((89,y+4,90,y+8),fill='#a77e61')
decor=Image.new('RGBA',(W,H));decor.alpha_composite(material('灯笼'),(8,5));decor.alpha_composite(material('灯笼'),(39,5));decor.alpha_composite(material('小旗帜'),(65,4));decor.alpha_composite(material('招财猫'),(37,38))
bowls=Image.new('RGBA',(W,H))
for pos,a in [((59,37),1),((74,37),2),((59,61),3),((74,61),4)]:bowls.alpha_composite(material('碗',a),pos)
si=len(p['spriteSheets']);layer_names=['墙面与地面','柜台桌椅','灯笼旗帜招财猫','锅碗食物','灶台与动画'];layers=[dict(sheetIndex=si,parent=None,name=n,visible=True,locked=False,opacity=1,frameData={}) for n in layer_names]
frames=[];previews=[];atlas=Image.new('RGBA',(W*8,H))
for f in range(8):
 stove=Image.new('RGBA',(W,H))
 for l in p['layers']:
  if l['sheetIndex']==0 and l['name'] not in ['锅','烟雾']:stove.alpha_composite(image(l,f'0_0_{f}'),(0,18))
 stove.alpha_composite(material('锅',0,f),(-1,13))
 combined=Image.new('RGBA',(W,H));key=f'{si}_0_{f}'
 for l,im in zip(layers,[room,furniture,decor,bowls,stove]):
  l['frameData'][key]=dict(width=W,height=H,dataURL=uri(im));combined.alpha_composite(im)
 atlas.alpha_composite(combined,(f*W,0));previews.append(combined.convert('RGB').resize((768,640),Image.Resampling.NEAREST))
 frames.append(dict(sheetIndex=si,sourceX=f*W,sourceY=0,width=W,height=H,locked=False,lockedRegions=[],status='completed',duration=140))
p['spriteSheets'].append(dict(name='面馆 · 比例预览',frameWidth=W,frameHeight=H,columns=8,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=7,useFrameDurations=True,imageDataURL=uri(atlas),actions=[dict(name='全景',direction='',frames=frames)]))
p['currentSheetIndex']=si;p['currentActionIndex']=0;p['currentFrameIndex']=0;p['currentLayerIndex']=len(p['layers']);p['layers']+=layers
assert p['spriteSheets'][:si]==before['spriteSheets'];assert p['layers'][:len(before['layers'])]==before['layers']
previews[0].save(D/'shop-layout.png');previews[0].save(D/'shop-layout.gif',save_all=True,append_images=previews[1:],duration=140,loop=0,disposal=2)
with Image.open(D/'shop-layout.gif') as check:assert check.n_frames==8
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'layout-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified 96x80 layout, native 1:1 asset sizes, 8 animated frames, original materials unchanged.')

