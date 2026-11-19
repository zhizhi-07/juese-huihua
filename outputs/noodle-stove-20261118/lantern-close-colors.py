from pathlib import Path
from PIL import Image
D=Path(__file__).parent
original=Image.open(D/'lantern-before.png').convert('RGBA')
# Keep the original light/dark regions: red side panels and a warm orange glow.
P={'k':'2f3b3d','r':'b04a58','s':'8f3648','d':'80575b','o':'bd6f42','O':'d48d57','h':'e0ac6c'}
rows=['...k...','..kkk..','.kkkkk.','krkkkrk','krooor k'.replace(' ',''),'ksoOOrk','ksOhOrk','ksoOodk','.krrdk.','..kkk..']
assert len(rows)==original.height and all(len(row)==original.width for row in rows)
mapping={}
for y,row in enumerate(rows):
 for x,c in enumerate(row):
  pixel=original.getpixel((x,y))
  assert (c!='.')==(pixel[3]>0)
  if c!='.':mapping[pixel[:3]]=tuple(bytes.fromhex(P[c]))
source=(D/'lantern-otterisk.py').read_text(encoding='utf8')
# Use the existing ETag save, unchanged-pixel checks, palette validation, and comparison export.
start=source.index('def nearest(');end=source.index('def dec(')
source=source[:start]+"def nearest(rgb):\n return mapping[rgb]\n\n"+source[end:]
source=source.replace('labs=[lab(c) for c in palette];mapping={}','labs=[lab(c) for c in palette]')
source=source.replace('before-lantern-palette','before-lantern-close-colors').replace('lantern-palette-readback','lantern-close-colors-readback').replace('lantern-palette-report','lantern-close-colors-report').replace('lantern-palette-comparison','lantern-close-colors-comparison')
source=source.replace("(D/'before-lantern-close-colors.json').write_bytes(raw)","assert all(l['frameData']['3_0_0']['dataURL']==json.loads((D/'before-lantern-palette.json').read_bytes())['layers'][i]['frameData']['3_0_0']['dataURL'] for i,l in enumerate(p['layers']) if l['sheetIndex']==3)\n(D/'before-lantern-close-colors.json').write_bytes(raw)")
exec(compile(source,'lantern-close-colors-save','exec'))
