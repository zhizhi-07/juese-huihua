const fs = require('fs');
const { decode } = require('./png.cjs');

const img = decode(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/user-crop.png'));
const step = 166 / 26;
const x0 = 11;
const y0 = 8;

const rows = 18;
const cols = 26;

// Precise classifier based on measured RGB
function classify(r, g, b) {
  // Outline of hair or body:
  if (r < 30 && g < 30 && b < 30) return '#'; // Outline
  // Hair highlight:
  if (r >= 95 && r <= 130 && g >= 95 && g <= 130) return 'H';
  // Hair base:
  if (r >= 65 && r <= 80 && g >= 65 && g <= 80 && b >= 72 && b <= 88) return 'B';
  // Hair shadow:
  if (r >= 45 && r <= 60 && g >= 45 && g <= 60 && b >= 50 && b <= 65) return 'S';
  // Body dark outline:
  if (r >= 40 && r <= 55 && g >= 55 && g <= 68 && b >= 55 && b <= 68) return 'o'; // body outline
  // Skin / face:
  if (r >= 220 && g >= 190 && b >= 170) return '.'; // skin / face
  return ' '; // background
}

const matrix = [];
for (let r = 0; r < rows; r++) {
  let line = '';
  for (let c = 0; c < cols; c++) {
    const px = Math.round(x0 + (c + 0.5) * step);
    const py = Math.round(y0 + (r + 0.5) * step);
    const idx = (py * img.width + px) * 4;
    line += classify(img.data[idx], img.data[idx+1], img.data[idx+2]);
  }
  matrix.push(line);
  console.log(`/* ${r.toString().padStart(2, ' ')} */ "${line}",`);
}
