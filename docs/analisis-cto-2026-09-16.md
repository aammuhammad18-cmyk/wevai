# Analisis CTO — WeVai v1.19.0

> Dokumen sejarah, ditulis sebelum rilis WeVai 1.0.0. Nomor versi 1.x, nama branch, dan hash commit di
> bawah merujuk ke riwayat pengembangan sebelumnya yang tidak dibawa ke repo ini.

Tanggal: 2026-09-16 · Cakupan: seluruh repo (SKILL.md, 8 referensi, 7 starter, 9 skrip, manifest plugin) ·
Tindak lanjut P0: branch `fix/p0-audit` → v1.19.1.

> Nomor baris di bagian 3, 6, dan 7 merujuk ke **v1.19.0** (commit `c1aa65e`), versi yang diaudit.

## 1. Ringkasan

WeVai bukan aplikasi, melainkan *agent skill* (juga plugin Claude Code) yang mengubah agen AI
menjadi motion designer. Produknya tiga lapis: **instruksi** (±220 KB markdown berisi hukum, menu,
dan checklist), **7 starter HTML** (GSAP/Three.js, rig kamera), dan **alat kerja** (snap, export
MP4, deteksi jeda VO, bridge After Effects).

**Penilaian:** tesis produk kuat dan inti teknisnya matang. Masalahnya ada pada proses rilis tanpa
pengaman, sehingga dokumen mulai saling bertentangan dan beberapa janji produk tidak benar di kode.

**Tiga risiko teratas:**
1. Loop autoplay rusak di 6 dari 7 starter (terverifikasi di Chrome).
2. Aturan terus bertambah tanpa alat pemeriksa: 12 kontradiksi antar dokumen, beban konteks
   ±45–50 ribu token sebelum agen menulis kode.
3. Panduan yang berisiko hukum: foto dari artikel/meme, relay frame lewat pihak ketiga.

## 2. Kekuatan (pertahankan)

- **Tesis jelas dan bisa diuji.** "Video, bukan slide" diterjemahkan menjadi larangan yang bisa
  diperiksa dari kode, dengan format aturan + alasan + contoh kegagalan.
- **Arsitektur waktu benar.** `tl.time()` satu-satunya jam; kontrak `window.OPENER`
  (`seek`, `seekFrame`, `clipsReady`) membuat scrub, snapshot, dan export frame-by-frame konsisten.
  Sinkronisasi klip video ke timeline dirancang dengan baik.
- **Deliverable tanpa instalasi.** Satu `index.html` yang jalan lewat `file://`.
- **Mekanisme anti-template.** Tiga kandidat konsep + sidik jari struktur mencegah semua hasil seragam.
- **Tabel jebakan bernilai tinggi.** `transformOrigin` SVG ikut bbox, atribut `visibility` anak SVG,
  `suppressEvents` saat scrub — pelajaran nyata.

## 3. Bug terverifikasi (P0)

| # | Temuan | Bukti (v1.19.0) | Dampak | Status v1.19.1 |
|---|---|---|---|---|
| B1 | Tween `repeat:-1` di dalam timeline membuat `tl.duration()` = 10.000.000.000 dtk, jadi `onComplete → start()` tidak pernah terpicu | `starter-explainer-kartun.html:102` (`float` default `true`), `-panggung.html:95-99`, `starter-explainer.html:132`, juga `-jurnalisme`, `-katalog`, `-sketsa`. Diuji di Chrome: 6 starter lama tidak loop | Janji "autoplay + loop" salah untuk semua explainer; setelah DUR video tidak kembali ke awal | **Selesai.** Loop dari jam (`tl.time() >= DUR` di ticker) di 7 starter; diuji ulang: semua loop |
| B2 | `export-frames.mjs` mengunci viewport dan clip 1920×1080 | `export-frames.mjs:32,57` | Export 9:16 salah potong | **Selesai.** Ukuran dari `OPENER.W/H`; diuji: frame 1080×1920 |
| B3 | Export default butuh server + petunjuk `python -m http.server` | `export-frames.mjs:10,20` vs `architecture.md:119-123` | Tidak konsisten dengan `snap.mjs` dan prinsip `file://` | **Selesai.** Default `file://<cwd>/index.html?clean=1` |
| B4 | Export tanpa audio, tidak ada perintah ffmpeg untuk VO | `architecture.md:142` | MP4 explainer ber-VO keluar bisu | **Selesai.** Skrip mencetak perintah ffmpeg yang ikut menggabungkan `#vo`; dokumen diperbarui |
| B5 | "`npm i puppeteer` di folder mana pun, jalankan dari sana" tidak bisa jalan: Node ESM mencari paket dari lokasi skrip | `snap.mjs:12-16`; diuji: `ERR_MODULE_NOT_FOUND` | Modul tidak ketemu, atau `index.html` tidak ketemu | **Selesai.** Satu `scripts/package.json`; petunjuk: `npm install` di `scripts/`, jalankan dari folder proyek; diuji |
| B6 | `Math.random()` di setup opener | `starter-opener.html:223-224` | Tata letak berubah tiap muat; diuji: dua render berbeda | **Selesai.** PRNG ber-seed (mulberry32); diuji: dua render identik |
| B7 | `aset-svg.py` menulis ke folder instalasi skill | `aset-svg.py:11-12,88` | Folder plugin tercemar, output hilang saat update | **Selesai.** Keluaran ke cwd (atau argumen); `.gitignore` ditambahkan |

## 4. Utang arsitektur

- **Runtime disalin tempel ke 7 berkas dan mulai berbeda.** Blok FOOTAGE identik di 7 starter,
  kontrol/debug di 6, `blurTween` diduplikasi. `seek` sudah punya tiga variasi (opener:
  `tl.time` + `ticker.tick` + `render`; aksi kontinu: `pause(t,false)` tanpa tick; kolase:
  `pause` + `applyCam` + tick). **Solusi:** `src/runtime/*.js` sebagai satu sumber, skrip build
  yang menyisipkan ke starter di antara penanda, CI memeriksa hasil build = yang di-commit.
  *Status: sebagian selesai di v1.20.0 — blok footage dan panel debug kini bersumber dari
  `src/runtime/` dan dijaga `build-starters.mjs --check` di CI; `seek`, `blurTween`, dan helper
  kamera masih disalin per starter.*
- **Bergantung pada CDN tanpa opsi arsip.** Dua CDN (jsDelivr, cdnjs), tanpa SRI. Sediakan opsi
  build yang menyertakan GSAP/Three di dalam berkas. *Status: belum (P2).*
- **Sisa proyek lama.** `rig-tokoh.py` terkunci pada tokoh "manusia gua"; `aset-svg.py` berisi
  contoh api unggun. Melanggar prinsip roadmap "hanya pelajaran yang digeneralisasi".
  *Status: `rig-tokoh.py` digeneralisasi di v1.20.0 (varian `tokoh1..4`, warna placeholder netral);
  contoh panggung di `aset-svg.py` tetap ada sebagai contoh yang ditandai.*
- **Contoh starter kolase:** kata sorotan berteks putih tampil sebelum pill-nya tergambar, sehingga
  sesaat hampir tak terbaca di atas kertas krem; masalah yang sama, terbalik, ada di jurnalisme
  visual (teks `#111` di latar hitam). *Status: selesai di v1.20.0 — warna teks berganti bersama
  pill/highlighter; diverifikasi lewat snapshot sebelum dan sesudah.*

## 5. Masalah strategis: skill tumbuh dengan terus menambah aturan

- Jalur opener mengharuskan agen membaca SKILL.md (40 KB) + anti-ppt + opener-konsep (59 KB) +
  techniques (46 KB) + architecture ≈ 160 KB sebelum koding, ditambah checklist 40+ butir.
  Makin panjang, kepatuhan model makin turun.
- Setiap versi menambah aturan tanpa merapikan yang lama (bukti: bagian 6).
- Skill berkata "cek KODE, bukan perasaan", tetapi alat pengeceknya tidak ada.

**Rekomendasi berdampak terbesar:** `scripts/lint-motion.mjs` yang memeriksa `index.html` secara
mekanis — jumlah `<section>`, `Math.random`/`Date.now`, font < 30 px, `repeat:-1` tanpa loop dari
jam, `<video autoplay>`, `transformOrigin` pada sendi. Setelah itu pecah SKILL.md menjadi router
pendek (< 10 KB) + playbook per jenis pekerjaan dengan batas token per jalur.
*Status: `scripts/lint-motion.mjs` selesai di v1.20.0 dan dipanggil di alur kerja SKILL.md
langkah 5 serta checklist; pemecahan SKILL.md menjadi router + playbook masih P2.*

## 6. Kontradiksi antar dokumen

| Topik | Pernyataan A | Pernyataan B | Keputusan v1.19.1 |
|---|---|---|---|
| Transisi | SKILL.md:222 "bukan wajib dua jenis atau wajib 3D" | techniques.md:308, starter-opener.html:26, anti-ppt.md:29 "minimal DUA, minimal SATU 3D" | Dipilih per batas, tanpa jumlah wajib; tidak satu efek di semua cut; wipe ≤ 2; bila butuh efek, utamakan berkedalaman |
| Audio diblokir | SKILL.md:55 "tanpa teks ketuk untuk mulai" | explainer.md:379 "petunjuk kecil ketuk"; explainer.md:250 "tombol Mulai" | Tahan frame awal tanpa teks; gestur pertama memulai video + suara (sesuai starter) |
| Jumlah gaya explainer | README, explainer.md: 6 | SKILL.md:134,331, plugin.json, marketplace.json: lima | Enam |
| Larangan struktural | 8 poin (SKILL.md:63-110) | Checklist "Lolos 6 poin" (SKILL.md:438) | 8 poin, daftar di checklist dilengkapi |
| Server | architecture.md:122-123 "server memang wajib" | architecture.md:164+ dan SKILL: tanpa server | Server hanya untuk pengembangan multi-file |
| Rasio | Default 16:9 (explainer.md:108) | Tabel dan resep explainer.md memakai 9:16 | 16:9 default; contoh 9:16 ditandai "proyek acuan"; rumus kamera memakai W/2, H/2 |
| Whip | anti-ppt.md:41 "jangan pernah" | techniques.md:318 menu #6; `starter-explainer` memakai `whip()` | Whip sah dengan overscan + blur; yang dilarang menyingkap tepi dunia |
| Spin/yaw | anti-ppt.md:40 menganjurkan | anti-ppt.md:42 melarang | Rotasi 3D termotivasi (kartu `rotateY` dari kedalaman); spin kejut tetap dilarang |
| Path | `tools/` di serve.py:7, export-frames.mjs:13, architecture.md:16; `render-svg.cjs` di svg2png.cjs:2 | Berkas ada di `scripts/`, bernama `svg2png.cjs` | Diperbaiki |
| Roadmap | roadmap.md:46,82 "belum ada skrip contact sheet / starter explainer" | Keduanya sudah ada | Roadmap diperbarui (+ lint, runtime bersama, eval) |
| Model gambar | `gpt_image_2` (explainer.md:255) | `gpt_image_2_5` (explainer.md:177, README) | "Model gambar lewat MCP", Higgsfield sebagai contoh |
| Tanggal | `updated: 2026-09-14` | v1.19.0 dirilis 2026-09-15 | Diperbarui bersama v1.19.1 |

Tambahan: README menyebut "plugin wins" bila ada dua salinan. Menurut dokumentasi Claude Code, skill
plugin diberi namespace sendiri dan keduanya tetap aktif, jadi risikonya aturan termuat dua kali.
*Status: README diperbaiki.* Tata letak `SKILL.md` di root plugin sah menurut dokumentasi.

## 7. Risiko hukum, vendor, dan data

- **Hak cipta dan hak atas wajah.** explainer.md:278-284 mengizinkan `og:image` artikel dan foto
  orang dari meme/tangkapan layar viral asal sumbernya dicantumkan. Mencantumkan sumber bukan izin,
  dan bertentangan dengan baris 263 ("jangan pakai screenshot berita").
  *Status: diperbaiki — hanya lisensi bebas, milik user, atau press kit resmi; risiko disampaikan ke user.*
- **Relay data ke pihak ketiga.** ae-bridge-higgsfield.md:20 mengirim frame proyek user lewat
  Higgsfield ke domain CloudFront yang di-hardcode; path AE 2026 juga di-hardcode.
  *Status: diperbaiki — pakai URL dari hasil impor, wajib persetujuan user, path AE generik.*
- **Terkunci ke vendor.** Higgsfield disebut 24 kali beserta nama tool spesifik, padahal skill
  dipasarkan untuk "agen apa pun". Abstraksikan menjadi "image/video MCP" dengan Higgsfield sebagai
  contoh adapter. *Status: sebagian (nama model digeneralisasi); sisanya P2.*
- Permukaan keamanan kode kecil: `serve.py` bind ke `127.0.0.1`, skrip lokal. Kecil:
  `kepala-ekspresi.py` memakai `assert` untuk validasi (hilang dengan `python -O`). *Status: belum (P2).*

## 8. Proses engineering

- Riwayat git hanya 3 commit, dimulai dari v1.17; alasan 17 versi sebelumnya tidak tercatat.
- 3 rilis dalam satu hari (08:44, 11:43, 12:45) tanpa review.
- Tidak ada CI, test, lint, tag rilis. *(Status: `.gitignore`, CI GitHub Actions, lint, dan uji
  browser ditambahkan di v1.20.0; tag rilis masih belum dipakai.)*
- Versi di-bump manual di 4 tempat (SKILL, dua manifest, badge README).
  *(Status: `scripts/bump-version.mjs` menyetel 12 tempat sekaligus, `--check` di CI.)*
- Tidak ada eval kualitas. Nilai produk = kualitas video hasil agen, tetapi tidak ada regression
  test. Idealnya 6–10 brief baku per rilis → snap + lint → skor rubrik (`claude plugin eval`).
- Bahasa tidak seragam: instruksi berbahasa Indonesia, README/marketplace berbahasa Inggris.
  Perlu strategi bahasa yang tegas.

## 9. Rencana prioritas

**P0 (selesai di v1.19.1)** — B1–B7, 12 kontradiksi, panduan sumber foto dan relay AE.

Verifikasi yang dijalankan (Chrome headless via puppeteer 25.11):
- Loop: 7 starter diputar dari DUR−0,3 dtk; lama 6/7 tidak loop, baru 7/7 loop.
- `snap.mjs` + `export-frames.mjs` dijalankan dari folder proyek uji 9:16 ber-VO: frame 1080×1920,
  perintah ffmpeg menyertakan `vo.wav`.
- Determinisme opener: dua proses snapshot t=3 — lama berbeda hash, baru identik.
- Sintaks semua skrip Node/Python; `aset-svg.py` menulis ke folder kerja.

**P1 (selesai di v1.20.0)** — runtime bersama + build + CI, `lint-motion.mjs`,
`test-starters.mjs`, `bump-version.mjs`, pembersihan `rig-tokoh.py`, urutan warna sorotan kata.

Verifikasi: `build-starters.mjs --check` menangkap drift buatan lalu memperbaikinya;
`lint-motion.mjs` memberi 13 FAIL pada fixture buruk dan 1 FAIL pada starter versi lama
(bug loop), 0 FAIL pada starter sekarang; `test-starters.mjs` lolos 7/7 dan GAGAL pada
starter versi lama.

**P1 sisa**
- `seek`, `blurTween`, dan helper kamera ikut ke `src/runtime/`.
- Contact sheet otomatis dari `snap.mjs`.

**P2 (selesai di v1.21.0)**
- Pecah konteks: "Peta baca" + checklist per jalur + `context-budget.mjs` di CI
  (inti ±51 KB → ±46 KB; tiap jalur punya batas).
- Kerangka eval: `evals/briefs/` (8 brief) + `scripts/eval-run.mjs`; diuji pada dua hasil
  contoh — yang bersih lolos lint + 5 frame, yang buruk memberi 13 FAIL.
- Abstraksi vendor MCP: ditulis sebagai kemampuan (gambar/video/hapus latar/bridge).
- Deliverable offline: `scripts/vendor-libs.mjs`; diuji dengan jaringan diblokir — nol
  permintaan jaringan, 4 face font termuat dari `data:` URI.
- Keputusan bahasa: **tetap Indonesia** (dicatat di `references/roadmap.md`).

**Sisa setelah P2**
- `seek`, `blurTween`, helper kamera ikut ke `src/runtime/`.
- Contact sheet otomatis.
- Menjalankan eval per rilis dan menyimpan baseline skornya.
- SRI/pin versi CDN untuk deliverable non-arsip.

**Metrik yang dipantau:** token per jalur pekerjaan, persentase lolos lint, skor eval per rilis,
jumlah kontradiksi (target 0).
