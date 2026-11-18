const fs = require('fs');
const path = require('path');
const { decode, encode } = require('../../scripts/png.cjs');

const project = JSON.parse(fs.readFileSync(path.join(__dirname, 'main.json'), 'utf8'));
const decodeURL = url => decode(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));

function composite(si, ai, fi, filter) {
  const fr = project.spriteSheets[si].actions[ai].frames[fi];
  const w = fr.width, h = fr.height;
  const out = new Uint8Array(w * h * 4);
  project.layers.forEach((l, li) => {
    if (l.sheetIndex !== si || l.isGroup || l.visible === false) return;
    if (filter && !filter(l, li)) return;
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

function scale(src, s) {
  const out = new Uint8Array(src.w * s * src.h * s * 4);
  for (let y = 0; y < src.h * s; y++) for (let x = 0; x < src.w * s; x++) {
    const i = (Math.floor(y / s) * src.w + Math.floor(x / s)) * 4;
    const j = (y * src.w * s + x) * 4;
    out[j] = src.data[i]; out[j + 1] = src.data[i + 1]; out[j + 2] = src.data[i + 2]; out[j + 3] = src.data[i + 3];
  }
  return { w: src.w * s, h: src.h * s, data: out };
}

const args = process.argv.slice(2);
const only = args[0] === 'all' ? null : { si: +args[0], ai: +args[1], fi: +args[2], s: +(args[3] || 12) };
const skipClothes = args[4] === 'base';

function save(name, imgs, s) {
  const cellW = Math.max(...imgs.map(i => i.w)) * s;
  const cellH = Math.max(...imgs.map(i => i.h)) * s;
  const W = cellW * imgs.length;
  const canvas = new Uint8Array(W * cellH * 4);
  for (let i = 0; i < W * cellH; i++) { canvas[i * 4] = 232; canvas[i * 4 + 1] = 236; canvas[i * 4 + 2] = 240; canvas[i * 4 + 3] = 255; }
  imgs.forEach((im, k) => {
    const big = scale(im, s);
    for (let y = 0; y < big.h; y++) for (let x = 0; x < big.w; x++) {
      const i = (y * big.w + x) * 4;
      if (!big.data[i + 3]) continue;
      const j = (y * W + k * cellW + x) * 4;
      canvas[j] = big.data[i]; canvas[j + 1] = big.data[i + 1]; canvas[j + 2] = big.data[i + 2]; canvas[j + 3] = 255;
    }
  });
  fs.writeFileSync(path.join(__dirname, name), encode(W, cellH, canvas));
  console.log(name, W, cellH);
}

if (only) {
  const filter = skipClothes ? (l) => !/服装/.test(l.name) : null;
  save(`view-${only.si}-${only.ai}-${only.fi}${skipClothes ? '-base' : ''}.png`, [composite(only.si, only.ai, only.fi, filter)], only.s);
} else {
  // idle: 3 dirs x 4 frames, base only (no hair/clothes) to study the body
  for (const si of [1]) {
    const imgs = [];
    for (let ai = 0; ai < 3; ai++) for (let fi = 0; fi < 4; fi++) imgs.push(composite(si, ai, fi, l => !/服装/.test(l.name)));
    save(`idle-base-${si}.png`, imgs, 8);
  }
}
