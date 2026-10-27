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
  // 找 03 前发（新灰色版本）
  const front03 = project.layers.find(l => l.sheetIndex === si && l.name.includes('03') && l.name.includes('前发'));
  // 找 02 前发（原灰色版本）
  const front02 = project.layers.find(l => l.sheetIndex === si && l.name === '头发 / 02 齐刘海 / 前发');

  console.log('front03:', front03 ? front03.name : 'null');
  console.log('front02:', front02 ? front02.name : 'null');

  // 打印 02 正面第0帧
  const d02 = front02.getFrameData(`${si}_1_0`);
  console.log('\n=== ORIGINAL 02 front hair down frame 0 ASCII ===');
  for (let y = 0; y < 32; y++) {
    let row = '';
    for (let x = 0; x < 32; x++) {
      const idx = (y * 32 + x) * 4;
      const a = d02.data[idx + 3];
      if (a === 0) row += '  ';
      else {
        const r = d02.data[idx];
        if (r < 140) row += '##';
        else if (r < 200) row += '..';
        else row += 'OO';
      }
    }
    if (row.trim()) console.log(`${String(y).padStart(2,'0')}: ${row}`);
  }

  // 打印 03 正面第0帧
  const d03 = front03.getFrameData(`${si}_1_0`);
  console.log('\n=== NEW 03 front hair down frame 0 ASCII ===');
  for (let y = 0; y < 32; y++) {
    let row = '';
    for (let x = 0; x < 32; x++) {
      const idx = (y * 32 + x) * 4;
      const a = d03.data[idx + 3];
      if (a === 0) row += '  ';
      else {
        const r = d03.data[idx];
        if (r < 140) row += '##';
        else if (r < 200) row += '..';
        else row += 'OO';
      }
    }
    if (row.trim()) console.log(`${String(y).padStart(2,'0')}: ${row}`);
  }
})().catch(console.error);
