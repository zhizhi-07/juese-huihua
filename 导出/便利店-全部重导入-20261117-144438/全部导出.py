from pathlib import Path
from PIL import Image
from io import BytesIO
import json,base64,hashlib,shutil,zipfile
D=Path(__file__).parent;p=json.loads((D/'已保存工程.json').read_bytes());old=json.loads((D/'原工程.json').read_bytes());target=Path(r'C:/Users/Administrator/Desktop/最后/游戏资产/游戏内部/便利店');out=D/'最新全部素材';out.mkdir(exist_ok=True);manifest=[]
def dec(uri):return Image.open(BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
def render(si,ai=0,fi=0,snow=None,subset=None):
 f=p['spriteSheets'][si]['actions'][ai]['frames'][fi];im=Image.new('RGBA',(f['width'],f['height']))
 for l in p['layers']:
  if l['sheetIndex']!=si or subset is not None and l['name'] not in subset:continue
  c=l['frameData'].get(f'{si}_{ai}_{fi}');vis=snow if l['name']=='屋顶积雪' and snow is not None else l['visible']
  if not vis or not c:continue
  a=dec(c['dataURL']);r=c.get('placement')
  if r:
   assert all(float(r[k]).is_integer() for k in ('x','y','w','h'));a=a.resize((r['w'],r['h']),Image.Resampling.NEAREST)
  if l['opacity']!=1:a.putalpha(a.getchannel('A').point(lambda v:round(v*l['opacity'])))
  im.alpha_composite(a,(r['x'],r['y']) if r else (0,0))
 return im
def save(name,im,origin):
 assert im.getbbox();box=im.getbbox();crop=im.crop(box);path=out/(name+'.png');path.parent.mkdir(parents=True,exist_ok=True);crop.save(path)
 with Image.open(path) as test:assert test.convert('RGBA').tobytes()==crop.tobytes()
 assert crop.getbbox()==(0,0,crop.width,crop.height)
 manifest.append(dict(file=path.relative_to(out).as_posix(),size=crop.size,trim=box,source=origin));return crop
def sequence(name,si,ai):
 full=[render(si,ai,fi) for fi in range(len(p['spriteSheets'][si]['actions'][ai]['frames']))];boxes=[im.getbbox() for im in full];assert all(boxes);union=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes));frames=[im.crop(union) for im in full];w,h=frames[0].size;atlas=Image.new('RGBA',(w*len(frames),h));meta=[]
 for i,im in enumerate(frames):
  atlas.alpha_composite(im,(i*w,0));meta.append(dict(rect=[i*w,0,w,h],durationMs=p['spriteSheets'][si]['actions'][ai]['frames'][i]['duration'] or 100))
 path=out/(name+'.png');atlas.save(path);assert atlas.getbbox()==(0,0,atlas.width,atlas.height)
 for i,im in enumerate(frames):assert atlas.crop((i*w,0,(i+1)*w,h)).tobytes()==im.tobytes()
 (out/(name+'.json')).write_text(json.dumps(dict(frameSize=[w,h],frames=meta,sourceTrim=union,sourceSheet=si,sourceAction=ai),ensure_ascii=False,indent=2),'utf8')
 manifest.append(dict(file=name+'.png',size=atlas.size,frameSize=[w,h],frameCount=len(frames),trim=union,source=[si,ai]))
 # Lossless exact-color GIF (not imported into Godot). At most 255 opaque colors in these frames.
 colors=sorted({px[:3] for im in frames for px in im.get_flattened_data() if px[3]});assert len(colors)<=255
 palette=[0,0,0]+[v for c in colors for v in c];palette += [0]*(768-len(palette));lookup={c:i+1 for i,c in enumerate(colors)};gifs=[]
 for im in frames:
  palim=Image.new('P',im.size);palim.putpalette(palette);palim.putdata([lookup[px[:3]] if px[3] else 0 for px in im.get_flattened_data()]);gifs.append(palim.resize((w*5,h*5),Image.Resampling.NEAREST))
 order=list(range(len(frames)))
 if si==10:order+=list(range(len(frames)-2,0,-1))
 gifs[0].save(D/(name+'-预览.gif'),save_all=True,append_images=[gifs[i] for i in order[1:]],duration=[meta[i]['durationMs'] for i in order],transparency=0,disposal=2,loop=0,optimize=False)
 return atlas.size
for si,name in [(0,'柜子'),(5,'现代柜子'),(6,'冰柜')]:sequence(name,si,0)
for si,prefix in [(1,'木绿收银台'),(7,'现代收银台')]:
 names=[l['name'] for l in p['layers'] if l['sheetIndex']==si]
 for ai,view in [(0,'正面'),(1,'右侧面')]:
  save(f'{prefix}-{view}-椅子',render(si,ai,subset=[n for n in names if '椅' in n]),[si,ai,'chair'])
  save(f'{prefix}-{view}-桌子电脑',render(si,ai,subset=[n for n in names if '椅' not in n]),[si,ai,'desk+computer'])
for si,name in [(3,'包子蒸柜'),(4,'自助咖啡机'),(11,'三张海报'),(12,'壁挂烟架')]:save(name,render(si),[si,0,0])
# Both existing filenames point to the user's same latest rack, not our earlier draft.
shutil.copy2(out/'壁挂烟架.png',out/'烟架.png');manifest.append(dict(file='烟架.png',sameAs='壁挂烟架.png',source=[12,0,0]))
save('便利店-无雪',render(10,snow=False),[10,0,0,'noSnow']);save('便利店-雪顶',render(10,snow=True),[10,0,0,'snow'])
sequence('便利店-无雪-开门',10,1);sequence('便利店-雪顶-开门',10,2)
for si,name in [(8,'苹果24-旧设计'),(9,'24h-MART-旧参考')]:save('旧版店面/'+name,render(si),[si,0,0])
# Known atlas layouts already referenced by the live Godot scene stay exactly compatible.
assert Image.open(out/'冰柜.png').size==(160,14)
assert Image.open(out/'柜子.png').size==(288,29)
assert Image.open(out/'壁挂烟架.png').size==(22,24)
poster=render(11);assert all(poster.getpixel((x,y))[3] for y in range(7,14) for x in range(6,10))
assert p['layers'][83:]==old['layers'][83:],'最新烟架或其他层被改动'
sourcehash=json.loads((D/'游戏写入前校验.json').read_text('utf8'));sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
# Check every existing destination first, before any writes.
for f in out.rglob('*'):
 if f.is_file():
  dest=target/f.relative_to(out);key=f.relative_to(out).as_posix()
  if dest.exists():
   assert key in sourcehash and sha(dest)==sourcehash[key],f'游戏文件在后台变化，停止以免覆盖：{key}'
written=[]
for f in out.rglob('*'):
 if f.is_file():
  dest=target/f.relative_to(out);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dest);assert sha(f)==sha(dest);written.append(dest)
# User-owned window.png and import metadata remain untouched.
assert sha(target/'window.png')==sourcehash['window.png']
for f in target.glob('*.import'):
 if f.name in sourcehash:assert sha(f)==sourcehash[f.name]
(D/'重新导入清单.json').write_text(json.dumps(dict(assets=manifest,filesWritten=[str(f) for f in written],posterPlacementRespected=True,rackSourceUnchanged=True,unrelatedWindowPreserved=True,sourceFileHashes={str(f):sha(f) for f in written}),ensure_ascii=False,indent=2),'utf8')
(out/'使用说明.md').write_text('本次全部素材来自最新API保存工程。用户新烟架三层图层合成，两种烟架文件名内容相同。\n冰柜8帧20×14、柜子12帧24×29原切片不变。收银台桌子电脑合一，椅子分开；两套/正侧面均保留。\n房子两种雪况、开门两序列各6帧：帘子绿色像素固定，缺口黄色玻璃属于门，随门滑动，全开无黄色残留。\n所有合成尊重placement、opacity和visible。全透明场景没有导出；原隐藏设备不擅自恢复。旧房子另放子目录。window.png是用户已有游戏资源，本次不改。\n动画PNG横向等宽排列，JSON含frameSize、rect、durationMs。请用本批替换之前素材包。','utf8')
with zipfile.ZipFile(D/'便利店-最新全部素材.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in out.rglob('*'):
  if f.is_file():z.write(f,f.relative_to(out))
with zipfile.ZipFile(D/'便利店-最新全部素材.zip') as z:assert z.testzip() is None
(D/'进度.md').write_text('步骤3完成：全部源素材裁紧重新导出并覆盖游戏对应文件，柜子/冰柜切片尺寸兼容；新烟架原图层未动，两个文件名同步。window.png与导入元数据保留。下一步Godot导入与场景验证。','utf8')
print('已写入',len(written),'个PNG/JSON','PNG',len(list(out.rglob('*.png'))))
