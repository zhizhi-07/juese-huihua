/* 素体主 ⇄ 主工程：读取时把主工程 body 拆成「描边 + 填充」，保存时合回主工程；人物分支再按主工程继承，所以在素体主页改体型即可让全部分支同步。 */
const png = require('../scripts/png.cjs');
const BASE_PROJECT_ID = 'draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba';
const BODY = /^(?:body|身体)$/, BODY_LINE = /^(?:body|身体) 描边$/;
const OUTLINE = [70, 70, 94];

const decode = cel => png.decode(Buffer.from(cel.dataURL.slice(cel.dataURL.indexOf(',') + 1), 'base64'));
const encode = image => 'data:image/png;base64,' + png.encode(image.width, image.height, image.data).toString('base64');
const blank = (width, height) => ({ width, height, data: new Uint8Array(width * height * 4) });

function place(image, width, height, dx, dy, label) {
  const target = blank(width, height);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const i = (y * image.width + x) * 4;
    if (!image.data[i + 3]) continue;
    const tx = x + dx, ty = y + dy;
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) throw new Error(label + '超出画布，未同步 body');
    target.data.set(image.data.subarray(i, i + 4), (ty * width + tx) * 4);
  }
  return target;
}
function stack(images, width, height) {
  const target = blank(width, height);
  for (const image of images) {
    if (!image) continue;
    const source = image.width === width && image.height === height ? image : place(image, width, height, 0, 0, '素体主 body ');
    for (let i = 0; i < source.data.length; i += 4) {
      if (!source.data[i + 3]) continue;
      target.data.set(source.data.subarray(i, i + 4), i);
    }
  }
  return target;
}
function split(image) {
  const fill = blank(image.width, image.height), line = blank(image.width, image.height);
  for (let i = 0; i < image.data.length; i += 4) {
    if (!image.data[i + 3]) continue;
    const target = image.data[i] === OUTLINE[0] && image.data[i + 1] === OUTLINE[1] && image.data[i + 2] === OUTLINE[2] ? line : fill;
    target.data.set(image.data.subarray(i, i + 4), i);
  }
  return { fill, line };
}
function visibleSame(a, b) {
  // 两边都透明的像素(可能残留 RGB)在画面上不可见，不算改动。
  if (!a || !b) return !a && !b;
  if (a.width !== b.width || a.height !== b.height) return false;
  for (let i = 0; i < a.data.length; i += 4) {
    if (!a.data[i + 3] && !b.data[i + 3]) continue;
    if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) return false;
  }
  return true;
}
const celSame = (a, b) => (!a || !b ? !a && !b : visibleSame(decode(a), decode(b)));

function frames(main, project) {
  const list = [];
  for (const [msi, sheet] of main.spriteSheets.entries()) {
    const dsi = project.spriteSheets.findIndex(s => s.name === sheet.name);
    if (dsi < 0) continue;
    const target = project.spriteSheets[dsi];
    for (const [mai, action] of sheet.actions.entries()) {
      const dai = target.actions.findIndex(a => a.name === action.name && a.direction === action.direction);
      if (dai < 0) continue;
      const layout = sheet.canvasLayout?.actions?.[mai], targetFrames = target.actions[dai].frames;
      for (const [fi, frame] of action.frames.entries()) {
        const cel = targetFrames[fi];
        if (!cel) continue;
        const mKey = `${msi}_${mai}_${fi}`, dKey = `${dsi}_${dai}_${fi}`;
        // 用真实 cel 尺寸判断位移：canvasLayout 记录的是「素体主原稿画布」到主工程画布的整体平移，
        // 后来被单独改过大小的 cel 不在那次平移里，按同尺寸对齐。
        const mainCel = celOf(main, msi, mai, BODY, mKey)?.frameData[mKey];
        const draftCel = celOf(project, dsi, dai, BODY, dKey)?.frameData[dKey] ?? celOf(project, dsi, dai, BODY_LINE, dKey)?.frameData[dKey];
        const mw = mainCel?.width ?? frame.width, mh = mainCel?.height ?? frame.height;
        const dw = draftCel?.width ?? cel.width, dh = draftCel?.height ?? cel.height;
        const padded = layout && mw === layout.width && mh === layout.height && (dw !== mw || dh !== mh);
        list.push({ msi, mai, fi, dsi, dai, dx: padded ? layout.x : 0, dy: padded ? layout.y : 0, mw, mh, dw, dh });
      }
    }
  }
  return list;
}
function celOf(project, si, ai, test, key) {
  return project.layers.find(l => !l.isGroup && l.sheetIndex === si && test.test(l.name) && l.frameData?.[key])
    ?? project.layers.find(l => !l.isGroup && l.sheetIndex === si && test.test(l.name) && Object.keys(l.frameData || {}).some(k => Number(String(k).split('_')[1]) === ai));
}
function ensure(project, si, ai, test, name) {
  const found = celOf(project, si, ai, test, `${si}_${ai}_0`);
  if (found) return found;
  const action = project.spriteSheets[si].actions[ai];
  const parent = project.layers.findIndex(l => l.isGroup && l.sheetIndex === si && (l.name === action.direction || l.name === action.name));
  const layer = { name, sheetIndex: si, visible: true, locked: false, opacity: 1, parent: parent >= 0 ? parent : null, depth: parent >= 0 ? 1 : 0, frameData: {} };
  project.layers.push(layer);
  return layer;
}
function write(layer, key, image) {
  const previous = layer.frameData[key] || {};
  layer.frameData[key] = { ...previous, placement: undefined, width: image.width, height: image.height, dataURL: encode(image) };
}

function pullFrame(project, main, fr) {
  const key = `${fr.msi}_${fr.mai}_${fr.fi}`;
  const source = celOf(main, fr.msi, fr.mai, BODY, key)?.frameData?.[key];
  if (!source) return false;
  const { fill, line } = split(place(decode(source), fr.dw, fr.dh, -fr.dx, -fr.dy, '主工程 body '));
  const index = `${fr.dsi}_${fr.dai}_${fr.fi}`;
  write(ensure(project, fr.dsi, fr.dai, BODY, 'body'), index, fill);
  write(ensure(project, fr.dsi, fr.dai, BODY_LINE, 'body 描边'), index, line);
  return true;
}
function pull(project, main) {
  let count = 0;
  for (const fr of frames(main, project)) if (pullFrame(project, main, fr)) count++;
  return count;
}
function push(project, main, previous) {
  // 没被客户端改过的帧跟随主工程，改过的帧才写回；返回主工程是否真的变化。
  let changed = 0, followed = 0;
  for (const fr of frames(main, project)) {
    const index = `${fr.dsi}_${fr.dai}_${fr.fi}`;
    const fill = celOf(project, fr.dsi, fr.dai, BODY, index)?.frameData[index];
    if (!fill) continue;
    const line = celOf(project, fr.dsi, fr.dai, BODY_LINE, index)?.frameData[index];
    if (previous) {
      const oldFill = celOf(previous, fr.dsi, fr.dai, BODY, index)?.frameData[index];
      const oldLine = celOf(previous, fr.dsi, fr.dai, BODY_LINE, index)?.frameData[index];
      if (celSame(oldFill, fill) && celSame(oldLine, line)) {
        // 这一帧没改：用过期的体型覆盖主工程会让分支掉描边，这里改为跟随主工程。
        if (pullFrame(project, main, fr)) followed++;
        continue;
      }
    }
    const composed = stack([line && decode(line), decode(fill)], fr.dw, fr.dh);
    const merged = place(composed, fr.mw, fr.mh, fr.dx, fr.dy, '素体主 body ');
    const target = celOf(main, fr.msi, fr.mai, BODY, `${fr.msi}_${fr.mai}_${fr.fi}`);
    if (!target) continue;
    const targetKey = `${fr.msi}_${fr.mai}_${fr.fi}`, previousCel = target.frameData[targetKey];
    if (previousCel && celSame(previousCel, { dataURL: encode(merged) })) continue;
    target.frameData[targetKey] = { ...previousCel, placement: undefined, width: merged.width, height: merged.height, dataURL: encode(merged) };
    changed++;
  }
  // 归一化：保存后本页 body 与主工程像素一致，回读时不会再因编码差异刷新版本号。
  if (changed) pull(project, main);
  return { mainChanged: changed, followed };
}
module.exports = { BASE_PROJECT_ID, pull, push };
