#!/usr/bin/env node
/* UJI TOKOH: src/runtime/tokoh.js (bare script, disisipkan ke halaman) dijalankan lewat new Function bersama blok atmosfer.js +
   cahaya-2d.js + pustaka.js yang sungguhan — tanpa browser, tanpa dependensi. Yang diuji: matematika IK dua tulang (jangkau,
   jepit di luar jangkauan, sisi siku), pose = fungsi murni waktu + campuran, jalan tanpa selip, kerumunan ber-seed, SVG yang
   well-formed dan mandiri, kanvas gerak() yang menggambar sama untuk t sama lewat jalur seek berbeda (kanvas palsu mencatat
   panggilan gambar), dan penolakan opsi salah dengan pesan Indonesia.
   Pakai: node --test scripts/test-tokoh.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const baca = n => readFileSync(new URL(`../src/runtime/${n}.js`, import.meta.url), 'utf8');
const SRC = ['atmosfer', 'cahaya-2d', 'pustaka', 'tokoh'].map(baca).join('\n');

/* halaman palsu: tl dengan jam yang bisa disetel + rantai onUpdate; kanvas yang mencatat setiap panggilan gambar */
function muat() {
  let jam = 0, cb = null;
  const tl = { time: () => jam, eventCallback: (n, f) => (f === undefined ? cb : (cb = f)) };
  class HTMLElement { constructor() { this.anak = []; this.style = {}; this.isConnected = false; }
    appendChild(e) { this.anak.push(e); e.parentNode = this; e.isConnected = true; return e; } }
  class Kanvas extends HTMLElement {
    constructor() { super(); this.log = []; }
    getContext() { const l = this.log, k = {};
      for (const m of ['setTransform', 'clearRect', 'fill', 'stroke', 'fillRect', 'drawImage', 'addColorStop'])
        k[m] = (...a) => l.push([m, ...a.map(v => v instanceof Path2D ? v.d.length : v instanceof Kanvas ? 'kanvas' : typeof v === 'number' ? +v.toFixed(3) : v)]);
      k.createLinearGradient = (...a) => (l.push(['grad', ...a.map(v => +v.toFixed(2))]), { addColorStop: (...b) => l.push(['stop', ...b]) });
      k.createPattern = () => ({ setTransform: () => l.push(['pola']) });
      k.scale = () => {};
      for (const p of ['globalAlpha', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'filter', 'globalCompositeOperation'])
        Object.defineProperty(k, p, { set: v => l.push([p, typeof v === 'object' ? 'objek' : v]) });
      return k; }
  }
  class Path2D { constructor(d) { this.d = d; } }
  class DOMMatrix { rotateSelf() { return this; } scaleSelf() { return this; } }
  const semua = [], document = { createElement: () => { const k = new Kanvas(); semua.push(k); return k; } };
  const api = new Function('tl', 'W', 'H', 'window', 'document', 'HTMLElement', 'Path2D', 'DOMMatrix', '$',
    SRC + ';return {tokoh,pustaka,SUMBER,LANGIT,sumber}')(tl, 1920, 1080, {}, document, HTMLElement, Path2D, DOMMatrix, () => null);
  return { ...api, HTMLElement, semua, setJam: t => { jam = t; if (cb) cb(); } };
}

/* parser XML mini (sama dengan test-pustaka): tag seimbang, atribut name="nilai" tanpa < dan & telanjang, tanpa atribut ganda */
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
function sehat(svg, label) {
  assert.equal(cekXML('<akar>' + svg + '</akar>'), '', `${label}: XML`);
  assert.doesNotMatch(svg, /NaN|undefined|Infinity|\[object/, `${label}: angka/objek rusak di markup`);
  const id = [...svg.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(id).size, id.length, `${label}: id ganda`);
  for (const [, r] of svg.matchAll(/(?:url\(#|href="#)([^)"]+)/g)) assert.ok(id.includes(r), `${label}: rujukan #${r} tidak ada di keluaran`);
}
const dekat = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

test('IK dua tulang: ujung tepat di target yang terjangkau, panjang tulang terjaga', () => {
  const { tokoh } = muat();
  for (const [L1, L2, tx, ty] of [[225, 228, 80, 400], [185, 160, 200, -60], [100, 100, -120, 30], [185, 160, 0, 300]]) {
    const [a1, a2, bx, by, ex, ey] = tokoh.ik(L1, L2, tx, ty, 1);
    assert.ok(dekat(Math.hypot(bx, by), L1, 1e-6), 'sendi tengah sejauh L1 dari akar');
    assert.ok(dekat(bx + L2 * Math.sin(a2), ex) && dekat(by + L2 * Math.cos(a2), ey), 'tulang kedua sepanjang L2 menuju ujung');
    assert.ok(dekat(ex, tx, 1e-6) && dekat(ey, ty, 1e-6), `ujung (${ex}, ${ey}) ≠ target (${tx}, ${ty})`);
    assert.ok(dekat(Math.sin(a1) * L1, bx) && dekat(Math.cos(a1) * L1, by), 'a1 = arah tulang pertama (dari bawah ke +x)');
  }
});

test('IK: target di luar jangkauan dijepit lurus menuju target; terlalu dekat dijepit ke |L1 − L2|', () => {
  const { tokoh } = muat();
  const [a1, a2, , , ex, ey] = tokoh.ik(225, 228, 300, 600, 1), r = Math.hypot(ex, ey), arah = Math.atan2(300, 600);
  assert.ok(dekat(r, 453, 1e-3), `jangkauan maksimum ${r} ≠ L1 + L2`);
  assert.ok(dekat(Math.atan2(ex, ey), arah, 1e-9), 'ujung tetap di garis menuju target');
  assert.ok(dekat(a1, a2, 1e-3), 'lengan lurus (kedua sudut sama) saat dijepit');
  const [, , , , cx, cy] = tokoh.ik(200, 120, 1, 1, 1);
  assert.ok(dekat(Math.hypot(cx, cy), 80, 1e-3), `jarak minimum ${Math.hypot(cx, cy)} ≠ |L1 − L2|`);
  const [z1, z2] = tokoh.ik(100, 100, 0, 0, 1);
  assert.ok(Number.isFinite(z1) && Number.isFinite(z2), 'target tepat di akar tidak menghasilkan NaN');
});

test('IK: sisi siku/lutut mengikuti tanda sisi', () => {
  const { tokoh } = muat();
  const [, , bx1] = tokoh.ik(225, 228, 0, 400, 1), [, , bx2] = tokoh.ik(225, 228, 0, 400, -1);
  assert.ok(bx1 > 0 && bx2 < 0, `target lurus di bawah: sisi 1 → sendi di +x (${bx1}), sisi −1 → −x (${bx2})`);
  const silang = (s, tx, ty) => { const [, , bx, by] = tokoh.ik(185, 160, tx, ty, s); return tx * by - ty * bx; };
  for (const [tx, ty] of [[120, 200], [-200, 50], [150, -120]])
    assert.ok(Math.sign(silang(1, tx, ty)) === -Math.sign(silang(-1, tx, ty)), `sisi 1 dan −1 di seberang garis akar→(${tx}, ${ty})`);
});

test('pose = fungsi murni waktu: t sama → matriks sama, jalur pemanggilan apa pun; t beda → beda', () => {
  const { tokoh } = muat();
  tokoh.buat({ id: 'a', arketipe: 'putri', arah: 'samping' });
  const K = [[0, 'berdiri'], [1.5, 'meraih', { ik: { tanganD: [280, 540] } }], [3, 'sembah'], [5, 'jalan', { laju: 240 }], [8, 'berdiri']];
  const foto = t => JSON.stringify(tokoh.pose('a', K, t).m);
  const t = [0.4, 2.2, 3.4, 6.1, 9], a = t.map(foto);
  [9, .1, 6.1, 2.2].forEach(foto);
  assert.deepEqual(t.map(foto), a, 'urutan pemanggilan mengubah hasil');
  assert.notEqual(foto(6.1), foto(6.3), 'jalan beku antara t 6,1 dan 6,3');
  assert.notEqual(foto(0.4), foto(2.0), 'napas/IK beku');
});

test('campuran pose: di awal transisi = pose lama, di akhir = pose baru, di tengah di antaranya', () => {
  const { tokoh } = muat();
  tokoh.buat({ id: 'c', arketipe: 'rakyat', arah: 'samping', fase: 0 });
  const K = [[0, 'berdiri'], [2, 'menunjuk', { durasi: 1 }]], sudut = t => { const q = tokoh.pose('c', K, t).F; return q.A[6]; };   // hastaD
  const lama = tokoh.pose('c', [[0, 'berdiri']], 2).F.A[6], baru = tokoh.pose('c', [[0, 'menunjuk']], 3).F.A[6];
  assert.ok(dekat(sudut(2), lama, 1e-9), 'tepat di t transisi masih pose lama');
  assert.ok(dekat(sudut(3), baru, 1e-9), 'durasi habis = pose baru');
  const m = sudut(2.5);
  assert.ok((m - lama) * (m - baru) < 0, 'tengah transisi di antara keduanya');
  assert.ok(Math.abs(sudut(2.001) - lama) < 1e-3, 'tanpa lompatan di awal transisi');
});

test('jalan: telapak tumpu menapak di tanah tanpa selip; akar maju menurut laju', () => {
  const { tokoh } = muat();
  tokoh.buat({ id: 'j', arketipe: 'petani', arah: 'samping', tinggi: 1000, x: 0, y: 0 });
  const K = [[0, 'jalan', { laju: 300, langkah: 300, durasi: .01 }]];
  // kaki tumpu D (fase .02–.3): titik pergelangan dalam ruang dunia (akar + posisi lokal) tetap
  const dunia = t => { const R = tokoh.pose('j', K, t); return [R.W[4] + R.F.S[13][2], R.F.S[13][1]]; };   // kakiD mulai di pergelangan
  const T = 2 * 300 / 300, t0 = 3 * T + .03 * T, t1 = 3 * T + .28 * T, a = dunia(t0), b = dunia(t1);
  assert.ok(Math.abs(a[0] - b[0]) < 1.5, `pergelangan tumpu bergeser ${(b[0] - a[0]).toFixed(2)} px (selip)`);
  assert.ok(Math.abs(a[1] + 45) < 2 && Math.abs(b[1] + 45) < 2, `pergelangan tumpu setinggi tanah (${a[1].toFixed(1)}, ${b[1].toFixed(1)})`);
  const x1 = tokoh.pose('j', K, 4).W[4], x2 = tokoh.pose('j', K, 5).W[4];
  assert.ok(dekat(x2 - x1, 300, 1e-6), `akar maju ${x2 - x1} px/dtk ≠ laju 300`);
});

test('kerumunan: seed sama → daftar sama; seed beda → beda; urut kedalaman; ragam dihormati', () => {
  const { tokoh } = muat();
  const o = { seed: 7, n: 20, area: [100, 700, 1600, 200], ragam: ['rakyat', 'prajurit'] };
  const a = tokoh.kerumunan(o), b = tokoh.kerumunan({ ...o }), c = tokoh.kerumunan({ ...o, seed: 8 });
  assert.deepEqual(a, b, 'seed sama, daftar berbeda');
  assert.notDeepEqual(a, c, 'seed beda, daftar sama');
  assert.equal(a.length, 20);
  assert.ok(a.every((m, i) => !i || a[i - 1].y <= m.y), 'baris belakang (y kecil) digambar dulu');
  assert.ok(a.every(m => ['rakyat', 'prajurit'].includes(m.arketipe)), 'arketipe di luar ragam');
  assert.ok(new Set(a.map(m => m.tinggi)).size > 15 && new Set(a.map(m => m.fase)).size === 20, 'tinggi dan fase napas bervariasi');
  assert.ok(a.every(m => m.x >= 100 && m.x <= 1700 && m.y >= 700 && m.y <= 900), 'anggota di luar area');
  sehat(a.map(m => tokoh.buat(m)).join(''), 'kerumunan → buat');
});

test('SVG buat() well-formed dan mandiri untuk semua arketipe × pandang × detail; id unik antartokoh', () => {
  const { tokoh } = muat();
  for (const arketipe of Object.keys(tokoh.ARKETIPE)) for (const arah of ['depan', 'tigaperempat', 'samping']) for (const detail of [0, 1, 2]) {
    const s = tokoh.buat({ arketipe, arah, detail, pose: detail ? 'sembah' : 'bersila', hadap: detail === 1 ? 'kiri' : 'kanan' });
    sehat(s, `${arketipe} ${arah} detail ${detail}`);
    assert.match(s, new RegExp(`^<g id="[\\w-]+" class="wv-tokoh" data-tokoh="${arketipe}" transform="translate\\([-\\d.]+,[-\\d.]+\\) scale\\([-\\d.]+,[\\d.]+\\)">`));
  }
  sehat(tokoh.buat({ x: 400 }) + tokoh.buat({ x: 900 }) + tokoh.buat({ x: 400, seed: 2 }), 'tiga tokoh satu svg');
  const s = tokoh.buat({ arketipe: 'raja', id: 'rajaKu' });
  assert.match(s, /^<g id="rajaKu"/);
  assert.equal(tokoh.buat({ arketipe: 'raja' }), tokoh.buat({ arketipe: 'raja' }), 'opsi sama → string sama');
  assert.match(s, /<pattern id="rajaKu-kain"/, 'kain raja bermotif pustaka.kain (detail 2)');
  assert.equal((s.match(/data-tangan="/g) || []).length, 8, 'empat varian tangan × dua tangan');
  assert.equal((s.match(/data-tangan="[^"]+"(?! display)/g) || []).length, 2, 'hanya satu varian tampil per tangan');
});

test('kanvas gerak(): t sama lewat jalur seek berbeda → panggilan gambar identik; kanvas dihapus penuh tiap frame', () => {
  const { tokoh, sumber, HTMLElement, setJam, semua } = muat();
  const B = new HTMLElement(); B.parentNode = null;
  sumber('obor1', { x: 900, y: 600, bidang: B, kedip: .3 });
  const D = tokoh.kerumunan({ seed: 3, n: 6, area: [200, 800, 1200, 100], ragam: ['rakyat', 'prajurit'] });
  D.push({ id: 'pahlawan', arketipe: 'raja', x: 700, y: 950, tinggi: 600, kunci: [[0, 'berdiri'], [1, 'jalan', { laju: 200 }], [3, 'sembah']] });
  const c = tokoh.gerak(B, D, { cahaya: 'obor1', lantai: 950 });
  assert.equal(c.className, 'wv-tokoh');
  assert.ok(c.width > 300 && c.height > 300, `kanvas ${c.width}×${c.height} terlalu kecil untuk jangkauan tokoh`);
  const kk = semua.filter(k => k.className !== 'wv-pendar'), foto = t => { kk.forEach(k => k.log.length = 0); setJam(t); return JSON.stringify(kk.map(k => k.log)); };
  const a = foto(2.2); foto(9); foto(.1); foto(4); const b = foto(2.2), d = foto(2.3);
  assert.equal(a, b, 'seek 2,2 → 9 → ,1 → 4 → 2,2 menggambar berbeda dengan seek 2,2 langsung');
  assert.notEqual(a, d, 'gambar beku antara t 2,2 dan 2,3');
  assert.match(a, /"clearRect",0,0,/, 'kanvas tidak dihapus penuh');
  assert.match(a, /"filter","blur/, 'rim/bayangan pakai blur kanvas');
  const nol = foto(0); foto(2.3); B.style.display = 'none';
  assert.equal(foto(2.4), nol, 'bidang tersembunyi harus menggambar pose t 0 sekali (isi kanvas = fungsi murni t dan tampil)');
  assert.ok(JSON.parse(foto(2.6)).every(l => !l.length), 'bidang tersembunyi menggambar ulang tiap frame (biaya sia-sia)');
  B.style.display = ''; assert.ok(JSON.parse(foto(2.4)).some(l => l.length), 'bidang tampil lagi tidak menggambar');
});

test('opsi salah ditolak dengan pesan Indonesia yang jelas', () => {
  const { tokoh, HTMLElement } = muat();
  const tolak = (f, re) => assert.throws(f, re);
  tolak(() => tokoh.buat({ tingi: 4 }), /^Error: tokoh\.buat: opsi tidak dikenal: tingi \(x y tinggi arketipe arah hadap pose seed detail cahaya jarak id badan kulit kostum fase\)$/);
  tolak(() => tokoh.buat({ arketipe: 'patih' }), /tokoh\.buat: arketipe tidak dikenal: patih \(rakyat raja prajurit resi petani putri\)/);
  tolak(() => tokoh.buat({ arah: 'belakang' }), /arah tidak dikenal: belakang \(tigaperempat depan samping\)/);
  tolak(() => tokoh.buat({ pose: 'menari' }), /pose tidak dikenal: menari \(berdiri menunjuk sembah tombak bersila silasembah meraih bawa\)/);
  tolak(() => tokoh.buat({ tinggi: 0 }), /tinggi harus > 0 \(dapat 0\)/);
  tolak(() => tokoh.buat({ detail: 3 }), /detail harus 0, 1, atau 2/);
  tolak(() => tokoh.buat({ cahaya: 'tidakada' }), /sumber tidak dikenal: tidakada/);
  tolak(() => tokoh.buat({ kostum: { bawa: ['keris'] } }), /benda tidak dikenal: keris \(tombak tongkat cangkul payung perisai sesaji\)/);
  tolak(() => tokoh.buat({ id: '9a' }), /id diawali huruf/);
  tolak(() => tokoh.pose('tidakAda', [[0, 'berdiri']], 0), /tokoh\.pose: tokoh tidak dikenal: tidakAda/);
  tokoh.buat({ id: 'k' });
  tolak(() => tokoh.pose('k', [[2, 'berdiri'], [1, 'sembah']], 0), /tokoh\.gerak: kunci harus urut waktu \(kunci 1: 1\)/);
  tolak(() => tokoh.pose('k', [[0, 'terbang']], 0), /pose tidak dikenal: terbang \(jalan berdiri/);
  tolak(() => tokoh.gerak({}, [{}]), /tokoh\.gerak: bidang wajib elemen HTML/);
  tolak(() => tokoh.gerak(new HTMLElement(), []), /daftar harus larik tokoh/);
  tolak(() => tokoh.kerumunan({ area: [1, 2, 3] }), /area harus \[x, y, lebar, tinggi\]/);
  tolak(() => tokoh.kerumunan({ ragam: ['dewa'] }), /ragam tidak dikenal: dewa/);
});
