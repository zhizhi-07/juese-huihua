const fs = require('fs');
const { decode } = require('./png.cjs');

const img = decode(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/user-crop.png'));
const step = 166 / 26;
const x0 = 11;
const y0 = 8;

console.log('--- DETAILED RGB VALUES FOR ROWS 10 TO 18 ---');
for (let r = 10; r <= 18; r++) {
  const rowVals = [];
  for (let c = 0; c < 26; c++) {
    const px = Math.round(x0 + (c + 0.5) * step);
    const py = Math.round(y0 + (r + 0.5) * step);
    const idx = (py * img.width + px) * 4;
    const red = img.data[idx], green = img.data[idx+1], blue = img.data[idx+2];
    rowVals.push(`c${c}:[${red},${green},${blue}]`);
  }
  // Print first 6 cols and last 6 cols
  console.log(`Row ${r}: ` + rowVals.slice(0, 5).join(' ') + ' ... ' + rowVals.slice(21).join(' '));
}
