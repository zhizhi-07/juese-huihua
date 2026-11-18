/* 生成素材拆解图：三方向 待机首帧 的 头发 / 衣服 / 合体 对照 */
const fs = require('fs');
const path = require('path');
const { decode, encode } = require('../../scripts/png.cjs');
const { previews, orderedLayers } = require('./build.cjs');

const dir = __dirname;
const project = JSON.parse(fs.readFileSync(path.join(dir, 'saved-branch.json'), 'utf8'));
const dec = u => decode(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
const SCALE = 6;

function layerImage(l, key) {
  const fd = l && l.frameData[key];
  return fd ? { im: dec(fd.dataURL), place: fd.placement || null } : null;
}

function render(si, ai, fi, pick) {
  const frame = project.spriteSheets[si].actions[ai].frames[fi];
  const w = frame.width, h = frame.height;
  const buf = new Uint8Array(w * h * 4);
  orderedLayers(project, si, ai).forEach(l => {
    if (l.isGroup || l.visible === false) return;
    if (pick && !pick(l)) return;
    const data = layerImage(l, `${si}_${ai}_${fi}`);
    if (!data) return;
    const place = data.place || { x: 0, y: 0, w: data.im.width, h: data.im.height };
    for (let fy = 0; fy < place.h; fy++) for (let fx = 0; fx < place.w; fx++) {
      const tx = place.x + fx, ty = place.y + fy;
      if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
      const sx = Math.min(data.im.width - 1, Math.floor(fx * data.im.width / place.w));
      const sy = Math.min(data.im.height - 1, Math.floor(fy * data.im.height / place.h));
      const i = (sy * data.im.width + sx) * 4;
      if (!data.im.data[i + 3]) continue;
      const t = (ty * w + tx) * 4;
      buf[t] = data.im.data[i]; buf[t + 1] = data.im.data[i + 1]; buf[t + 2] = data.im.data[i + 2]; buf[t + 3] = 255;
    }
  });
  return { w, h, buf };
}

const rows = [
  ['合体（待机 1/2/3 帧）', null],
  ['只有头发与发带', l => /^(头发|发饰)/.test(l.name)],
  ['只有服装', l => /^服装/.test(l.name)],
  ['底稿手臂以上（身体+头+手）', l => /^(body|head|hand|hand 2)$/.test(l.name)]
];

const cells = [];
for (const fi of [0, 1]) for (const ai of [1, 0, 2]) cells.push([ai, fi]);
const cellW = 25 * SCALE + 8, cellH = 22 * SCALE + 22;
const W = cellW * cells.length + 8, H = cellH * rows.length + 8;
const canvas = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { canvas[i * 4] = 232; canvas[i * 4 + 1] = 236; canvas[i * 4 + 2] = 240; canvas[i * 4 + 3] = 255; }

const put = (x0, y0, img) => {
  for (let y = 0; y < img.h * SCALE; y++) for (let x = 0; x < img.w * SCALE; x++) {
    const sx = Math.floor(x / SCALE), sy = Math.floor(y / SCALE);
    const i = (sy * img.w + sx) * 4;
    if (!img.buf[i + 3]) continue;
    const t = ((y0 + y) * W + x0 + x) * 4;
    canvas[t] = img.buf[i]; canvas[t + 1] = img.buf[i + 1]; canvas[t + 2] = img.buf[i + 2]; canvas[t + 3] = 255;
  }
};

rows.forEach(([label, pick], r) => {
  cells.forEach(([ai, fi], c) => {
    const img = render(1, ai, fi, pick);
    const dx = Math.floor((25 - img.w) / 2) * SCALE;
    const dy = Math.floor((22 - img.h) / 2) * SCALE;
    put(8 + c * cellW + dx, 8 + r * cellH + 18 + dy, img);
  });
});
fs.writeFileSync(path.join(dir, 'parts-sheet.png'), encode(W, H, canvas));
console.log('parts-sheet.png', W, H);
console.log(rows.map(r => r[0]).join(' / '));
