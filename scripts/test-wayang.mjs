#!/usr/bin/env node
/* UJI WAYANG: fungsi murni src/runtime/wayang.js (bare script, dijalankan lewat new Function bersama atmosfer.js) tanpa browser: IK lengan,
   kedip deterministik, blur + skala menurut jarak ke kelir, kunci gerak murni waktu, tabel pakem konsisten, rancangan ber-seed, gunungan.
   Kanvas diuji di test-starters (WAYANG_UJI). Pakai: node --test scripts/test-wayang.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const baca = n => readFileSync(new URL(`../src/runtime/${n}.js`, import.meta.url), 'utf8');
const { wayang, BLENCONG } = new Function('tl', 'W', 'H', 'window', 'document', '$', baca('atmosfer') + '\n' + baca('wayang') + ';return {wayang,BLENCONG}')(
  { time: () => 0, eventCallback: () => null }, 1920, 1080, {}, {}, () => null);
const { proyeksi, kedipan, terang, ik, keadaan, siapKunci, poseLengan, rancang, rancangKayon, tatah, jalur, JENIS, MUKA, PIHAK, POSE, TATAH } = wayang;
const dekat = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);

test('IK: telapak sampai target dalam jangkauan, di luar jangkauan dijepit lurus, siku di sisi yang diminta', () => {
  const [a1, a2, ex, ey, hx, hy] = ik(240, 335, 300, -200);
  dekat(hx, 300); dekat(hy, -200); dekat(Math.hypot(ex, ey), 240); dekat(Math.hypot(hx - ex, hy - ey), 335);
  dekat(ex, 240 * Math.sin(a1)); dekat(hx - ex, 335 * Math.sin(a2));
  const j = ik(240, 335, 900, 0); dekat(Math.hypot(j[4], j[5]), 575, 1e-3); dekat(j[5], 0);
  const atas = ik(240, 335, 300, 100, 1), bawah = ik(240, 335, 300, 100, -1);
  assert.ok(atas[2] !== bawah[2], 'sisi siku tidak mengubah apa pun');
  const G = rancang('alusan', 1), P = poseLengan(G, G.bahuD, POSE.nuding);
  dekat(P.telapak[0], POSE.nuding[0], 1e-6); dekat(P.telapak[1], POSE.nuding[1], 1e-6);
});

test('kedip: fungsi murni t + seed, dalam rentang, kedip 0 = tenang, seed beda = api beda', () => {
  const T = [0, .3, 1.7, 5, 9.13, 21.9];
  assert.deepEqual(T.map(t => kedipan(t, 3, .5)), T.map(t => kedipan(t, 3, .5)));
  for (let t = 0; t < 30; t += .07) { const k = kedipan(t, 3, 1); assert.ok(k.kuat <= 1 && k.kuat >= .44, `kuat ${k.kuat}`); assert.ok(Math.abs(k.dx) <= 13 && Math.abs(k.dy) <= 11); }
  { const k = kedipan(4.2, 3, 0); assert.ok(k.kuat === 1 && !k.dx && !k.dy, 'kedip 0 harus tenang'); }
  assert.notDeepEqual(kedipan(4.2, 3, .5), kedipan(4.2, 4, .5));
  assert.notDeepEqual(kedipan(4.2, 3, .5), kedipan(4.25, 3, .5), 'api tidak hidup');
});

test('bayangan: menempel kelir = tajam & 1:1; makin dekat lampu makin besar dan kabur (proyeksi pusat)', () => {
  const q0 = proyeksi(0, 620, 24); assert.deepEqual([q0.skala, q0.blur], [1, 0]);
  dekat(proyeksi(310, 620, 24).skala, 2); dekat(proyeksi(310, 620, 24).blur, 24);
  let s = 1, b = 0; for (let z = 5; z < 500; z += 5) { const q = proyeksi(z, 620, 24); assert.ok(q.skala > s && q.blur > b); s = q.skala; b = q.blur; }
  assert.ok(proyeksi(6, 620, 24).blur < .3, 'figur di kelir harus tajam');
  assert.ok(proyeksi(9999, 620, 24).skala < 7, 'z di balik lampu harus dijepit');
  assert.deepEqual(proyeksi(100), proyeksi(100, BLENCONG.jarak, BLENCONG.nyala));
  assert.ok(terang(0) > terang(300) && terang(300) > terang(900) && terang(5000) >= .2);
});

test('kunci gerak: murni waktu, tanpa lompatan, langkah kembali ke nol, kunci salah ditolak', () => {
  const F = siapKunci({ x: 100, tanganD: 'anjujur' }, [[1, { x: 700 }, { durasi: 2, langkah: 100, tinggi: 20 }], [3.5, { z: 200, tanganD: 'nuding' }, { durasi: 1 }], [6, { z: 6 }, { durasi: .5, keras: 1 }]]);
  const urut = []; for (let t = 0; t < 8; t += .01) urut.push(keadaan(F, t));
  const acak = [7.3, .4, 5, 2.2].map(t => keadaan(F, t)); assert.deepEqual(acak[0], keadaan(F, 7.3)); assert.deepEqual(acak[1], keadaan(F, .4));
  for (let i = 1; i < urut.length; i++) for (const k of ['x', 'y', 'z']) assert.ok(Math.abs(urut[i][k] - urut[i - 1][k]) < 13, `${k} melompat di t ${i / 100}`);
  dekat(keadaan(F, 3.2).y, 0); dekat(keadaan(F, 3.2).x, 700); assert.ok(keadaan(F, 1.75).y < -1, 'berjalan harus naik-turun');
  dekat(keadaan(F, 7).z, 6); assert.deepEqual(keadaan(F, 5).tanganD, POSE.nuding);
  const Getar = siapKunci({}, [[0, { getar: 1 }, { durasi: .1 }]]); assert.notEqual(keadaan(Getar, 2).miring, keadaan(Getar, 2.2).miring, 'getar kayon mati');
  assert.throws(() => siapKunci({}, [[1, { tinggi: 3 }]]), /kunci tidak dikenal: tinggi/);
  assert.throws(() => siapKunci({}, [[2, { x: 1 }], [1, { x: 2 }]]), /urut waktu/);
  assert.throws(() => siapKunci({}, [[1, { tanganD: 'terbang' }]]), /pose tangan tidak dikenal: terbang \(belakang anjujur/);
});

test('tabel pakem: golongan, sisi simpingan, cermin penonton, warna muka', () => {
  assert.deepEqual(Object.keys(JENIS).sort(), ['alusan', 'gagahan', 'putri', 'raksasa']);
  const c = (j, o) => { for (const k in o) assert.equal(JENIS[j][k], o[k], `${j}.${k}`); };
  c('alusan', { sikap: 'bokongan', mata: 'gabahan', hidung: 'wali miring', kepala: 'luruh', simping: 'kanan', gerak: 2 });
  c('gagahan', { sikap: 'jangkahan', mata: 'kedhelen', hidung: 'bentulan', kepala: 'longok' });
  c('raksasa', { sikap: 'jangkahan', mata: 'plelengan', hidung: 'pelokan', mulut: 'gusen', simping: 'kiri', gerak: 1, muka: 'merah' });
  c('putri', { mata: 'gabahan', hidung: 'wali miring', kepala: 'oyi', sikap: 'samparan', gerak: 2 });
  assert.ok(JENIS.alusan.tunduk > 0 && JENIS.putri.tunduk > 0 && JENIS.raksasa.tunduk < 0, 'luruh menunduk, lanyapan menengadah');
  assert.ok(JENIS.putri.tinggi < JENIS.alusan.tinggi && JENIS.alusan.tinggi < JENIS.gagahan.tinggi && JENIS.gagahan.tinggi < JENIS.raksasa.tinggi);
  for (const j in JENIS) { assert.ok(MUKA[JENIS[j].muka], `${j}.muka`); const G = rancang(j, 1); assert.equal(G.bahuB == null, JENIS[j].gerak === 1, `${j}: jumlah lengan bersendi`); }
  assert.deepEqual(PIHAK.kanan, { layar: 'kiri', hadap: 'kanan' }); assert.deepEqual(PIHAK.kiri, { layar: 'kanan', hadap: 'kiri' });
});

test('rancangan: seed sama = data sama, seed beda = motif beda, golongan tetap; tatah ada di semua figur', () => {
  for (const j in JENIS) {
    const a = rancang(j, 5), b = rancang(j, 5), d = rancang(j, 6);
    assert.equal(JSON.stringify(a), JSON.stringify(b), `${j}: tidak deterministik`);
    assert.notEqual(JSON.stringify(a), JSON.stringify(d), `${j}: seed tak berpengaruh`);
    assert.deepEqual(a.bagian.map(p => p.n).filter(n => n === 'muka'), ['muka'], `${j}: tepat satu muka`);
    const n = (a.lubang.match(/M/g) || []).length; assert.ok(n > 250, `${j}: tatah terlalu jarang (${n} lubang)`);
    for (const p of a.bagian) assert.match(p.d, /^M[-\d.,]+C[-\d.,CZ ]+Z$/, `${j}.${p.n}`);
    assert.match(a.lubang, /^[MLCZa\d.,\- ]+$/);
  }
  assert.ok(rancang('raksasa', 1).bagian.some(p => p.n === 'lenganTetap'), 'raksasa: tangan belakang harus digambar tetap');
  assert.ok(rancang('raksasa', 1).atas.some(p => p.n === 'gigi'), 'raksasa: gusen = gigi dan taring');
  for (const n in TATAH) { const s = tatah(n, [[0, 0], [100, 0]], 3); assert.ok(s.length > 20, n); assert.ok(s.includes('Z')); }
  assert.throws(() => tatah('renda', [[0, 0], [1, 1]]), /jenis tidak dikenal: renda \(bubukan/);
  assert.match(jalur([[0, 0], [10, 0, 1], [10, 10]]), /^M0,0C/);
});

test('gunungan: siluet simetris meruncing + isi pakem gapuran', () => {
  const K = rancangKayon(3), g = K.garis;
  const xs = g.map(p => p[0]); dekat(Math.min(...xs), -Math.max(...xs), 1e-9);
  for (const [x, y] of g) assert.ok(g.some(([a, b]) => Math.abs(a + x) < 1e-9 && Math.abs(b - y) < 1e-9), `tak simetris di ${x},${y}`);
  const puncak = g.reduce((a, p) => (p[1] < a[1] ? p : a)); assert.deepEqual(puncak.slice(0, 2), [0, -1000]);
  const w = new Set(K.lapis.map(l => l.w)); for (const n of ['batang', 'dahan', 'daun', 'naga', 'banaspati', 'banteng', 'macan', 'kera', 'burung', 'gapura', 'penjaga', 'lapik']) assert.ok(w.has(n), `kayon tanpa ${n}`);
  assert.equal(JSON.stringify(rancangKayon(3)), JSON.stringify(K)); assert.notEqual(JSON.stringify(rancangKayon(4)), JSON.stringify(K));
});

test('penolakan figur: panakawan belum ada (dengan alasan), opsi salah menyebut pilihan sah', () => {
  wayang.PANGGUNG.opsi = { sisi: 'bayang', tinggi: 560, res: 1, dasar: 980 };
  assert.throws(() => wayang.figur({ jenis: 'panakawan' }), /panakawan belum ada.*Semar/);
  assert.throws(() => wayang.figur({ jenis: 'naga' }), /jenis tidak dikenal: naga \(alusan gagahan raksasa putri gunungan\)/);
  assert.throws(() => wayang.figur({ warna: 1 }), /opsi tidak dikenal: warna/);
  assert.throws(() => wayang.figur({ hadap: 'atas' }), /hadap tidak dikenal/);
  assert.throws(() => wayang.figur({ muka: 'hijau' }), /muka tidak dikenal: hijau/);
});
