// Draws the home-screen icon into public/: the nine palaces in their element colors on the app's teal.
// Run with `node tools/make-icons.mjs` after changing the design; commit the PNGs it writes.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TEAL = '#22535a';
const WOOD = '#d9f2e5';
const FIRE = '#f3d6d7';
const EARTH = '#e9e0d8';
const METAL = '#fef5d9';
const WATER = '#d8f2fa';

// The grid as the chart shows it: 巽4 离9 坤2 / 震3 中5 兑7 / 艮8 坎1 乾6.
const PALACES = [
  [WOOD, FIRE, EARTH],
  [WOOD, EARTH, METAL],
  [EARTH, WATER, METAL],
];

// Fractions of the icon's width. The grid stays inside the maskable safe zone (a circle of radius 0.4).
const MARGIN = 0.22;
const GAP = 0.025;
const RADIUS = 0.03;
const SAMPLES = 4; // per axis, for anti-aliased edges

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function colorAt(x, y) {
  const tile = (1 - 2 * MARGIN - 2 * GAP) / 3;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const left = MARGIN + col * (tile + GAP);
      const top = MARGIN + row * (tile + GAP);
      // Distance outside the tile's rounded rectangle.
      const dx = Math.max(left + RADIUS - x, 0, x - (left + tile - RADIUS));
      const dy = Math.max(top + RADIUS - y, 0, y - (top + tile - RADIUS));
      if (dx * dx + dy * dy <= RADIUS * RADIUS) return PALACES[row][col];
    }
  }
  return TEAL;
}

function draw(size) {
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3); // leading 0: no PNG filter
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const c = rgb(colorAt((px + (sx + 0.5) / SAMPLES) / size, (py + (sy + 0.5) / SAMPLES) / size));
          for (let i = 0; i < 3; i++) sum[i] += c[i];
        }
      }
      for (let i = 0; i < 3; i++) row[1 + px * 3 + i] = Math.round(sum[i] / SAMPLES ** 2);
    }
    rows.push(row);
  }
  return png(size, Buffer.concat(rows));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

// An opaque 8-bit RGB PNG: iOS fills transparent icon pixels with black.
function png(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputs = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };
for (const [name, size] of Object.entries(outputs)) {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), draw(size));
  console.log(`public/${name} ${size}×${size}`);
}
