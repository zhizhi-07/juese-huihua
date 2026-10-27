const fs = require('fs');
const { decode, encode } = require('./png.cjs');

const img = decode(fs.readFileSync('C:/Users/Administrator/.gemini/antigravity/brain/59af9401-00f1-46a5-9ede-114221b8c142/.user_uploaded/media_1793068613943_e11faad7.png'));

// Crop the canvas viewport where character is
// x: 400..600, y: 200..450
const cropX = 410, cropY = 210, cropW = 190, cropH = 220;
const cropped = new Uint8Array(cropW * cropH * 4);

for (let y = 0; y < cropH; y++) {
  for (let x = 0; x < cropW; x++) {
    const srcIdx = ((cropY + y) * img.width + (cropX + x)) * 4;
    const dstIdx = (y * cropW + x) * 4;
    cropped[dstIdx] = img.data[srcIdx];
    cropped[dstIdx+1] = img.data[srcIdx+1];
    cropped[dstIdx+2] = img.data[srcIdx+2];
    cropped[dstIdx+3] = 255;
  }
}

fs.writeFileSync('自检记录/炭黑双丸子发型-20261027/user-crop.png', encode(cropW, cropH, cropped));
console.log('Saved user canvas crop to user-crop.png');
