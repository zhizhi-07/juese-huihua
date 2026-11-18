const fs = require('fs');
const path = require('path');
const { decode } = require('../../scripts/png.cjs');

const project = JSON.parse(fs.readFileSync(process.env.PROJECT ? path.join(__dirname, process.env.PROJECT) : path.join(__dirname, 'main.json'), 'utf8'));
const decodeURL = url => decode(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));

const args = process.argv.slice(2);
const si = +args[0], ai = +args[1], fi = +args[2];
const mode = args[3] || 'all';

function composite(si, ai, fi, filter) {
  const fr = project.spriteSheets[si].actions[ai].frames[fi];
  const w = fr.width, h = fr.height;
  const out = new Uint8Array(w * h * 4);
  const names = [];
  project.layers.forEach(l => {
    if (l.sheetIndex !== si || l.isGroup || l.visible === false) return;
    if (filter && !filter(l)) return;
    const fd = l.frameData[`${si}_${ai}_${fi}`];
    if (!fd) return;
    const im = decodeURL(fd.dataURL);
    if (im.width !== w || im.height !== h) return;
    let painted = 0;
    for (let i = 0; i < w * h; i++) {
      if (!im.data[i * 4 + 3]) continue;
      out[i * 4] = im.data[i * 4]; out[i * 4 + 1] = im.data[i * 4 + 1]; out[i * 4 + 2] = im.data[i * 4 + 2]; out[i * 4 + 3] = 255;
      painted++;
    }
    if (painted) names.push(l.name);
  });
  return { w, h, data: out, names };
}

let filter = null;
if (mode === 'base') filter = l => !/服装|头发/.test(l.name);
if (mode === 'skin') filter = l => /^(body|head|hand)/.test(l.name);
const im = composite(si, ai, fi, filter);
console.log(`sheet ${si} action ${ai} frame ${fi} size ${im.w}x${im.h} layers: ${im.names.join(' | ')}`);

const legend = new Map();
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
let header = '    ';
for (let x = 0; x < im.w; x++) header += (x % 10);
console.log(header);
for (let y = 0; y < im.h; y++) {
  let line = String(y).padStart(3, ' ') + ' ';
  for (let x = 0; x < im.w; x++) {
    const i = (y * im.w + x) * 4;
    if (!im.data[i + 3]) { line += '.'; continue; }
    const hex = Buffer.from(im.data.slice(i, i + 3)).toString('hex');
    if (!legend.has(hex)) legend.set(hex, chars[legend.size]);
    line += legend.get(hex);
  }
  console.log(line);
}
console.log('legend:');
for (const [hex, ch] of legend) console.log(' ', ch, '#' + hex.toUpperCase());

// palette colors per layer to know what the base uses
console.log('palette:', project.palette.map(c => `#${Buffer.from([c.r, c.g, c.b]).toString('hex')}${c.name ? '(' + c.name + ')' : ''}`).join(' '));
