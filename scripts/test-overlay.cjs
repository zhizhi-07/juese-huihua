const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

global.window = global; global.Image = Image; global.ImageData = ImageData;
global.document = { createElement() { const c = createCanvas(1,1); c.style={}; return c; }, body: { appendChild(){} } };
global.File = class extends Blob { constructor(b,n){super(b);this.name=n;} };
global.FileReader = class { async readAsText(f){this.result=await f.text();this.onload();} };

for (const name of ['core','history','canvas','tools','spritesheet','export','animation']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', name + '.js'), 'utf8'));
}

async function testOverlay() {
  const exporter = new PE.ExportManager();
  const text = fs.readFileSync('data/shared-project.json', 'utf8');
  const { project } = await exporter.importProject(new File([text], 'shared.json'));

  // Hide existing hair/accessories in sheet 8
  for (const l of project.layers) {
    if (l.sheetIndex === 8 && /^(头发|发饰) \//.test(l.name)) l.visible = false;
  }

  const cm = new PE.CanvasManager(document.createElement('canvas'), project);
  // Get composite image of down (ai=1, fi=0)
  const bodyBase = cm.getCompositeImageData(8, 1, 0);

  // Read reference image matrix from analyze-reference.cjs
  const { decode } = require('./png.cjs');
  const refImg = decode(fs.readFileSync('C:/Users/Administrator/.gemini/antigravity/brain/59af9401-00f1-46a5-9ede-114221b8c142/.user_uploaded/media_1793065934197_6cffd150.png'));

  const W = 24, H = 17;
  const grid = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const px = Math.round(197 + (x + 0.5) * 25.17);
      const py = Math.round(298 + (y + 0.5) * 25.17);
      const idx = (py * 1024 + px) * 4;
      row.push([refImg.data[idx], refImg.data[idx+1], refImg.data[idx+2]]);
    }
    grid.push(row);
  }

  // Create composite canvas 32x32
  const c = createCanvas(32, 32);
  const cx = c.getContext('2d');
  cx.putImageData(bodyBase, 0, 0);

  // Overlay reference hair onto canvas:
  // xOffset = 5 (since 5 + 23 = 28, center is (5+28)/2 = 16.5)
  // yOffset = 0 (Row 0 is y=0, Row 1 is y=1)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = grid[y][x];
      // Only draw hair, outline and accessory, not the skin or eyes
      const isSkinOrEye = (y >= 11 && x >= 7 && x <= 16);
      const isWhiteBg = (r > 240 && g > 240 && b > 240 && (y <= 2 || (x <= 1 || x >= 22)));
      if (isSkinOrEye || isWhiteBg) continue;

      const targetX = x + 5;
      const targetY = y + 0;
      if (targetX >= 0 && targetX < 32 && targetY >= 0 && targetY < 32) {
        cx.fillStyle = `rgb(${r},${g},${b})`;
        cx.fillRect(targetX, targetY, 1, 1);
      }
    }
  }

  const outDir = path.join(__dirname, '..', '自检记录/黑发双丸子测试');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'test-overlay.png'), c.toBuffer('image/png'));
  console.log('Saved test overlay to:', path.join(outDir, 'test-overlay.png'));
}
testOverlay().catch(console.error);
