from pathlib import Path
from PIL import Image
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent
def fetch(id):
 with U.urlopen('http://127.0.0.1:8765/api/project?id='+id) as r:return r.read(),r.headers['ETag']
raw,etag=fetch('scene-noodle-shop-20261118');p=json.loads(raw);before=copy.deepcopy(p)
char_raw,char_etag=fetch('main');character=json.loads(char_raw)
(D/'people-character-source.json').write_bytes(char_raw);(D/'people-character-source.etag').write_text(char_etag)
(D/'before-people.json').write_bytes(raw);(D/'before-people.etag').write_text(etag);(D/'before-people.sha256').write_text(hashlib.sha256(raw).hexdigest())
def dec(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def person(sheet_name,direction):
 si=next(i for i,s in enumerate(character['spriteSheets']) if s['name']==sheet_name);s=character['spriteSheets'][si];ai=next(i for i,a in enumerate(s['actions']) if a['direction']==direction);f=s['actions'][ai]['frames'][0];key=f'{si}_{ai}_0'
 visible=[]
 for l in character['layers']:
  if l.get('sheetIndex')!=si or l.get('isGroup') or not l.get('visible') or key not in l.get('frameData',{}):continue
  parent=l.get('parent');show=True
  while parent is not None:
   group=character['layers'][parent];show=show and group.get('visible',False);parent=group.get('parent')
  if show:visible.append(l)
 rear=[l for l in visible if l['name'].startswith('头发 /') and l['name'].endswith('后发')];rest=[l for l in visible if l not in rear]
 base=max((i for i,l in enumerate(rest) if l['name'] in ('head','body','头部','身体')),default=-1)
 if rear and base>=0:rest[base+1:base+1]=rear
 hands=[l for l in rest if l['name']=='hand'];ordered=[l for l in rest if l not in hands]+hands
 out=Image.new('RGBA',(f['width'],f['height']))
 for l in ordered:
  data=l['frameData'][key];im=dec(data['dataURL']);placement=data.get('placement')
  if placement:
   im=im.resize((round(placement['w']),round(placement['h'])),Image.Resampling.NEAREST);pos=(round(placement['x']),round(placement['y']))
  else:pos=(0,0)
  if l.get('opacity',1)!=1:im.putalpha(im.getchannel('A').point(lambda a:round(a*l['opacity'])))
  out.alpha_composite(im,pos)
 return out
standing=person('original16_idle','down');sitting=person('original16_sit','side')
standing.resize((304,304),Image.Resampling.NEAREST).save(D/'standing-source-preview.png');sitting.resize((304,304),Image.Resampling.NEAREST).save(D/'sitting-source-preview.png')
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='面馆 · 参考布局');sheet=p['spriteSheets'][si];W,H=sheet['frameWidth'],sheet['frameHeight'];people=Image.new('RGBA',(W,H))
# One pixel of the character remains one pixel of the scene, without resizing.
people.alpha_composite(standing,(66,61));people.alpha_composite(sitting,(79,41))
layer=dict(sheetIndex=si,parent=None,name='人物比例 · 主工程原尺寸',visible=True,locked=False,opacity=1,frameData={})
for f in range(8):layer['frameData'][f'{si}_0_{f}']=dict(width=W,height=H,dataURL=uri(people))
p['layers'].append(layer);atlas=Image.new('RGBA',(W*8,H));frames=[]
for f in range(8):
 out=Image.new('RGBA',(W,H))
 for l in p['layers']:
  if l['sheetIndex']==si and l.get('visible',True):out.alpha_composite(dec(l['frameData'][f'{si}_0_{f}']['dataURL']))
 atlas.alpha_composite(out,(W*f,0));frames.append(out.convert('RGB').resize((768,720),Image.Resampling.NEAREST))
sheet['imageDataURL']=uri(atlas);frames[0].save(D/'people-scale.png');frames[0].save(D/'people-scale.gif',save_all=True,append_images=frames[1:],duration=140,loop=0,disposal=2)
p['currentSheetIndex']=si;p['currentActionIndex']=0;p['currentFrameIndex']=0;p['currentLayerIndex']=len(p['layers'])-1
assert p['layers'][:-1]==before['layers']
for i,s in enumerate(before['spriteSheets']):
 if i!=si:assert p['spriteSheets'][i]==s
req=U.Request('http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
back,_=fetch('scene-noodle-shop-20261118');assert json.loads(back)==p
source_after,_=fetch('main');assert source_after==char_raw
(D/'people-scale-readback.json').write_bytes(back)
print('Verified main character idle and current side sitting at 1:1 native pixels; original character unchanged; scene saved.')
