from PIL import Image
from pathlib import Path
from io import BytesIO
import urllib.request as u,json,copy,base64,hashlib
D=Path(__file__).parent;url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
with u.urlopen(url) as r:raw=r.read();tag=r.headers['ETag']
assert not (D/'保存前.json').exists();(D/'保存前.json').write_bytes(raw);(D/'原版校验.json').write_text(json.dumps(dict(etag=tag,sha256=hashlib.sha256(raw).hexdigest())))
old=json.loads(raw);p=copy.deepcopy(old);si,=[i for i,s in enumerate(p['spriteSheets']) if s['name']=='便利店 · 三张海报'];key=f'{si}_0_0';size=(32,16);s=p['spriteSheets'][si];assert s['frameWidth']==56 and s['frameHeight']==32
def enc(im):
 b=BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def dec(uri):return Image.open(BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
s.update(frameWidth=32,frameHeight=16,imageDataURL=enc(Image.new('RGBA',size)));frame=s['actions'][0]['frames'][0];assert frame['sourceX']==frame['sourceY']==0;frame.update(width=32,height=16)
layers=[l for l in p['layers'] if l['sheetIndex']==si];assert [l['name'] for l in layers]==['饮品海报','风景海报','日历海报'];combined=Image.new('RGBA',size);sizes={}
house=Image.open(r'C:/Users/Administrator/Desktop/Hana Caraka - TopdownTileset/Hana Caraka - Topdown Tileset/House/House.png').convert('RGBA').crop((0,16,64,80))
for l,x in zip(layers,(14,26,38)):
 assert not l['locked'] and l['visible'] and l['opacity']==1 and set(l['frameData'])=={key}
 n=l['name'];im=Image.open(D/'out'/'scenes'/'三张小海报'/f'{n}.png').convert('RGBA');assert im.size==size
 l['frameData'][key].update(width=32,height=16,dataURL=enc(im));combined.alpha_composite(im);cropped=im.crop(im.getbbox());sizes[n]=cropped.size;house.alpha_composite(cropped,(x,44))
combined.save(D/'三张小海报.png');combined.resize((384,192),Image.Resampling.NEAREST).save(D/'三张小海报-12倍.png');house.resize((384,384),Image.Resampling.NEAREST).save(D/'标准房试贴.png')
payload=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(D/'候选稿.json').write_bytes(payload)
with u.urlopen(u.Request(url,method='PUT',data=payload,headers={'If-Match':tag,'X-Pixel-Editor':'1','Content-Type':'application/json'})) as r:status=r.status
with u.urlopen(url) as r:b=r.read();tag2=r.headers['ETag']
q=json.loads(b);assert q==p
test=Image.new('RGBA',size)
for l in q['layers']:
 if l['sheetIndex']==si:test.alpha_composite(dec(l['frameData'][key]['dataURL']))
assert combined.tobytes()==test.tobytes()
q['spriteSheets'][si]=old['spriteSheets'][si]
for i,l in enumerate(q['layers']):
 if l['sheetIndex']==si:q['layers'][i]=old['layers'][i]
assert q==old
report=dict(status=status,etag=tag2,sha256=hashlib.sha256(b).hexdigest(),sizes=sizes,canvas=size,otherArtUnchanged=True);(D/'验证.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8');print(report)
