# Roadmap — dokumen pengembangan skill ini

Ditulis supaya siapa pun (manusia atau AI) yang membuka skill ini nanti
tahu dari mana ia berasal, apa yang sudah terbukti, dan ke mana arah
penyempurnaannya.

## Prinsip penyusunan

Hukum-hukum di `anti-ppt.md` dan resep di `techniques.md` berangkat dari satu
masalah: hasil yang terasa seperti presentasi. Prinsip penyusunannya:
**yang masuk ke skill hanyalah pelajaran yang digeneralisasi** — bukan
warna, brand, atau kalimat spesifik proyek asalnya.

## Yang sudah terbukti (jangan mundur dari sini)

- Hukum satu-kalimat-satu-objek per adegan
- Rig kamera `#world` (latar ikut ter-zoom); push-through hanya bila termotivasi
- Pan 3D per kata sebagai efek istimewa yang dijatah
- Motion blur berarah via SVG filter
- Determinisme penuh → scrub akurat + export frame-by-frame
- Verifikasi visual dengan scrub-screenshot sebelum menyerahkan
- Interogasi sumber brand asli (vector logo, token warna, klaim fitur)

## Arah pengembangan (urut prioritas kasar)

1. **Audio nyata.** Saat ini spektrum/beat prosedural (sinus + BPM konstan).
   Tambah jalur: muat file audio → precompute FFT per frame (offline, sekali)
   → simpan JSON → playback deterministik tetap terjaga. JANGAN analisis
   real-time di render loop — itu membunuh determinisme dan export.
2. **Perpustakaan transisi.** Baru ada push-through, pan 3D, light leak.
   Kandidat: whip-pan horizontal, roll (rotasi rig), rack-focus (blur
   bertukar antara dua layer), match-cut bentuk (lingkaran spektrum → ikon
   bulat), zoom-through huruf O/lubang logo.
3. **Menu konsep, bukan template rundown.** Template rundown per genre
   (mis. hook→fitur→fitur→janji→logo→CTA) cenderung membuat semua opener
   berkerangka sama. Yang dikembangkan adalah menu di
   `opener-konsep.md`: tambahkan konsep baru dari proyek yang diterima,
   jangan menambah urutan baku.
4. **Starter multi-file.** `assets/starter-opener.html` sengaja satu berkas agar
   mudah disalin; sediakan juga versi terpecah (struktur di
   `architecture.md`) begitu ekosistem skill mendukung folder template.
5. **Ekspor lebih mulus.** Alternatif puppeteer: `MediaRecorder` +
   `canvas.captureStream` (cepat, kualitas lebih rendah), atau WebCodecs
   `VideoEncoder` (terbaik, butuh kode lebih). Juga preset ffmpeg untuk
   vertikal 1080×1920 (ganti konstanta stage → semua resep tetap jalan).
6. **Contact sheet otomatis.** `snap.mjs` memotret detik kunci dan `lint-motion.mjs`
   memeriksa yang mekanis; yang belum: menyusun potongan itu jadi satu lembar kontak
   siap nilai tanpa ffmpeg/PIL.
7. **Kalibrasi selera lanjut.** Kumpulkan lebih banyak pasangan
   gagal→berhasil dari proyek berikutnya ke tabel di `anti-ppt.md`.
   Tabel itu adalah aset paling berharga skill ini.
8. **Kamera sinematik, lanjutan.** Inti `kamera.js` dan backend 2.5D `kamera-dom.js` sudah satu sumber untuk lima
   starter explainer (shot, sudut, gerak, lensa, cahaya, zona aman HUD). Yang belum: backend Three.js
   (`kamera-three.js`), starter explainer 3D, opener memakai `CAM`, dan `references/sinematografi.md` —
   spec di `docs/superpowers/specs/2026-10-03-kamera-sinematik-3d-design.md`. Sistem panggung tetap rig sendiri.
9. **Eval regresi, lanjutan.** Kerangka dan laporan pertama sudah ada (1 dari 8 brief,
   `evals/laporan-2026-09-20.md`). Yang belum: menjalankan tujuh brief sisanya di sesi
   baru sebagai baseline sungguhan, lalu membandingkan skor antar rilis.


## Keputusan yang sudah diambil

- **Bahasa sumber: Indonesia** (2026-09-19). `SKILL.md` dan `references/` ditulis dalam
  bahasa Indonesia dan itulah sumber kebenarannya; README serta daftar marketplace dalam
  bahasa Inggris sebagai etalase. Alasannya: penulis dan pemakai utamanya berbahasa
  Indonesia, dan menerjemahkan ±230 KB aturan berisiko menggeser makna istilah khas
  ("kantong teks", "tanda tangan gerak", "sidik jari struktur"). Konsekuensinya diterima:
  kontributor internasional terbatas pada kode dan alat.

## Antipola yang menggoda tapi jangan

- **Menjadikan starter berisi konten contoh yang terlalu jadi** — model akan
  menyalin gayanya mentah-mentah. Starter harus polos secara konten — dan
  polos secara URUTAN: tanpa adegan contoh yang bisa ditiru kerangkanya.
- **Satu jawaban benar per kegagalan.** Tabel gagal → berhasil yang hanya
  berisi satu perbaikan menjadi template baru. Tulis perbaikan sebagai menu
  (lihat `opener-konsep.md`).
- **Menambah efek demi efek.** Setiap efek baru harus lulus tes: apakah ia
  gerakan kamera / pengungkapan makna, atau cuma gimmick? Gimmick menua
  dalam hitungan bulan.
- **Menulis MUST/JANGAN tanpa alasan.** Format skill ini: aturan + kenapa +
  contoh kegagalannya. Aturan tanpa cerita akan dilanggar oleh model berikutnya.
- **Mengunci ke satu library.** GSAP + Three.js adalah pilihan default,
  bukan identitas. Prinsipnya (kamera, determinisme, anti-PPT) berlaku juga
  untuk Remotion, Motion One, atau canvas murni.

## Cara memakai skill ini di AI lain

Folder ini portabel: `SKILL.md` + `references/` + `assets/` + `scripts/`
hanyalah markdown, HTML, dan skrip. Untuk AI tanpa sistem skill:
tempelkan isi `SKILL.md` sebagai instruksi, lampirkan `anti-ppt.md` +
`techniques.md` saat sesi desain, `architecture.md` saat sesi coding,
dan berikan `starter-opener.html` sebagai titik awal kode.


## Sudah dikerjakan

- Explainer: enam gaya, masing-masing dengan starter (`assets/starter-explainer*.html`),
  default 16:9 — `references/explainer.md`, `references/kartun-panggung.md`.
- Deliverable satu berkas tanpa server; `seek()` sinkron; angka tabular.
- Verifikasi detik kunci (`scripts/snap.mjs`), export MP4 16:9/9:16 dengan audio VO
  (`scripts/export-frames.mjs`), video sebagai layer footage (`clip()`).
- Loop dari jam (bukan `onComplete`) dan PRNG ber-seed di semua starter.
- Konteks dipecah per jalur baca ("Peta baca" di SKILL.md), checklist khusus pindah ke
  dokumen jalurnya, tabel arah gaya ke `techniques.md` §7f, alat kerja ke `alat-kerja.md`,
  dan `scripts/context-budget.mjs` menjaga anggarannya di CI.
- Aset lewat MCP ditulis sebagai KEMAMPUAN (gambar/video/hapus latar), vendor hanya contoh.
- Arsip mandiri: `scripts/vendor-libs.mjs` menanam GSAP + font ke dalam berkas.
- Lembar kontak otomatis dari `snap.mjs`, SRI untuk library CDN (`scripts/cdn-integrity.mjs`),
  dan runtime bersama diperluas ke blur/kamera/seek.
- Lint mekanis (`scripts/lint-motion.mjs`), runtime bersama + build (`src/runtime/`,
  `scripts/build-starters.mjs`), uji asap browser (`scripts/test-starters.mjs`),
  penyeragam versi (`scripts/bump-version.mjs`), dan CI yang menjalankan semuanya.
- Kamera bersama: `src/runtime/kamera.js` + `kamera-dom.js` menggantikan `kamera-kolase.js` (transform starter
  identik), uji inti `scripts/test-kamera.mjs`, lint `determinisme-clock` / `composer-render-jam`.
