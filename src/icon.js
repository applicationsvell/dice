// ホーム画面のアイコンを SVG で描いて PNG に書き出す。
// 使い方: node src/icon.js   （Playwright が必要）
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'icons');

// 上から見たサイコロ：上の面＋手前の側面（少し暗い色）で立体に見せる
function die(x, y, size, rot, top, side, pips, pipColor, oneColor) {
  const r = size * 0.2, depth = size * 0.13;
  const lo = 0.27, hi = 0.73;
  const layout = {
    1: [[0.5, 0.5]],
    5: [[lo, lo], [hi, lo], [0.5, 0.5], [lo, hi], [hi, hi]],
    6: [[lo, lo], [lo, 0.5], [lo, hi], [hi, lo], [hi, 0.5], [hi, hi]]
  }[pips];
  const pr = pips === 1 ? size * 0.15 : size * 0.085;
  const dots = layout.map(([u, v]) =>
    `<circle cx="${(u * size).toFixed(1)}" cy="${(v * size).toFixed(1)}" r="${pr.toFixed(1)}" fill="${pips === 1 ? oneColor : pipColor}"/>`).join('');
  return `<g transform="translate(${x} ${y}) rotate(${rot}) translate(${-size / 2} ${-size / 2})">
    <rect x="${depth * 0.6}" y="${depth * 1.9}" width="${size}" height="${size}" rx="${r}" fill="#000" opacity="0.38" filter="url(#soft)"/>
    <rect x="0" y="${depth}" width="${size}" height="${size}" rx="${r}" fill="${side}"/>
    <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" fill="${top}"/>
    <rect x="${size * 0.06}" y="${size * 0.05}" width="${size * 0.88}" height="${size * 0.3}" rx="${r * 0.8}" fill="#fff" opacity="0.10"/>
    ${dots}
  </g>`;
}

function svg(scale) {
  const inner = `
    ${die(330, 205, 190, 16, '#c3141f', '#7d0b13', 6, '#f6f2ea', '#f6f2ea')}
    ${die(190, 300, 200, -11, '#f4f3ef', '#b9b7b0', 1, '#1d2027', '#d0182b')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="felt" cx="42%" cy="40%" r="75%">
      <stop offset="0" stop-color="#34478a"/><stop offset="0.6" stop-color="#22306a"/><stop offset="1" stop-color="#121a33"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>
  <rect width="512" height="512" fill="url(#felt)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${inner}</g>
</svg>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'icon.svg'), svg(1));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shots = [
    ['apple-touch-icon.png', 180, 1], ['icon-192.png', 192, 1], ['icon-512.png', 512, 1], ['maskable-512.png', 512, 0.8]
  ];
  for (const [name, size, scale] of shots) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0">${svg(scale).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await page.screenshot({ path: path.join(OUT, name), clip: { x: 0, y: 0, width: size, height: size } });
    console.log('icons/' + name);
  }
  await browser.close();
})();
