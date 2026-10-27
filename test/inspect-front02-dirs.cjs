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
  const jsonStr = fs.readFileSync(path.join(root, 'data/shared-project.json'), 'utf8');
  const exporter = new PE.ExportManager();
  const res = await exporter.importProject(new File([jsonStr], 'shared-project.json'));
  const project = res.project;

  const si = 8; // original32_idle
  const front02 = project.layers.find(l => l.sheetIndex === si && l.name === '头发 / 02 齐刘海 / 前发');

  // 导出 02 前发在 side (ai=0) 和 up (ai=2) 的 4 帧
  for (let ai of [0, 2]) {
    const act = project.spriteSheets[si].actions[ai];
    console.log(`Action ${ai}: ${act.name} (${act.direction}), frames: ${act.frames.length}`);

    const outCanvas = createCanvas(32 * 4 * 6, 32 * 6);
    const ctx = outCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let fi = 0; fi < act.frames.length; fi++) {
      const key = `${si}_${ai}_${fi}`;
      const fd = front02 ? front02.getFrameData(key) : null;
      if (fd) {
        const tile = createCanvas(32, 32);
        tile.getContext('2d').putImageData(fd, 0, 0);
        ctx.drawImage(tile, fi * 32 * 6, 0, 32 * 6, 32 * 6);
      }
    }

    fs.writeFileSync(`test/output/front02_${act.direction}_frames.png`, outCanvas.toBuffer('image/png'));
    console.log(`Saved test/output/front02_${act.direction}_frames.png`);
  }
})().catch(console.error);
