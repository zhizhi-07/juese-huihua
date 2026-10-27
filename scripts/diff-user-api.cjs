const fs = require('fs');
const prev = JSON.parse(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/candidate.json', 'utf8'));
const curr = JSON.parse(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/user-current-api.json', 'utf8'));

console.log('Prev layers:', prev.layers.length, 'Curr layers:', curr.layers.length);

// Compare frameData across all layers for sheet 8
for (let i = 0; i < curr.layers.length; i++) {
  const cl = curr.layers[i];
  const pl = prev.layers.find(l => l.name === cl.name && l.sheetIndex === cl.sheetIndex);
  if (!pl) {
    console.log('New layer:', cl.name);
    continue;
  }
  for (const k of Object.keys(cl.frameData || {})) {
    const cf = cl.frameData[k];
    const pf = pl.frameData[k];
    if (!pf) {
      console.log('Layer ' + cl.name + ' has new frame ' + k);
      continue;
    }
    const cData = cf.data || cf;
    const pData = pf.data || pf;
    let diff = 0;
    for (let j = 0; j < cData.length; j++) {
      if (cData[j] !== pData[j]) diff++;
    }
    if (diff > 0) {
      console.log('Layer [' + cl.name + '] frame ' + k + ' DIFF: ' + diff + ' bytes different');
    }
  }
}
