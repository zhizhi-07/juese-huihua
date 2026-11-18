from pathlib import Path
from PIL import Image, ImageDraw
from io import BytesIO
import os, json, sys, urllib.request as u, hashlib, base64, copy
root=Path(__file__).resolve().parent
url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
src=Image.open(root.parent/'苹果24便利店-俯视场景'/'场景.png').convert('RGBA')
size=(144,112)
layers=[]
def layer(name):
 global im,dr
 im=Image.new('RGBA',src.size);dr=ImageDraw.Draw(im);layers.append((name,im))
def rec(x,y,X,Y,c):dr.rectangle((x,y,X,Y),fill='#'+c)
def poly(points,c):dr.polygon(points,fill='#'+c)
def seg(x,y,X,Y,c):dr.line((x,y,X,Y),fill='#'+c)
def part(x,y,X,Y):
 box=(x,y,X+1,Y+1);im.paste(src.crop(box),(x,y))
dark='2f3b3d';brown='785a55';wood='9e7565'; cream='e8cd97';hi='d1ae8a'; shade='5c4644'
layer('墙体 · 奶油色外墙')
rec(40,55,167,101,dark);rec(41,56,166,99,hi);rec(42,60,165,96,cream)
for y in (66,72,78,84,90):rec(42,y,165,y,'d1ae8a')
layer('基座 · 红褐砖裙')
rec(41,92,166,100,brown);rec(42,93,165,96,wood);rec(42,98,165,99,wood)
for x in range(46,165,11):seg(x,93,x,95,brown)
for x in range(51,165,11):seg(x,98,x,99,brown)
layer('立柱 · 木门廊')
for x,w in ((40,5),(106,6),(145,5),(162,6)):
 rec(x,62,x+w-1,101,shade);rec(x+1,63,x+w-2,99,wood);seg(x+1,64,x+1,91,'ba9273')
layer('橱窗 · 木框与玻璃')
rec(51,71,101,91,shade);rec(52,72,100,89,'566178');rec(53,73,99,89,'346c70')
rec(51,90,101,91,'ba9273')
layer('橱窗 · 陈列商品')
part(55,77,67,88);part(70,77,82,88);part(85,77,97,88)
layer('橱窗 · 窗棂')
for x in (54,68,83,98):
 rec(x,74,x,89,'444a66')
layer('入口 · 门套')
rec(116,68,140,94,shade);rec(117,69,139,93,wood);rec(119,71,137,93,dark)
layer('入口 · 玻璃门扇')
part(120,72,136,93)
layer('入口 · 门槛')
rec(118,94,138,95,'80575b');seg(119,94,137,94,'b89184')
layer('屋顶 · 青绿金属板')
poly([(38,12),(39,7),(41,5),(167,5),(170,8),(170,56),(168,59),(38,59),(37,57)],dark)
rec(39,10,168,55,'4d8a7e');rec(39,11,41,54,'346c70');rec(167,11,168,55,'346c70')
for x in range(43,167,9):
 rec(x,12,x,54,'346c70');rec(x+1,13,x+1,54,'68a88e')
rec(39,55,168,56,'346c70');rec(38,57,169,58,'255461')
layer('屋顶 · 后檐压顶')
rec(40,6,167,12,dark);rec(41,7,166,10,'68a88e');rec(41,11,166,11,'346c70')
for x in (38,164):
 poly([(x,7),(x+2,4),(x+6,4),(x+6,11),(x+5,13),(x,16)],dark)
 poly([(x+1,8),(x+3,5),(x+5,5),(x+5,10),(x+1,13)],'68a88e')
layer('屋顶 · 空调管线')
rec(151,34,153,42,'255461');rec(152,36,152,41,'b5b2ac');rec(152,41,160,44,'346c70');rec(153,41,159,42,'b5b2ac');rec(159,41,161,44,'566178')
layer('屋顶 · 空调外机')
rec(142,21,157,37,'346c70');part(143,21,156,36)
layer('前檐 · 木横梁')
rec(37,59,170,63,shade);rec(38,59,169,61,'ba9273');rec(39,62,168,62,wood)
layer('雨棚 · 红白条纹布')
# Arc-edged awning sampled from the previous scene, with its original scallops.
pts=[(48,62),(105,62),(106,64),(106,73),(104,75),(102,75),(100,74),(98,75),(96,75),(94,74),(92,75),(89,75),(87,74),(85,75),(82,75),(80,74),(78,75),(75,75),(73,74),(71,75),(68,75),(66,74),(64,75),(62,75),(60,74),(58,75),(55,75),(53,74),(51,75),(49,75),(47,73),(47,64)]
mask=Image.new('1',src.size);ImageDraw.Draw(mask).polygon(pts,fill=1);im.paste(src,(0,0),mask)
layer('招牌 · 苹果24灯箱')
rec(112,58,142,68,shade);part(113,58,141,68)
for x,title in ((111,'左'),(143,'右')):
 layer('壁灯 · '+title)
 rec(x,70,x+1,72,shade);rec(x-2,73,x+3,78,shade);rec(x-1,72,x+2,72,brown);rec(x-1,74,x+2,77,'e0ac6c');rec(x,74,x+1,76,'e6dfa1');rec(x-1,79,x+2,79,brown)
layers=[(n,l.crop((32,0,176,112))) for n,l in layers]
merged=Image.new('RGBA',size)
for n,l in layers: assert l.getbbox();merged.alpha_composite(l)
merged.save(root/'单栋.png');merged.resize((576,448),Image.Resampling.NEAREST).save(root/'单栋-4倍.png')
def data(im):
 b=BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def unpic(s):return Image.open(BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGBA')
def write(name,obj):(root/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf8')
def get():
 with u.urlopen(url) as r:return r.read(),r.headers['ETag']
def digest(b):return hashlib.sha256(b).hexdigest()
if sys.argv[1]!='save':sys.exit()
bpath=root/'保存前.json'
assert not bpath.exists(), '已有备份，禁止覆盖'
raw,tag=get();bpath.write_bytes(raw);write('原版校验.json',{'etag':tag,'sha256':digest(raw)})
old=json.loads(raw);p=copy.deepcopy(old);i=len(p['spriteSheets']);k=f'{i}_0_0'
frame=dict(sheetIndex=i,sourceX=0,sourceY=0,width=size[0],height=size[1],locked=False,lockedRegions=[],status='completed',duration=0,notes='单栋便利店，透明底；16规格人物比例。')
p['spriteSheets'].append(dict(name='苹果24便利店 · 外观',frameWidth=size[0],frameHeight=size[1],columns=1,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=data(Image.new('RGBA',size)),actions=[dict(name='建筑外观',direction='none',frames=[frame])]))
for n,l in layers:p['layers'].append(dict(sheetIndex=i,parent=None,name=n,visible=True,locked=False,opacity=1,frameData={k:dict(width=size[0],height=size[1],dataURL=data(l))}))
p.update(currentSheetIndex=i,currentActionIndex=0,currentFrameIndex=0,currentLayerIndex=len(old['layers']))
payload=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(root/'候选稿.json').write_bytes(payload)
req=u.Request(url,data=payload,method='PUT',headers={'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':tag})
with u.urlopen(req) as r: status=r.status
raw2,tag2=get();q=json.loads(raw2)
assert q==p and q['spriteSheets'][:i]==old['spriteSheets'] and q['layers'][:len(old['layers'])]==old['layers']
test=Image.new('RGBA',size)
for (name,img),layer in zip(layers,q['layers'][len(old['layers']):]):
 actual=unpic(layer['frameData'][k]['dataURL']); assert actual.tobytes()==img.tobytes();test.alpha_composite(actual)
assert test.tobytes()==merged.tobytes()
write('验证.json',dict(status=status,oldSha256=digest(raw),newSha256=digest(raw2),newETag=tag2,originalSheets=i,originalLayers=len(old['layers']),size=size,layers=[n for n,l in layers],bbox=test.getbbox(),pixelMatch=True))
print(status,tag2,len(layers),test.getbbox())
