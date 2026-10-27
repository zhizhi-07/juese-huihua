const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '自检记录/炭黑双丸子发型-20261027');
fs.mkdirSync(out, { recursive: true });

// Setup browser globals
global.window = global; global.ImageData = ImageData; global.Image = Image;
global.document = { createElement() { const c = createCanvas(1, 1); c.style = {}; return c; }, body: { appendChild() {} } };
global.File = class extends Blob { constructor(b, n) { super(b); this.name = n; } };
global.FileReader = class { async readAsText(f) { this.result = await f.text(); this.onload(); } };

for (const n of ['core', 'history', 'canvas', 'tools', 'spritesheet', 'export', 'animation']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, 'js', n + '.js'), 'utf8'));
}

const P = {
  '#': '#18181a', // 描边深黑
  'B': '#46454d', // 底色炭黑灰
  'S': '#34333b', // 阴影
  'H': '#6a6875', // 刘海高光
};

// 1. EXACT USER FRONT (32x32)
const FRONT_FULL = [
  /*  0 */ "......#..................#......",
  /*  1 */ ".....###....########....###.....",
  /*  2 */ "....#BBB#.##BBBBBBBB##.#BBB#....",
  /*  3 */ "...#BBBS#BBBBSSBBSSBBBB#SBBB#...",
  /*  4 */ "...#BBB#BBBBBBSSSSBBBBBB#BBB#...",
  /*  5 */ "...#BB#BBBBBBBSBBSBBBBBBB#BB#...",
  /*  6 */ "....##BBBBBBBBBBBBBBBBBBBB##....",
  /*  7 */ ".....#BBBBBBBSHSHHSBBBBBBB#.....",
  /*  8 */ ".....#BBBBBBBSBBBBSBBBBBBB#.....",
  /*  9 */ ".....#BBBBBBBSBBBBSBBBBBBB#.....",
  /* 10 */ ".....#BBBBBBBSBBBBSBBBBBBB#.....",
  /* 11 */ ".....#BBBSS#S#SSSS#S#SSBBB#.....",
  /* 12 */ ".....#BB#..............#BB#.....",
  /* 13 */ ".....#BB#..............#BB#.....",
  /* 14 */ ".....#BB#..............#BB#.....",
  /* 15 */ ".....#BB#..............#BB#.....",
  /* 16 */ ".....#BB#..............#BB#.....",
  /* 17 */ "......##................##......",
  /* 18 */ "................................",
  /* 19 */ "................................",
  /* 20 */ "................................",
  /* 21 */ "................................",
  /* 22 */ "................................",
  /* 23 */ "................................",
  /* 24 */ "................................",
  /* 25 */ "................................",
  /* 26 */ "................................",
  /* 27 */ "................................",
  /* 28 */ "................................",
  /* 29 */ "................................",
  /* 30 */ "................................",
  /* 31 */ "................................",
];

// 2. BACK (up): "背面的话其实就是前面的形状至少盖住后脑勺"
// Completely identical buns and top shape as FRONT_FULL,
// but the center face opening (y=7..15, x=6..25) is fully filled with hair to cover back of head.
const BACK_FULL = [
  /*  0 */ "......#..................#......",
  /*  1 */ ".....###....########....###.....",
  /*  2 */ "....#BBB#.##BBBBBBBB##.#BBB#....",
  /*  3 */ "...#BBBS#BBBBSSBBSSBBBB#SBBB#...",
  /*  4 */ "...#BBB#BBBBBBSSSSBBBBBB#BBB#...",
  /*  5 */ "...#BB#BBBBBBBSBBSBBBBBBB#BB#...",
  /*  6 */ "....##BBBBBBBBBBBBBBBBBBBB##....",
  /*  7 */ ".....#BBBBBBBBBBBBBBBBBBBB#.....",
  /*  8 */ ".....#BBBBBBBBSSBBBBBBBBBB#.....",
  /*  9 */ ".....#BBBBBBBBSSBBBBBBBBBB#.....",
  /* 10 */ ".....#BBBBBBBBBBBBBBBBBBBB#.....",
  /* 11 */ ".....#BBBBBBBBBBBBBBBBBBBB#.....",
  /* 12 */ ".....#BBBBBBBBBBBBBBBBBBBB#.....",
  /* 13 */ ".....#BBBBBBBBBBBBBBBBBBBB#.....",
  /* 14 */ ".....#BBBBBBBBBBBBBBBBBBBB#.....",
  /* 15 */ "......####################......",
  /* 16 */ "................................",
  /* 17 */ "................................",
  /* 18 */ "................................",
  /* 19 */ "................................",
  /* 20 */ "................................",
  /* 21 */ "................................",
  /* 22 */ "................................",
  /* 23 */ "................................",
  /* 24 */ "................................",
  /* 25 */ "................................",
  /* 26 */ "................................",
  /* 27 */ "................................",
  /* 28 */ "................................",
  /* 29 */ "................................",
  /* 30 */ "................................",
  /* 31 */ "................................",
];

// 3. SIDE (side): matching buns and full back-head coverage
const SIDE_FRONT = [
  /*  0 */ "................................",
  /*  1 */ "..........########..............",
  /*  2 */ ".........#BBBBBBBB#.............",
  /*  3 */ "........#BBBSSSSSBBO............",
  /*  4 */ ".......#BBSSBBSSSBBO............",
  /*  5 */ "......#BBBBBBSBBBBBO............",
  /*  6 */ ".....#BBBBBBBBBBBBBO............",
  /*  7 */ "....#BBBBBBBSHSHHSBO............",
  /*  8 */ "...#BBBBBBBSBBBBBBO.............",
  /*  9 */ "...#BBBBBBBSBBBBBBO.............",
  /* 10 */ "...#BBBBBBBSBBBO................",
  /* 11 */ "...#BBBSS.SSSSO.................",
  /* 12 */ "...#BB#.........................",
  /* 13 */ "...#BB#.........................",
  /* 14 */ "...#BB#.........................",
  /* 15 */ "...#BB#.........................",
  /* 16 */ "....##..........................",
  /* 17 */ "................................",
];

const SIDE_REAR = [
  /*  0 */ "...................#............",
  /*  1 */ ".....#.........#########........",
  /*  2 */ "....###.......#BBBBBBBBB#.......",
  /*  3 */ "...#BBB#.....#BBSSSSBBBBB#......",
  /*  4 */ "...#BBBS#....#BBBBSSBBBBB#......",
  /*  5 */ "...#BBB#....#BBBBBSSBBBBB#......",
  /*  6 */ "...#BB#.....#BBBBBBBBBBBB#......",
  /*  7 */ "....##.....#BBBBBBBBBBBBB#......",
  /*  8 */ "..........#BBBBBBSSBBBBBB#......",
  /*  9 */ "..........#BBBBBBSSBBBBBB#......",
  /* 10 */ "..........#BBBBBBBBBBBBBB#......",
  /* 11 */ "..........#BBBBBBBBBBBBBB#......",
  /* 12 */ "..........#BBBBBBBBBBBBBB#......",
  /* 13 */ "...........#BBBBBBBBBBBB#.......",
  /* 14 */ "............############........",
  /* 15 */ "................................",
];

function gridToImageData(grid, dy = 0) {
  const c = createCanvas(32, 32);
  const ctx = c.getContext('2d');
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    const targetY = y + dy;
    if (targetY < 0 || targetY >= 32) continue;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = P[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, targetY, 1, 1);
      }
    }
  }
  return ctx.getImageData(0, 0, 32, 32);
}

// Front Hair: bangs and side locks (front cap base)
function getFrontHair(ai, fi) {
  if (ai === 2) {
    return createCanvas(32, 32).getContext('2d').getImageData(0, 0, 32, 32);
  }
  const dy = (fi === 2 || fi === 3) ? 2 : 0;
  if (ai === 0) return gridToImageData(SIDE_FRONT, dy);

  // Front view: exclude buns on sides (x <= 7 && y <= 6, or x >= 24 && y <= 6)
  const grid = FRONT_FULL.map((row, y) => {
    return row.split('').map((ch, x) => {
      if (y <= 6 && (x <= 7 || x >= 24)) return '.';
      return ch;
    }).join('');
  });
  return gridToImageData(grid, dy);
}

// Rear Hair: side buns in front/side view, full back-head coverage in back view
function getRearHair(ai, fi) {
  const dy = (fi === 2 || fi === 3) ? 2 : 0;
  if (ai === 2) {
    return gridToImageData(BACK_FULL, dy);
  }
  if (ai === 0) {
    return gridToImageData(SIDE_REAR, dy);
  }
  // Front view: only the side buns
  const grid = FRONT_FULL.map((row, y) => {
    return row.split('').map((ch, x) => {
      if (y <= 6 && (x <= 7 || x >= 24)) return ch;
      return '.';
    }).join('');
  });
  return gridToImageData(grid, dy);
}

async function run() {
  const branchId = 'character-black-buns-idle-20261027';
  console.log('Fetching branch project:', branchId);
  const res = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`);
  assert(res.ok);
  const etag = res.headers.get('etag');
  const projectData = await res.json();

  const exporter = new PE.ExportManager();
  const { project } = await exporter.importProject(new File([JSON.stringify(projectData)], 'branch.json'));

  const frontLayer = project.layers.find(l => l.sheetIndex === 8 && l.name.endsWith('前发'));
  const rearLayer = project.layers.find(l => l.sheetIndex === 8 && l.name.endsWith('后发'));
  const accLayer = project.layers.find(l => l.sheetIndex === 8 && l.name.includes('发饰'));

  assert(frontLayer && rearLayer);

  // Update frameData for sheet 8
  for (let ai = 0; ai < 3; ai++) {
    for (let fi = 0; fi < 4; fi++) {
      frontLayer.frameData.set(`8_${ai}_${fi}`, getFrontHair(ai, fi));
      rearLayer.frameData.set(`8_${ai}_${fi}`, getRearHair(ai, fi));
      if (accLayer) {
        accLayer.frameData.set(`8_${ai}_${fi}`, createCanvas(32, 32).getContext('2d').getImageData(0, 0, 32, 32));
      }
    }
  }

  frontLayer.visible = true;
  rearLayer.visible = true;
  if (accLayer) accLayer.visible = false;

  const cm = new PE.CanvasManager(document.createElement('canvas'), project);
  exporter.project = project;
  exporter.canvasManager = cm;

  // Render 8x magnified check for Front, Back, Side
  for (const [ai, name] of [[1, 'front'], [2, 'back'], [0, 'side']]) {
    const im = cm.getCompositeImageData(8, ai, 0);
    const c8 = createCanvas(256, 256);
    const ctx8 = c8.getContext('2d');
    ctx8.imageSmoothingEnabled = false;

    const tile = createCanvas(32, 32);
    tile.getContext('2d').putImageData(im, 0, 0);
    ctx8.drawImage(tile, 0, 0, 256, 256);

    fs.writeFileSync(path.join(out, `exact-${name}-8x.png`), c8.toBuffer('image/png'));
  }

  // Render full preview sheet
  const sheet = createCanvas(4 * 128, 3 * 128);
  const sctx = sheet.getContext('2d');
  sctx.imageSmoothingEnabled = false;

  for (let ai = 0; ai < 3; ai++) {
    for (let fi = 0; fi < 4; fi++) {
      const im = cm.getCompositeImageData(8, ai, fi);
      const tile = createCanvas(32, 32);
      tile.getContext('2d').putImageData(im, 0, 0);

      sctx.fillStyle = (ai === 1) ? '#eceee4' : '#45434b';
      sctx.fillRect(fi * 128, ai * 128, 128, 128);
      sctx.drawImage(tile, fi * 128, ai * 128, 128, 128);
    }
  }
  fs.writeFileSync(path.join(out, 'exact-preview-all.png'), sheet.toBuffer('image/png'));

  const candidate = JSON.parse(await exporter.exportProject(false).text());

  // Save to API
  console.log('Saving exact candidate with ETag:', etag);
  const saveRes = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Pixel-Editor': '1',
      'If-Match': etag
    },
    body: JSON.stringify(candidate)
  });
  assert(saveRes.ok, `Save failed: ${saveRes.status}`);

  console.log('Exact pixel replication successfully saved to server!');
}

run().catch(console.error);
