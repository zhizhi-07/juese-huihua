from pathlib import Path
from PIL import Image,ImageDraw
from io import BytesIO
import json,base64,copy,sys,urllib.request as u,hashlib
D=Path(__file__).parent;raw=(D/'原工程.json').read_bytes();old=json.loads(raw);p=copy.deepcopy(old)
def dec(s):return Image.open(BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGBA')
def enc(im):
 b=BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def render(pr,si,ai=0,fi=0,snow=None,subset=None):
 f=pr['spriteSheets'][si]['actions'][ai]['frames'][fi];im=Image.new('RGBA',(f['width'],f['height']))
 for l in pr['layers']:
  if l['sheetIndex']!=si or subset is not None and l['name'] not in subset:continue
  visible=snow if l['name']=='屋顶积雪' and snow is not None else l['visible'];c=l['frameData'].get(f'{si}_{ai}_{fi}')
  if not visible or not c:continue
  a=dec(c['dataURL']);r=c.get('placement')
  if r:
   assert all(float(r[k]).is_integer() for k in ('x','y','w','h'))
   a=a.resize((r['w'],r['h']),Image.Resampling.NEAREST)
  if l['opacity']!=1:a.putalpha(a.getchannel('A').point(lambda v:round(v*l['opacity'])))
  im.alpha_composite(a,(r['x'],r['y']) if r else (0,0))
 return im
base=render(p,10,snow=False);box=(13,38,28,51);clothtones={(52,108,112),(77,138,126),(138,194,144)}
cloth={(x,y):base.getpixel((x,y)) for y in range(38,41) for x in range(13,28) if base.getpixel((x,y))[:3] in clothtones}
gaps={(x,y):base.getpixel((x,y)) for y in range(38,41) for x in range(13,28) if base.getpixel((x,y))[:3]==(230,223,161)}
assert cloth and gaps
under=base.crop(box)
for (x,y),pix in cloth.items():under.putpixel((x-13,y-38),(230,223,161,255))
left=under.crop((0,0,8,13));right=under.crop((8,0,15,13))
idx,=[i for i,l in enumerate(p['layers']) if l['sheetIndex']==10 and l['name']=='滑门动画'];layer=p['layers'][idx];assert not layer['locked']
framesout=[]
for ai in (1,2):
 frames=[]
 for fi,shift in enumerate((0,2,4,6,7,8)):
  patch=Image.new('RGBA',(80,64))
  if shift:
   inner=Image.new('RGBA',(15,13),'#2f3b3d');draw=ImageDraw.Draw(inner);draw.rectangle((0,9,14,12),fill='#464b4f');draw.line((0,12,14,12),fill='#7b7d77')
   inner.paste(left,(-shift,0));inner.paste(right,(8+shift,0));patch.paste(inner,box[:2])
   for xy,c in cloth.items():patch.putpixel(xy,c)
  layer['frameData'][f'10_{ai}_{fi}']=dict(width=80,height=64,dataURL=enc(patch))
  im=render(p,10,ai,fi);static=render(p,10,snow=ai==2)
  assert all(im.getpixel(xy)==c for xy,c in cloth.items()),'布帘移动了'
  if not shift:assert static.tobytes()==im.tobytes()
  for y in range(64):
   for x in range(80):
    if not(box[0]<=x<box[2] and box[1]<=y<box[3]):assert im.getpixel((x,y))==static.getpixel((x,y))
  if fi==5:assert all(im.getpixel(xy)!=c for xy,c in gaps.items()),'黄色门体残留在缺口'
  frames.append(im)
 assert len({im.tobytes() for im in frames})==6
 framesout.append(frames)
strip=Image.new('RGBA',(384,24))
for i,im in enumerate(framesout[0]):strip.alpha_composite(im.crop((0,32,64,56)),(i*64,0))
strip.resize((1152,72),Image.Resampling.NEAREST).save(D/'门-缺口修正逐帧.png')
(D/'候选工程.json').write_text(json.dumps(p,ensure_ascii=False,separators=(',',':')),'utf8')
if sys.argv[1]=='save':
 url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116';meta=json.loads((D/'原版校验.json').read_text());data=(D/'候选工程.json').read_bytes()
 with u.urlopen(u.Request(url,data=data,method='PUT',headers={'If-Match':meta['etag'],'X-Pixel-Editor':'1','Content-Type':'application/json'})) as r:status=r.status
 with u.urlopen(url) as r:b=r.read();etag=r.headers['ETag']
 q=json.loads(b);assert q==p;rest=copy.deepcopy(q);rest['layers'][idx]=old['layers'][idx];assert rest==old
 (D/'已保存工程.json').write_bytes(b);(D/'保存验证.json').write_text(json.dumps(dict(status=status,etag=etag,sha256=hashlib.sha256(b).hexdigest(),fixedCurtainPixels=len(cloth),movingYellowGapPixels=len(gaps),rackUntouched=True,onlyChangedLayer=idx),ensure_ascii=False,indent=2),'utf8')
 (D/'进度.md').write_text('步骤2完成：12帧门动画已修好；绿色布帘逐像素固定，黄色缺口8像素全部随门离开；第一帧和原静图一致。只改滑门动画图层，其余含用户烟架一像素未改。下一步全部导出。','utf8')
 print(status,len(cloth),len(gaps))
