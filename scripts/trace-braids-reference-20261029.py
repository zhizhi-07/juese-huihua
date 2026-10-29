from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parent.parent
out = root / '发型素材/06-蓬松双麻花辫'
front = Image.open(out / '生成参考-正面三稿.png').convert('RGBA')
turn = Image.open(out / '用户指定-侧背面参考.png').convert('RGBA')
print('References:', front.size, turn.size)
palette = {'O': (119,119,119,255), 'S': (178,178,178,255), 'B': (209,209,209,255)}

def sample_hair(image, ox, oy, sx, sy):
    rows = []
    for y in range(32):
        row = ''
        for x in range(32):
            px, py = round(ox + (x+.5)*sx), round(oy + (y+.5)*sy)
            if not (0 <= px < image.width and 0 <= py < image.height):
                row += '.'
                continue
            r,g,b,a = image.getpixel((px,py))
            gray = max(r,g,b)-min(r,g,b) < 16 and 70 < r < 240 and a > 180
            row += ('O' if r < 144 else 'S' if r < 189 else 'B') if gray else '.'
        rows.append(row)
    return rows

hair = {
    '0': sample_hair(turn,128,190,24,21.5),
    '1': sample_hair(front,25.5,175,21.2,15.9),
    '2': sample_hair(turn,948,210,24,20.5),
}
for ai in [1,2]:
    hair[str(ai)] = [r[:16]+r[:16][::-1] for r in hair[str(ai)]]
# Remove the reference body's antialiased outline from the hair tracing.
side = [list(r) for r in hair['0']]
for y in range(17,21):
    for x in range(16,32): side[y][x]='.'
for y in range(19,32):
    shift=min(3,y-18)
    near=side[y][:16]
    side[y][:16]=['.']*16
    for x,c in enumerate(near):
        if c!='.' and x>=shift: side[y][x-shift]=c
hair['0']=[''.join(r) for r in side]
frontal=[list(r) for r in hair['1']]
for y in range(21,32):
    for x in range(9,23): frontal[y][x]='.'
for x in (15,16): frontal[12][x]='.'
hair['1']=[''.join(r) for r in frontal]
for ai, rows in hair.items():
    # The bow hides the crown in the reference; keep a complete cap underneath it.
    grid = [list(row) for row in rows]
    for y in range(8):
        xs = [x for x,c in enumerate(grid[y]) if c != '.']
        if xs:
            for x in range(min(xs),max(xs)+1):
                if grid[y][x] == '.': grid[y][x] = 'B'
    mask = [[c != '.' for c in row] for row in grid]
    for y in range(32):
        for x in range(32):
            if mask[y][x] and any(not (0<=x+dx<32 and 0<=y+dy<32 and mask[y+dy][x+dx]) for dx,dy in [(0,1),(0,-1),(1,0),(-1,0)]):
                grid[y][x] = 'O'
    hair[ai] = [''.join(row) for row in grid]

bow_palette = {'D':(157,113,134,255),'P':(240,180,205,255),'R':(216,141,175,255),'L':(248,212,226,255),'G':(166,190,118,255),'W':(255,240,242,255)}
def sample_bow(image,ox,oy,sx,sy):
    rows = [['.']*32 for _ in range(32)]
    for y in range(8):
        for x in range(5,28):
            r,g,b,a = image.getpixel((round(ox+(x+.5)*sx), round(oy+(y+.5)*sy)))
            if a<180: continue
            if r>g+12 and b>g+2:
                rows[y][x] = min('DPRL',key=lambda c:sum((v-w)**2 for v,w in zip((r,g,b),bow_palette[c][:3])))
            elif g>r*.99 and g>b+25 and g>80: rows[y][x]='G'
            elif 14<=x<=17 and 2<=y<=5 and min(r,g,b)>235: rows[y][x]='W'
    return [''.join(row) for row in rows]
bows = {'0':sample_bow(turn,128,48,24,33),'1':sample_bow(front,-25.5,63,24.4,24),'2':sample_bow(turn,904,80,26,28.5)}
for ai in [1,2]: bows[str(ai)]=[r[:16]+r[:16][::-1] for r in bows[str(ai)]]
for ai,rows in hair.items():
    im = Image.new('RGBA',(32,32))
    for y,row in enumerate(rows):
        for x,c in enumerate(row):
            if c in palette: im.putpixel((x,y),palette[c])
    im.save(out / f'trace-{ai}.png')
    im.resize((256,256),Image.Resampling.NEAREST).save(out / f'trace-large-{ai}.png')
(out / 'reference-trace.json').write_text(json.dumps({'hair':hair,'bows':bows}),encoding='utf-8')
assert all(len(rows)==32 and all(len(row)==32 for row in rows) for rows in hair.values())
