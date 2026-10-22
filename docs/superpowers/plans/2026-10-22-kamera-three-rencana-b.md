# Kamera Three.js + starter 3D + dokumen sinematografi — Rencana B

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend Three.js untuk kamera bersama WeVai (shot, sudut, gerak, lensa, rail, fokus, cahaya), starter explainer 3D baru, opener yang memakai `CAM`, dan dokumen `references/sinematografi.md` + perubahan SKILL.md, dirilis sebagai WeVai 1.1.0.

**Architecture:** Inti `src/runtime/kamera.js` (Rencana A, sudah ada) mendapat matematika 3D murni yang bisa diuji di node (`pose`, `jarakBingkai`, `camDefaults`) dan perilaku mode `three` untuk `truck`/`dollyZoom`. Backend baru `src/runtime/kamera-three.js` membaca `CAM` di `applyCam()` dan menulis ke `camera` Three.js, plus perkakas dunia (`mat`, `fromSVG`, `light`, `practical`, `focus`, `rail`). Keduanya disisipkan `build-starters.mjs` ke `assets/starter-explainer-3d.html` (baru) dan `assets/starter-opener.html` lewat penanda `<wv:kamera>` / `<wv:kamera-three>`.

**Tech Stack:** Three.js **r161** via import map jsDelivr (dikunci), GSAP 3.12.5, puppeteer 25 (uji browser), `node:test` (uji inti).

**Spec:** `docs/superpowers/specs/2026-10-03-kamera-sinematik-3d-design.md` — §2 (arsitektur), §3 (kosakata), §4 (starter 3D), §5 (dokumen skill), §6 (alat & pengujian), §7 fase 2–3. Pendamping: `docs/riset-3d-sinematografi-2026-10-03.md` (fakta r161), `docs/riset-animejs-2026-10-22.md` (nilai relatif GSAP bergantung jalur seek).

## Global Constraints

- Repo: `E:\mila\wevai`, branch `main`. Nama produk **WeVai**; penanda build `<wv:…>`.
- Deterministik: visual = fungsi murni `tl.time()`. Tanpa `THREE.Clock`, `getDelta`, `mixer.update(`, `Math.random`, `Date.now` di jalur render; `composer.render(0)` selalu dengan argumen. Lint yang ada sudah memeriksanya.
- Deliverable satu berkas `file://`: tanpa loader berkas lokal (`GLTFLoader.load`, `TextureLoader`, `RGBELoader`); aset 3D = geometri prosedural atau `SVGLoader.parse(string)`.
- Three **r161** dikunci (`https://cdn.jsdelivr.net/npm/three@0.161.0/…`). Jebakan r161 yang wajib dihormati: `CatmullRomCurve3` dengan 2 titik rusak (tolak < 3 titik); `new RoomEnvironment(renderer)` selalu dengan `renderer`; `PCFSoftShadowMap` boleh (deprecated baru di r186).
- `camera.filmGauge = 36`; `mm` → fov lewat `camera.setFocalLength(mm)`.
- Warna brand tepat: `mat()` selalu `toneMapped:false`; starter 3D memakai `renderer.toneMapping = THREE.NoToneMapping`.
- Kontrak `window.OPENER = {W,H,DURATION,tl,seek,ready}` tidak berubah; `seek(t)` menggambar sinkron (render WebGL di dalam `seek`).
- Target kinerja starter 3D: ekspor 1080p **≥ 3 frame/dtk** di mesin acuan (i3-3217U / HD 4000) tanpa DOF.
- Versi rilis: **1.1.0** (`node scripts/bump-version.mjs 1.1.0`).
- Keputusan perencana yang menyimpang dari teks spec (sudah diputuskan; jangan dibuka ulang):
  1. `vendor-libs.mjs` **tidak** diperluas — skrip itu memang tidak bisa menanam ES module (batas tertulis di kepalanya); arsip starter 3D = MP4.
  2. `camThrough`/`breathe` di opener **tetap** pada rig DOM `#world` (yang men-zoom kanvas DAN teks bersama — alasan `architecture.md`), bukan dipindah ke `CAM`.
  3. Di mode 3D, `fx/fy/fz` adalah koordinat dunia Three (Y ke atas): `pedestal(dy>0)` = naik. Di 2.5D `dy>0` = turun (sumbu layar). Ditulis di `sinematografi.md`.
  4. Di mode 3D, `pan`/`tilt` memutar kamera **mengelilingi titik fokus** (orbit kecil), bukan memutar kepala di tempat; pan sungguhan = `rail(…, {look})`. Ditulis di `sinematografi.md`.
  5. Tone mapping opener **tidak** diubah (tetap ACES, latar placeholder); warna brand tetap tepat karena `mat()` memakai `toneMapped:false`.
  6. `shot-30-derajat` tetap peringatan konsol saat setup (Rencana A), bukan lint statis.
  7. `follow(a,b,subjek,offset)` dari spec §3.2 **tidak** dibuat: posisi subjek baru diketahui saat render, sehingga `PLAN` tidak bisa menyelesaikan gerak kamera sesudahnya (bertentangan dengan jaminan "hasil sama di jalur seek mana pun"). Gantinya: keyframe `shot()`/`camTo()` yang diselaraskan dengan tween subjek, atau `rail()`. Ditulis di `sinematografi.md`.
  8. Alias kolase `look`/`home` memakai koordinat layar (bawaan `W/2,H/2`) — **tidak** dipakai di 3D; `sinematografi.md` menyebutnya di Jebakan. Di 3D `whipPan` memutar `yaw` (Task 1), bukan menggeser 180 unit.

## Review Focus

1. **`shot()` 3D pada `Group` kosong / objek tak terlihat / ukuran 0** → `jarakBingkai` membagi 0 dan kamera ke `Infinity`. Diharapkan: error setup yang menyebut subjeknya. Diuji di Task 2 (`CAM3_UJI.kosongDitolak`).
2. **`rail()` dengan 2 titik** (bug r161) → kamera melompat liar. Diharapkan: error setup. Diuji di Task 4 (`railDuaDitolak`).
3. **Seek lewat jalur berbeda di dunia ber-bayangan** → piksel berbeda antara `seek(5)` langsung dan `seek(9)`→`seek(5)`. Diharapkan identik. Diuji di Task 5 (hash kanvas dua jalur).
4. **Gerak kamera setelah rail selesai** → kamera melompat dari ujung rail ke pose bola lama. Diharapkan kontinu. Diuji di Task 4 (`railSambung`).
5. **`?demo=1` di starter 3D lebih panjang dari `DUR`** atau melempar karena urutan `light()` → katalog terpotong / halaman mati. Diuji di Task 5 (`demoAkhir < DUR`).

---

### Task 1: Matematika 3D murni di inti kamera

**Files:**
- Modify: `src/runtime/kamera.js` (tambah `camDefaults`, `pose`, `jarakBingkai`; ubah `truck`, `dollyZoom`)
- Test: `scripts/test-kamera.mjs`

**Interfaces:**
- Produces:
  - `camDefaults(v: object): void` — `Object.assign(CAM, v)` dan `Object.assign(PLAN, v)` (backend memanggilnya untuk nilai awal mode 3D).
  - `pose(c: {fx,fy,fz,dist,yaw,pitch}) → {x,y,z}` — posisi kamera dari koordinat bola (derajat). `x = fx + dist·cos(pitch)·sin(yaw)`, `y = fy − dist·sin(pitch)`, `z = fz + dist·cos(pitch)·cos(yaw)`. (pitch negatif = kamera di atas fokus, menunduk — cocok dengan `ANGLE.three.high = −30`.)
  - `jarakBingkai(h: number, w: number, fill: number, mm: number, aspect = W/H) → number` — jarak supaya subjek setinggi `h`, selebar `w` mengisi `fill` bagian frame: `Hf = max(h, w/aspect) / fill`, `dist = Hf · mm · max(aspect,1) / 36`. Lempar `Error('jarakBingkai: ukuran subjek 0')` bila `max(h,w) ≤ 0` atau hasil tidak finite.
  - `truck` mode `three`: geser sepanjang vektor kanan kamera dari `PLAN.yaw`: `fx += dx·cos(yaw)`, `fz += −dx·sin(yaw)`. Mode `dom` tidak berubah.
  - `dollyZoom` mode `three`: `{mm, dist: PLAN.dist·mm/PLAN.mm}` (dist dan mm diinterpolasi dengan ease yang sama → `dist/mm` konstan sepanjang tween → subjek di fokus tetap sebesar semula). Mode `dom` tidak berubah.
  - `whipPan(at, dir)` mode `three`: `camTo(at, .28, {yaw:'+='+(70*dir)}, 'power2.in')` tanpa `fx` dan tanpa `blur` (backend 3D tidak punya blur rig). Mode `dom` tidak berubah.
  - `shot()` mode `three`: cabang `CAM.frame3d` dijalankan SEBELUM resolusi selector DOM, dan menerima `Object3D` ATAU nama (string → backend mencarinya lewat `scene.getObjectByName`). Setelah `v` dihitung, panggil `CAM.cek3 && CAM.cek3(at, dur, el, v)` (zona aman HUD 3D, Task 2).
- Tambahkan `camDefaults,pose,jarakBingkai` ke daftar `return {…}` di fungsi `load()` harness.

- [ ] **Step 1: Uji yang gagal** — tambahkan ke `scripts/test-kamera.mjs`:
```js
test('pose(): kamera di belakang fokus pada yaw 0, di atas saat pitch negatif, di kanan saat yaw 90', () => {
  const k = load(), c = { fx: 1, fy: 2, fz: 3, dist: 10, yaw: 0, pitch: 0 };
  assert.deepEqual(k.pose(c), { x: 1, y: 2, z: 13 });
  const p = k.pose({ ...c, pitch: -30 });
  assert.ok(Math.abs(p.y - 7) < 1e-9 && Math.abs(p.z - (3 + 10 * Math.cos(Math.PI / 6))) < 1e-9);
  const q = k.pose({ ...c, yaw: 90 });
  assert.ok(Math.abs(q.x - 11) < 1e-9 && Math.abs(q.z - 3) < 1e-9);
});
test('jarakBingkai(): rumus filmGauge 36, sisi panjang; subjek 0 ditolak', () => {
  const k = load();
  assert.ok(Math.abs(k.jarakBingkai(1.7, .6, .45, 35, 16 / 9) - 6.52963) < 1e-4);
  assert.ok(Math.abs(k.jarakBingkai(1, 4, 1, 50, 16 / 9) - 4 / (16 / 9) * 50 * (16 / 9) / 36) < 1e-9, 'subjek lebar: lebar yang menentukan');
  assert.throws(() => k.jarakBingkai(0, 0, .45, 35), /ukuran subjek 0/);
});
test('mode three: camDefaults menyinkronkan PLAN; truck mengikuti yaw; dollyZoom menjaga dist/mm', () => {
  const k = load(); k.CAM.mode = 'three';
  k.camDefaults({ fx: 0, fy: 0, fz: 0, dist: 10, yaw: 90, mm: 35 });
  k.truck(0, 1, 2); const v = k.calls.at(-1).v;
  assert.ok(Math.abs(v.fx - 0) < 1e-9 && Math.abs(v.fz + 2) < 1e-9);
  k.dollyZoom(1, 2, 70); assert.deepEqual([k.calls.at(-1).v.mm, k.calls.at(-1).v.dist], [70, 20]);
  k.whipPan(4, 1); assert.deepEqual([k.calls.at(-1).v.yaw, k.calls.at(-1).v.fx], [160, undefined]);
  let diminta = null; k.CAM.frame3d = (fill, el) => { diminta = el; return { fx: 1, fy: 2, fz: 3, dist: 9 }; };
  k.shot(5, 1, 'WS', 'subjek'); assert.equal(diminta, 'subjek', 'nama diteruskan ke frame3d, bukan dicari di DOM');
  const d = load(); d.dollyZoom(0, 1, 85); assert.equal(d.calls.at(-1).v.dist, undefined, 'mode dom tidak menyentuh dist');
});
```

- [ ] **Step 2: Jalankan** `node --test scripts/test-kamera.mjs` → 3 FAIL baru (`k.pose is not a function`, dst.), 13 lama tetap lolos.

- [ ] **Step 3: Implementasi** di `src/runtime/kamera.js` sesuai Interfaces. `truck` mode `three` memakai `PLAN.yaw` (derajat → radian) dan menghasilkan nilai absolut lewat `mutlak` (tulis sebagai string relatif `'+='+…` per sumbu, supaya urut-waktu tetap dijaga). Komentar satu baris untuk tiap fungsi.

- [ ] **Step 4: Jalankan** `node --test scripts/test-kamera.mjs` → `# pass 16`, `# fail 0`.

- [ ] **Step 5: Commit**
```bash
git add src/runtime/kamera.js scripts/test-kamera.mjs
git commit -m "kamera.js: pose(), jarakBingkai(), camDefaults(); truck & dollyZoom mode three"
```

---

### Task 2: Backend `kamera-three.js` + starter explainer 3D (kerangka)

**Files:**
- Create: `src/runtime/kamera-three.js`
- Create: `assets/starter-explainer-3d.html`
- Modify: `scripts/test-starters.mjs` (blok `CAM3_UJI`)

**Interfaces:**
- Consumes (Task 1): `CAM`, `PLAN`, `camDefaults`, `pose`, `jarakBingkai`, `noise`, `SHOT`, `camTo`, `cutTo`.
- Consumes (dari starter, harus dideklarasikan SEBELUM blok `<wv:kamera>`): `THREE`, `W`, `H`, `$`, `tl`, `rig` (= `$('#world')`), `scene`, `camera` (PerspectiveCamera), `renderer`, `composer`; dan import `SVGLoader`, `BokehPass`, `RoomEnvironment` (dipakai Task 3).
- Produces (global di dalam module starter):
  - `applyCam(): void` — `camera.filmGauge=36`; `camera.setFocalLength(CAM.mm)`; posisi = `pose(CAM)` + handheld (noise ber-seed dari `tl.time()`: posisi ±0,05·shake unit, roll ±0,3°·shake); `camera.lookAt(CAM.fx,CAM.fy,CAM.fz)`; lalu `camera.rotateZ(roll·π/180)`; `camera.zoom = CAM.zoom`; `updateProjectionMatrix()`. Tidak me-render.
  - `CAM.frame3d(fill: number, obj: THREE.Object3D|string) → {fx,fy,fz,dist}` — string → `scene.getObjectByName` (tidak ada → `Error('shot: subjek 3D … tidak ada')`); pusat & ukuran dari `new THREE.Box3().setFromObject(obj)`; `dist = jarakBingkai(tinggi, lebar, fill, PLAN.mm)`. Box kosong → lempar `Error('shot: subjek 3D kosong — ' + (obj.name||obj.type))`.
  - `CAM.cek3(at, dur, obj, v) → void` — zona aman HUD 3D: untuk tiap reservasi `HUD` (dari `hud.reserve`, inti) yang jendela waktunya beririsan, proyeksikan 8 sudut Box3 subjek dengan kamera sementara di `pose({...PLAN, ...v})` (mm `PLAN.mm`), ubah ke piksel panggung 1920×1080, dan bila kotaknya beririsan dengan kotak elemen HUD (`rectIn(el, $('#stage'))`) lempar `Error` yang sama bunyinya dengan 2.5D (`zona aman: subjek shot pada detik … masuk kantong teks …`).
  - `mat(family: 'flat'|'toon'|'clay'|'glossy'|'realistis', color: string) → THREE.Material` — semua `toneMapped:false`. flat = `MeshBasicMaterial`; toon = `MeshToonMaterial` + `gradientMap` 3 tingkat (`DataTexture` [90,170,255], `NearestFilter`, dibuat sekali); clay = `MeshStandardMaterial{roughness:.9,metalness:0}`; glossy = `MeshPhysicalMaterial{roughness:.25,clearcoat:1}`; realistis = `MeshStandardMaterial{roughness:.5,metalness:.1}`. Family tak dikenal → `Error` yang menyebut daftar.
  - `fromSVG(svg: string, {depth=.2, bevel=.02, family='toon', scale=.01}={}) → THREE.Group` — `new SVGLoader().parse(svg)`, tiap path → `SVGLoader.createShapes` → `ExtrudeGeometry({depth, bevelEnabled:bevel>0, bevelSize:bevel, bevelThickness:bevel})`, material `mat(family, warnaFillPath)`; grup di-`scale(scale, −scale, scale)` (SVG y ke bawah) lalu dipusatkan ke (0,0,0) lewat Box3.
  - `window.CAM3_UJI(): object` — kait uji (lihat Step 1).
- `CAM.mode='three'` dan `camDefaults({fx:0,fy:0,fz:0,dist:10,yaw:0,pitch:0,mm:35,zoom:1})` dijalankan di tingkat atas blok.

**Starter `assets/starter-explainer-3d.html`** (polos, tanpa urutan adegan contoh — antipola roadmap):
- Komentar kepala: kategori explainer 3D + STYLE BRIEF dengan baris starter explainer lain **plus** tiga baris baru: `Lensa default (mm)`, `Sudut & gerak pembuka`, `Preset cahaya per segmen + pemicu pergantian`. Token warna `:root` ABU-ABU placeholder (`--accent:#8A8F98; --ink:#F2F3F7; --base:#111318; --floor:#2A2D34`), font sistem — sama alasannya dengan opener (Hukum #3).
- Struktur: `#stage` 1920×1080 di-scale (`fit()`), `#world` berisi `<canvas id="gl">`; `#hud` DI LUAR `#world` berisi satu `.big` (≥ 120 px) + satu `.lbl` (≥ 34 px) + `#src` kartu sumber (≥ 30 px); `.vig`, `.grain`; `#dbg` panel; `<audio id="vo" src="">`.
- Skrip: GSAP 3.12.5 classic dengan SRI yang sama dengan starter lain; import map three r161 + `three/addons/`; satu `<script type="module">` yang mengimpor `THREE`, `EffectComposer`, `RenderPass`, `OutputPass`, `BokehPass`, `SVGLoader`, `RoomEnvironment`.
- Dunia: `renderer` (antialias, `setPixelRatio(1)`, `setSize(W,H,false)`, `toneMapping=NoToneMapping`, `shadowMap.enabled=true`, `type=PCFSoftShadowMap`), `scene.background` dari `--base`, `scene.environment` dari `PMREMGenerator.fromScene(new RoomEnvironment(renderer))`, lantai `PlaneGeometry(60,60)` `mat('toon','--floor')` `receiveShadow`, subjek `BoxGeometry(1.6,1.6,1.6)` bernama `'subjek'` `mat('toon','--accent')` `castShadow`, satu label HUD.
- Blok: `<wv:blur>`, `<wv:kamera>`, `<wv:kamera-three>`, `<wv:seek>`, `<wv:footage>`, `<wv:explainer-controls>` (urutan ini; semua setelah `tl`, `rig`, `scene`, `camera`, `renderer`, `composer`).
- `render(t)`: `applyCam(); composer.render(0);`. Loop rAF memanggil `render(tl.time())`. `window.OPENER={W,H,DURATION:DUR,tl,ready:false,seek:makeSeek(tl,t=>render(t)),play:start, syncSeek:false}`; boot, autoplay, loop dari jam, `?clean`, `?debug`, VO — salin pola `starter-explainer-kartun.html` (baris `const q=…` sampai `document.fonts.ready…`).
- Contoh minimal di timeline (bukan rundown): `cutTo(0,{dist:14,pitch:-12})`, `shot(.5,1.4,'WS','subjek')`, label HUD masuk di 2,0, `DUR=8`. Pilih komposisi yang tidak menabrak label (uji `hudTabrakDitolak` memakai reservasinya sendiri).

- [ ] **Step 1: Uji yang gagal** — di `scripts/test-starters.mjs`, setelah blok `cam` (CAM_UJI) tambahkan blok serupa untuk `CAM3_UJI` (dimuat ulang `?demo=1` seperti CAM_UJI) dengan asersi:
```js
      if (!(cam3.poseCocok)) masalah.push('kamera3: camera.position ≠ pose(CAM)');
      if (!(Math.abs(cam3.ndc[0]) < .01 && Math.abs(cam3.ndc[1]) < .01)) masalah.push(`kamera3: shot MS tidak memusatkan subjek (${cam3.ndc})`);
      if (!(Math.abs(cam3.isiTinggi - .45) < .01)) masalah.push(`kamera3: shot WS pada bidang 1,6 mengisi ${cam3.isiTinggi} tinggi frame, harus 0,45`);
      if (!cam3.hudTabrakDitolak) masalah.push('kamera3: shot yang membawa subjek ke kantong teks HUD harus ditolak');
      if (cam3.pikselBrand !== '238,28,37') masalah.push(`kamera3: mat('flat','#EE1C25') keluar ${cam3.pikselBrand}`);
      if (!cam3.kosongDitolak) masalah.push('kamera3: shot pada Group kosong harus ditolak');
      if (!cam3.familyDitolak) masalah.push("kamera3: mat('neon') harus ditolak");
```
(`SHOT` = tinggi subjek ÷ tinggi frame: WS 0,45, MS 1,11 — MS sengaja lebih besar dari frame.) `CAM3_UJI` di backend: `cutTo`/`shot` sudah ditulis di timeline, jadi kait ini menyetel `CAM` langsung, memanggil `applyCam()` dan `composer.render(0)`, lalu: `poseCocok` (posisi kamera = `pose(CAM)` ± 1e-6 dengan shake 0), `ndc` (pusat Box3 subjek diproyeksikan), `isiTinggi` (bidang uji sementara `PlaneGeometry(1.6,1.6)` menghadap +Z di titik asal — tanpa kedalaman, jadi bebas distorsi perspektif; `Object.assign(CAM, CAM.frame3d(SHOT.WS, bidang))`, lalu selisih y NDC sudut atas/bawahnya ÷ 2), `hudTabrakDitolak` (`hud.reserve('#hud .lbl', 0, 99)` lalu `shot` CU pada subjek yang kotaknya pasti menutupi label → harus melempar; reservasi dibuang sesudahnya), `pikselBrand` (mesh `PlaneGeometry` `mat('flat','#EE1C25')` memenuhi frame di depan kamera, `renderer.readRenderTargetPixels` atau `gl.readPixels` di tengah dalam task yang sama dengan render), `kosongDitolak`, `familyDitolak`.

- [ ] **Step 2: Jalankan** `node scripts/test-starters.mjs assets/starter-explainer-3d.html` → GAGAL (`ERR_FILE_NOT_FOUND` / berkas belum ada).

- [ ] **Step 3: Implementasi** `src/runtime/kamera-three.js` dan `assets/starter-explainer-3d.html` sesuai Interfaces; tambahkan penanda kosong di starter lalu `node scripts/build-starters.mjs`.

- [ ] **Step 4: Jalankan** dengan `PUPPETEER_EXECUTABLE_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"`:
  `node scripts/build-starters.mjs --check` → sinkron 8 berkas; `node scripts/lint-motion.mjs assets/starter-explainer-3d.html` → 0 FAIL; `node scripts/test-starters.mjs` → `8 starter lolos.`; `node --test scripts/test-kamera.mjs` → 16 lolos.

- [ ] **Step 5: Potret** dari `assets/`: `URL="file:///E:/mila/wevai/assets/starter-explainer-3d.html?clean=1" node ../scripts/snap.mjs ../evals/bukti/2026-10-22-starter-3d 0.2 1.0 2.5 6` → buka `kontak.png`: subjek terpusat di MS pada 2,5 dtk, bayangan jatuh di lantai, label HUD terbaca, latar abu-abu placeholder.

- [ ] **Step 6: Commit**
```bash
git add src/runtime/kamera-three.js assets/starter-explainer-3d.html scripts/test-starters.mjs evals/bukti/2026-10-22-starter-3d/kontak.png
git commit -m "kamera-three.js + starter-explainer-3d: kamera Three.js dari CAM, mat(), fromSVG(), shot 3D"
```

---

### Task 3: Cahaya, lampu praktis, dan fokus (DOF)

**Files:**
- Modify: `src/runtime/kamera-three.js`
- Modify: `scripts/test-starters.mjs` (asersi `CAM3_UJI` tambahan)

**Interfaces:**
- Produces:
  - `LUX` — objek angka yang di-tween: `{kAz,kEl,kI,kR,kG,kB, fI,fsR,fsG,fsB,fgR,fgG,fgB, rI}` (key = `DirectionalLight` `castShadow`, mapSize 2048, kamera bayangan ±20; fill = `HemisphereLight` sky/ground; rim = `DirectionalLight` dari belakang-atas). Dibuat sekali di tingkat atas blok dan ditambahkan ke `scene`.
  - `CAHAYA3` — preset (nilai ditetapkan di sini; heuristik dari tabel riset §Pencahayaan):

    | preset | key az / el / warna / I | fill sky / ground / I | rim I |
    |---|---|---|---|
    | `day` | 45 / 50 / `#FFF6E8` / 2.5 | `#DDEBFF` / `#C9B79C` / 1.0 | 0.6 |
    | `golden` | 60 / 6 / `#FFB46B` / 2.8 | `#FFD9A8` / `#6B4A3A` / 0.5 | 1.2 |
    | `blue` | 0 / 30 / `#6FA8FF` / 0 | `#6FA8FF` / `#1B2244` / 0.8 | 0.4 |
    | `night` | 200 / 40 / `#9DB7FF` / 0.3 | `#2A3560` / `#0C1020` / 0.25 | 0.5 |
    | `lowkey` | 35 / 35 / `#FFFFFF` / 3.0 | `#FFFFFF` / `#000000` / 0.12 | 0.8 |
    | `studio` | 45 / 35 / `#FFFFFF` / 2.5 | `#FFFFFF` / `#B0B0B0` / 0.7 | 1.5 |
  - `light(at: number, dur: number, preset: string, o: object = {}) → void` — `tl.to(LUX, {...nilai preset (warna diuraikan ke r,g,b 0–1), ...o, duration:dur, ease:'sine.inOut', onUpdate:applyLux}, at)`; preset tak dikenal → `Error` yang menyebut daftar; panggilan dengan `at` lebih kecil dari panggilan sebelumnya → `Error('light(): panggil urut waktu …')` (sama dengan 2.5D). `applyLux()` menulis LUX ke lampu (posisi key dari az/el di bola radius 30 mengelilingi `(CAM.fx,0,CAM.fz)`).
  - `practical(mesh: THREE.Mesh, color: string, intensity = 2, distance = 8) → THREE.PointLight` — `PointLight` di posisi dunia mesh; `mesh.material.emissive` = warna, `emissiveIntensity` 1, `toneMapped:false`.
  - `focus(at, dur, obj, aperture = 6, ease = 'sine.inOut')` dan `rackFocus(at, dur, a, b)` — sama tanda tangannya dengan 2.5D; di 3D `CAM.focus` = jarak dari `pose(PLAN)` ke pusat Box3 `obj` (dihitung saat setup; ponytail: fokus tidak mengikuti bila kamera bergerak sesudahnya — ditulis di `sinematografi.md`). `applyCam()` menyalakan `BokehPass` (dibuat sekali, disisipkan sebelum `OutputPass`) hanya bila `CAM.aperture > 0`: `uniforms.focus = CAM.focus`, `uniforms.aperture = CAM.aperture·0.0007`, `uniforms.maxblur = 0.01`; `enabled = false` bila 0.
- Nama `focus`/`rackFocus`/`light` sama dengan backend 2.5D — kedua backend tidak pernah berada di satu berkas.

- [ ] **Step 1: Uji yang gagal** — tambah asersi `CAM3_UJI`:
```js
      if (!(Math.abs(cam3.keyGolden - 2.8) < 1e-6 && cam3.elGolden === 6)) masalah.push(`kamera3: light('golden') tidak menyetel key (${cam3.keyGolden}, ${cam3.elGolden})`);
      if (!cam3.lightUrutDitolak) masalah.push("kamera3: light() dengan 'at' mundur harus ditolak");
      if (cam3.bokehSaatNol !== false || cam3.bokehSaatEnam !== true) masalah.push('kamera3: BokehPass harus mati saat aperture 0 dan hidup saat > 0');
      if (!(cam3.jarakFokus > 0 && Math.abs(cam3.jarakFokus - cam3.jarakHarapan) < 1e-6)) masalah.push('kamera3: focus() tidak menghitung jarak ke subjek');
```
(`CAM3_UJI` memanggil `light(t0,.1,'golden')` dengan `t0 = lampAt+1`, `tl.time(t0+.2)`, membaca `LUX.kI`/`LUX.kEl`; mencoba `light(t0-1,…)`; menyetel `CAM.aperture` 0 lalu 6 dan membaca `bokeh.enabled` setelah `applyCam()`; memanggil `focus()` pada subjek dan membandingkan dengan jarak `pose(PLAN)`–pusat Box3.)

- [ ] **Step 2: Jalankan** `node scripts/test-starters.mjs assets/starter-explainer-3d.html` → GAGAL dengan 4 pesan di atas.

- [ ] **Step 3: Implementasi** sesuai Interfaces; bangun ulang (`node scripts/build-starters.mjs`).

- [ ] **Step 4: Jalankan** `node scripts/test-starters.mjs` → `8 starter lolos.`; `node scripts/lint-motion.mjs assets/*.html` → 0 FAIL.

- [ ] **Step 5: Commit**
```bash
git add src/runtime/kamera-three.js scripts/test-starters.mjs assets
git commit -m "kamera-three: preset cahaya key/fill/rim, lampu praktis, fokus BokehPass hanya saat aperture > 0"
```

---

### Task 4: Rail kamera (Catmull-Rom) dengan sambungan ke pose bola

**Files:**
- Modify: `src/runtime/kamera-three.js`
- Modify: `scripts/test-starters.mjs`

**Interfaces:**
- Produces: `rail(at: number, dur: number, pts: Array<[x,y,z]>, {look = null, ease = 'sine.inOut'} = {}) → void`.
  - `pts.length < 3` → `Error('rail: butuh ≥ 3 titik (CatmullRomCurve3 2 titik rusak di r161)')`.
  - Kurva `new THREE.CatmullRomCurve3(pts.map(v3), false, 'centripetal')` disimpan di `RAILS[]` saat setup. `look` = `[x,y,z]` titik pandang tetap; `null` = `[PLAN.fx,PLAN.fy,PLAN.fz]`.
  - Timeline: `cutTo(at, {rail: i, railU: 0})`, `camTo(at, dur, {railU: 1}, ease)`, lalu di `at+dur` `cutTo(at+dur, {rail: -1, ...poseBalik})` — `poseBalik` = `{fx,fy,fz}` dari `look` dan `{dist, yaw, pitch}` dihitung terbalik dari titik terakhir rail relatif ke `look` (kebalikan `pose()`: `dist=|p−f|`, `pitch = −asin((p.y−f.y)/dist)`, `yaw = atan2(p.x−f.x, p.z−f.z)` dalam derajat). Dengan begitu gerak kamera sesudahnya berlanjut dari ujung rail tanpa lompatan.
  - `CAM` mendapat kunci `rail: -1, railU: 0` lewat `camDefaults`.
  - `applyCam()`: bila `CAM.rail ≥ 0`, posisi = `RAILS[CAM.rail].curve.getPointAt(CAM.railU)` dan `lookAt(look rail)`; selain itu `pose(CAM)` seperti biasa.

- [ ] **Step 1: Uji yang gagal** — asersi `CAM3_UJI`:
```js
      if (!cam3.railDuaDitolak) masalah.push('kamera3: rail() 2 titik harus ditolak');
      if (!(cam3.railTengah < 1e-6)) masalah.push(`kamera3: posisi kamera di tengah rail ≠ getPointAt(.5) (selisih ${cam3.railTengah})`);
      if (!(cam3.railSambung < 1e-6)) masalah.push(`kamera3: kamera melompat saat rail selesai (selisih ${cam3.railSambung})`);
```
(`CAM3_UJI` membuat `rail(tA, 2, [[0,2,12],[6,3,8],[10,4,0]], {look:[0,1,0]})` di `tA = planAt+1`, seek ke `tA+1` (ease `none` untuk uji: berikan `{ease:'none'}`) dan membandingkan `camera.position` dengan `curve.getPointAt(.5)`; seek ke `tA+2+1e-3` dan membandingkan `camera.position` dengan titik terakhir `[10,4,0]`.)

- [ ] **Step 2: Jalankan** `node scripts/test-starters.mjs assets/starter-explainer-3d.html` → GAGAL dengan 3 pesan.

- [ ] **Step 3: Implementasi** sesuai Interfaces; bangun ulang.

- [ ] **Step 4: Jalankan** `node scripts/test-starters.mjs` → `8 starter lolos.`

- [ ] **Step 5: Commit**
```bash
git add src/runtime/kamera-three.js scripts/test-starters.mjs assets
git commit -m "kamera-three: rail Catmull-Rom ≥ 3 titik, ujung rail menjadi pose bola (tanpa lompatan)"
```

---

### Task 5: Katalog `?demo=1` 3D, uji hash kanvas, kinerja ekspor

**Files:**
- Modify: `src/runtime/kamera-three.js` (`demoKamera3()`)
- Modify: `assets/starter-explainer-3d.html` (`if(q.has('demo'))demoKamera3();` sebelum `window.OPENER=…`)
- Modify: `scripts/test-starters.mjs` (hash kanvas, untuk SEMUA starter yang punya `<canvas>`)

**Interfaces:**
- Produces: `demoKamera3(): void` — `camReset()`, lalu berurutan dengan `step = DUR/30`: tiap `SHOT` (6), `home`-setara `cutTo` ke pose awal, tiap `ANGLE.three` (8) dengan reset sudut, gerak `dolly 1.5`, `truck 2`, `pedestal 1`, `pan 15`, `tilt -8`, `arc 40` (5+1), satu `rail` 3 titik, tiap preset `CAHAYA3` (6), `handheld` satu langkah; `window.DEMO_AKHIR = t` (harus < DUR). Starter 3D: `DUR` dinaikkan ke ≥ 32 hanya bila `?demo=1` (`const DUR = q.has('demo') ? 32 : 8`) — supaya katalog tidak terlalu cepat untuk dilihat.

- [ ] **Step 1: Uji yang gagal** — di `test-starters.mjs`, setelah pemeriksaan seek, untuk halaman yang punya `canvas` tambahkan:
```js
    // determinisme PIKSEL kanvas WebGL: t yang sama lewat dua jalur seek berbeda → gambar identik
    const kanvas = await page.evaluate(() => {
      const c = document.querySelector('canvas'); if (!c) return null;
      const O = window.OPENER, t = Math.min(5, O.DURATION * .6), t2 = Math.min(O.DURATION - .1, t + 3);
      O.tl.pause(); O.seek(t); const a = c.toDataURL();
      O.seek(t2); O.seek(.1); O.seek(t); const b = c.toDataURL();
      return { sama: a === b, kosong: a.length < 5000 };
    });
    if (kanvas && !kanvas.sama) masalah.push('kanvas: t yang sama lewat jalur seek berbeda memberi piksel berbeda');
    if (kanvas && kanvas.kosong) masalah.push('kanvas: hasil render kosong saat dibaca setelah seek');
```
dan asersi `CAM3_UJI`: `if (!(cam3.demoAkhir > 0 && cam3.demoAkhir < cam3.DUR)) masalah.push(…)`.
Catatan: `toDataURL` harus dipanggil di task yang sama dengan render (riset §G) — `seek()` merender sinkron, jadi pola di atas benar.

- [ ] **Step 2: Jalankan** `node scripts/test-starters.mjs` → GAGAL pada starter 3D (`demoAkhir` belum ada). Bila opener ikut gagal pada `kanvas`, CATAT (itu temuan nyata untuk Task 6), jangan longgarkan ujinya.

- [ ] **Step 3: Implementasi** `demoKamera3()` dan baris pemanggilnya; bangun ulang.

- [ ] **Step 4: Jalankan** `node scripts/test-starters.mjs` → semua lolos kecuali kegagalan opener yang dicatat di Step 2 (bila ada).

- [ ] **Step 5: Kinerja** — dari folder sementara di luar repo berisi salinan `starter-explainer-3d.html` sebagai `index.html`: `FPS=10 MP4=uji.mp4 node /e/mila/wevai/scripts/export-frames.mjs` → baris akhir `… frame/dtk` harus **≥ 3,0** (ambil angka dari baris progres terakhir). Hapus folder sementara.

- [ ] **Step 6: Potret katalog** `URL="file:///E:/mila/wevai/assets/starter-explainer-3d.html?clean=1&demo=1" node scripts/snap.mjs evals/bukti/2026-10-22-demo-kamera-3d` dengan 12 detik merata dari 0,5 sampai `DEMO_AKHIR` → buka `kontak.png`: ukuran shot membesar bertahap, low angle terlihat dari bawah, overhead dari atas, preset cahaya berbeda jelas (golden = bayangan panjang jingga, lowkey = gelap kontras).

- [ ] **Step 7: Commit**
```bash
git add src/runtime/kamera-three.js assets scripts/test-starters.mjs evals/bukti/2026-10-22-demo-kamera-3d/kontak.png
git commit -m "Starter 3D: katalog ?demo=1, uji hash kanvas dua jalur seek, ekspor >= 3 fps"
```

---

### Task 6: Opener memakai `CAM` + `kamera-three`

**Files:**
- Modify: `assets/starter-opener.html` (hapus `S.camX/camY/camZ/camRoll/shake` dan blok posisi kamera di `render(t)`; sisipkan `<wv:kamera>` + `<wv:kamera-three>` setelah `const rig=…`; import `SVGLoader`, `BokehPass`, `RoomEnvironment`)

**Interfaces:**
- Consumes: semua Produces Task 1–4.
- Nilai awal setara tampilan lama (kamera lama: `PerspectiveCamera(50,…)` di z 13,2 menatap titik asal): `camDefaults({fx:0,fy:0,fz:0,dist:13.2,yaw:0,pitch:0,mm:21.7})` — 21,7 mm = fov vertikal 50° pada `filmGauge 36`, 16:9 (`10.125/tan(25°)`).
- `render(t)` memanggil `applyCam()` sebelum `composer.render(0)`; `S` tinggal `grid,dust,stars,bloom,heroO,heroS,heroX,heroY,heroZ`.
- Ayunan sinus lama (`sin(t*.41)*.22`, `cos(t*.33)*.16`) diganti `handheld(0, DURATION, .3)` di blok LATAR (noise ber-seed; karakter gerak sedikit berbeda — starter ini placeholder). `tl.set(S,{…camZ:13.2,camRoll:0…},0)` → `cutTo(0,{dist:13.2,roll:0})`.
- `camThrough`/`breathe` tidak berubah (Global Constraints #2).
- Komentar STYLE BRIEF di kepala opener mendapat tiga baris baru yang sama dengan starter 3D.

- [ ] **Step 1: Rekam SEBELUM** — `URL="file:///E:/mila/wevai/assets/starter-opener.html?clean=1&demo=1" node scripts/snap.mjs .tmp-opener-sebelum 1 4 7` (folder di luar commit; `.tmp-*` tambahkan ke `.gitignore`).

- [ ] **Step 2: Uji yang gagal** — `node scripts/lint-motion.mjs assets/starter-opener.html` tetap 0 FAIL, dan tambahkan pemeriksaan di `test-starters.mjs`: bila halaman mendefinisikan `window.CAM3_UJI`, opener juga menjalankan asersi `poseCocok` (opener tidak punya subjek `'subjek'`; `CAM3_UJI` melewati asersi subjek bila `scene.getObjectByName('subjek')` tidak ada — kembalikan `null` untuk field itu dan uji hanya memeriksa field non-null). Jalankan `node scripts/test-starters.mjs assets/starter-opener.html` → GAGAL (`CAM3_UJI` belum ada di opener → tidak ada `poseCocok`; jadikan "opener harus punya CAM3_UJI" asersi eksplisit untuk berkas `starter-opener.html`).

- [ ] **Step 3: Implementasi** sesuai Interfaces; `node scripts/build-starters.mjs`.

- [ ] **Step 4: Jalankan** `node scripts/test-starters.mjs` → `8 starter lolos.` (termasuk hash kanvas opener). `node scripts/lint-motion.mjs assets/*.html` → 0 FAIL. `node scripts/cdn-integrity.mjs --check assets/*.html` → terkunci.

- [ ] **Step 5: Rekam SESUDAH & bandingkan dengan mata** — `snap.mjs .tmp-opener-sesudah 1 4 7`; kedua `kontak.png` harus berkomposisi sama (kamera di depan, bintang & grid pada posisi serupa); beda kecil karena handheld boleh. Hapus `.tmp-opener-*`.

- [ ] **Step 6: Commit**
```bash
git add assets/starter-opener.html scripts/test-starters.mjs .gitignore
git commit -m "Opener memakai CAM + kamera-three (S.cam* dihapus); camThrough/breathe tetap di rig DOM"
```

---

### Task 7: Lint `gsap-relatif`

**Files:**
- Modify: `scripts/lint-motion.mjs` (setelah aturan `composer-render-jam`)
- Create: `evals/bukti/lint-relatif-buruk.html` (fixture)

**Interfaces:**
- Produces: aturan `WARN gsap-relatif` untuk nilai PROPERTI relatif di tween timeline: regex `/\btl\.(?:to|fromTo|from)\s*\([^;]*?:\s*['"`][+\-*]=/g` (nilai seperti `x:'+=120'`), BUKAN parameter posisi (`'+=0.3'` sebagai argumen ketiga tidak cocok karena tidak didahului `:`). Pesan: `nilai relatif di tween diselesaikan GSAP saat render pertama — hasilnya bergantung jalur seek (scrub/snap/export bisa berbeda)`; fix: `hitung nilai absolut saat setup, atau pakai gerak kamera (dolly/truck/…) yang sudah diselesaikan PLAN`. Baris di dalam blok `<wv:kamera>` dikecualikan (inti kamera menulis string relatif hanya untuk `mutlak()` yang menyelesaikannya).

- [ ] **Step 1: Fixture & uji gagal** — `evals/bukti/lint-relatif-buruk.html` berisi `tl.to('#a',{x:'+=120',duration:1},2); tl.to('#b',{opacity:1},'+=0.3');` plus kerangka `window.OPENER`. `node scripts/lint-motion.mjs evals/bukti/lint-relatif-buruk.html` → belum ada `gsap-relatif`.

- [ ] **Step 2: Implementasi** aturan.

- [ ] **Step 3: Jalankan** fixture → tepat **1** `WARN gsap-relatif` (baris `#a`, bukan `#b`); `node scripts/lint-motion.mjs assets/*.html` → 0 FAIL, dan tidak ada `gsap-relatif` di 8 starter.

- [ ] **Step 4: CI** — `.github/workflows/ci.yml`, langkah lint: tambahkan `node scripts/lint-motion.mjs evals/bukti/lint-three-buruk.html && exit 1 || true` sebagai pemeriksaan bahwa fixture buruk memang GAGAL (menutup minor Rencana A "fixture tidak dijalankan di CI"); fixture `lint-relatif-buruk.html` hanya WARN sehingga diperiksa dengan `grep -q gsap-relatif`.

- [ ] **Step 5: Commit**
```bash
git add scripts/lint-motion.mjs evals/bukti/lint-relatif-buruk.html .github/workflows/ci.yml
git commit -m "lint: gsap-relatif (nilai properti relatif bergantung jalur seek); fixture lint diuji di CI"
```

---

### Task 8: Dokumen skill, eval brief, rilis 1.1.0

**Files:**
- Create: `references/sinematografi.md`
- Create: `evals/briefs/09-explainer-3d.md`
- Modify: `SKILL.md`, `references/techniques.md` (§3b), `references/architecture.md`, `references/roadmap.md`, `references/explainer.md`, `README.md`, `scripts/context-budget.mjs`, `CHANGELOG.md`

- [ ] **Step 1: `references/sinematografi.md`** (target 20–28 KB, bahasa Indonesia, format aturan + kenapa + contoh kegagalan; muat `superpowers:writing-for-agents` sebelum menulis). Isi wajib, berurutan:
  1. Kapan 3D dipakai (hero shot / dunia yang butuh sudut sungguhan) vs 2.5D (dunia SVG/kolase) — satu tabel keputusan.
  2. Tabel istilah → kapan di explainer → panggilan fungsi, untuk: ukuran shot (ECU–EWS), sudut (8), gerak (dolly, truck, pedestal, pan, tilt, crane, arc, rail, follow lewat `rail`/`camTo`, whip pan, handheld), lensa (18–24 / 35–50 / 85–135 mm + dolly zoom), fokus/rack focus, cahaya (6 preset + `practical`). Ambil dari tabel tata bahasa di `docs/riset-3d-sinematografi-2026-10-03.md`; nilai preset sama dengan Task 3.
  3. Aturan: 180° (`rule180`), 30° (peringatan konsol), lead room, sepertiga, gerak termotivasi, ≥ 2 sudut per dunia, cahaya berganti dengan pemicu terlihat.
  4. Perbedaan 2.5D vs 3D (Global Constraints #3, #4, #8) dan batas `focus()` 3D (tidak mengikuti kamera); tidak ada `follow()` (Global Constraints #7) — gantinya keyframe `shot()` atau `rail()`.
  5. Resep 2.5D: bidang `<div|svg data-z>`; resep 3D: `mat()`, `fromSVG()`, HUD di luar `#world`.
  6. Jebakan: tone mapping vs warna brand; `composer.render()` tanpa argumen; `CatmullRomCurve3` 2 titik; `RoomEnvironment(renderer)`; transform 3D di dalam SVG diratakan; `preserve-3d` diratakan oleh `filter/opacity<1/overflow/clip-path/mask/mix-blend-mode`; nilai relatif GSAP bergantung jalur seek (lint `gsap-relatif`); gerak relatif kamera wajib urut waktu; biaya DOF/bayangan di GPU lemah (angka riset: bayangan +29 ms, DOF 169 ms vs 42 ms).
  7. Nama global yang sudah dipakai runtime 3D (daftar lengkap, seperti daftar 2.5D di `techniques.md` §3b).

- [ ] **Step 2: `SKILL.md`** —
  - Peta baca: baris baru `| Explainer / opener 3D & kamera sinematik | + references/sinematografi.md, assets/starter-explainer-3d.html (opener: assets/starter-opener.html) | kosakata shot/sudut/gerak/lensa/cahaya, resep 2.5D & 3D, jebakan |`.
  - Hukum #3 butir 1 (style brief): tiga butir baru — lensa default (mm), sudut & gerak pembuka, preset cahaya per segmen + pemicu pergantian. Hukum #3 butir 4: "berbeda dari proyek sebelumnya" juga mencakup sudut pembuka + gerak tanda tangan kamera.
  - Alur kerja langkah 2: kolom `visual` di rundown boleh memakai kosakata kamera (`WS high → dolly in CU`).
  - Larangan struktural #6: tambahkan `starter-explainer-3d` sebagai starter explainer dunia 3D.
  - Checklist umum (+3): tiap dunia ≥ 2 sudut berbeda; cahaya bercerita di ≥ 1 segmen atau dinyatakan tidak dipakai di style brief; subjek tidak masuk zona aman HUD.
  - Isi paket: baris `references/sinematografi.md` dan `assets/starter-explainer-3d.html`.

- [ ] **Step 3: Rujukan singkat** (masing-masing ≤ 6 baris): `techniques.md` §3b → "kosakata 3D & tata bahasa: `references/sinematografi.md`"; `architecture.md` rig kamera → backend `kamera-three.js`; `roadmap.md` butir 8 ditutup (kamera 2.5D + 3D satu sumber), "Sudah dikerjakan" +1 butir; `explainer.md` "Mulai dari starter yang benar" → starter 3D; `README.md` (Inggris) tabel "What you can make" / "Repository layout" menyebut starter 3D dan `references/sinematografi.md`.

- [ ] **Step 4: `scripts/context-budget.mjs`** — jalur baru `['Explainer / opener 3D', ['references/sinematografi.md', 'references/techniques.md', 'assets/starter-explainer-3d.html'], 170]`. Jalankan `node scripts/context-budget.mjs --check` → semua jalur di bawah batas (bila jalur lain lewat karena SKILL.md tumbuh, pindahkan isi ke `sinematografi.md`, bukan menaikkan batas).

- [ ] **Step 5: `evals/briefs/09-explainer-3d.md`** — format sama dengan `07-explainer-aksi.md`: jenis explainer, 16:9, 45 dtk, starter `assets/starter-explainer-3d.html`; prompt: *"Explainer 45 detik: bagaimana satu peti kemas berpindah dari pabrik ke kapal. Dunia 3D, dua sudut di pelabuhan, cahaya berubah dari siang ke senja saat kapal berangkat."*; wajib ada: satu dunia, ≥ 2 sudut, satu pergantian preset cahaya dengan pemicu terlihat, satu hero shot dengan `focus()`; rubrik rasa: coverage (wide → detail → wide), cahaya bercerita, teks HUD terbaca di ponsel; pemeriksaan mekanis seperti brief lain.

- [ ] **Step 6: Rilis lokal** — `CHANGELOG.md` bagian `## 1.1.0 — <tanggal>` (backend Three.js, starter explainer 3D, opener memakai CAM, `sinematografi.md`, lint `gsap-relatif`, uji hash kanvas); `node scripts/bump-version.mjs 1.1.0`.

- [ ] **Step 7: Seluruh pemeriksaan CI lokal**
```bash
for f in scripts/*.mjs; do node --check "$f"; done
node --test scripts/test-kamera.mjs && node scripts/build-starters.mjs --check && node scripts/bump-version.mjs --check \
 && node scripts/context-budget.mjs --check && node scripts/lint-motion.mjs assets/*.html && node scripts/cdn-integrity.mjs --check assets/*.html \
 && node scripts/test-starters.mjs
```
→ semua hijau; `8 starter lolos.`

- [ ] **Step 8: Commit**
```bash
git add references SKILL.md README.md evals/briefs/09-explainer-3d.md scripts/context-budget.mjs CHANGELOG.md .claude-plugin assets
git commit -m "WeVai 1.1.0: sinematografi.md, starter 3D di peta baca & checklist, eval brief 09"
```
Push, tag `v1.1.0`, dan rilis GitHub **tidak** termasuk rencana ini — ditanyakan ke pengguna setelah tinjauan akhir.
