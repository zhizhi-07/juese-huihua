/* 人物分支：栗色丸子头 + 雾蓝连衣裙 + 樱红发带（原生16规格，沿用当前主工程素体） */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const crypto = require('crypto');
const { encode } = require('../../scripts/png.cjs');
const characterBase = require('../../js/character-base.js');
const { frameMap, boundsOf, loadProject } = require('./pix.cjs');

const DIR = __dirname;
const OUTLINE = '#46465E';

const C = {
  hairEdge: '#46465E',
  hairDark: '#734028',
  hair: '#A3673F',
  hairLite: '#CE9765',
  band: '#E2586B',
  bandDark: '#A63A4C',
  bandLite: '#FF93A0',
  cloth: '#8FB0D6',
  clothShade: '#6A8AB4',
  clothLite: '#C2D8EE',
  cream: '#FFFFFF',
  creamShade: '#D7E0EC'
};

/* ---------- 像素画布 ---------- */
class Pixels {
  constructor(w, h) { this.w = w; this.h = h; this.map = new Map(); }
  set(x, y, hex) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (!hex) this.map.delete(y * this.w + x);
    else this.map.set(y * this.w + x, hex);
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.map.get(y * this.w + x) || null;
  }
  count() { return this.map.size; }
  toRGBA() {
    const data = new Uint8Array(this.w * this.h * 4);
    for (const [key, hex] of this.map) {
      const i = key * 4;
      const v = Buffer.from(hex.slice(1), 'hex');
      data[i] = v[0]; data[i + 1] = v[1]; data[i + 2] = v[2]; data[i + 3] = 255;
    }
    return data;
  }
  toURL() { return 'data:image/png;base64,' + encode(this.w, this.h, this.toRGBA()).toString('base64'); }
}

/* 素体头形：相对行（0=颅顶）-> [起列, 止列]，11列宽 */
const HEAD_SPAN = [[2, 8], [1, 9], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [1, 9]];
const FRINGE_ROWS = 3;   // 刘海覆盖到第 3 行

/* ---------- 后发：丸子 + 发盖 + 两侧发廓 + 颈后 ---------- */
function drawRearHair(px, ox, oy, dir, blocked) {
  const put = (r, c, hex) => {
    if (blocked && blocked.has(r) && blocked.get(r).has(c)) return;
    px.set(ox + c, oy + r, hex);
  };
  const line = (r, c0, c1, fill) => { for (let c = c0; c <= c1; c++) put(r, c, fill); };

  const bc = dir === 'side' ? 3 : 5;         // 丸子中心：正/背面居中，侧面向后
  const W = dir === 'side' ? 2 : 1;          // 左侧（后脑）外扩格数
  const R = 1;

  /* 丸子：上窄下宽的圆球 */
  line(-2, bc - 2, bc + 2, C.hair);
  put(-2, bc - 2, C.hairEdge); put(-2, bc + 2, C.hairEdge);
  put(-2, bc, C.hairLite); put(-2, bc - 1, C.hairLite);
  line(-1, bc - 3, bc + 3, C.hair);
  put(-1, bc - 3, C.hairEdge); put(-1, bc + 3, C.hairEdge);
  put(-1, bc - 2, C.hairLite); put(-1, bc - 1, C.hairLite);
  put(-1, bc + 1, C.hairDark); put(-1, bc + 2, C.hairDark);

  /* 发盖：逐行按头形外扩 W/R，最外圈描边 */
  for (let r = 0; r <= 9; r++) {
    const [h0, h1] = HEAD_SPAN[r];
    const L = h0 - W, Rt = h1 + R;
    const full = dir === 'up' || r <= FRINGE_ROWS;
    put(r, L - 1, C.hairEdge);
    put(r, Rt + 1, C.hairEdge);
    if (full) line(r, L, Rt, C.hair);
    else {
      line(r, L, h0, C.hair);
      line(r, h1, Rt, C.hair);
    }
  }

  if (dir === 'up') {
    /* 背面：整片后脑都是头发，加高光与发束分界线 */
    line(1, 3, 6, C.hairLite);
    for (let r = 2; r <= 8; r++) put(r, 5, C.hairDark);
    for (const [r, c] of [[2, 2], [3, 2], [5, 8], [6, 8]]) put(r, c, C.hairLite);
    put(9, 3, C.hairDark); put(9, 7, C.hairDark);
  } else if (dir === 'side') {
    /* 侧面：后脑更厚，左后方一道光 */
    for (let r = 2; r <= 5; r++) put(r, -1, C.hairLite);
    put(1, 0, C.hairLite);
  }

  /* 颈后两侧各一缕 */
  put(10, -1, C.hairEdge); put(10, 0, C.hair); put(10, 1, C.hair);
  put(10, 9, C.hair); put(10, 10, C.hair); put(10, 11, C.hairEdge);
}

/* ---------- 前发：刘海 + 鬓发 ---------- */
function drawFrontHair(px, ox, oy, dir, eyeMask) {
  const put = (r, c, hex) => px.set(ox + c, oy + r, hex);
  const line = (r, c0, c1, fill) => { for (let c = c0; c <= c1; c++) put(r, c, fill); };
  if (dir === 'up') return;

  /* 刘海：覆盖发盖内侧，外轮廓由后发提供 */
  line(1, 1, 9, C.hair);
  line(2, 0, 10, C.hair);
  line(3, 0, 10, C.hair);
  /* 高光与分束 */
  line(2, 2, 4, C.hairLite);
  put(3, 3, C.hairLite);
  put(3, 6, C.hairDark);

  /* 鬓发：贴脸两缕，内缘描边分出面颊 */
  for (let r = 4; r <= 9; r++) {
    const [h0, h1] = HEAD_SPAN[r];
    put(r, h0, C.hair); put(r, h0 + 1, C.hairEdge);
    put(r, h1 - 1, C.hairEdge); put(r, h1, C.hair);
  }
  put(5, 1, C.hairDark); put(5, 9, C.hairDark);
  put(7, 1, C.hairDark); put(7, 9, C.hairDark);

  /* 眼睛紧贴发缘时，把那条分界线改成发深色，避免糊成一团 */
  if (eyeMask) {
    for (const [r, c] of eyeMask) {
      for (const nc of [c + 1, c - 1]) {
        if (px.get(ox + nc, oy + r) === C.hairEdge) put(r, nc, C.hairDark);
      }
    }
  }
}

/* ---------- 发饰：樱红发带（系在丸子根部） ---------- */
function drawRibbon(px, ox, oy, dir) {
  const bc = dir === 'side' ? 3 : 5;
  const c0 = Math.max(1, bc - 3), c1 = Math.min(9, bc + 3);
  for (let c = c0; c <= c1; c++) {
    let hex = C.band;
    if (c === c0 || c === c1) hex = C.bandDark;
    if (c === bc) hex = C.bandLite;
    px.set(ox + c, oy, hex);
  }
  /* 结头：不额外加点，保持丸子干净 */
}

/* ---------- 服装：奶白圆领 + 雾蓝连衣裙 + 樱红腰带 + 奶白鞋 ---------- */
function drawOutfit(px, body, bodyMap, head, headMap, dir) {
  const bb = boundsOf(bodyMap, body.w);
  if (!bb) return null;
  const { x0, x1, y0, y1 } = bb;
  const hbB = boundsOf(headMap, head.w);
  const chinRow = hbB ? hbB.y0 + 9 : -99;

  /* 下颌与脸部像素受保护 */
  const guarded = new Set();
  for (const key of headMap.keys()) {
    const y = Math.floor(key / head.w), x = key % head.w;
    if (y <= chinRow) guarded.add(y * px.w + x);
  }
  const put = (x, y, hex) => {
    if (guarded.has(y * px.w + x)) return;
    px.set(x, y, hex);
  };

  const rows = y1 - y0;
  const mid = Math.round((x0 + x1) / 2);

  for (const [key, hex] of bodyMap) {
    const y = Math.floor(key / body.w), x = key % body.w;
    if (hex === OUTLINE) { put(x, y, OUTLINE); continue; }
    const i = y - y0;
    let fill;
    if (i === 0) fill = C.cream;             // 圆领
    else if (i === rows) fill = C.cream;     // 鞋
    else if (i === rows - 1) fill = C.cloth; // 裙摆
    else if (i === rows - 2) fill = C.cloth; // 裙腰
    else fill = C.cloth;                     // 上身
    put(x, y, fill);
  }

  if (dir !== 'up') {
    /* 圆领：中间三格奶白，两侧留雾蓝肩线 */
    for (let c = mid - 1; c <= mid + 1; c++) put(c, y0, C.cream);
    put(mid - 2, y0, C.cloth);
    put(mid + 2, y0, C.cloth);
  } else {
    for (let c = mid - 2; c <= mid + 2; c++) put(c, y0, C.cloth);
  }

  /* 上身左右明暗 */
  put(mid - 2, y0 + 1, C.clothLite);
  put(mid + 2, y0 + 1, C.clothShade);

  /* 腰带：樱红蝴蝶结 */
  const wy = y0 + rows - 2;
  put(mid - 2, wy, C.cloth);
  put(mid - 1, wy, C.band);
  put(mid, wy, C.bandLite);
  put(mid + 1, wy, C.band);
  put(mid + 2, wy, C.cloth);

  /* 裙摆：两侧浅色收边 */
  const sy = y0 + rows - 1;
  put(mid - 2, sy, C.clothLite);
  put(mid + 2, sy, C.clothShade);

  return bb;
}

/* ---------- 组装 ---------- */
function buildBranch(main) {
  const project = JSON.parse(JSON.stringify(main));
  project.name = '人物 · 栗色丸子头与雾蓝连衣裙';
  characterBase(project);
  const layers = project.layers;

  /* 把本次用到的颜色补进色板，方便前台继续画 */
  const hex2rgb = hex => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), a: 255 });
  const palette = Array.isArray(project.palette) ? project.palette : [];
  const have = new Set(palette.map(p => `${p.r},${p.g},${p.b}`));
  for (const [hex, name] of Object.entries({
    [C.hairDark]: '', [C.hair]: '栗发', [C.hairLite]: '栗发高光',
    [C.bandDark]: '', [C.band]: '樱红', [C.bandLite]: '',
    [C.clothShade]: '', [C.cloth]: '雾蓝', [C.clothLite]: '',
    [C.cream]: '奶白', [C.creamShade]: ''
  })) {
    const rgb = hex2rgb(hex);
    if (have.has(`${rgb.r},${rgb.g},${rgb.b}`)) continue;
    have.add(`${rgb.r},${rgb.g},${rgb.b}`);
    palette.push(name ? { ...rgb, name } : rgb);
  }
  project.palette = palette;
  project.currentSheetIndex = 1;
  project.currentActionIndex = 1;
  project.currentFrameIndex = 0;

  const eyesSource = new Map();
  for (const l of main.layers) {
    if (l.isGroup || l.name !== '眼睛') continue;
    const parent = main.layers[l.parent];
    if (!parent || !parent.isGroup) continue;
    const k = `${l.sheetIndex}:${parent.name}`;
    const prev = eyesSource.get(k);
    if (!prev || (l.visible !== false && prev.visible === false)) eyesSource.set(k, l);
  }

  const plans = new Map();
  const hairBySheet = new Map();
  const stats = [];

  project.spriteSheets.forEach((sheet, si) => {
    sheet.actions.forEach((action, ai) => {
      const dir = action.direction;
      const gi = layers.findIndex(l => l.isGroup && l.sheetIndex === si && l.name === dir);
      assert(gi >= 0, `缺少分组 ${si}/${dir}`);
      const children = layers.map((l, i) => [l, i]).filter(([l]) => l.parent === gi && !l.isGroup);
      const findIdx = name => (children.find(([l]) => l.name === name) || [])[1];
      const bodyLi = findIdx('body');
      const headLi = findIdx('head');
      assert(bodyLi != null && headLi != null, `缺少素体 ${si}/${dir}`);

      const cloth = {
        sheetIndex: si, isGroup: false, parent: gi, depth: 0,
        name: '服装 / 雾蓝连衣裙', visible: true, locked: false, opacity: 1, frameData: {}
      };

      let group = hairBySheet.get(si);
      if (!group) {
        group = {
          rear: { sheetIndex: si, isGroup: false, parent: null, depth: 0, name: '头发 / 丸子头 / 后发', visible: true, locked: false, opacity: 1, frameData: {} },
          front: { sheetIndex: si, isGroup: false, parent: null, depth: 0, name: '头发 / 丸子头 / 前发', visible: true, locked: false, opacity: 1, frameData: {} },
          ribbon: { sheetIndex: si, isGroup: false, parent: null, depth: 0, name: '发饰 / 樱红发带', visible: true, locked: false, opacity: 1, frameData: {} }
        };
        hairBySheet.set(si, group);
      }

      action.frames.forEach((frame, fi) => {
        const key = `${si}_${ai}_${fi}`;
        const w = frame.width, h = frame.height;
        const body = frameMap(layers[bodyLi], key, w, h);
        const head = frameMap(layers[headLi], key, w, h);
        assert(body && head, `缺少素体帧 ${key}`);

        const clothPx = new Pixels(w, h);
        const bb = drawOutfit(clothPx, body, body.map, head, head.map, dir);
        if (clothPx.count()) cloth.frameData[key] = { width: w, height: h, dataURL: clothPx.toURL() };

        const hb = boundsOf(head.map, head.w);
        const eyeLayer = eyesSource.get(`${si}:${dir}`);
        const eyeFrame = eyeLayer ? frameMap(eyeLayer, key, w, h) : null;
        const eyeMask = eyeFrame
          ? [...eyeFrame.map.keys()].map(k => [Math.floor(k / eyeFrame.w) - hb.y0, (k % eyeFrame.w) - hb.x0])
          : null;
        const blocked = new Map();
        if (dir !== 'up') {
          for (const k2 of head.map.keys()) {
            const x = k2 % head.w, y = Math.floor(k2 / head.w);
            const r = y - hb.y0, c = x - hb.x0;
            if (r < 2) continue;
            if (!blocked.has(r)) blocked.set(r, new Set());
            blocked.get(r).add(c);
          }
        }

        const rp = new Pixels(w, h), fp = new Pixels(w, h), bp = new Pixels(w, h);
        drawRearHair(rp, hb.x0, hb.y0, dir, blocked);
        drawFrontHair(fp, hb.x0, hb.y0, dir, eyeMask);
        drawRibbon(bp, hb.x0, hb.y0, dir);
        if (rp.count()) group.rear.frameData[key] = { width: w, height: h, dataURL: rp.toURL() };
        if (fp.count()) group.front.frameData[key] = { width: w, height: h, dataURL: fp.toURL() };
        if (bp.count()) group.ribbon.frameData[key] = { width: w, height: h, dataURL: bp.toURL() };
        stats.push({ key, dir, head: hb, body: bb });
      });
      plans.set(gi, { cloth });
    });
  });

  const oldParent = new Map(layers.map(l => [l, l.parent == null ? null : layers[l.parent]]));
  for (const [gi, plan] of plans) oldParent.set(plan.cloth, layers[gi]);

  const out = [];
  const newIndex = new Map();
  const push = layer => { if (newIndex.has(layer)) return; newIndex.set(layer, out.length); out.push(layer); };
  const insertedEyes = new Set();

  layers.forEach(l => {
    const plan = !l.isGroup && l.parent != null ? plans.get(l.parent) : null;
    if (plan && l.name === 'hand') {
      const parent = layers[l.parent];
      const eyeKey = `${parent.sheetIndex}:${parent.name}`;
      const eyeSrc = eyesSource.get(eyeKey);
      const hasOwnEyes = layers.some(x => !x.isGroup && x.parent === l.parent && x.name === '眼睛');
      if (!hasOwnEyes && eyeSrc && !insertedEyes.has(eyeKey)) {
        const copy = JSON.parse(JSON.stringify(eyeSrc));
        copy.name = '眼睛';
        copy.visible = true;
        copy.locked = false;
        oldParent.set(copy, parent);
        push(copy);
        insertedEyes.add(eyeKey);
      }
      push(plan.cloth);
    }
    push(l);
  });
  for (const group of hairBySheet.values()) {
    push(group.rear);
    push(group.front);
    push(group.ribbon);
  }
  project.layers = out;
  for (const l of project.layers) {
    const parent = oldParent.get(l) ?? null;
    l.parent = parent ? newIndex.get(parent) : null;
    if (parent && l.parent == null) throw new Error('父级映射失败：' + l.name);
  }
  /* 默认选中待机·正面的前发，打开工程就能接着画 */
  const pick = project.layers.findIndex(l => !l.isGroup && l.sheetIndex === 1 && l.name === '头发 / 丸子头 / 前发');
  if (pick >= 0) project.currentLayerIndex = pick;
  return { project, stats };
}

/* ---------- 预览 ---------- */
function composite(project, si, ai, fi, filter) {
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

function ascii(project, si, ai, fi, mode) {
  const filter = mode === 'base' ? (l) => !/^(头发|服装|发饰)/.test(l.name) : null;
  const { w, h, map } = composite(project, si, ai, fi, filter);
  const GLYPH = {
    '#46465E': '|',
    '#FEEDE1': '.',
    '#E0C5B4': ',',
    '#734028': 'd',
    '#A3673F': 'h',
    '#CE9765': 'H',
    '#E2586B': 'r',
    '#A63A4C': 'R',
    '#FF93A0': '*',
    '#8FB0D6': 'c',
    '#C2D8EE': 'C',
    '#6A8AB4': 's',
    '#FFFFFF': 'w',
    '#D7E0EC': 'e'
  };
  const unknown = new Map();
  let header = '    ';
  for (let x = 0; x < w; x++) header += x % 10;
  const lines = [`frame ${si}/${ai}/${fi} ${project.spriteSheets[si].actions[ai].direction} ${w}x${h}`, header];
  for (let y = 0; y < h; y++) {
    let line = String(y).padStart(3, ' ') + ' ';
    let lo = -1, hi = -1;
    for (let x = 0; x < w; x++) {
      const hex = map.get(y * w + x);
      if (!hex) { line += ' '; continue; }
      if (lo < 0) lo = x;
      hi = x;
      if (GLYPH[hex]) { line += GLYPH[hex]; continue; }
      if (!unknown.has(hex)) unknown.set(hex, '?' + unknown.size);
      line += '?';
    }
    lines.push(line + (lo < 0 ? '' : `  <${lo}..${hi} n=${hi - lo + 1}`));
  }
  const legend = '| 描边   . 皮肤   , 皮肤阴影   d 发深   h 发色   H 发高光   r 发带   R 发带暗   * 发带亮   c 裙   C 裙亮   s 裙暗   w 奶白   e 奶白暗';
  lines.push(legend);
  if (unknown.size) lines.push('unknown colors: ' + [...unknown.keys()].join(' '));
  return lines.join('\n');
}

function contactSheet(project, scale, bg) {
  const rows = [];
  project.spriteSheets.forEach((sheet, si) => sheet.actions.forEach((a, ai) => rows.push({ si, ai, n: a.frames.length })));
  const maxW = Math.max(...project.spriteSheets.flatMap(s => s.actions.flatMap(a => a.frames.map(f => f.width))));
  const maxH = Math.max(...project.spriteSheets.flatMap(s => s.actions.flatMap(a => a.frames.map(f => f.height))));
  const cols = Math.max(...rows.map(r => r.n));
  const cellW = maxW * scale + 8, cellH = maxH * scale + 8;
  const W = cols * cellW + 8, H = rows.length * cellH + 8;
  const canvas = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) canvas.set([bg[0], bg[1], bg[2], 255], i * 4);
  rows.forEach((r, ri) => {
    for (let fi = 0; fi < r.n; fi++) {
      const im = composite(project, r.si, r.ai, fi);
      const x0 = 8 + fi * cellW + Math.floor((maxW - im.w) / 2) * scale;
      const y0 = 8 + ri * cellH;
      for (let y = 0; y < im.h * scale; y++) for (let x = 0; x < im.w * scale; x++) {
        const hex = im.map.get(Math.floor(y / scale) * im.w + Math.floor(x / scale));
        if (!hex) continue;
        const v = Buffer.from(hex.slice(1), 'hex');
        const d = ((y0 + y) * W + x0 + x) * 4;
        canvas[d] = v[0]; canvas[d + 1] = v[1]; canvas[d + 2] = v[2]; canvas[d + 3] = 255;
      }
    }
  });
  return encode(W, H, canvas);
}

/* ---------- 校验 ---------- */
function verify(project, main) {
  const mainBase = JSON.parse(JSON.stringify(main));
  characterBase(mainBase);
  assert.equal(project.spriteSheets.length, main.spriteSheets.length, '画布数量变化');
  assert.deepEqual(project.spriteSheets, main.spriteSheets, '画布与动作表必须与主工程一致');

  const protectedNames = new Set(['body', 'head', 'hand', 'hand 2']);
  const baseLayers = project.layers.filter(l => !l.isGroup && protectedNames.has(l.name));
  const expectBase = mainBase.layers.filter(l => !l.isGroup && protectedNames.has(l.name));
  assert.equal(baseLayers.length, expectBase.length, '底稿数量不一致');
  baseLayers.forEach((l, i) => {
    assert.equal(l.name, expectBase[i].name, '底稿顺序不一致');
    assert.equal(l.sheetIndex, expectBase[i].sheetIndex, '底稿sheet不一致');
    assert.deepEqual(l.frameData, expectBase[i].frameData, `${l.name} 底稿像素被改动`);
  });

  for (const l of project.layers) {
    if (l.isGroup || !/^(头发|服装|发饰)/.test(l.name)) continue;
    for (const [key, fd] of Object.entries(l.frameData)) {
      const [si, ai, fi] = key.split('_').map(Number);
      const frame = project.spriteSheets[si]?.actions[ai]?.frames[fi];
      assert(frame, `帧不存在 ${l.name} ${key}`);
      assert.equal(fd.width, frame.width, `${l.name} ${key} 宽度不符`);
      assert.equal(fd.height, frame.height, `${l.name} ${key} 高度不符`);
    }
  }
  const count = re => project.layers.filter(l => re.test(l.name)).reduce((n, l) => n + Object.keys(l.frameData).length, 0);
  return { hairFrames: count(/^头发/), clothFrames: count(/^服装/), ribbonFrames: count(/^发饰/) };
}

async function publish(project, existingId) {
  const id = existingId || 'character-' + crypto.randomUUID();
  const base = JSON.parse(JSON.stringify(project));
  characterBase(base);

  let etag;
  if (existingId) {
    const cur = await fetch(`http://127.0.0.1:8765/api/project?id=${id}`);
    assert(cur.ok, '读取既有分支失败');
    etag = cur.headers.get('etag');
    assert(etag, '既有分支没有 ETag');
  } else {
    /* 第一次保存：服务端会按素体建立人物分支 */
    const first = await fetch(`http://127.0.0.1:8765/api/project?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': 'none' },
      body: JSON.stringify(base)
    });
    const firstText = await first.text();
    assert(first.ok, `建立分支失败 ${first.status} ${firstText}`);
    etag = first.headers.get('etag');
    assert(etag, '第一次保存没有返回 ETag');
  }

  /* 正式保存：分支已存在，服务端只同步底稿，保留头发/服装/发饰 */
  const second = await fetch(`http://127.0.0.1:8765/api/project?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': etag },
    body: JSON.stringify(project)
  });
  const secondText = await second.text();
  assert(second.ok, `保存分支内容失败 ${second.status} ${secondText}`);

  const back = await fetch(`http://127.0.0.1:8765/api/project?id=${id}`);
  assert(back.ok, '回读失败');
  const raw = await back.text();
  return { id, etag: back.headers.get('etag'), bytes: Buffer.byteLength(raw), saveResponse: secondText, raw };
}

(async () => {
  const main = loadProject('main.json');
  const { project, stats } = buildBranch(main);
  const counts = verify(project, main);
  const mode = process.argv[2];

  if (mode === 'ascii') {
    console.log(ascii(project, +process.argv[3], +process.argv[4], +process.argv[5], process.argv[6]));
    return;
  }

  fs.writeFileSync(path.join(DIR, 'candidate.json'), JSON.stringify(project));
  fs.writeFileSync(path.join(DIR, 'frame-stats.json'), JSON.stringify(stats, null, 1));
  fs.writeFileSync(path.join(DIR, 'contact-light.png'), contactSheet(project, 8, [228, 233, 240]));
  fs.writeFileSync(path.join(DIR, 'contact-dark.png'), contactSheet(project, 8, [44, 41, 54]));
  console.log(JSON.stringify({
    name: project.name,
    layers: project.layers.length,
    ...counts,
    sheets: project.spriteSheets.map((s, i) => `${s.name}: ${s.actions.map(a => a.direction + '×' + a.frames.length).join(' ')}`)
  }, null, 1));

  if (mode === 'publish') {
    const result = await publish(project, process.argv[3]);
    fs.writeFileSync(path.join(DIR, 'publish-result.json'), JSON.stringify({ id: result.id, etag: result.etag, bytes: result.bytes }, null, 1));
    fs.writeFileSync(path.join(DIR, 'published.json'), result.raw);
    console.log('PUBLISHED', result.id, result.etag, result.bytes);
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
