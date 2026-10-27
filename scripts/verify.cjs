/**
 * Self-check for a transparent pixel-art PNG: bounding box, stray pixels,
 * holes, semi-transparent pixels and colour count.
 * Usage: node scripts/verify.cjs <file.png>
 */
const fs = require('fs');
const path = require('path');
const { decode } = require(path.join(__dirname, 'png.cjs'));

const file = process.argv[2];
const img = decode(fs.readFileSync(file));
const at = (x, y) => {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return 0;
  return img.data[(y * img.width + x) * 4 + 3];
};
const rgb = (x, y) => {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};

let minX = img.width, minY = img.height, maxX = -1, maxY = -1, opaque = 0, semi = 0;
const colors = new Map();
for (let y = 0; y < img.height; y++) {
  for (let x = 0; x < img.width; x++) {
    const a = at(x, y);
    if (!a) continue;
    if (a < 255) semi++;
    else opaque++;
    const key = rgb(x, y).join(',');
    colors.set(key, (colors.get(key) || 0) + 1);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
}

// stray pixels: opaque pixel whose 4 neighbours are all transparent
const stray = [];
for (let y = 0; y < img.height; y++) {
  for (let x = 0; x < img.width; x++) {
    if (!at(x, y)) continue;
    if (!at(x - 1, y) && !at(x + 1, y) && !at(x, y - 1) && !at(x, y + 1)) {
      stray.push([x, y, rgb(x, y).join(',')]);
    }
  }
}

// holes: transparent pixel fully surrounded by opaque pixels
const holes = [];
for (let y = 1; y < img.height - 1; y++) {
  for (let x = 1; x < img.width - 1; x++) {
    if (at(x, y)) continue;
    if (at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1)) holes.push([x, y]);
  }
}

console.log(`file      ${file}`);
console.log(`size      ${img.width}x${img.height}`);
console.log(`bbox      x ${minX}-${maxX}  y ${minY}-${maxY}  (${maxX - minX + 1}x${maxY - minY + 1})`);
console.log(`opaque    ${opaque}   semi-transparent ${semi}   transparent ${img.width * img.height - opaque - semi}`);
console.log(`colors    ${colors.size}`);
console.log(`stray     ${stray.length}${stray.length ? ' -> ' + stray.map(s => `(${s[0]},${s[1]})=${s[2]}`).join(' ') : ''}`);
console.log(`holes     ${holes.length}${holes.length ? ' -> ' + holes.map(h => `(${h[0]},${h[1]})`).join(' ') : ''}`);

console.log('top colors: ' + [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  .map(([k, c]) => `${k}x${c}`).join('  '));
