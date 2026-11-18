from pathlib import Path
from PIL import Image
from io import BytesIO
import json,base64,hashlib,shutil,zipfile
D=Path(__file__).parent;p=json.loads((D/'已保存工程.json').read_bytes());target=Path(r'C:/Users/Administrator/Desktop/最后/游戏资产/游戏内部/便利店');out=D/'修正版';out.mkdir(exist_ok=True)
def dec(uri):return Image.open(BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
def render(si,ai=0,fi=0):
 f=p['spriteSheets'][si]['actions'][ai]['frames'][fi];im=Image.new('RGBA',(f['width'],f['height']))
 for l in p['layers']:
  c=l['frameData'].get(f'{si}_{ai}_{fi}')
  if l['sheetIndex']==si and l['visible'] and c:
   a=dec(c['dataURL']);r=c.get('placement')
   if r:
    assert all(float(r[x]).is_integer() for x in ('x','y','w','h'));a=a.resize((r['w'],r['h']),Image.Resampling.NEAREST);im.alpha_composite(a,(r['x'],r['y']))
   else:im.alpha_composite(a)
 return im
# Test placement against a direct expected paste, including a non-zero canvas position.
f,=[l['frameData']['11_0_0'] for l in p['layers'] if l['name']=='风景海报' and l['sheetIndex']==11];r=f['placement'];landscape=dec(f['dataURL']);expected=Image.new('RGBA',(32,16));expected.alpha_composite(landscape,(r['x'],r['y']));assert expected.getpixel((6,8))[3]==255
jobs=[]
for si,name in [(11,'三张海报'),(12,'壁挂烟架')]:
 full=render(si);im=full.crop(full.getbbox());im.save(out/(name+'.png'));jobs.append(name+'.png')
 assert im.getbbox()==(0,0,im.width,im.height)
 if si==11:assert all(full.getpixel((x,y))[3] for y in range(7,14) for x in range(6,10))
 im.resize((im.width*8,im.height*8),Image.Resampling.NEAREST).save(D/(name+'-最终.png'))
for ai,name in [(1,'便利店-无雪-开门'),(2,'便利店-雪顶-开门')]:
 frames=[render(10,ai,i) for i in range(6)];base=frames[0];curtain=base.crop((12,37,29,41)).tobytes()
 assert all(im.crop((12,37,29,41)).tobytes()==curtain for im in frames)
 boxes=[im.getbbox() for im in frames];assert len(set(boxes))==1;box=boxes[0];trimmed=[im.crop(box) for im in frames];w,h=trimmed[0].size
 atlas=Image.new('RGBA',(w*6,h));metadata=[]
 folder=out/name;folder.mkdir(exist_ok=True)
 for i,im in enumerate(trimmed):
  im.save(folder/f'{i:02d}.png');atlas.alpha_composite(im,(i*w,0));metadata.append(dict(rect=[i*w,0,w,h],durationMs=p['spriteSheets'][10]['actions'][ai]['frames'][i]['duration']))
 atlas.save(out/(name+'.png'));jobs.append(name+'.png')
 (out/(name+'.json')).write_text(json.dumps(dict(frameSize=[w,h],frames=metadata,trim=box,curtainFixed=True),ensure_ascii=False,indent=2),'utf8');jobs.append(name+'.json')
 for i,im in enumerate(trimmed):assert atlas.crop((i*w,0,(i+1)*w,h)).tobytes()==im.tobytes()
 previews=[a.resize((a.width*5,a.height*5),Image.Resampling.NEAREST) for a in trimmed]
 # Common palette including a dedicated transparent index preserves the pixel edges.
 pal=Image.new('P',(1,1));colors=[0,0,0]+[v for c in p['palette'] for v in (c['r'],c['g'],c['b'])];pal.putpalette(colors+[0]*(768-len(colors)))
 gifs=[]
 for im in previews:
  gif=im.convert('RGB').quantize(palette=pal,dither=Image.Dither.NONE);gif.paste(0,mask=im.getchannel('A').point(lambda v:255-v));gifs.append(gif)
 order=[0,1,2,3,4,5,4,3,2,1];gifs[0].save(D/(name+'-预览.gif'),save_all=True,append_images=[gifs[j] for j in order[1:]],duration=[500,90,90,90,90,700,90,90,90,90],transparency=0,disposal=2,loop=0,optimize=False)
for name in jobs:
 dest=target/name
 if dest.exists():
  backup=D/'原文件'/name
  if backup.exists():assert dest.read_bytes()==backup.read_bytes(),'文件正在被修改，停止避免覆盖'
  else:shutil.copy2(dest,backup)
 shutil.copy2(out/name,dest);assert dest.read_bytes()==(out/name).read_bytes()
 for_png=name.endswith('.png')
 if for_png:
  with Image.open(dest) as im:im.load()
(out/'说明.md').write_text('烟架：在用户刚修改版本上只加深顶面，侧板及下面两层保留。海报：尊重工程图层placement参数，未重画；原漏算位置导致导出出现空框已修复。开门：绿色帘子在每帧固定原位，只滑动y=41及以下玻璃门；无雪和雪顶各6帧。PNG图集每格等宽，JSON中有尺寸和时长；子文件夹是逐帧PNG。不要再使用之前ZIP中的海报/开门序列。以上文件已同步到游戏素材目录；编辑工程中烟架/门动画也已保存。','utf8')
with zipfile.ZipFile(D/'烟架海报开门-修正版.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in out.rglob('*'):
  if f.is_file():z.write(f,f.relative_to(out))
with zipfile.ZipFile(D/'烟架海报开门-修正版.zip') as z:assert z.testzip() is None
(D/'导出验证.json').write_text(json.dumps(dict(filesWritten=jobs,frameCounts=[6,6],curtainFixedAllFrames=True,posterPlacementTest=True,posterSourceUnchanged=True,gamePngReadback=True),ensure_ascii=False,indent=2),'utf8')
print(jobs)
