# Changelog

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
