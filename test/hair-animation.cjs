const fs = require('fs');
const path = require('path');
const { createCanvas, ImageData } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

const v3 = require('./hair-generator-v3.cjs');
const v2 = require('./hair-generator-v2.cjs');

// 颜色定义
const C_OUTLINE = [28, 44, 26, 255];     // 深墨绿 #1c2c1a
const C_SHADOW  = [140, 168, 100, 255];   // 抹茶绿阴影 #8ca864
const C_BASE    = [196, 228, 176, 255];   // 嫩叶浅绿底色 #c4e4b0

function shiftImageY(src, dy, w = 32, h = 32) {
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

// 为待机 4 帧生成前发
// frame 0: 正常 (基准)
// frame 1: 正常微动 (呼吸准备，发尾微收)
// frame 2: 随头部下移 2 像素 (发梢因惯性向上压展)
// frame 3: 随头部下移 2 像素 (发梢平稳)
function generateFrontHairFrames() {
  const f0 = v3.makeFrontHairV3();
  // frame 1: 和 f0 几乎一致，发根对齐
  const f1 = v3.makeFrontHairV3();

  // frame 2: 头部整体下沉 2 像素
  const f2 = shiftImageY(f0, 2);
  // frame 3: 头部下沉 2 像素
  const f3 = shiftImageY(f0, 2);

  return [f0, f1, f2, f3];
}

// 为待机 4 帧生成长披发后发
function generateRearLongHairFrames() {
  const f0 = v3.makeRearLongHairV3();
  const f1 = v3.makeRearLongHairV3();

  // frame 2: 整体下沉 2 像素，发尾外翘稍稍外延 1 像素（受到地面/肩部轻微挤压展开感）
  const f2 = shiftImageY(f0, 2);
  const f3 = shiftImageY(f0, 2);

  return [f0, f1, f2, f3];
}

// 为待机 4 帧生成双马尾后发
function generateRearTwinFrames() {
  const f0 = v2.makeRearTwinTails();
  const f1 = v2.makeRearTwinTails();
  const f2 = shiftImageY(f0, 2);
  const f3 = shiftImageY(f0, 2);
  return [f0, f1, f2, f3];
}

// 为待机 4 帧生成紫色发箍
function generateHeadbandFrames() {
  const f0 = v2.makeHeadband();
  const f1 = v2.makeHeadband();
  const f2 = shiftImageY(f0, 2);
  const f3 = shiftImageY(f0, 2);
  return [f0, f1, f2, f3];
}

// 为待机 4 帧生成粉色双缎带
function generateRibbonsFrames() {
  const f0 = v2.makeRibbons();
  const f1 = v2.makeRibbons();
  const f2 = shiftImageY(f0, 2);
  const f3 = shiftImageY(f0, 2);
  return [f0, f1, f2, f3];
}

module.exports = {
  generateFrontHairFrames,
  generateRearLongHairFrames,
  generateRearTwinFrames,
  generateHeadbandFrames,
  generateRibbonsFrames
};
