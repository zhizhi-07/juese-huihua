const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const png = require('../../scripts/png.cjs');
const file = name => path.join(__dirname, name);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const url = 'http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116';
const target = 'C:/Users/Administrator/Desktop/最后/游戏资产/游戏内部/便利店/墙壁_浅暖灰_16x16.png';
(async () => {
  assert(!fs.existsSync(file('工程原始备份.json')), '不覆盖备份');
  const oldFile = fs.readFileSync(target), oldImage = png.decode(oldFile);
  assert.equal(oldImage.width, 16); assert.equal(oldImage.height, 16);
  for (let i = 0; i < oldImage.data.length; i += 4) assert.deepEqual(Array.from(oldImage.data.subarray(i, i + 4)), [218, 214, 200, 255]);
  fs.writeFileSync(file('墙壁_替换前.png'), oldFile);
  const importFile = target + '.import';
  const importHash = fs.existsSync(importFile) ? sha(fs.readFileSync(importFile)) : null;
  const bytes = fs.readFileSync(file('out/sprites/墙壁_浅暖灰_带阴影_16x16.png')), im = png.decode(bytes);
  assert.equal(im.width, 16); assert.equal(im.height, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const expected = y < 14 ? [218, 214, 200, 255] : y === 14 ? [94, 68, 82, 255] : [70, 75, 79, 48];
    const i = (y * 16 + x) * 4; assert.deepEqual(Array.from(im.data.subarray(i, i + 4)), expected);
  }
  fs.writeFileSync(file('墙壁_浅暖灰_带阴影_16x16.png'), bytes);
  const big = new Uint8Array(256 * 256 * 4);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (Math.floor(y / 16) * 16 + Math.floor(x / 16)) * 4;
    big.set(im.data.subarray(i, i + 4), (y * 256 + x) * 4);
  }
  fs.writeFileSync(file('墙壁_浅暖灰_带阴影_放大预览.png'), png.encode(256, 256, big));
  assert.deepEqual(png.decode(fs.readFileSync(file('墙壁_浅暖灰_带阴影_放大预览.png'))).data, big);
  const get = await fetch(url); assert.equal(get.status, 200);
  const raw = Buffer.from(await get.arrayBuffer()), etag = get.headers.get('etag'); assert(etag);
  fs.writeFileSync(file('工程原始备份.json'), raw);
  fs.writeFileSync(file('备份摘要.json'), JSON.stringify({ url, etag, projectSHA256: sha(raw), target, targetSHA256: sha(oldFile), importSHA256: importHash }, null, 2));
  const original = JSON.parse(raw), p = structuredClone(original);
  const si = p.spriteSheets.findIndex(s => s.name === '墙壁 · 浅暖灰16×16'); assert(si >= 0);
  const entries = p.layers.map((l, i) => ({ l, i })).filter(x => x.l.sheetIndex === si); assert.equal(entries.length, 1);
  const { l, i: li } = entries[0], key = `${si}_0_0`;
  const prior = png.decode(Buffer.from(l.frameData[key].dataURL.split(',')[1], 'base64'));
  assert.deepEqual(prior.data, oldImage.data, '工程墙壁已变化，停止而不覆盖');
  const s = p.spriteSheets[si], dataURL = 'data:image/png;base64,' + bytes.toString('base64');
  assert.equal(s.actions.length, 1); assert.equal(s.actions[0].frames.length, 1);
  s.imageDataURL = dataURL; l.frameData[key].dataURL = dataURL;
  s.actions[0].frames[0].notes = '16×16浅暖灰无花纹墙面；依照Wall - all.png第一块的结构补底部暗线及半透明投影。上14行墙面，第14行暗线#5E4452，第15行投影#464B4F、alpha48。';
  fs.writeFileSync(file('工程候选稿.json'), JSON.stringify(p));
  const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': etag }, body: JSON.stringify(p) });
  const output = await put.text(); fs.writeFileSync(file('保存响应.txt'), `${put.status}\n${output}`);
  assert.equal(put.status, 200, '冲突或失败时停止');
  const read = await fetch(url); assert.equal(read.status, 200);
  const savedRaw = Buffer.from(await read.arrayBuffer()), saved = JSON.parse(savedRaw);
  fs.writeFileSync(file('保存后回读.json'), savedRaw); assert.deepEqual(saved, p);
  const undo = structuredClone(saved); undo.spriteSheets[si] = original.spriteSheets[si]; undo.layers[li] = original.layers[li];
  assert.deepEqual(undo, original, '其他素材保持不变，额外副本可恢复');
  assert.equal(sha(fs.readFileSync(target)), sha(oldFile), '目标文件变化时不覆盖');
  fs.copyFileSync(file('墙壁_浅暖灰_带阴影_16x16.png'), target);
  assert.deepEqual(fs.readFileSync(target), bytes);
  if (importHash) assert.equal(sha(fs.readFileSync(importFile)), importHash);
  const report = { result: 'PASS', size: '16x16', wallRows: 14, darkEdgeRows: 1, translucentShadowRows: 1,
    shadowRGBA: [70, 75, 79, 48], baseColorUnchanged: true, otherContentUnchanged: true,
    apiReadbackExact: true, restorationOnExtraCopy: true, target, targetSHA256: sha(bytes), importUnchanged: true,
    originalProjectSHA256: sha(raw), savedProjectSHA256: sha(savedRaw), frontendRefreshed: false };
  fs.writeFileSync(file('验证记录.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(file('恢复说明.txt'), `图片恢复：确认无后续改动后，把墙壁_替换前.png复制回${target}。工程恢复：先GET并备份当前工程，仅恢复第${si}号墙壁画布和第${li}号图层的本次改动，保留后续编辑，以当前ETag按If-Match PUT；409停止。额外副本已验证恢复。\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
