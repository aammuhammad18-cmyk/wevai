# Riset: Anime.js ("animate.js") untuk WeVai

Tanggal: 2026-10-22 · Cakupan: Anime.js v4 (rilis terbaru 4.5.0), dibandingkan dengan GSAP 3.12.5 (versi yang dipakai
starter) / 3.15.0 (terbaru) dan, untuk kriteria determinisme saja, Motion (`motion` 14.5.0).

**Metode.** Fakta tentang Anime.js diambil dari sumber primer: registry npm, rilis GitHub, kode sumber pada tag
`v4.5.0` (`src/…`, nomor baris dicek di `raw.githubusercontent.com/juliangarnier/anime/v4.5.0/…`), dokumentasi
animejs.com, dan listing jsDelivr/cdnjs. Perilaku yang hanya bisa dibuktikan dengan menjalankannya diuji **empiris**
(lihat Lampiran): Chrome 155.0.8059.82 headless lewat puppeteer dari `wevai/scripts/node_modules`, argumen
`--use-gl=angle --ignore-gpu-blocklist`, halaman dibuka lewat `file://`, library dimuat dari jsDelivr/cdnjs. Halaman
uji berada di scratchpad sesi, tidak masuk repo. Hal yang merupakan pendapat ditandai **[opini]**.

---

## 0. "animate.js" itu yang mana?

Yang paling mungkin dimaksud adalah **Anime.js** (`animejs` di npm, [animejs.com](https://animejs.com),
[github.com/juliangarnier/anime](https://github.com/juliangarnier/anime)). Sejak v4, API utamanya memang bernama
`animate()`, dan library ini yang paling populer di antara nama-nama yang mirip. Kandidat lain:

- **Motion** (`motion`, [motion.dev](https://motion.dev/docs/animate)): fungsi `animate()` dan sequence (dulu Motion One / Framer Motion). Lisensi MIT, 14.5.0 terbit 2026-10-21 ([npm](https://registry.npmjs.org/motion)). Dibahas singkat di bagian M.
- **Animate.css** ([animate.style](https://animate.style), `animate.css` 4.1.1, 2020-09-07, MIT, [npm](https://registry.npmjs.org/animate.css)): kumpulan kelas `@keyframes` CSS. Tidak punya timeline dan tidak bisa di-seek, jadi tidak relevan untuk WeVai.
- **`animate.js`** di npm (2.0.2, 2019-10-24, [jshjohnson/Animate](https://github.com/jshjohnson/Animate)): plugin kecil pemicu animasi saat elemen masuk viewport. Diunduh 93×/minggu ([api.npmjs.org](https://api.npmjs.org/downloads/point/last-week/animate.js)), jadi tidak relevan.

---

## Ringkasan temuan

**Versi & lisensi**
- Terbaru: **Anime.js 4.5.0, terbit 2026-06-22** ([npm](https://registry.npmjs.org/animejs), [rilis v4.5.0](https://github.com/juliangarnier/anime/releases/tag/v4.5.0)). Tag npm `beta` menunjuk ke **5.0.0-beta.2** (2026-08-17) tanpa catatan rilis di GitHub. v4.0.0 (2025-04-03) adalah *complete rewrite* ([rilis v4.0.0](https://github.com/juliangarnier/anime/releases/tag/v4.0.0)).
- Lisensi **MIT** ([LICENSE.md v4.5.0](https://github.com/juliangarnier/anime/blob/v4.5.0/LICENSE.md)). GSAP memakai *Standard "no charge" license* sejak 3.13.0 (2025-04-30) ([npm gsap](https://registry.npmjs.org/gsap)).

**Determinisme & seek (diuji)**
- Timeline yang dibuat dengan `createTimeline({autoplay:false})` lalu digerakkan hanya lewat `.seek(ms)` menghasilkan **computed style identik** untuk 145 frame (60 fps, 2,35 dtk). Ini berlaku untuk urutan maju, mundur, acak, maju lagi, zig-zag, dan halaman segar per waktu (setara worker ekspor): **0 beda**. Hasilnya sama di mode `engine.timeUnit='s'` dan saat **digerakkan oleh jam GSAP** (`gtl.onUpdate → atl.seek(gtl.time()*1000)`). Seek bersifat **sinkron**: gaya sudah tertulis begitu `seek()` kembali.
- **Tiga pengecualian terbukti:**
  1. **`scrambleText()` bergantung jalur seek.** Teksnya berbeda di 51 dari 145 frame antara maju dan mundur. Penyebabnya, RNG ber-state maju setiap kali render ([scramble.js L110, L237](https://github.com/juliangarnier/anime/blob/v4.5.0/src/text/scramble.js#L110)).
  2. **Nilai `from` eksplisit pada tween yang mulai belakangan tidak ditulis sebelum jendelanya tercapai.** Contoh: halaman segar → `seek(500)` memberi opacity 1, tetapi `seek(2000)` lalu `seek(500)` memberi 0. Ini setara masalah `immediateRender` di GSAP. Penawarnya adalah `tl.set(...)` di detik 0, atau *priming* `seek(duration)` → `seek(0)` saat setup (keduanya diuji).
  3. **Callback ikut terpicu saat seek.** `onUpdate` terpicu juga saat mundur. Setelah seek acak, `onBegin` terpicu 35× dan `onComplete` 23×. Untuk mencegahnya, pakai `seek(t, true)` (`muteCallbacks`).
- `engine.update()` **tidak** menerima waktu: ia membaca `Date.now()` ([engine.js L62–63](https://github.com/juliangarnier/anime/blob/v4.5.0/src/engine/engine.js#L62-L63), [helpers.js L37–38](https://github.com/juliangarnier/anime/blob/v4.5.0/src/core/helpers.js#L37-L38)). Jalur deterministik hanyalah `seek()` pada instance yang dijeda, bukan `useDefaultMainLoop=false` + `update()`.

**Nilai relatif (`'+='`)**
- Anime.js menyelesaikan nilai relatif dan nilai berbasis fungsi **saat konstruksi** (`tl.add`), bukan saat render pertama ([animation.js L479–492](https://github.com/juliangarnier/anime/blob/v4.5.0/src/animation/animation.js#L479-L492), [timeline.js L119](https://github.com/juliangarnier/anime/blob/v4.5.0/src/timeline/timeline.js#L119)). Uji tumpang tindih: Anime memberi **260** di t=2 dtk, baik lewat lompatan maupun frame demi frame. Pada skenario yang sama, **GSAP 3.12.5 memberi 300 bila langsung lompat dan 260 bila diputar frame demi frame**. Ini persis bug yang sudah ditambal WeVai lewat `PLAN` di `src/runtime/kamera.js`.

**`file://` & CDN (diuji)**
- UMD klasik dengan global `anime` bisa dipakai lewat `<script>` biasa: `https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.umd.min.js` dengan `integrity="sha384-InMmvD3VoYcY7hGjSC80aLb2bNNE4CzpX+Eq6FVDlmB0IKgDvmfPw4UY8L/M++iG"` (dihitung dari berkas CDN, identik byte-per-byte dengan tarball npm). Berhasil dimuat dari `file://` tanpa error. ESM via import map (`…/anime.esm.min.js`, juga dengan `integrity`) juga berhasil. Tidak ada `import()` dinamis maupun `fetch` di bundle.

**Ukuran (gzip -9, diukur)**
- Bundle penuh Anime.js UMD min **40,6 KB** (118 KB mentah). Per subpath via esm.sh: `timeline` ≈ 14,1 KB, `animation` ≈ 12,8 KB, `text` ≈ 6,4 KB, `waapi` ≈ 4,9 KB, `svg` ≈ 2,2 KB. Ini bundel mandiri yang tumpang tindih, jadi angkanya tidak bisa dijumlahkan.
- Sebagai pembanding, `gsap.min.js` 3.12.5 **28,0 KB** (72 KB mentah) dan Motion UMD 14.5.0 **56,9 KB**.

**Biaya migrasi (dihitung)**
- Pemakaian API GSAP: `tl.to(` 109, `tl.fromTo(` 61, `tl.set(` 71, `gsap.` 88, `immediateRender` 54, `stagger` 42, `onUpdate` 48, `ticker` 73, `tl.time(` 107 (rincian di G). Tujuh starter memuat GSAP 3.12.5, dan alat ekspor memanggil `OPENER.tl.pause(0)` / `tl.time`.

**Rekomendasi:** pertahankan GSAP sebagai satu-satunya jam dan default. Anime.js boleh paling jauh menjadi **pengikut** yang dijeda dan di-*seek* dari jam GSAP untuk efek tertentu. Itu pun belum ada efek yang memerlukannya, karena plugin GSAP kini gratis. Jangan migrasi penuh (detail di H).

---

## A. Anime.js sekarang (v4)

- **Arsitektur modular ESM.** v4.0.0 menulis ulang library ini menjadi `createTimer`, `animate`, `createTimeline`, `createAnimatable`, `createDraggable`, `onScroll`, `createScope`, `svg` (`morphTo`, `createMotionPath`, `createDrawable`), `stagger`, dan `utils` ([rilis v4.0.0](https://github.com/juliangarnier/anime/releases/tag/v4.0.0)). Sejak 4.2.0 setiap modul punya subpath (`animejs/animation`, `animejs/timeline`, `animejs/engine`, `animejs/svg`, `animejs/text`, `animejs/waapi`, `animejs/utils`, `animejs/easings`, …) ([rilis v4.2.0](https://github.com/juliangarnier/anime/releases/tag/v4.2.0), field `exports` di [npm 4.5.0](https://registry.npmjs.org/animejs)).
- **Perkembangan per versi:**
  - 4.1.0: `text.split()` (7 KB) dan `stagger({from:'random'})`.
  - 4.2.0: `splitText()` menggantikan `text.split()`; `spring()` menggantikan `createSpring()`; ditambah `utils.createSeededRandom()`; `cubicBezier/steps/linear/irregular` dikeluarkan dari core.
  - 4.3.0: `createLayout()`, opsi `composition` pada timeline.
  - 4.4.0: `scrambleText()`, urutan transform tetap (`perspective > translate > rotate > scale > skew`), argumen ke-3 *function-based value* berubah dari `total` menjadi `targets`.
  - 4.5.0: adapter Three.js (`animejs/adapters/three`), stagger 3D, `seed` dan `jitter` pada stagger, serta belasan perbaikan seek mundur/maju di timeline dan keyframe.

  Sumber: [rilis 4.1.0](https://github.com/juliangarnier/anime/releases/tag/v4.1.0), [4.2.0](https://github.com/juliangarnier/anime/releases/tag/v4.2.0), [4.3.0](https://github.com/juliangarnier/anime/releases/tag/v4.3.0), [4.4.0](https://github.com/juliangarnier/anime/releases/tag/v4.4.0), [4.5.0](https://github.com/juliangarnier/anime/releases/tag/v4.5.0).
- **Dari v3:** `anime({targets,…})` → `animate(targets, params)`, `anime.timeline()` → `createTimeline()`, `easing:'easeOutQuad'` → `ease:'outQuad'`, `direction` → `reversed/alternate`, `value` → `to`, callback `update/begin/complete` → `onUpdate/onBegin/onComplete`, `endDelay` dihapus, dan `finished` diganti `then()` ([panduan migrasi v3→v4](https://github.com/juliangarnier/anime/wiki/Migrating-from-v3-to-v4)). Implikasinya: kode gaya v3 tidak jalan di v4.
- **Lisensi:** MIT ([LICENSE.md](https://github.com/juliangarnier/anime/blob/v4.5.0/LICENSE.md)).
- **Ukuran:** lihat ringkasan. Dokumentasi menyebut `waapi.animate()` ≈ 3 KB gzip vs ≈ 10 KB untuk versi JS ([When to use WAAPI](https://animejs.com/documentation/web-animation-api/when-to-use-waapi)). Itu angka modul minimal, bukan timeline lengkap.
- **Dukungan browser:** README, npm, dan halaman instalasi 4.5.0 tidak memuat tabel dukungan resmi (lihat "Fakta yang tidak bisa diverifikasi"). Bundle memakai sintaks ES2020 (`?.`, ditemukan 3× di `anime.umd.min.js`), jadi ia butuh browser modern. Untuk WeVai (Chrome/Edge terbaru) ini tidak masalah.
- **Popularitas (npm, 2026-10-12…18):**

  | Paket | Unduhan per minggu |
  |---|---|
  | `animejs` | 633.685 |
  | `gsap` | 3.743.066 |
  | `motion` | 15.750.774 |
  | `framer-motion` | 31.049.591 |

  Sumber: [api.npmjs.org](https://api.npmjs.org/downloads/point/last-week/animejs). Repo Anime.js punya 73.755 bintang GitHub ([API repo](https://api.github.com/repos/juliangarnier/anime)).

## B. Determinisme & seek

**API seek.**
- `timeline.seek(time, muteCallbacks)` dengan `time` dalam ms (default) ([dok seek()](https://animejs.com/documentation/timeline/timeline-methods/seek)).
- Implementasinya ([timer.js L405](https://github.com/juliangarnier/anime/blob/v4.5.0/src/timer/timer.js#L405)) menyetel `paused=true`, memanggil `tick()` sekali secara sinkron, lalu memulihkan status jeda semula.
- Setter `currentTime` = `pause().seek(t)` ([timer.js L252](https://github.com/juliangarnier/anime/blob/v4.5.0/src/timer/timer.js#L252)).
- `autoplay:false` membuat instance tidak pernah masuk loop engine. Child timeline selalu `autoplay=false` ([timer.js L197](https://github.com/juliangarnier/anime/blob/v4.5.0/src/timer/timer.js#L197)).

**Engine.**
- `engine.useDefaultMainLoop` (default `true`) dan `engine.pauseOnDocumentHidden` (default `true`) ([engine.js L52–53](https://github.com/juliangarnier/anime/blob/v4.5.0/src/engine/engine.js#L52-L53)).
- Loop default memakai `requestAnimationFrame` ([L44](https://github.com/juliangarnier/anime/blob/v4.5.0/src/engine/engine.js#L44)). Saat tab tersembunyi, engine di-pause lewat `visibilitychange` ([L161](https://github.com/juliangarnier/anime/blob/v4.5.0/src/engine/engine.js#L161)).
- `engine.update()` adalah "manual tick" saat `useDefaultMainLoop=false` ([dok update()](https://animejs.com/documentation/engine/engine-methods/update)). Namun isinya `const time = this._currentTime = now()` dengan `now = Date.now` ([engine.js L63](https://github.com/juliangarnier/anime/blob/v4.5.0/src/engine/engine.js#L63), [helpers.js L38](https://github.com/juliangarnier/anime/blob/v4.5.0/src/core/helpers.js#L38)). Jadi `update()` **tetap berjalan menurut jam dinding**. Ia berguna untuk menyatukan loop rAF dengan Three.js, tetapi tidak membuat animasi deterministik.
- `engine.speed` menskalakan jam engine. `engine.timeUnit = 's'` mengubah skala global ([L132](https://github.com/juliangarnier/anime/blob/v4.5.0/src/engine/engine.js#L132), [dok timeUnit](https://animejs.com/documentation/engine/engine-parameters/timeunit-seconds-milliseconds)). Uji: mode `s` memberi hasil identik dengan mode `ms` (0 beda di 145 frame).
- Presisi: nilai antara dibulatkan ke `globals.precision = 4` desimal ([globals.js L76](https://github.com/juliangarnier/anime/blob/v4.5.0/src/core/globals.js#L76)). Ini deterministik, tetapi berarti nilai CSS dibulatkan ke 4 desimal.

**Pemakaian `Date.now` lain yang relevan.**
- Di `tick()` timeline, `now()` dipakai hanya bila child punya `frameRate` lebih rendah dari induknya (`child._fps < tl._fps ? child.requestTick(now())`, [render.js L371](https://github.com/juliangarnier/anime/blob/v4.5.0/src/core/render.js#L371)). **Konsekuensi: jangan pakai parameter `frameRate`** pada animasi yang di-seek, karena ia bisa melewatkan render menurut jam dinding (dari baca kode, tidak diuji).
- `resetTime()` memakai `now()` hanya untuk pemutaran ([timer.js](https://github.com/juliangarnier/anime/blob/v4.5.0/src/timer/timer.js)), jadi tidak relevan selama tidak pernah `play()`.

**Apakah seek bebas efek samping?**
- *Tulisan gaya*: secara visual ya (lihat ringkasan dan Lampiran). Namun **string inline style** berbeda menurut jalur. Setelah pernah melewati tween berikutnya, elemen membawa `rotate(0deg); opacity: 1; background-color: …` walau nilainya sama dengan CSS. Pada 105/145 frame string-nya berbeda, sedangkan computed style 0 beda.
- *Callback*: tidak bebas efek samping. Child timeline tidak memicu ulang `onBegin`/`onComplete` saat berjalan mundur ([render.js L117](https://github.com/juliangarnier/anime/blob/v4.5.0/src/core/render.js#L117), [L327](https://github.com/juliangarnier/anime/blob/v4.5.0/src/core/render.js#L327)), tetapi `onUpdate` tetap terpicu ([L312](https://github.com/juliangarnier/anime/blob/v4.5.0/src/core/render.js#L312)). Seek acak memicu `onBegin` 35× dan `onComplete` 23× (Lampiran). Pakai `seek(t, true)`.
- *Logika render inkremental*: `render()` memakai waktu sebelumnya (`_currentTime`, `tickablePrevTime`) untuk memutuskan apakah suatu tween perlu ditulis. Lompatan ≥ `tickThreshold` (200 ms) dipaksa render penuh ([render.js L154](https://github.com/juliangarnier/anime/blob/v4.5.0/src/core/render.js#L154), [globals.js L80](https://github.com/juliangarnier/anime/blob/v4.5.0/src/core/globals.js#L80)). Artinya kebenaran seek bergantung pada logika *gate* yang rumit. Catatan rilis 4.5.0 memperbaiki enam bug seek maju/mundur di timeline/keyframe ([rilis v4.5.0](https://github.com/juliangarnier/anime/releases/tag/v4.5.0)). Uji kami lulus di 4.5.0, tetapi **wajib menyematkan versi persis**: versi sebelum 4.5.0 punya bug seek yang terdokumentasi.

**Keacakan.**
- `utils.random()` memakai `Math.random` ([random.js L18](https://github.com/juliangarnier/anime/blob/v4.5.0/src/utils/random.js#L18)).
- `utils.createSeededRandom(seed)` adalah PRNG mulberry32 ([L32](https://github.com/juliangarnier/anime/blob/v4.5.0/src/utils/random.js#L32)), sejak 4.2.0. Tanpa argumen, seed diambil dari penghitung global `_seed++`, sehingga hasilnya bergantung urutan pemanggilan.
- `stagger({from:'random'})` / `jitter` memakai `Math.random`, **kecuali** diberi `seed` (baru di 4.5.0) ([stagger.js L116](https://github.com/juliangarnier/anime/blob/v4.5.0/src/utils/stagger.js#L116)).
- Easing `irregular()` memakai `Math.random` saat dibuat ([irregular/index.js L29](https://github.com/juliangarnier/anime/blob/v4.5.0/src/easings/irregular/index.js#L29)). Ini dilarang, karena hasilnya berbeda antar-muat halaman dan antar-worker.

## C. Nilai relatif & berbasis fungsi

- Relatif `'+=' '-=' '*='` "adds/subtracts/multiplies the current target value" ([dok Relative value](https://animejs.com/documentation/animation/tween-value-types/relative-value)).
- Di kode, `from` dan `to` didekomposisi lalu operatornya diterapkan **di konstruktor** `JSAnimation` ([animation.js L479–492](https://github.com/juliangarnier/anime/blob/v4.5.0/src/animation/animation.js#L479-L492)). Untuk tween di timeline, nilai "current" diambil dari `_value` tween saudara sebelumnya. Nilai itu dihitung lewat render internal tanpa callback dan tanpa menulis DOM pada posisi `add` (`tick(tl, adjustedPosition, 1, 1, …)` di [timeline.js L119](https://github.com/juliangarnier/anime/blob/v4.5.0/src/timeline/timeline.js#L119)). Tanpa saudara sebelumnya, nilai dibaca dari DOM saat konstruksi.
- Sejak 4.4.0, "each tween now pre-computes and stores its end value at construction time" ([rilis v4.4.0](https://github.com/juliangarnier/anime/releases/tag/v4.4.0)).
- **Uji (Lampiran L4).** Tween 1 `x:200` berjalan 400–1400 ms, tween 2 `x:'+=100'` mulai 1200 ms:

  | Library | Lompat langsung ke 2 dtk | Frame demi frame |
  |---|---|---|
  | Anime | 260 | 260 |
  | GSAP 3.12.5 | **300** | **260** |

  Pada t=1,3: Anime 172,5 / 172,5; GSAP 192,5 / 172,5. Jadi di Anime, "relatif" berarti **relatif terhadap nilai rencana pada detik tween mulai, dihitung sekali saat setup**. Itu sama dengan kontrak `PLAN` WeVai.
- Nilai berbasis fungsi `(target, index, targets, prevTween) => …` juga dievaluasi saat konstruksi, dan bisa dihitung ulang hanya dengan `.refresh()` ([dok Function based](https://animejs.com/documentation/animation/tween-value-types/function-based)). Selama fungsi itu murni (tanpa `Math.random`), hasilnya deterministik.
- **`composition`** (`replace` default, `blend`, `none`) ([dok composition](https://animejs.com/documentation/animation/tween-parameters/composition)):
  - `replace` memotong tween saudara yang tumpang tindih; inilah yang diuji, dan hasilnya deterministik.
  - `blend` menjumlahkan nilai lewat modul `additive`, yang di-update dari loop engine (`additive.update()` di [engine.js](https://github.com/juliangarnier/anime/blob/v4.5.0/src/engine/engine.js)). Determinisme `blend` di bawah seek **tidak diuji**. Anggap terlarang sampai ada bukti.
  - `none` pada timeline (`createTimeline({composition:false})`, 4.3.0) melewati render internal saat `add`, sehingga nilai implisit tidak dirantai. Ini juga tidak diuji.

## D. `file://` dan CDN

- **UMD**, terbukti jalan dari `file://` (L1):
  ```html
  <script src="https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.umd.min.js"
          integrity="sha384-InMmvD3VoYcY7hGjSC80aLb2bNNE4CzpX+Eq6FVDlmB0IKgDvmfPw4UY8L/M++iG"
          crossorigin="anonymous"></script>
  <script>const { createTimeline, stagger, svg, engine } = anime;</script>
  ```
  Pola ini juga yang ditunjukkan dokumentasi resmi, tetapi tanpa versi ([Installation](https://animejs.com/documentation/getting-started/installation)). WeVai harus menyematkan `@4.5.0`.
- **cdnjs**: `https://cdnjs.cloudflare.com/ajax/libs/animejs/4.5.0/anime.umd.min.js`, SRI `sha512-dnhflec5WaXvpVYrt0oWfe0iUyWpjNiZbxkjrhNu9WAWWHLX7VqqyxCZHL7dWCrwj6lN+XGN9FtiWIBgX2b/PA==` ([API cdnjs](https://api.cdnjs.com/libraries/animejs?fields=version,sri,latest)).
- **jsDelivr** menyediakan hash SHA-256 base64 per berkas di [data API](https://data.jsdelivr.com/v1/packages/npm/animejs@4.5.0?structure=flat) (`anime.umd.min.js`: `jVs6WKH2QCOgSkzt7vE1oiY7GNoEs1F3rBNDigutAzs=`). Hash itu bisa dipakai sebagai `sha256-…`. `scripts/cdn-integrity.mjs` WeVai menghitung `sha384` sendiri, jadi ia langsung bisa dipakai.
- **ESM via import map**, terbukti dari `file://` (L1b): `"animejs": "https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.esm.min.js"` dengan `integrity` `sha384-dUvtnao0svvqLmC/RmuxxBIMGuLoVY2joH2Rd3wq74ZaJkK0zpPvJvtK4daGSDNf`. Alternatif yang didokumentasikan: `https://cdn.jsdelivr.net/npm/animejs/+esm` dan `https://esm.sh/animejs`. Keduanya mengirim `Access-Control-Allow-Origin: *` (dicek dengan `curl -I`).
- **Tanpa fetch dinamis.** `grep` atas `dist/modules` 4.5.0 tidak menemukan `import(` maupun `fetch`. Satu-satunya `import('three')` ada di komentar JSDoc adapter Three. Adapter Three adalah impor *side-effect* terpisah (`animejs/adapters/three`) dan tidak masuk bundle UMD (`sideEffects` di [package.json](https://registry.npmjs.org/animejs)).

## E. Fitur SVG/CSS untuk motion design

- **Transform individual** (`x`, `y`, `rotate`, `scale`, …) ditulis ke `style.transform` dengan urutan tetap sejak 4.4.0 ([rilis v4.4.0](https://github.com/juliangarnier/anime/releases/tag/v4.4.0)).
- **Jebakan di elemen SVG (diuji, L5):**
  - Pada `<rect>`, `x:'+=150'` menganimasikan **atribut** `x` (100 → 250), bukan `translateX`.
  - `rotate` masuk ke CSS `transform` dengan `transform-origin: 0px 0px`, sehingga kotak berputar mengelilingi pojok SVG dan terlempar ke x = −132.
  - Di SVG, pakai `translateX` eksplisit dan pasang CSS `transform-box: fill-box; transform-origin: center`. Bandingkan dengan GSAP, yang menangani transform SVG lewat atribut dan `svgOrigin`/`transformOrigin` relatif bbox ([dok CSSPlugin](https://gsap.com/docs/v3/GSAP/CorePlugins/CSS/), tidak diuji di sini).
- **SVG utilities:**
  - `svg.createDrawable` + `draw:'0 1'`: `stroke-dasharray` diuji deterministik.
  - `svg.morphTo` dan `svg.createMotionPath`: tidak diuji ([dok SVG](https://animejs.com/documentation/svg/createdrawable), [morphTo](https://animejs.com/documentation/svg/morphto)).
- **Variabel CSS** didukung sejak 4.0/4.2 ([rilis v4.2.0](https://github.com/juliangarnier/anime/releases/tag/v4.2.0)).
- **Stagger:** grid 2D `[cols, rows]`, `grid:true` (auto-grid, 4.4.0), 3D (4.5.0), `from:'center'|'random'|[x,y,z]`, serta `seed` dan `jitter` (4.5.0).
- **Easing:** `'out(2)'` (default), `'inOutQuad'`, dan seterusnya. Sejak 4.2.0, `cubicBezier`, `steps`, `linear`, dan `irregular` diimpor terpisah (di bundle UMD tetap ada sebagai `anime.cubicBezier` dst.). `spring()` dikonversi ke `settlingDuration` sehingga durasinya tetap ([rilis v4.2.0](https://github.com/juliangarnier/anime/releases/tag/v4.2.0), [dok spring](https://animejs.com/documentation/easings/spring)).
- **Teks:**
  - `splitText()` (4.2.0, sebelumnya `text.split()` 4.1.0) ([dok splitText](https://animejs.com/documentation/text/splittext)).
  - `scrambleText()` (4.4.0) **tidak deterministik di bawah seek** (B, L2), walaupun ada parameter `seed` ([dok scrambleText seed](https://animejs.com/documentation/text/scrambletext/scrambletext-parameters/seed)): seed hanya menetapkan urutan, bukan pemetaan waktu → karakter.
- **WAAPI (`waapi.animate`):**
  - Seek-nya menyetel `Animation.currentTime` native ([waapi.js L396, L450](https://github.com/juliangarnier/anime/blob/v4.5.0/src/waapi/waapi.js#L396)). Timeline Anime bisa `sync()` animasi WAAPI ([rilis v4.0.0](https://github.com/juliangarnier/anime/releases/tag/v4.0.0)).
  - Determinisme WAAPI di bawah seek + 2×rAF **tidak diuji langsung untuk Anime**. Uji Motion (M) memberi bukti tidak langsung bahwa nilai WAAPI stabil setelah 2×rAF, tetapi itu tidak sinkron, sehingga `SYNC=1` dan `seek.js` tidak bisa mengandalkannya.
  - Dokumentasi sendiri menyarankan `animate()` (JS) untuk SVG, timeline kompleks, dan kontrol penuh ([When to use WAAPI](https://animejs.com/documentation/web-animation-api/when-to-use-waapi)).

## F. Perbandingan dengan GSAP untuk kebutuhan WeVai

| Kriteria | GSAP 3.12.5 (dipakai) / 3.15.0 | Anime.js 4.5.0 |
|---|---|---|
| Lisensi | Standard "no charge" sejak 3.13.0 (2025-04-30), termasuk plugin. Dilarang untuk alat visual no-code pesaing Webflow (riset 2026-10-03, [standard-license](https://gsap.com/standard-license)) | MIT ([LICENSE.md](https://github.com/juliangarnier/anime/blob/v4.5.0/LICENSE.md)) |
| Ukuran gzip (diukur) | `gsap.min.js` 28,0 KB; MotionPathPlugin +9,6 KB | UMD penuh 40,6 KB; subpath timeline ≈ 14,1 KB (ESM) |
| Seek timeline | `tl.pause(t,false)` / `seek` ([dok seek()](https://gsap.com/docs/v3/GSAP/Timeline/seek())); gaya ditulis *lazy* sehingga WeVai memanggil `gsap.ticker.tick()` di `seek.js` | `tl.seek(ms[,mute])` sinkron. Computed style identik di semua urutan (L2) |
| Status awal (`immediateRender`) | `fromTo/from` default merender `from` saat dibuat; masalah jalur seek diatur dengan aturan `immediateRender` (54 kemunculan di WeVai) | **Tidak ada** `immediateRender`. `from` eksplisit tidak ditulis sebelum jendela tween, sehingga bergantung jalur (L3). Penawar: `tl.set(…,0)` atau priming `seek(dur)→seek(0)` |
| Nilai relatif `+=` | Diselesaikan saat render pertama, bergantung jalur (L4: 300 vs 260) | Diselesaikan saat konstruksi, deterministik (L4: 260/260) |
| Stagger | `stagger:{each,from,grid,…}`; `from:'random'` memakai acak GSAP | `stagger(v,{from,grid,seed,jitter})`; seeded sejak 4.5.0 |
| SVG draw/morph/motion path/split/scramble | DrawSVG, MorphSVG, MotionPath, SplitText, ScrambleText, semuanya gratis sejak 3.13 | Bawaan: `createDrawable`, `morphTo`, `createMotionPath`, `splitText`, `scrambleText` (yang terakhir tidak deterministik, L2) |
| Kontrol jam | `gsap.ticker` (lag smoothing, `tick()` manual) | `engine.update()` tetap `Date.now`; jalur deterministik hanya `seek()` |
| Satuan waktu | detik | ms (default) atau `engine.timeUnit='s'` (global) |
| Kinerja seek (mesin ini, 300/1000 elemen, L6) | 6,3–6,5 / 17–18 ms per seek acak | 6,0–7,8 / 18,8–22,6 ms per seek acak (setara; maju berurutan sedikit lebih cepat) |
| Unduhan npm/minggu | 3.743.066 | 633.685 |
| Keakraban model AI | **[opini]** jauh lebih tinggi: GSAP stabil sejak 3.0 (2019) dan kosakata WeVai seluruhnya GSAP | **[opini]** lebih rendah, dan API v4 (2025) mematahkan sintaks v3 yang lebih banyak beredar ([migrasi](https://github.com/juliangarnier/anime/wiki/Migrating-from-v3-to-v4)), sehingga agen rawan menulis `anime({targets})` |

## G. Biaya migrasi untuk WeVai

**Hitungan** (`grep -o … | wc -l`, `scripts/` dan `node_modules` dikecualikan):

| Pola | `src/runtime/*.js` | `assets/*.html` | `references/*.md` | `SKILL.md` | Total |
|---|---:|---:|---:|---:|---:|
| `tl.to(` | 4 | 94 | 11 | 0 | 109 |
| `tl.fromTo(` | 0 | 50 | 11 | 0 | 61 |
| `tl.set(` | 4 | 58 | 9 | 0 | 71 |
| `gsap.` | 8 | 77 | 3 | 0 | 88 |
| `immediateRender` | 0 | 44 | 10 | 0 | 54 |
| `stagger` | 0 | 25 | 17 | 0 | 42 |
| `onUpdate` | 4 | 40 | 4 | 0 | 48 |
| `killTweensOf` | 1 | 5 | 0 | 0 | 6 |
| `ticker` | 8 | 61 | 3 | 1 | 73 |
| `tl.time(` | 10 | 82 | 12 | 3 | 107 |
| `'+=` | 9 | 49 | 1 | 0 | 59 |
| `ease:` | 2 | 120 | 24 | 0 | 146 |

Catatan pembacaan tabel:
- `assets/*.html` memuat runtime yang di-*inline* oleh `build-starters.mjs`, jadi sebagian angka `src/runtime` ikut terhitung lagi di sana.
- Kata "GSAP/gsap" muncul 31× di `SKILL.md` + `references/*.md`.
- Ketujuh starter memuat GSAP 3.12.5.
- `export-frames.mjs` memanggil `window.OPENER.tl.pause(0)` dan fallback `OPENER.tl.time` (L92, L115), sedangkan `snap.mjs` memakai `OPENER.seek`. `lint-motion.mjs` dan `test-starters.mjs` masing-masing punya satu rujukan GSAP.

**Opsi 1 — GSAP saja (status quo).**
- Tidak ada yang rusak dan dokumen tidak berubah.
- Risikonya hanya yang sudah dikenal (`immediateRender`, `+=`), dan keduanya sudah dijaga oleh `PLAN` di `kamera.js` serta aturan di SKILL/lint.

**Opsi 2 — GSAP tetap jam master, Anime.js sebagai pengikut untuk efek tertentu.**
- **Terbukti exact di uji L2:** 0 beda computed style antara Anime yang di-seek langsung dan Anime yang digerakkan `gsap.timeline({paused:true, onUpdate: () => atl.seek(gtl.time()*1000)})` lewat `gtl.pause(t,false)`, di semua urutan.
- Pola minimal:
  ```js
  const fx = anime.createTimeline({autoplay:false}) /* …add… */;
  fx.seek(fx.duration, true).seek(0, true);            // priming: tulis semua nilai 'from' (L3)
  tl.to({}, {duration: DURATION, ease:'none', onUpdate(){ fx.seek(tl.time()*1000, true); }}, 0);
  ```
- Yang perlu ditambahkan ke dokumen agen (±1 halaman di `techniques.md` atau `architecture.md`) adalah larangan berikut:
  - `play()`/`autoplay` tidak boleh dipakai;
  - `engine.update()` tidak boleh dipakai sebagai jam;
  - `frameRate`, `composition:'blend'`, `scrambleText`, `irregular`, `utils.random`, dan `stagger({from:'random'})` tanpa `seed` dilarang;
  - versi wajib disematkan `@4.5.0` + SRI;
  - di SVG, pakai `translateX` dan `transform-box`.

  Ditambah satu aturan lint: `animate(`/`createTimeline(` tanpa `autoplay:false`, serta `.play(` pada objek anime, dianggap gagal.
- Risiko:
  - +40 KB per berkas (UMD);
  - dua kosakata easing/satuan (detik vs ms) dalam satu berkas;
  - agen bisa tergelincir ke `animate()` yang autoplay dengan jam dinding;
  - versi sebelum 4.5.0 punya bug seek.

  **Manfaat nyata saat ini kecil**, karena semua fitur khas Anime (draw, morph, motion path, split, scramble) juga ada di plugin GSAP yang kini gratis. **[opini]**

**Opsi 3 — migrasi penuh.**
- Yang rusak atau harus ditulis ulang:
  - `kamera.js`: `camTo/cutTo` memakai `tl.to/tl.set` + `onUpdate` + `gsap.killTweensOf`. Anime bisa menganimasikan objek JS biasa, tetapi easing dan detik harus diterjemahkan;
  - `seek.js` (`gsap.ticker.tick`), yang malah bisa disederhanakan karena seek Anime sinkron;
  - semua ±240 pemanggilan `tl.to/fromTo/set` di 7 starter dan contoh `references/`;
  - 146 string `ease:` (`power2.inOut` → `inOut(2)`/`inOutQuad`);
  - aturan `immediateRender` (54), yang harus diganti aturan priming/`set` di detik 0;
  - kontrak `OPENER.tl.pause(0)/time()` di `export-frames.mjs`, yang butuh adapter karena `pause()` di Anime tidak menerima argumen ([timer.js](https://github.com/juliangarnier/anime/blob/v4.5.0/src/timer/timer.js));
  - `lint-motion.mjs`, `test-starters.mjs`, `test-kamera.mjs`;
  - ±230 KB teks aturan.
- Risiko tinggi, bukti manfaat rendah. Satu-satunya keunggulan terukur (resolusi `+=` saat konstruksi) sudah dicapai WeVai dengan `PLAN`.

## H. Rekomendasi

WeVai **tidak perlu mengadopsi Anime.js** sebagai library default dan tidak boleh bermigrasi penuh.
- Biaya migrasinya ratusan pemanggilan dan seluruh teks aturan, sementara keunggulan terukurnya kecil. Resolusi nilai relatif saat konstruksi sudah dipenuhi `PLAN`, dan fitur SVG/teksnya sudah ada di plugin GSAP yang gratis sejak 3.13.
- Bila suatu efek benar-benar lebih mudah di Anime.js, izinkan ia **hanya sebagai pengikut**: instance `autoplay:false`, di-*seek* dengan `seek(ms, true)` dari `onUpdate` tween GSAP yang membentang seluruh durasi, di-*priming* saat setup, versi disematkan `4.5.0` dengan SRI. Uji kami menunjukkan pola ini exact (0 beda di 145 frame, semua urutan seek, termasuk halaman segar).
- Yang **tidak boleh berubah**: satu jam master (`tl.time()` GSAP), loop dari `tl.time() >= DURATION`, dan tidak ada library yang memutar dirinya sendiri dengan rAF/`Date.now`. `engine.update()` Anime **bukan** jalan keluar karena ia membaca `Date.now`.
- Bukti ini terbatas: satu mesin, satu versi Chrome, satu timeline uji dengan 9 target dan 145 frame. Morph, motion path, `blend`, keyframe, spring, dan WAAPI tidak diuji.
- Sebelum opsi 2 dipakai di produksi, jalankan `snap.mjs` dua kali dan `export-frames.mjs WORKERS=2` pada berkas nyata, lalu bandingkan hash frame.
- Ini selaras dengan antipattern "Mengunci ke satu library" di `references/roadmap.md`: prinsipnya (satu jam, determinisme) yang dikunci, bukan library-nya.

---

## M. Motion (`motion.dev`) — hanya kriteria determinisme/seek

- `animate()` mengembalikan *playback controls* dengan `.time` (detik, bisa di-set), `.pause()`, `.play()`, dan `.speed`. Sequence berupa larik segmen dengan `at` ([dok animate](https://motion.dev/docs/animate)). Versi *hybrid* ≈ 22 KB menurut dokumentasi. UMD `dist/motion.js` 14.5.0 berukuran 56,9 KB gzip (diukur), global `Motion`, lisensi MIT ([npm](https://registry.npmjs.org/motion)).
- **Uji (L7):** sequence 4 segmen (stagger, transform, opacity, dan `from` eksplisit) dijeda, lalu `controls.time = t`.
  - Bila gaya dibaca **segera**, hasilnya berbeda di 123/154 frame (maju vs mundur) dan halaman segar tertinggal satu langkah. Render Motion **asinkron**: menunggu frame berikutnya.
  - Setelah menunggu **2×rAF** (seperti `export-frames.mjs` default), hasilnya **0 beda** untuk maju/mundur/acak/segar.
- Kesimpulan: Motion bisa deterministik untuk ekspor 2×rAF, tetapi **tidak** cocok dengan `seek.js`/`SYNC=1`/scrub yang mengandalkan seek sinkron. Ia juga tidak bisa digerakkan langsung dari `onUpdate` GSAP dalam frame yang sama.
- Beberapa fitur 3D/Three.js ada di Motion+ berbayar ([dok animate](https://motion.dev/docs/animate)). Kalau harus memilih pengikut kedua, Anime.js lebih cocok daripada Motion karena seek-nya sinkron.

---

## Fakta yang tidak bisa diverifikasi

- **Isi 5.0.0-beta.2** (2026-08-17, tag npm `beta`): tidak ada catatan rilis GitHub (daftar rilis berhenti di v4.5.0). Perubahan API v5 tidak diperiksa.
- **Tabel dukungan browser resmi v4**: tidak ditemukan di README, npm, maupun halaman instalasi 4.5.0. Klaim "ES2020" hanya disimpulkan dari sintaks bundle.
- **Determinisme `morphTo`, `createMotionPath`, `composition:'blend'`, keyframe, `spring()`, `waapi.animate` di bawah seek**: tidak diuji.
- **Ukuran per modul "resmi"**: Anime tidak memublikasikannya selain angka WAAPI 3 KB vs JS 10 KB di dokumentasi. Angka per subpath di sini berasal dari bundel esm.sh (`?bundle&target=es2022`), bukan dari penulis.
- **Halaman lisensi GSAP** tidak bisa diambil ulang hari ini (gsap.com menampilkan halaman "Forums Temporarily Offline"). Bagian lisensi mengandalkan [riset 2026-10-03](riset-3d-sinematografi-2026-10-03.md), field `license` npm untuk 3.13.0–3.15.0, dan spanduk "GSAP is now free for everyone" di gsap.com.
- **Keakraban model AI** terhadap GSAP vs Anime.js: tidak ada sumber primer; hanya opini dan proksi unduhan npm.
- **Perilaku transform-origin SVG di GSAP**: hanya dirujuk dari dokumentasi, tidak diuji di sini.

---

## Lampiran: uji empiris (Chrome 155.0.8059.82 headless, puppeteer dari `wevai/scripts`, `file://`)

Semua berkas ada di
`C:\Users\ITBAHA~1\AppData\Local\Temp\claude\e--mila-mila\33d9b965-fcdd-4b32-b080-ac338d0272ce\scratchpad\anime\`.
Node dijalankan dari `E:\mila\wevai\scripts`, dengan puppeteer di-`require` lewat `createRequire('E:/mila/wevai/scripts/package.json')`.
Peluncuran: `executablePath: C:/Program Files/Google/Chrome/Application/chrome.exe`, `args: ['--use-gl=angle','--ignore-gpu-blocklist']`.

**L1 — Muat dari `file://`** (`uji.html`). Anime UMD 4.5.0 dari jsDelivr dengan `integrity` sha384 + GSAP 3.12.5 dari cdnjs: 0 error halaman, 0 error konsol. **L1b** (`uji-esm.html`): import map `animejs` → `anime.esm.min.js` + `integrity`, `createTimeline().add('#a',{x:100,duration:1000}).seek(500)` → `matrix(1,0,0,1,75,0)`, sesuai ease default `out(2)`.

**L2 — Seek berbagai urutan** (`uji.html` + `jalankan.mjs`).
- Timeline (`autoplay:false`, `ease:'inOutQuad'`):
  - `.b`×6 `{x:200, delay:stagger(80)}` @0;
  - `.b {x:'+=100', rotate:90}` @1200, dengan penghitung `onBegin/onComplete/onUpdate`;
  - `.b {opacity:[1,.2], backgroundColor:'#ff0000', delay:stagger(50,{from:'random',seed:7})}` @1500;
  - `#r` (SVG rect) `{x:'+=150', scale:1.5, rotate:45}` @300;
  - `createDrawable('#p') {draw:['0 0','0 1']}` @200;
  - `#scr {innerHTML: scrambleText({text:'WEVAI MOTION', seed:3})}` @400.
- Durasi 2350 ms, sampel 145 waktu (`f/60` dtk).
- Snapshot berisi computed `transform, opacity, backgroundColor, strokeDasharray, strokeDashoffset` per elemen (`none` dinormalisasi ke matriks identitas), ditambah `textContent` scramble secara terpisah.
- Pemisah awalnya `#`, yang ternyata bentrok dengan karakter scramble default `a-zA-Z0-9!%#_`. Pemisah kemudian diganti `@@SCR@@`, dan angka di bawah berasal dari run terakhir.

| Perbandingan (145 frame kecuali disebut) | direct/ms visual | scramble | gsap-clock/ms visual | scramble | direct/s visual | scramble |
|---|---:|---:|---:|---:|---:|---:|
| maju vs mundur | 0 | 51 | 0 | 51 | 0 | 51 |
| maju vs acak (LCG seed 12345) | 0 | 52 | 0 | 52 | 0 | 52 |
| maju vs maju lagi (setelah acak) | 0 | 52 | 0 | 52 | 0 | 52 |
| maju vs halaman segar per t (22 sampel) | 0 | 4 | 0 | 4 | 0 | 4 |
| maju vs zig-zag (seek t−2 frame lalu t, 48 sampel) | 0 | 16 | 0 | 16 | 0 | 16 |
| string `style` inline, maju vs mundur | 105 beda (residu `rotate(0deg); opacity:1; background-color` yang sama nilainya) | | | | | |

- Lintas mode (urutan maju): **direct/ms vs gsap-clock/ms = 0 beda (visual dan scramble)**, **ms vs s = 0 beda**.
- Membangun timeline yang dijeda **tidak menulis gaya apa pun** (`style` sebelum = sesudah = `left:10px`).
- Callback (`onBegin/onComplete/onUpdate` child ke-2): setelah maju 1/1/48, setelah mundur 1/1/96, setelah acak 35/23/165 (direct/ms; gsap-clock 29/22/165; s 36/22/164).
- Contoh nilai di t=2,35 dtk: `.b` ke-1 `matrix(0,1,-1,0,300,0)`, opacity 0,2, `rgb(255,0,0)`. `.b` ke-6 berada di x=284, karena `+=100` dihitung dari nilai 184 saat tween ke-2 mulai (tween ke-1 belum selesai).

**L3 — Nilai `from` sebelum jendela tween** (`uji-from.html`).
- Setup: `#a {opacity:[0,1]}` @1500; `#b {opacity:{from:0}}` @1500; `#c` dengan `tl.set({opacity:0},0)` + `{opacity:1}` @1000. Nilai di bawah adalah opacity a, b, c:

| Jalur | Hasil (a, b, c) |
|---|---|
| Segar, `seek(500)` | 1, 1, 0 |
| Segar, `seek(0)` | 1, 1, 0 |
| `seek(2000)` → `seek(500)` | **0, 0, 0** |
| Maju 0 → 16 → 33 → 500 | 1, 1, 0 |
| Priming `seek(dur)` → `seek(0)`, lalu `seek(500)` | 0, 0, 0 |
| Priming, lalu `seek(1700)` | 0,64; 0,64; 1 (= 1 − 0,6², benar) |

**L4 — Nilai relatif, Anime vs GSAP** (`uji-relatif.html`).
- Setup: Anime `add('#a',{x:200,duration:1000,delay:400},0).add('#a',{x:'+=100',duration:800},1200)`, ease linear. GSAP `to('#g',{x:200,duration:1},.4).to('#g',{x:'+=100',duration:.8},1.2)`, ease `none`.

| Jalur | Anime | GSAP |
|---|---:|---:|
| Langsung ke 2 dtk | 260 | **300** |
| Langsung ke 1,3 dtk | 172,5 | **192,5** |
| Frame demi frame 0 → 2 dtk, nilai di 1,3 / 2 | 172,5 / 260 | 172,5 / 260 |

**L5 — SVG** (`uji-svg.html`). Rect `x=100`, `{x:'+=150', rotate:90}` → atribut `x="250"`, `style="transform: rotate(90deg);"`, computed `transform-origin: 0px 0px`, kotak layar di (−132, 258). Rect kedua `{translateX:150, rotate:90}` → `transform: translateX(150px) rotate(90deg)`.

**L6 — Biaya seek** (`uji-perf.html`). N elemen, dua tween/elemen (x+rotate, opacity+scale) dengan stagger. Waktu rata-rata per seek mencakup paksa layout (`offsetHeight`), 400 seek acak setelah 50 pemanasan, dan 241 seek maju berurutan. Dua kali run:

| N | Anime acak (ms) | GSAP acak (ms) | Anime maju (ms) | GSAP maju (ms) |
|---:|---:|---:|---:|---:|
| 300 | 7,8 / 6,0 | 6,5 / 6,3 | 4,1 / 5,1 | 4,9 / 5,2 |
| 1000 | 18,8 / 22,6 | 18,1 / 17,0 | 6,9 / 7,4 | 11,6 / 8,6 |

Kesimpulan: setara dalam derau. Tidak ada alasan kinerja untuk berpindah.

**L7 — Motion 14.5.0** (`uji-motion.html`).
- Sequence: `['.b',{x:200},{duration:1,delay:stagger(.08)}]`, `['.b',{x:300,rotate:90},{at:1.2,duration:.8}]`, `['.b',{opacity:[1,.2]},{at:1.5,duration:.6}]`, `['#late',{opacity:[0,1]},{at:2.2,duration:.3}]`; lalu `pause()` dan `controls.time = t`. Total 154 frame.

| Cara baca | Maju vs mundur | Maju vs acak | Maju vs halaman segar |
|---|---:|---:|---:|
| Langsung setelah set | 123 beda | 147 beda | 17/18 beda |
| Setelah 2×rAF | 0 | 0 | 0 |
