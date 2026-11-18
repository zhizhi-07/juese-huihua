const fs = require('fs');
const path = require('path');
const { decode } = require('../../scripts/png.cjs');
const project = JSON.parse(fs.readFileSync(path.join(__dirname, 'main.json'), 'utf8'));
const decodeURL = url => decode(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
const args = process.argv.slice(2);
const si = +args[0], ai = +args[1], fi = +args[2];

if (args[3] === 'tree') {
  project.spriteSheets.forEach((s, i) => {
    console.log(`sheet ${i} ${s.name} ${s.frameWidth}x${s.frameHeight} actions ${s.actions.map(a => a.direction + ':' + a.frames.length).join(',')}`);
    console.log('   frame sizes', s.actions.map(a => a.direction + '=' + [...new Set(a.frames.map(f => f.width + 'x' + f.height))].join('|')).join('  '));
  });
  project.layers.forEach((l, i) => {
    console.log(i, 'sheet', l.sheetIndex, l.isGroup ? 'GROUP' : 'layer', 'parent', l.parent, 'vis', l.visible, 'ref', l.referenceOnly ? 1 : 0, JSON.stringify(l.name), 'frames', Object.keys(l.frameData || {}).length);
  });
  process.exit(0);
}

const fr = project.spriteSheets[si].actions[ai].frames[fi];
console.log(`frame ${si}/${ai}/${fi} ${fr.width}x${fr.height}`);
project.layers.forEach((l, i) => {
  if (l.sheetIndex !== si || l.isGroup) return;
  const fd = l.frameData[`${si}_${ai}_${fi}`];
  if (!fd) return;
  const im = decodeURL(fd.dataURL);
  let painted = 0, x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  const colors = new Map();
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const i4 = (y * im.width + x) * 4;
    if (!im.data[i4 + 3]) continue;
    painted++;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    const hex = Buffer.from(im.data.slice(i4, i4 + 3)).toString('hex');
    colors.set(hex, (colors.get(hex) || 0) + 1);
  }
  console.log(i, `"${l.name}"`, 'parent', l.parent, 'vis', l.visible, 'px', painted, painted ? `bbox ${x0},${y0}-${x1},${y1}` : '', 'colors', [...colors].map(([h, n]) => h + ':' + n).join(' '));
});

const only = args[4];
project.layers.forEach((l, i) => {
  if (l.sheetIndex !== si || l.isGroup) return;
  if (only != null && String(i) !== only) return;
  const fd = l.frameData[`${si}_${ai}_${fi}`];
  if (!fd) return;
  const im = decodeURL(fd.dataURL);
  let painted = 0;
  for (let k = 0; k < im.width * im.height; k++) if (im.data[k * 4 + 3]) painted++;
  if (!painted) return;
  console.log(`--- ${i} ${l.name} ---`);
  const legend = new Map(); const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let header = '    '; for (let x = 0; x < im.width; x++) header += (x % 10); console.log(header);
  for (let y = 0; y < im.height; y++) {
    let line = String(y).padStart(3, ' ') + ' ';
    for (let x = 0; x < im.width; x++) {
      const i4 = (y * im.width + x) * 4;
      if (!im.data[i4 + 3]) { line += '.'; continue; }
      const hex = Buffer.from(im.data.slice(i4, i4 + 3)).toString('hex');
      if (!legend.has(hex)) legend.set(hex, chars[legend.size]);
      line += legend.get(hex);
    }
    console.log(line);
  }
  console.log('  legend ' + [...legend].map(([h, c]) => c + '=#' + h.toUpperCase()).join(' '));
});
