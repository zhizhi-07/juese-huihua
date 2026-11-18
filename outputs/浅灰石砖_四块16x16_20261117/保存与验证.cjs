const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const png = require('../../scripts/png.cjs');
const file = name => path.join(__dirname, name);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const url = 'http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116';
(async () => {
  assert(!fs.existsSync(file('工程原始备份.json')), '不覆盖已有备份');
  const response = await fetch(url); assert.equal(response.status, 200);
  const raw = Buffer.from(await response.arrayBuffer()), etag = response.headers.get('etag');
  assert(etag);
  fs.writeFileSync(file('工程原始备份.json'), raw);
  fs.writeFileSync(file('备份摘要.json'), JSON.stringify({ url, etag, sha256: sha(raw) }, null, 2));
  const original = JSON.parse(raw), project = structuredClone(original);
  const si = project.spriteSheets.findIndex(s => s.name === '浅灰石砖 · 四块拼接32×32');
  assert(si >= 0);
  const layers = project.layers.map((l, i) => ({ l, i })).filter(x => x.l.sheetIndex === si);
  assert.equal(layers.length, 1);
  const { l, i: li } = layers[0], key = `${si}_0_0`;
  const bytes = fs.readFileSync(file('out/sprites/浅灰石砖_四块拼接_16x16.png'));
  const im = png.decode(bytes); assert.equal(im.width, 16); assert.equal(im.height, 16);
  const palette = new Set();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const i = (y * 16 + x) * 4, source = ((y % 8) * 16 + x % 8) * 4;
    assert.deepEqual(im.data.subarray(i, i + 4), im.data.subarray(source, source + 4));
    assert.equal(im.data[i + 3], 255);
    palette.add(Buffer.from(im.data.subarray(i, i + 4)).toString('hex'));
  }
  assert.equal(palette.size, 4);
  fs.writeFileSync(file('浅灰石砖_四块拼接_16x16.png'), bytes);
  const preview = new Uint8Array(256 * 256 * 4);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (Math.floor(y / 16) * 16 + Math.floor(x / 16)) * 4;
    preview.set(im.data.subarray(i, i + 4), (y * 256 + x) * 4);
  }
  fs.writeFileSync(file('浅灰石砖_四块拼接_放大预览.png'), png.encode(256, 256, preview));
  assert.deepEqual(png.decode(fs.readFileSync(file('浅灰石砖_四块拼接_放大预览.png'))).data, preview);
  const dataURL = 'data:image/png;base64,' + bytes.toString('base64'), s = project.spriteSheets[si];
  assert.equal(s.actions.length, 1); assert.equal(s.actions[0].frames.length, 1);
  Object.assign(s, { name: '浅灰石砖 · 四块拼接16×16', frameWidth: 16, frameHeight: 16, imageDataURL: dataURL });
  Object.assign(s.actions[0].frames[0], { width: 16, height: 16, notes: '整体16×16，四块8×8石砖按2×2拼接；修正此前整体32×32过大的尺寸，不改变配色。' });
  l.frameData[key] = { ...l.frameData[key], width: 16, height: 16, dataURL };
  fs.writeFileSync(file('工程候选稿.json'), JSON.stringify(project));
  const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': etag }, body: JSON.stringify(project) });
  const output = await put.text(); fs.writeFileSync(file('保存响应.txt'), `${put.status}\n${output}`);
  assert.equal(put.status, 200, '失败或冲突时不重试旧稿');
  const read = await fetch(url); assert.equal(read.status, 200);
  const savedRaw = Buffer.from(await read.arrayBuffer()), saved = JSON.parse(savedRaw);
  fs.writeFileSync(file('保存后回读.json'), savedRaw); assert.deepEqual(saved, project);
  const undo = structuredClone(saved); undo.spriteSheets[si] = original.spriteSheets[si]; undo.layers[li] = original.layers[li];
  assert.deepEqual(undo, original, '额外副本验证恢复，且不改其他素材或选择');
  const report = { result: 'PASS', totalSize: '16x16', tileSize: '8x8', layout: '2x2', colors: 4, identicalQuadrants: true, otherContentUnchanged: true, apiReadbackExact: true, restorationOnExtraCopy: true, originalSHA256: sha(raw), savedSHA256: sha(savedRaw), pngSHA256: sha(bytes), frontendRefreshed: false };
  fs.writeFileSync(file('验证记录.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(file('恢复说明.txt'), `先GET当前工程并备份，若要撤销本次尺寸修改，仅恢复备份中第${si}号画布及第${li}号图层；其他后续修改保留。用当前ETag按If-Match PUT，409停止。不要用旧整稿覆盖新编辑。额外内存副本已验证恢复。\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
