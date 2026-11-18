/* 把候选稿的某一帧或全部帧渲染成 BGRA 原始像素，交给 raw2png.ps1 转 PNG 以便目视检查 */
const fs = require('fs');
const path = require('path');
const { frameMap, loadProject } = require('./pix.cjs');

const DIR = __dirname;
const file = process.argv[2] || 'candidate.json';
const project = loadProject(file);

function composite(si, ai, fi, filter) {
  const fr = project.spriteSheets[si].actions[ai].frames[fi];
  const w = fr.width, h = fr.height;
  const out = new Map();
  project.layers.forEach(l => {
    if (l.sheetIndex !== si || l.isGroup || l.visible === false) return;
    if (filter && !filter(l)) return;
    const fm = frameMap(l, `${si}_${ai}_${fi}`, w, h);
    if (!fm) return;
    for (const [k, v] of fm.map) out.set(k, v);
  });
  return { w, h, map: out };
}

function sheetOf(entries, scale, bg, cols) {
  const cellW = Math.max(...entries.map(e => e.w)) * scale + 6;
  const cellH = Math.max(...entries.map(e => e.h)) * scale + 6;
  const rows = Math.ceil(entries.length / cols);
  const W = cols * cellW + 6, H = rows * cellH + 6;
  const buf = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { buf[i * 4] = bg[2]; buf[i * 4 + 1] = bg[1]; buf[i * 4 + 2] = bg[0]; buf[i * 4 + 3] = 255; }
  entries.forEach((e, n) => {
    const cx = 6 + (n % cols) * cellW, cy = 6 + Math.floor(n / cols) * cellH;
    for (let y = 0; y < e.h * scale; y++) for (let x = 0; x < e.w * scale; x++) {
      const hex = e.map.get(Math.floor(y / scale) * e.w + Math.floor(x / scale));
      if (!hex) continue;
      const v = Buffer.from(hex.slice(1), 'hex');
      const d = ((cy + y) * W + cx + x) * 4;
      buf[d] = v[2]; buf[d + 1] = v[1]; buf[d + 2] = v[0]; buf[d + 3] = 255;
    }
  });
  return { W, H, buf };
}

const mode = process.argv[3] || 'all';
const scale = +(process.argv[4] || 12);
const bg = mode === 'dark' ? [44, 41, 54] : [228, 233, 240];

if (mode === 'frame') {
  const si = +process.argv[5], ai = +process.argv[6], fi = +process.argv[7];
  const e = composite(si, ai, fi, null);
  const out = sheetOf([e], scale, bg, 1);
  fs.writeFileSync(path.join(DIR, 'preview.raw'), out.buf);
  fs.writeFileSync(path.join(DIR, 'preview.meta.json'), JSON.stringify({ W: out.W, H: out.H }));
  console.log(out.W, out.H);
} else {
  const idle = [];
  for (const [si, ai] of [[1, 1], [1, 2], [1, 0]]) for (let fi = 0; fi < 4; fi++) idle.push(composite(si, ai, fi, null));
  const cols = mode === 'row' ? 4 : 8;
  const out = sheetOf(idle, scale, bg, cols);
  fs.writeFileSync(path.join(DIR, 'preview.raw'), out.buf);
  fs.writeFileSync(path.join(DIR, 'preview.meta.json'), JSON.stringify({ W: out.W, H: out.H }));
  console.log(out.W, out.H);
}
