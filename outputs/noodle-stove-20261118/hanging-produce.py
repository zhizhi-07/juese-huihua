from pathlib import Path
from PIL import Image
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;ROOT=Path('C:/Users/cl/Desktop/绘画/.codex-attachments/93a8d559-0816-4db6-a6d3-f6c33435b258')
def sampled(file,x0,y0,step,rows):
 src=Image.open(ROOT/file).convert('RGB');out=Image.new('RGBA',(len(rows[0]),len(rows)))
 for y,row in enumerate(rows):
  for x,c in enumerate(row):
   if c=='.':continue
   rgb=src.getpixel((round(x0+(x+.5)*step),max(0,round(y0+(y+.5)*step))))
   if c=='k' or (max(rgb)<110 and max(rgb)-min(rgb)<40):rgb=(47,59,61)
   out.putpixel((x,y),rgb+(255,))
 return out.crop(out.getbbox())
garlic=sampled('5725d050-1f87-40bd-a7df-ae74a9df572f/Screenshot_20261118_224136.jpg',350,418,56.5,[
'...k...','..ksk..','..ksk..','.kssk..','ksssk..','kssssk.','.kssssk','..ksssk','.ksssk.','.kssssk','..ksssk','.ksssk.','.kssk..','..kk...'])
chili=sampled('b0503000-78a9-4500-b954-84556a489e2e/Screenshot_20261118_224120.jpg',65,-25,78,[
'....k...','...ksk..','...ksk..','..ksssk.','.kssssk.','.ksssssk','ksssssk.','.kssssk.','..ksssk.','..ksssk.','.ksssssk','.kssssk.','.kssssk.','kssssk..','...ksk..','....kk..'])
url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-hanging-produce.json').write_bytes(raw);(D/'before-hanging-produce.etag').write_text(etag);(D/'before-hanging-produce.sha256').write_text(hashlib.sha256(raw).hexdigest())
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def decode(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
for name,im in [('大蒜挂串',garlic),('辣椒挂串',chili)]:
 assert not any(s['name']==name for s in p['spriteSheets'])
 si=len(p['spriteSheets']);w,h=im.size;data=uri(im)
 p['spriteSheets'].append(dict(name=name,frameWidth=w,frameHeight=h,columns=1,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=data,actions=[dict(name=name,direction='',frames=[dict(sheetIndex=si,sourceX=0,sourceY=0,width=w,height=h,locked=False,lockedRegions=[],status='completed',duration=0)])]))
 p['layers'].append(dict(sheetIndex=si,parent=None,name=name,visible=True,locked=False,opacity=1,frameData={f'{si}_0_0':dict(width=w,height=h,dataURL=data)}))
 im.save(D/(name+'.png'));im.resize((w*32,h*32),Image.Resampling.NEAREST).save(D/(name+'-preview.png'))
layout=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='面馆 · 比例预览');sheet=p['spriteSheets'][layout];w,h=sheet['frameWidth'],sheet['frameHeight']
decor=Image.new('RGBA',(w,h));decor.alpha_composite(garlic,(22,6));decor.alpha_composite(chili,(31,5))
layer=dict(sheetIndex=layout,parent=None,name='墙挂大蒜与辣椒',visible=True,locked=False,opacity=1,frameData={})
for f in range(8):layer['frameData'][f'{layout}_0_{f}']=dict(width=w,height=h,dataURL=uri(decor))
p['layers'].append(layer);atlas=Image.new('RGBA',(w*8,h));frames=[]
for f in range(8):
 frame=Image.new('RGBA',(w,h))
 for l in p['layers']:
  if l['sheetIndex']==layout:frame.alpha_composite(decode(l['frameData'][f'{layout}_0_{f}']['dataURL']))
 atlas.alpha_composite(frame,(f*w,0));frames.append(frame.convert('RGB').resize((768,640),Image.Resampling.NEAREST))
sheet['imageDataURL']=uri(atlas);frames[0].save(D/'produce-layout.png');frames[0].save(D/'produce-layout.gif',save_all=True,append_images=frames[1:],duration=140,loop=0,disposal=2)
p['currentSheetIndex']=layout;p['currentActionIndex']=0;p['currentFrameIndex']=0;p['currentLayerIndex']=len(p['layers'])-1
assert p['layers'][:len(before['layers'])]==before['layers']
for i,s in enumerate(before['spriteSheets']):
 if i!=layout:assert p['spriteSheets'][i]==s
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'hanging-produce-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified garlic and chili reference sprites; placed on preview wall; existing materials unchanged.')
