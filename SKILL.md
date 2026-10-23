---
name: wevai
description: Membangun motion graphic sinematik di browser (promo video, opener, intro, bumper, kinetic typography, explainer/video penjelasan bergambar 16:9 atau 9:16) memakai HTML + CSS + GSAP (+ Three.js bila perlu), dengan hasil yang bergerak seperti video sungguhan — bukan slide presentasi. Gunakan skill ini setiap kali user meminta "video promo", "opener", "intro animasi", "motion graphic", "bumper", "kinetic typography", "animasi teks sinematik", "explainer", "video penjelasan" (jurnalisme visual, kartun edukasi, kolase), atau menunjukkan referensi video promosi/explainer dan ingin dibuatkan versi web-nya — bahkan bila mereka tidak menyebut kata "motion graphic" secara eksplisit. Juga gunakan bila user mengeluh hasil animasi web "seperti PPT/presentasi" dan ingin lebih sinematik, atau ingin merender animasi web menjadi file video MP4, atau ingin explainer kartun/animasi dibangun LANGSUNG di After Effects lewat bridge/MCP Higgsfield.
license: MIT
metadata:
  author: aammuhammad18
  author_url: https://github.com/aammuhammad18-cmyk/wevai
  version: "1.1.0"
  updated: "2026-10-23"
  homepage: https://github.com/aammuhammad18-cmyk/wevai
---

# WeVai — motion graphic web yang bukan PPT

**v1.1.0 · by [aammuhammad18](https://github.com/aammuhammad18-cmyk/wevai) · MIT.** Riwayat perubahan di `CHANGELOG.md`;
cara pasang di `README.md`.

Skill ini untuk AI coding agent apa pun (format Agent Skills terbuka).
Isinya hukum dan resep untuk motion graphic yang bergerak seperti video, bukan
presentasi — patuhi sebelum menulis kode.

## Peta baca — baca hanya jalur yang dipakai

Isi skill ini lebih besar daripada yang perlu dibaca untuk satu video. Baca INTI,
lalu HANYA jalur pekerjaannya. Membaca semuanya membuang konteks dan justru
menurunkan kepatuhan pada aturan yang penting.

| | Dibaca | Isinya |
|---|---|---|
| **Inti** (selalu) | `SKILL.md` + `references/anti-ppt.md` | hukum, larangan struktural, alur kerja, checklist umum |
| Opener · promo · bumper · intro · kinetic typography | + `references/opener-konsep.md`, `references/techniques.md`, `assets/starter-opener.html` | menu konsep & sidik jari struktur, resep efek, starter |
| Explainer (5 gaya kolase/aliran) | + `references/explainer.md`, `references/techniques.md`, starter gaya itu | langkah nol, gaya, kamera kolase, VO, checklist explainer |
| Explainer / opener 3D & kamera sinematik | + `references/sinematografi.md`, `assets/starter-explainer-3d.html` (opener: `assets/starter-opener.html`) | kosakata shot/sudut/gerak/lensa/cahaya, resep 2.5D & 3D, jebakan |
| Explainer kartun panggung | + `references/kartun-panggung.md`, `assets/starter-explainer-panggung.html` | satu panggung per adegan, rig sendi, palet flat |
| Build di After Effects | + `references/ae-bridge-higgsfield.md` | batas bridge, arsitektur CAM, rig native, penyerahan |
| Scaffold multi-file / alasan struktur | + `references/architecture.md` | panggung, rig kamera, determinisme, export |
| Memasang alat (snap, lint, export, tanpa ffmpeg) | + `references/alat-kerja.md` | perintah dan jalan pintasnya |
| Mengembangkan skill ini | + `references/roadmap.md` | arah, antipola, yang sudah terbukti |

`references/techniques.md` adalah buku resep: buka bagian yang dipakai (§ di daftar
isinya), bukan seluruhnya.

## Prasyarat — hanya browser

Deliverable (`index.html`) hanya butuh browser modern + internet untuk CDN
(GSAP, font). Python, Node, dan ffmpeg **opsional** dan hanya untuk alat kerja —
jangan pernah membuat deliverable yang butuh `npm install` untuk DITONTON.
Cara pasang, jalan pintas tanpa ffmpeg, dan daftar alat: `references/alat-kerja.md`.

## Player — tidak ada, autoplay, loop

Default deliverable: **tanpa panel/player apa pun di layar**, langsung
memutar saat dibuka, dan mengulang dari awal saat selesai (dicek dari jam:
`tl.time() >= DURATION` → `play(0)`, lihat Hukum #2; bila ada suara, audio ikut diulang). Kontrol tersembunyi: R ulang,
Space jeda. Panel scrub/jam hanya muncul dengan `?debug=1` (alat review),
dan `?clean=1` menahan autoplay untuk export. Ada suara? Coba `play()`
langsung; bila diblokir browser, tahan di frame 0 dan mulai pada klik
pertama — tanpa teks "ketuk untuk mulai". Ini sudah tertanam di semua
starter.

## Larangan struktural — uji PPT yang bisa diperiksa mekanis

Model lain (dan kamu, bila lelah) akan jatuh ke pola ini walau sudah membaca
hukum di bawah. Sebelum menyerahkan, cek KODE, bukan perasaan:

1. `grep -c "class=\"scene\"\|<section" index.html` — bila ≥ 3 adegan
   berupa `<section>` yang dinyalakan-dimatikan dengan `autoAlpha`/opacity
   → itu slide deck. Adegan harus berganti karena DUNIA/KAMERA bergerak
   (kamera bergerak, whip ke sudut lain, push-through, latar berganti),
   bukan karena section di-fade. Pengecualian yang sah: **kartun panggung**
   (`references/kartun-panggung.md`) memakai cut/geser 96 px antar panggung
   — boleh, karena tiap panggung hidup penuh (≥10 benda beraksi), bukan
   gambar diam yang di-fade.
2. Ada benang merah visual yang bertahan: satu subjek (aksi kontinu) ATAU
   satu dunia kolase/kertas/putih yang disusuri kamera (kartun, foto,
   katalog, sketsa). Foto full-bleed berganti-ganti tanpa dunia bersama →
   PPT. Satu gambar + satu kalimat per adegan, berganti tiap adegan →
   tetap slideshow walau kameranya bergerak: tiap adegan 3–5 elemen yang
   masuk bertahap per frasa (explainer.md "Satu adegan = 3–5 elemen").
3. Per adegan hitung node teks: eyebrow/kicker + judul + body/kredit = 3
   tingkat → PPT. Maksimum dua: satu angka/kalimat besar + satu label dunia.
   Dokumen/stempel/blok tanggal berisi ≤ 3 baris pendek dihitung objek,
   bukan tingkat teks.
4. Ken Burns (scale 1.0→1.05 pada foto) sebagai satu-satunya gerak → PPT.
   Gerak tiap detik harus datang dari BAHASA GERAK LATAR yang dipilih di
   style brief dari menu `techniques.md` §7c (kamera bernapas di latar
   bertekstur, gradien berpindah, blob mengambang, grain hidup, sapuan
   cahaya per segmen, bentuk besar berputar lambat, partikel naik, grid
   bernapas, teks hantu bergeser, Ken Burns + parallax…). Batang/garis/
   potongan yang melintas ke samping ("lane", "range", "streak", hujan
   partikel horizontal) SUDAH dipakai dua proyek berturut-turut dengan nama
   berbeda — itu bukan default; hanya bila tema memang kecepatan/aliran,
   dan tidak boleh dua proyek berturut-turut.
5. Transisi hanya fade + scale bump + light leak di semua cut → template PPT.
   Whip ke sudut lain, cut ke instrumen (peta/speedometer/profil), push-through.
6. Explainer dimulai dari starter GAYANYA: `starter-explainer-kartun`,
   `-jurnalisme`, `-katalog`, `-sketsa` (mode kolase: kamera menyusuri aset
   diam), `starter-explainer` (aksi kontinu: dunia mengalir), atau
   `starter-explainer-panggung` (kartun panggung: satu panggung per adegan,
   rig sendi, kamera hanya di dalam panggung), atau `starter-explainer-3d`
   (dunia 3D). Yang kolase satu rig; yang panggung rignya lain. BUKAN dari `assets/starter-opener.html`
   (opener teks), dan bukan dari nol.

7. **Miniatur adalah slide.** Kamera zoom < 1,08 sehingga rumah sebesar ibu
   jari dan tanah kosong mengisi separuh layar → PPT walau semua bergerak.
   Dunia dipecah jadi panggung seukuran frame, bukan satu peta besar yang
   dijelajahi (`kartun-panggung.md` Hukum 1).

8. **Kerangka template (opener/promo).** Cek rundown dan kode: adegan pertama
   berupa teks yang diperbesar lalu keluar ke kiri; tiga tile/kartu fitur
   sejajar; kotak input/searchbar yang diketik; urutan hook → fitur → fitur →
   janji → logo → CTA. Dua atau lebih tanpa tuntutan konsep → template, walau
   kulitnya baru. Pilih ulang kerangka dari `references/opener-konsep.md`.

Gagal satu poin saja → rombak sebelum ditunjukkan ke user.

## Aset lewat MCP — sebut KEMAMPUAN, bukan vendor

Skill ini tidak mengikat ke satu penyedia. Yang dipakai adalah kemampuan yang
kebetulan tersedia di agen user:

| Kemampuan | Dipakai untuk | Aturannya |
|---|---|---|
| generate gambar | cutout ilustrasi, foto orang/tempat (bila disetujui), properti | satu batch per gaya; wajah fiktif; teks/logo brand ditambahkan di kode |
| hapus latar | cutout dari foto/ilustrasi | bila subjek ikut terhapus, generate ulang — jangan dipaksa |
| generate video | klip pendek sebagai layer footage (§9b) | cek biaya dulu; konteks faktual diberi label "ilustrasi/rekonstruksi" |
| bridge After Effects | build kartun panggung langsung di AE | `references/ae-bridge-higgsfield.md` |

Contoh nama tool di dokumen ini (mis. `gpt_image_2_5`, `remove_background`,
`media_import_url` di MCP Higgsfield) adalah CONTOH penyedia yang sudah dipakai —
padanan di penyedia lain sama sahnya. Bila kemampuan yang dibutuhkan tidak ada:
katakan ke user dan tawarkan jalan lain (foto user, stok berlisensi, atau konsep
yang tidak butuh foto) — jangan diam-diam mengganti foto dengan ilustrasi.

## Jenis pekerjaan yang dicakup

Skill ini untuk motion graphic web secara UMUM. Explainer hanya salah satu
jenis — ia punya dokumen sendiri karena strukturnya beda, bukan karena ia
yang utama.

Starter dinamai menurut kategorinya: `starter-opener.html` untuk opener, promo,
bumper, intro, dan kinetic typography; `starter-explainer-*.html` untuk explainer,
dengan akhiran mode/gaya (`-kartun`, `-jurnalisme`, `-katalog`, `-sketsa` = kolase;
tanpa akhiran = aksi kontinu; `-panggung` = kartun panggung). Kartun panggung adalah
mode explainer (gaya 6), bukan kategori sendiri: tujuannya tetap menjelaskan dengan
VO, yang berbeda hanya cara produksinya.

| Jenis | Durasi lazim | Ciri | Resep |
|---|---|---|---|
| Opener / promo produk | 25–40 dtk | satu konsep dari menu (kerangka lahir dari produk, bukan urutan baku), satu momen istimewa, penutup brand | `references/opener-konsep.md` + alur kerja di bawah + `references/techniques.md` |
| Bumper / ident / logo sting | 3–8 dtk | logo build-on, satu gerak tanda tangan, selesai sebelum penonton sadar | `techniques.md` (logo build-on, light leak) |
| Intro / outro kanal | 5–12 dtk | nama kanal + tanda tangan gerak yang sama tiap episode | alur kerja di bawah |
| Kinetic typography / lirik | 15–60 dtk | teks adalah subjek; split per kata/huruf; ritme mengikuti audio | `techniques.md` (split + blur berarah, pan 3D per kata) |
| Title / lower third / bumper segmen | 2–6 dtk | elemen kecil di atas footage, masuk-keluar bersih, latar transparan | `techniques.md` |
| Explainer / video penjelasan | 30–90 dtk | fakta bersumber, entitas tampil, sudut pandang berganti, enam gaya | `references/explainer.md` + starter per gaya |

## Explainer dan karakter: baca sebelum menentukan shot

Untuk explainer kartun edukasi flat berkarakter (gaya keenam, **kartun
panggung**), atau revisi yang terasa seperti slideshow/miniatur, baca
`references/kartun-panggung.md`: satu panggung per adegan, zoom 1,08–1,95,
kontinu di dalam panggung dan cut/geser 96 px di antaranya, rig sendi dengan
transform manual, nol caption, palet flat cerah. Bedakan kalimat, beat visual,
framing, dan pergantian panggung. Untuk membangunnya langsung di After Effects, baca
`references/ae-bridge-higgsfield.md`. Pedoman khusus explainer ini memperjelas
aturan opener di bawah; contoh font, jumlah scene, dan efek bukan resep universal.

## Hukum #1 — Ini video, bukan slide

Penyakit paling umum: model menyusun adegan seperti slide — judul + sub-judul
+ body copy + deretan badge. Itu langsung terbaca "PPT" dan akan ditolak.

Aturan kerasnya:

- **Untuk opener: satu kalimat pendek + maksimal satu objek utama per adegan.** Tidak ada
  kicker ("01 — FITUR"), sub-judul, paragraf keterangan, chip/badge fitur,
  atau metadata teknis (nama package, URL panjang). Chip, tombol, dan label yang
  merupakan bagian UI produk yang sedang dipakai tidak termasuk.
- **Informasi baru = respons visual baru.** Pada explainer, ubah keadaan/aksi
  di dunia yang sama bila masih berhubungan; pergantian kalimat tidak wajib mengganti shot.
- **Daftar poin diganti visual, bukan otomatis tiga tile.** Pilih cara dari
  menu fitur di `references/opener-konsep.md` (satu fitur didemokan, kata
  berganti, objek bertransformasi, kartu dikocok, grid tile…); dua opener
  berturut-turut tidak memakai cara yang sama.
- **Adegan harus hidup.** Kamera boleh menetap saat objek membawa aksi.
  Gerakkan kamera untuk mengikuti atau mengungkap sesuatu; jangan mengandalkan
  teks fade/slide di atas latar diam, atau pan/zoom berulang di semua segmen.
- **"Zoom in-out" = ukuran shot, bukan napas kamera.** Bila video terasa statis atau
  user meminta zoom, kamera mendekat ke elemen yang sedang bercerita (medium close-up
  / close-up) lalu mundur ke wide mengikuti ketukan isi; napas beberapa persen hampir
  tak terlihat (`techniques.md` §3b).

Baca `references/anti-ppt.md` SEBELUM mendesain adegan — berisi daftar
pelanggaran nyata beserta perbaikannya.

## Hukum #2 — Deterministik atau mati

Tidak ada satu baris pun yang membaca jam sistem. Semua visual adalah fungsi
murni dari `tl.time()` (waktu timeline GSAP): spektrum, angka berjalan,
partikel, getar kamera (sinus frekuensi tinggi, bukan `Math.random()`),
posisi objek yang "mengalir" (tween JARAK, bukan akumulasi kecepatan per
frame). Acak saat setup (posisi partikel, seed) memakai PRNG BER-SEED, bukan
`Math.random()` — tanpa itu tata letak berubah tiap kali halaman dimuat.
Konsekuensinya: scrub akurat seperti timeline After Effects, dan render
frame-by-frame ke MP4 menghasilkan gambar identik setiap kali.

Loop dijaga dari jam (`tl.time() >= DURATION` di ticker), bukan `onComplete`:
satu tween `repeat:-1` (ayunan, kedip, kipas) membuat durasi timeline tak hingga
sehingga `onComplete` tidak pernah terpicu. Semua starter sudah begitu.

## Hukum #3 — Gaya lahir dari tema, bukan dari starter, bukan dari referensi

Kegagalan yang umum: opener untuk produk lain keluar dengan kulit PERSIS
opener produk sebelumnya — gelap, aksen biru, glow, nebula, font yang sama —
karena model mengambil gayanya dari starter. Animasinya bisa bagus, tetap
gagal: opener adalah wajah produk, dan dua produk tidak boleh berwajah sama.

1. **Style brief dulu, kode belakangan.** Sebelum menyentuh starter, tulis
   enam baris ini dan tunjukkan ke user bersama rundown adegan:
   - tema/produk + tiga kata sifat perasaan yang ingin ditinggalkan;
   - **konsep & sidik jari struktur** (opener/promo): tiga kandidat konsep dari
     `references/opener-konsep.md`, satu dipilih dengan alasan dari produk, lalu
     `konsep · jumlah adegan · objek utama tiap adegan · pembuka · penutup`;
   - palet: satu warna utama DARI brand/tema (logo, ikon aplikasi, situs,
     kemasan), satu warna latar, satu aksen — sebutkan hex DAN sumber tiap
     warna; warna yang bukan dari brand ditulis "turunan: alasan";
   - font display yang punya karakter sesuai perasaan itu (bukan
     Poppins/Inter/Roboto/Montserrat/Arial) + font pendamping; pengecualian:
     konsep klaim → cara → hasil memakai font UI produk sendiri
     (`references/opener-konsep.md`);
   - penekanan teks: tanpa sorotan kata, atau satu bentuk sorotan (sebutkan) —
     sorotan kata OPSIONAL, bukan bawaan setiap opener;
   - bahasa latar per segmen: satu arah dari tabel "Arah gaya" untuk semua,
     atau rencana pergantian (segmen mana ganti, ke apa, kenapa, dipicu apa);
   - tanda tangan gerak: satu jenis gerak yang diulang sebagai identitas
     (wipe objek, roll 3D per kata, kertas terbang, garis yang menggambar,
     blok warna menabrak tepi…);
   - gerak latar: satu bahasa dari menu `techniques.md` §7c — bukan hal yang
     sama dengan tanda tangan gerak, dan bukan otomatis "benda melintas";
   - permukaan latar: dari menu §7d (gradien/cahaya/tekstur/grainy gradient,
     ≥ 2 lapis) — bukan flat;
   - gaya render objek: satu keluarga dari menu `techniques.md` §7e (flat, clay,
     glossy, kaca, isometrik, realistis, garis neon…);
   - aset foto (bila konsep memakai foto orang/tempat/produk): sumbernya — foto
     user, generate lewat MCP gambar, atau stok berlisensi — DITANYAKAN ke
     user, plus daftar shot per babak (`references/opener-konsep.md` "Foto dalam
     opener");
   - transisi: tentukan batas mana yang memerlukan efek dan mana yang cukup cut;
     pilih dari menu §4c sesuai konteks, bukan wajib dua jenis atau wajib 3D;
   - satu momen istimewa (di mana efek termahal dipakai, sekali);
   - lensa default (mm) — kosakata kamera di `references/sinematografi.md`;
   - sudut & gerak kamera pembuka;
   - preset cahaya per segmen + pemicu pergantiannya.
2. **Starter adalah arsitektur, bukan gaya.** Warna abu-abu, font sistem,
   dan latar WebGL di `assets/starter-opener.html` adalah PLACEHOLDER. Kalau salah
   satunya masih terlihat di hasil, gaya belum diturunkan. Latar WebGL
   (nebula, debu, grid, bloom) hanya satu bahasa latar dari delapan;
   matikan bila arah gayanya lain.
3. **Referensi = ritme, bukan kulit.** Dari video referensi ambil: durasi per
   shot, jenis transisi, hierarki atensi, energi, bahasa gerak. JANGAN ambil:
   palet, font, tekstur, tata letak, bentuk ornamen, kalimat, urutan adegan,
   dan momen unik (pembuka/penutup khas, gimmick satu kali). "Buatkan
   seperti ini" berarti "seenergik ini", bukan "berwarna seperti ini";
   "pakai style X" berarti kulit dan bahasa gerak X, bukan adegan X. Contoh
   urutan di `references/opener-konsep.md` diperlakukan sama: prinsip, bukan
   naskah (Hukum kerangka #7).
   Menjiplak kulit referensi = pelanggaran, walau user yang menyodorkannya —
   sebutkan itu satu kalimat lalu tawarkan versi yang lahir dari tema.
4. **Berbeda dari proyek sebelumnya — kulit DAN kerangka.** Dua produk berbeda harus berbeda di
   minimal tiga dari empat: palet, font, bahasa latar, tanda tangan gerak (termasuk
   sudut pembuka + gerak tanda tangan kamera) —
   termasuk bentuk sorotan kata bila dipakai (pill + bintang milik satu
   proyek tidak boleh muncul lagi di proyek lain). Kerangkanya juga: konsep
   berbeda, atau ≥ 3 dari 5 elemen sidik jari struktur berbeda
   (`references/opener-konsep.md`). Warna baru di atas urutan adegan lama
   tetap template.
   Jangan membuka folder proyek lama untuk "contoh" — yang boleh diwarisi
   hanya aturan di skill ini.
5. **Latar tidak default gelap.** Tanpa aturan ini semua opener cenderung
   keluar gelap dengan nebula karena starter dan contoh-contohnya gelap. Latar mengikuti
   tema: gradien terang, warna lembut, blok warna, kertas, foto, atau gelap
   — tabel "Arah gaya" punya sepuluh pilihan dan sebagian besar tidak gelap.
   Contoh-contoh di skill ini (kertas terang, nebula) hanya contoh, bukan
   templat yang dikunci.
   **Latar tidak pernah statis.** Selalu ada gerak latar (§7c), dan warna
   latar BOLEH berganti kapan pun dibutuhkan: mood/topik segmen berubah
   (masuk ke produk, masalah → solusi, klaim → CTA), brand warna-warni
   menuntut ritme warna, atau aksi di layar memang mengubahnya (toggle
   dinyalakan, benda menutup lensa, ikon membesar memenuhi frame). Yang
   dijaga hanya dua: pergantian punya pemicu yang terlihat (wipe, benda, aksi
   UI, push ke bidang warna, cut di ketukan) — bukan cross-fade tanpa sebab
   yang terasa "ganti slide" — dan latar tidak dibiarkan satu warna diam
   hanya karena tidak pernah dipertimbangkan. Rencananya ditulis di style brief.
6. **Bebas berekspresi.** Hukum-hukum di sini mengunci STRUKTUR (bukan
   slide), KONTRAS (teks terbaca), dan KEBARUAN (tidak mengulang proyek
   lain) — bukan ekspresi. Gradien kaya, cahaya, 3D, kedalaman, tekstur,
   warna berani dianjurkan bila cocok dengan tema. Yang dilarang hanya
   mengambil default termurah dan mengulanginya: balok datar menyapu, garis
   melintas, latar flat, kulit proyek lain. Kalau dua pilihan sama-sama
   memenuhi hukum, pilih yang lebih berani.
7. **Yang boleh sama di semua pekerjaan:** hukum anti-PPT, rig kamera,
   determinisme, ritme masuk-keluar asimetris, ukuran teks minimum.

### Arah gaya — menu kulit

Sepuluh arah (sinematik gelap, poster color-block, editorial terang, kertas & cetak,
retro/analog, brutalis mono, pastel ceria, mewah gelap, flat pop berfoto, grainy
gradient) beserta latar, tipografi, gerak khas, dan kecocokannya ada di
`references/techniques.md` §7f. Pilih SATU di style brief (boleh memadukan dua dengan
sadar); dua opener berturut-turut memakai baris yang sama = tanda bahaya.

## Hukum #4 — Teks hidup, latar tunduk

Dua opener dengan rig yang sama bisa berakhir sangat baik atau sangat buruk
hanya karena tipografi dan kontrasnya. Yang buruk: setiap judul KAPITAL
SEMUA bobot 800 di tengah, masuk dengan cara yang sama, di atas ladang cahaya
putih yang lebih terang daripada hurufnya. Yang baik: sentence case bobot
500, penekanan pada kata kunci (mis. pill + bintang — itu tanda tangan
satu proyek, bukan aturan; sorotan kata sendiri opsional), tanda baca
hanya bila perlu, ukuran/arah/
posisi bergantian, latar tenang di bawah teks, latar berganti mengikuti
segmen. Resep lengkap dengan kode: `techniques.md`
bagian 1 dan 1b. Ringkasnya:

- Sentence case bobot 500–600. Kapital-tebal hanya untuk satu adegan penekanan.
- Judul, klaim, dan frase pendek DEFAULT TANPA TITIK — terutama frase ≤ 4 kata
  dan kalimat satu baris. Tanda baca hanya bila mengubah arti atau irama: `?`
  untuk pertanyaan sungguhan, titik untuk gaya dua kalimat pendek berturut-turut
  yang disengaja, `!` sangat jarang. Gaya tanda baca diputuskan sekali di style
  brief dan konsisten; bila dipakai, ia elemen terpisah yang muncul terakhir.
- Sorotan kata (pill, garis bawah, marker, kotak, warna, coret) OPSIONAL dan
  diputuskan di style brief. Tanpa sorotan pun kalimat tetap punya penekanan:
  kata per kata dari redup ke penuh, ukuran/bobot, jeda, atau objek (ikon,
  UI) yang berdiri di samping kata. Bila dipakai: satu bentuk per video,
  tidak wajib di setiap kalimat, berbeda dari proyek lain; ornamen hanya bila
  diturunkan dari bentuk brand.
- Dua adegan berturut-turut tidak boleh sama dalam ukuran, arah masuk, dan
  posisi teks.
- Di KANTONG TEKS (bukan seluruh frame), latar harus GELAP (≤ 25 %
  luminance) atau TERANG (≥ 80 %), tidak pernah "ramai sedang". Di luar
  kantong, latar justru harus kaya: gradien, cahaya, tekstur (§7d) — flat
  satu warna ditolak. Elemen latar apa pun (partikel, bentuk,
  tekstur, garis): warna dari sisi gelap palet, opacity ≤ .35 di kantong
  teks, ≤ 40 elemen terang terlihat.
- Pertimbangkan selang-seling gelap–terang bila segmennya memang berganti
  mood; bukan kewajiban mekanis.

## Alur kerja

0. **Kenali jenisnya** (tabel "Jenis pekerjaan"). Explainer → buka
   `references/explainer.md` dan ikuti "Langkah nol" di sana: SATU
   pertanyaan berisi gaya (enam pilihan + rekomendasi), rasio, durasi,
   suara, plus pagar durasi. Jenis lain → lanjut; tanya hanya hal yang
   benar-benar tidak bisa diturunkan dari brief (rasio, durasi, ada
   musik/VO atau tidak), dalam satu pertanyaan.
0b. **Tulis style brief** (Hukum #3) dan tunjukkan bersama rundown. Tanpa
   style brief yang disetujui, jangan menyentuh kode.
1. **Serap referensi & sumber brand.** Minta screenshot/potongan video
   referensi bila ada; petakan per shot (durasi, gerakan, jenis transisi,
   urutan atensi) — hanya RITMENYA, bukan kulitnya (Hukum #3). Warna, logo
   (path vektor ASLI, jangan digambar ulang), font, dan klaim fitur diambil
   dari sumber resmi PRODUK yang sedang dibuat — bukan dari referensi, bukan
   dari proyek lain, bukan karangan.
2. **Tulis rundown dari konsep yang dipilih** — tabel `detik | adegan |
   kalimat | visual` (`visual` boleh berkosakata kamera: `WS high → dolly in CU`). Jumlah dan jenis adegan mengikuti konsep
   (`references/opener-konsep.md`), bukan pola hook → fitur → fitur → janji →
   logo → CTA. Total 25–40 detik. Minta persetujuan user atas rundown ini
   sebelum menulis kode; merombak rundown murah, merombak kode mahal.
3. **Scaffold arsitektur.** Opener/promo/bumper/typography: salin
   `assets/starter-opener.html` (stage 1920×1080, rig kamera `#world`, scene
   Three.js ber-state, helper timeline) lalu SEGERA ganti token warna, font,
   dan bahasa latarnya sesuai style brief — starter sengaja abu-abu. Explainer: salin starter sesuai gaya —
   `starter-explainer-kartun/-jurnalisme/-katalog/-sketsa.html` (mode
   kolase: kamera into/settle/look/home di atas cutout/foto, say/unsay per
   kata, draw anotasi, push-through antar adegan) atau
   `starter-explainer.html` (aksi kontinu: dunia mengalir, hero, objek
   dunia, view peta, whip). Semua sudah autoplay + loop tanpa player. Struktur multi-file dan
   penjelasan tiap keputusan ada di `references/architecture.md`.
4. **Bangun adegan satu per satu** dengan resep di
   `references/techniques.md` (split per huruf + motion blur berarah,
   pan 3D per kata, menu transisi, mockup UI). Resep adalah perkakas, bukan
   daftar belanja: pakai hanya yang dituntut konsep.
5. **Periksa mekanis lalu VISUAL.** Jalankan dulu
   `node <folder skill>/scripts/lint-motion.mjs` di folder proyek (section yang
   di-fade, `Math.random`, loop, `<video autoplay>`, teks < 30 px, module lokal);
   perbaiki semua FAIL. Lint tidak menilai rasa — sesudahnya tetap verifikasi visual.
   **Verifikasi VISUAL, bukan cuma "kode jalan".** Kamu tidak bisa menonton
   video; kamu hanya bisa melihat FRAME. Potret 6–20 detik kunci (awal
   tiap adegan, saat teks muncul, transisi) dengan `scripts/snap.mjs`
   (puppeteer, buka `file://`, tanpa server), susun jadi lembar kontak, dan
   Skrip itu juga menyusun `shots/kontak.png` — satu lembar kontak berlabel detik; BUKA
   gambar itu dan
   nilai seperti sutradara: teks kepotong? tumpang tindih? teks muncul
   sebelum kamera selesai? masih terasa slide? Perbaiki, potret lagi.
   JANGAN merender semua frame untuk mengecek — itu ribuan gambar dan bukan
   verifikasi; render penuh hanya untuk export MP4 (langkah 6) bila user
   memintanya. Tanpa Node: buka `?debug=1`, scrub manual, screenshot.
6. **Serahkan sebagai SATU `index.html` yang bisa diklik dua kali.** Output
   akhir tidak boleh butuh server/Node: CSS dan JS ditulis INLINE di dalam
   berkas (module lokal `<script type="module" src="…">` diblokir CORS saat
   dibuka lewat `file://`, module inline tidak), library dari CDN, aset
   (ikon/gambar) relatif di folder yang sama. Server no-cache
   (`scripts/serve.py`) hanya alat KERJA saat mengedit, bukan syarat
   menonton. Tanpa player di layar (lihat "Player"); sebutkan `?debug=1`
   untuk scrub. **Export MP4 hanya bila user memintanya**: `scripts/
   export-frames.mjs` merender tiap frame (60 fps) ke PNG lalu ffmpeg
   menggabungkannya — cara ini bebas frame drop, tapi mahal, jadi bukan
   langkah rutin dan bukan alat pengecekan. Bila user ingin berkas yang aman disimpan
   bertahun-tahun (arsip/portofolio), tawarkan `scripts/vendor-libs.mjs` — GSAP dan font
   ditanam ke dalam berkas sehingga tidak bergantung pada CDN.

7. **Khusus explainer: naskah VO + ajakan merekam** — pesan penutup wajib
   memuat naskah VO lengkap dan meminta user merekam/generate lalu mengirim
   ulang audionya untuk disinkronkan. Detail bentuk naskah, petunjuk rekam,
   dan retime di `references/explainer.md` → "Penyerahan".

## Checklist sebelum menyerahkan

Berlaku untuk semua jenis. Checklist KHUSUS jenis pekerjaan ada di dokumennya dan
dibaca bersama jalur itu: opener/promo → `references/opener-konsep.md`, explainer →
`references/explainer.md`, kartun panggung → `references/kartun-panggung.md`,
build di After Effects → `references/ae-bridge-higgsfield.md`.

- [ ] Style brief (tema, palet dari brand, font display berkarakter, satu
      bahasa latar, tanda tangan gerak, momen istimewa) ditulis dan disetujui
      SEBELUM kode
- [ ] Tidak ada sisa placeholder starter (abu-abu, font sistem, nebula bila
      arah gayanya lain) dan tidak ada kulit referensi yang disalin (palet,
      font, tekstur, tata letak, kalimat)
- [ ] Teks hidup (Hukum #4): sentence case bobot 500–600, penekanan jelas,
      tanpa titik otomatis (tanda baca hanya bila mengubah arti/irama),
      ukuran/arah/posisi bergantian antar adegan;
      kapital-tebal hanya di satu adegan. Sorotan kata hanya bila style brief
      memilihnya (bukan otomatis di setiap kalimat, bukan pill + bintang
      warisan proyek lain)
- [ ] Latar tunduk (Hukum #4): di bawah teks luminance ≤ 25 % atau ≥ 80 %,
      elemen latar redup dan berwarna gelap di kantong teks; uji grayscale —
      tidak ada latar seterang huruf
- [ ] Transisi dipilih pada batas yang membutuhkan; tidak otomatis semua
      batas diberi efek atau semua efek dihapus. Objek penyapu punya makna
      dalam adegan; kecepatan, amplitudo, dan jeda sudah diperiksa.
- [ ] Permukaan latar dari menu §7d: ≥ 2 lapis (dasar + cahaya/tekstur/
      blob), warna dari palet — tidak flat satu warna, bukan hitam/putih murni
- [ ] Gaya render objek satu keluarga (§7e), atau pergantiannya dijadikan momen
- [ ] Bila memakai grainy gradient/butiran: butiran masih terlihat di MP4 hasil encode
      dan gradien tidak banding
- [ ] Bila memakai video: klip dipasang lewat `clip()` (tanpa `autoplay`/`loop`), dibungkus
      elemen yang dianimasikan, sumbernya disepakati user, folder `assets/` disebutkan saat
      penyerahan, dan detik yang berisi klip sudah dipotret (`snap.mjs`)
- [ ] Gerak latar dipilih dari menu §7c dan BERBEDA dari proyek sebelumnya;
      tidak ada batang/garis melintas ke samping kecuali tema kecepatan/
      aliran dan belum dipakai di proyek sebelumnya
- [ ] Latar bergerak di setiap adegan (tidak ada latar diam); pergantian warna
      latar boleh kapan dibutuhkan asal punya pemicu terlihat
- [ ] Lolos 8 poin "Larangan struktural" (bukan section yang di-fade, ada
      benang merah visual, ≤ 2 tingkat teks, gerak tiap detik, transisi
      bervariasi, starter yang benar, bukan miniatur, bukan kerangka template)
- [ ] Tanpa player di layar; autoplay; loop; `?debug=1` untuk scrub
- [ ] Opener: satu gagasan utama tanpa tumpukan badge; explainer: satu
      peristiwa dapat memuat beberapa beat dan objek yang saling berhubungan.
- [ ] Kamera, cut, dan gerak objek dipilih sesuai konteks; tidak ada keharusan
      menggerakkan kamera di tiap segmen. Saat kamera bergerak, seluruh dunia ikut.
- [ ] Tidak ada hold panjang yang mati: babak tanpa aksi objek yang besar mendapat
      perubahan ukuran shot ke elemen (wide ↔ medium close-up ↔ close-up) atau push pelan;
      napas kamera saja tidak dihitung. Label layar di luar rig, tidak terpotong zoom
- [ ] Motion blur berarah pada semua teks masuk/keluar
- [ ] Kamera sinematik: tiap dunia ≥ 2 sudut berbeda; cahaya bercerita di ≥ 1 segmen
      (atau dinyatakan tidak dipakai di style brief); subjek tidak masuk zona aman HUD
- [ ] Latar lahir dari tema (tidak otomatis gelap; terang bisa gradien,
      warna lembut, blok warna, kertas), punya kedalaman (bukan satu warna
      flat), TIDAK lebih ramai daripada subjek; pergantian latar diputuskan
      per segmen di style brief dan, bila ada, terjadi di balik wipe/cut
- [ ] Glow dipakai pada objek (tile, bar, ikon dekor) — judul teks BERSIH
      (putih penuh + drop shadow tipis), kecuali user minta sebaliknya
- [ ] Font display ≠ font mockup UI; mockup memakai font produk aslinya
      (konsep klaim → cara → hasil: seluruh teks memakai font UI produk)
- [ ] Nol pemakaian `Date.now()` / `Math.random()` di jalur render; acak saat setup
      memakai PRNG ber-seed; loop dari jam, bukan `onComplete`
- [ ] `lint-motion.mjs` lolos tanpa FAIL (larangan struktural & checklist yang mekanis)
- [ ] Sudah dipotret di detik kunci (snap.mjs / ?debug=1) dan dilihat dengan
      mata — bukan render penuh; MP4 hanya bila diminta
- [ ] Ada suara? Halaman menahan di frame awal bila autoplay diblokir dan mulai
      bersama suara pada gestur pertama — tidak pernah mulai tanpa suara; tanpa
      file peluncur (`.cmd`/`.bat`)
- [ ] Tidak ada teks di bawah 30 px pada panggung 1080 (body ≥ 44, label ≥ 34,
      kredit ≥ 30) — ditonton di HP; teks hantu & anotasi bervariasi, bukan
      selalu outline / lingkaran putus-putus
- [ ] `index.html` terbuka langsung lewat `file://` (klik dua kali) tanpa
      server — CSS/JS inline, tidak ada `src` module lokal
- [ ] Angka yang berubah tiap frame (jam, counter) memakai
      `font-variant-numeric:tabular-nums` + `min-width` supaya wadahnya
      tidak berubah lebar

## Jebakan yang sudah memakan korban

Detail dan perbaikannya di `references/techniques.md` bagian "Jebakan":
bloom threshold rendah → layar putih; nebula additive → menumpuk lewat bloom;
selector CSS lebih spesifik mengalahkan state awal `opacity:0` → elemen
muncul mendahului animasinya; module JS di-cache browser → edit "tidak
ngefek" (pakai server `Cache-Control: no-store`); tween `repeat:-1` → durasi
timeline tak hingga, `onComplete` tak pernah terpicu (loop dari jam); objek 3D pipih diputar
penuh di sumbu Y → jadi sebatang garis (goyangkan, jangan putar penuh);
kotak filter SVG default memotong ekor blur (lebarkan `x/y/width/height`).

## After Effects — langsung lewat bridge Higgsfield

Bila After Effects sudah terbuka, MCP bridge `ae_*` Higgsfield tersambung, dan user
meminta animasi/explainer dibangun di AE, bangun langsung lewat perintah bridge. Baca
`references/ae-bridge-higgsfield.md`: kerangka comp lewat satu Lottie kecil, null
`CAM` per panggung (anchor & position di-nol-kan SEBELUM parenting), ilustrasi
dari SVG-kode → PNG 2× (`scripts/ae/bridge/aset-svg.py` + `svg2png.cjs`), karakter
sebagai shape asli AE bersendi (`scripts/ae/bridge/rig-tokoh.py`, ±90 op per tokoh),
keyframe bagian tubuh dalam ruang induk, verifikasi lewat contact sheet (relay
bila r2.dev diblokir). Hukum kartun panggung tetap berlaku penuh. Bridge tidak
bisa menyimpan/merender dan tidak bisa menyusun ulang urutan layer — sebutkan itu
dan buat layer dari belakang ke depan. Build 10 panggung ≈ 1 jam, 0 kredit.

## Isi paket

| Berkas | Kapan dibaca |
|---|---|
| `references/kartun-panggung.md` | KARTUN PANGGUNG: satu panggung per adegan, kamera ≥1,08, cut/geser 96 px, rig sendi + transform manual, kepala raster + ekspresi lokal, nol caption, palet flat |
| `assets/starter-explainer-panggung.html` | EXPLAINER kartun panggung: sistem panggung + kamera per panggung, `J()` sendi, `character()` (kepala vektor atau raster), whoosh 96 px, contoh dua panggung |
| `references/ae-bridge-higgsfield.md` | BRIDGE: membangun kartun panggung langsung di AE lewat MCP Higgsfield — batas bridge, jebakan (null 960,540; parent ke CAM berkeyframe; reorder rusak), arsitektur CAM per panggung, rig native, relay contact sheet, penyerahan |
| `references/anti-ppt.md` | sebelum mendesain adegan |
| `references/opener-konsep.md` | OPENER/PROMO sebelum rundown: tiga kandidat konsep, menu 19 konsep (termasuk estafet benda, pamer sistem brand, klaim → cara → hasil, ekosistem UI hidup, pop flat berfoto, menembus bentuk bergradien, dan tur produk berselang klaim, semuanya diturunkan dari layanan/aset/produk brand), panduan layout-warna-ritme, panduan animasi UI untuk app/SaaS, panduan foto dalam opener (input user / generate via MCP), menu fitur, pembuka, penutup, transisi tanpa cut yang dibawa objek, sidik jari struktur — mencegah kerangka template |
| `references/explainer.md` | bila yang diminta explainer/video penjelasan (kartun+VO, jurnalisme visual foto, katalog putih, sketsa vintage, atau aksi kontinu; default 16:9, 9:16 hanya bila diminta) |
| `references/architecture.md` | saat scaffold / butuh alasan di balik struktur |
| `references/techniques.md` | saat membangun adegan & efek (termasuk ukuran shot §3b, grainy gradient §7d, menu gaya render objek §7e, dan video sebagai layer footage §9b) |
| `references/roadmap.md` | saat mengembangkan skill ini lebih lanjut |
| `assets/starter-opener.html` | titik awal OPENER/promo — arsitektur + perkakas (8 pintu teks, transisi opsional); SENGAJA tanpa urutan adegan contoh, kerangka dari `opener-konsep.md` |
| `references/sinematografi.md` | KAMERA SINEMATIK 2.5D/3D: memilih dunia, kosakata → panggilan, aturan 180°/30°/cahaya, jebakan 3D |
| `assets/starter-explainer-3d.html` | EXPLAINER dunia 3D: Three.js r161 + `CAM`, `mat()`, `fromSVG()`, cahaya key/fill/rim, HUD di luar `#world`, `?demo=1` |
| `assets/starter-explainer.html` | EXPLAINER gaya aksi kontinu (vektor): mode aliran (strip + hero + objek dunia) + view peta + whip + contoh mode kolase |
| `assets/starter-explainer-kartun.html` | EXPLAINER kartun kolase: kertas krem + grain + noda, cutout ilustrasi, Bricolage + Caveat, pill warna |
| `assets/starter-explainer-jurnalisme.html` | EXPLAINER jurnalisme visual: hitam + grain, foto asli + tag sumber, Barlow Condensed + Plex Mono, highlighter kuning/merah, anotasi putus |
| `assets/starter-explainer-katalog.html` | EXPLAINER katalog putih: grid samar, cutout foto, Archivo Black + Caveat + Inter, highlighter kuning |
| `assets/starter-explainer-sketsa.html` | EXPLAINER sketsa vintage: kertas sepia (tekstur CSS), cutout ukiran multiply, Playfair + Garamond + Cinzel, karat & emas |
| `evals/briefs/*.md` + `scripts/eval-run.mjs` | PENGEMBANG SKILL: brief baku + kartu nilai untuk menguji apakah aturan baru benar-benar memperbaiki hasil |
| `references/alat-kerja.md` | ALAT KERJA: pasang puppeteer, lint, snapshot, export MP4, jalan pintas tanpa ffmpeg, dan alat pengembang skill |
