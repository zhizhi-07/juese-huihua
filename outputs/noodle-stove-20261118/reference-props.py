from pathlib import Path
from PIL import Image
import urllib.request as U, json, io, base64, hashlib, copy
D=Path(__file__).parent
ROOT=Path('C:/Users/cl/Desktop/绘画/.codex-attachments')
def sampled(path,origin,pitch,rows):
    src=Image.open(path).convert('RGB'); out=Image.new('RGBA',(len(rows[0]),len(rows)))
    for y,row in enumerate(rows):
        for x,c in enumerate(row):
            if c=='.':continue
            rgb=src.getpixel((round(origin[0]+(x+.5)*pitch),round(origin[1]+(y+.5)*pitch)))
            if c=='k' or max(rgb)<110:rgb=(47,59,61)
            out.putpixel((x,y),rgb+(255,))
    return out
folder=ROOT/'7a17b82b-e5b9-4def-849c-7667bd8a45c7'
flag=sampled(folder/'6d321667-34a3-4389-a665-75a2f65151bc/Screenshot_20261118_222423.jpg',(9,0),63,[
'......k......','......k......','...k.....k...','...k.....k...',
'kkkkkkkkkkkkk','ksssssssssssk','.ksssssssssk.','.ksssssssssk.',
'.ksssssssssk.','.ksssssssssk.','.ksssssssssk.','.ksssssssssk.',
'.ksssssssssk.','.ksssssssssk.','.ksksssksssk.','.kk.kkkk.kk..'])
lantern=sampled(folder/'9456adc7-b7c0-4b55-872a-f198bebae619/Screenshot_20261118_222412.jpg',(275,40),109,[
'...k...','..kkk..','.kkkkk.','ksssssk','ksssssk','ksssssk','ksssssk','ksssssk','.ksssk.','..kkk..'])
cat=sampled(ROOT/'63be811a-9283-4fa8-9090-e6522efcb3cc/b5e0066c-e6e8-4278-9697-e1e140b1cae5/Screenshot_20261118_222125.jpg',(200,250),75,[
'.s...s..','.sssss..','.sssss..','.ssssss.','..sssss.','.ssssss.','.sssss..','.sssss..','.sssss..'])
# Complete the cat's exposed border without inventing new interior shapes.
filled=Image.new('RGBA',(cat.width+2,cat.height+2));filled.alpha_composite(cat,(1,1));edge=Image.new('RGBA',filled.size)
for y in range(filled.height):
    for x in range(filled.width):
        if filled.getpixel((x,y))[3]:continue
        if any(0<=X<filled.width and 0<=Y<filled.height and filled.getpixel((X,Y))[3] for X,Y in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]):edge.putpixel((x,y),(47,59,61,255))
edge.alpha_composite(filled);cat=edge.crop(edge.getbbox())
url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r: raw=r.read();etag=r.headers['ETag']
(D/'before-reference-props.json').write_bytes(raw);(D/'before-reference-props.etag').write_text(etag);(D/'before-reference-props.sha256').write_text(hashlib.sha256(raw).hexdigest())
p=json.loads(raw);before=copy.deepcopy(p)
def uri(im):
    b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
for name,im in [('招财猫',cat),('灯笼',lantern),('小旗帜',flag)]:
    si=next((i for i,s in enumerate(p['spriteSheets']) if s['name']==name),len(p['spriteSheets']))
    w,h=im.size;data=uri(im)
    sheet=dict(name=name,frameWidth=w,frameHeight=h,columns=1,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=data,actions=[dict(name=name,direction='',frames=[dict(sheetIndex=si,sourceX=0,sourceY=0,width=w,height=h,locked=False,lockedRegions=[],status='completed',duration=0)])])
    if si==len(p['spriteSheets']):p['spriteSheets'].append(sheet)
    else:p['spriteSheets'][si]=sheet
    p['layers']=[l for l in p['layers'] if l['sheetIndex']!=si]
    p['layers'].append(dict(sheetIndex=si,parent=None,name=name,visible=True,locked=False,opacity=1,frameData={f'{si}_0_0':dict(width=w,height=h,dataURL=data)}))
    im.save(D/(name+'-reference.png'));im.resize((w*28,h*28),Image.Resampling.NEAREST).save(D/(name+'-reference-preview.png'))
p['currentSheetIndex']=len(p['spriteSheets'])-1;p['currentActionIndex']=0;p['currentFrameIndex']=0;p['currentLayerIndex']=len(p['layers'])-1
assert p['spriteSheets'][:2]==before['spriteSheets'][:2]
assert [l for l in p['layers'] if l['sheetIndex']<2]==[l for l in before['layers'] if l['sheetIndex']<2]
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'reference-props-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified direct reference sampling: cat corrected; lantern and flag added; stove and pot unchanged.')
