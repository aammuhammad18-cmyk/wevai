# Babak sinematik 60 dtk (3 Nov 2026)

Bagian E di `docs/rencana-1.4.0.md`. `assets/starter-babak.html` berisi babak "Penjaga Gerbang", 60 dtk (bukti ini dibuat saat babak masih di `starter-sinematik.html`; pemilik memisahkannya 4 Nov, jadi keterangan di dalam gambar menyebut nama lama), untuk eval
`evals/briefs/10-sejarah-malam-obor.md`. Blok baru `src/runtime/babak.js` berisi `adegan()` dan `panggang()`. Resepnya ada di
`references/sinematografi.md` §5 "Babak multi-adegan", aturannya di `references/techniques.md` §7d.

Isi folder:
- `kontak.jpg`: 12 bingkai, yaitu 10 statis di sepanjang 60 dtk dan 2 di dalam shot mata elang (27,3 dan 28,5 dtk).
- `sebelum-sesudah.jpg`: krop penjaga di t 7 (framing f_7). Kiri = starter di main 8e4c31b (penjaga SVG statis), kanan = rig tokoh v2.
  Acuan f_7 tetap `evals/bukti/2026-11-01-spike-gapura/f_7.jpg` dan `evals/bukti/2026-11-03-starter-sinematik/kontak.jpg`.
- `nilai.json`: laporan `nilai-visual` tiap bingkai kontak. Kolom `perintah` berisi perintah lengkapnya, termasuk koordinat obor dan kotak penjaga.
- `bukti.json`: angka mentah determinisme, adegan tersembunyi, dan biaya seek di halaman.

Bingkai PNG (±3 MB per bingkai) tidak disimpan. Semua uji Chrome jalan lewat pembungkus berprioritas Idle yang memegang kunci Chrome bersama,
karena render pemilik bisa berjalan kapan saja. Potret ulang: `URL="file:///<repo>/assets/starter-babak.html?clean=1" node scripts/snap.mjs shots <detik…>`.

## Rundown

| Detik | Adegan | Dunia | Visual · kamera | Masuk lewat |
|---|---|---|---|---|
| 0–12 | 1 Gerbang (dalam) | 1 | WS penjaga di langkan, dua obor gapura bentar, legenda 0,8–4,8; dolly 1,07 + truck + handheld (framing t 7 = f_7); 10–12 kamera naik ke bulan | — |
| 12–24 | 2 Lembah | 2 | turun dari langit yang sama: gunung api berasap, sawah, rumah berpelita, tembok keraton bergapura bentar; dolly pelan | match cut di langit (`LANGIT`, bulan, `fx/fy` sama di 12⁻ dan 12⁺) |
| 24–31 | 3 Mata elang | 2 | PEMICU: obor penjaga di balik celah menyala 22,6 (+ VO). `terbang()` 2.5D 7 dtk: menukik, belok kanan lalu kiri (roll ≤ 22°), lurus menembus celah (bidang gapura +500 terlewati di zoom ±3,5), mendarat di penjaga (FS, ruang kepala + obor terbaca) | tanpa cut (push-through gapura) |
| 31–34 | 3 (mendarat) | 2 | push pelan; 33,4 penjaga mengangkat tombak | |
| 34–46 | 4 Penjaga | 3 | MCU samping, obor tiang di depan lensa kiri = rim di sisi obor; dolly + truck + handheld; 41 tombak diturunkan | cut on action (angkat tombak berlanjut) |
| 46–60 | 5 Penutup | 1 | gerbang lagi, bulan lebih tinggi: tarik mundur ke WS, legenda kiri atas 52,2–58,2; celup hitam 59,2–60 | larut lewat asap obor (adegan pendek 44,6–47,3, cut 46 di baliknya) |

Satu tokoh: penjaga, `tokoh.*` prajurit bertombak + perisai, tampak samping di ketiga dunia, menghadap kiri dengan obor di kirinya (rim di
sisi obor). Tampak tiga perempat ditolak: tombak yang bertumpu di tanah memotong wajah.

## Angka nilai-visual

`node scripts/nilai-visual.mjs <bingkai> --sumber '<obor>' --subjek <kotak>` per bingkai statis; bingkai mata elang tanpa `--sumber`
(obor bergerak) dan tanpa `--subjek`, seperti brief 10. Koordinat obor = pusat pendar `SUMBER` yang tampil dan menyala, kotak penjaga = alfa
kanvas tokoh tanpa bayangan jatuh; keduanya diukur dari halaman pada detik itu (`perintah` di `nilai.json`). Pelita jendela rumah tidak
dinyatakan sebagai obor.

| Bingkai | Jenis | p5 / p50 / p95 | Rentang | Kontras (mode: nilai) | Titik terang (selisih tiap obor) | Warna | `--subjek` | Keluar |
|---|---|---|---|---|---|---|---|---|
| 2 | statis | 15,4 / 25,7 / 52,9 | 37,5 | subjek: 25,7 | +70,7 +70,9 | 3 | 1252, 116, 330, 911 | 0 |
| 7 | statis | 15,4 / 25,7 / 52,2 | 36,8 | subjek: 26,3 | +70,7 +70,6 | 3 | 1300, 101, 346, 944 | 0 |
| 16 | statis | 12,3 / 23,2 / 42,5 | 30,2 | subjek: 22,8 | +74,1 +74,1 | 3 | 949, 613, 112, 305 | 0 |
| 23,5 | statis | 13,6 / 22,3 / 45,3 | 31,7 | subjek: 34,1 | +71,9 +73,7 +73,7 | 2 | 886, 593, 119, 323 | 0 |
| 27,3 | mata elang | 16,3 / 26,3 / 60,2 | 43,9 | tengah: 15 | – | 3 | – | 0 |
| 28,5 | mata elang | 26,7 / 43,1 / 68,7 | 42 | tengah: 17,4 | – | 3 | – | 0 |
| 33,6 | statis | 20,1 / 29 / 55,8 | 35,7 | subjek: 26,4 | +61,5 | 3 | 700, 0, 392, 1012 | 0 |
| 38 | statis | 19,3 / 31,6 / 52,2 | 32,9 | subjek: 12,9 | +60,9 | 2 | 884, 0, 623, 1079 | 0 |
| 43 | statis | 19,4 / 32,2 / 57,7 | 38,3 | subjek: 13 | +60,1 | 3 | 827, 162, 672, 917 | 0 |
| 47,5 | statis | 15,5 / 25,9 / 54,5 | 39 | subjek: 30,7 | +70,6 +70,8 | 3 | 1418, 101, 377, 978 | 0 |
| 52,5 | statis | 15,6 / 26,5 / 54,2 | 38,5 | subjek: 30,3 | +70,2 +70 | 3 | 1329, 191, 341, 888 | 0 |
| 57,8 | statis | 16 / 26,4 / 52,1 | 36,1 | subjek: 29,1 | +69,9 +69,9 | 3 | 1242, 276, 306, 803 | 0 |

## Akar beda latar sesudah lompat mundur (katalog maks 76/84)

Bingkai PNG 1920×1080 dibandingkan per piksel (maks = selisih kanal terbesar, 0–255). Jalur: "langsung" = seek pertama di halaman segar;
"lompat" = seek ke detik lain lebih dulu; "berurutan" = 30 langkah 1/30 dtk menuju detik itu (jalur ekspor).

**Dugaan lama terbantah.** Dugaannya: `snap`/`export`/`bench` memasang viewport sesudah halaman dimuat. Katalog pustaka di t 5, langsung
vs 25→5: dengan viewport sesudah `goto` 577 063 px berbeda (maks 78), dengan viewport 1920×1080 SEBELUM `goto` 577 090 px (maks 78).
Katalog tokoh: 329 920 vs 328 493 px (maks 102). Viewport tidak mengubah apa pun.

**Akar.** Lapisan `will-change:transform` dirasterisasi saat lapisan DIBUAT, dengan skala dan fase subpiksel kamera saat itu. Dolly dan truck
sesudahnya hanya mentransform bitmap tersebut. Lapisan dibuat saat halaman dimuat, saat seek langsung, saat tableau tampil lagi sesudah
`display:none`, dan saat tiba berurutan, jadi pikselnya bergantung jalur. Buktinya, tableau B katalog pustaka tersembunyi saat muat:
- t 12 langsung vs 9→12 (lapisan dibuat di 9): 618 909 px berbeda, maks 97;
- t 12 langsung vs 9→12→25→12 (dibuat ulang di 12): identik.

Ini juga mengenai worker ekspor kedua, yang mulai di tengah tableau.

**Obat bertahap**, diukur di katalog pustaka dengan perbaikan yang disuntikkan (t 5 langsung vs 25→5 · t 12 langsung vs 9→12):

| Varian | t 5 | t 12 |
|---|---|---|
| apa adanya | 577 090 px, maks 78 | 618 903 px, maks 97 |
| + 13 svg bidang dipanggang ke kanvas (42 MP, 185 ms) | 89 595 px, maks 3 | 246 986 px, maks 4 |
| + kabut tanpa `will-change` | identik | 166 769 px, maks 4 |
| + pendar tanpa `will-change` | identik | identik |

Obat yang dipasang di halaman/runtime. `snap.mjs`, `bench-frame.mjs`, dan `export-frames.mjs` tidak perlu diubah. Aturannya: semua yang ikut
kamera adalah bitmap tetap yang ditransform kompositor.
- Svg bidang dipanggang ke kanvas GPU: `panggang()`, blok `babak`, di starter-babak dan kedua katalog.
- `kabut` jadi kanvas tetap tiga tile yang digeser kompositor. Div ber-background tanpa `will-change` masih menyisakan beda ±2 (720–850 px)
  di halaman berriwayat (babak t 20, 52→7→40 lalu berurutan); tanpa kabut identik.
- Pendar `sumber()` jadi kanvas 256 px yang diregang. Div bergradien tanpa `will-change` menyisakan 17 px ±2 di katalog tokoh.
- Kanvas panggang perangkat lunak (`willReadFrequently`, dicoba demi memori GPU) dilukis ke lapisan bidang dan menyisakan ±3 di dunia yang
  tetap tampil sambil kamera berubah (babak t 7 dari 52: 5 227 px; t 27,5 berurutan: 4 335 px). Kanvas GPU tidak.

**Katalog sesudah obat** (viewport sesudah `goto`, seperti alatnya):

| Halaman, t | langsung vs lompat | langsung vs berurutan |
|---|---|---|
| katalog pustaka 5 (dari 25) | identik | 1 px, maks 1 |
| katalog pustaka 12 (dari 9) | identik | identik |
| katalog tokoh 5 (dari 25) | identik | identik |
| katalog tokoh 16 (dari 14,2) | identik | identik |

## Determinisme babak

Lima detik di empat dunia/adegan. "Langsung" = halaman segar. Halaman kedua punya riwayat panjang: semua detik sebelumnya, lalu lompat
dari adegan lain (melintasi cut), lalu 30 langkah 1/30 dtk dari t − 1.

| t | Adegan | Lompat dari | langsung vs lompat | langsung vs berurutan 1/30 |
|---|---|---|---|---|
| 7 | 1 Gerbang (dunia 1) | 52 | identik | identik |
| 20 | 2 Lembah (dunia 2) | 40 | identik | identik |
| 27,5 | 3 Mata elang, di tengah terbang (dunia 2) | 40 | identik | 10 223 px, maks 3, kotak 1,0–1919,1079 |
| 40 | 4 Penjaga (dunia 3) | 52 | identik | identik |
| 52 | 5 Penutup (dunia 1 lagi) | 7 | identik | identik |

Sisa satu: t 27,5 berurutan, di tengah terbang (bidang diskalakan 2–10× tiap frame), ±3 pada ±0,5 % piksel. Lompat ke detik yang sama
identik. Akarnya belum terbukti. Diagnosis di bawah dijalankan sebelum zoom pendaratan diturunkan 4,6 → 4,2, saat sisanya 3 131 px (kini 10 223 px, maks tetap 3):
t 27,5, halaman utuh kecuali disebut lain; "langsung" = halaman segar.

| Pembanding "langsung" | Hasil |
|---|---|
| lompat dari dunia lain (40 → 27,5) | identik |
| segar, t − 1/30 → t | identik |
| segar, t − 1 → t | 2 897 px, maks 3 |
| segar, t + 1 → t | 1 836 px, maks 3 |
| 40 → t − 1 → 29 langkah 1/30 → t | 3 131 px, maks 3 |
| sama, potret ulang tanpa seek | identik dengan potret pertama |
| `CAM`, transform rig dan bidang (string) | sama persis |
| hanya langit tampil | identik |
| hanya satu bidang tampil: −1600 / −1000 / −500 / −250 / +500 / +900 | 259 / 523 / 1 231 / 291 / 2 203 / 735 px, maks 1–2 |
| `will-change:transform` disuntikkan ke semua kanvas, atau per kelas (kabut, partikel + asap, panggang, pendar) | tetap 3 131 px |
| grade + halation / partikel / grain / tokoh / api disembunyikan satu per satu | 4 397 / 2 166 / 3 183 / 3 126 / 3 118 px |

Jadi pose kamera tidak berbeda, dan sumbernya ada di setiap bidang berkanvas, bukan di satu kelas lapisan. Beda muncul hanya bila dunia yang
sama sudah tampil pada skala yang jauh berbeda. Dugaan (belum dibuktikan): Chrome menyimpan keadaan raster dari skala sebelumnya. Kanvas WebGL
(langit) tidak terkena. Belum ada obat di sisi halaman. Dampaknya ke ekspor: dengan `WORKERS=2` worker kedua mulai di frame 900 = t 30,0,
masih di dalam terbang (24–31), jadi frame 30,0–31,0 bisa beda sampai ±3 dari `WORKERS=1`. Beda ini tidak terlihat mata, tetapi di atas angka
"maks. 1 level" di `export-frames.mjs`.

## Adegan tersembunyi tidak menggambar

240 seek (tiap 0,25 dtk, 0–60). Tiap fungsi kanvas 2D (`clearRect fillRect drawImage fill stroke putImageData`) dihitung per kanvas, dan tiap
kanvas dipetakan ke adegan pemiliknya. Penghitung `ADEGAN[i].panggil` = frame yang menjalankan callback adegan.

| Frame | Callback adegan tersembunyi | Panggilan kanvas adegan tersembunyi | Panggilan kanvas adegan yang tampil |
|---|---|---|---|
| 240 | 0 | 0 | 49.471 |

Adegan dan kanvasnya: `0–12+46–61 (15 kanvas)`, `12–34 (23 kanvas)`, `34–46 (9 kanvas)`, `44.6–47.3 (2 kanvas)`. Contoh tiap 5 dtk (T = tampil, angka = panggilan kanvas pada seek itu): `0: T426 -0 -0 -0` · `5: T214 -0 -0 -0` · `10: T213 -0 -0 -0` · `15: -0 T192 -0 -0` · `20: -0 T187 -0 -0` · `25: -0 T194 -0 -0` · `30: -0 T179 -0 -0` · `35: -0 -0 T226 -0` · `40: -0 -0 T225 -0` · `45: -0 -0 T227 T0` · `50: T214 -0 -0 -0` · `55: T213 -0 -0 -0`.

`test-starters` menjaganya: `SINEMA_UJI.tersembunyiDiam` (dua seek di adegan 1) dan `BABAK_UJI` (fixture adegan [2, 3)).

## Biaya

`bench-frame.mjs` belum dijalankan di cabang ini: pengontrol menjalankannya pada halaman hasil gabung. Pengganti: waktu `OPENER.seek(t)` di halaman
(`performance.now()`, median 4 frame berurutan): JS saja, dan sampai 2 rAF (gaya, tata letak, lukis, commit; raster dan tangkapan layar
tidak termasuk).

| t | 3 | 7 | 15 | 20 | 25 | 27,5 | 29,5 | 32 | 38 | 44 | 52 | 58 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| JS (ms) | 14 | 14 | 12 | 11 | 9 | 12 | 12 | 8 | 8 | 6 | 10 | 11 |
| + 2 rAF (ms) | 40 | 34 | 69 | 43 | 76 | 93 | 78 | 44 | 42 | 32 | 25 | 45 |

Kanvas DOM: 40 MP terukur sebelum kabut dan pendar jadi kanvas (sesudahnya ±52 MP, dihitung dari ukurannya). Pada 87 MP (penjaga MCU masih
dengan bayangan jatuh, panggang 1,25–2×) konteks GPU hilang dan semua kanvas kosong sesudah detik 34. Itu sebabnya `tokoh.gerak` di
dunia 3 tanpa `lantai` dan resolusi panggang dibatasi. Setup halaman (memanggang 15 svg): 2–5 dtk di mesin senggang, sampai 147 dtk saat render pemilik berjalan (terukur).

## Kait uji di halaman berisi

`ATM_UJI`, `CAHAYA_UJI`, `PASCA_UJI`, `CAM_UJI` kini jalan di halaman bawaan babak (tanpa `?kosong=1`). Satu mutasi sengaja per kait, di
salinan halaman babak:

| Mutasi | Kait | Hasil |
|---|---|---|
| tanpa mutasi | semua | `seekSama` `rimArah` `lapisBenar` `shakeHidup` = true |
| `partikel` menumpuk waktu (bukan fungsi murni t) | `ATM_UJI.seekSama` | false |
| `rim()` mendekati sumber | `CAHAYA_UJI.rimArah` | false |
| lapisan bayangan `normal`, bukan `lighten` | `PASCA_UJI.lapisBenar` | false |
| goyang handheld mati di `applyCam` | `CAM_UJI.shakeHidup` | false |

`RELIEF_UJI` (relief hidup) menyetel `SINAR` sendiri padahal adegan relief men-tween `SINAR`: di `starter-relief.html` ia dan `CAM_UJI`
tetap jalan di `?kosong=1`.
