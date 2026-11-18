from pathlib import Path
from io import BytesIO
from PIL import Image
import json,base64,hashlib,shutil
D=Path(__file__).parent;p=json.loads((D/'已保存工程.json').read_bytes());dest=Path(r'C:/Users/Administrator/Desktop/最后/游戏资产/游戏内部/便利店/店面');out=D/'导出店面';out.mkdir(exist_ok=True)
def render(ai=0,fi=0,snow=None):
 f=p['spriteSheets'][10]['actions'][ai]['frames'][fi];im=Image.new('RGBA',(f['width'],f['height']))
 for l in p['layers']:
  c=l['frameData'].get(f'10_{ai}_{fi}')
  if l['sheetIndex']!=10 or not c:continue
  visible=snow if l['name']=='屋顶积雪' and snow is not None else l['visible']
  if not visible:continue
  a=Image.open(BytesIO(base64.b64decode(c['dataURL'].split(',')[1]))).convert('RGBA');r=c.get('placement')
  if r:a=a.resize((r['w'],r['h']),Image.Resampling.NEAREST)
  assert l['opacity']==1;im.alpha_composite(a,(r['x'],r['y']) if r else (0,0))
 return im
summary=[]
for snowy in (False,True):
 name='便利店-雪顶' if snowy else '便利店-无雪';ai=2 if snowy else 1
 static=render(snow=snowy);box=static.getbbox();closed=static.crop(box);closed.save(out/(name+'.png'));assert closed.getbbox()==(0,0,closed.width,closed.height)
 frames=[render(ai,i) for i in range(6)];assert frames[0].tobytes()==static.tobytes();assert all(f.getbbox()==box for f in frames)
 w,h=closed.size;strip=Image.new('RGBA',(w*6,h));trimmed=[f.crop(box) for f in frames]
 for i,f in enumerate(trimmed):strip.alpha_composite(f,(i*w,0))
 strip.save(out/(name+'-开门.png'))
 for i,f in enumerate(trimmed):assert strip.crop((i*w,0,(i+1)*w,h)).tobytes()==f.tobytes()
 meta=dict(frameSize=[w,h],frames=[dict(rect=[i*w,0,w,h],durationMs=p['spriteSheets'][10]['actions'][ai]['frames'][i]['duration']) for i in range(6)],sourceTrim=list(box),sourceSheet=10,sourceAction=ai)
 oldmeta=json.loads((D/'游戏原文件'/(name+'-开门.json')).read_text('utf8'));assert meta==oldmeta,'动画切片/时间意外变化'
 (out/(name+'-开门.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2),'utf8')
 colors=sorted({px[:3] for f in trimmed for px in f.get_flattened_data() if px[3]});assert len(colors)<=255;lut={c:i+1 for i,c in enumerate(colors)};palette=[0,0,0]+[v for c in colors for v in c];palette+=[0]*(768-len(palette));gifs=[]
 for f in trimmed:
  g=Image.new('P',f.size);g.putpalette(palette);g.putdata([lut[px[:3]] if px[3] else 0 for px in f.get_flattened_data()]);gifs.append(g.resize((w*5,h*5),Image.Resampling.NEAREST))
 order=[0,1,2,3,4,5,4,3,2,1]
 gifs[0].save(D/(name+'-开门预览.gif'),save_all=True,append_images=[gifs[i] for i in order[1:]],duration=[meta['frames'][i]['durationMs'] for i in order],transparency=0,disposal=2,loop=0,optimize=False)
 summary.append(dict(name=name,staticSize=[w,h],atlasSize=strip.size,frameCount=6,outline='#2f3b3d'))
hashes=json.loads((D/'游戏原文件校验.json').read_text('utf8'));sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
for f in out.iterdir():
 path=dest/f.name;assert path.exists() and sha(path)==hashes[f.name],f'目标文件已变化，停止避免覆盖 {f.name}'
for f in out.iterdir():
 path=dest/f.name;shutil.copy2(f,path);assert sha(path)==sha(f)
 if path.suffix=='.png':
  with Image.open(path) as im:im.load()
(D/'导出验证.json').write_text(json.dumps(dict(files=[str(dest/f.name) for f in out.iterdir()],versions=summary,frameTimingAndSlicingUnchanged=True,gameHashes={f.name:sha(dest/f.name) for f in out.iterdir()}),ensure_ascii=False,indent=2),'utf8')
(D/'进度.md').write_text('步骤3完成：指定店面目录4个PNG、2个JSON已覆盖，原切片59×45和61×46、帧时长均完全不变，PNG回读通过。原文件与ETag备份齐全。下一步Godot实际重导入及纹理核对。','utf8')
print(summary)
