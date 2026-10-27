/**
 * Dump a PNG downscaled by an integer factor (nearest) as a char grid.
 * Usage: node scripts/dumpn.cjs <file.png> [factor]
 */
const fs = require('fs');
const path = require('path');
const { decode } = require(path.join(__dirname, 'png.cjs'));

const [file, factorArg] = process.argv.slice(2);
const f = Math.max(1, parseInt(factorArg || '1', 10));
const img = decode(fs.readFileSync(file));
const w = Math.floor(img.width / f), h = Math.floor(img.height / f);

const counts = new Map();
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = ((y * f) * img.width + x * f) * 4;
    if (img.data[i + 3] === 0) continue;
    const key = [img.data[i], img.data[i + 1], img.data[i + 2]].join(',');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}
const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
const chars = '123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const map = new Map();
sorted.forEach(([k], i) => map.set(k, chars[i] || '?'));
console.log(`${file} /${f} => ${w}x${h}`);
console.log('palette: ' + sorted.map(([k, c], i) => `${chars[i]}=rgb(${k})x${c}`).join(' '));
for (let y = 0; y < h; y++) {
  let line = '';
  for (let x = 0; x < w; x++) {
    const i = ((y * f) * img.width + x * f) * 4;
    if (img.data[i + 3] === 0) { line += '.'; continue; }
    line += map.get([img.data[i], img.data[i + 1], img.data[i + 2]].join(','));
  }
  console.log(String(y).padStart(4, ' ') + '|' + line + '|');
}
