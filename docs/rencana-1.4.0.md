# Rencana rilis 1.4.0

Isi 1.4.0 ditetapkan pemilik pada 3 Nov 2026. Isinya: starter sinematik, aturan rilis, dukungan Antigravity, alat VO,
tokoh v2, mata elang 3D, ekspor panjang, gaya lanjutan, serta penilaian + galeri. Artinya seluruh peta
`docs/peta-peningkatan-gaya-2026-11-01.md` §8 diselesaikan sebelum 1.4.0 terbit.

Sumber rincian:
- peta §5 (P2), §6 (gaya baru), §7 (ekspor);
- `docs/audit-gaya-bawaan-2026-11-01.md`;
- `docs/riset-sinematik-kode-2026-11-01.md`.

## Status

| # | Bagian | Status | Commit / branch |
|---|---|---|---|
| A | Starter siluet sinematik (sub-proyek 3, langkah 1) | selesai | 55ffc71..7e1f814 |
| B | Aturan rilis (`docs/aturan-rilis.md`, `scripts/rilis.mjs`) | selesai | 6ab34c8 |
| C | Dukungan Antigravity: Chrome otomatis, `--help`, `SKILL.md` ≤ 24 KB, plugin | kode selesai; uji pemilik menunggu | f414a57, dfedd42, d80eb56 |
| D | Alat VO Gemini (hingga 10 kunci, failover aman) | kode selesai; uji langsung pemilik menunggu | 73eb11f |
| E | Sub-proyek 3, sisa: babak multi-adegan 60 dtk + `CAM` di kartun panggung | babak: kode selesai, vonis pemilik menunggu (`starter-babak.html`, keputusan pemilik 4 Nov); `CAM` panggung belum | babak: fa45908..cac5ded |
| F | Sub-proyek 4a: pustaka aset prosedural Jawa kuno | kode selesai; vonis visual pemilik menunggu | 31172c7..0f1bef0 |
| G | Sub-proyek 4b: rig tokoh v2 | kode selesai; bench katalog 437 ms MELEWATI 350 (6 tokoh detail 2): optimalkan atau batasi; vonis visual pemilik menunggu | 5c9a3b1..ca20078 |
| H | Sub-proyek 5: mata elang 3D | kode selesai; bench 292 ms (segmen motion blur belum); vonis visual pemilik menunggu | 93e1629..087736e |
| I | Sub-proyek 6: ekspor panjang | selesai (masuk `main` 3 Nov dengan izin pemilik); 2 worker 1,2–1,5× di halaman nyata 1080p, frame identik 98–99 %, sisanya ±1 level | 429c64f..7310d5a |
| J | Sub-proyek 7: gaya lanjutan | relief candi (233 ms), painterly (219 ms), peta relief 3D (288 ms), wayang kulit (234/293 ms), diorama (240 ms): kode selesai, vonis pemilik menunggu (wayang: + tinjauan pakem; diorama: + tinjauan arsitektur pura) | relief: bfdac93..811ddca; painterly: 1f6d91f..d71c88c; peta: 40fa38f..f13d624; wayang: 611bbcf..e0e805f; diorama: 82bee1e..e2d8b8f |
| K | Sub-proyek 8: penilaian visual otomatis + galeri | K1 selesai; K2 galeri belum | K1: a3486a1..f114d7d |
| L | Rilis 1.4.0 | belum | |

Rilis 1.4.0 (L) mencakup:
- tag `v1.2.0` di 7fa0791 dan `v1.3.0` di 0748e0b;
- `rilis.mjs 1.4.0`;
- push, hanya dengan izin pemilik.

## Urutan

| Gelombang | Bagian | Catatan |
|---|---|---|
| 1 | I, K1 (penilaian otomatis), F | paralel; tidak saling bergantung |
| 2 | G, H | G memakai `kain({motif})` dari F |
| 3 | E | memakai F + G; K1 menilai hasilnya |
| 4 | J | wayang memakai G; relief candi memakai F; diorama dan peta relief memakai H (3D) |
| 5 | K2 (galeri), L | |

## Kriteria terima

### E. Babak multi-adegan + `CAM` panggung

- Satu babak 60 dtk bergaya patokan di `starter-babak.html` (keputusan pemilik 4 Nov: `starter-sinematik.html` tetap satu adegan), berisi beberapa adegan dan transisi.
- `langit()` dipanggil sekali; tiap adegan memakai tween `LANGIT` dan `grade()` sendiri.
- Adegan yang tersembunyi tidak menggambar apa pun.
- Biaya ≤ 350 ms/frame.
- Kait uji modul tahan terhadap halaman yang sudah terisi, sehingga `?kosong=1` tidak lagi dibutuhkan.
- Kartun panggung memakai `CAM` (kamera 2.5D).
- Shot mata elang brief 10 memakai `terbang()` 2.5D: penanda `<wv:terbang>` dipasang sesudah `kamera-dom` di `starter-babak.html`.
- Tokoh babak memakai `tokoh.*` (rig v2): blok `<wv:tokoh>` dipasang di `starter-babak.html` sesudah `pustaka`.
- Selisih latar sesudah lompat mundur ke tableau yang tampil sejak halaman dimuat (`katalog-pustaka` maks. 76, `katalog-tokoh`
  maks. 84) ditelusuri: selesai, akarnya raster lapisan `will-change` saat dibuat. Babak `WORKERS=1` vs `2`: 1678/1800 frame identik, sisanya
  PSNR ≥ 64,9 dB (bukan identik penuh; tak terlihat).
- Tindak lanjut: selisih ±3 di t 27,5 (penyebab belum terbukti); `tokoh.*` melewati batas pada 6 tokoh detail 2; vonis pemilik atas penjaga rig v2 yang tanpa zirah.

### F. Pustaka aset Jawa kuno (`src/runtime/pustaka.js`, blok `<wv:pustaka>`; `build-starters` hanya membaca `src/runtime`)

- Isi: `candi`, `gapura` (bentar + paduraksa), `rumahPanggung`, `beringin`, `lontar`, `gunungBerlapis`,
  `sawahTerasering`, `obor`/`api`/`asap`, `relief`, `kain({motif})`.
- Semuanya ber-seed, berparameter, dan menerima arah cahaya serta jarak.
- Hasilnya deterministik: seed yang sama menghasilkan keluaran yang sama.
- Ada katalog demo dan lembar kontak.
- Adegan gapura `starter-sinematik.html` tidak diubah, karena vonis f_7 masih menunggu.

### G. Rig tokoh v2

- Bagian tubuh berbentuk bezier, bukan kapsul.
- Rig tulang + slot + IK dua tulang + pustaka pose bernama.
- Tiga arah pandang; siluet ber-rim.
- Kostum dan atribut Jawa kuno sebagai komponen.
- Generator kerumunan ber-seed.
- Hasil yang harus terlihat: tokoh yang bukan manekin.

### H. Mata elang 3D

- Tone mapping film untuk konten sejarah, menggantikan `NoToneMapping`.
- Lanskap prosedural: terrain fBm, InstancedMesh, Sky, dan kabut (sawah, sungai, gunung, hutan).
- Preset terbang:
  - jalur Catmull-Rom dengan look-ahead;
  - roll dari kelengkungan, tan φ = vω/g, di-clamp;
  - shake berbasis trauma.
- `terbang()` 2.5D lewat `[data-z]`.
- Motion blur hanya lewat akumulasi sub-frame, dan hanya di segmen cepat.
- Hasil: shot pembuka 8–12 dtk di atas sawah → menembus gapura → reveal gunung.
- three tetap r161 kecuali ada alasan terukur untuk naik versi.
- Tindak lanjut sesudah masuk `main`:
  - bench di mesin senggang: `bench-frame.mjs assets/starter-elang.html "clean=1" 20`, ditambah satu run yang mulai di segmen motion blur;
  - sawah lembah dekat kotak-kotak pada grid kasar;
  - vonis visual pemilik.

### I. Ekspor panjang

- `WORKERS=2` menjadi standar, dengan bukti bahwa frame identik dengan `WORKERS=1`.
- Antrean render umum, generalisasi dari `alat/antre-render.sh` milik pemilik:
  - daftar babak + penanda siap;
  - resume per babak;
  - log fps dan perkiraan selesai;
  - gabung akhir;
  - penahan sleep bawaan (Windows `SetThreadExecutionState`, macOS `caffeinate`, Linux `systemd-inhibit`), tanpa
    mengubah setelan daya.
- Mode WebCodecs `prefer-software` untuk halaman 100 % kanvas, berstatus eksperimental.
- Hasil: video 45 menit dirender semalam.

### J. Gaya lanjutan

- **Wayang kulit** sebagai gaya penuh yang hormat pakem: bentuk tokoh, warna, gunungan, kelir + blencong yang berkedip, dan
  blur menurut jarak ke kelir.
- **Relief candi hidup.**
- **Peta relief 3D topografi.**
- **Painterly** (Kuwahara / cat air), tanpa sapuan yang "mendidih".
- **Diorama cel-shaded**: toon + outline + tilt-shift, kartu 2D di ruang 3D.
- Setiap gaya punya starter atau kulit, dokumen, dan lembar kontak.
- Tindak lanjut relief candi sesudah masuk `main`:
  - bench di mesin senggang: `bench-frame.mjs assets/starter-relief.html "clean=1" 20`, ≥ 3 run bergantian; ukur juga setup;
  - vonis pemilik, termasuk legenda "BOROBUDUR · ABAD IX" di atas panel rekaan (perlu penanda ilustrasi atau tidak).
- Tindak lanjut painterly sesudah masuk `main`: bench di mesin senggang (`bench-frame.mjs assets/starter-lukis.html "clean=1" 20`);
  vonis pemilik. Agen pembuatnya macet sesudah bukti di-commit, jadi gerbang dan uji penggabungan dijalankan controller.
- Tindak lanjut peta relief 3D sesudah masuk `main`: bench (`bench-frame.mjs assets/starter-peta-relief.html "clean=1" 20`); sungai
  skematis (vektor asli butuh cek lisensi); label tanpa oklusi; kerucut gunung seragam dan lembah polos; vonis pemilik.

### K. Penilaian visual + galeri

- K1, skrip penilaian otomatis, mengukur:
  - histogram luminans;
  - kontras subjek/latar;
  - titik terang dekat sumber cahaya;
  - jumlah warna dominan.
- K1 juga menambah eval brief "babak sejarah 60 dtk, malam + obor, satu tokoh, satu shot mata elang".
- K2, galeri: satu still untuk setiap gaya baru.
- Rekomendasi "sejarah → 4 atau 1" dibuat bersyarat pada izin raster (P0-2).

### L. Rilis

- Semua gerbang hijau, termasuk `test-starters` atas semua starter.
- Vonis visual pemilik untuk setiap gaya.
- Tag, lalu push dengan izin pemilik, lalu GitHub Release.
- Uji pemasangan Antigravity dari GitHub.

## Aturan kerja

- **`E:\mila\wevai` tetap di `main`**, karena antrean render pemilik menjalankan skrip dari situ. Pengembangan dilakukan di
  worktree `E:\mila\wevai-<topik>` (branch `feat/<topik>`). Worktree diberi junction `scripts\node_modules` ke
  `E:\mila\wevai\scripts\node_modules`.
- **Uji browser** hanya lewat pembungkus berprioritas Idle yang memegang kunci Chrome bersama (satu uji Chrome pada satu waktu).
- **Bench** tidak dijalankan selama render pemilik berjalan; dicatat sebagai tindak lanjut.
- **Masuk `main`**: gerbang hijau + review, lalu merge. Catatan masuk CHANGELOG di `## Belum dirilis`.
- **Vonis visual pemilik** dikumpulkan per gaya, dari lembar kontak di `evals/bukti/<tanggal>-<topik>/`.
