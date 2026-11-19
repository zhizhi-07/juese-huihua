const fs = require('fs'), zlib = require('zlib'), assert = require('assert');
const W = 18, H = 29;
const palette = {k:'272928',m:'67595b',s:'85746c',h:'95877b',d:'75665f',w:'a67054',b:'6e4239',t:'bc8162',a:'d08767',v:'9a5f50',i:'583337',j:'723a3d',r:'c63230',R:'f93d31',O:'f45827',Y:'ffbe42',L:'feed79'};
const body = Buffer.alloc(W * H * 4);
function rect(pixels, x, y, w, h, color) {
  assert(x >= 0 && y >= 0 && x + w <= W && y + h <= H);
  const rgba = [...palette[color].match(/../g).map(c => parseInt(c, 16)), 255];
  for (let Y = y; Y < y + h; Y++) for (let X = x; X < x + w; X++) pixels.set(rgba, (Y * W + X) * 4);
}
rect(body, 4, 0, 10, 16, 'k');
rect(body, 5, 0, 8, 16, 'm');
for (const y of [0, 6, 12]) {
  rect(body, 5, y, 2, 2, 's'); rect(body, 8, y, 3, 2, 's'); rect(body, 12, y, 1, 2, 'd');
}
for (const y of [3, 9]) {
  rect(body, 5, y, 4, 2, 'd'); rect(body, 10, y, 3, 2, 's');
}
rect(body, 8, 9, 1, 2, 'h');
for (const x of [0, 14]) {
  rect(body, x, 13, 4, 5, 'k');
  rect(body, x + 1, 12, 3, 1, 'k');
  rect(body, x + 1, 13, 3, 4, 'w');
}
rect(body, 0, 16, 18, 3, 'k');
rect(body, 1, 16, 16, 1, 'w');
rect(body, 1, 17, 16, 1, 'b');
rect(body, 1, 19, 16, 9, 'k');
rect(body, 2, 19, 14, 9, 's');
rect(body, 2, 21, 1, 6, 'h');
rect(body, 15, 21, 1, 6, 'd');
rect(body, 5, 19, 8, 1, 't');
rect(body, 4, 20, 10, 1, 'b');
rect(body, 4, 20, 1, 1, 'a'); rect(body, 13, 20, 1, 1, 'a');
rect(body, 3, 21, 1, 6, 'v'); rect(body, 14, 21, 1, 6, 'v');
rect(body, 4, 21, 1, 6, 'a'); rect(body, 13, 21, 1, 6, 't');
rect(body, 5, 20, 8, 7, 'i');
rect(body, 5, 21, 1, 6, 'j'); rect(body, 12, 21, 1, 6, 'j');
rect(body, 0, 27, 18, 2, 'k');
rect(body, 1, 27, 16, 1, 'w');
const firePatterns = [
  ['...r....','..rR....','..ROr...','.rOORr..','rROYOOr.','.ROYLYR.','..RYYR..'],
  ['....r...','...rR...','..rOOr..','.rROOR..','rROYORr.','.ROYLYR.','..RYYR..'],
  ['........','...r....','..rOR...','.rROOr..','rROYORr.','.ROYLYR.','..RYYR..'],
  ['..r.....','..Rr....','.rOOr...','.ROORr..','rROYOOR.','.ROYLYR.','..RYYR..'],
  ['...r....','..rRr...','..ROOr..','.rROORr.','rROYOOR.','.ROYLYR.','..RYYR..'],
  ['........','...rR...','..rOOr..','.rROOR..','rROYOOR.','.ROYLYR.','..RYYR..'],
];
const fire = firePatterns.map(rows => {
  assert(rows.length === 7 && rows.every(row => row.length === 8));
  const pixels = Buffer.alloc(W * H * 4);
  rows.forEach((row, y) => [...row].forEach((color, x) => { if (color !== '.') rect(pixels, 5 + x, 20 + y, 1, 1, color); }));
  return pixels;
});
fire.push(Buffer.alloc(W * H * 4));
assert.equal(new Set(fire.slice(0, 6).map(p => p.toString('hex'))).size, 6);
assert(fire[6].every(byte => byte === 0));
for (const pixels of fire) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (pixels[(y * W + x) * 4 + 3]) assert(x >= 5 && x <= 12 && y >= 20 && y <= 26);
assert.equal(body[3], 0);
const composites = fire.map(pixels => {
  const result = Buffer.from(body);
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) pixels.copy(result, i, i, i + 4);
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
const uri = pixels => 'data:image/png;base64,' + png(pixels).toString('base64');
const before = JSON.parse(fs.readFileSync(__dirname + '/before.json'));
assert(!before.spriteSheets.some(s => s.name === '壁炉'));
const candidate = structuredClone(before), sheetIndex = before.spriteSheets.length;
const frame = source => ({sheetIndex, sourceX:source * W, sourceY:0, width:W, height:H, locked:false, lockedRegions:[], status:'completed', duration:140, notes:''});
const sheet = {name:'壁炉', frameWidth:W, frameHeight:H, columns:7, rows:1, spacingX:0, spacingY:0, offsetX:0, offsetY:0, fps:7, useFrameDurations:true, imageDataURL:'data:image/png;base64,' + png(atlas, W * 7, H).toString('base64'), actions:[{name:'开火', direction:'', frames:composites.slice(0, 6).map((_, i) => frame(i))},{name:'关火', direction:'', frames:[frame(6)]}]};
candidate.spriteSheets.push(sheet);
const bodyFrames = {}, fireFrames = {};
fire.forEach((pixels, i) => {
  const key = sheetIndex + '_' + (i < 6 ? '0_' + i : '1_0');
  bodyFrames[key] = {width:W, height:H, dataURL:uri(body)};
  fireFrames[key] = {width:W, height:H, dataURL:uri(pixels)};
});
for (const [name, frameData] of [['炉体', bodyFrames], ['火焰', fireFrames]]) candidate.layers.push({sheetIndex, parent:null, name, visible:true, locked:false, opacity:1, frameData});
Object.assign(candidate, {currentSheetIndex:sheetIndex, currentActionIndex:0, currentFrameIndex:0, currentLayerIndex:candidate.layers.length - 1});
assert.deepStrictEqual(candidate.spriteSheets.slice(0, -1), before.spriteSheets);
assert.deepStrictEqual(candidate.layers.slice(0, -2), before.layers);
assert.equal(new Set(Object.values(bodyFrames).map(f => f.dataURL)).size, 1);
assert.equal(Object.keys(fireFrames).length, 7);
fs.writeFileSync(__dirname + '/candidate.json', JSON.stringify(candidate));
fs.writeFileSync(__dirname + '/atlas.png', png(atlas, W * 7, H));
fs.writeFileSync(__dirname + '/animation-frames-preview.png', png(atlas, W * 7, H, 10));
fs.writeFileSync(__dirname + '/on-preview.png', png(composites[0], W, H, 16));
fs.writeFileSync(__dirname + '/off-preview.png', png(body, W, H, 16));
fire.forEach((pixels, i) => fs.writeFileSync(__dirname + '/fire-' + i + '.png', png(pixels)));
console.log('Prepared 18x29 fireplace: two layers, six distinct looping on frames, one empty-fire off frame, constant body and transparent background.');
