/* 回读校验：头发/服装/发饰/眼睛 必须与候选稿逐帧一致；底稿（身体/头/手）必须与主工程同帧同像素 */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { loadProject, frameMap } = require('./pix.cjs');

const id = process.argv[2];
if (!id) throw new Error('需要工程编号');

const BASE = /^(body|head|hand|hand 2)$/;

/* 把某一层在某帧的像素（含 placement 展开）转成可比较的字符串 */
function pixels(layer, key, frame) {
  const fm = frameMap(layer, key, frame.width, frame.height);
  if (!fm) return 'none';
  return [...fm.map.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(',');
}

function indexBySheet(project) {
  const byName = new Map(project.spriteSheets.map((s, i) => [s.name, { sheet: s, si: i }]));
  return byName;
}

function collect(project, re) {
  const out = new Map();
  const sheets = indexBySheet(project);
  project.layers.forEach(l => {
    if (l.isGroup || !re.test(l.name)) return;
    const parent = l.parent == null ? '' : (project.layers[l.parent]?.name ?? '');
    const sheetName = project.spriteSheets[l.sheetIndex]?.name ?? '?';
    for (const key of Object.keys(l.frameData || {})) {
      const [si, ai, fi] = key.split('_').map(Number);
      const sheetInfo = sheets.get(sheetName);
      if (!sheetInfo) continue;
      const action = sheetInfo.sheet.actions[ai];
      const frame = action?.frames[fi];
      if (!frame) continue;
      const k = `${sheetName}|${action.direction}|${parent}|${l.name}|${fi}`;
      out.set(k, pixels(l, key, frame));
    }
  });
  return out;
}

(async () => {
  const res = await fetch(`http://127.0.0.1:8765/api/project?id=${id}`);
  assert(res.ok, '回读失败 ' + res.status);
  const raw = await res.text();
  const saved = JSON.parse(raw);
  const cand = loadProject('candidate.json');
  const main = loadProject('main.json');

  const report = { savedId: id, name: saved.name, bytes: Buffer.byteLength(raw), etag: res.headers.get('etag') };

  /* 1. 造型层：与候选稿完全一致 */
  const dressRe = /^(头发|服装|发饰|眼睛)/;
  const cs = collect(cand, dressRe), ss = collect(saved, dressRe);
  const missing = [...cs.keys()].filter(k => !ss.has(k));
  const extra = [...ss.keys()].filter(k => !cs.has(k));
  const diff = [...cs.entries()].filter(([k, v]) => ss.has(k) && ss.get(k) !== v).map(([k]) => k);
  report.style = { candidate: cs.size, saved: ss.size, missing: missing.slice(0, 10), extra: extra.slice(0, 10), diff: diff.slice(0, 10) };

  /* 2. 底稿：与主工程同帧同像素 */
  const cb = collect(main, BASE), sb = collect(saved, BASE);
  const baseMissing = [...cb.keys()].filter(k => !sb.has(k));
  const baseDiff = [...cb.entries()].filter(([k, v]) => sb.has(k) && sb.get(k) !== v).map(([k]) => k);
  report.base = { main: cb.size, saved: sb.size, missing: baseMissing.slice(0, 10), diff: baseDiff.slice(0, 10) };

  /* 3. 画布与动作表 */
  report.sheetsEqual = JSON.stringify(saved.spriteSheets) === JSON.stringify(main.spriteSheets);
  report.inherited = saved.layers.filter(l => l.inheritedBase).length;
  report.palette = saved.palette?.length ?? 0;
  report.current = [saved.currentSheetIndex, saved.currentActionIndex, saved.currentFrameIndex];
  report.layerNames = [...new Set(saved.layers.filter(l => !l.isGroup).map(l => l.name))];

  console.log(JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(__dirname, 'readback.json'), raw);

  const ok = !missing.length && !extra.length && !diff.length && !baseMissing.length && !baseDiff.length && report.sheetsEqual;
  if (!ok) { console.error('READBACK MISMATCH'); process.exitCode = 1; }
})().catch(e => { console.error(e); process.exitCode = 1; });
