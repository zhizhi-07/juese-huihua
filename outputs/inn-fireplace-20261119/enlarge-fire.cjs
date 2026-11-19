const fs = require('fs'), zlib = require('zlib'), assert = require('assert');
const dir = __dirname, W = 18, H = 29;
const before = JSON.parse(fs.readFileSync(dir + '/before-large-fire.json'));
const candidate = structuredClone(before), index = before.spriteSheets.findIndex(s => s.name === '壁炉');
assert(index >= 0);
const bodyLayer = candidate.layers.find(l => l.sheetIndex === index && l.name === '炉体');
const fireLayer = candidate.layers.find(l => l.sheetIndex === index && l.name === '火焰');
assert(bodyLayer && fireLayer);
assert.equal(new Set(Object.values(bodyLayer.frameData).map(f => f.dataURL)).size, 1);
function decode(uri) {
  const png = Buffer.from(uri.split(',')[1], 'base64'), parts = [];
  assert.equal(png.readUInt32BE(16), W); assert.equal(png.readUInt32BE(20), H);
  assert.equal(png[24], 8); assert.equal(png[25], 6);
  for (let p = 8; p < png.length;) {
    const size = png.readUInt32BE(p);
    if (png.toString('ascii', p + 4, p + 8) === 'IDAT') parts.push(png.subarray(p + 8, p + 8 + size));
    p += size + 12;
  }
  const scan = zlib.inflateSync(Buffer.concat(parts)), pixels = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) { assert.equal(scan[y * (W * 4 + 1)], 0); scan.copy(pixels, y * W * 4, y * (W * 4 + 1) + 1, (y + 1) * (W * 4 + 1)); }
  return pixels;
}
const body = decode(Object.values(bodyLayer.frameData)[0].dataURL);
const allowed = new Set(fs.readFileSync(dir + '/otterisk-96.hex', 'utf8').trim().split(/\s+/));
const colors = {r:'8a3c24',R:'cc6764',o:'d48d57',y:'e3d176',l:'e6dfa1'};
assert(Object.values(colors).every(color => allowed.has(color)));
const patterns = [
  ['.....R....','....RRo...','..r.Rooo..','.rRRooRoR.','rRRoyyooRr','.RoyllyoR.','..RoooyR..'],
  ['......R...','.....RRo..','...rRooo..','..rRooRoR.','.rRoyyooRr','.RoyllyoR.','..RoooyR..'],
  ['..........','.....R....','...rRRo...','.rRRoooR..','rRRoyyooRr','.RoyllyoR.','..RoooyR..'],
  ['...R......','..RRo.....','..RooR.r..','.rRoooRRr.','rRRoyyooRr','.RoyllyoR.','..RoooyR..'],
  ['.....R....','....RRo...','..r.Rooo..','.rRRoooRR.','rRRooyooRr','.RoyllyoR.','..RoooyR..'],
  ['..........','....RRo...','...rRooo..','.rRRoooRR.','rRRoyyooRr','.RoyllyoR.','..RoyyoR..'],
];
const count = pixels => { let result = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) result++; return result; };
const coverage = [];
const fires = patterns.map((rows, i) => {
  assert(rows.length === 7 && rows.every(row => row.length === 10));
  const fire = Buffer.alloc(W * H * 4);
  rows.forEach((row, y) => [...row].forEach((color, x) => {
    if (color === '.') return;
    const offset = ((20 + y) * W + 4 + x) * 4;
    assert.equal(body.subarray(offset, offset + 3).toString('hex'), '5c4644');
    fire.set([...colors[color].match(/../g).map(c => parseInt(c, 16)), 255], offset);
  }));
  const oldCount = count(decode(fireLayer.frameData[index + '_0_' + i].dataURL)), newCount = count(fire);
  assert(newCount > oldCount);
  coverage.push({frame:i,old:oldCount,new:newCount});
  return fire;
});
fires.push(Buffer.alloc(W * H * 4));
assert.equal(new Set(fires.slice(0, 6).map(f => f.toString('hex'))).size, 6);
const composites = fires.map(fire => {
  const result = Buffer.from(body);
  for (let i = 0; i < fire.length; i += 4) if (fire[i + 3]) fire.copy(result, i, i, i + 4);
  return result;
});
assert.deepStrictEqual(composites[6], body);
function chunk(type, data) {
  const tag = Buffer.from(type), length = Buffer.alloc(4), checksum = Buffer.alloc(4); length.writeUInt32BE(data.length);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([tag, data])) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, tag, data, checksum]);
}
function png(pixels, w = W, h = H, scale = 1) {
  const outW = w * scale, outH = h * scale, header = Buffer.alloc(13), scan = Buffer.alloc((outW * 4 + 1) * outH);
  header.writeUInt32BE(outW); header.writeUInt32BE(outH, 4); header[8] = 8; header[9] = 6;
  for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) {
    const source = (Math.floor(y / scale) * w + Math.floor(x / scale)) * 4;
    pixels.copy(scan, y * (outW * 4 + 1) + 1 + x * 4, source, source + 4);
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(scan)), chunk('IEND', Buffer.alloc(0))]);
}
const atlas = Buffer.alloc(W * 7 * H * 4);
composites.forEach((pixels, i) => { for (let y = 0; y < H; y++) pixels.copy(atlas, (y * W * 7 + i * W) * 4, y * W * 4, (y + 1) * W * 4); });
candidate.spriteSheets[index].imageDataURL = 'data:image/png;base64,' + png(atlas, W * 7, H).toString('base64');
fires.forEach((pixels, i) => {
  const key = index + '_' + (i < 6 ? '0_' + i : '1_0');
  fireLayer.frameData[key] = {width:W, height:H, dataURL:'data:image/png;base64,' + png(pixels).toString('base64')};
});
assert.deepStrictEqual(bodyLayer, before.layers.find(l => l.sheetIndex === index && l.name === '炉体'));
assert.deepStrictEqual(candidate.spriteSheets[index].actions, before.spriteSheets[index].actions);
assert.deepStrictEqual(candidate.layers.filter(l => l !== fireLayer), before.layers.filter(l => !(l.sheetIndex === index && l.name === '火焰')));
fs.writeFileSync(dir + '/large-fire-candidate.json', JSON.stringify(candidate));
fs.writeFileSync(dir + '/large-fire-atlas.png', png(atlas, W * 7, H));
fs.writeFileSync(dir + '/large-fire-on-preview.png', png(composites[0], W, H, 16));
fs.writeFileSync(dir + '/large-fire-animation-preview.png', png(atlas, W * 7, H, 10));
fs.writeFileSync(dir + '/large-fire-validation.json', JSON.stringify({fireColors:Object.values(colors),allColorsInOtterisk96:true,bodyUnchanged:true,fireFitsOpening:true,onFrames:6,offFrames:1,coverage}, null, 2));
console.log(JSON.stringify({bodyUnchanged:true,coverage}));
