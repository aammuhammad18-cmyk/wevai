# Analisis 3D & sinematografi — WeVai + seri China Maju

> Studi kasus di dokumen ini (seri video *China Maju*: berkas `china-maju-seri/…`, lembar kontak, log ekspor)
> adalah proyek video yang dibuat dengan skill ini dan berada di luar repo WeVai. Jalur berkasnya dicantumkan
> sebagai bukti, bukan sebagai isi repo.

Tanggal: 2026-10-03 · Sudut pandang: CTO + produser/sutradara · Cakupan: skill WeVai (sebelum rilis 1.0.0)
(SKILL.md, references, starter, `src/runtime/`, skrip) dan produksi nyatanya, seri *China Maju*
(40 bab × 90 dtk, trailer, `_alat/`, log ekspor). Fakta pustaka/standar ada di dokumen pendamping
[`riset-3d-sinematografi-2026-10-03.md`](riset-3d-sinematografi-2026-10-03.md). Dokumen ini analisis dan usulan; belum ada kode produk yang diubah.

## 1. Ringkasan

- **Kamera hari ini 2D.** Semua kamera hanya geser + skala pada satu grup. Tidak ada perspektif,
  paralaks antarbidang, tilt, roll, orbit, maupun fokus. Akibatnya kamera terasa seperti memperbesar
  ilustrasi, belum seperti bergerak di dalam ruang.
- **Sudut kamera hanya berganti kalau dunianya digambar ulang.** Di dalam satu dunia sudutnya tetap. Contoh terparah, bab 17:
  empat frame kunci (20, 47, 57, 74 dtk) komposisinya identik, 60 detik dari kabin yang sama.
- **Belum ada cahaya yang bercerita.** Suasana dibawa oleh warna medan (bab 2 pindah dari siang krem
  ke malam navy, dan itu bagus), tetapi benda di dalam adegan tidak punya arah cahaya, bayangan, atau
  waktu hari.
- **3D sungguhan terjangkau di mesin ini.** Hasil uji di bagian 5: kota toon 400 gedung pada 1080p diekspor
  3,0–4,3 fps, setara dengan bab SVG sekarang (3,4–5,2 fps). Yang lambat adalah screenshot dan
  JPEG, bukan GPU.
- **Utang yang harus dibayar dulu:** kode kamera disalin di 40 bab dalam dua dialek. Upgrade
  sinematografi yang ditulis 40 kali tidak akan bisa dirawat. Karena itu langkah pertama adalah
  **satu modul kamera** di `src/runtime/`. Setelah itu baru lapisan 3D.

## 2. Keadaan sekarang (fakta dari kode)

**Skill**
- Rig kamera `#world` (geser + skala, `architecture.md`), kosakata ukuran shot wide/MCU/CU
  (`techniques.md` §3b), push-through (§3), pan 3D per kata dengan CSS `rotateY` (§4), menu transisi
  §4c.
- Three.js hanya dipakai sebagai **latar** di `starter-opener.html`: objek `S` (camX/Y/Z, camRoll,
  bloom, shake berbasis sinus) di-tween GSAP, lalu `render(t)` menggambar. Pola ini sudah benar untuk 3D
  deterministik dan tinggal diperluas.
- Enam starter explainer tidak punya jalur 3D. `explainer.md:411` malah menyarankan "lewati Three.js".
- `src/runtime/kamera-kolase.js` = kamera mode kolase (`look/home/into/settle/breath`), juga 2D.

**Seri China Maju**
- 40 bab, SVG murni: 0 bab memakai Three.js, 0 memakai CSS `perspective`.
- Kamera disalin per bab dalam **dua dialek**: `kf()` + `camTo()` (bab 1–15; contoh
  `bab-07-shenzhen/index.html:426`) dan `CAMK` + `camAt()` (bab 16–40; contoh
  `bab-34-yang-gagal/index.html:373`). Keduanya `[t, zoom, fokus x, fokus y]` + smoothstep + napas
  sinus.
- Isometrik digambar manual per sisi (`bab-07 render()`: path kiri/kanan/atas tiap menara dihitung
  tangan). Hasilnya bagus, tetapi tidak bisa diputar dan tidak bisa diterangi.
- Ekspor: 3,4–5,2 fps; 523–797 dtk per bab (log `_ekspor/log.txt`, bab 38–40). Seri penuh sudah
  jadi `_ekspor/china-maju-lengkap.mp4` (3.608 dtk). Catatan: status di `RENCANA.md` ("belum diekspor
  kecuali bab 1") sudah usang.

**Mesin produksi**: Intel i3-3217U (2 core / 4 thread), Intel HD Graphics 4000, RAM 16 GB, ffmpeg
ada, Blender tidak terpasang. WebGL2 aktif lewat ANGLE/Direct3D11 di Chrome headless (terverifikasi).

## 3. Diagnosis sutradara (dari lembar kontak)

| # | Gejala | Bukti | Kenapa terasa murah |
|---|---|---|---|
| S1 | Zoom tanpa paralaks | semua bab: satu grup diskalakan | Mata membaca "gambar diperbesar". Kamera sungguhan membuat latar depan bergeser lebih cepat daripada latar belakang |
| S2 | Satu sudut per dunia | bab 17 (kabin 60 dtk), bab 7 (isometrik, hanya tarik mundur) | Tidak ada *coverage*: tidak ada wide → low angle → close-up dari satu peristiwa |
| S3 | Cahaya datar di dalam adegan | semua bab; suasana hanya dari warna medan | Cahaya adalah tuas emosi termurah. Kelaparan, kegagalan, dan kemenangan butuh cahaya yang berbeda, bukan cuma latar yang berbeda |
| S4 | Mata diarahkan hanya oleh teks besar | tidak ada fokus/DOF, tidak ada vinyet cahaya pada subjek | Sutradara mengarahkan mata dengan fokus, cahaya, dan kontras, bukan hanya ukuran huruf |
| S5 | Tabrakan subjek dengan kantong teks | bab 2 @46 (peti menimpa label), @58 (gerobak menimpa label), @72 (angka menimpa papan 1959) | Tidak ada "zona aman" yang diketahui kamera. Subjek dunia dan HUD tidak saling tahu |
| S6 | Gerak kamera tanpa motivasi gaya | napas sinus ±0,6 % di semua bab | Napas sudah benar sebagai dasar. Yang belum ada adalah gerak bermotivasi: mengikuti subjek, menyingkap, crane naik saat angka besar |

**Yang sudah kuat dan jangan hilang:** subjek penghubung (gerobak → peti kemas), palet bendera,
tanda tangan gerak (stempel, odometer), angka bersumber, dan determinisme penuh. 3D harus *melayani*
semua ini dan tidak boleh menggantinya.

## 4. Diagnosis CTO

1. **Kamera belum jadi modul.** Ada 40 salinan dalam 2 dialek, padahal roadmap butir 8 sudah mencatat kamera
   sebagai sisa yang belum masuk runtime bersama. Kalau fitur sinematik ditambahkan sebelum ini dibereskan,
   utangnya berlipat.
2. **Tidak ada jalur 3D untuk explainer.** Pola `S` + `render(t)` dari starter opener sudah tepat,
   tetapi hanya untuk latar.
3. **Kendala `file://`.** Deliverable dibuka dengan klik dua kali, sehingga `fetch()` berkas lokal diblokir.
   Akibatnya model `.glb` atau HDRI lokal tidak bisa dimuat dengan cara biasa. Jalan keluarnya: geometri prosedural, SVG
   inline → `SVGLoader.parse(string)` → extrude, dan IBL buatan (`RoomEnvironment`). Rinciannya ada di
   dokumen riset §A–C.
4. **Determinisme 3D.** Jangan pakai `THREE.Clock`, `AnimationMixer.update(dt)`, fisika, atau noise
   bawaan yang di-seed `Math.random`. Kamera harus berupa fungsi waktu. `lint-motion.mjs` sudah menangkap
   `Math.random`/`Date.now` dan perlu ditambah `Clock` dan `.update(` pada mixer.
5. **Biaya ekspor didominasi screenshot.** Di uji ini GPU 42–169 ms/frame, sedangkan screenshot+JPEG ±190 ms.
   Jadi efek 3D yang mahal (DOF) hanya menurunkan 4,3 → 3,0 fps.

## 5. Hasil uji (spike sekali pakai, dibuang)

Chrome headless, flag sama dengan `export-frames.mjs`, 1920×1080, three r161, 400 kotak
`MeshToonMaterial` (gradient 3 tingkat) + HemisphereLight + DirectionalLight, kamera orbit.

| Varian | Render GPU | Render + screenshot JPEG | fps ekspor |
|---|---|---|---|
| tanpa bayangan | 42 ms | 232 ms | **4,3** |
| bayangan PCF soft 2048² | 71 ms | 285 ms | **3,5** |
| bayangan + DOF (`BokehPass`) | 169 ms | 328 ms | **3,0** |
| *pembanding: bab SVG sekarang* | — | — | *3,4–5,2* |

Artinya, satu bab 90 dtk @30 fps butuh ±10–15 menit ekspor dengan 3D. Ini sama dengan sekarang. Preview
langsung di browser ±14–24 fps tanpa DOF, cukup untuk menyusun shot.

## 6. Tiga pendekatan

| | A. Kamera 2.5D (CSS 3D multiplane) | B. Dunia 3D toon (Three.js penuh) | **C. Hibrida (rekomendasi)** |
|---|---|---|---|
| Isi | Lapisan SVG yang ada diberi `translateZ`, kamera = transform 3D pada wadah | Dunia dibangun di Three.js, teks tetap DOM di atasnya (HUD) | Satu modul kamera dengan dua *backend* (SVG/CSS dan Three.js); 3D dipakai per shot yang menuntutnya |
| Dapat | paralaks, tilt ringan, dutch, rack focus (blur per lapisan), cahaya tiruan (overlay gradien) | sudut bebas, orbit, crane, low/high angle, isometrik ↔ perspektif, cahaya + bayangan, waktu hari, DOF | semua dari A dan B; bab lama bisa di-upgrade bertahap |
| Tidak dapat | memutari benda; sudut sungguhan | murah untuk semua adegan (model prosedural per dunia) | — |
| Risiko | `preserve-3d` diratakan oleh `filter`/`opacity`/`overflow` (riset §E) | waktu agen per bab naik; gaya flat bisa hilang kalau shading berlebihan | dua jalur perlu dijaga satu kontrak |
| Biaya | rendah | tinggi | sedang, bertahap |

**Rekomendasi: C.** Alasannya:
1. Modul kamera bersama harus ada di jalur mana pun (utang §4.1).
2. Paralaks 2.5D memperbaiki S1 dan S6 di semua dunia SVG tanpa menggambar ulang.
3. Three.js dipakai di 1–2 *hero shot* per bab, tempat sudut dan cahaya benar-benar bercerita
   (crane naik di atas kota bab 7, low angle kereta lewat di bab 17, pabrik gelap bab 34).
   Ini sejalan dengan hukum skill: "efek termahal dipakai sekali".

## 7. Menu fitur yang diusulkan

Semua fitur berupa fungsi waktu, dipanggil dengan detik absolut, dan berlaku sama di backend 2.5D maupun 3D kalau memungkinkan.

**Kamera (gerak)**: `dolly`, `truck`, `pedestal`, `pan`, `tilt`, `roll`/dutch, `arc`/orbit,
`crane`, `follow(subjek, offset)`, `rail(kurva)` (Catmull-Rom, parameter panjang busur),
`dollyZoom` (vertigo), `whip`, `handheld(intensitas)` (noise ber-seed, bukan sinus tunggal).
**Lensa**: `lens(mm)` (focal length ↔ fov), `focus(subjek)` + `rackFocus(a→b)`, aperture.
**Sudut** (preset, dihitung dari subjek): eye-level, high, low, overhead/bird's-eye, worm's-eye,
OTS, POV, isometrik sejati (ortografik), `isoToPersp` (transisi isometrik → perspektif).
**Ukuran shot** dari kotak subjek (memperluas §3b): ECU, CU, MCU, MS, WS, EWS.
**Cahaya** (backend 3D penuh; backend 2.5D dengan overlay): preset `siang`, `jam emas`, `senja biru`, `malam`
lampu praktis, `dramatis` (low-key, satu kunci keras), `harapan` (high-key); key/fill/rim;
bayangan; *motivated light* (jendela, lampu kota, tungku); gerak matahari sebagai beat.
**Pasca-proses (hemat)**: vinyet, grain (sudah ada), DOF hanya di hero shot, bloom ambang tinggi.
**Penjaga**: zona aman HUD (kamera tahu kantong teks, sehingga subjek tidak menabrak label; memperbaiki S5),
aturan 180° antar shot dalam satu dunia, lint `Clock`/`mixer.update`.

## 8. Rencana bertahap (usulan, menunggu keputusan)

**Keputusan 2026-10-03:** seri China Maju dianggap selesai; fitur ini untuk proyek BARU lewat skill.
Jadi tidak ada port 40 bab. Bab-bab itu hanya dipakai sebagai bukti diagnosis (§3) dan sebagai
bahan uji pembanding (eval brief), bukan sebagai sasaran perbaikan.

| Fase | Isi | Selesai bila |
|---|---|---|
| 0 | Modul `src/runtime/kamera.js`: satu kontrak (keyframe + kosakata shot/sudut/gerak + napas + noise ber-seed), backend SVG/DOM, dipasang ke starter lewat `build-starters.mjs` | semua starter memakai modul yang sama; `test-starters.mjs` + uji determinisme lolos |
| 1 | Backend 2.5D: lapisan `z`, paralaks, tilt/dutch, rack focus, overlay cahaya — untuk starter kolase/aksi kontinu | satu eval brief explainer dibangun ulang dengan kamera baru; lembar kontak sebelum/sesudah |
| 2 | Backend Three.js + `starter-explainer-3d.html` (dan perluasan `S` di `starter-opener.html`): dunia toon/clay/realistis mengikuti menu §7e, kamera perspektif/ortografik, preset cahaya, HUD DOM | satu hero shot per starter, ekspor ≥ 3 fps di mesin acuan |
| 3 | Dokumen skill: `techniques.md` §kamera-3D + tata bahasa sinematografi, lint baru (`Clock`, `mixer.update`), eval brief "sinematik" | eval lama tidak turun skornya, brief baru lolos; `context-budget.mjs` tetap hijau |

## 8b. Temuan riset yang mengubah desain (dari dokumen pendamping)

- **Kunci versi Three.** r186 (terbaru) menghapus `PCFSoftShadowMap`, mengganti nama `RGBELoader`,
  mengubah matematika IBL/PBR (r181, r186), dan men-deprecate `Clock`. Satu seri = satu versi; r161 yang
  sudah di-vendor tetap dipakai, dengan catatan `CatmullRomCurve3` butuh ≥ 3 titik dan `RoomEnvironment`
  harus diberi `renderer`.
- **Warna brand harus lolos tone mapping.** ACES menggeser merah bendera menjadi (241,26,37), AgX
  menjadi (213,89,78). Resep: `toneMapping = NoToneMapping` atau `toneMapped:false` pada material brand.
- **`file://`.** Yang berhasil: `SVGLoader.parse`, `FontLoader.parse`, GLB base64 → `GLTFLoader.parse`,
  `RoomEnvironment`, aset dari CDN ber-CORS. Yang gagal: semua loader berkas lokal dan `<img>` lokal ke WebGL.
- **Determinisme.** `composer.render()` tanpa argumen membaca `Clock` → wajib `composer.render(0)` /
  uniform waktu ditulis tangan. `SSAOPass`/`GTAOPass`/N8AO tidak deterministik antar proses → tidak dipakai.
- **CSS 3D.** Transform 3D pada elemen *di dalam* SVG diratakan menjadi skew 2D; tiap bidang paralaks
  harus `<svg>` sendiri. Biaya setara kamera 2D sekarang.
- **Ekspor.** JPEG q80 lewat CDP −20 % waktu per frame; `--enable-gpu` bukan switch Chromium yang
  dikenal (tidak berefek); `HeadlessExperimental.beginFrame` tidak ada di Chrome 153 headless biasa.
- **Blender tidak layak di mesin ini** (HD 4000 = Ivy Bridge; Blender 4.5+ butuh Broadwell+, 4 core).
- **Lisensi.** GSAP semua plugin gratis sejak 3.13 (MotionPathPlugin boleh dipakai); Theatre.js studio
  AGPL dan tidak aktif sejak Mei 2024; Remotion butuh lisensi perusahaan.

## 9. Risiko

- **Gaya flat hilang** kalau shading/bayangan berlebihan. Mitigasi: toon 2–3 tingkat, palet tetap dari
  token, outline opsional.
- **Konteks agen membengkak.** Mitigasi: dokumen 3D masuk sebagai *jalur baca* sendiri dan dijaga
  `context-budget.mjs`.
- **Konsistensi seri.** Bab lama 2D dan bab baru 3D bisa terasa beda. Mitigasi: 3D hanya untuk hero
  shot, dengan palet dan tanda tangan gerak yang sama.
- **Ketergantungan CDN** bertambah (addons Three). Mitigasi: `vendor-libs.mjs` diperluas.
