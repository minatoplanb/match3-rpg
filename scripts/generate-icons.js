/**
 * Generate PWA icons as PNG using Canvas API
 * Run: node scripts/generate-icons.js
 *
 * Since we can't use canvas in Node without dependencies,
 * we'll create simple SVGs and reference them in the manifest.
 * Browsers accept SVG icons for PWA manifests.
 */
import { writeFileSync } from 'fs';

function generateSVG(size) {
  const r = size / 2;
  const gemR = size * 0.2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#1a1a2e"/>
  <circle cx="${r}" cy="${r * 0.65}" r="${gemR}" fill="#e74c3c" opacity="0.9"/>
  <circle cx="${r - gemR * 1.1}" cy="${r * 1.1}" r="${gemR}" fill="#2ecc71" opacity="0.9"/>
  <circle cx="${r + gemR * 1.1}" cy="${r * 1.1}" r="${gemR}" fill="#3498db" opacity="0.9"/>
  <circle cx="${r}" cy="${r * 1.45}" r="${gemR * 0.8}" fill="#f1c40f" opacity="0.8"/>
  <text x="${r}" y="${size * 0.92}" text-anchor="middle" font-family="monospace" font-size="${size * 0.08}" fill="#f1c40f" font-weight="bold">M3 RPG</text>
</svg>`;
}

writeFileSync('public/icons/icon-192.svg', generateSVG(192));
writeFileSync('public/icons/icon-512.svg', generateSVG(512));
console.log('SVG icons generated');
