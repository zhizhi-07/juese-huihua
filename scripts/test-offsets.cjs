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

async function testOffsets() {
  const exporter = new PE.ExportManager();
  const text = fs.readFileSync('data/shared-project.json', 'utf8');
  const { project } = await exporter.importProject(new File([text], 'shared.json'));

  // Keep face/eyes visible, hide old hair
  for (const l of project.layers) {
    if (l.sheetIndex === 8 && /^(头发|发饰) \//.test(l.name)) l.visible = false;
  }
  const cm = new PE.CanvasManager(document.createElement('canvas'), project);
  const baseImg = cm.getCompositeImageData(8, 1, 0);

  const RAW_MATRIX = [
    /* y= 0 */ ". . . . . . O . . . . . . . . . . O . . . . . .",
    /* y= 1 */ ". . . O O O . . O O O O O O O O . . O O O . . .",
    /* y= 2 */ ". . O W W B O O B B B B B B B B O O B W W O . .",
    /* y= 3 */ ". O W W B O B B B S S S S S S B B B O B W W O .",
    /* y= 4 */ ". O W B W O B S S B B S S B B S S B O W B W O .",
    /* y= 5 */ ". O B W B W O B B B S B B S B B B O W B W B O .",
    /* y= 6 */ ". O O O W O B B B B B B B B B B B B O W O O O .",
    /* y= 7 */ "O w O B O B B B B S H B H H S B B B B O B O w O",
    /* y= 8 */ "O w w B S B B B B S B B B B S B B B B S B w w O",
    /* y= 9 */ "O w O O B B B B B S B B B B S B B B B B O O w O",
    /* y=10 */ "w O w O B B B B B S B B B B S B B B B B O w O w",
    /* y=11 */ "W O w O B B B S S . S S S S . S S B B B O w O W",
    /* y=12 */ "W O B O B B O . . . . . . . . . . O B B O B O W",
    /* y=13 */ "W O B O B B O . . . . . . . . . . O B B O B O W",
    /* y=14 */ "W O B B O B O . . . . . . . . . . O B O B B O W",
    /* y=15 */ "W O B B W O B O O O O O O O O O O B O W B B O W",
    /* y=16 */ "W W B B W W O O . . . . . . . . O O W W B B W W",
  ];

  const P = {
    O: '#18181a',
    B: '#46454d',
    S: '#34333b',
    H: '#6a6875',
    W: '#ffffff',
    w: '#dedee4',
    d: '#b8b8c2',
  };

  const previewCanvas = createCanvas(512, 128);
  const pctx = previewCanvas.getContext('2d');
  pctx.imageSmoothingEnabled = false;

  for (let idx = 0; idx < 2; idx++) {
    const yOff = idx; // 0 and 1
    const xOff = 5;

    const c = createCanvas(32, 32);
    const ctx = c.getContext('2d');
    ctx.putImageData(baseImg, 0, 0);

    for (let r = 0; r < RAW_MATRIX.length; r++) {
      const tokens = RAW_MATRIX[r].split(' ');
      const y = r + yOff;
      if (y < 0 || y >= 32) continue;
      for (let col = 0; col < tokens.length; col++) {
        const token = tokens[col];
        if (token === '.') continue;
        const color = P[token];
        const x = col + xOff;
        if (color && x >= 0 && x < 32) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    pctx.fillStyle = (idx === 0) ? '#eceee4' : '#eeeede';
    pctx.fillRect(idx * 256, 0, 256, 128);
    pctx.drawImage(c, idx * 256, 0, 128, 128);

    // Also draw magnified 8x
    const c8 = createCanvas(256, 256);
    const ctx8 = c8.getContext('2d');
    ctx8.imageSmoothingEnabled = false;
    ctx8.drawImage(c, 0, 0, 256, 256);
    fs.writeFileSync(`自检记录/炭黑双丸子发型-20261027/test-offset-y${yOff}.png`, c8.toBuffer('image/png'));
  }

  console.log('Test offset comparison rendered.');
}

testOffsets().catch(console.error);
