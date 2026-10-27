/**
 * Dump a rectangular region of a PNG as a full-resolution character grid.
 * Usage: node scripts/crop.cjs <file.png> <x> <y> <w> <h>
 */
const fs = require('fs');
const path = require('path');
const { decode } = require(path.join(__dirname, 'png.cjs'));

const [file, x0, y0, w, h] = process.argv.slice(2);
const img = decode(fs.readFileSync(file));
const X = parseInt(x0), Y = parseInt(y0), W = parseInt(w), H = parseInt(h);

const counts = new Map();
for (let y = Y; y < Y + H; y++) {
  for (let x = X; x < X + W; x++) {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
    const i = (y * img.width + x) * 4;
    if (img.data[i + 3] === 0) continue;
    const key = [img.data[i], img.data[i + 1], img.data[i + 2]].join(',');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}
const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
const chars = '123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const map = new Map();
sorted.forEach(([k], i) => map.set(k, chars[i] || '?'));
console.log(`${file} region ${X},${Y} ${W}x${H}`);
console.log('palette: ' + sorted.map(([k, c], i) => `${chars[i]}=rgb(${k})x${c}`).join(' '));

console.log('     ' + Array.from({ length: W }, (_, i) => ((X + i) % 10 === 0 ? String(((X + i) / 10) % 10) : ' ')).join(''));
for (let y = Y; y < Y + H; y++) {
  let line = '';
  for (let x = X; x < X + W; x++) {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) { line += ' '; continue; }
    const i = (y * img.width + x) * 4;
    if (img.data[i + 3] === 0) { line += '.'; continue; }
    const key = [img.data[i], img.data[i + 1], img.data[i + 2]].join(',');
    line += map.get(key);
  }
  console.log(String(y).padStart(4, ' ') + '|' + line + '|');
}
