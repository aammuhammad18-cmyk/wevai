#!/usr/bin/env node
/* UJI MATA ELANG: matematika murni src/runtime/terbang.js (jalur Catmull-Rom, look-ahead, roll dari kelengkungan,
   guncangan trauma) dan tween yang ditulis terbang(). kamera.js + terbang.js dijalankan lewat new Function dengan tl dan
   gsap palsu, seperti test-kamera.mjs — tanpa browser, tanpa three.
   Pakai: node --test scripts/test-elang.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const baca = f => readFile(new URL('../src/runtime/' + f, import.meta.url), 'utf8');
const src = (await baca('kamera.js')) + '\n' + (await baca('terbang.js'));
const EASE = { none: p => p, 'sine.inOut': p => -(Math.cos(Math.PI * p) - 1) / 2 };
const gsap = { parseEase: e => { if (!EASE[e]) throw new Error('ease palsu tidak dikenal: ' + e); return EASE[e]; } };
function load(mode = 'three') {
  const calls = [];
  const tl = { to: (o, v, at) => calls.push({ m: 'to', o, v, at }), set: (o, v, at) => calls.push({ m: 'set', o, v, at }), time: () => 0 };
  const k = new Function('tl', 'W', 'H', '$', 'rig', 'applyCam', 'console', 'gsap', src +
    ';return {CAM,PLAN,RAILS,pose,noise,cutTo,camTo,jalurElang,terbang,camDefaults}')(tl, 1920, 1080, () => null, null, () => {}, console, gsap);
  k.CAM.mode = mode; if (mode === 'three') k.camDefaults({ fx: 0, fy: 0, fz: 0, dist: 10, yaw: 0, pitch: 0, mm: 35, zoom: 1 });
  return { ...k, calls };
}
const jarak = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const sudut = (a, b) => { const d = a.reduce((s, v, i) => s + v * b[i], 0) / (Math.hypot(...a) * Math.hypot(...b)); return Math.acos(Math.min(1, Math.max(-1, d))) * 180 / Math.PI; };
const S = [[0, 3, 60], [12, 4, 30], [-6, 2.5, 0], [0, 2.5, -20], [0, 30, -70]];

test('Catmull-Rom: melewati tiap titik, kontinu, laju busur seragam, arah tanpa patahan di titik', () => {
  const { jalurElang } = load(), J = jalurElang(S);
  J.U.forEach((u, i) => assert.ok(jarak(J.pos(u), S[i]) < 1e-9, `titik ${i} tidak dilewati: ${J.pos(u)}`));
  const du = 1e-4; let maks = 0, min = Infinity;
  for (let u = 0; u < 1 - du; u += du) { const l = jarak(J.pos(u + du), J.pos(u)) / (du * J.L); maks = Math.max(maks, l); min = Math.min(min, l); }
  assert.ok(maks < 1.03 && min > .97, `laju busur tidak seragam: ${min.toFixed(3)}–${maks.toFixed(3)} × L`);
  for (const u of J.U.slice(1, -1)) {   // C1: arah sebelum dan sesudah titik kontrol nyaris sama
    const a = J.pos(u - 1e-4), b = J.pos(u), c = J.pos(u + 1e-4), d1 = b.map((v, k) => v - a[k]), d2 = c.map((v, k) => v - b[k]);
    assert.ok(sudut(d1, d2) < .5, `patahan ${sudut(d1, d2).toFixed(2)}° di u ${u.toFixed(3)}`);
  }
  assert.throws(() => jalurElang([[1, 2, 3]]), /≥ 2 titik/);
  assert.throws(() => jalurElang([[1, 2, 3], [1, 2, 3]]), /tanpa panjang/);
  assert.throws(() => jalurElang(S, { look: [[0, 0, 0]] }), /look harus 5/);
});

test('look-ahead: tatap = titik jalur u+ahead; di ujung diekstrapolasi lurus (arah pandang tetap ada)', () => {
  const { jalurElang } = load(), J = jalurElang(S, { ahead: .05 });
  for (const u of [0, .3, .7, .9]) assert.ok(jarak(J.tatap(u), J.pos(u + .05)) < 1e-9);
  const ujung = J.pos(1), t = J.tatap(1), mundur = J.pos(.999);
  assert.ok(Math.abs(jarak(t, ujung) - .05 * J.L) < 1e-6, 'tatap di ujung harus sejauh ahead·L di depan');
  assert.ok(sudut(t.map((v, k) => v - ujung[k]), ujung.map((v, k) => v - mundur[k])) < 1, 'ekstrapolasi searah garis singgung ujung');
  const K = jalurElang(S, { look: [null, null, null, [0, 2, -60], [0, 20, -900]] }), arah = (u, q) => sudut(K.tatap(u).map((v, i) => v - K.pos(u)[i]), q.map((v, i) => v - K.pos(u)[i]));
  assert.ok(arah(K.U[3], [0, 2, -60]) < 1e-4 && arah(1, [0, 20, -900]) < 1e-4, 'target per titik: kamera di titik itu menatap targetnya');
  assert.ok(arah(K.U[1], J.pos(J.U[1] + .04)) < 1e-4, 'null = arah ke titik jalur u+ahead');
  let maks = 0; for (let u = K.U[3]; u < 1; u += .01) maks = Math.max(maks, sudut(K.tatap(u + .01).map((v, i) => v - K.pos(u + .01)[i]), K.tatap(u).map((v, i) => v - K.pos(u)[i])));
  assert.ok(maks < 6, `target 60 m → 900 m: arah harus berpindah rata, bukan melompat di awal ruas (maks ${maks.toFixed(1)}° per 1 %)`);
});

test('roll dari kelengkungan: tan φ = v²κ/g pada busur lingkaran, nol di garis lurus, kanan = negatif, dijepit lunak, tanpa lompatan', () => {
  const busur = (r, deg, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const a = deg * Math.PI / 180 * i / n; return [r - r * Math.cos(a), 0, -r * Math.sin(a)]; });   // maju −z, belok ke +x (kanan)
  { const k = load(), L = Math.PI * 200 / 2, R = k.terbang(0, L / 12, busur(200, 90), { ease: 'none', guncang: 0, ahead: .02 });   // 12 m/dtk, r 200 m
    const harap = -30 * Math.tanh(Math.atan(12 * 12 / 200 / 9.81) * 180 / Math.PI / 30), dapat = R(L / 24).roll;
    assert.ok(Math.abs(dapat - harap) < .05 * Math.abs(harap), `roll ${dapat.toFixed(2)}° ≠ ${harap.toFixed(2)}°`); }
  { const k = load(), R = k.terbang(0, 4, [[0, 2, 0], [0, 2, -40], [0, 2, -80]], { ease: 'none', guncang: 0 });
    assert.ok(Math.abs(R(2).roll) < 1e-12, 'garis lurus tanpa roll'); }
  { const k = load(), R = k.terbang(0, 2, busur(20, 90), { ease: 'none', guncang: 0, rollMaks: 30 });   // 15,7 m/dtk, r 20 m → 51° → dijepit
    assert.ok(R(1).roll < -27 && R(1).roll > -30, `jepit lunak: ${R(1).roll}`); }
  { const k = load(), R = k.terbang(0, 2, busur(20, 90).map(([x, y, z]) => [-x, y, z]), { ease: 'none', guncang: 0, rollMaks: 30 });
    assert.ok(R(1).roll > 27 && R(1).roll < 30, 'belok kiri = roll positif'); }
  { const k = load(), R = k.terbang(0, 5, [[0, 2, 0], [0, 2, -60], [3, 2, -90], [3, 2, -150]], { ease: 'none', guncang: 0, rollMaks: 30 });   // geser 3 m dalam 30 m pada 30 m/dtk:
    let maks = 0; for (let t = 0; t < 5; t += 1 / 120) maks = Math.max(maks, Math.abs(R(t + 1 / 120).roll - R(t).roll));   // κ Catmull-Rom patah di titik kontrol
    assert.ok(maks < 1.2, `roll melompat ${maks.toFixed(2)}° per 1/120 dtk — harus dihaluskan (tabel 240 Hz ⊛ Hann)`); }
  { const k = load(), R = k.terbang(0, 6, busur(40, 90), { guncang: 0 });   // sine.inOut: diam di ujung → tanpa roll
    assert.ok(Math.abs(R(0).roll) < .01 && Math.abs(R(6).roll) < .01); }
});

test('guncangan trauma: deterministik, nol tanpa trauma, puncak di peristiwa lalu meluruh', () => {
  const k = load(), titik = [[0, 2, 0], [0, 2, -40], [0, 2, -80]];
  const A = k.terbang(0, 4, titik, { ease: 'none', trauma0: 0, trauma: [[1, .8]], luruh: 1, seed: 3 });
  assert.deepEqual(A(1.234), A(1.234));
  assert.ok(Math.abs(A(.9).gy) + Math.abs(A(.9).gp) < 1e-12);
  const ada = [1.05, 1.2, 1.4].some(t => Math.abs(A(t).gy) > .01 || Math.abs(A(t).gp) > .01);
  assert.ok(ada, 'trauma .8 tidak menggoyang'); assert.ok(Math.abs(A(1.81).gy) < 1e-12, 'trauma .8 luruh 1/dtk habis sesudah .8 dtk');
  const B = load().terbang(0, 4, titik, { ease: 'none', trauma0: 0, trauma: d => [[d[1], .8]], seed: 3 });   // fungsi: detik melintasi titik
  assert.ok(Math.abs(B.detik[1] - 2) < 1e-6 && Math.abs(B(2.1).gy - A(1.1).gy) > 0, 'trauma fungsi memakai R.detik');
  const C = load().terbang(0, 4, titik, { trauma0: .3, seed: 3 });   // turbulensi dasar ∝ laju: nol saat diam di ujung
  assert.ok(Math.abs(C(0).gy) + Math.abs(C(4).gp) < 1e-5);
});

test('terbang() 3D: rail aktif selama [at, at+dur], ujung = pose bola yang sama, urut waktu dijaga', () => {
  const k = load(), R = k.terbang(2, 6, S, { guncang: 0 }), [mulai, jalan, akhir] = k.calls;
  assert.deepEqual([mulai.m, mulai.at, mulai.v.rail, mulai.v.railU], ['set', 2, 0, 0]);
  assert.deepEqual([jalan.m, jalan.at, jalan.v.railU, jalan.v.duration, jalan.v.ease], ['to', 2, 1, 6, 'none']);
  assert.equal(akhir.at, 8); assert.equal(akhir.v.rail, -1); assert.equal(k.RAILS[0], R);
  const e = R(8), p = k.pose(akhir.v);
  assert.ok(jarak([p.x, p.y, p.z], e.p) < 1e-9, 'pose sesudah terbang ≠ posisi terakhir di jalur');
  assert.ok(jarak([akhir.v.fx, akhir.v.fy, akhir.v.fz], e.look) < 1e-9);
  assert.ok(jarak(R(2).p, S[0]) < 1e-9 && jarak(R(8).p, S.at(-1)) < 1e-9);
  assert.ok(R.detik.every((d, i) => i === 0 || d > R.detik[i - 1]) && Math.abs(R.detik[0] - 2) < 1e-6 && Math.abs(R.detik.at(-1) - 8) < 1e-6);
  assert.throws(() => k.terbang(1, 2, S), /urut waktu/);
  assert.throws(() => k.terbang(9, 0, S), /dur/);
});

test('terbang() 2.5D: titik [fx,fy,zoom] dilewati, zoom = dolly (mm·zoom tetap), ujung tersambung', () => {
  const k = load('dom'), T = [[960, 540, 1], [1500, 500, 1.6], [2400, 620, 3]], R = k.terbang(0, 5, T, { guncang: 0 });
  R.detik.forEach((d, i) => { const s = R(d); assert.ok(Math.abs(s.fx - T[i][0]) < 1e-6 && Math.abs(s.fy - T[i][1]) < 1e-6 && Math.abs(s.zoom - T[i][2]) < 1e-6, `titik ${i}: ${JSON.stringify(s)}`); });
  for (let t = 0; t <= 5; t += .25) { const s = R(t); assert.ok(Math.abs(s.mm * s.zoom - 35) < 1e-9, `mm·zoom ${s.mm * s.zoom} di t ${t}`); }
  const akhir = k.calls.at(-1), e = R(5);
  assert.deepEqual([akhir.v.rail, akhir.v.fx, akhir.v.fy, akhir.v.zoom, akhir.v.mm], [-1, e.fx, e.fy, e.zoom, e.mm]);
  assert.ok(Math.abs(R(2.5).roll) > .5, 'belok di bidang fx–dolly harus berguling');
  assert.throws(() => load('dom').terbang(0, 1, [[0, 0, 1], [9, 9, 0]]), /zoom harus > 0/);
});
