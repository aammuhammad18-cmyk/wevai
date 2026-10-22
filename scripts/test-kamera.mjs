#!/usr/bin/env node
/* UJI INTI KAMERA: src/runtime/kamera.js adalah bare script (disisipkan inline ke starter),
   jadi di sini ia dijalankan lewat new Function dengan tl palsu yang MENCATAT tween.
   Yang diuji: angka yang ditulis ke CAM — bukan GSAP, bukan browser.
   Pakai: node --test scripts/test-kamera.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = await readFile(new URL('../src/runtime/kamera.js', import.meta.url), 'utf8');
function load({ W = 1920, H = 1080, dom = {} } = {}) {
  const calls = [], warns = [];
  const tl = { to: (o, v, at) => calls.push({ m: 'to', o, v, at }), set: (o, v, at) => calls.push({ m: 'set', o, v, at }), time: () => 0 };
  const $ = s => dom[s] || null;
  const api = new Function('tl', 'W', 'H', '$', 'rig', 'applyCam', 'console', src +
    ';return {CAM,camTo,cutTo,look,home,into,settle,breath,noise,SHOT,ANGLE,rectIn,shot,angle,dolly,truck,pedestal,pan,tilt,crane,arc,rule180,lens,dollyZoom,whipPan,handheld,hud}')
    (tl, W, H, $, dom.rig || null, () => {}, { warn: m => warns.push(String(m)) });
  return { ...api, calls, warns };
}

test('alias kolase lama menulis angka yang sama', () => {
  const k = load();
  k.look(2.2, 1380, 520, 1.6, 1.4);
  assert.deepEqual(k.calls[0], { m: 'to', o: k.CAM, v: { fx: 1380, fy: 520, zoom: 1.6, duration: 1.4, ease: 'sine.inOut', onUpdate: k.calls[0].v.onUpdate }, at: 2.2 });
  k.home(4.2);
  assert.deepEqual([k.calls[1].v.fx, k.calls[1].v.fy, k.calls[1].v.zoom, k.calls[1].v.duration, k.calls[1].v.ease], [960, 540, 1, 1.2, 'power2.inOut']);
  k.into(11.4, 2600, 540, 1.6);
  assert.equal(k.calls[2].at, 11.4 - .9); assert.equal(k.calls[2].v.ease, 'power2.in');
  k.settle(11.4, 2820, 520, 1.7);
  assert.equal(k.calls[3].v.zoom, 1.7 * .94); assert.equal(k.calls[3].v.duration, 1.1);
  k.breath(5.4, 10.8, 1.03);
  assert.equal(k.calls[4].v.duration, 10.8 - 5.4); assert.equal(k.calls[4].v.zoom, 1.03);
  k.cutTo(0, { fx: 530, fy: 490, zoom: 1.8 });
  assert.equal(k.calls[5].m, 'set'); assert.equal(k.calls[5].at, 0);
});

test('noise ber-seed: deterministik, 0..1, beda per seed', () => {
  const k = load();
  assert.equal(k.noise(1.37, 1), k.noise(1.37, 1));
  assert.notEqual(k.noise(1.37, 1), k.noise(1.37, 2));
  for (let t = 0; t < 50; t += .37) { const v = k.noise(t, 7); assert.ok(v >= 0 && v < 1, `noise(${t})=${v}`); }
  assert.ok(Math.abs(k.noise(2.999, 3) - k.noise(3.001, 3)) < .02, 'kontinu di bilangan bulat');
});

const el = (x, y, w, h) => ({ offsetLeft: x, offsetTop: y, offsetWidth: w, offsetHeight: h, offsetParent: null });
test('shot(): zoom dari kotak subjek, fokus di tengahnya, zoom diklem', () => {
  const k = load(); k.CAM.mode = 'dom';
  const r = k.shot(1, .8, 'WS', el(200, 100, 400, 200));
  assert.deepEqual(r, { fx: 400, fy: 200, zoom: Math.min(1920 * .45 / 400, 1080 * .45 / 200) });
  assert.equal(k.calls.at(-1).v.ease, 'power2.inOut');
  assert.equal(k.shot(2, .8, 'ECU', el(0, 0, 40, 40)).zoom, 6, 'klem atas');
  assert.equal(k.shot(3, .8, 'EWS', el(0, 0, 4000, 4000)).zoom, .1, 'klem bawah');
  assert.throws(() => k.shot(4, .8, 'XL', el(0, 0, 10, 10)), /ukuran shot/);
});
test('angle(): preset per mode, opsi menimpa', () => {
  const k = load();
  k.angle(1, .8, 'dutch'); assert.equal(k.calls.at(-1).v.roll, 12);
  k.angle(2, .8, 'high', { pitch: -5 }); assert.equal(k.calls.at(-1).v.pitch, -5);
  k.CAM.mode = 'three'; k.angle(3, .8, 'low'); assert.deepEqual([k.calls.at(-1).v.pitch, k.calls.at(-1).v.mm], [25, 24]);
  assert.throws(() => k.angle(4, .8, 'tidak-ada'), /sudut/);
});
test('arc() diklem ke satu sisi garis aksi setelah rule180()', () => {
  const k = load();
  k.arc(0, 2, 120); assert.equal(k.calls.at(-1).v.yaw, 120);
  k.rule180(0); k.arc(1, 2, 120); assert.equal(k.calls.at(-1).v.yaw, 89);
  k.arc(2, 2, -200); assert.equal(k.calls.at(-1).v.yaw, -89);
});
test('rectIn: elemen tanpa offsetLeft (SVG, bersarang atau ber-CTM) diukur dari kotak layarnya relatif ke root', () => {
  const k = load();
  const root = { getBoundingClientRect: () => ({ left: 10, top: 5, width: 960 }), offsetWidth: 1920 };   // stage diskalakan ×0,5
  const path = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 200, height: 100 }) };
  assert.deepEqual(k.rectIn(path, root), { x: 180, y: 90, w: 400, h: 200 });
});
test('hud.reserve: subjek yang masuk kantong teks saat shot ditolak', () => {
  const root = { contains: e => e.offsetParent === root };
  const label = { ...el(100, 800, 800, 120), offsetParent: root };          // teks DI DALAM dunia (kolase)
  const k = load({ dom: { '#line1': label, rig: root } });
  k.hud.reserve('#line1', 5, 4);
  k.shot(1, 1, 'WS', { ...el(100, 100, 400, 200), offsetParent: root });     // sebelum jendela → sah
  assert.throws(() => k.shot(6, 1, 'CU', { ...el(300, 820, 200, 80), offsetParent: root }), /detik 6.*#line1/);
  k.shot(10, 1, 'CU', { ...el(300, 820, 200, 80), offsetParent: root });     // setelah jendela → sah
  assert.throws(() => k.hud.reserve('#tidak-ada', 0, 1), /tidak ada/);
});
test('hud.reserve: elemen di LUAR rig dikonversi dari layar ke dunia (sekali, bukan dua kali)', () => {
  const root = { contains: e => e.offsetParent === root };
  const stage = { offsetLeft: 960, offsetTop: 540, offsetParent: null };      // #stage: left/top 50 % viewport — tidak boleh ikut terhitung
  const hudEl = { ...el(0, 900, 1920, 180), offsetParent: stage };            // HUD di #stage, koordinat layar
  const k = load({ dom: { '#kredit': hudEl, '#stage': stage, rig: root } });
  k.hud.reserve('#kredit', 0, 99);
  const s = { ...el(200, 100, 400, 200), offsetParent: root };
  // MS: zoom 5,33, fy 200 → tepi atas kantong di dunia = (900-540)/5,33+200 ≈ 267,5 < tepi bawah subjek 300 → tabrakan
  assert.throws(() => k.shot(1, 1, 'MS', s), /#kredit/);
  // WS: zoom 2,16 → tepi atas kantong ≈ 366,7 > 300 → sah
  k.shot(2, 1, 'WS', s);
});

test('shot() berdurasi 0 ke subjek & ukuran yang sama tanpa beda yaw ≥ 30° → peringatan; setelah pan 40° tidak', () => {
  const k = load(); const s = el(0, 0, 400, 400);
  k.shot(1, 0, 'CU', s); k.shot(3, 0, 'CU', s);
  assert.equal(k.warns.length, 1); assert.match(k.warns[0], /30°/);
  k.pan(4, .5, 40); k.shot(5, 0, 'CU', s); assert.equal(k.warns.length, 1, 'yaw rencana sudah bergeser 40°');
  k.shot(6, 0, 'WS', s); assert.equal(k.warns.length, 1, 'beda ukuran = sah');
});
test('gerak relatif diselesaikan SAAT SETUP menjadi nilai absolut (hasil tidak bergantung jalur seek)', () => {
  const k = load();
  k.dolly(0, 1, 1.4); assert.equal(k.calls.at(-1).v.zoom, 1.4);
  k.dolly(1, 1, 2); assert.equal(k.calls.at(-1).v.zoom, 2.8);
  k.truck(2, 1, 220); assert.equal(k.calls.at(-1).v.fx, 1180);
  k.pedestal(3, 1, -120); assert.equal(k.calls.at(-1).v.fy, 420);
  k.pan(4, 1, 6); assert.equal(k.calls.at(-1).v.yaw, 6);
  k.tilt(5, 1, -4); assert.equal(k.calls.at(-1).v.pitch, -4);
  k.crane(6, 2, { dy: -300, dPitch: -10 }); assert.deepEqual([k.calls.at(-1).v.fy, k.calls.at(-1).v.pitch], [120, -14]);
  k.look(8, 500, 500, 2); k.dolly(10, 1, 1.5); assert.equal(k.calls.at(-1).v.zoom, 3, 'relatif terhadap nilai rencana terakhir');
  k.lens(11, 1, 50); assert.equal(k.calls.at(-1).v.mm, 50);
  k.dollyZoom(12, 2, 85); assert.equal(k.calls.at(-1).v.mm, 85);
  assert.throws(() => k.truck(3, 1, 10), /urut waktu/);
  const t = load(); t.CAM.mode = 'three'; t.dolly(0, 1, 2); assert.equal(t.calls.at(-1).v.dist, 5);
});
test('whipPan & handheld', () => {
  const k = load();
  k.whipPan(4, 1); const w = k.calls.filter(c => c.at >= 4 && c.at <= 4.3);
  assert.ok(w.some(c => c.v.fx === 780 && c.v.duration === .28), 'dunia bergeser 180 px berlawanan arah');
  const n = k.calls.length; k.handheld(6, 9, .8);
  assert.equal(k.calls.length - n, 2, 'tanpa tween penjaga — backend memanggil applyCam dari ticker selama shake ≠ 0');
  const h = k.calls.slice(-2); assert.deepEqual([h[0].v.shake, h[0].at, h[1].v.shake, h[1].at], [.8, 6, 0, 9 - .3]);
});
test('shot() menerima selector; subjek yang tidak ada ditolak', () => {
  const k = load({ dom: { '#a': el(200, 100, 400, 200) } });
  assert.equal(k.shot(1, 1, 'WS', '#a').fx, 400);
  assert.throws(() => k.shot(2, 1, 'WS', '#tidak-ada'), /subjek/);
});
test('shot() pada subjek di dalam bidang data-z mengoreksi fokus (bidang diskalakan dari pusatnya)', () => {
  const root = { contains: () => true };
  const plane = { dataset: { z: '-300' }, offsetLeft: 1000, offsetTop: 0, offsetWidth: 800, offsetHeight: 400, offsetParent: root, parentNode: root };
  const subj = { offsetLeft: 100, offsetTop: 100, offsetWidth: 200, offsetHeight: 200, offsetParent: plane, parentNode: plane };
  const k = load({ dom: { rig: root } });
  const P0 = 1920 * 35 / 36, s0 = (P0 + 300) / P0;
  const r = k.shot(1, 1, 'MS', subj);
  assert.ok(Math.abs(r.fx - (1400 + s0 * (1200 - 1400))) < 1e-9, `fx ${r.fx}`);
  assert.ok(Math.abs(r.fy - 200) < 1e-9);
});
