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
  const ai = 1; // down
  const fi = 0;
  const key = `${si}_${ai}_${fi}`;

  const headLayer = project.layers[178]; // head in down
  const bodyLayer = project.layers[177]; // body in down

  function getBounds(layer) {
    if (!layer) return null;
    const d = layer.getFrameData(key);
    if (!d) return null;
    let minX = 32, maxX = -1, minY = 32, maxY = -1;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const a = d.data[(y * 32 + x) * 4 + 3];
        if (a > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  console.log('Head bounds:', getBounds(headLayer));
  console.log('Body bounds:', getBounds(bodyLayer));

  const hd = headLayer.getFrameData(key);
  console.log('\nHead rows:');
  for (let y = 0; y < 32; y++) {
    let rowMin = 32, rowMax = -1;
    for (let x = 0; x < 32; x++) {
      if (hd.data[(y * 32 + x) * 4 + 3] > 0) {
        if (x < rowMin) rowMin = x;
        if (x > rowMax) rowMax = x;
      }
    }
    if (rowMax >= 0) {
      console.log(`y=${y}: x=[${rowMin}, ${rowMax}] (width=${rowMax - rowMin + 1}, mid=${(rowMin + rowMax) / 2})`);
    }
  }
})().catch(console.error);
