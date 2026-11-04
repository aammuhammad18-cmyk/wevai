#!/usr/bin/env node
/* UJI DIORAMA: bagian murni src/runtime/diorama.js dan src/runtime/pura-bali.js — denah tri mandala (urutan zona kelod → kaja, gerbang di
   batas yang benar, tumpang meru ganjil, letak bangunan), matematika pita tilt-shift, arah lambung, dan tata kartu ber-seed. Blok dijalankan
   lewat new Function dengan THREE palsu, tanpa browser dan tanpa GPU. Piksel (garis ada, tilt-shift, determinisme): DIORAMA_UJI di test-starters.
   Pakai: node --test scripts/test-diorama.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const baca = f => readFileSync(new URL('../src/runtime/' + f, import.meta.url), 'utf8');
const HASH = 'const hash=(i,s)=>{let x=(Math.imul(i,374761393)+Math.imul(s,668265263))|0;x=Math.imul(x^x>>>13,1274126177);return((x^x>>>16)>>>0)/4294967296;};';
class P { constructor() { this.uniforms = {}; } }
const THREE = { ShaderMaterial: class {}, Vector2: class {}, Vector3: class {} };
const composer = { passes: [{}, {}], insertPass() {} };
assert.ok(baca('kamera.js').includes(HASH), 'hash test ini harus sama dengan kamera.js');
const { diorama, pura, TRI_MANDALA, TILT } = new Function('THREE', 'ShaderPass', 'composer', 'W', 'H', 'mergeGeometries', 'scene', 'camera', 'renderer', 'key', 'LUX', 'document', 'URL', 'Image', 'Blob',
  HASH + baca('diorama.js') + '\n' + baca('pura-bali.js') + ';return {diorama,pura,TRI_MANDALA,TILT}')(THREE, P, composer, 1920, 1080);

/* R palsu: mencatat kepingan (kotak = wb,db = wa,da) */
const catat = () => { const k = [], R = {
  kotak: (x, y, z, w, h, d, warna, o) => k.push({ x, y, z, wb: w, db: d, h, warna, o }),
  prisma: (x, y, z, wb, db, wa, da, h, warna, o) => k.push({ x, y, z, wb, db, wa, da, h, warna, o, prisma: true }) }; return { k, R }; };
const dalam = (b, x, z, w, d) => x >= b.x - w && x <= b.x + w && z >= b.z - d && z <= b.z + d;
const Z = id => TRI_MANDALA.zona.find(q => q.id === id);

test('zona: urut kelod → kaja, bersambung, lantai naik menuju kaja', () => {
  const zs = TRI_MANDALA.zona;
  assert.deepEqual(zs.map(q => q.id), ['nista', 'madya', 'utama']);
  for (let i = 0; i < zs.length; i++) {
    assert.ok(zs[i].z[0] > zs[i].z[1], `${zs[i].id}: z[0] sisi kelod (+z), z[1] sisi kaja (−z)`);
    if (i) { assert.equal(zs[i].z[0], zs[i - 1].z[1], 'zona bersambung tanpa celah'); assert.ok(zs[i].y > zs[i - 1].y, 'lantai naik ke arah kaja'); }
  }
  assert.deepEqual(zs.map(q => q.jaba), ['jaba sisi', 'jaba tengah', 'jeroan']);
});

test('gerbang: candi bentar nista → madya, kori agung madya → utama, tepat di batas zona', () => {
  const [a, b] = TRI_MANDALA.gerbang;
  assert.deepEqual([a.jenis, a.dari, a.ke], ['candiBentar', 'nista', 'madya']);
  assert.deepEqual([b.jenis, b.dari, b.ke], ['koriAgung', 'madya', 'utama']);
  for (const g of [a, b]) assert.equal(g.z, Z(g.dari).z[1]);
});

test('bangunan: di dalam zonanya dan di tempat kanoniknya', () => {
  const B = TRI_MANDALA.bangunan, L = TRI_MANDALA.lebar / 2;
  for (const b of B) { const q = Z(b.zona); assert.ok(b.z < q.z[0] && b.z > q.z[1] && Math.abs(b.x) < L, `${b.jenis} di luar ${b.zona}`); }
  const satu = j => B.filter(b => b.jenis === j);
  const merus = satu('meru'), [pad] = satu('padmasana'), [kul] = satu('baleKulkul'), [wan] = satu('wantilan'), [gong] = satu('baleGong'), [paw] = satu('balePawedan');
  assert.ok(merus.length >= 1); for (const m of merus) { assert.equal(m.zona, 'utama'); assert.equal(m.tumpang % 2, 1, 'tumpang ganjil'); assert.equal(m.hadap, 'kauh'); assert.ok(m.x > 0, 'deret meru di sisi kangin, menghadap kauh'); }
  const U = Z('utama'), tengahU = (U.z[0] + U.z[1]) / 2;
  assert.equal(pad.zona, 'utama'); assert.ok(pad.x > 0 && pad.z < tengahU, 'padmasana di kaja-kangin utama'); assert.equal(pad.hadap, 'kauh');
  const M = Z('madya'), tengahM = (M.z[0] + M.z[1]) / 2;
  assert.equal(kul.zona, 'madya'); assert.ok(kul.x < 0 && kul.z > tengahM, 'bale kulkul di kelod-kauh madya');
  assert.equal(wan.zona, 'nista'); assert.equal(gong.zona, 'madya'); assert.equal(paw.zona, 'utama');
  for (const b of B) assert.ok(!/dewa|arca|sesaj/i.test(JSON.stringify(b)), 'denah tanpa arca atau sesajen');
});

test('meru: hanya tumpang ganjil 3–11; jumlah atap yang dirakit = tumpang', () => {
  for (const n of [2, 4, 1, 13, 3.5]) assert.throws(() => pura.tingkatMeru(n), /ganjil/);
  for (const n of [3, 5, 7, 9, 11]) { const T = pura.tingkatMeru(n); assert.equal(T.length, n);
    for (let i = 1; i < n; i++) { assert.ok(T[i].y > T[i - 1].y, 'atap naik'); assert.ok(T[i].wb < T[i - 1].wb, 'atap mengecil'); } }
  const { k, R } = catat(); pura.bangun(R);
  const atap = k.filter(p => p.prisma && p.warna === pura.PALET.ijuk), perMeru = TRI_MANDALA.bangunan.filter(b => b.jenis === 'meru');
  assert.equal(atap.length, perMeru.reduce((s, m) => s + m.tumpang, 0));
  for (const m of perMeru) assert.equal(atap.filter(p => p.x === m.x && p.z === m.z).length, m.tumpang, `meru di z ${m.z}`);
});

test('rakitan: deterministik, simetri candi bentar, sisi dalam rata, tanpa atap di celah', () => {
  const a = catat(), b = catat(); pura.bangun(a.R); pura.bangun(b.R); assert.deepEqual(a.k, b.k);
  const celah = 2.8, zb = TRI_MANDALA.gerbang[0].z, belah = a.k.filter(p => p.o?.garis !== false && p.z === zb && Math.abs(p.x) >= celah / 2 && Math.abs(p.x) < 3.6 && p.wb <= 4.7 && !p.prisma);
  const kanan = belah.filter(p => p.x > 0), kiri = belah.filter(p => p.x < 0);
  assert.ok(kanan.length >= 10); assert.equal(kanan.length, kiri.length);
  for (const p of kanan) assert.ok(Math.abs(p.x - p.wb / 2 - celah / 2) < 1e-9, 'sisi dalam rata pada ½ celah');
  for (const p of a.k.filter(p => p.z === zb && p.y > 1)) assert.ok(Math.abs(p.x) - p.wb / 2 >= celah / 2 - .011, 'tidak ada kepingan di atas celah (tanpa atap)');
});

test('padmasana: mengecil ke atas sampai badan dara, puncak bersandaran di belakang tanpa atap di atas rong; bahan terpetakan', () => {
  const { k, R } = catat(); pura.bangun(R); const [pad] = TRI_MANDALA.bangunan.filter(b => b.jenis === 'padmasana'), bagian = k.filter(p => Math.abs(p.x - pad.x) < 3.3 && Math.abs(p.z - pad.z) < 3.3);
  const tengah = bagian.filter(p => p.x === pad.x && p.z === pad.z);
  assert.ok(tengah[0].wb > 6 && tengah.at(-1).wb < 2.2, 'tepas lebar, sari sempit');
  assert.ok(tengah.length >= 15, 'pepalihan terlalu sedikit');
  const tinggi = Math.max(...tengah.map(p => p.y + p.h)), atas = bagian.filter(p => p.y >= tinggi - 1e-9);
  const dx = pad.hadap === 'kauh' ? -1 : 1;
  for (const p of atas.filter(p => p.y > tinggi + .6)) assert.ok((p.x - pad.x) * dx < 0, 'di atas rong hanya sandaran di belakang: tanpa atap');
  for (const w of ['bata', 'paras', 'ijuk', 'alang']) assert.ok(pura.BAHAN[pura.PALET[w]] > 0, `bahan ${w}`);
});

test('tilt: nol di dalam pita, naik monoton keluar, simetris, jenuh di kuat; kuat 0 = mati', () => {
  const o = { pusat: .5, lebar: .1, lunak: .2, kuat: 12 }, r = y => diorama.jariTilt(y, o);
  for (const y of [.4, .45, .5, .55, .6]) assert.equal(r(y), 0);
  assert.equal(r(.75), r(.25)); assert.equal(r(0), 12); assert.equal(r(1), 12);
  for (let y = .6, p = 0; y <= 1; y += .02) { assert.ok(r(y) >= p); p = r(y); }
  assert.equal(diorama.jariTilt(0, { ...o, kuat: 0 }), 0);
  assert.ok(diorama.jariTilt(.9, { ...o, pusat: .8 }) < r(.9), 'pita mengikuti pusat');
  assert.ok(TILT.kuat > 0 && TILT.lebar > 0);
});

test('tilt: shader memakai rumus yang sama dengan jariTilt', () => {
  const src = baca('diorama.js');
  assert.match(src, /clamp\(\(abs\(1\.-vUv\.y-pusat\)-lebar\)\/max\(lunak,1e-4\),0\.,1\.\),r=kuat\*t\*t\*\(3\.-2\.\*t\)/);
});

test('arah lambung: sudut kotak dirata-rata, sama di semua muka yang bertemu', () => {
  /* tiga muka bertemu di (1,1,1): normal x, y, z */
  const p = new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1, -1, 0, 0]), n = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, -1, 0, 0]), a = diorama.arahLambung(p, n), k = 1 / Math.sqrt(3);
  for (let i = 0; i < 9; i++) assert.ok(Math.abs(a[i] - k) < 1e-6);
  assert.deepEqual([...a.slice(9)], [-1, 0, 0]);
});

test('tata kartu: seed sama = hasil sama, jarak dijaga, hindari dipatuhi, seed lain = lain', () => {
  const o = { seed: 9, n: 12, area: [-18, -29, 18, 35], jarak: 5, hindari: (x, z) => Math.abs(x) < 14 };
  const a = diorama.tataKartu(o), b = diorama.tataKartu(o);
  assert.deepEqual(a, b); assert.equal(a.length, 12);
  for (const p of a) { assert.ok(Math.abs(p.x) >= 14, 'hindari'); assert.ok(p.x >= -18 && p.x <= 18 && p.z >= -29 && p.z <= 35, 'di area'); }
  for (let i = 0; i < a.length; i++) for (let j = 0; j < i; j++) assert.ok(Math.hypot(a[i].x - a[j].x, a[i].z - a[j].z) >= 5);
  assert.notDeepEqual(a, diorama.tataKartu({ ...o, seed: 10 }));
  assert.ok(diorama.tataKartu({ ...o, area: [0, 0, 1, 1], hindari: () => false, n: 50 }).length < 50, 'area penuh: berhenti, tidak macet');
  assert.throws(() => diorama.tataKartu({ ...o, jarak: 0 }), /jarak/);
});

test('tangga toon: naik, terang penuh di ujung, ≥ 3 tingkat', () => {
  const t = diorama.TANGGA; assert.ok(t.length >= 3); assert.equal(t.at(-1), 1);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1]);
});

test('pemedek: dokumen SVG ber-viewBox, deterministik, tanpa perlengkapan upacara', () => {
  assert.equal(pura.pemedek({ seed: 4 }), pura.pemedek({ seed: 4 }));
  assert.match(pura.pemedek({ seed: 4 }), /viewBox="0 0 100 300"/);
  assert.ok(new Set([1, 2, 3, 4, 5, 6, 7, 8].map(s => pura.pemedek({ seed: s }))).size > 2, 'seed memberi ragam');
});
