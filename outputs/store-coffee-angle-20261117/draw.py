from pathlib import Path
from PIL import Image
import io,base64,json,copy,sys,urllib.request as U,hashlib
D=Path(__file__).parent
code={'K':'2f3b3d','k':'464b4f','s':'5c6163','t':'7b7d77','o':'8a7b63','b':'bdb395','a':'d6d0b0','h':'ebf0ee','d':'a3987a','j':'6e5f4d','m':'99bab5','l':'bed4c8','g':'4d8a7e','G':'255461','n':'57483b','u':'9e7565','c':'785a55','C':'ba9273','R':'b04a58','r':'cc6764','p':'e38674','v':'839ea6'}
pal=set((D/'otterisk96.hex').read_text().strip().lower().splitlines())
assert len(pal)==96 and set(code.values())<=pal
def blank():return Image.new('RGBA',(24,24))
def grid(im,x,y,rows):
 for j,row in enumerate(rows.split()):
  for i,k in enumerate(row):
   if k!='.': im.putpixel((x+i,y+j),tuple(bytes.fromhex(code[k]))+(255,))
body,head,cup=blank(),blank(),blank()
# Broad horizontal top plane behind the fascia; the foot projects below it.
grid(body,3,3,'''
 .KKKKKKKKKKKKKKKK.
 KaaaaaaaaaaaaaaabK
 KaaaaaaaaaaaaaaabK
 KaaaaaaaaaaaddddbK
 KaaaaaaaaaaaaaaabK
 KaaaaaaaaaaaddddbK
 KhhaaaaaaaaaaaaabK
 KbbbbbbbbbbbbbbbdK
 KbbbbbbbbbbbbbbbdK
 KdbbbbbbbbbbbbbddK
 KdKkkkkkkkkkkkKddK
 KdKsssssssssssKddK
 KdKsssssssssssKddK
 KdKsssssssssssKddK
 KdKsttttttttttKddK
 KdKtttttttttttKddK
 KbmvvvvvvvvvvvmbdK
 KlmvmvmvmvmvmvmmbK
 KdbbbbbbbbbbbbbbdK
 .KKKKKKKKKKKKKKKK.
''')
# Bean hopper: top glass ellipse, warm beans visible under it and in the front wall.
grid(head,5,1,'''
 ...kkkk...
 .kklmlmkk.
 kllmCCumlk
 klmCunCuml
 .vmcuuncv.
 .kvuccnvk.
 ..kcnnck..
 ...kkkk...
''')
grid(head,5,10,'''GggggG GmllgG''')
grid(head,15,10,'''jrj .p.''')
grid(head,8,13,'''kttttk .ksvk. ..kk..''')
# Open rim shows the coffee surface; the cup sleeve narrows toward the drip tray.
grid(cup,7,16,'''
 ..hhha..
 .hcuuch.
 .ahhhba.
 ..prrd..
 ..babb..
 ...dd...
''')
def uri(im):
 f=io.BytesIO();im.save(f,'PNG');return 'data:image/png;base64,'+base64.b64encode(f.getvalue()).decode()
orig=json.loads((D/'before.json').read_bytes()); n=4
def related(p):return [l for l in p['layers'] if l['sheetIndex']==n]
def redraw(base):
 assert base['spriteSheets'][n]==orig['spriteSheets'][n] and related(base)==related(orig),'Coffee changed; preserve concurrent edits'
 p=copy.deepcopy(base);sheet=p['spriteSheets'][n]; merged=blank()
 for l,im in zip(related(p),(body,head,cup),strict=True):
  merged.alpha_composite(im); l['frameData']['4_0_0']['dataURL']=uri(im)
 sheet['imageDataURL']=uri(merged);sheet['actions'][0]['frames'][0]['notes']='正向俯视：机顶与正面同时可见，豆仓盖、咖啡液面和接水盘有纵深。Otterisk 96 限色。'
 merged.save(D/'coffee.png');merged.resize((240,240),Image.Resampling.NEAREST).save(D/'preview.png')
 return p
p=redraw(orig)
def encode(p):return json.dumps(p,ensure_ascii=False,separators=(',',':')).encode()
(D/'candidate.json').write_bytes(encode(p))
if '--save' in sys.argv:
 url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
 with U.urlopen(url) as r:raw=r.read();tag=r.headers['ETag']
 assert hashlib.sha256(raw).hexdigest()==tag.strip('"')
 base=json.loads(raw);(D/'pre-save.json').write_bytes(raw);(D/'pre-save.etag').write_text(tag)
 p=redraw(base)
 with U.urlopen(U.Request(url,data=encode(p),method='PUT',headers={'If-Match':tag,'X-Pixel-Editor':'1','Content-Type':'application/json'})) as r:print('PUT',r.status)
 with U.urlopen(url) as r:saved=r.read()
 (D/'readback.json').write_bytes(saved);read=json.loads(saved);assert read==p
 merge=blank()
 for l in related(read):
  im=Image.open(io.BytesIO(base64.b64decode(l['frameData']['4_0_0']['dataURL'].split(',')[1])))
  assert all(bytes(px[:3]).hex() in pal for px in im.getdata() if px[3])
  merge.alpha_composite(im)
 assert merge.tobytes()==Image.open(D/'coffee.png').tobytes()
 print('Verified 3 layers, 24x24, all nontransparent colors within Otterisk 96')

