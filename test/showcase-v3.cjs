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

  // 隐藏旧头发
  project.layers.forEach(l => {
    if (l.sheetIndex === si && (l.name.includes('发') || l.name.includes('饰'))) {
      l.visible = false;
    }
  });

  const v3 = require('./hair-generator-v3.cjs');
  const v2 = require('./hair-generator-v2.cjs');

  const frontHair = v3.makeFrontHairV3();
  const rearLong  = v3.makeRearLongHairV3();
  const rearTwin  = v2.makeRearTwinTails();
  const headband  = v2.makeHeadband();
  const ribbons   = v2.makeRibbons();

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

  // 组装到 project
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
    { title: 'A. 浅绿长披发(经典)', cfg: { front: true, rearLong: true } },
    { title: 'B. 披发+紫色发箍', cfg: { front: true, rearLong: true, headband: true } },
    { title: 'C. 浅绿双马尾', cfg: { front: true, rearTwin: true } },
    { title: 'D. 双马尾+粉色缎带', cfg: { front: true, rearTwin: true, ribbons: true } },
    { title: 'E. 纯前发(独立性检定)', cfg: { front: true } }
  ];

  const scale = 6;
  const tileW = 32 * scale;
  const tileH = 32 * scale;
  const canvasW = (tileW + 20) * variations.length + 30;
  const canvasH = tileH + 80;

  const outCanvas = createCanvas(canvasW, canvasH);
  const ctx = outCanvas.getContext('2d');
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.imageSmoothingEnabled = false;

  ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';

  variations.forEach((v, idx) => {
    const imgData = getComp(v.cfg);
    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(imgData, 0, 0);

    const x = idx * (tileW + 20) + 20;
    const y = 45;

    // 棋盘格背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, tileW, tileH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(x, y, tileW, tileH);

    ctx.drawImage(tile, x, y, tileW, tileH);
    ctx.fillStyle = '#1e293b';
    ctx.fillText(v.title, x, y - 14);
  });

  const outPath = 'test/output/showcase_v3.png';
  fs.writeFileSync(outPath, outCanvas.toBuffer('image/png'));
  console.log('Saved', outPath);
})().catch(console.error);
