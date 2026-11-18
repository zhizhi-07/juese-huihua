from PIL import Image,ImageDraw
from pathlib import Path
from io import BytesIO
import hashlib,json,base64,sys
from urllib.request import Request,urlopen
D=Path(__file__).parent
path=Path(r'C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-bf0ca19b-f545-4aa8-a4ba-0ed2b50d9385.png')
ref=Image.open(path).convert('RGBA').crop((132,30,672,386));size=ref.size
def bytesim(im):
 b=BytesIO();im.save(b,'PNG');return b.getvalue()
def data(im):return 'data:image/png;base64,'+base64.b64encode(bytesim(im)).decode()
parts=[]
def part(name, coords,poly=False):
 mask=Image.new('1',size);draw=ImageDraw.Draw(mask)
 if poly:draw.polygon(coords,fill=1)
 else:draw.rectangle(coords,fill=1)
 im=Image.new('RGBA',size);im.paste(ref,(0,0),mask);parts.append((name,im))
part('墙体与基脚', (13,196,417,326))
part('立柱 · 左', (13,199,35,320));part('立柱 · 右',(398,199,417,315))
part('入口 · 双开玻璃门',(68,212,202,326));part('橱窗 · 窗框与陈列架',(217,212,356,299))
part('屋顶 · 木框与檐口',(7,7,426,141));part('屋顶 · 青蓝拼接板',(17,21,416,109))
part('门楣 · 三色条带',[(3,119),(7,119),(7,141),(426,141),(426,119),(428,119),(428,197),(424,197),(424,201),(7,201),(7,198),(3,198)],True)
part('招牌 · 24h MART',(109,151,309,197))
part('左侧 · 扭蛋机',[(18,274),(23,274),(23,272),(49,272),(49,277),(54,277),(54,289),(58,289),(58,316),(54,316),(54,328),(58,328),(58,346),(53,346),(53,350),(17,350),(17,346),(13,346),(13,329),(17,329),(17,317),(13,317),(13,289),(18,289)],True)
part('门前 · 小立架',[(313,302),(334,302),(334,324),(338,324),(338,352),(305,352),(305,324),(309,324),(309,306),(313,306)],True)
part('右侧 · 红色售货机',(352,236,418,349))
part('右侧 · 蓝绿终端',[(301+128,248),(434,248),(434,245),(476,245),(476,249),(479,249),(479,281),(475,281),(475,302),(471,302),(471,319),(475,319),(475,340),(471,340),(471,348),(428,348),(428,343),(425,343),(425,324),(429,324),(429,310),(427,310),(427,284),(429,284)],True)
part('右侧 · 垃圾桶',[(493,291),(497,291),(497,288),(527,288),(527,292),(532,292),(532,297),(535,297),(535,314),(531,314),(531,345),(527,345),(527,351),(495,351),(495,347),(491,347),(491,314),(487,314),(487,298),(491,298)],True)
# Assign every visible source pixel to a single named part rather than duplicating the lettering and doors beneath movable layers.
from PIL import ImageChops
occ=Image.new('L',size)
for n,im in reversed(parts):
 a=im.getchannel('A');im.putalpha(ImageChops.subtract(a,occ));occ=ImageChops.lighter(occ,a)
# Extend only the occluded threshold/glass. The rest remains exactly as provided.
hide=Image.new('1',size);h=ImageDraw.Draw(hide);h.polygon([(162,326),(162,315),(166,315),(166,310),(174,310),(174,305),(181,305),(181,303),(201,303),(201,308),(204,308),(204,313),(207,313),(207,326)],fill=1)
for n,im in parts:im.paste((0,0,0,0),(0,0),hide)
patch=Image.new('RGBA',size)
for y in range(303,327):
 for x in range(162,208):
  if hide.getpixel((x,y)):
   if y>=315: sx= x-60 if x<198 else 70 if x<203 else 212;sy=y
   elif x>=193:sx=x;sy=302
   else:sx=x-59;sy=y
   patch.putpixel((x,y),ref.getpixel((sx,sy)))
parts.append(('补绘 · 人物遮挡处',patch))
merged=Image.new('RGBA',size)
for n,l in parts:merged.alpha_composite(l)
exact=0
for y in range(size[1]):
 for x in range(size[0]):
  if merged.getpixel((x,y))[3] and not hide.getpixel((x,y)):
   assert merged.getpixel((x,y))==ref.getpixel((x,y));exact+=1
merged.save(D/'24h-MART-原尺寸.png')
merged.resize((117,77),Image.Resampling.NEAREST).save(D/'24h-MART-角色尺度参考.png')
if sys.argv[1]=='save':
 url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
 def read():
  with urlopen(url) as r:return r.read(),r.headers['ETag']
 def write(n,v):(D/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),'utf8')
 raw,tag=read();assert not (D/'保存前.json').exists();(D/'保存前.json').write_bytes(raw);write('备份校验.json',dict(etag=tag,sha256=hashlib.sha256(raw).hexdigest()))
 p=json.loads(raw);old=json.loads(raw);i=len(p['spriteSheets']);k=f'{i}_0_0';name='24h MART · 原图一比一';assert not any(s['name']==name for s in p['spriteSheets'])
 f=dict(sheetIndex=i,sourceX=0,sourceY=0,width=size[0],height=size[1],locked=False,lockedRegions=[],status='completed',duration=0,notes='截图原像素，无缩放无调色；遮挡补绘单列。')
 p['spriteSheets'].append(dict(name=name,frameWidth=size[0],frameHeight=size[1],columns=1,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=data(Image.new('RGBA',size)),actions=[dict(name='原图外观',direction='none',frames=[f])]))
 for n,l in parts:
  # Clear hidden RGB so each sparse PNG contains only its own source fragment.
  sparse=Image.new('RGBA',size);sparse.paste(l,(0,0),l.getchannel('A'))
  p['layers'].append(dict(sheetIndex=i,parent=None,name=n,visible=True,locked=False,opacity=1,frameData={k:dict(width=size[0],height=size[1],dataURL=data(sparse))}))
 p.update(currentSheetIndex=i,currentActionIndex=0,currentFrameIndex=0,currentLayerIndex=len(old['layers']))
 payload=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(D/'候选稿.json').write_bytes(payload)
 with urlopen(Request(url,data=payload,method='PUT',headers={'If-Match':tag,'Content-Type':'application/json','X-Pixel-Editor':'1'})) as r:status=r.status
 b,t=read();q=json.loads(b);assert q==p and q['spriteSheets'][:i]==old['spriteSheets'] and q['layers'][:len(old['layers'])]==old['layers']
 test=Image.new('RGBA',size)
 for l in q['layers'][len(old['layers']):]:test.alpha_composite(Image.open(BytesIO(base64.b64decode(l['frameData'][k]['dataURL'].split(',')[1]))).convert('RGBA'))
 assert test.tobytes()==merged.tobytes()
 write('验证.json',dict(sheet=i+1,status=status,etag=t,sourceExactPixels=exact,repairPixels=patch.getchannel('A').histogram()[255],oldSheetsUnchanged=True));print(i+1,exact)
