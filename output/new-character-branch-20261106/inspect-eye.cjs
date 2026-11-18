/* 检查某一帧里眼睛被哪个图层挡住 */
const fs = require('fs');
const path = require('path');
const { decode } = require('../../scripts/png.cjs');
const dir = __dirname;
const project = JSON.parse(fs.readFileSync(path.join(dir, 'saved-branch.json'), 'utf8'));
const dec = u => decode(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
const [si, ai, fi] = process.argv.slice(2, 5).map(Number);

const frame = project.spriteSheets[si].actions[ai].frames[fi];
const key = `${si}_${ai}_${fi}`;
console.log('frame', si, ai, fi, frame.width + 'x' + frame.height);
const at = (x, y) => {
  let color = null, owner = null;
  project.layers.forEach(l => {
    if (l.isGroup || l.sheetIndex !== si || l.visible === false) return;
    const fd = l.frameData[key];
    if (!fd) return;
    const im = dec(fd.dataURL);
    const p = fd.placement || { x: 0, y: 0, w: im.width, h: im.height };
    if (x < p.x || y < p.y || x >= p.x + p.w || y >= p.y + p.h) return;
    const sx = Math.min(im.width - 1, Math.floor((x - p.x) * im.width / p.w));
    const sy = Math.min(im.height - 1, Math.floor((y - p.y) * im.height / p.h));
    if (!im.data[(sy * im.width + sx) * 4 + 3]) return;
    color = '#' + Buffer.from(im.data.slice((sy * im.width + sx) * 4, (sy * im.width + sx) * 4 + 3)).toString('hex').toUpperCase();
    owner = l.name;
  });
  return { color, owner };
};

const eye = project.layers.find(l => l.name === '眼睛' && l.sheetIndex === si && l.frameData[key]);
if (!eye) { console.log('该帧没有眼睛'); process.exit(0); }
const im = dec(eye.frameData[key].dataURL);
for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
  const i = (y * im.width + x) * 4;
  if (!im.data[i + 3]) continue;
  const hex = '#' + Buffer.from(im.data.slice(i, i + 3)).toString('hex').toUpperCase();
  const got = at(x, y);
  console.log(`eye(${x},${y}) ${hex} -> ${got.color} by ${got.owner}`, hex === got.color ? 'OK' : 'HIDDEN');
}
// 头部包围盒
const head = project.layers.find(l => l.name === 'head' && l.sheetIndex === si && l.frameData[key] && project.layers[l.parent]?.name === project.spriteSheets[si].actions[ai].direction);
const him = dec(head.frameData[key].dataURL);
let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
for (let y = 0; y < him.height; y++) for (let x = 0; x < him.width; x++) {
  if (!him.data[(y * him.width + x) * 4 + 3]) continue;
  x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
}
console.log('head bbox', x0, y0, x1, y1, 'placement', head.frameData[key].placement || null, 'size', him.width + 'x' + him.height);
