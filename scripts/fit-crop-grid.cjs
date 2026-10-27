const fs = require('fs');
const { decode, encode } = require('./png.cjs');

const img = decode(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/user-crop.png'));

// Search step from 6.0 to 6.6 with 0.01 increment
// Search x0 from 0 to 15, y0 from 0 to 15
// In the crop, the bottom edge of character body outline is visible at the bottom
// Let's find horizontal edges and vertical edges:
const horizEdges = new Float64Array(img.height);
const vertEdges = new Float64Array(img.width);

for (let y = 5; y < img.height - 5; y++) {
  for (let x = 5; x < img.width - 5; x++) {
    const idx = (y * img.width + x) * 4;
    const idxR = (y * img.width + x + 1) * 4;
    const idxD = ((y + 1) * img.width + x) * 4;
    const diffX = Math.abs(img.data[idx] - img.data[idxR]) + Math.abs(img.data[idx+1] - img.data[idxR+1]) + Math.abs(img.data[idx+2] - img.data[idxR+2]);
    const diffY = Math.abs(img.data[idx] - img.data[idxD]) + Math.abs(img.data[idx+1] - img.data[idxD+1]) + Math.abs(img.data[idx+2] - img.data[idxD+2]);
    vertEdges[x] += diffX;
    horizEdges[y] += diffY;
  }
}

let bestStep = 0, bestX0 = 0, bestY0 = 0, maxScore = 0;
for (let step = 6.2; step <= 6.5; step += 0.01) {
  for (let x0 = 0; x0 < step; x0 += 0.2) {
    let scoreX = 0;
    for (let c = 0; c < 32; c++) {
      const x = Math.round(x0 + c * step);
      if (x >= 0 && x < img.width) scoreX += vertEdges[x];
    }
    for (let y0 = 0; y0 < step; y0 += 0.2) {
      let scoreY = 0;
      for (let r = 0; r < 32; r++) {
        const y = Math.round(y0 + r * step);
        if (y >= 0 && y < img.height) scoreY += horizEdges[y];
      }
      if (scoreX + scoreY > maxScore) {
        maxScore = scoreX + scoreY;
        bestStep = step; bestX0 = x0; bestY0 = y0;
      }
    }
  }
}

console.log(`Fitted grid: step=${bestStep.toFixed(3)}, x0=${bestX0.toFixed(2)}, y0=${bestY0.toFixed(2)}`);

// Let's sample a 32x32 array
const W = 32, H = 32;
// Find which column corresponds to character mid (around 16)
// Let's sample centers of cells
// We know feet are at bottom, head at top
