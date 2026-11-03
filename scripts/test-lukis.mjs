#!/usr/bin/env node
/* UJI LUKIS: bagian murni src/runtime/lukis.js (bare script, disisipkan ke halaman) dijalankan lewat new Function dengan DOM palsu —
   tanpa browser, tanpa GPU. Yang diuji: kenop ditolak dengan pesan Indonesia yang menyebut pilihan sah, kanvas bidang/sprite di kotak
   yang benar (bawaan = frame + pad, data-penuh), dokumen SVG yang dirasterisasi, jalan pulang tanpa WebGL2 (raster mentah + satu
   peringatan), galat raster dilempar siap(), dan siklus pose = fungsi murni tl.time(). Pass GPU (Kuwahara, cat air) dan "tidak
   mendidih" diuji di browser: LUKIS_UJI + blok lukis di scripts/test-starters.mjs.
   Pakai: node --test scripts/test-lukis.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../src/runtime/lukis.js', import.meta.url), 'utf8');

/* halaman palsu: elemen dengan style/dataset/anak, kanvas yang mencatat drawImage, Image yang "didekode", Blob yang menyimpan isinya */
function muat({ gagalDekode = false } = {}) {
  let jam = 0; const cb = [], log = [], warn = [], blob = [];
  class HTMLElement {
    constructor(tag) { this.tag = tag; this.style = {}; this.dataset = {}; this.children = []; this.parentNode = null; this.className = ''; }
    appendChild(e) { this.children.push(e); e.parentNode = this; return e; }
    get isConnected() { return true; }
  }
  class Kanvas extends HTMLElement {
    getContext(t) { if (t !== '2d') return null; const c = this;
      return { drawImage: (img, ...a) => log.push(['drawImage', c, img.src ?? img, ...a]), clearRect: () => log.push(['clearRect', c]) }; }
  }
  class Image { set src(v) { this._s = v; } get src() { return this._s; } decode() { return gagalDekode ? Promise.reject(new Error('EncodingError')) : Promise.resolve(); } }
  const document = { createElement: t => t === 'canvas' ? new Kanvas(t) : new HTMLElement(t) };
  const URL = { createObjectURL: b => { blob.push(b); return 'blob:' + blob.length; }, revokeObjectURL: () => {} };
  class Blob { constructor(p, o) { this.isi = p.join(''); this.type = o.type; } }
  const tl = { time: () => jam }, window = {}, kons = { warn: m => warn.push(m), error: () => {} };
  const lukis = new Function('W', 'H', 'document', 'HTMLElement', 'Image', 'URL', 'Blob', 'window', 'tl', 'rantaiUpdate', 'console',
    SRC + ';return lukis')(1920, 1080, document, HTMLElement, Image, URL, Blob, window, tl, f => cb.push(f), kons);
  return { lukis, HTMLElement, document, log, warn, blob, window, setJam: t => { jam = t; cb.forEach(f => f()); } };
}
const el = m => m.document.createElement('div');

test('kenop salah ditolak dengan pesan yang menyebut pilihan sah', () => {
  const m = muat(), L = m.lukis, d = el(m), coba = (o, re) => assert.throws(() => L.bidang(d, '<g/>', o), re);
  coba({ kuass: 3 }, /lukis\.bidang: opsi tidak dikenal: kuass \(kuas panjang arah/);
  coba({ kuas: -1 }, /kuas harus angka 0\.\.16 \(dapat -1\)/);
  coba({ res: 0 }, /res harus angka 0\.25\.\.2/);
  coba({ tepi: '1' }, /tepi harus angka/);
  coba({ seed: 1.5 }, /seed harus bilangan bulat/);
  coba({ palet: 'neon' }, /palet tidak dikenal: neon \(senja kenang fajar\)/);
  coba({ palet: ['#000000', '#fff', '#ffffff'] }, /palet = nama atau \[gelap, tengah, terang\]/);
  coba({ kotak: [0, 0, 100] }, /kotak = \[x, y, lebar, tinggi\]/);
  coba({ kotak: [0, 0, 0, 10] }, /lebar, tinggi > 0/);
  assert.throws(() => L.bidang(d, 42), /markup harus string SVG/);
  assert.throws(() => L.bidang({}, '<g/>'), /el wajib elemen HTML/);
  assert.throws(() => L.sprite(d, '<g/>', {}), /lukis\.sprite: kotak .* wajib/);
  assert.throws(() => L.sprite(d, [], { kotak: [0, 0, 10, 10] }), /markup kosong/);
  assert.throws(() => L.bidang(d, '<g/>', null), /opsi harus objek/);
});

test('bidang: kanvas di kotak bawaan frame + pad (data-penuh), atau di kotak sendiri; resolusi = kotak × res', () => {
  const m = muat(), L = m.lukis, d = el(m);
  const a = L.bidang(d, '<g/>'), b = L.bidang(d, '<g/>', { kotak: [100, 50, 401, 300], res: .5 });
  assert.equal(a.className, 'wv-lukis'); assert.equal(a.parentNode, d); assert.ok('penuh' in a.dataset);
  assert.match(a.style.cssText, /left:-160px;top:-160px;width:2240px;height:1400px/);
  assert.deepEqual([a.width, a.height], [2240, 1400]);
  assert.ok(!('penuh' in b.dataset)); assert.match(b.style.cssText, /left:100px;top:50px;width:401px;height:300px/);
  assert.deepEqual([b.width, b.height], [201, 150]);
  const c = L.bidang(d, '<g/>', { pad: 40 });
  assert.match(c.style.cssText, /left:-40px;top:-40px;width:2000px;height:1160px/);
});

test('tanpa WebGL2: raster SVG mentah di kanvas, satu peringatan untuk semua bidang, siap() selesai', async () => {
  const m = muat(), L = m.lukis, d = el(m), mk = '<circle cx="5" cy="5" r="4" fill="#c87a50"/>';
  const a = L.bidang(d, mk, { kotak: [-10, -20, 300, 200] }), b = L.bidang(d, mk);
  await L.siap();
  const di = m.log.filter(x => x[0] === 'drawImage');
  assert.deepEqual(di.map(x => x[1]), [a, b], 'tiap kanvas digambar sekali (raster), urut antrean');
  assert.deepEqual(di[0].slice(3), [0, 0, 300, 200]);
  assert.equal(m.warn.length, 1); assert.match(m.warn[0], /WebGL2 \+ EXT_color_buffer_float tidak tersedia/);
  const svg = m.blob[0];
  assert.equal(svg.type, 'image/svg+xml');
  assert.equal(svg.isi, `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="-10 -20 300 200" preserveAspectRatio="none">${mk}</svg>`);
  assert.equal(L.dokumen(mk, [0, 0, 10, 10], 20, 20), `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 10 10" preserveAspectRatio="none">${mk}</svg>`);
});

test('markup yang tidak bisa dirender: siap() menolak dengan pesan yang jelas, antrean sesudahnya dilewati', async () => {
  const m = muat({ gagalDekode: true }), L = m.lukis, d = el(m);
  L.bidang(d, '<g>'); L.bidang(d, '<g/>');
  await assert.rejects(L.siap(), /lukis: markup SVG tidak bisa dirender .*EncodingError/);
  assert.equal(m.blob.length, 1, 'sesudah galat pertama antrean tidak dirasterisasi lagi');
});

test('sprite: satu kanvas per pose dalam div di kotak, hanya pose 0 tampil; siklus = floor(t·fps + fase) mod n', () => {
  const m = muat(), L = m.lukis, d = el(m), sp = L.sprite(d, ['<g/>', '<g/>', '<g/>', '<g/>'], { kotak: [10, 20, 30, 40] });
  assert.equal(sp.className, 'wv-lukis-sprite'); assert.equal(sp.parentNode, d); assert.equal(sp.children.length, 4);
  assert.match(sp.style.cssText, /left:10px;top:20px;width:30px;height:40px/);
  assert.deepEqual(sp.children.map(c => /visibility:hidden/.test(c.style.cssText)), [false, true, true, true]);
  assert.deepEqual(sp.children.map(c => [c.width, c.height]), Array(4).fill([30, 40]));
  L.siklus(sp, 6, { fase: 1 });
  const tampil = () => sp.children.map((c, i) => c.style.visibility === '' ? i : -1).filter(i => i >= 0);
  for (const [t, i] of [[0, 1], [1 / 6 + 1e-9, 2], [.5 + 1e-9, 0], [2 + 1e-9, 1]]) { m.setJam(t); assert.deepEqual(tampil(), [i], `t ${t}`); }
  assert.throws(() => L.siklus(sp, 0), /fps > 0/);
});

test('pose(): murni, berulang tiap n/fps detik, aman untuk t negatif', () => {
  const { lukis: L } = muat();
  assert.equal(L.pose(0, 6, 8), 0); assert.equal(L.pose(1 / 6 + 1e-9, 6, 8), 1); assert.equal(L.pose(8 / 6 + 1e-9, 6, 8), 0);
  assert.equal(L.pose(-1e-9, 6, 8), 7); assert.equal(L.pose(0, 5, 2, 1), 1);
  for (let t = 0; t < 4; t += .07) assert.equal(L.pose(t, 6, 8), L.pose(t + 8 / 6, 6, 8));
});

test('palet bawaan: tiga warna #rrggbb dari gelap ke terang; LUKIS_UJI terpasang', () => {
  const { lukis: L, window } = muat(), lum = c => [1, 3, 5].reduce((s, i, k) => s + [.3, .59, .11][k] * parseInt(c.slice(i, i + 2), 16), 0);
  for (const [n, p] of Object.entries(L.PALET)) {
    assert.equal(p.length, 3, n); p.forEach(c => assert.match(c, /^#[0-9a-f]{6}$/i));
    assert.ok(lum(p[0]) < lum(p[1]) && lum(p[1]) < lum(p[2]), `${n}: palet harus naik dari gelap ke terang`);
  }
  assert.equal(typeof window.LUKIS_UJI, 'function');
});
