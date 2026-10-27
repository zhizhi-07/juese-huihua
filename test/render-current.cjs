const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

global.window = global;
global.ImageData = ImageData;
global.Image = Image;
global.document = {
  createElement(tag) {
    if (tag !== 'canvas') return { click() {}, remove() {} };
    const c = createCanvas(1, 1);
    c.style = {};
    return c;
  },
  body: { appendChild() {} }
};
global.File = class extends Blob {
  constructor(bytes, name) {
    super(bytes);
    this.name = name;
  }
};
global.FileReader = class {
  async readAsText(f) {
    this.result = await f.text();
    this.onload();
  }
};

const root = path.resolve(__dirname, '..');
for (const name of ['core', 'history', 'canvas', 'tools', 'spritesheet', 'export', 'api', 'aseprite', 'builtin-packs']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), { filename: name });
}

(async () => {
  const jsonStr = fs.readFileSync(path.join(root, 'data/shared-project.json'), 'utf8');
  const exporter = new PE.ExportManager();
  const file = new File([jsonStr], 'shared-project.json');
  const res = await exporter.importProject(file);
  const project = res.project;
  const cm = new PE.CanvasManager(document.createElement('canvas'), project);

  const si = 8; // original32_idle
  const sheet = project.spriteSheets[si];
  console.log('Loaded sheet:', sheet.name, 'size:', sheet.frameWidth, sheet.frameHeight);

  // 渲染下/正面的4帧 (action index 1 是 down)
  const preview = createCanvas(32 * 4 * 4, 32 * 4);
  const pctx = preview.getContext('2d');
  pctx.imageSmoothingEnabled = false;

  for (let fi = 0; fi < 4; fi++) {
    const imgData = cm.getCompositeImageData(si, 1, fi);
    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(imgData, 0, 0);
    pctx.drawImage(tile, fi * 32 * 4, 0, 32 * 4, 32 * 4);
  }

  const outDir = path.join(root, 'test/output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'idle_down_frames.png'), preview.toBuffer('image/png'));
  console.log('Saved test/output/idle_down_frames.png');

  // 查看各图层信息
  console.log('\n--- Layers in original32_idle (si=8) ---');
  project.layers.forEach((l, idx) => {
    if (l.sheetIndex === si) {
      const hasF0 = l.hasFrameData ? l.hasFrameData(`${si}_1_0`) : false;
      console.log(`[${idx}] "${l.name}", visible=${l.visible}, hasFrame0=${hasF0}, parent=${l.parent}`);
    }
  });
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
