const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas, ImageData } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

global.window = global;
global.ImageData = ImageData;
global.document = {
  createElement() {
    const c = createCanvas(1, 1);
    c.style = {};
    return c;
  }
};

const root = path.resolve(__dirname, '..');
for (const n of ['core', 'canvas', 'export']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, 'js', n + '.js'), 'utf8'));
}

const proj = JSON.parse(fs.readFileSync('data/shared-project.json', 'utf8'));
const cm = new PE.CanvasManager(document.createElement('canvas'), proj);

// 查找 original32_idle 的 sheetIndex，以及 actions
const sheetIndex = 8; // original32_idle
const actions = proj.spriteSheets[sheetIndex].actions;
console.log('original32_idle actions:', actions.map((a, i) => `${i}: ${a.name} (${a.direction}) frames: ${a.frames.length}`));

// 保存正面第0帧（down）
// 找到 action index
const downActionIdx = actions.findIndex(a => a.direction === 'down');
console.log('downActionIdx:', downActionIdx);

const comp = cm.getCompositeImageData(sheetIndex, downActionIdx, 0);
console.log('Composite size:', comp.width, comp.height);

const c = createCanvas(comp.width, comp.height);
const ctx = c.getContext('2d');
ctx.putImageData(comp, 0, 0);

// 保存原尺寸和放大8倍的预览
const bigCanvas = createCanvas(comp.width * 8, comp.height * 8);
const bctx = bigCanvas.getContext('2d');
bctx.imageSmoothingEnabled = false;
bctx.drawImage(c, 0, 0, comp.width * 8, comp.height * 8);

if (!fs.existsSync('test/output')) fs.mkdirSync('test/output');
fs.writeFileSync('test/output/current_idle_down_0.png', bigCanvas.toBuffer('image/png'));
console.log('Saved test/output/current_idle_down_0.png');

// 也导出 01 披发 和 02 双马尾 各层的图像
const frameKey = proj.getFrameKey ? proj.getFrameKey(sheetIndex, downActionIdx, 0) : `${sheetIndex}_${downActionIdx}_0`;
console.log('frameKey:', frameKey);
