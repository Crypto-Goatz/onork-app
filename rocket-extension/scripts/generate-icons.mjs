#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

// Brand colors
const BG = [0x0d, 0x11, 0x17]; // page bg
const ACCENT = [0x6e, 0xe0, 0x5a]; // primary accent

// 5x7 pixel-art "R" — set bits = accent, unset = transparent over bg tile
const R_GLYPH = [
  "11110",
  "10001",
  "10001",
  "11110",
  "10100",
  "10010",
  "10001",
];

function crc32(buf) {
  let c;
  const table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[n] = c >>> 0;
    }
    return t;
  })();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size) {
  // Build pixel buffer: rounded-square tile in ACCENT, with darker R in center.
  // We use RGBA. Corner radius ~ 18% of size.
  const radius = Math.round(size * 0.18);
  const pad = Math.round(size * 0.18);
  const glyphW = 5;
  const glyphH = 7;
  // glyph cell size (pixel scale)
  const cell = Math.floor(Math.min((size - pad * 2) / glyphW, (size - pad * 2) / glyphH));
  const glyphPxW = cell * glyphW;
  const glyphPxH = cell * glyphH;
  const glyphX = Math.floor((size - glyphPxW) / 2);
  const glyphY = Math.floor((size - glyphPxH) / 2);

  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Rounded square mask
      const inCorner =
        (x < radius && y < radius && (radius - x) ** 2 + (radius - y) ** 2 > radius ** 2) ||
        (x >= size - radius &&
          y < radius &&
          (x - (size - radius - 1)) ** 2 + (radius - y) ** 2 > radius ** 2) ||
        (x < radius &&
          y >= size - radius &&
          (radius - x) ** 2 + (y - (size - radius - 1)) ** 2 > radius ** 2) ||
        (x >= size - radius &&
          y >= size - radius &&
          (x - (size - radius - 1)) ** 2 +
            (y - (size - radius - 1)) ** 2 >
            radius ** 2);

      if (inCorner) {
        pixels[idx + 0] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
        continue;
      }

      // Determine glyph cell hit
      const gx = x - glyphX;
      const gy = y - glyphY;
      let isGlyph = false;
      if (gx >= 0 && gx < glyphPxW && gy >= 0 && gy < glyphPxH) {
        const cx = Math.floor(gx / cell);
        const cy = Math.floor(gy / cell);
        if (cy >= 0 && cy < glyphH && cx >= 0 && cx < glyphW) {
          isGlyph = R_GLYPH[cy][cx] === "1";
        }
      }

      if (isGlyph) {
        pixels[idx + 0] = BG[0];
        pixels[idx + 1] = BG[1];
        pixels[idx + 2] = BG[2];
        pixels[idx + 3] = 0xff;
      } else {
        pixels[idx + 0] = ACCENT[0];
        pixels[idx + 1] = ACCENT[1];
        pixels[idx + 2] = ACCENT[2];
        pixels[idx + 3] = 0xff;
      }
    }
  }

  // Wrap rows with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [16, 48, 128]) {
  const png = makePng(size);
  const out = resolve(outDir, `icon-${size}.png`);
  writeFileSync(out, png);
  console.log(`wrote ${out} (${png.length} bytes)`);
}
