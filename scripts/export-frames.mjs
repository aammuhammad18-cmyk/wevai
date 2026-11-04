/* =========================================================
   Render opener/explainer jadi urutan gambar atau langsung MP4, frame demi frame.

   Bukan rekaman layar: skrip ini MENYETEL waktu timeline, menunggu
   browser selesai menggambar, baru menangkap. Jadi tidak ada frame
   yang drop walau satu frame butuh 300 ms untuk dirender.

   Prasyarat (sekali): npm install --prefix "<folder skill>/scripts"
     (Chrome/Edge sistem dicari otomatis lewat scripts/chrome.mjs; PUPPETEER_EXECUTABLE_PATH hanya bila di lokasi
      tak standar. Menulis env di bash dan PowerShell: tabel di references/alat-kerja.md)

   Pakai (dari folder proyek, tanpa server; berkas dibuka lewat file://):
     node <folder skill>/scripts/export-frames.mjs     -> frames/f00000.png ... + perintah ffmpeg
     sama, dengan env MP4=out.mp4                      -> langsung out.mp4 (butuh ffmpeg di PATH)
   Env opsional:
     URL (default file://<cwd>/index.html?clean=1), FPS (60), OUT (frames),
     SCALE (1 = ukuran panggung asli, 0.5 = setengah).
     MP4     berkas tujuan. Frame dialirkan ke ffmpeg lewat pipe — tanpa folder PNG,
             encode berjalan sambil render, audio <audio id="vo" src> langsung ikut.
     FORMAT  png | jpeg. Default png (mode folder) / jpeg (mode MP4). Tangkapan JPEG
             ±2× lebih cepat dari PNG; pakai FORMAT=png untuk master yang kritis.
     QUALITY kualitas JPEG. Default 80 di mode MP4 (ffmpeg mengencode ulang; terukur ±20 % lebih
             cepat per frame daripada 95) dan 95 di mode folder.
     WORKERS jumlah browser yang merender bagian timeline berbeda secara paralel. Standar 2 bila mesin punya
             >= 2 thread, selain itu 1 (ekspor-inti.mjs). Di laptop 2 core (i3-3217U + HD 4000), halaman nyata 1080p:
             1,2–1,5× lebih cepat (pengukuran awal di halaman ringan: ±2×). Frame vs WORKERS=1: 93–99 % identik, sisanya
             tak terlihat (halaman pendek PSNR ≥ 110 dB, babak 60 dtk ≥ 64,9 dB; bukti ekspor §5, §7). Di 4 core + GPU terintegrasi pernah
             terukur lebih lambat: set WORKERS=1 bila begitu (ukur dulu; "Target closed" berarti browser mati, bukan tanda ini). Butuh seek yang deterministik (detik mana pun bisa
             dirender tanpa detik sebelumnya) — kontrak OPENER yang sama dengan snap.mjs.
     SYNC=1  lewati penantian 2×rAF per frame. Hanya untuk halaman yang seek(t)-nya
             menggambar sinkron (DOM/SVG; tanpa kanvas yang digambar di rAF, tanpa klip
             video). Halaman juga bisa menyatakannya sendiri: window.OPENER.syncSeek = true.
     ENCODER libx264 (default) | h264_nvenc | h264_qsv. PRESET = preset libx264 (veryfast).
     FFMPEG  path ffmpeg bila tidak di PATH.
     MODE=webcodecs  EKSPERIMENTAL, hanya untuk halaman yang SELURUH frame-nya satu kanvas (butuh MP4=). Frame
             tidak di-screenshot: halaman membuat VideoFrame dari kanvas lalu men-encode-nya sendiri (VideoEncoder,
             H.264 prefer-software, Annex B, GOP 2 dtk); potongan H.264 dialirkan ke ffmpeg (-f h264 -c copy) dan
             audio #vo ditempel seperti biasa. Kanvas ditemukan lewat kait window.OPENER.canvas (elemen <canvas>
             atau OffscreenCanvas, atau fungsi yang mengembalikannya) yang isinya sudah utuh begitu seek(t) selesai.
             Ukuran keluaran = ukuran kanvas (SCALE tidak berlaku). Tanpa kait, tanpa VideoEncoder (perlu konteks
             aman: file:// atau http://localhost), atau config ditolak → pesan jelas, lalu jalur biasa.
             BITRATE=<bit/dtk> (standar 0,2 bit/piksel/frame). Rincian: references/alat-kerja.md › "Mode WebCodecs".
   Chrome yang mati/macet di tengah render dibuka ulang otomatis dan frame-nya diulang.
   Ukuran frame diambil dari window.OPENER.W/H — 1920×1080 dan 1080×1920 sama-sama benar.
   Tanpa MP4, di akhir skrip mencetak perintah ffmpeg; bila halaman punya <audio id="vo" src>,
   suaranya ikut digabung (tanpa itu MP4 explainer ber-VO keluar bisu).
   ========================================================= */

import { luncurkan } from './chrome.mjs';
import { bantuan } from './bantuan.mjs';
import { workersStandar, kodekAvc, bitrateStandar, gantiBrowser, tutupBrowser } from './ekspor-inti.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

bantuan(import.meta.url);   // --help/-h: cetak bantuan dan keluar SEBELUM merender apa pun
const URL     = process.env.URL   || pathToFileURL(process.cwd()).href + '/index.html?clean=1';
const FPS     = Number(process.env.FPS   || 60);
const OUT     = process.env.OUT   || 'frames';
const SCALE   = Number(process.env.SCALE || 1);
const MP4     = process.env.MP4   || '';
const FORMAT  = (process.env.FORMAT || (MP4 ? 'jpeg' : 'png')).toLowerCase().replace(/^jpg$/, 'jpeg');
const QUALITY = Number(process.env.QUALITY || (MP4 ? 80 : 95));
const WORKERS = workersStandar();
const SYNC    = process.env.SYNC === '1';
const ENCODER = process.env.ENCODER || 'libx264';
const FFMPEG  = process.env.FFMPEG || 'ffmpeg';
const MODE    = (process.env.MODE || '').toLowerCase();
const EXT     = FORMAT === 'jpeg' ? 'jpg' : 'png';
if (FORMAT !== 'png' && FORMAT !== 'jpeg') { console.log(`FORMAT=${FORMAT} tidak dikenal (png | jpeg)`); process.exit(1); }
if (MODE && MODE !== 'webcodecs') { console.log(`MODE=${MODE} tidak dikenal (webcodecs, atau kosongkan untuk tangkapan layar)`); process.exit(1); }

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
  const browser = await luncurkan({
    headless: 'new',
    args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });

  // tunggu sampai modul selesai dimuat, timeline terpasang, dan klip video siap
  await page.waitForFunction('window.OPENER && window.OPENER.ready && (!window.OPENER.clipsReady || window.OPENER.clipsReady())', { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  const info = await page.evaluate(mode => {
    const O = window.OPENER;
    let kv = null; if (mode) try { kv = typeof O.canvas === 'function' ? O.canvas() : O.canvas; } catch {}   // kait kanvas hanya dibaca di mode WebCodecs
    return {
      W: O.W || 1920, H: O.H || 1080, DURATION: O.DURATION,
      vo: document.querySelector('audio#vo')?.getAttribute('src') || '',
      sync: !!O.syncSeek,
      ...(mode ? { kanvas: kv && kv.width ? { w: kv.width, h: kv.height } : null, enkoder: typeof VideoEncoder === 'function' && typeof VideoFrame === 'function' } : {}),
    };
  }, MODE === 'webcodecs');
  await page.setViewport({ width: info.W, height: info.H, deviceScaleFactor: SCALE });
  await page.evaluate(() => { window.OPENER.tl.pause(0); });
  return { browser, page, info };
}

// worker dibuka berurutan: membuka banyak Chrome sekaligus di mesin kecil bisa lewat batas waktu
const workers = [await openWorker()];
const { W, H, DURATION, vo } = workers[0].info;
const sync = SYNC || workers[0].info.sync;
const total = Math.ceil(DURATION * FPS);
const NW = Math.min(WORKERS, total) || 1;   // halaman 1 frame tak perlu browser kedua
const wc = MODE === 'webcodecs' ? await siapkanWebCodecs(workers[0]) : null;   // null = jalur biasa (tangkapan layar)
for (let k = 1; k < NW; k++) workers.push(await openWorker());

const t0 = Date.now();
let done = 0;
console.log(`${total} frame @ ${FPS} fps (${DURATION}s, ${W}x${H}, ${wc ? 'webcodecs' : FORMAT}${sync ? ', sync' : ''}, ${NW} worker) -> ${MP4 || OUT + '/'}`);

// MODE=webcodecs dipakai hanya bila semua syaratnya ada; kalau tidak: alasan yang jelas, lalu jalur biasa
async function siapkanWebCodecs({ page, info: { kanvas, enkoder } }){
  let tak = !MP4 ? 'mode ini menulis video: butuh MP4=…'
    : !kanvas ? 'halaman tidak menyediakan kait window.OPENER.canvas (kanvas yang memuat seluruh frame)'
    : !enkoder ? 'VideoEncoder tidak ada di halaman ini (perlu konteks aman: file:// atau http://localhost)'
    : kanvas.w % 2 || kanvas.h % 2 ? `kanvas ${kanvas.w}x${kanvas.h}: lebar dan tinggi harus genap (H.264 yuv420)` : '';
  let cfg;
  if (!tak){
    cfg = { codec: kodekAvc(kanvas.w, kanvas.h, FPS), width: kanvas.w, height: kanvas.h, bitrate: bitrateStandar(kanvas.w, kanvas.h, FPS),
      framerate: FPS, hardwareAcceleration: 'prefer-software', avc: { format: 'annexb' } };
    if (!await page.evaluate(c => VideoEncoder.isConfigSupported(c).then(s => s.supported, () => false), cfg)) tak = `VideoEncoder menolak config ${JSON.stringify(cfg)}`;
  }
  if (tak){ console.log(`MODE=webcodecs dilewati — ${tak}.\nMemakai jalur biasa (tangkapan layar).`); return null; }
  if (kanvas.w !== W || kanvas.h !== H) console.log(`catatan: kanvas ${kanvas.w}x${kanvas.h} berbeda dari OPENER ${W}x${H}; keluaran memakai ukuran kanvas.`);
  return { cfg, gop: Math.max(1, Math.round(FPS * 2)) };   // GOP 2 dtk: tiap blok diawali keyframe, jadi blok yang gagal bisa diulang utuh
}

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

// MODE=webcodecs — DIJALANKAN DI HALAMAN (puppeteer menyerialkan fungsinya: jangan merujuk variabel luar).
// Satu blok = n frame berurutan mulai dari i, satu GOP tertutup: seek → VideoFrame dari kanvas → VideoEncoder →
// potongan Annex B digabung jadi satu string base64. Blok baru dikirim ke Node bila SELURUH framenya jadi.
async function encodeBlok(i, n, fps, sync, cfg){
  const O = window.OPENER, kv = typeof O.canvas === 'function' ? O.canvas() : O.canvas, potong = [];
  let galat = null;
  const enc = new VideoEncoder({ output: c => { const u = new Uint8Array(c.byteLength); c.copyTo(u); potong.push(u); }, error: e => { galat = e; } });
  enc.configure(cfg);
  for (let k = 0; k < n; k++){
    const t = (i + k) / fps;
    if (O.seekFrame) await O.seekFrame(t); else (O.seek || O.tl.time.bind(O.tl))(t);
    if (!sync) await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const f = new VideoFrame(kv, { timestamp: Math.round((i + k) * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(f, { keyFrame: k === 0 }); f.close();
    for (const w0 = performance.now(); enc.encodeQueueSize > 4 && !galat; ){   // tekanan balik; antrean tak turun 15 dtk = macet (seperti prefer-hardware di riset)
      if (performance.now() - w0 > 15000) throw new Error(`enkoder macet (antrean ${enc.encodeQueueSize})`);
      await new Promise(r => setTimeout(r, 1));
    }
    if (galat) throw galat;
  }
  await Promise.race([enc.flush(), new Promise((_, no) => setTimeout(() => no(new Error('flush enkoder macet')), 30000))]); enc.close();
  if (galat) throw galat;
  if (potong.length !== n) throw new Error(`enkoder mengeluarkan ${potong.length} potongan untuk ${n} frame (frame terlewat)`);
  const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(new Blob(potong)); });
  return url.slice(url.indexOf(',') + 1);
}
const blokWebCodecs = async (page, i, n) => Buffer.from(await page.evaluate(encodeBlok, i, n, FPS, sync, wc.cfg), 'base64');

// render panjang bisa terputus karena Chrome/driver GPU mati di tengah jalan ("Target closed").
// Browser yang mati dibuka ulang dan frame yang sama diulang; seek deterministik, jadi hasilnya sama.
// Satuan kerja = step frame (1 untuk tangkapan layar; satu GOP untuk WebCodecs, yang diulang utuh bila gagal).
async function renderRange(w, from, to, sink, capture = captureFrame, step = 1){
  for (let i = from; i < to; i += step){
    const n = Math.min(step, to - i), batas = Math.max(60, n * 10) * 1000;   // cadangan; macet enkoder sudah dideteksi di halaman (15 dtk)
    let buf;
    for (let coba = 1; !buf; coba++){
      let timer;
      const macet = new Promise((_, no) => { timer = setTimeout(() => no(new Error(`${n > 1 ? `blok ${n} frame` : 'frame'} tidak selesai dalam ${batas / 1000} dtk`)), batas); });
      try { buf = await Promise.race([capture(w.page, i, n), macet]); clearTimeout(timer); }
      catch (e) {
        clearTimeout(timer);
        if (coba > 3) throw new Error(`frame ${i} gagal sesudah 3 kali membuka ulang browser: ${e.message.split('\n')[0]}`);
        console.log(`\nframe ${i}: ${e.message.split('\n')[0]} — membuka ulang browser (percobaan ${coba}/3)`);
        await gantiBrowser(w, openWorker).catch(g => console.log(`gagal membuka ulang: ${g.message.split('\n')[0]}`));   // gagal = dihitung satu percobaan
      }
    }
    await sink(i, buf);   // di luar penjaga waktu: frame yang sudah terkirim tidak pernah diulang

    const sebelum = done; done += n;
    if (Math.floor(done / FPS) > Math.floor(sebelum / FPS)){   // sekali tiap FPS frame (= tiap detik video)
      const s = (Date.now() - t0) / 1000, rate = done / s;
      process.stdout.write(`\r${done}/${total}  ${rate.toFixed(1)} frame/dtk  sisa ±${Math.round((total - done) / rate)} dtk   `);
    }
  }
}

// ffmpeg yang menerima gambar (atau potongan H.264 dari WebCodecs) lewat stdin dan menulis satu potong video (tanpa audio)
function startEncoder(file){
  // WebCodecs: -r (BUKAN -framerate) sebagai opsi masukan, supaya stempel waktu CFR persis dan tidak ditimpa timing VUI
  // buatan Chrome (1e6/66667 ≠ 15: 2,00001 dtk per 30 frame, melayang ±36 ms per jam pada 30 fps)
  const [masuk, keluar] = wc
    ? [['-r', String(FPS), '-f', 'h264', '-i', '-'], ['-c:v', 'copy']]
    : [['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', FORMAT === 'jpeg' ? 'mjpeg' : 'png', '-i', '-'], [...ENC_ARGS, '-pix_fmt', 'yuv420p']];
  const ff = spawn(FFMPEG, ['-v', 'error', '-y', ...masuk, ...keluar, file],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = once(ff, 'close');
  return {
    async write(buf){ if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain'); },
    async end(){ ff.stdin.end(); const [code] = await closed; if (code) throw new Error(`ffmpeg keluar dengan kode ${code} (${file})`); },
  };
}

// bagi timeline jadi potongan berurutan, satu per worker
const chunk = Math.ceil(total / workers.length);
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
      await renderRange(w, a, b, (i, buf) => enc.write(buf), ...(wc ? [blokWebCodecs, wc.gop] : []));
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
  await Promise.all(workers.map(w => tutupBrowser(w.browser)));
}

const secs = Math.round((Date.now() - t0) / 1000);
if (MP4) console.log(`\nselesai — ${MP4} (${total} frame, ${secs} dtk${vo ? ', dengan VO' : ''}${wc ? ', webcodecs' : ''})`);
else {
  const audio = vo ? ` -i "${vo}" -c:a aac -b:a 192k -shortest` : '';
  console.log(`\nselesai — ${total} frame di ${OUT}/ (${secs} dtk)\ngabungkan (dari folder proyek):\n` +
    `  ffmpeg -framerate ${FPS} -i ${OUT}/f%05d.${EXT}${audio} -c:v libx264 -pix_fmt yuv420p -crf 16 out.mp4`);
}
