/* Mirror of PE.classifyPart from js/core.js for background rendering. */
const PART_RULES = [
  { test: /后发|背发|后面的头发/, category: '头发', slot: '后发', rank: 3.25 },
  { test: /侧发|鬓发|鬓角/, category: '头发', slot: '侧发', rank: 1 },
  { test: /前发|刘海|额发/, category: '头发', slot: '前发', rank: 4 },
  { test: /发饰|发夹|发卡|发带|蝴蝶结|头饰|帽子/, category: '头发', slot: '饰品', rank: 5 },
  { test: /眼|瞳/, category: '五官', slot: '眼睛', rank: 3.5 },
  { test: /嘴|口型|唇/, category: '五官', slot: '嘴巴', rank: 7 },
  { test: /服|衣|裤|裙|鞋|袜|jk/i, category: '衣服', slot: '服装', rank: 3 }
];
const HEAD_NAMES = { head: { category: '身体', slot: '头部', rank: 2 }, body: { category: '身体', slot: '身体', rank: 2 }, hand: { category: '身体', slot: '手部', rank: 2 }, 'hand 2': { category: '身体', slot: '手部', rank: -1 } };
function classifyPart(name) {
  const full = String(name || '').trim();
  if (!full) return null;
  if (HEAD_NAMES[full]) return { ...HEAD_NAMES[full], name: full, clean: full };
  const pieces = full.split(' / ').map(s => s.trim()).filter(Boolean);
  const tail = pieces.at(-1) || full;
  const match = text => PART_RULES.find(rule => rule.test.test(text));
  const rule = match(tail) || match(full);
  if (!rule) return null;
  const clean = tail.replace(/^\d+\s*/, '').trim() || tail;
  const series = pieces[0] === '头发' && pieces.length >= 3 ? pieces[1].replace(/^\d+\s*/, '').trim() : '';
  const canonical = rule.category === '头发'
    ? (rule.slot === '饰品' ? `发饰 / ${clean}` : `头发 / ${series || '通用发型'} / ${rule.slot}`)
    : `${rule.slot} / ${clean}`;
  return { category: rule.category, slot: rule.slot, rank: rule.rank, name: canonical, clean, series };
}
module.exports = { classifyPart, PART_RULES, HEAD_NAMES };
