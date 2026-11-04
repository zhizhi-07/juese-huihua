const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { encode, decode } = require('./png.cjs');

// 独立像素稿；不读写已有工程或素材。
const dir = path.resolve(__dirname, '../导出/俯视木椅_20261102');
fs.mkdirSync(dir, { recursive: true });
const W = 32, H = 32;
const C = {
  outline: '#4b485e', dark: '#715769', shadow: '#996b69',
  edge: '#b7806c', wood: '#c99570', light: '#dcad7f',
  top: '#efd09a', joint: '#a87768',
};
const rgb = hex => hex.match(/[a-f0-9]{2}/gi).map(n => parseInt(n, 16));
const layers = [];
function layer(name) {
  const data = Buffer.alloc(W * H * 4);
  layers.push({ name, data });
  return (x, y, w, h, color) => {
    assert(x >= 0 && y >= 0 && x + w <= W && y + h <= H);
    const rgba = [...rgb(C[color]), 255];
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++)
      data.set(rgba, (j * W + i) * 4);
  };
}

let r = layer('后腿与支撑');
for (const x of [9, 20]) {
  r(x, 20, 3, 6, 'outline');
  r(x + 1, 21, 1, 4, 'shadow');
}
r(10, 23, 12, 2, 'dark');

r = layer('椅背');
for (const x of [7, 22]) {
  r(x, 4, 3, 14, 'outline');
  r(x + 1, 5, 1, 12, x === 7 ? 'light' : 'edge');
}
// 横梁、两个竖向靠背条及镂空；顶缘受左上方光照。
r(8, 3, 16, 1, 'outline');
r(8, 4, 16, 4, 'wood');
r(8, 4, 15, 1, 'top');
r(9, 5, 13, 1, 'light');
r(9, 7, 14, 1, 'shadow');
r(10, 8, 12, 1, 'outline');
for (const x of [11, 18]) {
  r(x, 9, 3, 5, 'dark');
  r(x, 9, 1, 5, 'light');
  r(x + 1, 9, 1, 5, 'wood');
}
r(9, 13, 14, 2, 'shadow');
r(10, 13, 12, 1, 'edge');

r = layer('坐面与前沿');
// 坐面向前展开，但保持正交正面，不做左右等距斜转。
for (const [y, x, w] of [[14,8,16],[15,7,18],[16,7,18],[17,6,20],[18,6,20],[19,5,22],[20,5,22]]) {
  r(x, y, w, 1, 'outline');
  r(x + 1, y, w - 2, 1, y === 14 ? 'shadow' : 'light');
}
r(8, 15, 16, 1, 'wood');
r(8, 16, 15, 1, 'light');
r(7, 18, 17, 1, 'wood');
r(7, 19, 17, 1, 'light');
r(6, 20, 20, 1, 'top');
r(24, 17, 1, 2, 'edge');
r(25, 19, 1, 1, 'edge');
// 顺木板结构的接缝，非随机噪点。
r(13, 16, 1, 2, 'wood');
r(18, 19, 1, 1, 'wood');
r(5, 21, 22, 3, 'outline');
r(6, 21, 20, 1, 'wood');
r(6, 22, 20, 1, 'shadow');
r(7, 22, 17, 1, 'edge');

r = layer('前腿');
for (const x of [6, 22]) {
  r(x, 23, 4, 6, 'outline');
  r(x + 1, 23, 2, 5, 'shadow');
  r(x + 1, 23, 1, 4, x === 6 ? 'light' : 'wood');
  r(x + 2, 24, 1, 3, 'edge');
}

const data = Buffer.alloc(W * H * 4);
for (const l of layers) for (let i = 0; i < data.length; i += 4)
  if (l.data[i + 3]) l.data.copy(data, i, i, i + 4);
function scale(source, width, height, factor) {
  const out = Buffer.alloc(width * height * factor * factor * 4);
  for (let y = 0; y < height * factor; y++) for (let x = 0; x < width * factor; x++) {
    const i = (Math.floor(y / factor) * width + Math.floor(x / factor)) * 4;
    out.set(source.subarray(i, i + 4), (y * width * factor + x) * 4);
  }
  return out;
}
const nativePath = path.join(dir, '俯视木椅_32x32.png');
const largePath = path.join(dir, '俯视木椅_大图.png');
for (const f of [nativePath, largePath]) assert(!fs.existsSync(f), `不覆盖已有稿：${f}`);
fs.writeFileSync(nativePath, encode(W, H, data));
fs.writeFileSync(largePath, encode(320, 320, scale(data, W, H, 10)));

// 原尺寸、同像素尺度参考、浅深底放大检查。
const qw = 384, qh = 224, qa = Buffer.alloc(qw * qh * 4);
for (let y = 0; y < qh; y++) for (let x = 0; x < qw; x++)
  qa.set([...rgb(x < qw / 2 ? '#f4eee4' : '#292735'), 255], (y * qw + x) * 4);
function paste(b, w, h, dx, dy, factor) {
  b = scale(b, w, h, factor);
  for (let y = 0; y < h * factor; y++) for (let x = 0; x < w * factor; x++) {
    const i = (y * w * factor + x) * 4;
    if (b[i + 3]) qa.set(b.subarray(i, i + 4), ((dy + y) * qw + dx + x) * 4);
  }
}
paste(data, W, H, 20, 20, 4);
paste(data, W, H, 212, 20, 4);
paste(data, W, H, 20, 172, 1);
const ref = decode(fs.readFileSync(path.resolve(__dirname, '../assets/scene-reference/3.png')));
// 原参考是二倍显示像素，抽取其原生密度后并排看木材色阶。
const refNative = Buffer.alloc(32 * 48 * 4);
for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++)
  refNative.set(ref.data.slice((y * 2 * ref.width + x * 2) * 4, (y * 2 * ref.width + x * 2) * 4 + 4), (y * 32 + x) * 4);
paste(refNative, 32, 48, 76, 158, 1);
fs.writeFileSync(path.join(dir, '俯视木椅_浅深底自检.png'), encode(qw, qh, qa));

const read = decode(fs.readFileSync(nativePath));
assert.equal(read.width, W); assert.equal(read.height, H);
assert.deepEqual(Buffer.from(read.data), data);
assert.deepEqual(Buffer.from(decode(fs.readFileSync(largePath)).data), scale(data, W, H, 10));
const colors = new Set();
for (let i = 0; i < data.length; i += 4) {
  assert(data[i + 3] === 0 || data[i + 3] === 255);
  if (data[i + 3]) colors.add(data.subarray(i, i + 3).toString('hex'));
}
assert(colors.size <= 12);
assert.equal(data[(11 * W + 15) * 4 + 3], 0, '椅背镂空必须透明');
assert.equal(data[(18 * W + 15) * 4 + 3], 255, '坐面必须完整');
console.log(JSON.stringify({ nativePath, largePath, colors: colors.size, tests: 'PNG回读、硬透明、镂空、坐面、10倍逐像素一致：通过' }, null, 2));
