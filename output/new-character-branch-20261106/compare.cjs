/* 对比候选稿与保存后的工程，定位结构性差异 */
const fs = require('fs');
const path = require('path');
const { decode } = require('../../scripts/png.cjs');

const dir = __dirname;
const a = JSON.parse(fs.readFileSync(path.join(dir, process.argv[2]), 'utf8'));
const b = JSON.parse(fs.readFileSync(path.join(dir, process.argv[3]), 'utf8'));

const desc = l => `${l.isGroup ? 'G' : 'L'}:${l.name}@s${l.sheetIndex}p${l.parent}${l.locked ? ' lock' : ''}${l.referenceOnly ? ' ref' : ''}${l.inheritedBase ? ' base' : ''} vis${l.visible === false ? 0 : 1} f${Object.keys(l.frameData || {}).length}`;

console.log('layers', a.layers.length, b.layers.length);
const max = Math.max(a.layers.length, b.layers.length);
for (let i = 0; i < max; i++) {
  const x = a.layers[i] ? desc(a.layers[i]) : '-';
  const y = b.layers[i] ? desc(b.layers[i]) : '-';
  if (x !== y) console.log(i, '\n  A:', x, '\n  B:', y);
}
console.log('current', JSON.stringify({ ci: a.currentLayerIndex, cs: a.currentSheetIndex, ca: a.currentActionIndex, cf: a.currentFrameIndex }), JSON.stringify({ ci: b.currentLayerIndex, cs: b.currentSheetIndex, ca: b.currentActionIndex, cf: b.currentFrameIndex }));
console.log('sheets equal', JSON.stringify(a.spriteSheets) === JSON.stringify(b.spriteSheets));
console.log('keys', Object.keys(a).join(','), '|', Object.keys(b).join(','));
