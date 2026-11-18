const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const png = require('../../scripts/png.cjs');
const dir = __dirname;
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const url = 'http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116';

async function main() {
  assert(!fs.existsSync(path.join(dir, '工程原始备份.json')), '已有备份，禁止重复导入');
  const response = await fetch(url);
  assert.equal(response.status, 200);
  const raw = Buffer.from(await response.arrayBuffer());
  const etag = response.headers.get('etag');
  assert(etag);
  fs.writeFileSync(path.join(dir, '工程原始备份.json'), raw);
  const original = JSON.parse(raw);
  const project = structuredClone(original);
  const tile = fs.readFileSync(path.join(dir, 'out/sprites/浅灰石砖_16x16.png'));
  const im = png.decode(tile);
  assert.equal(im.width, 16); assert.equal(im.height, 16);
  const colors = new Set();
  for (let i = 0; i < im.data.length; i += 4) {
    assert.equal(im.data[i + 3], 255);
    colors.add(Buffer.from(im.data.subarray(i, i + 4)).toString('hex'));
  }
  assert.equal(colors.size, 4);
  const grout = 'a9b7baff';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = Buffer.from(im.data.subarray((y * 16 + x) * 4, (y * 16 + x) * 4 + 4)).toString('hex');
    assert.equal(c === grout, x === 0 || y === 0, '单像素接缝');
  }
  fs.writeFileSync(path.join(dir, '浅灰石砖_16x16.png'), tile);
  for (const [name, repeats, scale] of [['浅灰石砖_放大预览.png', 1, 16], ['拼接检查_3x3.png', 3, 8]]) {
    const w = 16 * repeats * scale, pixels = new Uint8Array(w * w * 4);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const src = ((Math.floor(y / scale) % 16) * 16 + Math.floor(x / scale) % 16) * 4;
      pixels.set(im.data.subarray(src, src + 4), (y * w + x) * 4);
    }
    const out = path.join(dir, name);
    fs.writeFileSync(out, png.encode(w, w, pixels));
    assert.deepEqual(png.decode(fs.readFileSync(out)).data, pixels);
  }
  const index = project.spriteSheets.length;
  const dataURL = 'data:image/png;base64,' + tile.toString('base64');
  project.spriteSheets.push({
    name: '浅灰石砖 · 单块16×16', frameWidth: 16, frameHeight: 16,
    columns: 1, rows: 1, spacingX: 0, spacingY: 0, offsetX: 0, offsetY: 0, fps: 8,
    imageDataURL: dataURL,
    actions: [{ name: '单块', direction: 'none', frames: [{
      sheetIndex: index, sourceX: 0, sourceY: 0, width: 16, height: 16,
      duration: 100, locked: false, lockedRegions: [], status: 'completed',
      notes: '单块可重复铺设的浅灰石砖，16×16；参考用户方砖截图的形状与Floor1的柔和低对比像素风。顶部与左侧各一像素接缝，不重复描四边。'
    }] }]
  });
  project.layers.push({ sheetIndex: index, parent: null, name: '浅灰石砖 · 单块',
    visible: true, locked: false, opacity: 1,
    frameData: { [`${index}_0_0`]: { width: 16, height: 16, dataURL } }
  });
  Object.assign(project, { currentSheetIndex: index, currentActionIndex: 0,
    currentFrameIndex: 0, currentLayerIndex: project.layers.length - 1 });
  fs.writeFileSync(path.join(dir, '工程候选稿.json'), JSON.stringify(project));
  fs.writeFileSync(path.join(dir, '备份摘要.json'), JSON.stringify({ url, etag,
    sha256: hash(raw), tileSha256: hash(tile) }, null, 2));
  const put = await fetch(url, { method: 'PUT', headers: {
    'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': etag
  }, body: JSON.stringify(project) });
  const output = await put.text();
  fs.writeFileSync(path.join(dir, '保存响应.txt'), `${put.status}\n${output}`);
  assert.equal(put.status, 200, '保存冲突或失败，候选稿保留；不自动重试');
  const read = await fetch(url);
  assert.equal(read.status, 200);
  const savedRaw = Buffer.from(await read.arrayBuffer());
  fs.writeFileSync(path.join(dir, '保存后回读.json'), savedRaw);
  const saved = JSON.parse(savedRaw);
  assert.deepEqual(saved, project);
  assert.deepEqual(saved.spriteSheets.slice(0, index), original.spriteSheets);
  assert.deepEqual(saved.layers.slice(0, original.layers.length), original.layers);
  const restored = structuredClone(saved);
  restored.spriteSheets.pop(); restored.layers.pop();
  for (const key of ['currentSheetIndex', 'currentActionIndex', 'currentFrameIndex', 'currentLayerIndex']) restored[key] = original[key];
  assert.deepEqual(restored, original, '额外副本中撤销新增项必须还原原工程');
  const report = { result: 'PASS', originalETag: etag, savedETag: read.headers.get('etag'),
    originalSHA256: hash(raw), savedSHA256: hash(savedRaw), tileSHA256: hash(tile),
    size: '16x16', colors: colors.size, opaquePixels: 256,
    addedSheetIndex: index, addedLayers: 1, frames: 1, duration: 100,
    priorSheetsUnchanged: true, priorLayersUnchanged: true,
    exactAPIReadback: true, restorationOnExtraCopy: true,
    frontendRefreshed: false };
  fs.writeFileSync(path.join(dir, '验证记录.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(dir, '恢复说明.txt'), '本次仅新增末尾一张「浅灰石砖 · 单块16×16」画布和一个同名图层，并切换保存的选择索引。\n已在额外内存副本验证：去掉新增画布、图层并还原四个选择索引，完全等于原工程。\n工程原始备份.json 保留完整原始响应，ETag和SHA256见备份摘要.json。\n需要恢复时先GET当前工程，在副本中只撤销这次新增内容，保留后续编辑，再用当前ETag按If-Match PUT；409时停止。不要用旧备份直接覆盖后续修改。\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
