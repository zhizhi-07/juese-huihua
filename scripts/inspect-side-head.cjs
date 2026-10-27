const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

global.window = global; global.ImageData = ImageData; global.Image = Image;
global.document = { createElement() { const c = createCanvas(1, 1); c.style = {}; return c; }, body: { appendChild() {} } };
global.File = class extends Blob { constructor(b, n) { super(b); this.name = n; } };
global.FileReader = class { async readAsText(f) { this.result = await f.text(); this.onload(); } };

for (const n of ['core', 'history', 'canvas', 'tools', 'spritesheet', 'export', 'animation']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'));
}

async function inspectSideHead() {
  const exporter = new PE.ExportManager();
  const text = fs.readFileSync('data/shared-project.json', 'utf8');
  const { project } = await exporter.importProject(new File([text], 'shared.json'));
  const headLayer = project.layers.find(l => l.sheetIndex === 8 && l.name === 'head' && l.frameData.has('8_0_0'));
  const fd = headLayer.frameData.get('8_0_0');

  console.log('--- SIDE HEAD PIXELS (8_0_0) ---');
  for (let y = 0; y < 24; y++) {
    let line = '';
    for (let x = 0; x < 32; x++) {
      const idx = (y * 32 + x) * 4;
      line += (fd.data[idx+3] > 0) ? '#' : '.';
    }
    console.log(`${y.toString().padStart(2, ' ')}: ${line}`);
  }
}

inspectSideHead().catch(console.error);
