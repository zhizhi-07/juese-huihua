const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const png = require('../../scripts/png.cjs');
const file = name => path.join(__dirname, name);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const url = 'http://127.0.0.1:8765/api/project?id=scene-store-item01-shelf-20261116';
const target = 'C:/Users/Administrator/Desktop/最后/游戏资产/游戏内部/便利店/墙壁_浅暖灰_16x16.png';
const reference = 'C:/Users/Administrator/Desktop/最后/游戏资产/游戏内部/通用/Wall - all.png';
(async () => {
  assert(!fs.existsSync(target), '不覆盖已有同名素材');
  assert(!fs.existsSync(file('工程原始备份.json')), '不覆盖已有备份');
  const referenceHash = sha(fs.readFileSync(reference));
  const bytes = fs.readFileSync(file('out/sprites/墙壁_浅暖灰_16x16.png'));
  const im = png.decode(bytes); assert.equal(im.width, 16); assert.equal(im.height, 16);
  for (let i = 0; i < im.data.length; i += 4) assert.deepEqual(Array.from(im.data.subarray(i, i + 4)), [218, 214, 200, 255]);
  fs.writeFileSync(file('墙壁_浅暖灰_16x16.png'), bytes);
  const preview = new Uint8Array(256 * 256 * 4);
  for (let i = 0; i < preview.length; i += 4) preview.set([218, 214, 200, 255], i);
  fs.writeFileSync(file('墙壁_浅暖灰_放大预览.png'), png.encode(256, 256, preview));
  assert.deepEqual(png.decode(fs.readFileSync(file('墙壁_浅暖灰_放大预览.png'))).data, preview);
  const get = await fetch(url); assert.equal(get.status, 200);
  const raw = Buffer.from(await get.arrayBuffer()), etag = get.headers.get('etag'); assert(etag);
  fs.writeFileSync(file('工程原始备份.json'), raw);
  fs.writeFileSync(file('备份摘要.json'), JSON.stringify({ url, etag, sha256: sha(raw), reference, referenceSHA256: referenceHash }, null, 2));
  const original = JSON.parse(raw), p = structuredClone(original), si = p.spriteSheets.length;
  assert(!p.spriteSheets.some(s => s.name === '墙壁 · 浅暖灰16×16'));
  const dataURL = 'data:image/png;base64,' + bytes.toString('base64');
  p.spriteSheets.push({ name: '墙壁 · 浅暖灰16×16', frameWidth: 16, frameHeight: 16,
    columns: 1, rows: 1, spacingX: 0, spacingY: 0, offsetX: 0, offsetY: 0, fps: 8, imageDataURL: dataURL,
    actions: [{ name: '纯色墙面', direction: 'none', frames: [{ sheetIndex: si, sourceX: 0, sourceY: 0, width: 16, height: 16,
      duration: 100, locked: false, lockedRegions: [], status: 'completed', notes: '与当前地板同为16×16单格。浅暖灰纯色#DAD6C8，无花纹、无阴影、无边框，可重复铺设。' }] }]
  });
  p.layers.push({ sheetIndex: si, parent: null, name: '墙壁 · 浅暖灰纯色', visible: true, locked: false, opacity: 1,
    frameData: { [`${si}_0_0`]: { width: 16, height: 16, dataURL } } });
  fs.writeFileSync(file('工程候选稿.json'), JSON.stringify(p));
  const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': etag }, body: JSON.stringify(p) });
  const output = await put.text(); fs.writeFileSync(file('保存响应.txt'), `${put.status}\n${output}`);
  assert.equal(put.status, 200, '冲突或失败时停止，不用旧整稿重试');
  const read = await fetch(url); assert.equal(read.status, 200);
  const savedRaw = Buffer.from(await read.arrayBuffer()), saved = JSON.parse(savedRaw);
  fs.writeFileSync(file('保存后回读.json'), savedRaw); assert.deepEqual(saved, p);
  const undo = structuredClone(saved); undo.spriteSheets.pop(); undo.layers.pop();
  assert.deepEqual(undo, original, '额外副本可撤销，原素材与选择索引不变');
  fs.writeFileSync(target, bytes, { flag: 'wx' });
  const exported = fs.readFileSync(target); assert.deepEqual(exported, bytes);
  const reloaded = png.decode(exported); assert.equal(reloaded.width, 16); assert.equal(reloaded.height, 16);
  assert.equal(sha(fs.readFileSync(reference)), referenceHash);
  const report = { result: 'PASS', size: '16x16', color: '#DAD6C8', colors: 1, allOpaque: true,
    addedSheetIndex: si, priorContentUnchanged: true, exactAPIReadback: true, restorationOnExtraCopy: true,
    destination: target, pngSHA256: sha(exported), originalProjectSHA256: sha(raw), savedProjectSHA256: sha(savedRaw),
    referenceUnchanged: true, frontendRefreshed: false };
  fs.writeFileSync(file('验证记录.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(file('恢复说明.txt'), `本次只新增第${si}号墙壁画布及对应末尾图层，未改原素材、选择索引。撤销时先GET并备份当前工程，只去掉此次新增的画布和图层，保留后续编辑，使用当前ETag按If-Match PUT，409时停止。素材目录中的墙壁_浅暖灰_16x16.png也是本次新增，不替换或改动Wall - all.png。额外副本已验证撤销。\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
