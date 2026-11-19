from pathlib import Path
from PIL import Image
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id='
def fetch(id):
 with U.urlopen(url+id) as r:return r.read(),r.headers['ETag']
raw,etag=fetch('scene-noodle-shop-20261118');p=json.loads(raw);before=copy.deepcopy(p)
char_raw,char_etag=fetch('base-outlined-1794365455561');character=json.loads(char_raw)
(D/'before-character-material.json').write_bytes(raw);(D/'before-character-material.etag').write_text(etag);(D/'before-character-material.sha256').write_text(hashlib.sha256(raw).hexdigest())
(D/'character-material-source.json').write_bytes(char_raw)
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
# Reuse the verified character compositing order, visibility, and placement handling.
helper=(D/'outlined-people.py').read_text(encoding='utf-8-sig');exec(helper[helper.index('def person('):helper.index("standing=person(")])
variants=[('正面站姿',person('original16_idle','down')),('侧面站姿',person('original16_idle','side')),('侧面坐姿',person('original16_sit','side'))]
name='人物 · 原版描边';assert not any(s['name']==name for s in p['spriteSheets']);si=len(p['spriteSheets']);w=max(im.width for _,im in variants);h=max(im.height for _,im in variants);atlas=Image.new('RGBA',(w,h*3));actions=[];frames={}
for ai,(variant,im) in enumerate(variants):
 atlas.alpha_composite(im,(0,ai*h));frames[f'{si}_{ai}_0']=dict(width=im.width,height=im.height,dataURL=uri(im));actions.append(dict(name=variant,direction='',frames=[dict(sheetIndex=si,sourceX=0,sourceY=ai*h,width=im.width,height=im.height,locked=False,lockedRegions=[],status='completed',duration=0,notes='原版描边主工程当前人物，原始像素尺寸；供拼装器摆放对比。')]))
p['spriteSheets'].append(dict(name=name,frameWidth=w,frameHeight=h,columns=1,rows=3,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=uri(atlas),actions=actions))
p['layers'].append(dict(sheetIndex=si,parent=None,name=name,visible=True,locked=False,opacity=1,frameData=frames))
assert p.get('sceneAssembly')==before.get('sceneAssembly'),'Do not disturb the user assembly or block material refresh'
assert p['spriteSheets'][:-1]==before['spriteSheets'];assert p['layers'][:-1]==before['layers']
atlas.resize((w*16,h*3*16),Image.Resampling.NEAREST).save(D/'character-material-preview.png')
req=U.Request(url+'scene-noodle-shop-20261118',json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
back,_=fetch('scene-noodle-shop-20261118');assert json.loads(back)==p
source_after,_=fetch('base-outlined-1794365455561');assert source_after==char_raw
(D/'character-material-readback.json').write_bytes(back)
print('Verified draggable character material: front idle, side idle, side sitting; native dimensions; sceneAssembly unchanged; source character untouched.')

