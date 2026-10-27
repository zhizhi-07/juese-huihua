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

  const headLayer = project.layers[178];
  const oldFrontHair = project.layers[266]; // 02 齐刘海

  for (let fi = 0; fi < 4; fi++) {
    const key = `${si}_${ai}_${fi}`;
    const hd = headLayer.getFrameData(key);
    const fd = oldFrontHair.getFrameData(key);

    let headTop = 99, headBot = -1;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        if (hd && hd.data[(y * 32 + x) * 4 + 3] > 0) {
          if (y < headTop) headTop = y;
          if (y > headBot) headBot = y;
        }
      }
    }

    let hairTop = 99, hairBot = -1;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        if (fd && fd.data[(y * 32 + x) * 4 + 3] > 0) {
          if (y < hairTop) hairTop = y;
          if (y > hairBot) hairBot = y;
        }
      }
    }

    console.log(`Frame ${fi}: head y=[${headTop}, ${headBot}], hair y=[${hairTop}, ${hairBot}]`);
  }
})().catch(console.error);
