const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'C:/Users/Administrator/Desktop/角色绘画/data/shared-project.json';
const raw = fs.readFileSync(target);
const text = raw.toString('utf8');
let proj;
try {
  proj = JSON.parse(text);
} catch (e) {
  const m = /position (\d+)/.exec(e.message);
  let ctx = 'n/a';
  if (m) {
    const p = parseInt(m[1], 10);
    ctx = JSON.stringify(text.slice(Math.max(0, p - 120), p + 120));
  }
  console.log(JSON.stringify({ ok: false, error: e.message, context: ctx }, null, 2));
  process.exit(1);
}

const out = {
  ok: true,
  topKeys: Object.keys(proj),
  name: proj.name,
  version: proj.version,
  currentSheetIndex: proj.currentSheetIndex,
  currentActionIndex: proj.currentActionIndex,
  currentFrameIndex: proj.currentFrameIndex,
  currentLayerIndex: proj.currentLayerIndex,
  sheets: (proj.spriteSheets || []).map((s, si) => ({
    si,
    name: s.name,
    keys: Object.keys(s),
    frameWidth: s.frameWidth,
    frameHeight: s.frameHeight,
    columns: s.columns,
    rows: s.rows,
    fps: s.fps,
    actionCount: (s.actions || []).length,
    layerCount: (s.layers || []).length,
    actions: (s.actions || []).map((a, ai) => ({
      ai,
      name: a.name,
      direction: a.direction,
      keys: Object.keys(a),
      frameCount: (a.frames || []).length,
    })),
  })),
};
console.log(JSON.stringify(out, null, 2));
