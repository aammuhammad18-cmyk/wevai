#!/usr/bin/env node
/* PERIKSA-KANVAS: memeriksa MP4 hasil export kanvas-mini.html (jalur biasa atau MODE=webcodecs), hanya dengan ffmpeg.
   Pakai: node periksa-kanvas.mjs <video.mp4> <fps> <durasi-dtk> [folder-png-pembanding]
   Halaman dirender dengan URL=file:///.../kanvas-mini.html?fps=<fps>&dur=<durasi-dtk> dan FPS=<fps>. Memeriksa:
     1. jumlah dan urutan frame, lewat 10 bit nomor frame di baris bawah kanvas (terbaca setelah encode lossy)
     2. warna 8 batang murni terhadap nilai teoretis (maks. selisih per kanal)
     3. selisih rata-rata per kanal terhadap PNG jalur biasa (OUT=<folder> FPS=<fps> ..., berkas f00000.png ...)
   Keluar 1 bila urutan/jumlah frame salah atau warna meleset lebih dari 4 level. */
import { spawnSync } from 'node:child_process';
const [, , video, fpsArg, durArg, gt] = process.argv;
if (!video || !(+fpsArg > 0) || !(+durArg > 0)) { console.log('pakai: node periksa-kanvas.mjs <video.mp4> <fps> <durasi-dtk> [folder-png]'); process.exit(1); }
const FPS = +fpsArg, DUR = +durArg, W = 640, H = 360, FR = W * H * 3;
const raw = args => { const r = spawnSync('ffmpeg', ['-v', 'error', ...args, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 }); if (r.status) throw new Error(String(r.stderr)); return r.stdout; };
const buf = raw(['-i', video]), n = buf.length / FR;
const px = (f, x, y) => { const o = f * FR + (y * W + x) * 3; return [buf[o], buf[o + 1], buf[o + 2]]; };
const nomor = f => { let v = 0; for (let b = 0; b < 10; b++) if (px(f, b * 16 + 8, H - 8)[0] > 128) v |= 1 << b; return v; };
const urutan = Array.from({ length: n }, (_, f) => nomor(f));
const urutanBenar = n === Math.round(DUR * FPS) && urutan.every((v, f) => v === f);
console.log(`${video}: ${n} frame terdecode (harapan ${Math.round(DUR * FPS)}); nomor frame ${urutanBenar ? 'berurutan 0…' + (n - 1) : 'SALAH: ' + urutan.join(',')}`);
const BATANG = [[255, 255, 255], [255, 255, 0], [0, 255, 255], [0, 255, 0], [255, 0, 255], [255, 0, 0], [0, 0, 255], [0, 0, 0]];
let maks = 0;
for (const f of [0, n >> 1, n - 1]) {
  const d = BATANG.map((c, i) => px(f, 40 + 80 * i, 75).map((v, k) => v - c[k]));
  const m = Math.max(...d.flat().map(Math.abs)); maks = Math.max(maks, m);
  console.log(`frame ${f}: selisih batang vs teoretis, maks |d| = ${m}`);
}
if (gt) {
  const g = raw(['-framerate', String(FPS), '-i', `${gt}/f%05d.png`]), m = Math.min(g.length, buf.length), jml = [0, 0, 0];
  for (let i = 0; i < m; i += 3) for (let k = 0; k < 3; k++) jml[k] += Math.abs(g[i + k] - buf[i + k]);
  console.log(`selisih rata-rata vs PNG (R, G, B) = ${jml.map(v => (v / (m / 3)).toFixed(2)).join(', ')}; frame pembanding ${g.length / FR}`);
}
process.exit(urutanBenar && maks <= 4 ? 0 : 1);
