// Regenerates the whole website/img/favicon set from the hi-res logo.
// Run from the repo root: node bulk-edit-node-scripts/make-favicons.cjs [logo.png]
// (defaults to bulk-edit-node-scripts/logo-source.png)
//
// The logo is expected to be black line-work in a ring, on white or transparent, roughly centred.
// Two versions are built from it:
//   round - the ring with transparent corners and a margin round the edge (android, ms, favicon, .ico)
//   bleed - opaque white, ring removed, rope strands continued off the bottom edge (apple, maskable)
// The ring and the strands are measured from the image, so a redrawn logo should just work;
// check the output by eye all the same.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const src = process.argv[2] || path.join(__dirname, 'logo-source.png');
const dir = 'website/img/favicon';
const RING_SHARE = 0.92;   // ring's outer diameter as a share of the round icon; the rest is margin

(async () => {
  // Flatten to opaque white so white and transparent logos are handled alike.
  const { data, info } = await sharp(src).flatten({ background: '#ffffff' }).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const lum = (x, y) => data[(y * W + x) * C];
  const dark = (x, y) => lum(x, y) < 128;
  const runs = (y) => {
    const out = []; let s = -1;
    for (let x = 0; x <= W; x++) {
      const d = x < W && dark(x, y);
      if (d && s < 0) s = x;
      if (!d && s >= 0) { out.push([s, x - 1]); s = -1; }
    }
    return out;
  };
  const colRuns = (x) => {
    const out = []; let s = -1;
    for (let y = 0; y <= H; y++) {
      const d = y < H && dark(x, y);
      if (d && s < 0) s = y;
      if (!d && s >= 0) { out.push([s, y - 1]); s = -1; }
    }
    return out;
  };

  // Ring: first and last dark runs across the middle row and column.
  const row = runs(H >> 1), col = colRuns(W >> 1);
  const cx = (row[0][0] + row.at(-1)[1]) / 2, cy = (col[0][0] + col.at(-1)[1]) / 2;
  const rOut = (row.at(-1)[1] - row[0][0] + col.at(-1)[1] - col[0][0]) / 4;
  const thick = (row[0][1] - row[0][0] + col[0][1] - col[0][0]) / 2;
  const rIn = rOut - thick - 15;   // a little inside the ring, which is hand-drawn and wobbles
  console.log(`ring centre ${cx},${cy} outer r ${rOut} thickness ${thick}`);

  // Round version: flood-fill the white outside the ring to transparent, soften its edge.
  const S = Math.round(2 * rOut / RING_SHARE);
  const ox = Math.round(S / 2 - cx), oy = Math.round(S / 2 - cy);
  const round = Buffer.alloc(S * S * 4);
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const outside = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) stack.push([0, y], [W - 1, y]);
  while (stack.length) {
    const [x, y] = stack.pop();
    if (!inside(x, y) || outside[y * W + x] || lum(x, y) < 250) continue;
    outside[y * W + x] = 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  const nearOutside = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]
    .some(([dx, dy]) => inside(x + dx, y + dy) && outside[(y + dy) * W + x + dx]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = x + ox, Y = y + oy;
    if (X < 0 || Y < 0 || X >= S || Y >= S || outside[y * W + x]) continue;
    const o = (Y * S + X) * 4, L = lum(x, y);
    if (nearOutside(x, y)) { round[o + 3] = 255 - L; }   // anti-aliased outer edge: black at its coverage
    else { round[o] = round[o + 1] = round[o + 2] = L; round[o + 3] = 255; }
  }
  const roundPng = await sharp(round, { raw: { width: S, height: S, channels: 4 } }).png().toBuffer();

  // Bleed version: strands measured at two rows just inside the ring, then run straight down.
  const inRing = (x, y) => Math.hypot(x - cx, y - cy) < rIn;
  const strandRuns = (y) => runs(y).filter(([a, b]) => inRing(a, y) && inRing(b, y));
  const y1 = Math.round(cy + rIn * 0.86), y2 = Math.round(cy + rIn * 0.92);
  const r1 = strandRuns(y1), r2 = strandRuns(y2);
  if (r1.length !== r2.length) throw new Error(`strands don't line up: ${JSON.stringify(r1)} / ${JSON.stringify(r2)}`);
  const strands = r2.map(([a, b], k) => {
    const m1 = (r1[k][0] + r1[k][1]) / 2, m2 = (a + b) / 2;
    return { at: y => m2 + (y - y2) * (m2 - m1) / (y2 - y1), half: (b - a) / 2 };
  });
  console.log(`strands: ${strands.length}`);
  const side = Math.round(2 * Math.max(cx, W - cx, cy, H - cy));
  const bx = Math.round(side / 2 - cx), by = Math.round(side / 2 - cy);
  const bleed = Buffer.alloc(side * side * 3, 255);
  for (let Y = 0; Y < side; Y++) for (let X = 0; X < side; X++) {
    const x = X - bx, y = Y - by, o = (Y * side + X) * 3;
    let v = 255;
    if (y >= y2 && strands.some(s => Math.abs(x - s.at(y)) <= s.half)) v = 0;
    else if (inside(x, y) && inRing(x, y)) v = lum(x, y);
    bleed[o] = bleed[o + 1] = bleed[o + 2] = v;
  }
  const bleedPng = await sharp(bleed, { raw: { width: side, height: side, channels: 3 } }).png().toBuffer();

  const size = (buf, n) => sharp(buf).resize(n, n, { kernel: 'lanczos3' });
  const jobs = [
    ...[36, 48, 72, 96, 144, 192, 512].map(n => [`android-icon-${n}x${n}`, roundPng, n]),
    ...[70, 144, 150, 310].map(n => [`ms-icon-${n}x${n}`, roundPng, n]),
    ...[16, 32, 96].map(n => [`favicon-${n}x${n}`, roundPng, n]),
    ...[57, 60, 72, 76, 114, 120, 144, 152, 180].map(n => [`apple-icon-${n}x${n}`, bleedPng, n]),
    ['apple-icon', bleedPng, 192],
    ['apple-icon-precomposed', bleedPng, 192],
    ['maskable-icon-192x192', bleedPng, 192],
    ['maskable-icon-512x512', bleedPng, 512],
  ];

  for (const [name, buf, n] of jobs) {
    const png = path.join(dir, `${name}.png`);
    await size(buf, n).png({ compressionLevel: 9 }).toFile(png);
    // Only refresh .webp copies that already exist.
    const webp = path.join(dir, `${name}.webp`);
    if (fs.existsSync(webp)) await sharp(png).webp({ lossless: true }).toFile(webp);
    console.log(name, n);
  }

  // favicon.ico with PNG-encoded 16/32/48 entries.
  const imgs = await Promise.all([16, 32, 48].map(n => size(roundPng, n).png().toBuffer()));
  const header = Buffer.alloc(6 + 16 * imgs.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(imgs.length, 4);
  let offset = header.length;
  imgs.forEach((img, k) => {
    const n = [16, 32, 48][k], e = 6 + 16 * k;
    header.writeUInt8(n, e); header.writeUInt8(n, e + 1);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(img.length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += img.length;
  });
  fs.writeFileSync(path.join(dir, 'favicon.ico'), Buffer.concat([header, ...imgs]));
  console.log('favicon.ico 16/32/48');
})();
