# Pustaka aset Jawa kuno (`pustaka.*`)

Generator prosedural ber-seed untuk adegan sejarah Jawa 100 % kode: candi, gapura, rumah panggung, beringin, lontar, gunung,
sawah, obor/api/asap, relief, kain. Sumber: `src/runtime/pustaka.js`, blok `<wv:pustaka>`. Bukti jalan:
`assets/katalog-pustaka.html` (tiga tableau, 26 dtk). Satu global saja, `pustaka`.

**Memasang di starter**: tulis penanda `/* <wv:pustaka> … */` + `/* </wv:pustaka> */` SESUDAH blok `pasca` (di atas
`const tl=`), lalu `node scripts/build-starters.mjs`. Butuh blok `atmosfer` (dan `cahaya-2d` bila cahaya = nama sumber).

## Kontrak

- Generator markup **mengembalikan string SVG**, tanpa menyentuh DOM. Sisipkan ke `<svg viewBox="0 0 1920 1080"
  style="will-change:transform">` di bidang `[data-z]` (helper `bidang()`/`svgDi()` katalog: salin).
- Hasilnya `<g id class="wv-pustaka" data-pustaka="candi" transform="translate(x,y) scale(tinggi/1000)">`. `(x, y)` = titik
  dasar tengah (tanah), px bidang. `tinggi` = tinggi aset dalam px.
- **Deterministik**: seed + opsi + cahaya + `LANGIT` sama → string sama byte demi byte. id = `opsi.id` atau hash opsi, jadi
  dua aset beda tak bertabrakan id dan pemanggilan ulang tidak menggeser id.
- **Dipanggang**: warna, rim, dan volume ditulis sekali. Jangan menulis ulang `d` per frame (techniques.md §7d). Gerak = transform
  bidang/kamera; yang berubah tiap frame hanya kait kanvas (`api`, `asapHidup`).
- `'#<id>-k'` = clipPath siluet aset di ruang svg → `redup(svg, ['obor1'], {klip:'<id>-k'})`. Beberapa aset: gabung
  `innerHTML` clipPath-nya ke satu `<clipPath>` (lihat `klip()` di katalog).

## Opsi bersama

Berlaku untuk generator markup; `asap` tanpa `detail`, `kain` hanya `seed`/`warna`/`id`, kait kanvas punya opsinya sendiri.

| Opsi | Arti |
|---|---|
| `x`, `y`, `tinggi` | posisi dasar tengah dan tinggi (px bidang) |
| `seed` | bentuk acak (sama = sama) |
| `detail` | `0` siluet, `1` sedang, `2` penuh. Bawaan dari `jarak`: ≤ −600 → 0, ≤ −250 → 1, selain itu 2 |
| `cahaya` | `'obor1'` (nama `SUMBER` cahaya-2d: arah, warna, meredup di luar `jangkau`) · `{x,y,warna,kuat}` (titik, px bidang) · `{arah,warna,kuat}` (derajat, sama dengan `arah.az` `relief()`: 0 kanan, 90 bawah, 180 kiri, 270 atas). `kuat` 0..1, bawaan .75. Bawaan: `{arah:235}` warna `LANGIT.warnaMatahari` |
| `jarak` | z bidang. Semua warna lewat `warnaJarak(c, jarak, −2000)` → makin jauh makin larut ke `LANGIT.horizon` |
| `warna` | warna bahan (menimpa bawaan andesit/bata/kayu/daun/batu) |
| `id` | id `<g>` sendiri (untuk `relief()`/`rim()`/`redup` klip) |

Opsi asing, enum salah, bukan angka, warna bukan `#rrggbb`/`rgb()` → `Error('pustaka.candi: …')` yang menyebut pilihan sah. Rupa: siluet gelap + gradien volume searah cahaya + **rim** (salinan siluet digeser ke cahaya, tanpa filter) + lis
terang/bayang di bawah tonjolan.

## Generator

| Panggilan | Opsi khusus (bawaan) | Catatan |
|---|---|---|
| `candi(o)` | `varian` `'andesit'`/`'bata'` | andesit = Mataram Kuno: kaki + tangga, tubuh berpintu, kala tanpa rahang + makara, atap 3 tingkat ber-ratna. bata = Majapahit: kaki berteras, ramping, kala berahang, atap 6 tingkat bersimbar. Detail 2 = pola nat |
| `gapura(o)` | `varian` `'bentar'`/`'paduraksa'`, `celah` 170 | bentar ala Wringin Lawang (sisi dalam rata); paduraksa ala Bajang Ratu (pintu tembus, kala, sayap) |
| `rumahPanggung(o)` | `tangga` 1, `lampu` 0 | ala relief Borobudur: umpak, atap pelana ijuk berbubungan melengkung; `lampu:1` = pintu/jendela menyala |
| `beringin(o)` | — | banir, dahan, tajuk bergerigi daun, akar gantung (yang sampai tanah menebal) |
| `lontar(o)` | — | daun kipas menjari (bukan kelapa), daun kering menjuntai, bekas pelepah |
| `gunungBerlapis(o)` | `lebar` 2880, `lapis` 3, `puncak` 2 | lapis jauh = gunung api (kawah, alur lereng), lapis dekat = bukit; kaki tiap lapis berkabut. `puncak:0` = bukit saja |
| `sawahTerasering(o)` | `lebar` 1800, `baris` 9 | petak air memantulkan langit (± 60 %) dan petak tanam bergaris padi, pematang gelap, kilau di tepi jauh air |
| `obor(o)` | `jenis` `'tiang'`/`'dinding'`, `kolam` 0 | badan saja; nyala di `(x, y − tinggi)` lewat `api`. Cahaya bawaan dari atas (nyalanya sendiri) |
| `asap(o)` | `angin` .35 | kepulan statis (gumpal bergradien); untuk kejauhan/still |
| `relief(o)` | `lebar` 900, `isi` `'prosesi'`/`'kalpataru'`/`'perahu'` | panel batu berbingkai, pahatan timbul dengan bevel dipanggang (detail 0 = panel polos); `(x, y)` = tengah bawah. BUKAN `relief()` cahaya-2d (filter) — keduanya bisa ditumpuk |
| `kain(o)` | `motif` `'kawung'`/`'parang'`/`'ceplok'`/`'truntum'`, `skala` 1, `sudut` 0, `warna` [latar, motif, aksen] | mengembalikan `<pattern id>` (ubin 40 px): taruh di `<defs>`, pakai `fill="url(#id)"` (kostum 4b) |

**Kait kanvas** (sekali saat setup; menggambar ulang dari `tl.time()`, kanvas dihapus penuh tiap frame — deterministik):

- `pustaka.api(bidang, [[x,y],[x,y,skala]], {tinggi:74, lebar:15, seed})` → `<canvas class="wv-api">` screen di bidang.
  Bentuk & kedip nyala starter-sinematik. Seed beda per halaman obor supaya tak serempak.
- `pustaka.asapHidup(bidang, {x,y,tinggi:400,angin:.35,n:14,seed,jarak,warna})` → `<canvas class="wv-asap">`: gumpal lahir
  di `(x, y)`, naik, melebar, hanyut. Untuk asap tebal yang luas pakai `partikel({jenis:'asap'})` atmosfer.

Keduanya menggambar tiap frame, tersembunyi sekalipun: hitung ke anggaran partikel/kanvas halaman (§7d).

## Contoh

```js
langit({horizon:'#8a4f66'});                        // 1. langit dulu: warna aset dipanggang dari LANGIT saat dipanggil
const B=bidang(-280);
sumber('oborA',{x:690,y:720,bidang:B,warna:'#ffa055',jangkau:380,kedip:.35,seed:3});
const svg=svgDi(B,pustaka.gapura({x:900,y:935,tinggi:660,varian:'paduraksa',id:'gp',cahaya:'oborA'})+
  pustaka.obor({x:690,y:935,tinggi:190,kolam:1}));
relief($('#gp'),{sumber:'oborA',tinggi:4});        // 2. kilap nat bata dari cahaya-2d (dipanggang)
redup(svg,['oborA'],{klip:'gp-k'});                 //    gelap menjauhi obor, hanya di bentuk gapura
pustaka.api(B,[[690,745]],{seed:2});                // 3. nyala di ujung obor (y − tinggi)
svgDi(bidang(-900),pustaka.candi({x:1500,y:790,tinggi:460,varian:'bata',jarak:-900,cahaya:{x:1500,y:160}}));
```

## Jebakan

- **`LANGIT` dibaca saat dipanggil.** Adegan berganti langit: set `LANGIT` adegan itu, bangun asetnya, lalu kembalikan;
  pergantian sungguhan = `tl.set(LANGIT, …, t)` (katalog).
- **Senja**: cakrawala terang ≠ warna kabut. Set `LANGIT.horizon` ke kabut kusam selama membangun aset jauh, lalu kembalikan;
  kalau tidak gunung dan sawah larut jadi satu warna jingga datar.
- **Dipanggang dalam keadaan tampil**: `relief()`/`rim()` cahaya-2d membaca kotak elemen. Sembunyikan adegan lain SESUDAHNYA,
  dengan `display:none` pada bidang — bukan opacity (meratakan paralaks).
- Ukuran markup (detail 0/1/2): beringin 24/64/91 KB, sawah 20/30/42 KB, gunung 8/15/24 KB, lainnya ≤ 12 KB. Statis = dirasterisasi
  sekali, tetapi DOM besar memperlambat setup: pakai detail rendah untuk yang jauh/kecil (bawaan dari `jarak` sudah begitu).

## Akurasi budaya — yang pasti dan yang diragukan

- **Kala-makara**: Jawa Tengah (Mataram Kuno) = kala tanpa rahang bawah + makara di kaki bingkai; Jawa Timur (Majapahit) =
  kala berahang, makara jarang. Generator mengikuti pembagian itu; bentuknya ikonik, bukan salinan arca tertentu.
- **Gapura**: bentar/paduraksa bata dari situs Trowulan. Proporsi diperkirakan dari foto, bukan ukuran situs.
- **Rumah panggung**: atap pelana berbubungan melengkung + tebeng condong mengikuti penggambaran umum relief Borobudur.
  Variasinya di relief banyak (ada atap limasan, lumbung); ini satu tipe saja.
- **Kain**: kawung dan ceplok tampil pada arca era Hindu-Buddha; **parang dan truntum** menurut tradisi lahir di Mataram Islam/
  Surakarta (abad XVI–XVIII) — **anakronistis** untuk Majapahit/Mataram Kuno. Warna bawaan (soga, nila) gaya keraton kemudian.
- Bukan rekonstruksi arkeologis: untuk klaim spesifik (nama candi, motif arca tertentu) periksa sumber.
