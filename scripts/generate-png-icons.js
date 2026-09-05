import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcTarget = buf.subarray(4, 8 + len);
  const c = crc32(crcTarget);
  buf.writeUInt32BE(c, 8 + len);
  return buf;
}

function createPng(width, height, drawPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawScanlines[offset++] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      rawScanlines[offset++] = r;
      rawScanlines[offset++] = g;
      rawScanlines[offset++] = b;
      rawScanlines[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawScanlines);
  const idat = makeChunk('IDAT', compressedData);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Brand icon drawing logic: dark navy rounded squircle, blue clipboard, checkmark, green mic badge
function drawBrandIcon(x, y, w, h, isMaskable = false) {
  const nx = (x / w) * 2 - 1; // -1 to +1
  const ny = (y / h) * 2 - 1;
  const r = Math.sqrt(nx * nx + ny * ny);

  // Base background
  let bgR = 15, bgG = 23, bgB = 42; // #0f172a
  if (nx + ny > 0) {
    bgR = 20; bgG = 30; bgB = 60;
  }

  if (isMaskable) {
    // Maskable fills entire canvas with gradient
    // Safe zone is r <= 0.8
  } else {
    // Round squircle mask: |nx|^4 + |ny|^4 <= 0.85^4
    const d4 = Math.pow(Math.abs(nx), 4) + Math.pow(Math.abs(ny), 4);
    if (d4 > 0.8) {
      return [0, 0, 0, 0]; // Transparent outside
    }
  }

  // Inner clipboard: nx between -0.5 and 0.5, ny between -0.6 and 0.65
  const inClipboard = nx >= -0.52 && nx <= 0.52 && ny >= -0.58 && ny <= 0.65;
  if (inClipboard) {
    // Clipboard clip at top: nx between -0.22 and 0.22, ny between -0.68 and -0.52
    // Check clip
    let cr = 30, cg = 41, cb = 59; // slate-800
    // Clipboard header clip
    if (nx >= -0.22 && nx <= 0.22 && ny >= -0.65 && ny <= -0.5) {
      return [37, 99, 235, 255]; // blue-600
    }

    // Row 1: Checkbox & bar
    if (ny >= -0.38 && ny <= -0.22) {
      if (nx >= -0.42 && nx <= -0.22) {
        // Emerald check box
        return [16, 185, 129, 255];
      }
      if (nx >= -0.15 && nx <= 0.4) {
        return [148, 163, 184, 255]; // line
      }
    }

    // Row 2: Radio & bar
    if (ny >= -0.10 && ny <= 0.06) {
      const rx = nx - (-0.32);
      const ry = ny - (-0.02);
      if (rx * rx + ry * ry <= 0.08 * 0.08) {
        return [59, 130, 246, 255]; // Blue radio
      }
      if (nx >= -0.15 && nx <= 0.3) {
        return [203, 213, 225, 255]; // line
      }
    }

    // Row 3: Bar chart metric
    if (ny >= 0.18 && ny <= 0.34) {
      if (nx >= -0.42 && nx <= -0.22) {
        return [99, 102, 241, 255]; // Indigo box
      }
      if (nx >= -0.15 && nx <= 0.42) {
        return [148, 163, 184, 255];
      }
    }

    return [cr, cg, cb, 255];
  }

  // Floating mic circle badge at bottom right: center at nx=0.45, ny=0.45, radius 0.25
  const badgeDx = nx - 0.45;
  const badgeDy = ny - 0.45;
  const badgeDist = Math.sqrt(badgeDx * badgeDx + badgeDy * badgeDy);
  if (badgeDist <= 0.28) {
    if (badgeDist >= 0.25) {
      return [255, 255, 255, 255]; // white border
    }
    // Emerald microphone icon center
    if (Math.abs(badgeDx) <= 0.06 && Math.abs(badgeDy) <= 0.12) {
      return [255, 255, 255, 255]; // white mic
    }
    return [16, 185, 129, 255]; // emerald badge
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192
const pwa192 = createPng(192, 192, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

// Generate 512x512
const pwa512 = createPng(512, 512, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

// Generate 512x512 maskable (with safe background bleed)
const pwaMaskable = createPng(512, 512, (x, y, w, h) => drawBrandIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);

// Generate 180x180 Apple touch icon
const appleTouch = createPng(180, 180, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

// Generate 48x48 Favicon PNG
const favicon = createPng(48, 48, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon);

console.log('PWA PNG and Icon assets created successfully!');
