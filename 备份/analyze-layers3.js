const fs = require('fs');
const proj = JSON.parse(fs.readFileSync('C:/Users/Administrator/Desktop/角色绘画/data/shared-project.json', 'utf8'));
const layers = proj.layers || [];
const si = proj.currentSheetIndex;
console.log('currentLayerIndex =', proj.currentLayerIndex, '->', layers[proj.currentLayerIndex] && layers[proj.currentLayerIndex].name);
console.log('currentSheetIndex =', si, 'ai =', proj.currentActionIndex, 'fi =', proj.currentFrameIndex);

console.log('\n=== sheet 8 layers (global index | name | vis | parent | depth | isGroup | frameData keys) ===');
layers.forEach((l, i) => {
  if (l.sheetIndex !== si) return;
  const fd = l.frameData || {};
  const fkeys = Object.keys(fd);
  let nonempty = 0;
  for (const k of fkeys) { const d = fd[k]; if (d && (d.data || d.pixels)) nonempty++; }
  console.log([i, l.name, 'vis=' + l.visible, 'par=' + (l.parent || '-'), 'dep=' + (l.depth ?? '-'),
    'grp=' + !!l.isGroup, 'frames=' + fkeys.length + '/' + nonempty, fkeys.slice(0, 4).join(',')].join(' | '));
});

console.log('\n=== frameData sample of layer 265 ===');
const L = layers[proj.currentLayerIndex];
console.log(JSON.stringify(L && L.frameData ? Object.fromEntries(Object.entries(L.frameData).map(([k, v]) => [k, { keys: Object.keys(v||{}), len: (v && (v.data||v.pixels||'')).length }])) : null, null, 1));
