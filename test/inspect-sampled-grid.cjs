const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

async function inspectSampledGrid() {
  const img = await loadImage('test/output/sampled_ref_br.png');
  // img is 24x28 (upscaled 8x to 192x224)
  // Let's load the 1x pixel canvas
  const canvas = createCanvas(24, 28);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 24, 28);
  const d = ctx.getImageData(0, 0, 24, 28).data;

  console.log('Sampled reference 24x28 ASCII map:');
  for (let y = 0; y < 28; y++) {
    let line = '';
    for (let x = 0; x < 24; x++) {
      const idx = (y * 24 + x) * 4;
      const r = d[idx], g = d[idx+1], b = d[idx+2];
      if (r < 50 && g < 50 && b < 50) {
        line += '##'; // black outline
      } else if (g > 150 && g > r * 1.05) {
        line += '..'; // green hair light
      } else if (g > 100 && g > r * 1.05) {
        line += ';;'; // green hair shadow
      } else if (r > 200 && b > 150) {
        line += '%%'; // eye or skin pink
      } else if (r > 200 && g > 200) {
        line += '  '; // skin white
      } else {
        line += '??';
      }
    }
    console.log(`${y.toString().padStart(2, '0')}: ${line}`);
  }
}

inspectSampledGrid().catch(console.error);
