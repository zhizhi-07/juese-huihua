/* 审核候选稿：底稿不可被覆盖、眼睛不可被遮、图层帧尺寸一致、留白与对称检查 */
const fs = require('fs');
const path = require('path');
const { frameMap, loadProject } = require('./pix.cjs');

const project = loadProject(process.argv[2] || 'candidate.json');
const problems = [];

const layerAt = (si, dir) => {
  const gi = project.layers.findIndex(l => l.isGroup && l.sheetIndex === si && l.name === dir);
  return project.layers.filter(l => !l.isGroup && l.parent === gi);
};

const EYES = '#46465E';
let eyeCovered = 0, faceCovered = 0, chinCovered = 0, frames = 0;

project.spriteSheets.forEach((sheet, si) => {
  sheet.actions.forEach((action, ai) => {
    const dir = action.direction;
    const kids = layerAt(si, dir);
    const get = name => kids.find(l => l.name === name) || null;
    const head = get('head');
    const eyes = get('眼睛');
    if (!head) return;
    action.frames.forEach((frame, fi) => {
      frames++;
      const key = `${si}_${ai}_${fi}`;
      const w = frame.width, h = frame.height;
      const hm = frameMap(head, key, w, h);
      const em = eyes ? frameMap(eyes, key, w, h) : null;
      // 头部包围盒
      let hx0 = 99, hy0 = 99;
      for (const k of hm.map.keys()) {
        hx0 = Math.min(hx0, k % hm.w); hy0 = Math.min(hy0, Math.floor(k / hm.w));
      }
      // 眼睛像素不可被头发/服装遮住
      if (em) {
        for (const k of em.map.keys()) {
          for (const l of kids) {
            if (!/^(头发|服装|发饰)/.test(l.name)) continue;
            const fm = frameMap(l, key, w, h);
            if (!fm) continue;
            if (fm.map.has(k)) {
              eyeCovered++;
              problems.push(`眼睛被覆盖 ${key} ${dir} by ${l.name} @${k % w},${Math.floor(k / w)}`);
            }
          }
        }
      }
      // 脸部（chin 以上、颅顶下两行起）不可被后发/服装覆盖
      for (const k of hm.map.keys()) {
        const y = Math.floor(k / hm.w), x = k % hm.w;
        const r = y - hy0;
        if (r < 2) continue;
        for (const l of kids) {
          if (!/^(头发 \/ 丸子头 \/ 后发|服装)/.test(l.name)) continue;
          const fm = frameMap(l, key, w, h);
          if (!fm) continue;
          if (fm.map.has(k)) {
            faceCovered++;
            if (faceCovered < 20) problems.push(`面部被覆盖 ${key} ${dir} by ${l.name} @${x},${y}`);
          }
        }
      }
      // 服装不可盖住下巴及以上的头部
      const cloth = kids.find(l => /^服装/.test(l.name));
      if (cloth) {
        const cm = frameMap(cloth, key, w, h);
        if (cm) for (const k of cm.map.keys()) {
          const y = Math.floor(k / cm.w);
          if (y <= hy0 + 9 && hm.map.has(k)) {
            chinCovered++;
            problems.push(`下巴被服装覆盖 ${key} ${dir} @${k % cm.w},${y}`);
          }
        }
      }
    });
  });
});

const named = project.layers.filter(l => !l.isGroup && /^(头发|服装|发饰)/.test(l.name));
const summary = named.map(l => `${l.name} [sheet${l.sheetIndex}] vis=${l.visible} frames=${Object.keys(l.frameData).length}`);
const groups = project.layers.filter(l => l.isGroup).map(l => `${l.name}@sheet${l.sheetIndex}`);
const orphans = project.layers.filter(l => !l.isGroup && l.parent == null && !/^(头发|发饰)/.test(l.name));

console.log(JSON.stringify({ frames, eyeCovered, faceCovered, chinCovered, problems: problems.slice(0, 20), summary, groups, orphans: orphans.map(o => o.name) }, null, 1));
