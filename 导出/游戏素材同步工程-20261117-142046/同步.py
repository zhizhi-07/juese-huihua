from pathlib import Path
from PIL import Image
from io import BytesIO
import json,base64,copy,hashlib,urllib.request as u
D=Path(__file__).parent;folder=Path(r'C:/Users/Administrator/Desktop/最后/游戏资产/游戏内部/便利店');url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
def sha(b):return hashlib.sha256(b).hexdigest()
def write(n,v):(D/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),'utf8')
def read():
 with u.urlopen(url) as r:return r.read(),r.headers['ETag']
def dec(s):return Image.open(BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGBA')
def enc(im):
 b=BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def merged(pr,si,ai,fi):
 f=pr['spriteSheets'][si]['actions'][ai]['frames'][fi];im=Image.new('RGBA',(f['width'],f['height']))
 for l in pr['layers']:
  a=l['frameData'].get(f'{si}_{ai}_{fi}')
  if l['sheetIndex']==si and l['visible'] and a:
   assert l['opacity']==1;im.alpha_composite(dec(a['dataURL']))
 return im
raw,tag=read();old=json.loads(raw);p=copy.deepcopy(old);assert not (D/'原工程.json').exists();(D/'原工程.json').write_bytes(raw);write('原版校验.json',dict(sha256=sha(raw),etag=tag))
files={n:(folder/n).read_bytes() for n in ['冰柜.png','包子蒸柜.png','壁挂烟架.png']};write('游戏文件校验.json',{n:sha(b) for n,b in files.items()})
expected={};hidden=[]
for si,n,name,count in [(6,'冰柜.png','冰柜 · 游戏当前版',8),(3,'包子蒸柜.png','包子蒸柜 · 用户修改版',1)]:
 assert len(p['spriteSheets'][si]['actions'])==1 and len(p['spriteSheets'][si]['actions'][0]['frames'])==count
 source=Image.open(BytesIO(files[n])).convert('RGBA');assert source.size==(160,14) if count==8 else source.size==(18,19)
 assert not any(l['sheetIndex']==si and l['name']==name for l in p['layers'])
 cells={}
 for fi,f in enumerate(p['spriteSheets'][si]['actions'][0]['frames']):
  origin=merged(old,si,0,fi);bbox=origin.getbbox();tile=source.crop((fi*20,0,(fi+1)*20,14)) if count==8 else source
  assert tile.size==(bbox[2]-bbox[0],bbox[3]-bbox[1]),(fi,bbox,tile.size)
  im=Image.new('RGBA',origin.size);im.paste(tile,bbox[:2]);key=f'{si}_0_{fi}';cells[key]=dict(width=im.width,height=im.height,dataURL=enc(im));expected[(si,0,fi)]=im
 for i,l in enumerate(p['layers']):
  if l['sheetIndex']==si and l['visible']:
   assert not l['locked'];l['visible']=False;hidden.append(i)
 p['layers'].append(dict(sheetIndex=si,parent=None,name=name,visible=True,locked=False,opacity=1,frameData=cells))
 for fi in range(count):assert merged(p,si,0,fi).tobytes()==expected[(si,0,fi)].tobytes()
# One rack, one new canvas; no unnecessary decomposition.
si=len(p['spriteSheets']);source=Image.open(BytesIO(files['壁挂烟架.png'])).convert('RGBA');w,h=source.size;assert (w,h)==(22,24);assert not any(s['name']=='壁挂烟架' for s in p['spriteSheets'])
frame=dict(sheetIndex=si,sourceX=0,sourceY=0,width=w,height=h,locked=False,lockedRegions=[],status='completed',duration=0,notes='三层壁挂烟架，和游戏目录PNG逐像素一致。')
p['spriteSheets'].append(dict(name='壁挂烟架',frameWidth=w,frameHeight=h,columns=1,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=enc(Image.new('RGBA',(w,h))),actions=[dict(name='壁挂外观',direction='none',frames=[frame])]))
p['layers'].append(dict(sheetIndex=si,parent=None,name='壁挂烟架',visible=True,locked=False,opacity=1,frameData={f'{si}_0_0':dict(width=w,height=h,dataURL=enc(source))}));expected[(si,0,0)]=source
p.update(currentSheetIndex=si,currentActionIndex=0,currentFrameIndex=0,currentLayerIndex=len(p['layers'])-1)
for n,b in files.items():assert (folder/n).read_bytes()==b,'游戏文件正在变化，停止'
payload=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(D/'候选稿.json').write_bytes(payload)
with u.urlopen(u.Request(url,data=payload,method='PUT',headers={'Content-Type':'application/json','If-Match':tag,'X-Pixel-Editor':'1'})) as r:status=r.status
b,t=read();q=json.loads(b);assert q==p
for key,im in expected.items():assert merged(q,*key).tobytes()==im.tobytes()
# Other sheets, frames, durations, pixels, visibility are preserved.
for i,l in enumerate(old['layers']):
 test=copy.deepcopy(q['layers'][i])
 if i in hidden:test['visible']=True
 assert test==l
assert q['spriteSheets'][:-1]==old['spriteSheets']
board=Image.new('RGBA',(320,160),'#303a3c')
for i,key in enumerate([(6,0,0),(3,0,0),(si,0,0)]):
 im=expected[key];im=im.crop(im.getbbox());im=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST);board.alpha_composite(im,(i*105+4,20))
board.save(D/'同步预览.png')
write('验证.json',dict(status=status,etag=t,sha256=sha(b),pixelMatch=True,frameCount=10,freezerFrames=8,rackSheet=si+1,sourceFilesUntouched=True,oldLayersRetainedHidden=hidden))
(D/'恢复说明.md').write_text('本次隐藏冰柜与蒸柜原可见图层，保留原像素；分别添加当前游戏文件的完整图层（冰柜8帧，蒸柜1帧）。新增壁挂烟架画布及1图层。要恢复可在对应画布关闭“游戏当前版/用户修改版”图层并恢复原图层显隐，或在备份当前后通过API+ETag恢复原工程.json。不要覆盖有未保存草稿的前台。游戏目录PNG完全未修改。','utf8')
print(status,'rack sheet',si+1,'frames verified',len(expected),t)
