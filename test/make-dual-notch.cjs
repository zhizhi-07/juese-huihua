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

// 原始 02 灰色色阶映射
const OLD_OUTLINE = [119, 119, 119, 255]; // #777
const OLD_SHADOW  = [178, 178, 178, 255]; // #b2b
const OLD_BASE    = [209, 209, 209, 255]; // #d1d
const OLD_LIGHT   = [222, 222, 222, 255]; // #ddd

function isOutline(d, idx) { return d[idx+3] > 0 && d[idx] < 140; }
function isBase(d, idx)    { return d[idx+3] > 0 && d[idx] >= 140; }

// 将一帧灰色像素（原 02 颜色系）直接复制，并修改 y=11,12 区域的凹槽布局
// 原版结构 (y=11, 从 x=0..31):
//   . . . # O O O O O # O # # # # O # # O # # # # O # O O O O # . .
// 凹槽在 x=10..13 和 x=18..21 之间，中间有 x=15..16 是 ## (凹槽分隔线)
// 用户要改：把中间这个 ## 分隔符去掉，变成两个完全分开的凹槽，并且中间加一撮发尖

// 策略：以 02 的帧为基础，只修改 y=10..14 的中间区域像素
// 具体：
// y=11 中间段 x=14..17: 原来是 OO##OO -> 改成 OO##OO (等于不变，原来就是两个凹槽！)
// wait，让我重新读：
// y=11: ...#OOOOO#O####O##O####O#OOOOO#.
// 按位：
// x=3:# x=4..8:OOOOO x=9:#
// x=10:O x=11:# x=12..15:#### x=16:O
// x=17:## -- 中间分隔
// x=18:O x=19..22:#### x=23:#
// x=24:O x=25..29:OOOOO x=30:# 
//
// y=12: ...#OOOOO.#....#..#....#.OOOOO#.
// x=3:# x=4..8:OOOOO x=9:. x=10:# x=11..14:.... x=15:#
// x=16.. x=17:.. (透明中缝)
// x=18..21:.... x=22:# x=23:. x=24..28:OOOOO x=29..30:#
//
// 所以原版已经是两个凹槽！x=11..14 一个凹槽，x=18..21 一个凹槽，中间 x=15..17 是一撮发束尖
//
// 用户要求：中间这一个"凹槽"分成两个 —— 说的是 y=11..12 中间 x=15..17 那一撮"发束分隔"
// 目前是 # | 透明 | 透明 | # 分成了两个透明，中间用 ## 隔着
// 用户想把这个 ## 也去掉，让两个透明区合并成一个大透明？
// 不！用户说"中间这一个凹槽**分**成两个"——说明原来是一个，要变成两个！
//
// 重新理解：用户指的是原版 02 中间 x=11..14 + x=18..21 其实视觉上看像是一个大凹口，
// 因为中间 x=15..16 那一点点 ## 太细了，视觉上感觉只有一个凹槽。
// 用户要：把它明确改成**两个更分明的凹槽**，每个凹槽之间有**清晰的发束分隔**。
//
// 方案：
// y=11: 把中间分隔符从 ## 扩展成 OOOO（三像素发束），让两个凹槽分开更清晰
// y=12: 中间填充 OO 发束底色，而不是 .. 透明
// 同时更改颜色为灰色

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

function shiftY(src, dy) {
  const dst = new ImageData(src.width, src.height);
  for (let y = 0; y < src.height; y++) {
    const srcY = y - dy;
    if (srcY < 0 || srcY >= src.height) continue;
    for (let x = 0; x < src.width; x++) {
      const s = (srcY * src.width + x) * 4;
      const d = (y * src.width + x) * 4;
      if (src.data[s+3] > 0) {
        dst.data[d] = src.data[s]; dst.data[d+1] = src.data[s+1];
        dst.data[d+2] = src.data[s+2]; dst.data[d+3] = src.data[s+3];
      }
    }
  }
  return dst;
}

// 把 02 的帧克隆并做双缺口改造
function makeDualNotchFromFrame(srcFrame) {
  const img = cloneImageData(srcFrame);

  // y=11:
  // 原: x=9:#, x=10:O, x=11:#, x=12..15:OOOO, x=16:O, x=17:#, x=18:O, x=19:#, x=20..23:OOOO, x=24:#, ...
  // 修改成更宽的中间发束：把 x=15..18 都变成 BASE（发束），而凹槽压缩到 x=11..14 和 x=19..22
  // 注意对称 mid = 16.5, 所以 x=15 对称 x=18, x=14 对称 x=19
  
  // y=11: 目标布局（从 x=9 开始）
  // x=9:# x=10:O x=11:# x=12..14:OOO x=15:# x=16:O x=17:O x=18:# x=19..21:OOO x=22:# x=23:O x=24:#
  // 意思：左凹槽 x=12..14，中间发束 x=16..17，右凹槽 x=19..21
  
  // 先把 y=10..14 范围中间段全部清零再重绘
  // y=10 中间段调暗：x=12..14 和 x=18..20 -> SHADOW (凹槽上方过渡暗部)
  for (let x = 12; x <= 14; x++) { setPx(img, x, 10, OLD_SHADOW); setPx(img, 33-x, 10, OLD_SHADOW); }
  // y=10 中间段 x=15..17 保持饱满 BASE
  setPx(img, 15, 10, OLD_BASE); setPx(img, 16, 10, OLD_BASE); setPx(img, 17, 10, OLD_BASE);
  // x=18 对称于 x=15
  setPx(img, 18, 10, OLD_SHADOW);

  // y=11:
  // 左段维持，但描边位置调整：凹槽内移到 x=11, x=15
  // x=9:#, x=10:O, x=11:#  [凹槽开始]  x=12..14:透明预备上沿  x=15:# [凹槽收口]
  setPx(img, 9, 11, OLD_OUTLINE);  // 脸侧发束右描边
  setPx(img, 10, 11, OLD_BASE);    // 脸侧底色
  setPx(img, 11, 11, OLD_OUTLINE); // 凹槽左描边
  // x=12..14 凹槽上沿 -> OUTLINE (描边连续)
  setPx(img, 12, 11, OLD_OUTLINE);
  setPx(img, 13, 11, OLD_OUTLINE);
  setPx(img, 14, 11, OLD_OUTLINE);
  setPx(img, 15, 11, OLD_OUTLINE); // 凹槽右描边

  // 中间发束 x=16..17 = BASE
  setPx(img, 16, 11, OLD_BASE);
  setPx(img, 17, 11, OLD_BASE);

  // 右侧对称
  setPx(img, 18, 11, OLD_OUTLINE); // 右凹槽左描边
  setPx(img, 19, 11, OLD_OUTLINE);
  setPx(img, 20, 11, OLD_OUTLINE);
  setPx(img, 21, 11, OLD_OUTLINE);
  setPx(img, 22, 11, OLD_OUTLINE); // 右凹槽右描边
  setPx(img, 23, 11, OLD_BASE);    // 脸侧底色
  setPx(img, 24, 11, OLD_OUTLINE); // 脸侧发束左描边

  // y=12:
  // 凹槽透明区: x=12..14 透明, 中间发束 x=15..18, 右凹槽 x=19..21 透明
  clearPx(img, 12, 12); clearPx(img, 13, 12); clearPx(img, 14, 12);
  setPx(img, 15, 12, OLD_BASE); // 中间发束底色
  setPx(img, 16, 12, OLD_BASE);
  setPx(img, 17, 12, OLD_BASE);
  setPx(img, 18, 12, OLD_BASE);
  clearPx(img, 19, 12); clearPx(img, 20, 12); clearPx(img, 21, 12);

  // y=13: 中间发束底部垂下
  setPx(img, 15, 13, OLD_OUTLINE); setPx(img, 16, 13, OLD_OUTLINE);
  setPx(img, 17, 13, OLD_OUTLINE); setPx(img, 18, 13, OLD_OUTLINE);

  return img;
}

(async () => {
  const jsonStr = fs.readFileSync(path.join(root, 'data/shared-project.json'), 'utf8');
  const exporter = new PE.ExportManager();
  const res = await exporter.importProject(new File([jsonStr], 'shared-project.json'));
  const project = res.project;

  const si = 8;
  const front02 = project.layers.find(l => l.sheetIndex === si && l.name === '头发 / 02 齐刘海 / 前发');

  // 预览 down 方向改造前后
  const origDown = front02.getFrameData(`${si}_1_0`);
  const modDown = makeDualNotchFromFrame(origDown);

  function saveImg(imgData, filename, scale = 8) {
    const c = createCanvas(imgData.width, imgData.height);
    c.getContext('2d').putImageData(imgData, 0, 0);
    const big = createCanvas(imgData.width * scale, imgData.height * scale);
    const bctx = big.getContext('2d');
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(c, 0, 0, imgData.width * scale, imgData.height * scale);
    fs.writeFileSync(filename, big.toBuffer('image/png'));
  }

  saveImg(origDown, 'test/output/dual_notch_orig.png');
  saveImg(modDown, 'test/output/dual_notch_mod.png');

  // 打印 y=10..14 的像素图
  console.log('=== MODIFIED y=10..14 ===');
  for (let y = 10; y <= 14; y++) {
    let row = `y=${y}: `;
    for (let x = 0; x < 32; x++) {
      const idx = (y * 32 + x) * 4;
      const a = modDown.data[idx + 3];
      if (a === 0) row += '.';
      else if (modDown.data[idx] < 140) row += '#';
      else row += 'O';
    }
    console.log(row);
  }

  console.log('Saved test/output/dual_notch_orig.png and dual_notch_mod.png');
})().catch(console.error);
