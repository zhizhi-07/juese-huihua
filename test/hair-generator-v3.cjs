const fs = require('fs');
const path = require('path');
const { createCanvas, ImageData } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

// 精调色彩
const C_OUTLINE = [28, 44, 26, 255];     // 深墨绿 #1c2c1a
const C_SHADOW  = [140, 168, 100, 255];   // 抹茶绿阴影 #8ca864
const C_BASE    = [196, 228, 176, 255];   // 嫩叶浅绿底色 #c4e4b0
const C_LIGHT   = [214, 238, 198, 255];   // 柔光微亮 #d6eec6

const C_VIOLET_MID = [168, 116, 196, 255]; // #a874c4
const C_VIOLET_HI  = [204, 160, 228, 255]; // #cca0e4
const C_VIOLET_OUT = [84, 46, 108, 255];   // #542e6c

const C_PINK_MID   = [214, 84, 160, 255];  // #d654a0
const C_PINK_DARK  = [156, 52, 112, 255];  // #9c3470
const C_GOLD       = [236, 204, 88, 255];  // #eccc58

function createImg(w = 32, h = 32) {
  return new ImageData(w, h);
}

function setPx(img, x, y, c) {
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = c[0];
  img.data[i+1] = c[1];
  img.data[i+2] = c[2];
  img.data[i+3] = c[3];
}

// 严格关于 x=16.5 对称 (x 和 33 - x)
function setSymPx(img, x, y, c) {
  setPx(img, x, y, c);
  setPx(img, 33 - x, y, c);
}

function setSymSpan(img, x1, x2, y, c) {
  for (let x = x1; x <= x2; x++) {
    setPx(img, x, y, c);
    setPx(img, 33 - x, y, c);
  }
}

// ==========================================
// 前发（碎拱齐刘海 + 脸侧自然垂发 + 饱满发顶）
// ==========================================
function makeFrontHairV3() {
  const img = createImg(32, 32);

  // --- 发顶轮廓与填色 ---
  // y=0: 顶部外描边 x=[12..16] 对称 -> [12..21] (宽度10)
  setSymSpan(img, 12, 16, 0, C_OUTLINE);

  // y=1: x=10..11 描边, x=12..16 底色
  setSymSpan(img, 10, 11, 1, C_OUTLINE);
  setSymSpan(img, 12, 16, 1, C_BASE);

  // y=2: x=8..9 描边, x=10..16 底色
  setSymSpan(img, 8, 9, 2, C_OUTLINE);
  setSymSpan(img, 10, 16, 2, C_BASE);

  // y=3: x=7 描边, x=8..16 底色
  setSymSpan(img, 7, 7, 3, C_OUTLINE);
  setSymSpan(img, 8, 16, 3, C_BASE);

  // y=4: x=6 描边, x=7..16 底色, 头顶发流点缀 x=13 阴影
  setSymSpan(img, 6, 6, 4, C_OUTLINE);
  setSymSpan(img, 7, 16, 4, C_BASE);
  setSymPx(img, 13, 4, C_SHADOW);

  // y=5: x=5 描边, x=6..16 底色, 发流微弧至 x=12
  setSymSpan(img, 5, 5, 5, C_OUTLINE);
  setSymSpan(img, 6, 16, 5, C_BASE);
  setSymPx(img, 12, 5, C_SHADOW);

  // y=6: x=5 描边, x=6..16 底色
  setSymSpan(img, 5, 5, 6, C_OUTLINE);
  setSymSpan(img, 6, 16, 6, C_BASE);
  setSymPx(img, 12, 6, C_SHADOW);

  // y=7: x=4 描边, x=5..16 底色
  setSymSpan(img, 4, 4, 7, C_OUTLINE);
  setSymSpan(img, 5, 16, 7, C_BASE);

  // y=8: x=4 描边, x=5..16 底色
  setSymSpan(img, 4, 4, 8, C_OUTLINE);
  setSymSpan(img, 5, 16, 8, C_BASE);

  // y=9: x=4 描边, x=5..16 底色
  setSymSpan(img, 4, 4, 9, C_OUTLINE);
  setSymSpan(img, 5, 16, 9, C_BASE);

  // y=10:
  // 刘海中间微拱 (x=15..16 向上收拱，暗部过渡)
  setSymSpan(img, 4, 4, 10, C_OUTLINE);
  setSymSpan(img, 5, 14, 10, C_BASE);
  setSymSpan(img, 15, 16, 10, C_SHADOW);

  // y=11:
  // 中间小拱顶描边 (x=16 露出额头前的描边线)
  // x=14..15: 眉心向下微垂的发束尖
  // x=7..13: 眼睛上方的齐刘海底色
  // x=4: 外描边, x=5..6: 脸侧垂发
  setSymSpan(img, 4, 4, 11, C_OUTLINE);
  setSymSpan(img, 5, 6, 11, C_BASE);
  setSymSpan(img, 7, 13, 11, C_BASE);
  setSymSpan(img, 14, 15, 11, C_BASE);
  setSymPx(img, 16, 11, C_OUTLINE); // 拱形描边

  // y=12:
  // x=16 是透明！(露出额头中线)
  // x=14..15: 眉心小发尖向下延伸 (x=14 底色, x=15 阴影)
  // x=8..13: 齐刘海底边描边 (刚好贴在眼睛上方，不压眼)
  // x=7: 脸侧内描边
  // x=5..6: 脸侧垂发
  // x=4: 脸侧外描边
  setSymSpan(img, 4, 4, 12, C_OUTLINE);
  setSymSpan(img, 5, 6, 12, C_BASE);
  setSymSpan(img, 7, 7, 12, C_OUTLINE);
  setSymSpan(img, 8, 13, 12, C_OUTLINE);
  setSymPx(img, 14, 12, C_BASE);
  setSymPx(img, 15, 12, C_SHADOW);

  // y=13:
  // x=14..15 的碎发尖收束描边
  setSymSpan(img, 14, 15, 13, C_OUTLINE);
  // 脸侧垂发继续
  setSymSpan(img, 4, 4, 13, C_OUTLINE);
  setSymSpan(img, 5, 6, 13, C_BASE);
  setSymSpan(img, 7, 7, 13, C_OUTLINE);

  // --- y=14..19: 贴脸自然垂发 ---
  for (let y = 14; y <= 17; y++) {
    setSymSpan(img, 4, 4, y, C_OUTLINE);
    setSymSpan(img, 5, 5, y, C_BASE);
    setSymSpan(img, 6, 6, y, y >= 16 ? C_SHADOW : C_BASE);
    setSymSpan(img, 7, 7, y, C_OUTLINE);
  }

  // y=18: 发梢向内微收
  setSymSpan(img, 4, 4, 18, C_OUTLINE);
  setSymSpan(img, 5, 5, 18, C_BASE);
  setSymSpan(img, 6, 6, 18, C_SHADOW);
  setSymSpan(img, 7, 7, 18, C_OUTLINE);

  // y=19: 收尖
  setSymSpan(img, 5, 5, 19, C_OUTLINE);
  setSymSpan(img, 6, 6, 19, C_SHADOW);
  setSymSpan(img, 7, 7, 19, C_OUTLINE);

  // y=20: 尖端底点
  setSymSpan(img, 6, 6, 20, C_OUTLINE);

  return img;
}

// ==========================================
// 后发：浅绿长披发（饱满下垂 + 发尾外翘大摆）
// ==========================================
function makeRearLongHairV3() {
  const img = createImg(32, 32);

  // 后脑及头侧后发轮廓 (y=7..13)
  for (let y = 7; y <= 13; y++) {
    setSymSpan(img, 3, 3, y, C_OUTLINE);
    setSymSpan(img, 4, 4, y, C_BASE);
    setSymSpan(img, 5, 8, y, C_SHADOW);
  }

  // y=14..17: 肩上长发主体饱满展开，向外微张
  for (let y = 14; y <= 17; y++) {
    setSymSpan(img, 2, 2, y, C_OUTLINE);
    setSymSpan(img, 3, 4, y, C_BASE);
    setSymSpan(img, 5, 8, y, C_SHADOW);
  }

  // y=18..21: 胸肩两侧长发连贯披挂
  for (let y = 18; y <= 21; y++) {
    setSymSpan(img, 1, 1, y, C_OUTLINE);
    setSymSpan(img, 2, 4, y, C_BASE);
    setSymSpan(img, 5, 8, y, C_SHADOW);
    setSymSpan(img, 9, 9, y, C_OUTLINE); // 贴身体侧的内描边
  }

  // y=22..25: 长披发发尾向外微卷外翘（参考图右下）
  // y=22:
  setSymSpan(img, 1, 1, 22, C_OUTLINE);
  setSymSpan(img, 2, 4, 22, C_BASE);
  setSymSpan(img, 5, 7, 22, C_SHADOW);
  setSymSpan(img, 8, 8, 22, C_OUTLINE);

  // y=23: 外翘弧线展开至 x=0
  setSymSpan(img, 0, 0, 23, C_OUTLINE);
  setSymSpan(img, 1, 3, 23, C_BASE);
  setSymSpan(img, 4, 6, 23, C_SHADOW);
  setSymSpan(img, 7, 7, 23, C_OUTLINE);

  // y=24: 翘起的发梢尖与底部弧线
  setSymSpan(img, 0, 0, 24, C_OUTLINE);
  setSymSpan(img, 1, 2, 24, C_BASE);
  setSymSpan(img, 3, 5, 24, C_SHADOW);
  setSymSpan(img, 6, 6, 24, C_OUTLINE);

  // y=25: 底端收束描边
  setSymSpan(img, 1, 5, 25, C_OUTLINE);

  // 后脑在背部的完整遮挡底图
  for (let y = 14; y <= 23; y++) {
    setSymSpan(img, 10, 16, y, C_SHADOW);
  }

  return img;
}

module.exports = {
  makeFrontHairV3,
  makeRearLongHairV3
};
