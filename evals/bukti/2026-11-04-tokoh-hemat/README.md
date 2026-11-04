# Biaya rig tokoh: blur diklip ke kotak tokoh

`bench-frame.mjs assets/katalog-tokoh.html "clean=1" 20`: 371 ms → **290 ms** (batas 350), tanpa beda rupa yang terlihat. Perubahan: blur
rim dan pendar di `gerak()` diapit `save / rect / clip / restore` dengan kotak tokoh yang sudah dihitung.

## Bench (HD 4000, 1 worker, mesin senggang, sebelum dan sesudah bergiliran; 4 Nov pagi)
| Ronde | katalog sebelum | katalog sesudah | babak sebelum | babak sesudah |
|---|---|---|---|---|
| 1 | 375 | 288 | 230 | 225 |
| 2 | 366 | 290 | 236 | 222 |
| 3 | 377 | 289 | 234 | 223 |
| 4 | 365 | 292 | 227 | 218 |

`deterministik:true` di semua run. Angka 437 ms dari catatan lama tidak terulang saat senggang: sebelum perubahan terukur 365–377. Saat
mesin sibuk angkanya naik (361–473 lintas run lama); bench sesudah perubahan belum diulang di bawah beban render.

## Yang memakan waktu
Jejak Chrome tableau 6 tokoh (413 ms/frame dinding, 12 frame): JS `gambar()` kecil (seluruh FunctionCall halaman ±15 ms); di proses GPU
113 ms/frame ada di `DoEndRasterCHROMIUM::Flush` (37 flush per frame) dan 22 ms di deserialisasi. Jejak tidak memecah isi flush, jadi
pemecahannya lewat varian halaman, masing-masing 2–3 ronde bergiliran:

| Varian | ms/frame | Arti |
|---|---|---|
| asli | 365–377 | |
| tanpa tokoh | 206–210 | 6 tokoh = ±163 ms, ±27 ms per tokoh; sesudah klip ±14 ms |
| tanpa blur sama sekali | 269–282 | batas bawah bila blur dihapus (rupa rusak) |
| tanpa blur rim/pendar | 280–284 | |
| tanpa bayangan jatuh (isi + blur) | 342–351 | bayangan hanya ±25 ms |
| **klip rim/pendar (dipakai)** | 285–294 | hampir semua hemat "tanpa blur", rupa utuh |
| klip rim/pendar + klip bayangan | 288–291 | klip bayangan tidak menambah hemat: tidak dipasang |
| siluet dari alfa lapisan warna (tanpa isi kedua) | 382–384 | lebih lambat |
| Bd/Fc seukuran tokoh + siluet dari alfa | 361–363 | hemat ±10 ms: tidak dipasang |

## Rupa (`kontak.jpg`: sebelum, sesudah, beda × 8)
Potret snap.mjs dengan urutan seek sama. Halaman sebelum dipotret dua kali: lantai derau 0 di semua frame, jadi beda di bawah murni dari
perubahan ini, di sepanjang pita rim.

| Halaman, t | % piksel beda > 16 | maks | piksel beda > 2 |
|---|---|---|---|
| katalog-tokoh 5 | 0,0000 | 5 | 746 |
| katalog-tokoh 12 | 0,0000 | 7 | 4298 |
| katalog-tokoh 19 | 0,0000 | 6 | 505 |
| katalog-tokoh 25 | 0,0000 | 4 | 219 |
| starter-babak 7 | 0,0000 | 4 | 657 |
| starter-babak 38 | 0,0000 | 5 | 730 |

## Determinisme
Kotak klip = `kotakR(pose, t)`, fungsi murni; tidak ada cache. `test-tokoh`: kanvas palsu kini mencatat `save beginPath rect clip restore`
(log gambar berubah dengan sengaja) dan ada asersi jumlah klip.
