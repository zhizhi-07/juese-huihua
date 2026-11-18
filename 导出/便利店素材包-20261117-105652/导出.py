from PIL import Image,ImageDraw
from io import BytesIO
from pathlib import Path
import json,base64,hashlib,zipfile,shutil
D=Path(__file__).parent;root=D/'交付';root.mkdir(exist_ok=True);p=json.loads((D/'已保存工程.json').read_bytes());manifest=[];skips=[]
def dec(uri):return Image.open(BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
def comp(si,ai=0,fi=0,subset=None,snow=None):
 f=p['spriteSheets'][si]['actions'][ai]['frames'][fi];im=Image.new('RGBA',(f['width'],f['height']))
 for l in p['layers']:
  if l['sheetIndex']!=si or subset is not None and l['name'] not in subset:continue
  visible=snow if l['name']=='屋顶积雪' and snow is not None else l['visible']
  cel=l.get('frameData',{}).get(f'{si}_{ai}_{fi}')
  if visible and cel:
   a=dec(cel['dataURL']);assert l['opacity']==1
   placement=cel.get('placement')
   if placement:
    assert all(float(placement[k]).is_integer() for k in ('x','y','w','h'))
    a=a.resize((placement['w'],placement['h']),Image.Resampling.NEAREST)
    im.alpha_composite(a,(placement['x'],placement['y']))
   else:im.alpha_composite(a)
 return im
def export_image(name,im,source):
 bbox=im.getbbox()
 if bbox is None:skips.append(dict(name=name,reason='当前可见图层为空'));return
 out=im.crop(bbox);path=root/(name+'.png');path.parent.mkdir(parents=True,exist_ok=True);out.save(path)
 assert out.getbbox()==(0,0,out.width,out.height)
 reread=Image.open(path).convert('RGBA');assert reread.tobytes()==out.tobytes()
 manifest.append(dict(file=path.relative_to(root).as_posix(),size=out.size,source=source,sourceCanvas=im.size,trim=bbox))
 return out
def seq(name,si,ai,snow=None):
 act=p['spriteSheets'][si]['actions'][ai];full=[comp(si,ai,i,snow=snow) for i in range(len(act['frames']))];folder=root/name;folder.mkdir(parents=True,exist_ok=True);frames=[];small=[]
 for i,im in enumerate(full):
  bbox=im.getbbox();assert bbox is not None;crop=export_image(f'{name}/逐帧/{i:02d}',im,[si,ai,i]);small.append(crop);frames.append(dict(file=f'逐帧/{i:02d}.png',durationMs=act['frames'][i].get('duration') or round(1000/p['spriteSheets'][si]['fps']),sourceCanvas=im.size,trim=bbox))
 width=sum(a.width for a in small);height=max(a.height for a in small);strip=Image.new('RGBA',(width,height));x=0
 for info,im in zip(frames,small):
  strip.alpha_composite(im,(x,0));info['atlasRect']=[x,0,im.width,im.height];x+=im.width
 strip.save(folder/'序列帧.png')
 for info,im in zip(frames,small):
  x,y,w,h=info['atlasRect'];assert strip.crop((x,y,x+w,y+h)).tobytes()==im.tobytes()
 boxes=[im.getbbox() for im in full];bounds=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes));fixed=[a.crop(bounds) for a in full]
 # Shared palette keeps GIF transparency stable; PNGs remain the lossless deliverable.
 palette=Image.new('P',(1,1));palbytes=[0,0,0]+[v for c in p['palette'] for v in (c['r'],c['g'],c['b'])];palette.putpalette(palbytes+[0]*(768-len(palbytes)))
 gifs=[]
 for a in fixed:
  a=a.resize((a.width*4,a.height*4),Image.Resampling.NEAREST);g=a.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE);g.paste(0,mask=a.getchannel('A').point(lambda v:255-v));gifs.append(g)
 # Opening-only production frames; preview reverses smoothly rather than jumping shut.
 isdoor=si==10;order=list(range(len(gifs)))+(list(range(len(gifs)-2,0,-1)) if isdoor else [])
 durations=[frames[i]['durationMs'] for i in order]
 gifs[order[0]].save(folder/'预览.gif',save_all=True,append_images=[gifs[j] for j in order[1:]],duration=durations,transparency=0,disposal=2,loop=0,optimize=False)
 with Image.open(folder/'预览.gif') as gif:assert gif.n_frames>1
 metadata=dict(sourceSheet=si,sourceAction=ai,atlas='序列帧.png',atlasSize=strip.size,frames=frames,alignedCrop=bounds,previewReverse=isdoor)
 (folder/'帧数据.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),'utf8')
 return metadata
# Preserve both counter versions and views, with chair separated from counter+computer.
for si,prefix in [(1,'木绿收银台'),(7,'现代收银台')]:
 for ai,a in enumerate(p['spriteSheets'][si]['actions']):
  layers=[l['name'] for l in p['layers'] if l['sheetIndex']==si];chair=[n for n in layers if '椅' in n];desk=[n for n in layers if '椅' not in n]
  view='正面' if ai==0 else '右侧面'
  export_image(f'静图/收银台/{prefix}-{view}-椅子',comp(si,ai,subset=chair),[si,ai,'chair'])
  export_image(f'静图/收银台/{prefix}-{view}-桌子电脑',comp(si,ai,subset=desk),[si,ai,'desk+computer'])
for si,name in [(3,'包子蒸柜'),(4,'自助咖啡机')]:export_image('静图/'+name,comp(si),[si,0,0])
for si,name in [(0,'陈列冷柜'),(5,'现代冷柜'),(6,'卧式冰柜')]:seq('柜子序列/'+name,si,0)
export_image('静图/便利店-无雪',comp(10,snow=False),[10,0,0,'noSnow'])
export_image('静图/便利店-雪顶',comp(10,snow=True),[10,0,0,'snow'])
for ai,name in [(1,'便利店-无雪-开门'),(2,'便利店-雪顶-开门')]:seq('开门动画/'+name,10,ai)
export_image('静图/三张海报',comp(11),[11,0,0])
# Explicitly separate previous shop designs instead of silently delivering the wrong main version.
for si,name in [(8,'苹果24-旧设计'),(9,'24h-MART-旧参考重画')]:export_image('旧版店面/'+name,comp(si),[si,0,0])
export_image('静图/场景画布',comp(2),[2,0,0])
(root/'尺寸及裁切清单.json').write_text(json.dumps(dict(images=manifest,skipped=skips),ensure_ascii=False,indent=2),'utf8')
backup=root/'工程备份';backup.mkdir(exist_ok=True)
shutil.copy2(D/'已保存工程.json',backup/'工程-含开门动画.json');shutil.copy2(D/'原工程.json',backup/'工程-操作前.json')
readme='''# 便利店素材包
- 静图：全部按有效alpha包围框裁紧，左右及上下没有全透明留白。椅子独立，桌子+电脑合并；正面/右侧面分开，保留两套原版收银台。
- 三种柜子：原有12、12、8帧均保留，未恢复已隐藏的旧玻璃层。
- 标准便利店：无雪/雪顶静图各一张；无雪/雪顶开门各6帧。
- 海报：按当前场景合成一张PNG，不再拆图层；原空白场景没有像素，不导出空图。
- 旧版店面单独放在“旧版店面”，不是当前店面。
- 所有导出遵循当前已保存图层显隐。没有恢复扭蛋机、售货机、终端、垃圾桶等已隐藏设备；它们仍保留在工程备份。

## 序列帧怎么用
- “逐帧”文件夹：每帧独立裁紧，无透明边；trim为原始画布的[left,top,right,bottom]。
- “序列帧.png”：各帧横向紧密拼接，无间隔；帧尺寸不一时用“帧数据.json”中的atlasRect裁片，不能假设等宽。
- durationMs保留帧时长；摆放时以trim左上角加回原坐标，避免动画跳动。
- GIF仅4倍预览。开门GIF带倒序关门以便循环观看；生产PNG和工程动作只有开门六帧。
- 首帧闭门，末帧全开。项目只增加两个开门动作和一层“滑门动画”，未覆盖原静图。

## 备份与恢复
工程备份中包含操作前和含动画的完整JSON。恢复前先备份当前工程，通过GET /api/project取得当前ETag后比较；仅确认覆盖后以PUT、X-Pixel-Editor:1、If-Match保存。409冲突停止，不盲重传。不得强制刷新有草稿的前台。
所有图片来自本次保存工程，经PNG回读和像素对照验证；未接入游戏碰撞或进门事件。
'''
(root/'使用说明.md').write_text(readme,'utf8')
# Verify every PNG is loadable; all individual production images have exact alpha bounds.
for f in root.rglob('*.png'):
 with Image.open(f) as im:im.load()
for e in manifest:
 f=root/e['file']
 with Image.open(f) as im:assert im.size==tuple(e['size']) and im.getbbox()==(0,0,im.width,im.height)
# Quick contact sheet of static exports (not a game asset).
files=list((root/'静图').rglob('*.png'));board=Image.new('RGBA',(600,((len(files)+4)//5)*145),'#303a3c');pen=ImageDraw.Draw(board)
for i,f in enumerate(files):
 im=Image.open(f).convert('RGBA');im.thumbnail((110,115),Image.Resampling.NEAREST)
 scale=min(3,110//max(1,im.width),115//max(1,im.height));scale=max(1,scale)
 im=im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST);x=(i%5)*120;y=(i//5)*145;board.alpha_composite(im,(x,y+15));pen.text((x,y),str(i+1))
board.save(D/'导出检查.png')
zipfilePath=D/'便利店素材包.zip'
with zipfile.ZipFile(zipfilePath,'w',zipfile.ZIP_DEFLATED) as z:
 for f in root.rglob('*'):
  if f.is_file():z.write(f,f.relative_to(root))
with zipfile.ZipFile(zipfilePath) as z:assert z.testzip() is None
report=dict(staticPNG=len(list((root/'静图').rglob('*.png'))),totalTrimmedPNG=len(manifest),cabinetFrames=[12,12,8],doorFrames=[6,6],zipBytes=zipfilePath.stat().st_size,skipped=skips)
(D/'导出验证.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
(D/'进度.md').write_text('步骤4/5完成：全部PNG已回读，独立图片alpha包围框均等于全画布；三种柜子12/12/8帧和两种开门6/6帧的图集裁片与原裁图逐像素相等；ZIP testzip通过。交付位于交付/和便利店素材包.zip。未做游戏碰撞测试。','utf8')
print(json.dumps(report,ensure_ascii=False))

