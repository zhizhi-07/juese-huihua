const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

global.window = global; global.Image = Image; global.ImageData = ImageData;
global.document = { createElement() { const c = createCanvas(1,1); c.style={}; return c; }, body: { appendChild(){} } };
global.File = class extends Blob { constructor(b,n){super(b);this.name=n;} };
global.FileReader = class { async readAsText(f){this.result=await f.text();this.onload();} };

for (const name of ['core','history','canvas','tools','spritesheet','export','animation']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', name + '.js'), 'utf8'));
}

async function inspectHead() {
  const exporter = new PE.ExportManager();
  const text = fs.readFileSync('data/shared-project.json', 'utf8');
  const { project } = await exporter.importProject(new File([text], 'shared.json'));
  const headLayers = project.layers.filter(l => l.sheetIndex === 8 && l.name === 'head');
  console.log('Sheet 8 head layers count:', headLayers.length);

  const sheet = project.spriteSheets[8];
  console.log('Sheet 8 name:', sheet?.name);
  console.log('Sheet 8 actions:', sheet?.actions?.map(a => a.name));

  for (let ai = 0; ai < 3; ai++) {
    for (const headLayer of headLayers) {
      for (let fi = 0; fi < 4; fi++) {
        const fd = headLayer.frameData.get(`8_${ai}_${fi}`);
        if (!fd) continue;
        let minX = 32, maxX = 0, minY = 32, maxY = 0, count = 0;
        for (let y = 0; y < 32; y++) {
          for (let x = 0; x < 32; x++) {
            if (fd.data[(y * 32 + x) * 4 + 3] > 0) {
              minX = Math.min(minX, x); maxX = Math.max(maxX, x);
              minY = Math.min(minY, y); maxY = Math.max(maxY, y);
              count++;
            }
          }
        }
        if (count > 0) {
          const parentLayer = project.layers[headLayer.parent];
          console.log(`Action ${ai} (${sheet.actions[ai].name}) frame ${fi} [parent: ${parentLayer?.name}]: head bbox x=[${minX}, ${maxX}] (w=${maxX-minX+1}, mid=${((minX+maxX)/2).toFixed(1)}), y=[${minY}, ${maxY}] (h=${maxY-minY+1})`);
        }
      }
    }
  }
}
inspectHead().catch(console.error);
