from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;W,H=128,120;K='#2f3b3d'
url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-reference-room.json').write_bytes(raw);(D/'before-reference-room.etag').write_text(etag);(D/'before-reference-room.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def mat(name,a=0,f=0):
 si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']==name);s=p['spriteSheets'][si];fr=s['actions'][a]['frames'][f%len(s['actions'][a]['frames'])];out=Image.new('RGBA',(fr['width'],fr['height']))
 for l in p['layers']:
  if l['sheetIndex']==si:out.alpha_composite(dec(l['frameData'][f'{si}_{a}_{f%len(s["actions"][a]["frames"])}']['dataURL']))
 return out
room=Image.new('RGBA',(W,H),K);d=ImageDraw.Draw(room)
d.rectangle((2,2,125,113),fill='#77585a');d.rectangle((4,4,123,111),fill=K);d.rectangle((5,5,122,28),fill='#c4c1a2');d.rectangle((5,29,122,110),fill='#805154')
for y in range(30,111,10):
 for x in range(5,123,10):
  d.rectangle((x,y,min(x+8,122),min(y+8,110)),fill=['#bd9556','#ad6e55','#a56551'][(x//10+y//10)%3])
# Tiled working area and an L-shaped service counter follow the reference zoning.
d.rectangle((5,36,45,68),fill=K)
for y in range(37,68,7):
 for x in range(6,45,7):d.rectangle((x,y,min(x+5,44),min(y+5,67)),fill='#b9b8a7')
d.rectangle((46,29,55,71),fill=K);d.rectangle((47,30,54,69),fill='#af8769');d.rectangle((47,70,54,71),fill='#7e5953')
# Back doorway with the red fabric curtain from the reference's layout.
d.rectangle((46,4,75,28),fill=K);d.rectangle((47,5,74,17),fill='#aa4846')
for x in (54,63,72):d.line((x,5,x,17),fill='#793c42')
d.rectangle((47,18,74,23),fill=K);d.rectangle((48,24,73,25),fill='#805452');d.rectangle((47,26,74,28),fill='#a97856')
# Entrance gap and open door at the bottom.
d.rectangle((91,110,110,116),fill='#b68c62');d.rectangle((91,110,110,111),fill='#8d6556');d.rectangle((88,95,90,119),fill=K);d.rectangle((89,97,89,118),fill='#ad8167');d.line((87,97,87,116),fill='#80585a',width=2)
decor=Image.new('RGBA',(W,H))
placements=[('墙上架子',(8,8)),('厨具挂架',(9,17)),('灯笼',(37,6)),('灯笼',(78,6)),('小旗帜',(107,6)),('大蒜挂串',(87,7)),('辣椒挂串',(96,6)),('海报',(108,31)),('隔断',(5,61)),('隔断',(29,61)),('收银台',(7,72)),('招财猫',(22,61)),('地毯',(92,99))]
for name,pos in placements:decor.alpha_composite(mat(name),pos)
furniture=Image.new('RGBA',(W,H));food=Image.new('RGBA',(W,H))
tables=[(95,43),(95,72),(24,89),(58,89)]
for i,(x,y) in enumerate(tables):
 furniture.alpha_composite(mat('椅子'),(x-8,y+3));furniture.alpha_composite(mat('桌子'),(x,y));furniture.alpha_composite(mat('椅子'),(x+19,y+3));food.alpha_composite(mat('碗',i+1),(x+4,y+4))
for y in (36,56):food.alpha_composite(mat('碗',0),(47,y))
name='面馆 · 参考布局';assert not any(s['name']==name for s in p['spriteSheets']);si=len(p['spriteSheets'])
layers=[dict(sheetIndex=si,parent=None,name=n,visible=True,locked=False,opacity=1,frameData={}) for n in ['墙地面与入口','墙挂与柜台','桌椅','碗与食物','厨房动态']]
frames=[];previews=[];atlas=Image.new('RGBA',(W*8,H))
for f in range(8):
 kitchen=Image.new('RGBA',(W,H))
 for l in p['layers']:
  if l['sheetIndex']==0 and l['name'] not in ('锅','烟雾'):kitchen.alpha_composite(dec(l['frameData'][f'0_0_{f}']['dataURL']),(5,23))
 kitchen.alpha_composite(mat('锅',0,f),(4,18));out=Image.new('RGBA',(W,H));key=f'{si}_0_{f}'
 for l,im in zip(layers,[room,decor,furniture,food,kitchen]):l['frameData'][key]=dict(width=W,height=H,dataURL=uri(im));out.alpha_composite(im)
 atlas.alpha_composite(out,(f*W,0));previews.append(out.convert('RGB').resize((768,720),Image.Resampling.NEAREST));frames.append(dict(sheetIndex=si,sourceX=f*W,sourceY=0,width=W,height=H,locked=False,lockedRegions=[],status='completed',duration=140))
p['spriteSheets'].append(dict(name=name,frameWidth=W,frameHeight=H,columns=8,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=7,useFrameDurations=True,imageDataURL=uri(atlas),actions=[dict(name='全景',direction='',frames=frames)]))
p['currentSheetIndex']=si;p['currentActionIndex']=0;p['currentFrameIndex']=0;p['currentLayerIndex']=len(p['layers']);p['layers']+=layers
assert p['spriteSheets'][:si]==before['spriteSheets'];assert p['layers'][:len(before['layers'])]==before['layers']
previews[0].save(D/'reference-room.png');previews[0].save(D/'reference-room.gif',save_all=True,append_images=previews[1:],duration=140,loop=0,disposal=2)
with Image.open(D/'reference-room.gif') as im:assert im.n_frames==8
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'reference-room-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified new 128x120 reference-layout scene, existing native materials reused, eight animation frames, source scenes unchanged.')
