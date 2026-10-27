const fs = require('fs');

const target = 'C:/Users/Administrator/Desktop/角色绘画/data/shared-project.json';
const proj = JSON.parse(fs.readFileSync(target, 'utf8'));

const out = { ok: true };
out.sheetCount = (proj.spriteSheets || []).length;
out.sheetNames = (proj.spriteSheets || []).map((s, i) => `${i}:${s.name}`);
out.globalLayerCount = (proj.layers || []).length;
out.globalLayers = (proj.layers || []).map((l, i) => ({
  i,
  name: l.name,
  visible: l.visible,
  locked: l.locked,
  opacity: l.opacity,
  sheetIndex: l.sheetIndex,
  referenceOnly: !!l.referenceOnly,
  keys: Object.keys(l),
}));

const cur = proj.spriteSheets[proj.currentSheetIndex];
out.currentSheet = {
  index: proj.currentSheetIndex,
  name: cur.name,
  frameWidth: cur.frameWidth,
  frameHeight: cur.frameHeight,
  actions: (cur.actions || []).map((a, ai) => ({
    ai, name: a.name, direction: a.direction,
    frames: (a.frames || []).map((f, fi) => ({
      fi,
      keys: Object.keys(f),
      sheetIndex: f.sheetIndex,
      actionIndex: f.actionIndex,
      frameIndex: f.frameIndex,
      layerIndex: f.layerIndex,
    })),
  })),
};
fs.writeFileSync('C:/Users/Administrator/Desktop/角色绘画/备份/analysis-layers.json', JSON.stringify(out, null, 2));
console.log('layers:', out.globalLayerCount);
console.log('sheets:', out.sheetNames.join(', '));
console.log('current sheet:', out.currentSheet.name, JSON.stringify(out.currentSheet.actions.map(a=>({ai:a.ai,n:a.name,fc:a.frames.length}))));
