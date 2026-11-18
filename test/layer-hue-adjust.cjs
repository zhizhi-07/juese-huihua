const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');
const { ImageData } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/node-canvas.js');

global.window = global;
global.ImageData = ImageData;
// 模块只在 DOMContentLoaded 时挂面板，测试里给个空壳即可
global.document = { addEventListener: () => {} };
global.PE = { isProtectedHandLayer: layer => !!layer && (/^(?:hand(?:\s|$)|手(?:部|臂)?(?:\s|$))/i.test(layer.name || '') || layer.referenceOnly === true) && (layer.referenceOnly !== false || !!layer.inheritedBase) };

vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, '../js/layer-color-adjust.js'), 'utf8'));
const C = PE.LayerColorAdjust;
assert(C, '模块应导出 PE.LayerColorAdjust');

// --- HSL 往返 ---
assert.deepEqual(C.hslToRgb(0, 1, 0.5), [255, 0, 0], '红');
assert.deepEqual(C.hslToRgb(1 / 3, 1, 0.5), [0, 255, 0], '绿');
assert.deepEqual(C.hslToRgb(2 / 3, 1, 0.5), [0, 0, 255], '蓝');
assert.deepEqual(C.hslToRgb(0, 0, 0.5), [128, 128, 128], '灰');
const [h, s, l] = C.rgbToHsl(255, 0, 0);
assert(Math.abs(h - 0) < 1e-9 && Math.abs(s - 1) < 1e-9 && Math.abs(l - 0.5) < 1e-9, '红色转 HSL 正确');
const cyan = C.rgbToHsl(0, 255, 255);
assert(Math.abs(cyan[0] - 0.5) < 1e-9, '青色色相是 180°');

// --- 整层调色：色相 / 饱和度 / 明度 ---
function image(pixels) {
  const data = new ImageData(pixels.length, 1);
  pixels.forEach((pixel, index) => data.data.set(pixel, index * 4));
  return data;
}

const red = image([[255, 0, 0, 255]]);
assert.equal(C.adjustPixels(red, { hue: 120 }), 1);
assert.deepEqual([...red.data], [0, 255, 0, 255], '色相 +120° 把红变成绿');

const red2 = image([[255, 0, 0, 255]]);
C.adjustPixels(red2, { hue: 180 });
assert.deepEqual([...red2.data], [0, 255, 255, 255], '色相 +180° 把红变成青');

const red3 = image([[255, 0, 0, 255]]);
C.adjustPixels(red3, { saturation: -100 });
assert.deepEqual([...red3.data], [128, 128, 128, 255], '饱和度 -100 变灰');

const red4 = image([[255, 0, 0, 255]]);
C.adjustPixels(red4, { lightness: 100 });
assert.deepEqual([...red4.data], [255, 255, 255, 255], '明度 +100 变白');

const red5 = image([[255, 0, 0, 255]]);
C.adjustPixels(red5, { lightness: -100 });
assert.deepEqual([...red5.data], [0, 0, 0, 255], '明度 -100 变黑');

// 透明像素不受影响，alpha 保留
const mixed = image([[255, 0, 0, 255], [0, 0, 0, 0], [0, 128, 0, 120]]);
C.adjustPixels(mixed, { hue: 180 });
assert.deepEqual([...mixed.data].slice(0, 4), [0, 255, 255, 255], '不透明像素被调色');
assert.deepEqual([...mixed.data].slice(4, 8), [0, 0, 0, 0], '透明像素保持透明');
assert.equal(mixed.data[11], 120, 'alpha 不变');

// 锁定像素（skip 命中）不动
const four = image([[255, 0, 0, 255], [255, 0, 0, 255], [255, 0, 0, 255], [255, 0, 0, 255]]);
assert.equal(C.adjustPixels(four, { hue: 120, skip: x => x === 1 }), 3, '跳过的像素不计入改动');
assert.deepEqual([...four.data].slice(4, 8), [255, 0, 0, 255], '锁定的第 2 个像素保持原色');
assert.deepEqual([...four.data].slice(0, 4), [0, 255, 0, 255], '其余像素照常调色');

// 数值都为 0 时不动任何像素
const neutral = image([[255, 0, 0, 255]]);
assert.equal(C.adjustPixels(neutral, { hue: 0, saturation: 0, lightness: 0 }), 0);
assert.deepEqual([...neutral.data], [255, 0, 0, 255], '没有调整时像素不变');

// --- 调色范围 ---
const layer = { name: '头发 / 前发', frameData: new Map([['0_0_0', mixed], ['0_0_1', mixed], ['0_1_0', mixed], ['1_0_0', mixed]]) };
const project = { currentSheetIndex: 0, currentActionIndex: 0, getFrameKey: () => '0_0_1' };
assert.deepEqual(C.targetKeys(project, layer, 'frame'), ['0_0_1'], '当前帧只调当前帧');
assert.deepEqual(C.targetKeys(project, layer, 'action'), ['0_0_0', '0_0_1'], '当前动作只调这个动作的帧');
assert.deepEqual(C.targetKeys(project, layer, 'layer'), ['0_0_0', '0_0_1', '0_1_0', '1_0_0'], '整层包含所有帧');

// --- 不能调色的图层 ---
const current = value => ({ getCurrentLayer: () => value });
assert.match(C.editableLayer(current(null)).error, /图层/);
assert.match(C.editableLayer(current({ isGroup: true, frameData: new Map() })).error, /组/);
assert.match(C.editableLayer(current({ locked: true, frameData: new Map() })).error, /锁定/);
assert.match(C.editableLayer(current({ inheritedBase: true, frameData: new Map() })).error, /只读/);
assert.match(C.editableLayer(current({ referenceOnly: true, name: 'hand', frameData: new Map() })).error, /手部/);
const ok = C.editableLayer(current(layer));
assert.equal(ok.layer, layer, '普通绘画图层可以调色');

console.log('PASS: HSL 往返、色相/饱和度/明度整体调色、透明与锁定像素安全、三种调色范围、只读图层被拒绝。');
