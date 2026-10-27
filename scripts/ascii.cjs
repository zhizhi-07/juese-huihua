/**
 * Render a PNG as a luminance ASCII picture so the silhouette and the shading
 * structure can be inspected in a terminal.
 * Usage: node scripts/ascii.cjs <file.png> [columns]
 */
const fs = require('fs');
const path = require('path');
const { decode } = require(path.join(__dirname, 'png.cjs'));

const [file, colsArg] = process.argv.slice(2);
const img = decode(fs.readFileSync(file));
const cols = Math.min(Number(colsArg || img.width), img.width);
const step = img.width / cols;
const ramp = ' .:-=+*#%@';

console.log(`${file}  ${img.width}x${img.height}  cols=${cols}`);
for (let y = 0; y < img.height; y++) {
  let line = '';
  for (let c = 0; c < cols; c++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = y; sy < Math.min(y + 1, img.height); sy++) {
      for (let sx = Math.floor(c * step); sx < Math.floor((c + 1) * step); sx++) {
        const i = (sy * img.width + sx) * 4;
        const al = img.data[i + 3] / 255;
        r += img.data[i] * al; g += img.data[i + 1] * al; b += img.data[i + 2] * al;
        a += al; n++;
      }
    }
    if (!a) { line += ' '; continue; }
    const lum = (r / a * 0.299 + g / a * 0.587 + b / a * 0.114) / 255;
    line += ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(lum * (ramp.length - 1))))];
  }
  console.log(String(y).padStart(2) + '|' + line + '|');
}
