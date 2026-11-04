/**
 * 跨窗口复制验证：
 *   窗口 A 复制图层 → 写入共享剪贴板 → 窗口 B（另一个工程）粘贴 → 内容一致。
 * 用两个互不共享内存的 “窗口” 模拟两个标签页：同一个 localStorage，不同的 app / project。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// 纯 JS 的 ImageData 替身，避免依赖原生 canvas（要支持 (w,h) 与 (data,w,h) 两种构造）。
class FakeImageData {
  constructor(a, b, c) {
    if (typeof a === 'number') {
      this.width = a;
      this.height = b;
      this.data = new Uint8ClampedArray(a * b * 4);
    } else {
      this.data = a;
      this.width = b;
      this.height = c;
    }
  }
}

// 两个窗口共享的 localStorage（模拟同源标签页共享存储）。
const storageData = new Map();
const localStorage = {
  getItem: key => (storageData.has(key) ? storageData.get(key) : null),
  setItem: (key, value) => storageData.set(key, String(value)),
  removeItem: key => storageData.delete(key)
};

global.ImageData = FakeImageData;
global.localStorage = localStorage;
global.navigator = {};
global.btoa = text => Buffer.from(text, 'binary').toString('base64');
global.atob = text => Buffer.from(text, 'base64').toString('binary');

const context = {
  window: null,
  ImageData: FakeImageData,
  localStorage,
  btoa: global.btoa,
  atob: global.atob,
  navigator: {},
  document: {
    addEventListener() {},
    createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} } }),
    getElementById: () => null,
    body: { append() {} }
  },
  console,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  JSON,
  Uint8ClampedArray,
  Uint8Array,
  Buffer
};
context.window = context;
context.globalThis = context;
context.self = context;
vm.createContext(context);

const load = name => vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/', name), 'utf8'), context, { filename: name });
for (const name of ['core.js', 'history.js', 'shared-clipboard.js', 'frame-tools.js']) load(name);

const { PE } = context;

// ---------- 造两个“窗口”各自的工程 ----------
function makeWindow(projectName, sheetName) {
  const project = new PE.Project();
  const sheet = new PE.SpriteSheet(sheetName);
  const action = new PE.Action('down', 'down');
  action.frames = [new PE.Frame(0, 0, 0, 16, 16)];
  sheet.actions = [action];
  project.spriteSheets = [sheet];
  project.layers = [];
  const hair = new PE.Layer('头发 / 测试 / 后发');
  hair.sheetIndex = 0;
  project.layers.push(hair);
  project.name = projectName;
  project.currentSheetIndex = 0;
  project.currentActionIndex = 0;
  project.currentFrameIndex = 0;
  project.currentLayerIndex = 0;

  const history = new PE.HistoryManager();
  const app = {
    project,
    history,
    toolManager: { isDrawing: false, selection: null, clearSelection() {} },
    canvasManager: { render() {} },
    animationPlayer: { pause() {} },
    updateAll() {},
    persistence: { markDirty() {}, projectId: projectName }
  };
  return { app, project, hair };
}

const winA = makeWindow('main', 'main-sheet');
const winB = makeWindow('branch', 'branch-sheet');

// 窗口 A 里画几个像素
const pixelsA = new FakeImageData(16, 16);
pixelsA.data.set([255, 0, 0, 255], (3 * 16 + 4) * 4);
pixelsA.data.set([0, 0, 255, 255], (5 * 16 + 6) * 4);
winA.hair.frameData.set('0_0_0', pixelsA);

// 窗口 A 执行复制
PE.FrameEditing.copy(winA.app, {});
assert.ok(winA.app.frameClipboard, '窗口 A 应产生剪贴板');
assert.equal(winA.app.frameClipboard.pixelCount, 2);

// 共享剪贴板里应该已经有内容（相当于另一个窗口能读到的）
const shared = PE.SharedClipboard.load();
assert.ok(shared, '共享剪贴板应有内容');
assert.equal(shared.detached, true);
assert.equal(shared.source.layerName, '头发 / 测试 / 后发');
assert.equal(shared.pixels.width, 3, '透明外框应被裁掉');
assert.equal(shared.pixels.height, 3);

// 窗口 B：既没有本地剪贴板，也能读到共享内容
assert.equal(winB.app.frameClipboard, undefined);
const resolved = PE.FrameEditing.resolveClipboard(winB.app);
assert.ok(resolved, '窗口 B 应能取到共享剪贴板');
assert.equal(resolved.detached, true);

// 窗口 B 粘贴
const result = PE.FrameEditing.paste(winB.app, [{}]);
assert.ok(result, '窗口 B 应能粘贴');
assert.ok(result.modifiedPixels > 0, '应写入像素');

// 窗口 B 里应该新建了同名图层并写入了同样的像素
const pasted = winB.project.layers.find(l => l.name === '头发 / 测试 / 后发');
assert.ok(pasted, '窗口 B 应新建同名图层');
const data = pasted.getFrameData('0_0_0');
assert.ok(data, '窗口 B 应有粘贴后的像素');
let matched = 0;
for (let i = 0; i < data.data.length; i += 4) {
  const r = data.data[i], g = data.data[i + 1], b = data.data[i + 2], a = data.data[i + 3];
  if (!a) continue;
  if ((r === 255 && g === 0 && b === 0) || (r === 0 && g === 0 && b === 255)) matched++;
}
assert.equal(matched, 2, '两个彩色像素都应粘贴过去');

// 撤销应回到粘贴前
winB.app.history.undo(winB.project);
assert.equal(pasted.getFrameData('0_0_0'), null, '撤销应移除粘贴的像素');

// 窗口 A 的原始像素不能被窗口 B 影响
assert.equal(winA.hair.getFrameData('0_0_0').data[(3 * 16 + 4) * 4], 255);

// 窗口 A 之后自己再复制一次，本地剪贴板应优先
const pixelsA2 = new FakeImageData(16, 16);
pixelsA2.data.set([0, 255, 0, 255], 0);
winA.hair.frameData.set('0_0_0', pixelsA2);
PE.FrameEditing.copy(winA.app, {});
const resolvedA = PE.FrameEditing.resolveClipboard(winA.app);
assert.equal(resolvedA.detached, undefined, '窗口内刚复制的应优先用本地剪贴板');
assert.equal(resolvedA.pixels.data[1], 255);

console.log('PASS: 窗口 A 复制 → 共享剪贴板 → 窗口 B（另一工程）粘贴成功；像素一致；可撤销；本地优先。');
