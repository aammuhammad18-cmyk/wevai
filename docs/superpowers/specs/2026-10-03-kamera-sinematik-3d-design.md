# Spec — Kamera sinematik & 3D untuk WeVai

> Studi kasus di dokumen ini (seri video *China Maju*: berkas `china-maju-seri/…`, lembar kontak, log ekspor)
> adalah proyek video yang dibuat dengan skill ini dan berada di luar repo WeVai. Jalur berkasnya dicantumkan
> sebagai bukti, bukan sebagai isi repo.

Tanggal: 2026-10-03 · Status: disetujui secara lisan dalam sesi desain, menunggu tinjauan tertulis ·
Target rilis: versi berikutnya · Latar: [`docs/analisis-3d-sinematografi-2026-10-03.md`](../../analisis-3d-sinematografi-2026-10-03.md),
fakta pustaka: [`docs/riset-3d-sinematografi-2026-10-03.md`](../../riset-3d-sinematografi-2026-10-03.md).

## 1. Tujuan

Memberi agen (dan sutradara yang membaca rundown) **kosakata sinematografi yang bisa dieksekusi**: ukuran shot,
sudut kamera, gerak kamera, lensa, fokus, dan cahaya — untuk proyek **baru** yang dibuat lewat skill. Seri
China Maju yang sudah ada tidak di-port; ia hanya bahan bukti diagnosis dan pembanding eval.

Keputusan yang sudah diambil:
- Sasaran: proyek baru lewat skill (bukan upgrade seri lama).
- Pendekatan: **hibrida** — satu inti kamera, dua backend (2.5D DOM/SVG dan Three.js penuh).
- Versi Three dikunci **r161** (yang sudah di-vendor); satu seri = satu versi.
- Tone mapping default **mati**; material warna brand `toneMapped:false`.

Kendala yang tidak boleh dilanggar (dari skill): deterministik (fungsi murni `tl.time()`), satu berkas `file://`,
tanpa player, loop dari jam, kontrak `window.OPENER`, teks ≥ 30 px, deliverable tidak butuh Node.

## 2. Arsitektur

| Berkas | Tugas | Bergantung pada |
|---|---|---|
| `src/runtime/kamera.js` — **menggantikan** `kamera-kolase.js` | Inti tanpa DOM/Three: objek `CAM`, kosakata `shot/angle/move/lens/focus/light`, value-noise ber-seed, zona aman HUD, penjaga 180°/30°. `look/home/into/settle/breath` lama tetap ada sebagai alias (perilaku starter kolase tidak berubah). | GSAP |
| `src/runtime/kamera-dom.js` | Backend 2.5D: `CAM` → `#world` (`perspective` + `translate3d` + `rotateX/Y/Z`); bidang paralaks = elemen `<svg>` terpisah ber-`data-z` (transform 3D di dalam SVG diratakan Chrome); rack focus = `filter:blur` pada bidang daun, bukan wadah `preserve-3d`; preset cahaya = overlay gradien `mix-blend-mode`. | kamera.js |
| `src/runtime/kamera-three.js` | Backend 3D: `CAM` → `PerspectiveCamera`/`OrthographicCamera` (`setFocalLength`, posisi bola, `lookAt`, roll); preset cahaya key/fill/rim + waktu hari; bayangan PCF; `mat(family,color)` (toon/clay/glossy/realistis, §7e); `fromSVG(string)` → `ExtrudeGeometry`; `RoomEnvironment(renderer)` sebagai IBL; `BokehPass` hanya bila `aperture>0`; `composer.render(0)`. | kamera.js, Three r161 + addons CDN |

Starter:
- `assets/starter-opener.html`: `S.camX/Y/Z/camRoll/shake` diganti `CAM` + `kamera-three`; `camThrough`/`breathe` tetap, ditulis di atas `CAM`.
- Enam `assets/starter-explainer*.html`: blok `<wv:kamera>` + `<wv:kamera-dom>` disisipkan `build-starters.mjs`; rundown contoh tidak berubah.
- **Baru** `assets/starter-explainer-3d.html` (§4).

Dokumen: **baru** `references/sinematografi.md`; `techniques.md` §3/§3b/§4b hanya diberi rujukan ke sana.

Dilewati dengan sengaja: `.glb`/HDRI lokal (diblokir `file://`; GLB base64 → `GLTFLoader.parse` dicatat sebagai jalan bila perlu nanti), fisika, editor GUI (Theatre.js studio AGPL, tidak aktif), SSAO/GTAO/N8AO (tidak deterministik antar proses), `GodRaysEffect` (mahal; ganti kerucut aditif), motion blur global.

## 3. Kosakata (API)

### 3.1 Keadaan

```js
const CAM = { fx:0, fy:0, fz:0,            // titik fokus (koordinat dunia)
              dist:10, yaw:0, pitch:0, roll:0,   // kamera relatif ke fokus (koordinat bola, derajat)
              mm:35,                       // lensa; fov dari filmGauge 36 (vertikal 16:9)
              focus:0, aperture:0,         // DOF; aperture 0 = mati
              shake:0, seed:1 };           // handheld: value-noise ber-seed
```
Keyframe = tween GSAP pada `CAM` dengan detik absolut (`tl.to(CAM,{…},at)`), sama seperti `S` di opener.
Backend membaca `CAM` di `render(t)`; tidak ada jam lain. Di 2.5D, `yaw/pitch` kecil (±8°) = tilt/paralaks,
`dist` = skala, `mm` = kekuatan `perspective` (px = 1920·mm/36).

### 3.2 Fungsi

| Kelompok | Tanda tangan | Isi |
|---|---|---|
| Ukuran shot | `shot(at, dur, size, subjek, {ease})` size ∈ `ECU CU MCU MS WS EWS` | `dist` dari kotak subjek + `mm`: `d = H_bingkai/(2·tan(fov/2))`; bingkai ≈ 0,15/0,35/0,6/0,9/2,2/≥10 × tinggi subjek; menggantikan `frameOn()` §3b |
| Sudut | `angle(at, dur, name, opsi)` name ∈ `eye high low overhead worm dutch ots pov` | preset: high pitch −20…−45°; low +15…+35° @ 24 mm; overhead −89,9° + `up=(0,0,-1)`; worm y≈0,1 pitch +60° @ 16 mm; dutch roll ±10–20°; ots/pov butuh `subjek`/`mata` |
| Gerak | `dolly(at,dur,Δdist)`, `truck(at,dur,Δx)`, `pedestal(at,dur,Δy)`, `pan(at,dur,Δyaw)`, `tilt(at,dur,Δpitch)`, `crane(at,dur,{Δy,Δpitch})`, `arc(at,dur,Δyaw,{h})`, `follow(a,b,subjek,offset)`, `rail(at,dur,[p0,p1,p2,…],{look})` | semua = tween komponen `CAM`; `rail` Catmull-Rom **≥ 3 titik**, parameter panjang busur (`getPointAt`); 2.5D `rail` = `MotionPathPlugin` (gratis sejak GSAP 3.13) |
| Lensa | `lens(at,dur,mm)`, `dollyZoom(at,dur,mm0,mm1,subjek)` | vertigo: `dist` dihitung ulang tiap frame agar subjek tetap sebesar semula |
| Fokus | `focus(at,dur,subjek)`, `rackFocus(at,dur,A,B)` | 3D: `BokehPass.uniforms.focus`; 2.5D: `filter:blur` per bidang `<svg>` |
| Transisi | `whip(at,arah)`, `cutTo(at,{…CAM})` | whip = yaw 60–90° dalam 0,25 dtk + blur berarah (§4c #6); `cutTo` = `tl.set` |
| Napas | `breath(a,b,amp)` (sinus, sudah ada), `handheld(a,b,amp)` | handheld: noise ber-seed ±0,02–0,08 posisi, ±0,3° rotasi, 0,5–2 Hz — bukan `Math.random` |
| Zona aman | `hud.reserve(sel, at, dur)` | kamera menolak keyframe yang membawa kotak subjek masuk kantong teks aktif (lempar error saat setup) |
| Cahaya | `light(at,dur,preset,opsi)` preset ∈ `day golden blue night lowkey studio`; `practical(mesh,color)` | 3D: key/fill/rim `DirectionalLight`/`HemisphereLight`/`SpotLight` di-tween (warna, intensitas, azimut/elevasi); `practical` = `PointLight` + emissive `toneMapped:false`. 2.5D: overlay gradien dengan nama preset yang sama. Pergantian preset wajib punya pemicu terlihat (aturan latar Hukum #3.5) |
| Penjaga | `rule180(axis)`; cek 30° | orbit dibatasi satu sisi garis aksi; `cutTo` ke subjek sama tanpa beda ≥ 30° atau beda ukuran shot → lint WARN |

Nilai preset (pitch/mm/intensitas) berasal dari tabel tata bahasa di dokumen riset; bila diubah, ubah di
`references/sinematografi.md` dan kode bersamaan.

## 4. `assets/starter-explainer-3d.html`

- `#stage` → `#world` berisi `<canvas id="gl">` (dunia Three); `#hud` DOM **di luar** `#world` (angka besar + label dunia = dua tingkat teks; kartu sumber). Vignette/grain di atas, seperti starter lain.
- Dunia: geometri prosedural + `fromSVG(string)`; `mat('toon', token)` default; `RoomEnvironment(renderer)`; `renderer.toneMapping = NoToneMapping`; `shadowMap.type = PCFSoftShadowMap` (r161).
- `render(t)`: `applyCam(t)` → `composer.render(0)`. `OPENER.syncSeek = false`.
- Isi **polos**: satu lantai, satu subjek balok, satu label. Tanpa urutan adegan contoh. `?demo=1` = katalog: tiap ukuran shot, sudut, gerak, preset cahaya 2 dtk berturut-turut.
- Style brief di komentar kepala mendapat tiga baris baru (§5.2).
- Komponen `window.OPENER` lengkap; autoplay + loop dari jam; `?debug=1`, `?clean=1`.
- Target kinerja: ≥ 3 fps ekspor 1080p di mesin acuan (i3-3217U/HD 4000) tanpa DOF; DOF hanya di hero shot.

## 5. Perubahan dokumen skill

1. **SKILL.md Peta baca**: baris baru *"Explainer/opener 3D & kamera sinematik"* → `references/sinematografi.md` + `assets/starter-explainer-3d.html` (+ `techniques.md` bagian yang dirujuk). `context-budget.mjs`: jalur baru, batas 170 KB.
2. **Style brief** (+3 baris): `lensa default (mm)`, `sudut & gerak pembuka`, `preset cahaya per segmen + pemicu pergantian`. Hukum #3.4 ("berbeda dari proyek sebelumnya") ikut mencakup kamera: dua proyek berturut tidak memakai sudut pembuka + gerak tanda tangan yang sama.
3. **Rundown**: kolom `visual` boleh memuat kosakata kamera (`WS high → dolly in CU`).
4. **Checklist umum** (+3): tiap dunia ≥ 2 sudut berbeda; cahaya bercerita di ≥ 1 segmen (atau dinyatakan tidak dipakai di style brief); subjek tidak masuk zona aman HUD.
5. **`references/sinematografi.md`** (±25 KB): tabel istilah → kapan di explainer → panggilan fungsi (ukuran, sudut, gerak, lensa, aturan 180°/30°/lead room/sepertiga, cahaya), resep 2.5D (bidang `<svg>` ber-`data-z`), jebakan: tone mapping vs warna brand, `composer.render()` tanpa argumen membaca `Clock`, `CatmullRomCurve3` 2 titik rusak di r161, `RoomEnvironment` tanpa `renderer` terlalu gelap, transform 3D di dalam SVG diratakan, `preserve-3d` diratakan oleh `filter/opacity<1/overflow/clip-path/mask/mix-blend-mode`.
6. `references/architecture.md`: paragraf rig kamera menunjuk ke `CAM`; `roadmap.md` butir 8 ditutup; `CHANGELOG.md` versi berikutnya.

## 6. Alat & pengujian

- `scripts/build-starters.mjs`: tidak berubah (blok dikenali dari nama berkas `src/runtime/*.js`).
- `scripts/lint-motion.mjs` (+3): `determinisme-clock` FAIL (`THREE.Clock`, `.getDelta(`, `mixer.update(`), `composer-render-jam` FAIL (`composer.render()` tanpa argumen), `shot-30-derajat` WARN.
- `scripts/test-starters.mjs`: starter baru ikut; uji baru **hash frame**: `seek(t)` dua kali dalam satu proses → `canvas.toDataURL` identik (hanya starter berkanvas).
- `scripts/export-frames.mjs`: mode MP4 memakai CDP `Page.captureScreenshot` JPEG q80 (−20 % terukur); flag `--enable-gpu` dihapus (bukan switch Chromium). Hasil frame tetap termasuk DOM.
- `evals/briefs/09-explainer-3d.md`: satu dunia, dua sudut, satu pergantian preset cahaya, satu hero shot DOF. Bukti sebelum/sesudah di `evals/bukti/`.
- Verifikasi visual tetap `snap.mjs` → lembar kontak, dinilai mata.
- `scripts/vendor-libs.mjs`: menanam addons Three yang dipakai starter 3D (EffectComposer, RenderPass, BokehPass, OutputPass, SVGLoader, RoomEnvironment).

## 7. Urutan pengerjaan

| Fase | Isi | Selesai bila |
|---|---|---|
| 0 | `src/runtime/kamera.js` + alias lama; starter kolase dibangun ulang | `build-starters --check`, `test-starters`, `lint` hijau; snapshot starter kolase identik sebelum/sesudah |
| 1 | `kamera-dom.js`; starter kolase/aksi kontinu mendapat paralaks/tilt/rack focus/overlay cahaya | satu eval brief explainer dibangun ulang dengan kamera baru; lembar kontak sebelum/sesudah |
| 2 | `kamera-three.js`; `starter-explainer-3d.html`; opener memakai `CAM` | `?demo=1` memperagakan seluruh kosakata; ekspor ≥ 3 fps; hash frame deterministik |
| 3 | `sinematografi.md`, SKILL.md, checklist, lint baru, eval brief 09, export q80, vendor-libs, CHANGELOG, bump versi | `context-budget --check` hijau; eval lama tidak turun; brief 09 lolos |

## 8. Risiko & mitigasi

- Gaya flat hilang karena shading → toon 2–3 tingkat default, palet dari token, outline opsional.
- Konteks agen membengkak → jalur baca sendiri + anggaran 170 KB.
- Ketergantungan CDN bertambah → `vendor-libs.mjs` diperluas; SRI lewat `cdn-integrity.mjs`.
- Kinerja di GPU lemah → DOF dan bayangan opsional; `--disable-gpu` (WARP) sebagai jalan darurat yang terdokumentasi.
- Dua backend menyimpang → kosakata diuji dari satu tabel preset; `?demo=1` di starter 2.5D dan 3D memakai urutan yang sama.
