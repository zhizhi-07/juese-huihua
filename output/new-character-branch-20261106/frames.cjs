const fs = require('fs');
const path = require('path');
const { decode } = require('../../scripts/png.cjs');
const project = JSON.parse(fs.readFileSync(path.join(__dirname, 'main.json'), 'utf8'));
const decodeURL = url => decode(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));

function layerPixels(si, ai, fi, names) {
  const out = [];
  project.layers.forEach((l, i) => {
    if (l.sheetIndex !== si || l.isGroup || !names.includes(l.name)) return;
    const fd = l.frameData[`${si}_${ai}_${fi}`];
    if (!fd) return;
    const im = decodeURL(fd.dataURL);
    const px = [];
    for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
      const k = (y * im.width + x) * 4;
      if (im.data[k + 3]) px.push([x, y, Buffer.from(im.data.slice(k, k + 3)).toString('hex')]);
    }
    out.push({ i, name: l.name, parent: l.parent, w: im.width, h: im.height, px });
  });
  return out;
}
const bb = px => { let x0 = 99, y0 = 99, x1 = -1, y1 = -1; for (const [x, y] of px) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return `${x0},${y0}-${x1},${y1} (${x1 - x0 + 1}x${y1 - y0 + 1})`; };

project.spriteSheets.forEach((s, si) => {
  s.actions.forEach((a, ai) => {
    let line = `${s.name} ${a.direction}: `;
    a.frames.forEach((f, fi) => {
      const parts = layerPixels(si, ai, fi, ['head', 'body', '眼睛', 'hand', 'hand 2']);
      const head = parts.find(p => p.name === 'head');
      const body = parts.find(p => p.name === 'body');
      const eyes = parts.find(p => p.name === '眼睛');
      const h1 = parts.find(p => p.name === 'hand');
      const h2 = parts.find(p => p.name === 'hand 2');
      line += `\n  f${fi}: head ${head ? bb(head.px) : '-'} body ${body ? bb(body.px) : '-'} eyes ${eyes ? bb(eyes.px) : '-'} hand ${h1 ? bb(h1.px) : '-'} hand2 ${h2 ? bb(h2.px) : '-'}`;
    });
    console.log(line);
  });
});
