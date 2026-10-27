const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

async function extractExactPixelArrays() {
  const brImg = await loadImage('test/output/sampled_ref_br.png');
  const canvas = createCanvas(24, 28);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(brImg, 0, 0, 24, 28);
  const d = ctx.getImageData(0, 0, 24, 28).data;

  // 将每个像素聚类为：
  // 0: 空白/背景
  // 1: 黑色描边
  // 2: 浅绿底色
  // 3: 抹茶绿阴影
  // 4: 眼睛/五官/衣服
  // 5: 皮肤
  const grid = [];
  for (let y = 0; y < 28; y++) {
    const row = [];
    for (let x = 0; x < 24; x++) {
      const idx = (y * 24 + x) * 4;
      const r = d[idx], g = d[idx+1], b = d[idx+2];
      if (r > 230 && g > 230 && b > 230) {
        row.push(0); // background
      } else if (r < 60 && g < 60 && b < 60) {
        row.push(1); // black outline
      } else if (g > 150 && g > r * 1.05) {
        row.push(2); // light green base
      } else if (g > 90 && g > r * 1.05) {
        row.push(3); // shadow green
      } else if (r > 200 && g > 200) {
        row.push(5); // skin
      } else {
        row.push(4); // eye / body
      }
    }
    grid.push(row);
  }

  // 打印精准网格
  console.log('Classified 24x28 Grid:');
  const chars = ['  ', '##', 'OO', '..', 'XX', '  '];
  grid.forEach((row, y) => {
    console.log(`${y.toString().padStart(2, '0')}: ${row.map(c => chars[c]).join('')}`);
  });

  fs.writeFileSync('test/output/classified_grid.json', JSON.stringify(grid, null, 2));
}

extractExactPixelArrays().catch(console.error);
