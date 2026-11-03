#!/usr/bin/env node
/* =========================================================
   ANTRE-RENDER: antrean render untuk video panjang (45-90 menit, dipecah per babak). Merender babak demi babak lewat
   export-frames.mjs, melanjutkan sendiri bila dijalankan ulang, menyambung hasilnya, dan menahan laptop agar tidak
   sleep selama bekerja. Tanpa dependensi (Node >= 18); butuh ffmpeg dan ffprobe di PATH (atau env FFMPEG / FFPROBE).

   Pakai (dari folder proyek; path relatif terhadap folder tempat perintah dijalankan):
     node <folder skill>/scripts/antre-render.mjs antrean.json [--gabung final.mp4]
     node <folder skill>/scripts/antre-render.mjs bab1.html bab2.html ... [--keluar mp4] [--gabung final.mp4]
   antrean.json = larik berurutan, satu butir per babak:
     [{ "html": "00-prolog.html", "mp4": "mp4/00-prolog.mp4", "siap": "cek/siap-00", "audio": "audio/00.m4a", "env": { "FPS": "30" } }, ...]
       html | url  halaman yang dirender. html -> file://...?clean=1; url dipakai apa adanya (mis. http://localhost:8000/x.html?clean=1)
       mp4         hasil, wajib berakhiran .mp4
       siap        (opsional) penanda: butir menunggu sampai berkas ini ada (mis. dibuat sesudah lembar kontak lolos)
       audio       (opsional) VO; bawaan = src dari <audio id="vo"> di html. Hanya untuk menilai basi-tidaknya mp4
       env         (opsional) env tambahan untuk export-frames.mjs (FPS, SYNC, PRESET, WORKERS, MODE, ...)
   Argumen berupa .html (atau URL): satu butir tiap argumen, mp4 = <keluar>/<nama>.mp4 (bawaan keluar = mp4).
   Env proses ini diteruskan ke semua butir:  FPS=30 SYNC=1 PRESET=ultrafast node .../antre-render.mjs antrean.json

   Opsi:  --gabung <mp4>   sambung semua hasil (ffmpeg concat -c copy +faststart), cetak durasi dan ukuran (ffprobe)
          --log <berkas>   catatan, ditambah di akhir (bawaan antre-render.log); isinya sama dengan layar
          --lapor <dtk>    jarak baris kemajuan (bawaan 60)       --poll <dtk>   jarak cek penanda siap (bawaan 30)
          --keluar <folder>  folder mp4 untuk argumen .html       --tanpa-tahan-sleep   jangan menahan sleep

   Aturan:
     - Dilewati bila mp4 ada, terbaca ffprobe, dan LEBIH BARU dari html dan audio. Jalankan ulang perintah yang sama
       = melanjutkan. Mengubah env (FPS dll.) tidak terdeteksi: hapus mp4-nya agar dirender ulang.
     - Dirender ke <nama>.sementara.mp4 lalu diganti nama sesudah export-frames sukses: mp4 setengah jadi tidak pernah
       dianggap selesai. Butir gagal dicatat, antrean jalan terus; di akhir kode keluar 1 dan penggabungan ditunda.
     - Butir menunggu penanda siap sesuai urutan (butir ke-3 menunggu walau ke-4 sudah siap). Dilewati dulu bila mp4 sudah jadi.
     - Kemajuan dibaca dari keluaran export-frames: fps, sisa waktu butir, dan sisa waktu antrean. Panjang butir yang
       belum jalan dikira dari durasi audionya (ffprobe), atau dari rata-rata butir yang sudah terlihat.
     - Selama bekerja (termasuk menunggu penanda) laptop ditahan agar tidak sleep, tanpa mengubah setelan daya, dan
       dilepas saat selesai, gagal, atau Ctrl+C:
         Windows  powershell tersembunyi: SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
         macOS    caffeinate -i -w <pid>          Linux   systemd-inhibit (tanpa itu: peringatan)
       Menutup lid atau memilih Sleep sendiri tetap menidurkan laptop.
     - Satu antrean pada satu waktu. Ctrl+C menghentikan semuanya, termasuk Chrome dan ffmpeg anak.

   Kode keluar: 0 semua jadi (dan tersambung bila --gabung) | 1 ada butir gagal atau salah pakai | 130 dihentikan
   Rincian: references/alat-kerja.md > "Render panjang"
   ========================================================= */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync, readFileSync, appendFileSync, mkdirSync, rmSync, renameSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve, dirname, basename, join, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { bantuan } from './bantuan.mjs';

export class GalatPakai extends Error {}          // salah pakai / konfigurasi: dicetak apa adanya, kode keluar 1
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || (process.env.FFMPEG ? process.env.FFMPEG.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1') : 'ffprobe');
const EKSPOR = fileURLToPath(new URL('./export-frames.mjs', import.meta.url));

/* ---------- antrean: urai dan normalkan ---------- */
const KUNCI = ['html', 'url', 'mp4', 'siap', 'audio', 'env'];
export function butir(x, no, cwd = process.cwd()) {
  const at = `butir ${no}`;
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new GalatPakai(`${at}: harus objek { "html": "...", "mp4": "..." }`);
  const asing = Object.keys(x).find(k => !KUNCI.includes(k));
  if (asing) throw new GalatPakai(`${at}: kunci "${asing}" tidak dikenal (${KUNCI.join(', ')})`);
  for (const k of ['html', 'url', 'mp4', 'siap', 'audio']) if (x[k] != null && (typeof x[k] !== 'string' || !x[k].trim())) throw new GalatPakai(`${at}: "${k}" harus teks yang tidak kosong`);
  if (!x.mp4) throw new GalatPakai(`${at}: "mp4" wajib`);
  if (!/\.mp4$/i.test(x.mp4)) throw new GalatPakai(`${at}: "mp4" harus berakhiran .mp4 (${x.mp4})`);
  if (!x.html && !x.url) throw new GalatPakai(`${at}: butuh "html" atau "url"`);
  const env = {};
  if (x.env != null) {
    if (typeof x.env !== 'object' || Array.isArray(x.env)) throw new GalatPakai(`${at}: "env" harus objek {"FPS": "30", ...}`);
    for (const [k, v] of Object.entries(x.env)) {
      if (/^(URL|MP4)$/i.test(k)) throw new GalatPakai(`${at}: env "${k}" diatur antrean (pakai "html"/"url" dan "mp4")`);
      if (!['string', 'number', 'boolean'].includes(typeof v)) throw new GalatPakai(`${at}: env "${k}" harus teks, angka, atau true/false`);
      env[k] = String(v);
    }
  }
  const html = x.html ? resolve(cwd, x.html) : /^file:/i.test(x.url) ? fileURLToPath(x.url) : '';   // url non-file: tak ada berkas untuk dibandingkan
  const mp4 = resolve(cwd, x.mp4);
  return { no, nama: basename(mp4).replace(/\.mp4$/i, ''), html, url: x.url || pathToFileURL(html).href + '?clean=1', mp4,
    siap: x.siap ? resolve(cwd, x.siap) : '', audio: x.audio ? resolve(cwd, x.audio) : '', env };
}
function periksaGanda(daftar) {
  const lihat = new Set();
  for (const b of daftar) { const k = process.platform === 'win32' ? b.mp4.toLowerCase() : b.mp4; if (lihat.has(k)) throw new GalatPakai(`butir ${b.no}: mp4 ganda (${b.mp4})`); lihat.add(k); }
  return daftar;
}
export function uraiAntrean(teks, cwd = process.cwd()) {
  let j; try { j = JSON.parse(String(teks).replace(/^\uFEFF/, '')); } catch (e) { throw new GalatPakai(`Antrean bukan JSON yang sah: ${e.message}`); }
  if (!Array.isArray(j) || !j.length) throw new GalatPakai('Antrean harus larik yang tidak kosong: [{ "html": "bab1.html", "mp4": "mp4/bab1.mp4" }, ...]');
  return periksaGanda(j.map((x, i) => butir(x, i + 1, cwd)));
}
export function butirDariArg(daftar, keluar = 'mp4', cwd = process.cwd()) {
  return periksaGanda(daftar.map((a, i) => {
    const url = /^(https?|file):\/\//i.test(a), nama = basename(url ? new URL(a).pathname : a).replace(/\.html?$/i, '') || 'halaman';
    return butir({ [url ? 'url' : 'html']: a, mp4: join(keluar, nama + '.mp4') }, i + 1, cwd);
  }));
}
export function uraiArgumen(argv) {
  const o = { posisi: [], keluar: 'mp4', gabung: '', log: 'antre-render.log', lapor: 60, poll: 30, tahan: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], nilai = () => { if (i + 1 >= argv.length) throw new GalatPakai(`${a} butuh nilai`); return argv[++i]; };
    if (a === '--keluar') o.keluar = nilai();
    else if (a === '--gabung') o.gabung = nilai();
    else if (a === '--log') o.log = nilai();
    else if (a === '--lapor' || a === '--poll') { const n = Number(nilai()); if (!(n > 0)) throw new GalatPakai(`${a} harus angka > 0 (detik)`); o[a.slice(2)] = n; }
    else if (a === '--tanpa-tahan-sleep') o.tahan = false;
    else if (a.startsWith('--')) throw new GalatPakai(`opsi tidak dikenal: ${a} (lihat --help)`);
    else o.posisi.push(a);
  }
  return o;
}

/* ---------- basi-tidaknya mp4 ---------- */
export function audioDari(html, baca) {      // src lokal dari <audio id="vo"> di html, atau null
  const teks = html && baca(html), tag = teks && /<audio\b[^>]*\bid\s*=\s*["']vo["'][^>]*>/i.exec(teks)?.[0], src = tag && /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
  if (!src || /^[a-z][a-z0-9+.-]*:/i.test(src)) return null;
  let p = src; try { p = decodeURI(src); } catch {}
  return resolve(dirname(html), p.split(/[?#]/)[0]);
}
export function statusItem(it, { mtime, baca }) {   // lewati hanya bila mp4 ADA dan STRIK LEBIH BARU dari html dan audio (seperti -nt di antre-render.sh)
  const m = mtime(it.mp4);
  if (m == null) return { lewati: false, alasan: 'mp4 belum ada' };
  const dep = [it.html, it.audio || audioDari(it.html, baca)].filter(Boolean);
  for (const f of dep) { const t = mtime(f); if (t != null && t >= m) return { lewati: false, alasan: `${basename(f)} lebih baru dari mp4` }; }
  return { lewati: true, alasan: dep.length ? 'mp4 lebih baru dari html dan audio' : 'mp4 sudah ada' };
}

/* ---------- kemajuan, fps, perkiraan selesai ---------- */
export function bacaBaris(b) {                 // baris keluaran export-frames -> {jenis} | null (baris lain dicatat apa adanya)
  let m;
  if ((m = /^(\d+) frame @ ([\d.]+) fps \((.*)\) -> /.exec(b))) return { jenis: 'mulai', total: +m[1], fps: +m[2], rinci: m[3] };
  if ((m = /^(\d+)\/(\d+)\s+[\d.]+ frame\/dtk/.exec(b))) return { jenis: 'maju', selesai: +m[1], total: +m[2] };
  if (/^selesai\b/.test(b)) return { jenis: 'selesai' };
  return null;
}
const p2 = n => String(n).padStart(2, '0');
export const lama = dtk => { const m = Math.round(dtk / 60); return dtk < 90 ? `${Math.round(dtk)} dtk` : m < 60 ? `${m} mnt` : `${Math.floor(m / 60)} j ${p2(m % 60)} mnt`; };
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const jam = (ms, sekarang) => { const d = new Date(ms), hm = `${p2(d.getHours())}:${p2(d.getMinutes())}`; return d.toDateString() === new Date(sekarang).toDateString() ? hm : `${HARI[d.getDay()]} ${hm}`; };
export const stempel = ms => { const d = new Date(ms); return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
export const sisaDetik = (sisaFrame, laju) => laju > 0 && sisaFrame >= 0 ? sisaFrame / laju : null;
// frame butir yang belum jalan: dari durasi audio x fps bila ada (m.kira), selain itu rata-rata butir yang sudah terlihat
export const sisaFrameLain = (menunggu, rata) => menunggu.reduce((a, m) => a + (m.kira ?? rata), 0);
const mb = b => b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : `${(b / 1048576).toFixed(1)} MB`;

/* ---------- penahan sleep: proses anak yang hidup selama antrean berjalan ---------- */
// 2147483649 = ES_CONTINUOUS (0x80000000) | ES_SYSTEM_REQUIRED (0x1). Keadaan itu milik thread PowerShell dan lenyap bersama
// prosesnya; loop berhenti sendiri bila antrean mati tanpa sempat membersihkan (mis. dibunuh paksa). 'Stop': bila Add-Type
// ditolak (mis. PowerShell mode terbatas) prosesnya keluar kode 1 dan antrean mencetak peringatan, bukan diam-diam tak menahan.
const PS = pid => `$ErrorActionPreference = 'Stop'; Add-Type -Namespace W -Name P -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'; ` +
  `while (Get-Process -Id ${pid} -ErrorAction SilentlyContinue) { [W.P]::SetThreadExecutionState(2147483649) | Out-Null; Start-Sleep 15 }`;
export function perintahTahan(platform, pid) {
  if (platform === 'win32') return { cmd: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', PS(pid)] };
  if (platform === 'darwin') return { cmd: 'caffeinate', args: ['-i', '-w', String(pid)] };
  if (platform === 'linux') return { cmd: 'systemd-inhibit', args: ['--what=idle:sleep', '--who=WeVai', '--why=Render video panjang', '--mode=block', 'sh', '-c', `while kill -0 ${pid} 2>/dev/null; do sleep 5; done`] };
  return null;
}
export function tahanSleep({ platform = process.platform, pid = process.pid, spawn: mulai = spawn, catat }) {
  const p = perintahTahan(platform, pid), kosong = { stop() {} };
  if (!p) { catat(`[peringatan] tidak ada penahan sleep untuk platform ${platform}: pastikan laptop tidak tidur selama render`); return kosong; }
  let anak, lepas = false;
  try { anak = mulai(p.cmd, p.args, { stdio: 'ignore', windowsHide: true }); } catch (e) { catat(`[peringatan] penahan sleep gagal dijalankan (${p.cmd}: ${e.message}): laptop bisa tidur di tengah render`); return kosong; }
  anak.on('error', e => catat(`[peringatan] penahan sleep tidak jalan (${p.cmd}: ${e.code === 'ENOENT' ? 'tidak terpasang' : e.message}): laptop bisa tidur di tengah render`));
  anak.on('exit', (kode, sinyal) => { if (!lepas) catat(`[peringatan] penahan sleep berhenti sendiri (${kode ?? sinyal}): laptop bisa tidur`); });
  if (anak.pid) catat(`[tahan-sleep] aktif (${p.cmd}, pid ${anak.pid})`);
  return { stop() { if (lepas) return; lepas = true; try { anak.kill(); } catch {} catat('[tahan-sleep] dilepas'); } };
}

/* ---------- inti: jalankan antrean. Semua sentuhan ke dunia luar lewat d (disuntikkan oleh uji) ---------- */
export async function jalankanAntrean(items, o, d) {
  const { catat } = d, hasil = [], totals = [];
  let tahan = null, frameJadi = 0, detikRender = 0;
  const nyalakan = () => { if (o.tahan && !tahan) tahan = d.tahan(); };
  const lepas = () => { tahan?.stop(); tahan = null; };
  catat(`[mulai] ${items.length} butir${o.gabung ? `, gabungan -> ${relative(d.cwd, o.gabung) || o.gabung}` : ''}`);

  for (const [i, it] of items.entries()) {
    const ke = `${i + 1}/${items.length}`, st = statusItem(it, d);
    if (st.lewati) {
      const u = d.ukur(it.mp4);
      if (u) { catat(`[lewati] ${it.nama} (${st.alasan}; ${lama(u.dur)}, ${mb(u.size)}) ${ke}`); hasil.push({ it, status: 'lewati' }); continue; }
      catat(`[ulang] ${it.nama}: mp4 ada tetapi tidak terbaca ffprobe (rusak?), dirender ulang`);
    } else if (st.alasan !== 'mp4 belum ada') catat(`[ulang] ${it.nama}: ${st.alasan}`);

    nyalakan();
    if (it.siap && !d.ada(it.siap)) {
      catat(`[tunggu] ${it.nama}: menunggu penanda ${relative(d.cwd, it.siap) || it.siap}`);
      while (!d.ada(it.siap)) await d.tidur(o.poll * 1000);
      catat(`[siap] ${it.nama} ${ke}`);
    }
    if (it.html && !d.ada(it.html)) { catat(`[GAGAL] ${it.nama}: html tidak ditemukan (${it.html})`); hasil.push({ it, status: 'gagal' }); continue; }

    // butir sesudahnya yang akan dirender juga (yang sudah jadi tidak dihitung); panjangnya dikira dari audio
    const menunggu = items.slice(i + 1).filter(x => !statusItem(x, d).lewati);
    for (const m of menunggu) if (m.kira === undefined) {
      const a = m.audio || audioDari(m.html, d.baca), dur = a && d.durasi(a);
      m.kira = dur ? Math.ceil(dur * (Number({ ...d.env, ...m.env }.FPS) || 60)) : null;
    }
    const tmp = it.mp4.replace(/\.mp4$/i, '') + '.sementara.mp4', mulai = d.sekarang();
    d.hapus(tmp); d.hapus(tmp + '.parts');
    catat(`[render] ${it.nama} (${ke})${Object.keys(it.env).length ? ' env ' + Object.entries(it.env).map(([k, v]) => `${k}=${v}`).join(' ') : ''}`);

    let total = 0, t0 = 0, lapor = 0;
    const onBaris = b => {
      const p = bacaBaris(b), now = d.sekarang();
      if (!p) { catat(`  | ${b}`); return; }
      if (p.jenis === 'mulai') { total = p.total; t0 = now; lapor = 0; totals.push(total); catat(`  ${p.total} frame @ ${p.fps} fps (${p.rinci})`); return; }
      if (p.jenis !== 'maju' || !t0 || (lapor && now - lapor < o.lapor * 1000)) return;
      lapor = now;
      const dtk = Math.max(1e-3, (now - t0) / 1000), laju = p.selesai / dtk, global = (frameJadi + p.selesai) / (detikRender + dtk);
      const item = sisaDetik(p.total - p.selesai, laju), lain = sisaFrameLain(menunggu, totals.reduce((a, b) => a + b, 0) / totals.length);
      const antre = item != null && lain ? item + sisaDetik(lain, global) : item;
      catat(`  ${it.nama}  ${p.selesai}/${p.total} (${Math.floor(100 * p.selesai / p.total)}%)  ${laju.toFixed(2)} fps  butir: sisa ${item == null ? '?' : lama(item)}` +
        (antre == null ? '' : `${lain ? `  antrean: sisa ${lama(antre)}` : ''}, selesai ±${jam(now + antre * 1000, now)}`));
    };
    const kode = await d.render(it, tmp, onBaris), akhir = d.sekarang();

    let ok = kode === 0 && d.ada(tmp);
    if (ok) try { d.ganti(tmp, it.mp4); } catch (e) { ok = false; catat(`  gagal mengganti nama ${basename(tmp)}: ${e.message}`); }
    if (!ok) {
      d.hapus(tmp); d.hapus(tmp + '.parts');
      catat(`[GAGAL] ${it.nama}: export-frames ${kode === 0 ? 'selesai tanpa berkas' : `keluar dengan kode ${kode}`}. Jalankan ulang untuk mencoba lagi.`);
      hasil.push({ it, status: 'gagal' }); continue;
    }
    if (t0) { frameJadi += total; detikRender += (akhir - t0) / 1000; }
    const u = d.ukur(it.mp4);
    catat(`[ok] ${it.nama}  ${total ? `${total} frame ` : ''}dalam ${lama((akhir - mulai) / 1000)}${t0 ? ` (${(total / Math.max(1e-3, (akhir - t0) / 1000)).toFixed(2)} fps)` : ''}${u ? `  video ${lama(u.dur)}, ${mb(u.size)}` : ''} ${ke}`);
    hasil.push({ it, status: 'ok' });
  }

  const gagal = hasil.filter(h => h.status === 'gagal'), n = s => hasil.filter(h => h.status === s).length;
  const ringkas = `${n('ok')} dirender, ${n('lewati')} dilewati${gagal.length ? `, ${gagal.length} gagal` : ''}`;
  if (gagal.length) {
    lepas();
    catat(`[GAGAL] ${gagal.length} butir: ${gagal.map(h => h.it.nama).join(', ')}. Jalankan ulang perintah yang sama: butir yang sudah jadi dilewati${o.gabung ? '; gabungan menunggu semua butir' : ''}.`);
    return 1;
  }
  if (o.gabung) {
    const bagian = items.map(x => x.mp4), dur = bagian.map(f => d.ukur(f)?.dur), jumlah = dur.reduce((a, b) => a + (b ?? NaN), 0);
    const baru = d.mtime(o.gabung) != null && bagian.every(f => d.mtime(f) < d.mtime(o.gabung));
    if (baru && d.ukur(o.gabung)) catat(`[lewati] gabungan ${relative(d.cwd, o.gabung) || o.gabung} sudah lebih baru dari semua butir`);
    else {
      catat(`[gabung] ${bagian.length} berkas -> ${relative(d.cwd, o.gabung) || o.gabung}`);
      if (!await d.gabung(bagian, o.gabung)) { lepas(); catat('[GAGAL] ffmpeg gagal menyambung (butir tetap tersimpan; jalankan ulang untuk mencoba lagi).'); return 1; }
    }
    const u = d.ukur(o.gabung);
    if (!u) { lepas(); catat('[GAGAL] gabungan tidak terbaca ffprobe.'); return 1; }
    catat(`[gabung] durasi ${u.dur.toFixed(2)} dtk (${lama(u.dur)}), ukuran ${mb(u.size)}` +
      (Number.isNaN(jumlah) ? '' : Math.abs(u.dur - jumlah) <= 0.5 + 0.1 * bagian.length ? `; cocok dengan jumlah butir (${jumlah.toFixed(2)} dtk)` : `; [peringatan] jumlah durasi butir ${jumlah.toFixed(2)} dtk berbeda`));   // AAC menambah <= ±1 frame (±43 ms) per sambungan
  }
  lepas();
  catat(`[selesai] ${ringkas}`);
  return 0;
}

/* ---------- dunia nyata ---------- */
const aktif = new Set();                          // anak yang harus mati bersama antrean
let sedang = '';                                  // berkas sementara butir yang sedang dirender (dibuang bila antrean dihentikan)
const matikan = c => {                            // Windows: taskkill /T agar Chrome dan ffmpeg cucu ikut mati (kill() hanya membunuh anak langsung)
  if (c.exitCode !== null || c.signalCode) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(c.pid), '/T', '/F'], { stdio: 'ignore' }); else c.kill('SIGTERM');
};
const ffprobe = f => {
  const r = spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'default=nw=1', f], { encoding: 'utf8' });
  const dur = r.status === 0 ? Number(/duration=([\d.]+)/.exec(r.stdout)?.[1]) : 0, size = Number(/size=(\d+)/.exec(r.stdout || '')?.[1]);
  return dur > 0 ? { dur, size } : null;
};
function pemecah(onBaris) {                       // data mentah -> baris utuh (pemisah \r atau \n; sisa yang belum selesai ditahan)
  let sisa = '';
  return Object.assign(c => { const bagian = (sisa + c).split(/[\r\n]+/); sisa = bagian.pop(); for (const b of bagian) if (b.trim()) onBaris(b.trimEnd()); }, { habis: () => { if (sisa.trim()) onBaris(sisa.trimEnd()); sisa = ''; } });
}
function nyata(o, catat) {
  const p = {
    cwd: process.cwd(), env: process.env, catat, sekarang: Date.now, tidur: ms => new Promise(r => setTimeout(r, ms)),
    mtime: f => { try { return statSync(f).mtimeMs; } catch { return null; } }, ada: existsSync,
    baca: f => { try { return readFileSync(f, 'utf8'); } catch { return null; } },
    hapus: f => { try { rmSync(f, { recursive: true, force: true }); } catch {} }, ganti: renameSync,
    ukur: ffprobe, durasi: f => ffprobe(f)?.dur ?? null,
    tahan: () => (p.tahanAktif = tahanSleep({ catat })),
    render: (it, tmp, onBaris) => new Promise(tamat => {
      sedang = tmp;
      const c = spawn(process.execPath, [EKSPOR], { env: { ...process.env, ...it.env, URL: it.url, MP4: tmp }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      aktif.add(c);
      const a = pemecah(onBaris), b = pemecah(onBaris), selesai = kode => { a.habis(); b.habis(); aktif.delete(c); sedang = ''; tamat(kode ?? 1); };
      c.stdout.setEncoding('utf8'); c.stderr.setEncoding('utf8');
      c.stdout.on('data', a); c.stderr.on('data', b);
      c.on('error', e => { catat(`  tidak bisa menjalankan export-frames: ${e.message}`); selesai(1); });
      c.on('close', selesai);
    }),
    gabung: (bagian, keluar) => new Promise(selesai => {
      const tmp = keluar.replace(/\.mp4$/i, '') + '.sementara.mp4', daftar = keluar + '.daftar.txt';
      mkdirSync(dirname(keluar), { recursive: true });
      writeFileSync(daftar, bagian.map(f => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
      const c = spawn(FFMPEG, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', daftar, '-c', 'copy', '-movflags', '+faststart', tmp], { stdio: ['ignore', 'inherit', 'inherit'] });
      aktif.add(c);
      c.on('error', () => { aktif.delete(c); selesai(false); });
      c.on('close', kode => {
        aktif.delete(c); p.hapus(daftar);
        if (kode !== 0) { p.hapus(tmp); return selesai(false); }
        try { renameSync(tmp, keluar); selesai(true); } catch { p.hapus(tmp); selesai(false); }
      });
    }),
  };
  return p;
}

async function utama(argv) {
  bantuan(import.meta.url);                       // --help / -h sebelum apa pun
  const o = uraiArgumen(argv), cwd = process.cwd();
  if (!o.posisi.length) throw new GalatPakai('Beri antrean: antrean.json, atau satu atau lebih berkas .html. Lihat --help.');
  const json = o.posisi.length === 1 && /\.json$/i.test(o.posisi[0]);
  if (!json && o.posisi.some(a => /\.json$/i.test(a))) throw new GalatPakai('Antrean .json berdiri sendiri; tidak bisa dicampur dengan berkas .html.');
  let items;
  if (json) { const f = resolve(cwd, o.posisi[0]); if (!existsSync(f)) throw new GalatPakai(`Antrean tidak ditemukan: ${f}`); items = uraiAntrean(readFileSync(f, 'utf8'), cwd); }
  else items = butirDariArg(o.posisi, o.keluar, cwd);
  if (o.gabung) { if (!/\.mp4$/i.test(o.gabung)) throw new GalatPakai('--gabung harus berkas .mp4'); o.gabung = resolve(cwd, o.gabung); }
  for (const alat of [FFMPEG, FFPROBE]) if (spawnSync(alat, ['-version'], { stdio: 'ignore' }).status !== 0)
    throw new GalatPakai(`"${alat}" tidak ditemukan. Pasang ffmpeg (winget install Gyan.FFmpeg / brew install ffmpeg) atau set FFMPEG=<path> (FFPROBE bila tidak berdampingan).`);

  const log = resolve(cwd, o.log);
  mkdirSync(dirname(log), { recursive: true });
  const catat = baris => { const s = `${stempel(Date.now())} ${baris}`; console.log(s); try { appendFileSync(log, s + '\n'); } catch {} };
  const d = nyata(o, catat);
  catat(`[antre-render] ${new Date().toLocaleString('sv-SE')} · pid ${process.pid} · log: ${relative(cwd, log) || log}`);

  // bersih-bersih di SEMUA jalan keluar: normal, galat, Ctrl+C (SIGINT), ditutup (SIGHUP/SIGBREAK), dihentikan (SIGTERM)
  process.on('exit', () => {
    for (const c of aktif) matikan(c);
    if (sedang) { d.hapus(sedang); d.hapus(sedang + '.parts'); }   // butir yang terputus: buang sisa sementaranya (jalan berikutnya mengulang butir itu)
    d.tahanAktif?.stop();
  });
  for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) process.on(s, () => { catat(`[henti] sinyal ${s}: menghentikan export-frames dan ffmpeg`); process.exit(130); });
  return jalankanAntrean(items, o, d);
}

/* dijalankan langsung (bukan di-import oleh uji). Bandingkan jalur NYATA: skill sering dipasang lewat tautan atau junction */
const langsung = (() => { try { return realpathSync.native(process.argv[1]) === realpathSync.native(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (langsung)
  utama(process.argv.slice(2)).then(kode => { process.exitCode = kode; }, e => {
    if (e instanceof GalatPakai) console.error(e.message); else console.error(e);
    process.exitCode = 1;
  });
