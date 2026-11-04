# Mata elang — shot terbang 3D dan 2.5D

Dibaca HANYA saat membangun shot mata elang. Kapan shot ini sah: `sinematografi.md` §3. Contoh hidup: `assets/starter-elang.html` (11,5 dtk).
Bukti: `evals/bukti/2026-11-03-mata-elang/`, `evals/bukti/2026-11-04-rupa-3d/`.

## Isi

| Blok | Isi | Ada di |
|---|---|---|
| `terbang` (`src/runtime/terbang.js`) | `jalurElang()`, `terbang()`: jalur, tatap, roll, guncang. 3D dan 2.5D | `starter-elang.html`; 2.5D: salin blok |
| `lanskap-3d` (`src/runtime/lanskap-3d.js`) | `lanskap()`, `tumbuh()`, `ikutMatahari()`, `lewati()`, `ss()` | `starter-elang.html` |

2.5D: blok `terbang` ada di `starter-babak.html` (resep: `sinematografi.md` §5 "Babak multi-adegan"). Starter 2.5D lain: salin
`src/runtime/terbang.js` **sesudah** blok `kamera-dom`, sebelum kode adegan. `test-starters` menyuntikkan blok ke setiap starter 2.5D.

## `terbang(at, dur, titik, opsi)`

Mendaftarkan fungsi pose di `RAILS` + tiga tween (`cutTo(at,{rail})`, `camTo railU` linear, `cutTo(at+dur)` ke pose akhir). Sesudah terbang, `CAM`
berlanjut tanpa lompatan. Wajib dipanggil urut waktu, seperti `rail()`.

| Opsi | Bawaan | Arti |
|---|---|---|
| `ease` | `'sine.inOut'` | nama ease GSAP atau fungsi p→u; starter: `p=>.5*sin(πp/2)+.25*(1-cos πp)` (masuk sudah melaju, melambat saat mendarat) |
| `ahead` | `.04` | look-ahead, pecahan panjang jalur. Juga lebar jendela kelengkungan |
| `look` | `null` | satu target per titik (`null` = look-ahead). Diinterpolasi sebagai ARAH |
| `rollMaks` | `30` | batas lunak: `rollMaks·tanh(φ/rollMaks)` (derajat) |
| `halus` | `.4` | jendela Hann ± dtk atas roll ideal |
| `g` | 9,81 (3D) / 700 (2.5D, px/dtk²) | gravitasi rumus tan φ = v·ω/g = v²κ/g |
| `guncang` | `2` | derajat guncangan pada trauma 1 (yaw/pitch/roll; 2.5D: geser px setara) |
| `trauma0` | `.2` | turbulensi dasar × laju relatif (nol saat diam) |
| `trauma` | `[]` | `[[detik, besar], …]` meluruh `luruh`/dtk, atau `d => [[d[5], .6]]` = hentakan di titik ke-5 |

Kembali: fungsi pose `R(t)` dan `R.detik` = detik melintasi tiap titik. Pakai untuk segmen motion blur, trauma, dan VO.

- **3D**: titik `[x, y, z]` dunia (m, y ke atas). Kamera di jalur, menatap target, lalu roll dan guncangan rotasi.
- **2.5D**: titik `[fx, fy, zoom]`. Zoom = DOLLY (`mm·zoom` tetap): bidang `[data-z]` dekat membesar lebih cepat, z > 0 terlewati saat `W·mm/36 < z`.
  Sesudah terbang `mm` tetap di nilai dolly (kembalikan dengan `dollyZoom`). Tanpa look-ahead; roll dari belok di bidang fx–dolly.

`lewati(objek, {tinggi, jarak, dari})` → tiga titik segaris menembus pusat kotak objek searah sumbu z lokalnya, `tinggi` di atas dasar, ±`jarak`,
urut dari arah `dari`. Gapura dimodelkan dengan muka di bidang xy lokal.

## `lanskap(o)` lalu `tumbuh(o)`

Tahap 1, `lanskap()`: tanah (grid kasar 6 km berlubang di petak sawah halus 0,75 m), sungai, Sky + awan di-bake ke env PMREM, kabut, kabut lembah. Kembali
`tinggi(x,z)`, `basah(x,z)`, `arah`, `ubin`, `tumbuh`. Tahap 2, sesudah gapura dan jalur diketahui: `tumbuh({hutan, kelapa, hindari})` menanam `InstancedMesh` ber-seed yang menjauhi jalur.

| Opsi | Isi |
|---|---|
| `seed` | noise tanah, petak, PRNG vegetasi. Seed sama → geometri sama (sidik diuji dua muat) |
| `bentuk(x,z)` | tinggi makro (m). Starter: lereng sawah → punggung bukit → tebing → lembah → rabung → `gunung()` |
| `detail` | amplitudo fBm (m), membesar di pegunungan, dibatasi ±6× |
| `sawah` | `{x0,x1,z0,z1,undak,langkah,jalan}`: petak halus berundak. Petak air (55 %): riak, bibit, tepi air per piksel. `jalan(z)` = pematang lurus ke gapura |
| `ladang` | `{bawah,miring}`: dasar lembah datar jadi petak PER PIKSEL (baris 12 m, petak 22 m, diputar 25°, baris saling geser) berair/padi/jerami; status dari tabel 64² yang sama di JS dan shader, jadi pohon menghindari petak basah |
| `sungai` | `{titik:[[x,z]…], lebar, dalam, muka:[awal,akhir]}`: Catmull-Rom, mengukir lembah, pita air. Rabung yang dilintasi diberi celah di `bentuk()` |
| `matahari` | `{az, el}` derajat, sama dengan `LUX kAz/kEl` key |
| `langit` | `{turbidity, rayleigh, mie, mieG}` Sky |
| `kabut` | `{warna, padat}` `FogExp2` |
| `lembah` | `{y:[…], x, z, ukuran, opasitas, warna}`: bidang kabut tembus pandang ber-alfa fBm |

Bahan (semua di shader, tanpa raster): `ubin` = noise 256² ber-seed + mipmap, dipakai tanah, daun, awan Sky, bata (`D.ubin`). Air: riak di
normal, pantulan dibatasi lembut (langit dekat matahari HDR tak jadi bercak putih), pantulan rendah digelapkan (env hanya berisi langit).
Pohon: 3 ragam tajuk (bulat, lebar, ramping); `daun()` = tembus cahaya + balut sisi matahari + gumpal triplanar + tepi berserabut (`discard`).
Lapis `bayang:false` memakai geometri lebih kasar.

`ikutMatahari(arah,{r,maju,jauh})`: kotak bayangan key ±`r` m di titik `maju` m di depan kamera, dibulatkan ke texel ruang cahaya, `normalBias` ∝ `r`.
Starter melebarkan `r` 70 → 500 m saat kamera naik (bayang senja panjang di lembah). Panggil sesudah `applyCam()`, sebelum render.

## Tone mapping film

`ACESFilmicToneMapping`, exposure .5 (r161 mengalikan exposure/0,6; naik/turun 0,05 sambil melihat langit dekat matahari). Tanpa tone mapping,
matahari dan api menggunting. Brand/produk tetap `NoToneMapping` (`sinematografi.md` §6). ACES vs AgX di r161 (bukti: `tonemap.jpg`): api ACES
tetap jingga lalu kuning-putih, AgX memucat ke salem.

## Motion blur

Hanya akumulasi sub-frame, hanya di segmen `KABUR = [[a, b], …]` (starter: detik menembus celah ±0,45 dtk).
- `render(t)` menggambar `SUB = 8` sub-frame pada `t + ((i+½)/8 − ½)·rana`, rata-rata dalam HDR linear, lalu tone mapping sekali.
- Rana 1/60 dtk = 180° pada 30 fps, membuka/menutup 0,15 dtk di tepi segmen.
- Tween yang MULAI di dalam segmen dirender malas satu sub-frame terlambat: mulai sebelum segmen, atau `lazy:false`.
- Biaya: render ±4,6× di segmen itu. Jangan memasang segmen di seluruh shot.

## Resep

1. **Cahaya dulu.** Matahari rendah (1–4°, di atas cakrawala jauh) di depan arah terbang, 10–25° dari subjek akhir: siluet + rim, air menyala,
   kabut bercahaya. Jangan tepat di belakang bahu gunung.
2. **Laju menentukan roll** (fisika). v²/g ≈ 92 m pada 30 m/dtk: geser samping 4 m dalam 120 m menuntut 45°. Saat cepat, belok berjari-jari
   ratusan meter (r≈300 m ≈ 12°). Belokan tajam hanya di bagian lambat. Periksa profil roll sebelum merender.
3. **Menembus celah**: titik sebelum `lewati()` segaris dengan sumbu gapura, lurus ≥ 25 m. Jarak bebas ke sisi dalam ≥ 0,5 m sesudah dikurangi
   ½ diagonal near plane. Celah 3,4 m + near .25: kamera tepat di tengah.
4. **Sumber cahaya di celah**: di antara dinding semua sisi teduh (frame hitam ±0,4 dtk). Obor `practical()` di muka gapura (`OBOR`, kedip = `noise(tl.time())`).
5. **Reveal**: sesudah celah, naik sambil menatap DATAR ke lembah; dua titik terakhir menatap gunung. Melambat lalu mendarat. Legenda masuk saat kamera hampir diam.
6. **Lensa** 24 mm; 3–9 m di atas sawah.
7. **Potret** detik kunci dengan `snap.mjs`, lalu `nilai-visual` tanpa `--sumber`; bingkai gapura: `--subjek` kotak gapura, `--sumber` piksel api yang DIUKUR.
   Bingkai di dalam celah dan lanskap tanpa subjek memang memicu peringatan; tulis alasannya.

## Jebakan

- **Kelengkungan Catmull-Rom patah di titik kontrol**: roll melonjak; busur panjang jawaban yang benar.
- **Profil roll tanpa browser**: muat `kamera.js` + `terbang.js` di Node seperti `test-elang.mjs`, cetak `R(t).roll` per 0,5 dtk.
- **Pohon "lolipop"**: tajuk tunggal di batang terbuka terbaca game. Tanam berkelompok (`kelompok`); di petak ladang hanya 1,5 % yang lolos. Pohon di
  gunung jauh terbaca taburan: batasi `boleh` (starter `h<45`), gunung cukup nada dan alur `bentuk()`.
- **`mod` tabel petak**: JS dan GLSL harus memakai rumus sel yang sama; `sin()` dipakai untuk liuk karena hasilnya sama di keduanya, `ImprovedNoise` tidak.
- **Kabut lembah** terlalu dekat/pekat = lantai merah muda. Taruh jauh, opasitas ≤ .25.
- **Matahari di bawah rabung jauh** = lembah gelap saat reveal. Rabung 340 m di 4,7 km ≈ 4,1°; starter: cakrawala 180 m (≈2,2°), matahari 3,2°. Matahari 5,5° = sore datar.
- **2.5D: bidang harus menutup seluruh jalur.** Kalau tidak, tepi bidang tersingkap.
- **`CAM.rail` aktif sejak t = 0**: kait yang menyetel pose bola harus menyetel `rail:-1` lalu MEMULIHKANNYA. GSAP mencatat nilai awal tween saat render
  pertamanya; `rail` asing yang tertinggal membuat kamera diam di setiap seek balik. `ELANG_UJI` mengukur jarak tempuh.
- **CI tanpa GPU**: `test-starters` melewatinya di perangkat lunak (`BERAT`, baris `lewat`); matematika tetap di `test-elang`.
- **Biaya**: tanah ±190 rb verteks, 5,2 rb pohon, 1,4 rb berbayang (detail penuh), bayangan 2048, MSAA 4×. HD 4000: ±286 ms/frame di sawah, ±310 saat reveal.

## Nama global

- Blok `terbang`: `jalurElang terbang`.
- Blok `lanskap-3d`: `ss sisip lanskap ikutMatahari lewati`.
- Starter elang (selain nama starter 3D): `DUNIA gunung SENJA CELAH gapuraBentar jalurTerbang hindariJalur gapura D OBOR kedip TITIK SAMPEL JALUR LOOK JALAN KABUR SUB RANA akum output tambah subTerakhir siapkan`.
  TITIK SAMPEL JALUR LOOK JALAN KABUR SUB RANA akum output tambah subTerakhir siapkan`. `RAILS` kini ada di inti `kamera.js`.
