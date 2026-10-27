const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

async function analyzeUserMarkup() {
  const imgPath = 'C:/Users/Administrator/.gemini/antigravity/brain/536e0911-21bf-457e-bb01-446536ee9665/.user_uploaded/media_1793007070181_01b5edc4.png';
  const img = await loadImage(imgPath);
  const w = img.width, h = img.height;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;

  // 找红色像素 (r > 180, g < 50, b < 50)
  const reds = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (d[idx] > 180 && d[idx+1] < 50 && d[idx+2] < 50) {
        reds.push({ x, y });
      }
    }
  }
  console.log(`Found ${reds.length} red pixels.`);

  // 分别找左红框和右红框的范围
  const leftReds = reds.filter(p => p.x < w / 2);
  const rightReds = reds.filter(p => p.x >= w / 2);

  function getBounds(pts) {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }

  console.log('Left red box:', getBounds(leftReds));
  console.log('Right red box:', getBounds(rightReds));

  // 检查图像里 32x32 网格的边界
  // 在图中可以看到角色的 32x32 网格线！
  // 找角色的外框
}

analyzeUserMarkup().catch(console.error);
