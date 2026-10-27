/**
 * Print a PNG as a 2x nearest-neighbour ASCII picture, the way a player sees
 * the sprite in game (one art pixel becomes a 2x2 block).
 * Usage: node scripts/ascii2x.cjs <file.png>
 */
const fs = require('fs');
const path = require('path');
const { decode } = require(path.join(__dirname, 'png.cjs'));

const file = process.argv[2];
const img = decode(fs.readFileSync(file));
const ramp = ' .:-=+*#%@';
const ch = (x, y) => {
  const i = (y * img.width + x) * 4;
  const a = img.data[i + 3];
  if (!a) return ' ';
  const lum = (img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114) / 255;
  return ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(lum * (ramp.length - 1))))];
};

console.log(`${file}  ${img.width}x${img.height}  shown at 2x (${img.width * 2}x${img.height * 2})`);
for (let y = 0; y < img.height; y++) {
  let line = '';
  for (let x = 0; x < img.width; x++) line += ch(x, y) + ch(x, y);
  console.log(line);
  console.log(line);
}
