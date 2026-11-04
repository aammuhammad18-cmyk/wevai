# Diorama cel-shaded — miniatur museum untuk menjelaskan struktur tempat

Menjelaskan **struktur** sebuah tempat (kota, keraton, kompleks pura), bukan adegan bertokoh. Contoh hidup: `assets/starter-diorama.html` (19 dtk, pura Bali generik, tri mandala). Dasar kamera:
`sinematografi.md`. Bukti dan angka: `evals/bukti/2026-11-03-diorama/`, `evals/bukti/2026-11-04-rupa-budaya/`.

## Isi

| Blok | Isi |
|---|---|
| `diorama` (`src/runtime/diorama.js`) | `rakit()` toon + lambung, `TILT`, `GARIS`, `alas()`, `meja()`, `latar()`, `kartu()`, `tataKartu()`, `label()`, `matahari()`, `perFrame()`, `siap()` |
| `pura-bali` (`src/runtime/pura-bali.js`) | `TRI_MANDALA` (denah sebagai data), `pura.bangun()`, `pura.tanah()`, `pura.tingkatMeru()`, `pura.pemedek()` |
| starter | jalur kamera, label, legenda, kartu, kait uji `DIORAMA_UJI` |

Memasang di starter 3D lain: penanda `/* <wv:diorama> … */` + baris kosong + `/* </wv:diorama> */` SESUDAH `kamera-three`, lalu
`node scripts/build-starters.mjs`. Butuh import `ShaderPass` dan `mergeGeometries`. Tempat lain (keraton, kota): buang blok `pura-bali`, rakit kepingan sendiri.

## API

```js
const R=diorama.rakit({seed:11,bahan:pura.BAHAN}); // kepingan → 1 mesh toon + 1 mesh lambung = 2 draw call; bahan = warna → pola (1 bata, 2 paras, 4 ijuk, 5 alang)
R.kotak(x,yDasar,z,w,h,d,'#a4583a',{garis,kotor}); // garis:false = detail kecil tanpa lambung; kotor .8 = dasar lebih gelap (cuci maket)
R.prisma(x,yDasar,z,wb,db,wa,da,h,warna,o);        // alas wb×db → atas wa×da: atap, limas, batur
diorama.alas(R,{x0,x1,z0,z1,tebal,potong:true});   // lempeng kayu + potongan tanah berstrata + bibir rumput
const M=R.selesai('maket');scene.add(M);           // M.userData.toon, M.userData.lambung
diorama.meja();diorama.latar(svg,{r,sudut,tinggi});diorama.matahari({pusat,r});   // meja gelap, dinding lukis melengkung, bayangan dipanggang
diorama.kartu(svg,{x,y,z,tinggi,lebar,hadap,resolusi,tepi,bayang});               // hadap null = billboard, derajat = tetap
diorama.tataKartu({seed,n,area:[x0,z0,x1,z1],jarak,hindari});                     // → [{x,z,u}] ber-seed
diorama.label(el,[x,y,z]);                         // label DOM menempel titik dunia, tajam di atas tilt-shift
tl.to(TILT,{pusat:.56,lebar:.11,kuat:15,duration:4},t);                           // pita fokus dari timeline
await diorama.siap();                              // kartu selesai dirasterisasi; baru OPENER.ready
function render(t){applyCam();diorama.perFrame();composer.render(0);}             // urutan ini
```

## Kenop

| Kenop | Bawaan | Arti |
|---|---|---|
| `TILT.pusat` | .5 | y pita tajam di layar: 0 atas, 1 bawah |
| `TILT.lebar` | .18 | setengah tinggi pita tajam, pecahan tinggi frame |
| `TILT.lunak` | .3 | rentang naik dari tajam ke `kuat` (smoothstep) |
| `TILT.kuat` | 14 | jari-jari blur maksimum, px di 1080p. 0 = pass mati |
| `GARIS.tebal` | 2,2 | px garis pada jarak ≤ `acuan` |
| `GARIS.acuan` | 45 | lebih jauh dari ini garis menipis sampai 55 % |
| `GARIS.warna` | `#1a120c` | tinta cokelat tua, bukan hitam murni |
| `TANGGA` | .34 .56 .8 1 | tingkat toon, dari N·L (`diorama.TANGGA`) |

Warna: `pura.PALET` (bata, paras, ijuk, alang, kayu) + warna verteks ±5 % per keping. Nat bata, blok paras, serat ijuk/alang: `POLA_FS` di shader toon, fungsi murni posisi dunia, memudar saat lebih rapat dari piksel (ukuran bata, blok, serat rekaan; nat tipis, tanpa sumber). Tone mapping: film (ACES, exposure .82), seperti konten sejarah
lain (`sinematografi.md` §6); brand/produk dengan gaya ini memakai `NoToneMapping` dan menyesuaikan `FILM` di `test-starters`.

## Resep

1. **Kamera mendekat.** Maket utuh hanya untuk pembuka; sesudah itu turun sampai bangunan mengisi frame ("Miniatur adalah slide", `anti-ppt.md`). Starter:
   EWS → sumbu → melewati dua gerbang → MS padmasana dan meru. Lensa 40 mm dengan kamera dekat, seperti lensa makro di atas maket.
2. **Pita fokus mengikuti subjek.** Lebar saat EWS, sempit saat rendah; tween ≥ 3 dtk.
3. **Satu arah cahaya, dipanggang.** `matahari()` mematikan `shadowMap.autoUpdate` dan menaruh key di sekitar pusat maket, sehingga bayangan tidak merayap ikut
   kamera. `applyLux` menaruhnya di fokus kamera, dan `perFrame()` menimpanya. Warna dan kekuatan boleh di-tween; azimut/elevasi ikut menggambar ulang peta bayang (satu render geometri per frame).
4. **Yang hidup = kamera + cahaya.** Kartu tidak dianimasikan.
5. **Label di luar tilt-shift** (DOM): papan gelap per ketukan, satu per satu; waktunya dari `terbang().detik`. Titik label harus masih di dalam frame sampai papan keluar: potret detik keluarnya.

## Biaya

Diukur di halaman, mesin acuan i3-3217U / HD 4000, 1080p, Chrome Idle (3–4 Nov).
`bench-frame.mjs` (termasuk screenshot, 3 putaran, 4 Nov, sesudah pola bahan): median 233 ms/frame. Batas 350 ms.

| Ukuran | Nilai |
|---|---|
| Satu frame penuh | ±72 ms |
| + garis lambung | +1–4 ms |
| + tilt-shift | +28 ms (2 pass, 13 sampel per pass; baris tajam dilewati) |
| Geometri | 27 rb verteks toon, 2 draw call maket + kartu + lantai |
| Muat → `OPENER.ready` | 4–5,5 dtk; ±8 dtk sesaat setelah peluncuran Chrome: raster kartu + latar 5,3 rb px, lantai flok, kompilasi |
| Bayangan | 4096², dipanggang sekali saat muat; 0 ms per frame |
| SwiftShader (CI tanpa GPU) | siap 32 dtk, frame pertama 33,7 dtk → masuk `BERAT` di `test-starters`; bagian murni diuji `test-diorama` |

## Garis: lambung vs tepi depth/normal

Diukur pada adegan yang sama (bukti: `evals/bukti/2026-11-03-diorama/garis.jpg`):

| | Tanpa garis | Lambung terbalik | Tepi depth/normal (pass penuh) |
|---|---|---|---|
| Frame (median, ms) | 73,3 / 68,3 | 72,4 / 71,8 | 99,1 / 96,9 |
| Tepi | – | halus (ikut MSAA) | bergerigi (sesudah MSAA) |
| Yang tergaris | – | siluet tiap keping | siluet + lipatan + nat bata (terlalu ramai) |

Dipilih **lambung**: nyaris gratis, tepi halus. Kekurangannya: lipatan di dalam siluet tidak bergaris; tangga toon yang menegaskannya.

## Akurasi: pura tri mandala

Tempat suci. Pura di starter **generik**, tak ada denah nyata yang disalin. Tanpa arca, dewa, sesajen, upacara, atau keterangan pemakaian bangunan. Lebih baik sedikit dan benar. Untuk pura bernama, ganti denah dari sumber pura itu.

### Keputusan denah

| Unsur | Keputusan di starter | Sumber |
|---|---|---|
| Tiga zona | nista (jaba sisi) → madya (jaba tengah) → utama (jeroan), urut kesucian | [S1], [S2] |
| Sumbu | utama paling dekat gunung (kaja = −z), nista ke arah kelod. Sumbu kaja–kelod + kangin–kauh | [S1], [S2], [S4] |
| Lantai bertingkat | nista 0, madya +0,5 m, utama +1 m (angka perkiraan) | nista terendah: [S5]; beda tinggi antarzona: [S8] |
| Candi bentar | gerbang nista → madya; dua belahan serupa dan sebangun, tanpa atap di antaranya, ada anak tangga | [S2] |
| Kori agung | gerbang madya → utama; lebih tinggi, megah, dan menyempit; kaki–badan–kepala (tri angga) | [S1], [S6] |
| Penyengker | tembok batas keliling | [S1] |
| Padmasana | di utama, sudut kaja-kangin, menghadap kauh; tepas (palih segara) – batur (bumi, sancak, taman) – sari (padma sari, badan dara, rong tanpa atap, menghadap depan) | letak: [S4]; utama: [S2], [S5]; bentuk: [S11] + foto-sketsanya, [S4] (ulon–tabing–badan dara) |
| Meru | di utama, sisi kangin, menghadap kauh; tumpang **ganjil** (5 dan 3), atap ijuk hitam di atas batur batu | [S3], [S7b] |
| Bale kulkul | menara tinggi di kelod-kauh madya (arah barat daya), dua kentongan | [S2]; lihat "Sumber berbeda" |
| Wantilan | di nista | [S2], [S5] |
| Bale gong | di madya | [S1], [S2] |
| Bale pawedan | di utama; letak tepatnya perkiraan | [S1], [S2] |

### Sumber berbeda

- **Bale kulkul**: [S2] menempatkannya di barat daya madya; [S5] (mengutip Sudiana, Kemdikbud) dan contoh di [S1] menempatkannya di nista. Starter mengikuti [S2]; pura nyata beragam.
- **Letak padmasana**: Lontar Catur Winasa Sari, lewat [S4], memberi sembilan letak dengan jenis berbeda. Starter memakai kaja-kangin menghadap kauh, kasus Pura Kentel Gumi yang
  disebut pemangkunya memenuhi aturan lazim [S4]. Jadi ini satu pilihan sah, bukan satu-satunya.
- **Hadap meru**: [S3] menyebut umumnya ke barat, dengan pengecualian menurut pura. Di Bali utara kaja mengarah ke selatan, sehingga kangin dan kauh tetap, tetapi kaja/kelod terbalik terhadap peta.
- **Jumlah tumpang**: [S3] menyebut 1–11; [S7b] menyebut meru 3–11 dan menyebut bangunan satu atap bukan meru. `tingkatMeru()` menerima 3–11. Makin banyak tumpang, makin tinggi maknanya [S3]: 5 dan 3 dipilih karena tidak mengklaim pura besar.

### Penyederhanaan

- Tanpa arca, dwarapala, karang bhoma, Bedawang Nala, naga, citra Acintya, dan seluruh ukiran: panel polos menggantikan ornamen. Ornamen tak boleh dikarang, dan arca bukan isi yang pantas untuk kepingan kotak.
- **Tipologi padmasana.** [S11] membedakan padma capah (2 palih), padmasari (3 palih, 1 rong, tanpa Bedawang Nala), padmasana (5–9 palih, 1–3 rong, dengan Bedawang Nala). Tanpa Bedawang Nala, bentuk starter mirip padmasana bertingkat tetapi secara tipologi belum lengkap; kata "padmasana" hanya ada di data, tidak tertulis di layar. Jumlah palih dan proporsi perkiraan dari gambar [S11]. Panel ulon hitam berbingkai emas, kosong: [S4] mencatat pahatan Hyang Acintya emas di dasar hitam, sosoknya sengaja tidak dibuat.
- Kori agung tertutup, tanpa pintu samping. Kedua gerbang ada di sumbu tengah: susunan linear, satu kemungkinan dari banyak.
- Hanya tujuh bangunan; pura nyata jauh lebih penuh.
- Ukuran dan proporsi perkiraan (lebar 26 m, panjang 56 m), bukan hitungan Asta Kosala Kosali. Asta Kosala Kosali disebut sebagai rujukan tata letak umum [S9], bukan diterapkan rinci.
- Atap alang-alang pada bale dan warna bahan adalah pilihan rupa, bukan hasil sumber. Pohon adalah penghias dari `pustaka.*` (bentuknya dibuat untuk Jawa kuno).
- Pemedek = kartu kecil tanpa wajah, tanpa sesajen; bukan penggambaran busana upacara.
- **Legenda (perlu vonis pemilik):** "Tiga zona menurut tingkat kesucian, berpedoman pada arah gunung ke laut" mengikuti [S1] (tiga zona "berdasarkan tingkat kesuciannya", "berpedoman pada orientasi gunung – laut"). Menggantikan "makin dekat ke gunung, makin suci", yang menyimpulkan lebih jauh daripada sumber. Baris kecil "Denah generik, bukan pura tertentu" sengaja ditambahkan.
- UNESCO [S10] hanya konteks Tri Hita Karana; tidak membahas denah pura.

### Sumber

- [S1] Bhattacarya & Riyanto (2022), "Tri Mandala: Kearifan Lokal Bali dalam Pembagian Zonasi dan Ruang pada Bangunan Pura di Kabupaten Sidoarjo", *Sphatika: Jurnal Teologi* 13(1) (mengutip seminar Kesatuan Tafsir PHDI). https://ojs.uhnsugriwa.ac.id/index.php/Sphatika/article/download/1272/695/2412
- [S2] Simbolon, Kusuma & Lioe (2024), "Kajian Pola Ruang Terhadap Pura Agung Raksa Bhuana", UNPRI Press. https://jurnal.unprimdn.ac.id/index.php/hasenf/article/download/6203/3653/25212
- [S3] Wardana (2024), "Meru Architecture in Bali: History, Function and Challenges", *Bali Tourism Journal* 8(2): 38–41, doi:10.36675/btj.v8i2.110. https://balitourismjournal.org/ojs/index.php/btj/article/download/110/127
- [S4] Seniwati, Ngurah & Ngurah (2022), "Bentuk dan Makna Padmasana Anglayang Pura Kentel Gumi", *Vidya Wertta* 5(2) (mengutip Lontar Catur Winasa Sari lewat Anom 1975; konsep hulu-teben). https://ejournal.unhi.ac.id/index.php/vidyawertta/article/download/3616/1880
- [S5] detikBali, "Mengenal Utama Mandala, Zona Paling Suci dalam Struktur Pura" (mengutip Duwijo & Darta; Sudiana, Kemdikbud). https://www.detik.com/bali/budaya/d-6380172/mengenal-utama-mandala-zona-paling-suci-dalam-struktur-pura
- [S6] Wirawibawa, Putra & Aritama (2022), "Exploring Socio-Cultural Identity: Characteristics of the Architectural Design of Kori Agung Bangli", *Journal of Social and Political Sciences* 5(1): 50–59, doi:10.31014/aior.1991.05.01.335. https://zenodo.org/records/6131564
- [S7] Wikipedia, "Padmasana (shrine)": tidak lagi dipakai untuk bentuk, diganti [S11]. https://en.wikipedia.org/wiki/Padmasana_(shrine) · [S7b] Wikipedia, "Meru tower" (ijuk mengutip Nas 2003). https://en.wikipedia.org/wiki/Meru_tower
- [S8] *Jurnal Mahasiswa Arsitektur* Universitas Brawijaya, kajian Pura Penataran Agung Dalem Jawa Blambangan: zona dipisah tembok, candi bentar, kori agung, dengan beda ketinggian. Hanya ringkasan hasil pencarian yang terbaca (halaman menolak unduhan, HTTP 403). https://arsitektur.studentjournal.ub.ac.id/index.php/jma/article/view/757/621
- [S9] Siswadi & Maharani (2023), "Dimensi Aksiologis pada Tata Letak Bangunan di Bali Berdasarkan Lontar Asta Kosala Kosali", *Sphatika* 14(2), doi:10.25078/sphatika.v14i2.3038; Sari & Kusuma (2020), "Nilai Filosofis Tata Ruang Bangunan Tradisional Bali dalam Teks Asta Kosala Kosali", *Sphatika* 11(1), doi:10.25078/sp.v11i1.1497. Abstrak saja. Untuk rincian ukuran, rujukan baku: Gelebet dkk., *Arsitektur Tradisional Daerah Bali*, Depdikbud 1982 (belum dibaca langsung).
- [S11] Mahaputra, "Identifikasi Tipologi Arsitektur Pelinggih Padmasana di Pura Mertasari Denpasar", *Akses* (Univ. Ngurah Rai), ISSN 2085-4544 (terbit ±2023; merangkum Idedhyana 2016, belum dibaca langsung). https://ojs.unr.ac.id/index.php/akses/article/download/1063/899
- [S10] UNESCO World Heritage Centre, "Cultural Landscape of Bali Province: the Subak System as a Manifestation of the Tri Hita Karana Philosophy". https://whc.unesco.org/en/list/1194/ (halaman menolak unduhan otomatis; dibaca dari ringkasan pencarian)

## Batas

- **Tokoh tetap titik lemah**: kartu dipakai sebagai skala, setinggi puluhan piksel. Jangan shot dekat ke pemedek; kartu memperlihatkan tipisnya pada sudut rendah walau berputar di sumbu y.
- **Risiko mainan**: warna jenuh, kamera statis, tanpa pita fokus, atau lantai polos langsung terbaca game. Palet tanah, cuci kotor, flok lantai, grain, dan vinyet yang menjaganya.
- **Tepi kartu = alpha to coverage**, butuh MSAA di target komposer. Tanpa MSAA tepi bergerigi.
- **Pass tilt tidak tahu kedalaman**: blur menurut baris layar, jadi puncak menara di atas pita ikut kabur. Itu memang rupa tilt-shift; jangan menaruh label 3D di sana.
- **Kamera tidak boleh menembus** tembok/atap: `terbang()` tidak memeriksa tabrakan; potret titik lintasnya.
- **Lambung pada kepingan cekung** bisa menonjol; kepingan = kotak/prisma cembung saja.

## Nama global

`TILT GARIS diorama TRI_MANDALA pura`; starter juga: `LANGIT mulberry32 warnaRGB warnaJarak` (pengganti ringkas blok atmosfer untuk `pustaka`) `PAGI BATAS R MAKET LUKIS SUDUT PUNCAK LATAR pohon bebas TITIK LOOK JALAN D papan`.
