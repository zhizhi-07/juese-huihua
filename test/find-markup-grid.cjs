const fs = require('fs');
const { createCanvas, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

async function findBorders() {
  const imgPath = 'C:/Users/Administrator/.gemini/antigravity/brain/536e0911-21bf-457e-bb01-446536ee9665/.user_uploaded/media_1793007070181_01b5edc4.png';
  const img = await loadImage(imgPath);
  const w = img.width, h = img.height;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;

  // 找非背景紫色的边界
  // 背景紫色约为 r:221, g:213, b:237
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = d[idx], g = d[idx+1], b = d[idx+2];
      // 如果不是浅紫色背景
      if (Math.abs(r - 221) > 20 || Math.abs(g - 213) > 20 || Math.abs(b - 237) > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`Canvas border: x=[${minX}, ${maxX}], y=[${minY}, ${maxY}]`);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  console.log(`Width=${cw}, Height=${ch}`);
  const cellSize = cw / 32;
  console.log(`Cell size: ${cellSize}`);

  // 红框位置
  // Left red box: { minX: 213, maxX: 250, minY: 140, maxY: 191 }
  // Right red box: { minX: 357, maxX: 393, minY: 137, maxY: 197 }
  const lX = (213 + 250) / 2, lY = (140 + 191) / 2;
  const rX = (357 + 393) / 2, rY = (137 + 197) / 2;

  const gLX = (lX - minX) / cellSize;
  const gLY = (lY - minY) / cellSize;
  const gRX = (rX - minX) / cellSize;
  const gRY = (rY - minY) / cellSize;

  console.log(`Left box in 32x32: x=${gLX.toFixed(2)}, y=${gLY.toFixed(2)}`);
  console.log(`Right box in 32x32: x=${gRX.toFixed(2)}, y=${gRY.toFixed(2)}`);

  console.log(`Left box grid range: x=[${((213 - minX)/cellSize).toFixed(1)}, ${((250 - minX)/cellSize).toFixed(1)}], y=[${((140 - minY)/cellSize).toFixed(1)}, ${((191 - minY)/cellSize).toFixed(1)}]`);
  console.log(`Right box grid range: x=[${((357 - minX)/cellSize).toFixed(1)}, ${((393 - minX)/cellSize).toFixed(1)}], y=[${((137 - minY)/cellSize).toFixed(1)}, ${((197 - minY)/cellSize).toFixed(1)}]`);
}

findBorders().catch(console.error);
