# Changelog

## Belum dirilis

- `lint-motion.mjs --help` (atau `-h`) kini mencetak cara pakai dan keluar dengan kode 0. Sebelumnya `--help` diabaikan lalu
  lint memeriksa `./index.html`, jadi dari folder skill ia melapor `FAIL folder-proyek` dengan kode 1. Gerbang rilis dan CI
  kini memeriksanya.
- `references/alat-kerja.md` tidak lagi menawarkan `gemini-3.1-flash-tts-preview` untuk VO Gemini: Google menjadwalkan
  penutupannya paling cepat 17 Nov 2026 dan menyarankan `gemini-3.8-flash-tts` (bawaan) atau `gemini-3.8-flash-lite-tts`.

## 1.4.0 — 2026-11-05

**Status penerimaan rilis ini**: pemilik menerima kesembilan butir vonis visual pada 4 Nov (siluet dan babak sinematik, mata elang, relief, painterly, peta relief, wayang, diorama, tokoh dan pustaka), dengan satu jawaban "terima" tanpa catatan per butir. Celah yang dicatat per gaya di bawah tetap terbuka. Uji langsung VO Gemini serta tinjauan dalang dan ahli arsitektur pura belum dilakukan; uji Antigravity pemilik baru mencakup satu opener 20 detik sampai MP4, bukan video panjang (lihat "Uji lapangan Antigravity").

Gaya "Siluet sinematik" (sub-proyek 3 dari `docs/peta-peningkatan-gaya-2026-11-01.md`), langkah pertama: starter sendiri.

- **`assets/starter-sinematik.html`** (baru, ±98 KB): titik mulai gaya siluet sinematik 100 % kode — bidang `[data-z]` + kamera 2.5D +
  modul `atmosfer`/`cahaya-2d`/`pasca`. Isi bawaan: gapura malam "Penjaga Gerbang", 12 dtk (obor bersumber, siluet ber-rim, kabut
  berlapis, bara, satu grade) + satu legenda dokumenter di `#ui`, di luar rig (kicker "JAWA · ABAD XIV", judul Cormorant Garamond
  600; masuk 0,8 → 1,4 dtk, keluar 4,2 → 4,8 dtk, jadi frame t = 0 dan t ≥ 5 bebas teks). Rangka tanpa bagian explainer (view
  samping/peta, profil kecepatan, strip, hero, whip, kolase, rundown contoh) dan tanpa blok `footage`: `snap.mjs` dan
  `export-frames.mjs` hanya memakai `OPENER.seekFrame`/`clipsReady` bila ada. `?clean=1`, `?debug=1`, autoplay + loop, VO, grain, dan
  gerbang `fonts.ready` sama dengan starter lain; `?kosong=1` = rig + modul tanpa adegan (kerangka uji). Satu adegan saja; babak
  berurutan ada di `starter-babak.html` (lihat "Babak sinematik 60 dtk").
- **Adegan dipindah, bukan disalin**: `demoSinematik()` + `SINEMA_UJI` dihapus dari `starter-explainer.html` (kini `gapuraMalam()` +
  `SINEMA_UJI` di starter baru, tanpa `view.side`/`.paper`); jalur bawaan explainer kembali ke `DUR = 22` dan
  `if(q.has('demo'))demoKamera();`, blok modulnya tetap ada (tersedia untuk MODE KOLASE). `starter-explainer.html?demo=sinematik`
  dialihkan ke `starter-sinematik.html` dengan query yang sama (skrip berhenti dengan galat sesudah `location.replace`, supaya `OPENER`
  tak pernah terpasang di dokumen yang akan diganti): tautan lama di CHANGELOG 1.3.0, `evals/bukti`, dan `docs` tetap jalan.
- **Uji** (`scripts/test-starters.mjs`): kait `ATM_UJI`/`CAHAYA_UJI`/`PASCA_UJI` wajib ada juga di `starter-sinematik.html`;
  `kabutParalaks`/`kabutMenutup` diwajibkan di starter ber-`CAM` (explainer + sinematik, bukan panggung). `SINEMA_UJI` wajib di starter
  baru dan dibaca dari halaman bawaannya (tanpa muat ulang) SEBELUM kait modul: `ATM_UJI` mengganti langit adegan dan `PASCA_UJI`
  membuang lapisan serta tween `GRADE`-nya. Kait modul dan `CAM_UJI` mengandaikan halaman yang belum memakai modul (`awalBersih`, jalur
  2D tanpa bidang, grade netral), jadi untuk starter ber-adegan dijalankan di `?kosong=1`; katalog `?demo=1` tidak didukung di
  starter baru, jadi `demoAkhir` dilewati dan `demoKameraMati` dihapus. 9 dari 9 starter lolos. Dua mutasi sementara membuktikan uji
  baru menangkap kesalahan: adegan tanpa `grade()` → `SINEMA_UJI` gagal (lapisan GRADE 0); `?kosong=1` yang tetap memuat adegan →
  `PASCA_UJI` (`awalBersih`, `netral`) dan `CAM_UJI` (`gayaLain`) gagal, jadi kait itu memang butuh halaman tanpa adegan.
- **Anggaran konteks**: jalur baru **Siluet sinematik** (`explainer.md` + `techniques.md` + `starter-sinematik.html`) 234,52 KB, batas
  pelacak **235 KB** = ukuran sekarang, bukan target (target = keputusan pemilik). Jalur **Explainer aliran** menyusut 244,94 → 219,94
  KB karena adegan pindah (batas 245 tetap). Batas lain tidak diubah; jalur **Opener / promo / bumper** kini 219,99 KB dari 220 (sebelum
  219,93): rute baru di `SKILL.md` + `techniques.md` hanya +55 karakter, sisa 15 karakter — tambahan berikutnya di `SKILL.md`,
  `techniques.md`, atau `starter-opener.html` harus menggantikan, bukan menumpuk.
- **Dokumen**: rute ke starter baru di `SKILL.md` (langkah 3 dan tabel "Isi paket"), `references/explainer.md` (baris rekomendasi gaya,
  tabel gaya, "Mulai dari starter yang benar"), `references/techniques.md` §7d (bukti jalan = adegan bawaan starter baru, helper lokal
  `gapuraMalam()`); `README.md` (catatan galeri, keterangan tile, tata letak repo; still `13-cinematic-silhouette.jpg` tetap, adegannya
  sama); contoh di kepala `scripts/bench-frame.mjs`.
- **Bukti** (`evals/bukti/2026-11-03-starter-sinematik/kontak.jpg`: t = 0, 4, 7, 11 dtk): hash PNG `snap.mjs` (`?clean=1`) di t = 0, 7,
  11 identik dengan `starter-explainer.html?demo=sinematik&clean=1` di commit 538a7e6 — adegan pindah tanpa selisih piksel
  (a22c8266…, d1718925…, 1f3cf209…). Jalur bawaan `starter-explainer.html?clean=1` identik dengan 538a7e6 di t = 1, 5, 12
  (6676321b…, 24a766d6…, ee5fac59…).
- **Celah yang diketahui**: kait modul (`ATM_UJI`, `CAHAYA_UJI`, `PASCA_UJI`, `CAM_UJI`) belum bisa dijalankan di
  halaman yang sudah memakai modul pada tahap ini (teratasi kemudian, lihat "Babak sinematik 60 dtk" › Uji). ms/frame: lihat "Bench akhir".
- **Aturan rilis** (`docs/aturan-rilis.md`, baru): SemVer untuk seluruh skill, CHANGELOG dengan `## Belum dirilis`, 8 gerbang
  yang sama dengan CI, gerbang rupa (bukti, bench saat mesin menganggur, vonis pemilik), alur branch → `main` → commit
  `rilis X.Y.Z` → tag → push hanya dengan izin pemilik → GitHub Release. `scripts/rilis.mjs` menjalankan semua gerbang
  (`--tanpa-browser` saat mesin merender). Bila diberi versi, skrip menyiapkan CHANGELOG, `bump-version`, dan catatan rilis, tanpa
  commit, tag, atau push. Tag `v1.2.0` (7fa0791) dan `v1.3.0` (0748e0b) dibuat dan di-push bersama rilis ini.
- **Kompatibel Antigravity (pengguna mana pun, Windows/PowerShell, macOS, Linux)**. Dasar: `docs/riset-antigravity-2026-11-03.md`
  (Antigravity membaca format Agent Skills apa adanya; yang patah adalah shell dan lingkungan, bukan tool khusus Claude). Semua
  perubahan netral-agen: perilaku Claude Code tidak berubah, `SKILL.md` tidak punya cabang "jika Antigravity", dan repo tidak
  menambah workflow, `AGENTS.md`/`GEMINI.md`, `mcp_config.json`, hook, atau skrip instal. Cakupannya MINOR menurut `docs/aturan-rilis.md` (dukungan agen baru).
  - **Chrome ditemukan otomatis** (`scripts/chrome.mjs`, baru; dipakai `snap`, `export-frames`, `test-starters`, `bench-frame`, dan
    `ae/bridge/svg2png.cjs`). Urutan: `PUPPETEER_EXECUTABLE_PATH` bila di-set (perilaku lama, tak diubah) → browser unduhan puppeteer →
    Chrome sistem → Edge di lokasi pasang standar Windows/macOS/Linux (Chromium ikut sebagai Chrome) → galat berbahasa Indonesia yang
    menyebut dua jalan keluarnya. Alasan: pengguna lain tidak punya env itu, dan di mesin acuan ia tidak di-set sementara unduhan
    puppeteer tidak ada, jadi `snap` dan `export-frames` gagal. Env kini opsional. `node scripts/chrome.mjs` mencetak pilihan tanpa
    membuka browser. puppeteer dimuat saat dibutuhkan, jadi `--help` jalan walau `npm install` belum dijalankan.
  - **`--help` / `-h` tidak menjalankan apa pun** (`scripts/bantuan.mjs`, baru). Dokumen skill Antigravity menyuruh agen menjalankan
    skrip dengan `--help` dulu. Sebelumnya `export-frames` memulai render penuh, `vendor-libs` mengunduh dari CDN lalu menulis
    `index-arsip.html`, `test-starters` dan `bench-frame` membuka Chrome, `build-starters` menulis ulang starter, `eval-run -h` menulis
    `evals/laporan-*.md`, dan `aset-svg.py` membuat folder bernama `--help`. Kini semuanya mencetak komentar kepalanya lalu keluar 0;
    `snap` dan `svg2png` ikut (dulu keluar 1 / galat). Tidak diberi guard karena `--help` memang tanpa efek: `lint-motion`, `cdn-integrity`,
    `bump-version`, `rilis`, `context-budget`, `test-kamera`, `serve.py`, `rig-tokoh.py`, `kepala-ekspresi.py`.
  - **Dokumen**: `<folder skill>` (folder berisi `SKILL.md`, path absolut yang dipakai agen) didefinisikan sekali di `SKILL.md` dan
    menggantikan `<skill>`/`<path>` di `references/alat-kerja.md` dan kepala skrip. `SKILL.md`: langkah 3 menyuruh menyalin starter dengan
    `Copy-Item`/`cp` ke `index.html` di folder proyek (jangan diketik ulang); satu catatan shell (PowerShell: `$env:VAR='…'; node …` dan `;`,
    bukan `VAR=… node` atau `&&`), diletakkan di "Prasyarat" supaya berada di 24 000 byte pertama. `references/alat-kerja.md`:
    `npm install --prefix "<folder skill>/scripts"` (sama di bash, PowerShell, cmd), tabel bash ↔ PowerShell (MP4/URL/FPS/WORKERS,
    PUPPETEER_*), paragraf "Render panjang" (> ±10 menit: proses terlepas + log + laptop tidak sleep, karena perintah latar agen bisa
    mati saat aplikasi di-restart atau percakapan diarsipkan), dan kalimat tentang `--help`. `references/ae-bridge-higgsfield.md`:
    "→ Read" → "buka gambarnya dengan alat baca-berkas agenmu". `README.md`: subbagian "Google Antigravity" untuk pengguna mana pun
    (clone ke `~/.gemini/config/skills/wevai`, di Windows `%USERPROFILE%\.gemini\config\skills\wevai`; folder harus bernama `wevai`;
    PowerShell dan bash; `/wevai` di App; MCP di `~/.gemini/config/mcp_config.json` dengan URL Higgsfield bertanda belum terverifikasi),
    baris tabel manual, dan Contributing `npm install --prefix scripts`. Lencana "works with" belum ditambah: menunggu uji pemilik.
  - **Anggaran konteks**: `SKILL.md` 37 601 → 37 559 karakter (−42): tambahan (definisi `<folder skill>`, aturan salin, catatan shell) ±380
    diimbangi ±420 yang dirapikan tanpa menghilangkan aturan (kalimat langkah 5 yang berganda dan berantakan, "bukan alat pengecekan"
    yang diulang di langkah 6, "Semua sudah autoplay + loop" yang sudah ada di "Player", contoh pill + bintang di Hukum #4 yang sudah
    dikatakan tiga kali lagi, dan daftar nama konsep di baris `opener-konsep.md` pada "Isi paket"). Batas tidak diubah. Jalur Opener /
    promo / bumper 219,99 → 219,94 KB (sisa 15 → 57 karakter), Siluet sinematik 234,52 → 234,48 KB (sisa 490 → 532), jalur lain turun
    42 karakter; jalur "Build di After Effects" 76 847 → 76 846 (kalimat `ae-bridge-higgsfield.md` +41, `SKILL.md` −42).
  - **Plugin Antigravity** (`.antigravity-plugin/plugin.json`, ditambahkan sesudah `SKILL.md` muat batas). Pada uji pertama, `.antigravity-plugin/plugin.json` (`"skills": "./"`) diuji dengan
    `agy plugin validate --strict --json` pada salinan sementara repo (profil `agy` terpisah; `~/.gemini` tidak berubah): `SKILL.md` di
    akar terbaca sebagai 1 skill, tetapi mode ketat GAGAL (exit 1): `SKILL.md: the body is 37243 bytes; only the first 24000 are loaded`.
    Salinan yang `SKILL.md`-nya dipotong di bawah 24 000 byte lolos ketat.
    - Teratasi kemudian: sesudah `SKILL.md` dirapikan (butir "SKILL.md muat batas Antigravity" di bawah), manifest
      `.antigravity-plugin/plugin.json` (`"skills": "./"`, logo `icon.svg`) lolos `--strict --json` dengan 1 skill dan `findings`
      kosong, lalu ditambahkan.
    - Versinya ikut `bump-version.mjs`.
    - README menyebut `agy plugin install https://github.com/aammuhammad18-cmyk/wevai`; pemasangannya sendiri belum diuji.
  - **Celah yang diketahui**:
    - Batas 24 000 byte `SKILL.md`: teratasi dengan butir "SKILL.md muat batas Antigravity". Uji empirisnya tetap: minta agen
      Antigravity mengutip langkah 6 "Alur kerja".
    - Di Antigravity baru diuji lewat IDE dan `agy` di Windows (lihat "Uji lapangan Antigravity"); App, macOS, dan Linux belum. Deteksi browser macOS/Linux hanya daftar lokasi
      standar yang belum dicoba di OS itu; seluruh verifikasi dilakukan di Windows 11 (PowerShell 5.1, Git Bash).
    - URL MCP Higgsfield di README belum terverifikasi (hanya sumber pihak ketiga).
  - **Status penerimaan**: sebagian. Pemilik menguji opener 20 detik sampai MP4 di IDE (4–5 Nov). Video panjang belum diuji, jadi lencana README belum diubah.
  - **Bukti** (Windows 11, tanpa `PUPPETEER_EXECUTABLE_PATH`, prioritas Idle karena render pemilik berjalan): `test-starters` 9 dari 9 starter
    lolos; satu `snap.mjs` menghasilkan potret dan lembar kontak; kontrol negatif: `puppeteer.launch` polos tanpa env dan tanpa `chrome.mjs`
    gagal di mesin yang sama ("Could not find Chrome"); `--help`/`-h` pada 9 skrip ber-guard: exit 0, tanpa berkas baru, tanpa proses
    Chrome baru; bentuk PowerShell 5.1 yang didokumentasikan (env, `;`, `npm ... --prefix`, `Copy-Item`, `git clone`, `Start-Process`
    terlepas) jalan.
- **SKILL.md muat batas Antigravity.**
  - Masalahnya: `agy plugin validate` menunjukkan Antigravity hanya memuat 24 000 byte pertama badan `SKILL.md`. Badan itu
    sebelumnya ±37 KB, jadi langkah 4–7, checklist, dan jebakan terpotong.
  - Enam bagian dipindah utuh (diperiksa baris demi baris; hanya 8 baris rujukan yang disesuaikan):
    - Larangan struktural → `anti-ppt.md`;
    - Checklist + Jebakan → `references/checklist.md` (baru, masuk INTI, dibaca di langkah 6);
    - Isi paket → `references/isi-paket.md`;
    - Aset lewat MCP → `references/aset-mcp.md` (aturan intinya tetap dua baris di `SKILL.md`);
    - After Effects → `ae-bridge-higgsfield.md`.
  - Hasilnya, badan `SKILL.md` turun dari 37 264 ke 22 574 byte (dihitung dengan CRLF). `context-budget.mjs` kini gagal bila
    badan melebihi 24 000 byte.
  - Semua jalur anggaran turun 4–5 KB: Opener 219,9 → 215 KB, Siluet sinematik 234,5 → 230 KB.
  - `docs/aturan-rilis.md` kini menyatakan bahwa menata ulang isi `SKILL.md` tanpa mengubah aturan bukan perubahan MAYOR.
- **VO Gemini** (`scripts/vo-gemini.mjs` dan `scripts/test-vo.mjs`, baru; `references/alat-kerja.md` › "VO Gemini (banyak kunci)";
  README › "Voice-over with Gemini"): VO dari Gemini TTS lewat API resmi (Interactions API `POST /v1beta/interactions`, model bawaan
  `gemini-3.8-flash-tts`, suara bawaan Iapetus), Node ≥ 18 tanpa dependensi. Naskah JSON `[{id, teks, suara?, gaya?}]` → `<id>.wav`
  (24 kHz mono 16-bit) + `<id>.json` `{teks, suara, model, gaya, dur}`; `dur` = jumlah sampel ÷ laju, persis (bukan ffprobe). Segmen
  yang json-nya cocok dan wav-nya ada dilewati, jadi menjalankan ulang = melanjutkan. Sampai 10 kunci (env `GEMINI_API_KEYS` /
  `GEMINI_API_KEY`, atau `~/.wevai/gemini-kunci.txt`), tak pernah tercetak atau tertulis utuh; status istirahat di
  `~/.wevai/gemini-kunci-status.json` berkunci hash sha256. Pindah kunci otomatis: 429 per menit (istirahat sebesar `retryDelay`),
  429 per hari (sampai tengah malam Pasifik, dihitung dengan Intl, benar untuk PST dan PDT; `retryDelay` diabaikan karena Google
  pernah mengirim "1s" untuk kuota harian), 429 `limit: 0` (model di luar paket kunci: tidak ditunggu, tidak disimpan), kunci tidak sah (24 jam), 5xx atau jaringan (ulang 1, 2, 4 dtk, lalu kunci berikutnya);
  gagal konten atau `status: incomplete` = gagal segmen, bukan salah kunci. Semua kunci istirahat: ≤ 15 mnt tidur, selebihnya
  menunggu reset harian dan lanjut sendiri (`--jangan-tunggu` = kode keluar 2 + perintah ulang). `--cek-kunci` (GET `/models`, tanpa
  kuota TTS) dan `--daftar-suara` (GET `/voices`, tempat suara beraksen regional dicari).
  **Keputusan**: pemilik memilih "failover + aman" setelah dua fakta: kuota Gemini dihitung per proyek, bukan per kunci, dan Google
  APIs Terms §2(d) melarang menyiasati batas. Karena itu README dan `alat-kerja.md` memuat peringatannya, dan alat ini tidak
  dipasarkan sebagai cara menggandakan kuota gratis. Kunci dipakai berurutan (kunci pertama sampai gagal), bukan bergilir.
  **Gerbang**: `node --test scripts/test-vo.mjs` (tanpa jaringan dan tanpa kunci; fetch, jam, dan tidur palsu) masuk
  `scripts/rilis.mjs`, `.github/workflows/ci.yml`, dan `docs/aturan-rilis.md`; `.gitignore` menolak `gemini-kunci*.txt`.
  **Celah yang diketahui**: belum dicoba dengan kunci sungguhan. Bentuk permintaan dan galat 429 diambil dari dokumen resmi
  (`aistudio.google.com/docs/speech-generation`, `/docs/api-errors`) dan laporan forum Google. Panduan memakai
  `generation_config.speech_config`, sedangkan referensi API menyebut `structured_speech_config`; bila Google menjawab 400
  `parameter_unknown`, ubah `bangunPermintaan()` (satu fungsi). Batas per menit tidak ditebak: alat mengikuti jawaban 429.
  **Status penerimaan**: menunggu uji langsung pemilik dengan kunci sendiri.
- **Penilaian visual otomatis** (sub-proyek 8a, K1 di `docs/rencana-1.4.0.md`).
  - **Berkas**: `scripts/nilai-visual.mjs` dan `scripts/test-nilai.mjs` (baru); `references/alat-kerja.md` › "Nilai visual (membaca
    angkanya)"; eval brief `evals/briefs/10-sejarah-malam-obor.md`; bukti di `evals/bukti/2026-11-03-nilai-visual/`; satu baris di
    `checklist.md`.
  - **Tujuannya**: kriteria visual peta (§5 butir 7) dijadikan angka. Agen tidak bisa menonton video, dan bingkai "flat" lolos bila
    hanya dinilai dengan mata.
  - **Teknis**: Node ≥ 18, tanpa dependensi. PNG dibaca sendiri lewat `node:zlib` (8 bit RGB, RGBA, abu-abu, berpalet; filter 0–4),
    lalu diperiksa silang dengan ffmpeg pada 30 PNG: 0 piksel berbeda.
  - **Empat ukuran per bingkai**, pada skala L OKLab × 100:
    1. rentang luminans p95 − p5 ≥ 28;
    2. kontras subjek vs cincin (`--subjek`), atau tengah vs tepi bila tanpa kotak, ≥ 10. Nilainya diambil yang terbesar dari
       selisih rata-rata dan sorot, karena siluet ber-rim nyaris sama terang dengan langitnya;
    3. puncak L dekat tiap sumber yang dideklarasikan (`--sumber`) ≥ median + 30;
    4. 2–6 warna dominan (≥ 5 % bingkai).
  - **Keluaran**: kode keluar 0 berarti semua ok, 1 ada peringatan, 2 galat.
  - **Kalibrasi**:
    - `starter-sinematik.html` di t 0, 7, 11 dan target rupa `f_7` lolos semua ukuran: rentang 36,3–41,4; titik terang +65,7 sampai
      +71,2.
    - Jalur bawaan `starter-explainer.html` dan `starter-explainer-kartun.html` tertandai semua: rentang 4,2–18,8.
    - Validasi luar, tidak dipakai untuk menetapkan ambang: 13 dari 13 bingkai produksi Babad Mataram tertandai.
  - **Gerbang**: `test-nilai` (32 uji; ±30 mutasi sengaja semuanya tertangkap) masuk `rilis.mjs`, CI, dan `aturan-rilis.md`.
  - **Celah yang diketahui**:
    - Acuan sinematik baru satu adegan, jadi ambang perlu dikalibrasi ulang untuk setiap kulit sinematik baru.
    - Batas atas 6 warna belum terkalibrasi.
    - Blok warna rata yang rentangnya lebar (panggung t 10) hanya tertangkap lewat deklarasi sumber.
    - `eval-run --snap` belum menjalankan `nilai-visual`.

- **Pustaka aset Jawa kuno** (sub-proyek 4a; `src/runtime/pustaka.js`, blok `<wv:pustaka>`, 27,6 KB; satu global `pustaka`).
  - **Generator**, menghasilkan markup SVG ber-seed yang dipanggang:
    - `candi` (andesit Mataram Kuno / bata Majapahit), `gapura` (bentar / paduraksa);
    - `rumahPanggung`, `beringin`, `lontar`, `gunungBerlapis`, `sawahTerasering`;
    - `obor`, `asap`, `relief`, `kain({motif})` (kawung, parang, ceplok, truntum).
  - **Deterministik**: seed, opsi, cahaya, dan `LANGIT` yang sama menghasilkan keluaran byte-identik.
  - **Cahaya dan jarak**: menerima `cahaya` (nama `SUMBER`, `{x,y}`, `{arah}`, `kuat`) dan `jarak` (lewat `warnaJarak`).
    Rim dibuat tanpa filter. Setiap aset menyediakan clipPath `#<id>-k` untuk `redup()`.
  - **Kait kanvas**: `pustaka.api` dan `pustaka.asapHidup` digambar dari `tl.time()`.
  - **Etalase**: `assets/katalog-pustaka.html`, tiga tableau dalam 26 dtk (senja Mataram, malam Majapahit, relief + kain).
    `test-starters` menguji halaman ini sebagai halaman ber-adegan.
  - **Dokumen dan uji**: `references/pustaka.md`; penunjuk di `techniques.md` §7d dan langkah 3 `SKILL.md`;
    `scripts/test-pustaka.mjs` masuk `rilis.mjs` dan CI.
  - **Bukti**: `evals/bukti/2026-11-03-pustaka-jawa/kontak.jpg`. Hasil `nilai-visual`: rentang 33,7–38,9; titik obor +68,5…+73,1.
  - **Celah yang diketahui**:
    - tableau tersembunyi tetap menjalankan callback (ms/frame: lihat "Bench akhir");
    - akurasi budaya bersifat suasana, bukan rekonstruksi; parang dan truntum anakronistik untuk Majapahit
      (lihat `pustaka.md`);
    - candi senja dan sawah diperbaiki kemudian (lihat "Rupa babak, tokoh, pustaka").
  - **Status penerimaan**: diterima pemilik 4 Nov.
- **Mata elang 3D** (sub-proyek 5, H di `docs/rencana-1.4.0.md`).
  - **Berkas**: `src/runtime/terbang.js` (blok baru `<wv:terbang>`) dan `src/runtime/lanskap-3d.js`; `assets/starter-elang.html`,
    `references/mata-elang.md`, dan `scripts/test-elang.mjs` (baru). `RAILS` pindah ke `kamera.js` inti; `kamera-three.js` dan
    `kamera-dom.js` mendapat kait kecil; `sinematografi.md` §3/§6/§7 dan penunjuk di `techniques.md`.
  - **`terbang(at, dur, titik, opsi)`**, fungsi murni dari `tl.time()`, untuk kamera 3D dan 2.5D:
    - Catmull-Rom sentripetal berparameter panjang busur; look-ahead atau satu target per titik;
    - roll dari tan φ = v²κ/g, dihaluskan (jendela Hann) lalu dijepit lunak (tanh); guncang trauma² × derau ber-seed;
    - di 2.5D titiknya `[fx, fy, zoom]`, dan zoom diwujudkan sebagai dolly sungguhan menembus bidang `[data-z]`, jadi ada
      paralaks kedalaman (`terbang25.jpg`).
  - **Demo `assets/starter-elang.html`** (11,5 dtk): terbang rendah di atas sawah berundak, menembus celah gapura bentar berobor,
    naik di atas lembah, mendarat di gunung berlapis saat senja, dengan legenda.
    - `lanskap()` + `tumbuh()` ber-seed: terrain fBm, sawah bercermin air, sungai Catmull-Rom, hutan dan palem InstancedMesh, Sky
      three r161 yang dipanggang sekali ke PMREM, kabut.
    - Motion blur akumulasi 8 sub-frame hanya di segmen menembus gapura (4,53–5,43 dtk).
    - Starter sendiri, bukan `?demo=elang`: demo di starter 3D akan menambah ±70 KB ke jalur Explainer 3D.
  - **Tone mapping film**: ACESFilmic (exposure ,5) untuk sejarah dan sinematik; starter brand dan produk tetap `NoToneMapping`, dan
    `test-starters` memeriksanya per starter. ACES, bukan AgX: api tetap jingga jenuh, sedangkan AgX memudarkannya ke salem
    (`tonemap.jpg`). three tetap r161.
  - **Uji**:
    - `test-elang` (6 uji: kontinuitas, look-ahead, fisika roll, determinisme guncang, tween 3D dan 2.5D) masuk `rilis.mjs` dan CI.
    - `test-starters`: `ELANG_UJI` (kamera sungguh terbang, jarak bebas di celah gapura 1,47 m, roll maks. 12,65° dari batas 23,1°);
      `terbang()` 2.5D disuntikkan ke setiap starter 2.5D; halaman berat dilewati bila WebGL jatuh ke perangkat lunak (CI tanpa GPU:
      satu frame 66,6 dtk). Run penuh kedua 10 dari 11 lolos; sesudah perbaikan, ketiga starter kamera-three lolos.
  - **Anggaran konteks**: jalur baru **Mata elang 3D** (`sinematografi.md` + `mata-elang.md` + `starter-elang.html`) 149 KB, batas
    pelacak 155 KB. Jalur lain naik 0,3–1,2 KB (kait kamera dan dokumen); batasnya tidak diubah.
  - **Bukti**: `evals/bukti/2026-11-03-mata-elang/` (`kontak.jpg`, `elang.gif`, `tonemap.jpg`, `terbang25.jpg`). `nilai-visual`
    dengan subjek dan sumber dideklarasikan: gapura + dua obor kontras 59,9, obor +71,6; gunung di 11 dtk kontras 27,2.
  - **Celah yang diketahui**:
    - bila ms/frame melewati 350 (kini 295, lihat "Bench akhir"), kenop pertamanya MSAA → FXAA, peta bayangan 1024, jumlah pohon;
    - sawah lembah dekat tampak kotak-kotak pada grid kasar (±14 m) di frame akhir;
    - `terbang()` 2.5D baru terpasang di `starter-babak.html`; starter 2.5D lain menyalin bloknya (`mata-elang.md`).
  - **Status penerimaan**: diterima pemilik 4 Nov.
- **Relief candi hidup** (sub-proyek 7, gaya lanjutan pertama; J di `docs/rencana-1.4.0.md`).
  - **Berkas**: `assets/starter-relief.html`, `src/runtime/relief-hidup.js` (blok baru `<wv:relief-hidup>`: `reliefHidup()`,
    `SINAR`), `references/relief-candi.md`, dan `scripts/test-relief.mjs` (baru); `pustaka.dindingRelief` di `pustaka.js`.
  - **Demo** (20 dtk): galeri tiga panel ala Borobudur dibaca searah pradaksina (prosesi → kapal bercadik → kalpataru). Obor
    `SINAR` menyapu dinding, kamera berjalan lalu berhenti di tiap panel, legenda "Kapal Bercadik". 17 bagian pahatan bergerak
    pelan (lengan, dayung, layar, ombak, untaian, payung).
  - **Teknik cahaya**:
    - sekali saat setup: peta tinggi pahatan (764 lapis Path2D, profil membulat dari jarak-ke-tepi, erosi, lubang, butir batu)
      dipanggang jadi normal + AO, dan warna andesit (belang, nada per blok, lumut, jejak hujan) dipanggang di GPU;
    - tiap frame, WebGL2 dua pass: bagian hidup sebagai sprite peta tinggi, lalu lampu titik `SINAR` (Lambert, redaman
      1/(1+d²/J²), bayangan pahatan lunak 24 langkah, ambien langit × AO). `SINAR` di-tween seperti `CAM`.
  - **Biaya terukur** (di bawah beban render pemilik): 29–32 ms/frame untuk dinding 4300×1000, bayangan ikut bergerak. Pembanding:
    Canvas 2D per piksel 737 ms tanpa bayangan; filter SVG dinamis 358 ms tanpa bayangan jatuh. Setup 4,1–5,1 dtk per muat halaman.
  - **Deterministik**: kanvas di t 9,2 byte-identik lewat tiga jalur seek (langsung, lompat, putar berurutan).
  - **Uji**: `test-relief` (11 uji; lima mutasi sengaja semuanya tertangkap) masuk `rilis.mjs` dan CI; `RELIEF_UJI` dan
    `SINEMA_UJI` di `test-starters`.
  - **Anggaran konteks**: jalur baru **Relief candi hidup** (`explainer.md` + `techniques.md` + `relief-candi.md` +
    `starter-relief.html`) 293 KB, batas pelacak 295 KB; ±4/5 starter adalah blok runtime.
  - **Bukti**: `evals/bukti/2026-11-03-relief-candi/` (`kontak.jpg`, `nilai.txt`). `nilai-visual` 9 dari 9 ok: rentang 39–46,
    kontras subjek 18–33, titik terang dekat lampu +31…+39, 3–4 warna.
  - **Celah yang diketahui**:
    - ms/frame ekspor penuh dan setup di mesin senggang belum diukur;
    - kanvas relief 1:1 di bidang z = 0, jadi melunak di atas zoom ±1,25; close-up butuh dinding kedua yang lebih kecil;
    - satu konteks WebGL2 per dinding, jadi 1–2 dinding per halaman;
    - sosok dan panel adalah kosakata bergaya, bukan salinan panel nyata (legenda kini ditandai ilustrasi, lihat "Rupa budaya").
  - **Status penerimaan**: diterima pemilik 4 Nov.
- **Rig tokoh v2** (sub-proyek 4b, G di `docs/rencana-1.4.0.md`).
  - **Berkas**: `src/runtime/tokoh.js` (blok baru `<wv:tokoh>`, satu global `tokoh`), `assets/katalog-tokoh.html`,
    `references/tokoh.md`, dan `scripts/test-tokoh.mjs` (baru); penunjuk di `kartun-panggung.md`.
  - **Rig**: rangka 19 tulang dengan arah 3D yang diproyeksikan ke tiga pandang (depan, tiga perempat, samping), jadi satu pose
    terbaca di ketiganya; slot dan lampiran ala Spine dengan urutan gambar per pandang; IK dua tulang analitik (dijepit; sisi siku
    dan lutut menurut tanda).
  - **Bentuk dan cahaya**: bagian tubuh bezier dari profil lebar, bukan kapsul. Warna rata bernada malam + satu gradien cahaya per
    tokoh (gradien per segmen membuat tokoh tampak seperti manekin kayu). Rim = siluet dikurangi salinan yang digeser menjauhi cahaya;
    arah cahaya dihitung ulang tiap frame dari obor terdekat.
  - **Pose bernama**: berdiri (kontraposto), menunjuk, sembah, tombak, bawa, bersila, silasembah, meraih (IK), dan jalan prosedural
    yang fasenya diambil dari jarak tempuh dengan telapak tumpu dikunci IK, jadi kaki tidak selip.
  - **Kostum dan atribut Jawa kuno**: kain bermotif `pustaka.kain`, wiron, sabuk, sampur, keris, ikat/jamang/mahkota/jata, kelat bahu,
    gelang, kalung, upawita, kemben; properti tombak, perisai, payung, tongkat, cangkul, sesaji. Enam arketipe (rakyat, raja,
    prajurit, resi, petani, putri) dan `kerumunan({seed, n, area, ragam})` ber-seed.
  - **Determinisme**: tokoh bergerak = satu kanvas per bidang yang dihapus penuh dan digambar ulang dari `tl.time()` tiap frame.
    Transform `<g>` di svg bidang ber-`will-change` terukur tidak deterministik (tepi ±1–2, dengan rim ±12). Semua kanvas tokoh
    identik lintas jalur seek; di dalam siluet tokoh paling banyak 8 piksel berbeda dari ≥ 105 ribu.
  - **Etalase** `assets/katalog-tokoh.html` (28 dtk, 35 tokoh): enam arketipe saat senja di depan candi; dua prajurit ronda di
    sepanjang tembok berobor; putri meraih altar lewat IK lalu menyembah; kerumunan 24 tokoh di depan gapura berobor.
  - **Uji**: `test-tokoh` (10 uji: IK, determinisme dan campuran pose, telapak tanpa selip, kerumunan, SVG well-formed, log gambar
    kanvas identik lintas jalur seek, galat berbahasa Indonesia) masuk `rilis.mjs` dan CI. `SINEMA_UJI` katalog tokoh di
    `test-starters`: 4 kanvas tokoh, ≥ 30 tokoh, 6 arketipe.
  - **Anggaran konteks**: tidak berubah (katalog dan `tokoh.md` di luar jalur); `tokoh.js` 41,5 KB.
  - **Bukti**: `evals/bukti/2026-11-03-tokoh-v2/kontak.jpg`. `nilai-visual` 6 dari 6 ok: rentang 28–35, kontras subjek 18–31, titik
    terang +58…+72 di sumber yang dideklarasikan, 2–3 warna.
  - **Catatan budaya** (di `tokoh.md`): kemben pada putri adalah konvensi ilustrasi modern; keris di punggung bersarung ladrang cocok
    untuk Majapahit ke atas, diragukan untuk Mataram Kuno; payung bertingkat berumbai adalah bentuk kemudian; mahkota, jamang, dan
    jata adalah bentuk ikonik, bukan salinan arca tertentu.
  - **Celah yang diketahui**:
    - selisih latar (bukan tokoh) ±1 px, maks. 76–84, sesudah lompat mundur ke tableau yang tampil sejak halaman dimuat; terjadi juga
      di `katalog-pustaka` tanpa tokoh. Ekspor maju tidak menampilkan ulang tableau, jadi kemungkinan tidak terdampak;
    - cincin samar ±4 di pendar obor `cahaya-2d` antara jalur berurutan dan jalur lompat;
    - pose mendayung dan menunggang belum ada; tokoh statis `buat()` hanya berwarna rata (cahaya lewat `rim()`/`bayangan()`);
    - blok `<wv:tokoh>` ada di katalog dan `starter-babak.html`; `starter-sinematik.html` tetap tanpa blok ini (penjaganya digambar sendiri).
  - **Status penerimaan**: diterima pemilik 4 Nov.
- **Ekspor panjang** (sub-proyek 6).
  - **Berkas baru**: `scripts/antre-render.mjs`, `scripts/ekspor-inti.mjs`, `scripts/test-ekspor.mjs`.
  - **`export-frames.mjs`**:
    - `WORKERS` bawaan kini **2** bila `os.availableParallelism() >= 2`, selain itu 1; env tetap menimpa.
    - Frame sama dengan `WORKERS=1`: di halaman mini 30 dari 30 hash PNG sama; di halaman nyata 1080p (`starter-sinematik`,
      `katalog-tokoh`) 344/360 dan 834/840 hash sama, sisanya selisih maks. 1 level (PSNR 110–116 dB, tak terlihat)
      (`evals/bukti/2026-11-03-ekspor/bukti.txt` §5).
    - Kecepatan terukur di laptop 2 core: 1,20× (`starter-sinematik`) dan 1,47× (`katalog-tokoh`), bukan ±2× seperti perkiraan peta §7
      (mesin sambil dipakai tiga agen ber-Chrome Idle).
    - Di antrean nyata pemilik (Babad Bali babak 07–09, `SYNC=1`, MP4 JPEG): 5,9–6,4 frame/dtk dengan 2 worker, dibanding 3,1–4,2
      dengan 1 worker di babak 00–06, jadi ±1,5–2×.
    - Antrean render pemilik (Bali, lalu Nabi) ikut memakai 2 worker begitu ini masuk `main` (3 Nov, dengan izin pemilik);
      `WORKERS=1` di env mengembalikan perilaku lama.
  - **`antre-render.mjs`** (generalisasi `alat/antre-render.sh`):
    - Masukan `antrean.json` `[{html|url, mp4, siap?, audio?, env?}]`.
    - Butir dilewati bila mp4-nya terbaca ffprobe dan lebih baru dari html dan audio.
    - Hasil ditulis ke `.sementara.mp4` dulu lalu diganti nama, jadi mp4 setengah jadi tidak pernah dianggap selesai.
    - Butir yang gagal dicatat dan antrean jalan terus; menjalankan ulang berarti melanjutkan.
    - Log mencatat fps, sisa butir/antrean, dan jam selesai.
    - `--gabung` menggabung semua babak lalu mencocokkan durasi gabungan dengan jumlah durasi butir.
  - **Penahan sleep bawaan** hidup selama antrean berjalan dan mati di semua jalan keluar:
    - Windows: `SetThreadExecutionState(0x80000001)` lewat PowerShell tersembunyi;
    - macOS: `caffeinate`;
    - Linux: `systemd-inhibit`;
    - setelan daya tidak disentuh;
    - terbukti di proses nyata: galat di tengah render mematikan 22/22 proses turunan.
  - **`MODE=webcodecs`** (eksperimental), untuk halaman yang seluruh framenya satu kanvas (`window.OPENER.canvas`):
    - `VideoEncoder` H.264 Annex B dialirkan ke ffmpeg (`-r <fps> -f h264 -c copy`);
    - uji: 90 frame, 6,000000 dtk, urutan frame benar, selisih rata-rata 1,0–1,7 level dibanding jalur PNG;
    - tanpa kait kanvas: pesan jelas, lalu jalur biasa.
  - **Uji**: `test-ekspor` (43 uji tanpa Chrome dan ffmpeg; 10 dari 11 mutasi tertangkap) masuk `rilis.mjs`, CI, dan `aturan-rilis.md`.
  - **Dokumen**: `alat-kerja.md` › "Render panjang" dan "Mode WebCodecs"; kait `canvas` di kontrak `OPENER` (`architecture.md`);
    README; satu penunjuk di langkah 6 `SKILL.md`.
  - **Belum diukur / celah**:
    - kecepatan WebCodecs di 1080p, dan halaman WebGL nyata;
    - jalur macOS/Linux dan Ctrl+C asli di Windows (baru lewat uji unit);
    - ETA belum menghitung waktu peluncuran Chrome.
- **Painterly `lukis`** (sub-proyek 7, gaya lanjutan kedua; J di `docs/rencana-1.4.0.md`).
  - **Berkas**: `src/runtime/lukis.js` (blok baru `<wv:lukis>`, butuh `atmosfer`), `assets/starter-lukis.html`, `references/lukis.md`,
    dan `scripts/test-lukis.mjs` (baru); penunjuk di `explainer.md`, `techniques.md`, `isi-paket.md`, dan README.
  - **Teknik**: Kuwahara anisotropik + cat air (gelap tepi, granulasi pigmen, mekar basah) di WebGL2, di atas kertas yang
    dibangkitkan. Tiap bidang `[data-z]` dilukis SEKALI saat setup ke kanvasnya sendiri, lalu kamera 2.5D hanya menggesernya.
    Sapuan menempel pada lukisan seperti latar film animasi lukis tangan di kamera multiplane, jadi tidak "mendidih"; derau diikat
    ke ruang objek, bukan layar. Teks tetap DOM tajam di atas lukisan.
  - **Demo** (16 dtk): legenda senja "Desa di kaki gunung": gunung api berasap, rumah panggung berjendela menyala, petani di sawah
    berundak, pemikul di pematang, burung pulang, dan legenda "Kisah dari masa lampau" di kantong gelap tebing. `?kenang=1` =
    kilas balik sepia.
  - **Bukti tidak mendidih** (`potong.jpg`: potongan 1:1, 4 bingkai berurutan): kamera ditahan → 0 % piksel berubah; putar biasa
    (kamera bergeser sub-piksel) → 0,5 % piksel berubah > 8 level; pembanding filter layar naif ber-seed per frame → 30 % > 8 level.
    Bingkai dari dua peluncuran Chrome terpisah identik byte demi byte.
  - **Biaya** (diukur saat render pemilik berjalan, jadi batas atas): 197 ms/frame (sinematik di sesi yang sama 257 ms), karena
    bidang lukisan adalah bitmap diam; siap 15,5 dtk per muat halaman (melukis 5 bidang + 22 kanvas sprite), sekali per worker.
  - **Uji**: `test-lukis` (kenop, antrean lukis, siklus pose) masuk `rilis.mjs` dan CI. `test-starters`: kait `LUKIS_UJI` (lukis
    ulang = byte sama, seed lain = sapuan lain, derau ikut objek, tanpa WebGL2 = raster mentah, kenop salah ditolak) dan blok lukis
    berbasis screenshot (sidik dua muat, seek dua jalur, diam, tepi, geser) dengan dua mutasi wajib tertangkap: filter layar ber-seed
    per frame dan tekstur layar diam. Halaman dilewati di WebGL perangkat lunak (satu bidang 81,7 dtk di SwiftShader).
  - **Anggaran konteks**: jalur baru **Painterly (legenda)** (`explainer.md` + `techniques.md` + `lukis.md` + `starter-lukis.html`)
    264 KB, batas pelacak 266 KB.
  - **Bukti**: `evals/bukti/2026-11-03-lukis/` (`kontak.jpg`, `potong.jpg`, `kenang.jpg`, `nilai.json`). `nilai-visual` 6 dari 6 ok:
    rentang 47,7–48,5, kontras subjek 14,8–15,9, matahari +51,6…+54,6, 4 warna.
  - **Celah yang diketahui**:
    - butuh WebGL2 + `EXT_color_buffer_float`; tanpa itu raster mentah tanpa sapuan;
    - dolly > 1,1 melunakkan kertas dan sapuan (kanvas = bitmap); garis yang lebih tipis dari `kuas` hilang;
    - memori GPU sementara ±112 MB per bidang 2240×1400 saat dilukis;
    - ms/frame ekspor penuh belum diukur di mesin senggang;
    - agen pembuatnya macet sesudah bukti di-commit, jadi laporan akhirnya tidak ada; gerbang dan uji penggabungan dijalankan controller.
  - **Status penerimaan**: diterima pemilik 4 Nov.
- **Peta relief 3D topografi** (sub-proyek 7, gaya lanjutan ketiga; J di `docs/rencana-1.4.0.md`; lanjutan kulit topografi Jagad Budaya).
  - **Berkas**: `src/runtime/peta-relief.js` (blok baru `<wv:peta-relief>`, 37 KB termasuk data Jawa), `assets/starter-peta-relief.html`,
    `references/peta-relief.md`, `scripts/test-peta.mjs`, dan `scripts/peta-data.mjs` (membangun ulang data pantai, mis. untuk Bali);
    penunjuk di `sinematografi.md` §1, `explainer.md`, `isi-paket.md`, `alat-kerja.md`, dan README.
  - **Data**:
    - pantai Natural Earth 10m (domain publik), Douglas–Peucker 0,5 km, 1 262 titik; garis 200 m dari NE bathymetry K_200;
    - 68 gunung api dari GVP VOTW 5.4.0 (doi:10.5479/si.GVP.VOTW5-2026.5.4): puncak = elevasi GVP, diuji ±20 m;
    - Natural Earth tidak memuat sungai Jawa, jadi 8 sungai dibuat skematis (titik lewat kota yang dilaluinya, dihaluskan) dan
      ditandai begitu di dokumen; skala tegak 4×.
  - **Medan**: kerucut gunung berkaki tak bulat dengan 8–14 jurang radial (rumus sama di JS dan GLSL), kaldera Tengger, lembah
    sungai landai (ukiran ≤ 80 m), dataran tinggi Batu–Malang. Shader berpalet Jagad: isoline 100/500 m yang memudar bila rapat,
    laut paparan terang, garis 200 m dan pantai bertinta, bayangan awan. `uCetak` membuka dengan peta cetak berkontur yang naik
    menjadi relief bercahaya.
  - **Demo** (18 dtk, ACES, dua kaki `terbang()`): seluruh Jawa sebagai peta cetak → relief naik di bawah matahari rendah →
    turun ke jantung Mataram Kuno, legenda "ABAD X / Pusat kerajaan pindah ke timur" → busur menyala ke timur (skematis, bukan
    jalan atau rute pasukan) → mendarat di Lembah Brantas berlabel Kelud dan Arjuno-Welirang. Label DOM diproyeksikan ulang tiap
    render.
  - **Uji**: `test-peta` (7 uji: proyeksi vs haversine, dekode NE, determinisme, 68 puncak, pantai dan garis 200 m, sungai tanpa
    tanggul, panjang busur) masuk `rilis.mjs` dan CI. `test-starters`: `PETA_UJI` (label dalam bingkai di 6 detik, rute 0 →
    sebagian → 1), sidik geometri lintas muat, ACES; halaman dilewati di WebGL perangkat lunak.
  - **Anggaran konteks**: jalur baru **Peta relief 3D** (`sinematografi.md` + `peta-relief.md` + `starter-peta-relief.html`) 171 KB,
    batas pelacak 175 KB; jalur lain naik ≤ 0,2 KB.
  - **Bukti**: `evals/bukti/2026-11-03-peta-relief/` (`kontak.jpg`, `nilai.json`). `nilai-visual`: rentang 28,8–37,4 di 7 bingkai,
    kontras subjek yang dideklarasikan 11,0–20,5, kepala rute +31,9…+34,4. Bingkai peta lebar tanpa subjek memberi peringatan kontras
    tengah-tepi (2,4–7,8), dijelaskan di README bukti.
  - **Celah yang diketahui**:
    - siap 6–13 dtk di HD 4000 saat render pemilik berjalan (ms/frame: lihat "Bench akhir");
    - sungai skematis (galat beberapa km); vektor sungai asli butuh cek lisensi (OSM = ODbL, tidak cocok);
    - label tanpa uji oklusi; gunung Sumatra barat 104,5° BT tidak dimodelkan (tertutup kabut di gambar besar);
    - kerucut gunung masih seragam dan dataran lembah polos (pengamatan controller pada lembar kontak).
  - **Status penerimaan**: diterima pemilik 4 Nov.
- **Babak sinematik 60 dtk** (sub-proyek 3, E di `docs/rencana-1.4.0.md`): `assets/starter-babak.html` (baru), babak "Penjaga Gerbang" untuk eval 10.
  - **Isi**: lima adegan di tiga dunia: gerbang dari dalam, lembah + keraton, satu shot mata elang `terbang()` 2.5D 24–31 dtk yang menembus
    celah gapura dan mendarat di penjaga, penjaga dekat, penutup. Transisi berpemicu: match cut di langit, push-through gapura, cut on
    action, larut lewat asap obor. Penjaga = rig `tokoh.*` v2, tampak samping, rim di sisi obor.
  - **Keputusan pemilik** (4 Nov): babak jadi starter sendiri. `starter-sinematik.html` tetap satu adegan dengan penjaga berzirah (rupa
    f_7), jalur Siluet 233 KB (pelacak 235); jalur baru **Babak sinematik** (`explainer.md` + `techniques.md` + `sinematografi.md` +
    starter) 364 KB, pelacak 366 KB. `SKILL.md` kini merujuk `pustaka.*` dan `tokoh.*` lewat starter babak; eval 10 memakai starter ini.
  - **Blok baru `src/runtime/babak.js`**: `adegan(rentang, bangun)` (dunia hidup hanya di rentangnya; tersembunyi = tanpa callback, tanpa
    gambar: 0 panggilan kanvas tersembunyi vs 49 471 yang tampil, 240 seek) dan `panggang(svg)` (svg bidang → kanvas GPU). Resep:
    `sinematografi.md` §5 "Babak multi-adegan".
  - **Akar beda latar sesudah lompat mundur** (katalog maks. 76/84): lapisan `will-change` (svg bidang, kabut, pendar) dirasterisasi saat
    DIBUAT lalu hanya ditransform, jadi seek langsung, lompat, tiba berurutan, dan worker ekspor kedua memberi piksel berbeda. Dugaan
    viewport terbukti salah (viewport sebelum `goto` memberi selisih sama). Obat di halaman/runtime: svg bidang dipanggang (babak + kedua
    katalog), `kabut` dan pendar `sumber()` = kanvas tetap. `starter-sinematik.html` tidak memanggang bidangnya (blok `babak` tidak masuk
    anggaran jalurnya), jadi selisih kecil itu masih ada di sana.
  - **Uji**: `ATM_UJI`/`CAHAYA_UJI`/`PASCA_UJI`/`CAM_UJI` tahan halaman berisi; muat ulang `?kosong=1` tersisa untuk `RELIEF_UJI` dan
    `starter-lukis`. `BABAK_UJI` dan `SINEMA_UJI.tersembunyiDiam` baru; satu mutasi per kait tertangkap. `test-starters` 16 dari 16 lolos
    di pohon gabungan.
  - **WORKERS 1 vs 2 pada babak** (1800 frame): 1,24× lebih cepat; 1678/1800 frame identik; sisanya di sekitar titik belah (t 29,3–34),
    PSNR ≥ 64,9 dB, tak terlihat (`evals/bukti/2026-11-03-ekspor/bukti.txt` §7).
  - **Bukti**: `evals/bukti/2026-11-03-babak-sinematik/`. `nilai-visual` 12 dari 12 lolos; kontras subjek paling tipis 12,9 (batas 10).
  - **Bench semua gaya** (4 Nov, HD 4000, 3 putaran, median ms/frame, 20 frame mulai t = 2, semua deterministik, dua agen aktif):
    sinematik 221, babak 251, elang 292, relief 233, lukis 219, peta 288, pustaka 237; **katalog tokoh 437, melewati batas 350** (tableau
    6 tokoh detail 2). Belum tercakup: segmen motion blur elang, tableau selain pembuka, adegan babak sesudah t ±2,7 (rata-rata seluruh
    babak: 336 ms/frame pada ekspor JPEG q95).
  - **Celah yang diketahui**:
    - t 27,5 lewat jalur berurutan vs seek langsung: ±3 level di 0,49 % piksel; penyebab belum terbukti;
    - rupa penjaga dan t 33,6 diperbaiki kemudian (lihat "Rupa babak, tokoh, pustaka");
    - kanvas panggang tidak dipanggang ulang bila konteks GPU hilang; halaman ±52 MP kanvas (87 MP pernah menghilangkan konteks);
    - setup 2–5 dtk di mesin senggang, sampai 147 dtk saat render pemilik berjalan.
  - **Status penerimaan**: diterima pemilik 4 Nov.
- **Wayang kulit** (sub-proyek 7, gaya lanjutan keempat; J di `docs/rencana-1.4.0.md`).
  - **Berkas**: `src/runtime/wayang.js` (blok baru `<wv:wayang>`, global `wayang` dan `BLENCONG`), `assets/starter-wayang.html`,
    `references/wayang.md`, dan `scripts/test-wayang.mjs` (baru); penunjuk di `explainer.md`, `isi-paket.md`, `alat-kerja.md`, README.
  - **Isi**: figur dari golongan umum menurut pakem (alusan, gagahan, raksasa, putri) + gunungan, tatah ber-seed sebagai kode; badan kaku,
    lengan bersendi di bahu dan siku lewat IK, tuding dan gapit tergambar. Kelir + blencong berkedip ber-seed. Proyeksi sentral dari
    lampu: `skala = d/(d−z)`, `blur = nyala·z/(d−z)`, jadi bayangan membesar dan mengabur saat figur mendekati lampu. Simpingan kanan dan
    kiri. `?sisi=dalang` mencerminkan dunia dan menampilkan figur berwarna prada, lampu, dan debog.
  - **Demo** (22 dtk): gunungan membuka, alusan dan raksasa masuk dari sisinya, saling berisyarat, kedip keras, raksasa ke lampu dan kembali,
    gunungan menutup di tengah. Satu legenda; tanpa isi ritual.
  - **Sumber**: Subagya 2013, Widyokusumo 2010, Ismurdyahwati 2007, UNESCO, Sonobudoyo; rincian dan batasnya di `wayang.md`.
  - **Uji**: `test-wayang` (8 uji) masuk `rilis.mjs` dan CI; `WAYANG_UJI` dan `SINEMA_UJI` di `test-starters`; lima mutasi sengaja tertangkap.
  - **Biaya** (bench controller, 3 putaran; dua agen aktif): sisi bayangan median 234 ms/frame, sisi dalang 293 ms (satu putaran 356, di atas
    batas 350). Ekspor penuh 660 frame: rata-rata 271 dan 314 ms/frame.
  - **Anggaran konteks**: jalur baru **Wayang kulit** (`explainer.md` + `techniques.md` + `wayang.md` + `starter-wayang.html`) 244 KB, pelacak 246 KB;
    pelacak Relief candi hidup naik 295 → 297 KB karena `explainer.md` dan `SKILL.md` kini menyebut gaya ini.
  - **Bukti**: `evals/bukti/2026-11-03-wayang/` (`kontak.jpg`, `nilai.txt`). `nilai-visual` 8 dari 8 ok; kontras 13,8 dtk bergantung pada kotak subjek.
  - **Celah yang diketahui**:
    - pakem belum ditinjau dalang; sumber gunungan hanya sekunder; bentuk `inten`/`masmasan` dan letak motif dirancang dari nama;
    - sendi dua pada lengan belum ada sumber yang terbaca; tinggi relatif dan kedip adalah angka perkiraan;
    - sisi dalang disederhanakan (tanpa dalang, gamelan, debog atas); rupa raksasa diperbaiki kemudian (lihat "Rupa budaya");
    - panakawan ditolak generator dengan pesan alasan; `gagahan` dan `putri` hanya tampil di simpingan.
  - **Status penerimaan**: diterima pemilik 4 Nov; pakem belum ditinjau dalang.
- **Diorama cel-shaded** (sub-proyek 7, gaya lanjutan kelima; J di `docs/rencana-1.4.0.md`): maket museum untuk menjelaskan struktur tempat.
  - **Berkas**: `src/runtime/diorama.js` (blok `<wv:diorama>`) dan `src/runtime/pura-bali.js` (blok `<wv:pura-bali>`, jadi tempat lain bisa
    membuangnya), `assets/starter-diorama.html`, `references/diorama.md`, dan `scripts/test-diorama.mjs` (baru); penunjuk di `sinematografi.md`,
    `explainer.md`, `isi-paket.md`, `alat-kerja.md`, README.
  - **Teknik**: toon 4 tingkat, garis lambung terbalik (terukur setara tanpa garis; tepi depth/normal ±98 ms/frame dan bergerigi, ditolak), tilt-shift
    yang pitanya di-tween dari timeline (+28 ms), alas berstrata, kartu 2D berbayangan kontak yang dirasterisasi sekali, bayangan 4096 dipanggang
    sekali. ACES, exposure ,74.
  - **Demo** (19 dtk): pura Bali generik tri mandala untuk format MANDALA: maket utuh, lalu `terbang()` menyusuri sumbu kelod → kaja melewati candi
    bentar dan kori agung, mendarat di utama mandala dengan padmasana dan meru. Label zona muncul berurutan; satu legenda.
  - **Sumber**: Bhattacarya & Riyanto 2022, Simbolon dkk. 2024, Seniwati dkk. 2022, Wirawibawa dkk. 2022, Wardana 2024; tanpa arca, sesaji, atau klaim
    ritual. Rincian dan penyederhanaan di `diorama.md`.
  - **Uji**: `test-diorama` (11 uji) masuk `rilis.mjs` dan CI. `DIORAMA_UJI`: determinisme, garis, tilt, tone mapping; tiap mutasi tertangkap. Halaman
    dilewati di WebGL perangkat lunak.
  - **Biaya** (bench controller, 3 putaran): median 240 ms/frame; ekspor penuh 570 frame rata-rata 287 ms/frame.
  - **Anggaran konteks**: jalur baru **Diorama cel-shaded** (`sinematografi.md` + `diorama.md` + `starter-diorama.html`) 213 KB, pelacak 215 KB;
    pelacak Painterly naik 266 → 268 KB dan Peta relief 3D 175 → 176 KB karena dokumen bersama bertambah.
  - **Bukti**: `evals/bukti/2026-11-03-diorama/` (`kontak.jpg`, `garis.jpg`). `nilai-visual` 6 dari 6 ok: rentang 50–60, kontras subjek 18–46,8.
  - **Celah yang diketahui**:
    - proporsi bangunan perkiraan, bukan ukuran Asta Kosala Kosali; sebagian sumber hanya terbaca abstraknya, dua halaman hanya dari ringkasan pencarian;
      bentuk padmasana bersandar pada Wikipedia; letak bale kulkul bertentangan antar-sumber (madya vs nista);
    - kata-kata legenda perlu dinilai pemilik (diganti, lihat "Rupa budaya");
    - lipatan di dalam siluet tanpa garis (`garis.jpg`).
  - **Status penerimaan**: diterima pemilik 4 Nov; belum ditinjau ahli arsitektur pura.
- **Kartun panggung memakai `CAM`** (sisa E di `docs/rencana-1.4.0.md`): `starter-explainer-panggung.html` kini memuat `kamera.js` + `kamera-dom.js`, jadi dolly, truck, angle, handheld, `shot()`, dan bidang `[data-z]` berparalaks tersedia di panggung.
  - `cam(at, x, y, z)` = `camTo` (parameter panggung pertama dihapus); `cut()` dan `slide()` menaruh `CAM` di pose awal adegan; `?demo=1` ditambahkan; `#world` tanpa `will-change:filter` (meratakan 3D).
  - Tampilan bawaan praktis sama: 0,00–0,04 % piksel berbeda > 24 level di 9 waktu. Bench 208 → 211 ms sebelum perbaikan seek, 183 ms sesudahnya (sekali ukur, mesin tak sepenuhnya senggang). Bukti: `evals/bukti/2026-11-04-panggung-cam/`.
  - `test-starters` menjalankan `CAM_UJI` dan cek kabut berparalaks di panggung. Pelacak jalur kartun panggung 170 → 190 KB (terukur 185, blok kamera).
- **Perbaikan `makeSeek`: lompatan seek memberi frame salah** (`src/runtime/seek.js`, semua starter).
  - **Gejala**: frame pertama worker ekspor kedua, dan frame sesudah Chrome dibuka ulang, menggambar pose lama. Di panggung f00180 berbeda 3,2 % piksel, maks. 191 level; `bench-frame` melaporkan `deterministik:false`. Bug ini lebih tua dari 1.4.0, tetapi baru sering terpicu sejak `WORKERS=2` jadi bawaan.
  - **Akar**: `onUpdate` tween berjalan sebelum nilai tulis-tunda GSAP masuk. Berurutan tidak kena karena selisih waktunya kecil.
  - **Obat**: sesudah lompat > 0,1 dtk, berhenti sesaat sebelum `t` lalu maju ke `t`. Maju, bukan mundur: mundur dari sesudah `t` membatalkan `set()` yang tepat di `t` (tertangkap `PETA_UJI` pada percobaan pertama).
  - **Uji**: `test-starters` kini membandingkan lompat dengan tiba berurutan di semua starter (gagal pada kode lama: 1,88 % piksel). 18 dari 18 lolos; panggung `WORKERS` 1 vs 2 kini 360/360 frame identik, 1,81× lebih cepat; `deterministik:true`.
  - **Tidak terdampak**: mesin Babad pemilik memakai seek sendiri. MP4 Bali babak 07–09 dan Nabi babak 00–01 diperiksa di titik belah: tak ada frame salah.
  - **Diukur ulang pada babak** (PNG, FPS=10): 560/600 frame identik, 1,59× lebih cepat; sisanya t 30–34, maks. 3 level di 6 frame terburuk, ≤ 0,2 % piksel (`bukti.txt` §8). Halaman lain belum diukur ulang.
- **Rig tokoh lebih hemat**: blur rim dan pendar diklip ke kotak tokoh, sebelumnya memproses selebar kanvas. Tableau 6 tokoh detail 2 turun dari ±371 ke ±288 ms/frame di HD 4000 (batas 350; mesin senggang, belum diukur saat render berjalan), biaya per tokoh ±27 → ±14 ms, babak ±231 → ±222 ms. Rupa tetap: 0 % piksel beda > 16 level, maks. 7. Bukti: `evals/bukti/2026-11-04-tokoh-hemat/`. Angka 437 ms di catatan bench di atas berasal dari sebelum perbaikan ini.
- **Segmen motion blur mata elang**: terukur 1294 ms/frame (maks. 1646), di luar segmen itu 299 ms. Pengecualian yang disengaja terhadap batas 350 ms: 27 dari 345 frame, tambahan ±30 dtk per shot saat render, gambar tidak terdampak.
- **Bench akhir sesudah semua perbaikan rupa** (4 Nov, HD 4000, 3 putaran, median ms/frame, 20 frame mulai t = 2, semua deterministik): panggung 176, lukis 193, pustaka 212, relief 220, wayang bayang 228, babak 230, sinematik 234, diorama 237, peta 275, elang 295, wayang dalang 310, katalog tokoh 319. Menggantikan angka bench sebelumnya. `test-starters` 18 dari 18 lolos. Still `docs/gallery/14`–`20` diambil ulang dari starter terbaru.
- **Render tak lagi macet tanpa pesan.** Bila Chrome beku (terjadi sesudah laptop tidur pada uji Antigravity 4 Nov), `browser.close()` menunggu selamanya saat `export-frames` membuka ulang browser. Ditiru dengan membekukan Chrome anak render. Kini menutup dan membuka ulang dibatasi waktu, proses yang beku dimatikan, dan render berhenti dengan galat jelas sesudah 3 percobaan. Skill mengarahkan render lewat `antre-render` sebagai proses terlepas. Celah: render kedua pada uji itu mati tepat saat menutup berkas (1200/1200, tanpa MP4), penyebabnya belum diketahui.
- **Uji lapangan Antigravity** (4 Nov, `agy` 1.5.0). Pemilik mengirim brief video di IDE dan agen hanya membalas panduan teks untuk editor manual, tanpa WeVai. Tiga penyebab:
  - **Skill tak termuat.** Junction yang direkomendasikan riset tidak dikenali (uji banding: folder biasa terbaca, junction tidak; CRLF dan LF sama-sama terbaca). Diganti manifest `~/.gemini/config/skills.json`; dicatat di README.
  - **Semua alat agen gagal.** Hook `PreToolUse` plugin `googlecloudtools.datacloud_telemetry` patah pada nama pengguna Windows berspasi, sehingga agen tak bisa membaca atau menulis apa pun. Plugin dinonaktifkan di mesin pemilik; jalan keluarnya dicatat di README.
  - **Deskripsi skill tak mencakup permintaan dokumenter.** Kini memuat "video dokumenter" dan video sejarah/budaya panjang (932 dari 1024 karakter, ukuran total tak bertambah). Efeknya pada pemilihan skill belum teruji.
  - **Uji ulang: opener 20 detik jadi.** Skill termuat, lint dan `snap.mjs` berjalan, tetapi keluaran tertulis di dalam folder skill karena workspace-nya folder itu dan istilah "folder proyek" tak pernah didefinisikan; catatan pikiran agen juga menyebut `.gitignore` sebagai alasan menganggapnya sah. Kini SKILL.md mendefinisikannya (folder kerja, atau `../<nama-video>/` bila folder kerja = folder skill), `lint-motion` memberi FAIL `folder-proyek` untuk keluaran di dalam folder skill, dan komentar `.gitignore` diganti.
  - **Persetujuan rundown.** Pada uji itu agen tidak berhenti: catatan pikirannya menyebut aturan itu, lalu menganggap permintaan awal sudah cukup. SKILL.md kini memerintahkan berhenti dan menunggu balasan, dan menyatakan permintaan awal maupun mode otomatis bukan persetujuan. Ini aturan tertulis, tidak ada pemeriksaan mesin yang menegakkannya.
  - **Uji ulang kedua (4–5 Nov, IDE, permintaan yang sama).** Agen berhenti dan menunggu persetujuan, dan lint menangkap berkas yang salah tempat. Tetapi agen memakai ulang hasil uji pertama yang sudah dipindahkan, bukan membuat yang baru, lalu menyalinnya kembali ke folder skill; SKILL.md kini juga melarang salinan, dan larangan ini belum diuji ulang di IDE. Render di dalam IDE gagal dua kali (lihat "Render tak lagi macet tanpa pesan"); MP4 akhirnya dibuat di luar IDE.
  - **Celah**: video panjang di Antigravity belum diuji, dan pemilihan skill hanya teruji saat permintaan menyebut "pakai skill wevai".
- **Rupa budaya ditingkatkan** sesudah tinjauan pemilik (bukti `evals/bukti/2026-11-04-rupa-budaya/`).
  - **Wayang**: raksasa digambar ulang dari ikonografi bersumber (plelengan, pelokan, gusen, gembel); sisi dalang mendapat lapis sungging dipanggang, kelat bahu, gelang, dan uncal; simpingan diurutkan menurut sumber. Bench bayang 209, dalang 298 ms/frame (terburuk 314).
  - **Diorama**: pola bata, paras, ijuk, dan alang di shader toon; padmasana tepas–batur–sari dari sumber jurnal, tanpa arca; legenda mengikuti kata sumber dan menandai "Denah generik, bukan pura tertentu". Bench 233 ms/frame.
  - **Relief**: legenda kini "GAYA BOROBUDUR · ILUSTRASI". Bench 210 ms/frame.
  - **Anggaran**: pelacak Diorama 215 → 217 KB karena `pustaka.js` ikut membesar; Wayang 246/246 tanpa ruang.
  - **Celah**: wajah raksasa sisi dalang masih bidang merah polos, tangan terangkatnya mirip trisula; badan sisi dalang polos dari dekat; padmasana tanpa Bedawang Nala tak lengkap secara tipologi (dinyatakan di `diorama.md`); kartu pohon diorama datar; ukuran bata dan serat ijuk tanpa sumber. Belum ditinjau dalang atau ahli arsitektur pura.
- **Rupa babak, tokoh, pustaka ditingkatkan** sesudah tinjauan pemilik (bukti `evals/bukti/2026-11-04-rupa-babak/`).
  - **Tokoh**: berwajah di tiga pandang, tangan berjari, bayang bentuk, bahu baru. **Bug**: kain bermotif tak pernah tampil karena `'pola'` dianggap warna tak sah; kini kawung dan ceplok tampil, dengan uji regresi di `test-tokoh`.
  - **Penjaga**: kuda-kuda, kain merah, perhiasan, perisai daun, tanpa zirah rekaan. Sebagian perhiasan dan warna adalah konvensi ilustrasi atau perkiraan (`tokoh.md`).
  - **Babak**: t 33,6 tanpa bercak langit dan nyala utuh. Kontras subjek t 38 naik 13,1 → 14,6 dan t 43 12,9 → 17,3.
  - **Pustaka**: sawah air + hijau (opsi `air`), candi senja kontras 3,6 → 11,5–12,1, tajuk beringin dan lontar dirombak.
  - **Bench** (3 putaran): babak 232–257, katalog tokoh 316–318 (6 tokoh detail 2 kini batas praktis), pustaka 204–223 ms/frame. Anggaran tidak dinaikkan; Babak sinematik 366/366.
  - **Celah**: dada MCU t 38 lebar dan datar; pintu candi senja kotak rata; tajuk lontar masih membulat dengan serpihan di dalamnya (pengamatan controller); keris tampak samping seperti tongkat pendek; lengan tampak depan kaku.
- **Rupa 3D ditingkatkan** sesudah tinjauan pemilik (bukti `evals/bukti/2026-11-04-rupa-3d/`).
  - **Mata elang** (±286 ms/frame, dari ±262): tiga ragam pohon dengan bahan daun tembus cahaya, sawah lembah per piksel, air beriak tanpa bercak putih, gapura berbata dan api bergradien, awan, gunung berpunggung.
  - **Peta relief** (±249 ms/frame, dari ±283): bentuk gunung beragam dengan puncak tetap GVP (±20 m), tata lahan lewat shader (nada acak, bukan data; `peta-relief.md` menyatakannya), kontur memudar saat relief naik.
  - **Anggaran**: batas tidak dinaikkan; `mata-elang.md` dipangkas ±3 KB (alasan dan angka kalibrasi tetap di bukti `2026-11-03-mata-elang`). Mata elang 155/155, Peta 176/176.
  - **Celah**: gerak belum dinilai (mungkin ada kilau di tepi daun); pohon sangat dekat kamera masih halus; sawah basah dekat masih seperti tambalan; lereng kiri bertangga tipis pada grid kasar.
- **Galeri gaya sinematik** (sub-proyek 8, K2): `docs/gallery/14`–`20` dan tabel baru di README, satu still per gaya dari adegan bawaan starternya (babak, mata elang, relief candi, painterly, peta relief, wayang, diorama). Rekomendasi "sejarah → 4 atau 1" di `explainer.md` sudah bersyarat izin raster.

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
