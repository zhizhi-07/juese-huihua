/**
 * Report the colour runs of each row of a PNG so the structure can be read as
 * "x..x colour" spans instead of counting characters in an ASCII grid.
 * Usage: node scripts/runs.cjs <file.png> [x0] [x1] [y0] [y1]
 */
const fs = require('fs');
const path = require('path');
const { decode } = require(path.join(__dirname, 'png.cjs'));

const [file, x0 = 0, x1 = 999, y0 = 0, y1 = 999] = process.argv.slice(2);
const img = decode(fs.readFileSync(file));
const X0 = Number(x0), X1 = Math.min(Number(x1), img.width - 1);
const Y0 = Number(y0), Y1 = Math.min(Number(y1), img.height - 1);

for (let y = Y0; y <= Y1; y++) {
  const runs = [];
  let cur = null;
  for (let x = X0; x <= X1; x++) {
    const i = (y * img.width + x) * 4;
    const a = img.data[i + 3];
    const key = a === 0 ? '.' : `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`;
    if (!cur || cur.key !== key) { cur = { key, x0: x, x1: x }; runs.push(cur); }
    else cur.x1 = x;
  }
  console.log(`y=${String(y).padStart(2)} ` + runs.map(r =>
    `${r.key === '.' ? '空' : r.key.replace(/,/g, '/')}[${r.x0}-${r.x1}]`).join(' '));
}
