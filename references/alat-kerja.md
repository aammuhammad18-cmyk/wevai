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
| Export MP4 | `node "<folder skill>/scripts/export-frames.mjs"` dengan env `MP4=out.mp4` | render frame-by-frame langsung ke MP4, ukuran dari `OPENER.W/H`, audio `#vo` ikut. Lebih cepat: `FPS=30` (separuh frame), `SYNC=1` (halaman yang `seek` menggambar sinkron — tanpa kanvas rAF/klip); `WORKERS=2` untuk video panjang — terukur ±2× di laptop 2 core (60 mnt: ±8,6 → ±4 jam); lebih dari 2 hanya bila core/GPU longgar. Master kritis: `FORMAT=png`. Tanpa `MP4=`: folder PNG + perintah ffmpeg |
| Jeda VO | buka `scripts/vo-pauses.html` di browser | `SEG`/`PARA`/`DUR` untuk sinkron VO tanpa ffmpeg |
| Kunci CDN | `node "<folder skill>/scripts/cdn-integrity.mjs" index.html` | memasang `integrity="sha384-…"` pada `<script src>` CDN supaya browser menolak berkas yang isinya berubah (import map Three tidak bisa) |
| Arsip mandiri | `node "<folder skill>/scripts/vendor-libs.mjs"` | menanam GSAP + font ke dalam berkas supaya tetap bisa diputar offline bertahun-tahun (jalur WebGL tetap butuh internet) |
| Dev server | `python "<folder skill>/scripts/serve.py"` | hanya bila mengedit dengan module JS lokal |
| Ekspresi kepala | `python "<folder skill>/scripts/kepala-ekspresi.py" kepala.png` | varian senang/cemas/kaget + kedip untuk kartun panggung |

Skrip yang merender, membuka Chrome, menulis berkas, atau memakai jaringan (`snap`, `export-frames`,
`bench-frame`, `test-starters`, `eval-run`, `build-starters`, `vendor-libs`, `ae/bridge/svg2png.cjs`,
`ae/bridge/aset-svg.py`) menjawab `--help` atau `-h` dengan komentar kepalanya lalu keluar 0, tanpa
melakukan apa pun. Aman dijalankan lebih dulu untuk melihat pemakaian dan env-nya.

## Render panjang (lebih dari ±10 menit)

Render 60 menit memakan ±4–8,6 jam. Perintah latar milik agen bisa ikut mati bila aplikasi agennya
di-restart atau percakapannya diarsipkan, jadi jalankan sebagai proses TERLEPAS yang menulis log,
lalu pantau lognya (baris `selesai — …` di akhir = berhasil):

- PowerShell: `$env:MP4='out.mp4'; Start-Process node -ArgumentList '"<folder skill>/scripts/export-frames.mjs"' -RedirectStandardOutput render.log -RedirectStandardError render.err -WindowStyle Hidden`
- bash/zsh: `MP4=out.mp4 nohup node "<folder skill>/scripts/export-frames.mjs" > render.log 2>&1 &`

Jaga laptop tidak sleep selama render, atau prosesnya ikut tertidur: Windows, atur Daya ke "tidak
pernah tidur" saat dicolok (atau PowerToys Awake); macOS, `caffeinate -i`; Linux, `systemd-inhibit`.
Jangan menganggap perintah latar agen cukup untuk menahan sleep.

## Alat untuk mengembangkan SKILL ini (dari akar repo skill)

| Alat | Perintah | Untuk apa |
|---|---|---|
| Build starter | `node scripts/build-starters.mjs [--check]` | menyisipkan `src/runtime/*.js` ke starter; `--check` menggagalkan CI bila menyimpang |
| Uji starter | `node scripts/test-starters.mjs` | uji asap di browser: loop mengulang, kontrak `OPENER`, `seek()` idempoten, error JS |
| Versi | `node scripts/bump-version.mjs <versi>` / `--check` | menyetel versi di 12 tempat sekaligus |
| Eval | `node scripts/eval-run.mjs <folder-hasil> [--snap]` | menjalankan brief baku di `evals/briefs/`, lint + potret, lalu menulis kartu nilai |
| Anggaran konteks | `node scripts/context-budget.mjs` | berapa besar yang harus dibaca agen per jalur pekerjaan |
| Bridge AE | `scripts/ae/bridge/aset-svg.py`, `svg2png.cjs`, `rig-tokoh.py` | aset SVG→PNG 2× dan rig karakter untuk `references/ae-bridge-higgsfield.md` |