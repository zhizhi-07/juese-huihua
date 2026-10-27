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

const OLD_OUTLINE = [119, 119, 119, 255];
const OLD_BASE    = [209, 209, 209, 255];
const OLD_SHADOW  = [178, 178, 178, 255];

function cloneImageData(src) {
  const dst = new ImageData(src.width, src.height);
  dst.data.set(src.data);
  return dst;
}

function setPx(img, x, y, c) {
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = c[0]; img.data[i+1] = c[1]; img.data[i+2] = c[2]; img.data[i+3] = c[3];
}
function clearPx(img, x, y) {
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = 0; img.data[i+1] = 0; img.data[i+2] = 0; img.data[i+3] = 0;
}

// 对 down 方向帧：把中间原先一个分隔线改成宽发束，形成清晰两个凹槽
function applyDualNotchDown(srcFrame) {
  const img = cloneImageData(srcFrame);
  const w = img.width;

  // 找 y=11 和 y=12 的实际凹槽 x 区间（按帧位置可能因呼吸偏移）
  // 策略：找 y=11 行第一个 outline 像素后面连续 base 像素，再下一个 outline = 凹槽段
  // 简化：直接用固定偏移，但先找 y=11 行上 x=3 的 outline 描边位置来定基准
  let baseX = 3;
  for (let x = 0; x < w; x++) {
    const idx = (11 * w + x) * 4;
    if (img.data[idx+3] > 0 && img.data[idx] < 140) { baseX = x; break; }
  }
  // baseX 是左侧外描边
  // 原来: baseX, +1:O, +2:O, +3:O, +4:O, +5:O, +6:#, +7:O, +8..11:#, +12:O, +13:#, +14:O, +15..18:#, ...
  // 直接用固定 x 坐标（原版布局 w=32）:
  // 内凹槽区域 (down): 左凹 x=12..14, 中分 x=15..17, 右凹 x=19..21 (对称 mid=16.5)
  // 改成: 左凹 x=11..14 保留, 中间发束 x=15..18, 右凹 x=19..22

  // y=10: 凹槽上方暗部，中间发束加宽
  setPx(img, 15, 10, OLD_SHADOW);
  setPx(img, 16, 10, OLD_SHADOW);
  setPx(img, 17, 10, OLD_SHADOW);
  setPx(img, 18, 10, OLD_SHADOW);

  // y=11: 调整凹槽描边结构
  // 左凹槽: x=11:#, x=12..14:#, x=15:#  (凹槽宽4)
  setPx(img, 11, 11, OLD_OUTLINE);
  setPx(img, 12, 11, OLD_OUTLINE);
  setPx(img, 13, 11, OLD_OUTLINE);
  setPx(img, 14, 11, OLD_OUTLINE);
  setPx(img, 15, 11, OLD_OUTLINE);
  // 中间发束: x=16,17 BASE
  setPx(img, 16, 11, OLD_BASE);
  setPx(img, 17, 11, OLD_BASE);
  // 右凹槽: 对称 x=18,19,20,21,22
  setPx(img, 18, 11, OLD_OUTLINE);
  setPx(img, 19, 11, OLD_OUTLINE);
  setPx(img, 20, 11, OLD_OUTLINE);
  setPx(img, 21, 11, OLD_OUTLINE);
  setPx(img, 22, 11, OLD_OUTLINE);

  // y=12: 凹槽透明，中间发束
  clearPx(img, 12, 12); clearPx(img, 13, 12); clearPx(img, 14, 12);
  setPx(img, 15, 12, OLD_BASE);
  setPx(img, 16, 12, OLD_BASE);
  setPx(img, 17, 12, OLD_BASE);
  setPx(img, 18, 12, OLD_BASE);
  clearPx(img, 19, 12); clearPx(img, 20, 12); clearPx(img, 21, 12);

  // y=13: 中间发束底部收口描边
  clearPx(img, 12, 13); clearPx(img, 13, 13); clearPx(img, 14, 13);
  setPx(img, 15, 13, OLD_OUTLINE);
  setPx(img, 16, 13, OLD_OUTLINE);
  setPx(img, 17, 13, OLD_OUTLINE);
  setPx(img, 18, 13, OLD_OUTLINE);
  clearPx(img, 19, 13); clearPx(img, 20, 13); clearPx(img, 21, 13);

  return img;
}

function toEntry(imgData) {
  const c = createCanvas(imgData.width, imgData.height);
  c.getContext('2d').putImageData(imgData, 0, 0);
  return { width: imgData.width, height: imgData.height, dataURL: c.toDataURL('image/png') };
}

(async () => {
  console.log('Fetching latest project...');
  const res = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const etag = res.headers.get('etag');
  const project = await res.json();

  // 从本地 JSON 加载用于读取 02 像素数据
  const jsonStr = fs.readFileSync(path.join(root, 'data/shared-project.json'), 'utf8');
  const exporter = new PE.ExportManager();
  const importRes = await exporter.importProject(new File([jsonStr], 'shared-project.json'));
  const localProj = importRes.project;

  const si = 8;
  const front02 = localProj.layers.find(l => l.sheetIndex === si && l.name === '头发 / 02 齐刘海 / 前发');

  // 对 down(ai=1) 方向全部 4 帧做双凹槽变换；side(ai=0) 和 up(ai=2) 直接用 02 的数据（只改颜色不改结构）
  const newFrameData = {};
  for (let ai = 0; ai < 3; ai++) {
    for (let fi = 0; fi < 4; fi++) {
      const key = `${si}_${ai}_${fi}`;
      const src = front02.getFrameData(key);
      if (!src) continue;
      let out;
      if (ai === 1) {
        // down: 应用双凹槽变换
        out = applyDualNotchDown(src);
      } else {
        // side/up: 直接克隆（颜色本来就是灰色）
        out = cloneImageData(src);
      }
      newFrameData[key] = toEntry(out);
    }
  }

  // 更新 project 中的 03 前发图层
  let frontLayer = project.layers.find(l => l.sheetIndex === si && (
    l.name === '头发 / 03 双缺口齐刘海 / 前发' || 
    l.name === '头发 / 03 碎齐刘海 / 前发'
  ));

  if (!frontLayer) {
    frontLayer = {
      sheetIndex: si,
      isGroup: false, parent: null, depth: 0, referenceOnly: false,
      name: '头发 / 03 双凹槽齐刘海 / 前发',
      visible: true, locked: false, opacity: 1,
      frameData: {}
    };
    project.layers.push(frontLayer);
  }
  frontLayer.name = '头发 / 03 双凹槽齐刘海 / 前发';
  frontLayer.visible = true;
  frontLayer.frameData = newFrameData;

  // 旧 02 齐刘海隐藏
  const old02 = project.layers.find(l => l.sheetIndex === si && l.name === '头发 / 02 齐刘海 / 前发');
  if (old02) old02.visible = false;

  console.log('Sending PUT...');
  const putRes = await fetch('http://127.0.0.1:8765/api/project?id=main', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Pixel-Editor': '1', 'If-Match': etag },
    body: JSON.stringify(project)
  });
  if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status} ${await putRes.text()}`);
  const putResult = await putRes.json();
  console.log('PUT success:', putResult.revision);

  // 回读验证
  const vRes = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const vProj = await vRes.json();
  const vLayer = vProj.layers.find(l => l.name === '头发 / 03 双凹槽齐刘海 / 前发' && l.sheetIndex === si);
  if (!vLayer) throw new Error('Layer not found in API response!');
  console.log('ALL PASS: layer verified, frameData keys:', Object.keys(vLayer.frameData).length);
})().catch(e => { console.error(e); process.exit(1); });
