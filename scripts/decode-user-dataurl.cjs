const fs = require('fs');
const { decode } = require('./png.cjs');

// Let's decode from user-current-api.json (saved right after user spoke)
const data = JSON.parse(fs.readFileSync('自检记录/炭黑双丸子发型-20261027/user-current-api.json', 'utf8'));

for (const layer of data.layers) {
  if (layer.name.includes('前发') || layer.name.includes('后发')) {
    const fd = layer.frameData['8_1_0'];
    if (fd && fd.dataURL) {
      const base64 = fd.dataURL.split(',')[1];
      const buf = Buffer.from(base64, 'base64');
      const png = decode(buf);
      console.log(`Layer: ${layer.name} 8_1_0 non-zero pixels:`);
      for (let y = 0; y < 32; y++) {
        let line = '';
        for (let x = 0; x < 32; x++) {
          const idx = (y * 32 + x) * 4;
          const a = png.data[idx+3];
          if (a === 0) line += '.';
          else {
            const r = png.data[idx];
            if (r < 30) line += '#';
            else if (r > 90) line += 'H';
            else if (r > 60) line += 'B';
            else line += 'S';
          }
        }
        if (line.replace(/\./g, '').length > 0) {
          console.log(`${y.toString().padStart(2, ' ')}: ${line}`);
        }
      }
      fs.writeFileSync(`自检记录/炭黑双丸子发型-20261027/user-saved-${layer.name.endsWith('前发') ? 'front' : 'rear'}.png`, buf);
    }
  }
}
