/**
 * base-outlined-1794365455561: move every non-empty eye cel down 1 pixel.
 * Uniform shift for all frames (including idle first frames) - user asked for "所有眼睛都整体下移一格".
 * Run: node shift.cjs          (dry run: candidate + previews only)
 *      SAVE=1 node shift.cjs   (PUT with the ETag read at start)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const { decode, encode } = require('../../scripts/png.cjs');

const dir = __dirname;
const URL = 'http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';
const isEyes = l => !l.isGroup && /眼睛/.test(l.name);

async function getProject() {
  const r = await fetch(URL);
  const raw = await r.text();
  assert(r.ok, 'GET failed ' + r.status);
  return { raw, etag: r.headers.get('etag'), project: JSON.parse(raw) };
}

function celKey(layer) {
  return Object.entries(layer.frameData || {});
}

function visibleChain(project, layer) {
  let visible = layer.visible !== false;
  let p = layer.parent;
  while (p != null && p >= 0) { visible = visible && project.layers[p].visible !== false; p = project.layers[p].parent; }
  return visible;
}

function composite(project, si, ai, fi) {
  const sheet = project.spriteSheets[si];
  const frame = sheet.actions[ai].frames[fi];
  const w = frame.width, h = frame.height;
  const data = new Uint8Array(w * h * 4);
  const key = `${si}_${ai}_${fi}`;
  let mismatched = [];
  for (const [li, l] of project.layers.entries()) {
    if (!visibleChain(project, l)) continue;
    const cel = l.frameData?.[key];
    if (!cel) continue;
    const img = decode(Buffer.from(cel.dataURL.split(',')[1], 'base64'));
    if (img.width !== w || img.height !== h) { mismatched.push([li, img.width, img.height]); continue; }
    for (let i = 0; i < w * h; i++) {
      const a = img.data[i * 4 + 3];
      if (!a) continue;
      const o = i * 4;
      if (a === 255) { data[o] = img.data[o]; data[o + 1] = img.data[o + 1]; data[o + 2] = img.data[o + 2]; data[o + 3] = 255; }
      else {
        const sa = a / 255, da = data[o + 3] / 255, oa = sa + da * (1 - sa);
        for (let c = 0; c < 3; c++) data[o + c] = Math.round((img.data[o + c] * sa + data[o + c] * da * (1 - sa)) / oa);
        data[o + 3] = Math.round(oa * 255);
      }
    }
  }
  if (mismatched.length) console.log('  cel size mismatch', key, JSON.stringify(mismatched));
  return { w, h, data };
}

function scaleTo(img, scale, pad = 2) {
  const w = img.w * scale + pad * 2, h = img.h * scale + pad * 2;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const bx = x - pad, by = y - pad;
    const checker = ((Math.floor(x / 4) + Math.floor(y / 4)) % 2) ? 205 : 230;
    let rgb = [checker, checker, checker], alpha = 255;
    if (bx >= 0 && by >= 0 && bx < img.w * scale && by < img.h * scale) {
      const sx = Math.floor(bx / scale), sy = Math.floor(by / scale), o = (sy * img.w + sx) * 4;
      const a = img.data[o + 3] / 255;
      rgb = [0, 1, 2].map(c => Math.round(img.data[o + c] * a + rgb[c] * (1 - a)));
    }
    const o = (y * w + x) * 4; out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; out[o + 3] = alpha;
  }
  return { w, h, data: out };
}

function buildCompare(beforeProject, afterProject, frames, scale = 7) {
  const cells = [], cols = 2;
  for (const f of frames) {
    cells.push(scaleTo(composite(beforeProject, f[0], f[1], f[2]), scale));
    cells.push(scaleTo(composite(afterProject, f[0], f[1], f[2]), scale));
  }
  const rows = Math.ceil(cells.length / cols);
  const cw = Math.max(...cells.map(c => c.w)), ch = Math.max(...cells.map(c => c.h));
  const w = cols * cw, h = rows * ch, img = new Uint8Array(w * h * 4).fill(255);
  for (let i = 0; i < w * h; i++) img[i * 4 + 3] = 255;
  cells.forEach((c, n) => {
    const ox = (n % cols) * cw, oy = Math.floor(n / cols) * ch;
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const o = (y * c.w + x) * 4, d = ((oy + y) * w + ox + x) * 4;
      const a = c.data[o + 3] / 255;
      for (let k = 0; k < 3; k++) img[d + k] = Math.round(c.data[o + k] * a + 255 * (1 - a));
    }
  });
  return { w, h, data: img };
}

(async () => {
  const before = await getProject();
  let saved = null;
  if (fs.existsSync(path.join(dir, 'original.json'))) {
    const raw = fs.readFileSync(path.join(dir, 'original.json'), 'utf8');
    if (raw !== before.raw) {
      // Keep the original snapshot; a newer live version is analysed as the base instead.
      fs.writeFileSync(path.join(dir, 'original-at-start.json'), before.raw);
      console.log('NOTE: live project differs from original.json; saved original-at-start.json');
    }
  }
  fs.writeFileSync(path.join(dir, 'before.json'), before.raw);
  fs.writeFileSync(path.join(dir, 'backup-info.json'), JSON.stringify({
    url: URL, etag: before.etag,
    sha256: crypto.createHash('sha256').update(before.raw).digest('hex'), bytes: Buffer.byteLength(before.raw)
  }, null, 2));

  const after = structuredClone(before.project);
  const changes = [], skippedEmpty = [], clips = [];
  for (const [li, l] of after.layers.entries()) {
    if (!isEyes(l)) continue;
    for (const [key, cel] of celKey(l)) {
      const img = decode(Buffer.from(cel.dataURL.split(',')[1], 'base64'));
      const stride = img.width * 4;
      if (cel.width !== img.width || cel.height !== img.height) throw new Error('cel metadata mismatch ' + key);
      const hasPixel = img.data.some((v, i) => i % 4 === 3 && v);
      if (!hasPixel) { skippedEmpty.push([li, key]); continue; }
      if (img.data.subarray((img.height - 1) * stride).some((v, i) => i % 4 === 3 && v)) { clips.push([li, key]); continue; }
      const shifted = new Uint8Array(img.data.length);
      shifted.set(img.data.subarray(0, img.data.length - stride), stride); // row y-1 -> row y
      cel.dataURL = 'data:image/png;base64,' + encode(img.width, img.height, shifted).toString('base64');
      const back = decode(Buffer.from(cel.dataURL.split(',')[1], 'base64'));
      assert.equal(back.width, img.width); assert.equal(back.height, img.height);
      assert.deepEqual([...back.data], [...shifted]);
      // pixel-exact check: every source pixel is 1px lower, no pixel invented or lost
      for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
        const o = (y * img.width + x) * 4;
        if (y === 0) assert.equal(shifted[o + 3], 0);
        else assert.deepEqual([...shifted.subarray(o, o + 4)], [...img.data.subarray(o - stride, o - stride + 4)], `${key}@${x},${y}`);
      }
      changes.push({ layer: li, key, sheet: l.sheetIndex, width: img.width, height: img.height });
    }
  }
  assert.ok(changes.length > 0, 'no eye cel changed');
  assert.equal(clips.length, 0, 'bottom-edge content would clip: ' + JSON.stringify(clips));

  fs.writeFileSync(path.join(dir, 'candidate.json'), JSON.stringify(after));

  const beforePositions = [], afterPositions = [];
  for (const c of changes) {
    const a = decode(Buffer.from(before.project.layers[c.layer].frameData[c.key].dataURL.split(',')[1], 'base64'));
    const b = decode(Buffer.from(after.layers[c.layer].frameData[c.key].dataURL.split(',')[1], 'base64'));
    const pts = (img) => { const out = []; for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3]) out.push([x, y]); return out; };
    const pa = pts(a), pb = pts(b);
    pb.forEach((p, i) => assert.deepEqual(p, [pa[i][0], pa[i][1] + 1], `shift vector ${c.key}`));
    beforePositions.push({ key: c.key, pixels: pa.length });
  }

  const frames = [[0, 0, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 0, 1], [1, 0, 2], [2, 0, 0], [2, 1, 0], [13, 0, 0], [13, 0, 1], [4, 0, 4], [9, 0, 4]];
  const cmp = buildCompare(before.project, after, frames, 7);
  fs.writeFileSync(path.join(dir, 'compare.png'), encode(cmp.w, cmp.h, cmp.data));

  const report = {
    source: { etag: before.etag, sha256: JSON.parse(fs.readFileSync(path.join(dir, 'backup-info.json'))).sha256 },
    changedCels: changes.length,
    skippedEmptyCels: skippedEmpty.length,
    perSheet: Object.fromEntries([...new Set(changes.map(c => c.sheet))].sort((a, b) => a - b).map(si => [before.project.spriteSheets[si].name, changes.filter(c => c.sheet === si).length])),
    changes,
    pixelRule: 'every visible eye pixel moved from (x,y) to (x,y+1); top row cleared; size/metadata unchanged',
    noClip: true
  };
  fs.writeFileSync(path.join(dir, 'dryrun-verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ changedCels: changes.length, skippedEmpty: skippedEmpty.length, perSheet: report.perSheet }));

  if (process.env.SAVE === '1') {
    const check = await getProject();
    assert.equal(check.raw, before.raw, 'project changed while preparing; re-run');
    const save = await fetch(URL, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': before.etag }, body: JSON.stringify(after) });
    const text = await save.text();
    fs.writeFileSync(path.join(dir, 'save-response.txt'), save.status + '\n' + text);
    assert(save.ok, text);
    const rr = await getProject();
    assert.equal(rr.raw, JSON.stringify(after), 'readback differs from candidate');
    fs.writeFileSync(path.join(dir, 'after.json'), rr.raw);
    fs.writeFileSync(path.join(dir, 'after-etag.txt'), rr.etag || '');

    // everything except the listed eye cels must be byte-identical to the original
    const restored = structuredClone(after);
    for (const c of changes) restored.layers[c.layer].frameData[c.key] = before.project.layers[c.layer].frameData[c.key];
    assert.deepEqual(restored, before.project, 'non-eye data changed');

    // frame/layer geometry & metadata unchanged
    for (const [si, s] of after.spriteSheets.entries()) {
      const o = before.project.spriteSheets[si];
      assert.equal(s.name, o.name);
      for (const [ai, a] of s.actions.entries()) {
        assert.equal(a.direction, o.actions[ai].direction);
        for (const [fi, f] of a.frames.entries()) {
          const g = o.actions[ai].frames[fi];
          assert.deepEqual([f.width, f.height, f.sourceX, f.sourceY, f.duration, f.status, f.locked], [g.width, g.height, g.sourceX, g.sourceY, g.duration, g.status, g.locked]);
        }
      }
    }
    assert.equal(after.layers.length, before.project.layers.length);
    fs.writeFileSync(path.join(dir, 'saved-verification.json'), JSON.stringify({
      changedCels: changes.length, noClip: true, readbackEqualsCandidate: true,
      otherDataUnchanged: true, perSheet: report.perSheet
    }, null, 2));
    console.log('SAVED', rr.etag);
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
