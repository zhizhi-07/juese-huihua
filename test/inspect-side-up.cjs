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
  // 找 02 齐刘海 / 前发 和 02 双马尾 / 后发
  const front02 = project.layers.find(l => l.sheetIndex === si && l.name.includes('02 齐刘海'));
  const rear02  = project.layers.find(l => l.sheetIndex === si && l.name.includes('02 双马尾'));

  console.log('front02 name:', front02 ? front02.name : 'null');
  console.log('rear02 name:', rear02 ? rear02.name : 'null');

  for (let ai = 0; ai < 3; ai++) {
    const actName = project.spriteSheets[si].actions[ai].name;
    const dir = project.spriteSheets[si].actions[ai].direction;
    const key = `${si}_${ai}_0`;
    const fd = front02 ? front02.getFrameData(key) : null;
    const rd = rear02 ? rear02.getFrameData(key) : null;

    let fCount = 0, rCount = 0;
    if (fd) for (let i = 3; i < fd.data.length; i += 4) if (fd.data[i] > 0) fCount++;
    if (rd) for (let i = 3; i < rd.data.length; i += 4) if (rd.data[i] > 0) rCount++;

    console.log(`Action ${ai} (${actName}, dir=${dir}): front02 pixels=${fCount}, rear02 pixels=${rCount}`);
  }

  // 顺便把 side 和 up 的头身位置打印出来
  const headLayers = project.layers.filter(l => l.sheetIndex === si && l.name === 'head');
  console.log('headLayers count:', headLayers.length);
  headLayers.forEach((hl, idx) => {
    console.log(`Head ${idx}: parent=${hl.parent} (${project.layers[hl.parent]?.name})`);
  });
})().catch(console.error);
