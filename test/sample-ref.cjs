const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

async function extractPixelArt() {
  const imgPath = 'C:/Users/Administrator/.gemini/antigravity/brain/536e0911-21bf-457e-bb01-446536ee9665/.user_uploaded/media_1793006005579_4c9759f3.png';
  const img = await loadImage(imgPath);
  const w = img.width, h = img.height;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // 找 x 坐标网格：在 y=370 (y 的中心)
  // min=481, max=557。77像素，共8个像素。
  // 每个像素宽约 77 / 8 = 9.625 像素
  // 采样步长在 x 和 y 方向
  // 我们通过找边缘跳变点来确定网格
  
  // 采样右下角角色
  // y 从 366 开始，每个像素高约 9.8 像素
  // x 从 403 开始到 634，总宽 232，约 24 像素宽
  const gridW = 24;
  const gridH = 28;
  const startX = 403.5;
  const stepX = (634 - 403 + 1) / gridW;
  const startY = 366.5;
  const stepY = (630 - 366 + 1) / 27;

  console.log(`stepX: ${stepX}, stepY: ${stepY}`);

  const outCanvas = createCanvas(gridW, 28);
  const outCtx = outCanvas.getContext('2d');
  const outImgData = outCtx.createImageData(gridW, 28);

  for (let gy = 0; gy < 28; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const sx = Math.floor(startX + gx * stepX + stepX * 0.5);
      const sy = Math.floor(startY + gy * stepY + stepY * 0.5);
      const idx = (sy * w + sx) * 4;
      const oidx = (gy * gridW + gx) * 4;
      outImgData.data[oidx] = d[idx];
      outImgData.data[oidx+1] = d[idx+1];
      outImgData.data[oidx+2] = d[idx+2];
      outImgData.data[oidx+3] = 255;
    }
  }

  outCtx.putImageData(outImgData, 0, 0);

  // 放大8倍保存
  const big = createCanvas(gridW * 8, 28 * 8);
  const bctx = big.getContext('2d');
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(outCanvas, 0, 0, gridW * 8, 28 * 8);

  fs.writeFileSync('test/output/sampled_ref_br.png', big.toBuffer('image/png'));
  console.log('Saved test/output/sampled_ref_br.png');
}

extractPixelArt().catch(console.error);
