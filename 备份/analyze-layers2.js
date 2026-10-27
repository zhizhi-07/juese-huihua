const fs = require('fs');
const proj = JSON.parse(fs.readFileSync('C:/Users/Administrator/Desktop/角色绘画/data/shared-project.json', 'utf8'));
const layers = proj.layers || [];
const si = proj.currentSheetIndex;

// group by sheetIndex
const bySheet = {};
for (const l of layers) {
  const k = String(l.sheetIndex);
  (bySheet[k] = bySheet[k] || []).push(l);
}
console.log('=== layer groups by sheetIndex ===');
for (const k of Object.keys(bySheet)) console.log(k, '->', bySheet[k].length);

console.log('\n=== layers in current sheet (' + si + ') ===');
for (const l of bySheet[String(si)] || []) {
  console.log([
    l.index !== undefined ? l.index : '',
    l.name,
    'vis=' + l.visible,
    'lock=' + l.locked,
    'op=' + l.opacity,
    'ref=' + !!l.referenceOnly,
    'keys=' + Object.keys(l).join(','),
  ].join(' | '));
}
