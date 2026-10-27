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
  const ai = 1; // down

  // 隐藏旧发型
  project.layers.forEach(l => {
    if (l.sheetIndex === si && (l.name.includes('发') || l.name.includes('饰'))) {
      l.visible = false;
    }
  });

  const anim = require('./hair-animation.cjs');
  const frontFrames = anim.generateFrontHairFrames();
  const rearFrames  = anim.generateRearLongHairFrames();
  const headbandFrames = anim.generateHeadbandFrames();

  const lRear = new PE.Layer('头发 / 03 浅绿披发 / 后发');
  lRear.sheetIndex = si;
  lRear.visible = true;

  const lFront = new PE.Layer('头发 / 03 碎齐刘海 / 前发');
  lFront.sheetIndex = si;
  lFront.visible = true;

  const lHeadband = new PE.Layer('发饰 / 03 紫色发箍');
  lHeadband.sheetIndex = si;
  lHeadband.visible = false;

  for (let fi = 0; fi < 4; fi++) {
    const key = `${si}_${ai}_${fi}`;
    lRear.frameData.set(key, rearFrames[fi]);
    lFront.frameData.set(key, frontFrames[fi]);
    lHeadband.frameData.set(key, headbandFrames[fi]);
  }

  project.layers.unshift(lRear);
  project.layers.push(lFront, lHeadband);

  const cm = new PE.CanvasManager(document.createElement('canvas'), project);

  const scale = 5;
  const tileW = 32 * scale;
  const tileH = 32 * scale;
  const outCanvas = createCanvas((tileW + 15) * 4 + 20, tileH + 50);
  const ctx = outCanvas.getContext('2d');
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  ctx.imageSmoothingEnabled = false;

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#0f172a';

  for (let fi = 0; fi < 4; fi++) {
    const imgData = cm.getCompositeImageData(si, ai, fi);
    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(imgData, 0, 0);

    const x = fi * (tileW + 15) + 15;
    const y = 30;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, tileW, tileH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(x, y, tileW, tileH);

    ctx.drawImage(tile, x, y, tileW, tileH);
    ctx.fillText(`待机 帧 ${fi}`, x, y - 10);
  }

  const outPath = 'test/output/idle_animation_strip.png';
  fs.writeFileSync(outPath, outCanvas.toBuffer('image/png'));
  console.log('Saved', outPath);
})().catch(console.error);
