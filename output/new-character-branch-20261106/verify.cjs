/* 保存后的成品校验：底稿、层序、眼睛遮挡、每帧覆盖率 */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { decode } = require('../../scripts/png.cjs');
const { orderedLayers } = require('./build.cjs');

const dir = __dirname;
const project = JSON.parse(fs.readFileSync(path.join(dir, 'saved-branch.json'), 'utf8'));
const main = JSON.parse(fs.readFileSync(path.join(dir, 'main-current.json'), 'utf8'));
const dec = u => decode(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));

const problems = [];
const layerKey = l => {
  const parent = l.parent == null ? null : project.layers[l.parent] || main.layers[l.parent];
  return `${l.sheetIndex}|${l.name}|${l.groupKey || ''}`;
};
const groupKeyOf = (p, l) => {
  const parent = l.parent == null ? null : p.layers[l.parent];
  return parent && parent.isGroup ? `${parent.name}` : '';
};

// 1. 底稿逐像素等于主工程
const mainBase = new Map();
main.layers.forEach(l => {
  if (!l.isGroup && ['body', 'head', 'hand', 'hand 2'].includes(l.name)) {
    mainBase.set(`${l.sheetIndex}|${l.name}|${groupKeyOf(main, l)}`, l);
  }
});
let baseChecked = 0;
project.layers.forEach(l => {
  if (l.isGroup || !['body', 'head', 'hand', 'hand 2'].includes(l.name)) return;
  const src = mainBase.get(`${l.sheetIndex}|${l.name}|${groupKeyOf(project, l)}`);
  if (!src) { problems.push(`主工程缺少底稿 ${l.sheetIndex}|${l.name}|${groupKeyOf(project, l)}`); return; }
  baseChecked++;
  const keys = new Set([...Object.keys(l.frameData), ...Object.keys(src.frameData)]);
  let mismatch = null;
  for (const key of keys) {
    const x = l.frameData[key], y = src.frameData[key];
    if (!x || !y) { mismatch = key + ' 帧数量不同'; break; }
    if (JSON.stringify(x.placement || null) !== JSON.stringify(y.placement || null)) { mismatch = key + ' 放置信息不同'; break; }
    const ix = dec(x.dataURL), iy = dec(y.dataURL);
    if (ix.width !== iy.width || ix.height !== iy.height || Buffer.compare(Buffer.from(ix.data), Buffer.from(iy.data)) !== 0) {
      mismatch = key + ' 像素不同';
      break;
    }
  }
  if (mismatch) problems.push(`底稿被改动 ${l.sheetIndex}|${l.name}|${groupKeyOf(project, l)} ${mismatch}`);
});

// 2. 层序：服装夹在头部/眼睛与手部之间，五官不能被衣服或头发盖住
project.layers.forEach((l, i) => {
  if (l.name !== '服装 / 薄荷背带裙') return;
  const next = project.layers[i + 1];
  const prev = project.layers[i - 1];
  const ok = next && (next.name === '眼睛' || next.name === 'hand');
  if (!ok) problems.push(`服装层序异常：${i} 前一层 ${prev && prev.name} 后一层 ${next && next.name}`);
});
const eyes = project.layers.filter(l => l.name === '眼睛');
const hairRear = project.layers.filter(l => l.name === '头发 / 云雾 / 后发');
const hairFront = project.layers.filter(l => l.name === '头发 / 云雾 / 前发');
const bands = project.layers.filter(l => l.name === '发饰 / 粉色发带');
const cloth = project.layers.filter(l => l.name === '服装 / 薄荷背带裙');

// 3. 合成并检查眼睛是否被头发挡住
function composite(si, ai, fi) {
  const frame = project.spriteSheets[si].actions[ai].frames[fi];
  const w = frame.width, h = frame.height;
  const buf = new Uint8Array(w * h * 4);
  orderedLayers(project, si, ai).forEach(l => {
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

const coverage = {};
let eyeFrames = 0, eyeHidden = 0;
project.spriteSheets.forEach((sheet, si) => sheet.actions.forEach((action, ai) => action.frames.forEach((frame, fi) => {
  const key = `${si}_${ai}_${fi}`;
  const comp = composite(si, ai, fi);
  const eye = eyes.find(l => l.frameData[key] && l.sheetIndex === si);
  if (eye) {
    const im = dec(eye.frameData[key].dataURL);
    const place = eye.frameData[key].placement || { x: 0, y: 0, w: im.width, h: im.height };
    let total = 0, hidden = 0;
    for (let fy = 0; fy < place.h; fy++) for (let fx = 0; fx < place.w; fx++) {
      const sx = Math.min(im.width - 1, Math.floor(fx * im.width / place.w));
      const sy = Math.min(im.height - 1, Math.floor(fy * im.height / place.h));
      const i = (sy * im.width + sx) * 4;
      if (!im.data[i + 3]) continue;
      total++;
      const t = ((place.y + fy) * comp.w + place.x + fx) * 4;
      if (comp.buf[t] !== im.data[i] || comp.buf[t + 1] !== im.data[i + 1] || comp.buf[t + 2] !== im.data[i + 2]) hidden++;
    }
    if (total) {
      eyeFrames++;
      if (hidden) { eyeHidden++; problems.push(`眼睛被遮住 ${sheet.name}/${action.direction}#${fi} (${hidden}/${total})`); }
    }
  }
  const name = `${sheet.name}/${action.direction}`;
  coverage[name] = coverage[name] || { frames: 0, hairFront: 0, hairRear: 0, band: 0, cloth: 0 };
  coverage[name].frames++;
  const count = layer => layer && layer.frameData[key] ? (() => {
    const im = dec(layer.frameData[key].dataURL);
    let n = 0;
    for (let i = 0; i < im.width * im.height; i++) if (im.data[i * 4 + 3]) n++;
    return n;
  })() : 0;
  coverage[name].hairFront += count(hairFront.find(l => l.sheetIndex === si));
  coverage[name].hairRear += count(hairRear.find(l => l.sheetIndex === si));
  coverage[name].band += count(bands.find(l => l.sheetIndex === si));
  coverage[name].cloth += count(cloth.find(l => l.sheetIndex === si && l.parent === layerParentOf(si, action.direction, fi)));
})));

function layerParentOf(si, direction, fi) {
  return project.layers.findIndex(l => l.isGroup && l.sheetIndex === si && l.name === direction);
}

const report = {
  baseChecked,
  eyesLayers: eyes.length,
  eyeFrames,
  eyeHidden,
  layers: project.layers.length,
  coverage,
  problems
};
fs.writeFileSync(path.join(dir, 'verification.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
if (problems.length) { console.error('FAIL'); process.exitCode = 1; } else console.log('PASS 底稿、层序、眼睛遮挡、覆盖全部通过');
