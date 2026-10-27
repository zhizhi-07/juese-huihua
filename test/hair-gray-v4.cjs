const fs = require('fs');
const path = require('path');
const { createCanvas, ImageData } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

// 灰色色阶（完全匹配原 02 齐刘海的色板）
const C_OUTLINE = [119, 119, 119, 255]; // #777777
const C_SHADOW  = [178, 178, 178, 255]; // #b2b2b2
const C_BASE    = [209, 209, 209, 255]; // #d1d1d1
const C_LIGHT   = [222, 222, 222, 255]; // #dedede

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

// 严格对称中轴 16.5 (x 和 33 - x)
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
// 1. 正面前发：双凹槽 + 灰色阶
// ==========================================
function makeFrontHairDownGray() {
  const img = createImg(32, 32);

  // --- 发顶轮廓与填色 ---
  // y=0: 顶部外描边 x=[12..16] 对称 -> [12..21]
  setSymSpan(img, 12, 16, 0, C_OUTLINE);

  // y=1: x=10..11 描边, x=12..16 底色, 微亮高光
  setSymSpan(img, 10, 11, 1, C_OUTLINE);
  setSymSpan(img, 12, 16, 1, C_LIGHT);

  // y=2: x=8..9 描边, x=10..16 底色/亮部
  setSymSpan(img, 8, 9, 2, C_OUTLINE);
  setSymSpan(img, 10, 16, 2, C_BASE);
  setSymSpan(img, 12, 15, 2, C_LIGHT);

  // y=3: x=7 描边, x=8..16 底色
  setSymSpan(img, 7, 7, 3, C_OUTLINE);
  setSymSpan(img, 8, 16, 3, C_BASE);
  setSymSpan(img, 11, 14, 3, C_LIGHT);

  // y=4: x=6 描边, x=7..16 底色, 头顶微暗流线 x=13 阴影
  setSymSpan(img, 6, 6, 4, C_OUTLINE);
  setSymSpan(img, 7, 16, 4, C_BASE);
  setSymPx(img, 13, 4, C_SHADOW);

  // y=5: x=5 描边, x=6..16 底色
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
  // 双凹槽预备：在 x=11..12（对称 21..22）处开始形成向上凹槽的阴影/转折
  setSymSpan(img, 4, 4, 10, C_OUTLINE);
  setSymSpan(img, 5, 10, 10, C_BASE);
  setSymSpan(img, 11, 12, 10, C_SHADOW); // 凹槽顶部的暗部过渡
  setSymSpan(img, 13, 16, 10, C_BASE);   // 中间小刘海继续保持底色饱满！

  // y=11:
  // x=4: 外描边
  // x=5..6: 脸侧垂发
  // x=7: 脸侧内描边
  // x=8..10: 左眼上方齐刘海底色
  // x=11..12: 【凹槽上沿描边】！(向上凹进，露出额头)
  // x=13..16: 中间小刘海束底色垂下 (x=13..20 是一整束可爱的中刘海)
  setSymSpan(img, 4, 4, 11, C_OUTLINE);
  setSymSpan(img, 5, 6, 11, C_BASE);
  setSymSpan(img, 7, 7, 11, C_OUTLINE);
  setSymSpan(img, 8, 10, 11, C_BASE);
  setSymSpan(img, 11, 12, 11, C_OUTLINE); // 凹槽顶部描边
  setSymSpan(img, 13, 16, 11, C_BASE);   // 中间完整连贯！

  // y=12:
  // x=4: 外描边, x=5..6: 脸侧发, x=7: 脸侧内描边
  // x=8..10: 齐刘海下缘描边 (紧贴左眼上方)
  // x=11..12: 【凹槽开口，透明！露出额头皮肤】
  // x=13..16: 中间小刘海束下沿 (x=13..15 底色, x=16 微阴影)
  setSymSpan(img, 4, 4, 12, C_OUTLINE);
  setSymSpan(img, 5, 6, 12, C_BASE);
  setSymSpan(img, 7, 7, 12, C_OUTLINE);
  setSymSpan(img, 8, 10, 12, C_OUTLINE);
  // x=11..12 保持透明！
  // 中间发束向下略垂：
  setSymSpan(img, 13, 15, 12, C_BASE);
  setSymPx(img, 16, 12, C_BASE);

  // y=13:
  // 中间小发束下缘描边收口 (x=13..16 底部描边)
  setSymSpan(img, 13, 16, 13, C_OUTLINE);
  // 脸侧垂发继续：
  setSymSpan(img, 4, 4, 13, C_OUTLINE);
  setSymSpan(img, 5, 6, 13, C_BASE);
  setSymSpan(img, 7, 7, 13, C_OUTLINE);

  // --- y=14..18: 脸侧自然垂发 ---
  for (let y = 14; y <= 17; y++) {
    setSymSpan(img, 4, 4, y, C_OUTLINE);
    setSymSpan(img, 5, 5, y, C_BASE);
    setSymSpan(img, 6, 6, y, y >= 16 ? C_SHADOW : C_BASE);
    setSymSpan(img, 7, 7, y, C_OUTLINE);
  }

  // y=18: 发梢微收
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
// 2. 侧面前发 (side，参考原版 02 侧面头型)
// ==========================================
function makeFrontHairSideGray() {
  const img = createImg(32, 32);

  // 侧面（脸朝左）：
  // 头顶发帽轮廓 (y=0..4)
  for (let x = 11; x <= 22; x++) setPx(img, x, 0, C_OUTLINE);

  // y=1: 描边与亮部
  setPx(img, 9, 1, C_OUTLINE); setPx(img, 10, 1, C_OUTLINE);
  for (let x = 11; x <= 22; x++) setPx(img, x, 1, C_LIGHT);
  setPx(img, 23, 1, C_OUTLINE); setPx(img, 24, 1, C_OUTLINE);

  // y=2:
  setPx(img, 8, 2, C_OUTLINE);
  for (let x = 9; x <= 23; x++) setPx(img, x, 2, C_BASE);
  for (let x = 11; x <= 16; x++) setPx(img, x, 2, C_LIGHT);
  setPx(img, 24, 2, C_OUTLINE); setPx(img, 25, 2, C_OUTLINE);

  // y=3..6: 侧面饱满发顶
  for (let y = 3; y <= 6; y++) {
    const leftX = y === 3 ? 7 : (y === 4 ? 6 : 5);
    const rightX = y === 3 ? 26 : (y <= 5 ? 27 : 27);
    setPx(img, leftX, y, C_OUTLINE);
    for (let x = leftX + 1; x < rightX; x++) {
      setPx(img, x, y, (x >= 12 && x <= 16 && y <= 4) ? C_LIGHT : C_BASE);
    }
    setPx(img, rightX, y, C_OUTLINE);
  }

  // y=7..10:
  for (let y = 7; y <= 10; y++) {
    const leftX = y <= 8 ? 4 : 3;
    const rightX = 27;
    setPx(img, leftX, y, C_OUTLINE);
    for (let x = leftX + 1; x < rightX; x++) setPx(img, x, y, C_BASE);
    setPx(img, rightX, y, C_OUTLINE);
  }

  // 侧面刘海下缘与侧垂发 (y=11..19)
  // 侧面朝左：前方（左侧）垂发更长（前鬓发），中间刘海在眼上，后方（右侧）发束稍短在耳前
  // y=11:
  setPx(img, 3, 11, C_OUTLINE);
  for (let x = 4; x <= 18; x++) setPx(img, x, 11, C_BASE);
  setPx(img, 19, 11, C_OUTLINE); // 侧面刘海凹槽转折

  // y=12:
  setPx(img, 3, 12, C_OUTLINE);
  for (let x = 4; x <= 8; x++) setPx(img, x, 12, C_BASE); // 前脸侧长垂发
  setPx(img, 9, 12, C_OUTLINE);
  // 侧刘海下沿
  for (let x = 10; x <= 16; x++) setPx(img, x, 12, C_OUTLINE);
  for (let x = 20; x <= 25; x++) setPx(img, x, 12, C_BASE);
  setPx(img, 26, 12, C_OUTLINE);

  // y=13..18: 前侧长发束 (x=3..8) 和后耳侧发束 (x=21..25)
  for (let y = 13; y <= 17; y++) {
    // 前侧垂发
    setPx(img, 3, y, C_OUTLINE);
    for (let x = 4; x <= 6; x++) setPx(img, x, y, C_BASE);
    setPx(img, 7, y, C_SHADOW);
    setPx(img, 8, y, C_OUTLINE);

    // 耳侧发
    setPx(img, 21, y, C_OUTLINE);
    for (let x = 22; x <= 24; x++) setPx(img, x, y, C_BASE);
    setPx(img, 25, y, C_OUTLINE);
  }

  // y=18..20: 前长发束收尖
  setPx(img, 4, 18, C_OUTLINE); setPx(img, 5, 18, C_BASE); setPx(img, 6, 18, C_SHADOW); setPx(img, 7, 18, C_OUTLINE);
  setPx(img, 22, 18, C_OUTLINE); setPx(img, 23, 18, C_OUTLINE); setPx(img, 24, 18, C_OUTLINE); // 耳侧收尾

  setPx(img, 5, 19, C_OUTLINE); setPx(img, 6, 19, C_SHADOW); setPx(img, 7, 19, C_OUTLINE);
  setPx(img, 6, 20, C_OUTLINE);

  return img;
}

// ==========================================
// 3. 背面前发 (up：贴头皮的一个饱满底色块)
// ==========================================
function makeFrontHairUpGray() {
  const img = createImg(32, 32);

  // 用户要求：“背面就是贴头皮的一个色块”
  // 按照原角色头部背面后脑轮廓，整片平滑贴头皮的圆润发帽色块
  // y=0: 顶部外描边 x=[12..21]
  setSymSpan(img, 12, 16, 0, C_OUTLINE);

  // y=1:
  setSymSpan(img, 10, 11, 1, C_OUTLINE);
  setSymSpan(img, 12, 16, 1, C_BASE);

  // y=2:
  setSymSpan(img, 8, 9, 2, C_OUTLINE);
  setSymSpan(img, 10, 16, 2, C_BASE);

  // y=3:
  setSymSpan(img, 7, 7, 3, C_OUTLINE);
  setSymSpan(img, 8, 16, 3, C_BASE);

  // y=4..6:
  for (let y = 4; y <= 6; y++) {
    const leftX = y === 4 ? 6 : 5;
    setSymSpan(img, leftX, leftX, y, C_OUTLINE);
    setSymSpan(img, leftX + 1, 16, y, C_BASE);
  }

  // y=7..10:
  for (let y = 7; y <= 10; y++) {
    const leftX = y <= 8 ? 4 : 3;
    setSymSpan(img, leftX, leftX, y, C_OUTLINE);
    setSymSpan(img, leftX + 1, 16, y, C_BASE);
  }

  // y=11..15: 贴头皮后脑完整下包
  for (let y = 11; y <= 15; y++) {
    setSymSpan(img, 4, 4, y, C_OUTLINE);
    setSymSpan(img, 5, 16, y, C_BASE);
  }

  // y=16: 贴头皮底部描边收口
  setSymSpan(img, 4, 16, 16, C_OUTLINE);

  return img;
}

module.exports = {
  makeFrontHairDownGray,
  makeFrontHairSideGray,
  makeFrontHairUpGray
};
