const fs = require('fs');
const path = require('path');
const { createCanvas, ImageData } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

// 统一语义灰色阶
const C_OUTLINE = [119, 119, 119, 255]; // #777777 描边
const C_SHADOW  = [178, 178, 178, 255]; // #b2b2b2 暗部
const C_BASE    = [209, 209, 209, 255]; // #d1d1d1 底色
const C_LIGHT   = [222, 222, 222, 255]; // #dedede 柔光微亮

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

function shiftY(src, dy, w = 32, h = 32) {
  const dst = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    const srcY = y - dy;
    if (srcY < 0 || srcY >= h) continue;
    for (let x = 0; x < w; x++) {
      const sIdx = (srcY * w + x) * 4;
      const dIdx = (y * w + x) * 4;
      if (src.data[sIdx + 3] > 0) {
        dst.data[dIdx]     = src.data[sIdx];
        dst.data[dIdx + 1] = src.data[sIdx + 1];
        dst.data[dIdx + 2] = src.data[sIdx + 2];
        dst.data[dIdx + 3] = src.data[sIdx + 3];
      }
    }
  }
  return dst;
}

// ==========================================
// 1. 正面：双凹槽碎齐刘海 (down)
// ==========================================
function generateFrontDown() {
  const img = createImg(32, 32);

  // y=0: 顶部外描边 x=[12..21]
  setSymSpan(img, 12, 16, 0, C_OUTLINE);

  // y=1:
  setSymSpan(img, 10, 11, 1, C_OUTLINE);
  setSymSpan(img, 12, 16, 1, C_LIGHT);

  // y=2:
  setSymSpan(img, 8, 9, 2, C_OUTLINE);
  setSymSpan(img, 10, 16, 2, C_BASE);
  setSymSpan(img, 12, 15, 2, C_LIGHT);

  // y=3:
  setSymSpan(img, 7, 7, 3, C_OUTLINE);
  setSymSpan(img, 8, 16, 3, C_BASE);
  setSymSpan(img, 11, 14, 3, C_LIGHT);

  // y=4:
  setSymSpan(img, 6, 6, 4, C_OUTLINE);
  setSymSpan(img, 7, 16, 4, C_BASE);
  setSymPx(img, 13, 4, C_SHADOW);

  // y=5:
  setSymSpan(img, 5, 5, 5, C_OUTLINE);
  setSymSpan(img, 6, 16, 5, C_BASE);
  setSymPx(img, 12, 5, C_SHADOW);

  // y=6:
  setSymSpan(img, 5, 5, 6, C_OUTLINE);
  setSymSpan(img, 6, 16, 6, C_BASE);
  setSymPx(img, 12, 6, C_SHADOW);

  // y=7:
  setSymSpan(img, 4, 4, 7, C_OUTLINE);
  setSymSpan(img, 5, 16, 7, C_BASE);

  // y=8:
  setSymSpan(img, 4, 4, 8, C_OUTLINE);
  setSymSpan(img, 5, 16, 8, C_BASE);

  // y=9:
  setSymSpan(img, 4, 4, 9, C_OUTLINE);
  setSymSpan(img, 5, 16, 9, C_BASE);

  // y=10:
  // 双凹槽处 (x=11..12) 向上收缩，暗部过渡
  setSymSpan(img, 4, 4, 10, C_OUTLINE);
  setSymSpan(img, 5, 10, 10, C_BASE);
  setSymSpan(img, 11, 12, 10, C_SHADOW); // 凹槽顶部阴影
  setSymSpan(img, 13, 16, 10, C_BASE);   // 中间整束完整饱满

  // y=11:
  // x=4: 外描边
  // x=5..6: 脸侧垂发
  // x=7: 脸侧内描边
  // x=8..10: 左眼上方齐刘海底色
  // x=11..12: 凹槽顶部描边 (露出额头)
  // x=13..16: 中间主刘海束底色垂下
  setSymSpan(img, 4, 4, 11, C_OUTLINE);
  setSymSpan(img, 5, 6, 11, C_BASE);
  setSymSpan(img, 7, 7, 11, C_OUTLINE);
  setSymSpan(img, 8, 10, 11, C_BASE);
  setSymSpan(img, 11, 12, 11, C_OUTLINE); // 凹槽顶部描边
  setSymSpan(img, 13, 16, 11, C_BASE);

  // y=12:
  // x=4: 外描边, x=5..6: 脸侧发, x=7: 脸侧内描边
  // x=8..10: 齐刘海下缘描边 (紧贴左眼上方)
  // x=11..12: 凹槽开口 (透明！露出额头皮肤)
  // x=13..16: 中间小发束底色
  setSymSpan(img, 4, 4, 12, C_OUTLINE);
  setSymSpan(img, 5, 6, 12, C_BASE);
  setSymSpan(img, 7, 7, 12, C_OUTLINE);
  setSymSpan(img, 8, 10, 12, C_OUTLINE);
  // x=11..12 透明
  setSymSpan(img, 13, 15, 12, C_BASE);
  setSymPx(img, 16, 12, C_BASE);

  // y=13:
  // 中间小发束底边描边收口 (x=13..16 底部描边)
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
// 2. 侧面：侧面齐刘海 (side)
// ==========================================
function generateFrontSide() {
  const img = createImg(32, 32);

  // y=0: 顶部外描边 x=[12..23]
  for (let x = 12; x <= 23; x++) setPx(img, x, 0, C_OUTLINE);

  // y=1:
  setPx(img, 10, 1, C_OUTLINE); setPx(img, 11, 1, C_OUTLINE);
  for (let x = 12; x <= 23; x++) setPx(img, x, 1, C_LIGHT);
  setPx(img, 24, 1, C_OUTLINE); setPx(img, 25, 1, C_OUTLINE);

  // y=2:
  setPx(img, 8, 2, C_OUTLINE); setPx(img, 9, 2, C_OUTLINE);
  for (let x = 10; x <= 24; x++) setPx(img, x, 2, (x >= 12 && x <= 18) ? C_LIGHT : C_BASE);
  setPx(img, 25, 2, C_OUTLINE); setPx(img, 26, 2, C_OUTLINE);

  // y=3:
  setPx(img, 7, 3, C_OUTLINE);
  for (let x = 8; x <= 26; x++) setPx(img, x, 3, (x >= 12 && x <= 18) ? C_LIGHT : C_BASE);
  setPx(img, 27, 3, C_OUTLINE);

  // y=4..6: 饱满侧面发顶
  for (let y = 4; y <= 6; y++) {
    const lx = y === 4 ? 6 : 5;
    const rx = y <= 5 ? 28 : 28;
    setPx(img, lx, y, C_OUTLINE);
    for (let x = lx + 1; x < rx; x++) {
      setPx(img, x, y, (x >= 13 && x <= 17 && y === 4) ? C_LIGHT : C_BASE);
    }
    setPx(img, rx, y, C_OUTLINE);
  }

  // y=7..10:
  for (let y = 7; y <= 10; y++) {
    const lx = y <= 8 ? 4 : 3;
    const rx = 28;
    setPx(img, lx, y, C_OUTLINE);
    for (let x = lx + 1; x < rx; x++) setPx(img, x, y, C_BASE);
    setPx(img, rx, y, C_OUTLINE);
  }

  // y=11..12: 侧面刘海与凹槽起伏
  // y=11:
  setPx(img, 3, 11, C_OUTLINE);
  for (let x = 4; x <= 13; x++) setPx(img, x, 11, C_BASE);
  setPx(img, 14, 11, C_SHADOW); setPx(img, 15, 11, C_OUTLINE); // 侧面凹槽
  for (let x = 16; x <= 27; x++) setPx(img, x, 11, C_BASE);
  setPx(img, 28, 11, C_OUTLINE);

  // y=12:
  setPx(img, 3, 12, C_OUTLINE);
  for (let x = 4; x <= 8; x++) setPx(img, x, 12, C_BASE); // 前鬓发
  setPx(img, 9, 12, C_OUTLINE);
  for (let x = 10; x <= 13; x++) setPx(img, x, 12, C_OUTLINE); // 刘海下沿
  // x=14..15 侧面凹槽透明
  for (let x = 16; x <= 20; x++) setPx(img, x, 12, C_OUTLINE);
  for (let x = 21; x <= 27; x++) setPx(img, x, 12, C_BASE);
  setPx(img, 28, 12, C_OUTLINE);

  // y=13..18: 前侧长发束 (x=3..9) 与后侧收束 (x=24..28)
  for (let y = 13; y <= 17; y++) {
    // 前侧长垂发
    setPx(img, 3, y, C_OUTLINE);
    for (let x = 4; x <= 6; x++) setPx(img, x, y, C_BASE);
    setPx(img, 7, y, C_SHADOW);
    setPx(img, 8, y, C_OUTLINE);

    // 后侧耳后发束
    setPx(img, 24, y, C_OUTLINE);
    for (let x = 25; x <= 27; x++) setPx(img, x, y, C_BASE);
    setPx(img, 28, y, C_OUTLINE);
  }

  // y=18..21: 前长发束收尖
  setPx(img, 4, 18, C_OUTLINE); setPx(img, 5, 18, C_BASE); setPx(img, 6, 18, C_SHADOW); setPx(img, 7, 18, C_OUTLINE);
  setPx(img, 25, 18, C_OUTLINE); setPx(img, 26, 18, C_OUTLINE); setPx(img, 27, 18, C_OUTLINE);

  setPx(img, 5, 19, C_OUTLINE); setPx(img, 6, 19, C_SHADOW); setPx(img, 7, 19, C_OUTLINE);
  setPx(img, 6, 20, C_OUTLINE);

  return img;
}

// ==========================================
// 3. 背面：贴头皮的圆润发帽色块 (up)
// ==========================================
function generateFrontUp() {
  const img = createImg(32, 32);

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
    const lx = y === 4 ? 6 : 5;
    setSymSpan(img, lx, lx, y, C_OUTLINE);
    setSymSpan(img, lx + 1, 16, y, C_BASE);
  }

  // y=7..10:
  for (let y = 7; y <= 10; y++) {
    const lx = y <= 8 ? 4 : 3;
    setSymSpan(img, lx, lx, y, C_OUTLINE);
    setSymSpan(img, lx + 1, 16, y, C_BASE);
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
  generateFrontDown,
  generateFrontSide,
  generateFrontUp,
  shiftY
};
