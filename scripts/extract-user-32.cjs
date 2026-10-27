const fs = require('fs');
const { decode, encode } = require('./png.cjs');

const img = decode(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/user-crop.png'));
const step = 6.400;
const x0 = 3.40;
const y0 = 0.80;

// The character in 32x32 coordinates:
// Notice: in our 32x32 character, x ranges from 0 to 31, y from 0 to 31.
// Let's find exact column and row offsets:
// In our character, feet bottom is at y=30 or 31.
// In sampled r=32 is feet bottom. So row 1 in sample corresponds to y=0 or y=1 in canvas!
// In sample, mid is between c=14 and c=15 (or c=15 and 16).
// In 32x32, axis is x=16.5.
// Let's check alignment:
// Top bun peaks are at c=4 and c=25 -> (4+25)/2 = 14.5 ? Or c=6 and c=23 -> (6+23)/2 = 14.5.
// If axis is 16.5, then canvasX = c + 2 ! (since 14.5 + 2 = 16.5).
// And row: r=2 is top of cap -> canvasY = r - 1. (Since y=1 was top of cap).

const P_REVERSE = {
  '#': [24, 24, 26, 255],     // Outline #18181a
  'B': [70, 69, 77, 255],     // Base #46454d
  'S': [52, 51, 59, 255],     // Shadow #34333b
  'H': [106, 104, 117, 255],  // Highlight #6a6875
};

const frontPixels = [];
for (let y = 0; y < 32; y++) {
  const row = [];
  for (let x = 0; x < 32; x++) {
    // map (x, y) to sample (c, r): c = x - 2, r = y + 1
    const c = x - 2;
    const r = y + 1;
    const px = Math.round(x0 + (c + 0.5) * step);
    const py = Math.round(y0 + (r + 0.5) * step);
    if (px < 0 || px >= img.width || py < 0 || py >= img.height) {
      row.push('.');
      continue;
    }
    const idx = (py * img.width + px) * 4;
    const red = img.data[idx], green = img.data[idx+1], blue = img.data[idx+2];
    
    // Only hair pixels (y <= 18)
    if (y <= 18) {
      if (red < 40 && green < 40 && blue < 40) row.push('#');
      else if (red >= 90 && red <= 150) row.push('H');
      else if (red >= 40 && red <= 60 && green >= 40 && green <= 60 && blue >= 45 && blue <= 65) row.push('S');
      else if (red >= 60 && red <= 88 && green >= 60 && green <= 88) row.push('B');
      else row.push('.');
    } else {
      row.push('.');
    }
  }
  frontPixels.push(row);
}

// Print 32x32 front
console.log('--- EXTRACTED USER 32x32 FRONT ---');
for (let y = 0; y < 20; y++) {
  console.log(`/* ${y.toString().padStart(2, ' ')} */ "${frontPixels[y].join('')}",`);
}

fs.writeFileSync('自检记录/炭黑双丸子发型-20261027/user-front-32x32.json', JSON.stringify(frontPixels));
