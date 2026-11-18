const fs = require('fs');
const path = require('path');
const { decode, encode } = require('../../scripts/png.cjs');

const project = JSON.parse(fs.readFileSync(path.join(__dirname, 'main.json'), 'utf8'));
const decodeURL = url => decode(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));

const args = process.argv.slice(2);
const file = args[0] || 'main.json';
const src = file === 'main.json' ? project : JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));

function composite(p, si, ai, fi, filter) {
  const fr = p.spriteSheets[si].actions[ai].frames[fi];
  const w = fr.width, h = fr.height;
  const out = new Uint8Array(w * h * 4);
  p.layers.forEach((l) => {
    if (l.sheetIndex !== si || l.isGroup || l.visible === false) return;
    if (filter && !filter(l)) return;
    const fd = l.frameData[`${si}_${ai}_${fi}`];
    if (!fd) return;
    const im = decodeURL(fd.dataURL);
    if (im.width !== w || im.height !== h) return;
    for (let i = 0; i < w * h; i++) {
      if (!im.data[i * 4 + 3]) continue;
      out[i * 4] = im.data[i * 4]; out[i * 4 + 1] = im.data[i * 4 + 1]; out[i * 4 + 2] = im.data[i * 4 + 2]; out[i * 4 + 3] = 255;
    }
  });
  return { w, h, data: out };
}

function contact(p, scale, bg, filter) {
  const rows = [];
  p.spriteSheets.forEach((sheet, si) => sheet.actions.forEach((a, ai) => rows.push({ si, ai, n: a.frames.length })));
  const maxW = Math.max(...p.spriteSheets.flatMap(s => s.actions.flatMap(a => a.frames.map(f => f.width))));
  const maxH = Math.max(...p.spriteSheets.flatMap(s => s.actions.flatMap(a => a.frames.map(f => f.height))));
  const cols = Math.max(...rows.map(r => r.n));
  const cellW = maxW * scale + 8, cellH = maxH * scale + 8;
  const W = cols * cellW + 8, H = rows.length * cellH + 8;
  const canvas = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    canvas[i * 4] = bg[0]; canvas[i * 4 + 1] = bg[1]; canvas[i * 4 + 2] = bg[2]; canvas[i * 4 + 3] = 255;
  }
  rows.forEach((r, ri) => {
    for (let fi = 0; fi < r.n; fi++) {
      const im = composite(p, r.si, r.ai, fi, filter);
      const x0 = 8 + fi * cellW + Math.floor((maxW - im.w) / 2) * scale;
      const y0 = 8 + ri * cellH;
      for (let y = 0; y < im.h * scale; y++) for (let x = 0; x < im.w * scale; x++) {
        const s = (Math.floor(y / scale) * im.w + Math.floor(x / scale)) * 4;
        if (!im.data[s + 3]) continue;
        const d = ((y0 + y) * W + x0 + x) * 4;
        canvas[d] = im.data[s]; canvas[d + 1] = im.data[s + 1]; canvas[d + 2] = im.data[s + 2]; canvas[d + 3] = 255;
      }
    }
  });
  return encode(W, H, canvas);
}

const scale = +(args[1] || 8);
const mode = args[2] || 'all';
const filter = mode === 'base' ? (l) => !/^(头发|服装|发饰)/.test(l.name) : null;
const out = args[3] || `contact-${mode}.png`;
fs.writeFileSync(path.join(__dirname, out), contact(src, scale, [226, 232, 238], filter));
console.log(out, fs.statSync(path.join(__dirname, out)).size);
