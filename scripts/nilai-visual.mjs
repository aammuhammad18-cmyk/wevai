#!/usr/bin/env node
/* =========================================================
   NILAI-VISUAL: mengubah kriteria visual peta peningkatan gaya menjadi ANGKA, supaya bingkai "flat" tidak lolos hanya
   karena agen (yang tak bisa menonton video) menilainya dengan mata. Masukannya PNG dari snap.mjs. Tanpa dependensi
   (Node >= 18, PNG dibaca lewat node:zlib). Ini saringan, bukan vonis: mata tetap menilai rasa (anti-ppt.md, Kalibrasi rasa).

   Pakai:
     node scripts/nilai-visual.mjs shots                                  folder (semua *.png; kontak.png dilewati)
     node scripts/nilai-visual.mjs shots/t7_00.png shots/t11_00.png       berkas satu per satu
     node scripts/nilai-visual.mjs shots --sumber '[{"x":512,"y":598},{"x":778,"y":598,"r":90}]' --subjek 1230,205,540,845
     node scripts/nilai-visual.mjs shots --keluar nilai.json              + tulis laporan JSON; --json = HANYA JSON ke layar
   --sumber  sumber cahaya yang DIDEKLARASIKAN, piksel bingkai: JSON [{x, y, r?}] atau nama berkas .json. r = jari-jari
             pencarian, bawaan 7 % sisi terpendek. Kunci tanpa tanda kutip dimaafkan (PowerShell 5.1 membuangnya).
   --subjek  kotak subjek x,y,w,h (piksel bingkai). Tanpa ini: tengah (bobot Gauss) dibanding pita tepi 12 %.

   Empat ukuran per bingkai (kisi kerja: rata-rata blok, sisi terpanjang <= 600; skala = L OKLab x 100, 0 hitam, 100 putih):
     1 luminans   p5 / p50 / p95 dan rentang = p95 - p5.   PERINGATAN "flat" bila rentang < AMBANG.rentang.
     2 kontras    nilai = yang terbesar dari |rata-rata L kotak - rata-rata L cincin| dan sorot = p95 L kotak - median L
                  cincin (cincin = kotak dibesarkan setengah ukurannya; sorot menangkap siluet ber-rim, yang rata-ratanya
                  nyaris sama dengan latar). Tanpa kotak: hanya selisih tengah-tepi.  PERINGATAN bila < AMBANG.kontras.
     3 titik terang dekat tiap sumber: puncak L di cakram r - median bingkai.  PERINGATAN bila < AMBANG.sumber (sumber
                  yang seharusnya bersinar tidak bersinar), atau sumber di luar bingkai. Tanpa --sumber: dilewati.
     4 warna dominan: histogram OKLab kasar, kotak berdekatan dilebur, dihitung yang menutupi >= AMBANG.persen % bingkai.
                  PERINGATAN bila di luar [warnaMin, warnaMaks]: monoton, atau palet tidak serempak.
   Ambang bawaan (AMBANG di berkas ini): rentang 28, kontras 10, sumber +30, warna 2-6 (>= 5 % bingkai).
   Ambang adalah KALIBRASI, bukan selera: angka dan alasannya di evals/bukti/2026-11-03-nilai-visual/README.md. Jangan
   menurunkannya agar hijau; perbaiki bingkainya. Flat yang dipilih sadar (kulit "flat cerah") cukup dinyatakan di pesan penutup.

   Keluaran: tabel Indonesia (ok / peringatan per ukuran) + sebab dan saran tiap peringatan.
   Kode keluar: 0 semua ok - 1 ada peringatan - 2 galat (PNG tak terbaca, argumen salah).
   PNG yang didukung: 8 bit per kanal, RGB, RGBA, abu-abu (+alfa), berpalet (tRNS ikut); filter 0-4; tanpa interlace. Yang lain = galat jelas.
   Alfa dilebur di atas hitam. Untuk JPEG: ffmpeg -i f.jpg f.png
   ========================================================= */
import { readFileSync, readdirSync, statSync, writeFileSync, realpathSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bantuan } from './bantuan.mjs';

export class GalatNilai extends Error {}                  // masukan tak bisa dinilai: dicetak apa adanya, kode keluar 2
const TTD = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), KANAL = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }, MAKS_PIKSEL = 5e7;

/* ---------- ambang: hasil kalibrasi dengan bingkai nyata (evals/bukti/2026-11-03-nilai-visual/). Luminans = L OKLab x 100 ---------- */
export const AMBANG = {
  rentang: 28,                  // p95 - p5 di bawah ini = flat
  kontras: 10,                  // subjek vs cincin (atau tengah vs tepi)
  sumber: 30,                   // puncak L dekat sumber harus >= median bingkai + ini
  warnaMin: 2, warnaMaks: 6,    // jumlah warna dominan yang wajar
  persen: 5,                    // warna dominan = menutupi >= persen % bingkai
  kuantum: .04, gabung: .12,    // kotak histogram OKLab; kotak yang jaraknya < gabung dilebur ke yang lebih besar
};

/* ---------- PNG ---------- */
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
function bukaFilter(raw, h, baris, k) {                  // membalik filter PNG 0-4 pada tempatnya; k = bita per piksel (Uint8Array membulatkan modulo 256 sendiri)
  for (let y = 0; y < h; y++) {
    const o = y * (baris + 1), f = raw[o], a0 = o + 1, b0 = a0 - (baris + 1);
    switch (f) {
      case 0: break;
      case 1: for (let i = k; i < baris; i++) raw[a0 + i] += raw[a0 + i - k]; break;
      case 2: if (y) for (let i = 0; i < baris; i++) raw[a0 + i] += raw[b0 + i]; break;
      case 3: for (let i = 0; i < baris; i++) raw[a0 + i] += ((i >= k ? raw[a0 + i - k] : 0) + (y ? raw[b0 + i] : 0)) >> 1; break;
      case 4: for (let i = 0; i < baris; i++) raw[a0 + i] += paeth(i >= k ? raw[a0 + i - k] : 0, y ? raw[b0 + i] : 0, y && i >= k ? raw[b0 + i - k] : 0); break;
      default: throw new GalatNilai(`filter PNG ${f} di baris ${y} tidak dikenal (hanya 0-4)`);
    }
  }
}
export function bacaPng(buf) {                           // -> { w, h, px: RGBA 8-bit }
  if (buf.length < 8 || !buf.subarray(0, 8).equals(TTD))
    throw new GalatNilai(buf[0] === 0xFF && buf[1] === 0xD8 ? 'ini JPEG, bukan PNG: ubah dulu (ffmpeg -i f.jpg f.png)' : 'bukan PNG (tanda tangan berkas salah)');
  let p = 8, ihdr, pal, trns; const idat = [];
  while (p + 12 <= buf.length) {
    const n = buf.readUInt32BE(p), tipe = buf.toString('latin1', p + 4, p + 8);
    if (p + 12 + n > buf.length) throw new GalatNilai(`PNG terpotong di tengah potongan ${tipe}`);
    const isi = buf.subarray(p + 8, p + 8 + n);
    if (tipe === 'IHDR') ihdr = isi; else if (tipe === 'PLTE') pal = isi; else if (tipe === 'tRNS') trns = isi; else if (tipe === 'IDAT') idat.push(isi); else if (tipe === 'IEND') break;
    p += 12 + n;
  }
  if (!ihdr || ihdr.length < 13) throw new GalatNilai('PNG tanpa IHDR');
  if (!idat.length) throw new GalatNilai('PNG tanpa data gambar (IDAT): berkas terpotong');
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4), bit = ihdr[8], jenis = ihdr[9];
  if (!(jenis in KANAL)) throw new GalatNilai(`jenis warna PNG ${jenis} tidak dikenal`);
  if (bit !== 8) throw new GalatNilai(`PNG ${bit}-bit tidak didukung: hanya 8 bit per kanal (simpan ulang sebagai PNG 8-bit)`);
  if (ihdr[10] || ihdr[11]) throw new GalatNilai('metode kompresi atau filter PNG tidak dikenal');
  if (ihdr[12]) throw new GalatNilai('PNG berjalin (Adam7) tidak didukung: simpan ulang tanpa interlace');
  if (!w || !h || w * h > MAKS_PIKSEL) throw new GalatNilai(`ukuran PNG ${w}x${h} tidak wajar`);
  if (jenis === 3 && (!pal || pal.length < 3)) throw new GalatNilai('PNG berpalet tanpa PLTE');
  const k = KANAL[jenis], baris = w * k;
  const dugaan = h * (baris + 1);                        // ukuran data mentah menurut IHDR; batas ini juga menahan PNG bom (data kecil yang mengembang raksasa)
  let raw; try { raw = inflateSync(Buffer.concat(idat), { maxOutputLength: dugaan }); } catch (e) { throw new GalatNilai(e.code === 'ERR_BUFFER_TOO_LARGE' ? `data PNG lebih besar dari ${dugaan} bita yang dinyatakan IHDR: berkas rusak` : `data PNG rusak (${e.message})`); }
  if (raw.length !== dugaan) throw new GalatNilai(`data PNG ${raw.length} bita, seharusnya ${dugaan}: berkas terpotong atau rusak`);
  bukaFilter(raw, h, baris, k);
  const px = new Uint8Array(w * h * 4), nPal = pal ? pal.length / 3 | 0 : 0;
  const kunci = trns && jenis === 0 && trns.length >= 2 ? trns.readUInt16BE(0) : trns && jenis === 2 && trns.length >= 6 ? [0, 2, 4].map(a => trns.readUInt16BE(a)) : null;   // tRNS abu-abu/RGB = kunci warna: piksel yang sama jadi transparan
  for (let y = 0; y < h; y++) {
    const s = y * (baris + 1) + 1;
    let o = y * w * 4;
    if (jenis === 6) { px.set(raw.subarray(s, s + baris), o); continue; }
    for (let x = 0, i = s; x < w; x++, i += k, o += 4) {
      if (jenis === 2) { px[o] = raw[i]; px[o + 1] = raw[i + 1]; px[o + 2] = raw[i + 2]; px[o + 3] = kunci && raw[i] === kunci[0] && raw[i + 1] === kunci[1] && raw[i + 2] === kunci[2] ? 0 : 255; }
      else if (jenis === 0) { px[o] = px[o + 1] = px[o + 2] = raw[i]; px[o + 3] = raw[i] === kunci ? 0 : 255; }
      else if (jenis === 4) { px[o] = px[o + 1] = px[o + 2] = raw[i]; px[o + 3] = raw[i + 1]; }
      else { const v = raw[i]; if (v >= nPal) throw new GalatNilai(`indeks palet ${v} di luar PLTE (${nPal} warna)`);
        px[o] = pal[v * 3]; px[o + 1] = pal[v * 3 + 1]; px[o + 2] = pal[v * 3 + 2]; px[o + 3] = trns && v < trns.length ? trns[v] : 255; }
    }
  }
  return { w, h, px };
}

/* ---------- warna: sRGB 0-255 -> OKLab (Ottosson 2020) ---------- */
const lin = c => (c /= 255) <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
export function oklab(r, g, b) {
  r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}

/* kisi kerja: rata-rata blok f x f (alfa dilebur di atas hitam) -> sRGB dan OKLab per sel. f agar sisi terpanjang <= ukuran */
export function kisi({ w, h, px }, ukuran = 600) {
  const f = Math.max(1, Math.ceil(Math.max(w, h) / ukuran)), cw = Math.ceil(w / f), ch = Math.ceil(h / f), rgb = new Float32Array(cw * ch * 3), lab = new Float32Array(cw * ch * 3);
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = cy * f, ye = Math.min(h, y + f); y < ye; y++) for (let x = cx * f, xe = Math.min(w, x + f); x < xe; x++) { const i = (y * w + x) * 4, a = px[i + 3]; r += px[i] * a; g += px[i + 1] * a; b += px[i + 2] * a; n++; }
    const d = n * 255, o = (cy * cw + cx) * 3, c = oklab(r /= d, g /= d, b /= d);
    rgb[o] = r; rgb[o + 1] = g; rgb[o + 2] = b; lab[o] = c[0]; lab[o + 1] = c[1]; lab[o + 2] = c[2];
  }
  return { f, cw, ch, rgb, lab, w, h };
}

/* ---------- ukuran ---------- */
const r1 = x => Math.round(x * 10) / 10;
const persentil = (urut, q) => urut[Math.round(q / 100 * (urut.length - 1))];
const selDi = (g, x, y, w, h) => {                        // sel yang PUSATNYA jatuh di kotak piksel [x, x+w) x [y, y+h) -> [cx0, cy0, cx1, cy1), minimal satu sel, terpotong ke kisi
  const a = (v, maks) => Math.min(maks, Math.max(0, Math.ceil(v / g.f - .5))), cx0 = a(x, g.cw - 1), cy0 = a(y, g.ch - 1);
  return [cx0, cy0, Math.max(cx0 + 1, a(x + w, g.cw)), Math.max(cy0 + 1, a(y + h, g.ch))];
};
function selL(g, [x0, y0, x1, y1], tanpa) {              // nilai L semua sel di kotak, tanpa sel di kotak `tanpa`
  const out = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!(tanpa && x >= tanpa[0] && x < tanpa[2] && y >= tanpa[1] && y < tanpa[3])) out.push(g.lab[(y * g.cw + x) * 3]);
  return Float32Array.from(out).sort();
}
const rataL = a => a.reduce((s, v) => s + v, 0) / a.length;

export function kontras(g, subjek) {                      // lihat kepala berkas: ukuran 2
  if (subjek) {
    const [x, y, w, h] = subjek;
    if (x + w <= 0 || y + h <= 0 || x >= g.w || y >= g.h) throw new GalatNilai(`kotak subjek ${subjek.join(',')} di luar bingkai ${g.w}x${g.h}`);
    const kot = selDi(g, x, y, w, h), A = selL(g, kot), B = selL(g, selDi(g, x - w / 2, y - h / 2, w * 2, h * 2), kot);
    if (!B.length) throw new GalatNilai('kotak subjek memenuhi bingkai: tak ada latar untuk dibandingkan');
    const dL = Math.abs(rataL(A) - rataL(B)) * 100, sorot = (persentil(A, 95) - persentil(B, 50)) * 100;
    return { mode: 'subjek', a: r1(rataL(A) * 100), b: r1(rataL(B) * 100), dL: r1(dL), sorot: r1(sorot), nilai: r1(Math.max(dL, sorot)) };
  }
  const tepi = Math.max(1, Math.round(.12 * Math.min(g.cw, g.ch))); let A = 0, wa = 0, B = 0, nb = 0;
  for (let y = 0; y < g.ch; y++) for (let x = 0; x < g.cw; x++) {
    const L = g.lab[(y * g.cw + x) * 3];
    if (Math.min(x, y, g.cw - 1 - x, g.ch - 1 - y) < tepi) { B += L; nb++; }
    else { const k = Math.exp(-((x - g.cw / 2) ** 2) / (2 * (g.cw * .25) ** 2) - ((y - g.ch / 2) ** 2) / (2 * (g.ch * .25) ** 2)); A += L * k; wa += k; }
  }
  const dL = Math.abs(A / wa - B / nb) * 100;
  return { mode: 'tengah', a: r1(A / wa * 100), b: r1(B / nb * 100), dL: r1(dL), nilai: r1(dL) };
}

export function sumberTerang(g, sumber, median) {         // puncak L (sel rata-rata blok) di cakram r piksel, dibanding median bingkai
  return sumber.map(({ x, y, r }) => {
    const rr = Math.max(r ?? .07 * Math.min(g.w, g.h), g.f), o = { x, y, r: Math.round(rr) };
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) return { ...o, catatan: `di luar bingkai ${g.w}x${g.h}`, status: 'peringatan' };
    const [x0, y0, x1, y1] = selDi(g, x - rr, y - rr, 2 * rr, 2 * rr); let puncak = -1;
    for (let cy = y0; cy < y1; cy++) for (let cx = x0; cx < x1; cx++) if (((cx + .5) * g.f - x) ** 2 + ((cy + .5) * g.f - y) ** 2 <= rr * rr) puncak = Math.max(puncak, g.lab[(cy * g.cw + cx) * 3]);
    if (puncak < 0) { const c = selDi(g, x, y, 1, 1); puncak = g.lab[(c[1] * g.cw + c[0]) * 3]; }     // cakram lebih kecil dari satu sel
    const selisih = (puncak - median) * 100;
    return { ...o, puncak: r1(puncak * 100), median: r1(median * 100), selisih: r1(selisih), status: selisih >= AMBANG.sumber ? 'ok' : 'peringatan' };
  });
}

export function warnaDominan(g) {                         // histogram OKLab kasar; kotak berdekatan dilebur ke yang terbesar; hitung kelompok >= persen
  const n = g.cw * g.ch, Q = AMBANG.kuantum, bin = new Map();
  for (let i = 0; i < n; i++) {
    const k = ((Math.floor(g.lab[i * 3] / Q) * 64 + Math.floor(g.lab[i * 3 + 1] / Q) + 32) * 64) + Math.floor(g.lab[i * 3 + 2] / Q) + 32;
    let e = bin.get(k); if (!e) bin.set(k, e = { n: 0, L: 0, a: 0, b: 0, r: 0, g: 0, bl: 0 });
    e.n++; e.L += g.lab[i * 3]; e.a += g.lab[i * 3 + 1]; e.b += g.lab[i * 3 + 2]; e.r += g.rgb[i * 3]; e.g += g.rgb[i * 3 + 1]; e.bl += g.rgb[i * 3 + 2];
  }
  const kel = [];
  for (const e of [...bin.values()].sort((x, y) => y.n - x.n)) {
    const L = e.L / e.n, a = e.a / e.n, b = e.b / e.n, k = kel.find(k => Math.hypot(k.L - L, k.a - a, k.b - b) < AMBANG.gabung);
    if (k) { k.n += e.n; k.r += e.r; k.g += e.g; k.bl += e.bl; } else kel.push({ L, a, b, n: e.n, r: e.r, g: e.g, bl: e.bl });
  }
  const hex = k => '#' + [k.r, k.g, k.bl].map(v => Math.round(v / k.n).toString(16).padStart(2, '0')).join('');
  const dominan = kel.sort((x, y) => y.n - x.n).filter(k => k.n / n * 100 >= AMBANG.persen).map(k => ({ hex: hex(k), persen: r1(k.n / n * 100) }));
  return { jumlah: dominan.length, dominan };
}

/* ---------- satu bingkai: semua ukuran + status ---------- */
export function nilaiBingkai(img, { sumber = [], subjek = null } = {}) {
  const g = kisi(img), n = g.cw * g.ch, L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = g.lab[i * 3];
  L.sort();
  const p5 = persentil(L, 5) * 100, p50 = persentil(L, 50), p95 = persentil(L, 95) * 100, st = ok => ok ? 'ok' : 'peringatan';
  const lum = { p5: r1(p5), p50: r1(p50 * 100), p95: r1(p95), rentang: r1(p95 - p5) }; lum.status = st(lum.rentang >= AMBANG.rentang);
  const kon = kontras(g, subjek); kon.status = st(kon.nilai >= AMBANG.kontras);
  const sum = sumberTerang(g, sumber, p50), war = warnaDominan(g); war.status = st(war.jumlah >= AMBANG.warnaMin && war.jumlah <= AMBANG.warnaMaks);
  return { lebar: img.w, tinggi: img.h, luminans: lum, kontras: kon, sumber: sum, warna: war, status: st([lum, kon, war, ...sum].every(m => m.status === 'ok')) };
}

/* ---------- peringatan: dikelompokkan per jenis, satu saran untuk semua bingkai yang kena ---------- */
const TEKS = {
  flat: () => ['flat: rentang luminans p5-p95 < ' + AMBANG.rentang, 'beri sorot dan bayangan sungguhan: cahaya-2d (sumber, redup, rim), pasca (GRADE bayangan/sorot/vignette)'],
  subjek: () => ['subjek menyatu dengan latar: kontras < ' + AMBANG.kontras, 'beri rim light (cahaya-2d rim) atau pisahkan nilai terang-gelap subjek dari latar'],
  tengah: () => ['tengah dan tepi sama terang: kontras < ' + AMBANG.kontras, 'beri falloff cahaya atau vignette, atau tunjuk subjeknya dengan --subjek'],
  redup: () => ['sumber tidak bersinar: puncak L dekat sumber kurang dari median + ' + AMBANG.sumber, 'naikkan inti dan pendar sumber (sumber(), bloom/halation di pasca); atau koordinat sumber meleset'],
  luar: () => ['sumber di luar bingkai', 'periksa koordinat (piksel bingkai), atau nilai bingkai itu terpisah dengan --sumber miliknya'],
  monoton: () => ['warna dominan kurang dari ' + AMBANG.warnaMin + ': bingkai monoton', 'beri aksen cahaya atau warna kedua'],
  ramai: () => ['warna dominan lebih dari ' + AMBANG.warnaMaks + ': palet tidak serempak', 'satukan lewat grade atau tint per adegan'],
};
export function peringatan(hasil, nama = h => h.berkas) {
  const kena = Object.fromEntries(Object.keys(TEKS).map(k => [k, []]));
  for (const h of hasil) {
    if (h.luminans.status !== 'ok') kena.flat.push(nama(h));
    if (h.kontras.status !== 'ok') kena[h.kontras.mode].push(nama(h));
    for (const k of new Set(h.sumber.filter(s => s.status !== 'ok').map(s => s.catatan ? 'luar' : 'redup'))) kena[k].push(nama(h));
    if (h.warna.status !== 'ok') kena[h.warna.jumlah < AMBANG.warnaMin ? 'monoton' : 'ramai'].push(nama(h));
  }
  return Object.entries(kena).filter(([, b]) => b.length).flatMap(([k, b]) => { const [apa, saran] = TEKS[k]();
    return [`- ${apa} (${b.length} bingkai: ${b.length > 6 ? b.slice(0, 6).join(', ') + ', ...' : b.join(', ')})`, `    saran: ${saran}`]; });
}

/* ---------- CLI ---------- */
export function bacaSumber(s) {
  let teks = s.trim();
  if (!/^[[{]/.test(teks)) { try { teks = readFileSync(teks, 'utf8').replace(/^\uFEFF/, ''); } catch { throw new GalatNilai(`--sumber: "${s}" bukan JSON dan bukan berkas yang terbaca`); } }
  let j; try { j = JSON.parse(teks); } catch {
    try { j = JSON.parse(teks.replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":')); } catch { throw new GalatNilai('--sumber: JSON tidak sah. Contoh: [{"x":512,"y":598},{"x":778,"y":598,"r":90}]'); }
  }
  return (Array.isArray(j) ? j : [j]).map(e => {
    const x = Number(e?.x), y = Number(e?.y), r = e?.r == null ? undefined : Number(e.r);
    if (!Number.isFinite(x) || !Number.isFinite(y) || (r !== undefined && !(r > 0))) throw new GalatNilai(`--sumber: tiap sumber butuh x dan y angka (r opsional, > 0): ${JSON.stringify(e)}`);
    return r === undefined ? { x, y } : { x, y, r };
  });
}
export function bacaSubjek(s) {
  const a = s.split(/[,\s]+/).filter(Boolean).map(Number);
  if (a.length !== 4 || a.some(v => !Number.isFinite(v)) || a[2] <= 0 || a[3] <= 0) throw new GalatNilai(`--subjek: butuh x,y,w,h (w dan h > 0), dapat "${s}"`);
  return a;
}
function urai(argv) {
  const o = { masuk: [], sumber: [], subjek: null, keluar: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const [kunci, sisa] = argv[i].startsWith('--') ? argv[i].split(/=(.*)/s) : [argv[i]], nilai = () => { if (sisa !== undefined) return sisa; if (i + 1 >= argv.length) throw new GalatNilai(`${kunci} butuh nilai`); return argv[++i]; };
    if (kunci === '--sumber') o.sumber = bacaSumber(nilai()); else if (kunci === '--subjek') o.subjek = bacaSubjek(nilai());
    else if (kunci === '--keluar') o.keluar = nilai(); else if (kunci === '--json') o.json = true;
    else if (kunci.startsWith('--')) throw new GalatNilai(`opsi tidak dikenal: ${kunci}`); else o.masuk.push(kunci);
  }
  return o;
}
function kumpulkan(masuk) {                               // berkas PNG dari daftar berkas dan folder; folder: urut angka (t3 < t11), kontak*.png dilewati
  const out = [];
  for (const m of masuk) {
    let s; try { s = statSync(m); } catch { throw new GalatNilai(`tidak ditemukan: ${m}`); }
    if (!s.isDirectory()) { out.push(m); continue; }
    const png = readdirSync(m).filter(f => /\.png$/i.test(f) && !/^kontak/i.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    if (!png.length) throw new GalatNilai(`tidak ada PNG di folder ${m}`);
    out.push(...png.map(f => join(m, f)));
  }
  return out;
}
const namaTampil = hasil => { const banyak = new Set(hasil.map(h => dirname(h.berkas))).size > 1; return h => banyak ? `${basename(dirname(h.berkas))}/${basename(h.berkas)}` : basename(h.berkas); };
function tabel(hasil, nama) {
  const baris = hasil.map(h => [nama(h), [h.luminans.p5, h.luminans.p50, h.luminans.p95].map(Math.round).join('/'), `${h.luminans.rentang} ${h.luminans.status}`,
    `${h.kontras.mode} ${h.kontras.nilai} ${h.kontras.status}`,
    h.sumber.length ? `${h.sumber.map(s => s.catatan ? 'luar' : (s.selisih >= 0 ? '+' : '') + s.selisih).join(' ')} ${h.sumber.every(s => s.status === 'ok') ? 'ok' : 'peringatan'}` : '-',
    `${h.warna.jumlah} ${h.warna.status} ${h.warna.dominan.slice(0, 3).map(d => d.hex).join(' ')}`.trimEnd(), h.status]);
  const kepala = ['bingkai', 'p5/p50/p95', 'rentang', 'kontras', 'titik terang', 'warna', 'hasil'], lebar = kepala.map((_, i) => Math.max(...[kepala, ...baris].map(b => b[i].length)));
  return [kepala, ...baris].map(b => b.map((c, i) => c.padEnd(lebar[i])).join('  ').trimEnd());
}
export function jalankan(argv, { log = console.log, err = console.error } = {}) {
  try {
    const o = urai(argv);
    if (!o.masuk.length) { err('pakai: node nilai-visual.mjs <png|folder> ... [--sumber json] [--subjek x,y,w,h] [--keluar nilai.json] [--json]   (--help: penjelasan lengkap)'); return 2; }
    const hasil = kumpulkan(o.masuk).map(berkas => {
      try { return { berkas, ...nilaiBingkai(bacaPng(readFileSync(berkas)), o) }; }
      catch (e) { if (e instanceof GalatNilai) e.message = `${berkas}: ${e.message}`; throw e; }
    });
    const merah = hasil.filter(h => h.status !== 'ok').length;
    const laporan = { alat: 'nilai-visual', ambang: AMBANG, opsi: { sumber: o.sumber, subjek: o.subjek }, bingkai: hasil, ringkas: { bingkai: hasil.length, ok: hasil.length - merah, peringatan: merah } };
    if (o.keluar) writeFileSync(o.keluar, JSON.stringify(laporan, null, 2) + '\n');
    if (o.json) log(JSON.stringify(laporan, null, 2));
    else {
      log(`nilai-visual: ${hasil.length} bingkai · sumber dideklarasikan: ${o.sumber.length} · subjek: ${o.subjek ? o.subjek.join(',') : 'tidak (tengah vs tepi)'}`);
      const nama = namaTampil(hasil);
      for (const b of tabel(hasil, nama)) log(b);
      const sebabnya = peringatan(hasil, nama); if (sebabnya.length) { log('peringatan:'); sebabnya.forEach(b => log(b)); }
      log(`${hasil.length} bingkai: ${hasil.length - merah} ok, ${merah} peringatan. Ambang: rentang >= ${AMBANG.rentang}, kontras >= ${AMBANG.kontras}, titik terang >= +${AMBANG.sumber}, warna ${AMBANG.warnaMin}-${AMBANG.warnaMaks} (>= ${AMBANG.persen} % bingkai).${o.keluar ? ` Laporan JSON: ${o.keluar}` : ''}`);
    }
    return merah ? 1 : 0;
  } catch (e) { err(e instanceof GalatNilai ? `galat: ${e.message}` : `galat tak terduga (bug alat ini): ${e.stack ?? e}`); return 2; }   // kode 1 = peringatan: galat tak boleh menyamar jadi peringatan
}

/* dijalankan langsung (bukan di-import oleh uji). Bandingkan jalur NYATA: skill sering dipasang lewat tautan/junction */
const langsung = (() => { try { return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (langsung) { bantuan(import.meta.url); process.exitCode = jalankan(process.argv.slice(2)); }
