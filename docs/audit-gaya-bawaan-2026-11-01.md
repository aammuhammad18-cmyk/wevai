# Audit gaya bawaan WeVai — kelebihan, kekurangan, dan jalan ke "film animasi"

Tanggal: 2026-11-01 · Cakupan: WeVai v1.1.0 (`SKILL.md`, `references/*.md`, `src/runtime/*.js`, delapan starter di
`assets/`, menu kulit `techniques.md` §7f, gaya render objek §7e, galeri README `docs/gallery/*.jpg`) dan lima produksi
nyata di luar repo (`E:\mila\babad-jawa-01`, `babad-sangiran-01`, `babad-mataram-timur-01`, `jagad-fosil-01`,
`jagad-geografi-jawa-01`), dibandingkan dengan spike sekali pakai "gapura malam" (100 % SVG, di scratchpad sesi).

**Konteks.** Pemilik memakai WeVai untuk channel sejarah (Babad, Jagad Budaya; 25–60 menit per video, dirender di
laptop). Keluhannya: hasil terlalu flat, "belum sinematik", ingin terasa seperti film animasi. Patokan rupa: ilustrasi
sinematik dengan siluet ber-rim light, cahaya bersumber jelas (senja/api/obor), kabut berlapis, bara/partikel, palet
serempak per adegan, ornamen detail. **Batas keras: 100 % kode** — tanpa gambar AI, tanpa foto. Gaya flat tetap boleh
sebagai pilihan. Pemilik juga ingin bahasa kamera sinematik, termasuk shot "mata elang" (FPV terbang, menukik,
berguling, menembus celah) sebagai momen khusus.

**Metode.**
- Membaca seluruh `SKILL.md`, `README.md`, `CHANGELOG.md`, `references/*.md`, dan dokumen lama di `docs/`
  (`analisis-cto-2026-09-16.md`, `analisis-3d-sinematografi-2026-10-03.md`, `riset-3d-sinematografi-2026-10-03.md`,
  `riset-animejs-2026-10-22.md`) supaya temuan yang sudah tercatat tidak diulang, hanya dirujuk.
- Membaca kode starter dan runtime pada bagian yang menentukan rupa: token warna, lapisan latar, rig kamera, cahaya,
  karakter, material 3D.
- **Merender** tiap starter di 8 detik (merata sepanjang durasinya) lewat skrip puppeteer kecil di scratchpad
  (`audit/render.mjs`, `createRequire` dari `scripts/package.json`, Chrome 156.0.8078.74 lokal, `--use-gl=angle`), plus
  katalog `?demo=1` untuk starter 3D dan kartun kolase. Gambar dilihat sendiri (lembar kontak di Lampiran A).
- **Mengukur** ms/frame dengan pola yang sama seperti `export-frames.mjs`: 30 frame berurutan @30 fps mulai detik 1,
  tiap frame `OPENER.seek(t)` → 2× rAF → screenshot JPEG q80. Mesin: Intel i3-3217U + HD Graphics 4000 (mesin produksi
  yang sama dengan `analisis-3d-sinematografi-2026-10-03.md` §2). Spike diukur dengan cara yang sama (`audit/spike.mjs`).
- Melihat lembar kontak dan thumbnail produksi di folder `cek/` kelima proyek.
- Menilai tiap gaya pada sumbu yang sama, skor 1–5 (5 = terbaik). Pendapat ditandai **[opini]**. Klaim tentang kode
  atau aturan diberi `berkas:baris`.

---

## Ringkasan temuan

1. **Tidak ada satu pun gaya bawaan yang punya "cahaya" dalam arti film.** Cahaya 2.5D adalah satu overlay gradien
   layar penuh dengan `mix-blend-mode` (`src/runtime/kamera-dom.js:30-44`). Overlay ini tidak punya arah, tidak
   membuat bayangan, tidak memberi rim, dan tidak meredup dengan jarak. Kartun panggung bahkan tidak memuat `light()`
   sama sekali. Rig cahaya sungguhan (key/fill/rim, bayangan, `practical()`) hanya ada di jalur 3D
   (`references/sinematografi.md:100-113`). Inilah akar rupa "flat" yang dikeluhkan.
2. **Aturan yang paling membatasi realisme ada di gaya yang justru dipakai produksi sejarah terbaru.** Kartun panggung
   Hukum 7: "Flat fill, tanpa outline, tanpa tekstur, tanpa vignette. Bayangan hanya elips kontak…"
   (`references/kartun-panggung.md:157-166`). Aturan ini bertentangan dengan SKILL.md, yang menganjurkan "Gradien kaya,
   cahaya, 3D, kedalaman, tekstur" (`SKILL.md:294-300`) dan mewajibkan permukaan latar "≥ 2 lapis — bukan flat"
   (`SKILL.md:240-241`). Produksi Mataram ("ilustrasi adegan", turunan kartun panggung) merencanakan "fajar, senja,
   malam + bara" (`babad-mataram-timur-01/rencana.md:41`), tetapi hasilnya tetap blok warna rata (thumbnail dan
   `cek/s04/kontak.png`).
3. **Empat dari delapan starter (kartun kolase, jurnalisme, katalog, sketsa) kehilangan rupanya di bawah batas
   100 % kode.** Kualitas visual gaya-gaya ini berasal dari aset raster: ilustrasi hasil generate
   (`references/explainer.md:261-265`, `:461-466`) atau foto (`:266-270`). Tanpa aset itu, render starter hanya
   menyisakan kertas kosong dan kotak "GANTI: cutout". Rekomendasi bawaan "sejarah → 4 atau 1"
   (`references/explainer.md:35-36`) menunjuk tepat ke dua gaya yang paling bergantung pada gambar generate.
4. **Kamera sudah kaya, tetapi terbelah dua.** `CAM` bersama (shot ECU–EWS, sudut, dolly/truck/crane/arc, lensa,
   dolly zoom, rack focus, handheld ber-seed) dipakai tujuh starter. Kartun panggung punya rig sendiri yang hanya
   bisa geser + skala 1,08–1,95 (`assets/starter-explainer-panggung.html:57-58`, `:104`;
   `references/kartun-panggung.md:10`). Jalur 2.5D tidak punya `rail()` (`references/sinematografi.md:175`), jadi shot
   "mata elang" belum bisa ditulis di dunia 2D.
5. **Aturan kamera saat ini melarang inti shot mata elang.** "Spin/yaw/roll kejut… Itu bahasa PRESET editor video"
   (`references/anti-ppt.md:42`; `references/techniques.md:300-303`). "Jangan terbang lintas dunia 3 detik (naik ke
   langit, menyelam…, zoom keluar)" (`references/kartun-panggung.md:63-65`). "Kamera tidak pernah wide"
   (`references/kartun-panggung.md:10`, `:25-35`). Shot FPV perlu pengecualian yang tertulis: termotivasi, dijatah, dan
   punya resep.
6. **Tokoh adalah titik terlemah di semua gaya.** Satu-satunya sistem tokoh adalah rig sendi kartun panggung
   (`references/kartun-panggung.md:88-119`; `starter-explainer-panggung.html:65-91`). Tubuhnya dari kotak membulat,
   kepalanya lingkaran + dua titik, hanya tampak depan, tanpa siluet/rim/kostum. Kepala raster yang disarankan butuh
   gambar generate (`references/kartun-panggung.md:172-181`). Jalur 3D tidak punya tokoh sama sekali dan tidak bisa
   memuat model (`references/sinematografi.md:229-230`). Spike menunjukkan hal yang sama: tokoh tetap seperti manekin.
7. **Butiran (grain) di semua starter diam.** Grain berupa ubin data-URI statis (mis.
   `starter-explainer-kartun.html:30`, `starter-explainer-jurnalisme.html:30`, `starter-explainer-3d.html:55`).
   Tidak ada satu starter pun yang memakai resep butiran hidup `grainAt` (`references/techniques.md:537-538`). Di
   video, grain diam terbaca sebagai lensa kotor, bukan film.
8. **Performa: semua starter berada di "lantai screenshot".** Ekspor ≈ 188–213 ms/frame (4,7–5,3 fps). Opener WebGL
   + bloom paling lambat: 470 ms (2,1 fps). Spike gapura asli: 919 ms/frame (1,09 fps). Spike lapisan terkomposit:
   416 ms/frame (2,32 fps). Untuk video 45 menit @30 fps (81.000 frame), angka ini berarti ±4,5 jam (starter),
   ±9,4 jam (spike cepat), dan ±21 jam (spike asli). Skill belum punya aturan performa untuk rupa berat: kapan
   memanggang (bake), kapan memisah lapisan, dan anggaran ms/frame.
9. **Video panjang tidak dilayani skill; tiap produksi menulis mesinnya sendiri.** Explainer dibatasi "≤ 90 dtk per
   bab" (`references/explainer.md:58-62`; `SKILL.md:155`). Produksi 25–60 menit menyalin mesin ±25 KB per proyek
   (`*/alat/mesin.js`, 4 salinan) dan pustaka ilustrasi 40 KB (`babad-mataram-timur-01/alat/ilus.js`). Antrian render,
   penahan sleep, dan perakitan juga dibuat per proyek.
10. **3D mengunci tampilan "brand-tepat" yang anti-sinematik.** `NoToneMapping` diwajibkan ("biarkan",
    `references/sinematografi.md:238-240`; `starter-explainer-3d.html:119`). Akibatnya api, matahari, dan bloom
    terpotong keras tanpa *rolloff* film. Untuk konten sejarah tanpa warna brand, kunci ini tidak perlu.
11. **Galeri README tidak mewakili hasil 100 % kode.** Lima dari dua belas gambar (07 flat pop, 08 katalog,
    09 jurnalisme, 10 sketsa, 11 kartun kolase) bertumpu pada foto atau ilustrasi raster. Tidak ada satu pun gambar
    galeri yang memperlihatkan cahaya bersumber, kabut, atau tokoh ber-rim.
12. **Gaya paling mudah dinaikkan ke tingkat spike: kartun panggung dan aksi kontinu** (100 % SVG, struktur adegan
    sudah benar). Syaratnya, Hukum 7 dibuka dan ditambah lapisan cahaya/atmosfer bersama. **Butuh perombakan: keempat
    gaya kolase** (rupanya dari raster) dan **3D** (rupa bisa naik, tetapi tokoh dan ornamen harus dibangun dari nol).
    **[opini]**

---

## 1. Inventaris gaya

### 1a. Delapan starter (`assets/`)

| # | Starter | Apa | Untuk apa (menurut dokumen) | Dunia |
|---|---|---|---|---|
| S1 | `starter-opener.html` | latar WebGL: nebula, debu, grid, ornamen ✦ 3D, bloom; teks DOM | opener/promo/bumper/kinetic (`SKILL.md:141-155`) | WebGL + DOM |
| S2 | `starter-explainer.html` | **aksi kontinu**: strip paralaks mengalir, satu hero, view peta, whip antar view | kecepatan, rute, proses (`references/explainer.md:479-591`) | SVG vektor |
| S3 | `starter-explainer-kartun.html` | **kartun kolase**: kertas krem + grain + noda, cutout ilustrasi, pill | sains/anak, topik ringan (`references/explainer.md:40`) | DOM + raster |
| S4 | `starter-explainer-jurnalisme.html` | hitam + grain, foto asli + tag sumber, highlighter kuning | berita/geopolitik (`:41`) | DOM + foto |
| S5 | `starter-explainer-katalog.html` | putih bergrid, cutout foto, stempel/dokumen | produk/brand (`:42`, `:417-454`) | DOM + foto |
| S6 | `starter-explainer-sketsa.html` | kertas sepia `feTurbulence`, cutout ukiran `multiply`, serif klasik | sejarah/biografi (`:43`, `:457-476`) | DOM + raster |
| S7 | `starter-explainer-panggung.html` | **kartun panggung**: satu panggung per adegan, tokoh bersendi, ≥10 benda hidup | edukasi berkarakter, proses & dampak (`:45`, `kartun-panggung.md`) | SVG vektor |
| S8 | `starter-explainer-3d.html` | dunia Three.js r161, `CAM` 3D, `mat()` 5 family, key/fill/rim, HUD | benda bervolume, sudut sungguhan (`references/sinematografi.md:10-20`) | WebGL |

### 1b. Menu kulit §7f (`references/techniques.md:702-718`)

Sepuluh arah: sinematik gelap, poster color-block, editorial terang, kertas & cetak, retro/analog, brutalis mono,
pastel ceria, mewah gelap, flat pop berfoto, grainy gradient. Ini **kulit**, bukan starter. Arah ini dipasang di atas
S1 (opener) atau starter explainer, untuk opener/promo. Hanya "sinematik gelap" (≈ S1) dan "grainy gradient" (resep
`techniques.md:508-557`) yang punya kode siap pakai. Sisanya berupa deskripsi satu baris.

### 1c. Gaya render objek §7e (`references/techniques.md:559-580`)

Sembilan family: flat solid, flat + titik warna, soft 3D/clay, glossy 3D, kaca, isometrik, logam/marmer realistis,
garis neon, ilustrasi karakter flat. Di kode, `mat()` hanya memuat lima: `flat toon clay glossy realistis`
(`src/runtime/kamera-three.js:103-108`). Family kaca, isometrik, dan neon tidak punya kode. "Realistis" hanyalah
`MeshStandardMaterial` roughness 0,5 tanpa tekstur/normal map (`kamera-three.js:108`).

### 1d. Galeri README (`README.md:44-71`, `docs/gallery/`)

01 grainy gradient (opener) · 02 poster color-block (kinetic) · 03 tur SaaS · 04 flat vektor · 05 aksi kontinu ·
06 kartun panggung · 07 flat pop berfoto · 08 katalog putih · 09 jurnalisme · 10 sketsa vintage · 11 kartun kolase ·
12 "kombinasi lain" (style brief). Lima gambar (07–11) memakai foto atau ilustrasi raster. Gambar 05 dan 06 adalah
versi berisi dari S2 dan S7, dengan rupa yang sama flatnya dengan render starter.

### 1e. Gaya turunan di produksi (bukan bawaan, dicatat sebagai bukti)

| Produksi | Gaya | Basis | Rupa yang terlihat |
|---|---|---|---|
| Babad Jawa, Babad Sangiran | "sketsa vintage + arsip" | S6 + foto Commons | kertas gading, foto berbingkai miring, diagram vektor polos (`babad-jawa-01/cek/final-bab.jpg`, `babad-sangiran-01/cek/kontak-03.jpg`) |
| Jagad Fosil, Jagad Geografi | "kulit topografi" | S6 + garis kontur + foto | kertas berkontur, diagram datar (kerucut gunung = satu segitiga, `jagad-geografi-jawa-01/cek/kontak-bab.jpg` bab-3) |
| Babad Mataram ke Timur | "ilustrasi adegan" | S7 tanpa raster (`rencana.md:39`, `:52`) | blok warna rata, tokoh geometris tampak depan, langit gradien dua warna, kabut = pita putih transparan (`cek/s04/kontak.png`, `thumbnail-1.jpg`) |

---

## 2. Sumbu penilaian

| Sumbu | Pertanyaan | 5 berarti |
|---|---|---|
| **Rupa** | cahaya, bayangan, tekstur, detail, kedalaman/atmosfer, palet | frame diam bisa jadi still film animasi |
| **Tokoh** | ada sistem tokoh? siluet, pose, ekspresi, kostum | tokoh berakting, terbaca dari siluet, terkena cahaya adegan |
| **Kamera** | shot, gerak, transisi, lensa | kosakata penuh + bisa FPV/rail di dunianya |
| **Gerak** | adegan hidup di luar kamera | dunia bernapas: api, kabut, daun, kerumunan |
| **Performa** | ms/frame ekspor di mesin produksi | ≤ 200 ms dengan rupa penuh |
| **Agen** | mudah dipakai agen dengan benar | perkakas tinggi, jebakan sedikit, contoh jelas |
| **Aturan** | seberapa jauh aturan dokumen MENGIZINKAN realisme | tidak ada aturan yang melarang cahaya/tekstur/atmosfer |
| **100 % kode** | rupa bertahan tanpa gambar AI dan foto | rupa penuh tanpa aset raster |

Angka performa diukur dari starter yang hampir kosong, jadi ini angka **lantai**. Produksi berisi akan lebih berat
(Lampiran B).

---

## 3. Penilaian per gaya

### S1 — Opener (sinematik gelap WebGL)

**Render** (`audit/shots/starter-opener/kontak.png`): langit hitam, grid lantai yang memudar sebelum horizon, lima
ornamen ✦ logam berkilau bloom. Tidak ada adegan, sesuai rancangan ("SENGAJA tanpa urutan adegan contoh",
`SKILL.md:531`).

**Kelebihan**
- Hanya starter ini yang punya pasca-proses sungguhan: `UnrealBloomPass` (`starter-opener.html:286`),
  vignette (`:119`), dan shader nebula fbm dengan horizon menyala (`references/techniques.md:392-394`). Ini fondasi
  terdekat untuk "cahaya di depan lensa" dan *glow* api.
- Arsitektur state-driven (`references/architecture.md:64-85`) sudah benar untuk partikel deterministik
  (bara/debu sebagai `flow` jarak, bukan akumulasi).
- `CAM` + `kamera-three` sudah terpasang (`CHANGELOG.md:15-17`): `rail()` dan lensa tersedia untuk terbang.

**Kekurangan**
- Kosakata rupanya kosmik/tech: nebula, grid, ✦. Untuk sejarah, semua harus diganti. Tidak ada lapisan ilustrasi 2D
  yang bisa diterangi.
- Paling lambat: **470 ms/frame (2,13 fps)**, dua kali starter lain, padahal isinya hampir kosong.
- `NoToneMapping` (`starter-opener.html:221`) membuat bloom dan highlight menggunting, bukan memudar.

**Saran**
- Jadikan pipeline pasca-proses (bloom ambang tinggi, vignette, grain hidup, *lift/gamma/gain*) **modul runtime
  bersama** yang bisa dipakai starter 2D juga lewat kanvas komposit (lihat Celah C6).
- Tambahkan opsi `toneMapping:'film'` (AgX/ACES) untuk konten tanpa warna brand.

| Rupa | Tokoh | Kamera | Gerak | Performa | Agen | Aturan | 100 % kode |
|---|---|---|---|---|---|---|---|
| 3 | 1 | 3 | 3 | 2 | 3 | 4 | 5 |

Alasan skor: rupa 3 karena ada bloom/nebula, tetapi tanpa objek yang terkena cahaya. Kamera 3 karena opener memakai
`camThrough`/`breathe` di rig DOM dan `CAM` hanya untuk dunia WebGL (`references/sinematografi.md:287-288`).
Performa 2 berdasarkan 470 ms.

### S2 — Aksi kontinu (vektor)

**Render** (`audit/shots/starter-explainer/kontak.png`): kereta kapsul putih bergaris merah di depan gunung zigzag
biru dan rumput hijau datar, angka "50 km/jam" melintas, view peta berupa satu kurva merah, lalu view kolase berisi
kotak placeholder abu dan hijau. Vignette tipis.

**Kelebihan**
- 100 % SVG prosedural tanpa aset ("justru itu yang memberi rasa motion graphic After Effects",
  `references/explainer.md:483-485`). Lolos batas keras tanpa perubahan.
- Gerak paling hidup di antara starter 2D: dunia mengalir dari profil kecepatan, objek dunia punya t0/t1, view
  berganti lewat whip (`starter-explainer.html:323-329`), kamera bernapas.
- Bahasa sudut sudah dipikirkan: "Sudut pandang WAJIB berganti" dengan katalog instrumen
  (`references/explainer.md:549-569`). Ini paling dekat dengan *coverage* film.
- Performa terbaik: **188 ms/frame (5,32 fps)**.

**Kekurangan**
- Rupa nyaris nol: semua `fill` datar, tanpa gradien, tanpa cahaya, kecuali vignette (`starter-explainer.html:37`) dan
  overlay `light()`.
- Hero kendaraan, bukan tokoh. Tidak ada rig manusia.
- Strip paralaks diskalakan sebagai satu `<g>` (`references/explainer.md:583-587`), sehingga pergeseran kedalaman
  hanya horizontal.

**Saran**
- Paling cocok jadi **dasar "perjalanan"** (armada, rute dagang, perang): tambahkan lapisan langit bercahaya, kabut
  per lapis strip (makin jauh makin pucat/biru), dan cahaya arah pada hero (rim di sisi matahari).
- Rute peta bisa diterangi seperti diorama (bayangan kontur), bukan garis merah di bidang krem.

| Rupa | Tokoh | Kamera | Gerak | Performa | Agen | Aturan | 100 % kode |
|---|---|---|---|---|---|---|---|
| 2 | 1 | 4 | 4 | 5 | 3 | 3 | 5 |

Aturan 3: tidak ada larangan tekstur, tetapi menu render objek menyebut "Flat solid… tanpa bayangan" sebagai pilihan
pertama untuk edukasi (`references/techniques.md:567`), dan contoh acuannya "ilustrasi flat".

### S3 — Kartun kolase

**Render** (`audit/shots/starter-explainer-kartun/kontak.png`, katalog `…-kartun-demo/kontak.png`): kertas krem
dengan vignette, angka hantu "1526", dua kartu placeholder "GANTI: cutout ilustrasi (generate → hapus latar)",
kalimat dengan pill oranye. Di katalog demo, preset `lowkey` tampil sebagai lubang vignette hitam di tengah frame.

**Kelebihan**
- Permukaan paling kaya di antara starter 2D: kertas + grain `multiply` + noda radial + vignette + `drop-shadow`
  bertingkat (`starter-explainer-kartun.html:29-43`).
- Kamera kolase matang: into → settle → look → home, push-through antar adegan (`references/explainer.md:338-376`),
  plus seluruh kosakata `CAM`.

**Kekurangan**
- Isi visualnya **seluruhnya aset generate** (`references/explainer.md:261-265`). Di bawah batas 100 % kode, yang
  tersisa hanya kertas dan kotak placeholder.
- Grain berupa ubin statis (`starter-explainer-kartun.html:30`), tidak hidup (lihat Ringkasan #7).
- Cahaya 2.5D menimpa seluruh frame tanpa membedakan subjek dan latar. Kertasnya ikut "malam", sehingga terbaca
  sebagai filter warna, bukan cahaya.

**Saran**
- Untuk channel ini, ganti sumber aset dengan **pustaka ilustrasi kode** (Celah C3). Tanpa itu, gaya ini tidak layak
  dipakai.
- Grain hidup dari `t` (resep sudah ada di `techniques.md:537-538`), tinggal dipasang.

| Rupa | Tokoh | Kamera | Gerak | Performa | Agen | Aturan | 100 % kode |
|---|---|---|---|---|---|---|---|
| 3 | 2 | 4 | 3 | 5 | 4 | 3 | 1 |

Rupa 3 hanya berlaku bila aset raster ada. Tanpa aset, rupanya 1.

### S4 — Jurnalisme visual

**Render** (`audit/shots/starter-explainer-jurnalisme/kontak.png`): hitam pekat, angka hantu outline "2026", kotak
placeholder foto, lingkaran putus kuning, judul Barlow dengan sorotan kuning.

**Kelebihan**
- Hierarki teks dan bukti paling disiplin (tag sumber, kredit, angka besar). Kuat untuk segmen "arsip/bukti" di dalam
  video sejarah.
- Vignette berat (`starter-explainer-jurnalisme.html:43`) dan dasar gelap sudah bernuansa sinematik.

**Kekurangan**
- Rupa = foto. Tanpa foto, hanya hitam. Bertentangan langsung dengan batas keras.
- Ken Burns sebagai gerak utama aset (`references/explainer.md:207-210`) terbaca dokumenter TV, bukan film animasi.

**Saran**
- Pertahankan hanya sebagai **mode sisipan "dokumen/bukti"** (prasasti, peta kuno, kutipan) yang dibangun dengan HTML,
  sesuai resep dokumen di `references/explainer.md:161-165`. Itu sudah 100 % kode.

| Rupa | Tokoh | Kamera | Gerak | Performa | Agen | Aturan | 100 % kode |
|---|---|---|---|---|---|---|---|
| 3 | 1 | 4 | 3 | 5 | 4 | 4 | 1 |

### S5 — Katalog putih

**Render** (`audit/shots/starter-explainer-katalog/kontak.png`): putih bergrid 120 px, kotak cutout abu-abu, dokumen
ketik dengan stempel merah, blok tanggal hitam.

**Kelebihan**
- Perkakas "bukti" terlengkap: `slam`, `block`, `multiply`, `.doc`, `.stamp` (`references/explainer.md:191-193`;
  `starter-explainer-katalog.html:143`).

**Kekurangan**
- Estetika bersih korporat. Aturannya eksplisit: "Tanpa grain, tanpa vignette — bersih"
  (`references/explainer.md:425`). Ini berlawanan dengan arah sinematik.
- Bergantung pada cutout foto dan properti fotoreal hasil generate (`references/explainer.md:181-187`, `:429-430`).

**Saran**
- Tidak perlu dinaikkan untuk channel sejarah. Ambil perkakas dokumennya ke modul bersama. **[opini]**

| Rupa | Tokoh | Kamera | Gerak | Performa | Agen | Aturan | 100 % kode |
|---|---|---|---|---|---|---|---|
| 2 | 1 | 4 | 3 | 5 | 4 | 2 | 1 |

### S6 — Sketsa vintage

**Render** (`audit/shots/starter-explainer-sketsa/kontak.png`): kertas sepia bertekstur halus, angka hantu "1769",
bingkai oval placeholder "GANTI: ukiran sepia", judul Playfair dengan garis emas.

**Kelebihan**
- Kulit paling cocok dengan nada sejarah, dan paling banyak dipakai produksi (Babad Jawa, Sangiran, kedua Jagad).
- Tekstur kertas dari `feTurbulence` (`starter-explainer-sketsa.html:29`) sudah 100 % kode. Tipografi tiga lapis
  (display/italic/small-caps) matang (`references/explainer.md:470-474`).

**Kekurangan**
- Gambarnya ukiran hasil generate satu batch (`references/explainer.md:461-466`). Produksi menggantinya dengan foto
  Commons (`babad-sangiran-01/rencana.md` "80 foto Commons"). Di bawah batas baru, keduanya tidak boleh.
- Diagram pengganti di produksi Jagad sangat datar: gunung = satu segitiga coklat, prasasti = kotak abu-abu
  (`jagad-geografi-jawa-01/cek/kontak-bab.jpg`). Sebabnya, skill tidak punya resep "ukiran dari kode" (arsir silang,
  garis kontur bergaya etsa).
- Rupa "kertas dengan barang ditempel" pada dasarnya kolase. Sedalam apa pun, ia tidak akan terasa film animasi.

**Saran**
- Pertahankan sebagai **mode "arsip/catatan"** di dalam video. Tambahkan resep etsa prosedural: arsiran yang
  mengikuti heightmap (`feTurbulence` → threshold bergaris), garis tepi tinta bergetar, dan tinta yang "meresap" lewat
  `feDisplacementMap`.

| Rupa | Tokoh | Kamera | Gerak | Performa | Agen | Aturan | 100 % kode |
|---|---|---|---|---|---|---|---|
| 3 | 2 | 4 | 3 | 4 | 4 | 3 | 1 |

Performa 4: ekspor 213 ms/frame, tertinggi di antara starter 2D (kertas `feTurbulence`). Seek + screenshot PNG
pertama 2,3 dtk.

### S7 — Kartun panggung

**Render** (`audit/shots/starter-explainer-panggung/kontak.png`): rumah krem beratap koral, tokoh kaos teal berjalan,
papan "GANTI", jemuran tiga warna, lalu panggung pusat data: rak gelap dengan lampu berkedip, kipas, pipa dengan tetes
air. Semua isian datar. Bayangan hanya elips di kaki dan sisi gelap 0,86× warna dasar.

**Kelebihan**
- **Satu-satunya sistem tokoh.** Hierarki sendi lengkap, idle bernapas, kedip berselang, jalan dengan bayangan ikut,
  lompat dari satu kurva, aksi kecil per kalimat (`references/kartun-panggung.md:88-119`). Pola `J()` mencegah dua
  jebakan GSAP pada SVG (`:121-147`).
- Hukum "≥10 benda bergerak per panggung" (`references/kartun-panggung.md:71-86`) membuat adegan hidup. Ini sumbu
  "gerak" yang dikeluhkan pemilik, dan gaya ini sudah menjawabnya.
- 100 % vektor bisa dicapai: kepala vektor sederhana "cukup untuk gaya ini" (`references/kartun-panggung.md:196-198`).
  Produksi Mataram membuktikannya untuk 58 menit.
- Ringan: **205 ms/frame**.

**Kekurangan**
- **Hukum 7 mengunci rupa flat:** "Flat fill, tanpa outline, tanpa tekstur, tanpa vignette. Bayangan hanya elips
  kontak di tanah dan sisi gelap bangunan 0,86–0,9× warna dasar… yang dikunci di sini hanya **tanpa tekstur**"
  (`references/kartun-panggung.md:157-166`). Juga "Latar | flat cerah, tanpa tekstur" (`:21`).
- **Tidak ada cahaya sama sekali.** Starter tidak memuat `light()`. Hitungan kode: `light(` 0, `vignette` 0,
  `filter:` 0, `data-z` 0. Palet terkunci pada pastel siang (`starter-explainer-panggung.html:35-37`). Langit, bukit,
  dan tanah dibangun dari satu warna per bentuk (`:59-61`).
- **Kamera tersempit.** Rig sendiri tanpa `CAM` (`starter-explainer-panggung.html:57-58`, `:104`): tanpa sudut,
  tanpa lensa, tanpa paralaks `data-z`, tanpa handheld, tanpa fokus. Aturannya: zoom 1,08–1,95 "tidak pernah wide"
  (`references/kartun-panggung.md:10`, `:27-29`), antar panggung hanya cut atau geser 96 px tanpa scale bump
  (`:51-60`), dan dilarang terbang lintas dunia (`:63-65`). Establishing shot, crane, dan mata elang tidak mungkin
  dibuat.
- **Tokoh = manekin.** Badan berupa kotak membulat, tampak depan saja, ekspresi lewat tukar gambar
  (`references/kartun-panggung.md:115-116`). Kepala raster yang "terbukti" butuh generate
  (`references/kartun-panggung.md:170-189`), dan prompt-nya justru meminta "VERY MINIMAL flat 2D… no shading"
  (`:175-181`).
- Panggung lebar 3200 px dengan satu lapisan bukit (`:60`) tidak punya kedalaman: tidak ada latar jauh, tengah, dekat,
  dan depan lensa.

**Bukti di produksi:** Mataram (`cek/s04/kontak.png`, `cek/k-gab.png`, `thumbnail-1.jpg`). Adegan "malam + bara"
(185 dtk) berupa siluet hitam di depan nyala api segitiga tanpa cahaya yang jatuh ke sekitarnya. Adegan "senja"
memakai matahari kuning datar di langit merah dengan prasasti abu-abu yang tidak terkena warna senja sama sekali.
Kabut (212 dtk) berupa pita putih transparan.

**Saran (urut dampak)**
1. Ubah Hukum 7 dari "tanpa tekstur" menjadi **dua kulit**: "flat cerah" (seperti sekarang, untuk edukasi) dan
   "ilustrasi sinematik" (cahaya bersumber, rim, kabut berlapis, grain hidup, vignette).
2. Pasang `CAM` bersama ke rig panggung: sudut, lensa, `data-z` per lapisan panggung, handheld, fokus. Rig sendi
   tetap. Izinkan wide/EWS untuk establishing dan satu shot mata elang per bab.
3. Tambah **sistem cahaya 2D per adegan** (Celah C1) yang menerangi tokoh: rim di sisi sumber, bayangan jatuh
   miring, dan *falloff* dari obor.
4. Tambah tampak samping dan 3/4 pada rig tokoh, serta pustaka kostum/ornamen Jawa kuno (Celah C4).

| Rupa | Tokoh | Kamera | Gerak | Performa | Agen | Aturan | 100 % kode |
|---|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 4 | 5 | 3 | 1 | 4 |

Agen 3: jebakan transform manual (`references/kartun-panggung.md:121-147`) masih harus diingat agen, dan `walk()`
wajib urut waktu (`CHANGELOG.md:29-30`).

### S8 — Explainer 3D

**Render** (`audit/shots/starter-explainer-3d/kontak.png` dan `…-3d-demo/kontak.png`): satu kubus abu-abu di lantai
abu gelap dengan bayangan lembut, langit gelap di atas garis kabut, HUD "Judul ≥ 120 px". Katalog demo memperlihatkan
pergantian ukuran shot, sudut dutch (lantai miring), preset `night`/`blue` (biru gelap), dan `golden` yang samar.

**Kelebihan**
- **Kamera terlengkap dan paling jujur**: shot dari `Box3`, sudut dengan lensa yang bertahan, `rail()` Catmull-Rom,
  dolly zoom, `BokehPass`, `rule180`, zona aman HUD 3D (`references/sinematografi.md:25-113`; `CHANGELOG.md:8-11`).
  `rail()` adalah bahan langsung untuk shot mata elang.
- **Rig cahaya sungguhan**: key/fill/rim per preset, bayangan PCF soft, `practical()` = `PointLight` + bahan berpendar
  (`references/sinematografi.md:100-113`). Obor, tungku, dan jendela bisa menerangi sekitar dengan falloff fisik. Ini
  persis kelemahan spike SVG.
- Uji determinisme lintas jalur seek ada di CI (`CHANGELOG.md:24-26`).
- Murah di mesin ini: **194 ms/frame** untuk starter, **275 ms** untuk katalog demo (dengan bayangan). Biaya yang
  terdokumentasi: bayangan +29 ms, Bokeh 169 vs 42 ms (`references/sinematografi.md:268-271`).

**Kekurangan**
- **Tanpa aset dan tanpa tokoh.** Hanya geometri prosedural atau `fromSVG` (`references/sinematografi.md:229-230`).
  Gapura, candi, pohon beringin, dan manusia harus dibangun dari primitif. "ECU/CU pada kotak polos = bidang rata"
  (`:264-266`) sudah diakui.
- Rupa bawaan anti-sinematik: `NoToneMapping` wajib (`references/sinematografi.md:238-240`;
  `starter-explainer-3d.html:119`), kabut linear yang tujuannya menyembunyikan tepi lantai (`:446`;
  `references/sinematografi.md:249-251`), dan tanpa bloom di starter 3D (hanya `BokehPass`). Family "realistis" tanpa
  tekstur (`kamera-three.js:108`).
- 3D + gaya ilustrasi (toon 3 tingkat, `kamera-three.js:101-105`) menghasilkan look "game low-poly", bukan
  "lukisan". **[opini]**
- Dokumen sendiri menyarankan foto/aset datar tidak dipakai di 3D (`references/sinematografi.md:22-23`), sehingga
  kolase tidak bisa digabung.

**Saran**
- Tambah **mode "diorama"**: bidang SVG/kanvas ilustrasi (latar, gunung, pohon) sebagai *card* ber-alpha di dunia
  3D yang diterangi `practical()`, dengan kabut eksponensial berlapis + bloom + tone mapping film. Ini mirip pipeline
  "2.5D di mesin 3D" (gaya Arcane/Klaus). Lampu dan kamera tetap 3D, rupa tetap ilustrasi.
- Modul geometri prosedural untuk arsitektur Jawa kuno (candi bertingkat, gapura bentar, atap tajug/joglo, umpak) dan
  vegetasi berbasis *instancing*.

| Rupa | Tokoh | Kamera | Gerak | Performa | Agen | Aturan | 100 % kode |
|---|---|---|---|---|---|---|---|
| 2 | 1 | 5 | 2 | 4 | 3 | 3 | 5 |

Aturan 3: tone mapping dikunci, tetapi tidak ada larangan cahaya atau atmosfer.

### Menu kulit §7f (sepuluh arah)

Penilaian ringkas. Kecocokan dengan channel sejarah sinematik **[opini]**:

| Arah | Dekat ke patokan "film animasi"? | Catatan |
|---|---|---|
| Sinematik gelap | **ya, paling dekat** | latar gradasi nyaris hitam + bloom pada objek (`techniques.md:706`). Kosakatanya produk/tech; ganti partikel nebula → bara/kunang-kunang |
| Mewah gelap | **ya** | "hitam + emas, bayangan lembut, kilau, sinar menyapu" (`:713`). Cocok untuk kerajaan, prasasti tembaga, prada |
| Kertas & cetak | sebagian | = kolase. Bagus untuk mode legenda/arsip |
| Retro/analog | sebagian | grain dan pudar bisa dipakai sebagai grading "film lama" |
| Grainy gradient | sebagian | resep gradien di BENTUK + butiran (`:508-557`) adalah teknik dasar untuk langit/cahaya ilustrasi |
| Editorial terang, poster color-block, brutalis mono, pastel ceria, flat pop berfoto | tidak | estetika promo/brand. Flat pop butuh foto |

Kekurangan menu: semua baris ditulis untuk **opener produk** ("Cocok untuk: alat kreatif, gaming, teknologi…").
Tidak ada arah "ilustrasi sinematik/painterly", "siluet & rim", atau "wayang/relief", padahal ketiganya kunci bagi
pemilik. Hanya dua baris yang punya kode.

### Menu render objek §7e

- Bagus sebagai disiplin ("satu keluarga per video", `references/techniques.md:559-563`).
- Untuk batas 100 % kode, resep "objek realistis paling efisien dibuat sebagai gambar/video dari generator"
  (`references/techniques.md:577-579`) tidak bisa dipakai.
- **Tidak ada family "ilustrasi bercahaya"** (isian datar + rim + *core shadow* + *bounce light*), padahal family itu
  yang dibuktikan spike (bata `feDiffuseLighting` + heightmap luminans).

### Gaya turunan produksi (ringkas)

| Gaya | Rupa | Catatan |
|---|---|---|
| Sketsa + arsip (Babad Jawa, Sangiran) | 3 dengan foto, 1 tanpa foto | kualitas datang dari foto Commons; diagram vektornya polos |
| Kulit topografi (Jagad) | 2 | garis kontur memberi tekstur; diagram tetap datar (segitiga gunung) |
| Ilustrasi adegan (Mataram) | 1–2 | rencana cahaya per segmen tidak terwujud karena mesinnya tidak punya alat cahaya |

---

## 4. Tabel skor

| Gaya | Rupa | Tokoh | Kamera | Gerak | Performa | Agen | Aturan | 100 % kode | **Jumlah /40** |
|---|---|---|---|---|---|---|---|---|---|
| S1 Opener (sinematik gelap) | 3 | 1 | 3 | 3 | 2 | 3 | 4 | 5 | 24 |
| S2 Aksi kontinu | 2 | 1 | 4 | 4 | 5 | 3 | 3 | 5 | 27 |
| S3 Kartun kolase | 3* | 2 | 4 | 3 | 5 | 4 | 3 | 1 | 25 |
| S4 Jurnalisme | 3* | 1 | 4 | 3 | 5 | 4 | 4 | 1 | 25 |
| S5 Katalog | 2* | 1 | 4 | 3 | 5 | 4 | 2 | 1 | 22 |
| S6 Sketsa vintage | 3* | 2 | 4 | 3 | 4 | 4 | 3 | 1 | 24 |
| S7 Kartun panggung | 1 | 3 | 2 | 4 | 5 | 3 | 1 | 4 | 23 |
| S8 Explainer 3D | 2 | 1 | 5 | 2 | 4 | 3 | 3 | 5 | 25 |
| *Pembanding: spike gapura (SVG)* | *4–5* | *2* | *–* | *2* | *1–2* | *1* | *–* | *5* | – |

\* rupa dengan aset raster. Tanpa raster (batas pemilik), turun ke 1.

Jumlah ini menyesatkan bila dibaca lurus: performa dan kemudahan agen menaikkan gaya-gaya flat. **Untuk tujuan
pemilik, kolom Rupa + Tokoh + 100 % kode yang menentukan**, dan tidak ada gaya bawaan yang lewat 6 dari 15 di tiga
kolom itu (S7 = 8, S3/S6 = 6 hanya dengan raster terlarang). **[opini]**

---

## 5. Celah lintas-gaya

### C1. Sistem pencahayaan bersama (2D) — tidak ada
- 2.5D: overlay gradien layar penuh (`src/runtime/kamera-dom.js:30-44`). Yang tidak ada: arah key, rim pada tepi
  subjek, bayangan jatuh, cahaya titik dengan falloff, *light wrap*, sinar volumetrik, dan pemisahan "yang terkena
  cahaya" dari "yang tidak". Preset `lowkey` hanyalah vignette 92 % hitam (`kamera-dom.js:35`). Di render demo
  (15,2 dtk) hasilnya lubang terang di tengah kertas.
- Spike membuktikan bahan SVG-nya ada: `feDiffuseLighting`/`feSpecularLighting` + heightmap (bata dan relief timbul),
  `fePointLight` untuk obor, serta masker radial untuk memalsukan falloff (cahaya titik SVG tidak meredup dengan jarak).
- **Usulan:** modul `cahaya-2d.js` dengan kontrak seperti `light()`, tetapi per **lapisan** dan per **sumber**:
  `sumber(at,{x,y,warna,jangkau})` menghasilkan (a) masker *falloff* radial, (b) rim otomatis pada tokoh/objek yang
  ditandai `data-terima-cahaya` (offset siluet ke arah sumber, warna sumber, `mix-blend:screen`), (c) bayangan jatuh
  (siluet di-skew menjauhi sumber), dan (d) relief `feDiffuseLighting` yang **dipanggang sekali** per adegan.

### C2. Atmosfer — sebagian, tidak tersistem
- Ada: menu gerak latar (partikel naik, `references/techniques.md:471`), kabut 3D linear, dan `tint` per adegan
  (`references/explainer.md:233-234`).
- Tidak ada: kabut berlapis per kedalaman (makin jauh makin pucat dan bergeser ke warna langit), *god rays*, asap
  bervolume, bara/percik dengan glow, hujan/debu dengan blur gerak, kabut tanah yang bergerak.
- Konflik teknis: efek atmosfer (`filter`, `opacity`, `mix-blend-mode`) pada `#world` atau di antara `#world` dan bidang
  `[data-z]` **meratakan paralaks** (`references/sinematografi.md:304-307`). Atmosfer harus dirancang per bidang sejak
  awal, bukan ditempel di atas.

### C3. Pustaka aset 100 % kode — tidak ada
- Prinsip roadmap menolak starter "berisi konten contoh yang terlalu jadi" (`references/roadmap.md:70-72`). Alasannya
  sah untuk urutan adegan, tetapi akibatnya tidak ada **komponen**: tiap produksi menggambar ulang rumah, candi,
  pohon, gunung, dan tokoh (`*/alat/mesin.js` ±25 KB × 4, `babad-mataram-timur-01/alat/ilus.js` 40 KB).
- **Usulan:** `src/pustaka/` berisi fungsi prosedural ber-seed dan berparameter (bukan adegan): `candi({tingkat,
  bahan:'andesit'|'bata'})`, `gapura()`, `rumahPanggung()`, `beringin()`, `lontar()`, `gunungBerlapis()`,
  `sawahTerasering()`, `obor()`, `api()`, `asap()`, `relief()`, `kain({motif})`. Tiap fungsi menerima `cahaya`
  (arah/warna) dan `jarak` (untuk kabut). Pustaka ini dimuat lewat `build-starters.mjs` seperti runtime kamera.

### C4. Sistem tokoh — hanya satu, minimal
- Rig sendi panggung = tampak depan, kotak membulat (`starter-explainer-panggung.html:65-91`). Tidak ada tampak
  samping/3/4/belakang, tangan, jari, kain yang berayun, rambut/sanggul bergerak, kerumunan, maupun variasi wajah tanpa
  generate.
- Tidak ada aturan siluet (keterbacaan tokoh di cahaya belakang), padahal itu ciri patokan pemilik.
- **Usulan:** rig "tokoh-2d" generasi kedua dengan tiga arah pandang + tubuh dari kurva (bukan rect), lapisan
  rim/bayangan dari C1, kostum dan atribut Jawa kuno (kain, kelat bahu, mahkota, keris, tombak, perisai) sebagai
  komponen, dan generator kerumunan ber-seed (variasi tinggi/kain/pose, LOD jadi siluet di kejauhan).

### C5. Kamera sinematik 2D — kosakata ada, jalur dan lensa belum
- Ada di 2.5D: shot, sudut 3–12°, dolly/truck/pedestal/pan/tilt, `lens`, `dollyZoom`, `whipPan`, `handheld`,
  `focus/rackFocus` (`references/sinematografi.md:25-98`).
- Tidak ada: `rail()` 2.5D (`:175`), FPV/mata elang, roll besar terkendali, *motion blur* kamera (blur berarah ikut
  kecepatan kamera, bukan hanya pada teks atau whip), *lens flare*, aberasi kromatik, *lens dirt*, distorsi lensa lebar.
- Aturan yang bertabrakan dengan mata elang: `references/anti-ppt.md:42`, `references/techniques.md:300-303`,
  `references/kartun-panggung.md:10`, `:63-65`.
- **Usulan:** `terbang(at,dur,titik[],{roll,fov,tembus})` untuk 2.5D: jalur Catmull-Rom di ruang (x, y, z) atas bidang
  `[data-z]`, roll mengikuti kelengkungan (*banking*), blur gerak sebanding kecepatan, dan "menembus celah" lewat
  bidang depan yang melewati near plane. Tulis pengecualian di anti-ppt: **"satu shot mata elang per bab, termotivasi
  (pembuka / pindah tempat), ≥ 3 dtk, ditutup oleh mendarat di subjek"**, dengan alasan dan contoh gagalnya, sesuai
  format roadmap (`references/roadmap.md:79-80`).

### C6. Pasca-proses / grading bersama — tidak ada untuk 2D
- Vignette ditulis manual di tiap starter (`starter-explainer-kartun.html:43`, `-jurnalisme.html:43`, `-sketsa.html:41`,
  `-katalog.html:53`, `starter-explainer.html:37`). Grain statis (Ringkasan #7). Bloom hanya di WebGL.
- Tidak ada: grading per adegan (warna bayangan vs sorot, *split-tone* senja jingga/biru), bloom 2D pada api/matahari,
  halation, dan palet serempak per adegan yang diturunkan dari sumber cahaya.
- **Usulan:** `pasca.js` dengan satu objek `GRADE` yang di-tween (`{bayangan,sorot,saturasi,bloom,grain,vignette}`),
  diterapkan sebagai lapisan teratas (grain hidup dari `t`, vignette, bloom 2D lewat duplikat lapisan terang
  `blur + screen` yang dipanggang).

### C7. Aturan performa untuk rupa berat — tidak ada
- Satu-satunya aturan: filter SVG yang terus aktif "dirasterisasi ulang tiap frame, mahal"
  (`references/techniques.md:164-165`). `focus()` 2.5D sendiri menulis `filter: blur()` ke tiap bidang setiap frame
  (`kamera-dom.js:19`).
- Spike: filter yang dihitung ulang tiap frame memakan 919 ms/frame. Memisah lapisan ke `div` + `will-change` dan
  memanggang cahaya menurunkannya ke 416 ms (ukuran audit ini, Lampiran B).
- **Usulan:** aturan "**statis dipanggang, yang bergerak ringan**": relief/bata/tekstur dirender sekali ke
  `<canvas>`/`ImageBitmap` saat setup (deterministik karena ber-seed), sedangkan yang dianimasikan per frame hanya
  transform, opacity, dan masker. Tetapkan anggaran (mis. ≤ 350 ms/frame @1080p di mesin i3-3217U) dan ukur lewat
  skrip seperti `audit/render.mjs` di `test-starters`.

### C8. Ekspor dan alur video panjang — di luar skill
- Skill membatasi explainer ≤ 90 dtk per bab (`references/explainer.md:58-62`). Bawaan ekspor 60 fps
  (`scripts/export-frames.mjs:47`), padahal produksi memakai `FPS=30 SYNC=1`
  (`jagad-fosil-01/alat/render-semua.sh:19`).
- Tiap produksi membuat sendiri: naskah → JSON, TTS, linimasa kata, build per babak, antrian render berurutan
  ("paralel justru lebih lambat", `render-semua.sh:2`), penahan sleep, gabung MP4, SRT, deskripsi.
- **Usulan:** jalur baca "Video panjang" + `scripts/render-antrian.mjs` (resume per babak, log fps, perkiraan selesai,
  penahan sleep Windows). Ini juga tempat anggaran performa C7 dipaksakan.

### C9. Penilaian kualitas visual — tidak ada
- `lint-motion.mjs` hanya memeriksa struktur dan determinisme (`scripts/lint-motion.mjs:44-144`). Eval brief tidak ada
  yang tentang ilustrasi sinematik atau video panjang (`evals/briefs/01…09`). "Kalibrasi rasa" mengukur ke-PPT-an,
  bukan cahaya (`references/anti-ppt.md:100-110`).
- **Usulan:** cek frame otomatis dari `snap.mjs`: rentang nilai (histogram luminans; flat = rentang sempit), rasio
  kontras subjek/latar, keberadaan titik paling terang di dekat sumber cahaya yang dideklarasikan, dan jumlah warna
  dominan per adegan (palet serempak). Tambah eval brief "babak sejarah 60 dtk, malam + obor, satu tokoh, satu shot
  mata elang".

### C10. Kontradiksi aturan
| Aturan A | Aturan B | Akibat |
|---|---|---|
| "permukaan latar ≥ 2 lapis — bukan flat" (`SKILL.md:240-241`); "Gradien kaya, cahaya, 3D, kedalaman, tekstur… dianjurkan" (`SKILL.md:294-300`) | "Flat fill… tanpa tekstur, tanpa vignette" (`references/kartun-panggung.md:163`) | agen memilih aturan yang lebih spesifik, yaitu flat |
| "flat = PPT" (`references/techniques.md:401`) | "Flat solid… edukasi" (`references/techniques.md:567`), "Ilustrasi karakter flat" (`:575`) | tidak jelas kapan flat sah |
| sejarah → gaya 4 atau 1 (`references/explainer.md:35-36`) | batas pemilik 100 % kode | rekomendasi bawaan menunjuk gaya yang tidak bisa dipakai |
| explainer ≤ 90 dtk/bab (`references/explainer.md:58-62`) | produksi 25–60 menit | semua alur panjang berada di luar skill |
| 3D: `NoToneMapping` "biarkan" (`references/sinematografi.md:238-240`) | kebutuhan cahaya api/senja | highlight menggunting |

### C11. Galeri dan etalase
Galeri README memamerkan gaya yang bergantung pada raster (`README.md:58-67`). Belum ada contoh "ilustrasi sinematik
100 % kode". Bila arah ini dibangun, satu still bergaya spike di galeri akan menjadi bukti dan sekaligus kalibrasi
agen. **[opini]**

---

## 6. Dibandingkan dengan spike "gapura malam"

**Apa yang dicapai spike** (`spike-gapura/f_7.png`, `spike-cepat/f_7.png`): langit ungu berlapis awan, siluet pagoda
dan palem bertingkat kabut, bata gapura bentar timbul (`feDiffuseLighting` + heightmap), dua obor dengan cahaya hangat
yang jatuh di bata, kabut tanah, bara melayang, tokoh penjaga berperisai dengan rim emas, dan beringin dengan akar gantung
di latar depan kiri. Inventaris filter: 6 `feDiffuseLighting`, 2 `feSpecularLighting`, 3 `fePointLight`,
1 `feDistantLight`, 4 `feTurbulence`, 6 `feGaussianBlur`.

**Yang masih lemah:** tokoh masih manekin (anatomi kotak, tampak samping kaku), lantai berulang, obor tidak menerangi
tokoh, dan biaya render tinggi.

| Gaya | Jarak ke tingkat spike | Kenapa | Kerja utama |
|---|---|---|---|
| **S7 Kartun panggung** | **dekat** | 100 % SVG, panggung per adegan, tokoh bersendi, ≥10 benda hidup; spike pada dasarnya "panggung + cahaya" | buka Hukum 7, pasang C1 + C2 + C6, `CAM` + `data-z` per lapisan panggung, rig tokoh v2 |
| **S2 Aksi kontinu** | **dekat** | 100 % SVG, lapisan strip = lapisan kedalaman alami untuk kabut berjenjang | C1 + C2 per strip, hero bercahaya; cocok untuk perjalanan/perang |
| S1 Opener | sedang | pasca-proses WebGL sudah ada; isi harus diganti total | kanvas ilustrasi di atas WebGL, palet ke tema |
| S8 3D | sedang, arah berbeda | cahaya titik dengan falloff dan bayangan sungguhan (yang tidak bisa dicapai SVG), kamera terbang siap | mode diorama (kartu ilustrasi di ruang 3D), tone mapping film, pustaka geometri Jawa kuno; tokoh tetap masalah |
| S6 Sketsa | jauh (perombakan) | rupanya dari raster | jadikan mode arsip; etsa prosedural |
| S3 Kartun kolase, S4 Jurnalisme, S5 Katalog | jauh (perombakan / tidak relevan) | rupanya dari raster | ambil perkakas dokumen/bukti saja |

**[opini]** Jalan termurah ke "film animasi 100 % kode" adalah **S7 yang dibebaskan + modul cahaya/atmosfer/pasca
bersama**. S8 dipakai untuk 1–2 hero shot per bab, sejalan dengan rekomendasi hibrida
`analisis-3d-sinematografi-2026-10-03.md` §6, ditambah opsi diorama. Biaya yang harus disadari: tingkat spike-cepat
sudah 2× lebih mahal daripada starter (416 vs ±200 ms/frame). Tanpa C7, satu video 45 menit bisa memakan semalam
penuh atau lebih.

---

## 7. Yang harus diperbaiki / ditingkatkan / ditambah (prioritas)

### P0 — perbaiki (aturan yang menghalangi, murah)
1. **Pecah Hukum 7 kartun panggung** menjadi dua kulit: "flat cerah" dan "ilustrasi sinematik"
   (`references/kartun-panggung.md:157-166`, `:21`). Tulis alasan dan contoh gagalnya (Mataram: rencana "malam + bara"
   jadi blok rata).
2. **Selaraskan kontradiksi** di tabel C10: flat sah hanya bila dipilih sadar di style brief. Ubah rekomendasi
   "sejarah → 4 atau 1" menjadi bersyarat: "bila aset raster diizinkan; bila 100 % kode → panggung sinematik".
3. **Pengecualian tertulis untuk shot mata elang** di `anti-ppt.md:42`, `techniques.md:300-303`, dan
   `kartun-panggung.md:10`, `:63-65` (jatah, motivasi, durasi, cara mendarat).
4. **Grain hidup** di semua starter (resep `techniques.md:537-538` sudah ada, belum dipakai).

### P1 — tingkatkan (modul bersama yang menaikkan semua gaya)
5. `cahaya-2d.js` (C1): sumber titik/arah per adegan, falloff bermasker, rim otomatis, bayangan jatuh, relief yang
   dipanggang.
6. `atmosfer.js` (C2): kabut per bidang `[data-z]`, bara/debu/asap ber-seed, *god rays*, yang aman terhadap perataan
   `preserve-3d`.
7. `pasca.js` (C6): `GRADE` yang di-tween, vignette, bloom 2D, halation, grain.
8. **Pasang `CAM` ke kartun panggung**: sudut, lensa, `data-z`, handheld, fokus. Izinkan WS/EWS.
9. **Aturan performa + anggaran** (C7): "statis dipanggang", ukur ms/frame di `test-starters`.
10. 3D: opsi tone mapping film untuk konten non-brand, kabut eksponensial berlapis, bloom di starter 3D.

### P2 — tambah (kemampuan baru)
11. `terbang()` 2.5D (C5) + resep shot mata elang di 2.5D dan 3D (`rail` + roll banking + blur kecepatan + tembus
    bidang depan).
12. Rig tokoh v2 (C4): tiga arah pandang, tubuh kurva, kostum/atribut Jawa kuno, kerumunan ber-seed.
13. Pustaka aset prosedural (C3): arsitektur, vegetasi, api/asap, kain/motif, relief.
14. Efek lensa: flare anamorfik, aberasi kromatik di tepi, lens dirt, blur gerak kamera.
15. Mode diorama 3D (kartu ilustrasi di ruang 3D yang diterangi `practical()`).
16. Jalur baca "Video panjang" + antrian render dengan resume dan penahan sleep (C8).
17. Penilaian visual otomatis + eval brief sinematik (C9). Satu still "ilustrasi sinematik" di galeri (C11).

---

## Fakta yang tidak bisa diverifikasi

- **Angka performa spike sesi brainstorming** (7,5 dtk/frame, 1,6 fps, lalu 10 fps setelah lapisan dipisah dan cahaya
  dipanggang) diukur oleh agen di sesi itu, bukan oleh pemilik. Angka 10 fps adalah putar langsung (hitungan rAF
  selama 5 dtk di Chrome headless), dan 7,5 dtk adalah screenshot puppeteer PNG termasuk muat halaman, jadi keduanya
  bukan biaya ekspor. Pengukuran ulang dengan pola ekspor (render → 2× rAF → screenshot JPEG q80): `spike-gapura`
  919 ms/frame (1,09 fps), `spike-cepat` 416 ms/frame (2,32 fps); render + 2× rAF saja 67 ms dan 19 ms.
- **Asal gambar galeri README.** Tidak ada catatan di repo apakah `docs/gallery/*.jpg` adalah render starter WeVai atau
  mockup. Gambar 07–11 memuat foto atau ilustrasi raster yang sumbernya tidak dicatat.
- **Video patokan** "1.000 Tahun Kerajaan Jawa dalam 30 Menit" tidak ditonton di audit ini. Ciri-cirinya diambil dari
  ringkasan pemilik.
- **Nilai Rupa untuk gaya kolase "dengan aset"** didasarkan pada galeri dan produksi, bukan render starter (starter
  hanya berisi placeholder).
- **Skor bersifat penilaian** satu auditor dengan alasan tertulis, bukan pengukuran (kecuali kolom performa).

---

## Lampiran A — Gambar yang dibuat (scratchpad, tidak masuk repo)

Akar: `C:\Users\ITBAHA~1\AppData\Local\Temp\claude\e--mila-wevai\383a7178-971d-49f1-a618-2ab57bb9b86c\scratchpad\audit\`

| Isi | Path |
|---|---|
| Skrip render + ukur starter | `…\audit\render.mjs` |
| Skrip lembar kontak (PIL) | `…\audit\sheet.py` |
| Skrip ukur spike | `…\audit\spike.mjs` |
| Lembar kontak opener | `…\audit\shots\starter-opener\kontak.png` |
| Lembar kontak aksi kontinu | `…\audit\shots\starter-explainer\kontak.png` |
| Lembar kontak kartun kolase | `…\audit\shots\starter-explainer-kartun\kontak.png` |
| Katalog demo kartun kolase (`?demo=1`) | `…\audit\shots\starter-explainer-kartun-demo\kontak.png` |
| Lembar kontak jurnalisme | `…\audit\shots\starter-explainer-jurnalisme\kontak.png` |
| Lembar kontak katalog | `…\audit\shots\starter-explainer-katalog\kontak.png` |
| Lembar kontak sketsa | `…\audit\shots\starter-explainer-sketsa\kontak.png` |
| Lembar kontak kartun panggung | `…\audit\shots\starter-explainer-panggung\kontak.png` |
| Lembar kontak 3D | `…\audit\shots\starter-explainer-3d\kontak.png` |
| Katalog demo 3D (`?demo=1`) | `…\audit\shots\starter-explainer-3d-demo\kontak.png` |
| Frame tunggal (8 per starter) | `…\audit\shots\<starter>\t<detik>.png` |
| Lembar galeri README | `…\audit\galeri-kontak.png` |
| Angka mentah | `…\audit\ukur-semua.json`, `…\audit\ukur-starter-explainer-3d-demo.json`, `…\audit\ukur-starter-explainer-kartun-demo.json` |

Bukti produksi yang dilihat: `E:\mila\babad-mataram-timur-01\cek\k-gab.png`, `…\cek\k-d.jpg`, `…\cek\s04\kontak.png`,
`…\thumbnail-1.jpg`; `E:\mila\babad-jawa-01\cek\final-bab.jpg`, `…\cek\k7.jpg`;
`E:\mila\babad-sangiran-01\cek\kontak-03.jpg`; `E:\mila\jagad-fosil-01\cek\kontak-04.jpg`;
`E:\mila\jagad-geografi-jawa-01\cek\kontak-bab.jpg`. Spike: `…\scratchpad\spike-gapura\f_7.png`,
`…\scratchpad\spike-cepat\f_7.png`.

## Lampiran B — Angka pengukuran

Mesin: Intel Core i3-3217U @1,8 GHz (2 inti/4 utas), Intel HD Graphics 4000. Chrome 156.0.8078.74 headless, `--use-gl=angle
--ignore-gpu-blocklist`, 1920×1080, `file://`. "Ekspor" = rata-rata 30 frame berurutan @30 fps dari detik 1:
`seek(t)` → 2× rAF → screenshot JPEG q80. "Seek+PNG" = median 8 potret lembar kontak (PNG, termasuk frame pertama yang
memuat font, jadi kasar).

| Halaman | Durasi | Seek+2rAF (median) | Seek+PNG (median) | **Ekspor ms/frame** | **fps** | 45 mnt @30 fps* |
|---|---|---|---|---|---|---|
| starter-opener | 8 dtk | 65 ms | 898 ms | **470** | 2,13 | ±10,6 jam |
| starter-explainer (aksi kontinu) | 22 dtk | 34 ms | 448 ms | **188** | 5,32 | ±4,2 jam |
| starter-explainer-kartun | 18 dtk | 54 ms | 1.680 ms | **202** | 4,96 | ±4,5 jam |
| starter-explainer-kartun `?demo=1` | 18 dtk | 90 ms | 2.076 ms | **202** | 4,96 | ±4,5 jam |
| starter-explainer-jurnalisme | 18 dtk | 44 ms | 731 ms | **207** | 4,83 | ±4,7 jam |
| starter-explainer-katalog | 18 dtk | 39 ms | 454 ms | **202** | 4,96 | ±4,5 jam |
| starter-explainer-sketsa | 18 dtk | 36 ms | 2.324 ms | **213** | 4,69 | ±4,8 jam |
| starter-explainer-panggung | 12 dtk | 51 ms | 367 ms | **205** | 4,88 | ±4,6 jam |
| starter-explainer-3d | 8 dtk | 59 ms | 1.657 ms | **194** | 5,15 | ±4,4 jam |
| starter-explainer-3d `?demo=1` | 32 dtk | 59 ms | 1.754 ms | **275** | 3,64 | ±6,2 jam |
| spike-gapura (filter hidup) | – | 67 ms | – | **919** | 1,09 | ±20,7 jam |
| spike-cepat (lapisan + cahaya dipanggang) | – | 19 ms | – | **416** | 2,32 | ±9,4 jam |

\* 81.000 frame × ms/frame, satu worker, tanpa audio/encode. Pembanding produksi: Babad Jawa "±4,8 frame/dtk di
mesin ini" (`babad-jawa-01/README.md:23`), Jagad Fosil tahap akhir "±7–8 jam di mesin 2 inti"
(`jagad-fosil-01/README.md:20`), dan rencana Mataram "±10–12 jam" untuk 60 menit
(`babad-mataram-timur-01/rencana.md:83`).

Catatan: ±190–210 ms adalah lantai biaya screenshot + JPEG 1080p di mesin ini (sesuai
`analisis-3d-sinematografi-2026-10-03.md` §4.5: "screenshot+JPEG ±190 ms"). Perbedaan rupa antar starter 2D belum
terlihat di angka ekspor karena isinya hampir kosong. Opener (bloom) dan spike adalah satu-satunya yang jelas di atas
lantai.

Hitungan fitur visual per starter (grep, angka = baris yang memuat): `light(` — opener 8, 3D 8, kolase/aksi 6,
panggung **0**. `vignette`/`.vig` — semua kecuali panggung. `feTurbulence` — 3D 1, jurnalisme 1, kartun 1, sketsa 2,
panggung 0, aksi 0. `feDiffuseLighting`/`feSpecularLighting` — **0 di semua starter** (spike: 6/2). `grainAt` (grain
hidup) — **0 di semua starter**.
