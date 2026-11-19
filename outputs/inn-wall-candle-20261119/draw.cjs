const fs = require('fs'), zlib = require('zlib'), assert = require('assert');
const rows = [
  [null, null, '704937', null, null],
  [null, '734b3a', 'f8d5a3', '704736', null],
  ['a38a6c', 'bdad98', 'e5a356', 'bdad98', 'a0876a'],
  ['734b3e', 'bdad98', 'fbee8b', 'bbab96', '70483a'],
  ['35372f', '37382e', 'f7e6ae', '34362e', '32352d'],
  ['35372f', '7d5445', '815543', '7c5140', '32352c'],
  [null, '594338', '33352e', '34342c', null],
];
assert.equal(rows.length, 7);
assert(rows.every(row => row.length === 5));
assert.equal(rows.flat().filter(Boolean).length, 27);
function chunk(type, data) {
  const tag = Buffer.from(type), length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([tag, data])) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, tag, data, checksum]);
}
function png(scale, background) {
  const w = 5 * scale, h = 7 * scale, header = Buffer.alloc(13), pixels = Buffer.alloc((w * 4 + 1) * h);
  header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 6;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const color = rows[Math.floor(y / scale)][Math.floor(x / scale)] || background;
    if (color) pixels.set([...color.match(/../g).map(c => parseInt(c, 16)), 255], y * (w * 4 + 1) + 1 + x * 4);
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
const before = JSON.parse(fs.readFileSync(__dirname + '/before-draw.json'));
assert(!before.spriteSheets.some(s => s.name === '壁挂蜡烛'));
const candidate = structuredClone(before), sheetIndex = before.spriteSheets.length;
const dataURL = 'data:image/png;base64,' + png(1).toString('base64');
const sheet = structuredClone(before.spriteSheets[0]);
Object.assign(sheet, {name: '壁挂蜡烛', frameWidth: 5, frameHeight: 7, imageDataURL: dataURL});
sheet.actions = [{name: '壁挂蜡烛', direction: '', frames: [{sheetIndex, sourceX: 0, sourceY: 0, width: 5, height: 7, locked: false, lockedRegions: [], status: 'completed', duration: 0, notes: ''}]}];
candidate.spriteSheets.push(sheet);
candidate.layers.push({sheetIndex, parent: null, name: '壁挂蜡烛', visible: true, locked: false, opacity: 1, frameData: {[sheetIndex + '_0_0']: {width: 5, height: 7, dataURL}}});
candidate.currentSheetIndex = sheetIndex;
candidate.currentActionIndex = 0;
candidate.currentFrameIndex = 0;
candidate.currentLayerIndex = candidate.layers.length - 1;
assert.deepStrictEqual(candidate.spriteSheets.slice(0, -1), before.spriteSheets);
assert.deepStrictEqual(candidate.layers.slice(0, -1), before.layers);
assert.deepStrictEqual(candidate.sceneAssembly, before.sceneAssembly);
fs.writeFileSync(__dirname + '/candidate.json', JSON.stringify(candidate));
fs.writeFileSync(__dirname + '/wall-candle.png', png(1));
fs.writeFileSync(__dirname + '/preview.png', png(64, 'd4c3a1'));
console.log('Prepared one 5x7 wall candle; all existing assets preserved.');
