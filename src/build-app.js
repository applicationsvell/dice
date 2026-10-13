// アーティファクト版（src/kouhaku-dice.html）から、ホーム画面アプリ版のファイルをリポジトリのルートに作る。
// 使い方: node src/build-app.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'kouhaku-dice.html'), 'utf8');

const title = (src.match(/<title>([\s\S]*?)<\/title>/) || [, '紅白ダイス'])[1].trim();
const style = (src.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
const body = src.replace(/<title>[\s\S]*?<\/title>/, '').replace(/<style>[\s\S]*?<\/style>/, '').trim();

const THEME = '#121a33';
const version = crypto.createHash('sha1').update(src + fs.readFileSync(__filename)).digest('hex').slice(0, 10);

const index = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="${THEME}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${title}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<title>${title}</title>
${style}
</head>
<body>
${body}
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
</script>
</body>
</html>
`;

const manifest = {
  name: title,
  short_name: title,
  lang: 'ja',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: THEME,
  theme_color: THEME,
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};

const sw = `// 紅白ダイス Service Worker（node src/build-app.js で作り直す）
const VERSION = '${version}';
const CACHE = 'kouhaku-dice-' + VERSION;
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('kouhaku-dice-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function timeout(ms) { return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // ページはネット優先。つながらない・遅いときは保存しておいた版を出す
    e.respondWith(
      Promise.race([fetch(req), timeout(4000)])
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  // アイコンなどは保存しておいた版を優先
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
`;

fs.writeFileSync(path.join(ROOT, 'index.html'), index);
fs.writeFileSync(path.join(ROOT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'sw.js'), sw);
fs.writeFileSync(path.join(ROOT, '.nojekyll'), '');
console.log('built index.html, manifest.webmanifest, sw.js (version ' + version + ')');
