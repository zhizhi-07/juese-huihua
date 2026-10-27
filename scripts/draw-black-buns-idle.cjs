const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '自检记录/炭黑双丸子发型-20261027');
fs.mkdirSync(out, { recursive: true });

// Setup browser globals for PE engine
global.window = global;
global.ImageData = ImageData;
global.Image = Image;
global.document = {
  createElement() { const c = createCanvas(1, 1); c.style = {}; return c; },
  body: { appendChild() {} }
};
global.File = class extends Blob { constructor(parts, name) { super(parts); this.name = name; } };
global.FileReader = class { async readAsText(f) { this.result = await f.text(); this.onload(); } };

for (const n of ['core', 'history', 'canvas', 'tools', 'spritesheet', 'export', 'animation']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, 'js', n + '.js'), 'utf8'));
}

const P = {
  O: '#18181a', // 描边深黑
  B: '#46454d', // 头发底色炭黑灰
  S: '#34333b', // 头发阴影
  H: '#6a6875', // 刘海高光亮面
  W: '#ffffff', // 饰品纯白
  w: '#dedee4', // 饰品浅灰阴影
  d: '#b8b8c2', // 饰品深灰阴影
};

const { drawFrame } = require('./tune-black-buns.cjs');

async function run() {
  console.log('Fetching main project from 127.0.0.1:8765...');
  const res = await fetch('http://127.0.0.1:8765/api/project?id=main');
  assert(res.ok, 'Failed to fetch main project: ' + res.status);
  const text = await res.text();
  const sourceEtag = res.headers.get('etag');

  fs.writeFileSync(path.join(out, 'main-source.json'), text);
  fs.writeFileSync(path.join(out, 'main-etag.txt'), sourceEtag || '');

  const exporter = new PE.ExportManager();
  const { project } = await exporter.importProject(new File([text], 'main.json'));

  // Filter project layers according to outfit branch specifications:
  // Keep body, head, hand, vfx, 坐姿 / 手部, groups. Clean other old hairstyles/clothes.
  const keep = l => l.isGroup || /^(head|body|hand(?: 2)?|vfx)$/.test(l.name) || l.name === '坐姿 / 手部';
  const mapping = new Map();
  project.layers.forEach((l, i) => {
    if (keep(l)) mapping.set(i, mapping.size);
  });
  project.layers = project.layers.filter(keep);
  for (const [oldIdx, newIdx] of mapping) {
    const l = project.layers[newIdx];
    if (l.parent != null && mapping.has(l.parent)) {
      l.parent = mapping.get(l.parent);
    }
  }

  // Create the 3 new hair layers for sheetIndex = 8 (original32_idle)
  const rear = new PE.Layer('头发 / 05 炭黑包包双丸子 / 后发');
  const front = new PE.Layer('头发 / 05 炭黑齐刘海 / 前发');
  const acc = new PE.Layer('发饰 / 05 白布包发与垂带');

  for (const l of [rear, front, acc]) {
    l.sheetIndex = 8;
    l.parent = null;
    l.depth = 0;
    l.visible = true;
  }

  // Populate frameData for the 3 actions (side:0, down:1, up:2) and 4 frames (fi=0..3)
  for (let ai = 0; ai < 3; ai++) {
    for (let fi = 0; fi < 4; fi++) {
      rear.frameData.set(`8_${ai}_${fi}`, drawFrame(ai, fi, 'rear'));
      front.frameData.set(`8_${ai}_${fi}`, drawFrame(ai, fi, 'front'));
      acc.frameData.set(`8_${ai}_${fi}`, drawFrame(ai, fi, 'acc'));
    }
  }

  // Layer ordering: rear at the bottom (behind head/body in front view), front & acc at top
  for (const l of project.layers) {
    if (l.parent != null) l.parent++;
  }
  project.layers.unshift(rear);
  project.layers.push(front, acc);

  // Set project metadata
  project.name = '炭黑双丸子·白发罩·待机分支';
  project.currentSheetIndex = 8;
  project.currentActionIndex = 1; // down (正面)
  project.currentFrameIndex = 0;
  project.currentLayerIndex = project.layers.indexOf(front);

  exporter.project = project;
  const cm = new PE.CanvasManager(document.createElement('canvas'), project);
  exporter.canvasManager = cm;

  // Assertions:
  // 1. Back view front hair must be completely transparent
  for (let fi = 0; fi < 4; fi++) {
    const backFrontData = front.frameData.get(`8_2_${fi}`);
    assert(!backFrontData.data.some(v => v !== 0), `Back front hair frame ${fi} must be transparent`);
  }

  // Render preview grid (3 actions x 4 frames)
  const sheetCanvas = createCanvas(4 * 128, 3 * 128);
  const sc = sheetCanvas.getContext('2d');
  sc.imageSmoothingEnabled = false;

  for (let ai = 0; ai < 3; ai++) {
    for (let fi = 0; fi < 4; fi++) {
      const im = cm.getCompositeImageData(8, ai, fi);
      assert(im.data.some(v => v > 0), `Action ${ai} frame ${fi} composite must not be empty`);

      project.currentActionIndex = ai;
      project.currentFrameIndex = fi;
      cm.render();
      assert.deepEqual(cm.offscreenCtx.getImageData(0, 0, 32, 32).data, im.data, 'Canvas render must match getCompositeImageData');

      const pngBlob = await exporter.exportFrameAsBlob(8, ai, fi);
      const decodedPng = require('./png.cjs').decode(Buffer.from(await pngBlob.arrayBuffer()));
      assert.deepEqual(Array.from(decodedPng.data), Array.from(im.data), 'PNG export must match composite data');

      const player = Object.create(PE.AnimationPlayer.prototype);
      Object.assign(player, {
        canvas: createCanvas(32, 32),
        project,
        canvasManager: cm,
        sheetIndex: 8,
        actionIndex: ai,
        currentFrame: fi,
        previewScale: 1
      });
      player.ctx = player.canvas.getContext('2d');
      player._renderPreviewFrame();
      assert.deepEqual(player.ctx.getImageData(0, 0, 32, 32).data, im.data, 'AnimationPlayer preview must match composite data');

      const tile = createCanvas(32, 32);
      tile.getContext('2d').putImageData(im, 0, 0);

      // Background alternating light / dark check
      sc.fillStyle = (ai === 1) ? '#eceee4' : '#45434b';
      sc.fillRect(fi * 128, ai * 128, 128, 128);
      sc.drawImage(tile, fi * 128, ai * 128, 128, 128);

      fs.writeFileSync(path.join(out, `idle-${ai}-${fi}.png`), tile.toBuffer('image/png'));
    }
  }
  fs.writeFileSync(path.join(out, 'preview.png'), sheetCanvas.toBuffer('image/png'));

  // Variants test:
  // 0: full hair + acc (light bg)
  // 1: with clothes (if any) or dark bg
  // 2: no accessory (pure black buns)
  // 3: front hair only (no rear, no acc)
  const variants = createCanvas(512, 128);
  const vc = variants.getContext('2d');
  vc.imageSmoothingEnabled = false;

  for (let v = 0; v < 4; v++) {
    rear.visible = (v !== 3);
    acc.visible = (v === 0 || v === 1);
    front.visible = true;

    const im = cm.getCompositeImageData(8, 1, 0);
    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(im, 0, 0);

    vc.fillStyle = (v === 1) ? '#33333d' : '#eeeede';
    vc.fillRect(v * 128, 0, 128, 128);
    vc.drawImage(tile, v * 128, 0, 128, 128);
  }
  fs.writeFileSync(path.join(out, 'variants.png'), variants.toBuffer('image/png'));

  // Export candidate project JSON
  rear.visible = true;
  front.visible = true;
  acc.visible = true;
  const candidate = JSON.parse(await exporter.exportProject(false).text());
  fs.writeFileSync(path.join(out, 'candidate.json'), JSON.stringify(candidate, null, 2));

  console.log('All 12 idle frames and variants successfully verified and rendered to:', out);

  // If publish flag is present, PUT to server
  if (process.argv.includes('--publish')) {
    const branchId = 'character-black-buns-idle-20261027';
    console.log(`Publishing new branch: ${branchId}...`);

    // Check if branch exists
    const checkRes = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`);
    let ifMatch = 'none';
    if (checkRes.ok) {
      ifMatch = checkRes.headers.get('etag');
    }

    const saveRes = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Pixel-Editor': '1',
        'If-Match': ifMatch
      },
      body: JSON.stringify(candidate)
    });
    assert(saveRes.ok, `Save failed with status ${saveRes.status}: ${await saveRes.text()}`);

    // If initial creation created character-base, do a second PUT with full candidate
    const postRes = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`);
    assert(postRes.ok);
    const postData = await postRes.json();
    if (postData.layers.length !== candidate.layers.length) {
      const secondEtag = postRes.headers.get('etag');
      const secondSave = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Pixel-Editor': '1',
          'If-Match': secondEtag
        },
        body: JSON.stringify(candidate)
      });
      assert(secondSave.ok, `Second save failed: ${secondSave.status}`);
    }

    // Verify by reading back from API
    const verifyRes = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`);
    assert(verifyRes.ok, 'Verify GET failed: ' + verifyRes.status);
    const verifiedData = await verifyRes.json();
    assert.equal(verifiedData.name, candidate.name);
    assert.equal(verifiedData.layers.length, candidate.layers.length);
    console.log('Branch successfully published and verified via API:', branchId);
  }
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
