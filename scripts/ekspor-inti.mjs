/* =========================================================
   EKSPOR-INTI: bagian murni (tanpa Chrome, tanpa berkas) yang dipakai export-frames.mjs dan diuji test-ekspor.mjs.
   ========================================================= */
import { availableParallelism, cpus } from 'node:os';

// jumlah thread logis; availableParallelism() baru ada di Node 18.14
export const paralel = () => (availableParallelism ? availableParallelism() : cpus().length);

// WORKERS standar: 2 bila mesin punya >= 2 thread, selain itu 1. Env WORKERS menimpa (bukan angka atau < 1 → 1).
export const workersStandar = (env = process.env, n = paralel()) => Math.max(1, Math.floor(Number(env.WORKERS || (n >= 2 ? 2 : 1))) || 1);

// Janji yang ditolak dengan pesan bila tak selesai dalam ms; pewaktunya selalu dibersihkan agar proses bisa keluar.
export function batasWaktu(janji, ms, pesan) {
  let t;
  return Promise.race([janji, new Promise((_, no) => { t = setTimeout(() => no(new Error(pesan)), ms); })]).finally(() => clearTimeout(t));
}

// browser.close() bisa menunggu selamanya bila Chrome beku (terukur: sesudah laptop tidur). Sesudah batasnya, prosesnya dimatikan.
export async function tutupBrowser(browser, ms = 15000) {
  const proses = browser.process?.();
  await batasWaktu(Promise.resolve().then(() => browser.close()), ms, 'menutup browser lewat batas waktu').catch(() => {});
  proses?.kill('SIGKILL');
}

// Ganti browser worker yang mati. Browser yang terlambat terbuka sesudah batas waktu ikut ditutup supaya tidak tertinggal.
export async function gantiBrowser(w, buka, { tutupMs = 15000, bukaMs = 300000 } = {}) {
  await tutupBrowser(w.browser, tutupMs);
  const baru = buka();
  try { Object.assign(w, await batasWaktu(baru, bukaMs, `membuka browser tidak selesai dalam ${bukaMs / 1000} dtk`)); }
  catch (e) { baru.then(x => tutupBrowser(x.browser, tutupMs), () => {}); throw e; }
}

// Level H.264 terkecil (tabel A-1: MaxFS, MaxMBPS) yang memuat ukuran × fps. Level terlalu rendah ditolak sebagian
// pemutar; terlalu tinggi ditolak dekoder perangkat keras lama (HD 4000: sampai 4.1).
const LEVEL = [[30, 1620, 40500], [31, 3600, 108000], [32, 5120, 216000], [40, 8192, 245760], [42, 8704, 522240], [50, 22080, 589824], [51, 36864, 983040], [52, 36864, 2073600]];
export function kodekAvc(w, h, fps) {
  const mb = Math.ceil(w / 16) * Math.ceil(h / 16), [idc] = LEVEL.find(([, fs, mbps]) => mb <= fs && mb * fps <= mbps) || LEVEL.at(-1);
  return 'avc1.6400' + idc.toString(16).padStart(2, '0');   // High profile, constraint 00
}

// 0,2 bit per piksel per frame (1080p30 ≈ 12 Mbps, nilai yang terukur di riset); BITRATE=<bit/dtk> menimpa
export const bitrateStandar = (w, h, fps, env = process.env) => Math.round(Number(env.BITRATE) || w * h * fps * 0.2);
