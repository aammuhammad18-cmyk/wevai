# Changelog

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
