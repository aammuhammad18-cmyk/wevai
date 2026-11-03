# Painterly `lukis`: Kuwahara + cat air tanpa sapuan yang mendidih (3 Nov 2026)

Rencana 1.4.0 §J, "Painterly (Kuwahara / cat air), tanpa sapuan yang 'mendidih'". Starter: `assets/starter-lukis.html`
(16 dtk, legenda senja "Desa di kaki gunung"); blok: `src/runtime/lukis.js`; dokumen: `references/lukis.md`; uji:
`scripts/test-lukis.mjs` (node:test) dan, di `scripts/test-starters.mjs`, kait `LUKIS_UJI` + blok lukis berbasis screenshot.

- `kontak.jpg`: 6 bingkai `?clean=1`, lalu dua baris potongan 1:1 (lihat di bawah).
- `potong.jpg`: potongan 1:1 wilayah yang sama (desa: x 1290, y 600, 480×270 px), 4 bingkai berurutan (1/60 dtk) mulai t = 8
  dtk, tiga baris: lukis dengan kamera ditahan, lukis diputar biasa, dan filter layar naif ber-seed per frame (mutasi yang sama
  dengan uji) dengan kamera ditahan. Di atas tiap baris: selisih antarframe.
- `kenang.jpg`: `?kenang=1`, kilas balik sepia (palet `kenang`, `nada` .78), t = 9 dtk, diperkecil ke 1280×720.
- `nilai.json`: `nilaiBingkai()` dari `scripts/nilai-visual.mjs` untuk keenam bingkai (matahari dan kotak desa per bingkai).

Bingkai PNG (±4 MB per bingkai) tidak disimpan di repo. Potret ulang:
`URL="file:///<repo>/assets/starter-lukis.html?clean=1" node scripts/snap.mjs shots 0.5 3 5.5 8.5 11.5 14.5`. Chrome dijalankan
lewat pembungkus berprioritas Idle yang memegang kunci Chrome bersama, karena render pemilik sedang berjalan.

## Bingkai dan angka

`nilai-visual` per bingkai dengan `--sumber` = matahari dan `--subjek` = kotak desa (rumah panggung + lontar), keduanya dihitung
dari `CAM` bingkai itu (bidang −2000 dan −420 bergeser berbeda karena paralaks). Contoh satu bingkai:
`node scripts/nilai-visual.mjs t8_50.png --sumber '[{"x":1448,"y":556}]' --subjek 1280,683,534,226`.

| Detik | Isi | p5/p50/p95 | Rentang | Kontras subjek | Matahari | Warna |
|---|---|---|---|---|---|---|
| 0,50 | pembuka: gunung api berasap, desa, tebing gelap | 24.9/43.5/72.8 | 47.9 ok | 15.9 ok | +54.6 ok | 4 ok |
| 3,00 | legenda "Desa di kaki gunung" di atas tebing gelap | 24.8/44.4/73.3 | 48.5 ok | 15.7 ok | +53.3 ok | 4 ok |
| 5,50 | burung pulang, pemikul di pematang | 24.9/44.8/73.3 | 48.4 ok | 15.4 ok | +53.5 ok | 4 ok |
| 8,50 | dolly + geser, petani menanam | 25/45.1/72.8 | 47.7 ok | 14.8 ok | +52.8 ok | 4 ok |
| 11,50 | asap kawah naik, burung di atas gunung | 25.2/46.1/73 | 47.8 ok | 15.7 ok | +51.8 ok | 4 ok |
| 14,50 | akhir geser: desa di kanan, pemikul mendekati desa | 25.3/46.5/73.1 | 47.8 ok | 15.7 ok | +51.6 ok | 4 ok |

Nol peringatan. Kantong legenda (x 132–940, y 830–990, tebing gelap): L OKLab p50 26,4 · p95 32,0 di t = 0,5 dan 26,3 · 31,5 di
t = 14,5 (luminans relatif ±2–3 %), jadi teks krem terbaca; yang terang di kotak itu hanya akar gantung beringin yang ter-rim.

## Tidak mendidih

Potongan `potong.jpg`, selisih antarframe (% piksel berubah / % berubah > 8 level / rata-rata |Δ| kanal):

| Baris | 0→1 | 1→2 | 2→3 |
|---|---|---|---|
| lukis, kamera ditahan, waktu maju (sprite disembunyikan) | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| lukis, putar biasa (kamera bergeser ±0,15 px/frame, sprite tampil) | 71,9 / 0,52 / 0,63 | 69,7 / 0,50 / 0,60 | 70,15 / 0,45 / 0,60 |
| filter layar naif ber-seed per frame, kamera ditahan | 87,16 / 30,01 / 7 | 87,5 / 30,54 / 7,27 | 87,2 / 30,17 / 7,17 |

Bingkai kontak dan potongan diambil dua kali, di dua peluncuran Chrome terpisah: PNG-nya sama byte demi byte (lukisan dibuat
ulang dari nol tiap muat, jadi ini juga bukti determinisme bake).

Baris kedua: sebagian besar piksel bergeser kurang dari satu level karena kamera bergerak sub-piksel (resampling bilinear), bukan
sapuan yang berganti; secara kasat mata keempat bingkai sama. Baris ketiga = yang dicegah gaya ini: tepi bergoyang beda tiap frame.

`node scripts/test-starters.mjs assets/starter-lukis.html` (lewat pembungkus Idle), baris blok lukis:

```
lukis: 27 kanvas ddce5af2; seek 0; diam 0; geser z 0 0.00000, z -2000 0.00000/0.00000; mutasi didih 0.841, layar 0.163
ok     starter-lukis.html
```

- `sidik`: piksel ke-27 kanvas (5 bidang + 22 kanvas sprite) sama byte di dua muat halaman (hash FNV `ddce5af2`): worker ekspor
  melukis hal yang sama.
- `seek 0`: detik 5 lewat dua jalur seek = piksel identik (sprite dan legenda ikut).
- `diam 0`: kamera ditahan di pose t = 5, waktu maju 1/60 dtk, sprite/legenda/vignette disembunyikan: 0 piksel berubah.
- `geser`: satu bidang sendirian, kamera digeser sehingga bidang bergeser tepat 40 px: bidang terdepan (z 0) dan terjauh
  (z −2000) sama dengan dirinya tergeser, 0 piksel beda. Sapuan menempel pada bidang; tak ada tekstur yang diam di layar.
- Mutasi wajib tertangkap: filter layar ber-seed per frame (feTurbulence + displacement di `#view`) membuat `diam` berubah
  84,1 % piksel; tekstur kertas diam di layar (*shower door*) membuat `geser` beda 16,3 % piksel (> 2 level).

`LUKIS_UJI` (fixture di luar rig; test-starters memanggilnya di `?kosong=1`), keluaran di halaman bawaan:
`{"ulangSama":true,"seedBeda":true,"kosong":false,"geserSama":true,"geserBeda":2,"mentah":true,"opsiDitolak":true}`. Mutasi
sementara `obj()` = koordinat kanvas, bukan objek (`vec2 obj(vec2 f){return f*O.z;}`): `geserSama:false`, 59 563 kanal beda.

## Biaya

Mesin acuan (i3-3217U, HD 4000, Chrome 156 headless, ANGLE D3D11) SAAT render pemilik berjalan, jadi batas atas; bench
menganggur (`bench-frame.mjs`) belum dijalankan, sesuai aturan kerja.

| Ukuran | Nilai |
|---|---|
| per frame: seek + 2 rAF + screenshot JPEG q80, median 10 frame | `starter-lukis` **197 ms**; `starter-sinematik` di sesi yang sama 257 ms |
| muat → `OPENER.ready` | lukis 15,5 dtk (5 bidang 2240×1400 + 22 kanvas sprite, sekali per muat); sinematik 1,5 dtk |
| satu bidang 2240×1400 terpisah (raster + kompilasi shader + 11 pass) | 1,8–2,1 dtk; bidang 16×16 1,6 dtk (kompilasi); kompilasi pertama di profil baru 7,2 dtk |
| `kuas` 0 / 3 / 6 / 9 | 1 929 / 1 825 / 2 082 / 1 956 ms: Kuwahara tenggelam di ongkos tetap |
| `res` .5 | 1 727 ms |
| SwiftShader (CI tanpa GPU), satu bidang `kuas` 6 | 81 742 ms → `starter-lukis.html` masuk `BERAT` |

## Perintah

```
WEVAI_AKAR=<worktree> cmd /c "start /low /b /wait node <scratchpad>/idle-run.mjs assets/starter-lukis.html assets/starter-sinematik.html assets/katalog-pustaka.html"
node --test scripts/test-lukis.mjs
node scripts/rilis.mjs --tanpa-browser
```

Pengukuran, potongan, dan bingkai memakai skrip kerja sementara di luar repo yang memegang kunci Chrome yang sama (pola
`idle-elang.mjs`): bake per kenop di halaman scratch (`performance.now()` hanya di sana, tidak pernah di starter), frame seperti
`bench-frame.mjs` dengan n kecil.

## Celah dan status

- **Status penerimaan: menunggu vonis visual pemilik.**
- Bench menganggur (`bench-frame.mjs`, ≥ 3 run) belum dijalankan: render pemilik berjalan.
- CI tanpa GPU melewati starter ini (`BERAT`); bagian murni diuji `test-lukis.mjs`, uji penuh di mesin ber-GPU.
- Orang = siluet umum tanpa wajah; jalan 8 pose pada 6 fps ("on fours" di 24 fps) — kaki sedikit meluncur karena tween x linear.
- Dolly ≤ 1,05; dolly lebih jauh melunakkan bitmap lukisan (naikkan `res`).
