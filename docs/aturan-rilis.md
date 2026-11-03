# Aturan rilis WeVai

Berlaku sejak 3 Nov 2026. Satu nomor versi berlaku untuk seluruh skill: `SKILL.md`, semua starter, dan plugin.
Pemilik memutuskan kapan sesuatu di-push atau dirilis. Agen hanya menyiapkan.

## 1. Nomor versi (SemVer)

- **MAYOR** (2.0.0) dipakai bila perubahan memutus pemakaian lama. Contohnya:
  - kontrak `window.OPENER` berubah;
  - argumen atau keluaran skrip (`snap`, `export-frames`, `test-starters`) berubah;
  - starter atau gaya dihapus atau diganti nama;
  - aturan dihapus atau dibalik sehingga hasil yang dulu sah kini ditolak.

  Menata ulang isi `SKILL.md` ke `references/` tanpa mengubah aturan bukan MAYOR, melainkan PATCH (atau MINOR bila
  sekalian menambah kemampuan).
- **MINOR** (1.4.0) dipakai untuk kemampuan baru: gaya, starter, atau modul runtime baru; dukungan agen baru;
  aturan baru di `references/`.
- **PATCH** (1.3.1) dipakai untuk perbaikan bug, penyelarasan dokumen, atau angka/ambang, tanpa kemampuan baru.
- Hasil yang sudah bisa dipakai segera dirilis sebagai MINOR; jangan menunggu satu sub-proyek peta selesai
  seluruhnya. Jangan menumpuk beberapa versi yang belum di-push.
- Angka versi hanya diubah lewat `node scripts/bump-version.mjs X.Y.Z`. Skrip itu menulis `SKILL.md` (2 tempat),
  badge README, `plugin.json`, `marketplace.json`, dan baris "Made with" di setiap starter.

## 2. CHANGELOG

- Perubahan dicatat sambil dikerjakan, di bagian `## Belum dirilis` paling atas.
- Saat rilis, judul itu diganti menjadi `## X.Y.Z — YYYY-MM-DD`.
- Isi wajib, bila relevan:
  - berkas yang berubah;
  - angka biaya sebelum → sesudah (ms/frame di mesin acuan, KB per jalur anggaran);
  - keputusan beserta alasannya;
  - **Celah yang diketahui**;
  - **Status penerimaan**, yaitu vonis visual pemilik untuk sub-proyek yang bergerbang visual.

## 3. Gerbang rilis

Semua gerbang harus hijau pada commit yang akan di-tag, dengan pohon kerja bersih.
`node scripts/rilis.mjs` menjalankan semua gerbang ini, sama dengan CI (`.github/workflows/ci.yml`):

1. sintaks semua skrip (`node --check`);
2. `test-kamera`, `test-vo`, `test-nilai`, `test-pustaka`, `test-elang`, `test-relief`, `test-tokoh`, `test-wayang`, dan `test-ekspor` (node:test, tanpa browser dan tanpa jaringan);
3. `build-starters --check`: starter sinkron dengan `src/runtime`;
4. `bump-version --check`: versi seragam dan CHANGELOG punya judulnya;
5. `context-budget --check`;
6. `lint-motion` atas semua starter, plus fixture yang wajib gagal;
7. `cdn-integrity --check`: SRI library CDN masih cocok;
8. `test-starters` atas semua starter.

Untuk perubahan rupa atau performa, ada pemeriksaan tambahan yang dilakukan manusia dan dicatat di CHANGELOG:

- Bukti disimpan di `evals/bukti/<tanggal>-<topik>/` (lembar kontak dan angka bench).
- Bench harus ≤ 350 ms/frame di mesin acuan **saat menganggur**. Angka yang diambil saat render berjalan hanya
  berlaku sebagai batas atas.
- Starter yang tidak sengaja disentuh harus tetap identik (PNG atau keadaan) dengan rilis sebelumnya.
- Vonis visual pemilik. Tanpa vonis, rilis tetap boleh dengan "Status penerimaan: menunggu", tetapi sub-proyeknya
  belum ditandai selesai di peta.

Kalau mesin sedang merender, jalankan `node scripts/rilis.mjs --tanpa-browser`, lalu jalankan `test-starters`
terpisah dengan prioritas rendah sebelum membuat tag:
`cmd /c "start /low /b /wait node scripts/test-starters.mjs"`.

## 4. Alur

1. Kerjakan di branch `feat/…`, `fix/…`, atau `docs/…` yang dibuat dari `main`, satu topik per branch.
2. Gabungkan ke `main` lewat PR GitHub (CI berjalan di PR), atau dengan fast-forward lokal sesudah
   `node scripts/rilis.mjs` hijau.
3. Di `main` yang bersih, jalankan `node scripts/rilis.mjs X.Y.Z`. Skrip ini:
   - menjalankan semua gerbang;
   - mengganti `## Belum dirilis` menjadi `## X.Y.Z — tanggal`;
   - menjalankan `bump-version`;
   - menulis catatan rilis ke folder sementara;
   - mencetak perintah berikutnya.

   Skrip ini tidak membuat commit, tag, atau push.
4. Commit rilis hanya berisi bump dan CHANGELOG, dengan pesan `rilis X.Y.Z`.
5. Buat tag beranotasi: `git tag -a vX.Y.Z -m "WeVai X.Y.Z"`.
6. **Push hanya dengan persetujuan pemilik:** `git push origin main --follow-tags`.
7. CI GitHub harus hijau. Kalau merah, perbaiki lewat rilis PATCH. Tag yang sudah di-push tidak digeser.
8. Buat GitHub Release:
   `gh release create vX.Y.Z --title "WeVai X.Y.Z" --notes-file <catatan dari langkah 3>`.
9. Periksa pemasangan dari GitHub di setiap agen yang didukung:
   - Claude Code: `/plugin marketplace update`, lalu pasang ulang.
   - Agen lain: lihat README › Install.

## 5. Larangan

- Merilis dengan satu gerbang merah, atau dari pohon kerja yang kotor.
- Mengubah angka versi dengan tangan.
- Menggeser atau menghapus tag yang sudah di-push, atau melakukan force-push ke `main`.
- Ikut meng-commit berkas lokal: `Jadwal_*.xlsx` (sudah diabaikan lewat `.git/info/exclude`), hasil render, atau
  path folder sementara (`AppData`, id sesi).
- Agen melakukan push, membuat tag yang di-push, atau membuat GitHub Release tanpa izin pemilik.

## 6. Keadaan saat aturan ini dibuat (3 Nov 2026)

- Tag yang sudah ada: `v1.0.0` dan `v1.1.0`.
- 1.2.0 (`7fa0791`) dan 1.3.0 (sampai `0748e0b`) sudah ada di `main` lokal, tetapi belum di-tag dan belum di-push.
- Penyesuaian: buat tag `v1.2.0` di `7fa0791` dan `v1.3.0` di `0748e0b` (commit galeri, isi terakhir 1.3.0). Push
  setelah pemilik setuju, lalu buat Release untuk keduanya. Semua perubahan sesudah `0748e0b` masuk
  `## Belum dirilis` untuk 1.4.0.
