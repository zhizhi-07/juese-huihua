from pathlib import Path
from io import BytesIO
from PIL import Image,ImageDraw
import json,base64,copy,hashlib,sys,urllib.request as u
D=Path(__file__).parent;raw=(D/'原工程.json').read_bytes();old=json.loads(raw);p=copy.deepcopy(old);si=10;outline=(47,59,61);oldoutline=(70,75,79)
def decode(c):return Image.open(BytesIO(base64.b64decode(c['dataURL'].split(',')[1]))).convert('RGBA')
def encode(im):
 b=BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def render(pr,ai=0,fi=0,snow=None):
 f=pr['spriteSheets'][si]['actions'][ai]['frames'][fi];im=Image.new('RGBA',(f['width'],f['height']))
 for l in pr['layers']:
  if l['sheetIndex']!=si:continue
  c=l['frameData'].get(f'{si}_{ai}_{fi}');visible=snow if l['name']=='屋顶积雪' and snow is not None else l['visible']
  if visible and c:
   a=decode(c);r=c.get('placement')
   if r:
    assert all(float(r[k]).is_integer() for k in ('x','y','w','h'));a=a.resize((r['w'],r['h']),Image.Resampling.NEAREST)
   assert l['opacity']==1;im.alpha_composite(a,(r['x'],r['y']) if r else (0,0))
 return im
assert p['spriteSheets'][si]['frameWidth']==80 and p['spriteSheets'][si]['frameHeight']==64
assert [len(a['frames']) for a in p['spriteSheets'][si]['actions']]==[1,6,6]
slide_idx,=[i for i,l in enumerate(p['layers']) if l['sheetIndex']==si and l['name']=='滑门动画'];slide=p['layers'][slide_idx]
remapped=0;copied=0
for i,l in enumerate(p['layers']):
 if l['sheetIndex']!=si or i==slide_idx:continue
 base=l['frameData'].get('10_0_0')
 if base is None:continue
 if l['visible'] and l['name']!='屋顶积雪':
  assert not l['locked']
  a=decode(base);pixels=list(a.get_flattened_data());count=sum(1 for px in pixels if px[3] and px[:3]==oldoutline)
  if count:
   a.putdata([(*outline,px[3]) if px[3] and px[:3]==oldoutline else px for px in pixels]);base['dataURL']=encode(a);remapped+=count
 for ai in (1,2):
  for fi in range(6):
   cell=copy.deepcopy(base)
   if l['name']=='屋顶积雪' and ai==1:
    cell=dict(width=80,height=64,dataURL=encode(Image.new('RGBA',(80,64))))
   l['frameData'][f'10_{ai}_{fi}']=cell;copied+=1
normal=render(p,snow=False);box=(13,38,28,51);greens={(52,108,112),(77,138,126),(138,194,144)}
cloth={xy:normal.getpixel(xy) for y in range(38,41) for x in range(13,28) if normal.getpixel(xy:=(x,y))[:3] in greens}
gaps={xy:normal.getpixel(xy) for y in range(38,41) for x in range(13,28) if normal.getpixel(xy:=(x,y))[:3]==(230,223,161)}
assert cloth and gaps
under=normal.crop(box)
for x,y in cloth:under.putpixel((x-13,y-38),(230,223,161,255))
left=under.crop((0,0,8,13));right=under.crop((8,0,15,13))
for ai in (1,2):
 static=render(p,snow=ai==2)
 for fi,amount in enumerate((0,2,4,6,7,8)):
  overlay=Image.new('RGBA',(80,64))
  if amount:
   opening=Image.new('RGBA',(15,13),(*outline,255));draw=ImageDraw.Draw(opening)
   # The floor is a surface shade, not a second outline color.
   draw.rectangle((0,9,14,12),fill='#5c6163');draw.line((0,12,14,12),fill='#7b7d77')
   opening.paste(left,(-amount,0));opening.paste(right,(8+amount,0));overlay.paste(opening,box[:2])
   for xy,px in cloth.items():overlay.putpixel(xy,px)
  slide['frameData'][f'10_{ai}_{fi}']=dict(width=80,height=64,dataURL=encode(overlay))
  frame=render(p,ai,fi)
  assert all(frame.getpixel(xy)==px for xy,px in cloth.items())
  if fi==0:assert frame.tobytes()==static.tobytes()
  if fi==5:assert all(frame.getpixel(xy)!=px for xy,px in gaps.items())
  for y in range(64):
   for x in range(80):
    if not(box[0]<=x<box[2] and box[1]<=y<box[3]):assert frame.getpixel((x,y))==static.getpixel((x,y))
  assert all(px[:3]!=oldoutline for px in frame.get_flattened_data() if px[3])
# Latest user pixels in the base frame are retained except for the requested outline substitution.
for snowy in (False,True):
 a=render(old,snow=snowy);b=render(p,snow=snowy);a.putdata([(*outline,px[3]) if px[3] and px[:3]==oldoutline else px for px in a.get_flattened_data()])
 assert a.tobytes()==b.tobytes()
for snowy in (False,True):
 ai=2 if snowy else 1
 board=Image.new('RGBA',(64*6,56),'#303a3c')
 for fi in range(6):board.alpha_composite(render(p,ai,fi).crop((0,0,64,56)),(fi*64,0))
 board.resize((768,112),Image.Resampling.NEAREST).save(D/('雪顶逐帧.png' if snowy else '无雪逐帧.png'))
render(p,snow=False).resize((480,384),Image.Resampling.NEAREST).save(D/'最新无雪预览.png')
(D/'候选工程.json').write_text(json.dumps(p,ensure_ascii=False,separators=(',',':')),'utf8')
(D/'制作检查.json').write_text(json.dumps(dict(outlineRGB='#2f3b3d',remappedBasePixels=remapped,syncedCells=copied,curtainPixels=len(cloth),yellowGapPixels=len(gaps),basePixelPreservation=True,animationFrameCounts=[6,6]),ensure_ascii=False,indent=2),'utf8')
print('base outline pixels recolored',remapped,'cells synced',copied)
if sys.argv[1]=='save':
 url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116';meta=json.loads((D/'原版校验.json').read_text());data=(D/'候选工程.json').read_bytes()
 with u.urlopen(u.Request(url,data=data,method='PUT',headers={'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta['etag']})) as r:status=r.status
 with u.urlopen(url) as r:b=r.read();tag=r.headers['ETag']
 q=json.loads(b);assert q==p;assert q['spriteSheets']==old['spriteSheets']
 for i,l in enumerate(old['layers']):
  if l['sheetIndex']!=10:assert q['layers'][i]==l
  else:assert {k:v for k,v in q['layers'][i].items() if k!='frameData'}=={k:v for k,v in l.items() if k!='frameData'}
 (D/'已保存工程.json').write_bytes(b);(D/'API保存验证.json').write_text(json.dumps(dict(status=status,etag=tag,sha256=hashlib.sha256(b).hexdigest(),otherSheetsUnchanged=True),indent=2),'utf8')
 (D/'进度.md').write_text('步骤2完成：两组各6帧已按用户最新原图全部同步，新增描边层94已经覆盖所有帧。旧深灰描边换为#2f3b3d，其余原图像素不变；绿色帘固定，黄色缺口随门走。API200且回读完全一致，其他画布不变。下一步保存指定目录并Godot导入。','utf8')
 print(status,tag)
