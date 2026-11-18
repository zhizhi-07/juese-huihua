from pathlib import Path
import json,io,base64,hashlib,urllib.request
from PIL import Image
d=Path(__file__).parent
load=lambda f:json.loads((d/f).read_bytes())
old,candidate,base=map(load,['reference.json','candidate.json','current.json'])
assert len(base['spriteSheets'])==len(old['spriteSheets'])==3
assert candidate['spriteSheets'][:-1]==old['spriteSheets'] and candidate['layers'][:-3]==old['layers']
project={**base,'spriteSheets':base['spriteSheets']+candidate['spriteSheets'][-1:],'layers':base['layers']+candidate['layers'][-3:]}
data=json.dumps(project,ensure_ascii=False,separators=(',',':')).encode()
(d/'merged.json').write_bytes(data)
url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
etag=(d/'current.etag').read_text().strip()
assert hashlib.sha256((d/'current.json').read_bytes()).hexdigest()==etag.strip('"')
req=urllib.request.Request(url,data,{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with urllib.request.urlopen(req) as r: print('PUT',r.status)
with urllib.request.urlopen(url) as r: (d/'readback.json').write_bytes(r.read())
saved=load('readback.json');assert saved==project
def decode(u):return Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
im=Image.new('RGBA',(24,24))
for l in saved['layers'][-3:]:im.alpha_composite(decode(l['frameData']['3_0_0']['dataURL']))
assert im.tobytes()==decode(saved['spriteSheets'][-1]['imageDataURL']).tobytes()==Image.open(d/'steamer.png').tobytes()
print('Verified saved layers, frames, timing, dimensions and pixels; unrelated concurrent changes preserved.')
