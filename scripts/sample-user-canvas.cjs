const fs = require('fs');
const { decode, encode } = require('./png.cjs');

const img = decode(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/user-crop.png'));
const step = 6.400;
const x0 = 3.40;
const y0 = 0.80;

// Let's sample 32 columns and 32 rows
// We need to find the colOffset and rowOffset to match 32x32 character canvas
// In the character canvas, let's find the top of the bun outline
// In user-crop.png, top of bun is around y=10..15
const sampled = [];
for (let r = 0; r < 35; r++) {
  let line = '';
  for (let c = 0; c < 30; c++) {
    const px = Math.round(x0 + (c + 0.5) * step);
    const py = Math.round(y0 + (r + 0.5) * step);
    if (px < 0 || px >= img.width || py < 0 || py >= img.height) {
      line += ' ';
      continue;
    }
    const idx = (py * img.width + px) * 4;
    const red = img.data[idx], green = img.data[idx+1], blue = img.data[idx+2];
    // Classify
    if (red < 40 && green < 40 && blue < 40) line += '#'; // Outline
    else if (red >= 60 && red <= 85 && green >= 60 && green <= 85 && blue >= 65 && blue <= 90) line += 'B'; // Hair base
    else if (red >= 40 && red <= 60 && green >= 40 && green <= 60) line += 'S'; // Hair shadow
    else if (red >= 90 && red <= 140) line += 'H'; // Highlight
    else if (red > 220 && green > 200 && blue > 180) line += '.'; // Skin
    else line += ' '; // Background
  }
  sampled.push(line);
}
console.log(sampled.map((l, i) => `${i.toString().padStart(2, ' ')}: ${l}`).join('\n'));
