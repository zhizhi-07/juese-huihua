const fs = require('fs');

const proj = JSON.parse(fs.readFileSync('data/shared-project.json', 'utf8'));
console.log('Project Name:', proj.name);
console.log('Total layers:', proj.layers.length);

proj.layers.forEach((l, i) => {
  if (l.name && (l.name.includes('发') || l.name.includes('饰') || l.name.includes('刘海') || l.name.includes('hair') || l.name.includes('head') || l.name.includes('body'))) {
    console.log(`[${i}] ${l.name} | parentId: ${l.parentId} | visible: ${l.visible}`);
  }
});
