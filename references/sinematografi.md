# Sinematografi — kosakata kamera & cahaya, 2.5D dan 3D

Dokumen ini dibaca untuk explainer/opener yang memakai kamera sinematik: memilih dunia 2.5D atau 3D,
menerjemahkan istilah film (ukuran shot, sudut, gerak, lensa, fokus, cahaya) ke panggilan fungsi, dan
menghindari jebakan yang sudah terukur. Semua panggilan menulis ke satu objek `CAM` lewat tween GSAP pada
**detik absolut** (`at`), jadi hasilnya sama saat diputar, di-scrub, dan diekspor (SKILL.md Hukum #2).
Sumber kode: `src/runtime/kamera.js` (inti bersama), `kamera-dom.js` (2.5D), `kamera-three.js` (3D).
Katalog hidup: buka starter dengan `?demo=1`.

## 1. Memilih dunia: 2.5D atau 3D

Satu video = satu jenis dunia. Putuskan di style brief, sebelum rundown.

| Situasi | Dunia | Starter | Kenapa |
|---|---|---|---|
| Aset datar: cutout ilustrasi, foto, peta, dokumen, SVG | 2.5D | starter gaya (`-kartun/-jurnalisme/-katalog/-sketsa`, aksi kontinu) + bidang `[data-z]` | aset datar yang diorbit 3D memperlihatkan tipisnya; paralaks bidang sudah cukup memberi kedalaman |
| Benda yang harus dilihat dari beberapa sisi (produk, mesin, peti kemas, gedung), low angle sungguhan, orbit, bayangan yang bergerak, cahaya siang → senja | 3D | `assets/starter-explainer-3d.html` | sudut, lensa, dan cahaya hanya jujur bila dunianya punya volume |
| Opener/promo dengan hero produk/logo 3D | 3D di rig opener | `assets/starter-opener.html` (sudah memakai `CAM` + `kamera-three`) | kanvas Three.js di dalam `#world`; teks tetap DOM |
| Kartun panggung | rig panggung sendiri | `starter-explainer-panggung.html` | kamera hanya di dalam panggung (`kartun-panggung.md`) |
| Kinetic typography (teks = subjek) | DOM | `starter-opener.html` (`camThrough`/`breathe` di `#world`) | kamera 3D tidak membingkai teks DOM |

Contoh kegagalan: explainer sejarah berbahan foto arsip dibangun di 3D — foto ditempel di bidang, kamera
mengorbit, dan penonton melihat foto dari samping sebagai garis tipis. Foto = 2.5D.

## 2. Kosakata → kapan → panggilan

`subjek` di 2.5D = elemen atau selector (`'#peti'`); di 3D = `Object3D` atau **nama** objek (`mesh.name='peti'`,
lalu `'peti'`). Semua gerak menerima `ease` terakhir (bawaan `power2.inOut`).

### Ukuran shot — `shot(at,dur,ukuran,subjek)`

Ukuran = berapa kali tinggi/lebar frame yang diisi subjek (`SHOT`). Shot berganti mengikuti ketukan isi;
dua shot berukuran sama berturut-turut terasa datar (`techniques.md` §3b).

| Ukuran | Isi frame | Kapan di explainer |
|---|---|---|
| `ECU` | subjek 6,7× frame — hanya detail | angka kunci, label pada benda, detail produk |
| `CU` | 2,86× | objek yang sedang disebut VO, emosi tokoh |
| `MCU` | 1,67× | elemen utama + sedikit konteks |
| `MS` | 1,11× | subjek utuh pas frame; narator, benda beraksi |
| `WS` | 0,45× | subjek + lingkungan; relasi benda–tempat |
| `EWS` | 0,1× | establishing: pabrik, pelabuhan, kota, pembuka bab |

3D: jarak dihitung dari `Box3` subjek pada sudut dan lensa RENCANA saat `shot()` dipanggil, sampai permukaan
**depan** subjek (bukan pusatnya) — panggil `angle()`/`lens()` dulu, baru `shot()`.

### Sudut — `angle(at,dur,nama,override?)`

| Sudut | Kapan | 2.5D (`ANGLE.dom`) | 3D (`ANGLE.three`) |
|---|---|---|---|
| `eye` | netral, informatif (default) | pitch/yaw/roll 0 | pitch 0, roll 0 |
| `high` | subjek kecil/tertekan; ikhtisar data | pitch −8 | pitch −30 |
| `low` | subjek besar/berkuasa (gedung, kapal) | pitch 8 | pitch 25, 24 mm — lantai: §6 |
| `overhead` | peta, tata letak, alur | pitch −8, zoom ×0,8 | pitch −89,9 |
| `worm` | skala ekstrem (menara, roket) | pitch 8, zoom ×1,3 | pitch 60, 16 mm — lantai: §6 |
| `dutch` | krisis, ketidakstabilan, transisi | roll 12 | roll 15 |
| `ots` | "tokoh melihat data" | yaw 6, pitch −3 | yaw 35, pitch −8, 50 mm |
| `pov` | "bayangkan Anda di…" | goyang .6 | 28 mm, goyang .5 |

Pitch negatif = kamera di atas fokus, menunduk. `override` menimpa nilai preset: `angle(t,1,'low',{pitch:12})`.

### Gerak

| Istilah | Kapan | Panggilan | Catatan |
|---|---|---|---|
| Dolly in/out | mendekat untuk penekanan, masuk ke ruang | `dolly(at,dur,k)` | k > 1 mendekat; 2.5D = zoom ×k, 3D = jarak ÷k |
| Truck | menyusuri linimasa/proses ke samping | `truck(at,dur,dx)` | 2.5D piksel; 3D unit dunia sepanjang kanan kamera |
| Pedestal | naik dari data ke kesimpulan | `pedestal(at,dur,dy)` | 2.5D dy > 0 = turun; 3D dy > 0 = naik |
| Pan / tilt | menyapu deretan / mengungkap tinggi | `pan(at,dur,dYaw)`, `tilt(at,dur,dPitch)` | derajat; 3D = orbit di sekitar fokus (§4) |
| Crane | pembuka dramatis: detail → establishing | `crane(at,dur,{dy,dPitch})` | 3D: `crane(t,3,{dy:2,dPitch:-25})` = naik sambil menunduk |
| Arc / orbit | menunjukkan benda dari sisi lain | `arc(at,dur,toYaw)` | yaw absolut, dijepit `rule180` |
| Rail (3D) | jalur bebas: melintas, masuk ruang, pan sungguhan | `rail(at,dur,[[x,y,z],…],{look,ease})` | ≥ 3 titik; kamera menatap `look` (bawaan: fokus RENCANA) |
| Follow | mengikuti benda yang bergerak | `camTo`/`shot` diselaraskan dengan tween subjek, atau `rail` | tidak ada `follow()` (§4) |
| Whip pan | transisi "pada saat yang sama, di tempat lain" | `whipPan(at,arah)` lalu `cutTo(at+.28,…)` | 0,28 dtk; 2.5D geser 180 px + blur, 3D yaw +70° |
| Handheld | reportase, "di lapangan" | `handheld(a,b,amp)` | noise ber-seed dari `tl.time()`; amp .3–.8 |
| Lompat di cut | adegan lahir di posisi baru | `cutTo(at,{…})` | tanpa tween |
| Tween bebas | apa pun yang tak tercakup | `camTo(at,dur,{fx,fy,fz,dist,yaw,pitch,roll,mm,zoom},ease)` | nilai absolut atau relatif `'+=x'`, `'-=x'`, `'*=x'`; awalan lain melempar error |

### Lensa — `lens(at,dur,mm)`, `dollyZoom(at,dur,mm)`

| Lensa | Kapan | Efek |
|---|---|---|
| 18–24 mm | establishing, ruang, skala, low angle dramatis | perspektif kuat, latar menjauh |
| 35–50 mm | default penjelasan | mendekati penglihatan wajar |
| 85–135 mm | isolasi subjek, deretan benda rapat | latar "menempel" di belakang subjek — karena kamera mundur agar subjek tetap sebesar semula |
| dolly zoom | momen "sadar", kejutan statistik | subjek di fokus tetap sebesar semula, latar membesar/menyusut; 3D: jarak ikut lensa (jarak/mm konstan) |

`lens()` sendiri mengubah lensa tanpa memindah kamera (zoom optik). Untuk membingkai ulang dengan lensa baru,
panggil `lens()` lalu `shot()` — `shot()` menghitung jarak dari lensa RENCANA.

### Fokus — `focus(at,dur,subjek,aperture=6)`, `rackFocus(at,dur,a,b)`

| Istilah | Kapan | 2.5D | 3D |
|---|---|---|---|
| Fokus dangkal | hero shot: satu benda tajam, sisanya lembut | blur CSS sebanding jarak z bidang | `BokehPass`, hidup hanya saat aperture > 0 |
| Rack focus | memindah perhatian antar benda di kedalaman berbeda | `rackFocus(t,.8,'#a','#b')` | `rackFocus(t,.8,'a','b')` |

Matikan: `camTo(at,dur,{aperture:0})`. DOF 3D mahal (§6) — hanya untuk hero shot.

### Cahaya — `light(at,dur,preset,override?)`, `practical(mesh,warna,I?,jarak?)` (3D)

| Preset | Kapan | 3D: key (az°, el°, warna, I) · fill (langit/tanah, I) · rim I | 2.5D: overlay |
|---|---|---|---|
| `day` | netral, informatif | 45, 50, `#FFF6E8`, 2,5 · `#DDEBFF`/`#C9B79C`, 1,0 · ,6 | tanpa overlay |
| `golden` | nostalgia, penutup, keberangkatan | 60, 6, `#FFB46B`, 2,8 · `#FFD9A8`/`#6B4A3A`, ,5 · 1,2 | gradien jingga, multiply |
| `blue` | senja, kota, pergantian waktu | 0, 30, `#6FA8FF`, 0 · `#6FA8FF`/`#1B2244`, ,8 · ,4 | gradien biru, multiply |
| `night` | malam, lampu praktis jadi bintang | 200, 40, `#9DB7FF`, ,3 · `#2A3560`/`#0C1020`, ,25 · ,5 | biru gelap, multiply .8 |
| `lowkey` | krisis, "yang gagal", misteri | 80, 12, `#FFFFFF`, 1,4 · `#FFFFFF`/`#000000`, ,12 · 0 | vinyet gelap |
| `studio` | produk, logo, high-key | 45, 35, `#FFFFFF`, 2,5 · `#FFFFFF`/`#B0B0B0`, ,7 · 1,5 | sorot putih, screen |
| `practical` (3D) | cahaya yang sumbernya terlihat: lampu, layar, jendela | `practical(lampu,'--accent',2,8)` = `PointLight` di posisi mesh + bahan berpendar | — |

Override 3D memakai kunci `LUX` (`kAz kEl kI fI rI`, warna `kR kG kB …`): `light(t,2,'golden',{kAz:120})`.
Override 2.5D: `{bg,blend,op}`. Azimut key adalah arah DUNIA (0 = dari +z, 90 = dari +x), bukan relatif kamera.

### Menulis kosakata di rundown

Kolom `visual` rundown memakai istilah di atas supaya rencana kamera bisa dinilai sebelum kode:

| detik | kalimat | visual |
|---|---|---|
| 0–6 | "Setiap hari, ribuan peti…" | EWS high pelabuhan, `day` → crane turun ke WS |
| 6–14 | "…satu peti ini…" | WS → dolly in CU peti, 85 mm, focus peti |
| 14–22 | "…naik ke kapal." | ots dari derek, rail mengikuti peti ke dek |
| 22–30 | "Kapal berangkat saat senja." | WS 3/4 (yaw −55), `golden` dipicu klakson & lampu dek (`practical`) |

## 3. Aturan

**180° — `rule180(yaw)`.** Kamera tetap di satu sisi garis aksi. *Kenapa:* menyeberang membalik kiri-kanan;
truk yang melaju ke kanan tiba-tiba melaju ke kiri dan penonton mengira ia berbalik. *Kegagalan:* shot 1 dari
yaw 0, cut ke `cutTo(t,{yaw:180})` — arah gerak terbalik. `rule180(a)` hanya menjepit `arc()` ke a ± 89°;
`cutTo`, `pan`, `angle('ots')` tidak dijepit — jaga yaw-nya sendiri di sisi yang sama.

**30°.** Cut ke subjek yang sama dengan ukuran yang sama butuh beda yaw ≥ 30° — atau ganti ukuran shot.
*Kenapa:* beda kecil terbaca sebagai jump cut (gambar "meloncat"), bukan shot baru. *Kegagalan:* `shot(t,0,'MS',x)`
dua kali dengan yaw 0 dan 12. 2.5D: peringatan konsol saat setup; 3D: **tanpa peringatan** — periksa di rundown.

**Lead room.** Ruang kosong di arah subjek menghadap/bergerak. *Kenapa:* subjek yang menempel tepi depan terasa
akan menabrak bingkai. Geser fokus searah gerak sejauh sepertiga frame: 2.5D `(W/6)/zoom` piksel, 3D
`dist·6/mm` unit sepanjang kanan kamera (lebar frame di jarak `dist` = `dist·36/mm`). *Kegagalan:* kapal
berangkat ke kanan, kamera membingkainya di tengah lalu menempel di tepi kanan sepanjang shot.

**Sepertiga.** Subjek MS/MCU di garis sepertiga, sisi lain untuk kantong teks HUD; tengah hanya untuk simetri,
hero, dan ECU. *Kegagalan:* subjek di tengah dan label HUD di kiri bawah menumpuk di area yang sama.

**Gerak termotivasi.** Tiap gerak kamera punya pemicu di VO atau aksi: mengikuti benda, mengungkap informasi,
menekankan angka. Tulis pemicunya di kolom `visual` rundown (`WS high → dolly in CU saat "satu peti"`).
*Kegagalan:* orbit 360° terus-menerus di bawah seluruh narasi — terasa screensaver, bukan penjelasan.

**≥ 2 sudut per dunia.** Tiap dunia dilihat dari minimal dua sudut berbeda (`angle()` atau yaw ≥ 30°).
*Kenapa:* satu sudut + dolly in/out = diorama di balik kaca — PPT 3D. *Kegagalan:* 45 detik dari eye-level 3/4
yang sama, hanya maju-mundur.

**Cahaya berganti dengan pemicu terlihat.** `light()` dipasang di detik aksi yang menyebabkannya: matahari
turun saat kapal berangkat, lampu dinyalakan, pintu gudang dibuka, krisis diumumkan. *Kenapa:* cross-fade cahaya
tanpa sebab terbaca "ganti slide". *Kegagalan:* siang → malam di antara dua kalimat, dunia tidak berubah apa pun.

**Cahaya bercerita** (≥ 1 segmen) atau dinyatakan tidak dipakai di style brief — bukan default `day` sepanjang
video karena tidak pernah dipertimbangkan.

## 4. 2.5D vs 3D — fungsi sama, makna berbeda

| | 2.5D (`kamera-dom.js`) | 3D (`kamera-three.js`) |
|---|---|---|
| `fx/fy/fz` | piksel dunia, Y ke **bawah** | unit dunia (1 ≈ 1 m), Y ke **atas** |
| `pedestal(dy>0)` | turun | naik |
| `dolly(k)` | `zoom ×k` | `dist ÷k` |
| `pan`/`tilt` | rotateY/X kecil pada rig (paralaks) | kamera **mengorbit titik fokus** (orbit kecil); pan sungguhan = `rail(…,{look})` |
| `whipPan` | geser 180 px + blur 18 | yaw +70°, tanpa blur |
| `angle` | 3–12° (dunia pipih) | sudut film + lensa yang **bertahan** (§6) |
| subjek `shot/focus` | elemen atau selector | `Object3D` atau nama |
| `focus` | blur bidang `[data-z]` | `BokehPass`; jarak fokus dihitung saat setup |
| `light` | overlay gradien di atas rig | rig key/fill/rim + bayangan; dihitung ulang tiap render |
| aturan 30° | peringatan konsol | tidak ada |
| `look/home/into/settle/breath` | alias kamera kolase | **jangan** — koordinat layar (`W/2,H/2`) |
| `rail` | tidak ada | ada |

**`focus()` 3D tidak mengikuti kamera.** Jaraknya dihitung saat setup dari posisi kamera RENCANA ke pusat subjek.
Kamera yang bergerak sesudahnya (dolly, rail) membuat subjek keluar fokus. Panggil `focus()` lagi di detik gerak itu,
sesudah gerak kamera ditulis.

**Tidak ada `follow()`.** Posisi subjek yang bergerak baru diketahui saat render, sehingga RENCANA tidak bisa
menyelesaikan gerak kamera sesudahnya — hasil tidak lagi sama di semua jalur seek. Gantinya, keyframe kamera
dengan detik, durasi, dan ease **sama** dengan tween subjek:

```js
tl.to(peti.position,{x:12,duration:4,ease:'none'},10);   // subjek
camTo(10,4,{fx:12},'none');                             // kamera menempel: ease & durasi sama
```

Untuk jalur melengkung: `rail()` dengan titik yang menyertai lintasan subjek, `look` di tujuan.

## 5. Resep

### 2.5D — bidang `[data-z]`

```html
<div id="world">
  <div data-z="-400"><img src="langit.webp"></div>   <!-- jauh: bergeser lambat -->
  <svg data-z="0" viewBox="…">…</svg>               <!-- bidang subjek -->
  <div data-z="250"><img src="daun.webp"></div>     <!-- depan -->
</div>
```

- Pembungkus `[data-z]` adalah `<div>` atau `<svg>` itu sendiri, ada di HTML sebelum blok kamera berjalan
  (daftarnya dibaca sekali). GSAP menganimasikan **anak** pembungkus — `applyCam` menimpa `transform` pembungkusnya.
- Ukuran bidang pada 35 mm sama dengan tanpa `data-z`; paralaks muncul saat kamera bergeser/miring, dan
  `lens()`/`dollyZoom()` mengubah ukuran bidang relatif terhadap z = 0.
- z positif mendekat ke kamera. Jaga z jauh di bawah `W·mm/36` untuk lensa terlebar yang dipakai (18 mm →
  960 px): bidang di atas batas itu berada di belakang kamera dan lenyap.

### 3D — `mat()`, `fromSVG()`, HUD di luar `#world`

```js
const peti=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.2,1.2),mat('toon','--accent'));
peti.name='peti';peti.position.y=.6;peti.castShadow=true;scene.add(peti);
const logo=fromSVG(SVG_LOGO,{depth:.04,bevel:.01,family:'toon',scale:.004});   // depth/bevel dalam unit DUNIA
logo.position.set(0,0,.62);logo.traverse(m=>m.castShadow=true);peti.add(logo);
hud.reserve('#hud .lbl',2,6);          // kantong teks: shot() menolak subjek yang menabraknya
light(0,0,'day');cutTo(0,{dist:14,pitch:-12});
shot(.5,1.4,'EWS','peti');             // establishing
angle(3,1.2,'high');shot(3,1.2,'MS','peti');   // sudut dulu, baru shot
focus(6,.8,'peti');                    // hero shot
```

- `mat(family,warna)`: satu family untuk seluruh dunia (`flat toon clay glossy realistis`, menu `techniques.md`
  §7e); warna dari token CSS (`'--accent'`), hex, atau `THREE.Color` — dunia ikut style brief, tanpa hardcode.
- `fromSVG(string,{depth,bevel,family,scale})`: logo/ikon SVG **string** menjadi grup 3D terpusat; path tanpa isi
  (`fill="none"`, ikon garis) dilewati — ubah garis menjadi bentuk berisi dulu.
- Aset 3D = geometri prosedural atau `fromSVG(string)`. Loader berkas (`GLTFLoader`, `TextureLoader`, `RGBELoader`)
  diblokir `file://` — deliverable tidak bisa dibuka dengan klik dua kali.
- Teks di `#hud` (di `#stage`, di LUAR `#world`): tidak ikut lensa/perspektif, tetap ≥ 30 px dan terbaca di
  ponsel. `hud.reserve()` membuat `shot()` memeriksa proyeksi 8 sudut kotak subjek terhadap kantong teks.
- Gerakkan benda dengan tween properti Three yang absolut (`tl.to(peti.position,{x:12},t)`); loop render
  menggambar dari `tl.time()`.

## 6. Jebakan

**Warna brand bergeser lewat composer.** `EffectComposer` + `OutputPass` menerapkan `renderer.toneMapping` ke
seluruh frame dan **mengabaikan** `material.toneMapped:false`. Terukur: ACES menggeser `#EE1C25` menjadi 241,26,37.
Warna brand tepat WAJIB `renderer.toneMapping = THREE.NoToneMapping` — kedua starter 3D sudah begitu; biarkan.

**`composer.render()` tanpa argumen** membaca jam sendiri → frame berbeda tiap ekspor. Selalu `composer.render(0)`
(lint `composer-render-jam`). Sama: tanpa `THREE.Clock`, `getDelta`, `mixer.update(` di jalur render.

**`CatmullRomCurve3` dengan 2 titik rusak di r161** — `rail()` menolak < 3 titik. Garis lurus: beri titik tengah.

**`new RoomEnvironment(renderer)`** selalu dengan `renderer` (r161).

**Kabut starter 3D.** `scene.fog` near 22, far 40 menyembunyikan tepi lantai 60 × 60. Lebih dari 22 unit dari
kamera, warna memudar ke `--base` (warna brand tidak tepat lagi) dan subjek jauh lenyap di EWS. Dunia besar/EWS
jauh: besarkan lantai dan naikkan near/far, atau buang kabut dan tutup tepi lantai dengan cara lain.

**Low/worm angle di bawah lantai.** Tinggi kamera = `fy − dist·sin(pitch)`. Pada kubus 1,6 starter, sesudah `shot(…,'WS')` (dist ±7)
`angle('low')` (pitch 25) menaruh kamera ±2 unit di BAWAH lantai: lantai lenyap (sisi bawahnya tidak digambar)
beserta bayangannya. Low angle di dunia berlantai: dekatkan kamera (MCU/CU), pakai pitch kecil lewat override,
atau subjek yang tinggi; `worm` hanya saat kamera hampir menempel subjek.

**Lensa dari `angle()` bertahan (3D).** `low` 24 mm, `worm` 16, `ots` 50, `pov` 28 — dan `eye` tidak
mengembalikannya. Shot berikutnya ikut lensa itu. Kembalikan dengan `lens(at,dur,35)` atau `angle(…,{mm:35})`.

**ECU/CU pada kotak polos = bidang rata.** Toon tanpa detail memenuhi frame dengan satu warna rata. Sebelum
memakai ukuran dekat, beri subjek detail permukaan tanpa tekstur: bevel, panel/rusuk dari geometri, logo `fromSVG`,
angka/label sebagai bentuk.

**Biaya di GPU lemah** (mesin acuan i3-3217U/HD 4000): bayangan PCFSoft +29 ms/frame; `BokehPass` 169 ms vs
42 ms tanpa. DOF hanya untuk hero shot, matikan (`aperture:0`) sesudahnya. Starter 3D mengekspor ≥ 3 frame/dtk
karena `OPENER.syncSeek:true` dan loop rAF hanya menggambar saat `tl.time()` berubah — loop render kedua yang
berjalan bebas menurunkannya (sebelum perbaikan itu: 1,6 frame/dtk).

**Preset terbaca dari pose 3/4.** Key datang dari arah dunia; dari depan lurus beda antar preset (terutama
`day`/`studio`/`lowkey`) sulit terbaca. Nilai `lowkey` (key az 80/el 12/I 1,4, fill ,12, rim 0) disetel supaya terukur gelap dari yaw −55,
pitch −18. Segmen yang bercerita dengan cahaya: kamera 3/4, bukan frontal.

**Nilai relatif GSAP bergantung jalur seek.** `tl.to(el,{x:'+=25'})` diselesaikan saat tween pertama kali
dirender — putar, scrub, dan worker ekspor bisa memberi hasil berbeda. Hitung nilai absolut saat setup (lint
WARN `gsap-relatif`). Gerak kamera relatif (`dolly`, `truck`, `'+='` di `camTo`) aman karena RENCANA menyelesaikannya
saat setup.

**Urut waktu.** Gerak kamera relatif, `rail()`, dan `light()` wajib dipanggil urut `at` naik — di luar urutan
melempar error. Tulis rundown dari detik kecil ke besar; `cutTo`/`camTo` absolut boleh di mana saja.

**`shot()` 3D menerima nama, bukan selector.** Di opener (`CAM.mode='three'`), `shot(t,1,'CU','#judul')` mencari
objek 3D bernama `#judul` dan melempar. Teks DOM opener dibingkai rig `#world` (`camThrough`/`breathe`), bukan `CAM`.
Subjek berupa grup dibingkai seluruh `Box3`-nya (kapal + derek = kotak besar); grup kosong melempar
`subjek 3D kosong` — termasuk `fromSVG` yang semua path-nya garis.

**Zona aman hanya diperiksa `shot()`.** `camTo`, `angle`, gerak, dan `rail` tidak memeriksa kantong teks —
potret detiknya (`snap.mjs`).

**`practical()` dan lampu.** Posisi `PointLight` diambil saat dipanggil (tidak ikut mesh yang bergerak sesudahnya).
Bayangan key mencakup ±20 unit di sekitar fokus kamera;
objek baru butuh `castShadow = true`, permukaan penerima `receiveShadow = true`.

**`preserve-3d` diratakan (2.5D).** `filter`, `opacity < 1`, `overflow` selain visible, `clip-path`, `mask`, atau
`mix-blend-mode` pada `#world` atau elemen di antara `#world` dan bidang `[data-z]` meratakan 3D — semua bidang jatuh
ke z = 0, paralaks mati. Efek itu dipasang pada ANAK bidang. Transform 3D di DALAM `<svg>` juga diratakan Chrome:
`data-z` dipasang pada `<svg>` itu sendiri atau `<div>` pembungkus, bukan `<g>`.

## 7. Nama global runtime 3D

Starter 3D sudah mendeklarasikan nama di bawah; mendeklarasikannya ulang di rundown (`const fill=…`) membuat
seluruh module gagal dimuat — layar kosong. Pakai nama lain (`isi`, `kunci`, `tepi`).

- Inti `kamera.js`: `CAM PLAN P0 planAt camDefaults mutlak camTo cutTo camReset look home into settle breath hash
  noise SHOT rectIn lastShot shot ANGLE angle dolly truck pedestal pan tilt crane AXIS rule180 arc lens dollyZoom
  whipPan handheld HUD hud pose jarakBingkai`.
- Backend `kamera-three.js`: `warna RAILS arahkan rail applyCam objek3 kotak3 LUX key fill rim applyLux CAHAYA3
  nilaiLux lampAt light practical bokeh jarakFokus focus rackFocus TOON MAT mat fromSVG demoKamera3`; properti
  `CAM.frame3d`, `CAM.cek3`; `window.CAM3_UJI`, `window.DEMO_AKHIR` (kait uji/katalog).
- Disediakan starter SEBELUM blok kamera (wajib ada): `THREE scene camera renderer composer BokehPass SVGLoader tl rig
  W H DUR $`. Milik starter sendiri (`lantai subjek render tGambar q fit vo start …`) terlihat di
  berkasnya.

Nama 2.5D ada di `techniques.md` §3b.
