/* 检查已保存工程的图层顺序与层级归属 */
const { loadProject } = require('./pix.cjs');
const p = loadProject(process.argv[2] || 'readback.json');

const rows = [];
p.layers.forEach((l, i) => {
  const parent = l.parent == null ? '-' : (p.layers[l.parent]?.name ?? '?');
  rows.push(`${String(i).padStart(3)} sheet${l.sheetIndex} ${l.isGroup ? 'GROUP ' : (l.inheritedBase ? 'BASE  ' : 'LAYER ')} parent=${String(parent).padEnd(6)} vis=${l.visible ? 'y' : 'n'} lock=${l.locked ? 'y' : 'n'} ${l.name}`);
});
console.log(rows.join('\n'));
console.log('layers:', p.layers.length);
