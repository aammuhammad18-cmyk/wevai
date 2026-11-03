#!/usr/bin/env node
/* UJI NILAI-VISUAL: scripts/nilai-visual.mjs tanpa browser dan tanpa jaringan. PNG dibuat oleh pembuat PNG mungil di berkas
   ini (CRC32 + filter 0-4 + deflate), gambar uji sintetis kecil. Pakai: node --test scripts/test-nilai.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as nv from './nilai-visual.mjs';

const SKRIP = fileURLToPath(new URL('./nilai-visual.mjs', import.meta.url));
const dibuat = [];
const folder = () => { const d = mkdtempSync(join(tmpdir(), 'wevai-nilai-uji-')); dibuat.push(d); return d; };
process.on('exit', () => { for (const d of dibuat) try { rmSync(d, { recursive: true, force: true }); } catch {} });

/* ---------- pembuat PNG mungil (ditulis dari spesifikasi PNG, terpisah dari pembaca di nilai-visual.mjs) ---------- */
const CRC = Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xFFFFFFFF; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const potongan = (tipe, isi = Buffer.alloc(0)) => {
  const n = Buffer.alloc(4), c = Buffer.alloc(4), t = Buffer.from(tipe, 'latin1');
  n.writeUInt32BE(isi.length); c.writeUInt32BE(crc32(Buffer.concat([t, isi])));
  return Buffer.concat([n, t, isi, c]);
};
const KANAL = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const paethRef = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
/* data = bita mentah per baris tanpa bita filter; filter = angka 0-4 atau larik (dipakai berulang per baris); pecah = ukuran IDAT */
function png({ w, h, jenis = 6, data, filter = 0, palet, trns, bit = 8, interlace = 0, pecah = 0, tanpaIhdr = false, tanpaIdat = false }) {
  const k = KANAL[jenis], baris = w * k, mentah = Buffer.alloc(h * (baris + 1));
  for (let y = 0; y < h; y++) {
    const f = Array.isArray(filter) ? filter[y % filter.length] : filter;
    mentah[y * (baris + 1)] = f;
    for (let i = 0; i < baris; i++) {
      const x = data[y * baris + i], a = i >= k ? data[y * baris + i - k] : 0, b = y ? data[(y - 1) * baris + i] : 0, c = y && i >= k ? data[(y - 1) * baris + i - k] : 0;
      mentah[y * (baris + 1) + 1 + i] = (x - [0, a, b, (a + b) >> 1, paethRef(a, b, c)][f]) & 255;
    }
  }
  const z = deflateSync(mentah), ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = bit; ihdr[9] = jenis; ihdr[12] = interlace;
  const idat = []; for (let i = 0; i < z.length; i += pecah || z.length) idat.push(potongan('IDAT', z.subarray(i, i + (pecah || z.length))));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), tanpaIhdr ? Buffer.alloc(0) : potongan('IHDR', ihdr), palet ? potongan('PLTE', Buffer.from(palet)) : Buffer.alloc(0),
    trns ? potongan('tRNS', Buffer.from(trns)) : Buffer.alloc(0), ...(tanpaIdat ? [] : idat), potongan('IEND')]);
}
/* gambar RGBA dari fungsi (x, y) -> [r, g, b, a?]; kembalikan { w, h, px } dan pembungkus ke PNG */
const gambar = (w, h, fn) => { const px = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a = 255] = fn(x, y); px.set([r, g, b, a], (y * w + x) * 4); } return { w, h, px }; };
const keRgba = g => png({ w: g.w, h: g.h, jenis: 6, data: g.px, filter: 4 });
const acak = (n, seed = 7) => Uint8Array.from({ length: n }, () => (seed = (seed * 1103515245 + 12345) >>> 0) >>> 24);   // deterministik

/* ---------- pembaca PNG: tiap filter, tiap jenis warna ---------- */
test('bacaPng: RGBA, tiap filter 0-4 dan campuran per baris kembali persis (baris pertama dan kolom pertama ikut)', () => {
  const w = 9, h = 7, data = acak(w * h * 4);
  for (const filter of [0, 1, 2, 3, 4, [0, 1, 2, 3, 4, 2, 1]]) {
    const hasil = nv.bacaPng(png({ w, h, jenis: 6, data, filter }));
    assert.deepEqual([hasil.w, hasil.h], [w, h]);
    assert.deepEqual(hasil.px, data, `filter ${JSON.stringify(filter)}`);
  }
});

test('bacaPng: RGB (jenis 2) tiap filter; alfa 255', () => {
  const w = 8, h = 6, data = acak(w * h * 3, 11);
  for (const filter of [0, 1, 2, 3, 4]) {
    const { px } = nv.bacaPng(png({ w, h, jenis: 2, data, filter }));
    for (let i = 0; i < w * h; i++) assert.deepEqual([...px.subarray(i * 4, i * 4 + 4)], [data[i * 3], data[i * 3 + 1], data[i * 3 + 2], 255], `filter ${filter} piksel ${i}`);
  }
});

test('bacaPng: abu-abu (jenis 0) dan abu-abu + alfa (jenis 4) tiap filter', () => {
  const w = 7, h = 5, abu = acak(w * h, 3), abuAlfa = acak(w * h * 2, 5);
  for (const filter of [0, 1, 2, 3, 4]) {
    const a = nv.bacaPng(png({ w, h, jenis: 0, data: abu, filter })).px, b = nv.bacaPng(png({ w, h, jenis: 4, data: abuAlfa, filter })).px;
    for (let i = 0; i < w * h; i++) {
      assert.deepEqual([...a.subarray(i * 4, i * 4 + 4)], [abu[i], abu[i], abu[i], 255]);
      assert.deepEqual([...b.subarray(i * 4, i * 4 + 4)], [abuAlfa[i * 2], abuAlfa[i * 2], abuAlfa[i * 2], abuAlfa[i * 2 + 1]]);
    }
  }
});

test('bacaPng: berpalet (jenis 3) memakai PLTE, alfa dari tRNS (indeks di luar tRNS = buram)', () => {
  const palet = [255, 0, 0, 0, 255, 0, 0, 0, 255], idx = [0, 1, 2, 2, 1, 0, 1, 1, 2, 0, 0, 2], w = 4, h = 3;
  for (const filter of [0, 1, 2, 3, 4]) {
    const { px } = nv.bacaPng(png({ w, h, jenis: 3, data: Uint8Array.from(idx), filter, palet, trns: [10, 128] }));
    idx.forEach((v, i) => assert.deepEqual([...px.subarray(i * 4, i * 4 + 4)], [palet[v * 3], palet[v * 3 + 1], palet[v * 3 + 2], [10, 128, 255][v]], `filter ${filter} piksel ${i}`));
  }
});

test('bacaPng: tRNS abu-abu dan RGB = kunci warna (piksel yang sama jadi transparan, lainnya buram)', () => {
  const a = nv.bacaPng(png({ w: 4, h: 1, jenis: 0, data: Uint8Array.from([10, 128, 128, 200]), trns: [0, 128] })).px;
  assert.deepEqual([3, 7, 11, 15].map(i => a[i]), [255, 0, 0, 255]);
  const b = nv.bacaPng(png({ w: 4, h: 1, jenis: 2, data: Uint8Array.from([1, 2, 3, 9, 9, 9, 1, 2, 3, 1, 2, 4]), trns: [0, 1, 0, 2, 0, 3] })).px;
  assert.deepEqual([3, 7, 11, 15].map(i => b[i]), [0, 255, 0, 255]);
});

test('bacaPng: IDAT terpecah jadi banyak potongan dibaca utuh', () => {
  const data = acak(40 * 30 * 4, 9), hasil = nv.bacaPng(png({ w: 40, h: 30, data, filter: 4, pecah: 37 }));
  assert.deepEqual(hasil.px, data);
});

test('bacaPng: PNG rusak atau tak didukung = GalatNilai dengan pesan yang menyebut sebabnya', () => {
  const ok = png({ w: 4, h: 4, data: acak(64), filter: 0 }), galat = (buf, re) => assert.throws(() => nv.bacaPng(buf), e => e instanceof nv.GalatNilai && re.test(e.message), String(re));
  galat(Buffer.from('bukan png sama sekali, hanya teks'), /bukan PNG/);
  galat(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0]), /JPEG/);
  galat(png({ w: 4, h: 4, data: acak(64), bit: 16 }), /16-bit tidak didukung/);
  galat(png({ w: 4, h: 4, data: acak(64), interlace: 1 }), /berjalin|Adam7/);
  galat(ok.subarray(0, ok.length - 40), /terpotong/);
  galat(png({ w: 4, h: 4, data: acak(64), tanpaIhdr: true }), /tanpa IHDR/);
  galat(png({ w: 4, h: 4, data: acak(64), tanpaIdat: true }), /tanpa data gambar/);
  galat(png({ w: 4, h: 4, jenis: 3, data: acak(16) }), /PLTE/);
  galat(png({ w: 4, h: 4, jenis: 3, data: Uint8Array.from({ length: 16 }, () => 5), palet: [1, 2, 3, 4, 5, 6] }), /indeks palet 5/);
  galat(png({ w: 0, h: 4, data: [] }), /tidak wajar/);
  const rusakZlib = Buffer.from(ok); rusakZlib.fill(0x55, 41, 52); galat(rusakZlib, /rusak/);                         // bagian dalam IDAT dirusak
  const filterGila = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 0;
  const mentah = deflateSync(Buffer.from([9, 1, 2, 0, 3, 4]));                                                          // filter 9 tidak ada
  galat(Buffer.concat([filterGila, potongan('IHDR', ihdr), potongan('IDAT', mentah), potongan('IEND')]), /filter PNG 9/);
  const pendek = Buffer.concat([filterGila, potongan('IHDR', ihdr), potongan('IDAT', deflateSync(Buffer.from([0, 1, 2]))), potongan('IEND')]);
  galat(pendek, /seharusnya 6/);                                                                                        // data lebih pendek dari IHDR
  const panjang = Buffer.concat([filterGila, potongan('IHDR', ihdr), potongan('IDAT', deflateSync(Buffer.alloc(5000))), potongan('IEND')]);
  galat(panjang, /lebih besar dari 6 bita/);                                                                            // data lebih panjang dari IHDR (juga PNG bom)
});

/* ---------- warna ---------- */
test('oklab: nilai acuan Ottosson (putih 1, hitam 0, merah/hijau/biru primer)', () => {
  const dekat = (a, b) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 2e-3, `${a.map(x => x.toFixed(4))} != ${b}`));
  dekat(nv.oklab(255, 255, 255), [1, 0, 0]); dekat(nv.oklab(0, 0, 0), [0, 0, 0]);
  dekat(nv.oklab(255, 0, 0), [.628, .2249, .1258]); dekat(nv.oklab(0, 255, 0), [.8664, -.2339, .1795]); dekat(nv.oklab(0, 0, 255), [.452, -.0325, -.3115]);
});

test('kisi: rata-rata blok (blok tepi lebih kecil), alfa dilebur di atas hitam', () => {
  const g = nv.kisi(gambar(5, 5, (x, y) => [x * 20 + y, 0, 0]), 2);                                                      // 5 px, ukuran 2 -> f = 3 -> kisi 2 x 2
  assert.deepEqual([g.f, g.cw, g.ch], [3, 2, 2]);
  const rata = (xs, ys) => { let s = 0, n = 0; for (const y of ys) for (const x of xs) { s += x * 20 + y; n++; } return s / n; };
  assert.ok(Math.abs(g.rgb[0] - rata([0, 1, 2], [0, 1, 2])) < 1e-4);
  assert.ok(Math.abs(g.rgb[(1 * 2 + 1) * 3] - rata([3, 4], [3, 4])) < 1e-4, 'blok tepi hanya memuat piksel yang ada');
  const setengah = nv.kisi(gambar(4, 4, () => [255, 255, 255, 128]));
  assert.ok(Math.abs(setengah.rgb[0] - 128) < 1, 'putih 50 % alfa di atas hitam = abu-abu 128');
  assert.equal(nv.kisi(gambar(4, 4, () => [255, 255, 255, 0])).lab[0], 0, 'transparan = hitam');
});

/* ---------- ukuran 1: luminans ---------- */
const abu = (w, h, v) => gambar(w, h, () => [v, v, v]);
test('luminans: abu-abu rata = flat (rentang 0, satu warna, tengah = tepi) dan hasil peringatan', () => {
  const r = nv.nilaiBingkai(abu(160, 90, 128));
  assert.equal(r.luminans.rentang, 0); assert.equal(r.luminans.p5, r.luminans.p95);
  assert.ok(Math.abs(r.luminans.p50 - 60) < .5, `L abu 128 = ${r.luminans.p50}`);
  assert.equal(r.luminans.status, 'peringatan'); assert.equal(r.kontras.status, 'peringatan'); assert.equal(r.kontras.mode, 'tengah');
  assert.equal(r.warna.jumlah, 1); assert.equal(r.warna.status, 'peringatan'); assert.equal(r.status, 'peringatan');
});

test('luminans: gradien kuat (hitam ke putih) berentang lebar, bukan flat; p5 < p50 < p95', () => {
  const r = nv.nilaiBingkai(gambar(256, 64, x => [x, x, x]));
  assert.ok(r.luminans.rentang > 70, `rentang ${r.luminans.rentang}`); assert.equal(r.luminans.status, 'ok');
  assert.ok(r.luminans.p5 < r.luminans.p50 && r.luminans.p50 < r.luminans.p95);
});

test('luminans: ambang rentang adalah batas tegas (di bawah = flat, di atas = ok)', () => {
  const dua = (a, b) => nv.nilaiBingkai(gambar(100, 100, x => x < 50 ? [a, a, a] : [b, b, b]));
  const sempit = dua(100, 112), lebar = dua(60, 200);                                                                    // L kira-kira 46 vs 51, dan 39 vs 75
  assert.ok(sempit.luminans.rentang < nv.AMBANG.rentang && sempit.luminans.status === 'peringatan', `sempit ${sempit.luminans.rentang}`);
  assert.ok(lebar.luminans.rentang >= nv.AMBANG.rentang && lebar.luminans.status === 'ok', `lebar ${lebar.luminans.rentang}`);
});

test('luminans: p5 dan p95 tidak menghitung 5 % piksel paling ekstrem (bintik gelap dan terang sebesar 5 % tidak melebarkan rentang)', () => {
  const ekstrem = persen => nv.nilaiBingkai(gambar(100, 100, (x, y) => y < persen ? [0, 0, 0] : y >= 100 - persen ? [255, 255, 255] : [128, 128, 128])).luminans;
  const lima = ekstrem(5), enam = ekstrem(6);
  assert.equal(lima.rentang, 0, JSON.stringify(lima)); assert.equal(lima.status, 'peringatan');
  assert.ok(enam.rentang > 80 && enam.status === 'ok', JSON.stringify(enam));
});

/* ---------- ukuran 4: warna dominan ---------- */
test('warna dominan: dua warna datar = tepat dua; tambalan 3 % tidak dihitung, 8 % dihitung (aturan 5 %)', () => {
  const dasar = (tinggiHijau) => nv.nilaiBingkai(gambar(100, 100, (x, y) => y < tinggiHijau ? [30, 200, 30] : x < 50 ? [200, 30, 30] : [30, 30, 200]));
  const dua = dasar(0), tiga = dasar(3), empat = dasar(8);
  assert.equal(dua.warna.jumlah, 2); assert.equal(dua.warna.status, 'ok');
  assert.deepEqual(dua.warna.dominan.map(d => d.hex).sort(), ['#1e1ec8', '#c81e1e']);
  assert.equal(tiga.warna.jumlah, 2, 'tambalan 3 % di bawah ambang');
  assert.equal(empat.warna.jumlah, 3, 'tambalan 8 % ikut dihitung');
  assert.ok(dua.warna.dominan.every(d => d.persen >= nv.AMBANG.persen));
});

test('warna dominan: nada yang berdekatan (gradasi lembut) dilebur jadi satu warna, bukan dihitung per kotak histogram', () => {
  const r = nv.nilaiBingkai(gambar(100, 100, x => { const v = [100, 108, 116, 124][Math.floor(x / 25)]; return [v, v, v]; }));          // L 50,3 / 53,1 / 55,9 / 58,6: tiga kotak histogram, satu warna
  assert.equal(r.warna.jumlah, 1, JSON.stringify(r.warna)); assert.ok(r.warna.dominan[0].persen > 99);
});

test('warna dominan: terlalu banyak warna (pelangi) = palet tidak serempak', () => {
  const warna = [[220, 30, 30], [230, 140, 20], [220, 220, 30], [30, 180, 60], [30, 190, 200], [40, 60, 220], [150, 40, 200], [240, 120, 180]];
  const r = nv.nilaiBingkai(gambar(160, 40, x => warna[Math.floor(x / 20)]));
  assert.ok(r.warna.jumlah > nv.AMBANG.warnaMaks, `jumlah ${r.warna.jumlah}`); assert.equal(r.warna.status, 'peringatan');
  assert.match(nv.peringatan([{ berkas: 'x.png', ...r }]).join('\n'), /warna dominan lebih dari 6/);
});

/* ---------- ukuran 3: titik terang dekat sumber ---------- */
const bintik = () => gambar(200, 200, (x, y) => (x - 150) ** 2 + (y - 60) ** 2 <= 144 ? [255, 255, 255] : [40, 40, 40]);     // cakram putih r 12 di (150, 60)
test('sumber: titik terang tepat di sumber = ok; sumber yang dideklarasikan jauh dari titik terang = peringatan', () => {
  const r = nv.nilaiBingkai(bintik(), { sumber: [{ x: 150, y: 60 }, { x: 40, y: 150 }, { x: 148, y: 64, r: 6 }] });
  const [dekat, jauh, kecil] = r.sumber;
  assert.equal(dekat.status, 'ok'); assert.ok(dekat.selisih > 55 && dekat.puncak > 95, JSON.stringify(dekat));
  assert.equal(jauh.status, 'peringatan'); assert.ok(Math.abs(jauh.selisih) < 1, JSON.stringify(jauh));
  assert.equal(kecil.status, 'ok', 'jari-jari kecil tetap menjangkau cakram');
  assert.equal(r.status, 'peringatan', 'satu sumber gagal = bingkai peringatan');
  assert.equal(nv.nilaiBingkai(bintik(), { sumber: [{ x: 150, y: 60 }] }).sumber[0].status, 'ok');
});

test('sumber: di luar bingkai = peringatan bercatatan; tanpa --sumber tak ada penilaian sumber', () => {
  const r = nv.nilaiBingkai(bintik(), { sumber: [{ x: 500, y: 10 }, { x: -3, y: 10 }] });
  assert.ok(r.sumber.every(s => s.status === 'peringatan' && /di luar bingkai 200x200/.test(s.catatan)));
  assert.match(nv.peringatan([{ berkas: 'x.png', ...r }]).join('\n'), /sumber di luar bingkai/);
  assert.deepEqual(nv.nilaiBingkai(bintik()).sumber, []);
});

test('sumber: puncak dibanding median bingkai, bukan nilai mutlak (bingkai terang: sumber sulit menonjol)', () => {
  const terang = nv.nilaiBingkai(gambar(100, 100, (x, y) => (x - 50) ** 2 + (y - 50) ** 2 <= 36 ? [255, 255, 255] : [235, 235, 235]), { sumber: [{ x: 50, y: 50 }] });
  assert.ok(terang.sumber[0].selisih < nv.AMBANG.sumber && terang.sumber[0].status === 'peringatan', JSON.stringify(terang.sumber[0]));
});

/* ---------- ukuran 2: kontras subjek / latar ---------- */
const sosok = ({ rim, latar = [60, 60, 70], badan = [58, 58, 68] }) => gambar(240, 160, (x, y) => {                       // siluet 40 x 100 di (100, 30)
  const dalam = x >= 100 && x < 140 && y >= 30 && y < 130, inti = x >= 103 && x < 137 && y >= 33 && y < 127;
  return dalam ? (rim && !inti ? [220, 170, 90] : badan) : latar;
});
const KOTAK = [90, 20, 60, 120];
test('kontras: siluet gelap tanpa rim menyatu dengan latar; dengan rim tipis (sorot) lolos walau rata-ratanya nyaris sama', () => {
  const polos = nv.nilaiBingkai(sosok({ rim: false }), { subjek: KOTAK }).kontras, rim = nv.nilaiBingkai(sosok({ rim: true }), { subjek: KOTAK }).kontras;
  assert.equal(polos.mode, 'subjek'); assert.ok(polos.nilai < nv.AMBANG.kontras && polos.status === 'peringatan', JSON.stringify(polos));
  assert.ok(rim.sorot > 25 && rim.status === 'ok', JSON.stringify(rim));
  assert.ok(rim.dL < nv.AMBANG.kontras, `selisih rata-rata saja gagal (${rim.dL}); itu alasan sorot ada`);
});

test('kontras: subjek jauh lebih gelap atau lebih terang dari latar lolos lewat selisih rata-rata', () => {
  const gelap = nv.nilaiBingkai(sosok({ rim: false, latar: [230, 230, 230], badan: [20, 20, 20] }), { subjek: KOTAK }).kontras;
  const terang = nv.nilaiBingkai(sosok({ rim: false, latar: [20, 20, 20], badan: [230, 230, 230] }), { subjek: KOTAK }).kontras;
  assert.ok(gelap.dL > 30 && gelap.status === 'ok' && terang.dL > 30 && terang.status === 'ok', JSON.stringify([gelap, terang]));
});

test('kontras: tanpa kotak = tengah (bobot Gauss) vs pita tepi; vignette lolos, bingkai sama terang tidak', () => {
  const vignette = nv.nilaiBingkai(gambar(160, 90, (x, y) => { const d = Math.hypot((x - 80) / 80, (y - 45) / 45); const v = Math.round(220 - 150 * Math.min(1, d * d)); return [v, v, v]; })).kontras;
  assert.equal(vignette.mode, 'tengah'); assert.ok(vignette.a > vignette.b && vignette.status === 'ok', JSON.stringify(vignette));
  assert.equal(nv.nilaiBingkai(abu(160, 90, 90)).kontras.status, 'peringatan');
});

test('kontras: kotak subjek di luar bingkai atau memenuhi bingkai = GalatNilai, bukan angka palsu', () => {
  const g = abu(100, 100, 100), galat = (kotak, re) => assert.throws(() => nv.nilaiBingkai(g, { subjek: kotak }), e => e instanceof nv.GalatNilai && re.test(e.message));
  galat([500, 500, 10, 10], /di luar bingkai 100x100/); galat([-50, 10, 20, 20], /di luar bingkai/); galat([0, 0, 100, 100], /memenuhi bingkai/);
  assert.ok(nv.nilaiBingkai(g, { subjek: [-10, 20, 40, 40] }).kontras, 'sebagian di luar dipotong, bukan galat');
});

test('nilaiBingkai: deterministik, dan bingkai 1080p (kisi 4x4) dinilai tanpa memakai kisi sebagai bingkai', () => {
  const g = abu(1920, 1080, 77), a = nv.nilaiBingkai(g, { sumber: [{ x: 512, y: 598 }] }), b = nv.nilaiBingkai(g, { sumber: [{ x: 512, y: 598 }] });
  assert.deepEqual(a, b); assert.equal(a.lebar, 1920); assert.equal(a.sumber[0].r, 76);                                   // 7 % dari 1080
  assert.equal(nv.kisi(g).f, 4);
});

/* ---------- argumen ---------- */
test('bacaSumber: JSON, kunci tanpa kutip (PowerShell 5.1), objek tunggal, berkas; yang salah = GalatNilai', () => {
  assert.deepEqual(nv.bacaSumber('[{"x":512,"y":598},{"x":778,"y":598,"r":90}]'), [{ x: 512, y: 598 }, { x: 778, y: 598, r: 90 }]);
  assert.deepEqual(nv.bacaSumber('[{x:512,y:598},{x:778, y:598, r:90}]'), [{ x: 512, y: 598 }, { x: 778, y: 598, r: 90 }]);
  assert.deepEqual(nv.bacaSumber('{"x":1,"y":2}'), [{ x: 1, y: 2 }]);
  const d = folder(); writeFileSync(join(d, 's.json'), '\uFEFF[{"x":5,"y":6}]'); assert.deepEqual(nv.bacaSumber(join(d, 's.json')), [{ x: 5, y: 6 }]);
  for (const salah of ['[{"x":1}]', '[{"x":"a","y":2}]', '[{"x":1,"y":2,"r":0}]', '[{', join(d, 'tidak-ada.json')]) assert.throws(() => nv.bacaSumber(salah), nv.GalatNilai, salah);
});

test('bacaSubjek: x,y,w,h dengan koma atau spasi; w dan h harus positif', () => {
  assert.deepEqual(nv.bacaSubjek('1230,205,540,845'), [1230, 205, 540, 845]); assert.deepEqual(nv.bacaSubjek('1 2 3 4'), [1, 2, 3, 4]);
  for (const salah of ['1,2,3', '1,2,0,4', '1,2,3,x', '']) assert.throws(() => nv.bacaSubjek(salah), nv.GalatNilai, salah);
});

/* ---------- CLI ---------- */
const pakai = (...a) => spawnSync(process.execPath, [SKRIP, ...a], { encoding: 'utf8' });
const bingkaiBagus = () => gambar(320, 180, (x, y) => (x - 160) ** 2 + (y - 90) ** 2 <= 2500 ? [255, 190, 110] : [20, 12, 28]);        // gelap dengan pendar hangat di tengah
test('CLI: folder (urut angka, kontak.png dilewati), kode keluar 0 untuk bingkai yang lulus, JSON valid, --keluar menulis berkas', () => {
  const d = folder();
  for (const n of ['t11_00', 't3_00', 't7_50']) writeFileSync(join(d, `${n}.png`), keRgba(bingkaiBagus()));
  writeFileSync(join(d, 'kontak.png'), keRgba(abu(64, 64, 128)));                                                       // lembar kontak snap.mjs: harus dilewati
  writeFileSync(join(d, 'catatan.txt'), 'bukan gambar');
  const keluar = join(d, 'nilai.json'), r = pakai(d, '--sumber', '[{x:160,y:90}]', '--keluar', keluar);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /3 bingkai: 3 ok, 0 peringatan/); assert.doesNotMatch(r.stdout, /kontak/);
  assert.ok(r.stdout.indexOf('t3_00.png') < r.stdout.indexOf('t7_50.png') && r.stdout.indexOf('t7_50.png') < r.stdout.indexOf('t11_00.png'), 'urut angka: t3 < t7_50 < t11');
  const j = JSON.parse(readFileSync(keluar, 'utf8'));
  assert.deepEqual(j.bingkai.map(b => b.berkas.split(/[\\/]/).pop()), ['t3_00.png', 't7_50.png', 't11_00.png']);
  assert.deepEqual(j.ringkas, { bingkai: 3, ok: 3, peringatan: 0 }); assert.deepEqual(j.opsi.sumber, [{ x: 160, y: 90 }]); assert.equal(j.ambang.rentang, nv.AMBANG.rentang);
  assert.equal(j.bingkai[0].sumber[0].status, 'ok');
});

test('CLI: satu bingkai flat = kode keluar 1, tabel berbahasa Indonesia dengan ok/peringatan per ukuran dan saran', () => {
  const d = folder(), f = join(d, 'datar.png'); writeFileSync(f, keRgba(abu(200, 120, 140)));
  const r = pakai(f, '--sumber', '[{"x":100,"y":60}]');
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /bingkai\s+p5\/p50\/p95\s+rentang\s+kontras\s+titik terang\s+warna\s+hasil/);
  assert.match(r.stdout, /datar\.png\s+\d+\/\d+\/\d+\s+0 peringatan\s+tengah 0 peringatan\s+\+0 peringatan\s+1 peringatan/);
  assert.match(r.stdout, /flat: rentang luminans p5-p95 < 28/); assert.match(r.stdout, /saran: beri sorot dan bayangan/);
  assert.match(r.stdout, /sumber tidak bersinar/); assert.match(r.stdout, /0 ok, 1 peringatan/);
});

test('CLI: --json hanya JSON; subjek dan sumber dinilai bersama; dua folder memberi nama folder/berkas', () => {
  const a = folder(), b = folder(); writeFileSync(join(a, 's.png'), keRgba(sosok({ rim: true }))); writeFileSync(join(b, 's.png'), keRgba(sosok({ rim: false })));
  const j = pakai(a, '--subjek=90,20,60,120', '--json');
  assert.ok([0, 1].includes(j.status)); const rep = JSON.parse(j.stdout);
  assert.equal(rep.bingkai[0].kontras.mode, 'subjek'); assert.deepEqual(rep.opsi.subjek, [90, 20, 60, 120]);
  const dua = pakai(a, b, '--subjek', '90,20,60,120');
  assert.match(dua.stdout, new RegExp(`${a.split(/[\\/]/).pop().replace(/[-.]/g, '\\$&')}/s\\.png`)); assert.equal(dua.status, 1, 'siluet tanpa rim di folder kedua');
});

test('CLI: galat = kode keluar 2 dengan pesan "galat:" (tanpa jejak tumpukan): tanpa masukan, berkas hilang, PNG rusak, opsi salah', () => {
  const d = folder(); writeFileSync(join(d, 'rusak.png'), png({ w: 8, h: 8, data: acak(256), bit: 16 })); writeFileSync(join(d, 'kosong.txt'), 'x'); mkdirSync(join(d, 'sepi'));
  const kasus = [[[], /pakai:/], [[join(d, 'tidak-ada.png')], /tidak ditemukan/], [[join(d, 'rusak.png')], /rusak\.png: PNG 16-bit tidak didukung/], [[join(d, 'sepi')], /tidak ada PNG di folder/],
    [[d, '--sumber', 'bukan json'], /--sumber/], [['x.png', '--subjek', '1,2'], /--subjek/], [['x.png', '--aneh'], /opsi tidak dikenal: --aneh/], [['x.png', '--sumber'], /butuh nilai/]];
  for (const [args, re] of kasus) { const r = pakai(...args); assert.equal(r.status, 2, `${args.join(' ')}: ${r.stdout}${r.stderr}`); assert.match(r.stderr, re); assert.doesNotMatch(r.stderr, /\n\s+at /); }
});

test('CLI: --help mencetak komentar kepala dan keluar 0 tanpa membaca apa pun', () => {
  const r = pakai('--help'), pendek = pakai('-h');
  assert.equal(r.status, 0); assert.match(r.stdout, /NILAI-VISUAL/); assert.match(r.stdout, /--sumber/); assert.match(r.stdout, /Kode keluar: 0 semua ok/);
  assert.equal(pendek.stdout, r.stdout);
  const A = nv.AMBANG;
  assert.ok(r.stdout.includes(`rentang ${A.rentang}, kontras ${A.kontras}, sumber +${A.sumber}, warna ${A.warnaMin}-${A.warnaMaks} (>= ${A.persen} % bingkai)`), 'ambang di kepala berkas harus sama dengan AMBANG');
});

test('jalankan: galat tak terduga = kode 2 (bukan 1, yang berarti peringatan) dan menyebut bahwa itu bug alat', () => {
  const d = folder(), f = join(d, 'a.png'), pesan = []; writeFileSync(f, keRgba(abu(20, 20, 100)));
  const kode = nv.jalankan([f], { log: () => { throw new TypeError('uji'); }, err: m => pesan.push(m) });
  assert.equal(kode, 2); assert.match(pesan.join(' '), /galat tak terduga.*TypeError: uji/s);
});
