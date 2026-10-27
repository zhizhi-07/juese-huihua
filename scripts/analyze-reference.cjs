const fs = require('fs');
const { decode, encode } = require('./png.cjs');
const img = decode(fs.readFileSync('C:/Users/Administrator/.gemini/antigravity/brain/59af9401-00f1-46a5-9ede-114221b8c142/.user_uploaded/media_1793065934197_6cffd150.png'));

const W = 24, H = 17;
for (let y = 0; y < H; y++) {
  const rowColors = [];
  for (let x = 0; x < W; x++) {
    const px = Math.round(197 + (x + 0.5) * 25.17);
    const py = Math.round(298 + (y + 0.5) * 25.17);
    const idx = (py * 1024 + px) * 4;
    const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
    rowColors.push({ x, y, r, g, b });
  }
  console.log('Row ' + y + ': ' + rowColors.map(p => {
    if (p.r < 30 && p.g < 30 && p.b < 30) return '##';
    if (p.r > 240 && p.g > 240 && p.b > 240) return '..';
    if (p.r > 200 && p.g > 200 && p.b > 200) return 'ww';
    if (p.r >= 120 && p.r <= 160) return 'HH';
    if (p.r >= 65 && p.r <= 85) return 'BB';
    if (p.r >= 35 && p.r <= 60) return 'SS';
    if (p.r >= 240 && p.b < 230) return 'ff'; // face
    return '??';
  }).join(' '));
}
