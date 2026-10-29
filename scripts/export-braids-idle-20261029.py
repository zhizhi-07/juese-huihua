from pathlib import Path
from PIL import Image, ImageSequence, ImageDraw, ImageFont
import json

root = Path(__file__).resolve().parent.parent
source = root / '发型素材/06-蓬松双麻花辫'
out = root / '导出/蓬松双麻花辫-待机'
out.mkdir(parents=True,exist_ok=True)
project = json.loads((source / '分层工程.json').read_text(encoding='utf-8'))
durations = [f['duration'] for f in project['spriteSheets'][8]['actions'][1]['frames']]

for name,directions in [('三方向待机',[1,0,2]),('正面待机',[1]),('侧面待机',[0]),('背面待机',[2])]:
    frames=[]
    for fi in range(4):
        frame=Image.new('RGBA',(32*len(directions)+8,40),'#eee6ed')
        for column,ai in enumerate(directions):
            tile=Image.open(source / f'idle-{ai}-{fi}.png').convert('RGBA')
            assert tile.size==(32,32) and tile.getbbox()
            frame.alpha_composite(tile,(4+column*32,4))
        frames.append(frame.convert('RGB').resize((frame.width*6,frame.height*6),Image.Resampling.NEAREST))
    target=out / (name+'.gif')
    frames[0].save(target,save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=2,optimize=False)
    with Image.open(target) as check:
        assert check.n_frames==4 and check.info['loop']==0
        assert [f.info['duration'] for f in ImageSequence.Iterator(check)]==durations
    frames[0].save(out / (name+'.png'))
    print(target)

(out / '贴头刘海与低位双辫.gif').write_bytes((out / '三方向待机.gif').read_bytes())

mix_source=source / '贴头刘海与低位双辫-20261029'
if (mix_source / '双向混搭-帧1.png').exists():
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
    columns=[(0,'前发单独'),(1,'前发＋其他后发'),(4,'其他前发＋后发'),(7,'饰品＋其他发型')]
    frames=[]
    for fi in range(4):
        sheet=Image.open(mix_source / f'双向混搭-帧{fi+1}.png').convert('RGB')
        frame=Image.new('RGB',(800,580),'#eee6ed')
        draw=ImageDraw.Draw(frame)
        for column,(index,label) in enumerate(columns):
            width=draw.textlength(label,font=font)
            draw.text((column*200+(200-width)/2,10),label,font=font,fill='#49414f')
            for row in range(3):
                frame.paste(sheet.crop((index*160,row*160,(index+1)*160,(row+1)*160)),(column*200+20,row*180+50))
        frames.append(frame)
    target=out / '独立部件混搭.gif'
    frames[0].save(target,save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=2,optimize=False)
    frames[0].save(out / '独立部件混搭.png')
    with Image.open(target) as check:
        assert check.n_frames==4 and check.info['loop']==0
        assert [f.info['duration'] for f in ImageSequence.Iterator(check)]==durations

font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
parts=[]
for fi in range(4):
    frame=Image.new('RGBA',(704,560),'#eee6ed')
    draw=ImageDraw.Draw(frame)
    for column,(kind,label) in enumerate([('front','刘海'),('rear','脑后双辫'),('acc','饰品'),('idle','组合')]):
        draw.text((column*176+88-draw.textlength(label,font=font)/2,10),label,font=font,fill='#49414f')
        for row,ai in enumerate([1,0,2]):
            tile=Image.open(source / f'{kind}-{ai}-{fi}.png').convert('RGBA').resize((160,160),Image.Resampling.NEAREST)
            frame.alpha_composite(tile,(column*176+8,row*172+40))
    parts.append(frame.convert('RGB'))
target=out / '刘海与双辫分层.gif'
parts[0].save(target,save_all=True,append_images=parts[1:],duration=durations,loop=0,disposal=2,optimize=False)
parts[0].save(out / '刘海与双辫分层.png')
with Image.open(target) as check:
    assert check.n_frames==4 and check.info['loop']==0
    assert [f.info['duration'] for f in ImageSequence.Iterator(check)]==durations

(source / '使用说明.md').write_text('''# 蓬松双麻花辫·待机

人物工程：character-strawberry-braids-idle-20261029。
只新增灰色发型与独立草莓蝴蝶结，沿用主工程素体；未加入旧五官或服装。
正面采用生成三稿中的左稿；侧面、背面采用用户指定生成图，按原生32×32网格临摹并修整连接和隐藏发帽。
前发、后发、饰品各自独立。只绘制待机三个方向各四帧，原时长每帧100毫秒。
贴头修正版：刘海贴着头骨轮廓，外扩不超过一个原生像素；正侧后发只有沿脑后的薄弧上缘与低位双辫，脸前留空，不再补整顶发帽。背面底发只贴后脑。饰品像素不变。
拆分参考用户旧项目的 TV_FrontHair1_p80024、TV_RearHair1_p80024、TV_RearHair2_p80024，未复制48像素金色素材或改变当前人物比例。
发根跟随原头部的两像素下沉，发梢只下降一像素并有一像素局部延迟弯动。

参考图使用内置 imagegen 生成，提示词方向：在现有人物素体上生成灰色蓬松双短麻花辫、分束齐刘海与粉色草莓蝴蝶结；先比较三款正面，选择左稿，再以当前侧面和背面素体生成同款转向参考。保持大头短身比例、空白脸，不增加服装；侧面应有贴脸弧度、近侧蓬松发束和一条主要辫子；背面后脑发帽连续，不能复用正面刘海。

自检：三个方向全部帧的主画布、动画预览和PNG导出像素一致；前后方向对称，背面前发透明，透明度仅0/255；保留素体像素；检查浅底、深底、去饰品、前发独立及其他后发混搭。GIF重新打开验证帧数、时长及循环。
新前发换配两款已有后发、新后发换配两款已有前发，并将饰品装到其他发型；共检查108张组合帧，测试副本里的旧素材未写入人物分支。
未进行浏览器交互实测。
''',encoding='utf-8')
