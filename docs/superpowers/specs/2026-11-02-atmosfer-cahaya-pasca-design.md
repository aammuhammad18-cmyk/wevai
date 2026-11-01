# Spec — Atmosfer, cahaya-2d, dan pasca untuk gaya 2D/2.5D

Tanggal: 2026-11-02 · Status: draf, menunggu persetujuan pemilik · Target rilis: 1.3.0 ·
Sub-proyek 2 dari [`docs/peta-peningkatan-gaya-2026-11-01.md`](../../peta-peningkatan-gaya-2026-11-01.md) §8.
Latar: [`docs/audit-gaya-bawaan-2026-11-01.md`](../../audit-gaya-bawaan-2026-11-01.md) C1, C2, C6, C7;
[`docs/riset-sinematik-kode-2026-11-01.md`](../../riset-sinematik-kode-2026-11-01.md) §1, §5.

## 1. Tujuan dan alasannya

Pemilik ingin video WeVai terasa seperti film animasi. Patokannya video YouTube "1.000 Tahun Kerajaan Jawa dalam
30 Menit": ilustrasi siluet ber-rim light, cahaya bersumber (senja, api, obor), kabut berlapis, bara, dan palet
serempak. Semua harus **100 % kode**: tanpa gambar AI, tanpa foto.

Spike "gapura malam" (1 Nov) membuktikan rupa itu bisa dibuat dengan SVG + filter. Masalahnya, spike itu kode
sekali pakai. Setiap produksi sekarang menggambar ulang cahaya dan kabutnya sendiri, atau tidak sama sekali,
sehingga hasilnya flat. Sub-proyek ini menjadikan bahan spike **tiga modul runtime bersama** yang dipakai oleh
kartun panggung kulit B (sub-proyek 3), aksi kontinu, relief, dan wayang (sub-proyek 7).

## 2. Sasaran, bukan sasaran, anti-sasaran

**Sasaran**
- `atmosfer`: langit hidup, kabut berlapis per bidang, partikel (bara, debu, asap, kunang-kunang).
- `cahaya-2d`: sumber cahaya per adegan → pendar, gelap yang meredup dengan jarak, rim pada siluet, bayangan jatuh,
  relief yang dipanggang.
- `pasca`: grading per adegan yang bisa di-tween, vignette, halation/pendar sumber terang.
- **Bukti**: adegan spike gapura malam dibangun ulang memakai ketiga modul, ≤ 350 ms/frame @1080p di mesin acuan
  (i3-3217U/HD 4000, `export-frames.mjs` 1 worker), dan dinilai pemilik dengan mata terhadap patokan.

**Bukan sasaran** (sub-proyek lain): rig tokoh v2, pustaka aset (`candi()`, `beringin()`), `CAM` di kartun panggung,
gaya siluet sinematik sebagai starter, mata elang, tone mapping 3D, mode ekspor WebCodecs.

**Anti-sasaran** (gagal walau berfungsi):
- Animasi tidak deterministik: seek ke t yang sama memberi gambar berbeda, atau scrub ≠ ekspor.
- Paralaks `[data-z]` mati karena efek dipasang di jalur `#world` → bidang.
- Ekspor 60 menit jadi > 10 jam di satu worker karena filter dihitung ulang tiap frame.
- Modul yang hanya bisa dipakai oleh adegan bukti (parameter tertanam, bukan API).
- Tampak "efek Instagram": grading menutupi gambar yang tetap flat. Rupa harus datang dari cahaya bersumber.

## 3. Kendala

- Determinisme skill: semua keadaan = fungsi murni `tl.time()` + seed (`references/architecture.md`, daftar larangan).
- Aturan performa 1.2.0: filter berat dipanggang; yang bergerak hanya transform/opacity di lapisan `will-change`.
- `filter`/`opacity`/`mix-blend-mode`/`clip-path`/`mask` pada `#world` atau di antara `#world` dan bidang `[data-z]`
  meratakan paralaks (`references/sinematografi.md` §6). Efek dipasang pada **anak** bidang atau di luar `#world`.
- Satu berkas, `file://`, tanpa dependensi baru. Modul = `src/runtime/*.js` yang disisipkan `build-starters.mjs`.
- Mesin acuan tanpa WebGPU; WebGL2 lewat ANGLE D3D11. Ekspor gagal diam-diam ke WARP = ×30 lebih lambat.

## 4. Arsitektur

| Berkas | Tugas |
|---|---|
| `src/runtime/atmosfer.js` | `langit()` kanvas WebGL di belakang `#world`; `kabut()` pita kabut DOM per bidang; `partikel()` kanvas 2D per bidang |
| `src/runtime/cahaya-2d.js` | `sumber()` + `pendar()`, `redup()`, `rim()`, `bayangan()`, `relief()` |
| `src/runtime/pasca.js` | objek `GRADE` + `grade()`; lapisan tint/vignette/halation di atas `#world` |

Ketiganya tidak bergantung pada `kamera.js`, tetapi membaca `CAM` bila ada (untuk paralaks langit dan roll).
Satu jam: setiap modul menggambar dari `tl.time()` dengan merantai `tl.eventCallback('onUpdate')` seperti
`grainHidup` (callback lama tetap dipanggil). `grain.js` tidak diubah, jadi starter lain tidak tersentuh. `langit()`
yang membaca `CAM.roll` juga digambar dari `gsap.ticker` saat `CAM.shake` aktif — jalur yang sama dengan
`applyCam` handheld — supaya langit dan kamera tidak berselisih satu frame. *[keputusan Claude]*

### 4.1 `atmosfer`

**`langit(opsi)`** — satu `<canvas>` WebGL2 layar penuh di `#stage`, **di belakang** `#world` (bukan di dalamnya).
Langit berada di "tak hingga": translasi kamera tidak menggesernya; roll `CAM.roll` memutar uv, dan
`CAM.fx/fy × 0,02` memberi geser kecil. Isi satu fragment shader (±80 baris, bahan riset uji B):
- gradien langit 3 warna (zenit, tengah, horizon);
- cakram matahari/bulan + pendar;
- bintang (hash, berkelip dari `t`);
- awan fBm yang hanyut;
- **god rays dari matahari ke arah luar**. Karena kanvas ada di belakang siluet SVG, siluet itu sendiri yang
  menutupi berkas — tanpa pre-pass. *[keputusan Claude]*

Parameter = objek `LANGIT` yang di-tween GSAP (`tl.to(LANGIT,{matahariY:.8},at)`); shader digambar ulang hanya saat
`tl.time()` berubah. Tanpa WebGL2: fallback gradien CSS dari warna yang sama + peringatan konsol.

**`kabut(bidang, {y, tebal, warna, rapat, hanyut, seed})`** — pita kabut di **dalam** bidang (anak `[data-z]`, atau
grup panggung). Tekstur fBm dirasterisasi **sekali** saat setup ke `<canvas>` offscreen ber-seed, ditampilkan sebagai
`<div>` `will-change:transform`; hanyutnya = `translateX` dari `t`. Perspektif udara: bidang makin jauh → kabut makin
rapat dan makin mendekati warna horizon langit (helper `warnaJarak(z)`).

**`partikel(bidang|'depan', {jenis, n, area, seed, warna})`** — satu `<canvas>` 2D per pemanggilan. Posisi tiap
partikel = fungsi murni `(seed, i, t)` (tanpa akumulasi). Jenis bawaan: `bara` (naik berkelok, berpendar aditif,
memudar), `debu` (melayang di berkas cahaya), `asap` (gumpalan lebar pelan, opacity rendah), `kunang` (berkedip).
`'depan'` = kanvas di atas `#world`, di bawah HUD dan grain. Anggaran: ≤ 400 partikel per adegan.

### 4.2 `cahaya-2d`

**`sumber(nama, {x, y, bidang, warna, jangkau, kuat, kedip})`** — mendaftarkan sumber per adegan (obor, api unggun,
jendela, matahari). Posisi tetap dalam satu shot. Sumber yang pindah (obor dibawa tokoh) hanya menggeser
`pendar`-nya; rim dan redupnya diperbarui di cut. *[keputusan Claude: menghitung ulang rim tiap frame melanggar aturan
performa]*

Turunannya:
- **`pendar`**: gradien radial berwarna sumber, `mix-blend-mode:screen`, di bidang sumber. Kedip obor = opacity/skala
  dari noise ber-seed. Pendar ini sekaligus "bloom" sumber terang.
- **`redup(bidang, sumber[])`**: lapisan `multiply` gelap dengan lubang radial di tiap sumber — memalsukan falloff
  yang tidak dimiliki `fePointLight` (riset temuan 9). Dibatasi ke bentuk bidang lewat mask alfa (spike: tanpa ini
  langit ikut gelap). *[builder memilih: mask CSS dari salinan SVG atau `clipPath`]*
- **`rim(el, sumber)`** untuk elemen bertanda `data-rim`: filter SVG statis — alfa siluet digeser menjauhi sumber
  (`feOffset`), `feComposite operator="out"`, diwarnai warna sumber, lebar 2–4 px. Dipanggang: atribut filter tidak
  di-tween.
- **`bayangan(el, sumber, {lantai})`**: salinan siluet, warna gelap, di-skew menjauhi sumber di garis lantai,
  `multiply`, tepi diburamkan sekali.
- **`relief(el, {tinggi, arah|sumber})`**: preset `feDiffuseLighting` (+ `feSpecularLighting` opsional) dari heightmap
  luminans → bata, batu candi, kain. Dipanggang.

### 4.3 `pasca`

`GRADE = {suhu, bayangan, sorot, kontras, saturasi, vignette, halation}` di-tween seperti `CAM`.
`grade(at, dur, preset|nilai)` dengan preset: `senja`, `malam-api`, `fajar`, `siang-kering`, `arsip`.

Implementasi lewat **lapisan blend di atas `#world`**, bukan `filter` CSS pada seluruh stage:
- `bayangan`: lapisan warna `multiply`/`soft-light`;
- `sorot`: lapisan warna `screen` yang di-mask ke area terang sumber;
- `vignette`: gradien radial;
- `halation`: pendar jingga tipis di sekitar `pendar` sumber.

`kontras`/`saturasi` memakai `filter` pada pembungkus di luar `#world` **hanya bila** ukuran membuktikan biayanya
≤ 15 ms/frame. Kalau lebih, keduanya dibuang. *[keputusan Claude: filter layar penuh yang berubah = raster ulang]*

Vignette manual di starter lain **tidak** diganti di sub-proyek ini.

## 5. Integrasi starter

- Blok `<wv:atmosfer>`, `<wv:cahaya-2d>`, `<wv:pasca>` disisipkan ke **`starter-explainer.html`** (aksi kontinu,
  gaya S2) dan **`starter-explainer-panggung.html`** (rumah kulit B). Starter lain tidak disentuh.
- **Adegan bukti tinggal di `starter-explainer.html?demo=sinematik`**, karena starter itu sudah punya `CAM`,
  `kamera-dom`, dan bidang `[data-z]` (dolly, handheld, paralaks tersedia). Starter panggung belum punya `CAM`
  dan bidang; memasangnya adalah sub-proyek 3, jadi di sini panggung hanya menerima bloknya (belum dipakai) dan
  satu contoh di `kartun-panggung.md`. *[keputusan Claude]*
- "Bidang" untuk `kabut()`/`partikel()` = elemen HTML (`<div>` pembungkus `[data-z]` atau anaknya), bukan `<g>` SVG.
  Sub-proyek 3 memecah panggung menjadi bidang HTML.
- Tanpa `?demo`, kedua starter identik secara piksel dengan 1.2.0 (blok baru tidak dipanggil).
- **Anggaran konteks**: jalur "Explainer kartun panggung" saat ini 122/130 KB. Modul diperkirakan +15–20 KB di
  starter, jadi batasnya dinaikkan dengan alasan tertulis ("perkakas, bukan aturan"), seperti 1.1.0. Dokumentasi
  pemakaian masuk ke `kartun-panggung.md` kulit B (singkat) dan `techniques.md` (resep).

## 6. Bukti dan penerimaan

Adegan bukti **gapura malam ber-obor**, 12 dtk:
- langit ungu malam + bulan + awan;
- 3 bidang gunung/pepohonan berkabut;
- gapura bata ber-relief;
- dua obor ber-pendar yang berkedip;
- penjaga siluet ber-rim;
- bara naik dan kabut tanah;
- grade `malam-api`;
- kamera dolly pelan + satu `handheld` ringan.

Acuan rupa dan biaya disalin dulu ke repo sebelum membangun, karena saat ini hanya ada di scratchpad sesi:
spike (`spike-gapura/index.html`, `spike-cepat/index.html`, `f_0/f_7/f_13.png`) ke
`evals/bukti/2026-11-01-spike-gapura/`, dan skrip `riset/bench.mjs` menjadi `scripts/bench-frame.mjs`. Adegan bukti
memakai framing dan detik yang sama dengan `f_7` supaya bisa dibandingkan berdampingan. *[keputusan Claude]*

Penerimaan:
1. `test-starters` hijau: hash sama di dua jalur seek, termasuk `?demo=sinematik`.
2. Lint bersih; `build-starters --check`, `context-budget --check`, `bump-version --check` lolos.
3. Biaya: median ≤ 350 ms/frame @1080p, 1 worker, di mesin acuan — diukur dengan skrip benchmark
   (diturunkan dari `riset/bench.mjs`) yang disimpan di `scripts/` dan dicatat di CHANGELOG. *[keputusan Claude:
   ukuran per-starter permanen di `test-starters` ditunda ke sub-proyek 6]*
4. Lembar kontak 4 frame + satu GIF 8 fps di `evals/bukti/2026-11-xx-atmosfer/`, dinilai pemilik.
   **Tidak boleh lebih buruk dari still spike** `spike-gapura/f_7.png`.
5. Paralaks hidup: `CAM.yaw` kecil menggeser bidang berbeda-beda (diuji lewat kait seperti `CAM3_UJI`).
6. Tanpa `?demo`, hash `test-starters` kedua starter sama dengan 1.2.0.

## 7. Diserahkan ke builder

- Isi shader (rumus fBm, jumlah sampel god rays ≤ 64), bentuk gapura dan penjaga di adegan bukti.
- Nama internal, cara mask `redup`, angka default palet preset.
- Apakah `partikel` memakai satu kanvas per bidang atau satu kanvas bersama per adegan — selama paralaks tetap benar.
