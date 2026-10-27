/**
 * Draw a laptop computer pixel by pixel.
 *
 * Design rules taken from the project reference art (assets/scene-reference):
 *   - one object only, drawn at the density of the stove reference;
 *   - muted purple-gray plastic, low saturation, one dark outline colour;
 *   - value structure: lit top face -> lit front face -> shaded right bezel,
 *     so the volume reads at 1x;
 *   - orthogonal structure, hard pixel edges, no anti-aliasing.
 *
 * Canvas 26x21, native pixels:
 *   row   1      lid top outline
 *   row   2      lit top face of the lid, with the webcam
 *   row   3      screen recess, dark ring
 *   rows  4-9    screen, 14 wide
 *   row  10      screen recess bottom
 *   row  11      lower bezel with the brand mark and status led
 *   row  12      lid bottom outline
 *   row  13      hinge
 *   rows 14-16   base deck: two key rows and the space bar row
 *   row  17      palm rest with the trackpad
 *   row  18      lit front edge of the base
 *   row  19      bottom outline
 *   row  20      floor contact shadow
 *
 * Output:
 *   assets/objects/笔记本电脑.png        native 26x21 transparent PNG
 *   assets/objects/笔记本电脑_2x.png      exact 2x nearest-neighbour display PNG
 *   assets/objects/layers/*.png           per-layer transparent PNGs
 *
 * Usage: node scripts/draw-laptop.cjs
 */
const fs = require('fs');
const path = require('path');
const { encode } = require(path.join(__dirname, 'png.cjs'));

const W = 26, H = 21;

// ---- palette taken from the project reference art ----
const C = {
  out: [58, 58, 80],        // darkest outline
  dk: [70, 70, 94],         // screen recess, deep gap
  dkm: [86, 89, 114],       // dark mid
  mid: [108, 110, 133],     // shaded face
  low: [128, 129, 158],     // lower value plastic
  body: [139, 139, 171],    // main plastic body
  lit: [157, 163, 183],     // lit front face
  face: [178, 174, 203],    // top face highlight
  bright: [216, 208, 224],  // bright plastic, key caps
  top: [235, 228, 242],     // brightest plastic
  shade: [211, 210, 215],   // neutral shadow
  white: [236, 245, 251],   // window body, glass highlight
  blue: [142, 191, 234],    // screen desktop
  teal: [149, 227, 227],    // window title bar
  green: [100, 182, 59],    // led and taskbar icon
  ground: [167, 151, 150],  // contact shadow strip
};

const makeBuf = () => Buffer.alloc(W * H * 4);
function setPx(buf, x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
}
function rect(buf, x, y, w, h, c) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setPx(buf, x + i, y + j, c);
}

// ================= lid =================
// The lid is 19 wide so a lit bezel survives on the right of the screen recess.
const lid = makeBuf();
rect(lid, 4, 1, 19, 12, C.lit);             // front face base
rect(lid, 4, 1, 19, 1, C.out);              // top outline
rect(lid, 4, 12, 19, 1, C.out);             // bottom outline
rect(lid, 4, 2, 1, 10, C.out);              // left outline
rect(lid, 22, 2, 1, 10, C.out);             // right outline
rect(lid, 5, 2, 17, 1, C.mid);              // top plane in shadow, as in the reference art
setPx(lid, 12, 2, C.dk);                    // webcam in the top band
rect(lid, 21, 3, 1, 8, C.mid);              // shaded right bezel
// screen recess: 1px dark ring
rect(lid, 5, 3, 16, 1, C.dk);               // recess top
rect(lid, 5, 10, 16, 1, C.dk);              // recess bottom
rect(lid, 5, 4, 1, 6, C.dk);                // recess left
rect(lid, 20, 4, 1, 6, C.dk);               // recess right
// screen, 14x6
rect(lid, 6, 4, 14, 6, C.blue);             // desktop
setPx(lid, 6, 4, C.white);                  // glass reflection
setPx(lid, 7, 4, C.white);
setPx(lid, 6, 5, C.white);
rect(lid, 9, 4, 8, 1, C.teal);              // window title bar
rect(lid, 9, 5, 8, 4, C.white);             // window body
rect(lid, 10, 6, 6, 1, C.shade);            // content lines
rect(lid, 10, 7, 5, 1, C.shade);
rect(lid, 10, 8, 6, 1, C.shade);
rect(lid, 9, 9, 8, 1, C.shade);             // window drop shadow
rect(lid, 6, 9, 3, 1, C.bright);            // taskbar, left of the window
rect(lid, 17, 9, 3, 1, C.bright);           // taskbar, right of the window
setPx(lid, 7, 9, C.green);                  // taskbar icon
setPx(lid, 18, 9, C.blue);
// lower bezel
rect(lid, 10, 11, 4, 1, C.low);             // brand mark
setPx(lid, 17, 11, C.green);                // status led

// ================= base =================
const base = makeBuf();
rect(base, 3, 13, 21, 7, C.lit);            // base body
rect(base, 3, 13, 1, 6, C.out);             // left outline
rect(base, 23, 13, 1, 6, C.out);            // right outline
rect(base, 3, 19, 21, 1, C.out);            // bottom outline
rect(base, 7, 13, 13, 1, C.dk);             // hinge
rect(base, 4, 13, 3, 1, C.body);            // hinge shoulder
rect(base, 20, 13, 3, 1, C.body);
rect(base, 22, 13, 1, 6, C.mid);           // shaded right side
rect(base, 4, 14, 19, 4, C.mid);            // deck, darker so the key caps read
// key rows, two wide caps with a one pixel gap between them
for (const y of [14, 15]) {
  for (const x of [5, 8, 11, 14, 17, 20]) rect(base, x, y, 2, 1, C.bright);
}
setPx(base, 5, 14, C.top);                  // one lit key to catch the eye
// space bar row: one wide cap with the deck showing either side
rect(base, 8, 16, 10, 1, C.bright);          // space bar
setPx(base, 8, 16, C.top);                   // lit edge of the space bar
rect(base, 5, 16, 2, 1, C.lit);              // modifier keys
rect(base, 19, 16, 2, 1, C.lit);             // modifier keys
// palm rest
rect(base, 4, 17, 19, 1, C.body);
rect(base, 12, 17, 4, 1, C.face);           // trackpad, a lighter pad on the rest
setPx(base, 12, 17, C.lit); setPx(base, 15, 17, C.lit);
rect(base, 4, 18, 19, 1, C.face);           // lit front edge of the base
rect(base, 4, 19, 19, 1, C.out);            // bottom outline

// ================= floor contact shadow =================
const ground = makeBuf();
rect(ground, 3, 20, 21, 1, C.ground);
rect(ground, 7, 20, 13, 1, C.ground);

// ================= composite =================
const layers = [
  { name: '地面阴影', buf: ground },
  { name: '屏幕上盖', buf: lid },
  { name: '键盘底座', buf: base },
];
const composite = makeBuf();
for (const l of layers) {
  for (let i = 0; i < W * H; i++) {
    if (!l.buf[i * 4 + 3]) continue;
    for (let c = 0; c < 3; c++) composite[i * 4 + c] = l.buf[i * 4 + c];
    composite[i * 4 + 3] = 255;
  }
}

// ---- exact nearest neighbour upscale ----
function upscale(buf, f) {
  const out = Buffer.alloc(W * f * H * f * 4);
  for (let y = 0; y < H * f; y++) {
    for (let x = 0; x < W * f; x++) {
      const si = ((Math.floor(y / f) * W) + Math.floor(x / f)) * 4;
      const di = (y * W * f + x) * 4;
      for (let c = 0; c < 4; c++) out[di + c] = buf[si + c];
    }
  }
  return out;
}

const outDir = path.join(__dirname, '..', 'assets', 'objects');
const layerDir = path.join(outDir, 'layers');
fs.mkdirSync(layerDir, { recursive: true });

for (const name of ['笔记本电脑', '电脑']) {
  fs.writeFileSync(path.join(outDir, name + '.png'), encode(W, H, composite));
  fs.writeFileSync(path.join(outDir, name + '_2x.png'), encode(W * 2, H * 2, upscale(composite, 2)));
}
for (const l of layers) {
  fs.writeFileSync(path.join(layerDir, l.name + '.png'), encode(W, H, l.buf));
}
console.log('wrote', outDir, W + 'x' + H, 'and 2x display version');
