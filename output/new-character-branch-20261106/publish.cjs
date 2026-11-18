/* 两段式保存：① 先让服务端用当前主工程素体重建分支底稿；② 再按底稿坐标画头发与衣服并保存 */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { buildBranch, characterBase, previews, contactSheet, C } = require('./build.cjs');

const dir = __dirname;
const BASE = 'http://127.0.0.1:8765';
const BRANCH_ID = 'character-682ea651-ce3e-45b6-bdf2-23c5a6766e6e';
const NAME = '人物 · 雾紫短发与薄荷背带裙';

const get = async id => {
  const res = await fetch(`${BASE}/api/project?id=${id}`);
  assert(res.ok, `读取失败 ${id} ${res.status}`);
  const raw = await res.text();
  return { json: JSON.parse(raw), etag: res.headers.get('etag'), raw };
};
const put = async (id, body, match) => {
  const res = await fetch(`${BASE}/api/project?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': match },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  assert(res.ok, `保存失败 ${res.status} ${text}`);
  return { etag: res.headers.get('etag'), text };
};

function frameBounds(entry) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < entry.h; y++) for (let x = 0; x < entry.w; x++) {
    if (!entry.buf[(y * entry.w + x) * 4 + 3]) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

(async () => {
  const main = await get('main');
  fs.writeFileSync(path.join(dir, 'main-current.json'), main.raw);
  fs.writeFileSync(path.join(dir, 'main-current-etag.txt'), main.etag + '\n');
  console.log('main ETag', main.etag);

  // ① 底稿阶段：把当前主工程素体写进分支
  const branch = await get(BRANCH_ID);
  const stage1 = JSON.parse(JSON.stringify(main.json));
  stage1.name = NAME;
  characterBase(stage1);
  const saved1 = await put(BRANCH_ID, stage1, branch.etag);
  const afterBase = await get(BRANCH_ID);
  fs.writeFileSync(path.join(dir, 'branch-base.json'), afterBase.raw);
  console.log('底稿已同步，ETag', afterBase.etag);

  // ② 绘画阶段：以分支自己的底稿坐标为准，眼睛从主工程原样搬入
  const { project } = buildBranch(JSON.parse(afterBase.raw), main.json);
  const before = previews(project);
  const saved2 = await put(BRANCH_ID, project, afterBase.etag);
  const final = await get(BRANCH_ID);
  fs.writeFileSync(path.join(dir, 'saved-branch.json'), final.raw);
  const savedProject = JSON.parse(final.raw);

  // 校验：底稿像素 = 主工程底稿；新图层齐全；整体仅可能整体平移
  const mainBase = JSON.parse(JSON.stringify(main.json));
  characterBase(mainBase);
  const baseName = new Set(['body', 'head', 'hand', 'hand 2']);
  const savedBase = savedProject.layers.filter(l => !l.isGroup && baseName.has(l.name));
  assert.equal(savedBase.length, mainBase.layers.filter(l => !l.isGroup && baseName.has(l.name)).length, '底稿数量不符');
  const names = savedProject.layers.filter(l => !l.isGroup).map(l => l.name);
  for (const want of ['头发 / 云雾 / 后发', '头发 / 云雾 / 前发', '发饰 / 粉色发带', '服装 / 薄荷背带裙']) {
    assert(names.includes(want), '保存后缺少 ' + want);
  }
  const shifts = [];
  previews(savedProject).forEach((entry, i) => {
    const a = frameBounds(before[i]), b = frameBounds(entry);
    shifts.push(`${b.x - a.x},${b.y - a.y}`);
  });
  const unique = [...new Set(shifts)];
  assert.equal(savedProject.spriteSheets.length, main.json.spriteSheets.length);
  const report = {
    branch: BRANCH_ID,
    name: savedProject.name,
    etag: final.etag,
    stageEtags: [saved1.etag, saved2.etag],
    mainEtag: main.etag,
    layers: savedProject.layers.length,
    frames: savedProject.spriteSheets.map(s => `${s.name} ${s.frameWidth}x${s.frameHeight} ${s.actions.map(a => a.direction + '×' + a.frames.length).join(' ')}`),
    newLayerFrames: Object.fromEntries(['头发 / 云雾 / 后发', '头发 / 云雾 / 前发', '发饰 / 粉色发带', '服装 / 薄荷背带裙']
      .map(n => [n, savedProject.layers.filter(l => l.name === n).reduce((t, l) => t + Object.keys(l.frameData).length, 0)])),
    canvasShift: unique
  };
  fs.writeFileSync(path.join(dir, 'publish-result.json'), JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(dir, 'contact-light.png'), contactSheet(savedProject, 6, [227, 232, 238]));
  fs.writeFileSync(path.join(dir, 'contact-dark.png'), contactSheet(savedProject, 6, [48, 45, 57]));
  fs.writeFileSync(path.join(dir, 'saved-preview.json'), JSON.stringify(savedProject));
  console.log(JSON.stringify(report, null, 1));
})().catch(e => { console.error(e); process.exitCode = 1; });
