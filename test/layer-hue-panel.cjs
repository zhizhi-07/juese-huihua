const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');
const { ImageData } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/node-canvas.js');

global.window = global;
global.ImageData = ImageData;
global.requestAnimationFrame = fn => { fn(); return 1; };
global.cancelAnimationFrame = () => {};

class El {
  constructor(id, value, attrs = {}) {
    this.id = id;
    this.value = value;
    this.title = '';
    this.textContent = '';
    this._handlers = {};
    this.classList = { toggle() {}, add() {}, remove() {}, contains: () => false };
    Object.assign(this, attrs);
  }
  addEventListener(name, fn) { (this._handlers[name] || (this._handlers[name] = [])).push(fn); }
  fire(name, extra = {}) { for (const fn of this._handlers[name] || []) fn({ target: this, ...extra }); }
  contains() { return true; }
  append() {}
  setAttribute() {}
}

const nodes = {
  'layer-hue-adjust': new El('layer-hue-adjust', ''),
  'hue-shift': new El('hue-shift', '0', { min: '-180', max: '180' }),
  'hue-shift-number': new El('hue-shift-number', '0'),
  'hue-saturation': new El('hue-saturation', '0', { min: '-100', max: '100' }),
  'hue-saturation-number': new El('hue-saturation-number', '0'),
  'hue-lightness': new El('hue-lightness', '0', { min: '-100', max: '100' }),
  'hue-lightness-number': new El('hue-lightness-number', '0'),
  'hue-scope': new El('hue-scope', 'frame'),
  'hue-apply-btn': new El('hue-apply-btn', ''),
  'hue-reset-btn': new El('hue-reset-btn', ''),
  'hue-adjust-status': new El('hue-adjust-status', ''),
  'hue-adjust-target': new El('hue-adjust-target', '')
};

let ready = null;
global.addEventListener = () => {};
global.document = {
  addEventListener(name, fn) { if (name === 'DOMContentLoaded') ready = fn; },
  getElementById(id) { return nodes[id] || null; }
};

global.PE = {};
vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, '../js/core.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, '../js/history.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, '../js/layer-color-adjust.js'), 'utf8'));

// --- 一个 4×1 的画布：红 / 红 / 透明 / 绿 ---
const layer = new PE.Layer('头发 / 前发');
const image = new ImageData(4, 1);
image.data.set([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0, 0, 255, 0, 255]);
layer.frameData.set('0_0_0', image);

const frame = { width: 4, height: 1, locked: false, isPixelLocked: () => false };
const sheet = { name: 'original16_idle', frameWidth: 4, frameHeight: 1, actions: [{ name: 'idle', direction: 'down', frames: [frame] }] };
const project = {
  layers: [layer],
  spriteSheets: [sheet],
  currentSheetIndex: 0,
  currentActionIndex: 0,
  currentFrameIndex: 0,
  currentLayerIndex: 0,
  getCurrentLayer: () => layer,
  getFrameKey: () => '0_0_0'
};

let renders = 0, thumbUpdates = 0, paletteUpdates = 0, dirty = 0;
const app = {
  project,
  history: new PE.HistoryManager(),
  canvasManager: { render() { renders += 1; } },
  animationPlayer: { _renderPreviewFrame() {} },
  updateFrameList() { thumbUpdates += 1; },
  updatePalette() { paletteUpdates += 1; },
  updateLayerList() {},
  persistence: { markDirty() { dirty += 1; } },
  selectFrame() {},
  selectAction() {},
  selectSheet() {}
};
global.PE.app = app;
ready();

const pixel = index => [...image.data.slice(index * 4, index * 4 + 4)];
const slider = () => nodes['hue-shift'];

// --- 拖色相：即时预览，先不改撤销栈 ---
slider().value = '180';
slider().fire('input');
assert.deepEqual(pixel(0), [0, 255, 255, 255], '拖动滑条后预览生效');
assert.deepEqual(pixel(2), [0, 0, 0, 0], '透明像素保持透明');
assert.equal(pixel(3)[3], 255, '不透明像素 alpha 完好');
assert.deepEqual(pixel(3), [255, 0, 255, 255], '绿色像素按色相 +180° 变成品红');
assert.equal(app.history.undoStack.length, 0, '预览阶段不该写撤销栈');
assert.match(nodes['hue-adjust-status'].textContent, /预览中/, '状态栏提示预览');
assert(renders > 0, '预览需要重绘主画布');

// --- 应用：写入撤销栈、滑条归零 ---
nodes['hue-apply-btn'].fire('click');
assert.equal(app.history.undoStack.length, 1, '应用后产生一条撤销记录');
assert.equal(app.history.undoStack[0].description, '图层调色');
assert(thumbUpdates > 0, '应用后刷新帧缩略图');
assert(paletteUpdates > 0, '应用后刷新颜色面板');
assert.equal(dirty, 1, '应用后标记未保存');
assert.equal(slider().value, '0', '应用后滑条归零');
assert.deepEqual(pixel(0), [0, 255, 255, 255], '应用后像素保留调色结果');

// --- 撤销 ---
app.history.undo(project);
assert.deepEqual(pixel(0), [255, 0, 0, 255], 'Ctrl+Z 能回到调色前');
app.history.redo(project);
assert.deepEqual(pixel(0), [0, 255, 255, 255], '重做恢复调色结果');

// --- 复位：丢弃预览 ---
slider().value = '-180';
slider().fire('input');
assert.deepEqual(pixel(0), [255, 0, 0, 255], '再次拖动立刻预览（相对当前像素回退）');
nodes['hue-reset-btn'].fire('click');
assert.deepEqual(pixel(0), [0, 255, 255, 255], '复位回到调色后的像素');
assert.equal(slider().value, '0', '复位后滑条归零');
assert.equal(app.history.undoStack.length, 1, '复位不新增撤销记录');

// --- 切帧时未应用的预览自动落盘，像素不会悄悄改掉 ---
nodes['hue-saturation'].value = '-100';
nodes['hue-saturation'].fire('input');
assert.deepEqual(pixel(0), [128, 128, 128, 255], '饱和度 -100 预览变灰');
app.selectFrame(0, 0, 0);
assert.equal(app.history.undoStack.length, 2, '切帧时自动应用，写入撤销栈');
assert.deepEqual(pixel(0), [128, 128, 128, 255], '自动应用保留像素');

// --- 锁定图层不允许调色 ---
layer.locked = true;
slider().value = '90';
slider().fire('input');
assert.deepEqual(pixel(0), [128, 128, 128, 255], '锁定图层像素不动');
assert.match(nodes['hue-adjust-status'].textContent, /锁定/, '锁定图层给出提示');
node_status_check: {
  assert.equal(app.history.undoStack.length, 2, '锁定图层不会新增撤销记录');
}
layer.locked = false;

// --- 只读 / 组图层也被拒绝 ---
layer.isGroup = true;
slider().fire('input');
assert.match(nodes['hue-adjust-status'].textContent, /组/, '组图层给出提示');
delete layer.isGroup;
layer.inheritedBase = true;
slider().fire('input');
assert.match(nodes['hue-adjust-status'].textContent, /只读/, '跟随主工程图层给出提示');
delete layer.inheritedBase;

console.log('PASS: 颜色面板拖动即时预览、应用写入一次撤销、Ctrl+Z/重做、复位丢弃预览、切帧自动落盘、锁定与只读图层被拒绝。');
