# Rupa budaya: wayang, diorama pura, relief (4 Nov 2026)

Perbaikan rupa dan kejujuran tiga gaya berikat budaya sesudah tinjauan pemilik. Sumber dan penyederhanaan: `references/wayang.md`, `references/diorama.md`, `references/relief-candi.md`.

- `kontak.jpg`: sebelum (04aa31e) dan sesudah pada detik yang sama, 14 pasang bingkai + 7 pasang krop 1:1. Pembungkus Idle memegang kunci bersama, `snap.mjs` apa adanya, `?clean=1`.
- `nilai.txt`: `nilai-visual` tiap bingkai sesudah.

## Yang berubah

| Gaya | Sebelum | Sesudah |
|---|---|---|
| Raksasa | muka bulat, mata kecil, seringai kartun | hidung pelokan (mangga), mata plelengan bercincin + alis sisir + ulir, mulut gusen panjang, jamang, gembel berlekuk di belakang badan |
| Sisi dalang | warna rata, polos | lapis lukis dipanggang: prada berbintik, gradasi bertingkat, kelat bahu, gelang, gelang kaki, celana raksasa, uncal berlekuk menggantikan "ikan" biru. Mata gabahan dicat, gapit berhenti di dada |
| Simpingan | jenis acak, rapat | urut menurut sumber (gagahan → alusan → putri; raksasa → gagahan → alusan), renggang, siluet lebih ringan: putri kini terbaca |
| Padmasana | kotak bertumpuk + blok emas, bentuk dari Wikipedia | tepas–batur–sari dari Mahaputra + Seniwati dkk.; panel ulon kosong, tanpa Bedawang Nala, tanpa sosok |
| Meru, gerbang, tembok | kotak polos, nat tebal | pola bahan di shader (bata, paras, ijuk, alang), lis lebih tipis; geometri nat dihapus |
| Legenda diorama | "makin dekat ke gunung, makin suci" | "Tiga zona menurut tingkat kesucian, berpedoman pada arah gunung ke laut" + "Denah generik, bukan pura tertentu" |
| Relief | "BOROBUDUR · ABAD IX" | "GAYA BOROBUDUR · ILUSTRASI"; `docs/gallery/16-living-relief.jpg` dibuat ulang (t 9,6, `snap.mjs`, lebar 1600, `-q:v 3`) |

Temuan tambahan yang ikut diperbaiki: pinggiran terang pada kartu pohon diorama (`cahaya.kuat` 0,85 → 0,3, tanpa menyentuh `pustaka.js`), rumput dan lantai halaman yang terlalu jenuh dan berbintik, sumping alusan yang terbaca sebagai mata besar, gapit yang mencoret muka.

## Angka

`bench-frame.mjs`, 3 putaran, 20 frame, mesin acuan. Starter wayang dan relief identik byte dengan saat diukur. Bench mulai detik 2: dialog dan blur besar tidak terukur di sini.

| Halaman | Sebelum (ms) | Sesudah, median (rentang) |
|---|---|---|
| Wayang sisi bayang | 234 | 209 (208–232) |
| Wayang sisi dalang | 293 (satu putaran 356) | 298 (285–314) |
| Diorama | 240 | 233 (231–235) |
| Relief | 233 | 210 (208–232) |

Anggaran konteks tanpa menaikkan batas: Wayang 246/246, Diorama 215/215, Relief 296/297. `nilai-visual`: 14 bingkai, 14 ok, 0 peringatan.

## Masih lemah

- **Raksasa sisi dalang** tetap terbaca agak seperti topeng merah: bidang muka lebar, garis wajah sedikit. Siluetnya mendekati raksasa wayang, tetapi hidungnya masih bisa terbaca moncong. Perlu vonis pedalang.
- **Tangan raksasa** terangkat seperti trisula; tidak diubah.
- **Badan sisi dalang** tetap polos, tanpa cawi atau tlancap. Close-up masih di bawah wayang asli.
- **Padmasana** tanpa Bedawang Nala belum lengkap secara tipologi, dan palihnya perkiraan dari gambar sumber. Perlu tinjauan orang yang paham arsitektur pura.
- **Pohon diorama** masih kartu datar dari `pustaka.*`; ukuran bata dan pola serat rekaan.

## Sumber: terbaca dan tidak

Terbaca penuh: Widyokusumo 2010 (termasuk bagan mata, hidung, foto), Purbasari 2012, Mahaputra (±2023), Seniwati dkk. 2022, Bhattacarya & Riyanto 2022. Sebagian: Rosalinda 2025 (versi potongan, Bab II–III tidak termuat). Tidak terbaca langsung: Idedhyana 2016 (lewat Mahaputra), Sagio & Samsugi 1991, Gelebet dkk. 1982, Soekatno 1992 (lewat kutipan). Tetap ditandai sebelumnya: jurnal UB dan halaman UNESCO (HTTP 403). Status: **menunggu vonis pemilik**.
