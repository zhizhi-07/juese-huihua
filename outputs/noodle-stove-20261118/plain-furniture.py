from pathlib import Path
from PIL import Image
import urllib.request as U,json,base64,io,hashlib,copy
D=Path(__file__).parent;K=(47,59,61,255)
src=Image.open('C:/Users/cl/Desktop/绘画/.codex-attachments/13a6c444-e004-422f-a643-7ff0a4abb877/90ef42de-7696-454d-9ee0-665f80389f13/Screenshot_20261118_225636.jpg').convert('RGB')
table=Image.new('RGBA',(17,18))
for y in range(18):
 for x in range(17):
  c=None
  if y==0:c=K if x else None
  elif y<13:
   if x in (0,16):c=K
   else:
    X=29+(x+.5)*44.7;Y=57+(y+.5)*44.7
    # Complete the plain tabletop concealed by the bowl.
    if 11<=x<=15 and 5<=y<=9:X=29+(7+(x%2)+.5)*44.7
    c=src.getpixel((round(X),round(Y)))+(255,)
  elif y==13:c=K
  elif y<17 and x in (1,2,3,13,14,15):c=K if x in (1,3,13,15) else (139,101,93,255)
  elif y==17 and x in (2,14):c=K
  if c:table.putpixel((x,y),c)
chair=Image.new('RGBA',(6,15))
for y in range(15):
 for x in range(6):
  if y==0 or y==14 or x in (0,5):c=K
  elif y>=12:c=K if x in (2,3) else (145,109,98,255)
  else:c=src.getpixel((round(880+(x+.5)*44.7),round(195+(y+.5)*44.7)))+(255,)
  chair.putpixel((x,y),c)
# Keep the established preview placement and API verification, replacing only these two assets.
code=(D/'table-chair.py').read_text(encoding='utf8')
code=code[code.index("url='http://"):]
code=code.replace('before-table-chair','before-plain-furniture').replace('table-chair-readback','plain-furniture-readback').replace('table-chair-layout','plain-furniture-layout')
code=code.replace(" assert not any(s['name']==name for s in p['spriteSheets'])\n si=len(p['spriteSheets']);w,h=im.size;data=uri(im)"," si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']==name);w,h=im.size;data=uri(im)")
code=code.replace(" p['spriteSheets'].append(dict(name=name", " p['spriteSheets'][si]=dict(name=name")
code=code.replace("duration=0)])]))", "duration=0)])])")
code=code.replace(" p['layers'].append(dict(sheetIndex=si,parent=None,name=name,visible=True,locked=False,opacity=1,frameData={f'{si}_0_0':dict(width=w,height=h,dataURL=data)}))", " layer=next(l for l in p['layers'] if l['sheetIndex']==si and l['name']==name)\n layer['frameData']={f'{si}_0_0':dict(width=w,height=h,dataURL=data)}")
code=code.replace("if l['sheetIndex']!=layout:assert", "if l['sheetIndex']!=layout and l['name'] not in ('桌子','椅子'):assert")
code=code.replace("if i!=layout:assert", "if i!=layout and s['name'] not in ('桌子','椅子'):assert")
exec(compile(code,'plain-furniture-save','exec'))
