const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

global.window = global; global.ImageData = ImageData; global.Image = Image;
global.document = { createElement() { const c = createCanvas(1, 1); c.style = {}; return c; }, body: { appendChild() {} } };
global.File = class extends Blob { constructor(b, n) { super(b); this.name = n; } };
global.FileReader = class { async readAsText(f) { this.result = await f.text(); this.onload(); } };

for (const n of ['core', 'history', 'canvas', 'tools', 'spritesheet', 'export', 'animation']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'));
}

async function renderFacePreview() {
  const branchRes = await fetch('http://127.0.0.1:8765/api/project?id=character-black-buns-idle-20261027');
  const mainRes = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const branchData = await branchRes.json();
  const mainData = await mainRes.json();

  const exporter = new PE.ExportManager();
  const { project } = await exporter.importProject(new File([JSON.stringify(branchData)], 'branch.json'));

  // Copy eyes and mouth for sheet 8 from main project to branch project for preview display
  const mainExporter = new PE.ExportManager();
  const { project: mainProj } = await mainExporter.importProject(new File([JSON.stringify(mainData)], 'main.json'));

  const faceLayers = mainProj.layers.filter(l => l.sheetIndex === 8 && /眼睛|嘴巴/.test(l.name) && l.visible);
  for (const fl of faceLayers) {
    project.layers.push(fl);
  }

  const cm = new PE.CanvasManager(document.createElement('canvas'), project);

  const preview = createCanvas(512, 384);
  const pctx = preview.getContext('2d');
  pctx.imageSmoothingEnabled = false;

  for (let ai = 0; ai < 3; ai++) {
    for (let fi = 0; fi < 4; fi++) {
      const im = cm.getCompositeImageData(8, ai, fi);
      const tile = createCanvas(32, 32);
      tile.getContext('2d').putImageData(im, 0, 0);

      pctx.fillStyle = (ai === 1) ? '#eceee4' : '#45434b';
      pctx.fillRect(fi * 128, ai * 128, 128, 128);
      pctx.drawImage(tile, fi * 128, ai * 128, 128, 128);
    }
  }

  const outPath = path.join(__dirname, '..', '自检记录/炭黑双丸子发型-20261027/preview-with-face.png');
  fs.writeFileSync(outPath, preview.toBuffer('image/png'));
  console.log('Saved preview with face to:', outPath);
}

renderFacePreview().catch(console.error);
