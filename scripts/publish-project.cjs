/**
 * Build a layered pixel-editor project from the drawn object and register it
 * through the editor HTTP API as an independent project (never the main one).
 *
 * Usage: node scripts/publish-project.cjs <project-id> <project-name> <base-sheet.png> <layer.png...>
 */
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8765';
const [id, name, sheetFile, ...layerFiles] = process.argv.slice(2);
if (!id || !name || !sheetFile || !layerFiles.length) {
  console.error('usage: node scripts/publish-project.cjs <id> <name> <sheet.png> <layer.png...>');
  process.exit(1);
}

const dataURL = (file) => 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');

// size is taken from the PNG header so the project matches the artwork exactly
function pngSize(file) {
  const buf = fs.readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const size = pngSize(sheetFile);
const layerNames = layerFiles.map(f => path.basename(f, '.png'));

const project = {
  version: '1.0',
  name,
  bgColor: '#b8c8c3',
  currentSheetIndex: 0,
  currentActionIndex: 0,
  currentFrameIndex: 0,
  currentLayerIndex: 0,
  palette: [],
  spriteSheets: [{
    name,
    frameWidth: size.width,
    frameHeight: size.height,
    columns: 1,
    rows: 1,
    imageDataURL: dataURL(sheetFile),
    actions: [{
      name: '静置',
      direction: 'none',
      frames: [{ sheetIndex: 0, sourceX: 0, sourceY: 0, width: size.width, height: size.height, duration: 200 }],
    }],
  }],
  layers: layerFiles.map((file, i) => ({
    name: layerNames[i],
    sheetIndex: 0,
    visible: true,
    locked: false,
    opacity: 1,
    frameData: {
      '0_0_0': { width: size.width, height: size.height, dataURL: dataURL(file) },
    },
  })),
};

(async () => {
  const head = await fetch(`${BASE}/api/project?id=${id}`, { method: 'GET' });
  if (head.status === 404) {
    const res = await fetch(`${BASE}/api/project?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Pixel-Editor': '1',
        'If-Match': 'none',
      },
      body: JSON.stringify(project),
    });
    console.log('create ->', res.status, await res.text());
    return;
  }
  const etag = head.headers.get('ETag');
  const res = await fetch(`${BASE}/api/project?id=${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Pixel-Editor': '1',
      'If-Match': etag,
    },
    body: JSON.stringify(project),
  });
  console.log('update ->', res.status, await res.text());
})();
