# Kartun panggung memakai CAM (E, sisa)

`starter-explainer-panggung.html` kini memuat blok `kamera` + `kamera-dom` (CAM 2.5D bersama); `#world` = rig.

## kontak.jpg
Baris atas = `main` 9ba027a, baris bawah = branch `feat/panggung-cam`. Detik 0, 1,5, 3, 5,95 (geser), 6,2, 6,4, 7,5, 9, 11,5;
halaman bawaan `?clean=1`, snap.mjs. Selisih piksel per frame: 0,00-0,04 % piksel berbeda > 24 level (maks selisih 58, hanya di tepi
geser/blur 5,95-7,5 dtk, akibat raster ulang transform pada elemen vs. grup SVG); frame lain maks 1.

## Bench (bench-frame.mjs, clean=1, 20 frame, HD 4000)
sebelum 208 ms, sesudah 211 ms (batas 350). `deterministik:false` di kedua sisi (sudah begitu sebelum perubahan).

## Catatan
- `#world` kehilangan `will-change:filter`: itu meratakan `preserve-3d` sehingga `[data-z]` tak berparalaks.
- `svg#scene` `overflow:visible`: kamera kini mentransform svg, bukan grup di dalamnya.
- `slide()` memakai `CAM.fx/fy` + `CAM.blur` dengan angka dan easing yang sama seperti sebelumnya.
- `?demo=1` ditambahkan (katalog kamera) karena `CAM_UJI` memerlukannya.
