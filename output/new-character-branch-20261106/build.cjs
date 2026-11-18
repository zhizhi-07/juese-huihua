/* 新建人物分支：雾紫内扣短发 + 薄荷背带裙（原生16规格，沿用主工程素体） */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const crypto = require('crypto');
const { decode, encode } = require('../../scripts/png.cjs');
const characterBase = require('../../js/character-base.js');

const dir = __dirname;
const OUTLINE = '#46465E';
const SKIN_SHADOW = '#E0C5B4';

const C = {
  hairEdge: '#46465E',
  hairDark: '#8E7CAA',
  hair: '#B7A5CF',
  hairLight: '#D6C9E8',
  band: '#E8A6B6',
  bandDark: '#C9809A',
  blouse: '#F7F1E6',
  blouseShade: '#DFD5C5',
  collar: '#FFFFFF',
  button: '#ECCF8D',
  skirt: '#A7CBB1',
  skirtShade: '#86AF93',
  hem: '#EFF6EE',
  hemShade: '#D6E3D9',
  shoe: '#9CB6D6',
  shoeShade: '#7089AD'
};

/* ---------- 像素画布 ---------- */
class Pixels {
  constructor(w, h) { this.w = w; this.h = h; this.map = new Map(); }
  set(x, y, hex) {
    x = Math.round(x); y = Math.round(y);
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

/* ---------- 素体读取 ---------- */
const decodeURL = url => decode(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));

function frameMap(layer, key) {
  const fd = layer && layer.frameData && layer.frameData[key];
  if (!fd) return null;
  const im = decodeURL(fd.dataURL);
  const map = new Map();
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const i = (y * im.width + x) * 4;
    if (!im.data[i + 3]) continue;
    map.set(y * im.width + x, '#' + Buffer.from(im.data.slice(i, i + 3)).toString('hex').toUpperCase());
  }
  return { w: im.width, h: im.height, map, placement: fd.placement || null };
}

/* 把某个图层的像素换算到头部图层的坐标空间（放置信息不同时用） */
function toHeadSpace(source, head) {
  const p = source.placement, hp = head.placement;
  if (!p && !hp) return (x, y) => ({ x, y });
  const sx = p ? source.w / p.w : 1, sy = p ? source.h / p.h : 1;
  const ox = p ? p.x : 0, oy = p ? p.y : 0;
  const hx = hp ? hp.w / head.w : 1, hy = hp ? hp.h / head.h : 1;
  const hox = hp ? hp.x : 0, hoy = hp ? hp.y : 0;
  return (x, y) => ({ x: (ox + x * sx - hox) / hx, y: (oy + y * sy - hoy) / hy });
}

function boundsOf(map, w) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const key of map.keys()) {
    const x = key % w, y = Math.floor(key / w);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/* 头部圆形：相对行 -> [起始列, 结束列] */
const HEAD_SPAN = [[2, 8], [1, 9], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [1, 9]];

/* 一行跨度：外沿勾边，内侧实色 */
function spanRow(px, hx, hy, r, c0, c1, opts = {}) {
  const { edgeLeft = true, edgeRight = true, inner = C.hair, lightFrom = null, lightTo = null, leftLight = false } = opts;
  for (let c = c0; c <= c1; c++) {
    let hex = inner;
    if (edgeLeft && c === c0) hex = C.hairEdge;
    if (edgeRight && c === c1) hex = C.hairEdge;
    if (lightFrom != null && c >= lightFrom && c <= lightTo) hex = C.hairLight;
    if (leftLight && c === c0 + 1) hex = C.hairLight;
    px.set(hx + c, hy + r, hex);
  }
}

/* ---------- 前发 ---------- */
function drawFrontHair(px, hx, hy, dir) {
  const put = (r, c, hex) => px.set(hx + c, hy + r, hex);
  if (dir === 'up') return;
  for (let c = 2; c <= 8; c++) put(0, c, C.hairEdge);
  if (dir === 'down') {
    spanRow(px, hx, hy, 1, 1, 9, { lightFrom: 4, lightTo: 5 });
    spanRow(px, hx, hy, 2, 1, 9, { lightFrom: 4, lightTo: 5 });
    spanRow(px, hx, hy, 3, 1, 9, { lightFrom: 4, lightTo: 4, edgeLeft: false, edgeRight: false });
    put(3, 1, C.hairDark);
    put(3, 9, C.hairDark);
    spanRow(px, hx, hy, 4, 1, 9, { inner: C.hair, edgeLeft: false, edgeRight: false });
    put(4, 1, C.hairDark);
    put(4, 9, C.hairDark);
    for (let r = 5; r <= 8; r++) {
      put(r, 1, C.hairDark);
      put(r, 2, C.hair);
      put(r, 8, C.hair);
      put(r, 9, C.hairDark);
    }
    put(9, 1, C.hairDark);
    put(9, 9, C.hairDark);
  } else {
    spanRow(px, hx, hy, 1, 1, 9, { lightFrom: 4, lightTo: 5 });
    spanRow(px, hx, hy, 2, 1, 9, { lightFrom: 4, lightTo: 5 });
    spanRow(px, hx, hy, 3, 1, 9, { lightFrom: 4, lightTo: 4, edgeLeft: false, edgeRight: false });
    put(3, 1, C.hairDark);
    put(3, 9, C.hairEdge);
    spanRow(px, hx, hy, 4, 1, 9, { inner: C.hair, edgeLeft: false, edgeRight: false });
    put(4, 1, C.hairDark);
    for (let r = 5; r <= 8; r++) {
      put(r, 1, C.hairDark);
      if (r === 5) put(r, 2, C.hair);
      put(r, 9, C.hair);
      put(r, 10, C.hairEdge);
    }
    put(9, 9, C.hair);
    put(9, 10, C.hairEdge);
  }
}

/* ---------- 后发 ---------- */
function drawRearHair(px, hx, hy, dir, blocked) {
  const paint = (r, c, hex) => {
    const set = blocked && blocked.get(r);
    if (set && set.has(c)) return;
    px.set(hx + c, hy + r, hex);
  };
  const span = (r, c0, c1, opts = {}) => {
    const { edgeLeft = true, edgeRight = true, inner = C.hair } = opts;
    for (let c = c0; c <= c1; c++) {
      let hex = inner;
      if (edgeLeft && c === c0) hex = C.hairEdge;
      if (edgeRight && c === c1) hex = C.hairEdge;
      paint(r, c, hex);
    }
  };
  if (dir === 'down') {
    span(0, 0, 10);
    span(1, -1, 11);
    for (let r = 2; r <= 8; r++) span(r, -2, 12);
    span(9, -2, 12);
    span(10, -2, 12, { inner: C.hairDark });
  } else if (dir === 'side') {
    span(0, 8, 10, { edgeLeft: false });
    span(1, 9, 11, { edgeLeft: false });
    for (let r = 2; r <= 8; r++) span(r, 10, 12, { edgeLeft: false });
    span(9, 9, 12, { edgeLeft: false });
    span(10, 8, 12, { edgeLeft: false, inner: C.hairDark });
  } else {
    const spans = [[1, 9], [0, 10], [-1, 11], [-1, 11], [-1, 11], [-1, 11], [-1, 11], [-1, 11], [-1, 11], [0, 10]];
    spans.forEach(([c0, c1], r) => {
      for (let c = c0; c <= c1; c++) {
        let hex = C.hair;
        if (c === c0 || c === c1) hex = C.hairEdge;
        else if (r === 0) hex = C.hairDark;
        else if (r >= 6) hex = C.hairDark;
        if ((r === 1 || r === 2) && c >= 2 && c <= 4) hex = C.hairLight;
        px.set(hx + c, hy + r, hex);
      }
    });
    // 后颈只露两侧发尾，肩背留出衣服
    for (const [c0, c1] of [[-1, 1], [9, 11]]) {
      for (let c = c0; c <= c1; c++) px.set(hx + c, hy + 10, c === c0 || c === c1 ? C.hairEdge : C.hairDark);
    }
    for (let r = 1; r <= 3; r++) {
      const cur = px.get(hx + 5, hy + r);
      if (cur && cur !== C.hairEdge) px.set(hx + 5, hy + r, C.hairDark);
    }
  }
}

/* ---------- 发饰：粉色发带 ---------- */
function drawBand(px, hx, hy, dir) {
  const spans = dir === 'up' ? [[-1, 11]] : [[1, 9]];
  for (const [c0, c1] of spans) {
    for (let c = c0; c <= c1; c++) px.set(hx + c, hy + 2, c === c0 || c === c1 ? C.bandDark : C.band);
  }
}

/* ---------- 服装 ---------- */
const tone = {
  blouse: [C.blouse, C.blouseShade],
  skirt: [C.skirt, C.skirtShade],
  hem: [C.hem, C.hemShade],
  shoe: [C.shoe, C.shoeShade]
};

function drawOutfit(px, body, dir) {
  const bb = boundsOf(body.map, body.w);
  if (!bb) return null;
  const top = bb.y0, bottom = bb.y1;
  const bandOf = y => (y === bottom ? 'shoe' : y <= top ? 'blouse' : y >= bottom - 1 ? 'hem' : 'skirt');
  const shadeFrom = Math.round((bb.x0 + bb.x1) / 2) + 1;
  for (const [key, hex] of body.map) {
    const x = key % body.w, y = Math.floor(key / body.w);
    if (hex.toUpperCase() === OUTLINE) { px.set(x, y, OUTLINE); continue; }
    const band = bandOf(y);
    const [base, shade] = tone[band];
    const shadowed = hex.toUpperCase() === SKIN_SHADOW;
    if (band === 'blouse') px.set(x, y, shadowed ? shade : base);
    else px.set(x, y, x >= shadeFrom ? shade : base);
  }
  const spanOf = y => {
    let lo = 1e9, hi = -1;
    for (const key of body.map.keys()) {
      if (Math.floor(key / body.w) !== y) continue;
      const x = key % body.w;
      lo = Math.min(lo, x); hi = Math.max(hi, x);
    }
    return hi < 0 ? null : [lo, hi];
  };
  const center = Math.round((bb.x0 + bb.x1) / 2);
  const repaint = (x, y, hex) => { const cur = px.get(x, y); if (cur && cur !== OUTLINE) px.set(x, y, hex); };
  if (dir !== 'up') {
    const span = spanOf(top);
    if (span) {
      const mid = Math.round((span[0] + span[1]) / 2);
      repaint(mid - 1, top, C.collar);
      repaint(mid + 1, top, C.collar);
      repaint(mid, top, C.collar);
      if (bandOf(top + 1) !== 'shoe') repaint(mid, top + 1, C.button);
    }
  }
  return bb;
}

/* ---------- 组装 ---------- */
function buildBranch(main, eyeProject = main) {
  const project = JSON.parse(JSON.stringify(main));
  project.name = '人物 · 雾紫短发与薄荷背带裙';
  characterBase(project);
  const layers = project.layers;

  const groupIndex = (si, direction) => layers.findIndex(l => l.isGroup && l.sheetIndex === si && l.name === direction);
  const eyesSource = new Map();
  for (const l of eyeProject.layers) {
    if (l.isGroup || l.name !== '眼睛' || l.visible === false) continue;
    const parent = eyeProject.layers[l.parent];
    if (!parent || !parent.isGroup) continue;
    const key = `${l.sheetIndex}:${parent.name}`;
    if (!eyesSource.has(key)) eyesSource.set(key, l);
  }

  const plans = new Map();
  const hairBySheet = new Map();
  const stats = [];

  project.spriteSheets.forEach((sheet, si) => {
    sheet.actions.forEach((action, ai) => {
      const dir = action.direction;
      const gi = groupIndex(si, dir);
      assert(gi >= 0, `缺少分组 ${si}/${dir}`);
      const children = layers.map((l, i) => [l, i]).filter(([l]) => l.parent === gi && !l.isGroup);
      const find = name => (children.find(([l]) => l.name === name) || [])[1];
      const bodyLi = find('body');
      const headLi = find('head');
      assert(bodyLi != null && headLi != null, `缺少素体 ${si}/${dir}`);
      const cloth = { sheetIndex: si, isGroup: false, parent: gi, depth: 0, name: '服装 / 薄荷背带裙', visible: true, locked: false, opacity: 1, frameData: {} };
      let group = hairBySheet.get(si);
      if (!group) {
        group = {
          front: { sheetIndex: si, isGroup: false, parent: null, depth: 0, name: '头发 / 云雾 / 前发', visible: true, locked: false, opacity: 1, frameData: {} },
          rear: { sheetIndex: si, isGroup: false, parent: null, depth: 0, name: '头发 / 云雾 / 后发', visible: true, locked: false, opacity: 1, frameData: {} },
          band: { sheetIndex: si, isGroup: false, parent: null, depth: 0, name: '发饰 / 粉色发带', visible: true, locked: false, opacity: 1, frameData: {} }
        };
        hairBySheet.set(si, group);
      }
      action.frames.forEach((frame, fi) => {
        const key = `${si}_${ai}_${fi}`;
        const body = frameMap(layers[bodyLi], key);
        const head = frameMap(layers[headLi], key);
        assert(body && head, `缺少素体帧 ${key}`);
        const w = body.w, h = body.h;
        const placeBody = body.placement ? { ...body.placement } : null;
        const placeHead = head.placement ? { ...head.placement } : null;

        const clothPx = new Pixels(w, h);
        drawOutfit(clothPx, body, dir);
        if (clothPx.count()) {
          cloth.frameData[key] = { width: w, height: h, dataURL: clothPx.toURL() };
          if (placeBody) cloth.frameData[key].placement = placeBody;
        }

        const hb = boundsOf(head.map, head.w);
        const blocked = new Map();
        if (dir !== 'up') {
          const mapBody = toHeadSpace(body, head);
          for (const [source, project] of [[head, (x, y) => ({ x, y })], [body, mapBody]]) {
            for (const px of source.map.keys()) {
              const { x, y } = project(px % source.w, Math.floor(px / source.w));
              const r = Math.round(y) - hb.y0, c = Math.round(x) - hb.x0;
              if (!blocked.has(r)) blocked.set(r, new Set());
              blocked.get(r).add(c);
            }
          }
        }
        const hw = head.w, hh = head.h;
        const hp = new Pixels(hw, hh), rp = new Pixels(hw, hh), bp = new Pixels(hw, hh);
        drawFrontHair(hp, hb.x0, hb.y0, dir);
        drawRearHair(rp, hb.x0, hb.y0, dir, blocked);
        drawBand(bp, hb.x0, hb.y0, dir);
        const setHair = (target, pixels) => {
          const fd = { width: hw, height: hh, dataURL: pixels.toURL() };
          if (placeHead) fd.placement = { ...placeHead };
          target.frameData[key] = fd;
        };
        setHair(group.front, hp);
        setHair(group.rear, rp);
        setHair(group.band, bp);
        const bd = boundsOf(body.map, body.w);
        stats.push({ key, dir, head: hb, bodyTop: bd.y0, bodyBottom: bd.y1 });
      });
      plans.set(gi, { cloth });
    });
  });

  const oldParent = new Map(layers.map(l => [l, l.parent == null ? null : layers[l.parent]]));
  for (const [gi, plan] of plans) oldParent.set(plan.cloth, layers[gi]);
  // 服装插在头部与眼睛之间：五官必须压在衣服上面
  const anchorOfGroup = new Map();
  for (const gi of plans.keys()) {
    const kids = layers.map((l, i) => [l, i]).filter(([l]) => l.parent === gi && !l.isGroup);
    const eyesLayer = kids.find(([l]) => l.name === '眼睛');
    const handLayer = kids.find(([l]) => l.name === 'hand');
    anchorOfGroup.set(gi, (eyesLayer || handLayer || [])[1]);
  }

  const out = [];
  const newIndex = new Map();
  const push = layer => { if (newIndex.has(layer)) return; newIndex.set(layer, out.length); out.push(layer); };
  const insertedEyes = new Set();

  layers.forEach((l, i) => {
    const plan = !l.isGroup && l.parent != null ? plans.get(l.parent) : null;
    if (plan && anchorOfGroup.get(l.parent) === i) {
      const parent = layers[l.parent];
      const eyeKey = `${parent.sheetIndex}:${parent.name}`;
      const eyeSrc = eyesSource.get(eyeKey);
      const hasOwnEyes = layers.some(x => !x.isGroup && x.parent === l.parent && x.name === '眼睛');
      push(plan.cloth);
      if (!hasOwnEyes && eyeSrc && !insertedEyes.has(eyeKey)) {
        const copy = JSON.parse(JSON.stringify(eyeSrc));
        copy.name = '眼睛';
        oldParent.set(copy, parent);
        push(copy);
        insertedEyes.add(eyeKey);
      }
    }
    push(l);
  });
  for (const group of hairBySheet.values()) {
    push(group.rear);
    push(group.front);
    push(group.band);
  }
  project.layers = out;
  for (const l of project.layers) {
    const parent = oldParent.get(l) ?? null;
    l.parent = parent ? newIndex.get(parent) : null;
    if (parent && l.parent == null) throw new Error('父级映射失败：' + l.name);
  }
  // 打开工程时停在待机正面，并选中新画的头发，方便继续修改
  project.currentSheetIndex = 1;
  project.currentActionIndex = 1;
  project.currentFrameIndex = 0;
  const focus = project.layers.findIndex(l => !l.isGroup && l.sheetIndex === 1 && l.name === '头发 / 云雾 / 前发');
  project.currentLayerIndex = focus >= 0 ? focus : 0;
  return { project, stats };
}

/* 与编辑器一致的绘制顺序：后发插到头身之后；背面把后发与发饰提到最上层 */
function slotOf(name) {
  const tail = String(name || '').split(' / ').map(s => s.trim()).filter(Boolean).at(-1) || '';
  if (/后发|背发|后面的头发/.test(tail)) return '后发';
  if (/发饰|发夹|发卡|发带|蝴蝶结|头饰|帽子/.test(tail)) return '饰品';
  return '';
}
function orderedLayers(project, si, ai) {
  const layers = project.layers.filter(l => l.sheetIndex === si || l.isGroup && l.sheetIndex === si);
  const isRear = l => !l.isGroup && slotOf(l.name) === '后发';
  const isAcc = l => !l.isGroup && slotOf(l.name) === '饰品';
  const direction = project.spriteSheets[si].actions[ai].direction;
  if (direction !== 'up') {
    const rear = layers.filter(isRear);
    const rest = layers.filter(l => !isRear(l));
    if (!rear.length) return layers;
    let base = -1;
    rest.forEach((l, i) => { if (!l.isGroup && /^(head|body|头部|身体)$/.test(l.name)) base = i; });
    if (base < 0) return layers;
    rest.splice(base + 1, 0, ...rear);
    return rest;
  }
  return [...layers.filter(l => !isRear(l) && !isAcc(l)), ...layers.filter(isRear), ...layers.filter(isAcc)];
}

function previews(project) {
  const sheetInfo = [];
  project.spriteSheets.forEach((sheet, si) => {
    sheet.actions.forEach((action, ai) => {
      const order = orderedLayers(project, si, ai);
      action.frames.forEach((frame, fi) => {
        const key = `${si}_${ai}_${fi}`;
        const w = frame.width, h = frame.height;
        const buf = new Uint8Array(w * h * 4);
        const names = [];
        order.forEach(l => {
          if (l.isGroup || l.sheetIndex !== si || l.visible === false) return;
          const fd = l.frameData[key];
          if (!fd) return;
          const im = decodeURL(fd.dataURL);
          const place = fd.placement || { x: 0, y: 0, w: im.width, h: im.height };
          let painted = 0;
          for (let fy = 0; fy < place.h; fy++) for (let fx = 0; fx < place.w; fx++) {
            const tx = place.x + fx, ty = place.y + fy;
            if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
            const sx = Math.min(im.width - 1, Math.floor(fx * im.width / place.w));
            const sy = Math.min(im.height - 1, Math.floor(fy * im.height / place.h));
            const i = (sy * im.width + sx) * 4;
            if (!im.data[i + 3]) continue;
            const t = (ty * w + tx) * 4;
            buf[t] = im.data[i]; buf[t + 1] = im.data[i + 1]; buf[t + 2] = im.data[i + 2]; buf[t + 3] = 255;
            painted++;
          }
          if (painted) names.push(l.name);
        });
        sheetInfo.push({ si, ai, fi, w, h, names, buf });
      });
    });
  });
  return sheetInfo;
}

function ascii(project, si, ai, fi) {
  const entry = previews(project).find(e => e.si === si && e.ai === ai && e.fi === fi);
  const legend = new Map();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let head = '    ';
  for (let x = 0; x < entry.w; x++) head += x % 10;
  const lines = [`sheet ${si} action ${ai} frame ${fi} ${entry.w}x${entry.h}`, head];
  for (let y = 0; y < entry.h; y++) {
    let line = String(y).padStart(3, ' ') + ' ';
    for (let x = 0; x < entry.w; x++) {
      const i = (y * entry.w + x) * 4;
      if (!entry.buf[i + 3]) { line += '.'; continue; }
      const hex = Buffer.from(entry.buf.slice(i, i + 3)).toString('hex');
      if (!legend.has(hex)) legend.set(hex, chars[legend.size]);
      line += legend.get(hex);
    }
    lines.push(line);
  }
  lines.push('legend ' + [...legend].map(([h, c]) => c + '=#' + h.toUpperCase()).join(' '));
  return lines.join('\n');
}

function contactSheet(project, scale, background) {
  const entries = previews(project);
  const maxW = Math.max(...entries.map(e => e.w)), maxH = Math.max(...entries.map(e => e.h));
  const cols = Math.max(...project.spriteSheets.map(s => Math.max(...s.actions.map(a => a.frames.length))));
  const cellW = maxW * scale + 6, cellH = maxH * scale + 6;
  const rows = project.spriteSheets.reduce((n, s) => n + s.actions.length, 0);
  const W = cols * cellW + 6, H = rows * cellH + 6;
  const canvas = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    canvas[i * 4] = background[0]; canvas[i * 4 + 1] = background[1]; canvas[i * 4 + 2] = background[2]; canvas[i * 4 + 3] = 255;
  }
  let row = 0;
  project.spriteSheets.forEach((sheet, si) => {
    sheet.actions.forEach((action, ai) => {
      action.frames.forEach((frame, fi) => {
        const entry = entries.find(e => e.si === si && e.ai === ai && e.fi === fi);
        const x0 = 6 + fi * cellW + Math.floor((maxW - entry.w) / 2) * scale;
        const y0 = 6 + row * cellH;
        for (let y = 0; y < entry.h * scale; y++) for (let x = 0; x < entry.w * scale; x++) {
          const src = (Math.floor(y / scale) * entry.w + Math.floor(x / scale)) * 4;
          if (!entry.buf[src + 3]) continue;
          const dst = ((y0 + y) * W + x0 + x) * 4;
          canvas[dst] = entry.buf[src]; canvas[dst + 1] = entry.buf[src + 1]; canvas[dst + 2] = entry.buf[src + 2]; canvas[dst + 3] = 255;
        }
      });
      row++;
    });
  });
  return encode(W, H, canvas);
}

module.exports = { buildBranch, previews, contactSheet, ascii, characterBase, orderedLayers, slotOf, C, OUTLINE };

if (require.main === module) (async () => {
  const cli = process.argv.slice(2);
  const mode = cli[0] || '';
  const nums = cli.slice(1).filter(v => /^\d+$/.test(v)).map(Number);
  const baseFile = cli.includes('branch') ? 'branch-base.json' : 'main-current.json';
  const main = JSON.parse(fs.readFileSync(path.join(dir, baseFile), 'utf8'));
  const { project, stats } = buildBranch(main);

  // 底稿保护：body / head / hand 与头发服装以外的一切必须与主工程逐像素一致
  const protectedNames = new Set(['body', 'head', 'hand', 'hand 2']);
  const mainBase = JSON.parse(JSON.stringify(main));
  characterBase(mainBase);
  assert.equal(project.spriteSheets.length, main.spriteSheets.length);
  assert.deepEqual(project.spriteSheets, main.spriteSheets, '画布与动作表必须与主工程一致');
  const baseLayers = project.layers.filter(l => !l.isGroup && protectedNames.has(l.name));
  const expectBase = mainBase.layers.filter(l => !l.isGroup && protectedNames.has(l.name));
  assert.equal(baseLayers.length, expectBase.length, '底稿数量不一致');
  baseLayers.forEach((l, i) => {
    assert.equal(l.name, expectBase[i].name);
    assert.equal(l.sheetIndex, expectBase[i].sheetIndex);
    assert.deepEqual(l.frameData, expectBase[i].frameData, `${l.name} 底稿像素被改动`);
  });
  // 新增图层沿用底稿的放置信息，尺寸随底稿（坐姿有裁切帧）
  const baseByKey = new Map();
  mainBase.layers.forEach(l => {
    if (l.isGroup) return;
    for (const [key, fd] of Object.entries(l.frameData)) baseByKey.set(`${l.sheetIndex}|${l.name}|${key}`, fd);
  });
  for (const l of project.layers) {
    if (l.isGroup || !/^(头发|服装|发饰)/.test(l.name)) continue;
    const baseName = /^服装/.test(l.name) ? 'body' : 'head';
    for (const [key, fd] of Object.entries(l.frameData)) {
      const base = baseByKey.get(`${l.sheetIndex}|${baseName}|${key}`);
      assert(base, `找不到对应底稿 ${l.sheetIndex} ${key}`);
      assert.equal(fd.width, base.width, `${l.name} ${key} 宽度必须与${baseName}一致`);
      assert.equal(fd.height, base.height, `${l.name} ${key} 高度必须与${baseName}一致`);
      assert.deepEqual(fd.placement || null, base.placement || null, `${l.name} ${key} 放置信息必须与${baseName}一致`);
    }
  }
  const hairFrames = project.layers.filter(l => /^头发/.test(l.name)).reduce((n, l) => n + Object.keys(l.frameData).length, 0);
  const clothFrames = project.layers.filter(l => /^服装/.test(l.name)).reduce((n, l) => n + Object.keys(l.frameData).length, 0);

  if (mode === 'ascii') {
    console.log(ascii(project, nums[0], nums[1], nums[2]));
    return;
  }

  fs.writeFileSync(path.join(dir, 'contact-light.png'), contactSheet(project, 6, [227, 232, 238]));
  fs.writeFileSync(path.join(dir, 'contact-dark.png'), contactSheet(project, 6, [48, 45, 57]));
  fs.writeFileSync(path.join(dir, 'candidate.json'), JSON.stringify(project));
  fs.writeFileSync(path.join(dir, 'frame-stats.json'), JSON.stringify(stats, null, 1));
  const summary = {
    name: project.name,
    layers: project.layers.length,
    hairFrames,
    clothFrames,
    sheets: project.spriteSheets.map((s, i) => `${s.name}: ${s.actions.map(a => a.direction + '×' + a.frames.length).join(' ')}`),
    palette: { hair: [C.hairEdge, C.hairDark, C.hair, C.hairLight], band: [C.band, C.bandDark], cloth: [C.blouse, C.blouseShade, C.collar, C.button, C.skirt, C.skirtShade, C.hem, C.hemShade, C.shoe, C.shoeShade] }
  };
  console.log(JSON.stringify(summary, null, 1));
})().catch(e => { console.error(e); process.exitCode = 1; });
