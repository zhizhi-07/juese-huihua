from pathlib import Path
import urllib.request as U,json,copy,hashlib
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p);original=json.loads((D/'before-lantern-palette.json').read_bytes());trial=json.loads((D/'lantern-palette-readback.json').read_text(encoding='utf8'))
si=next(i for i,s in enumerate(p['spriteSheets']) if s['name']=='灯笼')
(D/'before-restore-lantern.json').write_bytes(raw);(D/'before-restore-lantern.etag').write_text(etag);(D/'before-restore-lantern.sha256').write_text(hashlib.sha256(raw).hexdigest())
assert p['spriteSheets'][si]==trial['spriteSheets'][si],'Lantern has newer user edits; stop'
p['spriteSheets'][si]=copy.deepcopy(original['spriteSheets'][si])
for i,l in enumerate(p['layers']):
 if l['sheetIndex']==si:
  assert l==trial['layers'][i],'Lantern layer has newer user edits; stop'
  p['layers'][i]=copy.deepcopy(original['layers'][i])
assert p.get('sceneAssembly')==before.get('sceneAssembly')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:assert json.load(r)==p
print('Verified original lantern restored exactly; unrelated materials and placements unchanged.')
