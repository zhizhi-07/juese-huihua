const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

async function extractPalette() {
  const imgPath = 'C:/Users/Administrator/.gemini/antigravity/brain/536e0911-21bf-457e-bb01-446536ee9665/.user_uploaded/media_1793006005579_4c9759f3.png';
  const img = await loadImage(imgPath);
  const w = img.width, h = img.height;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;

  // 统计所有颜色的频次 (按 rgb 聚类)
  const colorMap = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i+3] < 128) continue;
    // 忽略近白色的背景
    if (d[i] > 240 && d[i+1] > 240 && d[i+2] > 240) continue;
    const r = Math.round(d[i] / 4) * 4;
    const g = Math.round(d[i+1] / 4) * 4;
    const b = Math.round(d[i+2] / 4) * 4;
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  // 找绿色相关的颜色 (g > r 且 g > b)
  const greenColors = [];
  for (const [key, count] of colorMap.entries()) {
    const [r, g, b] = key.split(',').map(Number);
    if (g > 100 && g > r * 1.1 && g > b * 1.1) {
      greenColors.push({ r, g, b, count });
    }
  }
  greenColors.sort((a, b) => b.count - a.count);
  console.log('Top green colors:');
  greenColors.slice(0, 15).forEach(c => {
    const hex = '#' + [c.r, c.g, c.b].map(x => x.toString(16).padStart(2, '0')).join('');
    console.log(`  ${hex} (r:${c.r}, g:${c.g}, b:${c.b}) count: ${c.count}`);
  });

  // 找深色描边
  const darkColors = [];
  for (const [key, count] of colorMap.entries()) {
    const [r, g, b] = key.split(',').map(Number);
    if (r < 50 && g < 50 && b < 50) {
      darkColors.push({ r, g, b, count });
    }
  }
  darkColors.sort((a, b) => b.count - a.count);
  console.log('Top dark colors:');
  darkColors.slice(0, 5).forEach(c => {
    const hex = '#' + [c.r, c.g, c.b].map(x => x.toString(16).padStart(2, '0')).join('');
    console.log(`  ${hex} count: ${c.count}`);
  });

  // 找粉色/紫色发饰颜色
  const pinkColors = [];
  for (const [key, count] of colorMap.entries()) {
    const [r, g, b] = key.split(',').map(Number);
    if (r > 150 && b > 100 && g < 150) {
      pinkColors.push({ r, g, b, count });
    }
  }
  pinkColors.sort((a, b) => b.count - a.count);
  console.log('Top pink/purple accessory colors:');
  pinkColors.slice(0, 10).forEach(c => {
    const hex = '#' + [c.r, c.g, c.b].map(x => x.toString(16).padStart(2, '0')).join('');
    console.log(`  ${hex} count: ${c.count}`);
  });
}

extractPalette().catch(console.error);
