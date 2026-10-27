const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

async function testSample() {
  const imgPath = 'C:/Users/Administrator/.gemini/antigravity/brain/536e0911-21bf-457e-bb01-446536ee9665/.user_uploaded/media_1793006005579_4c9759f3.png';
  const img = await loadImage(imgPath);
  const w = img.width, h = img.height;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // 在 x: 403..634, y: 366..630 区域
  // 测量每一列黑色竖线的中心坐标
  // 找头顶：366行附近的黑色像素范围
  // 让我们打印 y=366 这行的黑像素区间
  for (let y = 366; y <= 376; y++) {
    const blacks = [];
    for (let x = 403; x <= 634; x++) {
      const idx = (y * w + x) * 4;
      if (d[idx] < 50 && d[idx+1] < 50 && d[idx+2] < 50) {
        blacks.push(x);
      }
    }
    console.log(`y=${y}: count=${blacks.length}, min=${Math.min(...blacks)}, max=${Math.max(...blacks)}`);
  }
}

testSample().catch(console.error);
