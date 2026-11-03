#!/usr/bin/env node
/* UJI PETA RELIEF: fungsi murni src/runtime/peta-relief.js (proyeksi, dekode data Natural Earth, medan: tinggi deterministik, puncak
   gunung = data GVP, pantai & garis 200 m, sungai turun ke laut; jalurRute berparameter panjang busur). kamera.js + terbang.js +
   peta-relief.js dijalankan lewat new Function seperti test-elang.mjs — tanpa browser, tanpa three.
   Pakai: node --test scripts/test-peta.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const baca = f => readFile(new URL('../src/runtime/' + f, import.meta.url), 'utf8');
const src = (await baca('kamera.js')) + '\n' + (await baca('terbang.js')) + '\n' + (await baca('peta-relief.js'));
const muat = () => new Function('tl', 'W', 'H', '$', 'rig', 'applyCam', 'gsap', src +
  ';return {JAWA,proyeksi,lonlat,dekode,medan,jalurRute}')({}, 1920, 1080, () => null, null, () => {}, {});
const K = muat(), M = K.medan();
const di = (lon, lat) => M.tinggi(...K.proyeksi(lon, lat));
const acak = (a => () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(11);

test('proyeksi: pusat (110 BT, 7,3 LS) = asal, bolak-balik tepat, jarak ≈ haversine (≤ 0,5 %)', () => {
  assert.deepEqual(K.proyeksi(110, -7.3).map(v => Math.abs(v)), [0, 0]);
  for (const [lon, lat] of [[105.2, -6.8], [114.6, -8.3], [112.922, -8.108]]) {
    const [a, b] = K.lonlat(...K.proyeksi(lon, lat)); assert.ok(Math.abs(a - lon) < 1e-9 && Math.abs(b - lat) < 1e-9);
  }
  const [mx, mz] = K.proyeksi(110.446, -7.54), [sx, sz] = K.proyeksi(112.922, -8.108), r = Math.PI / 180,   // Merapi → Semeru
    hav = 2 * 6371.0088 * Math.asin(Math.sqrt(Math.sin((-8.108 + 7.54) * r / 2) ** 2 + Math.cos(-7.54 * r) * Math.cos(-8.108 * r) * Math.sin((112.922 - 110.446) * r / 2) ** 2)),
    d = Math.hypot(sx - mx, sz - mz);
  assert.ok(Math.abs(d / hav - 1) < .005, `${d.toFixed(1)} km vs haversine ${hav.toFixed(1)} km`);
  assert.ok(sx > mx && sz > mz, 'Semeru di timur (x+) dan selatan (z+) Merapi');
});

test('dekode: garis pantai Natural Earth utuh — Jawa cincin terbesar, luas ≈ 10,33 deg² (NE 10m), semua titik di kotak data', () => {
  const R = K.dekode(K.JAWA.pantai), [x0, y0, x1, y1] = K.JAWA.pantai.kotak, luas = r => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
  assert.ok(R.length >= 10, `${R.length} cincin`);
  assert.ok(R.flat().every(([x, y]) => x >= x0 - 1e-9 && x <= x1 + 1e-9 && y >= y0 - 1e-9 && y <= y1 + 1e-9), 'titik di luar kotak data');
  const jawa = R.reduce((a, b) => luas(a) > luas(b) ? a : b), xs = jawa.map(p => p[0]), ys = jawa.map(p => p[1]);
  assert.ok(Math.abs(luas(jawa) / 10.333 - 1) < .02, `luas Jawa ${luas(jawa).toFixed(3)} deg²`);
  assert.ok(Math.abs(Math.min(...xs) - 105.22) < .03 && Math.abs(Math.max(...xs) - 114.62) < .03 && Math.abs(Math.min(...ys) + 8.78) < .03 && Math.abs(Math.max(...ys) + 5.88) < .03,
    `kotak Jawa ${[Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(v => v.toFixed(2))}`);
  assert.throws(() => K.dekode({ q: .002, s: 'A*' }), /huruf asing/);
  assert.equal(K.dekode(K.JAWA.dalam).length > 0, true);
});

test('medan deterministik: dua bangunan medan() memberi tinggi identik (seed sama), seed lain mengubah relief', () => {
  const N = K.medan(), L = muat().medan(undefined, { seed: 4 });
  let beda = 0;
  for (let i = 0; i < 400; i++) { const x = -560 + acak() * 1200, z = -180 + acak() * 360;
    assert.equal(N.tinggi(x, z), M.tinggi(x, z), `(${x}, ${z})`); if (L.tinggi(x, z) !== M.tinggi(x, z)) beda++; }
  assert.ok(beda > 50, `seed 4 hanya mengubah ${beda} dari 400 titik`);
});

test('gunung: puncak = elevasi GVP (≤ 20 m) di koordinat GVP, kawah cekung di bawah bibir, kaki tanpa lonjakan', () => {
  for (const g of M.gunung) {
    let maks = -1;   // puncak = bibir kawah (GVP) atau titik pusat; sapu cakram kecil
    for (let a = 0; a < 48; a++) for (const r of [0, .1, .2, .3, .45, .55, .7, .8, 1, 1.2]) maks = Math.max(maks, M.tinggi(g.x + r * Math.cos(a / 48 * 2 * Math.PI), g.z + r * Math.sin(a / 48 * 2 * Math.PI)));
    assert.ok(Math.abs(maks - g.E) <= .02, `${g.nama}: puncak ${maks.toFixed(3)} km, GVP ${g.E} km`);
  }
  const kelud = M.gunung.find(g => g.nama === 'Kelud');
  assert.ok(M.tinggi(kelud.x, kelud.z) < kelud.E - .15, 'Kelud: dasar kawah harus di bawah bibir');
  const t = M.gunung.find(g => g.nama === 'Tengger'), [rb, hb] = t.kaldera;
  assert.ok(Math.abs(M.tinggi(t.x + rb, t.z) - hb) < .15 && M.tinggi(t.x + 2.6, t.z) < hb - .3, 'Tengger: bibir kaldera tinggi, lantai pasir rendah');
  for (const g of M.gunung) { const d = g.R * 1.19;   // di luar kaki (R tak bulat ≤ +18 %): tinggi ditentukan dataran, bukan kerucut
    assert.ok(M.kerucut(g, g.x + d, g.z) === 0 && M.kerucut(g, g.x, g.z - d) === 0, `${g.nama}: kerucut bocor di luar jari kaki`); }
});

test('pantai & laut: kota di darat (> 0), laut < 0, garis 200 m tepat di tepi poligon Natural Earth', () => {
  for (const [n, lon, lat] of [['Yogyakarta', 110.36, -7.8], ['Surakarta', 110.82, -7.57], ['Bandung', 107.6, -6.92], ['Kediri', 112.01, -7.82], ['Malang', 112.63, -7.98]])
    assert.ok(di(lon, lat) > 0, `${n} harus darat (${di(lon, lat)})`);
  for (const [n, lon, lat] of [['Laut Jawa', 110, -6], ['Samudra Hindia', 110, -8.8], ['Selat Madura', 113, -7.3]]) assert.ok(di(lon, lat) < 0, `${n} harus laut`);
  assert.ok(di(110, -6) > -.2 && di(110, -8.8) < -.2, 'Laut Jawa = paparan (< 200 m), Samudra Hindia = laut dalam');
  for (const lon of [107, 109, 111, 113]) {   // dari pantai selatan ke laut lepas: tempat −0,2 km = tepi poligon K_200
    let a = -7.0, b = -9.6;
    for (let k = 0; k < 40; k++) { const m = (a + b) / 2; di(lon, m) > -.2 ? a = m : b = m; }
    const [x, z] = K.proyeksi(lon, a);
    assert.ok(M.laut.jarak(x, z) < .5, `lon ${lon}: −200 m di ${a.toFixed(3)} LS, ${M.laut.jarak(x, z).toFixed(2)} km dari garis NE`);
  }
});

test('sungai: muka air tak pernah naik ke hilir, berakhir di pantai, mengalir di lembah (tak pernah di atas kedua tebing = tanggul)', () => {
  for (const s of M.sungai) {
    assert.ok(s.air.every((h, i) => !i || h <= s.air[i - 1] + 1e-12), `${s.nama}: muka air naik`);
    assert.ok(s.air.at(-1) < .05 && s.air[0] > s.air.at(-1), `${s.nama}: air ${s.air[0]} → ${s.air.at(-1)}`);
    const [x, z] = s.p.at(-1); assert.ok(M.darat.jarak(x, z) < 3, `${s.nama}: muara ${M.darat.jarak(x, z).toFixed(1)} km dari pantai`);
    for (let i = 3; i < s.p.length - 3; i += 5) { const [x, z] = s.p[i], a = s.p[i - 1], b = s.p[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (a[1] - b[1]) / l, uz = (b[0] - a[0]) / l, h = M.tinggi(x, z);
      assert.ok(h >= s.air[i] - 1e-9 && h <= Math.max(M.tinggi(x + ux * 3, z + uz * 3), M.tinggi(x - ux * 3, z - uz * 3)) + .005, `${s.nama} sampel ${i}: alur ${h.toFixed(3)} di atas kedua tebing 3 km (tanggul) atau di bawah muka air ${s.air[i].toFixed(3)}`); }
  }
  assert.deepEqual(M.sungai.map(s => s.nama).slice(0, 2), ['Bengawan Solo', 'Brantas']);
});

test('jalurRute: berparameter panjang busur (laju seragam), ujung menempel tanah, puncak busur di tengah', () => {
  const titik = [[110.491, -7.752], [111.35, -7.5], [112.25, -7.54]], J = K.jalurRute(M, titik, { tegak: 4, puncak: 22, turun: 1.2 });
  const du = 1e-3; let min = Infinity, maks = 0;
  for (let u = 0; u < 1 - du; u += du) { const l = Math.hypot(...J.pos(u + du).map((v, k) => v - J.pos(u)[k])) / (du * J.L); min = Math.min(min, l); maks = Math.max(maks, l); }
  assert.ok(min > .97 && maks < 1.03, `laju busur ${min.toFixed(3)}–${maks.toFixed(3)} × L`);
  for (const [u, [lon, lat]] of [[0, titik[0]], [1, titik[2]]]) {
    const [x, y, z] = J.pos(u), [ex, ez] = K.proyeksi(lon, lat);
    assert.ok(Math.hypot(x - ex, z - ez) < 1e-6 && Math.abs(y - (Math.max(0, M.tinggi(ex, ez)) * 4 + 1.2)) < 1e-6, `ujung ${u}: ${[x, y, z]}`);
  }
  const ys = Array.from({ length: 101 }, (_, i) => J.pos(i / 100)[1]), iMaks = ys.indexOf(Math.max(...ys));
  assert.ok(iMaks > 35 && iMaks < 65 && Math.max(...ys) > 22, `puncak busur di u ${iMaks / 100}, y ${Math.max(...ys).toFixed(1)}`);
  assert.equal(J.pos(.37).join(), K.jalurRute(M, titik, { tegak: 4, puncak: 22, turun: 1.2 }).pos(.37).join(), 'deterministik');
});
