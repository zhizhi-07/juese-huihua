const fs = require('fs');
const { decode, encode } = require('./png.cjs');

const img = decode(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/user-crop.png'));
// Find grid lines
// In user-crop.png, let's find the grid lines that separate the pixel cells
// Grid lines are faint purple/grey lines
// Let's analyze vertical and horizontal lines
console.log('User crop size:', img.width, 'x', img.height);

// Let's find vertical lines with constant color
const colDiffs = [];
for (let x = 1; x < img.width; x++) {
  let diff = 0;
  for (let y = 0; y < img.height; y++) {
    const idx1 = (y * img.width + x) * 4;
    const idx0 = (y * img.width + x - 1) * 4;
    diff += Math.abs(img.data[idx1] - img.data[idx0]) +
            Math.abs(img.data[idx1+1] - img.data[idx0+1]) +
            Math.abs(img.data[idx1+2] - img.data[idx0+2]);
  }
  colDiffs.push({ x, diff });
}
const sortedCols = [...colDiffs].sort((a,b) => b.diff - a.diff);
console.log('Top vertical transitions:', sortedCols.slice(0, 20).map(c => c.x).sort((a,b) => a - b));
