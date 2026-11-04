# Rupa 3D: mata elang dan peta relief (4 Nov 2026)

Perbaikan rupa sesudah tinjauan pemilik. Kamera, ketukan cerita, elevasi, dan posisi GVP tidak berubah. Semua rupa baru di shader dan
bahan; `three` tetap r161, tanpa aset raster.

- `kontak-elang.jpg`: baris atas 04aa31e, baris bawah build ini, detik sama (0; 2,5; 4,3; 4,7; 6,5; 11).
- `kontak-peta.jpg`: sama (0; 2,5; 5,5; 8,5; 11,5; 13,5; 17,5).

Bingkai PNG tidak disimpan. Potret ulang: `URL="file:///<repo>/assets/starter-elang.html?clean=1" node scripts/snap.mjs shots 0 2.5 4.3 4.7 6.5 11`.

## Yang berubah

| Cacat | Perubahan | Hasil jujur |
|---|---|---|
| Pohon bercak gelap | 3 ragam tajuk; `daun()`: tembus cahaya di tepi, balut sisi matahari, gumpal triplanar, tepi `discard`; warna per pohon lebih beragam; bayang panjang di lembah | Tajuk terbaca di bingkai sedang dan jauh. Pohon sangat dekat kamera (6,5 dtk, bawah) masih gumpalan halus |
| Bercak putih di air | Riak di normal, pantulan dibatasi lembut, pantulan rendah digelapkan, air berbintik | Tidak ada lagi bercak putih bertepi kotak. Air sawah dekat (2,5 dtk) masih terang dan agak seperti lukisan |
| Sawah lembah kotak-kotak | Petak per piksel (baris tergeser, diputar 25°), tabel status sama di JS dan shader | Tepi petak tajam, tak mengikuti kisi. Dari dekat masih terbaca selimut tambal, dan petak basah agak seperti lempeng |
| Kerucut seragam | Profil dua lengkung, punggung radial, 1–3 bahu, kaki beda per gunung, jurang mulai di ketinggian berbeda, kepala menurut gunungnya | Gunung sebingkai tampak berbeda; puncak tetap ≤ 20 m dari GVP (`test-peta`). Masih terbaca "kerucut di atas peta" karena tegak 4× |
| Dataran polos | Tata lahan dari ubin noise: sawah, panen, permukiman, hutan makin rapat ke atas. Nada, bukan data | Dataran hidup. Bercak hutan acak di dataran rendah bukan geografi sungguhan; dinyatakan di `peta-relief.md` |

Cacat lain yang lebih parah dan ikut diperbaiki:

- **Gapura 4,3 dtk** adalah bingkai paling mirip game: kotak merah polos dan obor panah putih. Kini bata + spesi per piksel, api tetes bergradien.
- **Langit kosong**: awan tipis di shader Sky, ikut ter-bake ke pantulan.
- **Gunung elang rata**: punggung dan alur 3 skala di `gunung()`, kabut lebih tipis, pohon tak lagi ditabur di lereng jauh.
- **Tanah dekat "meleleh"**: butir dan bump dari ubin; tepi air sawah per piksel.
- **Kontur peta menggurat kerucut seperti kue lapis**: memudar ke 22 % saat relief naik.

## Biaya (HD 4000, `bench-frame` `clean=1` 20 frame, 3 putaran)

| Halaman | Sebelum | Sesudah | Siap halaman |
|---|---|---|---|
| Elang (mulai 2 dtk) | 255, 262, 265 | 284, 286, 294 | ±9 dtk → ±9–12 dtk |
| Peta (mulai 2 dtk) | 288, 280, 280 | 249, 249, 249 | ±6–8 dtk → ±6–7 dtk |

`bench-frame` hanya mengukur mulai detik 2. Tiruan jalurnya di detik lain (satu putaran, 6 frame): elang 6,5 dtk 234 → 315, 8 dtk 226 → 266,
11 dtk 210 → 272; peta 8,5 dtk 255 → 263, 13,5 dtk 249 → 232, 17 dtk 284 → 272. Semua ≤ 350. Peta lebih murah karena noise prosedural per piksel
diganti ubin bertekstur. Deterministik `true` di semua putaran.

## `nilai-visual`

Elang, tanpa subjek: 0 dtk rentang 72,7, kontras 11,3 (dulu peringatan 9,1); 2,5 dtk 77,3 / 14; 6,5 dtk 77,1 / 13,2. Dengan subjek: 4,3 dtk
gapura kontras 60,1, api +66,9 +66,9; 11 dtk gunung kontras 24,7. Peringatan tersisa sama dengan dulu dan sengaja: 4,7 dtk di dalam celah
(rentang 17,5, dulu 15,3).

Peta, perintah sama dengan `2026-11-03-peta-relief/nilai.json`: 5,5 dtk subjek 10,5; 8,5 dtk 22,3 dan +34,9; 11,5 dtk 10,3 dan +36,4; 13,5 dtk sumber +36
(kontras tengah 3,2: peringatan sama dengan dulu, 2,9); 17,5 dtk 19,7. Rentang naik di semua bingkai.

## Yang masih lemah

- Pohon sangat dekat kamera dan tepi petak basah sawah lembah.
- Gunung elang tetap lereng teduh datar di 0 dtk: matahari di belakangnya.
- Rabung kiri 6,5 dan 11 dtk masih berundak halus, batas kisi kasar.
- Vonis gerak belum dinilai: hanya bingkai diam dan bench. Periksa kilau tepi `discard` dan bayang lembah yang melebar saat kamera naik.
