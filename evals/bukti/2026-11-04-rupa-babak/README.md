# Rupa babak, tokoh, pustaka (4 Nov 2026)

Tinjauan pemilik atas babak 60 dtk, rig tokoh v2, dan pustaka: "masih perlu kerja". Patokan: film animasi, bukan slide. Semua kode.

Isi folder:
- `kontak.jpg`: 12 pasang bingkai 1920×1080 pada detik yang sama, kiri = 04aa31e, kanan = sesudah. Potret `?clean=1` lewat pembungkus Idle.
- `nilai.json`: laporan `nilai-visual` tiap bingkai akhir; kolom `perintah` berisi koordinat obor dan kotak subjek.

Bingkai PNG tidak disimpan. Potret ulang: `URL="file:///<repo>/assets/starter-babak.html?clean=1" node scripts/snap.mjs shots 33.6 38 43`.

## Cacat → perubahan → hasil

| Cacat | Perubahan | Hasil |
|---|---|---|
| Babak t 33,6: bercak merah muda di bawah bingkai dan di bukaan gapura | Akar: sawah bidang −1000 berhenti di y ±810, jadi langit (`horizon`) tampak di bawahnya saat kamera mendarat. Dasar lembah gelap di bidang itu (dipanggang resolusi .1) | Bercak hilang. Sebab yang sama juga ada di katalog pustaka B dan katalog tokoh D: ikut diperbaiki |
| Babak t 33,6: puncak nyala terpotong | Obor penjaga 285 → 240, zoom mendarat 4,2 → 3,95, tokoh resolusi 2,5 → 3 | Nyala utuh di bingkai |
| Penjaga t 38–43: kontras 12,9–13,1, kurus dan polos | Kuda-kuda jaga, ikat merah, kain merah berpinggir, sabuk + timang, kelat, gelang, kalung, subang, selempang, perisai daun setinggi dada; `hangat:.9` di MCU | t 38 14,6, t 43 17,3. Naik, tetapi t 38 masih margin paling tipis di babak |
| Tokoh: wajah, tangan, proporsi | Lihat "Agar tidak terbaca manekin" di `references/tokoh.md` | Wajah terbaca di tiga pandang, tangan berjari, siluet kerumunan tak lagi bahu kotak |
| Sawah senja seperti pasir | Pita searah kontur: badan air = langit, garis tepi jauh = warna cakrawala; petak hijau, bibit padi, pematang + pantulan, kilau di bawah matahari; opsi `air` | Terbaca petak hijau + air. Deret air/hijau per seed sama dengan versi lama (hiasan memakai acak sendiri), `starter-lukis` tetap punya petak hijaunya |
| Candi senja larut ke kabut, 3,6 (t 3) dan 3,6 (t 7) dengan kotak yang sama | Warna jarak −100, lis atas terang, berdiri di bukit, kabut terang di belakang, pelita di bilik | 11,5 dan 12,1 |

## Cacat lain yang ditemukan di bingkai

- **Bug: kain bermotif tak pernah tampil.** `gaya()` dan `url()` memeriksa `typeof f==='string'` sebelum `f==='pola'`, jadi `'pola'` dipakai sebagai warna tak sah dan kain mewarisi `fillStyle` bagian sebelumnya (kain hitam, panggul putri emas polos). Sesudah diperbaiki kawung raja dan ceplok putri tampil. Uji di `test-tokoh`.
- **Kelat bahu = sosis.** Empat titik persegi lewat Catmull-Rom menggembung melewati lengan. Kini pita mengikuti penampang.
- **Garis tulang selangka menjulur keluar dada** di tampak samping (titik di luar siluet). Diperbaiki.
- **Tajuk beringin = gerigi seragam, mahkota lontar = bola berduri.** Tajuk kini berlobus; lontar = kipas bertangkai rapat, sedikit sela langit.
- **Tombak memotong wajah saat berjalan.** Lengan pembawa benda tak lagi mengayun.
- **Kain panjang terbaca celana.** Bidang tengah menutup sela kaki.

Efek samping generator bersama, diperiksa dengan potret sebelum/sesudah: `starter-lukis` (sawah, lontar, beringin) dan `starter-diorama` (kartu beringin + lontar, t 3 dan 10) ikut berubah, tanpa kerusakan. `starter-relief` tidak memanggil ketiganya.

## Angka

`nilai-visual`: semua bingkai keluar 0 (`nilai.json`). Kotak penjaga dilebarkan untuk perisai, jadi lebih ketat dari kotak lama.

Bench `bench-frame.mjs <halaman> clean=1 20`, 3 run, HD 4000, batas 350 ms, determinisme true di semua run:

| Halaman | Sebelum | Sesudah |
|---|---|---|
| `starter-babak` | ±222–251 | 232, 251, 257 |
| `katalog-tokoh` | ±288 | 316, 317, 318 |
| `katalog-pustaka` | ±237 | 204, 221, 223 |

Satu seri sebelumnya saat mesin dipakai agen lain: babak 280–293, tokoh 317–337. Pustaka menyimpan markup sawah lebih besar (26/71/98 KB, sebelumnya 20/30/42): sekali saat setup.

## Yang masih lemah

- MCU t 38: dada lebar dan rata; bayang sabit bertepi keras, selempang hampir tertutup lengan, sebagian kostum di luar bingkai.
- Mahkota lontar masih terbaca bundar dari jauh, bukan kipas satu-satu.
- Tokoh di t 33,6 terasa lembut: pendar rim melebar di zoom ±3.
- Lengan tampak depan kaku menggantung. Keris di tampak samping seperti batang pendek.
- Kerumunan detail 0 tetap siluet tanpa wajah (sengaja: hemat).
- `katalog-tokoh` tinggal ±30 ms dari batas: 6 tokoh detail 2 adalah batas praktis.
