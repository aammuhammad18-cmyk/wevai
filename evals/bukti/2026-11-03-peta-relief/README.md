# Peta relief 3D (3 Nov 2026)

Gaya lanjutan "Peta relief 3D topografi" (J di `docs/rencana-1.4.0.md`; peta §6 baris 4). Starter: `assets/starter-peta-relief.html`;
blok: `src/runtime/peta-relief.js`; alat data: `scripts/peta-data.mjs`; uji: `scripts/test-peta.mjs` (node:test) dan
`scripts/test-starters.mjs` (kait `PETA_UJI`, `PETA_SIDIK`, ACES per starter). Resep, data, akurasi: `references/peta-relief.md`.

- `kontak.jpg`: lembar kontak `snap.mjs` (`?clean=1`, 1920×1080, HD 4000), 7 detik kunci (tabel "Bingkai").
- `nilai.json`: laporan mesin `nilai-visual` tiap pemanggilan di bawah (`perintah`, `catatan`, `laporan`).

Bingkai PNG (±2,5 MB per bingkai) tidak disimpan di repo. Potret ulang:
`URL="file:///<repo>/assets/starter-peta-relief.html?clean=1" node scripts/snap.mjs shots 0 2.5 5.5 8.5 11.5 13.5 17.5`. Chrome
dijalankan lewat pembungkus berprioritas Idle yang memegang kunci Chrome bersama, karena render pemilik sedang berjalan.

## Bingkai

| Detik | Isi |
|---|---|
| 0 | peta CETAK datar (`uCetak` 1): kontur, hijau sawah, sungai biru, laut kertas, paparan terang di pantai selatan: kulit topografi Jagad |
| 2,5 | relief naik (`grup.scale.y` ,03 → 1) dan matahari mulai menyapu; legenda perairan |
| 5,5 | jantung Mataram Kuno: Merapi + Merbabu, bayangan panjang ke timur, titik "Mataram Kuno" berdenyut |
| 8,5 | busur rute mulai tergambar dari Prambanan; "Bengawan Solo"; legenda ABAD X di kantong kertas |
| 11,5 | busur sudah melintas di atas Lawu (label muncul sesudah kepala rute lewat); Wilis di tengah |
| 13,5 | kepala rute tiba di lembah Brantas: Kelud–Kawi–Arjuno, Brantas menyala |
| 17,5 | mendarat: "Lembah Brantas" (cincin berdenyut), KELUD, ARJUNO-WELIRANG, Brantas; jurang gunung = geometri tambalan 0,45 km |

## Angka `nilai-visual`

`node scripts/nilai-visual.mjs <bingkai…>`; subjek dan sumber dinyatakan per bingkai. Sumber = kepala rute: piksel paling terang
yang DIUKUR dari bingkai itu (bukan tebakan). Kotak subjek dibaca dari piksel bingkai.

| Detik | p5/p50/p95 | Rentang | Kontras | Titik terang | Warna | Catatan |
|---|---|---|---|---|---|---|
| 0 | 42,8/62,5/79,7 | 37 ok | tengah 6,3 peringatan | – | 3 ok | tanpa subjek/sumber (tengah vs tepi) |
| 2,5 | 40,4/63,6/78 | 37,6 ok | tengah 7,7 peringatan | – | 3 ok | tanpa subjek/sumber (tengah vs tepi) |
| 5,5 | 48,9/61,6/77,7 | 28,8 ok | tengah 3,5 peringatan | – | 3 ok | tanpa subjek/sumber (tengah vs tepi) |
| 8,5 | 40,9/62,5/78,3 | 37,4 ok | tengah 7,8 peringatan | – | 2 ok | tanpa subjek/sumber (tengah vs tepi) |
| 11,5 | 43,5/60,1/77,9 | 34,4 ok | tengah 2,9 peringatan | – | 2 ok | tanpa subjek/sumber (tengah vs tepi) |
| 13,5 | 42,1/60,4/77,9 | 35,7 ok | tengah 2,9 peringatan | – | 2 ok | tanpa subjek/sumber (tengah vs tepi) |
| 17,5 | 45,6/60,4/77,3 | 31,7 ok | tengah 2,4 peringatan | – | 2 ok | tanpa subjek/sumber (tengah vs tepi) |
| 5,5 | 48,9/61,6/77,7 | 28,8 ok | subjek 11,2 ok | – | 3 ok | subjek = gugus Merapi–Merbabu (kotak dari piksel bingkai) |
| 8,5 | 40,9/62,5/78,3 | 37,4 ok | subjek 20,5 ok | +31,9 ok | 2 ok | subjek = busur rute + titik Mataram Kuno; sumber = kepala rute, piksel paling terang yang DIUKUR |
| 11,5 | 43,5/60,1/77,9 | 34,4 ok | subjek 11 ok | +34,4 ok | 2 ok | subjek = Lawu; sumber = kepala rute (diukur) |
| 13,5 | 42,1/60,4/77,9 | 35,7 ok | tengah 2,9 peringatan | +33,8 ok | 2 ok | sumber = kepala rute tiba di lembah Brantas (diukur) |
| 17,5 | 45,6/60,4/77,3 | 31,7 ok | subjek 16,7 ok | – | 2 ok | subjek = gugus Kelud–Kawi–Arjuno-Welirang |

Peringatan yang tersisa:
- **Tengah vs tepi < 10 tanpa subjek** (7 bingkai pertama). Peta lebar tanpa satu subjek di tengah: dataran dan laut kertas sama terang di tengah
  dan tepi. Dengan subjek yang dinyatakan (gugus Merapi, busur + Mataram, Lawu, gugus Kelud–Arjuno) kontrasnya 11,0–20,5 dan lolos;
  bingkai 13,5 dtk hanya diberi sumber (kepala rute), jadi kontrasnya tetap diukur tengah vs tepi.
Catatan: bingkai 0 dtk sengaja peta CETAK (`uCetak` 1, tanpa cahaya): warna dari palet, bukan bayangan; rentangnya tetap 37 karena
laut dalam biru tua di bawah dan laut kertas di atas. Pada 2,5 dtk cahaya sudah ±85 % dan relief ±90 % naik.

## Uji

- `node --test scripts/test-peta.mjs`: 7 uji lolos. Proyeksi (pusat, bolak-balik, Merapi–Semeru = haversine ±0,5 %), dekode pantai NE
  (Jawa 10,33 deg², kotak data), medan deterministik (dua bangunan identik; seed lain berbeda), 68 puncak = elevasi GVP ±20 m, kawah
  Kelud cekung, kaldera Tengger, kaki kerucut berakhir di jari kaki, kota di darat, laut di laut, garis 200 m tepat di tepi poligon NE,
  laut lepas tetap dalam, Laut Jawa tetap paparan, sungai turun ke laut tanpa tanggul, rute berparameter panjang busur.
- `test-starters` (HD 4000, Idle): `starter-peta-relief.html` lolos di 4b8f5a8 (build bukti ini); `starter-elang.html` lolos di b899e3f
  (sesudah kait sidik geometri digeneralisasi ke `ELANG_SIDIK || PETA_SIDIK`). Diperiksa: kontrak `OPENER`, loop, `seek(0)` segar,
  piksel sama di dua jalur seek, `PETA_UJI` (label tampil di dalam bingkai pada 2,5/6,5/8,5/11,5/15/17,5 dtk; rute 0 → sebagian → 1),
  sidik geometri dua muat, `CAM3_UJI` (ACES = 4). Halaman ada di `BERAT`: dilewati bila WebGL jatuh ke perangkat lunak (CI tanpa GPU).

## Belum diukur

- Biaya per frame (`bench-frame.mjs`): tidak dijalankan karena render pemilik sedang berjalan. Ukur di mesin senggang:
  `node scripts/bench-frame.mjs assets/starter-peta-relief.html "clean=1" 20`. Target ≤ 350 ms/frame; riset memperkirakan 60–90 ms
  render. Siap halaman di HD 4000 sambil render pemilik: 6–13 dtk (`medan()` + kisi 268 rb verteks).
- Vonis visual pemilik.
