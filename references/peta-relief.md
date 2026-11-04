# Peta relief 3D — Jawa sebagai relief bercahaya

Dibaca HANYA saat membangun peta relief (pindah wilayah, perjalanan, perpindahan pusat kekuasaan). Contoh hidup:
`assets/starter-peta-relief.html` (18 dtk): peta datar berkontur naik jadi relief, kamera turun ke jantung Mataram Kuno, busur
rute menyala ke timur, mendarat di lembah Brantas. Bukti dan angka: `evals/bukti/2026-11-03-peta-relief/`.

Gaya ini tumbuh dari **kulit topografi** Jagad Budaya (kertas, garis kontur, coklat tanah vulkanik, hijau sawah, biru sungai), bukan
dari kertas sepia Babad. Bedanya: gunung bukan segitiga, melainkan relief yang diterangi matahari rendah seperti diorama.

## Isi

| Blok | Isi | Ada di |
|---|---|---|
| `peta-relief` (`src/runtime/peta-relief.js`) | data `JAWA`; murni: `proyeksi`, `lonlat`, `dekode`, `medan`, `jalurRute`; THREE: `petaRelief`, `sungaiPeta`, `rutePeta`, `labelPeta`, `tempelLabel`, `ikutMatahariPeta` | `starter-peta-relief.html` |
| `terbang`, `kamera`, `kamera-three` | `terbang()` untuk kamera; `pose()`, `light()`, `LUX`, `key` | sama |
| `scripts/peta-data.mjs` | membuat ulang string pantai & garis 200 m dari Natural Earth | alat pengembang, bukan deliverable |

Blok sengaja terpisah dari starter: fungsi murninya diuji tanpa browser (`scripts/test-peta.mjs`), dan starter 3D lain bisa memakainya
dengan menambah penanda `<wv:peta-relief>` sesudah `kamera-three` dan `terbang`. Karena hanya starter ini yang memasangnya, jalur
baca lain tidak bertambah satu bita pun.

## Data, sumber, lisensi

| Lapisan | Sumber | Pengolahan | Lisensi |
|---|---|---|---|
| Garis pantai | Natural Earth 10m `ne_10m_land` | klip 103–117 BT × 9,5–3 LS (semua daratan yang terlihat dari bingkai seluruh Jawa: Sumatra selatan, pantai selatan Kalimantan); Douglas–Peucker **0,5 km**; pulau < 0,003 deg² dibuang; kuantum 0,002° (≈ 220 m). 23 cincin, 1 262 titik, 4,5 KB | domain publik |
| Garis 200 m (paparan) | Natural Earth 10m `ne_10m_bathymetry_K_200` | klip 103,6–117,4 × 12–4 LS (lebih lebar: tepi klip palsu jauh dari jaring); fitur yang berbagi tepi disatukan; DP **1,5 km**. 5 cincin, 227 titik | domain publik |
| Gunung api | Global Volcanism Program, 2026. *Volcanoes of the World* (v. 5.4.0; 7 Aug 2026). Smithsonian Institution, compiled by Venzke, E. https://doi.org/10.5479/si.GVP.VOTW5-2026.5.4 | lapisan WFS `Smithsonian_VOTW_Holocene_Volcanoes` (34 gunung, tanpa Krakatau) dan `…_Pleistocene_Volcanoes` (34 dari 42: tanpa kubah lava kecil, medan maar, dan yang < 0,8 km), diambil 3 Nov 2026. Dipakai: lon, lat, elevasi puncak | kutip GVP |
| Sungai | **SKEMATIS** — Natural Earth 10m tidak memuat satu pun sungai Jawa (0 fitur di kotak 104,5–116 BT; diperiksa) | titik kota/muara yang dilalui, hulu → muara, dihaluskan Catmull-Rom | karya sendiri |
| Wilayah (dataran tinggi, pegunungan selatan, Kendeng, Rembang, Ijen) | bentuk tangan | gaussian `[lon, lat, jari x, jari z, tinggi]` | karya sendiri |

Jari kaki (`R`), profil (`k`, `apron`), bahu, kawah, jurang, kaldera Tengger, dan tata lahan adalah **perkiraan bentuk**, bukan data. Yang
data hanya posisi dan elevasi puncak. Gunung Sumatra di luar 104,5 BT tidak dimuat (daratannya ada, gunungnya tidak). Sungai bisa diganti data vektor sungguhan (mis. HydroRIVERS) bila lisensinya cocok dengan MIT; OSM
(ODbL) menuntut share-alike untuk basis data turunan, jadi tidak ditanam di repo ini.

Format string pantai: cincin dipisah spasi; tiap titik = selisih lon, lat terhadap titik sebelumnya dalam kuantum `q` derajat, zigzag,
lalu varint 5 bit per huruf base64url (huruf ≥ 32 = lanjut). Membuat pulau lain (Bali, Lombok):
`node scripts/peta-data.mjs <folder-ne> --darat 114.3,-9,116,-8 --laut 113.5,-10,117,-7 --toleransi .3`, tempel dua baris
keluarannya ke objek data baru, isi `gunung` dari WFS GVP, lalu panggil `medan(DATA)`.

## Skala dan akurasi

- **Satuan km.** x ke timur, z ke selatan, y ke atas. Proyeksi equirektangular di 7,3° LS (pusat 110° BT): galat skala ≤ 0,4 % di
  tepi utara/selatan Jawa; jarak Merapi–Semeru = haversine ± 0,5 % (diuji).
- **Tegak (vertical exaggeration) 4×.** Semeru 3,657 km jadi 14,6 km visual. Alasannya: dari bingkai seluruh Jawa (±1 100 km lebar)
  gunung 1× setinggi 3–4 piksel; 4× memberi kerucut ±20 piksel dengan bayangan panjang, sedangkan di close-up lereng atas kerucut
  masih ±50–60° (bukan duri). Garis kontur dan label memakai elevasi SEBENARNYA (atribut `tinggi`), jadi angka kontur tidak ikut
  dibesarkan. Ganti `tegak` per proyek; nyatakan angkanya bila peta dipakai sebagai keterangan.
- **Pantai**: mengikuti Natural Earth 1:10 juta yang disederhanakan 0,5 km. Baik untuk bentuk pulau; teluk dan tanjung < ±2 km hilang.
- **Relief**: puncak gunung = elevasi GVP (≤ 20 m, diuji), bentuk lereng perkiraan. Dataran dan pegunungan non-vulkanik bentuk tangan
  (Bandung ±0,55 km, Surakarta ±0,12 km, Kediri ±0,1 km). Ini peta penjelas, bukan DEM: jangan dipakai untuk klaim ketinggian kota.
- **Sungai**: skematis, galat beberapa km, tanpa meander. Untuk cerita "sungai ini mengalir dari sini ke sana", bukan "tepat di sini".
- **Laut**: paparan (< 200 m) dan laut dalam dari Natural Earth; kedalaman di antara keduanya hanya parameter warna (0 di pantai →
  −0,2 km tepat di garis 200 m → turun ke −2,8 km), bukan batimetri.

## `medan(D = JAWA, {seed})`

Mengembalikan `{tinggi(x,z), darat, laut, gunung, sungai, kerucut}`, murni dan deterministik (sidik geometri diuji di dua muat):
- `tinggi(x,z,alur=1)` km: darat = dataran pantai (2,5 m/km sampai 40 km) + `wilayah` + fBm, digabung smooth-max dengan kerucut gunung;
  lembah sungai diukir (lebar 1,2 km di hulu → 4,5 km di hilir, jadi tak memangkas puncak; paling dalam 80 m di bawah tanah asli,
  jadi lembah, bukan ngarai); laut = parameter kedalaman negatif.
  `alur` 0 = kerucut tanpa jurang (kisi kasar; jurangnya digambar shader).
- `darat.sdf`, `laut.sdf`: jarak bertanda ke pantai / garis 200 m. Tepat ≤ 8 km (ember 8 km); lebih jauh dari kisi pembantu 8 km atas ruas yang dijarangkan 3× (galat ±1–2 km, dilebur 6–8 km).
- `gunung[i]`: `{nama, x, z, E, R, k, apron, kawah, cekung, alur, lancip, jurang, fase, bahu, kaldera}`. Puncak = bibir kawah = data GVP (uji ±20 m).
  Bentuk ber-seed per gunung (opsi data boleh menimpa): profil dua lengkung (`apron`: lereng atas curam + kaki lebar), punggung radial, 1–3 `bahu`
  (`[arah rad, r, tinggi]`, selalu di bawah puncak), kaki tak bulat (A + B ≤ ,18). Holosen: 9–15 jurang, kepala tanah + abu; Pleistosen: 5–9 jurang
  lebih dalam, puncak membulat, berhutan. Jurang berliuk, dalamnya beda-beda, mulai di ketinggian berbeda. Rumus jurang ditulis dua kali, di
  `medan()` (JS) dan shader `petaRelief` (GLSL): ubah keduanya bersama. Bahu baru bisa membuat sungai berjalan di punggung: `test-peta` menangkapnya.
- `sungai[i]`: `{nama, p[[x,z]], air[]}` per 0,8 km; `air` = batas bawah ukiran: minimum berjalan dari hulu (tak pernah naik) atas tanah
  terendah di penampang (±0,3 km di hulu → ±2,4 km di hilir), berakhir di pantai. Pita sungai digambar di tanah terukir.

## `petaRelief(M, opsi)` dan pendampingnya

| Opsi | Bawaan | Arti |
|---|---|---|
| `kotak` | `[105,-9.1,115.9,-5.5]` | kisi rapat (lon/lat); di luar, langkah tumbuh 40 %/baris sampai ±`tepi` km (laut jauh di kabut) |
| `langkah` | `1.8` | km per sel kisi rapat (seluruh Jawa: ±3 px/sel) |
| `halus` | `null` | `{kotak, bagi}`: tambalan rapat (mis. 1,8/4 = 0,45 km) untuk close-up; tepinya = tepi kisi kasar (tanpa retak), normalnya dilebur |
| `tegak` | `4` | pembesaran tegak |
| `warnaLaut` | — | `{pantai, dangkal, laut, dalam}` |

Kembali `{grup, U, tegak, tinggiDunia(x,z)}`. `grup.scale.y` = relief naik (0,03 → 1 di starter; di bawah 0,02 matriks normal singular).
`U.uWaktu` = `tl.time()` (bayang awan berarak), `U.uNaik` = `grup.scale.y` (kedalaman jurang shader ikut naik), `U.uCetak`
(1 = peta cetak datar tanpa cahaya, 0 = relief bercahaya), `U.uAwan`, `U.uKontur` (0 = tanpa kontur).

Jurang di kisi kasar (1,8 km) tidak bisa jadi geometri tanpa aliasing, jadi tiap verteks membawa indeks gunung yang menguasainya
(atribut `gunung`, `flat`), dan fragmen menghitung `jurang()` gunung itu lalu memiringkan normal. Tambalan `halus` memakai geometri
jurang sungguhan; alur halus lereng bawah hanya di shader. Data gunung = 2 `vec4` uniform per gunung (68 gunung = 136 vektor).

Tata lahan di shader dari ubin noise 256² (mipmap, tanpa raster): sawah bertambal, tegal, bercak permukiman, hutan makin rapat ke atas. **Nada, bukan
data**: tidak ada batas hutan, kota, atau sawah sungguhan; jangan dipakai sebagai keterangan. Kontur memudar ke 22 % saat relief naik (`uCetak`).

- `sungaiPeta(peta, {lebar: px, warna, angkat})` → `{[nama]: {mesh, mat, s}, U}`. Lebar dalam **piksel** (vertex shader ∝ jarak kamera),
  menipis ke hulu. Tween `mat.color` untuk sungai yang sedang diceritakan.
- `jalurRute(M, [[lon,lat]…], {tegak, puncak, turun})` → `jalurElang` 3D berparameter panjang busur: ujung menempel tanah (+`turun`),
  tengah naik `puncak` km. Itu busur **perpindahan**, bukan jalan atau rute pasukan.
- `rutePeta(peta, J, {lebar, warna, cahaya})` → `{maju, perbarui()}`. Tween `maju.v` 0 → 1 = tergambar (fungsi murni waktu). Inti HDR +
  pendar aditif + sprite kepala + `PointLight` yang menerangi tanah saat kepala rendah.
- `labelPeta(peta, html, {lon, lat, naik, kelas, sepanjang})` → elemen di `#label`; `tempelLabel()` memproyeksikan ulang SEMUA label.
  `sepanjang: [lon, lat]` memutar teks searah layar (sungai, ±40°, tetap tegak). Kelas starter: `gunung` (garis penunjuk), `sungai`,
  `laut`, `tempat` (titik + cincin).
- `ikutMatahariPeta(arah, {min, maks})`: kotak bayangan ±r km di titik tatap, r ∝ jarak kamera.

Urutan per frame (starter `siapkan()`): `applyCam()` → near/far dan kabut dari jarak ke titik tatap → `ikutMatahariPeta` → `U.uWaktu`,
`U.uNaik` → `uPx = 2·tan(½fov)/H` ke sungai dan rute → `grup.updateMatrixWorld()` → `rute.perbarui()` → `tempelLabel()` → `composer.render(0)`.

## Resep

1. **Cahaya dulu.** Matahari ±22° dari barat-barat laut (`kAz` 250 diukur dari +z = selatan ke +x = timur), warna hangat PUCAT
   (`#ffe1c2`; jingga `golden` membuat laut coklat): bayangan gunung memanjang ke timur. Fill hemisfer ±1 (langit biru-abu, tanah
   coklat) = bayangan dingin. Matahari 13° memang lebih dramatis, tetapi dataran jadi gelap (dataran = sebagian besar bingkai peta).
   ACES, exposure ,72 (`sinematografi.md` §6).
2. **Buka dari kulit lama.** `grup.scale.y` dari ,03: frame pertama adalah peta datar berkontur yang sudah dikenal penonton kanal,
   lalu relief naik 2–3 dtk. Satu kali per video.
3. **Kamera**: `terbang()` per ruas, titik = `pose()` di sekitar fokus, `look` = fokus. 50 mm untuk seluruh pulau (perspektif datar),
   35 mm saat turun. `g` besar (±450) + `rollMaks` ±6: kamera peta miring sedikit, bukan pesawat. Ruas berakhir dan mulai di detik
   kelipatan ,5 (at + dur tepat biner).
4. **Rute**: mulai menggambar sesudah kamera tiba di titik asal; kamera ruas berikutnya mengikuti kepala rute dari samping
   (yaw −30…−40°: rute melintas kiri → kanan menjauh). Cincin di tujuan berdenyut dari `t`, bukan `repeat`.
5. **Label**: ≥ 34 px (gunung), 40 (sungai), 46 (laut); nama gunung kapital DM Mono, perairan miring berjarak. Masuk per ketukan,
   keluar sebelum menumpuk; maksimal ±5 label sekaligus + satu legenda.
6. **Legenda** di kiri bawah di atas laut selatan + kantong kertas (`#saku`): luminans ≥ 80 % di bawah teks.

## Jebakan

- **NE 10m tanpa sungai Jawa.** Jangan menunggu data; titik skematis + catatan akurasi.
- **Bidang 200 m terbelah.** NE memotong samudra jadi fitur berbagi tepi; tanpa penyatuan, tepi potong jadi garis 200 m palsu. `peta-data.mjs` membuang ruas kembar dan ruas nol; `test-peta` memeriksa laut lepas tetap dalam.
- **Lembah sungai memangkas gunung.** Lebar lembah tumbuh dari 1,2 km (hulu) ke 4,5 km (hilir); `test-peta` memeriksa semua puncak.
- **Ngarai dan tanggul.** Muka air = minimum berjalan: satu cekungan di hulu menahan muka air sepanjang puluhan km. Kini ukiran dibatasi 80 m, `test-peta`: alur tak pernah di atas kedua tebing.
- **Kamera sebelum terbang pertama** ada di pose bawaan (10 km dari asal = Dieng). `cutTo(0, pose awal)` dulu.
- **Data pantai harus menutup semua yang terlihat.** Kotak klip yang lebih sempit dari bingkai membuat daratan di luar kotak memanjang lurus.
- **Label vs busur yang melayang**: busur 9 km tampak ±18 km lebih jauh dari jejak tanahnya. Pindahkan label ke sisi lain atau ke detik lain.
- **Kabut berbasis jarak** menenggelamkan seluruh pulau saat kamera 1 500 km jauhnya. `fog.near/far` dan `camera.near/far` disetel tiap
  frame dari jarak ke titik tatap.
- **Label tanpa oklusi**: label di balik gunung tetap tampak. Pilih detik atau sudut lain.
- **CI tanpa GPU**: `BERAT` di `test-starters`; matematika di `test-peta`.
- **Biaya**: kisi 184 rb + tambalan 84 rb verteks, bayangan 2048 PCF, MSAA 4×. Terukur HD 4000: BIAYA_PETA. Kenop pertama bila lambat: `langkah` 2,2, tanpa `halus`, bayangan 1024.

## Nama global

Blok `peta-relief`: `JAWA PETA0 KM_LON KM_LAT proyeksi lonlat dekode medan jalurRute petaRelief sungaiPeta rutePeta LABEL labelPeta
tempelLabel ikutMatahariPeta`. Starter (selain nama starter 3D dan `terbang`): `M PETA SUNGAI RUTE SORE langit MATAHARI lbl MATARAM
BRANTAS P RUAS RUAS2 f0 d0 y0 p0 T terbangPeta JALAN1 JALAN2 denyut siapkan`; kait uji `PETA_UJI PETA_SIDIK`.
