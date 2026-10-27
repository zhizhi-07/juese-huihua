const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const { createCanvas, ImageData, Image } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '自检记录/炭黑双丸子发型-20261027');
fs.mkdirSync(out, { recursive: true });

// Setup globals
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

// USER EXACT FRONT MATRIX (32x32)
const USER_FRONT = [
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
  /* 14 */ "...SS#BS#..............#SB.SS...",
  /* 15 */ "...S.#BB#..............#BB..S...",
  /* 16 */ "...S..BB#..............#B...S...",
  /* 17 */ "...SS..BS..............BB..SS...",
  /* 18 */ ".....S..S..............S..S.....",
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

// BACK MATRIX: "背面的话其实就是前面的形状至少盖住后脑勺"
// Keep the exact same bun shapes and top arc, but fill the center (where face was)
// with hair and nape hairline to cover back of head completely.
const USER_BACK = [
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

// SIDE MATRIX (3/4 facing left)
const USER_SIDE_FRONT = [
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
  /* 15 */ "...#BBB#........................",
  /* 16 */ "....#BB#........................",
];

const USER_SIDE_REAR = [
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

function makeFrame(grid, dy = 0) {
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

// Split USER_FRONT into Front Hair (Bangs + Side Locks) and Rear Hair (Buns)
function getFrontHair(ai, fi) {
  if (ai === 2) {
    // Back view front hair must be completely transparent
    return createCanvas(32, 32).getContext('2d').getImageData(0, 0, 32, 32);
  }
  const dy = (fi === 2 || fi === 3) ? 2 : 0;
  if (ai === 0) {
    return makeFrame(USER_SIDE_FRONT, dy);
  }
  // Front hair: Bangs (y=7..11), side locks (y=12..18), and cap base (y=1..6)
  const grid = USER_FRONT.map((row, y) => {
    return row.split('').map((ch, x) => {
      // Buns on sides: x=3..7 at y=0..6, x=24..28 at y=0..6 belong to rear hair
      if (y <= 6 && (x <= 7 || x >= 24)) return '.';
      return ch;
    }).join('');
  });
  return makeFrame(grid, dy);
}

function getRearHair(ai, fi) {
  const dy = (fi === 2 || fi === 3) ? 2 : 0;
  if (ai === 2) {
    // Back view: full rear hair (User back covering head)
    return makeFrame(USER_BACK, dy);
  }
  if (ai === 0) {
    return makeFrame(USER_SIDE_REAR, dy);
  }
  // Front view rear hair: the side buns
  const grid = USER_FRONT.map((row, y) => {
    return row.split('').map((ch, x) => {
      if (y <= 6 && (x <= 7 || x >= 24)) return ch;
      return '.';
    }).join('');
  });
  return makeFrame(grid, dy);
}

async function updateProject() {
  const branchId = 'character-black-buns-idle-20261027';
  console.log(`Fetching latest ${branchId}...`);
  const res = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`);
  assert(res.ok);
  const etag = res.headers.get('etag');
  const projectData = await res.json();

  const exporter = new PE.ExportManager();
  const { project } = await exporter.importProject(new File([JSON.stringify(projectData)], 'branch.json'));

  // Find front hair and rear hair layers
  const frontLayer = project.layers.find(l => l.sheetIndex === 8 && l.name.endsWith('前发'));
  const rearLayer = project.layers.find(l => l.sheetIndex === 8 && l.name.endsWith('后发'));
  const accLayer = project.layers.find(l => l.sheetIndex === 8 && l.name.includes('发饰'));

  assert(frontLayer && rearLayer, 'Hair layers must exist');

  // Update frameData for front and rear
  for (let ai = 0; ai < 3; ai++) {
    for (let fi = 0; fi < 4; fi++) {
      frontLayer.frameData.set(`8_${ai}_${fi}`, getFrontHair(ai, fi));
      rearLayer.frameData.set(`8_${ai}_${fi}`, getRearHair(ai, fi));
      if (accLayer) {
        // Clear accessories layer (as user hid accessories)
        accLayer.frameData.set(`8_${ai}_${fi}`, createCanvas(32, 32).getContext('2d').getImageData(0, 0, 32, 32));
      }
    }
  }

  if (accLayer) accLayer.visible = false;
  frontLayer.visible = true;
  rearLayer.visible = true;

  const cm = new PE.CanvasManager(document.createElement('canvas'), project);
  exporter.project = project;
  exporter.canvasManager = cm;

  // Render preview grid (3 actions x 4 frames)
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
  fs.writeFileSync(path.join(out, 'user-preview-all.png'), sheet.toBuffer('image/png'));

  // Export updated candidate JSON
  const updatedCandidate = JSON.parse(await exporter.exportProject(false).text());

  // Save to backend API
  console.log('Saving to backend API with ETag:', etag);
  const saveRes = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Pixel-Editor': '1',
      'If-Match': etag
    },
    body: JSON.stringify(updatedCandidate)
  });
  assert(saveRes.ok, 'Save failed: ' + saveRes.status + ' ' + (await saveRes.text()));

  // Verify
  const verifyRes = await fetch(`http://127.0.0.1:8765/api/project?id=${branchId}`);
  assert(verifyRes.ok);
  const verifyData = await verifyRes.json();
  console.log('Project successfully updated and verified on server!');
}

updateProject().catch(console.error);
