const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const png = require('../../scripts/png.cjs');
const dir = path.resolve(__dirname, '../浅灰石砖_四块拼接_20261117');
const url = 'http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116';
const hash = b => crypto.createHash('sha256').update(b).digest('hex');

(async () => {
  fs.mkdirSync(dir, { recursive: true });
  assert(!fs.existsSync(path.join(dir, '工程原始备份.json')), '禁止覆盖已有备份');
  const get = await fetch(url);
  assert.equal(get.status, 200);
  const raw = Buffer.from(await get.arrayBuffer()), etag = get.headers.get('etag');
  assert(etag);
  fs.writeFileSync(path.join(dir, '工程原始备份.json'), raw);
  fs.writeFileSync(path.join(dir, '备份摘要.json'), JSON.stringify({ url, etag, sha256: hash(raw) }, null, 2));
  const original = JSON.parse(raw), project = structuredClone(original);
  const si = project.spriteSheets.findIndex(s => s.name === '浅灰石砖 · 单块16×16');
  assert(si >= 0);
  const layers = project.layers.map((l, i) => ({ l, i })).filter(x => x.l.sheetIndex === si);
  assert.equal(layers.length, 1);
  const { l, i: li } = layers[0], key = `${si}_0_0`;
  const tile = png.decode(Buffer.from(l.frameData[key].dataURL.split(',')[1], 'base64'));
  assert.equal(tile.width, 16); assert.equal(tile.height, 16);
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const src = ((y % 16) * 16 + x % 16) * 4;
    pixels.set(tile.data.subarray(src, src + 4), (y * 32 + x) * 4);
  }
  const file = path.join(dir, '浅灰石砖_四块拼接_32x32.png');
  const bytes = png.encode(32, 32, pixels);
  fs.writeFileSync(file, bytes);
  assert.deepEqual(png.decode(fs.readFileSync(file)).data, pixels);
  for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) for (let y = 0; y < 16; y++) {
    assert.deepEqual(pixels.subarray(((ty * 16 + y) * 32 + tx * 16) * 4, ((ty * 16 + y) * 32 + tx * 16 + 16) * 4), tile.data.subarray(y * 64, (y + 1) * 64));
  }
  const preview = new Uint8Array(320 * 320 * 4);
  for (let y = 0; y < 320; y++) for (let x = 0; x < 320; x++) {
    const src = (Math.floor(y / 10) * 32 + Math.floor(x / 10)) * 4;
    preview.set(pixels.subarray(src, src + 4), (y * 320 + x) * 4);
  }
  fs.writeFileSync(path.join(dir, '浅灰石砖_四块拼接_放大预览.png'), png.encode(320, 320, preview));
  const dataURL = 'data:image/png;base64,' + bytes.toString('base64');
  const s = project.spriteSheets[si];
  assert.equal(s.actions.length, 1); assert.equal(s.actions[0].frames.length, 1);
  Object.assign(s, { name: '浅灰石砖 · 四块拼接32×32', frameWidth: 32, frameHeight: 32, imageDataURL: dataURL });
  Object.assign(s.actions[0].frames[0], { width: 32, height: 32, notes: '四块相同16×16石砖按2×2拼接，整体32×32；不缩放单块，不改变配色。' });
  l.name = '浅灰石砖 · 四块拼接';
  l.frameData[key] = { ...l.frameData[key], width: 32, height: 32, dataURL };
  fs.writeFileSync(path.join(dir, '工程候选稿.json'), JSON.stringify(project));
  const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': etag }, body: JSON.stringify(project) });
  const output = await put.text();
  fs.writeFileSync(path.join(dir, '保存响应.txt'), `${put.status}\n${output}`);
  assert.equal(put.status, 200, '保存失败或冲突，不自动重试');
  const read = await fetch(url); assert.equal(read.status, 200);
  const savedRaw = Buffer.from(await read.arrayBuffer()), saved = JSON.parse(savedRaw);
  fs.writeFileSync(path.join(dir, '保存后回读.json'), savedRaw);
  assert.deepEqual(saved, project);
  const undo = structuredClone(saved);
  undo.spriteSheets[si] = original.spriteSheets[si]; undo.layers[li] = original.layers[li];
  assert.deepEqual(undo, original, '其他内容及选择索引必须不变，且额外副本可恢复');
  const report = { result: 'PASS', sheetIndex: si, layerIndex: li, size: '32x32', tileSize: '16x16', layout: '2x2', tiles: 4, pixelExactCopies: true, otherContentUnchanged: true, restorationOnExtraCopy: true, apiReadbackExact: true, originalSHA256: hash(raw), savedSHA256: hash(savedRaw), pngSHA256: hash(bytes), frontendRefreshed: false };
  fs.writeFileSync(path.join(dir, '验证记录.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(dir, '恢复说明.txt'), `恢复时先GET当前工程并保留副本，只将第${si}号画布与第${li}号图层恢复为工程原始备份.json中的对应对象，保留其他后续改动。使用当前ETag按If-Match PUT，409时停止，不盲目覆盖。额外内存副本已验证可精确恢复。\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
