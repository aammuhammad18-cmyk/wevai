# Changelog

## 1.3.0 — 2026-11-02

Atmosfer, cahaya 2D, dan grade (sub-proyek 2 dari `docs/peta-peningkatan-gaya-2026-11-01.md`): tiga modul runtime
bersama dan satu adegan bukti, supaya ilustrasi sinematik (patokan: still spike gapura malam) menjadi panggilan
fungsi, bukan kode sekali pakai.

- **`atmosfer`** (`src/runtime/atmosfer.js`): `langit()` (satu fragment shader WebGL2: gradien, bulan + pendar,
  bintang, awan fBm, god rays; tanpa WebGL2 jatuh ke gradien CSS), `kabut()` per bidang (tile fBm dipanggang sekali,
  hanyut dari `tl.time()`), `warnaJarak()` (perspektif udara), `partikel()` (bara, debu, asap, kunang-kunang; PRNG
  ber-seed, ≤ 400 per panggilan), `lapisDepan()` dan `viewDunia()`. Semuanya fungsi murni `tl.time()` + seed.
- **`cahaya-2d`** (`src/runtime/cahaya-2d.js`): `sumber()` (pendar berkedip), `redup()` (gelap bermasker yang
  menjauhi sumber), `rim()`, `bayangan()`, `relief()`. Filter dan mask dipanggang sekali saat dipanggil; atributnya
  tak pernah ditulis lagi.
- **`pasca`** (`src/runtime/pasca.js`): `grade(at,dur,preset|nilai)` men-tween `GRADE` lewat lapisan blend di luar
  rig (bukan filter layar penuh); lima preset: `senja`, `malam-api`, `fajar`, `siang-kering`, `arsip`.
- **Starter**: blok `<wv:atmosfer>`, `<wv:cahaya-2d>`, `<wv:pasca>` di `starter-explainer.html` dan
  `starter-explainer-panggung.html`, di atas bagian adegan; starter lain tidak disentuh. Panggung hanya menerima
  blok + satu contoh di `kartun-panggung.md` kulit B (bidang `<div data-z>` untuk panggung = sub-proyek 3).
- **Adegan bukti `starter-explainer.html?demo=sinematik`** (gapura malam ber-obor, 12 dtk): langit ungu + bulan +
  awan + god rays, tiga kabut, dua obor ber-pendar berkedip, relief bata, penjaga ber-rim + bayangan, bara + debu,
  grade `malam-api`, dolly + truck + handheld. Framing t = 7 = still spike `f_7`. Bukti: `evals/bukti/2026-11-02-atmosfer/`
  (`kontak.jpg`, `gerak.gif`, `bench.txt`).
- **Status penerimaan**: kode selesai; penilaian visual pemilik terhadap `f_7` (spec §6.4) menunggu. Beda yang diketahui
  dari `f_7`: gumpalan kabut tanah, tekstur/anak tangga lantai, butir bata, spekular penjaga, kolom asap.
- **Biaya** (`scripts/bench-frame.mjs`, mesin acuan i3-3217U / HD 4000, 1920×1080, 1 worker, Chrome sistem, 20
  frame, batas 350 ms): demo `?demo=sinematik` **268 ms** (268 / 272 / 267, deterministik di ketiga run). Kode akhir
  ini diukur saat render lain milik pengguna berjalan di mesin yang sama (proses bench diberi prioritas HIGH), jadi
  268 adalah batas atas; versi sebelum kontras/saturasi pada mesin senggang: 242 / 241 / 236 → 241 ms. Terukur per
  bagian saat modul dibangun: langit ±12–15 ms, grade +15–35 ms, filter cahaya yang dipanggang ≈ gratis, dolly tanpa
  `will-change` pada `<svg>` bidang +125–170 ms — angka ini dari komentar kepala `atmosfer.js`/`cahaya-2d.js` dan
  catatan pembangunan modul, bukan dari `bench.txt`; 400 partikel ≈ +10 ms. `bench.txt` memuat semua run demo,
  kontras, dan partikel.
- **Kontras/saturasi ditambahkan ke `GRADE`**: `kontras` dan `saturasi` (netral = 1, tidak menulis apa pun) ditulis
  sebagai `filter: contrast() saturate()` pada VIEW yang memuat rig (`#collage`), tidak pernah pada rig atau `[data-z]`
  (meratakan paralaks); di starter panggung view = rig, jadi diabaikan sampai sub-proyek 3 memberi bidang. Hanya preset
  `malam-api` membawa nilainya (1,08 / ,9 seperti spike, bukti visual di `kontak.jpg`); preset lain netral sampai ada
  bukti rupa. Selama grade non-netral modul memiliki `filter` view: nilai hidup dibandingkan tiap frame, bukan cache,
  jadi tulisan lain (blur `whip()` ke view itu) ditimpa lagi — blur itu tidak tampak, tetapi hasilnya tidak bergantung
  jalur seek. Biaya diukur selang-seling, A tanpa dan B dengan `filter: contrast(1.08) saturate(.9)` sementara pada
  `#collage`: selisih median +8 ms/frame (5 pasangan, 259 → 267 ms); pengulangan lain −1…+9 ms (selang-seling tanpa
  prioritas +6; berpasangan sehalaman +9 / +2 / −1) → ≤ 15 ms (spec §4.3), jadi dipasang. Pengukuran selang-seling itu
  semuanya diambil saat render milik pemilik berjalan di mesin yang sama (hanya seri +8 yang berprioritas HIGH, seri lain
  prioritas biasa): angka di bawah beban, bukan mesin senggang. Tiga run A lalu tiga run B berurutan memberi +31 ms
  (241 → 272), terseret urutan:
  mesin melambat seiring beban (B1 250 → B3 275), jadi bandingkan selang-seling. Efek samping: view ber-filter menjadi
  grup terisolasi (`mix-blend-mode` anaknya memadu di dalam view, tidak dengan langit); langit dan lapisan depan di
  luar view tidak ikut tersaring. Belum diukur (tindak lanjut): biaya selama transisi preset, saat filter view berubah
  dan ditulis ulang tiap frame.
- **Identitas dengan 1.2.0**: tanpa `?demo=sinematik`, `starter-explainer.html?clean=1` dan
  `starter-explainer-panggung.html?clean=1` identik dengan 1.2.0 (worktree `7fa0791`, `snap.mjs`, t = 1, 5, 12): hash
  PNG identik di 11 dari 12 pasangan titik (dua putaran). Satu-satunya beda, explainer t = 5, juga berubah antar-run
  pada 1.2.0 sendiri (hash 6a0f… lalu 258c…), kedip bawaan yang sudah ada, bukan regresi. Dibandingkan sebagai
  keadaan dalam satu proses Chrome (DOM `#stage`, gaya rig, kanvas): identik di keenam titik.
- **Uji**: `test-starters` kini memuat kait `ATM_UJI`, `CAHAYA_UJI`, `PASCA_UJI` (halaman bawaan) dan `SINEMA_UJI`
  (halaman `?demo=sinematik`: paralaks hidup, rig/`[data-z]` tanpa filter, semua modul terpasang, piksel semua
  kanvas sama di dua jalur seek); `PASCA_UJI` juga menjaga kontras/saturasi (filter hanya di view; netral tidak
  menulis dan tak menghapus filter asing; filter asing ditimpa lagi); `ATM_UJI`/`CAHAYA_UJI` juga menjaga penolakan bidang
  non-HTML (`kabut`, `partikel`, `'Depan'`) dan svg non-`<svg>` (`redup`). `scripts/bench-frame.mjs` mengukur ms/frame +
  determinisme.
- **Dokumen**: resep ≤ 25 baris di `techniques.md` §7d (urutan panggilan, aturan yang dipanggang, anggaran partikel)
  dan satu contoh pemakaian di `kartun-panggung.md` kulit B.
- **Galeri README**: still pertama yang 100 % kode, `docs/gallery/13-cinematic-silhouette.jpg` (frame t = 0 dtk demo
  sinematik), di baris teratas galeri dan di `hero.jpg`. Di hero, still ini menggantikan sel kartun kolase; kartun
  kolase tetap ada di tabel galeri.
- **Anggaran konteks**: `context-budget.mjs` kini menghitung panjang tanpa CR (checkout Windows dengan
  `core.autocrlf` menambah satu karakter per baris: angka membengkak 1–3 KB per jalur, mis. panggung 165 → 163 KB,
  Opener 3D 241 → 239 KB). Batas dinaikkan: **Explainer kartun panggung 130 → 170 KB** (+40, perkakas: blok
  atmosfer/cahaya-2d/pasca di starter, 122,1 → 167,8 KB); **Explainer kolase (kartun) 170 → 175 KB** dan **Opener 3D
  240 → 245 KB** (+5 masing-masing untuk resep modul atmosfer/cahaya-2d/pasca di `techniques.md` §7d, +3,2 KB: 168,8 →
  172,0 dan 238,6 → 241,8 KB; kedua jalur itu wajib memuat resepnya). Batas jalur lain tetap.
- **Celah yang diketahui**: `starter-explainer.html` (38 → 107 KB: modul + demo) semula tidak termasuk jalur mana pun di
  `context-budget.mjs` — jalur "Explainer (kolase / aliran)" mengukur `starter-explainer-kartun.html`, jadi jalur aliran
  yang sebenarnya (SKILL.md + anti-ppt + explainer.md + techniques.md + `starter-explainer.html`, ±243 KB) tak terlihat
  alat (celah ditemukan di review akhir). Kini ada jalur **Explainer aliran (aksi kontinu)** dengan batas pelacak **245 KB**
  = ukuran sekarang (244,9 KB), bukan target; jalur kartun diganti nama **Explainer kolase (kartun)** (batas 175 KB tetap).
  Target sebenarnya = keputusan kebijakan pemilik.

## 1.2.0 — 2026-11-01

Fondasi arah sinematik (sub-proyek 1 dari `docs/peta-peningkatan-gaya-2026-11-01.md`): aturan tidak lagi
mendorong agen ke rupa flat, dan semua starter punya grain hidup.

- **Kartun panggung, Hukum 7 dipecah menjadi dua kulit** yang dipilih sadar di style brief: A flat cerah
  (aturan lama) dan B ilustrasi sinematik (cahaya bersumber, rim pada siluet, ≥ 3 bidang kabut, palet serempak,
  atmosfer bergerak, grain), dengan contoh gagal "malam + bara" yang keluar sebagai blok rata.
- **Kontradiksi diselaraskan**: flat sah hanya bila dipilih sadar di style brief (`SKILL.md`); "flat = PPT" di
  `techniques.md` dibatasi ke material 3D yang rata tanpa disengaja; rekomendasi gaya sejarah di `explainer.md`
  kini 6 kulit sinematik atau 5 (gaya 1–4 hanya bila gambar generate diizinkan); jalur video panjang per babak.
- **Shot mata elang** (`sinematografi.md` §3): satu-satunya pengecualian dari larangan roll/terbang lintas dunia
  — maksimal satu per bab, termotivasi, ≥ 3 dtk, mendarat di subjek. Ditunjuk dari `anti-ppt.md`,
  `techniques.md` §4b, dan `kartun-panggung.md`.
- **Grain hidup** (`src/runtime/grain.js`, `grainHidup(tl,{opacity,blend})`): lapisan butiran teratas di `#stage`,
  melompat 12×/dtk dari `tl.time()`. Dipasang di tujuh starter; panggung menyiapkan barisnya untuk kulit B. Grain
  statis 3D dan grain overlay jurnalisme diganti; grain kertas kolase tetap.
- **Aturan performa** (`architecture.md`): filter berat dipanggang, yang bergerak di lapisan `will-change` lewat
  transform/opacity; `WORKERS=2` untuk video panjang (terukur ±2× di laptop 2 core).

## 1.1.0 — 2026-10-23

Kamera sinematik 3D: inti kamera yang sama (`CAM`) kini punya backend Three.js, dipakai starter explainer 3D
baru dan opener.

- **Backend Three.js** (`src/runtime/kamera-three.js`, three r161): `shot()` membingkai permukaan depan subjek
  dari `Box3`, zona aman HUD 3D, `rail()` Catmull-Rom (≥ 3 titik, ujungnya menyambung tanpa lompatan), rig cahaya
  key/fill/rim dengan enam preset + `practical()`, `focus`/`rackFocus` lewat `BokehPass` (hidup hanya bila
  aperture > 0), `mat()` lima family dengan warna dari token CSS, `fromSVG()` (depth/bevel dalam unit dunia).
- **Starter explainer 3D** (`assets/starter-explainer-3d.html`): dunia Three.js, HUD di luar `#world`,
  `?demo=1` katalog kosakata, ekspor ≥ 3 frame/dtk di mesin acuan (`OPENER.syncSeek:true`, loop rAF hanya
  menggambar saat `tl.time()` berubah).
- **Opener memakai `CAM`** + `kamera-three` (`S.cam*` dihapus), `NoToneMapping` dan `light(0,0,'studio')`;
  `camThrough`/`breathe` tetap di rig DOM `#world`. Warna brand lewat composer + `OutputPass` hanya tepat dengan
  `NoToneMapping` (ACES menggeser `#EE1C25` ke 241,26,37) — kedua starter 3D memakainya.
- **`references/sinematografi.md`**: memilih dunia 2.5D/3D, kosakata shot/sudut/gerak/lensa/fokus/cahaya →
  panggilan, aturan 180°/30°/lead room/cahaya berpemicu, beda 2.5D vs 3D, resep, jebakan. SKILL.md: jalur baca
  baru, tiga baris kamera di style brief, satu butir checklist kamera. Eval brief `09-explainer-3d`.
- **Lint `gsap-relatif`** (WARN): nilai properti relatif (`'+=25'`) di tween bergantung jalur seek. Fixture lint
  (`lint-three-buruk.html`, `lint-relatif-buruk.html`) kini diuji di CI — lint yang berhenti menangkapnya membuat
  CI merah.
- **Uji browser**: hash kanvas sama di dua jalur seek, `seek(0)` pada halaman segar, kait `CAM3_UJI` (pose,
  bingkai, piksel warna brand, zona aman, cahaya, fokus, rail, `lowkey` terukur gelap). `test-starters` menguji
  delapan starter.
- **Perbaikan `seek(0)` (semua starter)**: di halaman segar `seek(0)` tidak menerapkan `tl.set` pada t = 0, sehingga
  frame pertama setiap ekspor MP4 berkedip satu frame ke pose awal.
- **Nilai absolut di starter**: `fly()` (aksi kontinu) dan `walk()` (panggung) tidak lagi memakai nilai relatif
  GSAP; `walk()` wajib dipanggil urut waktu.
- **Anggaran konteks**: batas jalur Opener 190 → 220 KB (+30: blok kamera bersama `kamera.js` + `kamera-three.js`
  di starter opener — perkakas, bukan aturan; jalur itu 184 → 210 KB). Jalur baru "Explainer 3D" (batas
  170 KB) dan "Opener 3D" (opener + `sinematografi.md`, batas 240 KB = 190 aturan opener + 30 blok kamera +
  ±21 `sinematografi.md`, bacaan wajib 3D). Batas jalur lain tetap.
- **Nilai relatif kamera**: `'-=x'` di `camTo`/`cutTo` kini mengurangi (sebelumnya terbaca `+x`); awalan selain
  `+=`, `-=`, `*=` melempar error.
- **`CAM.lantai`** (3D, opt-in, default `null`): kamera dijepit di `lantai + near·(1 + tan(½ fov vertikal))` (min. 0,05) setiap frame, sehingga lensa lebar (`worm`) tidak menyingkap latar di dasar frame — render, kamera
  bayangan zona aman, dan jarak `focus()`. `angle('low'|'worm')` sesudah WS tidak lagi menembus lantai (layar
  hitam). Starter 3D memasang `camDefaults({lantai:0})`; opener tanpa jepit.
- **Subjek 3D bersarang**: `shot`/`frame3d`, zona aman, dan `focus()` membaca kotak subjek di posisi dunia walau
  matriks induknya belum diperbarui render (sebelumnya: dibingkai di posisi lokal). Subjek berukuran 0 (skala 0
  dari `tl.from`) dan `rail()` dengan titik terakhir = `look` ditolak dengan pesan jelas.
- **`build-starters` di checkout CRLF**: penanda `<wv:NAME>` menerima CRLF dan isi mengikuti akhir baris
  starter; blok yang penandanya ada tetapi tidak terbaca menggagalkan build (sebelumnya dilewati diam-diam,
  `--check` hijau palsu).

## 1.0.0 — 2026-10-22

Rilis pertama WeVai: agent skill yang mengubah agen AI menjadi motion designer — opener, promo, bumper,
kinetic typography, dan enam gaya explainer, dibangun sebagai satu `index.html` yang bergerak seperti video,
bukan slide.

- **Hukum dan menu.** Larangan struktural anti-PPT yang bisa diperiksa dari kode, style brief wajib, 19
  konsep opener, 10 arah gaya, menu transisi, gerak latar, permukaan latar, dan gaya render objek.
- **Tujuh starter.** Opener (Three.js ber-state) dan enam explainer: kartun kolase, jurnalisme visual,
  katalog putih, sketsa vintage, aksi kontinu, kartun panggung. Semua autoplay + loop tanpa player,
  `?debug=1` untuk scrub, deterministik penuh.
- **Kamera bersama** (`src/runtime/kamera.js` + `kamera-dom.js`): ukuran shot (ECU–EWS), sudut kamera,
  gerak (dolly, truck, pedestal, pan, tilt, crane, arc, whip pan, handheld ber-seed), lensa dan dolly zoom,
  bidang paralaks `[data-z]` dengan rack focus, enam preset cahaya, zona aman HUD, aturan 180°/30°.
  Katalog: buka starter explainer dengan `?demo=1`.
- **Alat kerja.** `snap.mjs` (lembar kontak detik kunci), `export-frames.mjs` (MP4 frame demi frame,
  JPEG q80, worker paralel), `lint-motion.mjs` (larangan struktural + determinisme, termasuk
  `THREE.Clock` dan `composer.render()` tanpa argumen), `vendor-libs.mjs` (arsip offline),
  `cdn-integrity.mjs` (SRI), bridge After Effects.
- **Penjaga kualitas.** CI menjalankan uji inti kamera, sinkron runtime ↔ starter, versi seragam, anggaran
  konteks per jalur baca, lint, SRI, dan uji browser tujuh starter.
