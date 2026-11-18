from pathlib import Path
from PIL import Image
import urllib.request as u,json,base64,io,hashlib
d=Path(__file__).parent
raw=(d/'reference.json').read_bytes(); etag=(d/'reference.etag').read_text().strip()
assert hashlib.sha256(raw).hexdigest()==etag.strip('"')
before=json.loads(raw); candidate=(d/'candidate.json').read_bytes(); after=json.loads(candidate)
assert {**after,'spriteSheets':after['spriteSheets'][:-1],'layers':after['layers'][:-3]}==before
s=after['spriteSheets'][-1]; assert len(s['actions'])==len(s['actions'][0]['frames'])==1 and s['actions'][0]['frames'][0]['sheetIndex']==4
def dec(x):return Image.open(io.BytesIO(base64.b64decode(x.split(',')[1]))).convert('RGBA')
m=Image.new('RGBA',(24,24))
for l in after['layers'][-3:]:m.alpha_composite(dec(l['frameData']['4_0_0']['dataURL']))
assert m.tobytes()==dec(s['imageDataURL']).tobytes()==Image.open(d/'coffee.png').tobytes()
url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
with u.urlopen(u.Request(url,candidate,{'If-Match':etag,'X-Pixel-Editor':'1','Content-Type':'application/json'},method='PUT')) as r: print('PUT',r.status)
with u.urlopen(url) as r: verified=r.read()
(d/'readback.json').write_bytes(verified)
assert json.loads(verified)==after
print('OK: original content unchanged; 24x24, three layers, one frame; readback matches')
