from PIL import Image,ImageDraw
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen,Request
import base64,hashlib,json,sys,copy
d=Path(__file__).resolve().parent
url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
def get():
 with urlopen(url) as r:return r.read(),r.headers['ETag']
def dec(uri):return Image.open(BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
def write(n,x):(d/n).write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
raw,tag=get(); p=json.loads(raw); before=copy.deepcopy(p)
i,l=next((i,l) for i,l in enumerate(p['layers']) if l['name']=='屋顶 · 空调外机' and p['spriteSheets'][l['sheetIndex']]['name']=='苹果24便利店 · 外观')
k,=l['frameData']; f=l['frameData'][k]; old=dec(f['dataURL']); assert old.getbbox()==(110,21,126,38) and old.size==(144,112)
# 16x17 native pixel pattern. Top plate and fan above, front grille below.
pattern=[
'.##############.',
'#+============+#',
'#====######====#',
'#===##ssss##===#',
'#==##ss##ss##==#',
'#==#sss##ss##==#',
'#==#s######s#==#',
'#==#s######s#==#',
'#==##ss##sss#==#',
'#==##ss##ss##==#',
'#===##ssss##===#',
'#====######====#',
'################',
'#ssssssssssssss#',
'#ss##########ss#',
'#ssssssssssssss#',
'.##############.']
colors={'#':'#464b4f','+':'#d6d0b0','=':'#bdb395','s':'#7b7d77'}
assert len(pattern)==17 and all(len(r)==16 for r in pattern)
new=Image.new('RGBA',old.size);draw=ImageDraw.Draw(new)
for y,row in enumerate(pattern):
 for x,c in enumerate(row):
  if c!='.':draw.point((110+x,21+y),fill=colors[c])
# keep highlights as continuous edge rather than isolated bright corner pixels
draw.line((111,22,124,22),fill=colors['+'])
def preview(img):return img.crop((108,19,128,40)).resize((160,168),Image.Resampling.NEAREST)
preview(new).save(d/'空调外机-8倍.png')
b=BytesIO();new.save(b,format='PNG');f['dataURL']='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def sha(b):return hashlib.sha256(b).hexdigest()
assert not (d/'原工程.json').exists()
(d/'原工程.json').write_bytes(raw);write('原版校验.json',dict(sha256=sha(raw),etag=tag))
data=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(d/'候选稿.json').write_bytes(data)
with urlopen(Request(url,method='PUT',data=data,headers={'If-Match':tag,'X-Pixel-Editor':'1','Content-Type':'application/json'})) as r:status=r.status
saved,etag=get();after=json.loads(saved);assert after==p
a=after['layers'][i]['frameData'][k];assert dec(a['dataURL']).tobytes()==new.tobytes()
a['dataURL']=before['layers'][i]['frameData'][k]['dataURL'];assert before==after
write('验证.json',dict(status=status,oldETag=tag,etag=etag,sha256=sha(saved),layer=l['name'],frame=k,bbox=new.getbbox(),oldColors=len(old.getcolors(20000))-1,newColors=len(new.getcolors())-1,onlyOneLayerChanged=True))
print((d/'验证.json').read_text(encoding='utf8'))
