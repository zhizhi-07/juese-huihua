const fs = require('fs');
const path = require('path');
const { createCanvas } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

const P = {
  O: '#18181a', // 描边深黑
  B: '#46454d', // 头发底色炭黑灰
  S: '#34333b', // 头发阴影
  H: '#6a6875', // 刘海高光亮面
  W: '#ffffff', // 饰品纯白
  w: '#dedee4', // 饰品浅灰阴影
  d: '#b8b8c2', // 饰品深灰阴影
};

class LayerCanvas {
  constructor() {
    this.canvas = createCanvas(32, 32);
    this.ctx = this.canvas.getContext('2d');
  }
  set(x, y, colorCode, dy = 0) {
    const targetY = y + dy;
    if (x >= 0 && x < 32 && targetY >= 0 && targetY < 32) {
      this.ctx.fillStyle = P[colorCode] || colorCode;
      this.ctx.fillRect(x, targetY, 1, 1);
    }
  }
  rect(x, y, w, h, colorCode, dy = 0) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        this.set(x + i, y + j, colorCode, dy);
      }
    }
  }
  // Symmetric set about axis x=16.5 (x1 + x2 = 33)
  sym(x, y, colorCode, dy = 0) {
    this.set(x, y, colorCode, dy);
    this.set(33 - x, y, colorCode, dy);
  }
  symRect(x, y, w, h, colorCode, dy = 0) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        this.sym(x + i, y + j, colorCode, dy);
      }
    }
  }
  getImageData() {
    return this.ctx.getImageData(0, 0, 32, 32);
  }
}

/**
 * 1. FRONT VIEW (ai=1, down)
 */
function drawFront(fi, kind) {
  const lc = new LayerCanvas();
  const dy = (fi === 2 || fi === 3) ? 2 : 0;
  const tipShorten = (fi === 2) ? 1 : 0;

  if (kind === 'front') {
    // ---------------------------------------------------------
    // A. Front hair head cap (ensures full coverage without bald spots if rear is off)
    // Top flat outline (y=1, x=13..20)
    for (let x = 13; x <= 16; x++) lc.sym(x, 1, 'O', dy);
    lc.sym(12, 2, 'O', dy);
    lc.sym(11, 2, 'O', dy);
    lc.sym(10, 3, 'O', dy);
    lc.sym(9, 3, 'O', dy);
    lc.sym(8, 4, 'O', dy);
    lc.sym(7, 5, 'O', dy);
    lc.sym(6, 6, 'O', dy);

    // Head cap base fill
    for (let x = 13; x <= 16; x++) lc.sym(x, 2, 'B', dy);
    for (let x = 10; x <= 16; x++) lc.sym(x, 3, 'B', dy);
    for (let x = 9; x <= 16; x++) lc.sym(x, 4, 'B', dy);
    for (let x = 8; x <= 16; x++) lc.sym(x, 5, 'B', dy);
    for (let x = 7; x <= 16; x++) lc.sym(x, 6, 'B', dy);

    // Head cap subtle shading
    lc.sym(14, 3, 'S', dy);
    lc.sym(15, 3, 'S', dy);
    lc.sym(15, 4, 'S', dy);
    lc.sym(16, 4, 'S', dy);
    lc.sym(15, 5, 'S', dy);

    // ---------------------------------------------------------
    // B. Bangs (y=7..11) - Direct reproduction of user reference
    // Outer bangs outline down along sides
    for (let y = 7; y <= 11; y++) lc.sym(6, y, 'O', dy);

    // Bangs base fill
    for (let y = 7; y <= 10; y++) {
      for (let x = 7; x <= 16; x++) lc.sym(x, y, 'B', dy);
    }

    // Bangs shading lines (from reference)
    for (let y = 7; y <= 10; y++) {
      lc.sym(14, y, 'S', dy);
    }
    lc.sym(16, 7, 'S', dy);

    // Highlighting on bangs (H = #6a6875) as in user pic
    lc.set(15, 7, 'H', dy);
    lc.set(17, 7, 'H', dy);
    lc.set(18, 7, 'H', dy);

    // Bangs lower edge arch (y=11)
    lc.sym(7, 11, 'B', dy);
    lc.sym(8, 11, 'B', dy);
    lc.sym(9, 11, 'B', dy);
    lc.sym(10, 11, 'S', dy);
    lc.sym(11, 11, 'S', dy);
    lc.sym(12, 11, 'O', dy);
    lc.sym(13, 11, 'S', dy);
    lc.sym(14, 11, 'O', dy);
    lc.sym(15, 11, 'S', dy);
    lc.sym(16, 11, 'S', dy);

    // ---------------------------------------------------------
    // C. Side locks / cheeks strands (y=12..16)
    // Frame cheek perfectly, avoiding eyes (eyes are at y=14..17, x=10..14 and 19..23)
    for (let y = 12; y <= 15 - tipShorten; y++) {
      lc.sym(6, y, 'O', dy);
      lc.sym(7, y, 'B', dy);
      lc.sym(8, y, 'B', dy);
      lc.sym(9, y, 'O', dy);
    }
    lc.sym(8, 14, 'S', dy);

    // Tips of locks (y=16 - tipShorten)
    lc.sym(7, 16 - tipShorten, 'O', dy);
    lc.sym(8, 16 - tipShorten, 'B', dy);
    lc.sym(9, 16 - tipShorten, 'O', dy);

  } else if (kind === 'rear') {
    // ---------------------------------------------------------
    // Pure hair buns on sides (x=4..10 and 23..29 symmetric)
    // Bun top outline: y=0..1
    lc.sym(7, 0, 'O', dy);
    for (let x = 6; x <= 8; x++) lc.sym(x, 1, 'O', dy);
    lc.sym(5, 2, 'O', dy);
    lc.sym(9, 2, 'O', dy);
    lc.sym(4, 3, 'O', dy);
    lc.sym(10, 3, 'O', dy);
    lc.sym(4, 4, 'O', dy);
    lc.sym(10, 4, 'O', dy);
    lc.sym(4, 5, 'O', dy);
    lc.sym(10, 5, 'O', dy);
    lc.sym(5, 6, 'O', dy);
    for (let x = 6; x <= 9; x++) lc.sym(x, 7, 'O', dy);

    // Bun hair fill (y=2..6, x=5..9)
    for (let x = 6; x <= 8; x++) lc.sym(x, 2, 'B', dy);
    for (let y = 3; y <= 5; y++) {
      for (let x = 5; x <= 9; x++) lc.sym(x, y, 'B', dy);
    }
    for (let x = 6; x <= 9; x++) lc.sym(x, 6, 'B', dy);

    // Bun hair round shading
    lc.sym(8, 3, 'S', dy);
    lc.sym(9, 3, 'S', dy);
    lc.sym(8, 4, 'S', dy);
    lc.sym(9, 4, 'S', dy);
    lc.sym(7, 5, 'S', dy);
    lc.sym(8, 5, 'S', dy);

    // Hanging tail under bun (x=4..5, y=8..15)
    for (let y = 8; y <= 15 - tipShorten; y++) {
      lc.sym(3, y, 'O', dy);
      lc.sym(4, y, 'B', dy);
      lc.sym(5, y, 'S', dy);
    }
    lc.sym(4, 16 - tipShorten, 'O', dy);
    lc.sym(5, 16 - tipShorten, 'O', dy);

  } else if (kind === 'acc') {
    // ---------------------------------------------------------
    // White cloth bun covers & hanging ribbons (正面)
    // Bun cover cloth
    lc.sym(7, 0, 'O', dy);
    for (let x = 6; x <= 8; x++) lc.sym(x, 1, 'O', dy);
    lc.sym(5, 2, 'O', dy);
    lc.sym(6, 2, 'W', dy);
    lc.sym(7, 2, 'W', dy);
    lc.sym(8, 2, 'w', dy);
    lc.sym(9, 2, 'd', dy);

    lc.sym(4, 3, 'O', dy);
    lc.sym(5, 3, 'W', dy);
    lc.sym(6, 3, 'W', dy);
    lc.sym(7, 3, 'w', dy);
    lc.sym(8, 3, 'W', dy);
    lc.sym(9, 3, 'w', dy);
    lc.sym(10, 3, 'O', dy);

    lc.sym(4, 4, 'O', dy);
    lc.sym(5, 4, 'W', dy);
    lc.sym(6, 4, 'w', dy);
    lc.sym(7, 4, 'W', dy);
    lc.sym(8, 4, 'w', dy);
    lc.sym(9, 4, 'W', dy);
    lc.sym(10, 4, 'O', dy);

    lc.sym(4, 5, 'O', dy);
    lc.sym(5, 5, 'w', dy);
    lc.sym(6, 5, 'W', dy);
    lc.sym(7, 5, 'w', dy);
    lc.sym(8, 5, 'W', dy);
    lc.sym(9, 5, 'O', dy);
    lc.sym(10, 5, 'O', dy);

    lc.sym(5, 6, 'O', dy);
    lc.sym(6, 6, 'O', dy);
    lc.sym(7, 6, 'W', dy);
    lc.sym(8, 6, 'w', dy);
    lc.sym(9, 6, 'O', dy);

    // Hanging ribbon (x=3..5, y=7..16) covering outer ear elegantly
    lc.sym(3, 7, 'O', dy);
    lc.sym(4, 7, 'w', dy);
    lc.sym(5, 7, 'O', dy);

    lc.sym(3, 8, 'O', dy);
    lc.sym(4, 8, 'w', dy);
    lc.sym(5, 8, 'w', dy);

    lc.sym(3, 9, 'O', dy);
    lc.sym(4, 9, 'w', dy);
    lc.sym(5, 9, 'O', dy);

    lc.sym(3, 10, 'w', dy);
    lc.sym(4, 10, 'O', dy);
    lc.sym(5, 10, 'w', dy);

    lc.sym(3, 11, 'W', dy);
    lc.sym(4, 11, 'O', dy);
    lc.sym(5, 11, 'w', dy);

    for (let y = 12; y <= 15 - tipShorten; y++) {
      lc.sym(3, y, 'W', dy);
      lc.sym(4, y, 'O', dy);
    }
    lc.sym(3, 16 - tipShorten, 'W', dy);
    lc.sym(4, 16 - tipShorten, 'W', dy);
    lc.sym(5, 16 - tipShorten, 'O', dy);
  }

  return lc.getImageData();
}

/**
 * 2. BACK VIEW (ai=2, up)
 */
function drawBack(fi, kind) {
  if (kind === 'front') {
    // Back view front hair must be 100% transparent
    return createCanvas(32, 32).getContext('2d').getImageData(0, 0, 32, 32);
  }

  const lc = new LayerCanvas();
  const dy = (fi === 2 || fi === 3) ? 2 : 0;
  const tipShorten = (fi === 2) ? 1 : 0;

  if (kind === 'rear') {
    // ---------------------------------------------------------
    // Full back-head hair cap + symmetric buns
    // Back head top outline (y=1)
    for (let x = 11; x <= 16; x++) lc.sym(x, 1, 'O', dy);
    for (let x = 6; x <= 8; x++) lc.sym(x, 1, 'O', dy); // bun tops

    // Bun outer outlines
    lc.sym(5, 2, 'O', dy);
    lc.sym(4, 3, 'O', dy);
    lc.sym(4, 4, 'O', dy);
    lc.sym(4, 5, 'O', dy);
    lc.sym(5, 6, 'O', dy);
    lc.sym(6, 7, 'O', dy);

    // Back-head outline sides (y=7..13)
    for (let y = 7; y <= 13; y++) {
      lc.sym(7, y, 'O', dy);
    }
    // Nape hairline (y=14)
    for (let x = 8; x <= 16; x++) lc.sym(x, 14, 'O', dy);

    // Back-head hair fill
    for (let y = 2; y <= 6; y++) {
      for (let x = 5; x <= 16; x++) lc.sym(x, y, 'B', dy);
    }
    for (let y = 7; y <= 13; y++) {
      for (let x = 8; x <= 16; x++) lc.sym(x, y, 'B', dy);
    }

    // Back-head shading (hair streams)
    lc.sym(13, 3, 'S', dy);
    lc.sym(14, 3, 'S', dy);
    lc.sym(13, 4, 'S', dy);
    lc.sym(14, 4, 'S', dy);
    lc.sym(11, 8, 'S', dy);
    lc.sym(12, 8, 'S', dy);
    lc.sym(11, 9, 'S', dy);
    lc.sym(12, 9, 'S', dy);
    lc.sym(11, 10, 'S', dy);

    // Hanging hair tails under buns (x=4..5)
    for (let y = 8; y <= 15 - tipShorten; y++) {
      lc.sym(3, y, 'O', dy);
      lc.sym(4, y, 'B', dy);
      lc.sym(5, y, 'S', dy);
    }
    lc.sym(4, 16 - tipShorten, 'O', dy);
    lc.sym(5, 16 - tipShorten, 'O', dy);

  } else if (kind === 'acc') {
    // ---------------------------------------------------------
    // Back accessories: White cloth bun covers + ribbons
    lc.sym(7, 0, 'O', dy);
    for (let x = 6; x <= 8; x++) lc.sym(x, 1, 'O', dy);
    lc.sym(5, 2, 'O', dy);
    lc.sym(6, 2, 'W', dy);
    lc.sym(7, 2, 'W', dy);
    lc.sym(8, 2, 'w', dy);
    lc.sym(9, 2, 'd', dy);

    lc.sym(4, 3, 'O', dy);
    lc.sym(5, 3, 'W', dy);
    lc.sym(6, 3, 'W', dy);
    lc.sym(7, 3, 'w', dy);
    lc.sym(8, 3, 'W', dy);
    lc.sym(9, 3, 'w', dy);
    lc.sym(10, 3, 'O', dy);

    lc.sym(4, 4, 'O', dy);
    lc.sym(5, 4, 'W', dy);
    lc.sym(6, 4, 'w', dy);
    lc.sym(7, 4, 'W', dy);
    lc.sym(8, 4, 'w', dy);
    lc.sym(9, 4, 'W', dy);
    lc.sym(10, 4, 'O', dy);

    lc.sym(4, 5, 'O', dy);
    lc.sym(5, 5, 'w', dy);
    lc.sym(6, 5, 'W', dy);
    lc.sym(7, 5, 'w', dy);
    lc.sym(8, 5, 'W', dy);
    lc.sym(9, 5, 'O', dy);

    lc.sym(5, 6, 'O', dy);
    lc.sym(6, 6, 'O', dy);
    lc.sym(7, 6, 'W', dy);
    lc.sym(8, 6, 'w', dy);
    lc.sym(9, 6, 'O', dy);

    // Ribbons
    lc.sym(3, 7, 'O', dy);
    lc.sym(4, 7, 'w', dy);
    lc.sym(5, 7, 'O', dy);

    lc.sym(3, 8, 'O', dy);
    lc.sym(4, 8, 'w', dy);
    lc.sym(5, 8, 'w', dy);

    for (let y = 9; y <= 15 - tipShorten; y++) {
      lc.sym(3, y, 'W', dy);
      lc.sym(4, y, 'O', dy);
    }
    lc.sym(3, 16 - tipShorten, 'W', dy);
    lc.sym(4, 16 - tipShorten, 'W', dy);
    lc.sym(5, 16 - tipShorten, 'O', dy);
  }

  return lc.getImageData();
}

/**
 * 3. SIDE VIEW (ai=0, side - 3/4 facing left)
 */
function drawSide(fi, kind) {
  const lc = new LayerCanvas();
  const dy = (fi === 2 || fi === 3) ? 2 : 0;
  const tipShorten = (fi === 2) ? 1 : 0;

  if (kind === 'front') {
    // Front hair side profile: bangs slanted + ear lock
    for (let x = 11; x <= 18; x++) lc.set(x, 1, 'O', dy);
    lc.set(10, 2, 'O', dy);
    lc.set(9, 3, 'O', dy);
    lc.set(8, 4, 'O', dy);
    lc.set(7, 5, 'O', dy);
    lc.set(7, 6, 'O', dy);

    // Bangs front edge
    for (let y = 7; y <= 10; y++) lc.set(7, y, 'O', dy);
    lc.set(8, 11, 'O', dy);
    lc.set(9, 11, 'O', dy);
    lc.set(10, 11, 'O', dy);
    lc.set(11, 11, 'O', dy);

    // Fill bangs
    for (let x = 11; x <= 18; x++) lc.set(x, 2, 'B', dy);
    for (let x = 10; x <= 18; x++) lc.set(x, 3, 'B', dy);
    for (let x = 9; x <= 18; x++) lc.set(x, 4, 'B', dy);
    for (let x = 8; x <= 18; x++) lc.set(x, 5, 'B', dy);
    for (let x = 8; x <= 18; x++) lc.set(x, 6, 'B', dy);
    for (let y = 7; y <= 10; y++) {
      for (let x = 8; x <= 15; x++) lc.set(x, y, 'B', dy);
    }

    // Highlighting on side bangs
    lc.set(11, 7, 'H', dy);
    lc.set(12, 7, 'H', dy);
    lc.set(13, 7, 'S', dy);

    // Ear lock / side locks (y=12..16)
    for (let y = 12; y <= 15 - tipShorten; y++) {
      lc.set(7, y, 'O', dy);
      lc.set(8, y, 'B', dy);
      lc.set(9, y, 'B', dy);
      lc.set(10, y, 'O', dy);
    }
    lc.set(8, 16 - tipShorten, 'O', dy);
    lc.set(9, 16 - tipShorten, 'O', dy);

  } else if (kind === 'rear') {
    // Rear hair side: Near bun (x=12..17) + far bun peeking (x=19..22) + back-head cap
    // Far bun top:
    for (let x = 20; x <= 22; x++) lc.set(x, 0, 'O', dy);
    lc.set(19, 1, 'O', dy);
    for (let x = 20; x <= 22; x++) lc.set(x, 1, 'B', dy);

    // Near bun outline & fill (x=12..17, y=1..6)
    for (let x = 13; x <= 16; x++) lc.set(x, 1, 'O', dy);
    lc.set(12, 2, 'O', dy);
    lc.set(17, 2, 'O', dy);
    lc.set(12, 3, 'O', dy);
    lc.set(17, 3, 'O', dy);
    lc.set(12, 4, 'O', dy);
    lc.set(17, 4, 'O', dy);
    lc.set(13, 5, 'O', dy);
    for (let x = 14; x <= 16; x++) lc.set(x, 6, 'O', dy);

    // Bun fill
    for (let y = 2; y <= 4; y++) {
      for (let x = 13; x <= 16; x++) lc.set(x, y, 'B', dy);
    }
    lc.set(14, 3, 'S', dy);
    lc.set(15, 3, 'S', dy);

    // Back-head cap (x=18..24, y=3..13)
    for (let y = 3; y <= 12; y++) {
      lc.set(24, y, 'O', dy);
      for (let x = 18; x <= 23; x++) lc.set(x, y, 'B', dy);
    }
    // Nape
    for (let x = 17; x <= 23; x++) lc.set(x, 13, 'O', dy);

    // Hanging hair tail under near bun (x=14..15, y=7..15)
    for (let y = 7; y <= 14 - tipShorten; y++) {
      lc.set(14, y, 'B', dy);
      lc.set(15, y, 'S', dy);
      lc.set(16, y, 'O', dy);
    }
    lc.set(14, 15 - tipShorten, 'O', dy);
    lc.set(15, 15 - tipShorten, 'O', dy);

  } else if (kind === 'acc') {
    // Side accessories: Near bun white cover and ribbon
    // Far bun top cover peeking
    lc.set(20, 1, 'W', dy);
    lc.set(21, 1, 'w', dy);

    // Near bun white cloth
    for (let x = 13; x <= 16; x++) lc.set(x, 1, 'O', dy);
    lc.set(12, 2, 'O', dy);
    lc.set(13, 2, 'W', dy);
    lc.set(14, 2, 'W', dy);
    lc.set(15, 2, 'w', dy);
    lc.set(16, 2, 'd', dy);
    lc.set(17, 2, 'O', dy);

    lc.set(12, 3, 'O', dy);
    lc.set(13, 3, 'W', dy);
    lc.set(14, 3, 'w', dy);
    lc.set(15, 3, 'W', dy);
    lc.set(16, 3, 'w', dy);
    lc.set(17, 3, 'O', dy);

    lc.set(12, 4, 'O', dy);
    lc.set(13, 4, 'w', dy);
    lc.set(14, 4, 'W', dy);
    lc.set(15, 4, 'w', dy);
    lc.set(16, 4, 'O', dy);

    for (let x = 13; x <= 16; x++) lc.set(x, 5, 'O', dy);

    // Side ribbon hanging
    lc.set(12, 6, 'O', dy);
    lc.set(13, 6, 'w', dy);
    lc.set(14, 6, 'O', dy);

    lc.set(12, 7, 'O', dy);
    lc.set(13, 7, 'w', dy);
    lc.set(14, 7, 'w', dy);

    for (let y = 8; y <= 14 - tipShorten; y++) {
      lc.set(12, y, 'W', dy);
      lc.set(13, y, 'O', dy);
    }
    lc.set(12, 15 - tipShorten, 'W', dy);
    lc.set(13, 15 - tipShorten, 'W', dy);
    lc.set(14, 15 - tipShorten, 'O', dy);
  }

  return lc.getImageData();
}

function drawFrame(ai, fi, kind) {
  if (ai === 1) return drawFront(fi, kind);
  if (ai === 2) return drawBack(fi, kind);
  return drawSide(fi, kind);
}

module.exports = { drawFrame, P };
