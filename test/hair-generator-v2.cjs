const fs = require('fs');
const path = require('path');
const { createCanvas, ImageData } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

// 颜色定义 (精选匹配参考图高品质像素色彩)
const C_OUTLINE = [32, 48, 30, 255];     // 深林墨绿描边 #20301e
const C_SHADOW  = [140, 168, 100, 255];   // 抹茶阴影绿 #8ca864
const C_BASE    = [196, 228, 176, 255];   // 嫩叶浅绿底色 #c4e4b0
const C_LIGHT   = [216, 238, 200, 255];   // 柔和微亮过渡 #d8eec8

// 发饰颜色
const C_VIOLET_MID = [168, 116, 196, 255]; // 紫色发箍主体 #a874c4
const C_VIOLET_HI  = [204, 160, 228, 255]; // 紫色发箍亮面 #cca0e4
const C_VIOLET_OUT = [88, 48, 112, 255];   // 紫色发箍暗边 #583070

const C_PINK_MID   = [212, 84, 160, 255];  // 粉色发绳缎带 #d454a0
const C_PINK_DARK  = [156, 52, 112, 255];  // 粉色缎带暗部 #9c3470
const C_GOLD       = [236, 204, 88, 255];  // 右侧黄色流苏 #eccc58

function createImg(w = 32, h = 32) {
  return new ImageData(w, h);
}

function setPixel(img, x, y, color) {
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = color[0];
  img.data[i+1] = color[1];
  img.data[i+2] = color[2];
  img.data[i+3] = color[3];
}

// 采用对称绘制函数 (中心轴 16.5)
function setSymPixel(img, x, y, color) {
  setPixel(img, x, y, color);
  const symX = 33 - x;
  setPixel(img, symX, y, color);
}

function setSymSpan(img, x1, x2, y, color) {
  for (let x = x1; x <= x2; x++) {
    setPixel(img, x, y, color);
    const symX = 33 - x;
    setPixel(img, symX, y, color);
  }
}

// ==========================================
// 1. 前发：碎拱齐刘海 + 脸侧发束 + 饱满发帽
// ==========================================
function makeFrontHair() {
  const img = createImg(32, 32);

  // --- 发顶轮廓与填色 ---
  // y=0: 顶部外描边 x=[12..16] 对称 -> [12..21]
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

  // y=4: x=6 描边, x=7..16 底色；头顶发流微阴影点缀 x=13
  setSymSpan(img, 6, 6, 4, C_OUTLINE);
  setSymSpan(img, 7, 16, 4, C_BASE);
  setSymPixel(img, 13, 4, C_SHADOW);

  // y=5: x=5 描边, x=6..16 底色；发流阴影向下微弧至 x=12
  setSymSpan(img, 5, 5, 5, C_OUTLINE);
  setSymSpan(img, 6, 16, 5, C_BASE);
  setSymPixel(img, 12, 5, C_SHADOW);

  // y=6: x=5 描边, x=6..16 底色；阴影点缀 x=12
  setSymSpan(img, 5, 5, 6, C_OUTLINE);
  setSymSpan(img, 6, 16, 6, C_BASE);
  setSymPixel(img, 12, 6, C_SHADOW);

  // y=7: x=4 描边, x=5..16 底色
  setSymSpan(img, 4, 4, 7, C_OUTLINE);
  setSymSpan(img, 5, 16, 7, C_BASE);

  // y=8: x=4 描边, x=5..16 底色
  setSymSpan(img, 4, 4, 8, C_OUTLINE);
  setSymSpan(img, 5, 16, 8, C_BASE);

  // y=9: x=3 描边, x=4..16 底色
  setSymSpan(img, 3, 3, 9, C_OUTLINE);
  setSymSpan(img, 4, 16, 9, C_BASE);

  // y=10: x=3 描边, x=4..16 底色；中间微拱预备暗部 (x=16)
  setSymSpan(img, 3, 3, 10, C_OUTLINE);
  setSymSpan(img, 4, 16, 10, C_BASE);
  setSymPixel(img, 16, 10, C_SHADOW);

  // --- 刘海下沿与碎拱结构 ---
  // y=11:
  // x=3: 描边
  // x=4..6: 脸侧发底色
  // x=7: 脸侧内描边
  // x=8..13: 齐刘海平切底色 (眼睛在 x=7..11 从 y=12 开始)
  // x=14..15: 眉心向下垂的一小缕碎发尖
  // x=16: 中间倒V微拱开口上沿描边！
  setSymSpan(img, 3, 3, 11, C_OUTLINE);
  setSymSpan(img, 4, 6, 11, C_BASE);
  setSymSpan(img, 7, 7, 11, C_OUTLINE);
  setSymSpan(img, 8, 13, 11, C_BASE);
  setSymSpan(img, 14, 15, 11, C_BASE);
  setSymPixel(img, 16, 11, C_OUTLINE); // 中间拱顶描边

  // y=12:
  // x=3: 描边
  // x=4..6: 脸侧发
  // x=7: 脸侧内描边
  // x=8..13: 齐刘海下缘底边描边 (紧贴眼睛上缘，整洁萌系齐刘海)
  // x=14..15: 眉心两小碎发尖端垂下 (x=14是底色，x=15是阴影或描边)
  // x=16: 空白/透明 (露出额头皮肤！)
  setSymSpan(img, 3, 3, 12, C_OUTLINE);
  setSymSpan(img, 4, 6, 12, C_BASE);
  setSymSpan(img, 7, 7, 12, C_OUTLINE);
  setSymSpan(img, 8, 13, 12, C_OUTLINE);
  setSymPixel(img, 14, 12, C_BASE);
  setSymPixel(img, 15, 12, C_SHADOW);
  // x=16 保持透明 (露出额头)

  // y=13:
  // x=14..15: 碎发尖端收束描边
  setSymSpan(img, 14, 15, 13, C_OUTLINE);

  // --- 脸侧垂发束 (y=13..19) ---
  for (let y = 13; y <= 17; y++) {
    setSymSpan(img, 3, 3, y, C_OUTLINE);
    setSymSpan(img, 4, 5, y, C_BASE);
    setSymSpan(img, 6, 6, y, y >= 16 ? C_SHADOW : C_BASE);
    setSymSpan(img, 7, 7, y, C_OUTLINE);
  }

  // y=18: 脸侧发梢向内微收
  setSymSpan(img, 3, 3, 18, C_OUTLINE);
  setSymSpan(img, 4, 5, 18, C_BASE);
  setSymSpan(img, 6, 6, 18, C_SHADOW);
  setSymSpan(img, 7, 7, 18, C_OUTLINE);

  // y=19: 尖端收拢
  setSymSpan(img, 4, 4, 19, C_OUTLINE);
  setSymSpan(img, 5, 5, 19, C_SHADOW);
  setSymSpan(img, 6, 6, 19, C_OUTLINE);

  // y=20: 尖端底点
  setSymSpan(img, 5, 5, 20, C_OUTLINE);

  return img;
}

// ==========================================
// 2. 后发：浅绿长披发（参考图右下款）
// ==========================================
function makeRearLongHair() {
  const img = createImg(32, 32);

  // 后发正面观：在头后饱满展开，从头侧垂到肩胸两侧，发尾俏皮微卷外翘
  // y=7..10: 后发饱满外轮廓 (即使前发开启，也能提供饱满厚度，独立混搭时可自成一体)
  for (let y = 7; y <= 10; y++) {
    setSymSpan(img, 3, 3, y, C_OUTLINE);
    setSymSpan(img, 4, 7, y, C_SHADOW);
  }

  // y=11..16: 脸颊两侧后方披发主体
  for (let y = 11; y <= 16; y++) {
    setSymSpan(img, 2, 2, y, C_OUTLINE);
    setSymSpan(img, 3, 4, y, C_BASE);
    setSymSpan(img, 5, 8, y, C_SHADOW);
  }

  // y=17..21: 肩膀处长发自然向外披散并丰盈展开
  for (let y = 17; y <= 21; y++) {
    setSymSpan(img, 1, 1, y, C_OUTLINE);
    setSymSpan(img, 2, 4, y, C_BASE);
    setSymSpan(img, 5, 8, y, C_SHADOW);
  }

  // y=22..25: 长披发发尾向外微卷外翘（参考图精髓）！
  // y=22:
  setSymSpan(img, 1, 1, 22, C_OUTLINE);
  setSymSpan(img, 2, 4, 22, C_BASE);
  setSymSpan(img, 5, 6, 22, C_SHADOW);
  setSymSpan(img, 7, 7, 22, C_OUTLINE);

  // y=23: 外翘弧线
  setSymSpan(img, 0, 0, 23, C_OUTLINE);
  setSymSpan(img, 1, 3, 23, C_BASE);
  setSymSpan(img, 4, 5, 23, C_SHADOW);
  setSymSpan(img, 6, 6, 23, C_OUTLINE);

  // y=24: 翘起的发尖与底部回收
  setSymSpan(img, 0, 0, 24, C_OUTLINE);
  setSymSpan(img, 1, 2, 24, C_BASE);
  setSymSpan(img, 3, 4, 24, C_SHADOW);
  setSymSpan(img, 5, 5, 24, C_OUTLINE);

  // y=25: 底端平稳收口描边
  setSymSpan(img, 1, 4, 25, C_OUTLINE);

  // --- 后脑与脖子后方完整遮挡底图 ---
  for (let y = 14; y <= 24; y++) {
    setSymSpan(img, 9, 16, y, C_SHADOW);
  }

  return img;
}

// ==========================================
// 3. 后发：浅绿双马尾（参考图左上款）
// ==========================================
function makeRearTwinTails() {
  const img = createImg(32, 32);

  // 左右两侧高翘的灵动双马尾
  // 左马尾位于 x=0..6, y=4..12
  // y=4: 马尾顶部描边
  setSymSpan(img, 2, 4, 4, C_OUTLINE);
  // y=5:
  setSymSpan(img, 1, 1, 5, C_OUTLINE);
  setSymSpan(img, 2, 4, 5, C_BASE);
  setSymSpan(img, 5, 5, 5, C_OUTLINE);
  // y=6:
  setSymSpan(img, 0, 0, 6, C_OUTLINE);
  setSymSpan(img, 1, 3, 6, C_BASE);
  setSymSpan(img, 4, 4, 6, C_SHADOW);
  setSymSpan(img, 5, 5, 6, C_OUTLINE);
  // y=7:
  setSymSpan(img, 0, 0, 7, C_OUTLINE);
  setSymSpan(img, 1, 3, 7, C_BASE);
  setSymSpan(img, 4, 4, 7, C_SHADOW);
  setSymSpan(img, 5, 5, 7, C_OUTLINE);
  // y=8:
  setSymSpan(img, 0, 0, 8, C_OUTLINE);
  setSymSpan(img, 1, 3, 8, C_BASE);
  setSymSpan(img, 4, 4, 8, C_SHADOW);
  setSymSpan(img, 5, 5, 8, C_OUTLINE);
  // y=9:
  setSymSpan(img, 0, 0, 9, C_OUTLINE);
  setSymSpan(img, 1, 3, 9, C_SHADOW);
  setSymSpan(img, 4, 4, 9, C_OUTLINE);
  // y=10:
  setSymSpan(img, 1, 1, 10, C_OUTLINE);
  setSymSpan(img, 2, 3, 10, C_SHADOW);
  setSymSpan(img, 4, 4, 10, C_OUTLINE);
  // y=11: 发梢收束
  setSymSpan(img, 2, 3, 11, C_OUTLINE);

  // 后脑底图 (覆盖头部背面)
  for (let y = 5; y <= 18; y++) {
    setSymSpan(img, 6, 16, y, C_SHADOW);
  }

  return img;
}

// ==========================================
// 4. 发饰：紫色发箍（参考图左下款）
// ==========================================
function makeHeadband() {
  const img = createImg(32, 32);

  // 跨过头顶发际线处的宽边发箍 (y=3..4)
  setSymSpan(img, 8, 16, 3, C_VIOLET_HI);
  setSymSpan(img, 8, 16, 4, C_VIOLET_MID);
  // 底部细描边
  setSymSpan(img, 8, 16, 5, C_VIOLET_OUT);

  // 两侧翘起的缎带结 (x=6..7, y=2..4)
  setSymPixel(img, 6, 2, C_VIOLET_MID);
  setSymPixel(img, 7, 2, C_VIOLET_HI);
  setSymPixel(img, 5, 3, C_VIOLET_OUT);
  setSymPixel(img, 6, 3, C_VIOLET_HI);
  setSymPixel(img, 5, 4, C_VIOLET_OUT);
  setSymPixel(img, 6, 4, C_VIOLET_MID);

  return img;
}

// ==========================================
// 5. 发饰：双马尾粉色双缎带（参考图左上款）
// ==========================================
function makeRibbons() {
  const img = createImg(32, 32);

  // 扎在双马尾根部的粉色蝴蝶结丝带 (x=4..6, y=4..8)
  // 左侧缎带
  setSymPixel(img, 5, 4, C_PINK_MID);
  setSymPixel(img, 4, 5, C_PINK_MID); setSymPixel(img, 5, 5, C_PINK_DARK);
  setSymPixel(img, 3, 6, C_PINK_MID); setSymPixel(img, 4, 6, C_PINK_DARK);
  setSymPixel(img, 3, 7, C_PINK_MID); setSymPixel(img, 3, 8, C_PINK_DARK);

  // 右侧特有的黄色流苏（可选，只画在右侧）
  // x=23..24, y=6..10
  setPixel(img, 23, 6, C_GOLD);
  setPixel(img, 23, 7, C_GOLD);
  setPixel(img, 23, 8, C_GOLD);

  return img;
}

module.exports = {
  makeFrontHair,
  makeRearLongHair,
  makeRearTwinTails,
  makeHeadband,
  makeRibbons
};
