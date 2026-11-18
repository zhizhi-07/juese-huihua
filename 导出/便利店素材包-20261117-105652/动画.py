from PIL import Image,ImageDraw
from pathlib import Path
from io import BytesIO
import json,base64,copy,sys,hashlib,urllib.request as u
D=Path(__file__).parent
def dec(uri):return Image.open(BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
def enc(im):
 b=BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
old=json.loads((D/'原工程.json').read_bytes());p=copy.deepcopy(old);si=10;size=(80,64);basekey='10_0_0'
def comp(pr,si,ai=0,fi=0,snow=None,subset=None):
 f=pr['spriteSheets'][si]['actions'][ai]['frames'][fi];im=Image.new('RGBA',(f['width'],f['height']))
 for l in pr['layers']:
  if l['sheetIndex']!=si or (subset is not None and l['name'] not in subset):continue
  if l['name']=='屋顶积雪' and snow is not None:
   visible=snow
  else:visible=l['visible']
  cell=l['frameData'].get(f'{si}_{ai}_{fi}')
  if visible and cell:im.alpha_composite(dec(cell['dataURL']))
 return im
normal=comp(p,si,snow=False);box=(12,37,29,51)
left=normal.crop((12,37,21,51));right=normal.crop((21,37,29,51));steps=[0,2,4,6,8,9];starts=len(p['spriteSheets'][si]['actions']);patches={}
for snowy in (False,True):
 ai=len(p['spriteSheets'][si]['actions']);frames=[]
 for fi,shift in enumerate(steps):
  key=f'{si}_{ai}_{fi}'
  for l in p['layers']:
   if l['sheetIndex']!=si:continue
   cell=copy.deepcopy(l['frameData'].get(basekey))
   if cell:
    if l['name']=='屋顶积雪' and not snowy:cell['dataURL']=enc(Image.new('RGBA',size))
    l['frameData'][key]=cell
  patch=Image.new('RGBA',size)
  if shift:
   interior=Image.new('RGBA',(17,14),'#2f3b3d');dr=ImageDraw.Draw(interior)
   dr.rectangle((0,9,16,13),fill='#464b4f');dr.line((0,13,16,13),fill='#7b7d77')
   interior.paste(left,(-shift,0));interior.paste(right,(9+shift,0))
   patch.paste(interior,box[:2])
  patches[key]=dict(width=80,height=64,dataURL=enc(patch))
  frames.append(dict(sheetIndex=si,sourceX=0,sourceY=0,width=80,height=64,locked=False,lockedRegions=[],status='completed',duration=500 if fi in (0,5) else 90,notes=f'双滑门向两侧打开 {shift}/9'))
 p['spriteSheets'][si]['actions'].append(dict(name='开门 · 雪顶' if snowy else '开门 · 无雪',direction='none',frames=frames))
p['layers'].append(dict(sheetIndex=si,parent=None,name='滑门动画',visible=True,locked=False,opacity=1,frameData=patches))
for ai in range(starts,starts+2):
 snowy=ai==starts+1
 expected=comp(old,si,snow=snowy)
 assert comp(p,si,ai,0).tobytes()==expected.tobytes()
 seen=[]
 for fi in range(6):
  im=comp(p,si,ai,fi);seen.append(im.tobytes())
  for y in range(64):
   for x in range(80):
    if not (box[0]<=x<box[2] and box[1]<=y<box[3]):assert im.getpixel((x,y))==expected.getpixel((x,y))
 assert len(set(seen))==6
# A reversible preview plays open then close; production action is only the six opening frames.
ims=[comp(p,10,starts+1,i).resize((320,256),Image.Resampling.NEAREST) for i in [0,1,2,3,4,5,4,3,2,1]]
ims[0].save(D/'开门检查.gif',save_all=True,append_images=ims[1:],duration=[500,90,90,90,90,700,90,90,90,90],disposal=2,loop=0)
board=Image.new('RGBA',(6*64,62),'#303a3c')
for fi in range(6):
 im=comp(p,10,starts,fi).crop((0,30,64,55));board.alpha_composite(im,(fi*64,8))
board.resize((768,124),Image.Resampling.NEAREST).save(D/'门逐帧检查.png')
(D/'候选工程.json').write_text(json.dumps(p,ensure_ascii=False,separators=(',',':')),'utf8')
(D/'进度.md').write_text('步骤2完成：标准店新增无雪/雪顶双滑门开启动作，各6帧。验证首帧等于现有静图，变化仅在门洞17×14区域，六帧均不同。待查看逐帧后ETag保存。','utf8')
print(starts)
if sys.argv[1]=='save':
 meta=json.loads((D/'原版校验.json').read_text());url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116';payload=(D/'候选工程.json').read_bytes()
 with u.urlopen(u.Request(url,data=payload,method='PUT',headers={'If-Match':meta['etag'],'X-Pixel-Editor':'1','Content-Type':'application/json'})) as r:status=r.status
 with u.urlopen(url) as r:b=r.read();tag=r.headers['ETag']
 q=json.loads(b);assert q==p
 # Reverse only additions in memory and verify unchanged user data.
 q['layers'].pop()
 for l in q['layers']:
  if l['sheetIndex']==si:l['frameData']={k:v for k,v in l['frameData'].items() if k.split('_')[1]=='0'}
 q['spriteSheets'][si]['actions']=q['spriteSheets'][si]['actions'][:starts]
 assert q==old
 (D/'已保存工程.json').write_bytes(b);(D/'保存校验.json').write_text(json.dumps(dict(status=status,etag=tag,sha256=hashlib.sha256(b).hexdigest()),indent=2))
 (D/'进度.md').write_text('步骤3完成：API保存200并回读完全一致。原图/原动作/其他工程字段未改变，仅新增开门两动作和一动画层。下一步裁边导出、打包。','utf8')
 print(status,tag)
