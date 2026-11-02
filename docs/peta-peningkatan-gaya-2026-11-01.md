# Peta peningkatan gaya WeVai — dari "presentasi bergerak" ke "film animasi"

Tanggal: 2026-11-01 · Dokumen ini adalah ringkasan keputusan. Bukti dan rinciannya ada di dua dokumen sumber:
- [`audit-gaya-bawaan-2026-11-01.md`](audit-gaya-bawaan-2026-11-01.md) — penilaian 8 starter, menu kulit, dan produksi
  nyata (dirujuk sebagai [A-…]).
- [`riset-sinematik-kode-2026-11-01.md`](riset-sinematik-kode-2026-11-01.md) — teknik dari sumber primer dan
  pengukuran di laptop produksi (dirujuk sebagai [R-…]).

Tujuannya adalah memetakan seluruh pekerjaan sebelum ada yang dibangun: apa yang diperbaiki, apa yang ditingkatkan,
fitur apa yang ditambah, dan gaya baru apa yang perlu. Hal yang merupakan pendapat ditandai **[opini]**.

---

## 0. Titik berangkat

**Yang diminta pemilik** (sesi brainstorming 2026-10-31 s.d. 11-01):
- Semua gaya bawaan terasa seperti film animasi, bukan presentasi. Patokannya video "1.000 Tahun Kerajaan Jawa dalam
  30 Menit": siluet ber-rim light, cahaya bersumber jelas, kabut berlapis, bara, dan palet serempak.
- **100 % kode**: tanpa gambar AI dan tanpa foto. Gaya flat tetap ada sebagai pilihan.
- Kamera berbahasa film. Shot "mata elang" (terbang FPV, menukik, berguling, menembus celah) dipakai sebagai
  **momen khusus**, misalnya pembuka atau perpindahan tempat.
- Produksi nyata: video 25–60 menit, dirender di laptop i3-3217U + HD 4000.

**Yang dibuktikan spike "gapura malam"** (100 % SVG, scratchpad sesi):
- Lingkungan bisa mendekati patokan: bata dan relief timbul (`feDiffuseLighting` + heightmap luminans), obor, kabut,
  bara, dan parallax 9 lapis.
- Tokoh tetap terlemah (seperti manekin).
- Cahaya harus dipanggang per shot, dan gerak dilakukan lewat transform lapisan.

---

## 1. Diagnosis dalam lima kalimat

1. **Tidak ada cahaya dalam arti film di gaya 2D mana pun.** Yang ada hanya satu gradien layar penuh
   (`src/runtime/kamera-dom.js:30-44`). Inilah akar keluhan "flat" [A-C1].
2. **Aturan sendiri memaksa flat** (Hukum 7 `references/kartun-panggung.md:157-166`) dan bertentangan dengan SKILL.md.
   Selain itu, aturan anti-roll dan anti-terbang melarang inti shot mata elang [A-C10, A-C5].
3. **Empat gaya kolase hidup dari raster.** Di bawah batas 100 % kode, rupa mereka hilang, padahal rekomendasi bawaan
   untuk sejarah menunjuk ke sana [A-S3–S6].
4. **Tokoh hanya punya satu rig minimal.** Kesan manekin datang dari *bentuk* kapsul seragam, bukan dari rig [A-C4,
   R-4].
5. **Biaya ekspor didominasi capture (±170–200 ms/frame), bukan render.** Efek berat ternyata murah. Penghematan
   terbesar ada di jalur ekspor [R-5].

---

## 2. Vonis per gaya bawaan

Skor diambil dari [A-§4]. Untuk tujuan ini, yang menentukan adalah kolom **Rupa + Tokoh + 100 % kode**, dan tidak ada
gaya yang lewat 8/15.

| Gaya | Kelebihan utama | Kekurangan utama (untuk tujuan ini) | Vonis | Arah |
|---|---|---|---|---|
| S1 Opener (sinematik gelap, WebGL) | pasca-proses WebGL & bloom sudah ada; 100 % kode | isi abstrak, tidak ada tokoh/dunia; bloom mahal (470 ms/frame) | **tingkatkan** | jadi wadah "atmosfer" WebGL bersama; isi ilustratif |
| S2 Aksi kontinu (vektor) | 100 % SVG; strip lapisan = kedalaman alami; kamera kuat | rupa flat, tokoh minimal | **tingkatkan (dekat)** | cahaya-2d + atmosfer per strip; cocok untuk perjalanan/perang |
| S3 Kartun kolase | kamera kolase & alur bagus | rupa = gambar generate | **biarkan (mode raster)** | dipakai bila proyek boleh memakai gambar generate (§9) |
| S4 Jurnalisme visual | perkakas dokumen/data/bukti | rupa = foto | **biarkan (mode raster)** | dipakai bila proyek boleh memakai foto (§9) |
| S5 Katalog putih | rapi untuk produk | rupa = foto produk; paling tak relevan | **biarkan (mode raster)** | tidak diinvestasikan untuk arah sinematik (§9) |
| S6 Sketsa vintage | nuansa arsip | rupa = raster/engraving | **biarkan (mode raster)** | tidak dirombak (§9) |
| S7 Kartun panggung | 100 % SVG, tokoh bersendi, adegan hidup; paling dekat dengan spike | Hukum 7 flat, kamera hanya geser/zoom, tanpa cahaya | **tingkatkan (prioritas)** | dibebaskan menjadi dua kulit: "flat cerah" + "ilustrasi sinematik" |
| S8 Explainer 3D | cahaya sungguhan, bayangan, `rail()`, kamera terlengkap | `NoToneMapping` membuat api/matahari menggunting; tak ada tokoh; rupa kosong | **tingkatkan** | tone mapping film, lanskap prosedural, preset mata elang, mode diorama |

Menu kulit §7f dan render objek §7e tetap berlaku sebagai menu. Kontradiksi "kapan flat sah" diselesaikan di P0 [A-C10].

---

## 3. Perbaiki (P0 — aturan, murah, membuka jalan)

1. **Pecah Hukum 7** menjadi dua kulit, "flat cerah" dan "ilustrasi sinematik", dengan alasan dan contoh gagal
   (Mataram: rencana "malam + bara" jadi blok rata).
2. **Selaraskan kontradiksi** [A-C10]:
   - Flat sah hanya bila dipilih sadar di style brief.
   - "Sejarah → gaya 4 atau 1" menjadi bersyarat pada izin raster.
   - Batas "≤ 90 dtk/bab" punya jalur video panjang.
3. **Pengecualian tertulis untuk shot mata elang** (`anti-ppt.md:42`, `techniques.md:300-303`, `kartun-panggung.md:10`,
   `:63-65`): satu per bab, termotivasi, ≥ 3 dtk, ditutup dengan mendarat di subjek.
4. **Grain hidup** di semua starter. Resepnya sudah ada (`techniques.md:537-538`) tetapi belum dipakai.
5. **Aturan performa tertulis**: "statis dipanggang, yang bergerak ringan" [R-1a]. Filter cahaya tidak dianimasikan
   parameternya, dan gerak lewat transform lapisan `will-change`. Terukur: filter statis ≈ gratis, filter dinamis
   +40 % (GPU).

## 4. Tingkatkan (P1 — modul bersama yang menaikkan semua gaya)

| Modul | Isi | Dipakai oleh | Bukti biaya |
|---|---|---|---|
| **`atmosfer` (WebGL, satu kanvas)** | langit, matahari/bulan, kabut fBm berlapis per kedalaman, god rays (GPU Gems 3), bara/debu/asap ber-seed, grain, vignette, LUT; semua parameter dari `tl.time()` | semua gaya 2D (di belakang/depan bidang), relief, wayang (kelir), overlay 3D | adegan uji B: 63 ms render [R-Ringkasan] |
| **`cahaya-2d`** | sumber titik/arah per adegan, falloff bermasker (fePointLight tak punya atenuasi [R-9]), rim otomatis pada objek bertanda, bayangan jatuh, relief `feDiffuseLighting` dipanggang | S2, S7, siluet sinematik, relief | spike; filter statis ≈ gratis |
| **`pasca` 2D** | objek `GRADE` yang di-tween (bayangan/sorot/saturasi/bloom/grain/vignette), bloom 2D yang dipanggang, halation | semua gaya 2D | belum diukur terpisah |
| **`CAM` di kartun panggung** | sudut, lensa, `data-z`, handheld, fokus; izinkan WS/EWS | S7 | runtime sudah ada |
| **3D: tone mapping film + kabut berlapis + bloom** | opsi ACES/AgX untuk konten non-merek | S8, mata elang | C2: 89 ms render |
| **Anggaran performa di test** | ms/frame per starter diukur di `test-starters`; target ≤ 350 ms/frame @1080p di mesin produksi | semua | skrip audit sudah ada |

Catatan teknis: efek atmosfer tidak boleh ditempel di atas `#world`, karena `filter`/blend meratakan paralaks
(`references/sinematografi.md:304-307`). Atmosfer harus dirancang per bidang [A-C2].

## 5. Tambah (P2 — kemampuan baru)

1. **Preset "mata elang"**:
   - Mekanisme: jalur Catmull-Rom, look-ahead, roll dari kelengkungan (tan φ = vω/g, di-clamp), shake berbasis trauma.
     Normal Frenet tidak dipakai karena horizon bisa terbalik [R-3].
   - Di 3D: generator lanskap sawah/sungai/gunung/hutan (terrain fBm + InstancedMesh + Sky + kabut).
   - Di 2.5D: `terbang()` lewat bidang `[data-z]`.
   - Motion blur hanya akumulasi sub-frame (deterministik), dan hanya di segmen cepat (+4,6× biaya).
2. **Rig tokoh v2**:
   - Bagian tubuh dirancang (bezier, bukan kapsul), dengan rig tulang + slot + IK dua tulang (konsep Spine/DragonBones)
     dan pustaka pose bernama.
   - Tiga arah pandang. Dibingkai sebagai siluet ber-rim.
   - Kostum dan atribut Jawa kuno sebagai komponen, plus generator kerumunan ber-seed [A-C4, R-4].
3. **Pustaka aset prosedural Jawa kuno** (`src/pustaka/`): `candi`, `gapura`, `rumahPanggung`, `beringin`, `lontar`,
   `gunungBerlapis`, `sawahTerasering`, `obor`/`api`/`asap`, `relief`, `kain({motif})`. Semua ber-seed, berparameter,
   dan menerima arah cahaya dan jarak [A-C3]. Ini menggantikan ±25 KB mesin + 40 KB ilustrasi yang sekarang disalin per
   produksi.
4. **Efek lensa**: flare anamorfik, aberasi kromatik tepi, lens dirt, blur gerak kamera, letterbox.
5. **Mode diorama 3D**: kartu ilustrasi 2D di ruang 3D yang diterangi `practical()`.
6. **Jalur video panjang**: antrian render dengan resume per babak, log fps, perkiraan selesai, dan penahan sleep
   Windows [A-C8].
7. **Penilaian visual otomatis**: histogram luminans (flat = rentang sempit), kontras subjek/latar, titik terang dekat
   sumber cahaya yang dideklarasikan, dan jumlah warna dominan. Ditambah eval brief "babak sejarah 60 dtk, malam + obor,
   satu tokoh, satu shot mata elang" [A-C9].
8. **Galeri**: satu still "ilustrasi sinematik 100 % kode" sebagai bukti dan kalibrasi agen [A-C11].

## 6. Gaya baru

Dinilai di [R-§7]. Urutan menurut dampak per biaya **[opini]**:

| # | Gaya | Inti | Cocok sejarah Jawa | Cocok non-sejarah | Biaya render (1080p, laptop produksi) | Bergantung pada |
|---|---|---|---|---|---|---|
| 1 | **Siluet sinematik** (paling dekat patokan) | siluet SVG per lapisan + modul atmosfer WebGL + glow obor | sangat | opener dramatis | ±260–360 ms/frame | atmosfer, cahaya-2d, rig v2 |
| 2 | **Mata elang 3D** (momen khusus) | lanskap prosedural + preset terbang | sangat (pembuka bab, pindah wilayah) | fly-through kota/pabrik | 259–285 ms; 491 dengan MB×8 | 3D tone mapping, preset |
| 3 | **Wayang kulit / teater bayangan** | figur pipih bertatah, bersendi, kelir + blencong berkedip, blur menurut jarak ke kelir | sangat, dan khas (UNESCO 2008) | terbatas | ±250–300 ms | rig tulang/slot, pustaka bentuk; **harus hormat pakem** |
| 4 | **Peta relief 3D topografi** | relief Jawa prosedural, sungai, rute menyala | cocok (lanjutan kulit topografi Jagad Budaya) | peta logistik/pasar | ±60–90 ms render | — |
| 5 | **Relief candi hidup** | panel batu berpahat, cahaya menyapu, tokoh relief bergerak pelan | sangat, sebagai bingkai narasi | lemah | ±255 ms (statis) | cahaya-2d, pustaka relief |
| 6 | **Painterly** (Kuwahara / cat air) | pass NPR di atas render dasar | kilas balik/legenda | brand artisan | belum diukur | risiko sapuan "mendidih" |
| 7 | **Diorama cel-shaded** | toon + outline + tilt-shift | struktur kota/keraton | sangat | ±28–60 ms render | mode diorama |

Catatan: gaya 1, 3, dan 5 berbagi fondasi yang sama (atmosfer + cahaya-2d + rig/pustaka). Sekali fondasi itu
dibangun, ketiganya relatif murah.

## 7. Ekspor & performa

| Langkah | Efek terukur | Biaya kerja |
|---|---|---|
| `WORKERS=2` sebagai standar produksi | ±2× throughput di laptop 2 core: 60 mnt dari ±8,6 jam ke ±4 jam | sudah ada |
| Filter dipanggang + lapisan `will-change` | filter dinamis 358 → statis ±255 ms (= biaya capture) | aturan P0 |
| Mode WebCodecs `prefer-software` di halaman | 81 ms/frame (60 mnt ±2,4 jam), hanya untuk adegan 100 % kanvas | sedang; lapisan teks/SVG harus ikut digambar ke kanvas |
| Jangan: `prefer-hardware` (macet setelah 8 chunk), `beginFrame` (hanya ±10 %) | — | — |

Untuk 3D, satu pasangan versi saja: **three r187 + `three/addons`/TSL** (atau r186 + pmndrs; jangan dicampur).
Efek temporal (`time`/`film` TSL, `traa`, `afterImage`, `motionBlur` velocity) dilarang untuk ekspor [R-2b, R-8].

## 8. Pemecahan menjadi sub-proyek (urutan yang disarankan) **[opini]**

Tiap sub-proyek dirancang, direncanakan, dan dibangun sendiri, dengan hasil yang bisa ditonton di akhirnya.

| # | Sub-proyek | Isi | Hasil yang bisa dilihat |
|---|---|---|---|
| 1 | **Fondasi aturan** | P0 1–5 | agen berhenti default ke flat; grain hidup — **selesai 1 Nov (v1.2.0)** |
| 2 | **Atmosfer + cahaya-2d + pasca** | P1 tiga modul pertama | ulang adegan spike gapura memakai modul (bukan kode sekali pakai), ≤ 350 ms/frame — **kode selesai 2 Nov (v1.3.0); penilaian visual pemilik terhadap `f_7` (spec §6.4) menunggu**: `starter-explainer.html?demo=sinematik`, bukti di `evals/bukti/2026-11-02-atmosfer/` |
| 3 | **Gaya "Siluet sinematik" + `CAM` panggung** | gaya baru #1, kartun panggung dibebaskan | satu babak 60 dtk bergaya patokan |
| 4 | **Rig tokoh v2 + pustaka aset Jawa kuno** | P2-2, P2-3 | tokoh yang bukan manekin; candi/gapura/beringin siap pakai |
| 5 | **Mata elang 3D** | tone mapping film, lanskap prosedural, preset terbang | shot pembuka 8–12 dtk di atas sawah → menembus gapura → reveal gunung |
| 6 | **Ekspor panjang** | `WORKERS=2` standar, antrian render, mode WebCodecs | video 45 menit dirender semalam |
| 7 | **Gaya lanjutan** | wayang, relief candi, peta relief 3D, painterly, diorama | per gaya |
| 8 | **Penilaian visual + galeri** | P2-7, P2-8 (S3–S6 dibiarkan sebagai mode raster, §9) | — |

Sub-proyek 2 adalah kunci karena hampir semua yang lain memakainya.

## 9. Keputusan pemilik (2026-11-01)

1. **Urutan sub-proyek §8 disetujui** apa adanya.
2. **Empat gaya kolase (S3–S6) dibiarkan** sebagai "mode raster" untuk proyek yang boleh memakai foto/gambar generate.
   Gaya-gaya itu tidak dirombak dan tidak menjadi sasaran arah sinematik. Sub-proyek 8 tinggal mengurus penilaian
   visual dan galeri, plus memperbarui rekomendasi "sejarah → 4 atau 1" agar bersyarat pada izin raster (P0-2).
3. **Wayang kulit dijadikan gaya penuh** di sub-proyek 7, dengan syarat hormat pada pakem (bentuk tokoh, warna,
   gunungan).
