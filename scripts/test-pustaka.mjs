#!/usr/bin/env node
/* UJI PUSTAKA: src/runtime/pustaka.js (bare script, disisipkan ke halaman) dijalankan lewat new Function bersama blok
   atmosfer.js + cahaya-2d.js yang sungguhan (warnaJarak, mulberry32, LANGIT, SUMBER) — tanpa browser, tanpa dependensi.
   Yang diuji: determinisme per generator, penolakan opsi salah dengan pesan Indonesia, dan SVG yang well-formed
   (parser XML mini di bawah) serta mandiri (setiap url(#…)/href="#…" menunjuk id di keluaran itu sendiri).
   Kait kanvas (api, asapHidup) diuji dengan document/kanvas palsu yang mencatat panggilan gambar.
   Pakai: node --test scripts/test-pustaka.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const baca = n => readFileSync(new URL(`../src/runtime/${n}.js`, import.meta.url), 'utf8');
const SRC = baca('atmosfer') + '\n' + baca('cahaya-2d') + '\n' + baca('pustaka');

/* halaman palsu: tl dengan jam yang bisa disetel + rantai onUpdate, kanvas yang mencatat setiap panggilan gambar */
function muat() {
  let jam = 0, cb = null;
  const tl = { time: () => jam, eventCallback: (n, f) => (f === undefined ? cb : (cb = f)) };
  class HTMLElement { constructor() { this.anak = []; this.style = {}; } appendChild(e) { this.anak.push(e); e.isConnected = true; return e; } }
  class Kanvas extends HTMLElement {
    constructor() { super(); this.log = []; this.isConnected = false; }
    getContext() { const l = this.log, k = {};
      for (const m of ['setTransform', 'clearRect', 'fill', 'fillRect', 'drawImage']) k[m] = (...a) => l.push([m, ...a.map(v => v instanceof Path2D ? v.d : v instanceof Kanvas ? 'sprite' : v)]);
      k.createRadialGradient = () => ({ addColorStop: (...a) => l.push(['stop', ...a]) });
      for (const p of ['globalAlpha', 'fillStyle', 'globalCompositeOperation']) Object.defineProperty(k, p, { set: v => l.push([p, v]) });
      return k; }
  }
  class Path2D { constructor(d) { this.d = d; } }
  const document = { createElement: () => new Kanvas() };
  const api = new Function('tl', 'W', 'H', 'window', 'document', 'HTMLElement', 'Path2D', '$',
    SRC + ';return {pustaka,SUMBER,LANGIT,warnaJarak}')(tl, 1920, 1080, {}, document, HTMLElement, Path2D, () => null);
  return { ...api, HTMLElement, setJam: t => { jam = t; if (cb) cb(); } };
}

/* parser XML mini: tag seimbang, atribut name="nilai" tanpa < dan tanpa & telanjang, tanpa atribut ganda, tanpa teks liar */
function cekXML(s) {
  const tumpuk = [], ATR = /\s+([A-Za-z_:][\w:.-]*)="([^"<]*)"/y;
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    const teks = s.slice(i, lt < 0 ? s.length : lt);
    if (/&(?![a-z]+;|#\d+;|#x[0-9a-f]+;)/i.test(teks)) return `& telanjang di teks dekat …${teks.slice(0, 40)}`;
    if (lt < 0) break;
    const m = /^<(\/?)([A-Za-z][\w:.-]*)/.exec(s.slice(lt, lt + 80));
    if (!m) return `'<' bukan awal tag di posisi ${lt}: ${s.slice(lt, lt + 40)}`;
    let j = lt + m[0].length; const nama = new Set();
    if (!m[1]) for (;;) {
      ATR.lastIndex = j; const a = ATR.exec(s);
      if (!a) break;
      if (nama.has(a[1])) return `atribut ganda ${a[1]} di <${m[2]}>`;
      if (/&(?![a-z]+;|#\d+;|#x[0-9a-f]+;)/i.test(a[2])) return `& telanjang di atribut ${a[1]} <${m[2]}>`;
      nama.add(a[1]); j = ATR.lastIndex;
    }
    const tutup = /^\s*(\/?)>/.exec(s.slice(j, j + 20));
    if (!tutup) return `tag <${m[2]}> rusak dekat: ${s.slice(lt, lt + 60)}`;
    if (m[1]) { const atas = tumpuk.pop(); if (atas !== m[2]) return `</${m[2]}> menutup <${atas}>`; }
    else if (!tutup[1]) tumpuk.push(m[2]);
    i = j + tutup[0].length;
  }
  return tumpuk.length ? `tag tidak ditutup: <${tumpuk.join('> <')}>` : '';
}
/* keluaran yang sehat: XML sah, satu akar, id unik, semua rujukan lokal terpenuhi, tanpa NaN/undefined/Infinity */
function sehat(svg, label) {
  assert.equal(cekXML(svg), '', `${label}: XML`);
  assert.equal(cekXML('<akar>' + svg + '</akar>'), '', `${label}: XML berakar`);
  assert.doesNotMatch(svg, /NaN|undefined|Infinity|\[object/, `${label}: angka/objek rusak di markup`);
  const id = [...svg.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(id).size, id.length, `${label}: id ganda`);
  for (const [, r] of svg.matchAll(/(?:url\(#|href="#)([^)"]+)/g)) assert.ok(id.includes(r), `${label}: rujukan #${r} tidak ada di keluaran`);
}

const GEN = {
  candi: [{}, { varian: 'bata' }, { varian: 'andesit', detail: 0, jarak: -900 }, { varian: 'bata', detail: 1, cahaya: { arah: 200 } }],
  gapura: [{}, { varian: 'paduraksa' }, { varian: 'bentar', celah: 220, detail: 0 }, { varian: 'paduraksa', detail: 1, cahaya: { x: 200, y: 300 } }],
  rumahPanggung: [{}, { lampu: 1, tangga: 0 }, { detail: 0, jarak: -700 }],
  beringin: [{}, { detail: 1 }, { detail: 0, seed: 9 }],
  lontar: [{}, { detail: 1 }, { detail: 0, seed: 4 }],
  gunungBerlapis: [{}, { lapis: 4, puncak: 1, detail: 2 }, { lapis: 1, detail: 0 }],
  sawahTerasering: [{}, { baris: 5, detail: 1 }, { detail: 0 }],
  obor: [{}, { jenis: 'dinding' }, { kolam: 1, detail: 0 }],
  asap: [{}, { angin: -.4, tinggi: 200 }],
  relief: [{}, { isi: 'kalpataru' }, { isi: 'perahu', lebar: 1200 }, { isi: 'prosesi', detail: 0, lebar: 500 }],
  kain: [{ motif: 'kawung' }, { motif: 'parang' }, { motif: 'ceplok', seed: 2 }, { motif: 'truntum', warna: ['#101010', '#eeeeee'] }],
};

test('setiap generator: seed + opsi sama → string identik byte demi byte, juga di muatan halaman lain', () => {
  const a = muat(), b = muat();
  for (const [n, daftar] of Object.entries(GEN)) for (const o of daftar) {
    const x = a.pustaka[n]({ ...o }), y = a.pustaka[n]({ ...o }), z = b.pustaka[n]({ ...o });
    assert.ok(x.length > 200, `${n} ${JSON.stringify(o)}: keluaran terlalu pendek`);
    assert.equal(x, y, `${n} ${JSON.stringify(o)}: dua panggilan berbeda`);
    assert.equal(x, z, `${n} ${JSON.stringify(o)}: berbeda antarmuatan`);
  }
});

test('seed beda → bentuk beda (generator yang memakai acak); id ikut berubah, jadi dua aset tak bertabrakan', () => {
  const { pustaka } = muat();
  for (const n of ['candi', 'gapura', 'rumahPanggung', 'beringin', 'lontar', 'gunungBerlapis', 'sawahTerasering', 'asap', 'relief']) {
    const a = pustaka[n]({ seed: 1 }), b = pustaka[n]({ seed: 2 });
    assert.notEqual(a, b, `${n}: seed 1 dan 2 sama`);
    assert.notEqual(/id="([^"]+)"/.exec(a)[1], /id="([^"]+)"/.exec(b)[1], `${n}: id sama untuk seed beda`);
  }
  for (const n of ['beringin', 'lontar', 'gunungBerlapis', 'sawahTerasering', 'asap', 'relief'])
    assert.notEqual(pustaka[n]({ seed: 1 }).replace(/wvp-[\w-]+/g, ''), pustaka[n]({ seed: 2 }).replace(/wvp-[\w-]+/g, ''), `${n}: geometri tak bergantung seed`);
});

test('keluaran SVG well-formed dan mandiri (id unik, rujukan terpenuhi, tanpa NaN)', () => {
  const { pustaka } = muat();
  for (const [n, daftar] of Object.entries(GEN)) for (const o of daftar) sehat(pustaka[n]({ ...o }), `${n} ${JSON.stringify(o)}`);
  // dua aset berbeda dalam satu svg: id tidak bertabrakan
  const dua = pustaka.candi({ x: 400 }) + pustaka.candi({ x: 1400 }) + pustaka.gapura({}) + pustaka.kain({ motif: 'kawung' }) + pustaka.kain({ motif: 'kawung', warna: ['#000'] });
  sehat(dua, 'gabungan');
  assert.equal(cekXML('<g><a></g>'), '</g> menutup <a>', 'parser mini harus menangkap tag silang');
  assert.match(cekXML('<g x="1" x="2"/>'), /atribut ganda/, 'parser mini harus menangkap atribut ganda');
  assert.match(cekXML('<g d="a & b"/>'), /& telanjang/, 'parser mini harus menangkap & telanjang');
});

test('struktur kontrak: <g class="wv-pustaka" data-pustaka> ber-transform; clipPath -k; kain = <pattern>', () => {
  const { pustaka } = muat();
  for (const n of Object.keys(GEN).filter(n => n !== 'kain')) {
    const s = pustaka[n]({});
    assert.match(s, new RegExp(`^<g id="([\\w-]+)" class="wv-pustaka" data-pustaka="${n}" transform="translate\\([-\\d.]+,[-\\d.]+\\) scale\\([\\d.]+\\)">`), n);
    if (n !== 'asap') assert.match(s, /<clipPath id="[\w-]+-k">/, `${n}: clipPath -k untuk redup()`);
  }
  assert.match(pustaka.candi({ id: 'candiKu' }), /^<g id="candiKu"/);
  assert.match(pustaka.kain({ motif: 'truntum', id: 'k1' }), /^<pattern id="k1" patternUnits="userSpaceOnUse"/);
  assert.match(pustaka.candi({ x: 300, y: 800, tinggi: 250 }), /transform="translate\(300,800\) scale\(0\.25\)"/);
});

test('cahaya: arah, titik, dan nama SUMBER mengubah rim; jarak memudarkan warna ke LANGIT.horizon', () => {
  const { pustaka, SUMBER, LANGIT, warnaJarak } = muat();
  const rim = s => /fill="(#[0-9a-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"/.exec(s).slice(1);
  const [, kx] = rim(pustaka.candi({ x: 960, cahaya: { arah: 0 } })), [, lx] = rim(pustaka.candi({ x: 960, cahaya: { arah: 180 } }));
  assert.ok(+kx > 0 && +lx < 0, `rim harus bergeser ke arah cahaya (kanan ${kx}, kiri ${lx})`);
  const [, , ay] = rim(pustaka.gapura({ cahaya: { arah: 270 } }));
  assert.ok(+ay < 0, 'cahaya dari atas → rim bergeser ke atas');
  const [, tx] = rim(pustaka.lontar({ x: 960, cahaya: { x: 1800, y: 600 } }));
  assert.ok(+tx > 0, 'titik cahaya di kanan aset → rim ke kanan');
  const [, lemah] = rim(pustaka.lontar({ x: 960, cahaya: { x: 1800, y: 600, kuat: .2 } })), [, kuat] = rim(pustaka.lontar({ x: 960, cahaya: { x: 1800, y: 600, kuat: 1 } }));
  assert.ok(+lemah < +kuat, `cahaya.kuat kecil → rim lebih tipis (${lemah} vs ${kuat})`);
  SUMBER.obor1 = { x: 100, y: 500, warna: '#ff8800', jangkau: 300 };
  const [w, sx] = rim(pustaka.rumahPanggung({ x: 960, cahaya: 'obor1' }));
  assert.ok(+sx < 0, 'SUMBER di kiri → rim ke kiri');
  assert.notEqual(w, rim(pustaka.rumahPanggung({ x: 960 }))[0], 'warna rim mengikuti warna sumber');
  assert.throws(() => pustaka.candi({ cahaya: 'tidakada' }), /sumber tidak dikenal: tidakada \(obor1\)/);
  const dekat = pustaka.candi({ jarak: 0, detail: 2 }), jauh = pustaka.candi({ jarak: -1600, detail: 2 });
  const isi = s => /<stop offset="0?\.45" stop-color="(#[0-9a-f]{6})"/.exec(s)[1];
  assert.equal(isi(jauh), warnaJarak(isi(dekat), -1600, -2000), 'warna dasar jauh = warnaJarak(dekat, jarak, −2000)');
  const h = LANGIT.horizon; LANGIT.horizon = '#00ff00';
  assert.notEqual(pustaka.candi({ jarak: -900 }), jauh, 'LANGIT.horizon dibaca saat dipanggil');
  LANGIT.horizon = h;
});

test('detail bawaan dari jarak; detail lebih rendah = markup lebih ringkas', () => {
  const { pustaka } = muat();
  for (const n of ['candi', 'beringin', 'lontar', 'sawahTerasering', 'relief']) {
    const tanpaId = s => s.replace(/wvp-[\w-]+/g, ''), [d0, d1, d2] = [0, 1, 2].map(detail => tanpaId(pustaka[n]({ detail })).length);
    assert.ok(d0 < d1 && d1 <= d2, `${n}: panjang detail 0/1/2 = ${d0}/${d1}/${d2}`);
    assert.equal(tanpaId(pustaka[n]({ jarak: -700 })), tanpaId(pustaka[n]({ jarak: -700, detail: 0 })), `${n}: jarak −700 → detail 0`);
  }
});

test('opsi salah ditolak dengan pesan Indonesia yang jelas', () => {
  const { pustaka, HTMLElement } = muat();
  const tolak = (f, re) => assert.throws(f, re);
  tolak(() => pustaka.candi({ tingi: 400 }), /^Error: pustaka\.candi: opsi tidak dikenal: tingi \(x y tinggi varian seed detail cahaya jarak warna id\)$/);
  tolak(() => pustaka.candi({ varian: 'kayu' }), /pustaka\.candi: varian tidak dikenal: kayu \(andesit bata\)/);
  tolak(() => pustaka.gapura({ varian: 'candi' }), /varian tidak dikenal: candi \(bentar paduraksa\)/);
  tolak(() => pustaka.kain({ motif: 'batik' }), /pustaka\.kain: motif tidak dikenal: batik \(kawung parang ceplok truntum\)/);
  tolak(() => pustaka.lontar({ tinggi: -5 }), /pustaka\.lontar: tinggi harus > 0 \(dapat -5\)/);
  tolak(() => pustaka.lontar({ tinggi: '300' }), /tinggi harus angka \(dapat 300\)/);
  tolak(() => pustaka.beringin({ x: NaN }), /x harus angka \(dapat NaN\)/);
  tolak(() => pustaka.relief({ isi: 'wayang' }), /isi tidak dikenal: wayang \(prosesi kalpataru perahu\)/);
  tolak(() => pustaka.candi({ detail: 3 }), /detail harus 0, 1, atau 2 \(dapat 3\)/);
  tolak(() => pustaka.candi({ warna: 'merah' }), /warna bukan warna #rrggbb atau rgb\(\): merah/);
  tolak(() => pustaka.candi({ id: '1abc' }), /id diawali huruf/);
  tolak(() => pustaka.candi({ cahaya: 45 }), /cahaya harus nama SUMBER, \{x,y\} atau \{arah\}/);
  tolak(() => pustaka.candi({ cahaya: { az: 45 } }), /cahaya: kunci tidak dikenal: az/);
  tolak(() => pustaka.candi({ cahaya: { arah: '45' } }), /cahaya harus \{x,y\} \(angka, px bidang\) atau \{arah\}/);
  tolak(() => pustaka.candi({ cahaya: { arah: 45, warna: 'emas' } }), /cahaya\.warna bukan warna/);
  tolak(() => pustaka.candi({ cahaya: { arah: 45, kuat: 2 } }), /cahaya\.kuat harus 0\.\.1 \(dapat 2\)/);
  tolak(() => pustaka.candi('besar'), /pustaka\.candi: opsi harus objek/);
  tolak(() => pustaka.api(new HTMLElement(), [[1, 2]], { tinggi: 0 }), /pustaka\.api: tinggi harus > 0/);
  tolak(() => pustaka.api({}, [[1, 2]]), /pustaka\.api: bidang wajib elemen HTML/);
  tolak(() => pustaka.api(new HTMLElement(), [1, 2]), /pustaka\.api: titik harus larik \[\[x,y\]/);
  tolak(() => pustaka.asapHidup(null, {}), /pustaka\.asapHidup: bidang wajib elemen HTML/);
});

test('kait kanvas api + asapHidup: fungsi murni tl.time() — t sama lewat jalur berbeda = gambar sama; t beda = gambar beda', () => {
  const { pustaka, HTMLElement, setJam } = muat();
  const B = new HTMLElement(), A = pustaka.api(B, [[500, 600], [800, 600, 1.4]], { seed: 3 }), S = pustaka.asapHidup(B, { x: 900, y: 500, seed: 2 });
  assert.equal(B.anak.length, 2); assert.equal(A.className, 'wv-api'); assert.match(A.style.cssText, /mix-blend-mode:screen/);
  A.log.length = S.log.length = 0;   // pasang: setTransform + gambar awal
  const foto = t => { setJam(t); return JSON.stringify([A.log.splice(0), S.log.splice(0)]); };
  const a = foto(5); foto(9); foto(.1); const b = foto(5), c = foto(5.3);
  assert.equal(a, b, 'seek 5 → 9 → .1 → 5 harus menggambar sama dengan seek 5 langsung');
  assert.notEqual(a, c, 'nyala/asap beku antara t 5 dan 5,3');
  assert.match(a, /"clearRect"/, 'kanvas dihapus penuh tiap frame');
  assert.equal((a.match(/"fill"/g) || []).length, 6, 'dua nyala × tiga lapis');
  B.anak[0].isConnected = false; assert.equal(foto(6).startsWith('[[]'), true, 'kanvas yang dilepas tidak menggambar lagi');
});
