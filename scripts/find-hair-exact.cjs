const fs = require('fs');
const { decode, encode } = require('./png.cjs');

const img = decode(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/user-crop.png'));

// Let's locate the canvas exactly in user-crop.png:
// Notice: in the editor, the canvas has a border or the background has purple grid lines.
// Inside the character, the pixels are solid:
// Outline: dark grey / black (rgb ~ [25..35, 25..35, 25..35])
// Base hair: rgb ~ [70, 69, 77]
// Hair highlight: rgb ~ [100..120, 100..120, 110..130]
// Hair shadow: rgb ~ [50, 49, 57]
// Skin: rgb ~ [254, 237, 225]
// Background: light purple grid ~ [210..225, 205..220, 230..245]

// Let's print out every single row where hair appears!
// Let's find the exact width and height of each pixel block.
// Look at the character width:
// Leftmost outline of bun is at some x.
// Rightmost outline of bun is at some x.
// In user-crop.png, let's find all x coords where r < 40:
console.log('--- FINDING BOUNDS OF HAIR IN USER CROP ---');
let minX = 999, maxX = 0, minY = 999, maxY = 0;
for (let y = 0; y < 150; y++) {
  for (let x = 0; x < img.width; x++) {
    const idx = (y * img.width + x) * 4;
    const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
    if (r < 80 && g < 80 && b < 85 && (r > 60 || r < 40)) { // hair base or outline
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
}
console.log(`Hair bbox in user crop: x in [${minX}, ${maxX}] (w=${maxX-minX+1}), y in [${minY}, ${maxY}] (h=${maxY-minY+1})`);
