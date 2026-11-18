from pathlib import Path
from PIL import Image, ImageDraw
import base64,io,copy,json,hashlib,sys,urllib.request as U
D=Path(__file__).parent; W,H=32,16
orig=json.loads((D/'before.json').read_bytes());n=next(i for i,s in enumerate(orig['spriteSheets']) if s['name']=='卧式冰柜 32×16')
def target(p): return [l for l in p['layers'] if l.get('sheetIndex')==n]
def dec(u):return Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
def uri(im):
 f=io.BytesIO();im.save(f,'PNG');return 'data:image/png;base64,'+base64.b64encode(f.getvalue()).decode()
def blank():return Image.new('RGBA',(W,H))
key=f'{n}_0_0';body=dec(target(orig)[0]['frameData'][key]['dataURL']);assert body.size==(W,H)
P=dict(r='cc6764',p='e8a68e',R='b04a58',c='785a55',C='57483b',u='b89184',w='e8cd97',o='ba9273',h='ebf0ee',l='bed4c8',g='68a88e',G='346c70',j='b7d9a9',m='99bab5',t='839ea6',s='6c8091',k='464b4f',i='add6e0',b='709fcf',a='ccad9b')
pal=set((D.parent/'store-coffee-angle-20261117/otterisk96.hex').read_text().split());assert set(P.values())<=pal
def pattern(im,x,y,rows):
 for dy,row in enumerate(rows.split()):
  for dx,c in enumerate(row):
   if c!='.':im.putpixel((x+dx,y+dy),tuple(bytes.fromhex(P[c]))+(255,))
food=blank()
# Each stick has one readable silhouette, with a clear gap before the next flavour.
pattern(food,6,3,'.pp. prrR pprR .RR. .w.. .o..')
pattern(food,11,2,'.uu. ucCC cccC cwwC .ww. ..o. ..o.')
# A mint ice-cream tub: an oval lid, a dark green paper band and a cream label.
pattern(food,17,3,'.jjj. jljjg ggjgG gwwgG .ggG.')
# Small waffle cone with a strawberry swirl and a tapering biscuit.
pattern(food,23,2,'.p.. ppr. rprR .ww. .ow. ..o.')
offsets=[0,1,3,5,7,9,10,11]; times=[460,90,85,80,80,85,100,850]
frames=[];glass=[]
for x in offsets:
 pane=blank()
 # Far pane stays in its track. The near pane slides intact on top of it.
 pattern(pane,16,2,'tlllllmlmmt');pattern(pane,16,3,'t t t t t t')
 pattern(pane,17,5,'k k');pattern(pane,24,3,'.l l.')
 pattern(pane,5+x,2,'mllliillllt');pattern(pane,15+x,3,'t l l l l t')
 pattern(pane,5+x,3,'m m m m m');pattern(pane,14+x,5,'k k');pattern(pane,7+x,3,'.l l.')
 pattern(pane,5+x,8,'llllllmlllt')
 im=body.copy();im.alpha_composite(food);im.alpha_composite(pane)
 frames.append(im);glass.append(pane)
strip=Image.new('RGBA',(W*len(frames),H))
for j,i in enumerate(frames):strip.paste(i,(W*j,0))
strip.save(D/'opening-strip.png');frames[-1].save(D/'open.png')
def preview(im):
 o=Image.new('RGBA',(36,20),'#eeebe5');o.alpha_composite(im,(2,2));return o.convert('RGB').resize((324,180),Image.Resampling.NEAREST)
gif=[preview(im) for im in frames]
gif[0].save(D/'opening.gif',save_all=True,append_images=gif[1:],duration=times,loop=0,disposal=2,optimize=False)
pair=Image.new('RGB',(648,180));pair.paste(gif[0]);pair.paste(gif[-1],(324,0));pair.save(D/'ends.png')
def apply(base):
 assert base['spriteSheets'][n]==orig['spriteSheets'][n] and target(base)==target(orig),'Target changed; review before saving.'
 q=copy.deepcopy(base);s=q['spriteSheets'][n];a=s['actions'][0];assert len(s['actions'])==len(a['frames'])==1
 s.update(columns=len(frames),rows=1,imageDataURL=uri(strip));f=a['frames'][0];a['name']='玻璃滑门打开'
 a['frames']=[dict(f,sourceX=W*j,duration=t,notes=f'左扇向右滑开 {offsets[j]}/11 像素') for j,t in enumerate(times)]
 ls=target(q);assert len(ls)==3 and ls[0]['visible'] and ls[1]['visible'] and not ls[2]['visible']
 # Preserve the user's hidden trim layer rather than re-enabling it for the animation.
 for idx,l in enumerate(ls):
  fd=l['frameData'][key];l['frameData']={f'{n}_0_{j}':dict(fd,dataURL=uri(food) if idx==1 else fd['dataURL']) for j in range(len(frames))}
 new=dict(ls[2],name='双轨玻璃滑门',visible=True,frameData={f'{n}_0_{j}':dict(width=W,height=H,dataURL=uri(v)) for j,v in enumerate(glass)})
 q['layers'].append(new);return q
enc=lambda p:json.dumps(p,ensure_ascii=False,separators=(',',':')).encode()
(D/'candidate.json').write_bytes(enc(apply(orig)))
if '--save' in sys.argv:
 url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
 with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
 assert hashlib.sha256(raw).hexdigest()==etag.strip('"');(D/'pre-save.json').write_bytes(raw);(D/'pre-save.etag').write_text(etag)
 base=json.loads(raw);q=apply(base)
 with U.urlopen(U.Request(url,data=enc(q),method='PUT',headers={'If-Match':etag,'Content-Type':'application/json','X-Pixel-Editor':'1'})) as r:print('PUT',r.status)
 with U.urlopen(url) as r:raw=r.read()
 (D/'readback.json').write_bytes(raw);saved=json.loads(raw);assert saved==q
 sheet=saved['spriteSheets'][n];atlas=dec(sheet['imageDataURL'])
 for j,fr in enumerate(sheet['actions'][0]['frames']):
  merged=blank()
  for l in target(saved):
   if l['visible']:merged.alpha_composite(dec(l['frameData'][f'{n}_0_{j}']['dataURL']))
  assert merged.tobytes()==frames[j].tobytes()==atlas.crop((j*W,0,(j+1)*W,H)).tobytes() and fr['duration']==times[j]
  assert all(bytes(px[:3]).hex() in pal for px in set(merged.getdata()) if px[3])
 assert len(set(im.tobytes() for im in frames))==len(frames)==Image.open(D/'opening.gif').n_frames
 print('Verified 8 distinct frames, palette, timings, sheet and GIF.')

