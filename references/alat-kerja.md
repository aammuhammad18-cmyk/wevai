# Alat kerja — pasang, jalankan, dan apa yang bisa dilewati

Tidak satu pun dari ini dibutuhkan untuk MENONTON hasil: deliverable tetap satu
`index.html` yang diklik dua kali. Yang di sini hanya mempercepat pembuatan dan
verifikasi. Dibaca saat butuh memasang alat, bukan di setiap proyek.

Deliverable (`index.html`) hanya butuh browser modern + internet untuk CDN
(GSAP, font). Python dan Node **opsional**, dipakai hanya untuk alat kerja:
`scripts/serve.py` (server no-cache, cuma perlu bila memakai module lokal),
puppeteer (snapshot/verifikasi otomatis, `scripts/export-frames.mjs` → MP4) —
dipasang sekali dengan `npm install --prefix "<folder skill>/scripts"` (Node mencari
paket dari lokasi skrip, bukan dari folder proyek), lalu skrip dijalankan dari
folder proyek. Chrome/Edge yang sudah terpasang dicari otomatis; tanpa env.
Kalau user tidak punya keduanya: (1) tetap bangun satu-berkas, buka lewat
klik dua kali; (2) verifikasi visual lewat `?debug=1` (panel scrub) dan
screenshot manual per detik kunci; (3) MP4 lewat rekam layar (OBS / rekam
tab browser) — jelaskan bahwa hasil rekam layar bisa drop frame, dan render
frame-by-frame butuh Node. Jangan pernah membuat deliverable yang butuh
`npm install` untuk DITONTON.

**ffmpeg juga opsional.** Cek dulu (`ffmpeg -version`); bila tidak ada:

| Kebutuhan | Dengan ffmpeg | Tanpa ffmpeg |
|---|---|---|
| Sinkron VO (batas kalimat/paragraf) | `silencedetect` | `scripts/vo-pauses.html` — buka di browser, pilih audio, salin `SEG`/`PARA`; hasilnya sama persis (Web Audio, tanpa instal) |
| Durasi/format audio | `ffprobe` | angka `DUR` dari vo-pauses.html; browser memutar wav/mp3/m4a/ogg langsung |
| Export MP4 | env `MP4=out.mp4` → export-frames.mjs mengalirkan frame langsung ke ffmpeg (audio `#vo` ikut); tanpa `MP4=` ia menulis PNG dan mencetak perintah ffmpeg | tidak ada MP4 — tawarkan instal satu perintah (`winget install Gyan.FFmpeg` / `brew install ffmpeg`) atau rekam layar |
| Mempelajari video referensi (ekstrak frame) | `fps=` + `tile=` | minta user mengirim screenshot di detik kunci, atau buka videonya di browser dan potret pada detik tertentu |

Tanpa ffmpeg alur explainer tetap lengkap sampai sinkron VO; hanya MP4 yang
butuh instalasi.

## Memasang (sekali)

```bash
npm install --prefix "<folder skill>/scripts"     # puppeteer untuk snap/export/uji
```

Bentuk ini sama di bash, PowerShell, dan cmd, dari folder mana pun (tanpa `cd` dan `&&`).
Node mencari paket dari lokasi SKRIP, bukan dari folder tempat perintah dijalankan —
karena itu `npm install` harus menunjuk `scripts/` skill, sedangkan skripnya dijalankan
dari folder proyek supaya `index.html` ketemu.

**Browser.** Skrip yang membuka Chrome (`snap`, `export-frames`, `test-starters`, `bench-frame`,
`svg2png`) mencarinya sendiri lewat `scripts/chrome.mjs`, berurutan: `PUPPETEER_EXECUTABLE_PATH`
bila di-set → browser unduhan puppeteer → Google Chrome (di macOS/Linux Chromium ikut) → Microsoft Edge
di lokasi pasang standar Windows/macOS/Linux. Karena itu `PUPPETEER_EXECUTABLE_PATH` OPSIONAL: perlu
hanya bila Chrome/Edge ada di lokasi tak standar. Sudah punya Chrome/Edge dan tidak mau mengunduh
browser ±150 MB? Pasang dengan `PUPPETEER_SKIP_DOWNLOAD` (tabel di bawah). Tak ada browser sama sekali → skrip berhenti dengan
pesan yang menyebut dua jalan keluarnya (pasang Chrome/Edge, atau `npx --prefix "<folder skill>/scripts"
puppeteer browsers install chrome`). Cek tanpa membuka browser: `node "<folder skill>/scripts/chrome.mjs"`.

## Env di bash dan PowerShell

Skrip dikonfigurasi lewat variabel lingkungan (`MP4`, `URL`, `FPS`, `WORKERS`, …; daftar di kepala
tiap skrip). Prefiks gaya bash `VAR=… node` dan `&&` TIDAK jalan di Windows PowerShell, shell bawaan
Windows (dan beberapa agen). Tulis env pada baris perintah yang SAMA: satu perintah agen bisa berupa
shell baru, jadi env dari perintah sebelumnya tidak terbawa.

| | bash / zsh | PowerShell |
|---|---|---|
| satu env | `MP4=out.mp4 node "<folder skill>/scripts/export-frames.mjs"` | `$env:MP4='out.mp4'; node "<folder skill>/scripts/export-frames.mjs"` |
| beberapa env | `MP4=out.mp4 FPS=30 WORKERS=2 node …` | `$env:MP4='out.mp4'; $env:FPS='30'; $env:WORKERS='2'; node …` |
| halaman lain (`URL`) | `URL="file:///C:/proyek/index.html?clean=1" node "<folder skill>/scripts/snap.mjs" shots 1 3.5` | `$env:URL='file:///C:/proyek/index.html?clean=1'; node "<folder skill>/scripts/snap.mjs" shots 1 3.5` |
| lewati unduhan browser | `PUPPETEER_SKIP_DOWNLOAD=1 npm install --prefix "<folder skill>/scripts"` | `$env:PUPPETEER_SKIP_DOWNLOAD='1'; npm install --prefix "<folder skill>/scripts"` |
| Chrome/Edge di lokasi tak standar (opsional) | `PUPPETEER_EXECUTABLE_PATH=/opt/chrome/chrome node …` | `$env:PUPPETEER_EXECUTABLE_PATH='D:\Chrome\chrome.exe'; node …` |
| sambung perintah | `a && b` | `a; b` (Windows PowerShell 5.1 tidak mengenal `&&`) |

Path ber-spasi (mis. `C:\Users\Nama Lengkap\…`) selalu diberi tanda kutip. Di sesi PowerShell yang
tetap hidup, `$env:` bertahan sampai sesinya tutup: hapus dengan `Remove-Item Env:MP4` agar tak
bocor ke render berikutnya.

## Alat untuk membuat video (dijalankan dari folder proyek)

| Alat | Perintah | Untuk apa |
|---|---|---|
| Lint | `node "<folder skill>/scripts/lint-motion.mjs"` | aturan yang bisa diukur dari kode; FAIL = perbaiki sebelum menyerahkan. Tanpa dependensi |
| Snapshot | `node "<folder skill>/scripts/snap.mjs" shots 1 3.5 8` | potret detik kunci + `shots/kontak.png` (lembar kontak berlabel detik) untuk dinilai sekali lihat; `--tanpa-sheet` bila tidak perlu |
| Nilai visual | `node "<folder skill>/scripts/nilai-visual.mjs" shots --sumber '[{"x":512,"y":598}]' --subjek 1230,205,540,845` | mengubah bingkai `snap.mjs` jadi angka: rentang luminans (flat?), kontras subjek, titik terang dekat sumber cahaya yang dideklarasikan, jumlah warna dominan; ok/peringatan per ukuran, kode keluar 1 bila ada peringatan. Saringan, bukan vonis: baca "Nilai visual (membaca angkanya)" di bawah. Tanpa dependensi |
| Export MP4 | `node "<folder skill>/scripts/export-frames.mjs"` dengan env `MP4=out.mp4` | render frame-by-frame langsung ke MP4, ukuran dari `OPENER.W/H`, audio `#vo` ikut. Lebih cepat: `FPS=30` (separuh frame), `SYNC=1` (halaman yang `seek` menggambar sinkron — tanpa kanvas rAF/klip); `WORKERS` standar 2 bila mesin punya ≥ 2 thread (terukur ±2× di laptop 2 core: 60 mnt ±8,6 → ±4 jam; frame identik dengan `WORKERS=1`; set `WORKERS=1` bila di mesinmu lebih lambat; lebih dari 2 hanya bila core/GPU longgar). Halaman yang seluruhnya satu kanvas: `MODE=webcodecs` (eksperimental, bagian "Mode WebCodecs"). Master kritis: `FORMAT=png`. Tanpa `MP4=`: folder PNG + perintah ffmpeg |
| Antrean render | `node "<folder skill>/scripts/antre-render.mjs" antrean.json --gabung final.mp4` | video panjang per babak: render berurutan lewat `export-frames.mjs`, lanjut sendiri bila diulang, log fps + perkiraan selesai, gabung akhir, dan penahan sleep bawaan. Bagian "Render panjang". Tanpa dependensi |
| Jeda VO | buka `scripts/vo-pauses.html` di browser | `SEG`/`PARA`/`DUR` untuk sinkron VO tanpa ffmpeg |
| Kunci CDN | `node "<folder skill>/scripts/cdn-integrity.mjs" index.html` | memasang `integrity="sha384-…"` pada `<script src>` CDN supaya browser menolak berkas yang isinya berubah (import map Three tidak bisa) |
| Arsip mandiri | `node "<folder skill>/scripts/vendor-libs.mjs"` | menanam GSAP + font ke dalam berkas supaya tetap bisa diputar offline bertahun-tahun (jalur WebGL tetap butuh internet) |
| Dev server | `python "<folder skill>/scripts/serve.py"` | hanya bila mengedit dengan module JS lokal |
| Ekspresi kepala | `python "<folder skill>/scripts/kepala-ekspresi.py" kepala.png` | varian senang/cemas/kaget + kedip untuk kartun panggung |
| VO Gemini | `node "<folder skill>/scripts/vo-gemini.mjs" naskah.json` | membuat VO (WAV + durasi persis) dari Gemini TTS lewat API resmi; beberapa kunci bergantian, lanjut sendiri. Baca peringatan kuota di bagian "VO Gemini (banyak kunci)" di bawah. Tanpa dependensi |

Skrip yang merender, membuka Chrome, menulis berkas, atau memakai jaringan (`snap`, `export-frames`,
`antre-render`, `bench-frame`, `test-starters`, `eval-run`, `build-starters`, `vendor-libs`, `nilai-visual`, `ae/bridge/svg2png.cjs`,
`ae/bridge/aset-svg.py`) menjawab `--help` atau `-h` dengan komentar kepalanya lalu keluar 0, tanpa
melakukan apa pun. Aman dijalankan lebih dulu untuk melihat pemakaian dan env-nya.

## Render panjang (lebih dari ±10 menit)

Render 60 menit di laptop 2 core memakan ±7,5–10 jam dengan 1 worker (antrean Bali pemilik: 3–4 frame/dtk pada 30 fps,
`SYNC=1`); `WORKERS=2` (standar) terukur 1,2–1,5× lebih cepat di halaman nyata 1080p. Pecah video 45–90 menit menjadi babak (satu HTML
dan satu VO per babak) lalu render lewat `scripts/antre-render.mjs`: babak yang gagal tidak mengulang semuanya, babak yang
sudah jadi tidak dirender lagi, dan laptop ditahan agar tidak sleep. Ia menjalankan `export-frames.mjs` untuk tiap babak
dan, bila diminta, menyambung hasilnya. Butuh Node ≥ 18, ffmpeg, dan ffprobe. Satu babak saja pun lebih baik lewat antrean
(satu butir) daripada memanggil `export-frames.mjs` langsung: hanya antrean yang menahan sleep dan lanjut sendiri.

`antrean.json`: satu butir per babak, dikerjakan berurutan (path relatif ke folder tempat perintah dijalankan):

```json
[
  { "html": "00-prolog.html", "mp4": "mp4/00-prolog.mp4", "siap": "cek/siap-00", "audio": "audio/00.m4a", "env": { "SYNC": "1" } },
  { "html": "01-bab.html", "mp4": "mp4/01-bab.mp4", "siap": "cek/siap-01" }
]
```

| Kunci | Arti |
|---|---|
| `html` atau `url` | halaman. `html` dibuka sebagai `file://…?clean=1`; `url` dipakai apa adanya (mis. `http://localhost:8000/x.html?clean=1`) |
| `mp4` | hasil; wajib berakhiran `.mp4` |
| `siap` | opsional: butir menunggu sampai berkas penanda ini ada (mis. dibuat sesudah lembar kontak lolos); dicek tiap 30 dtk (`--poll`) |
| `audio` | opsional: VO. Bawaan: `src` dari `<audio id="vo">` di html. Hanya untuk menilai apakah mp4 sudah basi (VO ikut ditempel oleh `export-frames.mjs`) |
| `env` | opsional: env tambahan untuk `export-frames.mjs` (`SYNC`, `FPS`, `MODE`, …), menimpa env proses |

Tanpa JSON: `node "<folder skill>/scripts/antre-render.mjs" bab1.html bab2.html --keluar mp4` (satu butir per argumen, mp4 = `<keluar>/<nama>.mp4`).
Env proses ikut ke semua butir. Opsi lain: `--gabung <mp4>`, `--log <berkas>`, `--lapor <dtk>` (jarak baris kemajuan, 60), `--poll <dtk>`,
`--tanpa-tahan-sleep`; lengkapnya `--help`.

Jalankan sebagai proses TERLEPAS: perintah latar milik agen bisa ikut mati bila aplikasi agennya di-restart atau
percakapannya diarsipkan.

- PowerShell: `$env:FPS='30'; $env:SYNC='1'; $env:PRESET='ultrafast'; Start-Process node -ArgumentList '"<folder skill>/scripts/antre-render.mjs" antrean.json --gabung final.mp4' -RedirectStandardOutput antre.out -RedirectStandardError antre.err -WindowStyle Hidden`
- bash/zsh: `FPS=30 SYNC=1 PRESET=ultrafast nohup node "<folder skill>/scripts/antre-render.mjs" antrean.json --gabung final.mp4 > antre.out 2>&1 &`

Layar dan `antre-render.log` memuat baris yang sama (baris pertama memuat pid). Pantau salah satunya; `[selesai]` di baris akhir =
semua jadi, `GAGAL` = ada butir yang gagal:

```
12:26:52 [tahan-sleep] aktif (powershell.exe, pid 12208)
12:26:57 [render] bab1 (1/2) env SYNC=0
12:27:38   23 frame @ 15 fps (1.5s, 320x180, jpeg, 2 worker)
12:27:53   bab1  15/23 (65%)  1.04 fps  butir: sisa 8 dtk  antrean: sisa 39 dtk, selesai ±12:28
12:27:54 [ok] bab1  23 frame dalam 56 dtk (1.55 fps)  video 2 dtk, 0.1 MB 1/2
12:28:44 [gabung] durasi 3.58 dtk (4 dtk), ukuran 0.3 MB; cocok dengan jumlah butir (3.53 dtk)
12:28:44 [tahan-sleep] dilepas
12:28:44 [selesai] 2 dirender, 0 dilewati
```

- **Melanjutkan.** Menjalankan ulang perintah yang sama = melanjutkan. Butir dilewati bila mp4-nya ada, terbaca ffprobe, dan
  strik lebih baru dari html dan audionya (seperti `-nt` di bash). Mengubah env (`FPS` dll.) tidak terdeteksi: hapus mp4-nya.
  Hasil ditulis ke `<nama>.sementara.mp4` lalu diganti nama setelah `export-frames.mjs` sukses, jadi mp4 setengah jadi tidak
  pernah dianggap selesai.
- **Gagal.** Butir yang gagal dicatat (`[GAGAL]`), antrean jalan terus, kode keluar 1, gabungan ditunda. Perbaiki lalu jalankan
  ulang: hanya butir gagal yang dirender. Butir menunggu penandanya sesuai urutan, tetapi butir yang mp4-nya sudah jadi tidak menunggu.
- **Perkiraan selesai.** `butir` dari laju butir itu; `antrean` memakai laju seluruh jalan ini, dan panjang butir yang belum jalan
  dikira dari durasi audionya × FPS, atau rata-rata butir yang sudah terlihat. Waktu menunggu penanda, peluncuran Chrome (±1 menit
  per butir), dan penyambungan akhir tidak dihitung, jadi jam selesai selalu sedikit lebih awal dari kenyataan.
- **Gabung.** `--gabung`: ffmpeg `concat -c copy` + `+faststart`, ringkasan ffprobe (durasi, ukuran), dan pemeriksaan terhadap jumlah
  durasi butir. Dilewati bila gabungan sudah lebih baru dari semua butir.
- **Penahan sleep bawaan.** Hidup selama antrean bekerja (termasuk menunggu penanda), mati di semua jalan keluar: selesai, gagal, galat,
  Ctrl+C. Windows: powershell tersembunyi yang memanggil `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` dan berhenti
  sendiri bila antrean mati; macOS: `caffeinate -i -w <pid>`; Linux: `systemd-inhibit` (tanpa itu: peringatan, atur sleep sendiri).
  Setelan daya tidak diubah. Menutup lid atau memilih Sleep sendiri tetap menidurkan laptop. `--tanpa-tahan-sleep` mematikannya.
- **Menghentikan.** Ctrl+C di konsol yang terlihat menghentikan semuanya (Chrome dan ffmpeg anak ikut mati, sisa sementara dibuang).
  Proses terlepas: Windows `taskkill /PID <pid> /T /F`, macOS/Linux `kill <pid>`. `Stop-Process` biasa meninggalkan Chrome-nya.
  Satu antrean pada satu waktu.

## Mode WebCodecs (eksperimental)

Untuk halaman yang SELURUH frame-nya satu kanvas (shader WebGL, three.js, Canvas 2D dengan teks digambar ke kanvas). Bukan untuk
halaman DOM/SVG/CSS: lapisan itu tidak ikut. Halaman men-encode sendiri frame-nya (`VideoFrame` dari kanvas → `VideoEncoder` →
H.264 di dalam halaman), tanpa screenshot; potongan H.264 dialirkan ke ffmpeg (`-f h264 -c copy`), dan audio `#vo` ditempel seperti biasa.

```bash
MODE=webcodecs MP4=out.mp4 node "<folder skill>/scripts/export-frames.mjs"     # atau "env": { "MODE": "webcodecs" } di antrean
```

**Kait di halaman** (didokumentasikan juga di kepala `export-frames.mjs`): `window.OPENER.canvas` = elemen `<canvas>` atau
`OffscreenCanvas`, atau fungsi yang mengembalikannya.

```js
window.OPENER = { W: 1920, H: 1080, DURATION: 120, ready: true, tl, seek, syncSeek: true, canvas: document.getElementById('c') };
```

- Begitu `seek(t)` selesai (dan 2×rAF, kecuali `syncSeek`/`SYNC=1`), kanvas harus sudah berisi frame utuh dan opak (isi latarnya: alfa dibuang).
- Lebar dan tinggi kanvas genap. Keluaran berukuran kanvas, bukan `OPENER.W/H` (`SCALE` tidak berlaku).
- Kanvas tidak boleh "tainted" (gambar lintas-origin membuat `VideoFrame` galat). Kanvas WebGL: `preserveDrawingBuffer: true`, atau
  gambar di dalam `seek()` bersama `syncSeek: true`.
- Halaman harus konteks aman: `file://` atau `http://localhost` (di `about:blank` atau `http://` biasa `VideoEncoder` tidak ada).
- Tanpa kait, tanpa `MP4=`, tanpa `VideoEncoder`, atau config ditolak: pesan `MODE=webcodecs dilewati — <alasan>`, lalu jalur biasa.

Yang dipakai: `prefer-software` (H.264 High, level dari ukuran × fps, Annex B), keyframe tiap 2 dtk, bitrate 0,2 bit/piksel/frame (≈ 12 Mbps pada
1080p30; `BITRATE=<bit/dtk>` menimpa). `prefer-hardware` sengaja tidak dipakai: macet setelah 8 potongan di headless. Antrean encoder
yang tidak turun 15 dtk dianggap macet; satu blok (2 dtk) yang gagal diulang utuh setelah Chrome dibuka ulang. Ke ffmpeg masuk `-r <fps>`, bukan
`-framerate`: Chrome menulis timing VUI sendiri (1e6/66667 untuk 15 fps) yang menimpa `-framerate` dan membuat durasi melayang.

Diverifikasi pada halaman uji `evals/bukti/2026-11-03-ekspor/kanvas-mini.html` (640×360, 15 fps, 6 dtk, 2 worker, GOP + sambungan worker):
MP4 terdekode ffmpeg tanpa galat, 90 frame dan durasi 6,000000 dtk persis, nomor frame (10 bit di baris bawah) terbaca 0…89 berurutan, warna
8 batang murni ±2 dari nilai teoretis (BT.709 terlabel), selisih rata-rata terhadap PNG jalur biasa 1,0–1,7 level, dengan VO durasi
video dan audio sama. Pemeriksa: `evals/bukti/2026-11-03-ekspor/periksa-kanvas.mjs`.

Belum diukur: kecepatan di 1080p dan efek `WORKERS=2` (encoder OpenH264 memakan CPU juga; coba `WORKERS=1` dan `2` pada satu babak pendek).
Belum dipicu sungguhan: jalur macet dan ulang-blok (memakai pemulihan yang sama dengan jalur biasa), serta halaman WebGL/three.js sungguhan (yang diuji kanvas 2D kecil).
Riset awal: 81 ms/frame di HD 4000 pada satu worker (60 mnt ±2,4 jam). Kualitas dibatasi bitrate; untuk master kritis tetap jalur biasa.

## Alat untuk mengembangkan SKILL ini (dari akar repo skill)

| Alat | Perintah | Untuk apa |
|---|---|---|
| Build starter | `node scripts/build-starters.mjs [--check]` | menyisipkan `src/runtime/*.js` ke starter; `--check` menggagalkan CI bila menyimpang |
| Uji starter | `node scripts/test-starters.mjs` | uji asap di browser: loop mengulang, kontrak `OPENER`, `seek()` idempoten, error JS |
| Versi | `node scripts/bump-version.mjs <versi>` / `--check` | menyetel versi di 12 tempat sekaligus |
| Eval | `node scripts/eval-run.mjs <folder-hasil> [--snap]` | menjalankan brief baku di `evals/briefs/`, lint + potret, lalu menulis kartu nilai |
| Anggaran konteks | `node scripts/context-budget.mjs` | berapa besar yang harus dibaca agen per jalur pekerjaan |
| Bridge AE | `scripts/ae/bridge/aset-svg.py`, `svg2png.cjs`, `rig-tokoh.py` | aset SVG→PNG 2× dan rig karakter untuk `references/ae-bridge-higgsfield.md` |
| Uji VO Gemini | `node --test scripts/test-vo.mjs` | uji `vo-gemini.mjs` tanpa jaringan dan tanpa kunci (fetch, jam, dan tidur palsu); bagian dari `rilis.mjs` dan CI |
| Uji pustaka aset | `node --test scripts/test-pustaka.mjs` | uji `src/runtime/pustaka.js` tanpa browser: determinisme, opsi salah ditolak, SVG well-formed; bagian dari `rilis.mjs` dan CI |
| Uji mata elang | `node --test scripts/test-elang.mjs` | matematika `terbang()` (Catmull-Rom, look-ahead, roll, guncang trauma) tanpa browser; bagian dari `rilis.mjs` dan CI |
| Uji rig tokoh | `node --test scripts/test-tokoh.mjs` | uji `src/runtime/tokoh.js` tanpa browser: IK, determinisme dan campuran pose, telapak tanpa selip, kerumunan ber-seed, SVG well-formed; bagian dari `rilis.mjs` dan CI |
| Uji lukis | `node --test scripts/test-lukis.mjs` | uji `src/runtime/lukis.js` tanpa browser: kenop, antrean lukis, siklus pose; bagian dari `rilis.mjs` dan CI |
| Uji relief hidup | `node --test scripts/test-relief.mjs` | uji `src/runtime/relief-hidup.js` tanpa browser: peta normal + AO dari larik tinggi, lapis, redaman lampu, pose bagian hidup; `pustaka.dindingRelief` deterministik dan menolak opsi salah; bagian dari `rilis.mjs` dan CI |
| Uji ekspor panjang | `node --test scripts/test-ekspor.mjs` | uji `antre-render.mjs` dan `ekspor-inti.mjs` (WORKERS standar, level WebCodecs) tanpa Chrome dan tanpa ffmpeg: urai antrean, aturan lewati, ETA, perintah penahan sleep per platform (spawn palsu), jalannya antrean; bagian dari `rilis.mjs` dan CI |
| Uji peta relief | `node --test scripts/test-peta.mjs` | `medan()` dan rute peta relief tanpa browser: proyeksi, pantai Natural Earth, puncak = GVP, sungai turun ke laut, panjang busur; bagian dari `rilis.mjs` dan CI |
| Data peta pulau lain | `node scripts/peta-data.mjs <folder-ne> --darat … --laut …` | string pantai + garis 200 m Natural Earth untuk `medan()` (`references/peta-relief.md`) |

## VO Gemini (banyak kunci)

`scripts/vo-gemini.mjs` membuat VO dari **Gemini TTS lewat API resmi Google**. Node ≥ 18, tanpa dependensi, tanpa ffmpeg. VO dari
sumber lain (rekaman sendiri, TTS berbayar) tetap sah; alat ini hanya jalan pintas.

**Peringatan: baca sebelum menambah kunci.**

- Kuota Gemini API dihitung **per proyek Google Cloud, bukan per kunci** ("Rate limits are applied per project, not per API key").
  Kunci yang berasal dari satu proyek berbagi satu kuota, jadi menambah kunci dari proyek yang sama **tidak menambah apa pun**.
  Kuota harian reset tengah malam waktu Pasifik.
- Syarat Google APIs §2(d): "You agree to, and will not attempt to circumvent, such limitations documented with each API."
  Alat ini **bukan cara menggandakan kuota gratis**. Fungsinya ketahanan: kunci yang sah dipakai bergantian bila satu kena
  batas atau bermasalah, kecepatan menyesuaikan batas per menit, dan pekerjaan lanjut sendiri sesudah reset.
- Pakai hanya kunci yang **berhak Anda pakai**: mis. proyek anggota tim yang berbeda (masing-masing dengan izin dan kuotanya),
  atau satu kunci berbayar sebagai cadangan. Membuat proyek atau akun hanya demi menambah kuota gratis berisiko penangguhan akun.
  Batas alat: 10 kunci.
- Sumber: https://developers.google.com/terms · https://ai.google.dev/gemini-api/docs/rate-limits ·
  https://aistudio.google.com/docs/speech-generation

**Pakai** (dari folder proyek; keluaran relatif terhadap folder tempat perintah dijalankan):

```bash
node "<folder skill>/scripts/vo-gemini.mjs" naskah.json                       # → audio/vo/<id>.wav + <id>.json
node "<folder skill>/scripts/vo-gemini.mjs" naskah.json --keluar audio/vo --suara Kore --gaya "hangat, tempo sedang" --paralel 2
node "<folder skill>/scripts/vo-gemini.mjs" --cek-kunci                       # tiap kunci: sah / tidak sah + status istirahat (tanpa kuota TTS)
node "<folder skill>/scripts/vo-gemini.mjs" --daftar-suara                    # suara dari API; bawaan bahasa id-ID
node "<folder skill>/scripts/vo-gemini.mjs" --help
```

`naskah.json` = larik `[{ "id": "p01", "teks": "…", "suara": "Kore", "gaya": "…" }]`. `suara` dan `gaya` opsional dan menimpa
`--suara` / `--gaya`. `id` menjadi nama berkas, jadi hanya huruf, angka, `_ - .` (garis miring atau `..` ditolak). Satu segmen =
satu permintaan, masukan maksimal 8.192 token: pecah per paragraf.

| Opsi | Arti |
|---|---|
| `--keluar <folder>` | folder keluaran (bawaan `audio/vo`) |
| `--model` | bawaan `gemini-3.8-flash-tts`; ada juga `gemini-3.8-flash-lite-tts` dan `gemini-3.1-flash-tts-preview` |
| `--suara` | bawaan `Iapetus` (narator); `Kore` cocok untuk pencerita |
| `--gaya "<teks>"` | gaya per giliran bicara: emosi, tempo, volume (dikirim sebagai `speech_metadata.style`) |
| `--paralel N` | N segmen sekaligus (bawaan 1, maksimal 10; makin besar makin cepat menabrak batas per menit) |
| `--jangan-tunggu` | jangan menunggu reset harian: berhenti dengan kode 2 dan cetak perintah ulang |
| `--kunci <berkas>` | berkas kunci lain (menggantikan berkas bawaan) |
| `--cek-kunci` | periksa tiap kunci lewat `GET /v1beta/models` (tanpa kuota TTS): tersamar, sah atau tidak, dan status istirahat tersimpan |
| `--daftar-suara` | daftar suara dari `GET /v1beta/voices`; `--bahasa` (bawaan `id-ID`, atau `semua`) dan `--cari <kata>` menyaring |

**Kunci.** Maksimal 10, ganda dibuang, dipakai **berurutan** (kunci pertama sampai gagal, bukan bergilir). Sumber, digabung dengan urutan ini:

1. env `GEMINI_API_KEYS` (dipisah koma atau spasi);
2. env `GEMINI_API_KEY`;
3. berkas teks: satu kunci per baris, `#` = komentar. Bawaan `~/.wevai/gemini-kunci.txt` (Windows:
   `C:\Users\<nama>\.wevai\gemini-kunci.txt`), atau `--kunci <berkas>`.

Simpan berkas kunci **di luar repo mana pun** dan jangan pernah di-commit (`.gitignore` repo ini sudah menolak
`gemini-kunci*.txt`). Kunci yang bocor ke repo publik diblokir Google. Alat ini tidak mencetak atau menulis kunci utuh: di
layar `AIza…k3Xy`, dan status istirahat di `~/.wevai/gemini-kunci-status.json` hanya memuat 12 heks pertama sha256 kunci.

**Pindah kunci, istirahat, reset** (semuanya otomatis):

| Kejadian | Tindakan |
|---|---|
| 429 per menit | kunci istirahat selama `retryDelay` (bawaan 60 dtk), langsung pindah. Kena lagi sesudah istirahat → minimal 1 menit |
| 429 per hari | kunci istirahat sampai tengah malam Pasifik berikutnya (+1 menit; DST dihitung benar), pindah. `retryDelay` diabaikan: untuk kuota harian Google pernah mengirim "1s" |
| 429 `limit: 0` | model ini tidak termasuk paket kunci itu: kunci dilewati di jalan ini saja (tidak disimpan, karena bergantung pada model), tidak ditunggu. Coba `--model` lain atau kunci berbayar |
| 400/401/403 kunci tidak sah (juga "leaked", ditolak penagihan) | dilewati 24 jam, dilaporkan tersamar; kunci lain meneruskan |
| 5xx atau jaringan putus | ulang pada kunci yang sama setelah 1, 2, 4 dtk, lalu kunci berikutnya. Gagal di semua kunci → segmen itu gagal |
| 200 tanpa audio, ditolak filter konten, atau `status: incomplete` (bisa terpotong) | **gagal segmen**, bukan salah kunci: dicatat, dikerjakan terus, didaftar di akhir |
| semua kunci istirahat | sisa ≤ 15 menit: tidur lalu lanjut. Lebih lama: **menunggu reset harian dan lanjut sendiri** (jam lanjut dicatat dalam waktu lokal; WIB ≈ 15.00 saat PST, ≈ 14.00 saat PDT). Dengan `--jangan-tunggu`: kode keluar 2 + perintah ulang |
| semua kunci tidak sah atau `limit: 0` | berhenti dengan kode 1 dan alasan tiap kunci (tersamar); setelah diperbaiki: `--cek-kunci` |

Alat ini tidak menebak batas per menit; ia mengikuti jawaban Google. Kunci yang kena 429 istirahat, dan bila semua kunci istirahat
alat tidur (dipotong 30 dtk dengan jam dinding dicek ulang, jadi laptop yang sempat tidur tidak membuatnya terlambat bangun).
Status istirahat tersimpan di disk, jadi kunci yang habis hari ini tidak dicoba lagi di jalan berikutnya sebelum waktunya. Selama
laptop tidur tidak ada yang berjalan, termasuk penantian ini: pakai penahan sleep bila ingin lanjut tanpa dijaga.

**Keluaran dan lanjut.** Per segmen: `<id>.wav` (24 kHz mono 16-bit; PCM mentah dibungkus header RIFF) dan `<id>.json`
`{teks, suara, model, gaya, dur}`. `dur` = jumlah sampel ÷ laju sampel, **persis**, tidak pernah taksiran ffprobe. Segmen yang
json-nya cocok (teks, suara, model, gaya) dan wav-nya ada **dilewati**: menjalankan ulang selalu aman dan berarti melanjutkan.
Segmen gagal tidak meninggalkan json, jadi dicoba lagi di jalan berikutnya. Aturan VO tetap: tiap VO utuh dan durasinya persis;
jeda antar-VO diatur saat menyusun linimasa (alat ini tidak menyambung audio).

**Aksen.** Aksen diatur lewat **suara regional**, bukan lewat `--gaya` (dokumen Google menyarankan menghindari perubahan aksen di
gaya). Jalankan `--daftar-suara` (bawaan bahasa `id-ID`; `--bahasa semua --cari <kata>` memperluas), lihat kolom aksen dan
wilayah, lalu pakai isi kolom `id` sebagai `--suara` atau `"suara"` per segmen. Jeda di tengah teks: sisipkan `<short pause>` atau
`<long pause>`; tag dalam bahasa Inggris paling andal.

**Bila Google mengubah API.** Bentuk permintaan ada di `bangunPermintaan()` dan jawaban di `ambilAudio()` (dua fungsi, bagian
"API" `vo-gemini.mjs`); pengenal galat 429 di `klasifikasi()`. Yang dipakai: Interactions API `POST /v1beta/interactions`,
header `x-goog-api-key`, `response_format: {type: "audio"}`, `generation_config.speech_config`, gaya sebagai anotasi
`speech_metadata`. Sesudah mengubah: `node --test scripts/test-vo.mjs`. Catatan: panduan bicara memakai `speech_config`,
sedangkan referensi API menyebut `structured_speech_config`; bila Google menjawab 400 `parameter_unknown`, ganti nama itu di
`bangunPermintaan()`.

## Nilai visual (membaca angkanya)

`scripts/nilai-visual.mjs` menilai bingkai PNG dari `snap.mjs` dengan angka, karena agen tidak bisa menonton video. Ia **saringan, bukan
vonis**: lolos belum berarti bagus, dan mata tetap menilai rasa (`anti-ppt.md` › Kalibrasi rasa). Node ≥ 18, tanpa dependensi, ±0,8 dtk per
bingkai 1080p di laptop produksi.

```bash
node "<folder skill>/scripts/nilai-visual.mjs" shots --sumber '[{"x":512,"y":598},{"x":778,"y":598}]' --subjek 1230,205,540,845
```

`--sumber` = sumber cahaya yang kamu tulis di style brief (piksel bingkai, `r` opsional); `--subjek` = kotak tokoh yang ketat (x,y,w,h). Keduanya
opsional, tetapi kulit sinematik wajib menyatakan sumbernya: itu ukuran yang paling sulit lolos secara kebetulan. Windows PowerShell 5.1 membuang
tanda kutip ganda di dalam JSON; kunci tanpa kutip (`'[{x:512,y:598}]'`) dimaafkan, atau beri nama berkas `.json`. `--keluar nilai.json` menyimpan
laporan mesin, `--json` mencetak hanya JSON. Kode keluar 0 = semua ok, 1 = ada peringatan, 2 = galat (hanya PNG 8 bit tanpa interlace; JPEG:
`ffmpeg -i f.jpg f.png`).

| Ukuran | Ambang | Peringatan berarti |
|---|---|---|
| rentang luminans (p95 − p5, skala L OKLab 0–100) | ≥ 28 | **flat**: belum ada sorot dan bayangan. `sumber()` dan `redup()` (cahaya-2d), `grade()` (pasca) |
| kontras subjek vs cincin (tanpa kotak: tengah vs tepi) | ≥ 10 | subjek menyatu dengan latar: `rim()`, atau pisahkan terang-gelapnya. Nilainya yang terbesar dari selisih rata-rata dan sorot (p95 kotak − median cincin), jadi siluet ber-rim tetap lolos |
| titik terang dekat tiap sumber | ≥ median + 30 | sumber tidak bersinar, atau koordinatnya meleset: naikkan inti dan pendar, bloom/halation |
| warna dominan (≥ 5 % bingkai) | 2–6 | 1 = monoton; > 6 = palet tidak serempak: satukan lewat `grade()` atau tint per adegan |

Cara membaca:

- Ambang adalah hasil kalibrasi dengan bingkai nyata (`evals/bukti/2026-11-03-nilai-visual/`): acuan sinematik rentang 36–41, titik terang
  +66…+71, 3–4 warna; acuan datar rentang 4–19, titik terang ≤ +11, 1–2 warna. **Jangan menurunkan ambang agar hijau; perbaiki bingkainya.**
  Flat yang dipilih sadar (kulit A, flat cerah) cukup ditulis di pesan penutup.
- Ukuran titik terang dibuat untuk adegan gelap atau menengah. Di bingkai terang (median > 70) sumber nyaris mustahil ≥ +30, jadi peringatan di
  sana harus dilihat dengan mata.
- Shot yang bergerak (mata elang): sumber berpindah. Jalankan tanpa `--sumber`, atau per bingkai dengan koordinat bingkai itu.
- Batas: blok warna rata yang berentang lebar (mis. adegan rak gelap di kartun panggung) lolos ukuran 1, 2, dan 4. Hanya ukuran titik terang yang
  menjaganya, karena itu sumber cahaya wajib dideklarasikan pada kulit sinematik.
- Uji alat: `node --test scripts/test-nilai.mjs` (PNG sintetis, tanpa browser; bagian dari `rilis.mjs` dan CI).
