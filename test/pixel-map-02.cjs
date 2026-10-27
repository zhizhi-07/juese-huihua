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

  const si = 8;
  const front02 = project.layers.find(l => l.sheetIndex === si && l.name === '头发 / 02 齐刘海 / 前发');

  // 导出 02 所有帧的像素数据
  const allKeys = [];
  for (let ai = 0; ai < 3; ai++) {
    for (let fi = 0; fi < 4; fi++) {
      allKeys.push(`${si}_${ai}_${fi}`);
    }
  }

  const frames = {};
  allKeys.forEach(key => {
    const fd = front02.getFrameData(key);
    if (fd) frames[key] = fd;
  });

  console.log('Collected keys:', Object.keys(frames));

  // 检查 02 down (ai=1) 帧0 的每行像素，理解凹槽的确切位置
  const fd = frames[`${si}_1_0`];
  console.log('\n=== 02 down f0 pixel map ===');
  for (let y = 9; y <= 16; y++) {
    let row = `y=${y}: `;
    for (let x = 0; x < 32; x++) {
      const idx = (y * 32 + x) * 4;
      const a = fd.data[idx + 3];
      if (a === 0) row += '.';
      else {
        const r = fd.data[idx];
        if (r < 140) row += '#';
        else row += 'O';
      }
    }
    console.log(row);
  }
})().catch(console.error);
