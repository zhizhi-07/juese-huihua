from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-update-room-assets.json').write_bytes(raw);(D/'before-update-room-assets.etag').write_text(etag);(D/'before-update-room-assets.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def mat(name):
 si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']==name);f=p['spriteSheets'][si]['actions'][0]['frames'][0];out=Image.new('RGBA',(f['width'],f['height']))
 for l in p['layers']:
  if l['sheetIndex']==si and l.get('visible',True):out.alpha_composite(dec(l['frameData'][f'{si}_0_0']['dataURL']))
 return out
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='面馆 · 参考布局');sheet=p['spriteSheets'][si];W,H=sheet['frameWidth'],sheet['frameHeight']
room=next(l for l in p['layers'] if l['sheetIndex']==si and l['name']=='墙地面与入口');decor=next(l for l in p['layers'] if l['sheetIndex']==si and l['name']=='墙挂与柜台');bowls=next(l for l in p['layers'] if l['sheetIndex']==si and l['name']=='碗与食物')
newdecor=Image.new('RGBA',(W,H))
placements=[('墙上架子',(8,8)),('厨具挂架',(9,17)),('灯笼',(37,6)),('灯笼',(78,6)),('小旗帜',(107,6)),('大蒜挂串',(87,7)),('辣椒挂串',(96,6)),('海报',(108,31)),('隔断',(5,61)),('隔断',(29,61)),('收银台',(7,72)),('招财猫',(22,61)),('地毯',(92,99)),('门',(45,4)),('长桌',(46,30)),('菜单',(29,19)),('雨伞桶',(113,95)),('柴火堆',(6,54)),('筷子筒',(49,32))]
for name,pos in placements:
 im=mat(name);assert pos[0]+im.width<=W and pos[1]+im.height<=H;newdecor.alpha_composite(im,pos)
details=Image.new('RGBA',(W,H))
for x,y in [(95,43),(95,72),(24,89),(58,89)]:
 details.alpha_composite(mat('调料瓶'),(x+12,y+3))
details.alpha_composite(mat('调料瓶'),(48,47))
for f in range(8):
 key=f'{si}_0_{f}';im=dec(room['frameData'][key]['dataURL']);d=ImageDraw.Draw(im)
 d.rectangle((45,4,77,28),fill='#c4c1a2')
 # Remove the provisional counter before placing the current long-table asset.
 d.rectangle((46,29,57,72),fill='#805154')
 for y in range(30,73,10):
  for x in range(45,58,10):
   c=['#bd9556','#ad6e55','#a56551'][(x//10+y//10)%3]
   d.rectangle((max(x,46),y,min(x+8,57),min(y+8,72)),fill=c)
 room['frameData'][key]['dataURL']=uri(im);decor['frameData'][key]['dataURL']=uri(newdecor)
 food=dec(bowls['frameData'][key]['dataURL']);food.paste((0,0,0,0),(47,36,55,43));bowls['frameData'][key]['dataURL']=uri(food)
new_layer=dict(sheetIndex=si,parent=None,name='新版桌面调料',visible=True,locked=False,opacity=1,frameData={f'{si}_0_{f}':dict(width=W,height=H,dataURL=uri(details)) for f in range(8)})
p['layers'].append(new_layer);atlas=Image.new('RGBA',(W*8,H));frames=[]
for f in range(8):
 im=Image.new('RGBA',(W,H))
 for l in p['layers']:
  if l['sheetIndex']==si and l.get('visible',True):im.alpha_composite(dec(l['frameData'][f'{si}_0_{f}']['dataURL']))
 atlas.alpha_composite(im,(W*f,0));frames.append(im.convert('RGB').resize((768,720),Image.Resampling.NEAREST))
sheet['imageDataURL']=uri(atlas);frames[0].save(D/'updated-assets-room.png');frames[0].save(D/'updated-assets-room.gif',save_all=True,append_images=frames[1:],duration=140,loop=0,disposal=2)
p['currentSheetIndex']=si;p['currentActionIndex']=0;p['currentFrameIndex']=0;p['currentLayerIndex']=p['layers'].index(decor)
for i,s in enumerate(before['spriteSheets']):
 if i!=si:assert p['spriteSheets'][i]==s
for i,l in enumerate(before['layers']):
 if l['sheetIndex']!=si or l['name'] not in ('墙地面与入口','墙挂与柜台','碗与食物'):assert p['layers'][i]==l
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'updated-assets-room-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified reference scene refreshed with latest door, long counter, umbrella stand, chopsticks, seasonings, menu, and firewood; characters/animations/source materials preserved.')
