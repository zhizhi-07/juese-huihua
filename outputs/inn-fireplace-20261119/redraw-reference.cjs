const fs = require('fs'), zlib = require('zlib'), assert = require('assert');
const W = 18, H = 29, dir = __dirname;
const palette = fs.readFileSync(dir + '/otterisk-96.hex', 'utf8').trim().split(/\s+/);
assert.equal(new Set(palette).size, 96);
const rgb = color => color.match(/../g).map(c => parseInt(c, 16));
const paletteRGB = palette.map(rgb), colorMap = new Map();
const paintColors = '2f3b3d 464b4f 5c6163 7b7d77 999991 b5b2ac 57483b 6e5f4d 8a7b63 a3987a bdb395 d6d0b0 9e7565 ba9273 d1ae8a 5c4644 785a55 9c756a b89184 ccad9b 8f3648 b04a58 cc6764 e38674 e8a68e 8a3c24 9e5333 bd6f42 d48d57 e0ac6c e8cd97 855c22 9e7a36 ba9745 ccb45c e3d176 e6dfa1'.split(' ');
assert(paintColors.every(color => palette.includes(color)));
const paintRGB = paintColors.map(rgb);
function nearest(color) {
  if (!colorMap.has(color)) {
    const value = rgb(color), distances = paintRGB.map(p => p.reduce((sum, c, i) => sum + (c - value[i]) ** 2, 0));
    colorMap.set(color, paintColors[distances.indexOf(Math.min(...distances))]);
  }
  return colorMap.get(color);
}
const samples = JSON.parse(fs.readFileSync(dir + '/reference-samples.json', 'utf8').replace(/^\uFEFF/, ''));
assert(samples.length === H && samples.every(row => row.length === W));
const body = Buffer.alloc(W * H * 4), originalFire = Buffer.alloc(W * H * 4);
function pixel(buffer, x, y, color) {
  assert(x >= 0 && x < W && y >= 0 && y < H);
  buffer.set(color ? [...rgb(nearest(color)), 255] : [0, 0, 0, 0], (y * W + x) * 4);
}
// Keep only the fireplace silhouette; the wall, floor and nearby props stay transparent.
for (let y = 0; y < H; y++) {
  const left = y < 12 ? 4 : y === 12 ? 1 : y < 18 ? 0 : y < 27 ? 1 : 0;
  const right = W - 1 - left;
  for (let x = left; x <= right; x++) pixel(body, x, y, samples[y][x]);
}
const flameMask = ['..xxx...', '.xxxxx..', 'xxxxxxx.', 'xxxxxxx.', '.xxxxx..', 'x.xxxx.x'];
flameMask.forEach((row, y) => [...row].forEach((mark, x) => {
  if (mark !== 'x') return;
  pixel(originalFire, 5 + x, 21 + y, samples[21 + y][5 + x]);
  pixel(body, 5 + x, 21 + y, x < 2 ? '743b40' : x > 5 ? '73383c' : '78383c');
}));
const fires = Array.from({length:6}, () => Buffer.from(originalFire));
function clearTip(buffer) { for (let y = 21; y <= 22; y++) for (let x = 5; x <= 12; x++) pixel(buffer, x, y, null); }
clearTip(fires[1]);
pixel(fires[1], 9, 21, samples[21][8]);
for (let x = 7; x <= 10; x++) pixel(fires[1], x, 22, samples[22][x]);
for (let x = 5; x <= 12; x++) pixel(fires[2], x, 21, null);
clearTip(fires[3]);
pixel(fires[3], 7, 21, samples[21][8]);
for (let x = 6; x <= 9; x++) pixel(fires[3], x, 22, samples[22][x + 1]);
pixel(fires[3], 8, 25, samples[25][9]);
pixel(fires[4], 9, 21, samples[21][8]);
pixel(fires[4], 9, 24, samples[24][8]);
for (let x = 5; x <= 12; x++) pixel(fires[5], x, 21, null);
pixel(fires[5], 8, 25, samples[25][9]);
pixel(fires[5], 9, 25, samples[25][8]);
pixel(fires[5], 9, 24, samples[24][8]);
fires.push(Buffer.alloc(W * H * 4));
assert.equal(new Set(fires.slice(0, 6).map(p => p.toString('hex'))).size, 6);
const composites = fires.map(fire => {
  const result = Buffer.from(body);
  for (let i = 0; i < fire.length; i += 4) if (fire[i + 3]) fire.copy(result, i, i, i + 4);
  return result;
});
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const offset = (y * W + x) * 4;
  if (composites[0][offset + 3]) assert.equal(composites[0].subarray(offset, offset + 3).toString('hex'), nearest(samples[y][x]));
}
for (const pixels of [body, ...fires, ...composites]) for (let i = 0; i < pixels.length; i += 4) {
  assert(pixels[i + 3] === 0 || pixels[i + 3] === 255);
  if (pixels[i + 3]) assert(palette.includes(pixels.subarray(i, i + 3).toString('hex')));
}
assert.deepStrictEqual(composites[6], body);
assert(fires[6].every(value => value === 0));
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
const uri = pixels => 'data:image/png;base64,' + png(pixels).toString('base64');
const before = JSON.parse(fs.readFileSync(dir + '/before-otterisk.json'));
const candidate = structuredClone(before), index = before.spriteSheets.findIndex(s => s.name === '壁炉');
assert(index >= 0);
candidate.palette = paletteRGB.map(([r, g, b]) => ({r, g, b, a:255}));
candidate.spriteSheets[index].imageDataURL = 'data:image/png;base64,' + png(atlas, W * 7, H).toString('base64');
const bodyLayer = candidate.layers.find(l => l.sheetIndex === index && l.name === '炉体');
const fireLayer = candidate.layers.find(l => l.sheetIndex === index && l.name === '火焰');
assert(bodyLayer && fireLayer);
fires.forEach((pixels, i) => {
  const key = index + '_' + (i < 6 ? '0_' + i : '1_0');
  bodyLayer.frameData[key] = {width:W, height:H, dataURL:uri(body)};
  fireLayer.frameData[key] = {width:W, height:H, dataURL:uri(pixels)};
});
assert.deepStrictEqual(candidate.spriteSheets.filter((_, i) => i !== index), before.spriteSheets.filter((_, i) => i !== index));
assert.deepStrictEqual(candidate.layers.filter(l => l.sheetIndex !== index), before.layers.filter(l => l.sheetIndex !== index));
fs.writeFileSync(dir + '/otterisk-candidate.json', JSON.stringify(candidate));
fs.writeFileSync(dir + '/otterisk-on-preview.png', png(composites[0], W, H, 16));
fs.writeFileSync(dir + '/otterisk-off-preview.png', png(body, W, H, 16));
fs.writeFileSync(dir + '/otterisk-atlas.png', png(atlas, W * 7, H));
fs.writeFileSync(dir + '/otterisk-animation-preview.png', png(atlas, W * 7, H, 10));
fs.writeFileSync(dir + '/otterisk-pixel-validation.json', JSON.stringify({paletteSource:'https://lospec.com/palette-list/otterisk-96',paletteSize:96,allOpaquePixelsInPalette:true,onFrames:6,offFrames:1,bodyConstant:true}, null, 2));
console.log('Verified: all opaque pixels use Otterisk 96; six distinct fire frames, one empty off frame, and separate body/fire layers.');
