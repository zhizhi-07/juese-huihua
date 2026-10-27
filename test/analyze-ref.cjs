const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

async function analyze() {
  const imgPath = 'C:/Users/Administrator/.gemini/antigravity/brain/536e0911-21bf-457e-bb01-446536ee9665/.user_uploaded/media_1793006005579_4c9759f3.png';
  const img = await loadImage(imgPath);
  const w = img.width, h = img.height;
  console.log(`Original image: ${w}x${h}`);

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);

  // 检查右下角小人的头部大概区域 (约 x: 380..580, y: 380..580)
  // 找右下角角色的轮廓
  // 让我们寻找黑色像素 (描边)
  const d = imgData.data;
  function getPixel(x, y) {
    const idx = (y * w + x) * 4;
    return [d[idx], d[idx+1], d[idx+2], d[idx+3]];
  }

  // 查找一个典型的水平连续黑色像素宽度
  let minRun = 999;
  for (let y = 100; y < h - 100; y += 10) {
    let run = 0;
    let isBlack = false;
    for (let x = 100; x < w - 100; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const black = r < 50 && g < 50 && b < 50 && a > 200;
      if (black) {
        run++;
        isBlack = true;
      } else {
        if (isBlack && run > 2 && run < minRun) {
          minRun = run;
        }
        run = 0;
        isBlack = false;
      }
    }
  }
  console.log('Detected min run of black pixels:', minRun);

  // 统计各个连续像素段的长度分布
  const runs = {};
  for (let y = 50; y < h - 50; y += 2) {
    let curR = -1, curG = -1, curB = -1, run = 0;
    for (let x = 50; x < w - 50; x++) {
      const [r, g, b, a] = getPixel(x, y);
      if (Math.abs(r - curR) < 10 && Math.abs(g - curG) < 10 && Math.abs(b - curB) < 10) {
        run++;
      } else {
        if (run > 0 && run < 50) {
          runs[run] = (runs[run] || 0) + 1;
        }
        curR = r; curG = g; curB = b; run = 1;
      }
    }
  }
  const sortedRuns = Object.entries(runs).sort((a,b) => b[1] - a[1]).slice(0, 10);
  console.log('Top run lengths:', sortedRuns);
}

analyze().catch(console.error);
