import io,base64,json,hashlib,sys
from pathlib import Path
from urllib.request import urlopen,Request
from PIL import Image,ImageDraw
D=Path(__file__).resolve().parent;url='http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116'
def read():
 with urlopen(url) as res:return res.read(),res.headers['ETag']
def sha(b):return hashlib.sha256(b).hexdigest()
def write(n,data):(D/n).write_text(json.dumps(data,ensure_ascii=False,indent=2),'utf8')
def encode(im):
 b=io.BytesIO();im.save(b,'PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def decode(s):return Image.open(io.BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGBA')
if sys.argv[1]=='draw':
 assert not (D/'保存前.json').exists()
 raw,tag=read();(D/'保存前.json').write_bytes(raw);write('原版校验.json',dict(sha256=sha(raw),etag=tag))
raw=(D/'保存前.json').read_bytes();meta=json.loads((D/'原版校验.json').read_text('utf8'));assert sha(raw)==meta['sha256'];p=json.loads(raw);size=(104,84);parts=[]
def layer(n):
 global im,pen
 im=Image.new('RGBA',size);pen=ImageDraw.Draw(im);parts.append((n,im))
def X(x):return round((x-110)/4.6)
def Y(y):return round((y-14)/4.6)
def r(x,y,X2,Y2,col):
 box=(X(x),Y(y),X(X2),Y(Y2))
 pen.rectangle(box,fill='#'+col)
def poly(points,col):pen.polygon([(X(x),Y(y)) for x,y in points],fill='#'+col)
ink='2f3b3d';coal='464b4f';wine='80575b';wood='9e7565';fawn='ba9273';sand='bdb395';ivory='d6d0b0';white='ebf0ee';cream='e8cd97';green='6d8740';red='b04a58';coral='cc6764';deepteal='336c7a';teal='438c91';steel='839ea6';chalk='d4d0cd'
layer('店体 · 奶油墙与基脚')
r(143,218,550,357,ink);r(148,227,546,352,wine);r(164,232,529,345,sand);r(171,241,526,342,ivory);r(164,347,531,352,'999991')
layer('店体 · 两侧边柱')
for a,b in ((144,164),(530,550)):
 r(a,229,b,353,ink);r(a+5,233,b-5,350,wine);r(a+5,242,a+5,345,wood)
layer('屋顶 · 木框与檐口')
r(136,36,558,171,ink);r(140,37,554,164,wood);r(145,39,550,45,fawn);r(149,48,548,140,ink);r(149,52,545,57,'785a55')
r(140,141,554,149,fawn);r(140,151,554,166,wine);r(140,168,554,171,ink)
layer('屋顶 · 青蓝拼接板')
r(153,60,543,135,deepteal)
for x0,x1,y in [(154,164,110),(169,186,85),(192,208,109),(215,231,0),(238,255,131),(262,278,110),(285,301,86),(308,324,0),(332,348,85),(354,370,0),(377,394,96),(401,417,85),(425,441,127),(447,464,95),(470,487,0),(494,510,87),(518,533,108),(539,544,0)]:
 r(x0,61,x1,134,teal)
 if y:r(x0,y,x1,y,deepteal)
for x in (165,189,212,235,258,281,305,328,351,374,398,422,445,468,491,515,537):r(x,61,x,134,deepteal)
layer('檐招 · 绿橙红条带')
r(135,172,560,230,ink);r(140,176,555,225,white);r(140,176,555,180,'b5b2ac');r(140,186,555,194,'d48d57');r(140,200,555,212,green);r(140,219,555,226,red)
r(141,181,554,181,white);r(141,196,554,196,white);r(141,216,554,216,white)
layer('招牌 · 24h MART')
r(242,181,440,227,'999991');r(247,182,436,222,'ebf0ee');r(247,223,436,226,chalk)
glyph={'2':['1111','0001','0011','0110','1100','1111'],'4':['1001','1001','1001','1111','0001','0001'],'h':['1000','1000','1110','1001','1001','1001'],'M':['10001','11011','10101','10001','10001','10001'],'A':['0110','1001','1001','1111','1001','1001'],'R':['1110','1001','1110','1010','1001','1001'],'T':['11111','00100','00100','00100','00100','00100']}
x=X(255)
for ch in '24h MART':
 if ch==' ':x+=2;continue
 rows=glyph[ch]
 for yy,row in enumerate(rows):
  for xx,v in enumerate(row):
   if v=='1':pen.point((x+xx,Y(191)+yy),fill='#'+(red if ch in '24h' else green))
 x+=len(rows[0])+1
layer('入口 · 双开门框')
r(201,242,334,356,ink);r(206,247,329,351,'7b7d77');r(209,349,326,352,chalk)
layer('入口 · 玻璃与反光')
for a,b in ((214,261),(275,322)):
 r(a,251,b,344,cream)
 poly([(a,315),(b-8,275),(b,275),(b,284),(a,326)],white)
 poly([(a+22,344),(b,321),(b,335),(a+40,344)],'ebf0ee')
 r(a,344,b,345,chalk)
layer('入口 · 门顶短帘')
for j,x in enumerate((213,230,247,274,291,308)):
 r(x,247,x+12,253,'566178' if j%2==0 else wine);r(x,254,x+12,272,'346c70' if j%2==0 else '99bab5')
 if j%2==0:r(x,274,x+11,276,'464b4f')
layer('入口 · 中缝与拉手')
r(264,248,271,351,coal);r(266,249,270,349,steel)
for x in (253,276):r(x,299,x+4,314,'999991')
layer('橱窗 · 深色窗框与玻璃')
r(349,243,487,329,ink);r(354,248,482,324,cream);r(354,249,482,254,'e6dfa1')
layer('橱窗 · 室内货架')
for x,y,w in ((378,262,4),(386,267,5),(395,261,5),(405,262,5),(425,262,10),(439,274,12),(457,269,12),(474,262,5)):
 r(x,y,x+w,279,'ba9273')
r(377,280,480,284,'9e7565');r(378,285,382,309,'ba9273')
for x,y,w in ((391,294,10),(403,289,9),(429,290,11),(445,294,8),(464,290,10)):
 r(x,y,x+w,308,'ba9273')
r(357,311,481,317,'ba9273');r(359,290,384,308,'ebf0ee');r(360,295,380,306,'b5b2ac');r(360,310,373,315,'999991')
layer('橱窗 · 中梃与窗台');r(416,248,422,325,'785a55');r(353,321,482,324,'b5b2ac')
layer('左侧 · 扭蛋机')
r(148,305,184,379,ink);r(153,310,180,317,red);r(151,320,184,349,'566178');r(154,323,180,344,'99bab5')
for x,y,c in [(155,326,'8cbade'),(167,326,'e0ac6c'),(173,332,'709fcf'),(158,336,'cc6764'),(164,339,'68a88e')]:r(x,y,x+5,y+4,c)
r(151,351,184,378,wine);r(157,356,178,373,red);r(160,356,174,366,'b5b2ac');r(149,377,186,379,ink)
layer('右侧 · 红色售货机')
r(484,266,550,379,ink);r(489,271,545,375,red);r(490,272,545,287,'cc6764');r(492,293,530,349,'566178');r(496,297,525,345,'709fcf')
for y in (300,318,335):
 for j,x in enumerate((497,507,517)):r(x,y,x+4,y+6,('8cbade','add6e0','bed4c8')[j])
 r(494,y+9,526,y+10,'336c7a')
r(533,306,545,344,wine);r(535,311,543,316,'add6e0');r(535,325,540,330,ink);r(492,358,531,371,ink);r(496,362,527,367,'566178');r(535,358,543,366,wine)
layer('门旁 · 小立架')
r(439,352,469,380,ink);r(444,337,465,357,'6e5f4d');r(447,338,462,351,'e0ac6c');r(451,343,457,346,'9e7565');r(443,360,466,374,'8a7b63');r(441,376,467,380,coal)
merged=Image.new('RGBA',size)
for n,l in parts: assert l.getbbox();merged.alpha_composite(l)
palette={tuple(v[c] for c in 'rgb') for v in p['palette']}
for n,l in parts:assert all(px[:3] in palette for count,px in l.getcolors(1000) if px[3]),n
merged.save(D/'24h-MART.png');merged.resize((520,420),Image.Resampling.NEAREST).save(D/'24h-MART-5倍.png')
if sys.argv[1]=='save':
 old=json.loads(raw);i=len(p['spriteSheets']);key=f'{i}_0_0';name='24h MART · 参考重画';assert not any(s['name']==name for s in p['spriteSheets'])
 f=dict(sheetIndex=i,sourceX=0,sourceY=0,width=size[0],height=size[1],locked=False,lockedRegions=[],status='completed',duration=0,notes='按参考图的店面比例逐件重画，人物遮挡处按相邻结构补全。')
 p['spriteSheets'].append(dict(name=name,frameWidth=size[0],frameHeight=size[1],columns=1,rows=1,spacingX=0,spacingY=0,offsetX=0,offsetY=0,fps=8,imageDataURL=encode(Image.new('RGBA',size)),actions=[dict(name='店面外观',direction='none',frames=[f])]))
 for n,l in parts:p['layers'].append(dict(sheetIndex=i,parent=None,name=n,visible=True,locked=False,opacity=1,frameData={key:dict(width=size[0],height=size[1],dataURL=encode(l))}))
 p.update(currentSheetIndex=i,currentActionIndex=0,currentFrameIndex=0,currentLayerIndex=len(old['layers']))
 data=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode();(D/'候选稿.json').write_bytes(data)
 with urlopen(Request(url,data=data,method='PUT',headers={'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta['etag']})) as res:status=res.status
 b,t=read();q=json.loads(b);assert q==p and q['spriteSheets'][:i]==old['spriteSheets'] and q['layers'][:len(old['layers'])]==old['layers'];test=Image.new('RGBA',size)
 for l in q['layers'][len(old['layers']):]:test.alpha_composite(decode(l['frameData'][key]['dataURL']))
 assert test.tobytes()==merged.tobytes()
 write('验证.json',dict(status=status,etag=t,sha256=sha(b),sheet=i+1,layers=len(parts),size=size,oldArtworkUnchanged=True,pixelsMatch=True));print(i+1,len(parts))

