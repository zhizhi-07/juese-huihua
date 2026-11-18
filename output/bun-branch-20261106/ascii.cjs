const { frameMap, loadProject } = require('./pix.cjs');

const file = process.argv[2] || 'main.json';
const project = loadProject(file);
const si = Number(process.argv[3]), ai = Number(process.argv[4]), fi = Number(process.argv[5]);
const mode = process.argv[6] || 'all';
const filter = mode === 'base'
  ? (l) => !/^(头发|服装|发饰)/.test(l.name)
  : mode === 'hair'
    ? (l) => /^(头发|发饰)/.test(l.name)
    : mode === 'cloth'
      ? (l) => /^服装/.test(l.name)
      : null;

const fr = project.spriteSheets[si].actions[ai].frames[fi];
const w = fr.width, h = fr.height;
const out = new Map();
const names = [];
project.layers.forEach((l) => {
  if (l.sheetIndex !== si || l.isGroup || l.visible === false) return;
  if (filter && !filter(l)) return;
  const fm = frameMap(l, `${si}_${ai}_${fi}`, w, h);
  if (!fm) return;
  let painted = 0;
  for (const [k, v] of fm.map) { out.set(k, v); painted++; }
  if (painted) names.push(l.name);
});

const dir = project.spriteSheets[si].actions[ai].direction;
console.log(`frame ${si}/${ai}/${fi} dir=${dir} ${w}x${h} layers=${names.join(' | ')}`);
const legend = new Map();
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*+-=';
let header = '    ';
for (let x = 0; x < w; x++) header += x % 10;
console.log(header);
for (let y = 0; y < h; y++) {
  let line = String(y).padStart(3, ' ') + ' ';
  for (let x = 0; x < w; x++) {
    const hex = out.get(y * w + x);
    if (!hex) { line += '.'; continue; }
    if (!legend.has(hex)) legend.set(hex, chars[legend.size]);
    line += legend.get(hex);
  }
  console.log(line);
}
console.log('  legend ' + [...legend].map(([h2, c]) => c + '=' + h2).join(' '));
