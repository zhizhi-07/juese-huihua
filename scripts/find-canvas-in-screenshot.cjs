const fs = require('fs');
const { decode, encode } = require('./png.cjs');

const img = decode(fs.readFileSync('C:/Users/Administrator/.gemini/antigravity/brain/59af9401-00f1-46a5-9ede-114221b8c142/.user_uploaded/media_1793068613943_e11faad7.png'));

// The canvas grid is visible in the center
// Let's find dark pixels corresponding to character outline inside the main canvas viewport
let minX = 1024, maxX = 0, minY = 575, maxY = 0;
for (let y = 150; y < 450; y++) {
  for (let x = 300; x < 700; x++) {
    const idx = (y * 1024 + x) * 4;
    const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
    if (r < 30 && g < 30 && b < 30) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
}
console.log(`Character in canvas: x in [${minX}, ${maxX}] (w=${maxX-minX+1}), y in [${minY}, ${maxY}] (h=${maxY-minY+1})`);
