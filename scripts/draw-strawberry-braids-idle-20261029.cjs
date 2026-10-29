const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createCanvas, ImageData, Image } = require('@napi-rs/canvas');
const root = path.resolve(__dirname, '..');
const out = path.join(root, '发型素材/06-蓬松双麻花辫');
const id = 'character-strawberry-braids-idle-20261029';
const url = 'http://127.0.0.1:8765/api/project?id=';
fs.mkdirSync(out, { recursive: true });
global.window = global;
global.ImageData = ImageData;
global.Image = Image;
global.document = { createElement() { const c = createCanvas(1, 1); c.style = {}; return c; } };
global.File = class extends Blob { constructor(parts, name) { super(parts); this.name = name; } };
global.FileReader = class { async readAsText(f) { this.result = await f.text(); this.onload(); } };
for (const n of ['core', 'history', 'canvas', 'tools', 'spritesheet', 'export', 'animation']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, 'js', n + '.js'), 'utf8'));
}
function png(data, file, scale = 1, bg) {
  const tile = createCanvas(data.width, data.height);
  tile.getContext('2d').putImageData(data, 0, 0);
  const c = createCanvas(data.width * scale, data.height * scale), ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(tile, 0, 0, c.width, c.height);
  fs.writeFileSync(path.join(out, file), c.toBuffer('image/png'));
}
function draw(ai, fi, kind, dy, head) {
  const trace = JSON.parse(fs.readFileSync(path.join(out,'reference-trace.json'),'utf8'));
  const rows = kind === 'acc' ? trace.bows[ai] : trace.hair[ai];
  const result = new ImageData(32,32);
  const palette = { O:[119,119,119,255], S:[178,178,178,255], B:[209,209,209,255], D:[157,113,134,255], P:[240,180,205,255], R:[216,141,175,255], L:[248,212,226,255], G:[166,190,118,255], W:[255,240,242,255] };
  if (kind === 'front' && ai === 2) return result;
  for (let y=0;y<32;y++) for (let x=0;x<32;x++) {
    if (kind === 'front' && y >= 21) continue;
    const color = palette[rows[y][x]];
    if (!color) continue;
    const yy = y+dy-(dy && y>=18 ? 1 : 0);
    const bend = (fi===1 || fi===2) && y>=24 ? 1 : 0;
    const xx = x+(bend ? (x<16 ? -1 : 1) : 0);
    assert(xx>=0 && xx<32 && yy>=0 && yy<32,`Hair outside native canvas: ${ai}/${fi}/${kind} ${x},${y} -> ${xx},${yy}`);
    result.data.set(color,(yy*32+xx)*4);
  }
  // Complete the hidden cap without changing the traced, visible silhouette.
  if (kind !== 'acc' && ai !== 2) for (let y=0;y<22+dy;y++) for (let x=0;x<32;x++) {
    const at=(y*32+x)*4;
    if (head.data[at+3] && !result.data[at+3] && (kind==='rear' || y<7+dy)) result.data.set(palette.B,at);
  }
  return result;
}
async function run() {
  const source = await fetch(url + 'main');
  assert(source.ok);
  const sourceText = await source.text();
  const backup = path.join(out, 'source.json');
  if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, sourceText);
    fs.writeFileSync(path.join(out, 'source-etag.txt'), source.headers.get('etag'));
  }
  const base = require('../js/character-base.js')(JSON.parse(sourceText));
  base.name = '蓬松双麻花辫·待机';
  base.currentSheetIndex = 8; base.currentActionIndex = 1; base.currentFrameIndex = 0;
  const initial = await fetch(url + id);
  if (initial.status === 404) {
    const saved = await fetch(url + id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': 'none' }, body: JSON.stringify(base) });
    assert(saved.ok, 'Create branch: ' + saved.status);
  } else assert(initial.ok);
  const response = await fetch(url + id);
  assert(response.ok);
  const branchText = await response.text(), etag = response.headers.get('etag');
  fs.writeFileSync(path.join(out, 'branch-before.json'), branchText);
  const exporter = new PE.ExportManager();
  const { project } = await exporter.importProject(new File([branchText], 'branch.json'));
  const cm = new PE.CanvasManager(document.createElement('canvas'), project);
  exporter.project = project; exporter.canvasManager = cm;
  for (let ai = 0; ai < 3; ai++) for (let fi = 0; fi < 4; fi++) {
    png(cm.getCompositeImageData(8, ai, fi), `base-${ai}-${fi}.png`, 6, '#eee6ed');
  }
  if (process.argv.includes('--prepare')) return;
  assert(!project.layers.some(l => l.name.startsWith('头发 /')), 'Branch already has artwork; do not overwrite user edits');
  const originals = project.layers.map(l => [l, new Map([...l.frameData].map(([k,d]) => [k, new Uint8ClampedArray(d.data)]))]);
  const rear = new PE.Layer('头发 / 06 蓬松双麻花辫 / 后发');
  const front = new PE.Layer('头发 / 06 分束齐刘海 / 前发');
  const acc = new PE.Layer('发饰 / 06 草莓蝴蝶结');
  for (const l of [rear,front,acc]) { l.sheetIndex = 8; l.visible = true; l.parent = null; l.depth = 0; }
  const metrics = [];
  for (let ai = 0; ai < 3; ai++) for (let fi = 0; fi < 4; fi++) {
    const key = `8_${ai}_${fi}`;
    const head = project.layers.find(l => l.name === 'head' && l.frameData.has(key)).frameData.get(key);
    let top = 32;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) if (head.data[(y*32+x)*4+3]) top = Math.min(top,y);
    const dy = top - 2;
    assert([0,2].includes(dy));
    for (const [l,kind] of [[rear,'rear'],[front,'front'],[acc,'acc']]) {
      const data = draw(ai,fi,kind,dy,head); l.frameData.set(key,data);
      for (let i = 3; i < data.data.length; i += 4) assert([0,255].includes(data.data[i]));
      if (kind === 'front' && ai === 2) assert(!data.data.some(v => v));
      if (ai !== 0) for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
        assert.deepEqual(data.data.slice((y*32+x)*4,(y*32+x)*4+4),data.data.slice((y*32+31-x)*4,(y*32+31-x)*4+4), `${kind} symmetry ${key}`);
      }
      png(data, `${kind}-${ai}-${fi}.png`);
    }
    metrics.push({ key, headTop: top, rootShift: dy, tipShift: dy ? 1 : 0 });
  }
  for (const l of project.layers) if (l.parent != null) l.parent++;
  project.layers.unshift(rear); project.layers.push(front,acc);
  project.currentLayerIndex = project.layers.indexOf(front);
  const contact = createCanvas(4*192,3*192), context = contact.getContext('2d');
  context.imageSmoothingEnabled = false;
  for (let ai = 0; ai < 3; ai++) for (let fi = 0; fi < 4; fi++) {
    const im = cm.getCompositeImageData(8,ai,fi);
    assert(im.data.some((v,i) => i%4 === 3 && v));
    png(im,`idle-${ai}-${fi}.png`);
    const tile = createCanvas(32,32); tile.getContext('2d').putImageData(im,0,0);
    context.fillStyle = ai === 0 ? '#37343f' : '#eee6ed';
    context.fillRect(fi*192,ai*192,192,192); context.drawImage(tile,fi*192,ai*192,192,192);
    project.currentActionIndex = ai; project.currentFrameIndex = fi; cm.render();
    assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);
    const decoded = require('./png.cjs').decode(Buffer.from(await (await exporter.exportFrameAsBlob(8,ai,fi)).arrayBuffer()));
    assert.deepEqual(Array.from(decoded.data),Array.from(im.data));
    const player = Object.create(PE.AnimationPlayer.prototype);
    Object.assign(player,{canvas:createCanvas(32,32),project,canvasManager:cm,sheetIndex:8,actionIndex:ai,currentFrame:fi,previewScale:1});
    player.ctx = player.canvas.getContext('2d'); player._renderPreviewFrame();
    assert.deepEqual(player.ctx.getImageData(0,0,32,32).data,im.data);
  }
  fs.writeFileSync(path.join(out,'全部待机帧.png'),contact.toBuffer('image/png'));
  for (const [l,frames] of originals) for (const [key,data] of frames) assert.deepEqual(l.frameData.get(key).data,data);
  const raw = JSON.parse(branchText), exported = JSON.parse(await exporter.exportProject(false).text());
  const candidate = { ...raw, currentActionIndex:1, currentFrameIndex:0, currentLayerIndex:project.currentLayerIndex };
  candidate.layers = [exported.layers[0],...raw.layers.map(l => ({...l,parent:l.parent == null ? l.parent : l.parent+1})),...exported.layers.slice(-2)];
  fs.writeFileSync(path.join(out,'分层工程.json'),JSON.stringify(candidate));
  fs.writeFileSync(path.join(out,'自检.json'),JSON.stringify({metrics,checks:['base pixels unchanged','symmetric front/back','opaque pixels only','empty rear bangs','canvas/preview/PNG match for all 12 frames']},null,2));
  // Test other parts on a disposable project only; the new branch contains no old wardrobe.
  const { project: mixed } = await exporter.importProject(new File([sourceText],'mix.json'));
  for (const l of mixed.layers) if (l.sheetIndex === 8 && /^(头发|发饰) \//.test(l.name)) l.visible = false;
  for (const l of mixed.layers) if (l.parent != null) l.parent++;
  mixed.layers.unshift(rear); mixed.layers.push(front,acc);
  const mc = new PE.CanvasManager(document.createElement('canvas'),mixed);
  const variants = createCanvas(4*192,3*192), vx = variants.getContext('2d'); vx.imageSmoothingEnabled = false;
  for (let ai = 0; ai < 3; ai++) for (let v = 0; v < 4; v++) {
    rear.visible = v < 2; acc.visible = v < 2;
    for (const l of mixed.layers) if (l.sheetIndex === 8 && l.name === '头发 / 01 披发 / 后发') l.visible = v === 3;
    for (const l of mixed.layers) if (l.sheetIndex === 8 && l.name.startsWith('服装 /')) l.visible = v === 1;
    const data = (v === 0 || v === 2) ? cm.getCompositeImageData(8,ai,0) : mc.getCompositeImageData(8,ai,0);
    assert(data.data.some((n,i)=>i%4===3&&n));
    const tile = createCanvas(32,32); tile.getContext('2d').putImageData(data,0,0);
    vx.fillStyle = v%2 ? '#37343f' : '#eee6ed'; vx.fillRect(v*192,ai*192,192,192); vx.drawImage(tile,v*192,ai*192,192,192);
  }
  rear.visible = acc.visible = true;
  fs.writeFileSync(path.join(out,'分层与混搭检查.png'),variants.toBuffer('image/png'));
  if (process.argv.includes('--publish')) {
    const freshMain = await fetch(url+'main'); assert.equal(freshMain.headers.get('etag'),source.headers.get('etag'),'Main changed; redraw against latest body');
    const saved = await fetch(url+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(candidate)});
    assert(saved.ok,'Publish failed: '+saved.status);
    const back = await fetch(url+id); assert(back.ok); assert.deepEqual(await back.json(),candidate);
    assert.equal((await fetch(url+'main')).headers.get('etag'),source.headers.get('etag'));
    console.log('Saved and API verified:',id);
  }
  console.log('12 idle frames verified:',out);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
