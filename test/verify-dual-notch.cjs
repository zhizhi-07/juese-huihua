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

(async () => {
  const res = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const projectJson = await res.json();
  const exporter = new PE.ExportManager();
  const importRes = await exporter.importProject(new File([JSON.stringify(projectJson)], 'project.json'));
  const project = importRes.project;

  const si = 8;
  const cm = new PE.CanvasManager(document.createElement('canvas'), project);

  const dirs = [
    { ai: 1, name: '正面 (down)' },
    { ai: 0, name: '侧面 (side)' },
    { ai: 2, name: '背面 (up)' }
  ];

  const scale = 6;
  const tileW = 32 * scale;
  const tileH = 32 * scale;

  const outCanvas = createCanvas((tileW + 15) * 4 + 25, (tileH + 40) * 3 + 20);
  const ctx = outCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';

  dirs.forEach((d, rowIdx) => {
    const y0 = rowIdx * (tileH + 40) + 30;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(d.name, 15, y0 - 8);
    for (let fi = 0; fi < 4; fi++) {
      const imgData = cm.getCompositeImageData(si, d.ai, fi);
      const tile = createCanvas(32, 32);
      tile.getContext('2d').putImageData(imgData, 0, 0);
      const x = fi * (tileW + 15) + 15;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x, y0, tileW, tileH);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(x, y0, tileW, tileH);
      ctx.drawImage(tile, x, y0, tileW, tileH);
    }
  });

  const outPath = path.join(root, '自检记录', '双凹槽刘海_最终三方向.png');
  fs.writeFileSync(outPath, outCanvas.toBuffer('image/png'));
  console.log('Saved to', outPath);
})().catch(e => { console.error(e); process.exit(1); });
