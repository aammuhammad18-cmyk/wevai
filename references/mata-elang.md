# Mata elang — shot terbang 3D dan 2.5D

Dibaca HANYA saat membangun shot mata elang. Aturan kapan shot ini sah ada di `sinematografi.md` §3: satu per bab,
termotivasi, ≥ 3 dtk tanpa cut, mendarat di subjek. Contoh hidup: `assets/starter-elang.html` (11,5 dtk, sawah → gapura
bentar → lembah dan gunung saat senja). Bukti dan angka: `evals/bukti/2026-11-03-mata-elang/`.

## Isi

| Blok | Isi | Ada di |
|---|---|---|
| `terbang` (`src/runtime/terbang.js`) | `jalurElang()`, `terbang()`: jalur, tatap, roll, guncang. 3D dan 2.5D | `starter-elang.html`; 2.5D: salin blok |
| `lanskap-3d` (`src/runtime/lanskap-3d.js`) | `lanskap()`, `tumbuh()`, `ikutMatahari()`, `lewati()`, `ss()` | `starter-elang.html` |
| starter | `gapuraBentar()`, DUNIA, jalur, motion blur, tone mapping, kait uji | `starter-elang.html` |

2.5D: blok `terbang` ada di `starter-sinematik.html` (babak: terbang menembus celah gapura, mendarat di penjaga; resepnya di
`sinematografi.md` §5 "Babak multi-adegan"). Starter 2.5D lain: salin isi `src/runtime/terbang.js` **sesudah** blok `kamera-dom`,
sebelum kode adegan. `kamera-dom` sudah membaca `RAILS[CAM.rail](t)`. `test-starters` menyuntikkan blok ke setiap starter 2.5D.

## `terbang(at, dur, titik, opsi)`

Mendaftarkan satu fungsi pose di `RAILS`. Lalu ditulis tiga tween: `cutTo(at,{rail})`, `camTo railU` linear (agar
`applyCam` jalan tiap frame 2.5D), dan `cutTo(at+dur)` ke pose akhir. Sesudah terbang, `CAM` berlanjut tanpa lompatan:
roll akhir ikut tersimpan. Wajib dipanggil urut waktu, seperti `rail()`.

| Opsi | Bawaan | Arti |
|---|---|---|
| `ease` | `'sine.inOut'` | nama ease GSAP atau fungsi p→u. Laju = L·ease′/dur; starter memakai `p=>.5*sin(πp/2)+.25*(1-cos πp)` (masuk sudah melaju, melambat saat mendarat) |
| `ahead` | `.04` | look-ahead, pecahan panjang jalur. Juga lebar jendela kelengkungan |
| `look` | `null` | satu target per titik (`null` = look-ahead di titik itu). Diinterpolasi sebagai ARAH, jadi target 9 m dan 2,7 km berpindah rata |
| `rollMaks` | `30` | batas lunak: `rollMaks·tanh(φ/rollMaks)` (derajat) |
| `halus` | `.4` | jendela Hann ± dtk atas roll ideal (tabel 240 Hz, sekali saat setup): roll tak bisa seketika |
| `g` | 9,81 (3D) / 700 (2.5D, px/dtk²) | gravitasi rumus tan φ = v·ω/g = v²κ/g |
| `guncang` | `2` | derajat guncangan pada trauma 1 (yaw/pitch/roll; 2.5D: geser px setara) |
| `trauma0` | `.2` | turbulensi dasar × laju relatif (nol saat diam) |
| `trauma` | `[]` | `[[detik, besar], …]` meluruh `luruh`/dtk, atau fungsi `detik => peristiwa`: `d => [[d[5], .6]]` = hentakan saat melintasi titik ke-5 |
| `seed` | `7` | noise guncangan |

Kembali: fungsi pose `R(t)` dan `R.detik` = detik melintasi tiap titik. Pakai untuk segmen motion blur, trauma, dan VO.

- **3D**: titik `[x, y, z]` dunia (meter, y ke atas). Kamera di jalur, menatap target, lalu roll dan guncangan rotasi.
- **2.5D**: titik `[fx, fy, zoom]`. Zoom diwujudkan sebagai DOLLY: `mm·zoom` tetap, sehingga perspektif = mata yang mendekat.
  - Bidang `[data-z]` dekat membesar lebih cepat daripada bidang jauh.
  - Bidang z > 0 terlewati (lenyap di belakang kamera) saat `W·mm/36 < z`.
  - Sesudah terbang, `mm` tetap di nilai dolly itu. Kembalikan dengan `dollyZoom` bila perlu.
  - Tanpa look-ahead: kamera 2.5D selalu menatap layar; roll dari belok di bidang fx–dolly.

`lewati(objek, {tinggi, jarak, dari})` → tiga titik segaris menembus pusat kotak objek, searah sumbu z lokalnya, `tinggi` di
atas dasar kotak, ±`jarak`, diurutkan dari arah `dari`. Sisipkan di tengah `titik`. Gapura dimodelkan dengan muka di
bidang xy lokal dan celah di tengah.

## `lanskap(o)` lalu `tumbuh(o)`

Tahap 1, `lanskap()`, membangun:
- tanah: grid kasar 6 km, rapat di tengah, berlubang tepat di petak sawah halus 0,75 m yang berkulit;
- sungai, langit Sky (Preetham) yang di-bake sekali ke env PMREM, kabut `FogExp2`, dan kabut lembah.

Ia mengembalikan `tinggi(x,z)`, `basah(x,z)`, `arah` (matahari), dan `tumbuh`. Tahap 2, sesudah gapura dan jalur diketahui:
`tumbuh({hutan, kelapa, hindari})` menanam `InstancedMesh` ber-seed yang menjauhi jalur.

| Opsi | Isi |
|---|---|
| `seed` | satu angka untuk noise tanah, petak sawah, dan PRNG vegetasi. Seed sama → geometri sama (sidik diuji dua muat) |
| `bentuk(x,z)` | tinggi makro (m). Starter: lereng sawah → punggung bukit → tebing → lembah → rabung → `gunung()` |
| `detail` | amplitudo fBm (m), membesar di pegunungan, dibatasi ±6× agar puncak tanpa duri |
| `sawah` | `{x0,x1,z0,z1,undak,langkah,jalan}`: petak halus berundak. Petak air (55 %) = cermin (roughness .035). `jalan(z)` = pematang lurus ke gapura |
| `ladang` | `{bawah,miring}`: dasar lembah datar jadi petak 42 m (diputar 25°) berair/padi/jerami |
| `sungai` | `{titik:[[x,z]…], lebar, dalam, muka:[awal,akhir]}`: Catmull-Rom, mengukir lembah, pita air bermuka miring. Rabung yang dilintasi diberi celah di `bentuk()` |
| `matahari` | `{az, el}` derajat, sama dengan `LUX kAz/kEl` key |
| `langit` | `{turbidity, rayleigh, mie, mieG}` Sky |
| `kabut` | `{warna, padat}` `FogExp2` |
| `lembah` | `{y:[…], x, z, ukuran, opasitas, warna}`: bidang kabut tembus pandang ber-alfa fBm |

`ikutMatahari(arah,{r,maju,jauh})`: kotak bayangan key ±`r` m mengikuti titik `maju` m di depan kamera. Posisinya
dibulatkan ke texel ruang cahaya supaya bayangan diam tidak berkedip. Panggil sesudah `applyCam()`, sebelum render; starter
melakukannya di `siapkan()`.

## Tone mapping film

Starter elang memakai `renderer.toneMapping = THREE.ACESFilmicToneMapping`, `toneMappingExposure = .5`. Tanpa tone
mapping, matahari dan api menggunting. Konten brand/produk tetap `NoToneMapping` (`sinematografi.md` §6). Dibandingkan di
r161 pada exposure .45 (bukti: `tonemap.jpg`):
- **Api**: oranye #ff6a1a ×1…×4 tetap jingga jenuh di ACES, lalu kuning-putih seperti inti api. AgX "base" r161
  memucatkannya menjadi salem/persik (×1: 188,101,58).
- **Senja berlatar terang**: ACES memberi rentang luminans 79 dan kontras subjek 64; AgX 69 dan 49, dengan bayangan
  lebih terangkat. ACES menelan detail bayangan terdalam: siluet, bukan masalah.
- **Exposure**: ACES r161 mengalikan exposure/0,6. Mulai dari .45–.5, lalu naik/turun 0,05 sambil melihat langit di
  dekat matahari.

## Motion blur

Hanya akumulasi sub-frame (Haeberli–Akeley), dan hanya di segmen `KABUR = [[a, b], …]`. Starter memakai satu segmen:
detik menembus celah ±0,45 dtk.
- Di dalam segmen, `render(t)` menggambar `SUB = 8` sub-frame pada `t + ((i+½)/8 − ½)·rana`. `tl.time()` sub-frame
  menggerakkan seluruh dunia, bukan hanya kamera.
- Sub-frame dirata-rata dalam HDR linear (sebelum `OutputPass`), lalu di-tone-map sekali.
- Rana 1/60 dtk = 180° pada 30 fps. Rana membuka dan menutup dalam 0,15 dtk di tepi segmen, jadi blur tidak muncul mendadak.
- Deterministik: sub-frame murni fungsi t; pikselnya diuji dua jalur seek.
- Tween yang MULAI di dalam segmen dirender malas (GSAP `lazy`) pada sub-frame pertamanya, satu sub-frame terlambat. Mulai
  tween sebelum segmen, atau beri `lazy:false`.
- Biaya: render ±4,6× di segmen itu (riset C3: 283 vs 61 ms render; 491 vs 259 ms/frame total). Di luar segmen: 1 render.
  Jangan memasang segmen di seluruh shot.

## Resep

1. **Cahaya dulu.** Matahari rendah (1–4°, tetapi di atas cakrawala jauh) di depan arah terbang, 10–25° dari subjek akhir. Hasilnya siluet + rim pada
   gapura, pohon, dan kelapa, air sawah yang menyala, dan kabut yang bercahaya. Jangan menaruh matahari tepat di belakang
   bahu gunung (cek azimut: matahari lenyap, langit pucat).
2. **Laju menentukan roll** (fisika, bukan selera). v²/g ≈ 92 m pada 30 m/dtk, sehingga geser samping 4 m dalam 120 m
   sudah menuntut 45°. Saat cepat, belok berjari-jari ratusan meter (busur r≈300 m ≈ 12°). Belokan tajam hanya di bagian
   lambat. Periksa profil roll sebelum merender (lihat Jebakan).
3. **Menembus celah**: titik sebelum `lewati()` sudah segaris dengan sumbu gapura, dan lurus ≥ 25 m. Jarak bebas ke sisi
   dalam ≥ 0,5 m sesudah dikurangi ½ diagonal near plane. Dengan celah 3,4 m dan near .25, kamera tepat di tengah.
4. **Sumber cahaya di celah**: di antara dinding, semua yang terlihat adalah sisi teduh (matahari di depan), jadi
   frame hitam ±0,4 dtk. Obor `practical()` di muka gapura menerangi bata dan memberi titik terang (starter: `OBOR`,
   kedip = `noise(tl.time())`).
5. **Reveal**: sesudah celah, naik sambil menatap DATAR ke lembah (`look` titik itu = titik di lembah). Biarkan tanah yang
   jatuh menyingkap pemandangan. Baru dua titik terakhir menatap gunung. Melambat (ease) lalu mendarat. Legenda masuk saat
   kamera hampir diam.
6. **Lensa** 24 mm untuk rasa laju. Terbang di bawah 3 m membuat tanah dekat "meleleh" tanpa tekstur; 3–9 m di atas
   sawah sudah terasa rendah.
7. **Potret** detik kunci dengan `snap.mjs`: awal, di depan gapura (gapura membingkai gunung), detik melintas (MB), naik,
   dan mendarat. Nilai lembar kontaknya, lalu `nilai-visual` tanpa `--sumber` (sumber bergerak). Bingkai gapura dinilai
   per bingkai: `--subjek` = kotak gapura, `--sumber` = piksel api yang DIUKUR dari bingkai itu (jangan menebak).
   Bingkai di dalam celah (gelap, satu warna) dan lanskap tanpa subjek di tengah memang memicu peringatan; tulis alasannya.

## Jebakan

- **Target tatap di jarak sangat berbeda** dulu melompat di awal ruas. Kini `look` diinterpolasi sebagai arah. Tetap
  hindari dua target berlawanan arah di titik berurutan.
- **Kelengkungan Catmull-Rom patah di titik kontrol.** Pada 30 m/dtk, patahan kecil = roll melonjak. Penghalusan Hann
  menahannya (≤ 1°/120 Hz untuk geser 3 m per 30 m), tetapi busur panjang tetap jawaban yang benar.
- **Profil roll tanpa browser**: muat `kamera.js` + `terbang.js` di Node seperti `scripts/test-elang.mjs`, panggil `terbang()`
  dengan `ease` yang sama, lalu cetak `R(t).roll` per 0,5 dtk. Tinggi tidak memengaruhi roll.
- **Pohon "lolipop"**: tajuk tunggal di batang terbuka di dasar ladang terbaca game. Tanam berkelompok (`kelompok`);
  di petak ladang hanya 1,5 % yang lolos.
- **Kabut lembah** menutup dasar lembah menjadi lantai merah muda bila terlalu dekat/terlalu pekat. Taruh jauh
  (`z`, `ukuran`), opasitas ≤ .25.
- **Matahari di bawah rabung jauh** = seluruh lembah dalam bayangan tepat saat reveal (layar hitam sesudah gapura). Hitung:
  rabung cakrawala 340 m di 4,7 km ≈ 4,1°. Matahari harus di atasnya: starter menurunkan cakrawala ke 180 m (≈2,2°) dan
  memakai matahari 3,2°. Matahari 5,5° menerangi semuanya, tetapi rupanya jadi sore datar, bukan senja.
- **2.5D: bidang harus menutup seluruh jalur.** Terbang lebih lebar dari geser kamera adegan menyingkap tepi bidang.
- **`CAM.rail` aktif sejak t = 0**: kait atau kode yang menyetel pose bola (`CAM3_UJI`) harus menyetel `rail:-1` dulu, lalu
  MEMULIHKANNYA. GSAP mencatat nilai awal sebuah tween saat render pertamanya. Jadi `rail` asing yang tertinggal saat
  `cutTo` akhir terbang pertama kali dirender menjadi nilai "kembali" tween itu, dan setiap seek balik ke dalam terbang
  membuat kamera diam. Terjadi sungguhan di uji; kini `ELANG_UJI` mengukur jarak tempuh.
- **Bayangan matahari**: `key` kamera-three diposisikan ulang tiap frame oleh `ikutMatahari()`. Tanpa itu, kotak bayang
  ±20 m tertinggal di fokus lama saat kamera terbang.
- **CI tanpa GPU**: di SwiftShader halaman ini siap 80 dtk, satu frame 66,6 dtk, dan frame motion blur mematikan proses GPU
  (terukur di laptop acuan). Karena itu `test-starters` melewatinya bila WebGL jatuh ke perangkat lunak (`BERAT`) dan
  mencetak baris `lewat`. Matematika tetap diuji `test-elang`; uji penuh jalan di mesin ber-GPU.
- **Biaya**: dirancang ≤ 350 ms/frame di mesin acuan (tanah ±190 rb verteks, 5,2 rb pohon instanced, 1,4 rb di antaranya
  berbayang, bayangan 2048, MSAA 4×, 2 PointLight obor). Belum di-bench; ukur dengan `bench-frame.mjs` di mesin senggang. Segmen MB ±4,6× render.

## Nama global

- Blok `terbang`: `jalurElang terbang`.
- Blok `lanskap-3d`: `ss lanskap ikutMatahari lewati`.
- Starter elang (selain nama starter 3D): `DUNIA gunung SENJA CELAH gapuraBentar jalurTerbang hindariJalur gapura D OBOR kedip
  TITIK SAMPEL JALUR LOOK JALAN KABUR SUB RANA akum output tambah subTerakhir siapkan`. `RAILS` kini ada di inti `kamera.js`.
