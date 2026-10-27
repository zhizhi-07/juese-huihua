const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const png = require('./png.cjs');
const { createCanvas, ImageData } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '自检记录/主工程坐姿素体幅度-20261027');
const url = 'http://127.0.0.1:8765/api/project?id=main';

function decode(frame) {
  return png.decode(Buffer.from(frame.dataURL.split(',')[1], 'base64'));
}

function bounds(image) {
  const xs = [], ys = [];
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    if (image.data[(y * image.width + x) * 4 + 3]) { xs.push(x); ys.push(y); }
  }
  assert(xs.length, 'body frame is empty');
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), xs.length];
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const response = await fetch(url);
  assert(response.ok);
  const raw = await response.text();
  const project = JSON.parse(raw);
  fs.writeFileSync(path.join(out, 'before.json'), raw);
  fs.writeFileSync(path.join(out, 'etag.txt'), response.headers.get('etag'));
  const idle = project.spriteSheets.findIndex(sheet => sheet.name === 'original32_idle');
  const sit = project.spriteSheets.findIndex(sheet => sheet.name === 'original32_sit');
  assert(idle >= 0 && sit >= 0);
  const canvas = createCanvas(8 * 192, 3 * 192);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  const report = [];
  for (let action = 0; action < 3; action++) {
    const sitBody = project.layers.find(layer => layer.sheetIndex === sit && layer.name === 'body' && layer.parent === project.layers.findIndex(group => group.sheetIndex === sit && group.name === project.spriteSheets[sit].actions[action].direction));
    const idleBody = project.layers.find(layer => layer.sheetIndex === idle && layer.name === 'body' && layer.parent === project.layers.findIndex(group => group.sheetIndex === idle && group.name === project.spriteSheets[idle].actions[action].direction));
    assert(sitBody && idleBody, `missing body layer for action ${action}`);
    for (const [column, [sheet, layer, label]] of [[idle, idleBody, 'idle'], [sit, sitBody, 'sit']].entries()) {
      for (let frame = 0; frame < 4; frame++) {
        const image = decode(layer.frameData[`${sheet}_${action}_${frame}`]);
        report.push({ label, action, frame, bounds: bounds(image) });
        const tile = createCanvas(32, 32);
        tile.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(image.data), 32, 32), 0, 0);
        const x = (column * 4 + frame) * 192;
        context.fillStyle = column ? '#ddd5ed' : '#c8d8d1';
        context.fillRect(x, action * 192, 192, 192);
        context.drawImage(tile, x, action * 192, 192, 192);
      }
    }
  }
  fs.writeFileSync(path.join(out, 'body-comparison.png'), canvas.toBuffer('image/png'));
  fs.writeFileSync(path.join(out, 'bounds.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ idle, sit, report }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
