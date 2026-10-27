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

  const front02 = project.layers[266];
  const d = front02.getFrameData(key).data;
  const colors = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i+3] > 0) {
      const hex = '#' + [d[i], d[i+1], d[i+2]].map(x => x.toString(16).padStart(2, '0')).join('');
      colors.set(hex, (colors.get(hex) || 0) + 1);
    }
  }
  console.log('02 Front hair colors:', Array.from(colors.entries()));
})().catch(console.error);
