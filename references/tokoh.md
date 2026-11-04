# Rig tokoh v2 (`tokoh.*`)

Tokoh Jawa kuno 100 % kode yang bukan manekin: rangka 2,5D + slot + IK dua tulang + pustaka pose, bagian tubuh bezier yang
dirancang (bukan kapsul), tiga arah pandang, kostum Jawa kuno, kerumunan ber-seed. Sumber:
`src/runtime/tokoh.js`, blok `<wv:tokoh>`. Bukti jalan: `assets/katalog-tokoh.html` (empat tableau, 28 dtk). Satu global, `tokoh`.

**Memasang di starter**: penanda `/* <wv:tokoh> … */` + baris kosong + `/* </wv:tokoh> */` SESUDAH blok `pustaka`, lalu
`node scripts/build-starters.mjs`. Butuh `atmosfer`; `pustaka` untuk kain bermotif; `cahaya-2d` bila cahaya = nama `SUMBER`.

## Kontrak

- **Diam = SVG, bergerak = kanvas.** `buat(o)` → string SVG tokoh dalam pose awal (still, thumbnail, tokoh diam; `rim()`/`bayangan()`
  cahaya-2d boleh dipasang padanya). `gerak(bidang, daftar, o)` → SATU `<canvas class="wv-tokoh">` per bidang yang dihapus penuh dan
  digambar ulang dari `tl.time()` tiap frame. Jangan menganimasikan transform `<g>` di svg bidang: lihat Determinisme.
- Koordinat tokoh: tinggi 1000, telapak di y 0, `(x, y)` = titik tanah di tengah kaki (px bidang), `tinggi` = px.
- Rangka: `panggul perut dada leher kepala`, `lengan hasta tangan`, `paha betis kaki` (akhiran `D` dekat kamera, `J` jauh), `sampurD/J`
  (ayun sekunder). Tulang berarah 3D (sagital θ + lateral λ) diproyeksikan menurut `arah`: satu pose terbaca di tiga pandang.
- **Deterministik**: opsi + seed + `LANGIT` sama → SVG sama byte demi byte; `pose(id, kunci, t)` fungsi murni waktu (jalur seek
  apa pun). Kanvas di bidang tersembunyi (`display:none` pada leluhur) menggambar pose t 0 sekali, lalu diam.

## API

| Panggilan | Hasil |
|---|---|
| `buat(o)` | string `<g id class="wv-tokoh" data-tokoh>`; slot `#id-<slot>` ber-`transform="matrix(…)"` |
| `gerak(bidang, [{…o, kunci}], {cahaya, lantai, rim:4, gelap:.55, panjang:.6, resolusi:1})` | `<canvas class="wv-tokoh">` di `<div data-z>`. `cahaya` = nama/larik nama `SUMBER` atau `{x,y}`: arah rim dihitung tiap frame dari posisi tokoh; `lantai` (y) = bayangan jatuh; `resolusi` 1,5 untuk close-up |
| `kerumunan({seed, n, area:[x,y,w,h], ragam, arah, hadap, tinggi, detail:0, cahaya, jarak, id})` | larik opsi tokoh (untuk `gerak`/`buat`): tinggi, badan, arketipe, pandang, pose, fase napas beragam; urut kedalaman |
| `pose(id, kunci, t)` | `{akar, m, q, W, F, tangan, duduk}`: matriks slot (string + angka) |
| `ik(L1, L2, tx, ty, sisi)` | `[a1, a2, sendi x, y, ujung x, y]`; sudut dari arah bawah ke +x; di luar jangkauan dijepit lurus |
| `POSE`, `ARKETIPE`, `RIG` | data; `RIG[id].slot` = urutan gambar |

**Opsi `buat`/anggota daftar**: `x y tinggi` · `arketipe` `rakyat raja prajurit resi petani putri` · `arah` `tigaperempat depan samping`
· `hadap` `kanan kiri` · `pose` · `seed` · `detail` 2 (penuh: kain bermotif `pustaka.kain`, perhiasan, garis anatomi) / 1 (tanpa
motif) / 0 (siluet + rim salinan bergeser, untuk kerumunan) · `cahaya` · `jarak` (z bidang → `warnaJarak`) · `id` · `badan` (lebar)
· `kulit` · `kostum` (menimpa kunci `ARKETIPE`, mis. `{bawa:['payung',null]}`) · `fase` (napas). Opsi salah → `Error('tokoh.buat: …')`
yang menyebut pilihan sah.

## Pose dan kunci gerak

`kunci = [[t, pose, {…}], …]` urut waktu; transisi ke kunci i mulai di `t_i` selama `durasi` (.6, smoothstep). Pose: `berdiri`
(kontrapposto), `menunjuk`, `sembah` (telapak bertemu di depan dagu, siku rapat), `tombak` (gagang benda di tanah), `bawa` (benda
ikut genggaman), `bersila`, `silasembah`, `meraih` (IK), dan `jalan`. Opsi kunci: `laju` (px tokoh/dtk, 220), `langkah` (300),
`angkat` (58), `ayun` (20°) untuk `jalan`; `ik:{tanganD:[maju, tinggi]}` (px tokoh dari telapak) + `sudutTangan`; `tangan:[D, J]`
(`terbuka genggam tunjuk sembah`); `benda:0` = benda di tangan dilepas. Napas, kepala, dan ayun sampur selalu hidup (fungsi `t` +
`fase`).

**Jalan tanpa selip**: fase = jarak tempuh / (2 · langkah), jarak = ∫ laju · bobot transisi (analitik), telapak tumpu = IK ke titik
pijak, panggul setinggi kaki tumpu sanggup (naik-turun 2× per siklus). Akar maju `laju · sin(pandang)`: berjalan di samping/tiga
perempat, bukan ke arah kamera.

## Contoh

```js
sumber('obor1',{x:900,y:640,bidang:B,warna:'#ffa055',jangkau:440,kedip:.35,seed:3});
tokoh.gerak(B,[
  {id:'ronda',arketipe:'prajurit',arah:'samping',x:250,y:1000,tinggi:640,
   kunci:[[0,'tombak'],[1,'jalan',{laju:270,tangan:['genggam','terbuka']}],[7,'tombak']]},
  ...tokoh.kerumunan({seed:11,n:24,area:[60,930,1800,130],ragam:['rakyat','petani','prajurit'],arah:'depan',tinggi:430})
],{cahaya:'obor1',lantai:1000});
svgDi(B2,tokoh.buat({arketipe:'resi',arah:'depan',x:300,y:990,tinggi:560,cahaya:'obor1',id:'resiDiam'}));   // tokoh diam
```

Benda yang diletakkan (sesaji): titik genggam = `W · q[slot 'bawaD']` dari `pose(id, kunci, tLepas)`; salinan statis di sana, tampil
lewat `tl.set` di `tLepas` + kunci `{benda:0}` (katalog tableau C).

**Rupa** (kanvas, detail ≥ 1): bagian berwarna rata bernada malam — gradien per segmen membuat manekin kayu bersendi bola (terukur di
katalog) — lalu SATU gradien layar per tokoh searah cahaya (hangat → gelap) + oklusi tanah, `source-atop`; pendar rim buram di bawah,
pita rim tajam di atas, bayangan jatuh di lantai. SVG `buat()` = warna rata saja: pasang `rim()`/`bayangan()` cahaya-2d sendiri.

## Determinisme (diukur 3 Nov 2026: jalur seek berbeda ke detik yang sama, hash PNG)

- Transform `<g>` tiap frame di `<svg>` ber-`will-change` (rencana awal): tepi ±1–2 (raster dirty-rect); tokoh ber-`rim()`/
  `bayangan()` ±12 di jalur berurutan (= ekspor); di svg ber-`relief()` derau ±2; svg tanpa `will-change`, kamera bergerak: ±22;
  rect pembatal penuh: ±58. **Kanvas yang dihapus penuh: identik** (`test-starters` membandingkan tiap kanvas `#stage`; di bingkai
  katalog, piksel di dalam siluet tokoh ≤ 8 beda dari ≥ 105 rb px pada t 5/12/19/25 lewat tiga jalur).
- Sisa beda di bingkai dulu = latar, bukan tokoh (katalog: maks 84; pustaka 76–97). Akar (terukur, `evals/bukti/2026-11-03-babak-sinematik`):
  lapisan `will-change` (svg bidang, kabut, pendar) dirasterisasi saat DIBUAT lalu hanya ditransform, jadi seek langsung, lompat mundur,
  dan tiba berurutan (juga worker ekspor kedua) membuat lapisan pada kamera berbeda. Viewport sebelum `goto` tidak mengubahnya. Obat:
  semua yang ikut kamera = bitmap tetap yang ditransform kompositor: svg bidang `panggang()` ke kanvas GPU (blok `babak`), kabut dan
  pendar = kanvas (runtime).

## Jebakan

- `gerak()` menyampel semua kunci tiap 0,25 dtk untuk ukuran kanvas: kunci sesudah `sampai` (30 dtk) tidak ikut terukur.
- Bayangan butuh sumber titik (`SUMBER` atau `{x,y}`); `cahaya:{arah}` = rim saja.
- Benda selalu tegak. `tongkat`/`cangkul` selalu bertumpu di tanah; `tombak`/`payung` di tanah pada pose `tombak`, ikut genggaman
  di pose lain; `perisai`/`sesaji` ikut genggaman. Belum ada: mendayung, menunggang (butuh benda bersudut).
- Panel kain menempel di paha (ikut ayun); pose `duduk` menukarnya dengan `pangku` dan menyembunyikan wiron + sampur.
- Biaya (HD 4000, mesin senggang, 4 Nov 2026): tokoh detail 2 = ±14 ms/frame (±60 isi dua kali, 2 blur diklip ke kotaknya); kerumunan
  detail 0 tanpa blur. Tableau 6 tokoh detail 2 = 290 ms/frame (tanpa tokoh 208, batas 350); babak 1 tokoh = 222 ms. Render lain yang jalan
  bersamaan menambah ±18 % (tableau yang sama sebelum klip: 437 vs 371). Tanpa klip tiap blur memproses selebar kanvas (+80 ms di
  tableau, ): blur kanvas baru selalu diklip ke kotak isinya. Batas jumlah tokoh per bingkai belum diukur.

## Akurasi budaya — yang pasti dan yang diragukan

- **Busana dasar**: pria bertelanjang dada, kain sampai lutut (rakyat, prajurit, petani) atau mata kaki (raja, resi, putri), sabuk,
  sampur di pinggul — umum di arca dan relief Mataram Kuno hingga Majapahit. Wiron (lipit depan) penyederhanaan.
- **Mahkota** raja = kirita makuta silinder bertingkat + sumping; **jamang** = diadem bangsawan/putri; **jata** = sanggul rambut
  pertapa (resi) dengan jenggot dan upawita (tali kasta). Bentuk ikonik, bukan salinan arca tertentu.
- **Kemben** putri adalah konvensi ilustrasi modern: arca dan relief masa itu umumnya menggambarkan dada terbuka dengan perhiasan.
  Dipilih demi kepatutan penonton; tulis sebagai konvensi bila klaimnya penting.
- **Payung** kebesaran (chattra) tampil di relief Borobudur; bentuk bertingkat bersulur = gaya kemudian. **Keris** berwarangka
  ladrang di pinggang belakang = cara pakai Majapahit dan sesudahnya; untuk Mataram Kuno diragukan. **Perisai** daun memanjang dan
  **tombak** berumbai = umum.
- Kain bermotif memakai `pustaka.kain`: kawung (raja) dan ceplok (putri) tampil pada arca era Hindu-Buddha; parang/truntum
  anakronistis — jangan dipakai untuk tokoh pra-Islam.
- **Sembah** (añjali, telapak bertemu di depan wajah) dan duduk **bersila** tampil di relief Borobudur/Prambanan. Aturan tinggi
  sembah menurut jenjang = tata krama keraton kemudian (Mataram Islam): katalog memakai dagu tanpa klaim jenjang.
