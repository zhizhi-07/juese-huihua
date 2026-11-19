const fs = require('fs'), zlib = require('zlib'), assert = require('assert');
const palette = {t:'40555b',g:'5e7d6d',f:'445b63',e:'3e5256',d:'34484e',k:'405055',m:'516367',b:'2e3d42'};
// Reconstruct the obscured left half by reflecting the visible right half.
const right = [
  'ttttttttttttdk',
  'gggggggggggge.',
  'fffffffffffgek',
  'fffffffffffge.',
  'fffffffffffgdm',
  'fffffffffffgek',
  'fffffffffffge.',
  'fffffffffgfgek',
  'gggggggggggge.',
  'bbbbbbbbbbbbbk',
];
assert.equal(right.length, 10);
assert(right.every(row => row.length === 14));
const rows = right.map(row => [...row].reverse().join('') + row), W = 28, H = 10;
assert(rows.every(row => row === [...row].reverse().join('')));
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
  const w = W * scale, h = H * scale, header = Buffer.alloc(13), pixels = Buffer.alloc((w * 4 + 1) * h);
  header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 6;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const color = palette[rows[Math.floor(y / scale)][Math.floor(x / scale)]] || background;
    if (color) pixels.set([...color.match(/../g).map(c => parseInt(c, 16)), 255], y * (w * 4 + 1) + 1 + x * 4);
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
const before = JSON.parse(fs.readFileSync(__dirname + '/before.json'));
assert(!before.spriteSheets.some(s => s.name === '地毯'));
const candidate = structuredClone(before), sheetIndex = before.spriteSheets.length;
const dataURL = 'data:image/png;base64,' + png(1).toString('base64');
const sheet = structuredClone(before.spriteSheets[0]);
Object.assign(sheet, {name:'地毯', frameWidth:W, frameHeight:H, imageDataURL:dataURL});
sheet.actions = [{name:'地毯', direction:'', frames:[{sheetIndex, sourceX:0, sourceY:0, width:W, height:H, locked:false, lockedRegions:[], status:'completed', duration:0, notes:''}]}];
candidate.spriteSheets.push(sheet);
candidate.layers.push({sheetIndex, parent:null, name:'地毯', visible:true, locked:false, opacity:1, frameData:{[sheetIndex + '_0_0']:{width:W, height:H, dataURL}}});
candidate.currentSheetIndex = sheetIndex;
candidate.currentActionIndex = 0;
candidate.currentFrameIndex = 0;
candidate.currentLayerIndex = candidate.layers.length - 1;
assert.deepStrictEqual(candidate.spriteSheets.slice(0, -1), before.spriteSheets);
assert.deepStrictEqual(candidate.layers.slice(0, -1), before.layers);
assert.deepStrictEqual(candidate.sceneAssembly, before.sceneAssembly);
fs.writeFileSync(__dirname + '/candidate.json', JSON.stringify(candidate));
fs.writeFileSync(__dirname + '/carpet.png', png(1));
fs.writeFileSync(__dirname + '/preview.png', png(32));
console.log('Prepared one symmetrical 28x10 carpet; all existing assets preserved.');
