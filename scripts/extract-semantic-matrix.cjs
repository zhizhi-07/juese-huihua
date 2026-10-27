const fs = require('fs');
const path = require('path');
const { decode, encode } = require('./png.cjs');

const refImg = decode(fs.readFileSync('C:/Users/Administrator/.gemini/antigravity/brain/59af9401-00f1-46a5-9ede-114221b8c142/.user_uploaded/media_1793065934197_6cffd150.png'));
const W = 24, H = 17;
const grid = [];
for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    const px = Math.round(197 + (x + 0.5) * 25.17);
    const py = Math.round(298 + (y + 0.5) * 25.17);
    const idx = (py * 1024 + px) * 4;
    row.push([refImg.data[idx], refImg.data[idx+1], refImg.data[idx+2]]);
  }
  grid.push(row);
}

// Map color to semantic tokens:
// O: outline #18181a
// B: hair base #46454d
// S: hair shadow #34333b
// H: hair highlight #6a6875
// W: acc white #ffffff
// w: acc shadow #dedee4
// d: acc dark shadow #b8b8c2
// .: transparent / skin
console.log('--- RAW EXTRACTED 24x17 MATRIX ---');
for (let y = 0; y < H; y++) {
  let s = '';
  for (let x = 0; x < W; x++) {
    const [r, g, b] = grid[y][x];
    if (r < 25 && g < 25 && b < 25) s += 'O ';
    else if (r > 240 && g > 240 && b > 240) {
      if (y <= 1 || (x <= 1 && y <= 6) || (x >= 22 && y <= 6)) s += '. '; // sticker white
      else s += 'W '; // acc white
    }
    else if (r > 190 && g > 190 && b > 190) {
      if (y <= 1 || (x <= 1 && y <= 6) || (x >= 22 && y <= 6)) s += '. '; // sticker bg
      else s += 'w '; // acc light shadow
    }
    else if (r >= 240 && g > 200 && b > 190) s += '. '; // skin
    else if (r >= 110 && r <= 150) s += 'H '; // highlight
    else if (r >= 65 && r <= 85) s += 'B '; // base
    else if (r >= 35 && r <= 60) s += 'S '; // shadow
    else s += '? ';
  }
  console.log(`/* y=${y.toString().padStart(2, ' ')} */ "${s.trim()}",`);
}
