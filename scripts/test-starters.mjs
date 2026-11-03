#!/usr/bin/env node
/* =========================================================
   UJI ASAP: buka tiap starter di browser sungguhan dan periksa yang tidak
   bisa dilihat dari kode saja.

     1. halaman dimuat tanpa error JS dan OPENER.ready menjadi true
     2. kontrak window.OPENER lengkap (W, H, DURATION, tl, seek)
     3. LOOP benar-benar mengulang — bug yang pernah lolos: satu tween
        repeat:-1 membuat tl.duration() tak hingga sehingga onComplete tidak
        pernah terpicu dan video berhenti setelah DUR
     4. seek(t) sinkron: dua kali seek ke detik yang sama menghasilkan
        keadaan yang sama (dipakai snap.mjs & export-frames.mjs)

   Pakai (dari akar repo skill):
     npm install --prefix scripts                    (sekali)
     node scripts/test-starters.mjs [berkas.html ...]
   Chrome/Edge sistem dicari otomatis lewat scripts/chrome.mjs; PUPPETEER_EXECUTABLE_PATH hanya bila di lokasi
   tak standar (bash dan PowerShell: tabel di references/alat-kerja.md).
   ========================================================= */
import { luncurkan } from './chrome.mjs';
import { bacaPng } from './nilai-visual.mjs';
import { bantuan } from './bantuan.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

bantuan(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const files = args.length ? args
  : readdirSync(join(ROOT, 'assets')).filter(f => f.endsWith('.html')).map(f => join(ROOT, 'assets', f));

// --enable-unsafe-swiftshader: runner CI tanpa GPU tidak bisa membuat konteks WebGL (starter opener) tanpa
// renderer perangkat lunak; di mesin ber-GPU flag ini tidak terpakai.
// Halaman ditunggu sampai 'load' lalu OPENER.ready — BUKAN networkidle0: di render perangkat lunak loop
// render menyita setiap frame dan Chrome tidak pernah melaporkan "jaringan diam", walau halaman sudah siap.
const browser = await luncurkan({
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});

// starter yang wajib punya kait atmosfer/cahaya-2d/pasca; BERKAMERA = yang juga punya CAM (kabut berparalaks hanya terukur di sana: panggung belum punya CAM)
const MODUL = ['starter-explainer.html', 'starter-explainer-panggung.html', 'starter-sinematik.html', 'katalog-pustaka.html'];
const BERKAMERA = ['starter-explainer.html', 'starter-sinematik.html', 'katalog-pustaka.html'];
// halaman ber-adegan bawaan (SINEMA_UJI wajib; kait modul + kamera di ?kosong=1): starter sinematik dan katalog pustaka aset
const ADEGAN = ['starter-sinematik.html', 'katalog-pustaka.html'];
// starter painterly (src/runtime/lukis.js): adegan bawaan juga, tetapi kaitnya LUKIS_UJI + blok lukis di bawah, bukan SINEMA_UJI
const LUKIS = ['starter-lukis.html'], KOSONG = [...ADEGAN, ...LUKIS];
// 3D tanpa subjek/#hud (field CAM3_UJI null sah); tone mapping film hanya di starter sejarah/sinematik, sisanya NoToneMapping (0) = warna brand tepat
const TANPA_SUBJEK = ['starter-opener.html', 'starter-elang.html'];
const FILM = { 'starter-elang.html': 4 };   // THREE.ACESFilmicToneMapping (r161): api tetap jingga jenuh, AgX r161 memucatkannya (evals/bukti/2026-11-03-mata-elang)
// blok terbang (src/runtime/terbang.js) disuntikkan ke starter 2.5D: jalur terbang() 2.5D diuji di kamera-dom sungguhan tanpa menambah berkas starter
const TERBANG = readFileSync(join(ROOT, 'src', 'runtime', 'terbang.js'), 'utf8');
// halaman BERAT dilewati bila WebGL jatuh ke render perangkat lunak (runner CI tanpa GPU). Terukur SwiftShader, laptop acuan:
// starter-elang siap 80 dtk, satu frame 66,6 dtk, frame motion blur mematikan proses GPU. Uji penuhnya di mesin ber-GPU.
// starter-lukis: melukis SATU bidang 2240×1400 = 81,7 dtk di SwiftShader (HD 4000: ±0,3 dtk + kompilasi shader), halaman 5 bidang + 20 sprite
// melewati batas siap 60 dtk; bagian murninya diuji test-lukis.mjs di CI.
const BERAT = ['starter-elang.html', 'starter-lukis.html'];
const glLunak = await (async () => { const p = await browser.newPage();
  const r = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'), e = g && g.getExtension('WEBGL_debug_renderer_info');
    return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; });
  await p.close(); return /SwiftShader|llvmpipe|softpipe|Basic Render/i.test(r) ? r : ''; })();

let gagal = 0, lewat = 0;
for (const file of files) {
  const name = basename(file);
  if (glLunak && BERAT.includes(name)) { lewat++; console.log(`lewat  ${name} — WebGL perangkat lunak (${glLunak}): terlalu berat, uji di mesin ber-GPU`); continue; }
  // halaman bawaan ADEGAN sudah berisi adegan (langit, grade, bidang [data-z]); kait modul dan kamera mengandaikan halaman yang
  // belum memakai modul (awalBersih, jalur 2D tanpa bidang, grade netral), jadi dijalankan di ?kosong=1 (rig + modul tanpa adegan).
  // Kait adegan (SINEMA_UJI) dibaca dari halaman bawaan. Katalog kamera ?demo=1 tidak ada di halaman ini.
  const adegan = KOSONG.includes(name);
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const masalah = [];
  try {
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction('window.OPENER && window.OPENER.ready', { timeout: 60000 });

    const kontrak = await page.evaluate(() => {
      const O = window.OPENER;
      return { W: O.W, H: O.H, DURATION: O.DURATION, tl: !!O.tl, seek: typeof O.seek === 'function' };
    });
    for (const k of ['W', 'H', 'DURATION']) if (!kontrak[k]) masalah.push(`OPENER.${k} kosong`);
    if (!kontrak.tl) masalah.push('OPENER.tl kosong');
    if (!kontrak.seek) masalah.push('OPENER.seek bukan fungsi');

    // t=0 pada halaman SEGAR (jalur export-frames: ?clean=1 tidak autoplay, tl belum pernah bergerak; tl.pause(0) lalu
    // seek(0)) harus sama dengan seek(0) sesudah seek lain — dulu pause(0) dari playhead 0 tidak menerapkan set() di t=0
    const segar = await browser.newPage();
    await segar.goto(pathToFileURL(file).href + '?clean=1', { waitUntil: 'load', timeout: 60000 });
    await segar.waitForFunction('window.OPENER && window.OPENER.ready', { timeout: 60000 });
    const sidikSegar = await segar.evaluate(() => window.ELANG_SIDIK ? window.ELANG_SIDIK() : null);   // geometri lanskap: sama di tiap muat (worker ekspor)
    const nol = await segar.evaluate(() => {
      const O = window.OPENER, rig = () => document.querySelector('#world, #stage')?.getAttribute('style') || '', c = document.querySelector('canvas');
      const ambil = () => ({ r: rig(), c: c ? c.toDataURL() : '' });
      O.tl.pause(0); O.seek(0); const a = ambil();
      O.seek(Math.min(O.DURATION - .1, 3)); O.seek(0); const b = ambil();
      return { rig: a.r === b.r, kanvas: a.c === b.c };
    });
    await segar.close();
    if (!nol.rig) masalah.push('seek(0) pada halaman segar ≠ seek(0) sesudah seek lain (transform rig)');
    if (!nol.kanvas) masalah.push('seek(0) pada halaman segar ≠ seek(0) sesudah seek lain (piksel kanvas)');

    // loop: dorong playhead melewati DURATION saat timeline BERMAIN, lalu pastikan
    // ia kembali ke awal. Sengaja tidak menunggu waktu nyata: saat mesin sibuk GSAP
    // meredam lag (lagSmoothing) sehingga timeline maju lebih lambat daripada jam
    // dinding — uji berbasis penungguan jadi flaky. Cara ini menguji mekanismenya
    // langsung: penjaga loop membaca tl.time() di ticker, jadi satu tick sudah cukup.
    const loop = await page.evaluate(async () => {
      const O = window.OPENER, g = window.gsap;
      O.tl.play(); O.tl.time(O.DURATION + 0.05);
      for (let i = 0; i < 60; i++) {
        if (g && g.ticker && g.ticker.tick) g.ticker.tick();
        await new Promise(r => requestAnimationFrame(r));
        if (O.tl.time() < O.DURATION * 0.5) break;
      }
      return { t: O.tl.time(), D: O.DURATION, durasiTl: O.tl.duration() };
    });
    if (!(loop.t < loop.D * 0.5))
      masalah.push(`loop tidak mengulang: playhead tetap di ${loop.t.toFixed(2)} setelah melewati DURATION=${loop.D}`
        + (loop.durasiTl > loop.D * 100 ? ` (tl.duration()=${loop.durasiTl} — ada tween repeat:-1, jadi onComplete memang tidak akan terpicu)` : ''));

    // seek sinkron & idempoten
    const seek = await page.evaluate(async () => {
      const O = window.OPENER, t = Math.min(1, O.DURATION / 3);
      O.tl.pause(); O.seek(t);
      const a = document.querySelector('#world, #stage')?.getAttribute('style') || '';
      O.seek(t);
      const b = document.querySelector('#world, #stage')?.getAttribute('style') || '';
      return { sama: a === b, waktu: O.tl.time(), t };
    });
    if (!seek.sama) masalah.push('seek(t) dua kali menghasilkan keadaan berbeda');
    if (Math.abs(seek.waktu - seek.t) > 0.001) masalah.push(`seek(t) tidak memindahkan playhead (${seek.waktu} ≠ ${seek.t})`);

    // determinisme PIKSEL kanvas WebGL: t yang sama lewat dua jalur seek berbeda → gambar identik
    const kanvas = await page.evaluate(() => {
      const c = document.querySelector('canvas'); if (!c) return null;
      const O = window.OPENER, t = Math.min(5, O.DURATION * .6), t2 = Math.min(O.DURATION - .1, t + 3);
      O.tl.pause(); O.seek(t); const a = c.toDataURL();
      O.seek(t2); O.seek(.1); O.seek(t); const b = c.toDataURL();
      const kosong = document.createElement('canvas'); kosong.width = c.width; kosong.height = c.height;
      return { sama: a === b, kosong: a === kosong.toDataURL() };
    });
    if (kanvas && !kanvas.sama) masalah.push('kanvas: t yang sama lewat jalur seek berbeda memberi piksel berbeda');
    if (kanvas && kanvas.kosong) masalah.push('kanvas: hasil render kosong saat dibaca setelah seek');

    // adegan bawaan starter-sinematik (SINEMA_UJI): paralaks hidup, rig/[data-z] tanpa efek perata, semua modul terpasang; lalu
    // determinisme piksel SEMUA kanvas #stage (langit + partikel + nyala), bukan hanya yang pertama seperti pemeriksaan bawaan.
    // Dibaca dari halaman bawaan SEBELUM kait modul: ATM_UJI mengganti langit adegan, PASCA_UJI membuang lapisan dan tween GRADE-nya.
    let sinema = null, kanvasSinema = [];
    if (await page.evaluate(() => !!window.SINEMA_UJI)) {
      sinema = await page.evaluate(() => window.SINEMA_UJI());
      kanvasSinema = await page.evaluate(() => {
        const C = [...document.querySelectorAll('#stage canvas')], O = window.OPENER, t = Math.min(5, O.DURATION * .6), t2 = Math.min(O.DURATION - .1, t + 3),
          foto = () => C.map(c => c.toDataURL());
        O.tl.pause(); O.seek(t); const a = foto(); O.seek(t2); O.seek(.1); O.seek(t); const b = foto();
        return C.map((c, i) => { const k = document.createElement('canvas'); k.width = c.width; k.height = c.height;
          return { nama: `${c.id || c.className} ${c.width}×${c.height}`, sama: a[i] === b[i], kosong: a[i] === k.toDataURL() }; });
      });
    }
    if (ADEGAN.includes(name) && !sinema) masalah.push('sinema: SINEMA_UJI tidak ada');
    if (sinema) {
      if (!sinema.paralaks) masalah.push('sinema: bidang terjauh dan terdekat (yang tampil) tidak bergeser berbeda (> 1 px) saat CAM.fx += 300');
      if (!sinema.rigBersih) masalah.push(`sinema: rig atau pembungkus [data-z] ber-filter/mix-blend-mode/opacity/clip-path/mask (computed) — paralaks rata: ${sinema.kotor}`);
      if (!sinema.adaSemua) masalah.push(`sinema: modul tidak lengkap — perlu #wv-langit, ≥ 3 .wv-kabut, ≥ 1 .wv-partikel, .wv-pendar, lapisan GRADE (katalog: + api, asap, 4 kain, ≥ 10 jenis aset pustaka) (dapat ${JSON.stringify(sinema.ada)})`);
      if (!kanvasSinema.length) masalah.push('sinema: tidak ada kanvas di #stage');
      for (const k of kanvasSinema) {
        if (!k.sama) masalah.push(`sinema: kanvas ${k.nama}: t yang sama lewat jalur seek berbeda memberi piksel berbeda`);
        if (k.kosong) masalah.push(`sinema: kanvas ${k.nama}: hasil render kosong saat dibaca setelah seek`);
      }
    }

    // lukis (src/runtime/lukis.js): tiap bidang dilukis SEKALI saat setup, sapuan menempel pada objek → tidak "mendidih". Dinilai dari
    // screenshot ?clean=1 di 1920×1080 (yang sungguh dilihat penonton, compositing ikut), PNG dibuka bacaPng (nilai-visual.mjs):
    //   sidik — piksel semua kanvas #world sama di dua muat halaman (worker ekspor); seek — detik sama lewat dua jalur → piksel identik;
    //   diam  — kamera ditahan di pose t, waktu maju 1/60 dtk, sprite/legenda/vignette disembunyikan → bidang lukisan identik;
    //   tepi  — kanvas data-penuh menutup frame sepanjang gerak kamera;
    //   geser — satu bidang sendirian, kamera digeser: bidang = dirinya tergeser 40 px (fx += 40·(P0 − z)/P0; terdepan tepat, terjauh ±2);
    //   MUTASI wajib tertangkap: filter layar ber-seed per frame (yang mendidih) gagal `diam`, tekstur layar diam (shower door) gagal `geser`.
    if (LUKIS.includes(name)) {
      const p = await browser.newPage(),
        png = async () => bacaPng(await p.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } })),
        seek = t => p.evaluate(async t => { OPENER.seek(t); await __dua(); OPENER.seek(t); }, t),
        tampil = v => p.evaluate(v => { for (const e of document.querySelectorAll('.wv-lukis-sprite,#ui,#vig')) e.style.visibility = v ? '' : 'hidden'; }, v),
        sidik = pg => pg.evaluate(() => { let h = 2166136261, n = 0;
          for (const c of document.querySelectorAll('#world canvas')) { n++; const d = new Uint32Array(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer);
            for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619); }
          return n + ' kanvas ' + (h >>> 0).toString(16); }),
        // pecahan piksel b(x) ≠ a(x + s) (selisih kanal > tol), x di [0, w − s)
        beda = (a, b, s = 0, tol = 0) => { let n = 0, x = 0;
          for (let y = 0; y < a.h; y++) for (let i = 0; i < a.w - s; i++) { const j = (y * a.w + i) * 4, k = j + s * 4; n++;
            if (Math.abs(b.px[j] - a.px[k]) > tol || Math.abs(b.px[j + 1] - a.px[k + 1]) > tol || Math.abs(b.px[j + 2] - a.px[k + 2]) > tol) x++; }
          return x / n; },
        diam = async () => { await seek(5); await tampil(false); await p.evaluate(() => { window.__cam = { ...CAM }; }); const a = await png();
          await seek(5 + 1 / 60); await p.evaluate(async () => { Object.assign(CAM, window.__cam); applyCam(); await __dua(); });
          const b = await png(); await tampil(true); return beda(a, b); },
        geser = async (z, s) => { const dx = await p.evaluate(async (z, s) => {
            Object.assign(CAM, { fx: W / 2, fy: H / 2, zoom: 1, pitch: 0, yaw: 0, roll: 0, shake: 0, mm: 35, rail: -1, blur: 0, aperture: 0 }); applyCam();
            for (const b of BIDANG) b.el.style.visibility = b.z === z ? '' : 'hidden'; await __dua(); return s * (P0 - z) / P0; }, z, s);
          await tampil(false); const a = await png();
          await p.evaluate(async dx => { CAM.fx += dx; applyCam(); await __dua(); }, dx); const b = await png();
          await tampil(true); await p.evaluate(() => { for (const b of BIDANG) b.el.style.visibility = ''; });
          return { tepat: beda(a, b, s), dua: beda(a, b, s, 2) }; };
      p.on('pageerror', e => errs.push(e.message));
      try {
        await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
        await p.goto(pathToFileURL(file).href + '?clean=1', { waitUntil: 'load', timeout: 60000 });
        await p.waitForFunction('window.OPENER && window.OPENER.ready', { timeout: 60000 });
        await p.evaluate(() => { window.__dua = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
        const s1 = await sidik(page), s2 = await sidik(p);
        if (s1 !== s2 || /^0 /.test(s1)) masalah.push(`lukis: piksel kanvas lukisan beda antara dua muat halaman (${s1} vs ${s2}) — worker ekspor akan berbeda`);
        await seek(5); const a = await png(); await seek(11); await seek(.1); await seek(5); const b = await png(), sk = beda(a, b);
        if (sk) masalah.push(`lukis: seek(5) lewat dua jalur memberi ${(sk * 100).toFixed(3)} % piksel berbeda`);
        const d = await diam();
        if (d) masalah.push(`lukis: MENDIDIH — kamera ditahan, waktu maju 1/60 dtk: ${(d * 100).toFixed(3)} % piksel bidang lukisan berubah`);
        const tepi = await p.evaluate(() => { const st = $('#stage').getBoundingClientRect(), K = [...document.querySelectorAll('.wv-lukis[data-penuh]')], buruk = [];
          for (let t = 0; t <= OPENER.DURATION; t += .5) { OPENER.seek(Math.min(t, OPENER.DURATION - .01));
            for (const c of K) { const r = c.getBoundingClientRect();
              if (r.left > st.left + 1 || r.top > st.top + 1 || r.right < st.right - 1 || r.bottom < st.bottom - 1) buruk.push(t + ' dtk z ' + c.parentElement.dataset.z); } }
          return { n: K.length, buruk }; });
        if (!tepi.n || tepi.buruk.length) masalah.push(`lukis: tepi kanvas data-penuh masuk frame (${tepi.n} kanvas): ${tepi.buruk.slice(0, 4).join(', ')} — besarkan pad`);
        const zs = await p.evaluate(() => BIDANG.filter(b => b.el.querySelector(':scope>.wv-lukis')).map(b => b.z)), z0 = Math.max(...zs), z1 = Math.min(...zs);
        const g0 = await geser(z0, 40), g1 = await geser(z1, 40);
        if (g0.tepat > .0005) masalah.push(`lukis: bidang z ${z0} tidak ikut kamera utuh — geser 40 px: ${(g0.tepat * 100).toFixed(3)} % piksel ≠ dirinya tergeser`);
        if (g1.dua > .002) masalah.push(`lukis: bidang z ${z1} tidak ikut kamera utuh — geser 40 px: ${(g1.dua * 100).toFixed(3)} % piksel beda > 2`);
        await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute"><filter id="mutDidih"><feTurbulence baseFrequency=".04" numOctaves="2" seed="1"/><feDisplacementMap in="SourceGraphic" scale="8" xChannelSelector="R" yChannelSelector="G"/></filter></svg>');
          const f = document.querySelector('#mutDidih feTurbulence'); $('#view').style.filter = 'url(#mutDidih)'; rantaiUpdate(() => f.setAttribute('seed', 1 + Math.floor(tl.time() * 60))); });
        const md = await diam();
        await p.evaluate(() => { $('#view').style.filter = ''; const e = document.createElement('div'), n = "<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence baseFrequency='.7' numOctaves='2'/></filter><rect width='256' height='256' filter='url(%23n)'/></svg>";
          e.style.cssText = 'position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;opacity:.35;background:url("data:image/svg+xml,' + n.replace(/</g, '%3C').replace(/>/g, '%3E') + '")'; $('#stage').appendChild(e); });
        const ml = await geser(z0, 40);
        if (!(md > .05)) masalah.push(`lukis: uji diam tumpul — mutasi filter layar ber-seed per frame hanya mengubah ${(md * 100).toFixed(2)} % piksel (harus > 5 %)`);
        if (!(ml.dua > .05)) masalah.push(`lukis: uji geser tumpul — mutasi tekstur layar diam hanya ${(ml.dua * 100).toFixed(2)} % piksel beda (harus > 5 %)`);
        console.log(`       lukis: ${s1}; seek ${sk}; diam ${d}; geser z ${z0} ${g0.tepat.toFixed(5)}, z ${z1} ${g1.tepat.toFixed(5)}/${g1.dua.toFixed(5)}; mutasi didih ${md.toFixed(3)}, layar ${ml.dua.toFixed(3)}`);
      } finally { await p.close(); }
    }

    // kait modul + kamera di bawah: halaman tanpa adegan (lihat `adegan` di atas)
    if (adegan) {
      await page.goto(pathToFileURL(file).href + '?kosong=1', { waitUntil: 'load', timeout: 60000 });
      await page.waitForFunction('window.OPENER && window.OPENER.ready', { timeout: 60000 });
    }

    // atmosfer (src/runtime/atmosfer.js): langit/partikel/kabut sama di dua jalur seek, kabut berparalaks, langit tanpa
    // WebGL2 jatuh ke gradien CSS, jenis partikel salah dan bidang non-HTML (<g> SVG) ditolak. Kait membangun fixture sendiri lalu membersihkannya.
    // Field null = butuh CAM (panggung belum punya) → dilewati; di halaman bawaan (starter ber-adegan: ?kosong=1), sebelum blok kamera memuat ulang.
    // blok di ATAS kode adegan: const-nya (LANGIT, JENIS_PARTIKEL, …) masih TDZ bagi kode sebelum blok, dan kode adegan
    // yang memakai modul selalu sesudah `const tl=` (rantaiUpdate butuh tl) — blok sesudahnya = ReferenceError saat dimuat
    const html = readFileSync(file, 'utf8'), iAtm = html.indexOf('<wv:atmosfer>');
    if (iAtm >= 0 && !(iAtm < html.indexOf('const tl='))) masalah.push('atmosfer: blok <wv:atmosfer> harus di atas `const tl=` (kode adegan memanggil modul saat dimuat)');
    const atm = await page.evaluate(() => window.ATM_UJI ? window.ATM_UJI() : null);
    if (MODUL.includes(name) && !atm) masalah.push('atmosfer: ATM_UJI tidak ada');
    if (atm) {
      const ada = k => atm[k] != null;
      for (const k of ['seekSama', 'fallback', 'jenisDitolak', 'kabutDitolak', 'partikelDitolak', 'lapisUrut', ...(BERKAMERA.includes(name) ? ['kabutParalaks', 'kabutMenutup'] : [])])
        if (!ada(k)) masalah.push(`atmosfer: field ${k} kosong`);
      if (ada('seekSama') && !atm.seekSama) masalah.push('atmosfer: .wv-partikel/#wv-langit/.wv-kabut berbeda antara seek(5) langsung dan seek(9)→seek(.1)→seek(5)');
      if (ada('kabutParalaks') && !atm.kabutParalaks) masalah.push('atmosfer: .wv-kabut di bidang z −600 dan z 0 tidak bergeser berbeda (> 1 px) saat CAM.fx += 300');
      if (ada('kabutMenutup') && !atm.kabutMenutup) masalah.push('atmosfer: ujung pita .wv-kabut masuk frame saat kamera bergeser ±300 px di salah satu fase hanyut');
      if (ada('lapisUrut') && !atm.lapisUrut) masalah.push('atmosfer: lapisDepan() tidak menumpuk urut panggilan (lapisan baru harus di atas lapisan depan sebelumnya, di bawah anak #stage lain)');
      if (ada('fallback') && !atm.fallback) masalah.push('atmosfer: tanpa WebGL2 langit() harus mengembalikan <div> bergradien, bukan error');
      if (ada('jenisDitolak') && !atm.jenisDitolak) masalah.push("atmosfer: partikel({jenis:'salju'}) harus melempar error yang menyebut jenis yang tersedia");
      if (ada('kabutDitolak') && !atm.kabutDitolak) masalah.push("atmosfer: kabut(<g> SVG, {y}) harus melempar error yang menyebut 'elemen HTML' — bidang SVG memberi lapisan tak terlihat yang tetap menelan biaya tiap frame");
      if (ada('partikelDitolak') && !atm.partikelDitolak) masalah.push("atmosfer: partikel(<g> SVG, …) dan partikel('Depan', …) harus melempar error yang menyebut 'elemen HTML' (bukan \"bidang.appendChild is not a function\")");
    }

    // cahaya-2d (src/runtime/cahaya-2d.js): kedip pendar sama di dua jalur seek dan benar-benar hidup, rim menjauhi
    // sumber (juga di grup tercermin), filter/mask dipanggang, nama sumber salah dan svg non-<svg> di redup() ditolak. Fixture sendiri, dibersihkan.
    // Blok di atas `const tl=` seperti atmosfer: sumber() ter-hoist, tetapi const SUMBER-nya TDZ bagi kode adegan.
    const iCahaya = html.indexOf('<wv:cahaya-2d>');
    if (iCahaya >= 0 && !(iCahaya < html.indexOf('const tl='))) masalah.push('cahaya-2d: blok <wv:cahaya-2d> harus di atas `const tl=` (kode adegan memanggil modul saat dimuat)');
    const cahaya = await page.evaluate(() => window.CAHAYA_UJI ? window.CAHAYA_UJI() : null);
    if (MODUL.includes(name) && !cahaya) masalah.push('cahaya-2d: CAHAYA_UJI tidak ada');
    if (cahaya) {
      const ada = k => cahaya[k] != null;
      for (const k of ['kedipSama', 'kedipHidup', 'rimArah', 'statis', 'namaDitolak', 'redupDitolak', 'reliefAlfa']) if (!ada(k)) masalah.push(`cahaya-2d: field ${k} kosong`);
      if (ada('kedipSama') && !cahaya.kedipSama) masalah.push('cahaya-2d: opacity .wv-pendar berbeda antara seek(4) langsung dan seek(9)→seek(.1)→seek(4)');
      if (ada('kedipHidup') && !cahaya.kedipHidup) masalah.push('cahaya-2d: opacity .wv-pendar ber-kedip sama di t 4 dan 4,5 — kedip mati');
      if (ada('rimArah') && !cahaya.rimArah) masalah.push('cahaya-2d: feOffset rim tidak menjauhi sumber (el di x 1500: sumber x 500 → dx > 0, x 2500 → dx < 0; terbalik di grup scale(-1,1))');
      if (ada('statis') && !cahaya.statis) masalah.push('cahaya-2d: <filter>/<mask> di #stage berubah antara seek(2) dan seek(8) — filter cahaya harus dipanggang');
      if (ada('namaDitolak') && !cahaya.namaDitolak) masalah.push("cahaya-2d: rim(el,'tidakada') harus melempar error yang menyebut sumber yang tersedia");
      if (ada('redupDitolak') && !cahaya.redupDitolak) masalah.push("cahaya-2d: redup(<div> bidang, …) harus melempar error yang menyebut 'elemen <svg>' — hanya <svg> bidang yang sah, bukan <div> atau <g>");
      if (ada('reliefAlfa') && !cahaya.reliefAlfa) { const [acuan, s, k] = cahaya.alfaRelief || [];
        masalah.push(`cahaya-2d: relief() mengubah alfa piksel tembus pandang (rect fill-opacity .3: α acuan ${acuan}, relief sumber ${s}, relief+spekular ${k}; selisih harus ≤ 2)`); }
    }

    // pasca (src/runtime/pasca.js): lapisan grade = blend lighten/darken/multiply (+ halation screen) di luar rig, halation
    // menempel pada pendar di skala stage berapa pun dan mengikutinya (sumber terlambat/hilang, opacity leluhur), grade()
    // sungguhan (tl → seek → GRADE → lapisan) men-tween warna dan opacity, preset tak dikenal ditolak, dan tanpa grade()
    // tidak ada lapisan. kontras/saturasi = filter hanya di VIEW pemuat rig (tidak pernah rig/[data-z]; netral tak menulis
    // apa pun). Fixture sendiri (satu sumber sementara), dibersihkan — termasuk lapisan singleton. Blok di atas
    // `const tl=` seperti modul lain.
    const iPasca = html.indexOf('<wv:pasca>');
    if (iPasca >= 0 && !(iPasca < html.indexOf('const tl='))) masalah.push('pasca: blok <wv:pasca> harus di atas `const tl=` (kode adegan memanggil modul saat dimuat)');
    const pasca = await page.evaluate(() => window.PASCA_UJI ? window.PASCA_UJI() : null);
    if (MODUL.includes(name) && !pasca) masalah.push('pasca: PASCA_UJI tidak ada');
    if (pasca) {
      const ada = k => pasca[k] != null;
      for (const k of ['awalBersih', 'lapisBenar', 'halationSkala', 'halationIkut', 'halationLeluhur', 'warnaTween', 'gradeKosong', 'presetDitolak', 'presetLengkap', 'filterView', 'filterPulih', 'netral', 'dibersihkan']) if (!ada(k)) masalah.push(`pasca: field ${k} kosong`);
      if (ada('awalBersih') && !pasca.awalBersih) masalah.push('pasca: lapisan .wv-pasca sudah ada sebelum grade() pertama (blok harus inert saat dimuat)');
      if (ada('lapisBenar') && !pasca.lapisBenar) masalah.push(`pasca: mixBlendMode bayangan/sorot/vignette/halation harus lighten,darken,multiply,screen (dapat ${pasca.blend}) dan filter/opacity/blend/clip/mask rig + [data-z] tidak berubah oleh lapisan maupun oleh kontras/saturasi ≠ 1 (rigBersih ${pasca.rigBersih}) — filter di rig meratakan paralaks`);
      if (ada('filterView') && !pasca.filterView) masalah.push("pasca: GRADE kontras 1,08 / saturasi ,9 harus menulis 'contrast(1.08) saturate(0.9)' ke VIEW yang memuat rig (anak #stage, mis. #collage) — di starter panggung (view = rig) tidak boleh menulis apa pun");
      if (ada('filterPulih') && !pasca.filterPulih) masalah.push("pasca: filter asing pada view (mis. blur whip() ke #collage) harus ditimpa lagi oleh kontras/saturasi non-netral pada frame berikutnya — dibandingkan dengan nilai hidup, bukan cache modul; kalau tidak, seek langsung sesudah whip memberi frame berbeda dari putar berurutan");
      if (ada('netral') && !pasca.netral) masalah.push('pasca: kontras = saturasi = 1 (netral) tidak boleh menulis filter ke view, kembali ke netral harus menghapus filter yang ditulis modul, dan filter asing pada view tidak boleh ikut terhapus');
      if (ada('halationSkala') && !pasca.halationSkala) masalah.push(`pasca: left halation (px stage) berbeda > 1 px antara #stage scale .5 dan 1 (${pasca.halationKiri})`);
      if (ada('halationIkut') && !pasca.halationIkut) masalah.push('pasca: halation tidak mengikuti pendar yang digeser, tidak muncul untuk sumber yang didaftarkan sesudah lapisan dibuat, atau tidak hilang saat sumbernya dilepas');
      if (ada('halationLeluhur') && !pasca.halationLeluhur) masalah.push(`pasca: halation tidak ikut opacity leluhur pendar — opacity 1 / .5 / 0 pada induk bidang harus memberi alfa halation a / a÷2 / display:none (dapat ${pasca.alfaLeluhur}); fly()/fadeUp()/show() memudarkan aset yang memuat pendar, sedangkan halation ada di luar view`);
      if (ada('warnaTween') && !pasca.warnaTween) masalah.push(`pasca: grade(6,2,{bayangan:'#ffffff',bayanganKuat:1},'none') + seek(7) harus memberi GRADE.bayangan = titik tengah #1a1440→#ffffff (rgb 141,138,160) dan bayanganKuat .75, dan lapisan bayangan harus menulis warna + opacity itu (dapat: ${pasca.tengah})`);
      if (ada('gradeKosong') && !pasca.gradeKosong) masalah.push('pasca: grade() harus tanpa nilai kembali — tl.to mengembalikan tl induk, jadi grade(...).kill() akan mematikan seluruh timeline');
      if (ada('presetDitolak') && !pasca.presetDitolak) masalah.push("pasca: grade(0,1,'neon') harus melempar error yang menyebut semua preset yang tersedia");
      if (ada('presetLengkap') && !pasca.presetLengkap) masalah.push('pasca: setiap PRESET_GRADE harus memuat tepat semua kunci GRADE (kalau tidak, pindah preset menyisakan nilai preset lama)');
      if (ada('dibersihkan') && !pasca.dibersihkan) masalah.push('pasca: PASCA_UJI meninggalkan lapisan singleton, sumber sementara, atau nilai GRADE yang berubah — grade() sungguhan sesudahnya tidak mulai dari nol');
    }

    // lukis (src/runtime/lukis.js), kait modul: fixture di luar rig — lukis ulang = byte sama; markup sama di kotak tergeser (24, 16) =
    // piksel sama di ruang OBJEK (derau ikut objek, bukan kanvas/layar); seed lain = sapuan lain; tanpa WebGL2 = raster mentah; kenop salah ditolak
    const lk = await page.evaluate(async () => window.LUKIS_UJI ? await window.LUKIS_UJI() : null);
    if (LUKIS.includes(name) && !lk) masalah.push('lukis: LUKIS_UJI tidak ada');
    if (lk) {
      for (const k of ['ulangSama', 'seedBeda', 'geserSama', 'mentah', 'opsiDitolak']) if (lk[k] == null) masalah.push(`lukis: field ${k} kosong`);
      if (lk.kosong) masalah.push('lukis: fixture dilukis kosong (semua piksel 0)');
      if (lk.ulangSama === false) masalah.push('lukis: markup + seed sama dilukis dua kali memberi piksel berbeda');
      if (lk.seedBeda === false) masalah.push('lukis: seed berbeda memberi sapuan sama — seed tidak sampai ke shader');
      if (lk.geserSama === false) masalah.push(`lukis: markup sama di kotak tergeser (24, 16) beda di ruang objek (${lk.geserBeda} kanal > 1) — derau mengikuti kanvas/layar, bukan objek`);
      if (lk.mentah === false) masalah.push('lukis: tanpa WebGL2 kanvas harus berisi raster mentah (tidak kosong, beda dari hasil lukis)');
      if (lk.opsiDitolak === false) masalah.push('lukis: lukis.bidang(el, m, {kuas: -1}) harus ditolak dengan pesan "kuas harus angka"');
    }

    // kamera 2.5D (src/runtime/kamera-dom.js): jalur 2D tidak menyentuh gaya lain; sudut → transform 3D;
    // bidang data-z berparalaks; cahaya; katalog ?demo=1 selesai sebelum DUR. Halaman dimuat ULANG dengan ?demo=1
    // (starter ber-adegan: ?kosong=1, tanpa katalog) supaya pemeriksaan di atas tetap menguji jalur default deliverable.
    let cam = null;
    if (await page.evaluate(() => !!window.CAM_UJI)) {
      await page.goto(pathToFileURL(file).href + (adegan ? '?kosong=1' : '?demo=1'), { waitUntil: 'load', timeout: 60000 });
      await page.waitForFunction('window.OPENER && window.OPENER.ready', { timeout: 60000 });
      cam = await page.evaluate(() => window.CAM_UJI());
    }
    if (cam) {
      if (cam.gayaLain !== '') masalah.push(`kamera: jalur 2D menulis gaya selain transform 2D: ${cam.gayaLain}`);
      if (!/rotateY\(5deg\)/.test(cam.t3d || '')) masalah.push(`kamera: yaw 5° tidak menghasilkan rotateY(5deg): ${cam.t3d}`);
      if (!cam.paralaks) masalah.push('kamera: bidang data-z tidak bergeser berbeda dari z=0 saat truck');
      if (cam.lampu !== 'multiply') masalah.push(`kamera: light('golden') tidak memasang overlay multiply (${cam.lampu})`);
      if (!cam.lensa) masalah.push('kamera: lens(mm) tidak mengubah ukuran bidang data-z');
      if (!cam.filterAsing) masalah.push('kamera: applyCam menghapus filter rig yang bukan miliknya');
      if (!cam.hudStage) masalah.push('kamera: rectIn(el, #stage) ikut menghitung posisi #stage di viewport');
      if (!cam.shakeHidup) masalah.push('kamera: shake ≠ 0 tanpa tween CAM membeku saat diputar');
      if (!cam.urutanDitolak) masalah.push("kamera: light() dengan 'at' mundur harus ditolak");
      if (!adegan && !(cam.demoAkhir > 0 && cam.demoAkhir < cam.DUR)) masalah.push(`kamera: ?demo=1 harus selesai sebelum DUR (${cam.demoAkhir} vs ${cam.DUR})`);
      // terbang() 2.5D: backend membaca RAILS[CAM.rail](t) — zoom diwujudkan sebagai dolly (perspective = W·mm/36, mm·zoom tetap),
      // roll dari tikungan, sama di dua jalur seek, dan sesudah terbang CAM mewarisi pose akhir tanpa lompatan
      const t25 = await page.evaluate(src => { (0, eval)(src);
        const at = Math.max(planAt, 0) + 1, K = PLAN.mm * PLAN.zoom, R = terbang(at, 2, [[W / 2, H / 2, 1], [W / 2 + 500, H / 2 - 80, 1.8], [W / 2 + 900, H / 2 + 40, 3]], { guncang: 0 });
        const angka = s => (s.match(/-?[\d.]+(e-?\d+)?/g) || []).map(Number), ambil = t => { window.OPENER.seek(t); return rig.style.transform; };
        const a = ambil(at + 1), s1 = R(at + 1), b = ambil(at + 2 - 1e-4), c = ambil(at + 2 + 1e-4), lepas = CAM.rail === -1; ambil(at + .3); const a2 = ambil(at + 1);
        // style.transform diserialisasi Chrome ke 6 angka bermakna: bandingkan relatif, bukan 1e-6
        const P = +(/perspective\(([\d.]+)px\)/.exec(a) || [])[1], rz = +(/rotateZ\((-?[\d.e-]+)deg\)/.exec(a) || [])[1];
        const nb = angka(b), nc = angka(c);
        return { dolly: Math.abs(P / (W * s1.mm / 36) - 1) < 1e-5 && Math.abs(s1.mm * s1.zoom - K) < 1e-9, roll: Math.abs(rz) > .3, sama: a === a2,
          sambung: nb.length === nc.length && nb.every((v, i) => Math.abs(v - nc[i]) < .5), lepas, a, b, c };
      }, TERBANG);
      if (!t25.dolly) masalah.push(`terbang 2.5D: perspective rig harus W·mm/36 dari pose terbang (mm·zoom tetap) — ${t25.a}`);
      if (!t25.roll) masalah.push(`terbang 2.5D: tikungan tidak menghasilkan rotateZ — ${t25.a}`);
      if (!t25.sama) masalah.push('terbang 2.5D: transform rig di detik yang sama berbeda antara dua jalur seek');
      if (!t25.sambung || !t25.lepas) masalah.push(`terbang 2.5D: lompatan saat terbang selesai (${t25.b} → ${t25.c}) atau CAM.rail tidak kembali -1`);
    }

    // mata elang (starter-elang.html): jalur kontinu 120 Hz, roll dalam batas, kamera lolos celah gapura dengan jarak bebas,
    // motion blur hanya di segmen KABUR, geometri lanskap sama di dua muat halaman. Di halaman bawaan, SEBELUM kait kamera 3D
    // (CAM3_UJI menyetel CAM langsung; tween yang pertama dirender sesudahnya mencatat nilai itu)
    const elang = await page.evaluate(() => window.ELANG_UJI ? (window.OPENER.seek(0), window.ELANG_UJI()) : null);
    if (name === 'starter-elang.html' && !elang) masalah.push('elang: ELANG_UJI tidak ada');
    if (elang) {
      const j = elang.jalur;
      if (!(j.jarak > .9 * j.panjang)) masalah.push(`elang: kamera menempuh ${j.jarak.toFixed(1)} m, jalur ${j.panjang.toFixed(1)} m — terbang tidak menggerakkan kamera`);
      if (!(j.langkah < .45)) masalah.push(`elang: kamera melompat ${j.langkah.toFixed(3)} m dalam 1/120 dtk (jalur harus kontinu, termasuk awal/akhir terbang)`);
      if (!(j.putar < 3)) masalah.push(`elang: orientasi kamera berputar ${j.putar.toFixed(2)}° dalam 1/120 dtk`);
      if (!(j.roll <= j.rollMaks)) masalah.push(`elang: roll ${j.roll.toFixed(1)}° melewati batas ${j.rollMaks}°`);
      if (!(elang.celah.bebas >= .5 && elang.celah.lintas && elang.celah.lintas[1] > 1)) masalah.push(`elang: kamera tidak menembus celah gapura dengan jarak bebas ≥ 0,5 m (${JSON.stringify(elang.celah)})`);
      if (elang.subLuar !== 1 || !(elang.subDalam > 1)) masalah.push(`elang: motion blur harus hanya di segmen KABUR (luar ${elang.subLuar}, dalam ${elang.subDalam} sub-frame)`);
    }
    const sidik = await page.evaluate(() => window.ELANG_SIDIK ? window.ELANG_SIDIK() : null);
    if (sidik !== sidikSegar) masalah.push(`elang: geometri lanskap beda antara dua muat halaman (${sidik} vs ${sidikSegar}) — seed tidak deterministik`);

    // kamera 3D (src/runtime/kamera-three.js): pose, shot terpusat & ukuran bingkai, zona aman HUD, warna brand
    // tepat, penolakan input salah. Field null = tidak berlaku di halaman itu (opener) → dilewati.
    let cam3 = null;
    if (await page.evaluate(() => !!window.CAM3_UJI)) {
      await page.goto(pathToFileURL(file).href + '?demo=1', { waitUntil: 'load', timeout: 60000 });
      await page.waitForFunction('window.OPENER && window.OPENER.ready', { timeout: 60000 });
      cam3 = await page.evaluate(() => window.CAM3_UJI());
    }
    if (TANPA_SUBJEK.includes(name) && !cam3) masalah.push(`kamera3: ${name} harus mendefinisikan window.CAM3_UJI`);
    if (cam3) {
      const ada = k => cam3[k] != null;
      // null hanya sah di opener (tanpa subjek/#hud); starter 3D lain harus mengisi SEMUA field
      if (!TANPA_SUBJEK.includes(name)) for (const k of ['poseCocok', 'ndc', 'isiTinggi', 'hudTabrakDitolak', 'pikselBrand', 'kosongDitolak', 'familyDitolak', 'keyGolden', 'elGolden', 'lightUrutDitolak', 'bokehSaatNol', 'bokehSaatEnam', 'jarakFokus', 'jarakHarapan', 'keyIkutKamera', 'railDuaDitolak', 'railUrutDitolak', 'railTengah', 'railSambung', 'dekatDiLuar', 'lowkeyGelap', 'lantaiAman', 'wormTanpaPita', 'bersarangBenar', 'nolDitolak', 'railLookDitolak', 'demoAkhir', 'DUR'])
        if (cam3[k] == null) masalah.push(`kamera3: field ${k} kosong — subjek/#hud hilang dari starter 3D?`);
      if (TANPA_SUBJEK.includes(name) && cam3.poseCocok == null) masalah.push(`kamera3: ${name} harus punya poseCocok non-null`);
      if (cam3.toneMapping !== (FILM[name] || 0)) masalah.push(`kamera3: renderer.toneMapping ${cam3.toneMapping}, harus ${FILM[name] || 0} — ${FILM[name] ? 'konten sejarah/sinematik memakai tone mapping film' : 'brand/produk tetap NoToneMapping (warna brand tepat)'}`);
      if (ada('poseCocok') && !(cam3.poseCocok)) masalah.push('kamera3: camera.position ≠ pose(CAM)');
      if (ada('ndc') && !(Math.abs(cam3.ndc[0]) < .01 && Math.abs(cam3.ndc[1]) < .01)) masalah.push(`kamera3: shot MS tidak memusatkan subjek (${cam3.ndc})`);
      if (ada('isiTinggi') && !(Math.abs(cam3.isiTinggi - .45) < .01)) masalah.push(`kamera3: shot WS pada bidang 1,6 mengisi ${cam3.isiTinggi} tinggi frame, harus 0,45`);
      if (ada('hudTabrakDitolak') && !cam3.hudTabrakDitolak) masalah.push('kamera3: shot yang membawa subjek ke kantong teks HUD harus ditolak');
      if (ada('pikselBrand') && !FILM[name] && cam3.pikselBrand !== '238,28,37') masalah.push(`kamera3: mat('flat','#EE1C25') keluar ${cam3.pikselBrand}`);
      if (ada('kosongDitolak') && !cam3.kosongDitolak) masalah.push('kamera3: shot pada Group kosong harus ditolak');
      if (ada('keyGolden') && !(Math.abs(cam3.keyGolden - 2.8) < 1e-6 && cam3.elGolden === 6)) masalah.push(`kamera3: light('golden') tidak menyetel key (${cam3.keyGolden}, ${cam3.elGolden})`);
      if (ada('keyGolden') && !cam3.lightUrutDitolak) masalah.push("kamera3: light() dengan 'at' mundur harus ditolak");
      if (ada('keyGolden') && (cam3.bokehSaatNol !== false || cam3.bokehSaatEnam !== true)) masalah.push('kamera3: BokehPass harus mati saat aperture 0 dan hidup saat > 0');
      if (ada('jarakFokus') && !(cam3.jarakFokus > 0 && Math.abs(cam3.jarakFokus - cam3.jarakHarapan) < 1e-6)) masalah.push('kamera3: focus() tidak menghitung jarak ke subjek');
      if (ada('keyIkutKamera') && !cam3.keyIkutKamera) masalah.push('kamera3: lampu key harus dihitung ulang tiap applyCam (ikut CAM.fx tanpa tween cahaya)');
      if (ada('railDuaDitolak') && !cam3.railDuaDitolak) masalah.push('kamera3: rail() 2 titik harus ditolak');
      if (ada('railUrutDitolak') && !cam3.railUrutDitolak) masalah.push('kamera3: rail() di luar urutan waktu harus ditolak');
      if (ada('railTengah') && !(cam3.railTengah < 1e-6)) masalah.push(`kamera3: posisi kamera di tengah rail ≠ getPointAt(.5) (selisih ${cam3.railTengah})`);
      if (ada('railSambung') && !(cam3.railSambung < 1e-6)) masalah.push(`kamera3: kamera melompat saat rail selesai (selisih ${cam3.railSambung})`);
      if (ada('demoAkhir') && !(cam3.demoAkhir > 0 && cam3.demoAkhir < cam3.DUR)) masalah.push(`kamera3: ?demo=1 harus selesai sebelum DUR (${cam3.demoAkhir} vs ${cam3.DUR})`);
      if (ada('lowkeyGelap') && !(cam3.lowkeyGelap.lantai <= .5 && cam3.lowkeyGelap.wajah <= .6)) masalah.push(`kamera3: lowkey harus jauh lebih gelap dari day (lantai ${cam3.lowkeyGelap.lantai.toFixed(2)} ≤ .5, wajah teduh ${cam3.lowkeyGelap.wajah.toFixed(2)} ≤ .6)`);
      if (ada('dekatDiLuar') && !cam3.dekatDiLuar.ok) masalah.push(`kamera3: shot ECU/CU menaruh kamera di dalam subjek atau tidak memusatkannya (${JSON.stringify(cam3.dekatDiLuar.hasil)})`);
      if (ada('familyDitolak') && !cam3.familyDitolak) masalah.push("kamera3: mat('neon') harus ditolak");
      if (ada('wormTanpaPita') && !cam3.wormTanpaPita.ok) masalah.push(`kamera3: sudut worm dekat lantai menyingkap latar di dasar frame (piksel ${cam3.wormTanpaPita.dasar} ≈ latar ${cam3.wormTanpaPita.latar}) — near plane memotong lantai`);
      if (ada('lantaiAman') && !cam3.lantaiAman.ok) masalah.push(`kamera3: angle low/worm sesudah WS menaruh kamera di bawah lantai (y ${cam3.lantaiAman.y.map(v => v.toFixed(2))}) — CAM.lantai`);
      if (ada('bersarangBenar') && !cam3.bersarangBenar.ok) masalah.push(`kamera3: subjek bersarang (grup di 5,0,-3) dibingkai di ${cam3.bersarangBenar.f.map(v => v.toFixed(2))}, harus 5,1,-3`);
      if (ada('nolDitolak') && cam3.nolDitolak !== true) masalah.push(`kamera3: subjek berskala 0 harus ditolak dengan namanya (${cam3.nolDitolak})`);
      if (ada('railLookDitolak') && !cam3.railLookDitolak) masalah.push('kamera3: rail() dengan titik terakhir = look harus ditolak saat setup');
    }


    if (errs.length) masalah.push('error JS: ' + errs[0]);
  } catch (e) {
    masalah.push(String(e.message || e).split('\n')[0]);
    if (errs.length) masalah.push('error JS: ' + errs[0]);   // tanpa ini timeout menyembunyikan penyebabnya
  }
  await page.close();
  if (masalah.length) { gagal++; console.log(`GAGAL  ${name}\n       - ${masalah.join('\n       - ')}`); }
  else console.log(`ok     ${name}`);
}

await browser.close();
console.log(gagal ? `\n${gagal} starter bermasalah.` : `\n${files.length - lewat} starter lolos${lewat ? `, ${lewat} dilewati (WebGL perangkat lunak)` : ''}.`);
process.exit(gagal ? 1 : 0);
