const fs = require('fs');
const path = require('path');
const dir = 'data/projects';
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const layers = data.layers || [];
    for (const l of layers) {
      if (l.name.includes('丸子') || l.name.includes('包包') || l.name.includes('05') || (l.sheetIndex === 8 && l.name.includes('后发') && l.visible)) {
        console.log('File: ' + f + ' (' + data.name + ') -> Layer: ' + l.name + ', sheet: ' + l.sheetIndex + ', visible: ' + l.visible + ', frames: ' + Object.keys(l.frameData || {}).join(','));
      }
    }
  } catch (e) {}
}
