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

  // 隐藏所有旧头发与发饰
  project.layers.forEach(l => {
    if (l.sheetIndex === si && (l.name.includes('发') || l.name.includes('饰'))) {
      l.visible = false;
    }
  });

  const gen = require('./hair-generator-v2.cjs');
  const frontHair = gen.makeFrontHair();
  const rearLong = gen.makeRearLongHair();
  const rearTwin = gen.makeRearTwinTails();
  const headband = gen.makeHeadband();
  const ribbons = gen.makeRibbons();

  // 创建测试图层
  const lRearLong = new PE.Layer('头发 / 03 浅绿披发 / 后发');
  lRearLong.sheetIndex = si;
  lRearLong.frameData.set(key, rearLong);

  const lRearTwin = new PE.Layer('头发 / 03 浅绿双马尾 / 后发');
  lRearTwin.sheetIndex = si;
  lRearTwin.frameData.set(key, rearTwin);

  const lFront = new PE.Layer('头发 / 03 碎齐刘海 / 前发');
  lFront.sheetIndex = si;
  lFront.frameData.set(key, frontHair);

  const lHeadband = new PE.Layer('发饰 / 03 紫色发箍');
  lHeadband.sheetIndex = si;
  lHeadband.frameData.set(key, headband);

  const lRibbons = new PE.Layer('发饰 / 03 粉色双缎带');
  lRibbons.sheetIndex = si;
  lRibbons.frameData.set(key, ribbons);

  // 放入 project layers：后发在头后（开头），前发与饰品在最前（末尾）
  project.layers.unshift(lRearLong, lRearTwin);
  project.layers.push(lFront, lHeadband, lRibbons);

  const cm = new PE.CanvasManager(document.createElement('canvas'), project);

  function getComp(config) {
    lRearLong.visible = !!config.rearLong;
    lRearTwin.visible = !!config.rearTwin;
    lFront.visible = !!config.front;
    lHeadband.visible = !!config.headband;
    lRibbons.visible = !!config.ribbons;
    return cm.getCompositeImageData(si, ai, fi);
  }

  const variations = [
    { title: 'A. 基础长披发 (参考右下)', cfg: { front: true, rearLong: true } },
    { title: 'B. 披发+紫色发箍 (参考左下)', cfg: { front: true, rearLong: true, headband: true } },
    { title: 'C. 灵动双马尾 (参考右上)', cfg: { front: true, rearTwin: true } },
    { title: 'D. 双马尾+粉缎带 (参考左上)', cfg: { front: true, rearTwin: true, ribbons: true } },
    { title: 'E. 纯前发(独立性检查)', cfg: { front: true } }
  ];

  const scale = 5;
  const tileW = 32 * scale;
  const tileH = 32 * scale;
  const canvasW = (tileW + 15) * variations.length + 20;
  const canvasH = tileH + 60;

  const outCanvas = createCanvas(canvasW, canvasH);
  const ctx = outCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.imageSmoothingEnabled = false;

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#222';

  variations.forEach((v, idx) => {
    const imgData = getComp(v.cfg);
    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(imgData, 0, 0);

    const x = idx * (tileW + 15) + 15;
    const y = 35;

    // 绘制棋盘格底板 (便于观察透明边缘)
    ctx.fillStyle = '#eee';
    ctx.fillRect(x, y, tileW, tileH);

    ctx.drawImage(tile, x, y, tileW, tileH);
    ctx.fillStyle = '#111';
    ctx.fillText(v.title, x, y - 12);
  });

  const outPath = 'test/output/showcase_v2.png';
  fs.writeFileSync(outPath, outCanvas.toBuffer('image/png'));
  console.log('Saved', outPath);
})().catch(console.error);
