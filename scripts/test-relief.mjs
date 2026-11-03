#!/usr/bin/env node
/* UJI RELIEF HIDUP: matematika murni src/runtime/relief-hidup.js (reliefHidup.mat) + data pahatan pustaka.dindingRelief, tanpa
   browser dan dependensi. Blok atmosfer + cahaya-2d + pustaka + relief-hidup yang sungguhan dijalankan lewat new Function (seperti
   test-pustaka). Yang diuji: profil tepi, kabur kotak, jarak ke tepi, peta normal + AO dari larik tinggi, penerapan lapis
   (timbul/rata/gurat), redaman lampu, pose bagian hidup (fungsi murni t), ubin butir, determinisme + struktur + penolakan data
   dinding. Rasterisasi Path2D dan shader diuji di browser (RELIEF_UJI lewat test-starters).
   Pakai: node --test scripts/test-relief.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const baca = n => readFileSync(new URL(`../src/runtime/${n}.js`, import.meta.url), 'utf8');
const SRC = ['atmosfer', 'cahaya-2d', 'pustaka', 'relief-hidup'].map(baca).join('\n');
const muat = () => new Function('tl', 'W', 'H', 'window', 'document', 'HTMLElement', 'Path2D', '$',
  SRC + ';return {pustaka,reliefHidup,SINAR}')({ time: () => 0, eventCallback: () => null }, 1920, 1080, {}, {}, class {}, class {}, () => null);
const { pustaka, reliefHidup } = muat(), M = reliefHidup.mat, D = 56;
const dekat = (a, b, e, pesan) => assert.ok(Math.abs(a - b) <= e, `${pesan}: ${a} ≠ ${b} (±${e})`);

test('profil tepi: 0 di tepi, 1 sesudah r, naik monoton, dijepit di luar 0..1', () => {
  assert.equal(M.profil(0), 0); assert.equal(M.profil(1), 1); assert.equal(M.profil(2), 1); assert.equal(M.profil(-1), 0);
  dekat(M.profil(.5), Math.sqrt(.75), 1e-12, 'seperempat lingkaran di u ,5');
  for (let u = 0; u < 1; u += .05) assert.ok(M.profil(u + .05) >= M.profil(u), `monoton di ${u}`);
});

test('kabur kotak: konstanta tetap, impuls menyebar rata selebar (2r+1)², jumlah terjaga', () => {
  const w = 21, h = 17, r = 3, a = new Float32Array(w * h).fill(.4);
  assert.ok(M.kabur(a, w, h, r).every(v => Math.abs(v - .4) < 1e-6), 'nilai tetap berubah');
  const b = new Float32Array(w * h); b[8 * w + 10] = 1; const k = M.kabur(b, w, h, r);
  dekat(k[8 * w + 10], 1 / 49, 1e-6, 'pusat'); dekat(k[(8 + 3) * w + 13], 1 / 49, 1e-6, 'pojok kotak'); assert.equal(k[(8 + 4) * w + 10], 0, 'di luar kotak');
  dekat(k.reduce((s, v) => s + v, 0), 1, 1e-5, 'jumlah');
});

test('jarak ke tepi: chamfer 1/√2 — tepi 1, pusat bujur sangkar 7×7 = 4, luar 0, tanpa luar = 1e6', () => {
  const w = 9, c = new Float32Array(81);
  for (let y = 1; y < 8; y++) for (let x = 1; x < 8; x++) c[y * w + x] = 1;
  const d = M.jarak(c, w, w);
  assert.equal(d[0], 0); assert.equal(d[w + 1], 1); assert.equal(d[w + 4], 1); assert.equal(d[4 * w + 4], 4);
  dekat(d[2 * w + 2], 2, 1e-6, 'diagonal dalam');
  assert.equal(M.jarak(new Float32Array(4).fill(1), 2, 2)[0], 1e6);
});

test('peta normal + AO dari larik tinggi: datar, lereng x, lereng y, cekungan, panjang normal', () => {
  const w = 40, h = 30, dat = new Float32Array(w * h).fill(.5), o = M.panggang(dat, w, h, D), px = (o, x, y) => [...o.slice((y * w + x) * 4, (y * w + x) * 4 + 4)];
  assert.deepEqual(px(o, 20, 15), [128, 128, 255, 128], 'datar = (0,0,1), AO terbuka, tinggi ,5');
  const lx = new Float32Array(w * h), ly = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { lx[y * w + x] = x / D; ly[y * w + x] = y / D; }
  // lereng 1 px kedalaman per px: n = (−1, 0, 1)/√2 → byte (1 − √½)·127,5 = 37
  const a = px(M.panggang(lx, w, h, D), 20, 15), b = px(M.panggang(ly, w, h, D), 20, 15);
  assert.deepEqual(a.slice(0, 2), [37, 128], 'lereng naik ke kanan → normal condong ke kiri');
  assert.deepEqual(b.slice(0, 2), [128, 37], 'lereng naik ke bawah → normal condong ke atas');
  for (const p of [a, b]) { const nx = p[0] / 127.5 - 1, ny = p[1] / 127.5 - 1; dekat(Math.sqrt(1 - nx * nx - ny * ny), Math.SQRT1_2, .01, 'nz terurai'); }
  const pit = new Float32Array(w * h).fill(.6); for (let y = 12; y < 18; y++) for (let x = 17; x < 23; x++) pit[y * w + x] = .3;
  const c = M.panggang(pit, w, h, D);
  assert.ok(px(c, 20, 15)[2] < 120, `dasar cekungan gelap (AO ${px(c, 20, 15)[2]})`); assert.equal(px(c, 4, 4)[2], 255, 'bidang jauh dari cekungan terbuka');
  const bukit = new Float32Array(w * h).fill(.3); for (let y = 12; y < 18; y++) for (let x = 17; x < 23; x++) bukit[y * w + x] = .6;
  assert.equal(px(M.panggang(bukit, w, h, D), 20, 15)[2], 255, 'puncak tidak tertutup');
});

test('lapis: timbul = maks (tak menurunkan yang lebih tinggi), rata = set, gurat = kurangi; tepi membulat; cakupan', () => {
  const w = 12, h = 12, c = new Float32Array(w * h), cv = new Float32Array(w * h);
  for (let y = 2; y < 10; y++) for (let x = 2; x < 10; x++) c[y * w + x] = 1;
  const d = M.jarak(c, w, h), it = (jenis, z, r = 0) => ({ jenis, z, r });
  let t = new Float32Array(w * h).fill(.1); M.terap(t, cv, w, it('timbul', .8), D, c, null, 0, 0, w, h);
  dekat(t[6 * w + 6], .8, 1e-6, 'timbul tanpa r'); dekat(t[0], .1, 1e-6, 'luar tak tersentuh'); assert.equal(cv[6 * w + 6], 1, 'cakupan batu');
  t = new Float32Array(w * h).fill(.9); M.terap(t, null, w, it('timbul', .8), D, c, null, 0, 0, w, h); dekat(t[6 * w + 6], .9, 1e-6, 'timbul tidak menurunkan');
  t = new Float32Array(w * h).fill(.9); M.terap(t, null, w, it('rata', .2), D, c, null, 0, 0, w, h); dekat(t[6 * w + 6], .2, 1e-6, 'rata menyetel');
  t = new Float32Array(w * h).fill(.5); M.terap(t, null, w, it('gurat', .05), D, c, null, 0, 0, w, h); dekat(t[6 * w + 6], .45, 1e-6, 'gurat mengurangi');
  t = new Float32Array(w * h).fill(0); M.terap(t, null, w, it('timbul', .8, 3), D, c, d, 0, 0, w, h);
  assert.ok(t[2 * w + 6] < t[3 * w + 6] && t[3 * w + 6] < t[6 * w + 6], 'tepi membulat naik ke dalam'); dekat(t[6 * w + 6], .8, 1e-6, 'puncak = z sesudah r');
  t = new Float32Array(w * h).fill(.9); M.terap(t, null, w, it('rata', .1, 3), D, c, d, 0, 0, w, h);
  assert.ok(t[2 * w + 6] > t[6 * w + 6] + .3, 'rata: tepi cembung (masih tinggi di tepi), dalam = z'); dekat(t[6 * w + 6], .1, 1e-6, 'dalam rata');
});

test('redaman lampu: 1 di sumber, ½ di jangkau, ,1 di 3× jangkau, turun monoton', () => {
  assert.equal(M.redam(0, 900), 1); assert.equal(M.redam(900, 900), .5); dekat(M.redam(2700, 900), .1, 1e-12, '3× jangkau');
  for (let d = 0; d < 3000; d += 100) assert.ok(M.redam(d + 100, 900) < M.redam(d, 900));
});

test('pose bagian hidup: fungsi murni t — poros tetap, sudut ayun, kembang, geser, alir berperiode', () => {
  const ap = (m, u, v) => [m[0] * u + m[2] * v + m[4], m[1] * u + m[3] * v + m[5]];
  assert.deepEqual(M.pose({ poros: [5, 5] }, 3, 10, 20), [1, 0, -0, 1, 10, 20], 'tanpa gerak = geser ke (ox, oy)');
  const g = { poros: [110, 60], ayun: [30, 2, 0] };
  for (const t of [0, .3, .5, 1.7]) { const p = ap(M.pose(g, t, 100, 50), 10, 10); dekat(p[0], 110, 1e-9, `poros x t ${t}`); dekat(p[1], 60, 1e-9, `poros y t ${t}`); }
  const m = M.pose(g, .5, 100, 50); dekat(Math.atan2(m[1], m[0]) * 180 / Math.PI, 30, 1e-9, 'ayun puncak di t = periode/4');
  assert.deepEqual(M.pose(g, .5, 100, 50), M.pose(g, .5, 100, 50), 'deterministik');
  const k = M.pose({ poros: [0, 0], kembang: [.1, 4, 0] }, 1); dekat(k[0], 1.1, 1e-12, 'kembang skala x'); dekat(k[3], 1, 1e-12, 'kembang tak menyentuh y');
  const s = M.pose({ poros: [0, 0], geser: [40, 3, 8, 0] }, 2); dekat(s[4], 40, 1e-9, 'geser x puncak'); dekat(s[5], 3, 1e-9, 'geser y puncak');
  const a = { poros: [0, 0], alir: [-7, 64] };
  for (let t = 0; t < 30; t += .7) { const x = M.pose(a, t)[4]; assert.ok(x > -64 && x <= 0, `alir dalam satu periode (t ${t}: ${x})`); }
  dekat(M.pose(a, 3)[4], M.pose(a, 3 + 64 / 7)[4], 1e-9, 'alir berulang tiap periode/kecepatan');
});

test('ubin butir: menyambung di tepi (berperiode T), rentang −,5..,5, rerata ±0, deterministik', () => {
  const T = 64, b = M.butir(T, 8, 3), v = (x, y) => b[(y % T) * T + (x % T)];
  assert.deepEqual(b, M.butir(T, 8, 3)); assert.notDeepEqual(b, M.butir(T, 8, 4));
  assert.ok(b.every(q => q >= -.5 && q <= .5)); dekat(b.reduce((s, q) => s + q, 0) / b.length, 0, .1, 'rerata');
  let dalam = 0; for (let y = 0; y < T; y++) for (let x = 0; x < T - 1; x++) dalam = Math.max(dalam, Math.abs(v(x + 1, y) - v(x, y)), Math.abs(v(y, x + 1) - v(y, x)));
  for (let y = 0; y < T; y++) assert.ok(Math.abs(v(T, y) - v(T - 1, y)) <= dalam + 1e-9 && Math.abs(v(y, T) - v(y, T - 1)) <= dalam + 1e-9, `sambungan tepi baris/kolom ${y}`);
});

test('dindingRelief: deterministik, seed beda = bentuk beda, struktur lapis/gerak/panel sah', () => {
  const o = { lebar: 4300, tinggi: 1000, lebarPanel: 1000, seed: 7 }, a = pustaka.dindingRelief(o), b = muat().pustaka.dindingRelief(o);
  assert.equal(JSON.stringify(a), JSON.stringify(b), 'berbeda antarmuatan'); assert.notEqual(JSON.stringify(a), JSON.stringify(pustaka.dindingRelief({ ...o, seed: 8 })));
  assert.equal(a.panel.length, 3); assert.deepEqual(a.panel.map(p => Math.round(p[0] + p[2] / 2)), [1000, 2150, 3300], 'panel di tengah dinding');
  for (const it of [...a.lapis, ...a.gerak.flatMap(g => g.lapis)]) {
    assert.ok(['timbul', 'rata', 'gurat'].includes(it.jenis), it.jenis); assert.match(it.d, /^M[-\d.,LZ M]+$/, 'jalur hanya M/L/Z angka');
    assert.ok(it.kotak.length === 4 && it.kotak.every(Number.isFinite) && it.kotak[0] <= it.kotak[2] && it.kotak[1] <= it.kotak[3], 'kotak');
    assert.ok(it.z >= 0 && it.z <= 1 && it.r >= 0, `z ${it.z} r ${it.r}`);
  }
  for (const g of a.gerak) { assert.ok(g.poros.every(Number.isFinite)); assert.ok(g.ayun || g.geser || g.alir || g.kembang, 'bagian hidup tanpa gerak'); }
  assert.ok(a.gerak.some(g => g.alir && g.klip), 'ombak mengalir dalam klip panel');
  assert.ok(a.blok.length > 40 && a.blok.every(b => b.length === 5 && b[4] >= 0 && b[4] <= 1 && b[0] < b[2] && b[1] < b[3]), 'blok [x0,y0,x1,y1,nada]');
  const baris = new Map(); for (const b of a.blok) (baris.get(b[1]) || baris.set(b[1], []).get(b[1])).push(b);
  for (const [y, B] of baris) { B.sort((p, q) => p[0] - q[0]); assert.equal(B[0][0], 0, `baris ${y} mulai di 0`); assert.equal(B.at(-1)[2], 4300, `baris ${y} sampai ujung`);
    B.slice(1).forEach((b, i) => assert.equal(b[0], B[i][2], `baris ${y}: blok bersambung tanpa celah`)); }
  const kiri = pustaka.dindingRelief({ ...o, arah: 1 }); assert.notEqual(JSON.stringify(kiri.lapis), JSON.stringify(a.lapis), 'arah membalik komposisi');
  const satu = pustaka.dindingRelief({ lebar: 1400, isi: ['perahu'] }); assert.equal(satu.panel.length, 1);
});

test('dindingRelief: opsi salah ditolak dengan pesan Indonesia', () => {
  const tolak = (o, re) => assert.throws(() => pustaka.dindingRelief(o), re);
  tolak({ lebar: 4300, warna: '#fff' }, /pustaka\.dindingRelief: opsi tidak dikenal: warna \(lebar tinggi lebarPanel arah seed isi\)/);
  tolak({ isi: ['wayang'] }, /isi harus larik nama panel \(prosesi perahu kalpataru\)/);
  tolak({ isi: 'perahu' }, /isi harus larik/);
  tolak({ arah: 0 }, /arah tidak dikenal: 0 \(-1 1\)/);
  tolak({ lebar: 2000 }, /lebar 2000 terlalu kecil untuk 3 panel/);
  tolak({ lebarPanel: 500 }, /lebarPanel harus ≥ 700/);
});

test('lapis persegi analitik (tanpa kanvas): cakupan = luas irisan piksel, tepi membulat dari tepi persegi', () => {
  const w = 20, h = 12, it = (r, jenis = 'timbul') => ({ jenis, kotak: [2.5, 2, 17.5, 10], z: .8, r, persegi: 1 });
  let t = new Float32Array(w * h), cv = new Float32Array(w * h);
  M.lapis(t, cv, w, h, it(0), D, null);
  dekat(t[5 * w + 10], .8, 1e-6, 'dalam'); dekat(t[5 * w + 2], .4, 1e-6, 'piksel tepi separuh tertutup'); assert.equal(t[5 * w + 1], 0, 'luar');
  dekat(cv[5 * w + 2], .5, 1e-6, 'cakupan tepi'); assert.equal(t[1 * w + 10], 0, 'di atas persegi');
  t = new Float32Array(w * h); M.lapis(t, null, w, h, it(3), D, null);
  assert.ok(t[5 * w + 3] < t[5 * w + 4] && t[5 * w + 4] < t[5 * w + 6], 'naik membulat dari tepi kiri'); dekat(t[6 * w + 10], .8, 1e-6, 'puncak');
  t = new Float32Array(w * h).fill(.9); M.lapis(t, null, w, h, it(0, 'rata'), D, null); dekat(t[5 * w + 10], .8, 1e-6, 'rata menyetel');
});
