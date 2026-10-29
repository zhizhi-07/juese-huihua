# 生图与提取记录

方式：内置 imagegen。第一张带素体请求被服务拦截，未采用。最终采用以下两个透明部件生成结果。

## 发型与帽子提示词

Create a game HAIR AND HAT ACCESSORY ONLY, no person, no body, no skin, no eyes, no mannequin. Use the reference only for the chestnut-brown twin braided pigtails, brown bangs and cute white cat-ear bonnet with red bow. Output a single front view isolated accessory sprite on a genuinely transparent square canvas. The face opening and the whole area below the braids must be transparent. The hairstyle forms a rounded top cap at the top of the square, short parted bangs along the upper edge of a large face opening, brown side locks, and two low chunky braids ending toward the bottom left/right. A compact white cat-ear bonnet with simple dark whiskers and red bow sits above the bangs, all within the top quarter of the sprite. Target design is a strict 32x32 logical pixel grid: head/hair around x=3..28, y=0..23; braids at x=3..8 and 24..29 reaching y=27; face opening roughly x=8..23,y=11..22. Native low-resolution pixel art enlarged with nearest-neighbor hard square pixels, dark chocolate one-pixel outlines, 3 brown shades, ivory white, red and dark red, maximum 12 colors. No antialiasing, gradients, shadows, checkerboard, text, frames, extra objects or extra sprite views. No red outfit; this is ONLY detachable brown hair plus white cat bonnet and bow, with empty transparent face area, intended to fit an existing pixel character.

## 眼妆提示词

Production pixel-art eye accessory ONLY: one symmetrical pair of cute front-facing doll eyes with warm berry-brown irises, a restrained rose eyeshadow line just above the upper eyelids, dark plum one-pixel upper lashes, small white highlights. Isolated on true transparent background, no face, no skin, no head, no body, no text, no border, no other objects. This is for a tiny 32x32 game sprite: each eye should be approximately 5 logical pixels wide and 5 logical pixels tall, with a 6-logical-pixel transparent gap between the eyes. Entire accessory is a 16x6 logical-pixel design enlarged with uniform crisp square pixels. Limited palette: dark plum #38252C, deep chestnut #6B3D3F, berry #A65B68, rose #D397A3, ivory #FFF8EE. No antialiasing, no gradients, no blur. Keep simple readable pixel clusters rather than detailed illustration. Only ONE pair of eyes, straight front view, with small rose eye makeup.

## 原生适配

用工作台同款最近邻缩小和有限色量化提取。压低帽型；把前发与后发分开补全遮挡底图；重新排列32像素下被头部挡住的辫节；去除眼妆柔边，并校准到旧眼睛位置。眼影层命名为“妆容 / 07 玫瑰妆”，避免被编辑器误判为互斥眼型。

只完成待机正面第一帧。其他方向、其余帧及其他动作未绘制，等待首帧效果确认后再扩展。

工程：http://localhost:8765/?project=character-cat-braids-imagegen-20261029