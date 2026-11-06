# Riset teknologi untuk rancangan WeVai 1.5

Tanggal: 5 Nov 2026 · Pembanding: WeVai 1.4.0 (`8a424b7`) · Mesin acuan: i3-3217U 2 inti/4 thread, HD Graphics 4000, RAM 16 GB, Windows 11.

Dokumen ini melanjutkan `docs/riset-sinematik-kode-2026-11-01.md` (disebut "riset Nov") dan tidak mengulang isinya.

**Tidak ada yang dijalankan.** Render pemilik sedang berjalan, jadi riset ini hanya membaca repo, web, dan kode sumber. Tidak ada Chrome, ffmpeg, atau bench. Semua angka percepatan baru di sini adalah dugaan sampai diukur (§7).

**Penanda keyakinan**

| Tanda | Arti |
|---|---|
| **[F]** | Fakta terverifikasi: saya membaca dokumen resmi, spesifikasi, atau kode sumbernya |
| **[B]** | Bukti terukur di mesin acuan, dari repo (`evals/bukti/…`, riset Nov) |
| **[P]** | Sumber pihak ketiga, belum tentu benar |
| **[D]** | Dugaan atau pendapat saya |

**Keterbatasan sumber**
- `trac.ffmpeg.org` menolak koneksi, jadi wiki QuickSync dan Encode/H.264 tidak terbaca.
- Harga Azure tidak muncul di halamannya. Harga Chirp 3 HD berasal dari cuplikan hasil pencarian halaman resmi.
- Halaman bantuan YouTube dan dokumen Google tidak menulis tanggal revisi; tanggal di sini adalah tanggal baca (5 Nov 2026).
- Kode Chromium dibaca dari cabang `main` (mirror GitHub, 5 Nov 2026). Chrome di mesin acuan 156 dan stable terbaru 158, jadi rincian kecil bisa berbeda.

---

## Ringkasan

1. **Temuan baru terbesar: jalur tangkapan WeVai mungkin memakai cabang lambat tanpa sengaja.** `export-frames.mjs` memberi `clip`, sehingga puppeteer mengirim `captureBeyondViewport: true`. Di Chromium, opsi itu mengubah preferensi web dan menyetel emulasi ukuran 1×1 lalu ukuran asli, untuk tiap frame. HyperFrames mematikannya dan menulis di kodenya bahwa jalur viewport "lebih cepat". Riset Nov menghitung biaya tangkapan ±170–200 ms/frame dengan opsi ini aktif. Mengujinya hanya butuh beberapa baris (§1.1).
2. **Pemulihan masih per babak, bukan per potongan.** Crash di jam ke-5 satu babak membuang seluruh babak itu, karena `seg0.mp4` baru punya moov saat ffmpeg selesai. Potongan tertutup ±30–60 dtk dan antrean kerja menyelesaikan crash, moov hilang, dan beban worker yang timpang sekaligus (§1.5).
3. **Keluaran belum sesuai rekomendasi YouTube di beberapa butir.** Jalur JPEG hampir pasti tidak berlabel BT.709. VO Gemini 24 kHz mono berpotensi lolos apa adanya, dan belum ada normalisasi loudness (§5.3).
4. **Tidak ada alat pembanding yang lebih cepat di Windows.** Remotion dan HyperFrames sama-sama memakai `Page.captureScreenshot` di Windows. Yang layak ditiru adalah tata kelola render, bukan mesinnya (§2).
5. **Dua tenggat Gemini:** model `gemini-3.1-flash-tts-preview` (masih disebut di `alat-kerja.md`) bisa dimatikan paling cepat 17 Nov 2026, dan harga model 3.8 berlipat dua mulai 1 Jan 2027 (§4.5).
6. **Tidak layak dikejar untuk mesin ini:** WebGPU, Rive, Remotion sebagai mesin, QSV, dan `startScreencast`. Alasannya di bagian masing-masing.

---

## 0. Yang sudah ada, supaya tidak diusulkan ulang

Dibaca dari `scripts/export-frames.mjs`, `scripts/ekspor-inti.mjs`, `scripts/antre-render.mjs`, `references/alat-kerja.md`.

| Sudah ada | Catatan |
|---|---|
| `optimizeForSpeed: true`, JPEG q80, pipe ke ffmpeg | Untuk JPEG opsi ini tidak mengubah enkoder: `GetEncoder` di Chromium hanya memakainya untuk PNG dan WebP **[F]** ([page_handler.cc](https://github.com/chromium/chromium/blob/main/content/browser/devtools/protocol/page_handler.cc)) |
| `WORKERS=2` standar, `SYNC=1`, `FPS`, `SCALE`, `PRESET`, `ENCODER` | Pembagian timeline statis: dibelah rata per worker |
| Frame yang gagal diulang pada ffmpeg yang sama sesudah browser dibuka ulang (3×) | Sudah setara perbaikan HyperFrames v0.9.10 (lanjut di frame pertama yang belum tertulis) |
| `tutupBrowser` dan `gantiBrowser` berbatas waktu | Commit `4527c9d`, 5 Nov |
| Antrean per babak, penahan sleep, ETA, gabung `-c copy` + faststart | `antre-render.mjs` |
| `MODE=webcodecs` eksperimental untuk halaman 100 % kanvas | Belum diukur di 1080p dan pada halaman WebGL/three sungguhan |
| Flag dari puppeteer: `--force-color-profile=srgb`, `--disable-hang-monitor`, `--disable-renderer-backgrounding`, `--disable-background-timer-throttling`, `--disable-backgrounding-occluded-windows`, `--disable-ipc-flooding-protection`, `--hide-scrollbars`, `--mute-audio` | Terbaca di `puppeteer-core/lib/puppeteer/node/ChromeLauncher.js` 25.11 **[F]**. Tidak perlu ditambah lagi |
| `bench-frame.mjs` melaporkan renderer GL | **Hanya bench.** `export-frames.mjs` tidak mencatat renderer GL, padahal riset Nov menyarankannya |

Celah keandalan yang terbaca dari kode `export-frames.mjs` **[F]**:
- `spawnSync(FFMPEG, …)` untuk penyambungan tidak punya batas waktu.
- `enc.end()` menunggu `close` tanpa batas waktu.
- `once(ff.stdin, 'drain')` tanpa batas waktu, jadi ffmpeg yang beku menggantung Node tanpa pesan. Inilah kandidat penyebab gejala "proses tidak mati di akhir" **[D]**.

---

## 1. Render dan optimalisasi (prioritas utama)

Keadaan terukur **[B]**: 3,1–4,2 frame/dtk dengan 1 worker dan 5,9–6,4 dengan 2 worker di antrean produksi (`evals/bukti/2026-11-03-ekspor/bukti.txt` §6). Percepatan 2 worker 1,2–1,8× pada halaman uji (§5, §7, §8). Biaya tangkapan ±170–200 ms mendominasi riset Nov, sedangkan render adegan 3D hanya 61–89 ms.

### 1.1 `Page.captureScreenshot`: apa yang sebenarnya terjadi

**Yang dikirim WeVai [F].** `page.screenshot({clip, type:'jpeg', quality, optimizeForSpeed:true})`. Di puppeteer 25.11, `setDefaultScreenshotOptions` menyetel `captureBeyondViewport ??= true`. Nilai itu baru dibalik ke `false` bila tidak ada `clip` dan tidak `fullPage` (`puppeteer-core/lib/puppeteer/api/Page.js` baris 113 dan 1165). Karena WeVai memberi `clip`, yang terkirim adalah `captureBeyondViewport: true`.

**Akibatnya di Chromium [F]** ([`PageHandler::CaptureScreenshot`](https://github.com/chromium/chromium/blob/main/content/browser/devtools/protocol/page_handler.cc), `main`, dibaca 5 Nov 2026). Saat `capture_beyond_viewport` benar, untuk tiap frame:
- preferensi web diubah (`hide_scrollbars`, `record_whole_document = true`) lewat `SetWebPreferences`;
- `SetDeviceEmulationParams` dipanggil dengan ukuran sementara **1×1**, sebagai "walkaround" bug, lalu dipanggil lagi dengan parameter sebenarnya;
- `GetView()->SetSize(...)` menyetel ukuran tampilan;
- sesudah ditangkap, ukuran, emulasi, dan preferensi web dikembalikan di `ScreenshotCaptured`.

Saat `clip` ada, atau emulasi aktif (`page.setViewport` memang mengaktifkannya), penyetelan emulasi dan `SetSize` tetap terjadi, hanya tanpa langkah preferensi dan 1×1.

**Pembanding [F].** HyperFrames, jalur Windows dan macOS ([`screenshotService.ts`](https://github.com/heygen-com/hyperframes/blob/main/packages/engine/src/services/screenshotService.ts), `main`): `captureBeyondViewport: options.captureBeyondViewport ?? false`, dengan komentar "Use Chrome's faster viewport-bound screenshot path by default". Mereka mengaktifkannya hanya untuk kasus `<video>` yang melewati tinggi viewport (#1094), dan mencatat jalur itu pernah menghasilkan konten ganda di SwiftShader (#2550). Remotion justru tetap memakai `captureBeyondViewport: true` ([`screenshot-task.ts`](https://github.com/remotion-dev/remotion/blob/main/packages/renderer/src/screenshot-task.ts)).

**Berapa ruginya: belum diketahui.** Bahwa panggilan-panggilan itu terjadi adalah fakta. Bahwa biayanya besar adalah dugaan: perubahan ukuran bisa memicu layout atau raster ulang per frame **[D]**. Keluhan "selisih latar sesudah raster `will-change`" dan selisih frame antar-worker mungkin berkaitan, tetapi itu dugaan lemah **[D]**.

**Kandidat uji, urut dari termudah:**

| Varian | Perubahan | Sifat |
|---|---|---|
| A | `captureBeyondViewport: false`, `clip` tetap | Satu baris |
| B | CDP langsung `Page.captureScreenshot` tanpa `page.screenshot` | Membuang `evaluate` visualViewport per frame yang muncul di varian A |
| C | Tanpa `clip` dan tanpa emulasi: `defaultViewport: null` + `--window-size=W,H` + `--force-device-scale-factor=1` | Di Chromium, tanpa emulasi dan tanpa clip, penyetelan emulasi dan `SetSize` tidak terjadi **[F]**. Risiko: di headless baru, viewport bisa tidak persis sama dengan ukuran jendela **[D]**, dan `SCALE≠1` perlu jalur lain |

Syarat lolos: hash frame tidak memburuk dibanding jalur sekarang (`bench-frame.mjs` sudah memeriksa determinisme), dan halaman `clip()` video tetap benar.

### 1.2 `chrome-headless-shell` tanpa `beginFrame`

Riset Nov mengukur `beginFrame` lewat shell: 234–331 ms, dibanding Chrome penuh dengan screenshot 259–358 ms. Kesimpulannya "hanya ±10 %, tidak sepadan". **Tetapi perbandingan itu mengubah dua hal sekaligus (biner dan jalur tangkapan), dan jalur pembandingnya memakai `captureBeyondViewport: true`.** Jadi belum diketahui sumbangan masing-masing **[D]**.

- Remotion memakai Headless Shell sebagai bawaan dan menyebutnya lebih cepat untuk render yang dibatasi CPU, dengan catatan Chrome for Testing lebih cocok untuk kerja GPU di Linux **[F]** ([Chrome Mode](https://www.remotion.dev/docs/options/chrome-mode), [Chrome Headless Shell](https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell)).
- Pengujian tanpa ubah kode sudah bisa dilakukan lewat `PUPPETEER_EXECUTABLE_PATH`; argumen ekspor sama. Wajib dipastikan renderer GL-nya tetap ANGLE D3D11, bukan WARP.

### 1.3 `HeadlessExperimental.beginFrame` / BeginFrameControl

- **[F]** Masih ada di protokol yang terpasang (`devtools-protocol/json/browser_protocol.json`, paket puppeteer 25.11): "Requires that the target was created with enabled BeginFrameControl". `enableBeginFrameControl`: "headless shell only, not supported on MacOS yet". Status domain: experimental.
- **[B]** Berjalan di `chrome-headless-shell` 156 di mesin acuan (riset Nov L4). Klaim "dihapus di Chromium 147" dalam [issue HyperFrames #294](https://github.com/heygen-com/hyperframes/issues/294) berasal dari keluaran agen pelapor, bukan pernyataan pengelola, dan bertentangan dengan pengukuran ini.
- **[F]** HyperFrames membatasi `beginframe` hanya untuk Linux + headless shell. Windows dan macOS memakai screenshot ([`browserManager.ts`](https://github.com/heygen-com/hyperframes/blob/main/packages/engine/src/services/browserManager.ts)). Flag-nya: `--deterministic-mode --enable-begin-frame-control --disable-new-content-rendering-timeout --run-all-compositor-stages-before-draw --disable-threaded-animation --disable-threaded-scrolling --disable-checker-imaging --disable-image-animation-resync --enable-surface-synchronization`. Komentar mereka: tanpa BeginFrame sungguhan, `--enable-begin-frame-control` membuat screenshot kosong.
- **[F]** HyperFrames juga menunjukkan risiko kerjanya: "Another frame is pending" saat CPU sibuk (galat diulang dengan jeda), dan [#4584](https://github.com/heygen-com/hyperframes/issues/4584) melaporkan probe BeginFrame kehabisan waktu dengan banyak worker pada satu GPU lalu diam-diam jatuh ke screenshot.

**Vonis [D].** Bukan jalur utama untuk Windows, karena belum ada proyek besar yang memakainya di Windows. Layak dibuka kembali **hanya** bila pengukuran menunjukkan banyak frame statis (§1.8), karena `hasDamage` adalah satu-satunya deteksi frame identik yang dijamin kompositor.

### 1.4 `Page.startScreencast`

**[F]** Di `main`, screencast memakai `DevToolsVideoConsumer` dengan format ARGB (desktop), menerapkan `maxFramesInFlight` (bawaan 3) dan `everyNthFrame`, lalu meng-encode dengan encoder yang sama (`GetEncoder`, `optimize_for_speed = true`). Frame datang sebagai kejadian (`screencastFrame`) dan harus di-ack.

**[D]** Tidak cocok untuk ekspor deterministik: tidak ada ikatan antara `seek(t)` dan frame yang datang, frame muncul menurut keluaran kompositor sehingga adegan statis bisa tanpa frame, dan pengait "frame ini milik t berapa" harus dibuat sendiri (misalnya nomor piksel). Biaya JPEG tetap ada, jadi penghematan paling-paling di salinan GPU. `Page.startScreenRecording` yang baru ada di kode yang sama menerima `frame_rate`, jadi berorientasi rekaman waktu nyata, juga tidak cocok. Tidak disarankan.

### 1.5 Checkpoint: potongan tertutup, antrean kerja, manifes

**Masalah.** Tiap worker menulis satu `seg<k>.mp4`. MP4 biasa menulis moov saat ffmpeg selesai ([`faststart`](https://ffmpeg.org/ffmpeg-formats.html) dan muxer mov **[F]**). Crash, listrik padam, atau ffmpeg yang dibunuh membuat berkas itu tak terbaca, dan yang hilang adalah hitungan jam.

**Pilihan kontainer**

| Pilihan | Sifat sesudah mati mendadak | Sumber |
|---|---|---|
| MP4 biasa (sekarang) | Tanpa moov: tak terbaca, kerja hilang | **[F]** dokumen muxer |
| fMP4 `-movflags +frag_keyframe+empty_moov` | Terbaca sampai fragmen terakhir yang utuh. `faststart` "will not work in various situations such as fragmented output", jadi tetap butuh remux akhir (penyambungan WeVai memang sudah meremux). x264 bawaan keyint 250: fragmen ±8 dtk pada 30 fps | **[F]** [ffmpeg-formats](https://ffmpeg.org/ffmpeg-formats.html); `empty_moov` ada di [`movenc.c`](https://github.com/FFmpeg/FFmpeg/blob/master/libavformat/movenc.c) |
| MKV | Terbaca sampai cluster terakhir. Ada `cluster_time_limit`, `cluster_size_limit`, `reserve_index_space` | **[F]** ffmpeg-formats. Sifat tahan-mati: **[D]** dari sifat format |
| Muxer `segment` | Satu proses ffmpeg, banyak berkas. `segment_time` hanya tepat bila keyframe jatuh di titik potong, jadi perlu `-force_key_frames`. Ada `segment_list`, `reset_timestamps` | **[F]** ffmpeg-formats |
| **Potongan tertutup: satu ffmpeg per ±900–1.800 frame** | Berkas yang sudah selesai selalu utuh, tanpa mengurai berkas setengah jadi | **[D]**, pola yang sama dengan `chunkEncoder` HyperFrames dan penyambungan WeVai sekarang |

**Usulan [D]: potongan tertutup.**
1. Bagi timeline menjadi potongan ±30–60 dtk video. Worker **mengambil potongan berikutnya dari antrean**, bukan dibelah dua di awal.
2. Tiap potongan = `p00042.tmp.mp4` lalu diganti nama sesudah ffmpeg keluar 0 dan jumlah frame cocok.
3. Resume: lewati potongan yang sudah lengkap. Kerugian maksimal per crash = satu potongan per worker, ±5–10 menit kerja pada 3 frame/dtk per worker.
4. Manifes berisi hash HTML dan audio, FPS, W×H, enkoder, kualitas. Menyelesaikan batasan yang tertulis di `alat-kerja.md` ("Mengubah env tidak terdeteksi").
5. Sambungan: tetap `concat -c copy` (sudah terbukti). Tiap potongan diawali keyframe.

Manfaat tambahan: beban worker jadi seimbang. Sekarang, belahan timeline yang ringan selesai lebih dulu lalu workernya menganggur. Ini mungkin menjelaskan sebagian percepatan 2 worker yang hanya 1,2× pada `starter-sinematik` **[D]**.

Checkpoint per frame sebagai PNG/JPEG terpisah tidak disarankan: ±300 KB × 108.000 frame = ±32 GB **[D]**, dan menulis ke disk merebut waktu dari mesin yang sudah terbatas.

### 1.6 Pemulihan sesudah laptop tidur

- **[B]** Riwayat pemilik: Windows tidur 01:47–07:50 pada 26 Okt; Chrome beku sesudah tidur pada uji 4 Nov (commit `4527c9d`).
- **[F]** HyperFrames v0.9.10 ([PR #7096](https://github.com/heygen-com/hyperframes/pull/7096)): menurut PR itu, jam monotonik Node di Windows dan macOS ikut menghitung waktu tidur, jadi tidur disimpulkan dari keterlambatan: pengecekan yang terlambat lebih dari 15 dtk dari jadwalnya berarti proses tertangguhkan, dan seluruh celah dihitung waktu jeda. Batas macet 60 dtk tidak berubah. [PR #7104](https://github.com/heygen-com/hyperframes/pull/7104): resume dari frame pertama yang belum tertulis, maksimal 3 kali per tahap.
- **WeVai**: resume-frame sudah ada. Yang belum: batas waktu untuk sisi ffmpeg (§0), dan pencatatan tidur.
- **[D]** Tambahan penting: sesudah tidur, proses GPU bisa pulih dalam mode perangkat lunak. Render lalu berjalan ×10–30 lebih lambat (riset Nov: WARP 31×, filter dinamis 10×) tanpa galat. Maka catat renderer GL saat tiap browser dibuka, gagal atau peringatkan bila SwiftShader/WARP, dan waspadai bila laju per potongan turun drastis. HyperFrames punya probe serupa (`buildUnverifiedHardwareGpuWarning`) **[F]**.

### 1.7 WebCodecs, Mediabunny, HTML-in-Canvas

- **[B]** Riset Nov: 81 ms/frame di kanvas murni (±3,7× lebih cepat), `prefer-hardware` macet sesudah 8 potongan. WeVai sudah memakai ffmpeg untuk mux, jadi **Mediabunny tidak dibutuhkan** untuk ekspor ini.
- **[F]** Mediabunny 1.65.2, 4 Nov 2026, MPL-2.0 ([npm](https://registry.npmjs.org/mediabunny)). `CanvasSource`, `EncodedVideoPacketSource`, tekanan balik lewat promise ([dok](https://mediabunny.dev/guide/media-sources)). Ia baru relevan bila WeVai mau tombol "render di browser" tanpa Node, seperti `@remotion/web-renderer` (stabil sejak 4.0.491, [dok](https://www.remotion.dev/docs/client-side-rendering/)).
- **Kualitas [F]:** `bitrateMode: 'quantizer'` + `avc.quantizer` per frame (0–51) ada di [registrasi AVC W3C](https://www.w3.org/TR/webcodecs-avc-codec-registration/) (8 Jun 2026). [`openh264_video_encoder.cc`](https://github.com/chromium/chromium/blob/main/media/video/openh264_video_encoder.cc) memuat cabang `Bitrate::Mode::kExternal`. **[D]** Ini berpotensi mengganti bitrate tetap 12 Mbps dengan kualitas tetap; perlu uji.
- **HTML-in-Canvas: satu-satunya jalan yang bisa membawa halaman DOM/SVG ke jalur WebCodecs.**
  - **[F]** API kini `<canvas content="drawable">`, `drawElementImage()`, `texElementSubImage2D`, kejadian `paint`, `requestPaint()`, `captureElementImage()` ([explainer WICG](https://github.com/WICG/html-in-canvas)). Sudah diganti nama pada Chrome 150 dan 155 ([Chrome](https://developer.chrome.com/blog/html-in-canvas-ot-changes)).
  - **[F]** Origin trial diperpanjang sampai Chrome 160. chromestatus: "In development", diperbarui 30 Okt 2026 ([entri](https://chromestatus.com/feature/5172548013916160)). Di `main`, `runtime_enabled_features.json5` menandai `CanvasDrawElement` berstatus `stable`; belum ditemukan Intent to Ship, jadi artinya belum jelas. HyperFrames mengaktifkannya dengan `--enable-features=CanvasDrawElement`; paket transisinya memakai `drawElementImage()` bila tersedia dan `html2canvas` bila tidak ([README](https://github.com/heygen-com/hyperframes/tree/main/packages/shader-transitions)).
  - **[F]** Pembacaan piksel memang diniatkan boleh. Yang dikecualikan: data lintas-origin, warna sistem, dan subpixel AA teks. Explainer tidak merinci filter SVG/CSS.
  - **[D]** Halangan nyata: `drawElementImage` menggambar **snapshot terakhir**, jadi perlu satu rendering update sesudah `seek(t)` (sekitar biaya 2×rAF sekarang). Filter SVG mungkin belum tentu dimainkan ulang dengan benar. API masih berubah. Karena WeVai 100 % bisa memilih versi Chrome, risiko ini bisa dikelola lewat fallback ke jalur biasa, yang sudah ada polanya di `MODE=webcodecs`.
  - **[D]** Bila berhasil: 255–358 → ±100–180 ms/frame untuk halaman DOM/SVG, percepatan terbesar yang mungkin. Peluang keberhasilan sedang ke rendah, jadi cukup spike kecil dulu.

### 1.8 Lewati frame identik

**Kenyataan isi [F]:** `grainHidup()` bergerak 12× per detik (`src/runtime/grain.js`). Pada 30 fps, 18 dari 30 frame berurutan grain-nya sama dengan frame sebelumnya, jadi skip mungkin bila tidak ada lain yang bergerak. Tetapi kamera yang terus bergerak pelan membuat frame tak pernah identik. **Ukur dulu sebelum membangun apa pun:** jalankan `mpdecimate` pada MP4 yang sudah jadi (M6, §7).

| Cara | Menghemat tangkapan? | Catatan |
|---|---|---|
| Hash sesudah ditangkap | Tidak | Tidak berguna: yang mahal justru tangkapannya |
| Encoder (P-skip x264) | Tidak | Sudah otomatis; hanya menghemat bit |
| Interval aktivitas dari `tl` (`getChildren`), dinyatakan halaman lewat `OPENER` | Ya | Tanpa API eksperimental. Rapuh: kanvas dan `onUpdate` di luar tween harus ikut dinyatakan **[D]** |
| `beginFrame` tanpa screenshot → `hasDamage` | Ya | Pola `lastFrameCache` HyperFrames ([kode](https://github.com/heygen-com/hyperframes/blob/main/packages/engine/src/services/screenshotService.ts)) **[F]**. Hanya shell, belum ada preseden Windows |

**[D]** Pertimbangkan juga grain di encoder (`noise=alls=…:allf=t+u:all_seed=…`, [dok](https://ffmpeg.org/ffmpeg-filters.html) **[F]**) untuk video panjang. Ia melepas lapisan `mix-blend-mode` layar penuh dari kompositor dan membuat frame jadi benar-benar identik saat kamera diam. Tukarannya: pratinjau berbeda dari ekspor, dan butir harus diuji terhadap transkode YouTube. Biaya lapisan grain perlu diukur (M5).

### 1.9 Enkoder: x264, QSV, Media Foundation

**x264 [F]** ([`common/base.c`](https://github.com/mirror/x264/blob/master/common/base.c)). `ultrafast` mematikan CABAC, B-frame, deblocking, 8×8, AQ, mb-tree, dan subpel. Tune yang ada: `film animation grain stillimage psnr ssim fastdecode zerolatency`.

- `PRESET=ultrafast` dipakai pemilik. **[D]** Keluarannya jadi profil Constrained Baseline, dan butuh bitrate lebih tinggi untuk mutu yang sama. Satu video produksi: 6,2 GB / 5.362 dtk = ±9–10 Mbps, di atas rekomendasi 8 Mbps YouTube, jadi cukup. Masalahnya hanya ukuran unggahan.
- `-tune animation` menambah 2 B-frame dan memperkuat deblock, `stillimage` mengubah psy dan deblock (deblock mati di `ultrafast`). Tune menambah biaya, jadi tidak diusulkan **[D]**.
- **[D]** Yang layak diuji: `-threads 2` per worker agar x264 tidak merebut inti raster, dan `superfast` vs `ultrafast` (ukuran vs waktu).

**QuickSync di HD 4000.**
- **[F]** Intel ARK: i3-3217U punya Quick Sync, tetapi "End of Servicing Lifetime" dengan pembaruan terakhir 31 Des 2019 ([Intel](https://www.intel.com/content/www/us/en/products/sku/65697/intel-core-i33217u-processor-3m-cache-1-80-ghz/specifications.html)).
- **[F]** Media SDK tidak dikembangkan lagi, pembaruan terakhir 1.35 ([Intel, 2023](https://www.intel.com/content/www/us/en/docs/onevpl/upgrade-from-msdk/2023-1/transition-from-intel-r-media-sdk-to-intel-r.html); [repo](https://github.com/intel-media-sdk/mediasdk)). Build Gyan diperbarui ke libvpl pada seri 6.0 ([Gyan](https://www.gyan.dev/ffmpeg/builds/)).
- **[P]** Laporan pengguna: ffmpeg 6 di Haswell gagal "MFX session -9" sedangkan 5.1.2 jalan ([tiket #10377](https://fftrac-bg.ffmpeg.org/ticket/10377)). Ivy Bridge punya masalah lama dengan versi API minimum ([tiket #4831](https://fftrac-bg.ffmpeg.org/ticket/4831)).
- **[D]** `ENCODER=h264_qsv` kemungkinan gagal dengan ffmpeg pemilik (nightly N-124841). Bahkan bila jalan, enkoder ini hanya untuk H.264 dan berbagi memori dengan GPU yang sedang raster. Keuntungannya hanya CPU encode, yang pada `ultrafast` sudah kecil. Bukan prioritas; cukup satu perintah uji.
- **[F]** `h264_mf -hw_encoding 1` (Media Foundation) ada di [dokumen ffmpeg](https://ffmpeg.org/ffmpeg-codecs.html). Satu perintah uji bersamaan dengan QSV. Bandingkan dengan temuan WebCodecs `prefer-hardware` yang macet di mesin ini.

### 1.10 Flag Chrome yang belum dicoba

Tidak ada bukti angka; masuk matriks bench.

| Flag | Asal | Harapan [D] |
|---|---|---|
| `--disable-frame-rate-limit`, `--disable-gpu-vsync` | `components/viz/common/switches.cc`, `ui/gl/gl_switches.cc` **[F]** | 2×rAF dan ForceRedraw tidak menunggu vsync. Halaman non-`SYNC`: hingga ±33 ms/frame |
| `--force-gpu-mem-available-mb=4096` | Remotion `open-browser.ts` **[F]** | Anggaran tile lebih besar di iGPU; lapisan `will-change` tidak diusir dan diraster ulang |
| `--use-angle=d3d11 --enable-gpu-rasterization` | HyperFrames, win32 mode GPU perangkat keras **[F]** | Menegaskan jalur, mencegah pilihan lain |
| `--disable-checker-imaging` | HyperFrames (hanya BeginFrame) **[F]** | Dekode gambar sinkron; lebih deterministik |
| `--font-render-hinting=none` | Remotion, HyperFrames **[F]** | Layout teks konsisten; bukan soal kecepatan |
| puppeteer `pipe: true` | `puppeteer-core/lib/puppeteer/node/LaunchOptions.d.ts` **[F]**: pipa, bukan WebSocket. WebSocket-nya sudah `perMessageDeflate: false` **[F]** | Sedikit lebih cepat untuk base64 ±400 KB per frame |

### 1.11 Render terdistribusi per segmen

- **Lambda/Cloud Run** ada di Remotion dan HyperFrames **[F]**. Tidak relevan untuk pemilik: biaya, dan aset lokal.
- **Laptop kedua [D]:** dimungkinkan begitu ada potongan dan manifes. Risiko: filter SVG boleh berubah resolusi di platform terbatas, dan riset Nov menyarankan ekspor satu mesin. Sambung di batas adegan, jangan di tengah shot. Prioritas rendah.

### 1.12 Keputusan murah di luar kode

- **FPS 24 untuk dokumenter [D].** Hemat 20 % frame: 108.000 → 86.400 pada 60 menit, dan selaras tampilan sinema. YouTube mendukungnya ([rekomendasi](https://support.google.com/youtube/answer/1722171?hl=en) **[F]**). Risiko: pan pelan bisa tampak patah. Uji satu babak.
- **Render draf [D].** `SCALE=.5 FPS=12` dengan VO sudah bisa hari ini. Tambahkan satu pintasan `DRAF=1` dan dokumentasinya. Menonton draf sebelum render final mencegah kehilangan jam.
- **Re-render selektif [D], ditiru dari Manim.** Manim menghitung hash tiap `play` dan memakai ulang potongan video yang hash-nya sama ([deep dive](https://github.com/ManimCommunity/manim/blob/main/docs/source/guides/deep_dive.rst) **[F]**). Di WeVai: bila HTML berubah, render ulang sampel frame per potongan dan bandingkan hash; yang sama dipakai ulang. Lemah bila perubahan menggeser waktu (mis. VO diganti), dan bisa salah pakai ulang bila perubahan jatuh di antara sampel. Maka perlu `--paksa`, dan butuh potongan (§1.5) lebih dulu.

---

## 2. Pembanding

Versi dan tanggal dari registry npm dan PyPI (5 Nov 2026) **[F]**.

| Alat | Versi / terakhir | Lisensi | Arsitektur render | Audio / subtitle |
|---|---|---|---|---|
| **Remotion** | 4.0.540, 2 Nov 2026 | Khusus: gratis untuk individu, nirlaba, dan perusahaan laba ≤ 3 karyawan; lebih dari itu wajib Company License; dilarang menjual atau melisensikan ulang kodenya ([LICENSE](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)) | React + bundler, Chrome per tab, `Page.captureScreenshot` JPEG, encode paralel. Shared-memory capture lewat Chromium 157 tambalan; "On Windows and Intel Macs" tetap JPEG/PNG ([dok](https://www.remotion.dev/docs/shared-memory-capture)) | `<Audio>`, `@remotion/install-whisper-cpp` (MIT), `toCaptions` ([dok](https://www.remotion.dev/docs/install-whisper-cpp/)) |
| **HyperFrames** (HeyGen) | 0.9.13, 4 Nov 2026 | Apache-2.0, tanpa biaya per render | HTML polos + atribut data, tanpa build; `beginFrame` di Linux, screenshot di Windows/macOS; `parallelCoordinator`, `chunkEncoder`, `streamingEncoder` ([engine](https://github.com/heygen-com/hyperframes/tree/main/packages/engine)) | `audioMixer` lewat ffmpeg dari `<audio>` beratribut waktu dan volume |
| **Motion Canvas** | 3.17.2, 14 Des 2024 (commit terakhir 2 Jul 2026) | MIT | Kanvas di editor; tombol RENDER menyimpan urutan gambar, video diserahkan ke ffmpeg ([dok](https://motioncanvas.io/docs/rendering/)) | Satu audio dengan offset |
| **Revideo** | 0.11.0, 10 Jul 2026 | MIT, telemetri PostHog bisa dimatikan | Turunan Motion Canvas: `renderVideo()` tanpa kepala, paralel per worker ([repo](https://github.com/redotvideo/revideo)). **[P]** Kini mesin produk komersial Midrender | `<Audio/>`, `<Video/>` |
| **editly** | npm 0.14.2 (2022); rc 0.15.0 Jan 2025; commit terakhir Feb 2025 | MIT | **[D]** ffmpeg + kanvas, gl-transitions | **[D]** Campur audio dasar |
| **Manim CE** | 0.22.1, 27 Okt 2026 | MIT | Python: potongan video per `play` + cache hash ([deep dive](https://github.com/ManimCommunity/manim/blob/main/docs/source/guides/deep_dive.rst)) | **[D]** `add_sound`; manim-voiceover pihak ketiga |
| VideoFlow, MotionForge | Baru | **[P]** diklaim terbuka | Pernyataan pemasaran sendiri; belum diperiksa | — |

**Cara kerja deterministik.** Semuanya memakai pola yang sama dengan WeVai: waktu sebagai fungsi murni dari frame. Remotion dan HyperFrames merender frame lewat CDP. HyperFrames bisa memakai kompositor yang dikendalikan BeginFrame. WeVai sudah setara di tingkat kontrak (`OPENER.seek`).

**Layak ditiru**
- Dari HyperFrames (Apache-2.0, boleh dibaca dan diadaptasi dengan atribusi): `captureBeyondViewport: false`; aturan tidur 15 dtk; probe GPU; `doctor`; `render --quality draft`; lint tanpa browser (WeVai sudah punya).
- Dari Remotion: `benchmark` untuk mencari konkurensi terbaik **[F]** ([dok](https://www.remotion.dev/docs/cli/benchmark)); log "frame paling lambat".
- Dari Manim: cache per potongan.

**Tidak layak**
- **Remotion sebagai mesin:** butuh React dan bundler, lisensinya tidak terbuka (masalah bila kelak ada tim lebih dari 3 orang), dan jalur Windows-nya tidak lebih cepat. Telemetri selalu dikirim pada render sisi klien **[F]**.
- **Berpindah ke HyperFrames:** tidak ada keuntungan mesin di Windows. Gaya sinematik, pustaka Jawa, dan kontrak WeVai jauh lebih dalam **[D]**.
- **Motion Canvas / editly:** rilis mandek, dan bukan DOM.
- **Shared-memory Remotion:** butuh Chromium tambalan, dan tidak ada di Windows.

---

## 3. Visual 100 % kode

### 3.1 GSAP

- **[F]** Terbaru 3.15.1, 4 Nov 2026 ([npm](https://registry.npmjs.org/gsap)). WeVai: 3.12.5.
- **[F]** Semua plugin kini ada di paket publik: `SplitText`, `MorphSVGPlugin`, `DrawSVGPlugin`, `MotionPathPlugin`, `CustomEase`, `CustomWiggle`, `CustomBounce`, `Physics2DPlugin`, `InertiaPlugin`, `ScrambleTextPlugin` (daftar [jsDelivr](https://data.jsdelivr.com/v1/packages/npm/gsap@3.15.1?structure=flat)). 3.15 menambah `easeReverse` dan mendepresiasi `yoyoEase`; MorphSVG mendapat fitur `smooth` **[F]** ([rilis](https://github.com/greensock/GSAP), [blog](https://gsap.com/blog/)).
- **[F] Lisensi** ([Standard No Charge](https://gsap.com/standard-license), berlaku 30 Apr 2025, diubah 30 Mei 2025): boleh komersial. Dilarang dipakai dalam alat yang membuat animasi visual tanpa kode **dan** membantu membuat solusi yang menyaingi pembangun animasi visual Webflow. FAQ: "AI-generated code is not a 'Prohibited Use'". Versi baru berarti menerima syarat baru; versi lama tetap dengan syaratnya.
- **[D] Risiko lisensi untuk WeVai rendah**, karena WeVai menghasilkan kode, bukan pembangun visual. Bila kelak ada antarmuka visual tanpa kode, baca ulang; GSAP bisa diganti di tingkat `OPENER`.
- **[D]** Manfaatnya pada rupa, bukan kecepatan: `MorphSVG` (siluet berubah bentuk, wayang), `DrawSVG` (garis peta, sketsa), `CustomWiggle` (getar ber-kurva). Repo kini hampir tidak memakai plugin (`references/explainer.md` satu rujukan). Periksa `yoyoEase` lalu perbarui SRI dan `vendor-libs`. Biaya kecil–sedang. Uji seek pada plugin yang membaca DOM saat setup: `SplitText` wajib sesudah `document.fonts.ready`.

### 3.2 Three.js r187 vs r161

- **[F]** Terbaru r187 (0.187.0, 30 Okt 2026, [npm](https://registry.npmjs.org/three)). WeVai dikunci r161 ("kecuali ada alasan terukur", `docs/rencana-1.4.0.md`).
- **[F]** Yang memengaruhi WeVai bila naik ([Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)): r163 hapus WebGL 1; r182 `PCFSoftShadowMap` usang di `WebGLRenderer`; r183 gamma lama `Sky`/`SkyMesh` dihapus, posisi `RoomEnvironment` berubah, `Clock` usang; r186 uniform `up` pada `Sky` dihapus. r187 memperbaiki penyebut ACES (riset Nov), jadi **warna ikut bergeser**.
- **[F] Perubahan sejak riset Nov:** `postprocessing` 6.39.6 (1 Nov 2026) kini mendukung `three < 0.188`, jadi r187 + pmndrs sudah sah. `three-good-godrays` 0.12.1 tetap `<= 0.182`.
- **[B]** Riset Nov: tidak ada bukti r187 lebih cepat di HD 4000; TSL jatuh ke WebGL2 dan biayanya setara (C4 265 ms vs C2 285 ms).
- **[D]** Tetap r161 untuk seri yang sudah berjalan. Naik sebagai satu proyek hanya bila butuh fitur nyata (mis. `BatchedMesh` untuk vegetasi campuran). Uji di `starter-elang` dengan lembar kontak.

### 3.3 WebGPU dan TSL di HD 4000: tidak relevan

- **[F]** Dawn: backend D3D11 `Core` butuh `D3D_FEATURE_LEVEL_11_1`, `Compatibility` cukup `11_0` ([`PhysicalDeviceD3D11.cpp`](https://github.com/google/dawn/blob/main/src/dawn/native/d3d11/PhysicalDeviceD3D11.cpp)). Compatibility mode dirilis di Chrome 146 ([catatan rilis](https://developer.chrome.com/release-notes/146)).
- **[D]** Ini kemungkinan menjelaskan `requestAdapter() = null` pada riset Nov: HD 4000 tampaknya 11_0, dan uji itu tidak memakai `featureLevel: 'compatibility'`. Kemungkinan lain: daftar blokir Chrome.
- **[D]** Tidak ada alasan mengharapkan percepatan. Biaya terbesar ada di tangkapan, bukan render, dan GPU 2012 ini tetap kecil. Satu baris uji sudah cukup untuk melengkapi catatan (M9). Tidak perlu investasi.

### 3.4 Rive dan Lottie: jangan

- **Rive** (`@rive-app/canvas` 2.49.3, MIT): `.riv` berasal dari editornya, jadi bukan 100 % kode. Ekspor paket gratis "play a Rive splash screen" ([harga](https://rive.app/pricing)) **[F]**.
- **Lottie** (`lottie-web` 5.13.0, Mei 2025; `dotlottie-web` 0.82.1, MIT): JSON bisa ditulis kode, tetapi tidak menambah apa pun di atas SVG + GSAP, dan menambah renderer kedua. **[D]**

### 3.5 Rupa sinematik dan shader ber-seed

Sudah ada: `atmosfer`, `cahaya-2d`, `pasca` (grade, halation, vignette), `lukis`, `lanskap-3d`, `terbang`, `relief-hidup`, `peta-relief`, `wayang`, `diorama`, `tokoh`. Karena itu yang tersisa hanya tambahan kecil **[D]**:

- **Transisi shader berlisensi jelas:** [gl-transitions](https://github.com/gl-transitions/gl-transitions) MIT, kecuali dua BSD **[F]**. Hanya untuk halaman kanvas, kecuali HTML-in-Canvas berhasil (paket transisi HyperFrames memakainya bila ada **[F]**).
- **Gate weave** dan **anamorphic streak** ber-seed: efek kecil yang murah di `pasca`.
- **Hash shader tanpa `sin`.** `fract(sin(dot(...)))` bergantung presisi GPU **[D]**, sehingga pola bisa berbeda antar mesin. Penting bila kelak render lintas mesin.
- **Hindari LYGIA:** Prosperity Public License 3.0.0, nonkomersial dan uji komersial 30 hari ([LICENSE](https://github.com/patriciogonzalezvivo/lygia/blob/main/LICENSE.md)) **[F]**. Channel bermonetisasi butuh lisensi Patron.

### 3.6 Generator SVG prosedural

Semua MIT/ISC, versi npm 5 Nov 2026 **[F]**. Tambahkan hanya bila ada gaya yang memintanya **[D]**.

| Pustaka | Versi | Kegunaan |
|---|---|---|
| `perfect-freehand` | 1.2.3, Feb 2026 | Goresan tangan variabel untuk gaya sketsa dan arsip |
| `d3-delaunay` | 6.0.6, 3 Nov 2026 | Voronoi: retakan batu, sawah, mosaik |
| `opentype.js` | 2.0.0, Mei 2026 | Teks → path; prasyarat teks di jalur kanvas/WebCodecs |
| `roughjs` | 4.6.6, 2023 (stabil) | Garis kasar gaya sketsa |
| `paper` | 0.17.0, 3 Nov 2026 | Boolean path |
| `svg-path-commander` | 2.3.3, Sep 2026 | Olah path |

`flubber` (2018) tidak perlu: gunakan MorphSVG.

---

## 4. Audio dan naskah

### 4.1 Penyelarasan kata

Kebutuhan: naskah sudah diketahui, bahasa Indonesia, CPU AVX tanpa AVX2. Mesin acuan punya AVX **[F]** (Intel ARK). `dur` per segmen sudah persis (`vo-gemini.mjs`).

| Alat | Versi | Lisensi | Temuan | Vonis [D] |
|---|---|---|---|---|
| **Tanpa ML** | — | — | Kalimat ke segmen memakai `dur` + `vo-pauses`/`silencedetect` (sudah ada) | **Mulai di sini.** Cukup untuk SRT kalimat |
| **whisper.cpp** | v1.9.5, 6 Okt 2026 | MIT | AVX, CPU, tiny ±273 MB RAM, base ±388 MB, small ±852 MB, VAD; `--max-len 1` untuk kata, "experimental" ([repo](https://github.com/ggml-org/whisper.cpp)) **[F]** | Bila perlu transkripsi. Melewati naskah, jadi tidak ideal |
| **ffmpeg `whisper`** | Filter sejak ffmpeg 8.0 | — | Butuh `--enable-whisper`; `format=srt/json` ([dok](https://ffmpeg.org/ffmpeg-filters.html), [Changelog](https://github.com/FFmpeg/FFmpeg/blob/master/Changelog)) **[F]**. Build penuh Gyan menyertakannya ([Gyan](https://www.gyan.dev/ffmpeg/builds/)) **[F]**. Build N-124841 pemilik belum diperiksa | Termudah bila sudah ada di build-nya |
| **WhisperX** | 3.8.6, Mei 2026 | BSD-2 | wav2vec2 forced alignment; ada model Indonesia `cahya/wav2vec2-large-xlsr-indonesian` di [`alignment.py`](https://github.com/m-bain/whisperX/blob/main/whisperx/alignment.py) **[F]**. Kata yang karakternya tak ada di kamus model tak dapat waktu **[F]** | **Terbaik untuk kata**: panggil hanya tahap align, berisi naskah + waktu per segmen dari `dur`, tanpa ASR. Tetapi PyTorch ±beberapa GB, jalankan saat mesin senggang |
| **stable-ts** | 2.19.1, Agu 2025 | MIT | `model.align()` naskah ke audio. **Repo diarsipkan, pengembangan dijeda** ([repo](https://github.com/jianfch/stable-ts)) **[F]** | Jangan dijadikan dependensi baru |
| **MFA** | 3.4.3, Okt 2026 | MIT | Berbasis Kaldi; model Indonesia tidak ditemukan dalam penelusuran ini; cek `mfa model download` | Terlalu berat tanpa model Indonesia |

### 4.2 Desain suara prosedural

Belum ada di repo: tidak ada ambience, SFX, atau musik (`references/` dan `scripts/` tanpa `ducking`, `aevalsrc`, dll.) **[F]**.

- **ffmpeg:** `anoisesrc` dengan `seed` dan warna (white, pink, brown, blue, violet, velvet); `aevalsrc` untuk rumus ([dok](https://ffmpeg.org/ffmpeg-filters.html)) **[F]**.
- **Web Audio:** `OfflineAudioContext` (Editor's Draft 4 Nov 2026, [spesifikasi](https://webaudio.github.io/web-audio-api/)). `tone` 15.1.22 (Apr 2025, MIT).
- **[D] Rekomendasi:** skrip Node tanpa dependensi menulis WAV ber-seed (angin = brown noise tersaring, ombak = noise termodulasi, api = noise + kretek acak ber-seed, drone). Sejalan dengan filosofi 100 % kode dan kontrak determinisme. Tidak menambah beban render, karena dihitung sekali. Gamelan sungguhan tidak realistis dari kode; pakai pustaka berlisensi jelas atau hindari.
- **[F]** Musik YouTube Audio Library tidak terkena klaim Content ID ([Shorts Help](https://support.google.com/youtube/answer/15424877?hl=en)). Musik AI yang menjadi fokus utama **wajib diungkapkan** (§5.1).

### 4.3 Ducking dan mix

**[F]** `sidechaincompress`: `threshold` (bawaan 0,125), `ratio` 2, `attack` 20 ms, `release` 250 ms, `makeup`, `knee` ([dok](https://ffmpeg.org/ffmpeg-filters.html)). **[D]** Titik awal untuk narasi: rasio ±6, attack ±30, release ±400–800, latar −18…−24 dB di bawah VO. Tetapkan telinga pemilik, lalu jadikan preset.

### 4.4 Loudness

**Klaim −14 LUFS YouTube: tidak ada dokumen resmi yang ditemukan.**
- **[P]** Ian Shepherd mengukur rujukan pemutaran −14 LUFS sejak 2019 ([Production Advice](https://productionadvice.co.uk/youtube-loudness/), [MeterPlugs](https://www.meterplugs.com/blog/2019/09/18/youtube-changes-loudness-reference-to-14-lufs.html)).
- **[P]** Laporan forum: yang lebih keras diturunkan, yang lebih pelan tidak dinaikkan. "Content loudness" di Stats for nerds memperlihatkannya.
- **[F]** AES TD1008 ([PDF](https://aes.org/wp-content/uploads/2024/01/20210924_TD1008_v3.13.pdf)): ucapan sekitar −18 LUFS, jaga di atas −20, true peak maksimum −1 dBTP pada masukan codec lossy; musik −16. Jadi −14 bukan standar untuk ucapan, hanya batas atas yang tampaknya dipakai YouTube.
- **[F]** `loudnorm`: EBU R128, satu atau dua lintasan; bawaan `I=-24 LRA=7 TP=-2`. `linear` memerlukan keempat `measured_*` dan syarat tertentu, kalau tidak "revert to dynamic". Mode dinamis menaikkan contoh ke 192 kHz, jadi setel `-ar 48000` ([dok](https://ffmpeg.org/ffmpeg-filters.html)).
- **[D] Rekomendasi:** dua lintasan linear pada **seluruh gabungan** (bukan per babak, agar tidak melompat), target −15 ±1 LUFS, TP −1,5 dBTP. Mengukur satu video sesudah unggah lewat Stats for nerds untuk mengonfirmasi. Biaya kecil: audio saja, `-c:v copy`.

### 4.5 Gemini TTS

Dibaca 5 Nov 2026 **[F]**.
- **Model** ([deprecations](https://aistudio.google.com/docs/deprecations), [speech](https://aistudio.google.com/docs/speech-generation)):

| Model | Rilis | Paling cepat dimatikan |
|---|---|---|
| `gemini-3.8-flash-tts` (bawaan `vo-gemini.mjs`) | 22 Sep 2026 | Belum diumumkan |
| `gemini-3.8-flash-lite-tts` | 22 Sep 2026 | Belum diumumkan |
| `gemini-3.1-flash-tts-preview` | 26 Feb 2026 | **17 Nov 2026** |
| `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts` | 20 Mei 2025 | **17 Nov 2026** |

  `references/alat-kerja.md` masih menawarkan model 3.1 di tabel `--model`: **perbaiki**.
- **Harga** ([pricing](https://aistudio.google.com/docs/pricing)): 3.8 Flash $0,50 teks / $9 audio per 1 juta token sampai 31 Des 2026, lalu $1 / $18 mulai 1 Jan 2027. Setara 10 dtk = $0,00225, lalu $0,0045. Flash-Lite 2/3-nya. Batch 50 %.
  - **Perhitungan saya:** VO 60 menit = 360 × $0,00225 = **$0,81** (2027: **$1,62**); Lite $0,54 / $1,08; batch separuhnya.
- **Batas:** masukan 8.192 token, keluaran 16.384 ([model](https://aistudio.google.com/docs/models/gemini-3.8-flash-tts)). Kuota per project, bukan per kunci ([rate limits](https://aistudio.google.com/docs/rate-limits)). Sesuai `alat-kerja.md`.
- **Keluaran:** WAV 24 kHz mono 16-bit; `sample_rate` bisa diatur; 30 suara prebuilt, Extended Voice Library, dan custom voice (200 per project, TTL 1 tahun) **[F]**. Bahasa Indonesia didukung di kedua model 3.8 **[F]**.
- **Syarat** ([terms](https://aistudio.google.com/docs/terms), berlaku 23 Mar 2026): layanan tak berbayar dipakai untuk memperbaiki produk, peninjau manusia bisa membaca; berbayar tidak. Google tidak mengklaim kepemilikan hasil. Usia 18+.
- **Batch:** model 3.8 Flash TTS mendukung Batch API menurut halaman model, tetapi halaman Batch menulis "currently only available with the generateContent API", sedangkan `vo-gemini.mjs` memakai Interactions API. Target 24 jam. Mode `--batch` perlu jalur permintaan kedua: biaya sedang untuk penghematan ±$0,40–0,80 per video. Tidak mendesak **[D]**.

**[D] Saran.** Dengan harga di bawah $2 per video, satu kunci berbayar menyelesaikan kuota, risiko penangguhan multi-akun, dan penggunaan data sekaligus. Ini keputusan pemilik.

### 4.6 Alternatif TTS

| Layanan | Bahasa Indonesia | Harga | Kelebihan |
|---|---|---|---|
| **Google Cloud Chirp 3 HD** | id-ID **[F]** ([dok](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd)) | $30/1 juta karakter, gratis 1 juta/bulan ([harga](https://cloud.google.com/text-to-speech/pricing), cuplikan pencarian). **[D]** VO 60 menit ±60 ribu karakter ≈ $1,8; kuota gratis ≈ 16 video/bulan | Kontrol jeda dan pengucapan untuk id-ID; timepoint tidak disebut |
| **ElevenLabs** | Belum diperiksa | Berlangganan | `convert-with-timestamps` memberi waktu **per karakter** ([dok](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)) **[F]**: SRT presisi tanpa alat lain |
| **Azure Speech** | **[D]** ada id-ID | Harga tak terbaca | **[D]** Kejadian word boundary; perlu verifikasi |
| **Piper** | Belum diperiksa | Lokal, GPL-3.0 (1.8.0, Sep 2026) **[F]** | Tanpa biaya; mutu narasi panjang diragukan **[D]** |

Hindari `edge-tts` dan sejenisnya yang memakai titik akhir tak resmi **[D]**: tanpa jaminan izin maupun ketersediaan.

### 4.7 Subtitle

- **[F]** YouTube menerima `.srt`, `.vtt`, dll. Format dasar "No style info (markup) is recognized", wajib UTF-8 ([bantuan](https://support.google.com/youtube/answer/2734698?hl=en)).
- **[F]** Repo: `references/explainer.md` menyatakan bawaannya tanpa caption terbakar. Tiap produksi membuat SRT sendiri (`docs/audit-gaya-bawaan-2026-11-01.md` C8), tidak ada alat skill.
- **[D]** Kandidat: `scripts/srt-vo.mjs`: masukan `naskah.json` + `<id>.json` (`dur`) + `silencedetect`, keluaran SRT tanpa ML, maks. 2 baris dan batas panjang.

---

## 5. Persyaratan YouTube 2026

### 5.1 Pengungkapan AI

Dibaca 5 Nov 2026 ([answer/14328491](https://support.google.com/youtube/answer/14328491?hl=en)) **[F]**.

**Wajib diungkapkan** bila gen-AI: membuat orang nyata tampak mengatakan atau melakukan sesuatu; mengubah rekaman peristiwa atau tempat nyata; menghasilkan adegan realistis yang tidak pernah terjadi; atau membuat musik yang menjadi fokus utama.

**Tidak wajib:** konten nonrealistis (contohnya "animation of a missile in a fully animated video"); naskah, judul, ide, caption berbantuan AI; perbaikan suara; mengkloning **suara sendiri**.

**Label:** "AI use" di YouTube Studio. YouTube bisa memberi label otomatis, termasuk di deskripsi untuk "non-music AI-generated audio", dan dari C2PA. Mengungkapkan tidak membatasi jangkauan atau monetisasi. Tidak mengungkapkan secara konsisten bisa berujung label manual, penghapusan, atau penangguhan dari YPP.

**Tafsiran untuk WeVai [D]** (halaman itu tidak menyebut narasi secara eksplisit, jadi ini bukan kepastian):
- Visual 100 % kode bukan gen-AI dan tidak fotorealistis.
- Narator AI suara generik tidak masuk empat butir wajib, kecuali meniru orang nyata atau tokoh sungguhan.
- Yang perlu dijaga: **jangan membuat tokoh sejarah nyata "bersuara" lewat AI dalam gaya yang tampak nyata tanpa label**, dan musik AI bila dipakai.
- Saran: tetap tulis di deskripsi "Narasi memakai suara sintetis". Murah, jujur, dan melindungi bila YouTube mendeteksi sendiri.

### 5.2 Konten massal dan berulang

Dibaca 5 Nov 2026 ([answer/1311392](https://support.google.com/youtube/answer/1311392?hl=en)) **[F]**.

- 15 Jul 2025: "repetitious content" diganti nama "inauthentic content".
- Tidak boleh: "AI-generated content made with generic or unoriginal templates giving the impression of mass production"; "Image slideshows, templated storylines, or scrolling text with minimal or no narrative"; konten serupa bernilai edukasi rendah.
- Surat CEO 21 Jan 2026: membahas "AI slop", membangun di atas sistem anti-spam ([blog](https://blog.youtube/inside-youtube/the-future-of-youtube-2026/)).
- **[P]** Klaim gelombang penegakan Januari 2026 (mis. "4,7 miliar tayangan") hanya dari blog. Belum terbukti.

**Implikasi [D].** Jadwal berformat tetap dengan ratusan video sangat rentan di sisi "templated", walau isinya riset orisinal. Ini soal monetisasi, bukan pelanggaran. Mitigasi murah: daftar sumber per video di deskripsi, pendapat editorial eksplisit, variasi struktur antar-video (`opener-konsep.md` sudah menolak rundown baku), dan sidik jari struktur antar-video yang diperiksa alat. Kandidat kecil: lint perbandingan antar-episode.

### 5.3 Parameter unggah vs keluaran WeVai

Rekomendasi: [answer/1722171](https://support.google.com/youtube/answer/1722171?hl=en) **[F]**. Ini rekomendasi, bukan syarat tolak.

| Rekomendasi | WeVai jalur JPEG sekarang | Status |
|---|---|---|
| MP4, moov di depan, tanpa edit list | `+faststart` ada. Edit list audio mungkin ada akibat priming AAC (`use_editlist` auto) **[D]** | Cek (M7) |
| H.264 High, progresif | `veryfast`: High. `ultrafast` milik pemilik: Constrained Baseline **[D]** dari flag di `base.c` | Tak sesuai saat ultrafast |
| 2 B-frame, CABAC | `ultrafast` mematikan keduanya **[F]** | Tak sesuai saat ultrafast |
| Closed GOP, GOP = setengah frame rate | x264 bawaan keyint 250 **[F]** | Tak sesuai; dampak kecil **[D]** |
| 8 Mbps 1080p24–30; 12 Mbps 1080p48–60 | ±9–10 Mbps (video produksi) | Sesuai |
| 4:2:0 | `yuv420p` | Sesuai |
| **BT.709** transfer, primaries, matrix | Dekoder MJPEG ffmpeg menetapkan `AVCOL_SPC_BT470BG` dan range sesuai JFIF ([`mjpegdec.c`](https://github.com/FFmpeg/FFmpeg/blob/master/libavcodec/mjpegdec.c)); `libx264.c` meneruskan ruang warna ke VUI ([kode](https://github.com/FFmpeg/FFmpeg/blob/master/libavcodec/libx264.c)) **[F]**. Hasil: kemungkinan matriks BT.601 berlabel bt470bg, primaries dan transfer kosong **[D]** | **Tak sesuai; cek ffprobe (M7)** |
| AAC-LC/Opus, **48 kHz**, stereo | `-c:a aac -b:a 192k` tanpa `-ar`/`-ac`, jadi VO WAV Gemini bisa keluar 24 kHz mono **[D]** dari kode | Tak sesuai bila VO langsung WAV |

Jalur WebCodecs berlabel BT.709 + `iec61966-2-1` **[B]** (bukti §2), jadi kedua jalur tidak sama warnanya. Perbaikan JPEG: `-vf scale=in_range=pc:in_color_matrix=bt601:out_range=tv:out_color_matrix=bt709,format=yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709`. Biaya CPU swscale perlu diukur **[D]**.

### 5.4 Chapter, Shorts

- **Chapter [F]** ([answer/9884579](https://support.google.com/youtube/answer/9884579?hl=en)): mulai `00:00`, menaik, minimal 3, masing-masing ≥ 10 dtk, ditulis di deskripsi. `antre-render.mjs` sudah tahu durasi per babak, jadi daftar chapter bisa keluar sendiri **[D]**.
- **Shorts [F]** ([answer/15424877](https://support.google.com/youtube/answer/15424877?hl=en)): persegi atau vertikal sampai **3 menit** (unggahan sejak 15 Okt 2024). **Short lebih dari 1 menit dengan klaim hak cipta aktif diblokir global**, tanpa penalti channel. Relevan: Short produksi sekitar 62 dtk. Jaga musiknya bersih.

---

## 6. Kandidat 1.5

Perkiraan untuk mesin acuan, dasar 60 menit ±5 jam (2 worker, 6 frame/dtk). **Semua angka manfaat kecepatan adalah dugaan sampai diukur.** Biaya: K kecil (≤ 1 hari kerja agen), S sedang, B besar.

### Tingkat 1: lakukan

| # | Kandidat | Manfaat | Biaya | Risiko |
|---|---|---|---|---|
| **1** | **Matriks jalur tangkapan:** `captureBeyondViewport:false`, CDP langsung, tanpa emulasi, headless shell, flag §1.10, `pipe` | Tak diketahui; rentang wajar 0–30 % per frame **[D]**, 5 jam → ±3,5–5 jam. Andai nol, satu pertanyaan besar terjawab | K | Frame berubah (dijaga hash); shell bisa beda GPU |
| **2** | **Potongan tertutup + antrean kerja + manifes** (§1.5) | Kerugian crash dari jam ke ±5–10 menit; worker seimbang: bisa +0–30 % throughput pada babak timpang **[D]**; deteksi perubahan env | S | Sambungan potongan; ubah alur `antre-render` |
| **3** | **Penjaga render:** catat renderer GL tiap buka browser, tolak/peringatkan WARP; batas waktu ffmpeg (`drain`, `close`, mux); catat tidur; alarm penurunan laju | Mencegah kerugian malam penuh (×10–30 lambat tanpa pesan) | K | Salah alarm pada frame berat |
| **4** | **Paket unggah:** `--master-audio` (loudnorm 2 lintasan seluruh gabungan, 48 kHz stereo, TP −1,5), warna BT.709, chapter otomatis, SRT tanpa ML, laporan "lolos rekomendasi YouTube" | Mutu dan kerja manual per video; tanpa dampak fps kecuali swscale | K–S | Warna berubah dari yang biasa dilihat; dicek dulu |
| **5** | **Spike WebCodecs nyata:** 1080p + three.js + `WORKERS=1/2`, `bitrateMode:'quantizer'`, ditambah spike HTML-in-Canvas pada satu halaman DOM/SVG | Kanvas murni ±5 jam → ±2,4 jam (riset Nov). Bila HTML-in-Canvas lolos: semua gaya mendekati itu, tetapi peluang rendah | K (spike), B (bila diadopsi) | API berubah; flag eksperimental; filter SVG; fallback ke jalur biasa wajib |

### Tingkat 2: setelah pengukuran

| # | Kandidat | Manfaat | Biaya | Risiko / syarat |
|---|---|---|---|---|
| 6 | `DRAF=1` dan panduan render draf | Mencegah re-render jam-an | K | Rendah |
| 7 | `FPS=24` sebagai saran dokumenter | −20 % frame, ±1 jam | K | Pan patah; vonis pemilik |
| 8 | Lewati frame identik | Bergantung isi; hanya bila M6 menunjukkan > ±20 % **[D]** | S | Rapuh atau butuh `beginFrame` |
| 9 | Re-render selektif per potongan (Manim) | Revisi kecil tanpa render penuh; tak menolong bila VO bergeser | S, sesudah #2 | Salah pakai ulang; `--paksa` |
| 10 | Grain di encoder untuk video panjang | Mungkin beberapa persen; membantu #8 | K–S | Pratinjau ≠ ekspor; M5 dulu |
| 11 | Suara prosedural + ducking (`scripts/suara.mjs`) | Mutu dokumenter; tak ada biaya render | S | Rasa; butuh telinga pemilik |
| 12 | GSAP 3.15 + plugin | Rupa (morph, draw) | K–S | Determinisme plugin; syarat lisensi baru |
| 13 | Perbaiki daftar model TTS; catat harga 2027 | Menghindari putus 17 Nov | K | — **segera, tanpa menunggu 1.5** |
| 14 | Penyelarasan kata: WhisperX align-only (alat opsional) | Sorotan kata, SRT presisi | S | PyTorch besar; hanya bila butuh kata |
| 15 | `doctor`: GPU, ffmpeg, filter, font, ruang disk | Mengurangi galat lingkungan | K | — |
| 16 | Lint antar-episode (sidik jari struktur) | Mitigasi "inauthentic" | S | Saringan, bukan vonis |

### Tingkat 3: jangan sekarang

| Kandidat | Alasan |
|---|---|
| Pindah ke Remotion, HyperFrames, Motion Canvas | Tidak lebih cepat di Windows; lisensi Remotion; kehilangan kontrak WeVai |
| `Page.startScreencast` | Tidak terikat `seek` |
| `beginFrame` sebagai jalur utama | Experimental, tanpa preseden Windows; buka lagi hanya demi `hasDamage` |
| QSV/`h264_mf` sebagai jalur | Uji satu perintah saja; keuntungan kecil, dukungan driver buntu |
| WebGPU/TSL, Three r187 seluruh starter | Tidak ada manfaat terukur di HD 4000 |
| Rive, Lottie | Bukan 100 % kode, atau tidak menambah apa pun |
| Mediabunny | ffmpeg sudah cukup; kecuali mau render di browser |
| Render lintas mesin/cloud | Risiko warna antar-GPU; biaya; sesudah #2 baru mungkin |
| Checkpoint per frame | ±32 GB per 60 menit |

---

## 7. Yang perlu diukur saat mesin senggang

Semua dengan `bench-frame.mjs` atau satu babak pendek, ≥ 3 run bergantian, tanpa proses lain. Tidak ada yang sudah dijalankan.

| ID | Ukur | Keputusan yang bergantung |
|---|---|---|
| M1 | Matriks §1.1 + §1.2 + §1.10 pada 3 halaman: `starter-sinematik`, `starter-babak`, `starter-elang`; catat ms/frame + kesamaan hash | Kandidat 1 |
| M2 | Rincian biaya tangkapan: pelacakan Chrome (layout, raster, salin GPU, JPEG, base64) | Apakah emulasi per frame memang penyebabnya |
| M3 | Dua worker: bagi per potongan vs dibelah dua; `WORKERS=3` | Kandidat 2 |
| M4 | WebCodecs 1080p kanvas + three.js; `WORKERS=1/2`; mode quantizer | Kandidat 5 |
| M5 | Biaya `grainHidup` on/off; grain lewat `noise` ffmpeg | Kandidat 10 |
| M6 | Frame identik pada MP4 jadi: `ffmpeg -i final.mp4 -vf mpdecimate -f null -` | Kandidat 8 |
| M7 | Label pada MP4 jadi: `ffprobe -show_streams` (profil, color_*, sample_rate, channels, edit list). Lalu unggah satu pola warna untuk menilai pergeseran setelah YouTube | Kandidat 4 |
| M8 | Enkoder: `h264_qsv`, `h264_mf -hw_encoding 1`, `-threads 2`, `superfast`, swscale BT.709: fps + ukuran | Kandidat 4, §1.9 |
| M9 | Fitur browser: `requestAdapter({featureLevel:'compatibility'})`, `'drawElementImage' in CanvasRenderingContext2D.prototype` dengan dan tanpa flag | §3.3, Kandidat 5 |
| M10 | FPS 24 vs 30: tonton satu pan lambat di YouTube | Kandidat 7 |
| M11 | `Content loudness` di Stats for nerds pada satu video −15 LUFS dan yang sudah tayang | §4.4 |
| M12 | WhisperX align: RTF di CPU ini, akurasi per kata pada VO Iapetus | Kandidat 14 |

---

## 8. Koreksi atas dokumen lama

| Dokumen | Isi lama | Sekarang |
|---|---|---|
| `references/alat-kerja.md` | Menawarkan `gemini-3.1-flash-tts-preview` | Paling cepat dimatikan 17 Nov 2026 **[F]** |
| `references/alat-kerja.md`, ENC_ARGS | `h264_qsv` tampak tersedia | Kemungkinan gagal di mesin acuan **[D]**; beri catatan sesudah M8 |
| Riset Nov butir 7 | `postprocessing` hanya `< 0.187` | 6.39.6: `< 0.188` (1 Nov 2026) **[F]** |
| Riset Nov butir 4 | `beginFrame` ±10 % "tidak sepadan" | Perbandingan mengubah biner dan jalur sekaligus; perlu dipisah (M1) |
| Riset Nov L6 | `requestAdapter() = null` | Uji tanpa `featureLevel:'compatibility'`; kemungkinan penyebab: Core butuh FL 11_1 |
| `scripts/package.json` | puppeteer `^25.11.0` | Terbaru 25.16.0 (22 Okt 2026); Chrome stable 158 (4 Nov 2026, [chromiumdash](https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Windows&num=2)). Jangan naik saat render berjalan |
