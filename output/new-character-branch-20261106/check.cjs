/* 检查每一帧是否都是单一连通像素团（避免头发/衣服留下悬空像素） */
const fs = require('fs');
const path = require('path');
const { decode } = require('../../scripts/png.cjs');

const dir = __dirname;
const project = JSON.parse(fs.readFileSync(path.join(dir, process.argv[2] || 'candidate.json'), 'utf8'));
const dec = u => decode(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));

function composite(si, ai, fi) {
  const frame = project.spriteSheets[si].actions[ai].frames[fi];
  const w = frame.width, h = frame.height;
  const buf = new Uint8Array(w * h * 4);
  project.layers.forEach(l => {
    if (l.isGroup || l.sheetIndex !== si || l.visible === false) return;
    const fd = l.frameData[`${si}_${ai}_${fi}`];
    if (!fd) return;
    const im = dec(fd.dataURL);
    const place = fd.placement || { x: 0, y: 0, w: im.width, h: im.height };
    for (let fy = 0; fy < place.h; fy++) for (let fx = 0; fx < place.w; fx++) {
      const tx = place.x + fx, ty = place.y + fy;
      if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
      const sx = Math.min(im.width - 1, Math.floor(fx * im.width / place.w));
      const sy = Math.min(im.height - 1, Math.floor(fy * im.height / place.h));
      const i = (sy * im.width + sx) * 4;
      if (!im.data[i + 3]) continue;
      const t = (ty * w + tx) * 4;
      buf[t] = im.data[i]; buf[t + 1] = im.data[i + 1]; buf[t + 2] = im.data[i + 2]; buf[t + 3] = 255;
    }
  });
  return { w, h, buf };
}

function components(c) {
  const seen = new Uint8Array(c.w * c.h);
  const out = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const i = y * c.w + x;
    if (seen[i] || !c.buf[i * 4 + 3]) continue;
    const stack = [[x, y]];
    seen[i] = 1;
    let n = 0;
    let minX = x, minY = y;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      n++;
      minX = Math.min(minX, cx); minY = Math.min(minY, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= c.w || ny >= c.h) continue;
        const j = ny * c.w + nx;
        if (seen[j] || !c.buf[j * 4 + 3]) continue;
        seen[j] = 1;
        stack.push([nx, ny]);
      }
    }
    out.push({ n, x: minX, y: minY });
  }
  return out.sort((a, b) => b.n - a.n);
}

const bad = [];
project.spriteSheets.forEach((s, si) => s.actions.forEach((a, ai) => a.frames.forEach((f, fi) => {
  const list = components(composite(si, ai, fi));
  if (list.length !== 1) bad.push({ si, ai, fi, dir: a.direction, parts: list.map(v => `${v.n}@${v.x},${v.y}`) });
})));
console.log(bad.length ? JSON.stringify(bad, null, 1) : 'PASS 全部帧都是单一连通像素团');

if (process.argv[3] === 'layers') {
  const report = [];
  project.layers.forEach(l => {
    if (l.isGroup || !/^(头发|发饰|服装)/.test(l.name)) return;
    for (const [key, fd] of Object.entries(l.frameData)) {
      const im = dec(fd.dataURL);
      const c = { w: im.width, h: im.height, buf: im.data };
      const list = components(c);
      const tiny = list.filter(v => v.n <= 2);
      if (tiny.length) report.push({ layer: l.name, sheet: l.sheetIndex, key, tiny: tiny.map(v => `${v.n}@${v.x},${v.y}`) });
    }
  });
  console.log(report.length ? JSON.stringify(report, null, 1) : 'PASS 新增图层没有孤立 1-2 像素');
}
