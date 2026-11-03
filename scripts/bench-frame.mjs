#!/usr/bin/env node
/* =========================================================
   UKUR BIAYA PER FRAME: berapa ms yang dimakan satu frame ekspor, dan apakah seek ke
   detik yang sama selalu menggambar hal yang sama. Dasar anggaran rupa berat (atmosfer,
   cahaya-2d, pasca): median ≤ 350 ms/frame @1920×1080, 1 worker, Chrome sistem, mesin
   acuan i3-3217U / HD 4000. Angka dari mesin lain tak sebanding — lihat `gl` di bawah.

   Menirukan jalur export-frames.mjs: seek(t) → 2×rAF → screenshot JPEG q80, N frame berurutan
   mulai detik 2 (30 fps). Frame pertama tidak masuk median (pemanasan filter/shader). Tiga frame
   pertama dipotret ulang sesudah seek maju-mundur dan hash-nya harus sama.

   Prasyarat (sekali): npm install --prefix "<folder skill>/scripts"
     (Chrome/Edge sistem dicari otomatis lewat scripts/chrome.mjs; PUPPETEER_EXECUTABLE_PATH hanya bila di lokasi
      tak standar. Menulis env di bash dan PowerShell: tabel di references/alat-kerja.md)

   Pakai (dari akar repo skill; berkas dibuka lewat file://):
     node scripts/bench-frame.mjs <berkas.html> [query] [frames=20]
     node scripts/bench-frame.mjs assets/starter-sinematik.html "clean=1" 20
   Beri clean=1 di query seperti jalur ekspor (tanpa itu halaman autoplay sampai seek pertama).
   Env: BATAS = anggaran ms (350).
   Derau antar-run besar bila mesin tidak senggang: starter-explainer.html?clean=1 terukur 201–321 ms
   dalam lima run (sambil jalan tsc/vite proyek lain). Ukur saat mesin senggang; bila hasil dekat
   batas, ulangi sebelum menyimpulkan.
   Keluaran: SATU baris JSON di stdout {page, gl, medianMs, deterministik}; galat halaman ke
   stderr, jadi `> bench.txt` tetap bersih. Keluar 1 bila medianMs > BATAS atau deterministik false.
   gl = renderer WebGL yang benar-benar dipakai (WEBGL_debug_renderer_info): "ANGLE (… Direct3D11 …)"
   = GPU; "SwiftShader" atau "Microsoft Basic Render Driver" (WARP) = jatuh diam-diam ke perangkat lunak.

   Halaman harus mengekspos window.OPENER = { W, H, DURATION, ready, seek(t) } — semua starter sudah begitu.
   ========================================================= */
import { luncurkan } from './chrome.mjs';
import { bantuan } from './bantuan.mjs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

bantuan(import.meta.url);
const [berkas, query = '', frames = '20'] = process.argv.slice(2);
const N = Number(frames), BATAS = Number(process.env.BATAS || 350);
// petunjuk ke stderr: stdout hanya untuk baris JSON
if (!berkas || !(N >= 3)) { console.error('pakai: node bench-frame.mjs <berkas.html> [query] [frames=20, minimal 3]'); process.exit(1); }

const browser = await luncurkan({
  headless: 'new',
  args: ['--use-gl=angle', '--ignore-gpu-blocklist'],
});
try {
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  // 'load' lalu OPENER.ready, bukan networkidle0: di render perangkat lunak loop render tak pernah membuat jaringan "diam"
  await page.goto(pathToFileURL(berkas).href + (query ? '?' + query : ''), { timeout: 120000 });
  await page.waitForFunction('window.OPENER && window.OPENER.ready', { timeout: 120000 });
  const { W, H, DURATION, gl } = await page.evaluate(() => {
    const O = window.OPENER, g = document.createElement('canvas').getContext('webgl'), e = g && g.getExtension('WEBGL_debug_renderer_info');
    return { W: O.W || 1920, H: O.H || 1080, DURATION: O.DURATION, gl: e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?' };
  });
  // seek lewat ujung timeline = frame yang sama berulang, median palsu-rendah: tolak
  if (2 + (N - 1) / 30 > DURATION) throw new Error(`halaman hanya ${DURATION} dtk, kurang untuk ${N} frame dari detik 2`);
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  // satu frame ekspor: seek, dua rAF (GSAP menulis gaya, loop render menggambar), lalu tangkap
  // ponytail: seek biasa, bukan OPENER.seekFrame — halaman berklip video tak diukur setia; pakai seekFrame bila perlu
  const potret = async i => {
    await page.evaluate(async t => {
      window.OPENER.seek(t);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, 2 + i / 30);
    return page.screenshot({ type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: W, height: H }, optimizeForSpeed: true });
  };
  const hash = b => createHash('md5').update(b).digest('hex');
  const ms = [], awal = [], ulang = [];
  for (let i = 0; i < N; i++) {
    const t0 = performance.now(), img = await potret(i);
    ms.push(performance.now() - t0);
    if (i < 3) awal.push(hash(img));
  }
  for (let i = 0; i < 3; i++) ulang.push(hash(await potret(i)));   // sesudah maju sampai frame N, seek mundur harus menggambar yang sama

  const s = ms.slice(1).sort((a, b) => a - b), m = s.length >> 1;
  const medianMs = Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
  const deterministik = awal.join() === ulang.join();
  console.log(JSON.stringify({ page: basename(berkas) + (query ? '?' + query : ''), gl, medianMs, deterministik }));
  if (medianMs > BATAS || !deterministik) process.exitCode = 1;
} finally { await browser.close(); }
