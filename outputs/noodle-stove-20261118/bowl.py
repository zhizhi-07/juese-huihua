from pathlib import Path
from PIL import Image
import urllib.request as U, json, base64, io, hashlib, copy
D=Path(__file__).parent
src=Image.open('C:/Users/cl/Desktop/绘画/.codex-attachments/fecc99ca-de0a-407a-aea0-e99222db52ef/e12f417f-204f-4d55-9ab6-7182dd6b3d4c/Screenshot_20261118_223530.jpg').convert('RGB')
outline=(47,59,61,255)
shape=['..kkkk..','.kssssk.','kssssssk','kssssssk','kssssssk','.kssssk.','..kkkk..']
reference=Image.new('RGBA',(8,7))
for y,row in enumerate(shape):
    for x,c in enumerate(row):
        if c=='.':continue
        rgb=src.getpixel((round(210+(x+.5)*104),round(215+(y+.5)*104)))
        reference.putpixel((x,y),outline if c=='k' else rgb+(255,))
food_area=[(x,y) for y,start,end in [(1,2,5),(2,1,6),(3,2,5)] for x in range(start,end+1)]
bowl=reference.copy()
for x,y in food_area:
    bowl.putpixel((x,y),[(145,159,164,255),(178,191,188,255),(205,214,203,255)][y-1])
foods=[]
for flavor in range(4):
    food=Image.new('RGBA',(8,7))
    for x,y in food_area:
        food.putpixel((x,y),reference.getpixel((x,y)))
    if flavor:
        palettes=[None,[(184,76,49,255),(226,131,65,255)],[(125,81,49,255),(178,126,73,255)],[(184,164,109,255),(219,203,147,255)]]
        for x,y in food_area:food.putpixel((x,y),palettes[flavor][(x+y)%2])
        for x,y in [(3,1),(5,2)]:food.putpixel((x,y),(233,211,135,255))
        for x,y in [(4,2),(5,3)]:food.putpixel((x,y),(112,144,72,255))
        if flavor==1:
            food.putpixel((2,3),(221,89,51,255));food.putpixel((3,3),(246,136,71,255))
        elif flavor==2:
            food.putpixel((2,2),(105,63,43,255));food.putpixel((3,3),(151,96,61,255));food.putpixel((4,1),(146,89,58,255))
        else:
            food.putpixel((2,2),(118,94,72,255));food.putpixel((3,2),(233,218,179,255));food.putpixel((4,3),(120,96,73,255))
    foods.append(food)

url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'
with U.urlopen(url) as r:raw=r.read();etag=r.headers['ETag']
p=json.loads(raw);before=copy.deepcopy(p)
(D/'before-bowl.json').write_bytes(raw);(D/'before-bowl.etag').write_text(etag);(D/'before-bowl.sha256').write_text(hashlib.sha256(raw).hexdigest())
assert not any(s['name']=='碗' for s in p['spriteSheets'])
def uri(im):
    b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
si=len(p['spriteSheets']);names=['空碗','原汤','番茄汤','牛肉汤','菌菇汤'];actions=[]
layers=[dict(sheetIndex=si,parent=None,name=n,visible=True,locked=False,opacity=1,frameData={}) for n in ['完整空碗','汤底与食物']]
atlas=Image.new('RGBA',(8,35));contact=Image.new('RGBA',(40,7))
for ai,name in enumerate(names):
    food=Image.new('RGBA',(8,7)) if ai==0 else foods[ai-1]
    key=f'{si}_{ai}_0'
    for layer,im in zip(layers,[bowl,food]):layer['frameData'][key]=dict(width=8,height=7,dataURL=uri(im))
    combined=bowl.copy();combined.alpha_composite(food);atlas.alpha_composite(combined,(0,ai*7));contact.alpha_composite(combined,(ai*8,0))
    for x,y in food_area:assert bowl.getpixel((x,y))[3]==255
    actions.append(dict(name=name,direction='',frames=[dict(sheetIndex=si,sourceX=0,sourceY=ai*7,width=8,height=7,locked=False,lockedRegions=[],status='completed',duration=0,notes='参考碗形；完整空碗与可替换汤底食物分层。')]))
p['spriteSheets'].append(dict(name='碗',frameWidth=8,frameHeight=7,columns=1,rows=5,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=uri(atlas),actions=actions))
p['currentSheetIndex']=si;p['currentActionIndex']=0;p['currentFrameIndex']=0;p['currentLayerIndex']=len(p['layers']);p['layers']+=layers
assert p['spriteSheets'][:si]==before['spriteSheets'];assert p['layers'][:len(before['layers'])]==before['layers']
contact.resize((960,168),Image.Resampling.NEAREST).save(D/'bowl-variants-preview.png');bowl.save(D/'empty-bowl.png')
req=U.Request(url,json.dumps(p,ensure_ascii=False).encode(),{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},method='PUT')
with U.urlopen(req) as r:assert json.load(r)['saved']
with U.urlopen(url) as r:back=json.load(r)
assert back==p
(D/'bowl-readback.json').write_text(json.dumps(back,ensure_ascii=False),encoding='utf8')
print('Verified bowl scene: 8x7, complete empty bowl, separate food, four soup variants; existing scenes unchanged.')
