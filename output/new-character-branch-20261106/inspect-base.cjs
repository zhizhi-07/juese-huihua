const fs = require('fs');
const path = require('path');
const { decode, encode } = require('../../scripts/png.cjs');

const dir = __dirname;
const project = JSON.parse(fs.readFileSync(path.join(dir, 'main.json'), 'utf8'));
const decodeURL = url => decode(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));

function layerPixel(project, li, key) {
  const fd = project.layers[li].frameData[key];
  return fd ? decodeURL(fd.dataURL) : null;
}

function composite(si, ai, fi, skip) {
  const sheet = project.spriteSheets[si];
  const fr = sheet.actions[ai].frames[fi];
  const w = fr.width, h = fr.height;
  const out = new Uint8Array(w * h * 4);
  const parts = [];
  project.layers.forEach((l, li) => {
    if (l.sheetIndex !== si) return;
    if (l.isGroup || l.visible === false) return;
    if (skip && skip(l, li)) return;
    const im = layerPixel(project, li, `${si}_${ai}_${fi}`);
    if (!im || im.width !== w || im.height !== h) return;
    parts.push(l.name);
    for (let i = 0; i < w * h; i++) {
      if (!im.data[i * 4 + 3]) continue;
      out[i * 4] = im.data[i * 4];
      out[i * 4 + 1] = im.data[i * 4 + 1];
      out[i * 4 + 2] = im.data[i * 4 + 2];
      out[i * 4 + 3] = 255;
    }
  });
  return { w, h, data: out, parts };
}

function scale(src, s) {
  const out = new Uint8Array(src.w * s * src.h * s * 4);
  for (let y = 0; y < src.h * s; y++) {
    for (let x = 0; x < src.w * s; x++) {
      const i = (Math.floor(y / s) * src.w + Math.floor(x / s)) * 4;
      const j = (y * src.w * s + x) * 4;
      out[j] = src.data[i]; out[j + 1] = src.data[i + 1]; out[j + 2] = src.data[i + 2]; out[j + 3] = src.data[i + 3];
    }
  }
  return { w: src.w * s, h: src.h * s, data: out };
}

function bounds(im) {
  let x0 = im.w, y0 = im.h, x1 = -1, y1 = -1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    if (!im.data[(y * im.w + x) * 4 + 3]) continue;
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const sheetInfo = [];
project.spriteSheets.forEach((s, si) => {
  s.actions.forEach((a, ai) => {
    a.frames.forEach((f, fi) => {
      const comp = composite(si, ai, fi);
      sheetInfo.push({ si, ai, fi, name: s.name, dir: a.direction, w: f.width, h: f.height, parts: comp.parts, bb: bounds(comp) });
    });
  });
});
console.log(JSON.stringify(sheetInfo, null, 1));

// Contact sheet: idle 3 dirs x 4 frames, walk, pickup, sit
const S = 10;
const pad = 8;
const cols = Math.max(...project.spriteSheets.map(s => Math.max(...s.actions.map(a => a.frames.length))));
const maxW = 25, maxH = 22;
const cellW = maxW * S + pad, cellH = maxH * S + pad;
const rows = project.spriteSheets.reduce((n, s) => n + s.actions.length, 0);
const W = cols * cellW + pad, H = rows * cellH + pad;
const canvas = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { canvas[i * 4] = 216; canvas[i * 4 + 1] = 225; canvas[i * 4 + 2] = 221; canvas[i * 4 + 3] = 255; }
let row = 0;
project.spriteSheets.forEach((s, si) => {
  s.actions.forEach((a, ai) => {
    const y0 = pad + row * cellH;
    a.frames.forEach((f, fi) => {
      const comp = composite(si, ai, fi);
      const big = scale(comp, S);
      const x0 = pad + fi * cellW + Math.floor((maxW - comp.w) / 2) * S;
      for (let y = 0; y < big.h; y++) for (let x = 0; x < big.w; x++) {
        const i = (y * big.w + x) * 4;
        if (!big.data[i + 3]) continue;
        const j = ((y0 + y) * W + x0 + x) * 4;
        canvas[j] = big.data[i]; canvas[j + 1] = big.data[i + 1]; canvas[j + 2] = big.data[i + 2]; canvas[j + 3] = 255;
      }
    });
    row++;
  });
});
fs.writeFileSync(path.join(dir, 'base-contact.png'), encode(W, H, canvas));
console.log('contact', W, H);
