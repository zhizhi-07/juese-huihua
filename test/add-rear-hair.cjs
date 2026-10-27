const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

global.window = global;
global.ImageData = ImageData;
global.Image = Image;
global.document = { createElement() { const c = createCanvas(1, 1); c.style = {}; return c; }, body: { appendChild() {} } };
global.File = class extends Blob { constructor(bytes, name) { super(bytes); this.name = name; } };
global.FileReader = class { async readAsText(f) { this.result = await f.text(); this.onload(); } };

const root = path.resolve(__dirname, '..');
for (const name of ['core', 'history', 'canvas', 'tools', 'spritesheet', 'export', 'api', 'aseprite', 'builtin-packs']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), { filename: name });
}

function toEntry(imgData) {
  const c = createCanvas(imgData.width, imgData.height);
  c.getContext('2d').putImageData(imgData, 0, 0);
  return { width: imgData.width, height: imgData.height, dataURL: c.toDataURL('image/png') };
}

function cloneImageData(src) {
  const dst = new ImageData(src.width, src.height);
  dst.data.set(src.data);
  return dst;
}

function shiftY(src, dy) {
  const dst = new ImageData(src.width, src.height);
  for (let y = 0; y < src.height; y++) {
    const srcY = y - dy;
    if (srcY < 0 || srcY >= src.height) continue;
    for (let x = 0; x < src.width; x++) {
      const s = (srcY * src.width + x) * 4;
      const d = (y * src.width + x) * 4;
      if (src.data[s + 3] > 0) {
        dst.data[d] = src.data[s]; dst.data[d+1] = src.data[s+1];
        dst.data[d+2] = src.data[s+2]; dst.data[d+3] = src.data[s+3];
      }
    }
  }
  return dst;
}

(async () => {
  const jsonStr = fs.readFileSync(path.join(root, 'data/shared-project.json'), 'utf8');
  const exporter = new PE.ExportManager();
  const importRes = await exporter.importProject(new File([jsonStr], 'shared-project.json'));
  const localProj = importRes.project;

  const si = 8;
  const rear02 = localProj.layers.find(l => l.sheetIndex === si && l.name === '头发 / 02 双马尾 / 后发');
  if (!rear02) throw new Error('rear02 not found');

  // 为 03 构建后发帧（克隆 02 后发）
  // 02 后发有 up/down/side 三方向；只需要 idle (si=8) 各 4 帧
  // fi=0,1 正常; fi=2,3 下沉 2 像素（呼吸动画）
  const newFrameData = {};
  for (let ai = 0; ai < 3; ai++) {
    const base = rear02.getFrameData(`${si}_${ai}_0`);
    if (!base) { console.log(`No base frame for ai=${ai}, skipping`); continue; }
    for (let fi = 0; fi < 4; fi++) {
      const key = `${si}_${ai}_${fi}`;
      // fi 0,1: 用原始帧; fi 2,3: 下沉2px
      let src = rear02.getFrameData(key);
      if (!src) {
        // 用 fi=0 基础帧生成
        src = fi < 2 ? cloneImageData(base) : shiftY(base, 2);
      }
      newFrameData[key] = toEntry(src);
    }
  }
  console.log('Built frame keys:', Object.keys(newFrameData));

  // 更新 API
  console.log('Fetching latest project from API...');
  const apiRes = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const etag = apiRes.headers.get('etag');
  const project = await apiRes.json();

  // 找或创建 03 后发图层
  let rearLayer = project.layers.find(l =>
    l.sheetIndex === si && l.name === '头发 / 03 双凹槽齐刘海 / 后发'
  );

  if (!rearLayer) {
    // 找前发图层的位置，在其旁边插入
    const frontIdx = project.layers.findIndex(l =>
      l.sheetIndex === si && l.name === '头发 / 03 双凹槽齐刘海 / 前发'
    );
    rearLayer = {
      sheetIndex: si,
      isGroup: false, parent: null, depth: 0, referenceOnly: false,
      name: '头发 / 03 双凹槽齐刘海 / 后发',
      visible: true, locked: false, opacity: 1,
      frameData: {}
    };
    if (frontIdx >= 0) {
      project.layers.splice(frontIdx, 0, rearLayer); // 插在前发之前（底层渲染）
    } else {
      project.layers.push(rearLayer);
    }
    console.log('Created new rear layer at index', frontIdx);
  } else {
    console.log('Found existing rear layer, updating...');
  }

  rearLayer.visible = true;
  rearLayer.frameData = newFrameData;

  // PUT
  const putRes = await fetch('http://127.0.0.1:8765/api/project?id=main', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': etag },
    body: JSON.stringify(project)
  });
  if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status} ${await putRes.text()}`);
  const putResult = await putRes.json();
  console.log('PUT success, revision:', putResult.revision);

  // 回读验证
  const vRes = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const vProj = await vRes.json();
  const vLayer = vProj.layers.find(l => l.name === '头发 / 03 双凹槽齐刘海 / 后发' && l.sheetIndex === si);
  console.log('Verified rear layer:', vLayer ? `OK, frames=${Object.keys(vLayer.frameData).length}` : 'NOT FOUND');
})().catch(e => { console.error(e); process.exit(1); });
