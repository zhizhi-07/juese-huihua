/* 检查造型层里是否有孤立像素（4邻域全空），以及是否有像素越出画布等异常 */
const { loadProject, frameMap } = require('./pix.cjs');

const p = loadProject(process.argv[2] || 'readback.json');
const RE = /^(头发|服装|发饰)/;
const issues = [];
let total = 0;

p.layers.forEach(l => {
  if (l.isGroup || !RE.test(l.name)) return;
  for (const key of Object.keys(l.frameData || {})) {
    const [si, ai, fi] = key.split('_').map(Number);
    const frame = p.spriteSheets[si]?.actions[ai]?.frames[fi];
    if (!frame) continue;
    const fm = frameMap(l, key, frame.width, frame.height);
    if (!fm) continue;
    for (const k of fm.map.keys()) {
      total++;
      const x = k % fm.w, y = Math.floor(k / fm.w);
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => fm.map.has((y + dy) * fm.w + (x + dx)));
      if (!n.length) issues.push(`${l.name} ${si}/${ai}/${fi} 孤立像素 @${x},${y}`);
    }
  }
});
console.log(JSON.stringify({ pixels: total, isolated: issues.length, sample: issues.slice(0, 15) }, null, 1));
