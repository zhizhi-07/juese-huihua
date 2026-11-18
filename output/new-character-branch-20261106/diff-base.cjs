/* 对比分支底稿与主工程底稿的帧差异 */
const fs = require('fs');
const path = require('path');
const { decode } = require('../../scripts/png.cjs');
const dir = __dirname;
const a = JSON.parse(fs.readFileSync(path.join(dir, process.argv[2] || 'saved-branch.json'), 'utf8'));
const b = JSON.parse(fs.readFileSync(path.join(dir, process.argv[3] || 'main-current.json'), 'utf8'));
const dec = u => decode(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
const gk = (p, l) => { const par = l.parent == null ? null : p.layers[l.parent]; return par && par.isGroup ? par.name : ''; };
const idx = p => new Map(p.layers.filter(l => !l.isGroup).map(l => [`${l.sheetIndex}|${l.name}|${gk(p, l)}`, l]));
const A = idx(a), B = idx(b);
const baseNames = new Set(['body', 'head', 'hand', 'hand 2']);
for (const [k, la] of A) {
  if (!baseNames.has(la.name)) continue;
  const lb = B.get(k);
  if (!lb) { console.log('主工程无对应底稿', k); continue; }
  for (const key of new Set([...Object.keys(la.frameData), ...Object.keys(lb.frameData)])) {
    const x = la.frameData[key], y = lb.frameData[key];
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    const ix = x ? dec(x.dataURL) : null, iy = y ? dec(y.dataURL) : null;
    const same = ix && iy ? Buffer.compare(Buffer.from(ix.data), Buffer.from(iy.data)) === 0 : false;
    console.log(k, key,
      '| 分支', x ? `${x.width}x${x.height}${x.placement ? '@' + JSON.stringify(x.placement) : ''}` : 'none',
      '| 主工程', y ? `${y.width}x${y.height}${y.placement ? '@' + JSON.stringify(y.placement) : ''}` : 'none',
      '| 像素相同', same);
  }
}
