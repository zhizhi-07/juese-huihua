const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas, ImageData, Image, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

global.window = global;
global.ImageData = ImageData;
global.Image = Image;
global.document = { createElement() { const c = createCanvas(1, 1); c.style = {}; return c; }, body: { appendChild() {} } };
global.File = class extends Blob { constructor(bytes, name) { super(bytes); this.name = name; } };
global.FileReader = class { async readAsText(f) { this.result = await f.text(); this.onload(); } };

const root = path.resolve(__dirname, '..');
for (const name of ['core', 'history', 'canvas', 'tools', 'spritesheet', 'export', 'api', 'aseprite', 'builtin-packs']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), { filename: name });
}

(async () => {
  const jsonStr = fs.readFileSync(path.join(root, 'data/shared-project.json'), 'utf8');
  const exporter = new PE.ExportManager();
  const res = await exporter.importProject(new File([jsonStr], 'shared-project.json'));
  const project = res.project;

  const si = 8; // original32_idle
  const ai = 1; // down
  const fi = 0;
  const key = `${si}_${ai}_${fi}`;

  // 临时替换或添加图层进行合成测试
  // 我们找到现有的发型图层，将 02 齐刘海和 02 后发隐藏
  project.layers.forEach(l => {
    if (l.sheetIndex === si && (l.name.includes('发') || l.name.includes('饰'))) {
      l.visible = false;
    }
  });

  // 读取我们刚生成的 draft layers
  const draftScript = require('./generate-draft.cjs');
  // generateFrontHair, generateRearHair, generateHeadband
  const draftFront = draftScript.generateFrontHair ? draftScript.generateFrontHair() : null;

  // 让我们把草稿层直接添加到 project 中
  // 在后发位置添加 rear layer
  const rearL = new PE.Layer('头发 / 03 浅绿披发 / 后发');
  rearL.sheetIndex = si;
  rearL.visible = true;
  rearL.frameData.set(key, draftScript.generateRearHair ? draftScript.generateRearHair() : null);

  const frontL = new PE.Layer('头发 / 03 碎齐刘海 / 前发');
  frontL.sheetIndex = si;
  frontL.visible = true;
  frontL.frameData.set(key, draftScript.generateFrontHair ? draftScript.generateFrontHair() : null);

  const accL = new PE.Layer('发饰 / 03 紫色发箍');
  accL.sheetIndex = si;
  accL.visible = false;
  accL.frameData.set(key, draftScript.generateHeadband ? draftScript.generateHeadband() : null);

  // 插入到正确层级：后发在头后，前发在五官前
  // 看看 layers 顺序
  // project.layers 中，rearL 放在头部之前（如 index 5），frontL 放在眼睛之后（如末尾）
  project.layers.unshift(rearL);
  project.layers.push(frontL);
  project.layers.push(accL);

  const cm = new PE.CanvasManager(document.createElement('canvas'), project);

  // 1. 无发饰合成
  const comp1 = cm.getCompositeImageData(si, ai, fi);

  // 2. 带发箍合成
  accL.visible = true;
  const comp2 = cm.getCompositeImageData(si, ai, fi);

  // 3. 仅前发（混搭测试）
  rearL.visible = false;
  accL.visible = false;
  const comp3 = cm.getCompositeImageData(si, ai, fi);

  // 4. 前发换搭 02 双马尾（混搭测试）
  const oldRear = project.layers.find(l => l.name === '头发 / 02 双马尾 / 后发' && l.sheetIndex === si);
  if (oldRear) oldRear.visible = true;
  const comp4 = cm.getCompositeImageData(si, ai, fi);

  // 导出拼接图：4个状态对比，每个 32x32 放大 6 倍
  const scale = 6;
  const totalW = 32 * 4 * scale + 30;
  const totalH = 32 * scale + 40;
  const outCanvas = createCanvas(totalW, totalH);
  const ctx = outCanvas.getContext('2d');
  ctx.fillStyle = '#f5f7fa';
  ctx.fillRect(0, 0, totalW, totalH);
  ctx.imageSmoothingEnabled = false;

  const comps = [
    { name: '1. 浅绿长披发', data: comp1 },
    { name: '2. +紫色发箍', data: comp2 },
    { name: '3. 仅前发(独立性)', data: comp3 },
    { name: '4. 前发+原02双马尾', data: comp4 }
  ];

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#333';
  comps.forEach((c, idx) => {
    const x = idx * (32 * scale + 8) + 10;
    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(c.data, 0, 0);
    ctx.drawImage(tile, x, 25, 32 * scale, 32 * scale);
    ctx.fillText(c.name, x, 18);
  });

  fs.writeFileSync('test/output/draft_comparison.png', outCanvas.toBuffer('image/png'));
  console.log('Saved test/output/draft_comparison.png');
})().catch(console.error);
