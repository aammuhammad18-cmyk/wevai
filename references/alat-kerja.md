# Alat kerja — pasang, jalankan, dan apa yang bisa dilewati

Tidak satu pun dari ini dibutuhkan untuk MENONTON hasil: deliverable tetap satu
`index.html` yang diklik dua kali. Yang di sini hanya mempercepat pembuatan dan
verifikasi. Dibaca saat butuh memasang alat, bukan di setiap proyek.

Deliverable (`index.html`) hanya butuh browser modern + internet untuk CDN
(GSAP, font). Python dan Node **opsional**, dipakai hanya untuk alat kerja:
`scripts/serve.py` (server no-cache, cuma perlu bila memakai module lokal),
puppeteer (snapshot/verifikasi otomatis, `scripts/export-frames.mjs` → MP4) —
dipasang sekali dengan `npm install` DI FOLDER `scripts/` skill (Node mencari
paket dari lokasi skrip, bukan dari folder proyek), lalu skrip dijalankan dari
folder proyek. Sudah ada Chrome/Edge: `PUPPETEER_SKIP_DOWNLOAD=1 npm install` +
env `PUPPETEER_EXECUTABLE_PATH`.
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
| Export MP4 | `MP4=out.mp4` → export-frames.mjs mengalirkan frame langsung ke ffmpeg (audio `#vo` ikut); tanpa `MP4=` ia menulis PNG dan mencetak perintah ffmpeg | tidak ada MP4 — tawarkan instal satu perintah (`winget install Gyan.FFmpeg` / `brew install ffmpeg`) atau rekam layar |
| Mempelajari video referensi (ekstrak frame) | `fps=` + `tile=` | minta user mengirim screenshot di detik kunci, atau buka videonya di browser dan potret pada detik tertentu |

Tanpa ffmpeg alur explainer tetap lengkap sampai sinkron VO; hanya MP4 yang
butuh instalasi.

## Memasang (sekali)

```bash
cd <folder skill>/scripts && npm install        # puppeteer untuk snap/export/uji
# sudah punya Chrome/Edge:
#   PUPPETEER_SKIP_DOWNLOAD=1 npm install
#   lalu set PUPPETEER_EXECUTABLE_PATH ke chrome.exe/msedge.exe saat menjalankan
```

Node mencari paket dari lokasi SKRIP, bukan dari folder tempat perintah dijalankan —
karena itu `npm install` harus di `scripts/`, sedangkan skripnya dijalankan dari folder
proyek supaya `index.html` ketemu.

## Alat untuk membuat video (dijalankan dari folder proyek)

| Alat | Perintah | Untuk apa |
|---|---|---|
| Lint | `node <skill>/scripts/lint-motion.mjs` | aturan yang bisa diukur dari kode; FAIL = perbaiki sebelum menyerahkan. Tanpa dependensi |
| Snapshot | `node <skill>/scripts/snap.mjs shots 1 3.5 8` | potret detik kunci + `shots/kontak.png` (lembar kontak berlabel detik) untuk dinilai sekali lihat; `--tanpa-sheet` bila tidak perlu |
| Export MP4 | `MP4=out.mp4 node <skill>/scripts/export-frames.mjs` | render frame-by-frame langsung ke MP4, ukuran dari `OPENER.W/H`, audio `#vo` ikut. Lebih cepat: `FPS=30` (separuh frame), `SYNC=1` (halaman yang `seek` menggambar sinkron — tanpa kanvas rAF/klip); `WORKERS=2` hanya di mesin dengan core/GPU longgar. Master kritis: `FORMAT=png`. Tanpa `MP4=`: folder PNG + perintah ffmpeg |
| Jeda VO | buka `scripts/vo-pauses.html` di browser | `SEG`/`PARA`/`DUR` untuk sinkron VO tanpa ffmpeg |
| Kunci CDN | `node <skill>/scripts/cdn-integrity.mjs index.html` | memasang `integrity="sha384-…"` pada `<script src>` CDN supaya browser menolak berkas yang isinya berubah (import map Three tidak bisa) |
| Arsip mandiri | `node <skill>/scripts/vendor-libs.mjs` | menanam GSAP + font ke dalam berkas supaya tetap bisa diputar offline bertahun-tahun (jalur WebGL tetap butuh internet) |
| Dev server | `python <skill>/scripts/serve.py` | hanya bila mengedit dengan module JS lokal |
| Ekspresi kepala | `python <skill>/scripts/kepala-ekspresi.py kepala.png` | varian senang/cemas/kaget + kedip untuk kartun panggung |

## Alat untuk mengembangkan SKILL ini (dari akar repo skill)

| Alat | Perintah | Untuk apa |
|---|---|---|
| Build starter | `node scripts/build-starters.mjs [--check]` | menyisipkan `src/runtime/*.js` ke starter; `--check` menggagalkan CI bila menyimpang |
| Uji starter | `node scripts/test-starters.mjs` | uji asap di browser: loop mengulang, kontrak `OPENER`, `seek()` idempoten, error JS |
| Versi | `node scripts/bump-version.mjs <versi>` / `--check` | menyetel versi di 12 tempat sekaligus |
| Eval | `node scripts/eval-run.mjs <folder-hasil> [--snap]` | menjalankan brief baku di `evals/briefs/`, lint + potret, lalu menulis kartu nilai |
| Anggaran konteks | `node scripts/context-budget.mjs` | berapa besar yang harus dibaca agen per jalur pekerjaan |
| Bridge AE | `scripts/ae/bridge/aset-svg.py`, `svg2png.cjs`, `rig-tokoh.py` | aset SVG→PNG 2× dan rig karakter untuk `references/ae-bridge-higgsfield.md` |
