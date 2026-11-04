# Wayang kulit (`starter-wayang.html`)

Teater bayangan 100 % kode: kelir diterangi blencong berkedip, figur bertatah tajam saat menempel kelir, membesar dan kabur dekat lampu. `?sisi=dalang`: lukisan prada di depan kelir, dunia tercermin.

Sumber: `src/runtime/wayang.js` (blok `<wv:wayang>`, butuh `atmosfer`). Uji: `scripts/test-wayang.mjs` dan
`WAYANG_UJI` di `test-starters`. Bukti: `evals/bukti/2026-11-03-wayang/`, `evals/bukti/2026-11-04-rupa-budaya/`.

## Kapan dipakai

- Cocok: sisipan legenda dan kisah pewayangan, pembuka bab sejarah Jawa (`babad-jawa-01`): potong ke starter di awal kisah, `kedip` tenang, legenda `#cap` ("Cerita rakyat · bukan catatan sejarah · sumber"), gunungan membuka dan menutup kisah.
- Lemah: data, tokoh sejarah nyata (wayang = tokoh lakon, bukan potret), adegan cepat. Promo: hanya bila dimotivasi.
- Jangan mengklaim ritual (ruwatan, sesaji, makna mistis).

## Rig

```js
wayang.panggung({sisi:'bayang',tinggi:560,dasar:980,seed:5});   // kanvas .wv-wayang di belakang rig; kelir + simpingan dipanggang sekali
wayang.figur({jenis:'gunungan',x:960,miring:-5,seed:3,kunci:[[1.5,{getar:1,miring:0},{durasi:.6}],[1.9,{z:230},{durasi:1.5}],[3.3,{x:-420,z:40},{durasi:1.5}]]});
wayang.figur({jenis:'alusan',x:-220,hadap:wayang.PIHAK.kanan.hadap,seed:11,tanganD:'angapurancang',kunci:[
  [4.5,{x:610},{durasi:2.9,langkah:92,tinggi:11,ayun:1.1}],[10.1,{tanganD:'nuding'},{durasi:1.1}]]});
tl.to(BLENCONG,{kedip:.85,duration:1},11.6);                      // lampu di-tween seperti CAM: nilai MUTLAK
camTo(7.6,1.5,{fx:960,fy:600,zoom:1.3},'sine.inOut');             // kelir mengikuti CAM di dalam kanvas: tetap tajam saat zoom (zoom ≥ 1)
```

Semua sesudah `const tl=`. Bidang `[data-z]` hanya untuk benda di depan lensa.

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

Salah opsi = `Error('wayang.…')` yang menyebut pilihan sah. `panakawan` ditolak dengan alasannya.

## Kenop

| Mau | Ubah |
|---|---|
| Bayangan kabur | `z` 150–300 (`jarak` 620: skala 1,3–1,9; blur 8–23 px) |
| Bayangan lebih keras di semua jarak | `BLENCONG.nyala` kecil (lampu listrik ±8) |
| Api tenang / gelisah | `BLENCONG.kedip` 0,15 / 0,85 |
| Warna sisi dalang | `muka` (`hitam` `merah` `prada` `putih`), warna kain mengikuti `seed` |

## Biaya

Setup: rancang + panggang sprite ±1–2 dtk saat muat (lapis lukis ikut dipanggang: per frame tidak bertambah). Tiap frame: satu `drawImage` kelir, per figur 2–6 sprite + satu blur bila z besar, dua gradien penuh. `bench-frame` (capture, 3 putaran, 4 Nov): sisi bayang 209 ms (208–232), sisi dalang 298 ms (285–314). Batas 350 ms. Bila lewat: turunkan `res` atau `simping:false`.

## Determinisme

Keadaan = `tl.time()` + `CAM` + `BLENCONG`; kunci figur dan kedip murni. Satu kanvas dihapus penuh tiap frame (temuan `tokoh.md`). `test-starters`
membandingkan piksel lewat dua jalur seek; mutasi: `evals/bukti/2026-11-03-wayang/README.md`.

## Batas

- Empat golongan + gunungan gapuran. Panakawan belum ada: bentuknya khas per tokoh.
- Satu debog (bawah); dua debog pagelaran (`debog atas`) belum.
- Satu gaya: terminologi Surakarta, sebagian gerak dari rekaman Yogyakarta. Bali, Cirebon, dsb. berbeda.
- Sunggingan disederhanakan (lapis lukis dipanggang, sisi dalang saja): gradasi bertingkat pada perhiasan dan tepi kain, prada berbintik, drenjeman sedikit; tanpa `tlancap`, `bludiran`, dan `cawi` halus. Badan tetap polos: close-up masih lebih sederhana daripada wayang asli.
- Sisi dalang: dalang sendiri, gamelan, dan sinden belum digambar.

## Pakem dan sumber

Sumber: **[S]** Subagya, "Nilai-nilai Estetis Bentuk Wayang Kulit", *Gelar* 11(2), 2013, ISI Surakarta ([jurnal](https://jurnal.isi-ska.ac.id/index.php/gelar/article/view/1483));
**[W]** Widyokusumo, "Kekayaan Ragam Hias dalam Wayang Kulit Purwa Gagrak Surakarta", *Humaniora* 1(2), 2010 ([PDF](https://journal.binus.ac.id/index.php/Humaniora/article/download/2883/2277));
**[I]** Ismurdyahwati dkk., "Kajian Bahasa Rupa … Parta Krama", *ITB J. Vis. Art* 1D(3), 2007 ([artikel](https://journals.itb.ac.id/index.php/jvad/article/view/672));
**[U]** [UNESCO ICH, Wayang puppet theatre](https://ich.unesco.org/en/RL/wayang-puppet-theatre-00063) (dinyatakan 2003, Daftar Representatif 2008);
**[M]** Museum Sonobudoyo, [Blencong](https://sonobudoyo.jogjaprov.go.id/en/tulisan/read/blencong-cahaya-yang-menghidupkan-bayangan-wayang);
**[L]** Pranata, "Ebleg…", *Lakon* (ISI Surakarta) ([PDF](https://jurnal.isi-ska.ac.id/index.php/lakon/article/download/16-24/3287));
**[Ro]** Rosalinda, *Adaptasi Unsur Rupa Raksasa Wayang Kulit Purwa ke dalam Karakter Visual Raksasa Nusantara*, disertasi ISI Surakarta 2025 ([PDF, versi potongan](https://repository.isi-ska.ac.id/8093/1/DISERTASI%20HERLIYANA%20ROSALINDA%202025%20pot.pdf): intisari, Bab IV–V, glosarium, foto Kumbakarna; Bab II–III tidak termuat);
**[Pb]** Purbasari, "Teknik Pewarnaan Wayang Kulit" dari perajin Tunahan, *Arty* 1(1), 2012, UNNES ([PDF](https://journal.unnes.ac.id/sju/arty/article/download/312/361)): tahapan satu desa, bukan pakem Surakarta;
**[K]** [Wikipedia: Gunungan](https://en.wikipedia.org/wiki/Gunungan) dan [detikEdu](https://www.detik.com/edu/detikpedia/d-7587505/gunungan-wayang-fungsi-jenis-simbol-dan-filosofinya): sekunder, jurnal gunungan yang dicari tidak terbaca.

| Unsur | Pakem | Dipakai di kode | Sumber |
|---|---|---|---|
| Rupa dasar | muka en profil, bahu tampak dua-duanya, lengan dan tubuh dipanjangkan; kaki ± ½ tinggi | semua figur | S |
| Bokongan / jangkahan | bokongan: kaki merapat tertutup kain, pantat tampak (Arjuna, Kresna); jangkahan: kaki melebar, siten-siten lebih panjang (gagahan, raksasa) | `sikap` | S, W |
| Kepala | luruh = menunduk; longok = tidak mendongak/menunduk; lanyapan = mendongak; putri menunduk = oyi | `kepala`, `tunduk` | W |
| Mata | gabahan (Arjuna, bambangan, Kresna, putri); kedhelen (Baladewa, Setyaki); telengan (Bima, Duryudana); plelengan (hampir semua raksasa besar): lingkaran konsentris, deret kelopak, alis sisir, ulir di belakang (bagan W gambar 2). Bola mata merah = identitas raksasa (Ro). Subagya menyebut gabahan sebagai *liyepan* | `mata` | W, S, Ro |
| Hidung | wali miring (kecil/putri); bentulan (ujung golok); pelokan (mangga, raksasa; W gambar 3 menulis *palokan*). Ro menambah *wungkal gerang*: belum dibuat | `hidung` | W, Ro |
| Mulut | gusen: tampak gusi, semua gigi, taring runcing | `mulut` | W, Ro |
| Gelung | cupit urang (Arjuna, Gatotkaca); ukel keyongan (putri); gembel (ikal); garuda mungkur di belakang gelung raja/ksatria | `gelung` | W |
| Perhiasan | jamang, sumping, kelat bahu, gelang, gelang kaki, kalung, uncal; raksasa besar juga celana + uncal wastra | `Pot.kelat`, `gelangKaki`, `uncal` | Ro, Pb |
| Sunggingan | gradasi merah (jambon → merah tua), hijau (dari kuning), jingga (kuning → jingga tua); prada pada atribut + badan; drenjeman = titik hitam; muka raksasa merah; alis, bibir, gigi = perwajahan | `RAMP`, `lukis` | Pb |
| Warna muka | umumnya hitam (dewasa, tenang, sigap); merah muda → tua = makin temperamental (raksasa); prada = wayang brongsong. Makna putih/biru tidak seragam antarsumber: tanpa klaim | `MUKA` | S, W |
| Lengan | satu batang kendali per lengan; raksasa: tangan belakang lazim digambar tetap, malang kerik | `gerak` | S, I |
| Batang | gapit = kendali tubuh; tuding = kendali lengan; keduanya = cempurit; dari tanduk kerbau atau kulit penyu | digambar di bayangan | I, W, [Arty UNNES](https://journal.unnes.ac.id/sju/arty/article/download/312/361) (cuplikan pencarian) |
| Posisi tangan | anjujur, angapurancang, mathentheng, malang kadhak/kerik | `POSE` | I |
| Simpingan | berderet di debog, kanan = raja, satria, putran, putren (urut di kode: gagahan, alusan, putri ke tengah); kiri = raksasa dll. Membelakangi tempat perkeliran, ditata menurut tinggi | `bakeSimpingan` | S, L |
| Kelir, debog | kain putih di gawangan, lis hitam atau merah; batang pisang | `bakeKelir` | L, I |
| Blencong | lampu tembaga/kuningan berminyak kelapa di atas dalang, kini sering listrik | `BLENCONG` | M, L, I |
| Sisi tonton | pagelaran dari arah bayangan diakui; raja di kiri kelir saat direkam dari sisi bayang | starter, `PIHAK` | I |
| Bayangan | "membesar dan kabur" tercatat sebagai bahasa gerak; rumusnya fisika proyeksi | `proyeksi` | I |
| Gunungan | kerucut/gunung; gerbang + dua penjaga, kalpataru dililit naga, harimau-banteng, kera, burung; sisi lain api. Di tengah sebelum lakon, condong; dicabut + disisihkan ke kanan; kembali ke tengah saat tamat (*tancep kayon*). Menanda buka, tutup, ganti adegan; angin, laut, gunung; dibalik = api | `rancangKayon`, starter | K |
| Tatah | sedikitnya 14 unsur: bubukan, semut dulur, langgatan, bubukiring, inten-intenan, langgat bubuk, sembuliyan, kawatan, seritan, patran, semen, srunen, wajikan, mas-masan. Bubukan = bulat kecil. Mas-masan untuk perhiasan, seritan rambut, tratasan + bubukan garis | `TATAH` | [P2K/Dinas Kebudayaan DIY](https://p2k.stekom.ac.id/ensiklopedia/Tatah_Sungging), [UGM](https://journal.ugm.ac.id/v3/DB/article/download/5725/2012), [BSE Pengetahuan Pedalangan](https://epaper.myedisi.com/bse/54004/index_40.html) |
| Panakawan | Semar, Gareng, Petruk, Bagong: hidung, mata, bahu khas per tokoh | tidak dibuat | W, S |

## Akurasi: pilihan dan penyederhanaan

- **Golongan, bukan tokoh.** Alusan ≠ Arjuna, raksasa ≠ Rahwana; tokoh bernama butuh ikonografi tertentu yang tidak diberikan generator ini.
- **Kepala raksasa rekaan bersumber.** Garis profil digambar dari bagan W gambar 2–3 dan foto W gambar 1(2) + Ro tabel 67 (Kumbakarna) sebagai acuan rupa, bukan salinan; proporsi hidung, mulut, jumlah gigi rekaan. Bukan wanda atau tokoh tertentu.
- **Warna raksasa.** Merah sebagai bawaan dari Pb; Ro mencatat ragam (merah, merah muda, emas, cokelat muda, hijau, putih), `muka` tetap bisa diganti. Rambut hitam dari Pb (gimbalan); foto W menampakkan biru tua: sumber berbeda.
- **Pakaian raksasa dan uncal disederhanakan.** Celana + uncal wastra dari daftar Ro, bentuk dari foto. Uncal berlekuk menggantikan rantai berukir. Motif serong pada kain rekaan, bukan motif batik bernama. Tiga bulu garuda mungkur rekaan.
- **Gradasi.** Warna dan urutan dari Pb, tetapi arah (tepi ke dalam) dan pilihan warna per bagian rekaan.
- **Rupa tatah.** Nama + kegunaan bersumber untuk bubukan, mas-masan, seritan, tratasan. Rupa `inten` dan kuntum `masmasan` dirancang dari namanya: naskah acuan (Sagio & Samsugi 1991, *Wayang kulit gagrag Yogyakarta*) tidak terbaca di riset ini. Tata letak motif per bagian tubuh rekaan.
- **Kanan/kiri kayon.** Sumber menyebut condong dan disisihkan "ke kanan" tanpa menyebut dari sisi siapa. Starter membacanya sisi dalang, jadi di sisi bayang tampak ke kiri.
- **Kemiringan tiap pathet** hanya dari artikel populer ([Mojok](https://mojok.co/terminal/gunungan-penanda-waktu-pagelaran-wayang-dan-simbol-kehidupan/)): tidak dipakai.
- **Tuding vs cempurit.** I: gapit dan tuding batang terpisah; W menyebut cempurit penjepit. Sumber lain: cempurit terdiri dari tuding dan gapit. Dokumen ini mengikuti I. Gapit berhenti di dada: pilihan rupa supaya muka tidak tercoret.
- **Dua sendi lengan** dari pengetahuan umum; periksa dengan dalang.
- **Tinggi relatif** dari S; angkanya rekaan.
- **Prada tubuh** dari S. Warna kain bukan pakem tokoh.
- **Kedip** rekaan; museum menekankan api dijaga stabil, kedip kuat = pilihan dramatis.
- Lembar kontak perlu vonis pemilik atau pedalang sebelum klaim "sesuai pakem" dibawa ke penonton. Belum terbaca: Sagio & Samsugi 1991; Soekatno 1992 (lewat kutipan saja).
