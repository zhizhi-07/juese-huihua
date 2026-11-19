const fs = require('fs'), zlib = require('zlib'), assert = require('assert');
const W = 21, H = 21;
const colors = {k:'2b3034',w:'a07e65',d:'755f52',n:'806355',t:'a58063',b:'74584c',s:'7b5652',S:'63424b',c:'8f8882',q:'85704f',L:'c0a280',o:'8a8951',l:'baa97b',y:'b39f6d',h:'777950',g:'526c45',v:'536c5a',p:'584249',P:'48393e',C:'737b7d'};
const layers = [Buffer.alloc(W * H * 4), Buffer.alloc(W * H * 4)];
function rect(layer, x, y, w, h, color) {
  assert(x >= 0 && y >= 0 && x + w <= W && y + h <= H);
  const rgba = [...colors[color].match(/../g).map(c => parseInt(c, 16)), 255];
  for (let Y = y; Y < y + h; Y++) for (let X = x; X < x + w; X++) layers[layer].set(rgba, (Y * W + X) * 4);
}
function grid(x, y, rows) {
  assert(rows.every(row => row.length === rows[0].length));
  rows.forEach((row, Y) => [...row].forEach((color, X) => { if (color !== '.') rect(1, x + X, y + Y, 1, 1, color); }));
}
// Complete posts and uninterrupted shelves remain behind the removable luggage.
for (const x of [0, 18]) {
  rect(0, x, 1, 3, 20, 'k');
  rect(0, x + 1, 2, 1, 6, 'w');
  rect(0, x + 1, 8, 1, 12, 'd');
}
for (const y of [10, 17]) {
  rect(0, 2, y, 17, 3, 'k');
  rect(0, 1, y + 1, 19, 1, 'n');
}
grid(2, 0, [
  '.kkkk.', 'kttstk', 'kttctk', 'ktbstk', 'kttstk',
  'kbbSbk', 'kbbSbk', 'kbbSbk', 'kbbSbk', 'kbbSbk', 'kkkkkk',
]);
grid(7, 1, [
  'kkkkk', 'ktstk', 'ktctk', 'ktctk', 'ktStk',
  'kbSbk', 'kbSbk', 'kbSbk', 'kbSbk', 'kkkkk',
]);
grid(11, 2, [
  'kkkkkkkk', 'kolsslgk', 'koqssqlk', 'koyssyok', 'koyssyok',
  'khhSSgvk', 'khhSSgvk', 'khhSSgvk', 'kkkkkkkk',
]);
grid(2, 12, [
  'kkkkkkkkk', 'kbLttttLk', 'ktbLttttk', 'kttqqqqtk', 'ktttttttk', 'kkkkkkkkk',
]);
grid(10, 12, [
  'kkkkkkkkk', 'kpppppPpk', 'kpCPCCPCk', 'kPPPPPPPk', 'kpppCpCpk', 'kkkkkkkkk',
]);
const composite = Buffer.from(layers[0]);
for (let i = 0; i < composite.length; i += 4) if (layers[1][i + 3]) layers[1].copy(composite, i, i, i + 4);
for (const y of [10, 11, 12, 17, 18, 19]) for (let x = 2; x <= 18; x++) assert.equal(layers[0][(y * W + x) * 4 + 3], 255);
for (let y = 2; y <= 19; y++) for (const x of [0, 1, 2, 18, 19, 20]) assert.equal(layers[0][(y * W + x) * 4 + 3], 255);
for (const [x, y] of [[10, 0], [10, 5], [10, 14], [10, 20]]) assert.equal(layers[0][(y * W + x) * 4 + 3], 0);
assert(layers[1][(5 * W + 5) * 4 + 3] && !layers[0][(5 * W + 5) * 4 + 3]);
function chunk(type, data) {
  const tag = Buffer.from(type), length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([tag, data])) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, tag, data, checksum]);
}
function png(pixels, scale = 1) {
  const w = W * scale, h = H * scale, header = Buffer.alloc(13), scan = Buffer.alloc((w * 4 + 1) * h);
  header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 6;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const source = (Math.floor(y / scale) * W + Math.floor(x / scale)) * 4;
    pixels.copy(scan, y * (w * 4 + 1) + 1 + x * 4, source, source + 4);
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(scan)), chunk('IEND', Buffer.alloc(0))]);
}
const uri = pixels => 'data:image/png;base64,' + png(pixels).toString('base64');
const before = JSON.parse(fs.readFileSync(__dirname + '/before.json'));
assert(!before.spriteSheets.some(s => s.name === '行李架'));
const candidate = structuredClone(before), sheetIndex = before.spriteSheets.length;
const sheet = structuredClone(before.spriteSheets[0]);
Object.assign(sheet, {name:'行李架', frameWidth:W, frameHeight:H, imageDataURL:uri(composite)});
sheet.actions = [{name:'行李架', direction:'', frames:[{sheetIndex, sourceX:0, sourceY:0, width:W, height:H, locked:false, lockedRegions:[], status:'completed', duration:0, notes:''}]}];
candidate.spriteSheets.push(sheet);
['空架子', '上面物品'].forEach((name, i) => candidate.layers.push({sheetIndex, parent:null, name, visible:true, locked:false, opacity:1, frameData:{[sheetIndex + '_0_0']:{width:W, height:H, dataURL:uri(layers[i])}}}));
candidate.currentSheetIndex = sheetIndex;
candidate.currentActionIndex = 0;
candidate.currentFrameIndex = 0;
candidate.currentLayerIndex = candidate.layers.length - 1;
assert.deepStrictEqual(candidate.spriteSheets.slice(0, -1), before.spriteSheets);
assert.deepStrictEqual(candidate.layers.slice(0, -2), before.layers);
assert.deepStrictEqual(candidate.sceneAssembly, before.sceneAssembly);
fs.writeFileSync(__dirname + '/candidate.json', JSON.stringify(candidate));
for (const [name, pixels] of [['empty-rack', layers[0]], ['luggage', layers[1]], ['rack-with-luggage', composite]]) {
  fs.writeFileSync(__dirname + '/' + name + '.png', png(pixels));
  fs.writeFileSync(__dirname + '/' + name + '-preview.png', png(pixels, 24));
}
console.log('Prepared 21x21 luggage rack with exactly two layers; complete empty shelves and transparent openings verified.');
