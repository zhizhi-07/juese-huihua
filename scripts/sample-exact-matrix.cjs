const fs = require('fs');
const { decode, encode } = require('./png.cjs');

const img = decode(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/user-crop.png'));
const step = 166 / 26; // ~6.3846
const x0 = 11;
const y0 = 8;

const rows = 18;
const cols = 26;

const grid = [];
for (let r = 0; r < rows; r++) {
  let line = '';
  const rowColors = [];
  for (let c = 0; c < cols; c++) {
    const px = Math.round(x0 + (c + 0.5) * step);
    const py = Math.round(y0 + (r + 0.5) * step);
    const idx = (py * img.width + px) * 4;
    const red = img.data[idx], green = img.data[idx+1], blue = img.data[idx+2];
    rowColors.push({ r: red, g: green, b: blue });

    // Classify
    // Outline: very dark < 35
    // Highlight: red >= 95
    // Shadow: red between 40 and 58
    // Base hair: red between 60 and 85
    // Skin: red > 200
    // Background: purple-ish red > 200, blue > 220
    if (red < 35 && green < 35 && blue < 35) line += '#';
    else if (red >= 95 && red <= 150) line += 'H';
    else if (red >= 40 && red <= 58 && green >= 40 && green <= 58) line += 'S';
    else if (red >= 60 && red <= 85 && green >= 60 && green <= 85) line += 'B';
    else if (red > 220 && green > 200 && blue < 210) line += 'F'; // Face skin
    else line += '.'; // transparent/canvas background
  }
  grid.push(line);
}

console.log('--- EXACT EXTRACTED 26 cols x 18 rows ---');
for (let r = 0; r < rows; r++) {
  console.log(`/* r=${r.toString().padStart(2, ' ')} */ "${grid[r]}",`);
}
