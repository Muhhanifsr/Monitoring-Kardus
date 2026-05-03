const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, 'icons');
const ICON_SRC  = path.join(ICONS_DIR, 'icon-512.png');
const BG_COLOR  = '#0a0e1a';

const SPLASHES = [
  ['splash-640x1136.png',   640,  1136],
  ['splash-750x1334.png',   750,  1334],
  ['splash-1242x2208.png', 1242,  2208],
  ['splash-1125x2436.png', 1125,  2436],
  ['splash-828x1792.png',   828,  1792],
  ['splash-1242x2688.png', 1242,  2688],
  ['splash-1170x2532.png', 1170,  2532],
  ['splash-1284x2778.png', 1284,  2778],
  ['splash-1179x2556.png', 1179,  2556],
  ['splash-1290x2796.png', 1290,  2796],
];

(async () => {
  const icon = await loadImage(ICON_SRC);
  console.log('🎨 Generating iOS PWA splash screens...\n');
  for (const [name, w, h] of SPLASHES) {
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);
    const sz = Math.round(Math.min(w, h) * 0.28);
    ctx.drawImage(icon, (w - sz) / 2, (h - sz) / 2, sz, sz);
    fs.writeFileSync(path.join(ICONS_DIR, name), canvas.toBuffer('image/png'));
    console.log(`  ✅ ${name} (${w}x${h})`);
  }
  console.log('\n✨ Semua splash screen berhasil dibuat di folder icons/');
})();
