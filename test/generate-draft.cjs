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

// 颜色定义
const C_OUTLINE = [32, 51, 33, 255];   // 深墨绿描边 #203321
const C_SHADOW  = [140, 168, 100, 255]; // 抹茶绿暗部 #8ca864
const C_BASE    = [196, 228, 176, 255]; // 嫩草绿底色 #c4e4b0
const C_LIGHT   = [212, 237, 196, 255]; // 浅柔高光 #d4edc4
const C_TRANS   = [0, 0, 0, 0];

// 紫色发箍颜色
const C_ACC_OUT = [72, 40, 96, 255];
const C_ACC_MID = [168, 116, 196, 255];
const C_ACC_HI  = [200, 155, 225, 255];

function createEmpty(w = 32, h = 32) {
  return new ImageData(w, h);
}

function setPx(img, x, y, c) {
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) return;
  const idx = (y * img.width + x) * 4;
  img.data[idx] = c[0];
  img.data[idx+1] = c[1];
  img.data[idx+2] = c[2];
  img.data[idx+3] = c[3];
}

function drawSymmetric(img, y, xStart, xEnd, c) {
  for (let x = xStart; x <= xEnd; x++) {
    setPx(img, x, y, c);
    // 对称轴 16.5: 对应对称点为 33 - 1 - x = 32 - x
    const symX = 33 - x; // wait: 16 -> 17, 15 -> 18, so symX = 33 - x
    setPx(img, symX, y, c);
  }
}

// 设计前发 (碎拱齐刘海 + 脸侧发束 + 饱满发帽)
function generateFrontHair() {
  const img = createEmpty(32, 32);

  // 1. 发帽轮廓与填充
  // y=0: x=[11, 22] 顶部描边 (对称: 11..16 和 17..22)
  for (let x = 11; x <= 22; x++) setPx(img, x, 0, C_OUTLINE);

  // y=1: 描边 x=9,10, 23,24; 内部底色
  setPx(img, 9, 1, C_OUTLINE); setPx(img, 10, 1, C_OUTLINE);
  setPx(img, 23, 1, C_OUTLINE); setPx(img, 24, 1, C_OUTLINE);
  for (let x = 11; x <= 22; x++) setPx(img, x, 1, C_BASE);

  // y=2: 描边 x=8, 25
  setPx(img, 8, 2, C_OUTLINE); setPx(img, 25, 2, C_OUTLINE);
  for (let x = 9; x <= 24; x++) setPx(img, x, 2, C_BASE);

  // y=3: 描边 x=7, 26
  setPx(img, 7, 3, C_OUTLINE); setPx(img, 26, 3, C_OUTLINE);
  for (let x = 8; x <= 25; x++) setPx(img, x, 3, C_BASE);

  // y=4: 描边 x=6, 27; 内部有头顶微暗流线 (x=13, 20)
  setPx(img, 6, 4, C_OUTLINE); setPx(img, 27, 4, C_OUTLINE);
  for (let x = 7; x <= 26; x++) setPx(img, x, 4, C_BASE);
  setPx(img, 13, 4, C_SHADOW); setPx(img, 20, 4, C_SHADOW);

  // y=5: 描边 x=5, 28; 头顶暗线继续
  setPx(img, 5, 5, C_OUTLINE); setPx(img, 28, 5, C_OUTLINE);
  for (let x = 6; x <= 27; x++) setPx(img, x, 5, C_BASE);
  setPx(img, 12, 5, C_SHADOW); setPx(img, 21, 5, C_SHADOW);

  // y=6: 描边 x=5, 28
  setPx(img, 5, 6, C_OUTLINE); setPx(img, 28, 6, C_OUTLINE);
  for (let x = 6; x <= 27; x++) setPx(img, x, 6, C_BASE);
  setPx(img, 12, 6, C_SHADOW); setPx(img, 21, 6, C_SHADOW);

  // y=7: 描边 x=4, 29
  setPx(img, 4, 7, C_OUTLINE); setPx(img, 29, 7, C_OUTLINE);
  for (let x = 5; x <= 28; x++) setPx(img, x, 7, C_BASE);

  // y=8: 描边 x=4, 29
  setPx(img, 4, 8, C_OUTLINE); setPx(img, 29, 8, C_OUTLINE);
  for (let x = 5; x <= 28; x++) setPx(img, x, 8, C_BASE);

  // y=9: 描边 x=3, 30. 开始出现脸侧发与刘海过渡
  setPx(img, 3, 9, C_OUTLINE); setPx(img, 30, 9, C_OUTLINE);
  for (let x = 4; x <= 29; x++) setPx(img, x, 9, C_BASE);

  // y=10: 刘海下缘成形
  // 中间小拱起：x=16, 17 是描边上沿；两侧 x=14~15 和 18~19 向下突出一缕发尖
  setPx(img, 3, 10, C_OUTLINE); setPx(img, 30, 10, C_OUTLINE);
  for (let x = 4; x <= 29; x++) setPx(img, x, 10, C_BASE);
  // 中间拱起处的暗部过渡
  setPx(img, 16, 10, C_SHADOW); setPx(img, 17, 10, C_SHADOW);

  // y=11: 刘海主下缘
  // 中间拱起露出额头: x=16, 17 是空！
  // x=16, 17 在 y=10 是描边，在 y=11 是透明以露出额头！
  setPx(img, 3, 11, C_OUTLINE); setPx(img, 30, 11, C_OUTLINE);
  // 脸侧头发 x=4..7
  for (let x = 4; x <= 7; x++) setPx(img, x, 11, C_BASE);
  // 左侧齐刘海部分 x=8..15
  for (let x = 8; x <= 13; x++) setPx(img, x, 11, C_BASE);
  // 眉心发尖 x=14, 15
  setPx(img, 14, 11, C_BASE); setPx(img, 15, 11, C_BASE);
  // 中间分缝倒V: x=16, 17 空
  // 右侧对称
  setPx(img, 18, 11, C_BASE); setPx(img, 19, 11, C_BASE);
  for (let x = 20; x <= 25; x++) setPx(img, x, 11, C_BASE);
  for (let x = 26; x <= 29; x++) setPx(img, x, 11, C_BASE);

  // y=11 的下缘描边：
  // 在眼睛上方的齐刘海下缘（y=12）
  // y=12: 
  // 脸侧发束继续：x=3 描边, x=4..6 底色, x=7 内部描边
  setPx(img, 3, 12, C_OUTLINE);
  setPx(img, 4, 12, C_BASE); setPx(img, 5, 12, C_BASE); setPx(img, 6, 12, C_BASE);
  setPx(img, 7, 12, C_OUTLINE);

  // 眼睛上方齐刘海的底边描边：
  setPx(img, 8, 12, C_OUTLINE);
  setPx(img, 9, 12, C_OUTLINE);
  setPx(img, 10, 12, C_OUTLINE);
  setPx(img, 11, 12, C_OUTLINE);
  setPx(img, 12, 12, C_OUTLINE);
  setPx(img, 13, 12, C_OUTLINE);

  // 眉心下垂的一小缕发尖：x=14, 15 向下垂一格！
  setPx(img, 14, 12, C_BASE);
  setPx(img, 15, 12, C_SHADOW);
  setPx(img, 14, 13, C_OUTLINE); setPx(img, 15, 13, C_OUTLINE); // 尖端描边

  // 中间倒V内沿描边：
  setPx(img, 16, 11, C_OUTLINE); setPx(img, 17, 11, C_OUTLINE);

  // 右侧对称眉心发尖：
  setPx(img, 18, 12, C_SHADOW);
  setPx(img, 19, 12, C_BASE);
  setPx(img, 18, 13, C_OUTLINE); setPx(img, 19, 13, C_OUTLINE);

  // 右侧齐刘海下缘描边：
  setPx(img, 20, 12, C_OUTLINE);
  setPx(img, 21, 12, C_OUTLINE);
  setPx(img, 22, 12, C_OUTLINE);
  setPx(img, 23, 12, C_OUTLINE);
  setPx(img, 24, 12, C_OUTLINE);
  setPx(img, 25, 12, C_OUTLINE);

  // 右侧脸侧发束
  setPx(img, 26, 12, C_OUTLINE);
  setPx(img, 27, 12, C_BASE); setPx(img, 28, 12, C_BASE); setPx(img, 29, 12, C_BASE);
  setPx(img, 30, 12, C_OUTLINE);

  // y=13 到 y=20: 脸侧自然垂发（前发重要部分）
  // 保持脸侧发束饱满完整，不露头皮
  for (let y = 13; y <= 18; y++) {
    // 左侧发束
    setPx(img, 3, y, C_OUTLINE);
    setPx(img, 4, y, C_BASE);
    setPx(img, 5, y, C_BASE);
    setPx(img, 6, y, y >= 16 ? C_SHADOW : C_BASE);
    setPx(img, 7, y, C_OUTLINE);

    // 右侧发束
    setPx(img, 26, y, C_OUTLINE);
    setPx(img, 27, y, y >= 16 ? C_SHADOW : C_BASE);
    setPx(img, 28, y, C_BASE);
    setPx(img, 29, y, C_BASE);
    setPx(img, 30, y, C_OUTLINE);
  }

  // y=19: 发束向内微收收尾
  setPx(img, 3, 19, C_OUTLINE);
  setPx(img, 4, 19, C_SHADOW);
  setPx(img, 5, 19, C_BASE);
  setPx(img, 6, 19, C_OUTLINE);

  setPx(img, 27, 19, C_OUTLINE);
  setPx(img, 28, 19, C_BASE);
  setPx(img, 29, 19, C_SHADOW);
  setPx(img, 30, 19, C_OUTLINE);

  // y=20: 尖端
  setPx(img, 4, 20, C_OUTLINE);
  setPx(img, 5, 20, C_OUTLINE);

  setPx(img, 28, 20, C_OUTLINE);
  setPx(img, 29, 20, C_OUTLINE);

  return img;
}

// 设计长披发后发（参考图右下）
function generateRearHair() {
  const img = createEmpty(32, 32);

  // 后发正面观：在头后展开，显露在脸侧后方及肩膀两侧，发尾俏皮外翘
  // y=11 到 y=16: 在脸侧外侧稍稍露出后发饱满弧线 (x=2, 31)
  for (let y = 11; y <= 16; y++) {
    setPx(img, 2, y, C_OUTLINE);
    setPx(img, 31, y, C_OUTLINE);
    // 补齐被前发遮挡的完整后发底图（严格遵守前发后发独立混搭规范）
    for (let x = 3; x <= 7; x++) setPx(img, x, y, C_SHADOW);
    for (let x = 26; x <= 30; x++) setPx(img, x, y, C_SHADOW);
  }

  // y=17 到 y=21: 肩膀处后发自然散开，比前发更宽
  for (let y = 17; y <= 21; y++) {
    setPx(img, 1, y, C_OUTLINE);
    setPx(img, 2, y, C_BASE);
    setPx(img, 3, y, C_BASE);
    for (let x = 4; x <= 8; x++) setPx(img, x, y, C_SHADOW);

    for (let x = 25; x <= 29; x++) setPx(img, x, y, C_SHADOW);
    setPx(img, 30, y, C_BASE);
    setPx(img, 31, y, C_BASE);
    setPx(img, 32 - 1, y, C_OUTLINE); // x=31 is outline, x=32-1
  }

  // y=22 到 y=26: 长发垂至胸前两侧，发尾向外微卷外翘！
  // 左侧发尾：
  // y=22:
  setPx(img, 1, 22, C_OUTLINE);
  setPx(img, 2, 22, C_BASE); setPx(img, 3, 22, C_BASE); setPx(img, 4, 22, C_SHADOW); setPx(img, 5, 22, C_OUTLINE);
  // 右侧发尾:
  setPx(img, 28, 22, C_OUTLINE); setPx(img, 29, 22, C_SHADOW); setPx(img, 30, 22, C_BASE); setPx(img, 31, 22, C_BASE);
  // x=31 outline at outer edge:
  setPx(img, 31, 22, C_OUTLINE); setPx(img, 30, 22, C_BASE);

  // y=23: 向外展
  setPx(img, 0, 23, C_OUTLINE);
  setPx(img, 1, 23, C_BASE); setPx(img, 2, 23, C_BASE); setPx(img, 3, 23, C_SHADOW); setPx(img, 4, 23, C_OUTLINE);

  setPx(img, 29, 23, C_OUTLINE); setPx(img, 30, 23, C_SHADOW); setPx(img, 31, 23, C_BASE); // boundary at 31

  // y=24: 发尾外翘尖
  setPx(img, 0, 24, C_OUTLINE);
  setPx(img, 1, 24, C_BASE); setPx(img, 2, 24, C_SHADOW); setPx(img, 3, 24, C_OUTLINE);

  setPx(img, 30, 24, C_OUTLINE); setPx(img, 31, 24, C_OUTLINE);

  // y=25: 收尾描边
  setPx(img, 1, 25, C_OUTLINE); setPx(img, 2, 25, C_OUTLINE);

  // 后脑在颈部后方的闭合底图 (y=18..25 脖子后方)：
  for (let y = 18; y <= 25; y++) {
    for (let x = 9; x <= 24; x++) {
      setPx(img, x, y, C_SHADOW); // 后脑遮挡底图
    }
  }

  return img;
}

// 紫色发箍饰品（参考图左下）
function generateHeadband() {
  const img = createEmpty(32, 32);
  // 位于头顶发箍弧线 y=3..4
  // 宽带发箍
  for (let x = 8; x <= 25; x++) {
    setPx(img, x, 3, C_ACC_HI);
    setPx(img, x, 4, C_ACC_MID);
  }
  // 发箍两侧翘起的蝴蝶结端带
  setPx(img, 6, 2, C_ACC_MID); setPx(img, 7, 2, C_ACC_HI);
  setPx(img, 5, 3, C_ACC_MID); setPx(img, 6, 3, C_ACC_HI);
  setPx(img, 5, 4, C_ACC_OUT);

  setPx(img, 26, 2, C_ACC_HI); setPx(img, 27, 2, C_ACC_MID);
  setPx(img, 27, 3, C_ACC_HI); setPx(img, 28, 3, C_ACC_MID);
  setPx(img, 28, 4, C_ACC_OUT);

  return img;
}

const front = generateFrontHair();
const rear = generateRearHair();
const headband = generateHeadband();

// 导出单张检查
function saveImg(imgData, filename, scale = 8) {
  const c = createCanvas(imgData.width, imgData.height);
  c.getContext('2d').putImageData(imgData, 0, 0);
  const big = createCanvas(imgData.width * scale, imgData.height * scale);
  const bctx = big.getContext('2d');
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(c, 0, 0, imgData.width * scale, imgData.height * scale);
  fs.writeFileSync(filename, big.toBuffer('image/png'));
}

saveImg(front, 'test/output/draft_front_hair.png');
saveImg(rear, 'test/output/draft_rear_hair.png');
saveImg(headband, 'test/output/draft_headband.png');
console.log('Saved draft layers.');

module.exports = { generateFrontHair, generateRearHair, generateHeadband };
