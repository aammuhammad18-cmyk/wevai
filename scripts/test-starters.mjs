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
     cd scripts && npm install && cd ..
     node scripts/test-starters.mjs [berkas.html ...]
   Sudah punya Chrome/Edge: set PUPPETEER_EXECUTABLE_PATH.
   ========================================================= */
import puppeteer from 'puppeteer';
import { readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const files = args.length ? args
  : readdirSync(join(ROOT, 'assets')).filter(f => f.endsWith('.html')).map(f => join(ROOT, 'assets', f));

// --enable-unsafe-swiftshader: runner CI tanpa GPU tidak bisa membuat konteks WebGL (starter opener) tanpa
// renderer perangkat lunak; di mesin ber-GPU flag ini tidak terpakai.
// Halaman ditunggu sampai 'load' lalu OPENER.ready — BUKAN networkidle0: di render perangkat lunak loop
// render menyita setiap frame dan Chrome tidak pernah melaporkan "jaringan diam", walau halaman sudah siap.
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});

let gagal = 0;
for (const file of files) {
  const name = basename(file);
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

    // kamera 2.5D (src/runtime/kamera-dom.js): jalur 2D tidak menyentuh gaya lain; sudut → transform 3D;
    // bidang data-z berparalaks; cahaya; katalog ?demo=1 selesai sebelum DUR. Halaman dimuat ULANG dengan ?demo=1
    // supaya pemeriksaan di atas tetap menguji jalur default deliverable.
    let cam = null;
    if (await page.evaluate(() => !!window.CAM_UJI)) {
      await page.goto(pathToFileURL(file).href + '?demo=1', { waitUntil: 'load', timeout: 60000 });
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
      if (!(cam.demoAkhir > 0 && cam.demoAkhir < cam.DUR)) masalah.push(`kamera: ?demo=1 harus selesai sebelum DUR (${cam.demoAkhir} vs ${cam.DUR})`);
    }

    // kamera 3D (src/runtime/kamera-three.js): pose, shot terpusat & ukuran bingkai, zona aman HUD, warna brand
    // tepat, penolakan input salah. Field null = tidak berlaku di halaman itu (opener) → dilewati.
    let cam3 = null;
    if (await page.evaluate(() => !!window.CAM3_UJI)) {
      await page.goto(pathToFileURL(file).href + '?demo=1', { waitUntil: 'load', timeout: 60000 });
      await page.waitForFunction('window.OPENER && window.OPENER.ready', { timeout: 60000 });
      cam3 = await page.evaluate(() => window.CAM3_UJI());
    }
    if (cam3) {
      const ada = k => cam3[k] != null;
      if (ada('poseCocok') && !(cam3.poseCocok)) masalah.push('kamera3: camera.position ≠ pose(CAM)');
      if (ada('ndc') && !(Math.abs(cam3.ndc[0]) < .01 && Math.abs(cam3.ndc[1]) < .01)) masalah.push(`kamera3: shot MS tidak memusatkan subjek (${cam3.ndc})`);
      if (ada('isiTinggi') && !(Math.abs(cam3.isiTinggi - .45) < .01)) masalah.push(`kamera3: shot WS pada bidang 1,6 mengisi ${cam3.isiTinggi} tinggi frame, harus 0,45`);
      if (ada('hudTabrakDitolak') && !cam3.hudTabrakDitolak) masalah.push('kamera3: shot yang membawa subjek ke kantong teks HUD harus ditolak');
      if (ada('pikselBrand') && cam3.pikselBrand !== '238,28,37') masalah.push(`kamera3: mat('flat','#EE1C25') keluar ${cam3.pikselBrand}`);
      if (ada('kosongDitolak') && !cam3.kosongDitolak) masalah.push('kamera3: shot pada Group kosong harus ditolak');
      if (ada('familyDitolak') && !cam3.familyDitolak) masalah.push("kamera3: mat('neon') harus ditolak");
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
console.log(gagal ? `\n${gagal} starter bermasalah.` : `\n${files.length} starter lolos.`);
process.exit(gagal ? 1 : 0);
