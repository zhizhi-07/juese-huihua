/**
 * Generate a transparent PNG sprite sheet (128x32, 4 frames of 32x32)
 * Pure Node.js using built-in zlib and fs - no external dependencies!
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table for PNG chunk checksums
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const checksum = crc32(typeAndData);
  chunk.writeUInt32BE(checksum, 8 + len);
  return chunk;
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR: 13 bytes
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // standard filter
  ihdr[12] = 0; // no interlace

  // Raw scanlines with filter byte 0
  const scanlineLength = width * 4;
  const rawData = Buffer.alloc(height * (1 + scanlineLength));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + scanlineLength);
    rawData[rawOffset] = 0; // Filter type 0 (None)
    const rowSource = y * scanlineLength;
    rgbaBuffer.copy(rawData, rawOffset + 1, rowSource, rowSource + scanlineLength);
  }

  const idatData = zlib.deflateSync(rawData);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Create 128x32 canvas buffer (4 frames of 32x32)
const WIDTH = 128;
const HEIGHT = 32;
const buffer = Buffer.alloc(WIDTH * HEIGHT * 4, 0); // Start fully transparent

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const idx = (y * WIDTH + x) * 4;
  buffer[idx] = r;
  buffer[idx + 1] = g;
  buffer[idx + 2] = b;
  buffer[idx + 3] = a;
}

function fillRect(x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(x + dx, y + dy, r, g, b, a);
    }
  }
}

// Character color palette
const C_HAIR = [190, 110, 40];      // Brown hair
const C_HAIR_HL = [230, 150, 70];   // Hair highlight
const C_SKIN = [255, 210, 170];     // Fair skin
const C_SKIN_SHADOW = [225, 175, 140]; // Skin shadow
const C_EYE = [30, 30, 50];         // Dark eye
const C_SHIRT = [40, 120, 220];     // Blue shirt
const C_SHIRT_DARK = [25, 80, 160]; // Shirt shadow
const C_BELT = [60, 40, 20];        // Belt
const C_PANTS = [50, 60, 80];       // Dark pants
const C_BOOTS = [80, 45, 25];       // Boots

// Draw 4 frames:
// Frame 0: Idle stand (offset x=0)
// Frame 1: Walk step 1 (offset x=32)
// Frame 2: Walk neutral (offset x=64)
// Frame 3: Walk step 2 (offset x=96)

const frames = [
  { legL: 0, legR: 0, armL: 0, armR: 0, bobY: 0 },
  { legL: -2, legR: 2, armL: 2, armR: -2, bobY: -1 },
  { legL: 0, legR: 0, armL: 0, armR: 0, bobY: 0 },
  { legL: 2, legR: -2, armL: -2, armR: 2, bobY: -1 }
];

frames.forEach((f, frameIdx) => {
  const ox = frameIdx * 32;
  const oy = f.bobY;

  // Head / Hair (32x32 center: x=11..21, y=4..13)
  // Hair back / top
  fillRect(ox + 12, oy + 4, 8, 3, ...C_HAIR);
  fillRect(ox + 11, oy + 6, 10, 2, ...C_HAIR);
  fillRect(ox + 14, oy + 4, 4, 1, ...C_HAIR_HL); // highlight

  // Face
  fillRect(ox + 12, oy + 8, 8, 5, ...C_SKIN);
  fillRect(ox + 12, oy + 12, 8, 1, ...C_SKIN_SHADOW);

  // Bangs / side hair
  fillRect(ox + 11, oy + 7, 2, 4, ...C_HAIR);
  fillRect(ox + 19, oy + 7, 2, 4, ...C_HAIR);
  fillRect(ox + 13, oy + 7, 3, 1, ...C_HAIR);

  // Eyes
  setPixel(ox + 14, oy + 9, ...C_EYE);
  setPixel(ox + 17, oy + 9, ...C_EYE);

  // Neck
  fillRect(ox + 14, oy + 13, 4, 2, ...C_SKIN_SHADOW);

  // Body / Shirt (x=11..20, y=15..21)
  fillRect(ox + 12, oy + 15, 8, 5, ...C_SHIRT);
  fillRect(ox + 11, oy + 16, 1, 4, ...C_SHIRT_DARK);
  fillRect(ox + 20, oy + 16, 1, 4, ...C_SHIRT_DARK);
  fillRect(ox + 15, oy + 15, 2, 5, ...C_SHIRT_DARK); // Shirt center placket

  // Belt
  fillRect(ox + 12, oy + 20, 8, 1, ...C_BELT);
  setPixel(ox + 15, oy + 20, 240, 200, 50); // Gold buckle

  // Arms
  const armL_Y = 16 + f.armL;
  const armR_Y = 16 + f.armR;
  fillRect(ox + 10, oy + armL_Y, 2, 4, ...C_SHIRT);
  fillRect(ox + 10, oy + armL_Y + 4, 2, 2, ...C_SKIN); // Left hand
  fillRect(ox + 20, oy + armR_Y, 2, 4, ...C_SHIRT);
  fillRect(ox + 20, oy + armR_Y + 4, 2, 2, ...C_SKIN); // Right hand

  // Legs & Boots
  // Left leg (x=12..14)
  const lY = 21;
  fillRect(ox + 12, lY, 3, 5 + f.legL, ...C_PANTS);
  fillRect(ox + 12, lY + 5 + f.legL, 3, 3, ...C_BOOTS);

  // Right leg (x=17..19)
  fillRect(ox + 17, lY, 3, 5 + f.legR, ...C_PANTS);
  fillRect(ox + 17, lY + 5 + f.legR, 3, 3, ...C_BOOTS);
});

// Write to assets/sample_character.png
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const outputPath = path.join(assetsDir, 'sample_character.png');
const pngData = encodePNG(WIDTH, HEIGHT, buffer);
fs.writeFileSync(outputPath, pngData);

console.log(`成功生成真实动作表素材: ${outputPath} (${pngData.length} 字节, 尺寸 128x32, 4 帧 32x32)`);
