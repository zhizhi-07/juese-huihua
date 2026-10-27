const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

async function alignGrid() {
  const imgPath = 'C:/Users/Administrator/.gemini/antigravity/brain/536e0911-21bf-457e-bb01-446536ee9665/.user_uploaded/media_1793007070181_01b5edc4.png';
  const img = await loadImage(imgPath);
  const w = img.width, h = img.height;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;

  // 找外层黑框：画布边框
  // 图中有一个 32x32 的大矩形框
  let borderLeft = -1, borderTop = -1, borderRight = -1, borderBottom = -1;
  // 扫描黑色边框
  for (let x = 50; x < 200; x++) {
    // 垂直线
    let count = 0;
    for (let y = 10; y < h - 10; y++) {
      const idx = (y * w + x) * 4;
      if (d[idx] < 60 && d[idx+1] < 60 && d[idx+2] < 60) count++;
    }
    if (count > 300 && borderLeft === -1) {
      borderLeft = x;
    }
  }
  for (let x = w - 50; x > w - 200; x--) {
    let count = 0;
    for (let y = 10; y < h - 10; y++) {
      const idx = (y * w + x) * 4;
      if (d[idx] < 60 && d[idx+1] < 60 && d[idx+2] < 60) count++;
    }
    if (count > 300 && borderRight === -1) {
      borderRight = x;
    }
  }
  for (let y = 10; y < 100; y++) {
    let count = 0;
    for (let x = borderLeft; x <= borderRight; x++) {
      const idx = (y * w + x) * 4;
      if (d[idx] < 60 && d[idx+1] < 60 && d[idx+2] < 60) count++;
    }
    if (count > 300 && borderTop === -1) {
      borderTop = y;
    }
  }
  for (let y = h - 10; y > h - 100; y--) {
    let count = 0;
    for (let x = borderLeft; x <= borderRight; x++) {
      const idx = (y * w + x) * 4;
      if (d[idx] < 60 && d[idx+1] < 60 && d[idx+2] < 60) count++;
    }
    if (count > 300 && borderBottom === -1) {
      borderBottom = y;
    }
  }

  console.log(`Canvas border: x=[${borderLeft}, ${borderRight}], y=[${borderTop}, ${borderBottom}]`);
  const cw = borderRight - borderLeft;
  const ch = borderBottom - borderTop;
  console.log(`Size: ${cw} x ${ch}, cell size: ${cw / 32} x ${ch / 32}`);

  const cellSize = cw / 32;

  // 将红框中心换算为 32x32 坐标
  const leftBoxX = (213 + 250) / 2;
  const leftBoxY = (140 + 191) / 2;
  const rightBoxX = (357 + 393) / 2;
  const rightBoxY = (137 + 197) / 2;

  const gridLeftX = (leftBoxX - borderLeft) / cellSize;
  const gridLeftY = (leftBoxY - borderTop) / cellSize;
  const gridRightX = (rightBoxX - borderLeft) / cellSize;
  const gridRightY = (rightBoxY - borderTop) / cellSize;

  console.log(`Left red box in 32x32 grid: x ~ ${gridLeftX.toFixed(1)}, y ~ ${gridLeftY.toFixed(1)}`);
  console.log(`Right red box in 32x32 grid: x ~ ${gridRightX.toFixed(1)}, y ~ ${gridRightY.toFixed(1)}`);
}

alignGrid().catch(console.error);
