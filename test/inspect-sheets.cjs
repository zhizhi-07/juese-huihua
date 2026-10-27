const fs = require('fs');

const proj = JSON.parse(fs.readFileSync('data/shared-project.json', 'utf8'));

console.log('spriteSheets count:', proj.spriteSheets ? proj.spriteSheets.length : 'no spriteSheets');
if (proj.spriteSheets) {
  proj.spriteSheets.forEach((s, idx) => {
    console.log(`Sheet [${idx}]: name=${s.name || ''}, frameWidth=${s.frameWidth}, frameHeight=${s.frameHeight}, actions=${(s.actions || []).map(a => a.name + '(' + a.direction + ')').join(',')}`);
  });
}

// 检查每个图层的名字、类型、sheetIndex
console.log('\n--- Layers ---');
proj.layers.forEach((l, idx) => {
  if (l.name && (l.name.includes('发') || l.name.includes('饰') || l.name.includes('刘海'))) {
    console.log(`[${idx}] "${l.name}", sheetIndex=${l.sheetIndex}, visible=${l.visible}, id=${l.id}`);
  }
});
