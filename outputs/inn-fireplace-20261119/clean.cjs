const fs = require('fs'), zlib = require('zlib'), assert = require('assert');
const dir = __dirname, W = 18, H = 29;
const allowed = new Set(fs.readFileSync(dir + '/otterisk-96.hex', 'utf8').trim().split(/\s+/));
const colors = {k:'2f3b3d',m:'5c6163',s:'7b7d77',w:'9e7565',d:'785a55',a:'b89184',b:'9c756a',i:'5c4644',o:'bd6f42',y:'e0ac6c',l:'e6dfa1'};
assert(Object.values(colors).every(color => allowed.has(color)));
const body = Buffer.alloc(W * H * 4);
function rect(buffer, x, y, w, h, color) {
  assert(x >= 0 && y >= 0 && x + w <= W && y + h <= H);
  const rgba = [...colors[color].match(/../g).map(c => parseInt(c, 16)), 255];
  for (let Y = y; Y < y + h; Y++) for (let X = x; X < x + w; X++) buffer.set(rgba, (Y * W + X) * 4);
}
rect(body, 4, 0, 10, 16, 'k');
rect(body, 5, 1, 8, 14, 'm');
for (const [row, pattern] of [[1,'ssmsssms'],[4,'ssssmsss'],[7,'ssmsssms'],[10,'ssssmsss'],[13,'ssmsssms']]) {
  [...pattern].forEach((color, x) => rect(body, 5 + x, row, 1, 2, color));
}
rect(body, 1, 12, 3, 1, 'k'); rect(body, 14, 12, 3, 1, 'k');
rect(body, 0, 13, 4, 3, 'k'); rect(body, 14, 13, 4, 3, 'k');
rect(body, 1, 13, 3, 3, 'w'); rect(body, 14, 13, 3, 3, 'w');
rect(body, 4, 15, 10, 1, 'd');
rect(body, 0, 16, 18, 2, 'k');
rect(body, 1, 16, 16, 1, 'w'); rect(body, 1, 17, 16, 1, 'd');
rect(body, 1, 18, 16, 9, 'k');
rect(body, 2, 19, 14, 8, 's');
rect(body, 2, 19, 1, 8, 'm'); rect(body, 15, 19, 1, 8, 'm');
rect(body, 5, 19, 8, 1, 'a');
rect(body, 4, 20, 10, 1, 'b');
rect(body, 5, 20, 8, 7, 'i');
rect(body, 4, 21, 10, 6, 'i');
rect(body, 3, 21, 1, 6, 'a'); rect(body, 14, 21, 1, 6, 'a');
rect(body, 0, 27, 18, 2, 'k'); rect(body, 1, 27, 16, 1, 'w');
const patterns = [
  ['...o....','..ooo...','.ooyoo..','ooyyyoo.','.oylyo..','..ooo...'],
  ['....o...','...ooo..','..ooyoo.','.ooyyyoo','..oylyo.','...ooo..'],
  ['........','...o....','..ooo...','.ooyoo..','ooylyoo.','..ooo...'],
  ['..o.....','.ooo....','ooyoo...','oyyyoo..','.olyo...','..ooo...'],
  ['...o....','..ooo...','.ooyoo..','ooylyoo.','.oylyo..','..ooo...'],
  ['........','...o....','..ooo...','.ooyyyo.','ooylyoo.','..ooo...'],
];
const fires = patterns.map(rows => {
  assert(rows.length === 6 && rows.every(row => row.length === 8));
  const fire = Buffer.alloc(W * H * 4);
  rows.forEach((row, y) => [...row].forEach((color, x) => { if (color !== '.') rect(fire, 5 + x, 21 + y, 1, 1, color); }));
  return fire;
});
fires.push(Buffer.alloc(W * H * 4));
assert.equal(new Set(fires.slice(0, 6).map(p => p.toString('hex'))).size, 6);
assert(fires[6].every(value => value === 0));
const composites = fires.map(fire => {
  const result = Buffer.from(body);
  for (let i = 0; i < fire.length; i += 4) if (fire[i + 3]) fire.copy(result, i, i, i + 4);
  return result;
});
assert.deepStrictEqual(composites[6], body);
const used = new Set();
for (const pixels of [body, ...fires, ...composites]) for (let i = 0; i < pixels.length; i += 4) {
  if (!pixels[i + 3]) continue;
  const color = pixels.subarray(i, i + 3).toString('hex');
  assert.equal(pixels[i + 3], 255); assert(allowed.has(color)); used.add(color);
}
assert.equal(used.size, 11);
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
const before = JSON.parse(fs.readFileSync(dir + '/before-clean.json'));
const candidate = structuredClone(before), index = before.spriteSheets.findIndex(s => s.name === '壁炉');
assert(index >= 0);
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
fs.writeFileSync(dir + '/clean-candidate.json', JSON.stringify(candidate));
fs.writeFileSync(dir + '/clean-on-preview.png', png(composites[0], W, H, 16));
fs.writeFileSync(dir + '/clean-off-preview.png', png(body, W, H, 16));
fs.writeFileSync(dir + '/clean-atlas.png', png(atlas, W * 7, H));
fs.writeFileSync(dir + '/clean-animation-preview.png', png(atlas, W * 7, H, 10));
fs.writeFileSync(dir + '/clean-pixel-validation.json', JSON.stringify({usedColors:[...used],count:used.size,allColorsInOtterisk96:true,onFrames:6,offFrames:1,bodyConstant:true}, null, 2));
console.log('Clean fireplace verified: 11 palette colors, flat material shades, regular brick courses, three fire colors, six on frames and one off frame.');
