const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

async function extract() {
  const imgPath = 'C:/Users/Administrator/.gemini/antigravity/brain/536e0911-21bf-457e-bb01-446536ee9665/.user_uploaded/media_1793006005579_4c9759f3.png';
  const img = await loadImage(imgPath);
  const w = img.width, h = img.height;

  // 找右下角角色的黑色轮廓顶点
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // 右下角区域：x from 380 to 680, y from 380 to 680
  // 找头顶最高的黑色像素 (约 x: 450..600, y: 350..450)
  let topY = 999, topX = 0;
  for (let y = 350; y < 500; y++) {
    for (let x = 450; x < 650; x++) {
      const idx = (y * w + x) * 4;
      if (d[idx] < 40 && d[idx+1] < 40 && d[idx+2] < 40) {
        if (y < topY) {
          topY = y;
          topX = x;
        }
      }
    }
  }
  console.log(`Right-bottom top black pixel at x=${topX}, y=${topY}`);

  // 找底部最低的黑色像素
  let botY = 0, botX = 0;
  for (let y = 680; y >= 550; y--) {
    for (let x = 400; x < 650; x++) {
      const idx = (y * w + x) * 4;
      if (d[idx] < 40 && d[idx+1] < 40 && d[idx+2] < 40) {
        if (y > botY) {
          botY = y;
          botX = x;
        }
      }
    }
  }
  console.log(`Right-bottom bottom black pixel at x=${botX}, y=${botY}`);
  console.log(`Height in display pixels: ${botY - topY}`);

  // 找左侧最外侧黑色像素和右侧最外侧黑色像素
  let leftX = 999, rightX = 0;
  for (let y = topY; y <= botY; y++) {
    for (let x = 380; x < 680; x++) {
      const idx = (y * w + x) * 4;
      if (d[idx] < 40 && d[idx+1] < 40 && d[idx+2] < 40) {
        if (x < leftX) leftX = x;
        if (x > rightX) rightX = x;
      }
    }
  }
  console.log(`Right-bottom bounds: x=[${leftX}, ${rightX}], y=[${topY}, ${botY}]`);
  console.log(`Width=${rightX - leftX}, Height=${botY - topY}`);
}

extract().catch(console.error);
