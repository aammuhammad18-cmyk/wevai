/* =========================================================
   Render opener/explainer jadi urutan gambar atau langsung MP4, frame demi frame.

   Bukan rekaman layar: skrip ini MENYETEL waktu timeline, menunggu
   browser selesai menggambar, baru menangkap. Jadi tidak ada frame
   yang drop walau satu frame butuh 300 ms untuk dirender.

   Prasyarat (sekali): cd <folder skill>/scripts && npm install
     (sudah punya Chrome/Edge? PUPPETEER_SKIP_DOWNLOAD=1 npm install, lalu
      set PUPPETEER_EXECUTABLE_PATH ke chrome.exe/msedge.exe saat menjalankan)

   Pakai (dari folder proyek, tanpa server; berkas dibuka lewat file://):
     node <folder skill>/scripts/export-frames.mjs            -> frames/f00000.png ... + perintah ffmpeg
     MP4=out.mp4 node <folder skill>/scripts/export-frames.mjs -> langsung out.mp4 (butuh ffmpeg di PATH)
   Env opsional:
     URL (default file://<cwd>/index.html?clean=1), FPS (60), OUT (frames),
     SCALE (1 = ukuran panggung asli, 0.5 = setengah).
     MP4     berkas tujuan. Frame dialirkan ke ffmpeg lewat pipe — tanpa folder PNG,
             encode berjalan sambil render, audio <audio id="vo" src> langsung ikut.
     FORMAT  png | jpeg. Default png (mode folder) / jpeg (mode MP4). Tangkapan JPEG
             ±2× lebih cepat dari PNG; pakai FORMAT=png untuk master yang kritis.
     QUALITY kualitas JPEG. Default 80 di mode MP4 (ffmpeg mengencode ulang; terukur ±20 % lebih
             cepat per frame daripada 95) dan 95 di mode folder.
     WORKERS jumlah browser yang merender bagian timeline berbeda secara paralel (1).
             Butuh seek yang deterministik (detik mana pun bisa dirender tanpa detik
             sebelumnya) — kontrak OPENER yang sama dengan snap.mjs. Hanya menolong bila
             core CPU & GPU masih longgar: di 4 core + GPU terintegrasi justru lebih lambat.
     SYNC=1  lewati penantian 2×rAF per frame. Hanya untuk halaman yang seek(t)-nya
             menggambar sinkron (DOM/SVG; tanpa kanvas yang digambar di rAF, tanpa klip
             video). Halaman juga bisa menyatakannya sendiri: window.OPENER.syncSeek = true.
     ENCODER libx264 (default) | h264_nvenc | h264_qsv. PRESET = preset libx264 (veryfast).
     FFMPEG  path ffmpeg bila tidak di PATH.
   Chrome yang mati/macet di tengah render dibuka ulang otomatis dan frame-nya diulang.
   Ukuran frame diambil dari window.OPENER.W/H — 1920×1080 dan 1080×1920 sama-sama benar.
   Tanpa MP4, di akhir skrip mencetak perintah ffmpeg; bila halaman punya <audio id="vo" src>,
   suaranya ikut digabung (tanpa itu MP4 explainer ber-VO keluar bisu).
   ========================================================= */

import puppeteer from 'puppeteer';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const URL     = process.env.URL   || pathToFileURL(process.cwd()).href + '/index.html?clean=1';
const FPS     = Number(process.env.FPS   || 60);
const OUT     = process.env.OUT   || 'frames';
const SCALE   = Number(process.env.SCALE || 1);
const MP4     = process.env.MP4   || '';
const FORMAT  = (process.env.FORMAT || (MP4 ? 'jpeg' : 'png')).toLowerCase().replace(/^jpg$/, 'jpeg');
const QUALITY = Number(process.env.QUALITY || (MP4 ? 80 : 95));
const WORKERS = Math.max(1, Math.floor(Number(process.env.WORKERS || 1)));
const SYNC    = process.env.SYNC === '1';
const ENCODER = process.env.ENCODER || 'libx264';
const FFMPEG  = process.env.FFMPEG || 'ffmpeg';
const EXT     = FORMAT === 'jpeg' ? 'jpg' : 'png';
if (FORMAT !== 'png' && FORMAT !== 'jpeg') { console.log(`FORMAT=${FORMAT} tidak dikenal (png | jpeg)`); process.exit(1); }

const ENC_ARGS = {
  // veryfast, bukan medium: encode berjalan bersamaan dengan Chrome, dan medium merebut core raster
  // (terukur +38% waktu di 4 core). Pada crf 16 hasilnya tak terbedakan: PSNR 50 dB, ukuran setara.
  libx264:    ['-c:v', 'libx264', '-preset', process.env.PRESET || 'veryfast', '-crf', '16'],
  h264_nvenc: ['-c:v', 'h264_nvenc', '-preset', 'p5', '-rc', 'vbr', '-cq', '18', '-b:v', '0'],
  h264_qsv:   ['-c:v', 'h264_qsv', '-global_quality', '18'],
}[ENCODER] || ['-c:v', ENCODER];

if (MP4 && spawnSync(FFMPEG, ['-version']).status !== 0) {
  console.log(`ffmpeg tidak ditemukan ("${FFMPEG}"). Pasang (winget install Gyan.FFmpeg / brew install ffmpeg), set FFMPEG=<path>, atau jalankan tanpa MP4= untuk menulis frame saja.`);
  process.exit(1);
}

// satu browser per worker: proses terpisah = raster & encode gambar benar-benar paralel
async function openWorker(){
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });

  // tunggu sampai modul selesai dimuat, timeline terpasang, dan klip video siap
  await page.waitForFunction('window.OPENER && window.OPENER.ready && (!window.OPENER.clipsReady || window.OPENER.clipsReady())', { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  const info = await page.evaluate(() => ({
    W: window.OPENER.W || 1920, H: window.OPENER.H || 1080, DURATION: window.OPENER.DURATION,
    vo: document.querySelector('audio#vo')?.getAttribute('src') || '',
    sync: !!window.OPENER.syncSeek,
  }));
  await page.setViewport({ width: info.W, height: info.H, deviceScaleFactor: SCALE });
  await page.evaluate(() => { window.OPENER.tl.pause(0); });
  return { browser, page, info };
}

// worker dibuka berurutan: membuka banyak Chrome sekaligus di mesin kecil bisa lewat batas waktu
const workers = [await openWorker()];
const { W, H, DURATION, vo } = workers[0].info;
const sync = SYNC || workers[0].info.sync;
for (let k = 1; k < WORKERS; k++) workers.push(await openWorker());

const total = Math.ceil(DURATION * FPS);
const t0 = Date.now();
let done = 0;
console.log(`${total} frame @ ${FPS} fps (${DURATION}s, ${W}x${H}, ${FORMAT}${sync ? ', sync' : ''}, ${WORKERS} worker) -> ${MP4 || OUT + '/'}`);

async function captureFrame(page, i){
  const t = i / FPS;

  // setel waktu, lalu biarkan DUA rAF lewat: satu untuk GSAP menulis gaya,
  // satu lagi untuk loop render menggambar frame dengan nilai baru itu.
  // Halaman sync sudah menggambar di dalam seek(t), jadi penantian itu dilewati.
  await page.evaluate(async (time, sync) => {
    if (window.OPENER.seekFrame) await window.OPENER.seekFrame(time);   // ada klip video: tunggu frame-nya siap
    else (window.OPENER.seek||window.OPENER.tl.time.bind(window.OPENER.tl))(time);
    if (!sync) await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t, sync);

  return page.screenshot({
    type: FORMAT, ...(FORMAT === 'jpeg' ? { quality: QUALITY } : {}),
    clip: { x: 0, y: 0, width: W, height: H },
    optimizeForSpeed: true,
  });
}

// render panjang bisa terputus karena Chrome/driver GPU mati di tengah jalan ("Target closed").
// Browser yang mati dibuka ulang dan frame yang sama diulang; seek deterministik, jadi hasilnya sama.
async function renderRange(w, from, to, sink){
  for (let i = from; i < to; i++){
    let buf;
    for (let coba = 1; !buf; coba++){
      let timer;
      const macet = new Promise((_, no) => { timer = setTimeout(() => no(new Error('frame tidak selesai dalam 60 dtk')), 60000); });
      try { buf = await Promise.race([captureFrame(w.page, i), macet]); clearTimeout(timer); }
      catch (e) {
        clearTimeout(timer);
        if (coba > 3) throw e;
        console.log(`\nframe ${i}: ${e.message.split('\n')[0]} — membuka ulang browser (percobaan ${coba}/3)`);
        await w.browser.close().catch(() => {});
        Object.assign(w, await openWorker());
      }
    }
    await sink(i, buf);   // di luar penjaga waktu: frame yang sudah terkirim tidak pernah diulang

    if (++done % FPS === 0){
      const s = (Date.now() - t0) / 1000, rate = done / s;
      process.stdout.write(`\r${done}/${total}  ${rate.toFixed(1)} frame/dtk  sisa ±${Math.round((total - done) / rate)} dtk   `);
    }
  }
}

// ffmpeg yang menerima gambar lewat stdin dan menulis satu potong video (tanpa audio)
function startEncoder(file){
  const ff = spawn(FFMPEG, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS),
    '-c:v', FORMAT === 'jpeg' ? 'mjpeg' : 'png', '-i', '-', ...ENC_ARGS, '-pix_fmt', 'yuv420p', file],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = once(ff, 'close');
  return {
    async write(buf){ if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain'); },
    async end(){ ff.stdin.end(); const [code] = await closed; if (code) throw new Error(`ffmpeg keluar dengan kode ${code} (${file})`); },
  };
}

// bagi timeline jadi potongan berurutan, satu per worker
const chunk = Math.ceil(total / WORKERS);
const ranges = workers.map((w, k) => [w, k * chunk, Math.min(total, (k + 1) * chunk)]).filter(([, a, b]) => a < b);

try {
  if (!MP4){
    await mkdir(OUT, { recursive: true });
    await Promise.all(ranges.map(([w, a, b]) =>
      renderRange(w, a, b, (i, buf) => writeFile(`${OUT}/f${String(i).padStart(5, '0')}.${EXT}`, buf))));
  } else {
    const parts = resolve(MP4 + '.parts');
    await mkdir(parts, { recursive: true });
    const segs = await Promise.all(ranges.map(async ([w, a, b], k) => {
      const seg = `${parts}/seg${k}.mp4`, enc = startEncoder(seg);
      await renderRange(w, a, b, (i, buf) => enc.write(buf));
      await enc.end();
      return seg;
    }));

    // sambung potongan tanpa encode ulang, lalu tempel VO (path-nya relatif ke halaman, bukan ke cwd)
    const list = `${parts}/list.txt`;
    await writeFile(list, segs.map(s => `file '${s.replace(/\\/g, '/')}'`).join('\n'));
    const voSrc = vo ? new globalThis.URL(vo, URL) : null;
    const voIn = voSrc ? (voSrc.protocol === 'file:' ? fileURLToPath(voSrc) : voSrc.href) : '';
    // -t, bukan -shortest: -shortest bersama -c:v copy membuang frame terakhir
    const audio = voIn ? ['-i', voIn, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-t', String(total / FPS)] : [];
    const mux = spawnSync(FFMPEG, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, ...audio,
      '-c:v', 'copy', '-movflags', '+faststart', MP4], { stdio: 'inherit' });
    if (mux.status !== 0) throw new Error(`ffmpeg gagal menyambung potongan (lihat ${parts})`);
    await rm(parts, { recursive: true, force: true });
  }
} finally {
  await Promise.all(workers.map(w => w.browser.close()));
}

const secs = Math.round((Date.now() - t0) / 1000);
if (MP4) console.log(`\nselesai — ${MP4} (${total} frame, ${secs} dtk${vo ? ', dengan VO' : ''})`);
else {
  const audio = vo ? ` -i "${vo}" -c:a aac -b:a 192k -shortest` : '';
  console.log(`\nselesai — ${total} frame di ${OUT}/ (${secs} dtk)\ngabungkan (dari folder proyek):\n` +
    `  ffmpeg -framerate ${FPS} -i ${OUT}/f%05d.${EXT}${audio} -c:v libx264 -pix_fmt yuv420p -crf 16 out.mp4`);
}
