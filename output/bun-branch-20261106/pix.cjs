const fs = require('fs');
const path = require('path');
const { decode } = require('../../scripts/png.cjs');

const decodeURL = url => decode(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));

/* Expand a layer frame to full frame size, honoring optional `placement`. */
function frameMap(layer, key, frameW, frameH) {
  const fd = layer && layer.frameData && layer.frameData[key];
  if (!fd) return null;
  const im = decodeURL(fd.dataURL);
  const px = fd.placement || null;
  const fx = px ? px.x : 0, fy = px ? px.y : 0;
  const w = Math.max(frameW, fx + im.width), h = Math.max(frameH, fy + im.height);
  const map = new Map();
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const i = (y * im.width + x) * 4;
    if (!im.data[i + 3]) continue;
    map.set((fy + y) * w + (fx + x), '#' + Buffer.from(im.data.slice(i, i + 3)).toString('hex').toUpperCase());
  }
  return { w, h, map };
}

function boundsOf(map, w) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const key of map.keys()) {
    const x = key % w, y = Math.floor(key / w);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function loadProject(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
}

function childLayer(project, si, dir, name) {
  const gi = project.layers.findIndex(l => l.isGroup && l.sheetIndex === si && l.name === dir);
  if (gi < 0) return null;
  return project.layers.find(l => !l.isGroup && l.parent === gi && l.name === name) || null;
}

module.exports = { decodeURL, frameMap, boundsOf, loadProject, childLayer };
