from pathlib import Path
from PIL import Image, ImageDraw
import io,base64,json,copy
D=Path(__file__).parent
p=json.loads((D/'reference.json').read_bytes())
s=copy.deepcopy(p['spriteSheets'][1]); a=s['actions'][0]; f=a['frames'][0]
n=len(p['spriteSheets']); W=H=24
def layer(): return Image.new('RGBA',(W,H))
body,food,trim=[layer() for _ in range(3)]
def box(layer,xy,color): ImageDraw.Draw(layer).rectangle(xy,fill='#'+color)
def row(l,x,y,colors,pal):
 for i,v in enumerate(colors):
  if v!='.': l.putpixel((x+i,y),tuple(bytes.fromhex(pal[v]))+(255,))
edge='464b4f'; green='8ac1ab'; sage='bed4c8'; pale='ebf0ee'; dark='647e78'
# A low enamel crown and a deeper base around the glazed, two-tray chamber.
b=lambda xy,c:box(body,xy,c)
b((4,3,19,21),edge);b((3,4,20,20),edge)
b((5,3,18,3),'e8a68e');b((4,4,19,5),'cc6764');b((5,4,17,4),'e38674')
b((4,6,19,6),'80575b');b((4,7,19,16),green);b((5,7,18,16),sage)
b((5,7,18,7),'99bab5');b((5,12,18,12),'839ea6');b((5,11,18,11),pale)
b((5,16,18,16),pale);b((4,17,19,17),dark)
b((4,18,19,20),'cc6764');b((5,18,18,18),'e38674');b((5,20,18,20),'b04a58')
b((5,21,7,21),edge);b((16,21,18,21),edge)
# Pleated buns with a warm underside; the backlight reads between the trays.
pal=dict(t='d1ae8a',c='fee6b4',h='fff3d5',s='e0ac6c',v='e8cd97')
for x,y,shape in [(5,8,['..ct..','.hchc.','vccvct']),(12,8,['..cc..','.hchv.','vccvct']),(6,13,['..cc..','.hchc.','vccvct']),(12,13,['..ct..','.hcvc.','vcccvt'])]:
 for j,r in enumerate(shape):row(food,x,y+j,r,pal)
t=lambda xy,c:box(trim,xy,c)
t((4,7,4,15),'68a88e');t((4,7,4,9),'abdBB8')
t((19,8,19,16),'68a88e');t((19,10,19,13),edge);t((19,10,19,11),'7b7d77')
t((6,19,9,19),'80575b');t((6,19,6,19),'ffe6b4')
t((16,19,17,19),'57483b');t((16,19,16,19),'e8cd97')
def png(im):
 out=io.BytesIO();im.save(out,format='PNG');return 'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()
merged=layer()
for name,im in [('搪瓷柜体与玻璃','body'),('两层包子','food'),('门把手与温控面板','trim')]:
 im={'body':body,'food':food,'trim':trim}[im]; merged.alpha_composite(im)
 p['layers'].append(dict(sheetIndex=n,parent=None,name=name,visible=True,locked=False,opacity=1,frameData={f'{n}_0_0':dict(width=W,height=H,dataURL=png(im))}))
s.update(name='包子蒸柜 24×24',frameWidth=W,frameHeight=H,imageDataURL=png(merged)); f.update(sheetIndex=n,width=W,height=H,notes='台式包子蒸柜；珊瑚色搪瓷、薄荷绿玻璃、双层蒸屉。');p['spriteSheets'].append(s)
merged.save(D/'steamer.png');merged.resize((240,240),Image.Resampling.NEAREST).save(D/'preview.png')
(D/'candidate.json').write_text(json.dumps(p,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
