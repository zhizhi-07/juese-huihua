from pathlib import Path
import base64,copy,io,json
from PIL import Image
D=Path(__file__).parent
project=json.loads((D/'reference.json').read_bytes())
n=len(project['spriteSheets'])
P={'k':'464b4f','z':'5c6163','s':'7b7d77','m':'99bab5','g':'8ac1ab','l':'bed4c8','b':'6e5f4d','B':'57483b','n':'9c756a','h':'ebf0ee','c':'ded0bf','d':'c9adab','o':'a3987a','t':'607171','r':'cc6764','R':'9e755f','p':'e38674','w':'fee6b4'}
def grid(im,x,y,rows):
 for j,row in enumerate(rows.split()):
  for i,key in enumerate(row):
   if key!='.':im.putpixel((x+i,y+j),tuple(bytes.fromhex(P[key]))+(255,))
def blank():return Image.new('RGBA',(24,24))
body,head,cup=blank(),blank(),blank()
# Low beveled appliance, inset dispensing well and a drip grate.
grid(body,3,6,'''
 ..kkkkkkkkkkkkk..
 .khhhhhhhhhhhhck.
 kchhhhhhhhhhhccdk
 kccccccccccccccdk
 kccccccccccccccdk
 kdccccccccccccddk
 kkzzzzzzzzzzzzzzk
 kdtzzzzzzzzzztsdk
 kctzzzzzzzzzztsdk
 kctzzzzzzzzzztsdk
 kctzzzzzzzzzztsdk
 kctzzzzzzzzzztsdk
 kdtsstttttttttsdk
 kchmhmhmhmhmhmmdk
 ksooooooooooooosk
 .kkkkkkkkkkkkkkk.
''')
# Smoked hopper glass with a warm bean bed, controls and metal brew group.
grid(head,6,1,'''
 .kkkkkkkk.
 khllllllmk
 .mllmmbbm.
 .mnbbnBbm.
 ..kbbbbk..
 ..zzzzzz..
''')
grid(head,6,8,'''kkkkkk kgggmk kkkkkk''')
grid(head,15,9,'''rp''')
grid(head,9,12,'''ksssk .kzk. ..k..''')
# A takeaway cup: pale rolled rim, terracotta sleeve and narrower foot.
grid(cup,8,15,'''
 hhcccd
 .wwcd.
 .prrd.
 .prrd.
 ..wc..
''')
def uri(im):
 f=io.BytesIO();im.save(f,'PNG');return 'data:image/png;base64,'+base64.b64encode(f.getvalue()).decode()
merged=blank()
for name,img in [('机身与接水盘',body),('豆仓、按键与出液口',head),('外带咖啡杯',cup)]:
 merged.alpha_composite(img)
 project['layers'].append(dict(sheetIndex=n,parent=None,name=name,visible=True,locked=False,opacity=1,frameData={f'{n}_0_0':dict(width=24,height=24,dataURL=uri(img))}))
sheet=copy.deepcopy(project['spriteSheets'][3]); sheet.update(name='自助咖啡机 24×24',imageDataURL=uri(merged)); frame=sheet['actions'][0]['frames'][0]; frame.update(sheetIndex=n,notes='台式现磨咖啡机；透明豆仓、薄荷色显示屏、珊瑚色杯套。'); project['spriteSheets'].append(sheet)
merged.save(D/'coffee.png');merged.resize((240,240),Image.Resampling.NEAREST).save(D/'preview.png')
(D/'candidate.json').write_text(json.dumps(project,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

