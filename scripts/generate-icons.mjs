import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');

function ticketMark({ size, paddingRatio }) {
  const pad = Math.round(size * paddingRatio);
  const ticketW = size - pad * 2;
  const ticketH = Math.round(ticketW * 0.64);
  const x = pad;
  const y = Math.round((size - ticketH) / 2);
  const radius = Math.round(ticketW * 0.1);
  const notchR = Math.round(ticketH * 0.07);
  const notchX = x;
  const notchY1 = y + ticketH * 0.32;
  const notchY2 = y + ticketH * 0.68;
  const dashY = y + ticketH * 0.5;
  const barX = x + ticketW * 0.58;
  const barY = y + ticketH * 0.22;
  const barH = ticketH * 0.56;

  const bars = [
    [0, 0.07],
    [0.11, 0.04],
    [0.18, 0.09],
    [0.3, 0.035],
    [0.37, 0.08],
    [0.48, 0.045],
    [0.56, 0.1],
    [0.69, 0.04],
    [0.76, 0.07],
  ]
    .map(([offset, width]) => {
      const bx = barX + ticketW * offset * 0.34;
      const bw = ticketW * width * 0.34;
      return `<rect x="${bx.toFixed(1)}" y="${barY.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH.toFixed(1)}" rx="1.2" fill="#1a1916"/>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#0f6e56"/>
  <rect x="${x}" y="${y}" width="${ticketW}" height="${ticketH}" rx="${radius}" fill="#f4f1e8"/>
  <circle cx="${notchX}" cy="${notchY1.toFixed(1)}" r="${notchR}" fill="#0f6e56"/>
  <circle cx="${notchX}" cy="${notchY2.toFixed(1)}" r="${notchR}" fill="#0f6e56"/>
  <path d="M ${x + ticketW * 0.18} ${dashY} H ${x + ticketW * 0.5}" stroke="#0f6e56" stroke-width="${Math.max(2, size * 0.012)}" stroke-dasharray="${size * 0.028} ${size * 0.02}" stroke-linecap="round"/>
  <rect x="${x + ticketW * 0.18}" y="${y + ticketH * 0.22}" width="${ticketW * 0.28}" height="${ticketH * 0.1}" rx="${ticketH * 0.04}" fill="#0f6e56" opacity="0.88"/>
  <rect x="${x + ticketW * 0.18}" y="${y + ticketH * 0.64}" width="${ticketW * 0.2}" height="${ticketH * 0.07}" rx="${ticketH * 0.03}" fill="#1a1916" opacity="0.18"/>
  ${bars}
</svg>`;
}

async function writePng(name, svg, size) {
  const file = join(outDir, name);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
  console.log(`wrote ${name} (${size}x${size})`);
}

await mkdir(outDir, { recursive: true });
await writePng('icon-192.png', ticketMark({ size: 192, paddingRatio: 0.16 }), 192);
await writePng('icon-512.png', ticketMark({ size: 512, paddingRatio: 0.16 }), 512);
await writePng(
  'icon-maskable-512.png',
  ticketMark({ size: 512, paddingRatio: 0.24 }),
  512,
);
