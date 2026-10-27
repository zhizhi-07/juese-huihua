const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const { decode, encode } = require('./png.cjs');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '自检记录/炭黑双丸子发型-20261027');
fs.mkdirSync(out, { recursive: true });

// Setup browser globals
global.window = global; global.ImageData = ImageData; global.Image = Image;
global.document = { createElement() { const c = createCanvas(1, 1); c.style = {}; return c; }, body: { appendChild() {} } };
global.File = class extends Blob { constructor(b, n) { super(b); this.name = n; } };
global.FileReader = class { async readAsText(f) { this.result = await f.text(); this.onload(); } };

for (const n of ['core', 'history', 'canvas', 'tools', 'spritesheet', 'export', 'animation']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, 'js', n + '.js'), 'utf8'));
}

// 1. Load user's exact saved front pixels from user-current-api.json
const savedApiData = JSON.parse(fs.readFileSync(path.join(out, 'user-current-api.json'), 'utf8'));
const userFrontLayer = savedApiData.layers.find(l => l.name.endsWith('前发'));
const userRearLayer = savedApiData.layers.find(l => l.name.endsWith('后发'));

assert(userFrontLayer && userRearLayer, 'User saved layers must exist in user-current-api.json');

const userFrontImg = decode(Buffer.from(userFrontLayer.frameData['8_1_0'].dataURL.split(',')[1], 'base64'));
const userRearImg = decode(Buffer.from(userRearLayer.frameData['8_1_0'].dataURL.split(',')[1], 'base64'));

console.log('Successfully decoded user front & rear from user-current-api.json');

// Helper to shift an ImageData vertically by dy
function shiftImage(src, dy) {
  const c = createCanvas(32, 32);
  const ctx = c.getContext('2d');
  const temp = createCanvas(32, 32);
  temp.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(src.data), 32, 32), 0, 0);
  ctx.drawImage(temp, 0, dy);
  return ctx.getImageData(0, 0, 32, 32);
}

// 2. Build BACK rear hair:
// User requirement: "背面的话其实就是前面的形状至少盖住后脑勺"
// Take rear buns (userRearImg) + front hair outline (userFrontImg),
// and fill the center face opening so it covers the back of the head completely.
function buildBackRearHair() {
  const c = createCanvas(32, 32);
  const ctx = c.getContext('2d');

  // Draw user's rear buns first
  const rearCanvas = createCanvas(32, 32);
  rearCanvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(userRearImg.data), 32, 32), 0, 0);
  ctx.drawImage(rearCanvas, 0, 0);

  // Draw user's front hair outer shape
  const frontCanvas = createCanvas(32, 32);
  frontCanvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(userFrontImg.data), 32, 32), 0, 0);
  ctx.drawImage(frontCanvas, 0, 0);

  // Now, inside the area where the face was open (y=7..15),
  // fill horizontally between left hair outline and right hair outline with hair base #46454d
  const data = ctx.getImageData(0, 0, 32, 32);
  for (let y = 7; y <= 15; y++) {
    let left = -1, right = -1;
    for (let x = 0; x < 32; x++) {
      if (data.data[(y * 32 + x) * 4 + 3] > 0) {
        if (left === -1) left = x;
        right = x;
      }
    }
    if (left !== -1 && right !== -1) {
      for (let x = left; x <= right; x++) {
        const idx = (y * 32 + x) * 4;
        if (data.data[idx + 3] === 0) {
          // Fill inside with hair base
          data.data[idx] = 70;
          data.data[idx + 1] = 69;
          data.data[idx + 2] = 77;
          data.data[idx + 3] = 255;
        }
      }
    }
  }

  // Draw nape hairline border at y=15
  for (let x = 6; x <= 25; x++) {
    const idx = (15 * 32 + x) * 4;
    data.data[idx] = 24;
    data.data[idx + 1] = 24;
    data.data[idx + 2] = 26;
    data.data[idx + 3] = 255;
  }
  // Clear below y=15 so neck is clean
  for (let y = 16; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const idx = (y * 32 + x) * 4;
      data.data[idx + 3] = 0;
    }
  }

  return data;
}

const backRearImg = buildBackRearHair();

// 3. Build SIDE front and rear hair (3/4 view)
// Side front: front bangs from user shape
// Side rear: buns + backhead
function buildSideHair() {
  const sfCanvas = createCanvas(32, 32);
  const sfCtx = sfCanvas.getContext('2d');
  const srCanvas = createCanvas(32, 32);
  const srCtx = srCanvas.getContext('2d');

  // Side front bangs
  sfCtx.fillStyle = '#18181a';
  sfCtx.fillRect(10, 1, 8, 1);
  sfCtx.fillRect(9, 2, 1, 1);
  sfCtx.fillRect(8, 3, 1, 1);
  sfCtx.fillRect(7, 4, 1, 1);
  sfCtx.fillRect(6, 5, 1, 6);
  sfCtx.fillRect(7, 11, 4, 1);
  sfCtx.fillRect(6, 12, 1, 5);
  sfCtx.fillRect(9, 12, 1, 5);
  sfCtx.fillRect(7, 17, 2, 1);

  sfCtx.fillStyle = '#46454d';
  for (let y = 2; y <= 4; y++) sfCtx.fillRect(9, y, 9, 1);
  for (let y = 5; y <= 10; y++) sfCtx.fillRect(7, y, 7, 1);
  for (let y = 12; y <= 16; y++) sfCtx.fillRect(7, y, 2, 1);

  // Side rear buns & back-head
  srCtx.fillStyle = '#18181a';
  // bun
  srCtx.fillRect(5, 0, 1, 1);
  srCtx.fillRect(4, 1, 3, 1);
  srCtx.fillRect(3, 2, 1, 4);
  srCtx.fillRect(7, 2, 1, 4);
  srCtx.fillRect(4, 6, 3, 1);
  // back head
  srCtx.fillRect(11, 1, 9, 1);
  for (let y = 2; y <= 14; y++) srCtx.fillRect(24, y, 1, 1);
  srCtx.fillRect(11, 14, 13, 1);

  srCtx.fillStyle = '#46454d';
  for (let y = 2; y <= 5; y++) srCtx.fillRect(4, y, 3, 1);
  for (let y = 2; y <= 13; y++) srCtx.fillRect(11, y, 13, 1);

  return {
    front: sfCtx.getImageData(0, 0, 32, 32),
    rear: srCtx.getImageData(0, 0, 32, 32)
  };
}

const sideHair = buildSideHair();

async function run() {
  const branchId = 'character-black-buns-idle-20261027';
  console.log('Fetching latest project from server:', branchId);
  const getRes = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`);
  assert(getRes.ok);
  const etag = getRes.headers.get('etag');
  const projectData = await getRes.json();

  const exporter = new PE.ExportManager();
  const { project } = await exporter.importProject(new File([JSON.stringify(projectData)], 'branch.json'));

  const frontLayer = project.layers.find(l => l.sheetIndex === 8 && l.name.endsWith('前发'));
  const rearLayer = project.layers.find(l => l.sheetIndex === 8 && l.name.endsWith('后发'));
  const accLayer = project.layers.find(l => l.sheetIndex === 8 && l.name.includes('发饰'));

  assert(frontLayer && rearLayer);

  // Populate all frames:
  // Down (ai=1, 正面):
  // fi=0: EXACT USER PIXELS
  // fi=1: EXACT USER PIXELS
  // fi=2,3: USER PIXELS shifted by dy=2 for breath
  for (let fi = 0; fi < 4; fi++) {
    const dy = (fi >= 2) ? 2 : 0;
    frontLayer.frameData.set(`8_1_${fi}`, shiftImage(userFrontImg, dy));
    rearLayer.frameData.set(`8_1_${fi}`, shiftImage(userRearImg, dy));
  }

  // Up (ai=2, 背面):
  // Front hair: completely transparent
  // Rear hair: backRearImg shifted by dy
  for (let fi = 0; fi < 4; fi++) {
    const dy = (fi >= 2) ? 2 : 0;
    frontLayer.frameData.set(`8_2_${fi}`, createCanvas(32, 32).getContext('2d').getImageData(0, 0, 32, 32));
    rearLayer.frameData.set(`8_2_${fi}`, shiftImage(backRearImg, dy));
  }

  // Side (ai=0, 侧面):
  for (let fi = 0; fi < 4; fi++) {
    const dy = (fi >= 2) ? 2 : 0;
    frontLayer.frameData.set(`8_0_${fi}`, shiftImage(sideHair.front, dy));
    rearLayer.frameData.set(`8_0_${fi}`, shiftImage(sideHair.rear, dy));
  }

  // Clear & hide accessory layer
  if (accLayer) {
    accLayer.visible = false;
    for (let ai = 0; ai < 3; ai++) {
      for (let fi = 0; fi < 4; fi++) {
        accLayer.frameData.set(`8_${ai}_${fi}`, createCanvas(32, 32).getContext('2d').getImageData(0, 0, 32, 32));
      }
    }
  }

  frontLayer.visible = true;
  rearLayer.visible = true;

  const cm = new PE.CanvasManager(document.createElement('canvas'), project);
  exporter.project = project;
  exporter.canvasManager = cm;

  // Render 8x magnified check for Front & Back
  for (const [ai, name] of [[1, 'front'], [2, 'back'], [0, 'side']]) {
    const im = cm.getCompositeImageData(8, ai, 0);
    const c8 = createCanvas(256, 256);
    const ctx8 = c8.getContext('2d');
    ctx8.imageSmoothingEnabled = false;

    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(im, 0, 0);
    ctx8.drawImage(tile, 0, 0, 256, 256);

    fs.writeFileSync(path.join(out, `copied-${name}-8x.png`), c8.toBuffer('image/png'));
  }

  // Render full preview sheet
  const sheet = createCanvas(4 * 128, 3 * 128);
  const sctx = sheet.getContext('2d');
  sctx.imageSmoothingEnabled = false;

  for (let ai = 0; ai < 3; ai++) {
    for (let fi = 0; fi < 4; fi++) {
      const im = cm.getCompositeImageData(8, ai, fi);
      const tile = createCanvas(32, 32);
      tile.getContext('2d').putImageData(im, 0, 0);

      sctx.fillStyle = (ai === 1) ? '#eceee4' : '#45434b';
      sctx.fillRect(fi * 128, ai * 128, 128, 128);
      sctx.drawImage(tile, fi * 128, ai * 128, 128, 128);
    }
  }
  fs.writeFileSync(path.join(out, 'copied-preview-all.png'), sheet.toBuffer('image/png'));

  const candidate = JSON.parse(await exporter.exportProject(false).text());

  // Save to API
  console.log('Saving project directly with latest ETag:', etag);
  const saveRes = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Pixel-Editor': '1',
      'If-Match': etag
    },
    body: JSON.stringify(candidate)
  });
  assert(saveRes.ok, `Save failed: ${saveRes.status} ${await saveRes.text()}`);

  console.log('Project successfully updated using user exact saved pixels!');
}

run().catch(console.error);
