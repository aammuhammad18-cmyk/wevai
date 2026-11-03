# Lukis — gaya painterly (Kuwahara / cat air) tanpa "mendidih"

Dibaca HANYA untuk gaya painterly: beat legenda, kilas balik, "kisah dari masa lampau". Contoh hidup: `assets/starter-lukis.html`
(16 dtk, "Desa di kaki gunung" saat senja). Bukti dan angka: `evals/bukti/2026-11-03-lukis/`. Kontrak = komentar kepala
`src/runtime/lukis.js` (blok `<wv:lukis>`, butuh blok `atmosfer`).

## Kenapa tidak mendidih

Filter layar yang dijalankan tiap frame atas dunia yang bergerak membuat sapuan berganti tiap frame: "mendidih" (*boiling*).
Gaya ini melukis tiap bidang **sekali saat setup**, ke kanvasnya sendiri, lalu kamera 2.5D hanya menggeser kanvas itu. Sapuan
menempel pada lukisan seperti latar film animasi lukis tangan di kamera multiplane.

1. **Bidang statis** = `lukis.bidang(el, markup)`. Markup SVG (aset `pustaka.*`, path sendiri) dirasterisasi, dilukis di WebGL2,
   ditaruh di `<canvas class="wv-lukis">` dalam bidang `[data-z]`. Per frame: nol kerja, hanya transform kamera.
2. **Yang hidup** (orang, burung, asap, kabut) = `lukis.sprite()`: tiap POSE dilukis sekali, lalu digerakkan dengan transform/opacity
   (GSAP atau fungsi murni `tl.time()`), dan pose diganti `lukis.siklus()` ("on twos" ala gambar tangan, bukan derau per frame).
3. **Semua derau = fungsi koordinat objek (px bidang) + seed**, tidak pernah posisi layar atau nomor frame. Kisi derau dari hash
   bilangan bulat (pcg3d), sama persis di GPU mana pun (bukan hash `sin()`).
4. **Dilarang**: menulis ulang kanvas lukisan per frame; filter CSS/SVG ber-seed waktu di view/rig; tekstur layar yang diam
   (*shower door*: lukisan bergeser di balik kertas yang diam); `grainHidup` (melompat 12×/dtk). Butir = kertas yang ikut bidang.
   Teks tetap DOM tajam di `#ui`, tidak pernah dilukis.

Diuji (`scripts/test-starters.mjs`): kamera ditahan + waktu maju 1/60 dtk = piksel identik; bidang = dirinya tergeser tepat saat
kamera digeser; dua mutasi (filter layar ber-seed per frame, tekstur layar diam) wajib tertangkap; `LUKIS_UJI`: markup sama di kotak
tergeser = piksel sama di ruang objek (mutasi derau berkoordinat kanvas tertangkap).

## API

| Panggilan | Isi |
|---|---|
| `lukis.bidang(el, markup, opsi)` | → `<canvas class="wv-lukis">` di `el` (div `[data-z]`). Kotak bawaan = frame + `pad` (atribut `data-penuh`: wajib menutup frame sepanjang gerak kamera, diuji) |
| `lukis.sprite(el, markup \| [pose…], {kotak, …})` | → `<div class="wv-lukis-sprite">`, satu kanvas per pose (pose 0 tampil). `kotak` wajib. Seed sama untuk semua pose: sapuan di bagian yang sama tidak berganti saat pose berganti. Gerakkan div-nya |
| `lukis.siklus(sprite, fps, {fase})` | pose aktif = `floor(t·fps + fase) mod n`, fungsi murni `tl.time()` |
| `lukis.siap()` | → Promise: semua kanvas yang diantre selesai dilukis, konteks GL dilepas. Galat = reject. `OPENER.ready` menunggunya |
| `lukis.pose(t, fps, n, fase)`, `lukis.PALET`, `lukis.dokumen()`, `lukis.opsi()` | murni; diuji `scripts/test-lukis.mjs` |

Markup memakai koordinat px bidang (sama dengan `<svg viewBox="0 0 1920 1080">` bidang lain), mandiri: tanpa teks/font, tanpa
`foreignObject`, tanpa referensi berkas luar (dirasterisasi sebagai gambar SVG lewat Blob URL).

## Kenop

Bawaan = bidang tengah, cat air. Opsi asing atau di luar rentang → `Error('lukis.bidang: …')` yang menyebut pilihan sah.

| Kenop | Bawaan | Arti |
|---|---|---|
| `kuas` | 6 | jari-jari Kuwahara (px). Besar = sapuan lebar, detail tipis hilang. 0 = tanpa Kuwahara (cuci saja) |
| `panjang` | .6 | sapuan memanjang di bidang datar (0 bulat … 1 garis) |
| `arah`, `liuk` | 0°, .3 | arah sapuan di bidang datar (0 = mendatar) dan liukannya. Dekat tepi bentuk, sapuan mengikuti tepi (tensor struktur) |
| `tajam` | 8 | q Kuwahara: tinggi = petak sapuan bertepi tegas |
| `variasi` | .14 | kepekatan pigmen bervariasi per guratan + hangat/dingin |
| `sapuan` | .25 | jejak bulu kuas sepanjang arah sapuan |
| `tepi` | .6 | tepi cat air menggelap (pigmen berkumpul di tepi basah), tak rata |
| `butir` | .5 | granulasi: pigmen mengendap di lembah kertas |
| `aliran` | .3 | cuci tak rata (kepekatan frekuensi rendah) |
| `basah` | .3 | rembesan di tepi bentuk + mekar/*backrun* bertepi di cuci opak (langit) |
| `goyang` | 1.5 | tepi bergoyang (px) |
| `kertas` | .5 | relief kertas tampak, terutama di sapuan muda |
| `palet`, `nada` | `'senja'`, .25 | peta luminans → warna palet `[gelap, tengah, terang]` dicampur sebesar `nada`. `senja` (legenda), `kenang` (sepia kilas balik, `nada` .6–.9), `fajar`; atau larik `#rrggbb` |
| `seed` | urutan panggilan | sapuan lain per bidang; bidang berbeda wajib seed berbeda (bawaan sudah) |
| `pad`, `kotak` | 160, frame + pad | luas yang dilukis (px bidang). `pad` ≥ geser kamera terbesar di bidang itu |
| `res` | 1 | resolusi kanvas. Dolly sampai `zoom` z: `res` ≈ z supaya kertas tak lunak |

Patokan per bidang (starter): langit `kuas 9, panjang .9, basah .85, aliran .6, tepi .25`; gunung jauh `kuas 7, variasi .2,
butir .8`; bidang ramai/detail `kuas 4`; latar depan gelap `kuas 5, variasi .2, sapuan .4, tepi .9`; sprite kecil `kuas 1.5–3`.

## Palet senja (legenda)

| Peran | Warna | Catatan |
|---|---|---|
| langit atas → tengah | `#1f2350` → `#3a3a6e` → `#7a5a86` | nila ke ungu; awan `#3a3668`–`#56477a` |
| cakrawala | `#d48a7e` → `#f2b585` → `#f8d4a0` | merah jambu ke aprikot; awan dekat matahari `#e3967f`, sisi bawah `#f6b48c` |
| matahari | `#fff6e2` (kertas), pendar `#ffdca8` | cahaya aset `{x, y, warna:'#ffcf96'}` |
| kabut jarak (`LANGIT.horizon` saat membangun aset jauh) | `#9d7d92` | ungu kusam: gunung tidak larut ke aprikot |
| gunung, bukit | `#4e4166`, `#33404c` | dingin; latar depan `#241a22`, daun `#262a26` |
| palet nada | `senja` `#2a2036` · `#9c6b70` · `#f7dcb0` | `nada` .15–.3 menyerasikan |

Kilas balik: adegan yang sama dengan `palet:'kenang', nada:.7–.8` di setiap bidang dan sprite (sepia, satu nada); starter: `?kenang=1`.

## Resep

1. **Langit dilukis, bukan `langit()`.** Cuci gradien + awan yang dikaburkan `feGaussianBlur` (= basah) + pendar; matahari = kertas
   tak dicat. `langit()` WebGL halus di belakang lukisan terbaca digital.
2. **Aset dari `pustaka.*`** dengan `cahaya` ke matahari (rim), `jarak` = z bidang. Senja: `LANGIT.horizon` = kabut kusam saat
   membangun aset jauh, cakrawala terang saat membangun air sawah (`pustaka.md` Jebakan). `detail:1` pada gunung jauh = alur lereng
   yang diikuti sapuan.
3. **Satu kanvas per bidang**: gabungkan semua markup bidang itu dalam satu `lukis.bidang()`.
4. **Sprite**: orang = siluet umum tanpa wajah, rim ke arah matahari, kaki/lengan sebagai garis bersendi; jalan = 8 pose, `siklus`
   6 fps + tween x linear. Asap = beberapa gumpal (sprite) dengan fase sendiri, posisi/skala/opacity fungsi murni `tl.time()`.
5. **Kamera** pelan: geser + dolly ≤ 1,1 (bitmap diskalakan). Legenda DOM di `#ui` di atas kantong gelap (starter: tebing gelap kiri
   bawah sebagai *repoussoir*; air sawah yang terang di bawah teks = gagal kontras).
6. **Siap**: `Promise.all([document.fonts.ready, lukis.siap()]).then(…OPENER.ready=true…)`.

## Biaya

Diukur di mesin acuan (i3-3217U, HD 4000) SAAT render pemilik berjalan, jadi batas atas (rincian: `evals/bukti/2026-11-03-lukis/`).

| Ukuran | Nilai |
|---|---|
| per frame (seek + 2 rAF + screenshot JPEG, median 10 frame) | **197 ms**; `starter-sinematik` di sesi yang sama 257 ms. Bidang lukisan = bitmap diam, tak ada shader/filter per frame |
| siap (muat + lukis 5 bidang + 22 kanvas sprite) | 15,5 dtk, sekali per muat (tiap worker ekspor); sinematik 1,5 dtk |
| satu bidang 2240×1400 terpisah | 1,8–2,1 dtk, ±1,6 dtk di antaranya kompilasi shader (konteks dilepas tiap `siap()`); `kuas` 0/3/6/9 tak terbedakan |
| SwiftShader (CI tanpa GPU), satu bidang | 81,7 dtk → starter masuk `BERAT` |

Hemat siap: satu `lukis.bidang()` per bidang (gabungkan markup), sprite sedikit dan kecil, satu `siap()` di akhir (kompilasi sekali).

## Batas dan jebakan

- **Butuh WebGL2 + `EXT_color_buffer_float`**. Tanpa itu: raster mentah tanpa sapuan + `console.warn` sekali.
- **Determinisme**: sama byte di dua muat pada mesin yang sama (diuji `sidik`). Antar-GPU bisa beda di bit terakhir: ekspor di satu
  mesin, seperti modul WebGL lain.
- **Garis tipis hilang** bila `kuas` lebih besar dari ketebalannya (akar gantung, garis padi). Bidang berdetail: `kuas` 3–4.
- **Dolly > 1,1** melunakkan kertas dan sapuan (kanvas = bitmap). Naikkan `res` atau pecah shot.
- **Memori GPU sementara** ±112 MB per bidang 2240×1400 saat dilukis (dilepas sesudahnya); kanvas jadi ±12,5 MB per bidang.
- **Pass berat dipecah per 96 baris + `finish()`**: tidak ada kerja GPU yang mendekati batas TDR Windows (2 dtk).
- **CI tanpa GPU** (SwiftShader): lihat `BERAT` di `scripts/test-starters.mjs`.
- **Jangan** mengubah `opacity`/`filter`/`mix-blend-mode` pembungkus `[data-z]` (meratakan paralaks): efek ke sprite/kanvas di dalamnya.

## Nama global

`lukis` (satu objek) dan kait uji `LUKIS_UJI`. Starter: `desaKakiGunung`.
