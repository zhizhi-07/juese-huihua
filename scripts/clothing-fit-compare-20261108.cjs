// 衣服贴合算法对照：只读主工程，不写回任何数据。
// 旧算法 = js/clothing-fit.js 的逐行横带 warp；新算法 = 部位标记（躯干/左腿/右腿）。
// 同时跑“部位算法修正前（贴腿时忽略纵向比例）”和“修正后”，把差异量出来。
const fs = require('fs');
const path = require('path');
const png = require('./png.cjs');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'output/clothing-fit-compare-20261108');
const project = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/shared-project.json'), 'utf8'));

const OUTLINE = [70, 70, 94];
const SCALE = 7;

const blank = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
const put = (im, x, y, c) => {
  if (x < 0 || y < 0 || x >= im.width || y >= im.height) return;
  const i = (y * im.width + x) * 4;
  im.data[i] = c[0]; im.data[i + 1] = c[1]; im.data[i + 2] = c[2]; im.data[i + 3] = 255;
};
const isOutline = (d, i) =>
  Math.abs(d[i] - OUTLINE[0]) < 6 && Math.abs(d[i + 1] - OUTLINE[1]) < 6 && Math.abs(d[i + 2] - OUTLINE[2]) < 6;

function segsOf(im, y, skipOutline) {
  const s = []; let a = -1;
  for (let x = 0; x < im.width; x++) {
    const i = (y * im.width + x) * 4;
    const ink = im.data[i + 3] > 0 && !(skipOutline && isOutline(im.data, i));
    if (ink) { if (a < 0) a = x; }
    else if (a >= 0) { s.push([a, x - 1]); a = -1; }
  }
  if (a >= 0) s.push([a, im.width - 1]);
  return s;
}

function buildParts(im) {
  const H = im.height, rows = [], inkRows = [];
  for (let y = 0; y < H; y++) { rows.push(segsOf(im, y, true)); inkRows.push(segsOf(im, y, false)); }
  let topY = -1, bottomY = -1;
  for (let y = 0; y < H; y++) if (inkRows[y].length) { if (topY < 0) topY = y; bottomY = y; }
  if (topY < 0) return null;
  let crotch = -1;
  const halfway = topY + Math.floor((bottomY - topY) * 0.45);
  for (let q = Math.max(topY, halfway); q <= bottomY; q++) if (rows[q].length >= 2) { crotch = q; break; }
  const torso = { y0: topY, y1: crotch >= 0 ? crotch - 1 : bottomY, segs: {} };
  if (torso.y1 >= torso.y0) for (let q = topY; q <= torso.y1; q++) {
    let widest = null;
    for (const sg of rows[q]) if (!widest || (sg[1] - sg[0]) > (widest[1] - widest[0])) widest = sg;
    if (widest) torso.segs[q] = widest;
  }
  let a = null, b = null;
  if (crotch >= 0) {
    a = { y0: crotch, y1: crotch, segs: {} }; b = { y0: crotch, y1: crotch, segs: {} };
    for (let q = crotch; q <= bottomY; q++) {
      const sg = rows[q];
      if (sg.length >= 1) { a.segs[q] = sg[0]; a.y1 = q; }
      if (sg.length >= 2) { b.segs[q] = sg[1]; b.y1 = q; }
    }
    if (!Object.keys(b.segs).length) b = null;
  }
  return { topY, bottomY, crotch, torso, a, b, rows };
}
const partSpan = (P, key) => {
  const p = P[key]; if (!p) return null;
  return { y0: p.y0, y1: p.y1, seg: (y) => p.segs[y] || null };
};

function modelFromPainting(cloth, body) {
  const P = buildParts(body); if (!P) return [];
  const model = [], H = body.height, W = body.width;
  const hasInk = (y) => !!(P.rows[y] && P.rows[y].length);
  const nearestRow = (y) => {
    if (hasInk(y)) return y;
    for (let d = 1; d < H; d++) {
      if (y + d < H && hasInk(y + d)) return y + d;
      if (y - d >= 0 && hasInk(y - d)) return y - d;
    }
    return -1;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * cloth.width + x) * 4;
    if (cloth.data[i + 3] === 0) continue;
    const ry = nearestRow(y); if (ry < 0) continue;
    const c = [cloth.data[i], cloth.data[i + 1], cloth.data[i + 2], 255];
    let part = 'torso', sg = P.torso.segs[ry];
    if (P.a && ry >= P.a.y0 && P.torso.y1 < ry) {
      const sa = P.a.segs[ry], sb = P.b ? P.b.segs[ry] : null;
      if (sa && sb) part = x <= (sa[1] + sb[0]) / 2 ? 'a' : 'b';
      else part = sb ? 'b' : 'a';
      sg = part === 'a' ? sa : (sb || sa);
    } else if (!sg) sg = P.rows[ry][0];
    if (!sg) continue;
    const pp = P[part] || P.torso;
    const t = (ry - pp.y0) / Math.max(1, pp.y1 - pp.y0);
    const u = (x - sg[0]) / Math.max(1, sg[1] - sg[0]);
    model.push({ c, part, t, u });
  }
  return model;
}

// 旧算法：逐行横带（clothing-fit.js 原样）
function rowsOld(im) {
  const a = [];
  for (let y = 0; y < im.height; y++) {
    const xs = [];
    for (let x = 0; x < im.width; x++) {
      const i = (y * im.width + x) * 4;
      if (im.data[i + 3] && !isOutline(im.data, i)) xs.push(x);
    }
    if (xs.length) a.push({ y, xs });
  }
  return a;
}
function fitOld(srcBody, cloth, tgtBody) {
  const a = rowsOld(srcBody), b = rowsOld(tgtBody);
  const out = blank(tgtBody.width, tgtBody.height);
  for (let row = 0; row < b.length; row++) {
    const sr = row < 2 ? row : Math.round(2 + (row - 2) * (a.length - 3) / Math.max(1, b.length - 3));
    const from = a[Math.min(a.length - 1, Math.max(0, sr))], to = b[row];
    if (!from || !to) continue;
    const mn = from.xs[0], mx = from.xs[from.xs.length - 1];
    const lf = to.xs[0], rt = to.xs[to.xs.length - 1];
    for (const x of to.xs) {
      let sx = Math.round(mn + (x - lf) * (mx - mn) / Math.max(1, rt - lf));
      let i = (from.y * cloth.width + sx) * 4;
      if (cloth.data[i + 3] === 0) {
        const painted = from.xs.filter((px) => cloth.data[(from.y * cloth.width + px) * 4 + 3]);
        if (!painted.length) continue;
        sx = painted.reduce((best, px) => Math.abs(px - sx) < Math.abs(best - sx) ? px : best);
        i = (from.y * cloth.width + sx) * 4;
      }
      out.data.set(cloth.data.subarray(i, i + 4), (to.y * out.width + x) * 4);
    }
  }
  return out;
}

// 新算法：按部位。useLegT=true 为修正后（贴腿时也按纵向比例）。
function fitNew(model, body, { useLegT = true } = {}) {
  const P = buildParts(body);
  const out = blank(body.width, body.height);
  if (!P) return out;
  const target = { torso: partSpan(P, 'torso'), a: partSpan(P, 'a'), b: partSpan(P, 'b') };
  for (const m of model) {
    const p = target[m.part]; if (!p) continue;
    let rows;
    if (m.part === 'torso' || useLegT) rows = [Math.round(p.y0 + m.t * (p.y1 - p.y0))];
    else { rows = []; for (let y = p.y0; y <= p.y1; y++) rows.push(y); }
    for (const yy of rows) {
      const seg = p.seg(yy); if (!seg) continue;
      let xx = Math.round(seg[0] + m.u * (seg[1] - seg[0]));
      xx = Math.min(Math.max(xx, seg[0] - 2), seg[1] + 2);
      put(out, xx, yy, m.c);
    }
  }
  return out;
}

/* ---------- 读素体 ---------- */
function frameEntry(key) {
  for (const l of project.layers) {
    if (l.name !== 'body' || !l.frameData) continue;
    const e = l.frameData[key];
    if (e) return e;
  }
  return null;
}
function sheetOf(key) {
  const si = Number(key.split('_')[0]);
  return project.spriteSheets[si];
}
function bodyImage(key) {
  const e = frameEntry(key);
  if (!e) throw new Error('没有这一帧 ' + key);
  const sh = sheetOf(key);
  const im = png.decode(Buffer.from(e.dataURL.slice(e.dataURL.indexOf(',') + 1), 'base64'));
  const out = blank(sh.frameWidth, sh.frameHeight);
  for (let y = 0; y < Math.min(im.height, out.height); y++)
    for (let x = 0; x < Math.min(im.width, out.width); x++) {
      const i = (y * im.width + x) * 4, j = (y * out.width + x) * 4;
      out.data[j] = im.data[i]; out.data[j + 1] = im.data[i + 1];
      out.data[j + 2] = im.data[i + 2]; out.data[j + 3] = im.data[i + 3];
    }
  return out;
}

/* ---------- 示例衣服（与 clothing-studio 页面的“示例衣服”一致） ---------- */
function sampleGarment(body) {
  const P = buildParts(body); if (!P) throw new Error('素体解析失败');
  const paint = blank(body.width, body.height);
  const vest = [0x6c, 0x86, 0xd9], vestDark = [0x4a, 0x60, 0xa8];
  const band = [0xe8, 0xc2, 0x3c], bandDark = [0xc9, 0xa1, 0x28];
  const shortC = [0xe0, 0x8f, 0xb0], shortDark = [0xb4, 0x6d, 0x8a];
  for (let y = P.torso.y0; y <= P.torso.y1 - 1; y++) {
    const sg = P.torso.segs[y]; if (!sg) continue;
    for (let x = sg[0]; x <= sg[1]; x++) put(paint, x, y, x >= sg[1] ? vestDark : vest);
  }
  { const sg = P.torso.segs[P.torso.y1]; if (sg) for (let x = sg[0]; x <= sg[1]; x++) put(paint, x, P.torso.y1, x >= sg[1] ? bandDark : band); }
  if (P.crotch >= 0) {
    for (const leg of [P.a, P.b]) {
      if (!leg) continue;
      for (let y = P.crotch; y <= Math.min(P.bottomY, P.crotch + 2); y++) {
        const sg = leg.segs[y]; if (!sg) continue;
        for (let x = sg[0]; x <= sg[1]; x++) put(paint, x, y, x >= sg[1] ? shortDark : shortC);
      }
    }
  }
  return paint;
}

/* ---------- 指标 ---------- */
function clothAt(im, x, y) {
  if (x < 0 || y < 0 || x >= im.width || y >= im.height) return false;
  return im.data[(y * im.width + x) * 4 + 3] > 0;
}
function metrics(body, cloth) {
  let clothPixels = 0, onBody = 0, offBody = 0, onOutline = 0, emptyRow = 0;
  for (let y = 0; y < cloth.height; y++) {
    let rowHas = false;
    for (let x = 0; x < cloth.width; x++) {
      if (!clothAt(cloth, x, y)) continue;
      clothPixels++; rowHas = true;
      const bi = (y * body.width + x) * 4;
      if (body.data[bi + 3] === 0) offBody++;
      else if (isOutline(body.data, bi)) onOutline++;
      else onBody++;
    }
    if (!rowHas) emptyRow++;
  }
  return { clothPixels, onBody, offBody, onOutline };
}
function diffCount(a, b) {
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i + 3] !== b.data[i + 3] ||
        a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) n++;
  }
  return n;
}

/* ---------- 成图 ---------- */
function blit(dst, dx, dy, src, scale, tint) {
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    const i = (y * src.width + x) * 4;
    if (src.data[i + 3] === 0) continue;
    let r = src.data[i], g = src.data[i + 1], b = src.data[i + 2];
    if (tint) { r = Math.round(r * tint[0]); g = Math.round(g * tint[1]); b = Math.round(b * tint[2]); }
    for (let yy = 0; yy < scale; yy++) for (let xx = 0; xx < scale; xx++) {
      const px = dx + x * scale + xx, py = dy + y * scale + yy;
      if (px < 0 || py < 0 || px >= dst.width || py >= dst.height) continue;
      const j = (py * dst.width + px) * 4;
      dst.data[j] = r; dst.data[j + 1] = g; dst.data[j + 2] = b; dst.data[j + 3] = 255;
    }
  }
}
function fillRect(dst, x, y, w, h, c) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (xx < 0 || yy < 0 || xx >= dst.width || yy >= dst.height) continue;
    const j = (yy * dst.width + xx) * 4;
    dst.data[j] = c[0]; dst.data[j + 1] = c[1]; dst.data[j + 2] = c[2]; dst.data[j + 3] = 255;
  }
}

/* ---------- 修正前/后差别演示：一副腿更长的合成素体 ---------- */
function tallBody() {
  const w = 13, h = 20, im = blank(w, h);
  const skin = [254, 237, 225];
  const fill = (x0, x1, y0, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(im, x, y, skin); };
  fill(4, 8, 4, 9);        // 躯干
  fill(4, 5, 10, 17);      // 左腿
  fill(7, 8, 10, 17);      // 右腿
  return im;
}
function legFixDemo() {
  const body = tallBody();
  const shorts = blank(body.width, body.height);
  // 只在两条腿的最上面两行画短裤
  const shortC = [0xe0, 0x8f, 0xb0];
  for (let y = 10; y <= 11; y++) { for (let x = 4; x <= 5; x++) put(shorts, x, y, shortC); for (let x = 7; x <= 8; x++) put(shorts, x, y, shortC); }
  const model = modelFromPainting(shorts, body);
  const before = fitNew(model, body, { useLegT: false });
  const after = fitNew(model, body, { useLegT: true });
  const count = (im) => { let n = 0; for (let i = 3; i < im.data.length; i += 4) if (im.data[i] > 0) n++; return n; };
  const legRows = (im) => {
    const ys = [];
    for (let y = 10; y <= 17; y++) { let any = false; for (let x = 0; x < im.width; x++) if (clothAt(im, x, y)) any = true; if (any) ys.push(y); }
    return ys.length;
  };
  const asciiOf = (im) => {
    const lines = [];
    for (let y = 8; y <= 18; y++) {
      let s = '';
      for (let x = 2; x <= 10; x++) s += clothAt(im, x, y) ? '#' : (clothAt(body, x, y) ? '.' : ' ');
      lines.push(String(y).padStart(2) + ' ' + s);
    }
    return lines;
  };
  const SC = 12, g = blank(body.width * SC, body.height * SC);
  fillRect(g, 0, 0, g.width, g.height, [23, 26, 34]);
  blit(g, 0, 0, body, SC, [0.62, 0.62, 0.62]);
  blit(g, 0, 0, shorts, SC, null);
  const gb = blank(body.width * SC, body.height * SC);
  fillRect(gb, 0, 0, gb.width, gb.height, [23, 26, 34]);
  blit(gb, 0, 0, body, SC, [0.62, 0.62, 0.62]); blit(gb, 0, 0, before, SC, null);
  const ga = blank(body.width * SC, body.height * SC);
  fillRect(ga, 0, 0, ga.width, ga.height, [23, 26, 34]);
  blit(ga, 0, 0, body, SC, [0.62, 0.62, 0.62]); blit(ga, 0, 0, after, SC, null);
  const gap = 10, W3 = g.width * 3 + gap * 4, H3 = g.height + gap * 2;
  const grid = blank(W3, H3);
  fillRect(grid, 0, 0, W3, H3, [18, 20, 27]);
  [g, gb, ga].forEach((p, i) => { for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) { const j = ((y + gap) * W3 + x + gap + i * (p.width + gap)) * 4, k = (y * p.width + x) * 4; if (p.data[k + 3] === 0) continue; grid.data[j] = p.data[k]; grid.data[j + 1] = p.data[k + 1]; grid.data[j + 2] = p.data[k + 2]; grid.data[j + 3] = 255; } });
  fs.writeFileSync(path.join(OUT, 'leg-fix-demo.png'), png.encode(W3, H3, grid.data));
  return {
    paintedShortsPixels: count(shorts),
    modelRecords: model.length,
    beforePixels: count(before), beforeLegRows: legRows(before),
    afterPixels: count(after), afterLegRows: legRows(after),
    ascii: { painted: asciiOf(shorts), before: asciiOf(before), after: asciiOf(after) },
  };
}

/* ---------- 主流程 ---------- */
const TARGETS = [
  { name: '同一副身体', key: '1_1_0' },
  { name: '走路帧', key: '0_1_2' },
  { name: '侧面', key: '1_0_0' },
  { name: '拾取帧', key: '2_1_0' },
];
const ALGOS = [
  { id: 'old', name: '旧·逐行横带' },
  { id: 'newBefore', name: '新·部位(修正前)' },
  { id: 'newAfter', name: '新·部位(修正后)' },
];

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const idle = bodyImage('1_1_0');
  const garment = sampleGarment(idle);
  const model = modelFromPainting(garment, idle);
  const rows = [];
  const panels = [];

  for (const t of TARGETS) {
    const body = bodyImage(t.key);
    const outs = {
      old: fitOld(idle, garment, body),
      newBefore: fitNew(model, body, { useLegT: false }),
      newAfter: fitNew(model, body, { useLegT: true }),
    };
    for (const a of ALGOS) {
      rows.push({ target: t.name, algo: a.name, ...metrics(body, outs[a.id]) });
    }
    panels.push({ target: t.name, body, outs });
  }

  const identity = {
    paintingVsOld: diffCount(garment, fitOld(idle, garment, idle)),
    paintingVsNewBefore: diffCount(garment, fitNew(model, idle, { useLegT: false })),
    paintingVsNewAfter: diffCount(garment, fitNew(model, idle, { useLegT: true })),
    paintingPixels: metrics(idle, garment).clothPixels,
  };

  // 修正前后的差别在 19×19 素体上只有一两行腿，看不出来；用一副高个子合成身体单独演示。
  const legDemo = legFixDemo();

  // 图：每行一个目标身体，三列算法
  const cellW = 25, cellH = 22;
  const pad = 12, labelH = 16, headH = 22;
  const W = pad + ALGOS.length * (cellW * SCALE + pad);
  const H = headH + TARGETS.length * (cellH * SCALE + labelH + pad) + pad;
  const sheet = blank(W, H);
  fillRect(sheet, 0, 0, W, H, [18, 20, 27]);
  ALGOS.forEach((a, i) => {
    const x = pad + i * (cellW * SCALE + pad);
    fillRect(sheet, x, 4, cellW * SCALE, 2, [60, 70, 100]);
  });
  panels.forEach((p, ti) => {
    const y0 = headH + ti * (cellH * SCALE + labelH + pad);
    ALGOS.forEach((a, i) => {
      const x = pad + i * (cellW * SCALE + pad);
      fillRect(sheet, x, y0, cellW * SCALE, cellH * SCALE, [23, 26, 34]);
      blit(sheet, x, y0, p.body, SCALE, [0.62, 0.62, 0.62]);
      blit(sheet, x, y0, p.outs[a.id], SCALE, null);
    });
  });

  fs.writeFileSync(path.join(OUT, 'compare.png'), png.encode(W, H, sheet.data));
  // 单张大图：素体 + 示例衣服
  const big = blank(idle.width * 10, idle.height * 10);
  fillRect(big, 0, 0, big.width, big.height, [23, 26, 34]);
  blit(big, 0, 0, idle, 10, [0.62, 0.62, 0.62]);
  blit(big, 0, 0, garment, 10, null);
  fs.writeFileSync(path.join(OUT, 'garment-source.png'), png.encode(big.width, big.height, big.data));

  const report = {
    generatedAt: new Date().toISOString(),
    source: 'data/shared-project.json',
    sourceFrame: '1_1_0 (original16_idle / down / frame1)',
    garmentPixels: metrics(idle, garment).clothPixels,
    modelRecords: model.length,
    identity,
    metrics: rows,
    legFixDemo: legDemo,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ garmentPixels: report.garmentPixels, modelRecords: model.length, identity }, null, 2));
  console.table(rows);
  console.log('输出：', OUT);
}

main();
