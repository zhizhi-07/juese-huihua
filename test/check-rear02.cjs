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
  // 列出所有 02 相关图层
  const layers02 = project.layers.filter(l => l.sheetIndex === si && l.name.includes('02'));
  console.log('02 layers:');
  layers02.forEach(l => console.log(' ', l.name, '- visible:', l.visible));

  // 找后发
  const rear02 = project.layers.find(l => l.sheetIndex === si && l.name.includes('02') && l.name.includes('后发'));
  if (!rear02) { console.log('No rear 02 layer'); return; }
  console.log('\nFound rear02:', rear02.name);

  // 查看它有哪些 frameData
  console.log('frameData keys:', Object.keys(rear02.frameData || {}));

  // 打印 up (ai=2) fi=0 的 ASCII
  const upFrame = rear02.getFrameData(`${si}_2_0`);
  if (upFrame) {
    console.log('\n=== 02 后发 up fi=0 ASCII ===');
    for (let y = 0; y < 32; y++) {
      let row = '';
      for (let x = 0; x < 32; x++) {
        const idx = (y * 32 + x) * 4;
        const a = upFrame.data[idx + 3];
        if (a === 0) row += '  ';
        else if (upFrame.data[idx] < 140) row += '##';
        else row += 'OO';
      }
      if (row.trim()) console.log(`${String(y).padStart(2,'0')}: ${row}`);
    }
  } else {
    console.log('No up frame for rear02');
  }

  // 同时看 down (ai=1) 有没有
  const downFrame = rear02.getFrameData(`${si}_1_0`);
  console.log('\nHas down frame:', !!downFrame);

  // 存图
  function saveImg(imgData, filename, scale=6) {
    const c = createCanvas(imgData.width, imgData.height);
    c.getContext('2d').putImageData(imgData, 0, 0);
    const big = createCanvas(imgData.width*scale, imgData.height*scale);
    const bctx = big.getContext('2d');
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(c, 0, 0, imgData.width*scale, imgData.height*scale);
    fs.writeFileSync(filename, big.toBuffer('image/png'));
    console.log('Saved', filename);
  }
  if (upFrame) saveImg(upFrame, 'test/output/rear02_up_f0.png');
})().catch(console.error);
