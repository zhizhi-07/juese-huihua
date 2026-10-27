/**
 * Dump a PNG as a character grid (one char per pixel or per block) to inspect structure.
 * Usage: node scripts/dump.cjs <file.png> [blockSize]
 */
const fs = require('fs');
const path = require('path');
const { decode } = require(path.join(__dirname, 'png.cjs'));

const file = process.argv[2];
const block = Math.max(1, parseInt(process.argv[3] || '1', 10));
const img = decode(fs.readFileSync(file));

const counts = new Map();
for (let i = 0; i < img.width * img.height; i++) {
  const a = img.data[i * 4 + 3];
  if (a === 0) continue;
  const key = [img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]].join(',');
  counts.set(key, (counts.get(key) || 0) + 1);
}
const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
const chars = '123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+=?<>~';
const map = new Map();
sorted.forEach(([key], i) => map.set(key, chars[i] || '?'));

console.log(`${file}  ${img.width}x${img.height}  block=${block}  opaqueColors=${sorted.length}`);
console.log('palette: ' + sorted.map(([k, c], i) => `${chars[i]}=rgb(${k})x${c}`).join(' '));

const bw = Math.ceil(img.width / block), bh = Math.ceil(img.height / block);
for (let by = 0; by < bh; by++) {
  let line = '';
  for (let bx = 0; bx < bw; bx++) {
    // pick the most frequent opaque color in the block
    const local = new Map();
    for (let y = by * block; y < Math.min((by + 1) * block, img.height); y++) {
      for (let x = bx * block; x < Math.min((bx + 1) * block, img.width); x++) {
        const i = (y * img.width + x) * 4;
        if (img.data[i + 3] === 0) continue;
        const key = [img.data[i], img.data[i + 1], img.data[i + 2]].join(',');
        local.set(key, (local.get(key) || 0) + 1);
      }
    }
    if (!local.size) { line += '.'; continue; }
    let best = null, bestN = -1;
    for (const [k, n] of local) if (n > bestN) { best = k; bestN = n; }
    line += map.get(best);
  }
  console.log(String(by).padStart(3, ' ') + '|' + line + '|');
}
console.log('    ' + Array.from({ length: bw }, (_, i) => (i % 10 === 0 ? String((i * block) / 10 % 10) : ' ')).join(''));
