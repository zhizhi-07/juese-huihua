const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
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
  console.log('Fetching live project from API...');
  const res = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const projectJson = await res.json();

  const exporter = new PE.ExportManager();
  const importRes = await exporter.importProject(new File([JSON.stringify(projectJson)], 'project.json'));
  const project = importRes.project;

  const si = 8; // original32_idle
  const ai = 1; // down
  const cm = new PE.CanvasManager(document.createElement('canvas'), project);

  // 1. 验证待机正面 4 帧合成画面非空
  for (let fi = 0; fi < 4; fi++) {
    const comp = cm.getCompositeImageData(si, ai, fi);
    assert(comp && comp.data.length > 0, `Frame ${fi} comp empty`);
    let nonTransparent = 0;
    for (let i = 3; i < comp.data.length; i += 4) {
      if (comp.data[i] > 0) nonTransparent++;
    }
    console.log(`Frame ${fi}: non-transparent pixels = ${nonTransparent}`);
    assert(nonTransparent > 100, `Frame ${fi} has too few pixels (${nonTransparent})`);
  }

  // 2. 导出最终 4 帧合成图供确认
  const scale = 6;
  const outCanvas = createCanvas(32 * 4 * scale + 40, 32 * scale + 40);
  const ctx = outCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  ctx.imageSmoothingEnabled = false;

  for (let fi = 0; fi < 4; fi++) {
    const imgData = cm.getCompositeImageData(si, ai, fi);
    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(imgData, 0, 0);
    ctx.drawImage(tile, fi * (32 * scale + 8) + 10, 15, 32 * scale, 32 * scale);
  }

  const finalPngPath = path.join(root, '自检记录', '待机新发型_最终合成回验.png');
  const dir = path.dirname(finalPngPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(finalPngPath, outCanvas.toBuffer('image/png'));
  console.log('Saved final verification image to:', finalPngPath);
  console.log('PASS: All assertions passed.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
