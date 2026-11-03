# Relief candi hidup (`starter-relief.html`)

Gaya sejarah 100 % kode: dinding galeri candi dari andesit berpahat menjadi **bingkai narasi** ("kisah dibaca dari dinding
candi"). Cahaya obor menyapu batu dan bayangan di pahatan ikut bergeser. Tokoh relief hidup pelan: lengan pendayung, layar,
ombak, untaian permata, payung. Kamera berjalan menyusuri galeri seperti peziarah yang berhenti di tiap panel.

Dibaca hanya di jalur ini. Sumber: `src/runtime/relief-hidup.js` (blok `<wv:relief-hidup>`) dan `pustaka.dindingRelief`
(`src/runtime/pustaka.js`, blok `<wv:pustaka>`). Uji: `scripts/test-relief.mjs` (node:test) dan `RELIEF_UJI` di
`test-starters`. Bukti: `evals/bukti/2026-11-03-relief-candi/`.

## Kapan dipakai

- Cocok: sejarah dan budaya Hindu–Buddha Jawa (Borobudur, Prambanan, Mendut). Juga cocok sebagai pembuka atau penutup bab,
  dan untuk adegan yang dikisahkan "seperti tertulis di batu": legenda, jataka, pelayaran, upacara.
- Lemah: topik non-sejarah, adegan cepat atau berdialog, data/angka. Untuk itu pakai siluet sinematik atau kartun panggung.
- Satu babak boleh campur: relief sebagai bingkai, lalu cut ke siluet sinematik untuk adegan "hidup", lalu kembali ke dinding.

## Rig

| Bidang | Isi |
|---|---|
| −1500 | `pustaka.gunungBerlapis` + `kabut` |
| −600 | deret stupa teras atas (siluet SVG) + `kabut` — terlihat di atas lis dinding |
| 0 | dinding: SATU `<canvas class="wv-relief">` dari `reliefHidup()` |
| depan | `partikel('depan',{jenis:'debu'})`, lalu `grade()` |

Urutan panggilan sama dengan `starter-sinematik.html`: `langit` → bidang → `reliefHidup` → kabut/partikel → `grade` →
`SINAR` + kamera. Semua sesudah `const tl=`.

```js
const dd=pustaka.dindingRelief({lebar:4300,tinggi:1000,lebarPanel:1000,isi:['kalpataru','perahu','prosesi'],arah:-1,seed:7});
reliefHidup(bidang(0),{x:-540,y:100,dinding:dd,dalam:56,seed:7});          // peta dipanggang SEKALI (±1–2 dtk saat muat)
Object.assign(SINAR,{x:3600,y:520,z:230,warna:'#ffb067',kuat:1.9,jangkau:950,kedip:.1});
tl.to(SINAR,{x:-300,duration:DUR,ease:'none'},0);                           // lampu menyapu: nilai MUTLAK
const pusat=dd.panel.map(([x0,,w])=>-540+x0+w/2);                           // titik henti kamera = tengah panel
```

## API

**`pustaka.dindingRelief(o)`** → `{lebar, tinggi, panel:[[x0,y0,w,h]…], blok:[[x0,y0,x1,y1,nada]…], lapis:[…], gerak:[…]}`:
DATA pahatan, bukan SVG. Fungsi murni: seed + opsi sama → data sama. `blok` = batu penyusun dinding (nada 0..1 → albedo
±14 %), `panel` = kotak bidang tiap panel (titik henti kamera).

| Opsi | Bawaan | Arti |
|---|---|---|
| `lebar`, `tinggi` | 4300, 1000 | ukuran dinding (px). Metrik vertikal dirancang untuk 1000 lalu diskalakan |
| `lebarPanel` | 1000 | ≥ 700. Panel ditata di tengah dinding, celah 150 px berpilaster |
| `isi` | `['kalpataru','perahu','prosesi']` | panel kiri → kanan (lihat kosakata) |
| `arah` | −1 | ke mana cerita mengalir. −1 = ke kiri (pradaksina bila menghadap dinding) |
| `seed` | 1 | nat blok, gompal, variasi pohon, fase gerak |

**`reliefHidup(bidang, o)`** → kanvas di `(x, y)` bidang (elemen HTML `[data-z]`), seukuran dinding 1:1. Opsi: `x`, `y`,
`dinding`, `dalam` (kedalaman relief px, bawaan 56), `batu` (`[kelabu A, kelabu B]` andesit), `lumut`, `seed`.

**`SINAR`** — satu lampu per halaman, di-tween GSAP seperti `CAM`:

| Kunci | Arti |
|---|---|
| `x`, `y` | posisi lampu, px bidang dinding |
| `z` | jarak dari muka dinding ke arah kamera (px). Kecil = menyerempet = bayangan panjang |
| `warna`, `kuat` | `kuat` boleh > 1 |
| `jangkau` | jarak (px) tempat kuat tinggal ½. Redaman 1/(1 + d²/jangkau²) |
| `kedip`, `seed` | 0..1. Noise ber-seed dari `tl.time()` |
| `ambien`, `ambienKuat` | cahaya langit di sisi teduh, × AO |

Nada bawaan = obor malam. Untuk cahaya pagi menyerempet: `{x:-2500,y:-900,z:900,warna:'#ffe6c4',kuat:2.6,jangkau:1e5,
kedip:0,ambien:'#9fb0d6',ambienKuat:.6}`, lalu tween `x` pelan (matahari bergeser).

## Kosakata (`isi`)

| Panel | Isi | Bagian hidup |
|---|---|---|
| `prosesi` | pembawa kendi, pembawa baki, bangsawan bermahkota berkain panjang, pembawa payung kebesaran, dua pemikul peti, pohon latar | payung bergoyang, peti berayun |
| `perahu` | kapal bercadik: haluan tinggi berukir, cadik + penyangga, rumah geladak, dua tiang kaki-dua berlayar tanja, tali-temali, pengintai, dua pendayung, juru mudi, ikan, awan | lengan + dayung, dayung kemudi, layar, ombak mengalir, ikan |
| `kalpataru` | pohon kalpataru (jambangan, tajuk bertingkat, payung), dua burung, resi duduk berlingkar cahaya di lapik, dua pelancong menyembah, pengiring berbaki | untaian permata, sayap burung, tangan yang menyembah |

Tokoh dibangun `sosok()` dengan pose `jalan`, `junjung`, `baki`, `payung`, `pikul`, `tunjuk`, `sembah`, `duduk`,
`dayung`. Kaki dan lengan jauh lebih rendah, lengan dekat paling tinggi. Kain berlipat, ikat pinggang, kalung, anting,
sanggul atau mahkota. Isi baru = fungsi panel di `pustaka.js` (pola `prosesiR`/`perahuR`/`kalpataruR`) + nama di `ISI_R`.

**Data lapis** (untuk pahatan sendiri, misalnya prasasti atau tokoh khusus): dorong ke `dd.lapis` sebelum `reliefHidup`.

| Kunci | Arti |
|---|---|
| `jenis` | `'timbul'`: naik ke `z`, maks dengan yang di bawahnya. `'rata'`: bidang diset ke `z`, misalnya panel yang dipahat ke dalam. `'gurat'`: alur sedalam `z`, misalnya nat atau lipatan |
| `d` | jalur Path2D, px dinding, y ke bawah |
| `kotak` | `[x0,y0,x1,y1]` (wajib, untuk rasterisasi per kotak) |
| `z` | tinggi 0..1. Bidang panel ,07, muka dinding ,8, lis 1 |
| `r` | jari-jari tepi membulat (px). Lengan ≈ ½ lebarnya → tampak silinder |
| `persegi` | opsional: bentuknya tepat `kotak` (persegi panjang) → dirasterisasi analitik, tanpa kanvas. Pakai untuk bidang besar (dinding, panel, lis) — jauh lebih cepat |

**Data gerak** (`dd.gerak[]`): `{lapis, poros:[x,y], ayun:[derajat,periode,fase], kembang:[skala,periode,fase],
geser:[dx,dy,periode,fase], alir:[px/dtk, periode px], klip:[x0,y0,x1,y1]}`. Bagian hidup = sprite peta tinggi sendiri
yang menang bila lebih tinggi dari peta statis. Jadi lapisnya TIDAK ikut di `lapis` statis. `alir` butuh pola yang persis
berperiode dan sprite yang lebih lebar satu periode di kedua sisi (lihat `ombakR`).

## Aturan

- **Cahaya bergerak = shader, bukan filter.** Filter SVG yang dipanggang beku. Filter yang dianimasikan ±358 ms/frame dan
  tetap tanpa bayangan jatuh.
- **Dipanggang sekali, digambar tiap frame.** Peta tinggi, normal, AO, dan albedo dibuat saat muat. Per frame hanya dua pass
  shader yang membaca `tl.time()` dan `SINAR`. Jangan memanggil `reliefHidup` di `tl.call`/`onUpdate`.
- **Gerak tokoh subtil**: ayun ≤ 10°, geser ≤ 40 px, kembang ≤ 3 %. Lebih dari itu batu terbaca sebagai kartun.
- **Nilai mutlak** di tween `SINAR` dan kamera (`'+='` bergantung jalur seek, `lint-motion` gsap-relatif).
- **Dinding lebih lebar dari jalur kamera ± setengah frame** (+ guncangan handheld). Ujung dinding tidak boleh masuk frame.
- Satu dinding = satu kanvas = satu konteks WebGL2. Cukup satu atau dua dinding per halaman. Lebar ≤ batas tekstur GPU
  (8192 aman). Lebih panjang = dua dinding bersambung.
- Kanvas 1:1 di bidang z 0: zoom ≤ 1,25 tetap tajam. Shot dekat (MCU/CU) = dinding kedua yang lebih kecil dan berskala besar.
- Rig dan `[data-z]` bersih (tanpa filter/opacity/blend/clip/mask). `grade()` kontras/saturasi menulis ke view, bukan rig.

## Biaya

Terukur di laptop produksi (i3-3217U + HD 4000), Chrome headless GPU, saat render pemilik berjalan (prioritas Idle). Angka
ini batas atas kasar, bukan bench (`bench-frame` menunggu mesin senggang).

| Cara menyalakan relief | ms/frame | Bayangan pahatan bergeser? |
|---|---|---|
| Filter SVG dipanggang (`relief()` cahaya-2d) | ≈ 0 | tidak: cahaya beku |
| Filter SVG dianimasikan (`fePointLight` tiap frame; riset 1 Nov) | 358 (GPU), 3.663 (CPU) | hanya naungan, tanpa bayangan jatuh |
| Canvas 2D per piksel di CPU (difus + AO, 1920×1080) | 737 | tidak (tanpa bayangan) |
| **WebGL2, 2 pass, bayangan 24 langkah** | **±16 (3400×900), 29–32 (dinding starter 4300×1000)** | **ya** |

Setup sekali saat muat (JS, dinding starter: 764 lapis + 17 bagian hidup): 4,1–5,1 dtk di bawah beban render, termasuk normal
+ AO 0,9 dtk. Bidang besar ditandai `persegi` supaya dirasterisasi analitik. Biaya capture ekspor tetap ±170–200 ms/frame dan
mendominasi, jadi kanvas relief menambah ±15 % per frame.

## Determinisme

Keadaan per frame = fungsi `tl.time()` + `SINAR`. Pose bagian hidup dihitung dari `t` (tanpa akumulasi). Getaran langkah
bayangan memakai hash koordinat piksel, bukan waktu. Kanvas digambar ulang penuh. Jadi seek(t) lewat jalur mana pun memberi
piksel yang sama dalam satu proses: `RELIEF_UJI.seekSama` dan pemeriksaan kanvas `test-starters`. Bukti di dinding starter
(4300×1000, kedip ,3, 17 bagian hidup): t 9,2 langsung = lompat 3 → 15 → 0,1 → 9,2 = putar 8 → 9,2 per 1/60 dtk, byte
`readPixels` identik (hash `a94889e`); t 9,7 berbeda.

## Akurasi budaya

- **Andesit**: Borobudur dan candi-candi Jawa Tengah dari batu andesit. Relief dipahat sesudah blok tersusun, jadi nat blok
  memotong tokoh. Generator meniru itu.
- **Pradaksina**: peziarah berjalan searah jarum jam dengan bangunan di kanan. Menghadap dinding, panel berikutnya ada di
  KIRI, jadi bawaan `arah: −1` dan kamera berjalan ke kiri.
- **Kapal**: relief Borobudur menggambarkan kapal bercadik berlayar tanja. Bentuk di generator ikonik (haluan tinggi, cadik,
  dua tiang kaki-dua). Proporsi dan tali-temali adalah perkiraan, bukan salinan panel tertentu.
- **Kalpataru** (pohon pengabul) dengan jambangan dan untaian permata adalah motif umum relief Jawa Tengah. Mahkota tinggi
  (jatamakuta) menandai bangsawan atau tokoh suci. Payung kebesaran menandai pangkat.
- Bukan rekonstruksi arkeologis. Untuk klaim tentang panel atau kisah tertentu, periksa sumber dan sebutkan di narasi.
