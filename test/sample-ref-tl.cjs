const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

async function extractTL() {
  const imgPath = 'C:/Users/Administrator/.gemini/antigravity/brain/536e0911-21bf-457e-bb01-446536ee9665/.user_uploaded/media_1793006005579_4c9759f3.png';
  const img = await loadImage(imgPath);
  const w = img.width, h = img.height;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // 左上角角色：查找其边界
  let topY = 999, topX = 0;
  for (let y = 60; y < 200; y++) {
    for (let x = 100; x < 350; x++) {
      const idx = (y * w + x) * 4;
      if (d[idx] < 40 && d[idx+1] < 40 && d[idx+2] < 40) {
        if (y < topY) { topY = y; topX = x; }
      }
    }
  }
  let botY = 0, botX = 0;
  for (let y = 400; y >= 250; y--) {
    for (let x = 100; x < 350; x++) {
      const idx = (y * w + x) * 4;
      if (d[idx] < 40 && d[idx+1] < 40 && d[idx+2] < 40) {
        if (y > botY) { botY = y; botX = x; }
      }
    }
  }
  let leftX = 999, rightX = 0;
  for (let y = topY; y <= botY; y++) {
    for (let x = 50; x < 400; x++) {
      const idx = (y * w + x) * 4;
      if (d[idx] < 40 && d[idx+1] < 40 && d[idx+2] < 40) {
        if (x < leftX) leftX = x;
        if (x > rightX) rightX = x;
      }
    }
  }
  console.log(`TL bounds: x=[${leftX}, ${rightX}], y=[${topY}, ${botY}]`);
  const stepX = 9.666;
  const stepY = 9.814;
  const gridW = Math.round((rightX - leftX + 1) / stepX);
  const gridH = Math.round((botY - topY + 1) / stepY);
  console.log(`grid: ${gridW}x${gridH}`);

  const outCanvas = createCanvas(gridW, gridH);
  const outCtx = outCanvas.getContext('2d');
  const outImgData = outCtx.createImageData(gridW, gridH);

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const sx = Math.floor(leftX + gx * stepX + stepX * 0.5);
      const sy = Math.floor(topY + gy * stepY + stepY * 0.5);
      const idx = (sy * w + sx) * 4;
      const oidx = (gy * gridW + gx) * 4;
      outImgData.data[oidx] = d[idx];
      outImgData.data[oidx+1] = d[idx+1];
      outImgData.data[oidx+2] = d[idx+2];
      outImgData.data[oidx+3] = 255;
    }
  }
  outCtx.putImageData(outImgData, 0, 0);

  const big = createCanvas(gridW * 8, gridH * 8);
  const bctx = big.getContext('2d');
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(outCanvas, 0, 0, gridW * 8, gridH * 8);

  fs.writeFileSync('test/output/sampled_ref_tl.png', big.toBuffer('image/png'));
  console.log('Saved test/output/sampled_ref_tl.png');
}

extractTL().catch(console.error);
