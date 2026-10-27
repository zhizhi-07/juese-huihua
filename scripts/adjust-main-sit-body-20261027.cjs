const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const png = require('./png.cjs');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '自检记录/主工程坐姿整体跟随-20261027');
const url = 'http://127.0.0.1:8765/api/project?id=main';
global.window = global;
global.Image = Image;
global.ImageData = ImageData;
global.document = { createElement() { const canvas = createCanvas(1, 1); canvas.style = {}; return canvas; }, body: { appendChild() {} } };
global.File = class extends Blob { constructor(bits, name) { super(bits); this.name = name; } };
global.FileReader = class { async readAsText(file) { this.result = await file.text(); this.onload(); } };
for (const name of ['core', 'history', 'canvas', 'tools', 'spritesheet', 'export', 'animation']) vm.runInThisContext(fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8'));

function shifted(frame, cutoff) {
  const image = png.decode(Buffer.from(frame.dataURL.split(',')[1], 'base64'));
  const data = new Uint8Array(image.data.length);
  for (let y = 0; y < image.height; y++) {
    const sourceY = y < cutoff ? y - 2 : y;
    if (sourceY >= 0) data.set(image.data.subarray(sourceY * image.width * 4, (sourceY + 1) * image.width * 4), y * image.width * 4);
  }
  return { ...structuredClone(frame), dataURL: `data:image/png;base64,${png.encode(image.width, image.height, data).toString('base64')}` };
}

async function render(projectData, name, sheetIndex, background = '#ddd5ed') {
  const exporter = new PE.ExportManager();
  const { project } = await exporter.importProject(new File([JSON.stringify(projectData)], 'project.json'));
  const manager = new PE.CanvasManager(document.createElement('canvas'), project);
  const canvas = createCanvas(4 * 256, 3 * 256);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  const animationFrames = Array.from({ length: 4 }, () => createCanvas(256, 768));
  for (let action = 0; action < 3; action++) for (let frame = 0; frame < 4; frame++) {
    const image = manager.getCompositeImageData(sheetIndex, action, frame);
    assert(image.data.some((value, index) => index % 4 === 3 && value), 'composite is empty');
    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(image, 0, 0);
    context.fillStyle = background;
    context.fillRect(frame * 256, action * 256, 256, 256);
    context.drawImage(tile, frame * 256, action * 256, 256, 256);
    const animationContext = animationFrames[frame].getContext('2d');
    animationContext.imageSmoothingEnabled = false;
    animationContext.fillStyle = background;
    animationContext.fillRect(0, action * 256, 256, 256);
    animationContext.drawImage(tile, 0, action * 256, 256, 256);
  }
  fs.writeFileSync(path.join(out, `${name}.png`), canvas.toBuffer('image/png'));
  for (let frame = 0; frame < 4; frame++) fs.writeFileSync(path.join(out, `${name}-${frame}.png`), animationFrames[frame].toBuffer('image/png'));
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  if (process.argv.includes('--publish')) {
    const candidate = fs.readFileSync(path.join(out, 'candidate.json'));
    const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': fs.readFileSync(path.join(out, 'etag.txt'), 'utf8') }, body: candidate });
    assert(response.ok, `save failed: ${response.status} ${await response.text()}`);
    assert.deepEqual(await (await fetch(url)).json(), JSON.parse(candidate));
    console.log('Saved main project; API readback exact.');
    return;
  }
  const response = await fetch(url);
  assert(response.ok);
  const raw = await response.text();
  const before = JSON.parse(raw);
  const project = JSON.parse(raw);
  const idle = project.spriteSheets.findIndex(sheet => sheet.name === 'original32_idle');
  const sit = project.spriteSheets.findIndex(sheet => sheet.name === 'original32_sit');
  assert(idle >= 0 && sit >= 0);
  fs.writeFileSync(path.join(out, 'before.json'), raw);
  fs.writeFileSync(path.join(out, 'etag.txt'), response.headers.get('etag'));
  await render(before, 'idle-reference', idle);
  await render(before, 'before-composite', sit);
  const changedLayers = [];
  for (let action = 0; action < 3; action++) {
    const group = project.layers.findIndex(layer => layer.sheetIndex === sit && layer.name === project.spriteSheets[sit].actions[action].direction);
    const bodyIndex = project.layers.findIndex(layer => layer.sheetIndex === sit && layer.name === 'body' && layer.parent === group);
    assert(bodyIndex >= 0, `missing sit body for action ${action}`);
    const layer = project.layers[bodyIndex];
    const first = layer.frameData[`${sit}_${action}_0`];
    assert(first);
    for (const frame of [2, 3]) layer.frameData[`${sit}_${action}_${frame}`] = shifted(first, 26);
    changedLayers.push(bodyIndex);
    const headIndex = project.layers.findIndex(item => item.sheetIndex === sit && item.name === 'head' && item.parent === group);
    assert(headIndex >= 0, `missing sit head for action ${action}`);
    const head = project.layers[headIndex];
    const firstHead = head.frameData[`${sit}_${action}_0`];
    assert(firstHead);
    for (const frame of [2, 3]) head.frameData[`${sit}_${action}_${frame}`] = shifted(firstHead, 24);
    changedLayers.push(headIndex);
  }
  for (let index = 0; index < project.layers.length; index++) {
    const layer = project.layers[index];
    if (layer.sheetIndex !== sit || !layer.visible || !(/^(眼睛|嘴巴|头发|发饰) \/ /.test(layer.name) || /^hand( 2)?$/.test(layer.name))) continue;
    for (let action = 0; action < 3; action++) {
      const first = layer.frameData?.[`${sit}_${action}_0`];
      if (!first) continue;
      const cutoff = /^hand/.test(layer.name) ? 30 : /发/.test(layer.name) ? 28 : 24;
      for (const frame of [2, 3]) if (layer.frameData[`${sit}_${action}_${frame}`]) layer.frameData[`${sit}_${action}_${frame}`] = shifted(first, cutoff);
    }
    changedLayers.push(index);
  }
  for (let index = 0; index < project.layers.length; index++) {
    if (!changedLayers.includes(index)) assert.deepEqual(project.layers[index], before.layers[index], `unexpected layer change ${index}`);
    else {
      assert.deepEqual({ ...project.layers[index], frameData: null }, { ...before.layers[index], frameData: null });
      for (const [key, value] of Object.entries(before.layers[index].frameData)) if (!key.endsWith('_2') && !key.endsWith('_3')) assert.deepEqual(project.layers[index].frameData[key], value);
    }
  }
  assert.deepEqual(project.spriteSheets, before.spriteSheets);
  fs.writeFileSync(path.join(out, 'candidate.json'), JSON.stringify(project));
  await render(project, 'after-composite', sit);
  await render(project, 'after-composite-dark', sit, '#263238');
  console.log({ sit, changedLayers, firstAndSecondFramesPreserved: true, allOtherLayersAndSheetsPreserved: true });
})().catch(error => { console.error(error); process.exitCode = 1; });
