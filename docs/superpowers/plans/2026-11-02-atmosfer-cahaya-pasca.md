# Atmosfer, cahaya-2d, pasca — Rencana pembangunan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tiga modul runtime bersama (`atmosfer`, `cahaya-2d`, `pasca`) yang memberi gaya 2D/2.5D WeVai rupa film
(langit hidup, kabut berlapis, partikel, cahaya bersumber, rim, grading). Buktinya adegan gapura malam di
`starter-explainer.html?demo=sinematik`, ≤ 350 ms/frame.

**Architecture:** Modul = `src/runtime/*.js`, disisipkan `build-starters.mjs` ke dua starter. Semua keadaan = fungsi
murni `tl.time()`. Modul menggambar dengan merantai `tl.eventCallback('onUpdate')` lewat `rantaiUpdate()`. Yang berat
dipanggang sekali saat setup (kanvas offscreen, filter SVG statis); per frame hanya transform/opacity atau kanvas
kecil. Kode memakai `tl`, `W`, `H`, `$` global starter, seperti `kamera.js`.

**Tech Stack:** JS klasik tanpa build (blok yang disisipkan), GSAP 3.12.5, SVG filter, WebGL2 (satu fragment shader),
Canvas 2D, puppeteer (uji/benchmark).

**Spec:** [`docs/superpowers/specs/2026-11-02-atmosfer-cahaya-pasca-design.md`](../specs/2026-11-02-atmosfer-cahaya-pasca-design.md)

## Global Constraints

- Determinisme: tanpa `Math.random`, `Date.now`, `performance.now`, akumulasi `+= v*dt`. Acak = PRNG ber-seed
  (`mulberry32`) atau hash dari `(seed, i)`. Seek ke t yang sama = piksel kanvas sama.
- Tidak ada `filter`/`opacity`/`mix-blend-mode`/`clip-path`/`mask` yang ditulis ke `rig` atau ke pembungkus `[data-z]`.
  Efek dipasang pada **anak** pembungkus, atau di `#stage` di luar view rig.
- Atribut filter SVG cahaya (`fePointLight`, `feDistantLight`, `feOffset`, `feTurbulence`) tidak di-tween dan tidak
  ditulis per frame.
- Tanpa dependensi baru, satu berkas, `file://`. Blok runtime diedit di `src/runtime/`, lalu
  `node scripts/build-starters.mjs`.
- Tanpa `?demo=sinematik`, `starter-explainer.html` dan `starter-explainer-panggung.html` identik secara piksel dengan
  1.2.0 (blok baru tidak dipanggil).
- Anggaran: median ≤ 350 ms/frame @1920×1080, 1 worker, Chrome sistem, mesin acuan i3-3217U/HD 4000.
- Komentar dan pesan error berbahasa Indonesia, ringkas, seperti `kamera-dom.js`.
- Uji di laptop ini: `PUPPETEER_EXECUTABLE_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"`.

## Review Focus

1. `?demo=sinematik` juga memenuhi `q.has('demo')`, jadi katalog `demoKamera()` ikut jalan dan menimpa adegan.
   Harapannya hanya adegan sinematik yang jalan. → Task 5, `SINEMA_UJI().demoKameraMati`.
2. Mesin tanpa WebGL2 (GPU di-blocklist, driver lama). Harapannya langit jatuh ke gradien CSS dengan `console.warn`,
   bukan error JS atau layar hitam. → Task 2, `ATM_UJI().fallback`.
3. Jendela tidak 1920 lebar (stage di-scale `fit()`). Harapannya posisi halation tetap menempel pada sumber.
   → Task 4, `PASCA_UJI().halationSkala`.
4. Nama sumber salah ketik di `redup`/`rim`/`bayangan`, atau `jenis` partikel tak dikenal. Harapannya error yang
   menyebut nama yang tersedia, bukan efek yang diam-diam hilang. → Task 2 dan Task 3.
5. Loop/scrub mundur. Harapannya partikel, kabut, dan kedip obor di t yang sama sama persis sesudah loop.
   → Task 2 `ATM_UJI().seekSama`, Task 3 `CAHAYA_UJI().kedipSama`.

## Persiapan

Perubahan 1.2.0 (sub-proyek 1) belum di-commit di `main`. Sebelum Task 1:
- buat branch `feat/atmosfer-cahaya-pasca`;
- commit 1.2.0 sebagai commit tersendiri, berisi `src/runtime/grain.js`, starter, references, CHANGELOG, dan tiga dok
  `docs/*-2026-11-01.md`. Berkas `Jadwal_*.xlsx` dan `~$*.xlsx` tidak ikut.

Commit itulah "1.2.0" yang dipakai Task 6 Step 3.

---

### Task 1: Acuan spike + skrip benchmark

**Files:**
- Create: `evals/bukti/2026-11-01-spike-gapura/` berisi `index.html` (salinan `spike-cepat/index.html`),
  `spike-svg.html` (salinan `spike-gapura/index.html`), `f_0.jpg`, `f_7.jpg`, `f_13.jpg`, `README.md`
- Create: `scripts/bench-frame.mjs`

Sumber (scratchpad sesi):
`C:\Users\ITBAHA~1\AppData\Local\Temp\claude\e--mila-wevai\383a7178-971d-49f1-a618-2ab57bb9b86c\scratchpad\`
— `spike-gapura\`, `spike-cepat\`, dan `riset\bench.mjs` sebagai bahan `bench-frame.mjs`.

**Interfaces:**
- Produces: `node scripts/bench-frame.mjs <berkas.html> [query] [frames=20]` → satu baris JSON
  `{page, gl, medianMs, deterministik}`. Exit 1 bila `medianMs > (BATAS||350)` atau `deterministik === false`.
  Memakai kontrak `window.OPENER` (`ready`, `seek`, `DURATION`), bukan `window.READY` milik spike.

- [ ] **Step 1:** Salin dua `index.html` spike. Ubah PNG ke JPEG q2 dengan
  `ffmpeg -i f_7.png -q:v 2 f_7.jpg` (juga f_0 dan f_13; f_0/f_13 dari `spike-gapura`, f_7 dari `spike-cepat`).
  `README.md` (≤ 10 baris): asal spike (1 Nov), `f_7` = acuan rupa "tidak boleh lebih buruk", cara memotret ulang
  (`?t=7`, lihat `spike-gapura-shot.mjs` di scratchpad bila masih ada).
- [ ] **Step 2: Tulis `bench-frame.mjs`.** Alurnya diturunkan dari `riset/bench.mjs`:
  - Argumen Chrome: `--use-gl=angle --ignore-gpu-blocklist`. `executablePath` diambil dari `PUPPETEER_EXECUTABLE_PATH`.
  - Per frame: `t = 2 + i/30` → `OPENER.seek(t)` → 2× rAF → screenshot JPEG q80 `optimizeForSpeed`.
  - Median dihitung dari frame ke-2 sampai ke-N.
  - Hash 3 frame pertama dibandingkan dengan seek ulang.
  - Cetak `GLINFO` dari `WEBGL_debug_renderer_info`, supaya jatuh diam-diam ke WARP terlihat.
- [ ] **Step 3: Verifikasi.** Jalankan `node scripts/bench-frame.mjs assets/starter-explainer.html "" 10`.
  Lolos bila keluar JSON dengan `deterministik:true` dan `gl` memuat `ANGLE`. Catat `medianMs` sebagai garis dasar
  di pesan commit.
- [ ] **Step 4: Commit** — `bukti: acuan spike gapura + scripts/bench-frame.mjs`

### Task 2: `atmosfer.js` — langit, kabut, partikel

**Files:**
- Create: `src/runtime/atmosfer.js`
- Modify: `assets/starter-explainer.html`, `assets/starter-explainer-panggung.html` — tambah penanda kosong
  `/* <wv:atmosfer> … */ … /* </wv:atmosfer> */` tepat sebelum `/* <wv:grain>`. Formatnya sama dengan blok
  `<wv:grain>`; isinya diisi `build-starters`.

**Interfaces:**
- Produces (global):
  - `rantaiUpdate(fn)`: merantai `tl.eventCallback('onUpdate')`, callback lama tetap dipanggil. Dipakai Task 3–4.
  - `mulberry32(seed) → () => number` dan `vnoise(x, seed) → 0..1` (value noise 1D halus). Nama sengaja beda dari
    `hash`/`noise` milik `kamera.js` (`const`; bentrok = SyntaxError) karena starter panggung tidak memuat `kamera.js`.
  - `lapisDepan(el)`: sisipkan `el` ke `#stage` tepat sesudah anak `#stage` yang memuat rig
    (`typeof rig!=='undefined' ? rig : $('#world')`). Hasilnya di atas dunia, di bawah `#vig`/`#ui`.
  - `LANGIT = {zenit, tengah, horizon, matahariX, matahariY, matahariR, warnaMatahari, pendar, bintang, awan,
    awanWarna, hanyut, sinar}`. Posisi dinormalisasi 0..1, y = 0 di atas.
  - `langit(opsi) → HTMLCanvasElement | HTMLDivElement`: kanvas `#wv-langit`, anak pertama `#stage`.
  - `kabut(bidang, {y, tebal=180, warna, rapat=.6, hanyut=20, seed=1, lebar=W}) → HTMLDivElement` (`.wv-kabut`).
  - `warnaJarak(warna, z, zJauh=-800) → '#rrggbb'`: campur `warna` ke `LANGIT.horizon` sebanding `z/zJauh`
    (di-clamp 0..1).
  - `partikel(bidang | 'depan', {jenis, n=60, area=[0,0,W,H], seed=1, warna}) → HTMLCanvasElement`
    (`.wv-partikel`). `jenis` ∈ `bara | debu | asap | kunang`; lainnya melempar
    `Error('partikel: jenis tidak dikenal: x (bara debu asap kunang)')`.
  - `window.ATM_UJI() → {seekSama, kabutParalaks, fallback, jenisDitolak}`, kait untuk `test-starters`. Kait
    membangun fixture sementaranya sendiri (dua `<div data-z>` di rig + `BIDANG.push`, atau di `#world` bila tanpa
    `CAM`) dan membersihkannya. Field yang butuh `CAM` = `null` bila `CAM` tidak ada (starter panggung).

- [ ] **Step 1: Tulis uji.** Di `scripts/test-starters.mjs`, sesudah semua pemeriksaan lain di halaman bawaan:
  - `starter-explainer.html` dan `starter-explainer-panggung.html` **wajib** punya `window.ATM_UJI`, meniru pola
    "opener harus mendefinisikan window.CAM3_UJI";
  - panggil `ATM_UJI()`; field `null` dilewati;
  - tambahkan `masalah` bila:
  - `!r.seekSama`: semua `.wv-partikel` dan `#wv-langit` (toDataURL) berbeda antara `seek(5)` langsung dan
    `seek(9); seek(.1); seek(5)`;
  - `!r.kabutParalaks`: dua `.wv-kabut` di bidang z −600 dan z 0 bergeser beda > 1 px saat `CAM.fx += 300`;
  - `!r.fallback`: dengan `getContext` dipaksa `null`, `langit()` mengembalikan `<div>` bergradien, bukan error;
  - `!r.jenisDitolak`: `partikel(…,{jenis:'salju'})` harus melempar.
- [ ] **Step 2:** Jalankan
  `node scripts/test-starters.mjs assets/starter-explainer.html assets/starter-explainer-panggung.html`.
  Harus **GAGAL**: `atmosfer: ATM_UJI tidak ada`.
- [ ] **Step 3: Implementasi `atmosfer.js`.**
  - `langit`:
    - Fragment shader WebGL2 tunggal (bahan: `riset/gl-shader.html` pass 1–2): gradien 3 warna, cakram + pendar,
      bintang hash berkelip dari `t`, awan fBm 5 oktaf yang hanyut `t·hanyut`, god rays ≤ 64 sampel ke arah
      matahari dengan kekuatan `LANGIT.sinar`.
    - `preserveDrawingBuffer:true`. Uniform dibaca dari `LANGIT` + `tl.time()`.
    - Uv diputar `CAM.roll` dan digeser `CAM.fx/fy·0,02` bila `typeof CAM !== 'undefined'`. Guncangan handheld
      tidak diikutkan (±0,7° tak terlihat di langit; ini menggantikan catatan "ticker" di spec §4).
    - Digambar lewat `rantaiUpdate`.
    - Fallback: `<div>` `linear-gradient(zenit, tengah, horizon)` + `console.warn`.
  - `kabut`:
    - Tekstur fBm 2D dari `vnoise` ber-seed, dirasterisasi sekali ke kanvas offscreen `lebar×tebal`, alfa memudar
      di tepi atas/bawah.
    - Ditampilkan sebagai `<div>` `background-image` (dataURL) `repeat-x`, `will-change:transform`.
    - Hanyut: `translateX(-((t·hanyut) mod lebar))`. `left` 0, lebar elemen 2× tile.
  - `partikel`:
    - Kanvas seukuran `area`. Tiap partikel i punya `r_i` dari `mulberry32(seed)` saat setup; tiap frame
      `fase = frac(t/umur + r_i)`, dan posisi/alfa = fungsi `(r_i, fase)` saja.
    - `bara`: naik berkelok, `globalCompositeOperation='lighter'`, memudar.
    - `debu`: melayang lambat.
    - `asap`: gumpalan radial besar, alfa ≤ .12.
    - `kunang`: diam-berkedip.
    - `'depan'` → `lapisDepan(kanvas)`.
    - Anggaran ≤ 400 partikel per adegan; `n` > 400 dijepit + `console.warn`.
  - `ATM_UJI`: membangun bidang uji sementara sendiri (dua `<div data-z>` di rig, `BIDANG.push`, lalu
    dibersihkan), seperti `CAM_UJI`.
- [ ] **Step 4: Verifikasi.**
  - `node scripts/build-starters.mjs`, lalu `test-starters` pada kedua starter → `ok`.
  - `node scripts/lint-motion.mjs` pada kedua starter → bersih.
- [ ] **Step 5: Commit** — `atmosfer: langit WebGL, kabut per bidang, partikel ber-seed`

### Task 3: `cahaya-2d.js` — sumber, pendar, redup, rim, bayangan, relief

**Files:**
- Create: `src/runtime/cahaya-2d.js`
- Modify: dua starter — penanda `<wv:cahaya-2d>` sesudah `</wv:atmosfer>`.

**Interfaces:**
- Consumes: `rantaiUpdate`, `vnoise` (Task 2).
- Produces:
  - `SUMBER`: map `nama → {x, y, bidang, warna, jangkau, kuat, kedip, el}`.
  - `sumber(nama, {x, y, bidang, warna='#ffb347', jangkau=420, kuat=1, kedip=0, seed=1}) → HTMLDivElement`
    (`.wv-pendar`, di `bidang`):
    - gradien radial `warna → transparent`, `mix-blend-mode:screen`;
    - kedip = opacity `kuat·(1 − kedip·vnoise(t·7, seed))` dan skala `1 + kedip·.06·vnoise(t·5, seed+1)`.
  - `redup(svg, nama[], {gelap=.72, warna='#0b0820', klip}) → SVGGElement`:
    - rect `multiply` di akhir `svg`, ber-`mask` lubang radial (satu per sumber, union);
    - `klip` = id `<clipPath>` milik pemanggil (bentuk arsitektur), bila diberikan;
    - dipanggang.
  - `rim(el, nama, {lebar=3}) → SVGFilterElement`:
    - filter statis `SourceAlpha` → `feOffset` **menjauhi** sumber sejauh `lebar` → `feComposite operator="out"`
      → `feFlood` warna sumber → merge di atas `SourceGraphic`;
    - arah = dari pusat bbox `el` ke `(x, y)` sumber.
  - `bayangan(el, nama, {lantai, panjang=.6, gelap=.55}) → SVGUseElement`: `<use>` salinan `el` (beri `id` bila
    belum ada), filter hitam + blur 4 sekali, `scale(1,−panjang)` di garis `lantai`, `skewX` menjauhi sumber,
    disisipkan sebelum `el`.
  - `relief(el, {tinggi=3, sumber: nama | arah: {az, el}, spekular=0}) → SVGFilterElement`: heightmap luminans →
    `feDiffuseLighting` (`fePointLight` bila `sumber`, `feDistantLight` bila `arah`), dikali `SourceGraphic`.
    `spekular > 0` menambah `feSpecularLighting`.
  - Nama sumber tak dikenal → `Error('cahaya-2d: sumber tidak dikenal: x (obor1 obor2)')`.
  - `window.CAHAYA_UJI() → {kedipSama, kedipHidup, rimArah, statis, namaDitolak}`.

- [ ] **Step 1: Tulis uji.** Di `test-starters`, pola sama dengan Task 2: kait wajib ada di kedua starter dan
  membangun fixture SVG sementaranya sendiri. Masalah bila:
  - `!kedipSama`: opacity `.wv-pendar` sama di `seek(4)` lewat dua jalur;
  - `!kedipHidup`: opacity di t 4,0 ≠ 4,5 untuk sumber `kedip>0`;
  - `!rimArah`: `rim` pada elemen di x 1500 dengan sumber di x 500 memberi `feOffset dx > 0`, dan sumber di x 2500
    memberi `dx < 0`;
  - `!statis`: `outerHTML` semua `<filter>` di `#stage` sama di `seek(2)` dan `seek(8)`;
  - `!namaDitolak`: `rim(el,'tidakada')` harus melempar.
- [ ] **Step 2:** `test-starters` kedua starter → **GAGAL** `cahaya-2d: CAHAYA_UJI tidak ada`.
- [ ] **Step 3:** Implementasi `cahaya-2d.js` menurut Interfaces. Bahan: `litFilter`/`volFilter`/`fRim`/mDark di
  spike `index.html` (Task 1).
- [ ] **Step 4: Verifikasi.** `build-starters`, lalu `test-starters` kedua starter → `ok`. Lint bersih.
- [ ] **Step 5: Commit** — `cahaya-2d: sumber berpendar, redup bermasker, rim/bayangan/relief dipanggang`

### Task 4: `pasca.js` — GRADE

**Files:**
- Create: `src/runtime/pasca.js`
- Modify: dua starter — penanda `<wv:pasca>` sesudah `</wv:cahaya-2d>`.

**Interfaces:**
- Consumes: `rantaiUpdate`, `lapisDepan` (Task 2); `SUMBER` (Task 3).
- Produces:
  - `GRADE = {bayangan:'#1a1440', bayanganKuat:0, sorot:'#ffd9a8', sorotKuat:0, vignette:0, halation:0}`.
  - `PRESET_GRADE = {senja, 'malam-api', fajar, 'siang-kering', arsip}`; nilainya keputusan builder (spec §7).
  - `grade(at, dur, presetAtauNilai, ease='sine.inOut')`: `tl.to(GRADE, {...}, at)`. Nama preset tak dikenal
    melempar error dengan daftar nama. Lapisan dibuat pada panggilan pertama lewat `lapisDepan`.
  - Lapisan:
    - **bayangan**: `<div>` warna `GRADE.bayangan`, `mix-blend-mode:lighten`, opacity `bayanganKuat`. Hanya
      mengangkat piksel yang lebih gelap dari warnanya, sehingga bayangan diwarnai.
    - **sorot**: warna `GRADE.sorot`, `mix-blend-mode:darken`, opacity `sorotKuat`. Hanya mewarnai piksel yang lebih
      terang.
    - **vignette**: gradien radial hitam, `multiply`.
    - **halation**: satu `<div>` radial jingga per `SUMBER`, `screen`. Posisinya = pusat `getBoundingClientRect()`
      pendar relatif ke `#stage`, dibagi skala stage (`rect.width/W`). Dihitung tiap frame.
  - `window.PASCA_UJI() → {lapisBenar, halationSkala, presetDitolak}`. Membuat sumber sementara sendiri bila
    `SUMBER` kosong.

- [ ] **Step 1: Tulis uji.** Di `test-starters`, pola sama dengan Task 2 (kait wajib, fixture sendiri). Masalah bila:
  - `!lapisBenar`: `mixBlendMode` lapisan = `lighten` / `darken` / `multiply`, dan `rig.style.filter === ''`;
  - `!halationSkala`: dengan `#stage` di-scale .5 lalu 1 (tulis transform langsung), posisi `left` halation dalam
    px stage berbeda ≤ 1 px;
  - `!presetDitolak`: `grade(0,1,'neon')` harus melempar.
- [ ] **Step 2:** `test-starters` kedua starter → **GAGAL** `pasca: PASCA_UJI tidak ada`.
- [ ] **Step 3:** Implementasi `pasca.js`.
- [ ] **Step 4: Verifikasi.** Sama seperti Task 3 Step 4.
- [ ] **Step 5: Commit** — `pasca: GRADE split-tone lewat blend, vignette, halation ikut sumber`

### Task 5: Adegan bukti `?demo=sinematik`

**Files:**
- Modify: `assets/starter-explainer.html`:
  - `const SINEMA = new URLSearchParams(location.search).get('demo') === 'sinematik';` di dekat `const W…`;
  - rundown bawaan (dari `whip(8.6,…` sampai `tl.fromTo('#noteA',…)`) dibungkus `if(!SINEMA){…}`;
  - `if(q.has('demo'))demoKamera();` menjadi `if(SINEMA)demoSinematik(); else if(q.has('demo'))demoKamera();`;
  - `function demoSinematik()` + `window.SINEMA_UJI` ditulis langsung di starter (bukan runtime), sesudah blok
    `</wv:pasca>`.
- Modify: `scripts/test-starters.mjs` — bila `window.SINEMA_UJI` ada, muat ulang `?demo=sinematik`, panggil
  `SINEMA_UJI()`, lalu ulangi pemeriksaan kanvas seek-dua-jalur pada **semua** `canvas` di `#stage`.
  Pemeriksaan bawaan hanya membaca kanvas pertama.

**Interfaces:**
- Consumes: semua API Task 2–4, `CAM`, `cutTo`, `camTo`, `dolly`, `handheld`, `BIDANG`, `rig` (`kamera.js`/`kamera-dom.js`).
- Produces: `window.SINEMA_UJI() → {demoKameraMati, paralaks, rigBersih, adaSemua}`.

Adegan (12 dtk, dari spec §6; framing dan komposisi t = 7 meniru `evals/bukti/2026-11-01-spike-gapura/f_7.jpg`):
- `#collage` ditampilkan, `#side` disembunyikan, `.paper` disembunyikan.
- Empat pembungkus `<div data-z>` di `rig` (z −900 gunung, −500 pepohonan/meru, −200 gapura + tembok, 0 penjaga +
  beringin), masing-masing berisi `<svg viewBox="0 0 1920 1080">`, lalu `BIDANG.push`.
- Gambar diporting dari fungsi spike (`meru`, `palm`, `bricks`, `towerSvg`, `limb`). Spec §7 menyerahkan bentuknya
  ke builder.
- Modul: `langit` malam ungu (bulan, awan, `sinar` tipis); `kabut` di z −900/−500/−200 dengan `warnaJarak`;
  `partikel` `bara` dekat obor dan `debu` `'depan'`; dua `sumber` obor `kedip:.35`; `redup` pada SVG gapura;
  `relief` bata; `rim` + `bayangan` penjaga; `grade(0,0,'malam-api')`.
- Kamera: `cutTo(0,…)`, `dolly` pelan sepanjang adegan, `handheld` ringan (amp .3).
- `DEMO_AKHIR` tidak disetel.

- [ ] **Step 1: Tulis uji `SINEMA_UJI`.** Di `test-starters`, masalah bila:
  - `!demoKameraMati`: `window.DEMO_AKHIR` terdefinisi;
  - `!paralaks`: bidang z −900 dan z 0 bergeser beda saat `CAM.fx += 300`;
  - `!rigBersih`: `rig` dan setiap pembungkus `[data-z]` ber-`filter`, `mix-blend-mode`, atau `opacity` ≠ default
    (computed style);
  - `!adaSemua`: tidak ditemukan `#wv-langit`, ≥ 3 `.wv-kabut`, ≥ 1 `.wv-partikel`, 2 `.wv-pendar`, dan lapisan
    GRADE.

- [ ] **Step 2:** Jalankan `test-starters assets/starter-explainer.html`. Harus **GAGAL** di `SINEMA_UJI`, karena
  adegan belum ada.
- [ ] **Step 3:** Implementasi adegan + perubahan `SINEMA`/`demoSinematik`.
- [ ] **Step 4: Verifikasi.**
  - `test-starters` semua starter `ok`; lint bersih; `build-starters --check` lolos.
  - `node scripts/snap.mjs` dengan `URL=".../starter-explainer.html?demo=sinematik&clean=1"` di detik 0, 4, 7, 11.
    Lalu bandingkan berdampingan dengan `f_7.jpg`, dinilai dengan mata: rim, falloff obor, kabut berlapis, bara
    terlihat.
- [ ] **Step 5: Commit** — `starter aksi kontinu: ?demo=sinematik gapura malam memakai atmosfer/cahaya-2d/pasca`

### Task 6: Biaya, identitas 1.2.0, dokumen, rilis 1.3.0

**Files:**
- Modify: `references/techniques.md` (resep singkat tiga modul, di dekat §7d), `references/kartun-panggung.md`
  (kulit B: satu contoh pemanggilan), `scripts/context-budget.mjs` (batas jalur), `CHANGELOG.md`, versi via
  `scripts/bump-version.mjs 1.3.0`.
- Create: `evals/bukti/2026-11-02-atmosfer/` (`kontak.jpg`, `gerak.gif`, `bench.txt`).

- [ ] **Step 1: Ukur biaya.** Jalankan
  `node scripts/bench-frame.mjs assets/starter-explainer.html "demo=sinematik&clean=1" 20 > evals/bukti/2026-11-02-atmosfer/bench.txt`.
  - Lolos bila exit 0 (median ≤ 350, deterministik).
  - Gagal: profil per modul (matikan satu per satu lewat query sementara). Turunkan oktaf awan, sampel god rays,
    atau `n` partikel sampai lolos, lalu catat apa yang diturunkan.
- [ ] **Step 2: Kontras/saturasi (spec §4.3).** Ukur ulang dengan `filter: contrast(1.08) saturate(.9)` sementara
  pada view `#collage`.
  - Tambah ≤ 15 ms: tambahkan `kontras`/`saturasi` ke `GRADE` (ditulis ke view itu, bukan ke rig) + satu uji
    `lapisBenar` bahwa filter tidak berada di rig.
  - Tambah > 15 ms: jangan ditambahkan, catat angkanya di CHANGELOG.
- [ ] **Step 3: Identitas 1.2.0.**
  - `git stash` tidak dipakai. Buat `git worktree add ../wevai-120 <commit 1.2.0>`.
  - Potret `starter-explainer.html?clean=1` dan `starter-explainer-panggung.html?clean=1` di t 1, 5, 12 dari kedua
    pohon dengan `snap.mjs`.
  - Lolos bila hash PNG identik. Bila beda hanya di kanvas/teks antialias, bandingkan keadaan (transform rig) sesuai
    `architecture.md` "Determinisme itu soal KEADAAN".
  - Hapus worktree sesudahnya.
- [ ] **Step 4: Bukti visual.**
  - Lembar kontak 4 frame (t 0, 4, 7, 11) + GIF 8 fps satu adegan penuh, dengan
    `ffmpeg -framerate 8 -i … -vf scale=960:-1 gerak.gif`.
  - `f_7` spike ditaruh di sebelah t = 7 di lembar kontak.
- [ ] **Step 5: Dokumen.**
  - `techniques.md`: ≤ 25 baris resep (urutan panggilan, aturan dipanggang, anggaran partikel).
  - `kartun-panggung.md` kulit B: satu blok contoh ≤ 8 baris, catatan "bidang = `<div data-z>`, panggung baru
    memakainya di sub-proyek 3".
  - `context-budget.mjs`: naikkan batas jalur yang terlewati, dengan komentar "perkakas, bukan aturan: blok
    atmosfer/cahaya-2d/pasca + demo sinematik" dan angka sebelum→sesudah.
- [ ] **Step 6: Rilis.**
  - CHANGELOG 1.3.0 berisi modul, demo, angka biaya, dan keputusan kontras/saturasi.
  - Jalankan `node scripts/bump-version.mjs 1.3.0`, lalu semua cek:
    `build-starters --check`, `bump-version --check`, `context-budget --check`, lint, `test-starters`.
    Semuanya harus lolos.
- [ ] **Step 7: Commit** — `1.3.0: atmosfer + cahaya-2d + pasca (sub-proyek 2)`. Perbarui status sub-proyek 2 di
  `docs/peta-peningkatan-gaya-2026-11-01.md` §8 dalam commit yang sama.
