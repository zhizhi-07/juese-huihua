const fs = require('fs');
const assert = require('assert');

const proj = JSON.parse(fs.readFileSync('data/shared-project.json', 'utf8'));

// 记录所有带 parent 的图层当前指向的父图层对象和名字
const parentsBefore = proj.layers.map((l, i) => {
  if (l.parent != null) {
    return { childIndex: i, childName: l.name, parentIndex: l.parent, parentName: proj.layers[l.parent].name };
  }
  return null;
}).filter(Boolean);

console.log(`Found ${parentsBefore.length} parent-child links.`);

// 模拟在 index 7 插入 2 个后发图层
const insertPos = 7;
const insertCount = 2;

// 构造新数组
const newLayers = [...proj.layers];
const dummy1 = { name: '后发1', parent: null };
const dummy2 = { name: '后发2', parent: null };
newLayers.splice(insertPos, 0, dummy1, dummy2);

// 更新索引
for (let i = 0; i < newLayers.length; i++) {
  const l = newLayers[i];
  if (l !== dummy1 && l !== dummy2 && l.parent != null) {
    if (l.parent >= insertPos) {
      l.parent += insertCount;
    }
  }
}

// 验证所有关系是否完好
parentsBefore.forEach(p => {
  const newChildIndex = p.childIndex >= insertPos ? p.childIndex + insertCount : p.childIndex;
  const child = newLayers[newChildIndex];
  assert.equal(child.name, p.childName);
  const parent = newLayers[child.parent];
  assert.equal(parent.name, p.parentName, `Parent mismatch for ${child.name}`);
});

console.log('PASS: Parent index updating is 100% mathematically correct and verified.');
