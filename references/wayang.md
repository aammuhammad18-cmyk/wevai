# Wayang kulit (`starter-wayang.html`)

Gaya teater bayangan 100 % kode. Penonton duduk di sisi bayang: kelir diterangi blencong yang berkedip, figur bertatah menjadi renda
cahaya saat menempel kelir, lalu membesar dan kabur saat didekatkan ke lampu. `?sisi=dalang` memutar penonton ke sisi dalang: lukisan
prada di depan kelir, dunia tercermin.

Dibaca hanya di jalur ini. Sumber: `src/runtime/wayang.js` (blok `<wv:wayang>`, butuh `atmosfer`). Uji: `scripts/test-wayang.mjs` dan
`WAYANG_UJI` di `test-starters`. Bukti: `evals/bukti/2026-11-03-wayang/`.

## Kapan dipakai

- Cocok: sisipan legenda dan kisah pewayangan, pembuka bab sejarah Jawa, ganti mode "kertas meredup, blencong menyala" (`babad-jawa-01`):
  legenda #cap memuat "Cerita rakyat · sumber" seperti mode lama.
- Lemah: data, angka, tokoh sejarah nyata (wayang = tokoh lakon, bukan potret), adegan cepat. Promo: hanya bila dimotivasi; tanpa itu gimmick.
- Jangan dipakai untuk mengklaim ritual (ruwatan, sesaji, makna mistis): starter sengaja netral.

## Rig

```js
wayang.panggung({sisi:'bayang',tinggi:560,dasar:980,seed:5});   // kanvas .wv-wayang di belakang rig; kelir + simpingan dipanggang sekali
wayang.figur({jenis:'gunungan',x:960,miring:-5,seed:3,kunci:[[1.5,{getar:1,miring:0},{durasi:.6}],[1.9,{z:230},{durasi:1.5}],[3.3,{x:-420,z:40},{durasi:1.5}]]});
wayang.figur({jenis:'alusan',x:-220,hadap:wayang.PIHAK.kanan.hadap,seed:11,tanganD:'angapurancang',kunci:[
  [4.5,{x:610},{durasi:2.9,langkah:92,tinggi:11,ayun:1.1}],[10.1,{tanganD:'nuding'},{durasi:1.1}]]});
tl.to(BLENCONG,{kedip:.85,duration:1},11.6);                      // lampu di-tween seperti CAM: nilai MUTLAK
camTo(7.6,1.5,{fx:960,fy:600,zoom:1.3},'sine.inOut');             // kelir mengikuti CAM di dalam kanvas: tetap tajam saat zoom (zoom ≥ 1)
```

Semua sesudah `const tl=`. Bidang `[data-z]` di rig `#world` hanya untuk benda di depan lensa (penonton); kelir sendiri z 0 di kanvas.

## API

| Panggilan | Hasil |
|---|---|
| `wayang.panggung({sisi,tinggi,dasar,simping,seed,res})` | satu per halaman. `sisi` `bayang` `dalang`; `tinggi` = px satria alusan; `dasar` = y atas debog; `simping` simpingan kiri-kanan; `res` resolusi sprite (1,25; naikkan bila zoom > 1,5) |
| `wayang.figur({jenis,x,y,z,hadap,seed,muka,tinggi,miring,putar,getar,tampak,tanganD,tanganB,kunci})` | figur + sprite dipanggang. `jenis` `alusan` `gagahan` `raksasa` `putri` `gunungan`. x, y = px layar sisi bayang (y relatif debog, negatif = terangkat). Tinggi otomatis menurut pakem |
| `kunci` | `[[t,{x,y,z,miring,putar,tampak,getar,tanganD,tanganB},{durasi,keras,langkah,tinggi,ayun}],…]` urut waktu, fungsi murni t. `langkah` = hentakan gapit berjalan; `keras` = ease gagah/raksasa |
| `tanganD` `tanganB` | nama pose (`anjujur` `angapurancang` `mathentheng` `nuding` `ngancam` `sembah` `belakang`) atau `[x,y,sisi?]` target telapak (satuan figur dari titik tanah; sisi 1 = siku ke depan, −1 = ke belakang). Depan/belakang. Raksasa: `tanganB` diabaikan |
| `BLENCONG` | `{x,y,jarak,nyala,kuat,kedip,seed}`: kaki lampu di kelir (px), jarak lampu-kelir, lebar api (penumbra), terang, kedip 0..1. Lampu x, y dibaca saat kelir dipanggang dan tiap frame: pasang sebelum `panggung()` bila digeser |
| `wayang.proyeksi(z)` | `{skala,blur,getar}`: `skala = d/(d−z)`, `blur = nyala·z/(d−z)` |
| `wayang.kedipan(t)` `ik` `keadaan` `rancang` `rancangKayon` `tatah` | fungsi murni (diuji Node) |
| `wayang.PIHAK` `JENIS` `MUKA` `POSE` `TATAH` | tabel pakem; `PIHAK.kanan` = simpingan kanan dalang: layar sisi bayang kiri, hadap kanan |

Salah opsi = `Error('wayang.…')` yang menyebut pilihan sah. `jenis:'panakawan'` ditolak dengan alasannya.

## Kenop

| Mau | Ubah |
|---|---|
| Bayangan kabur menakutkan | `z` 150–300 (dengan `jarak` 620: skala 1,3–1,9; blur 8–23 px) |
| Bayangan lebih keras di semua jarak | `BLENCONG.nyala` kecil (lampu listrik ±8) |
| Api tenang / gelisah | `BLENCONG.kedip` 0,15 / 0,85; `kuat` memadamkan |
| Tatah lebih rapat | `dy` di `polaIsi` (per golongan) |
| Warna sisi dalang | `muka` (`hitam` `merah` `prada` `putih`), warna kain mengikuti `seed` |

## Biaya

Setup (bake, ±1–2 dtk). Tiap frame: satu kelir `drawImage` + per figur 3–5 sprite + satu blur bila z besar + dua gradien penuh. Angka
terukur `performance.now()`: lihat `evals/bukti/2026-11-03-wayang/README.md`. `bench-frame` dijalankan pengendali sesudah merge.

## Determinisme

Keadaan = `tl.time()` + `CAM` + `BLENCONG`; kunci figur dan kedip murni. Satu kanvas dihapus penuh tiap frame (temuan `tokoh.md`). `test-starters`
membandingkan piksel lewat dua jalur seek (`sinema` semua kanvas, `WAYANG_UJI`).

## Batas

- Empat golongan + gunungan gapuran. Bukan tokoh bernama. Panakawan belum ada: bentuknya khas per tokoh.
- Satu debog (bawah); dua debog pagelaran (`debog atas`) belum.
- Satu gaya: terminologi Surakarta, sebagian gerak dari rekaman gaya Yogyakarta (lihat Akurasi). Bali, Cirebon, dsb. berbeda.
- Sunggingan disederhanakan: warna rata + garis, tanpa gradasi `tlacapan`/`bludiran`. Close-up sisi dalang terlihat lebih sederhana daripada wayang asli.
- Sisi dalang: dalang sendiri, gamelan, dan sinden belum digambar.

## Pakem dan sumber

Sumber: **[S]** Subagya, "Nilai-nilai Estetis Bentuk Wayang Kulit", *Gelar* 11(2), 2013, ISI Surakarta ([jurnal](https://jurnal.isi-ska.ac.id/index.php/gelar/article/view/1483));
**[W]** Widyokusumo, "Kekayaan Ragam Hias dalam Wayang Kulit Purwa Gagrak Surakarta", *Humaniora* 1(2), 2010 ([PDF](https://journal.binus.ac.id/index.php/Humaniora/article/download/2883/2277));
**[I]** Ismurdyahwati dkk., "Kajian Bahasa Rupa … Parta Krama", *ITB J. Vis. Art* 1D(3), 2007 ([artikel](https://journals.itb.ac.id/index.php/jvad/article/view/672));
**[U]** [UNESCO ICH, Wayang puppet theatre](https://ich.unesco.org/en/RL/wayang-puppet-theatre-00063) (dinyatakan 2003, Daftar Representatif 2008);
**[M]** Museum Sonobudoyo, [Blencong](https://sonobudoyo.jogjaprov.go.id/en/tulisan/read/blencong-cahaya-yang-menghidupkan-bayangan-wayang);
**[L]** Pranata, "Ebleg…", *Lakon* (ISI Surakarta) ([PDF](https://jurnal.isi-ska.ac.id/index.php/lakon/article/download/16-24/3287));
**[K]** [Wikipedia: Gunungan](https://en.wikipedia.org/wiki/Gunungan) dan [detikEdu](https://www.detik.com/edu/detikpedia/d-7587505/gunungan-wayang-fungsi-jenis-simbol-dan-filosofinya) (merujuk *Mata Budaya* Dinas Kebudayaan DIY, UNS, Aini Loita 2018): sekunder, dipakai karena jurnal gunungan yang dicari tidak terbaca.

| Unsur | Pakem | Dipakai di kode | Sumber |
|---|---|---|---|
| Rupa dasar | muka en profil, bahu tampak dua-duanya, lengan dan tubuh dipanjangkan; kaki ± ½ tinggi | semua figur | S |
| Bokongan / jangkahan | bokongan: kaki merapat tertutup kain, pantat tampak (Arjuna, Kresna); jangkahan: kaki melebar, siten-siten lebih panjang (gagahan, raksasa) | `sikap` | S, W |
| Kepala | luruh = menunduk; longok = tidak mendongak/menunduk; lanyapan = mendongak; putri menunduk = oyi | `kepala`, `tunduk` | W |
| Mata | gabahan (Arjuna, bambangan, Kresna, putri); kedhelen (Baladewa, Setyaki); telengan (Bima, Duryudana); plelengan (hampir semua raksasa besar). Subagya menyebut gabahan sebagai *liyepan* | `mata` | W, S |
| Hidung | wali miring (kecil/putri); bentulan (ujung golok); pelokan (mangga, raksasa) | `hidung` | W |
| Mulut | gusen: tampak gusi dan taring | `mulut` | W |
| Gelung | cupit urang (Arjuna, Gatotkaca); ukel keyongan (putri); gembel (ikal); garuda mungkur di belakang gelung raja/ksatria | `gelung` | W |
| Warna muka | umumnya hitam (dewasa, tenang, sigap); merah muda → tua = makin temperamental (raksasa); prada = wayang brongsong. Makna putih/biru tidak seragam antarsumber: tanpa klaim | `MUKA` | S, W |
| Lengan | satu batang kendali per lengan; raksasa: tangan belakang lazim digambar tetap, malang kerik | `gerak` | S, I |
| Batang | gapit = kendali tubuh; tuding = kendali lengan; keduanya = cempurit; dari tanduk | digambar di bayangan | I, W |
| Posisi tangan | anjujur, angapurancang, mathentheng, malang kadhak/kerik | `POSE` | I |
| Simpingan | berderet di debog, kanan = raja, satria, putran, putren; kiri = raksasa dll. Membelakangi tempat perkeliran, ditata menurut tinggi | `bakeSimpingan` | S, L |
| Kelir, debog | kain putih di gawangan, lis hitam atau merah; batang pisang | `bakeKelir` | L, I |
| Blencong | lampu tembaga/kuningan berminyak kelapa di atas dalang, kini sering listrik | `BLENCONG` | M, L, I |
| Sisi tonton | pagelaran dari arah bayangan diakui; raja di kiri kelir saat direkam dari sisi bayang | starter, `PIHAK` | I |
| Bayangan | "membesar dan kabur" tercatat sebagai bahasa gerak; rumusnya fisika proyeksi | `proyeksi` | I |
| Gunungan | kerucut/gunung; gerbang + dua penjaga, kalpataru dililit naga, harimau-banteng, kera, burung; sisi lain api. Di tengah sebelum lakon, condong; dicabut + disisihkan ke kanan; kembali ke tengah saat tamat (*tancep kayon*). Menanda buka, tutup, ganti adegan; angin, laut, gunung; dibalik = api | `rancangKayon`, starter | K |
| Tatah | sedikitnya 14 unsur: bubukan, semut dulur, langgatan, bubukiring, inten-intenan, langgat bubuk, sembuliyan, kawatan, seritan, patran, semen, srunen, wajikan, mas-masan. Bubukan = bulat kecil. Mas-masan untuk perhiasan, seritan rambut, tratasan + bubukan garis | `TATAH` | [P2K/Dinas Kebudayaan DIY](https://p2k.stekom.ac.id/ensiklopedia/Tatah_Sungging), [UGM](https://journal.ugm.ac.id/v3/DB/article/download/5725/2012), [BSE Pengetahuan Pedalangan](https://epaper.myedisi.com/bse/54004/index_40.html) |
| Panakawan | Semar, Gareng, Petruk, Bagong: hidung, mata, bahu khas per tokoh | tidak dibuat | W, S |

## Akurasi: pilihan dan penyederhanaan

- **Golongan, bukan tokoh.** Alusan ≠ Arjuna, raksasa ≠ Rahwana. Bila narasi menyebut tokoh bernama: butuh ikonografi tertentu (sumping, wanda, praba), dan generator ini tidak memberinya.
- **Rupa tatah.** Nama + kegunaan bersumber untuk bubukan, mas-masan, seritan, tratasan. Rupa `inten` dan kuntum `masmasan` dirancang dari namanya: naskah acuan (Sagio & Samsugi 1991, *Wayang kulit gagrag Yogyakarta*) tidak terbaca di riset ini. Tata letak motif per bagian tubuh rekaan.
- **Kanan/kiri kayon.** Sumber menyebut condong dan disisihkan "ke kanan" tanpa menyebut dari sisi siapa. Starter membacanya sisi dalang, jadi di sisi bayang tampak ke kiri.
- **Kemiringan tiap pathet** (nem kanan, sanga tegak, manyura kiri) hanya dari artikel populer ([Mojok](https://mojok.co/terminal/gunungan-penanda-waktu-pagelaran-wayang-dan-simbol-kehidupan/)): tidak dipakai.
- **Tuding vs cempurit.** I: gapit dan tuding batang terpisah; W menyebut cempurit penjepit. Sumber lain: cempurit terdiri dari tuding dan gapit. Dokumen ini mengikuti I.
- **Jumlah sendi lengan** tidak tertulis di sumber yang terbaca, kecuali UNESCO "swivelling arms". Dua sendi (bahu, siku) dari brief riset §7 dan pengetahuan umum; periksa dengan pemilik atau dalang.
- **Tinggi relatif** putri < alusan < gagahan < raksasa dari S; angkanya rekaan. Gunungan 1,5× alusan rekaan.
- **Prada tubuh** sisi dalang dari S (Sukasman via Ismunandar). Warna kain bukan pakem tokoh.
- **Kedip + jarak lampu** rekaan fisika. Museum menekankan api dijaga stabil oleh penyimping; kedip kuat di starter = pilihan dramatis.
- Lembar kontak perlu vonis pemilik atau pedalang sebelum klaim "sesuai pakem" dibawa ke penonton.
