# Kamera inti + backend 2.5D — Rencana implementasi (Rencana A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satu modul kamera bersama (`CAM` + kosakata shot/sudut/gerak/lensa/fokus/cahaya) yang menggantikan `kamera-kolase.js`, dengan backend 2.5D (perspektif, paralaks bidang `data-z`, tilt/dutch, rack focus, overlay cahaya) di lima starter explainer — tanpa mengubah hasil visual starter yang ada.

**Architecture:** `src/runtime/kamera.js` (inti: hanya menulis angka ke `CAM` lewat tween GSAP berdetik absolut; tanpa DOM) + `src/runtime/kamera-dom.js` (backend: membaca `CAM` di `applyCam()` dan menulis `transform` ke `#world`, bidang `[data-z]`, dan dua div overlay cahaya). Keduanya disisipkan ke starter oleh `scripts/build-starters.mjs` lewat penanda `<wv:kamera>` / `<wv:kamera-dom>`. Jalur 2D murni memakai string transform yang **persis sama** dengan kode lama (uji identitas). Rencana B (Three.js) menambah `kamera-three.js` di atas inti yang sama.

**Tech Stack:** GSAP 3.12.5 (CDN), vanilla JS (bare script, bukan module), puppeteer 25 (uji browser), `node:test` (uji inti).

**Spec:** `docs/superpowers/specs/2026-10-03-kamera-sinematik-3d-design.md` — §2 (arsitektur), §3 (kosakata), §6 (alat & pengujian), §7 fase 0–1.

## Global Constraints

- Deterministik: visual = fungsi murni `tl.time()`; tanpa `Date.now`/`performance.now`/`Math.random`/`setInterval` di jalur render; acak hanya ber-seed.
- Deliverable satu berkas `file://`: runtime adalah bare script yang disisipkan inline; tanpa `fetch` lokal, tanpa `<script src>` lokal.
- Kontrak `window.OPENER = {W,H,DURATION,tl,seek,ready}` tidak berubah; `seek(t)` sinkron & idempoten.
- Starter kolase (`-kartun`, `-jurnalisme`, `-katalog`, `-sketsa`) dan aksi kontinu (`starter-explainer.html`) harus menghasilkan **string `transform` `#world` yang identik** dengan sebelum perubahan pada rundown contohnya (fase 0 "selesai bila").
- `starter-explainer-panggung.html` dan `starter-opener.html` **tidak disentuh** di rencana ini (panggung = mode kamera lain; opener → Rencana B).
- Semua skrip CI tetap hijau: `build-starters --check`, `bump-version --check`, `context-budget --check`, `lint-motion assets/*.html`, `cdn-integrity --check`, `test-starters`.
- Versi tidak di-bump di rencana ini (dilakukan di Rencana B); CHANGELOG mendapat bagian "Belum dirilis".
- Penyimpangan kecil dari spec yang disengaja (ditulis di sini supaya tidak dicari-cari): `rail()` 2.5D (MotionPathPlugin) ditunda ke Rencana B — `look()` berantai sudah mencukupi di 2.5D; cek aturan 30° dilakukan **saat setup di browser** (`console.warn` dari `shot()` berdurasi 0), bukan lint statis, karena geometri tidak bisa dibaca dari teks.

## Review Focus

1. **`shot()` pada subjek `<svg>` luar atau elemen SVG** (bukan `HTMLElement`): `offsetLeft` tidak ada → `NaN` → kamera hilang. Diuji di Task 3 (`rectIn` cabang SVG).
2. **Backend 2.5D menyentuh starter yang tidak punya `[data-z]`**: `transform-style:preserve-3d` yang dipasang tanpa perlu bisa mengubah rasterisasi teks → jalur 2D murni harus benar-benar tidak menyentuh gaya apa pun selain `transform`. Diuji di Task 5 (identitas string) & Task 7 (identitas sebelum/sesudah).
3. **`light()` dipanggil tidak urut waktu** (mis. `light(10,…)` lalu `light(2,…)`): dua overlay bergantian berdasarkan urutan *panggilan*, bukan waktu → lampu yang salah memudar. Diuji di Task 6 (lempar error bila `at` lebih kecil dari panggilan sebelumnya).
4. **`hud.reserve()` pada elemen di dalam `#world`** (kolase: teks hidup di dunia, bukan HUD): rect sudah dalam koordinat dunia, jangan dikonversi dua kali. Diuji di Task 4.
5. **`?demo=1` lebih panjang dari `DUR`**: penjaga loop (`tl.time()>=DUR`) memotong katalog di tengah. Diuji di Task 6 (langkah demo = `DUR/28`, 27 entri, sehingga total < DUR).

---

### Task 1: Harness uji inti + `kamera.js` dengan alias lama

**Files:**
- Create: `src/runtime/kamera.js`
- Create: `scripts/test-kamera.mjs`
- Delete (di Task 5, setelah starter dibangun ulang): `src/runtime/kamera-kolase.js`

**Interfaces:**
- Consumes: global `tl` (GSAP timeline), `W`, `H`, `$` (querySelector), `rig` (elemen `#world`/`#colWorld`), `applyCam` (didefinisikan backend, dipanggil sebagai `onUpdate`).
- Produces: `CAM` (objek keadaan), `camTo(at,dur,v,ease)`, `cutTo(at,v)`, alias `look/home/into/settle/breath` dengan tanda tangan **persis** seperti `kamera-kolase.js`.

- [ ] **Step 1: Tulis harness + uji alias yang gagal**

`scripts/test-kamera.mjs`:
```js
#!/usr/bin/env node
/* UJI INTI KAMERA: src/runtime/kamera.js adalah bare script (disisipkan inline ke starter),
   jadi di sini ia dijalankan lewat new Function dengan tl palsu yang MENCATAT tween.
   Yang diuji: angka yang ditulis ke CAM — bukan GSAP, bukan browser.
   Pakai: node --test scripts/test-kamera.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = await readFile(new URL('../src/runtime/kamera.js', import.meta.url), 'utf8');
export function load({ W = 1920, H = 1080, dom = {} } = {}) {
  const calls = [], warns = [];
  const tl = { to: (o, v, at) => calls.push({ m: 'to', o, v, at }), set: (o, v, at) => calls.push({ m: 'set', o, v, at }), time: () => 0 };
  const $ = s => dom[s] || null;
  {
    const api = new Function('tl', 'W', 'H', '$', 'rig', 'applyCam', 'console', src +
      ';return {CAM,camTo,cutTo,look,home,into,settle,breath,noise,SHOT,ANGLE,rectIn,shot,angle,dolly,truck,pedestal,pan,tilt,crane,arc,rule180,lens,dollyZoom,whip,handheld,hud}')
      (tl, W, H, $, dom.rig || null, () => {}, { warn: m => warns.push(String(m)) });
    return { ...api, calls, warns };
  }
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
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --test scripts/test-kamera.mjs`
Expected: FAIL — `ENOENT ... src/runtime/kamera.js`

- [ ] **Step 3: Tulis `src/runtime/kamera.js` (bagian alias)**

```js
/* KAMERA — satu objek keadaan, fungsi murni dari tl.time() (SKILL.md Hukum #2).
   Inti ini TIDAK menyentuh DOM/WebGL: ia hanya menulis angka ke CAM lewat tween GSAP berdetik
   absolut. Backend (kamera-dom / kamera-three) mendefinisikan applyCam() yang membaca CAM dan
   menggambar. Kosakata: references/sinematografi.md (Rencana B) / techniques.md §3b. */
const CAM={mode:'dom',          // 'dom' (2.5D) | 'three' — diisi backend
  fx:W/2,fy:H/2,fz:0,           // titik fokus (koordinat dunia)
  zoom:1,                       // 2.5D: skala rig; 3D: camera.zoom
  dist:10,yaw:0,pitch:0,roll:0, // kamera relatif ke fokus (derajat); 2.5D: yaw/pitch kecil = tilt/paralaks
  mm:35,                        // lensa (filmGauge 36); 2.5D: perspective = W*mm/36 px
  focus:0,aperture:0,           // rack focus (aperture 0 = mati)
  shake:0,seed:1};              // handheld: value-noise ber-seed, bukan Math.random
const camTo=(at,dur,v,ease='power2.inOut')=>tl.to(CAM,{...v,duration:dur,ease,onUpdate:applyCam},at);
const cutTo=(at,v)=>tl.set(CAM,{...v,onUpdate:applyCam},at);                                  // lompat di titik cut
/* alias kamera KOLASE (explainer.md "Resep kamera kolase") — angka & easing persis yang lama */
const look=(at,x,y,z,dur=1.6,ease='sine.inOut')=>camTo(at,dur,{fx:x,fy:y,zoom:z},ease);     // meluncur ke aset lain
const home=(at,x=W/2,y=H/2,dur=1.2)=>look(at,x,y,1,dur,'power2.inOut');                     // zoom out, lalu DIAM
const into=(cutAt,x,y,z)=>camTo(cutAt-.9,.9,{fx:x,fy:y,zoom:z},'power2.in');                // push-through sebelum cut
const settle=(cutAt,x,y,z)=>camTo(cutAt,1.1,{fx:x,fy:y,zoom:z*.94},'power3.out');           // mendarat setelah cut
const breath=(a,b,z)=>camTo(a,b-a,{zoom:z},'sine.inOut');                                   // napas halus saat "diam"
```
(Sisa simbol yang di-return harness — `noise, SHOT, …, hud` — ditambahkan Task 2–4. Supaya Task 1 lolos sendiri, tambahkan sementara di akhir berkas: `const noise=0,SHOT=0,ANGLE=0,rectIn=0,shot=0,angle=0,dolly=0,truck=0,pedestal=0,pan=0,tilt=0,crane=0,arc=0,rule180=0,lens=0,dollyZoom=0,whip=0,handheld=0,hud=0; // sementara, diganti Task 2–4`.)

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `node --test scripts/test-kamera.mjs`
Expected: `# pass 1`

- [ ] **Step 5: Commit**

```bash
git add src/runtime/kamera.js scripts/test-kamera.mjs
git commit -m "kamera.js: inti CAM + alias kamera kolase, harness uji node:test"
```

---

### Task 2: Noise ber-seed, ukuran shot, sudut, gerak, lensa, whip, handheld

**Files:**
- Modify: `src/runtime/kamera.js` (ganti baris "sementara")
- Modify: `scripts/test-kamera.mjs`

**Interfaces:**
- Produces: `noise(t,seed)→[0,1)`, `SHOT` (tabel isi frame), `ANGLE.dom|three` (preset), `rectIn(el,root)→{x,y,w,h}`, `shot(at,dur,size,el,{ease,fill})→{fx,fy,zoom}`, `angle(at,dur,name,o,ease)`, `dolly(at,dur,k)`, `truck(at,dur,dx)`, `pedestal(at,dur,dy)`, `pan(at,dur,dYaw)`, `tilt(at,dur,dPitch)`, `crane(at,dur,{dy,dPitch})`, `arc(at,dur,toYaw)`, `rule180(axisYaw)`, `lens(at,dur,mm)`, `dollyZoom(at,dur,mm)`, `whip(at,dir)`, `handheld(a,b,amp)`.
- `CAM.frame3d` (hook, diisi Rencana B) — bila ada, `shot()` memakainya untuk mode `three`.

- [ ] **Step 1: Tulis uji yang gagal**

Tambahkan ke `scripts/test-kamera.mjs`:
```js
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
});
test('shot() berdurasi 0 ke subjek & ukuran yang sama tanpa beda yaw ≥ 30° → peringatan aturan 30°', () => {
  const k = load(); const s = el(0, 0, 400, 400);
  k.shot(1, 0, 'CU', s); k.shot(3, 0, 'CU', s);
  assert.equal(k.warns.length, 1); assert.match(k.warns[0], /30°/);
  k.shot(5, 0, 'WS', s); assert.equal(k.warns.length, 1, 'beda ukuran = sah');
});
test('angle(): preset per mode, opsi menimpa', () => {
  const k = load();
  k.angle(1, .8, 'dutch'); assert.equal(k.calls.at(-1).v.roll, 12);
  k.angle(2, .8, 'high', { pitch: -5 }); assert.equal(k.calls.at(-1).v.pitch, -5);
  k.CAM.mode = 'three'; k.angle(3, .8, 'low'); assert.deepEqual([k.calls.at(-1).v.pitch, k.calls.at(-1).v.mm], [25, 24]);
  assert.throws(() => k.angle(4, .8, 'tidak-ada'), /sudut/);
});
test('gerak = tween relatif komponen CAM', () => {
  const k = load();
  k.dolly(0, 1, 1.4); assert.equal(k.calls.at(-1).v.zoom, '*=1.4');
  k.CAM.mode = 'three'; k.dolly(0, 1, 2); assert.equal(k.calls.at(-1).v.dist, '*=0.5'); k.CAM.mode = 'dom';
  k.truck(0, 1, 220); assert.equal(k.calls.at(-1).v.fx, '+=220');
  k.pedestal(0, 1, -120); assert.equal(k.calls.at(-1).v.fy, '+=-120');
  k.pan(0, 1, 6); assert.equal(k.calls.at(-1).v.yaw, '+=6');
  k.tilt(0, 1, -4); assert.equal(k.calls.at(-1).v.pitch, '+=-4');
  k.crane(0, 2, { dy: -300, dPitch: -10 }); assert.deepEqual([k.calls.at(-1).v.fy, k.calls.at(-1).v.pitch], ['+=-300', '+=-10']);
  k.lens(0, 1, 50); assert.equal(k.calls.at(-1).v.mm, 50);
  k.dollyZoom(0, 2, 85); assert.equal(k.calls.at(-1).v.mm, 85);
});
test('arc() diklem ke satu sisi garis aksi setelah rule180()', () => {
  const k = load();
  k.arc(0, 2, 120); assert.equal(k.calls.at(-1).v.yaw, 120);
  k.rule180(0); k.arc(1, 2, 120); assert.equal(k.calls.at(-1).v.yaw, 89);
  k.arc(2, 2, -200); assert.equal(k.calls.at(-1).v.yaw, -89);
});
test('whip & handheld', () => {
  const k = load();
  k.whip(4, 1); const w = k.calls.filter(c => c.at >= 4 && c.at <= 4.3);
  assert.ok(w.some(c => c.v.fx === '+=-180' && c.v.duration === .28), 'dunia bergeser 180 px berlawanan arah');
  k.handheld(6, 9, .8);
  const h = k.calls.slice(-2); assert.deepEqual([h[0].v.shake, h[0].at, h[1].v.shake, h[1].at], [.8, 6, 0, 9 - .3]);
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --test scripts/test-kamera.mjs`
Expected: 7 uji baru FAIL (`k.noise is not a function`, dst.)

- [ ] **Step 3: Ganti baris "sementara" dengan implementasi**

```js
/* value-noise 1D ber-seed: hash bilangan bulat → interpolasi smoothstep. Dipakai handheld.
   Bukan Math.random: t yang sama selalu memberi nilai yang sama (scrub & export reproducible). */
const hash=(i,s)=>{let x=(Math.imul(i,374761393)+Math.imul(s,668265263))|0;x=Math.imul(x^x>>>13,1274126177);return((x^x>>>16)>>>0)/4294967296;};
const noise=(t,s=1)=>{const i=Math.floor(t),f=t-i,u=f*f*(3-2*f),a=hash(i,s);return a+(hash(i+1,s)-a)*u;};

/* UKURAN SHOT (techniques.md §3b): berapa bagian frame yang diisi subjek. ECU 6,7× frame … EWS 0,1×. */
const SHOT={ECU:6.7,CU:2.86,MCU:1.67,MS:1.11,WS:.45,EWS:.1};
/* kotak elemen dalam koordinat dunia (tanpa transform kamera). HTML: rantai offset; <svg> luar / elemen
   absolut lain: left/top/width/height dari computed style; bentuk di dalam SVG: getBBox × skala viewBox.
   ponytail: bentuk SVG dianggap di <svg> yang viewBox-nya sebanding dengan width — cukup untuk starter. */
function rectIn(el,root){
  if(el.ownerSVGElement){const o=el.ownerSVGElement,r=rectIn(o,root),b=el.getBBox(),vb=o.viewBox.baseVal,k=vb&&vb.width?r.w/vb.width:1;
    return{x:r.x+b.x*k,y:r.y+b.y*k,w:b.width*k,h:b.height*k};}
  if(typeof el.offsetLeft!=='number'){const c=getComputedStyle(el);return{x:parseFloat(c.left)||0,y:parseFloat(c.top)||0,w:parseFloat(c.width)||0,h:parseFloat(c.height)||0};}
  let x=0,y=0,n=el;while(n&&n!==root){x+=n.offsetLeft;y+=n.offsetTop;n=n.offsetParent;}
  return{x,y,w:el.offsetWidth,h:el.offsetHeight};}
let lastShot=null;
function shot(at,dur,size,el,{ease='power2.inOut',fill=SHOT[size]}={}){
  if(!fill)throw new Error('ukuran shot tidak dikenal: '+size+' (ECU CU MCU MS WS EWS)');
  if(CAM.mode==='three'&&CAM.frame3d){const v=CAM.frame3d(fill,el);camTo(at,dur,v,ease);return v;}
  const r=rectIn(el,rig),v={fx:r.x+r.w/2,fy:r.y+r.h/2,zoom:Math.max(.1,Math.min(6,Math.min(W*fill/r.w,H*fill/r.h)))};
  hud.check(at,dur,r,v);
  if(dur===0&&lastShot&&lastShot.el===el&&lastShot.size===size&&Math.abs((lastShot.yaw||0)-CAM.yaw)<30)
    console.warn('aturan 30°: cut ke subjek yang sama dengan ukuran '+size+' tanpa beda sudut ≥ 30° terasa jump cut (detik '+at+')');
  lastShot={el,size,yaw:CAM.yaw};
  camTo(at,dur,v,ease);return v;}

/* SUDUT KAMERA (riset §tata bahasa). 2.5D: sudut kecil (dunia pipih); 3D: sudut film sungguhan. */
const ANGLE={
  dom:{eye:{pitch:0,yaw:0,roll:0},high:{pitch:-8},low:{pitch:8},overhead:{pitch:-8,zoom:'*=.8'},worm:{pitch:8,zoom:'*=1.3'},
       dutch:{roll:12},ots:{yaw:6,pitch:-3},pov:{pitch:0,yaw:0,roll:0,shake:.6}},
  three:{eye:{pitch:0,roll:0},high:{pitch:-30},low:{pitch:25,mm:24},overhead:{pitch:-89.9},worm:{pitch:60,mm:16},
         dutch:{roll:15},ots:{yaw:35,pitch:-8,mm:50},pov:{pitch:0,roll:0,mm:28,shake:.5}}};
const angle=(at,dur,name,o={},ease='power2.inOut')=>{const p=ANGLE[CAM.mode][name];
  if(!p)throw new Error('sudut tidak dikenal: '+name+' ('+Object.keys(ANGLE[CAM.mode]).join(' ')+')');
  return camTo(at,dur,{...p,...o},ease);};

/* GERAK — semua tween RELATIF komponen CAM (GSAP "+=", "*="), jadi bisa dirantai tanpa tahu nilai sebelumnya */
const dolly=(at,dur,k,ease)=>camTo(at,dur,CAM.mode==='three'?{dist:'*='+(1/k)}:{zoom:'*='+k},ease);   // k>1 mendekat
const truck=(at,dur,dx,ease)=>camTo(at,dur,{fx:'+='+dx},ease);
const pedestal=(at,dur,dy,ease)=>camTo(at,dur,{fy:'+='+dy},ease);                                      // dy>0 = turun (sumbu layar)
const pan=(at,dur,dYaw,ease)=>camTo(at,dur,{yaw:'+='+dYaw},ease);
const tilt=(at,dur,dPitch,ease)=>camTo(at,dur,{pitch:'+='+dPitch},ease);
const crane=(at,dur,{dy=0,dPitch=0}={},ease)=>camTo(at,dur,{fy:'+='+dy,pitch:'+='+dPitch},ease);
let AXIS=null;const rule180=a=>{AXIS=a;};                                                             // garis aksi (yaw); null = bebas
const arc=(at,dur,toYaw,ease='sine.inOut')=>camTo(at,dur,{yaw:AXIS==null?toYaw:Math.max(AXIS-89,Math.min(AXIS+89,toYaw))},ease);
const lens=(at,dur,mm,ease)=>camTo(at,dur,{mm},ease);
/* vertigo. 2.5D: subjek di z=0 tidak terpengaruh perspective, bidang data-z bergeser → cukup tween mm.
   3D (Rencana B): kamera-three mendefinisikan ulang dollyZoom supaya dist dihitung ulang tiap frame. */
const dollyZoom=(at,dur,mm,ease)=>camTo(at,dur,{mm},ease);
/* whip (techniques.md §4c #6): dunia bergeser 180 px + blur berarah 0,28 dtk; panggil cutTo(at+.28, …) untuk shot berikutnya */
const whip=(at,dir=1)=>{camTo(at,.28,{fx:'+='+(-180*dir)},'power2.in');tl.set(CAM,{blur:18,onUpdate:applyCam},at);tl.set(CAM,{blur:0,onUpdate:applyCam},at+.28);};
const handheld=(a,b,amp=.5)=>{camTo(a,.3,{shake:amp},'sine.out');camTo(b-.3,.3,{shake:0},'sine.in');};
```
`CAM` mendapat satu kunci tambahan — tambahkan di deklarasi: `blur:0,` (blur berarah saat whip).

Biarkan `const hud=0;` sementara (Task 4) — tapi `shot()` memanggil `hud.check`; untuk Task 2 ganti sementara dengan `const hud={check(){}};`.

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `node --test scripts/test-kamera.mjs`
Expected: `# pass 8`

- [ ] **Step 5: Commit**

```bash
git add src/runtime/kamera.js scripts/test-kamera.mjs
git commit -m "kamera.js: noise ber-seed, ukuran shot, sudut, gerak, lensa, whip, handheld"
```

---

### Task 3: `rectIn` cabang SVG (Review Focus #1)

**Files:**
- Modify: `scripts/test-kamera.mjs`

- [ ] **Step 1: Tulis uji yang gagal**

```js
test('rectIn: <svg> luar (tanpa offsetLeft) dan bentuk di dalam SVG', () => {
  globalThis.getComputedStyle = () => ({ left: '180px', top: '140px', width: '720px', height: '720px' });
  const svg = { viewBox: { baseVal: { width: 720 } } };               // tanpa offsetLeft → cabang computed style
  const k = load();
  assert.deepEqual(k.rectIn(svg, 'ROOT'), { x: 180, y: 140, w: 720, h: 720 });
  const path = { ownerSVGElement: svg, getBBox: () => ({ x: 60, y: 60, width: 600, height: 600 }) };
  assert.deepEqual(k.rectIn(path, 'ROOT'), { x: 240, y: 200, w: 600, h: 600 });
  const r = k.shot(1, .5, 'CU', path);
  assert.ok(Number.isFinite(r.zoom) && Number.isFinite(r.fx), 'tidak NaN');
  delete globalThis.getComputedStyle;
});
```

- [ ] **Step 2: Jalankan**

Run: `node --test scripts/test-kamera.mjs`
Expected: PASS bila Task 2 ditulis sesuai; bila FAIL (`getComputedStyle is not defined` atau NaN), perbaiki `rectIn` sampai lolos — jangan ubah ujinya.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-kamera.mjs src/runtime/kamera.js
git commit -m "kamera.js: rectIn menangani <svg> luar dan bentuk SVG"
```

---

### Task 4: Zona aman HUD (`hud.reserve` / `hud.check`)

**Files:**
- Modify: `src/runtime/kamera.js` (ganti `const hud={check(){}}`)
- Modify: `scripts/test-kamera.mjs`

**Interfaces:**
- Produces: `hud.reserve(sel,at,dur)`; `hud.check(at,dur,rectSubjek,v)` (internal, dipanggil `shot()`); lempar `Error` berisi selector dan detik bila subjek masuk kantong teks.

- [ ] **Step 1: Tulis uji yang gagal**

```js
test('hud.reserve: subjek yang masuk kantong teks saat shot ditolak', () => {
  const root = {};
  const label = { ...el(100, 800, 800, 120), offsetParent: root };        // teks DI DALAM dunia (kolase)
  const k = load({ dom: { '#line1': label, rig: root } });
  k.hud.reserve('#line1', 5, 4);
  k.shot(1, 1, 'WS', el(100, 100, 400, 200));                                // sebelum jendela → sah
  assert.throws(() => k.shot(6, 1, 'CU', { ...el(300, 820, 200, 80), offsetParent: root }), /detik 6.*#line1/);
  k.shot(10, 1, 'CU', { ...el(300, 820, 200, 80), offsetParent: root });     // setelah jendela → sah
});
test('hud.reserve: elemen di LUAR rig dikonversi dari layar ke dunia (sekali, bukan dua kali)', () => {
  const root = {};
  const stage = { offsetLeft: 0, offsetTop: 0, offsetParent: null };
  const hudEl = { ...el(0, 900, 1920, 180), offsetParent: stage };            // HUD di #stage, koordinat layar
  const k = load({ dom: { '#kredit': hudEl, rig: root } });
  k.hud.reserve('#kredit', 0, 99);
  const s = { ...el(200, 100, 400, 200), offsetParent: root };
  // MS: zoom 5,33, fy 200 → tepi atas kantong di dunia = (900-540)/5,33+200 ≈ 267,5 < tepi bawah subjek 300 → tabrakan
  assert.throws(() => k.shot(1, 1, 'MS', s), /#kredit/);
  // WS: zoom 2,16 → tepi atas kantong ≈ 366,7 > 300 → sah
  k.shot(2, 1, 'WS', s);
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --test scripts/test-kamera.mjs`
Expected: 2 FAIL (`k.hud.reserve is not a function`)

- [ ] **Step 3: Implementasi**

```js
/* ZONA AMAN HUD: kamera tahu kantong teks, sehingga shot() tidak membawa subjek ke bawah label
   (gejala S5 di docs/analisis-3d-sinematografi). Elemen di dalam rig = koordinat dunia; di luar rig
   (HUD #stage) = koordinat layar, dikonversi ke dunia memakai kamera shot itu. */
const HUD=[];
const hud={
  reserve(sel,at,dur){const e=$(sel);if(!e)throw new Error('hud.reserve: '+sel+' tidak ada');HUD.push({sel,el:e,at,to:at+dur});},
  check(at,dur,r,v){for(const h of HUD){if(at+dur<h.at||at>h.to)continue;
    let p=rectIn(h.el,rig);let n=h.el;while(n&&n!==rig)n=n.offsetParent;
    if(n!==rig)p={x:(p.x-W/2)/v.zoom+v.fx,y:(p.y-H/2)/v.zoom+v.fy,w:p.w/v.zoom,h:p.h/v.zoom};   // layar → dunia
    if(r.x<p.x+p.w&&r.x+r.w>p.x&&r.y<p.y+p.h&&r.y+r.h>p.y)
      throw new Error('zona aman: subjek shot pada detik '+at+' masuk kantong teks '+h.sel+' — geser fokus, ganti ukuran shot, atau pindahkan teks');}}};
```

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `node --test scripts/test-kamera.mjs`
Expected: `# pass 11`

- [ ] **Step 5: Commit**

```bash
git add src/runtime/kamera.js scripts/test-kamera.mjs
git commit -m "kamera.js: zona aman HUD — shot() menolak subjek di kantong teks"
```

---

### Task 5: Starter memakai `<wv:kamera>`; hapus `kamera-kolase.js`; identitas transform

**Files:**
- Modify: `assets/starter-explainer-kartun.html`, `-jurnalisme.html`, `-katalog.html`, `-sketsa.html` (blok `<wv:kamera-kolase>` → `<wv:kamera>` + `<wv:kamera-dom>`, contoh `tl.set(C,…)` → `cutTo`)
- Modify: `assets/starter-explainer.html` (blok C/look lokal → blok bersama; `home(at,dur)` → `home(at,960,540,dur)`)
- Create: `src/runtime/kamera-dom.js` (versi minimum: `applyCam` jalur 2D saja; diperluas Task 6)
- Delete: `src/runtime/kamera-kolase.js`

**Interfaces:**
- Consumes: `CAM`, `rig`, `W`, `H`, `tl`.
- Produces: `applyCam()` (global, dipakai `onUpdate` dan `makeSeek`).

- [ ] **Step 1: Rekam keadaan SEBELUM (string transform `#world` pada detik kunci)**

Buat `scripts/_cmp_tmp.mjs` (sementara, di-commit TIDAK; dijalankan dari `scripts/` supaya puppeteer ketemu):
```js
import puppeteer from 'puppeteer'; import { pathToFileURL } from 'node:url'; import { writeFile } from 'node:fs/promises';
const [out, ...files] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'new', executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--use-gl=angle', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const hasil = {};
for (const f of files) {
  const p = await b.newPage(); await p.goto(pathToFileURL(f).href + '?clean=1', { waitUntil: 'networkidle0' });
  await p.waitForFunction('window.OPENER && window.OPENER.ready');
  hasil[f] = await p.evaluate(() => { const O = window.OPENER, r = {}; O.tl.pause();
    for (let t = 0; t <= O.DURATION; t += .25) { O.seek(t); r[t.toFixed(2)] = (document.querySelector('#world,#colWorld') || {}).style?.transform || ''; } return r; });
  await p.close();
}
await writeFile(out, JSON.stringify(hasil, null, 1)); await b.close(); console.log('tertulis', out);
```
Run (dari akar repo): `cd scripts && node _cmp_tmp.mjs ../sebelum.json ../assets/starter-explainer-kartun.html ../assets/starter-explainer-jurnalisme.html ../assets/starter-explainer-katalog.html ../assets/starter-explainer-sketsa.html ../assets/starter-explainer.html && cd ..`
Expected: `tertulis ../sebelum.json`; `grep -c translate sebelum.json` > 300.

- [ ] **Step 2: Tulis `src/runtime/kamera-dom.js` (minimum, jalur 2D persis string lama)**

```js
/* BACKEND 2.5D — membaca CAM, menulis transform ke rig (#world/#colWorld). Jalur 2D murni (tanpa
   pitch/yaw/roll/bidang data-z) memakai string yang PERSIS sama dengan kamera kolase lama. */
CAM.mode='dom';
function applyCam(){
  rig.style.transform=`translate(${W/2-CAM.fx*CAM.zoom}px,${H/2-CAM.fy*CAM.zoom}px) scale(${CAM.zoom})`;}
```

- [ ] **Step 3: Ganti penanda & contoh di empat starter kolase**

Untuk tiap berkas (`kartun`, `jurnalisme`, `katalog`, `sketsa`) ganti seluruh blok dari baris `/* <wv:kamera-kolase> …` sampai `/* </wv:kamera-kolase> */` dengan:
```js
/* <wv:kamera> dibangun dari src/runtime/kamera.js — JANGAN edit di sini;
   ubah sumbernya lalu jalankan: node scripts/build-starters.mjs */
/* </wv:kamera> */
/* <wv:kamera-dom> dibangun dari src/runtime/kamera-dom.js — JANGAN edit di sini;
   ubah sumbernya lalu jalankan: node scripts/build-starters.mjs */
/* </wv:kamera-dom> */
```
dan baris contoh `tl.set(C,{x:530,y:490,z:1.8,onUpdate:applyCam},0);` → `cutTo(0,{fx:530,fy:490,zoom:1.8});` (komentar di belakangnya dipertahankan). Verifikasi tidak ada sisa: `grep -n "C\.\|{x:\|kamera-kolase" assets/starter-explainer-kartun.html` → hanya baris yang bukan kamera (mis. `from:{x:400,…}` milik `fly()` boleh).

- [ ] **Step 4: Starter aksi kontinu**

Di `assets/starter-explainer.html` ganti baris 122–127 (`const C={x:960,…` sampai `const settle=…`) dengan:
```js
const colWorld=$('#colWorld'),rig=colWorld;
/* <wv:kamera> dibangun dari src/runtime/kamera.js — JANGAN edit di sini;
   ubah sumbernya lalu jalankan: node scripts/build-starters.mjs */
/* </wv:kamera> */
/* <wv:kamera-dom> dibangun dari src/runtime/kamera-dom.js — JANGAN edit di sini;
   ubah sumbernya lalu jalankan: node scripts/build-starters.mjs */
/* </wv:kamera-dom> */
```
lalu `tl.set(C,{x:520,y:480,z:1.9,onUpdate:applyCam},15.3);` → `cutTo(15.3,{fx:520,fy:480,zoom:1.9});` dan `home(18.2,1.2);` → `home(18.2,960,540,1.2);`.

- [ ] **Step 5: Bangun, hapus sumber lama, lint, uji**

```bash
git rm -q src/runtime/kamera-kolase.js
node scripts/build-starters.mjs
node scripts/build-starters.mjs --check
node scripts/lint-motion.mjs assets/*.html
node scripts/test-starters.mjs
```
Expected: `5 starter diperbarui dari src/runtime (…kamera, kamera-dom…)`; check sinkron; lint `0 FAIL` di semua; `7 starter lolos.`

- [ ] **Step 6: Rekam SESUDAH dan bandingkan**

```bash
cd scripts && node _cmp_tmp.mjs ../sesudah.json ../assets/starter-explainer-kartun.html ../assets/starter-explainer-jurnalisme.html ../assets/starter-explainer-katalog.html ../assets/starter-explainer-sketsa.html ../assets/starter-explainer.html && cd ..
cmp sebelum.json sesudah.json && echo IDENTIK
```
Expected: `IDENTIK`. Bila berbeda: `diff sebelum.json sesudah.json | head` — penyebab lazim: `W/2` vs literal `960` menghasilkan string sama, tetapi urutan `onUpdate` pada `cutTo` bisa membuat frame 0 belum ter-apply; `applyCam()` tetap dipanggil di `document.fonts.ready` (sudah ada di starter). Perbaiki sumber, bangun ulang, ulangi — jangan menyentuh `sebelum.json`.

- [ ] **Step 7: Bersihkan & commit**

```bash
rm scripts/_cmp_tmp.mjs sebelum.json sesudah.json
git add -A src/runtime assets
git commit -m "Starter explainer memakai kamera.js + kamera-dom.js; kamera-kolase.js dihapus (transform identik)"
```

---

### Task 6: Backend 2.5D penuh — perspektif, bidang `data-z`, rack focus, cahaya, `?demo=1`

**Files:**
- Modify: `src/runtime/kamera-dom.js`
- Modify: `scripts/test-starters.mjs` (uji 2.5D)

**Interfaces:**
- Produces: `light(at,dur,preset,o)` (preset `day golden blue night lowkey studio`), `CAHAYA` (tabel), bidang `[data-z]` sebagai pembungkus (GSAP tidak menyentuh pembungkus; anak-anaknya bebas dianimasikan).
- `applyCam()` membaca `tl.time()` untuk handheld (`tl` = satu-satunya jam yang diizinkan).

- [ ] **Step 1: Tulis uji browser yang gagal** — tambahkan di `scripts/test-starters.mjs` setelah blok `seek`:

```js
    // kamera 2.5D (kamera-dom.js): jalur 2D tidak menyentuh gaya lain; sudut → transform 3D; bidang data-z paralaks; cahaya
    const cam = await page.evaluate(() => {
      if (!window.CAM_UJI) return null;                                  // starter tanpa backend dom
      return window.CAM_UJI();
    });
    if (cam) {
      if (cam.gayaLain) masalah.push(`jalur 2D menulis gaya selain transform: ${cam.gayaLain}`);
      if (!/rotateY\(5deg\)/.test(cam.t3d)) masalah.push(`yaw 5° tidak menghasilkan rotateY(5deg): ${cam.t3d}`);
      if (!cam.paralaks) masalah.push('bidang data-z tidak bergeser berbeda dari z=0 saat truck');
      if (cam.lampu !== 'multiply') masalah.push(`light('golden') tidak memasang overlay multiply (${cam.lampu})`);
      if (!cam.urutanDitolak) masalah.push("light() dengan 'at' mundur harus ditolak");
      if (!(cam.demoAkhir < cam.DUR)) masalah.push(`?demo=1 lebih panjang dari DUR (${cam.demoAkhir} ≥ ${cam.DUR})`);
    }
```
`window.CAM_UJI` disediakan `kamera-dom.js` hanya bila `q.has('uji')`; jadi uji membuka starter dengan `?uji=1`: ubah `page.goto(pathToFileURL(file).href, …)` menjadi `page.goto(pathToFileURL(file).href + '?uji=1', …)`.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node scripts/test-starters.mjs assets/starter-explainer-kartun.html`
Expected: `ok` (karena `CAM_UJI` belum ada → `cam === null`) — jadi tambahkan dulu kait uji minimum di `kamera-dom.js`: `if(q.has('uji'))window.CAM_UJI=()=>({});` lalu bangun & jalankan lagi → GAGAL dengan 5 masalah.

- [ ] **Step 3: Tulis `kamera-dom.js` penuh** (ganti seluruh isi)

```js
/* BACKEND 2.5D — membaca CAM, menulis transform ke rig (#world/#colWorld), bidang [data-z], dan
   overlay cahaya. Jalur 2D murni (tanpa pitch/yaw/roll/shake/bidang) memakai string yang PERSIS
   sama dengan kamera kolase lama dan tidak menyentuh gaya lain.
   BIDANG: pembungkus [data-z="-300"] (elemen <div>/<svg> sendiri — transform 3D DI DALAM svg diratakan
   Chrome). GSAP menganimasikan ANAK pembungkus, bukan pembungkusnya. scale((P-z)/P) membuat ukuran
   saat diam sama dengan 2D; paralaks muncul saat kamera bergerak. */
CAM.mode='dom';
const BIDANG=[...rig.querySelectorAll('[data-z]')].map(e=>({el:e,z:+e.dataset.z}));
if(BIDANG.length)rig.style.transformStyle='preserve-3d';
function applyCam(){
  const t=tl.time(),P=W*CAM.mm/36;let fx=CAM.fx,fy=CAM.fy,pitch=CAM.pitch,yaw=CAM.yaw,roll=CAM.roll;
  if(CAM.shake){const a=CAM.shake;fx+=(noise(t*1.7,CAM.seed)-.5)*40*a;fy+=(noise(t*1.3,CAM.seed+1)-.5)*30*a;roll+=(noise(t*.9,CAM.seed+2)-.5)*1.2*a;}
  if(!pitch&&!yaw&&!roll&&!CAM.shake&&!BIDANG.length){
    rig.style.transform=`translate(${W/2-CAM.fx*CAM.zoom}px,${H/2-CAM.fy*CAM.zoom}px) scale(${CAM.zoom})`;}
  else rig.style.transform=`translate(${W/2}px,${H/2}px) perspective(${P}px) rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg) scale(${CAM.zoom}) translate(${-fx}px,${-fy}px)`;
  for(const b of BIDANG){b.el.style.transform=`translateZ(${b.z}px) scale(${(P-b.z)/P})`;
    b.el.style.filter=CAM.aperture?`blur(${Math.min(24,Math.abs(b.z-CAM.focus)*CAM.aperture/100).toFixed(2)}px)`:'';}
  rig.style.filter=CAM.blur?`blur(${CAM.blur}px)`:'';}
/* rack focus: fokus = z bidang yang berisi subjek; aperture>0 mengaburkan bidang lain sebanding jaraknya */
const bidangDari=el=>{let n=el;while(n&&n!==rig){if(n.dataset&&n.dataset.z!=null)return +n.dataset.z;n=n.parentNode;}return 0;};
const focus=(at,dur,el,aperture=6,ease='sine.inOut')=>camTo(at,dur,{focus:bidangDari(el),aperture},ease);
const rackFocus=(at,dur,a,b)=>{cutTo(at,{focus:bidangDari(a),aperture:6});focus(at,dur,b);};

/* CAHAYA 2.5D: overlay gradien di atas rig (nama preset sama dengan kamera-three). Dua div bergantian
   supaya pergantian bisa di-tween. ponytail: urutan panggilan = urutan waktu — light() dengan 'at'
   lebih kecil dari panggilan sebelumnya ditolak. */
const CAHAYA={
  day:   {bg:'none',blend:'normal',op:0},
  golden:{bg:'linear-gradient(200deg,#ffd38a 0%,#ffb05a 45%,#5a3a6e 100%)',blend:'multiply',op:.55},
  blue:  {bg:'linear-gradient(180deg,#7fa6ff 0%,#4a63b8 60%,#1b2244 100%)',blend:'multiply',op:.6},
  night: {bg:'linear-gradient(180deg,#2a3560,#0c1020)',blend:'multiply',op:.8},
  lowkey:{bg:'radial-gradient(60% 60% at 50% 50%,transparent 15%,rgba(0,0,0,.92) 70%)',blend:'normal',op:1},
  studio:{bg:'radial-gradient(50% 50% at 30% 20%,rgba(255,255,255,.35),transparent 70%)',blend:'screen',op:1}};
const LAMP=[0,1].map(()=>{const d=document.createElement('div');d.className='cahaya';
  d.style.cssText='position:absolute;inset:0;pointer-events:none;opacity:0';rig.insertAdjacentElement('afterend',d);return d;});
let lamp=0,lampAt=-1;
function light(at,dur,preset,o={}){const p={...CAHAYA[preset],...o};if(!CAHAYA[preset])throw new Error('preset cahaya tidak dikenal: '+preset);
  if(at<lampAt)throw new Error('light(): panggil urut waktu (detik '+at+' setelah '+lampAt+')');lampAt=at;
  const n=LAMP[1-lamp],c=LAMP[lamp];
  tl.set(n,{background:p.bg,mixBlendMode:p.blend,opacity:0},at);
  tl.to(n,{opacity:p.op,duration:dur,ease:'sine.inOut'},at);tl.to(c,{opacity:0,duration:dur,ease:'sine.inOut'},at);lamp=1-lamp;}

/* ?demo=1 — katalog kosakata (bukan rundown): tiap entri satu langkah; total dijaga < DUR supaya penjaga loop tidak memotong */
if(q.has('demo')){const s=rig.querySelector('[data-subjek],.cut,.cutout,img,svg')||rig.firstElementChild;
  const step=DUR/28;let t=0;   // 27 entri → selesai sebelum DUR
  for(const k in SHOT){shot(t,step*.7,k,s);t+=step;}
  for(const k in ANGLE.dom){angle(t,step*.7,k);t+=step;}angle(t,step*.4,'eye');
  for(const [f,a] of [[dolly,1.4],[truck,220],[pedestal,-120],[pan,6],[tilt,5]]){f(t,step*.8,a);t+=step;}home(t);t+=step;
  for(const k in CAHAYA){light(t,step*.5,k);t+=step;}handheld(t,t+step,.8);t+=step;
  window.DEMO_AKHIR=t;}
/* ?uji=1 — kait untuk scripts/test-starters.mjs (tidak dipakai deliverable) */
if(q.has('uji'))window.CAM_UJI=()=>{const r={};
  cutTo(0,{fx:W/2,fy:H/2,zoom:1});tl.pause(0);applyCam();
  r.gayaLain=[...rig.style].filter(p=>p!=='transform'&&!(p==='transform-style'&&BIDANG.length)).join(',');
  CAM.yaw=5;applyCam();r.t3d=rig.style.transform;CAM.yaw=0;
  const b=document.createElement('div');b.dataset.z='-300';b.style.cssText='position:absolute;left:0;top:0;width:10px;height:10px';rig.appendChild(b);
  BIDANG.push({el:b,z:-300});rig.style.transformStyle='preserve-3d';
  CAM.fx=W/2;applyCam();const a1=b.getBoundingClientRect().left,a0=rig.getBoundingClientRect().left;
  CAM.fx=W/2+200;applyCam();r.paralaks=Math.abs((b.getBoundingClientRect().left-a1)-(rig.getBoundingClientRect().left-a0))>1;
  BIDANG.pop();b.remove();rig.style.transformStyle='';CAM.fx=W/2;applyCam();
  light(0,.1,'golden');tl.time(.2);r.lampu=getComputedStyle(LAMP[lamp?0:1]).mixBlendMode;
  try{light(-1,.1,'day');r.urutanDitolak=false;}catch(e){r.urutanDitolak=true;}
  r.DUR=DUR;r.demoAkhir=window.DEMO_AKHIR??0;return r;};
```
Catatan: `q`, `DUR` sudah ada di semua starter explainer; `noise`, `SHOT`, `ANGLE`, `shot`, `angle`, `dolly`… datang dari blok `<wv:kamera>` yang disisipkan sebelum blok ini.

- [ ] **Step 4: Bangun & uji**

```bash
node scripts/build-starters.mjs && node scripts/lint-motion.mjs assets/*.html && node scripts/test-starters.mjs
```
Expected: lint `0 FAIL`; `7 starter lolos.` Bila `demoAkhir` 0 (karena `?uji=1` tanpa `?demo=1`), ubah uji agar membuka `?uji=1&demo=1` untuk starter explainer — tetapi `?demo=1` menambah tween; identitas Task 5 tidak terpengaruh karena uji itu sudah selesai.

- [ ] **Step 5: Potret katalog sebagai bukti**

```bash
cd assets && URL="file:///$(pwd | sed 's|^/||')/starter-explainer-kartun.html?clean=1&demo=1" node ../scripts/snap.mjs ../evals/bukti/2026-10-04-demo-kamera-2-5d 0.5 1.2 1.9 2.6 3.3 4.0 5.4 6.1 7.5 9.6 11.0 12.4 && cd ..
```
Expected: `evals/bukti/2026-10-04-demo-kamera-2-5d/kontak.png` — BUKA dan nilai: shot membesar bertahap ECU→EWS, dutch terlihat miring, overlay cahaya berganti.

- [ ] **Step 6: Commit**

```bash
git add src/runtime/kamera-dom.js scripts/test-starters.mjs assets evals/bukti
git commit -m "kamera-dom.js: perspektif, bidang data-z, rack focus, overlay cahaya, ?demo=1 + uji browser"
```

---

### Task 7: Lint — `determinisme-clock`, `composer-render-jam`; export JPEG q80; buang `--enable-gpu`

**Files:**
- Modify: `scripts/lint-motion.mjs` (setelah aturan determinisme-interval, baris ±57)
- Modify: `scripts/export-frames.mjs:46` (`QUALITY`), `:76` (args), komentar kepala
- Modify: `scripts/snap.mjs:35`, `scripts/test-starters.mjs:33` (args launch)

- [ ] **Step 1: Fixture lint yang harus gagal**

Buat `evals/bukti/lint-three-buruk.html` (fixture kecil, di-commit sebagai contoh negatif):
```html
<!doctype html><div id="stage"><div id="world"></div></div>
<script type="module">
const clock=new THREE.Clock(); const mixer={update(){}};
function render(){ mixer.update(clock.getDelta()); composer.render(); }
window.OPENER={W:1920,H:1080,DURATION:10,tl:{},seek(){},ready:true};
</script>
```
Run: `node scripts/lint-motion.mjs evals/bukti/lint-three-buruk.html; echo kode=$?`
Expected (sebelum): `0 FAIL`, `kode=0` — aturan belum ada.

- [ ] **Step 2: Tambah aturan**

```js
  // 2b. Three.js: jam & akumulasi tersembunyi (spec kamera sinematik §6)
  for (const { idx, m } of all(src, /new\s+THREE\.Clock\b|\.getDelta\s*\(|\bmixer\.update\s*\(/g))
    add('FAIL', 'determinisme-clock', `${m[0].trim()} — jam/akumulasi di luar tl.time(); scrub & export tidak reproducible`, idx,
      'AnimationMixer.setTime(tl.time()); uniform waktu ditulis dari t');
  for (const { idx } of all(src, /composer\.render\s*\(\s*\)/g))
    add('FAIL', 'composer-render-jam', 'composer.render() tanpa argumen membaca Clock internal (FilmPass/Noise bergerak sendiri)', idx,
      'composer.render(0) dan tulis uniform waktu dari tl.time()');
```

- [ ] **Step 3: Jalankan**

Run: `node scripts/lint-motion.mjs evals/bukti/lint-three-buruk.html; echo kode=$?`
Expected: `determinisme-clock` ×3 + `composer-render-jam` ×1 → `4 FAIL`, `kode=1`. Lalu `node scripts/lint-motion.mjs assets/*.html` → tetap `0 FAIL` semua.

- [ ] **Step 4: Export q80 & flag**

Di `export-frames.mjs`: `const QUALITY = Number(process.env.QUALITY || (MP4 ? 80 : 95));` dan di komentar kepala: `QUALITY kualitas JPEG (80 di mode MP4 — ffmpeg mengencode ulang, q95 tidak terlihat bedanya; 95 di mode folder).` Hapus `'--enable-gpu', ` dari daftar `args` di `export-frames.mjs`, `snap.mjs`, `test-starters.mjs` (bukan switch Chromium yang dikenal — riset §G).

- [ ] **Step 5: Verifikasi cepat**

```bash
for f in scripts/*.mjs; do node --check "$f"; done
node scripts/test-starters.mjs assets/starter-explainer-kartun.html
cd assets && FPS=30 MP4=../_uji.mp4 node ../scripts/export-frames.mjs 2>&1 | tail -2; cd .. && ffprobe -v error -show_entries format=duration -of csv=p=0 _uji.mp4 && rm _uji.mp4
```
(`export-frames` memakai `index.html` di cwd — untuk uji ini jalankan dari folder sementara berisi salinan `starter-explainer-kartun.html` yang dinamai `index.html`, atau set `URL=` ke berkas starter.)
Expected: `ok starter-explainer-kartun.html`; export selesai, durasi ≈ 18.

- [ ] **Step 6: Commit**

```bash
git add scripts/lint-motion.mjs scripts/export-frames.mjs scripts/snap.mjs scripts/test-starters.mjs evals/bukti/lint-three-buruk.html
git commit -m "lint: determinisme-clock & composer-render-jam; export MP4 JPEG q80; buang --enable-gpu"
```

---

### Task 8: CI, dokumen rujukan singkat, CHANGELOG

**Files:**
- Modify: `.github/workflows/ci.yml` (langkah uji inti)
- Modify: `references/techniques.md` §3b (rujukan ke kosakata baru, ≤ 12 baris)
- Modify: `references/architecture.md` ("Rig kamera `#world`")
- Modify: `references/roadmap.md` (butir 8 & "Sudah dikerjakan")
- Modify: `references/explainer.md` "Resep kamera kolase" (satu kalimat: alias tetap, kosakata baru)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: CI** — tambahkan sebelum "Starter sinkron":
```yaml
      - name: Uji inti kamera (node:test, tanpa browser)
        run: node --test scripts/test-kamera.mjs
```

- [ ] **Step 2: techniques.md §3b** — tambahkan setelah blok kode `Rig`:
```markdown
**Kosakata bersama (v1.23, `src/runtime/kamera.js`)** — starter explainer sudah memuatnya; opener menyusul:
`shot(at,dur,'ECU|CU|MCU|MS|WS|EWS',el)` menggantikan `frameOn()`; sudut `angle(at,dur,'eye|high|low|overhead|worm|dutch|ots|pov')`;
gerak `dolly/truck/pedestal/pan/tilt/crane/arc`; `lens(mm)`, `dollyZoom`, `whip`, `handheld` (noise ber-seed);
`focus/rackFocus` pada bidang `[data-z]`; `light(at,dur,'day|golden|blue|night|lowkey|studio')`; `hud.reserve(sel,at,dur)` menolak
shot yang membawa subjek ke kantong teks. Bidang paralaks = pembungkus `<div data-z="-300">` atau `<svg data-z>` sendiri
(transform 3D di dalam SVG diratakan Chrome). `rule180(yaw)` mengunci orbit ke satu sisi garis aksi. Katalog: `?demo=1`.
Tabel istilah film → fungsi: `references/sinematografi.md` (Rencana B).
```

- [ ] **Step 3: architecture.md, roadmap.md, explainer.md, CHANGELOG.md**

- architecture.md "Rig kamera `#world`": tambahkan kalimat "Sejak v1.23 rig ditulis oleh `applyCam()` dari `src/runtime/kamera-dom.js` berdasarkan objek `CAM` (`src/runtime/kamera.js`); jalur 2D murni menghasilkan `translate(…) scale(…)` yang sama, jalur 2.5D menambah `perspective/rotateX/Y/Z` dan bidang `[data-z]`."
- roadmap.md: butir 8 → "Kamera: inti + backend 2.5D satu sumber (v1.23); backend Three.js menyusul"; "Sudah dikerjakan": "Kamera bersama `kamera.js` + `kamera-dom.js`, zona aman HUD, lint Clock (Rencana A kamera sinematik)."
- explainer.md "Resep kamera kolase": tambahkan "`look/home/into/settle/breath` tetap; kosakata shot/sudut/gerak/cahaya di `techniques.md` §3b."
- CHANGELOG.md, paling atas:
```markdown
## Belum dirilis — kamera sinematik, Rencana A
- `src/runtime/kamera.js` (inti `CAM`, shot/sudut/gerak/lensa/whip/handheld ber-seed, zona aman HUD, aturan 180°/30°) menggantikan `kamera-kolase.js`; alias lama tetap, transform starter identik.
- `src/runtime/kamera-dom.js`: perspektif, bidang paralaks `[data-z]`, rack focus, overlay cahaya, `?demo=1`.
- Lint: `determinisme-clock`, `composer-render-jam`. Export MP4: JPEG q80 (−20 % waktu/frame). Uji: `scripts/test-kamera.mjs`.
```

- [ ] **Step 4: Semua pemeriksaan CI lokal**

```bash
for f in scripts/*.mjs; do node --check "$f"; done
node --test scripts/test-kamera.mjs && node scripts/build-starters.mjs --check && node scripts/bump-version.mjs --check \
 && node scripts/context-budget.mjs --check && node scripts/lint-motion.mjs assets/*.html && node scripts/cdn-integrity.mjs --check assets/*.html \
 && node scripts/test-starters.mjs
```
Expected: semua hijau. `context-budget`: jalur "Explainer (kolase / aliran)" naik karena starter kartun bertambah ±6 KB — bila melewati 160 KB, naikkan batas ke 170 dengan alasan di CHANGELOG (blok kamera adalah perkakas, bukan aturan).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml references CHANGELOG.md scripts/context-budget.mjs
git commit -m "Dokumen & CI untuk kamera bersama (Rencana A); CHANGELOG belum dirilis"
```

---

## Self-review

- **Spec coverage (fase 0–1 + §6 bagian yang relevan):** §2 inti/backend-dom/alias → Task 1, 5, 6; §3.1 `CAM` → Task 1; §3.2 shot/angle/gerak/lensa/fokus/whip/napas/zona aman/cahaya/penjaga → Task 2, 4, 6; §6 lint Clock + render-jam → Task 7; export q80 + `--enable-gpu` → Task 7; `test-starters` uji 2.5D → Task 6; uji hash frame kanvas, `vendor-libs`, eval brief 09, `sinematografi.md`, SKILL.md, bump versi → **Rencana B** (disebut di Global Constraints). `rail()` 2.5D ditunda (dicatat).
- **Placeholder scan:** tidak ada TBD/TODO; setiap langkah kode berisi kode.
- **Type consistency:** `camTo(at,dur,v,ease)`, `cutTo(at,v)`, `shot()` mengembalikan `{fx,fy,zoom}`, `hud.check(at,dur,r,v)`, `light(at,dur,preset,o)`, `CAM.blur/dz` dideklarasikan di Task 2 dan dipakai Task 6 — konsisten. `rig` didefinisikan starter sebelum blok (`const rig=$('#world')` kolase; `const colWorld=…,rig=colWorld` aliran).
- **Review Focus:** #1 → Task 3; #2 → Task 5 Step 6 + Task 6 `gayaLain`; #3 → Task 6 `urutanDitolak`; #4 → Task 4 uji kedua; #5 → Task 6 `demoAkhir < DUR`.
