const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

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

const v4 = require('./hair-gray-v4.cjs');

function shiftY(src, dy, w = 32, h = 32) {
  const dst = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    const srcY = y - dy;
    if (srcY < 0 || srcY >= h) continue;
    for (let x = 0; x < w; x++) {
      const sIdx = (srcY * w + x) * 4;
      const dIdx = (y * w + x) * 4;
      if (src.data[sIdx + 3] > 0) {
        dst.data[dIdx]     = src.data[sIdx];
        dst.data[dIdx + 1] = src.data[sIdx + 1];
        dst.data[dIdx + 2] = src.data[sIdx + 2];
        dst.data[dIdx + 3] = src.data[sIdx + 3];
      }
    }
  }
  return dst;
}

(async () => {
  const jsonStr = fs.readFileSync(path.join(root, 'data/shared-project.json'), 'utf8');
  const exporter = new PE.ExportManager();
  const res = await exporter.importProject(new File([jsonStr], 'shared-project.json'));
  const project = res.project;

  const si = 8; // original32_idle

  // 隐藏现有 02 发型和 03 绿色发型
  project.layers.forEach(l => {
    if (l.sheetIndex === si && (l.name.includes('发') || l.name.includes('饰'))) {
      l.visible = false;
    }
  });

  // 生成 3 个方向的 4 帧前发
  const dirs = [
    { ai: 1, name: '正面 (down)', gen: v4.makeFrontHairDownGray },
    { ai: 0, name: '侧面 (side)', gen: v4.makeFrontHairSideGray },
    { ai: 2, name: '背面 (up)',   gen: v4.makeFrontHairUpGray }
  ];

  const lFront = new PE.Layer('头发 / 03 双缺口齐刘海 / 前发');
  lFront.sheetIndex = si;
  lFront.visible = true;

  dirs.forEach(d => {
    const f0 = d.gen();
    const f1 = d.gen();
    const f2 = shiftY(f0, 2);
    const f3 = shiftY(f0, 2);
    lFront.frameData.set(`${si}_${d.ai}_0`, f0);
    lFront.frameData.set(`${si}_${d.ai}_1`, f1);
    lFront.frameData.set(`${si}_${d.ai}_2`, f2);
    lFront.frameData.set(`${si}_${d.ai}_3`, f3);
  });

  // 测试与原版 02 双马尾（后发）混搭（原有 02 双马尾也是灰色！）
  const rear02 = project.layers.find(l => l.sheetIndex === si && l.name === '头发 / 02 双马尾 / 后发');
  if (rear02) rear02.visible = true;

  project.layers.push(lFront);

  const cm = new PE.CanvasManager(document.createElement('canvas'), project);

  // 导出 3 个方向的合成对比图
  const scale = 5;
  const tileW = 32 * scale;
  const tileH = 32 * scale;

  const outCanvas = createCanvas((tileW + 20) * 3 + 20, (tileH + 40) * 2 + 30);
  const ctx = outCanvas.getContext('2d');
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  ctx.imageSmoothingEnabled = false;

  ctx.font = 'bold 13px sans-serif';

  // 第一行：前发 + 原版灰色双马尾（混搭效果）
  dirs.forEach((d, idx) => {
    const imgData = cm.getCompositeImageData(si, d.ai, 0);
    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(imgData, 0, 0);

    const x = idx * (tileW + 20) + 15;
    const y = 35;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, tileW, tileH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(x, y, tileW, tileH);

    ctx.drawImage(tile, x, y, tileW, tileH);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`${d.name} + 后发`, x, y - 10);
  });

  // 第二行：纯前发（无后发，检查独立性）
  if (rear02) rear02.visible = false;
  dirs.forEach((d, idx) => {
    const imgData = cm.getCompositeImageData(si, d.ai, 0);
    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(imgData, 0, 0);

    const x = idx * (tileW + 20) + 15;
    const y = tileH + 75;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, tileW, tileH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(x, y, tileW, tileH);

    ctx.drawImage(tile, x, y, tileW, tileH);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`${d.name} (纯前发)`, x, y - 10);
  });

  const outPath = 'test/output/gray_hair_showcase.png';
  fs.writeFileSync(outPath, outCanvas.toBuffer('image/png'));
  console.log('Saved', outPath);
})().catch(console.error);
