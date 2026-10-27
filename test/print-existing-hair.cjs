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

  const front02 = project.layers[266]; // 02 齐刘海
  const rear02 = project.layers[5];   // 02 双马尾
  const rear01 = project.layers[6];   // 01 披发

  function printAscii(layer, name) {
    const d = layer.getFrameData(key);
    console.log(`\n=== ${name} ===`);
    for (let y = 0; y < 32; y++) {
      let row = '';
      for (let x = 0; x < 32; x++) {
        const idx = (y * 32 + x) * 4;
        const a = d.data[idx + 3];
        if (a === 0) row += '  ';
        else {
          const r = d.data[idx];
          if (r < 50) row += '##'; // 描边
          else if (r < 180) row += '..'; // 阴影
          else row += 'OO'; // 底色
        }
      }
      if (row.trim()) console.log(`${y.toString().padStart(2, '0')}: ${row}`);
    }
  }

  printAscii(front02, '02 齐刘海 / 前发');
  printAscii(rear01, '01 披发 / 后发');
})().catch(console.error);
