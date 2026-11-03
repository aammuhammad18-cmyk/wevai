# Changelog

## Belum dirilis

Gaya "Siluet sinematik" (sub-proyek 3 dari `docs/peta-peningkatan-gaya-2026-11-01.md`), langkah pertama: starter sendiri.
Versi belum dinaikkan; rilisnya langkah terpisah.

- **`assets/starter-sinematik.html`** (baru, ±98 KB): titik mulai gaya siluet sinematik 100 % kode — bidang `[data-z]` + kamera 2.5D +
  modul `atmosfer`/`cahaya-2d`/`pasca`. Isi bawaan: gapura malam "Penjaga Gerbang", 12 dtk (obor bersumber, siluet ber-rim, kabut
  berlapis, bara, satu grade) + satu legenda dokumenter di `#ui`, di luar rig (kicker "JAWA · ABAD XIV", judul Cormorant Garamond
  600; masuk 0,8 → 1,4 dtk, keluar 4,2 → 4,8 dtk, jadi frame t = 0 dan t ≥ 5 bebas teks). Rangka tanpa bagian explainer (view
  samping/peta, profil kecepatan, strip, hero, whip, kolase, rundown contoh) dan tanpa blok `footage`: `snap.mjs` dan
  `export-frames.mjs` hanya memakai `OPENER.seekFrame`/`clipsReady` bila ada. `?clean=1`, `?debug=1`, autoplay + loop, VO, grain, dan
  gerbang `fonts.ready` sama dengan starter lain; `?kosong=1` = rig + modul tanpa adegan (kerangka uji). Satu adegan saja: babak
  berurutan = langkah berikut sub-proyek 3.
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
- **Belum diukur / celah yang diketahui**: ms/frame starter baru (`bench-frame.mjs`; mesin sedang dipakai render pemilik) —
  tindak lanjut di mesin senggang, batas 350 ms. Kait modul (`ATM_UJI`, `CAHAYA_UJI`, `PASCA_UJI`, `CAM_UJI`) belum bisa dijalankan di
  halaman yang sudah memakai modul (mis. `PASCA_UJI` menuntut tanpa lapisan grade; `ATM_UJI` mengganti langit halaman) — sampai kait itu
  tahan terhadap halaman terisi, starter ber-adegan harus punya mode tanpa adegan seperti `?kosong=1`.
- **Aturan rilis** (`docs/aturan-rilis.md`, baru): SemVer untuk seluruh skill, CHANGELOG dengan `## Belum dirilis`, 8 gerbang
  yang sama dengan CI, gerbang rupa (bukti, bench saat mesin menganggur, vonis pemilik), alur branch → `main` → commit
  `rilis X.Y.Z` → tag → push hanya dengan izin pemilik → GitHub Release. `scripts/rilis.mjs` menjalankan semua gerbang
  (`--tanpa-browser` saat mesin merender). Bila diberi versi, skrip menyiapkan CHANGELOG, `bump-version`, dan catatan rilis, tanpa
  commit, tag, atau push. Penyesuaian yang tertunda: tag `v1.2.0` (7fa0791) dan `v1.3.0` (0748e0b), yang belum di-push.
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
  - **Plugin Antigravity tidak ditambahkan.** `.antigravity-plugin/plugin.json` (`"skills": "./"`) diuji dengan
    `agy plugin validate --strict --json` pada salinan sementara repo (profil `agy` terpisah; `~/.gemini` tidak berubah): `SKILL.md` di
    akar terbaca sebagai 1 skill, tetapi mode ketat GAGAL (exit 1): `SKILL.md: the body is 37243 bytes; only the first 24000 are loaded`.
    Salinan yang `SKILL.md`-nya dipotong di bawah 24 000 byte lolos ketat. Jadi syarat memasukkan manifest (lolos ketat) belum terpenuhi.
  - **Celah yang diketahui**:
    - **`SKILL.md` melewati 24 000 byte** (bodi 36,7 KB dengan LF, 37,3 KB dengan CRLF seperti checkout Windows). Bila batas itu juga berlaku
      pada skill di folder global (belum terverifikasi; validator hanya menyebut skill plugin), agen Antigravity hanya memuat sampai sekitar
      langkah 3 "Alur kerja" (di checkout CRLF batasnya jatuh di tengah kalimat langkah 3): langkah 4–7, seluruh "Checklist sebelum
      menyerahkan", "Jebakan", "After Effects", dan "Isi paket" tidak termuat. Karena itu definisi `<folder skill>`, catatan shell, dan aturan
      salin starter ditaruh di 24 000 byte pertama (byte ±2 200, ±2 700, dan ±23 200). Mengatasinya = menyusun ulang `SKILL.md` (MAYOR
      menurut `docs/aturan-rilis.md`), jadi keputusan pemilik; uji empirisnya: minta agen Antigravity mengutip langkah 6 "Alur kerja".
    - Belum dijalankan di Antigravity sungguhan (App/CLI/IDE) dan belum di macOS/Linux. Deteksi browser macOS/Linux hanya daftar lokasi
      standar yang belum dicoba di OS itu; seluruh verifikasi dilakukan di Windows 11 (PowerShell 5.1, Git Bash).
    - URL MCP Higgsfield di README belum terverifikasi (hanya sumber pihak ketiga).
  - **Status penerimaan**: menunggu. Pemilik menguji checklist C5 di `docs/riset-antigravity-2026-11-03.md` (uji `/wevai`, opener 20 detik,
    `--help`, MP4) di Antigravity sebelum lencana README diubah.
  - **Bukti** (Windows 11, tanpa `PUPPETEER_EXECUTABLE_PATH`, prioritas Idle karena render pemilik berjalan): `test-starters` 9 dari 9 starter
    lolos; satu `snap.mjs` menghasilkan potret dan lembar kontak; kontrol negatif: `puppeteer.launch` polos tanpa env dan tanpa `chrome.mjs`
    gagal di mesin yang sama ("Could not find Chrome"); `--help`/`-h` pada 9 skrip ber-guard: exit 0, tanpa berkas baru, tanpa proses
    Chrome baru; bentuk PowerShell 5.1 yang didokumentasikan (env, `;`, `npm ... --prefix`, `Copy-Item`, `git clone`, `Start-Process`
    terlepas) jalan.

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
