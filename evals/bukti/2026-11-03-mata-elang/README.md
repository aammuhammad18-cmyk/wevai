# Mata elang 3D (3 Nov 2026)

Sub-proyek 5 (H di `docs/rencana-1.4.0.md`). Starter: `assets/starter-elang.html`; blok: `src/runtime/terbang.js`,
`src/runtime/lanskap-3d.js`; uji: `scripts/test-elang.mjs` (node:test) dan `scripts/test-starters.mjs` (kait `ELANG_UJI`,
`ELANG_SIDIK`, tone mapping per starter, `terbang()` 2.5D disuntikkan ke starter 2.5D). Resep: `references/mata-elang.md`.

- `kontak.jpg`: lembar kontak shot bawaan, 6 detik (lihat tabel).
- `tonemap.jpg`: AgX vs ACES di r161. Atas: shot gapura dalam empat varian (sebelum iterasi akhir). Bawah: oranye api
  `#ff6a1a` emisif ×0,25…×32.
- `terbang25.jpg`: `terbang()` 2.5D di salinan `starter-sinematik.html` (blok disuntikkan, bukan bagian starter).
  Titik `[fx,fy,zoom]` dengan zoom 0,8 → 2,7 sebagai dolly (`mm·zoom` tetap). Bidang z 0 (penjaga) membesar jauh lebih cepat
  daripada z −200 (gapura) dan z −900 (gunung, pohon): paralaks kedalaman, bukan zoom datar. Tepi bidang yang tampak di
  0 dtk = jalur uji lebih lebar dari bidang adegan itu, sebuah jebakan yang dicatat di `mata-elang.md`.
- `elang.gif`: seluruh shot 11,5 dtk, 8 fps, lebar 360 px, 80 warna, 1,97 MB. Untuk menilai gerak (roll, laju, motion blur), yang tak terlihat di bingkai diam.

Bingkai PNG (±3 MB per bingkai) tidak disimpan di repo. Potret ulang:
`URL="file:///<repo>/assets/starter-elang.html?clean=1" node scripts/snap.mjs shots <detik…>`. Chrome dijalankan lewat
pembungkus berprioritas Idle yang memegang kunci Chrome bersama, karena render pemilik sedang berjalan.

## Bingkai dan angka

Bingkai dari `assets/starter-elang.html?clean=1` lewat `OPENER.seek(t)`, 1920×1080, ditangkap 10 bingkai/dtk (116 bingkai, juga
bahan `elang.gif` 8 fps). `node scripts/nilai-visual.mjs <bingkai…>`, tanpa `--sumber` untuk shot bergerak seperti anjuran
`alat-kerja.md`, lalu dua bingkai dinilai ulang dengan subjek yang dinyatakan. Koordinat api diukur dari piksel bingkai itu,
dan kotak gapura dari piksel bata.

| Detik | Isi | p5/p50/p95 | Rentang | Kontras | Titik terang | Warna | Catatan |
|---|---|---|---|---|---|---|---|
| 0,00 | sawah berundak, gapura berobor, gunung | 15.7/34.5/89.3 | 73.7 ok | tengah 9.1 peringatan | – | 4 ok | tanpa subjek/sumber |
| 2,50 | busur di atas sawah (roll) | 14.1/28/87.3 | 73.1 ok | tengah 10 ok | – | 4 ok | tanpa subjek/sumber |
| 4,30 | gapura + obor | 14.2/26.3/78.1 | 63.8 ok | tengah 1.2 peringatan | – | 3 ok | tanpa subjek/sumber |
| 4,70 | di dalam celah (MB) | 7.2/14.7/22.6 | 15.3 peringatan | tengah 2.8 peringatan | – | 2 ok | tanpa subjek/sumber |
| 6,50 | reveal lembah | 14.8/33.6/94 | 79.2 ok | tengah 10.9 ok | – | 4 ok | tanpa subjek/sumber |
| 11,00 | mendarat + legenda | 20.1/46.2/95 | 74.9 ok | tengah 7.8 peringatan | – | 4 ok | tanpa subjek/sumber |
| 4,30 | gapura + obor | 14.2/26.3/78.1 | 63.8 ok | subjek 59.9 ok | +71.6 +71.6 ok | 3 ok | `--subjek` gapura, `--sumber` dua api (diukur dari piksel) |
| 11,00 | mendarat + legenda | 20.1/46.2/95 | 74.9 ok | subjek 27.2 ok | – | 4 ok | `--subjek` gunung |

Peringatan yang tersisa:
- **0,0 dan 11,0, kontras tengah 9,1 / 7,8.** Lanskap lebar tanpa subjek di tengah. Bila subjeknya dinyatakan, yaitu gunung di
  11,0 dtk, kontrasnya 27,2 dan lolos.
- **4,3, kontras tengah 1,2.** Gapura memenuhi tengah DAN tepi bingkai. Dengan `--subjek` gapura dan `--sumber` dua api,
  semua lolos: kontras 59,9, titik terang +71,6 / +71,6. Angka api ini setara acuan sinematik kalibrasi (+66…+71).
- **4,7, rentang 15,3 (flat) dan 2 warna.** Kamera di dalam celah, dinding bata teduh memenuhi bingkai, ±0,4 dtk saat motion
  blur aktif. Ketukan gelap "keluar gerbang menuju terang", disengaja; obor membuat bata tetap terbaca merah.

`ELANG_UJI` pada build akhir:
- `toneMapping` 4 (ACES);
- jalur: langkah posisi maks 0,234 m per 1/120 dtk (laju puncak ±28 m/dtk), putaran maks 0,72°, roll maks 12,65° (batas 23,1);
- celah: jarak bebas 1,47 m sesudah dikurangi ½ diagonal near plane, melintas di x ≈ 0, y 2,5 m;
- motion blur: 1 render di luar `KABUR`, 8 di dalam; `KABUR` = 4,53–5,43 dtk.

## Tone mapping: ACES, bukan AgX

Diperiksa keduanya di three r161, sesuai permintaan, pada exposure .45 (ACES) dan .55 (AgX). Starter memakai
`ACESFilmicToneMapping`, exposure .5.

**Api** (`tonemap.jpg` bawah): oranye `#ff6a1a` emisif, intensitas ×0,25…×32. Rentang ×1…×4 menentukan rupa api, dan di
rentang itu ACES tetap oranye jenuh sedangkan AgX memucat:

| Intensitas | ACES .45 (RGB) | AgX .55 (RGB) |
|---|---|---|
| ×1 | 194, 67, 13 | 188, 101, 58 (salem) |
| ×2 | 238, 119, 35 | 218, 135, 91 (persik) |
| ×4 | 255, 173, 74 | 240, 168, 126 |

Di atas ×4, ACES bergeser ke kuning-putih seperti inti api. AgX "base" r161 sengaja mendesaturasi nilai terang.

**Senja berlatar terang** (`tonemap.jpg` atas; `nilai-visual` dengan `--subjek 820,140,620,520` = gapura):

| Varian | p5/p50/p95 | Rentang | Kontras subjek | Warna |
|---|---|---|---|---|
| AgX .55, matahari 2,2° | 16/35/85 | 68,8 | 49 | 4 |
| ACES .45, matahari 2,2° | 11/25/90 | 79,1 | 64 | 4 |
| AgX .5, matahari 1,4° | 13/32/82 | 69,0 | 50,8 | 4 |
| ACES .42, matahari 1,4° | 9/23/87 | 78,4 | 65,9 | 5 |

ACES memberi rentang dan kontras siluet lebih besar. AgX menyimpan detail bayangan, tetapi langitnya pucat krem.

**Putusan**: ACES untuk konten sejarah/sinematik, karena api, obor, bara, dan siluet adalah rupa patokan.
- Exposure ACES r161 = nilai/0,6, jadi .5 setara 0,83 linear.
- Brand/produk tetap `NoToneMapping`. Diuji `test-starters`: `renderer.toneMapping` explainer 3D dan opener = 0, elang = 4.

## Belum diukur

- Biaya per frame (`bench-frame.mjs`): tidak dijalankan karena render pemilik sedang berjalan. Ukur di mesin senggang:
  `node scripts/bench-frame.mjs assets/starter-elang.html "clean=1" 20`, di luar segmen motion blur dan di dalamnya
  (frame mulai detik 2 → di luar; ubah detik mulai di skrip untuk segmen KABUR 4,53–5,43 dtk).
- Waktu `test-starters` di runner CI (SwiftShader, tanpa GPU): halaman ini paling berat di antara starter.
