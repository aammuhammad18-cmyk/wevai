# Riset: Animasi sinematik 100% kode di browser untuk WeVai

Tanggal: 2026-11-01 · Cakupan: cara membuat video sejarah panjang (25–60 menit) yang terasa seperti film animasi
sinematik tanpa gambar AI dan tanpa aset raster dari luar. Dokumen ini membahas tujuh hal: 2D realistis
(filter SVG, Canvas 2D, shader WebGL, NPR), dunia 3D prosedural di Three.js r187, kamera sinematik dan shot
"mata elang", tokoh prosedural, ekspor video panjang, prior art, serta usulan gaya baru.

Dokumen ini **melanjutkan** dua riset sebelumnya dan tidak mengulanginya:
- [`riset-3d-sinematografi-2026-10-03.md`](riset-3d-sinematografi-2026-10-03.md) membahas lensa/`filmGauge`, rel kamera, noise deterministik, satuan cahaya, bayangan, tone mapping dan warna merek, tabel determinisme pass post-processing, CSS 3D, Theatre.js, `file://`, dan metode penangkapan frame. Rujukan ke dokumen ini ditulis "[3D-A5]", "[3D-D2]", dan seterusnya.
- [`riset-animejs-2026-10-22.md`](riset-animejs-2026-10-22.md) membahas determinisme jam dan seek.

**Metode.**
- **Sumber primer:** spesifikasi W3C/WHATWG (Filter Effects 1, HTML Canvas, WebCodecs, Media Capture from DOM Elements), kode sumber Chromium dan Skia di googlesource, kode sumber three.js pada tag `r187`, definisi protokol DevTools (`browser_protocol.json`), dokumentasi resmi Remotion, Motion Canvas, Mediabunny, dan Spine, registry npm, makalah asli (metadata diperiksa lewat Crossref), GDC Vault, dan UNESCO.
- **Uji empiris di mesin pemilik:** Intel Core i3-3217U (2 core/4 thread), Intel HD Graphics 4000 (driver 10.18.10.4252), Windows 11 Pro build 22000, **Chrome 156.0.8078.74** (`C:/Program Files/Google/Chrome/Application/chrome.exe`) dan `chrome-headless-shell` 156.0.8078.74, puppeteer 25.11.0 dari `wevai/scripts`. Argumen default sama dengan `export-frames.mjs`: `--use-gl=angle --enable-webgl --ignore-gpu-blocklist`. Halaman dibuka lewat `file://` pada 1920×1080, dan library dimuat dari jsDelivr.
- **Lokasi berkas uji:** semua ada di scratchpad (folder `riset\`, berkas kerja sementara di luar repo), tidak masuk repo.
- **Penanda:** pendapat ditandai **[opini]**.

---

## Ringkasan temuan

**Angka kunci di mesin pemilik** (median ms/frame, total = seek + 2×rAF + screenshot JPEG q80; rincian di Lampiran)

| Adegan uji (1920×1080) | Render di halaman | Total per frame | 108.000 frame (60 mnt @30 fps), 1 worker |
|---|---|---|---|
| A1 SVG berat, filter statis, hanya transform berubah | — | **255** | ≈ 7,7 jam |
| A2 SVG berat, cahaya `fePointLight` + seed turbulence berubah tiap frame | — | **358** | ≈ 10,7 jam |
| A2 dengan `--disable-gpu` (raster CPU) | — | **3.663** | ≈ 110 jam |
| B Shader WebGL 2D: langit, 4 lapis gunung fBm, gapura SDF + rim light, kabut, god rays 64 sampel, grain | 63 | **301** | ≈ 9,0 jam |
| C1 Three.js r187: terrain 384², 12.000 pohon instanced, Sky Preetham, FogExp2, bayangan PCF 2048, kamera terbang | 61 | **259** | ≈ 7,8 jam |
| C2 C1 + UnrealBloom + Bokeh + OutputPass | 89 | **285** | ≈ 8,6 jam |
| C3 C1 + motion blur akumulasi 8 sub-frame | 283 | **491** | ≈ 14,7 jam |
| C4 WebGPURenderer (jatuh ke WebGL2) + TSL bloom + DOF | 77 | **265** | ≈ 8,0 jam |
| B di-encode **di halaman** dengan WebCodecs H.264 `prefer-software` | 63 | **81** | ≈ **2,4 jam** |

Semua adegan menghasilkan hash identik setelah di-seek ulang (deterministik).

**Temuan utama**
1. **Filter SVG di Chrome dirender GPU, dan hasilnya di-cache per layer.** Blink membangun `PaintFilter` ([fe_lighting.cc](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/platform/graphics/filters/fe_lighting.cc)), dan Skia mengimplementasikan filter cahaya sebagai `SkRuntimeEffect` shader ([SkLightingImageFilter.cpp](https://skia.googlesource.com/skia/+/refs/heads/main/src/effects/imagefilters/SkLightingImageFilter.cpp)). `chrome://gpu` di headless melaporkan "Rasterization: Hardware accelerated". Terukur: filter dinamis 358 ms (GPU) vs 3.663 ms (CPU), **10× lebih cepat**. Filter yang statis praktis gratis per frame (255 ms GPU / 236 ms CPU, sama dengan biaya capture). Aturan spike ("cahaya tidak diubah per frame, gerakkan layer dengan transform") terbukti benar dan menjadi aturan utama gaya SVG.
2. **Biaya capture mendominasi semua gaya: ±170–200 ms per frame**, sedangkan render adegan 3D lengkap hanya 61–89 ms. Jadi efek berat (bloom, DOF, god rays) murah dibandingkan screenshot. Penghematan terbesar datang dari mengganti jalur capture, bukan dari menyederhanakan adegan.
3. **WebCodecs di dalam halaman memangkas waktu ekspor ±3,7× untuk adegan yang 100% kanvas**: 81 ms/frame (60 menit ≈ 2,4 jam), H.264 software (Chromium punya encoder [OpenH264](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/media/video/openh264_video_encoder.cc); bahwa jalur `prefer-software` di Windows memakainya adalah inferensi). **Encoder hardware macet setelah 8 chunk** di headless. Ini mereproduksi temuan [3D-G3], dan kali ini diagnosisnya jelas: `prefer-software` lancar, `prefer-hardware` macet. Konsekuensinya, lapisan DOM (teks/SVG) harus ikut digambar ke kanvas agar jalur ini bisa dipakai.
4. **`HeadlessExperimental.beginFrame` bisa dipakai lewat `chrome-headless-shell`**, tetapi hanya menghemat ±10% (234–331 vs 259–358 ms) dan tidak mengembalikan gambar bila frame tidak berubah (`hasDamage`). Tidak sepadan dengan kerumitannya **[opini]**.
5. **Dua worker paralel ≈ 2× throughput di mesin 2 core ini**: masing-masing tetap ±260 ms/frame. Ini cara termurah untuk memangkas waktu ekspor gaya DOM/SVG dari 8,6 menjadi ±4 jam (`WORKERS=2` sudah ada di `export-frames.mjs`).
6. **WebGPU tidak tersedia di mesin ini:** `requestAdapter()` mengembalikan `null` meski `chrome://gpu` menulis "WebGPU: Hardware accelerated". `WebGPURenderer` three.js otomatis jatuh ke WebGL2, dan post-processing TSL tetap jalan serta deterministik (C4).
7. **Versi:** three.js terbaru **r187 (0.187.0, 2026-10-30)**. `postprocessing` (pmndrs) 6.39.5 hanya mendukung `three >= 0.168 < 0.187`, sedangkan `three-good-godrays` 0.12.1 `<= 0.182` ([npm](https://registry.npmjs.org/postprocessing)). Artinya: **r187 + `three/addons`/TSL**, atau **r186 + pmndrs**. Jangan dicampur.
8. **Efek temporal merusak seek.** `FilmNode` TSL membaca `time` dari `NodeFrame` yang dihitung dari `performance.now()`. `motionBlur` TSL memakai velocity dari matriks frame *sebelumnya*. `TRAANode` dan `AfterImageNode` menyimpan riwayat. **Motion blur akumulasi sub-frame** ([Haeberli & Akeley 1990](https://doi.org/10.1145/97880.97913)) deterministik (diuji) dengan biaya ±4,6× render untuk 8 sampel.
9. **`fePointLight` memang tanpa atenuasi jarak.** Lr hanya bergantung posisi pada spot light ([Filter Effects 1 §9.10](https://www.w3.org/TR/filter-effects-1/#feDiffuseLightingElement)). Skia menyetel eksponen falloff point light = 0. Penampilan obor yang realistis butuh gradien radial terpisah.
10. **Tokoh:** Spine/DragonBones = tulang + slot + attachment + bobot mesh + IK 1–2 tulang ([Spine](http://esotericsoftware.com/spine-ik-constraints)). Itu bisa ditulis ulang kecil di SVG. Kesan manekin lebih disebabkan **bentuk** (kapsul seragam) daripada rig. Jalan keluarnya adalah siluet per bagian yang dirancang (bezier) + IK dua tulang + pustaka pose, atau mengubah kelemahan itu menjadi gaya **wayang kulit** yang memang bersendi **[opini]**.
11. **Gaya baru yang paling layak** **[opini]**:
    - (a) **siluet sinematik** = SVG siluet + satu *lapisan atmosfer* shader WebGL (langit, kabut fBm, god rays, bara, grain, grading);
    - (b) **mata elang 3D** = Three.js terrain + jalur terbang (adegan C1/C2 sudah membuktikan biayanya);
    - (c) **wayang kulit/teater bayangan**.
    
    Gaya painterly (Kuwahara/cat air) dan relief candi hidup layak, tetapi biaya pengembangannya lebih tinggi.

---

## 1. 2D realistis di browser

### 1a. Filter SVG: apa yang dihitung dan di mana

**Spesifikasi**
- `feDiffuseLighting`: `Dr = kd * N.L * Lr`. Permukaan dibentuk dari alfa input, `Z(x,y) = surfaceScale * I(x,y)`, dengan normal dari kernel Sobel dan `Nz = 1` ([Filter Effects 1 §9.10](https://www.w3.org/TR/filter-effects-1/#feDiffuseLightingElement), W3C Working Draft 18 Desember 2018).
- Vektor L untuk point light = arah dari permukaan ke lampu (dinormalisasi). Warna Lr "a function of position in the spot light case only", jadi **tidak ada falloff jarak untuk `fePointLight`**.
- Di Skia, `Light::Point` diberi eksponen falloff `0.f` ([SkLightingImageFilter.cpp](https://skia.googlesource.com/skia/+/refs/heads/main/src/effects/imagefilters/SkLightingImageFilter.cpp)). Ini mengonfirmasi temuan spike.
- `feTurbulence`: spesifikasi menyertakan kode C "the exact algorithm used for this filter effect". `seed` adalah "the starting number for the pseudo random number generator" dan **dipotong ke bilangan bulat** ([§9.21](https://www.w3.org/TR/filter-effects-1/#feTurbulenceElement)).
  - Akibatnya, menganimasikan `seed` menghasilkan lompatan pola, bukan aliran.
  - Kabut yang mengalir lebih baik dibuat dengan menggeser layer turbulence statis lewat transform (murah, lihat 1b) **[opini]**.
- `numOctaves` boleh di-*clamp* oleh UA, dan "User agents may reduce the resolution of filter primitives on limited platform resources" (§9.1). Secara teori hasil bisa berbeda antar mesin, sehingga **ekspor harus di satu mesin/backend** (sama seperti [3D-G2]).

**Implementasi Chrome**
- Blink menerjemahkan `FELighting` menjadi `LightingDistantPaintFilter`/`LightingPointPaintFilter`/`LightingSpotPaintFilter` ([fe_lighting.cc](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/platform/graphics/filters/fe_lighting.cc)).
- Skia mengevaluasinya sebagai `SkRuntimeEffect` shader (normal map + lighting shader) ([SkLightingImageFilter.cpp](https://skia.googlesource.com/skia/+/refs/heads/main/src/effects/imagefilters/SkLightingImageFilter.cpp)). Shader seperti ini berjalan di GPU bila rasterisasi GPU aktif.
- Di mesin ini `chrome://gpu` (headless, argumen ekspor) menulis "Rasterization: Hardware accelerated", "Skia Graphite: Disabled" (jadi Ganesh). Dengan `--disable-gpu`, semuanya menjadi "Software only".

**Caching (diuji)**

| Uji (Lampiran L1) | GPU raster | CPU raster |
|---|---|---|
| Tiga filter berat (gunung: turbulence 5 oktaf + displacement + diffuse; 1.800 bata: diffuse + specular + turbulence; kabut turbulence layar penuh), parameter **statis**, layer digerakkan `transform` | 255 ms | 236 ms |
| Sama, tetapi posisi `fePointLight` dan `seed` berubah tiap frame | **358 ms** | **3.663 ms** |

- Kesimpulan 1: Chrome **tidak menghitung ulang filter** pada layer `will-change:transform` yang hanya berpindah, di GPU maupun CPU. Biaya filter statis per frame ≈ 0 dan yang tersisa adalah biaya capture.
- Kesimpulan 2: filter yang berubah per frame **10× lebih mahal di CPU**. Pastikan `chrome://gpu` menulis "Rasterization: Hardware accelerated" di browser ekspor.
- Angka spike (±7,5 dtk/frame, 1,6 fps) diukur dengan muat ulang halaman per `t` dan dengan filter yang lebih banyak, jadi tidak bisa dibandingkan langsung.

**Konsekuensi desain [opini]**
1. Cahaya yang **dipanggang per shot**: posisi lampu tetap dalam satu shot, dan kamera bergerak lewat transform layer. Ini persis temuan spike.
2. Kedip obor: jangan menggeser `fePointLight`. Pakai layer glow (gradien radial, `mix-blend-mode: screen`) yang opacity/skalanya digerakkan noise ber-seed. Layer ini juga menutup kekurangan "tanpa atenuasi".
3. Batasi `filter` region ke bbox objek (`filterUnits="userSpaceOnUse"` + x/y/width/height), karena biaya sebanding luas piksel.
4. Jangan menaruh filter pada elemen yang ikut di-*scale* setiap frame **di dalam** SVG (`<g transform>`). Itu memaksa raster ulang. Taruh filter di `<svg>` milik layer, lalu scale div-nya (sesuai [3D-E]: satu bidang = satu `<svg>`).

### 1b. Canvas 2D
- `ctx.filter` menerima string `<filter-value-list>`, termasuk referensi `url(#id)` ke filter SVG di dokumen ([HTML §filters](https://html.spec.whatwg.org/multipage/canvas.html#canvasfilters)). Kanvas disimpan di GPU ("hardware accelerated") kecuali `willReadFrequently: true`, yang memberi tahu UA bahwa "it is advantageous to use a software canvas" ([HTML §will read frequently](https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently)). `chrome://gpu` di mesin ini: "Canvas: Hardware accelerated".
- Kelebihan Canvas 2D dibanding SVG untuk gaya ini adalah ribuan partikel (bara, debu, daun) tanpa ribuan node DOM, dan hasilnya bisa langsung diserahkan ke WebCodecs (§5). Kekurangannya, tidak ada pencahayaan relief bawaan **[opini]**. Tidak diukur di riset ini.

### 1c. WebGL fragment shader untuk 2D
Satu segitiga layar penuh + shader adalah cara paling murah untuk mendapat "atmosfer film". Adegan uji B ([Lampiran L1](#lampiran-uji-empiris)) memuat semua bahan berikut dan dirender dalam **63 ms** di HD 4000. Rinciannya, beserta acuan tekniknya:
- **fBm** (jumlah oktaf noise nilai, 6 oktaf): siluet gunung berlapis, dengan perspektif udara = warna dicampur ke warna kabut sesuai kedalaman lapis.
- **SDF 2D** (jarak bertanda ke kotak): gapura berundak. Rim light didapat gratis dari `smoothstep(lebar, 0, abs(d))`. Contoh rumus SDF 2D: artikel Inigo Quilez *2D distance functions* (lihat "Fakta yang tidak bisa diverifikasi": situsnya mengembalikan 404 saat riset).
- **God rays sebagai post-process.** Mengikuti [GPU Gems 3 bab 13, Kenny Mitchell (EA)](https://developer.nvidia.com/gpugems/gpugems3/part-ii-light-and-shadows/chapter-13-volumetric-light-scattering-post-process):
  - Penghalang dirender hitam dalam pre-pass, lalu tiap piksel mengambil sampel di sepanjang garis menuju posisi layar matahari dengan parameter `density`, `weight`, `decay`, `exposure`. Hasilnya ditambahkan secara aditif.
  - Batasan yang disebut artikel: berkas bisa tampak di depan objek dekat, berkedip saat penghalang melewati tepi layar, dan rusak bila kamera tegak lurus arah cahaya (posisi layar lampu → tak hingga), sehingga perlu di-*clamp* atau dipudarkan.
  - Di uji B, alfa pass pertama dipakai sebagai mask langit, sehingga pre-pass terpisah tidak perlu.
- **Grain + vignette** di pass yang sama: noise hash dari `uv + t`. Deterministik karena `t` = jam master.
- **Api dan asap:** fBm yang digeser ke atas + *domain warping* + palet hitam-merah-kuning, atau partikel aditif. **Air:** pantulan cermin vertikal dari lapisan di atas garis air yang di-*displace* noise **[opini]**; teknik standar Shadertoy, tidak diukur.
- **Normal map 2D (sprite lighting):** tiap bentuk diberi normal dari gradien SDF/heightmap-nya sendiri, lalu dinyalakan oleh lampu titik dengan atenuasi. Ini konsep yang sama dengan lampu 2D Godot yang memakai normal map per sprite ([Godot 2D lights and shadows](https://docs.godotengine.org/en/stable/tutorials/2d/2d_lights_and_shadows.html)). Bedanya, normal di sini dihitung di shader, bukan dari gambar, jadi tetap 100% kode **[opini]**.

### 1d. NPR / painterly (makalah asli)

| Teknik | Sumber | Inti | Kelayakan di WeVai **[opini]** |
|---|---|---|---|
| Kuwahara anisotropik | [Kyprianidis, Kang & Döllner 2009, CGF](https://doi.org/10.1111/j.1467-8659.2009.01574.x) | Rata-rata sektor dengan varians terkecil, diorientasikan oleh *structure tensor* → sapuan kuas mengikuti bentuk | Tinggi: satu pass post di atas render 2D/3D. Biaya sebanding jumlah sektor × radius |
| Cat air | [Curtis dkk. 1997, SIGGRAPH](https://doi.org/10.1145/258734.258896) (simulasi fluida); [Bousseau dkk. 2006](https://doi.org/10.1145/1124728.1124751) (versi interaktif: abstraksi + tekstur kertas + *edge darkening* + koherensi temporal) | Bousseau = serangkaian filter layar, cocok untuk shader | Sedang: edge darkening + granulasi noise mudah; koherensi temporal perlu tekstur kertas yang diproyeksikan ke dunia, bukan ke layar |
| Hatching | [Praun, Hoppe, Webb & Finkelstein 2001](https://doi.org/10.1145/383259.383328) | *Tonal art maps*: tekstur arsir bertingkat dipilih menurut terang | Sedang di 3D; di 2D cukup pola garis SVG yang di-mask luminans |
| Toon/cel | [Lake dkk. 2000, NPAR](https://doi.org/10.1145/340916.340918) | Tabel tone 1D diindeks `N·L`, plus garis siluet | Sudah ada (`MeshToonMaterial`, `OutlineEffect`) [3D-C] |

### 1e. Mana yang realistis ditulis dan dipelihara agen AI **[opini]**
- **SVG + filter statis**: paling mudah diperiksa (DOM bisa dibaca, dan lint repo sudah ada). Cocok untuk siluet, ornamen, dan relief. Jangan menganimasikan parameter filter.
- **Shader WebGL fragment tunggal**: kode sedikit (±60 baris untuk adegan B) dan efek atmosfer terbaik per ms. Risikonya, kesalahan hanya terlihat di gambar, jadi wajib `snap.mjs`. Batasi menjadi **satu modul "atmosfer" yang diparameterkan** (warna langit, posisi matahari, densitas kabut, kekuatan god rays, grain, LUT), bukan shader baru per video.
- **Canvas 2D**: untuk partikel.
- **NPR**: sebagai pass pilihan di atas modul atmosfer, setelah gaya dasar stabil.

---

## 2. Dunia 3D prosedural di Three.js

**Versi.** `three@0.187.0` = r187, terbit 2026-10-30 ([npm](https://registry.npmjs.org/three), [rilis r187](https://github.com/mrdoob/three.js/releases/tag/r187)). Starter masih r161. Perubahan r161→r186 ada di [3D-A…D]. Butir r187 yang relevan:
- "Fix ACES Filmic fit denominator" (#35110): keluaran ACES sedikit berubah.
- Perbaikan bayangan PCF dan seam bayangan point light.
- `BatchedMesh` menggabungkan draw berurutan yang berbagi rentang geometri (#35259) dan memperbaiki korupsi sort.
- `SVGLoader` mendukung `href` di `<use>` (#35165) dan parsing path yang lebih baik.
- Fungsi TSL baru `lensDirt` (#34715).
- Kode yang deprecated sejak r177 dihapus (#34517). Ada [panduan migrasi 186→187](https://github.com/mrdoob/three.js/wiki/Migration-Guide#186--187).

**Kompatibilitas pustaka (npm, 2026-11-01).**
- `postprocessing` 6.39.5: peer `three >= 0.168.0 < 0.187.0`; tag `beta` = 7.0.0-beta.16 ([registry](https://registry.npmjs.org/postprocessing)).
- `three-good-godrays` 0.12.1: peer `three <= 0.182.0` ([registry](https://registry.npmjs.org/three-good-godrays)). Ini pustaka yang kini dipakai contoh `webgl_postprocessing_godrays` r187.
- `GodRaysShader` lama tidak ada lagi di paket npm 0.187.0 (dicek di [daftar berkas jsDelivr](https://data.jsdelivr.com/v1/packages/npm/three@0.187.0?structure=flat)).

### 2a. Terrain, vegetasi, langit, kabut
- **Terrain:**
  - `PlaneGeometry` yang verteksnya diangkat fBm `ImprovedNoise` (deterministik, [3D-A6]), dengan warna verteks menurut tinggi (sawah/lereng/batu). Lembah sungai dibuat dengan mengalikan tinggi dengan fungsi jarak ke kurva sungai (adegan C1).
  - Varian GPU: contoh resmi [`webgpu_tsl_procedural_terrain`](https://github.com/mrdoob/three.js/blob/r187/examples/webgpu_tsl_procedural_terrain.html) menghitung elevasi di shader TSL dengan `mx_noise_float` + domain warping. Hanya untuk `WebGPURenderer`.
- **Vegetasi:**
  - `InstancedMesh`: satu geometri, banyak matriks. 12.000 pohon dalam satu draw call di adegan C1.
  - `BatchedMesh`: "a large number of objects with the same material but with different geometries or world transformations" ([BatchedMesh.js r187](https://github.com/mrdoob/three.js/blob/r187/src/objects/BatchedMesh.js)). Cocok untuk campuran pohon kelapa/pisang/rumah dengan satu material.
  - Penempatan memakai PRNG ber-seed (`mulberry32`, sama dengan starter).
- **Langit:**
  - `Sky` = model Preetham ("A Practical Analytic Model for Daylight", [Preetham, Shirley & Smits 1999](https://doi.org/10.1145/311535.311545)). Kelas ini "can only be used with WebGLRenderer"; untuk `WebGPURenderer` pakai `SkyMesh` ([Sky.js r187](https://github.com/mrdoob/three.js/blob/r187/examples/jsm/objects/Sky.js)).
  - Model Hosek–Wilkie ([2012](https://doi.org/10.1145/2185520.2185591)) **tidak ada** di paket three 0.187.0 (dicari di daftar berkas). Kalau perlu, ia harus ditulis sendiri.
  - Untuk senja sinematik, Preetham dengan `turbidity` 8–10 dan matahari 2–6° di atas cakrawala sudah memadai **[opini]**. Hati-hati: matahari di dalam frame + bloom langsung *blown out* (lihat tangkapan C2). Turunkan `toneMappingExposure` atau `mieCoefficient`.
- **Kabut:**
  - `FogExp2`: `fogFactor = 1 - exp(-density² · d²)` ([fog_fragment.glsl.js r187](https://github.com/mrdoob/three.js/blob/r187/src/renderers/shaders/ShaderChunk/fog_fragment.glsl.js)).
  - **Kabut ketinggian** tersedia sebagai TSL `exponentialHeightFogFactor(density, height)` ("Everything below this y-coordinate is affected by fog") ([nodes/fog/Fog.js r187](https://github.com/mrdoob/three.js/blob/r187/src/nodes/fog/Fog.js), contoh [`webgpu_fog_height`](https://github.com/mrdoob/three.js/blob/r187/examples/webgpu_fog_height.html)). Hanya untuk `WebGPURenderer`/TSL. Di `WebGLRenderer` perlu `onBeforeCompile` sendiri **[opini]**.
  - Volume kabut bercahaya: [`webgpu_volume_lighting`](https://github.com/mrdoob/three.js/blob/r187/examples/webgpu_volume_lighting.html) memakai `VolumeNodeMaterial` (`steps = 12`, noise Perlin 3D, dithering Bayer). Tidak diukur.
- **Bayangan dan tone mapping:** lihat [3D-B2], [3D-B4]. Untuk gaya sinematik, ACES/AgX + `toneMapped:false` pada elemen warna merek.
- **Siluet 2D → 3D:** `SVGLoader.parse` + `createShapes` + `ExtrudeGeometry` [3D-C]. Ornamen gapura dan relief bisa ditulis sebagai path SVG sekali, lalu dipakai di gaya 2D maupun 3D **[opini]**.

### 2b. Post-processing: tiga jalur

| Jalur | Renderer | Status di r187 | Catatan determinisme |
|---|---|---|---|
| `three/addons` `EffectComposer` (`UnrealBloomPass`, `BokehPass`, `SMAAPass`, `OutputPass`, `LUTPass`, …) | `WebGLRenderer` | Ada | Tabel [3D-D2]. Bloom + Bokeh diuji deterministik di r187 (C2) |
| pmndrs `postprocessing` (`EffectPass` menggabungkan efek dalam satu shader, `GodRaysEffect`, `LUT3DEffect`, `ChromaticAberrationEffect`, `NoiseEffect`, …) | `WebGLRenderer` | **Belum mendukung r187** (peer `< 0.187`) | [3D-D1]: `composer.render(0)` + `time` manual |
| TSL `RenderPipeline` (dulu `PostProcessing`, ganti nama dengan peringatan "PostProcessing has been renamed to RenderPipeline" di build r187) | `WebGPURenderer` (fallback WebGL2) | Ada: `bloom`, `dof`, `godrays`, `lut3D`, `film`, `chromaticAberration`, `motionBlur`, `traa`, `smaa`, `sobel`, `afterImage`, `lensflare`, `lensDirt`, `denoise` ([examples/jsm/tsl/display](https://github.com/mrdoob/three.js/tree/r187/examples/jsm/tsl/display)) | Lihat di bawah. Bloom + DOF diuji deterministik (C4) |

**Determinisme efek TSL (dari kode sumber r187):**
- **`time` TSL tidak deterministik.** `NodeFrame.update()` menghitung `deltaTime = (performance.now() - lastTime)/1000` ([NodeFrame.js](https://github.com/mrdoob/three.js/blob/r187/src/nodes/core/NodeFrame.js)). `film()` memakai `rand(fract(uv + time))` ([FilmNode.js L67](https://github.com/mrdoob/three.js/blob/r187/examples/jsm/tsl/display/FilmNode.js#L67)). Penawarnya: beri argumen `uvNode` sendiri yang memuat `uniform(t)` dari jam master. Larangan yang sama berlaku untuk setiap shader TSL yang memakai `time`.
- **`motionBlur(input, velocity)`** memakai velocity dari `VelocityNode`, yang menyimpan `previousModelWorldMatrix`/`previousCameraViewMatrix` dari frame yang **dirender sebelumnya** ([VelocityNode.js](https://github.com/mrdoob/three.js/blob/r187/src/nodes/accessors/VelocityNode.js), [MotionBlur.js](https://github.com/mrdoob/three.js/blob/r187/examples/jsm/tsl/display/MotionBlur.js)). Hasilnya bergantung urutan render: seek langsung ke t memberi blur nol/salah, begitu pula frame pertama tiap worker. Cara aman: render `t − 1/fps` dulu (pre-roll) sebelum frame t **[opini, tidak diuji]**, atau pakai akumulasi (§3d).
- **`traa()`** (*Temporal Reprojection AA*) dan **`afterImage()`** menyimpan riwayat render target. Hindari, sama seperti `TAARenderPass accumulate` [3D-D2].
- **`godrays()`** adalah raymarch shadow map dengan `interleavedGradientNoise(screenCoordinate)` (noise ruang-layar, bukan waktu). Batasan resminya: "Only point and directional lights" dan "requires a full shadow setup" ([GodraysNode.js](https://github.com/mrdoob/three.js/blob/r187/examples/jsm/tsl/display/GodraysNode.js)). Ia diturunkan dari three-good-godrays. Tidak diukur.

**WebGPU di mesin ini:** `navigator.gpu.requestAdapter()` = `null` dengan tiga set argumen (termasuk `--enable-unsafe-webgpu`), padahal `chrome://gpu` menulis "WebGPU: Hardware accelerated". `WebGPURenderer` jatuh ke backend WebGL2 secara otomatis (`r.backend.isWebGPUBackend === false`), dan C4 berjalan normal. **[opini]** Kalau TSL dipakai, ia dipakai demi API node-nya, bukan demi kecepatan WebGPU.

---

## 3. Kamera sinematik & "mata elang"

Kosakata kamera dasar (`shot/angle/lens/focus/rackFocus/light`) sudah ada di `references/sinematografi.md`, dan dasar rel, quaternion, serta noise ada di [3D-A5, A6]. Bagian ini menambah yang khusus terbang.

### 3a. Jalur terbang
- `CatmullRomCurve3(points, false, 'centripetal')` + `getPointAt(u)` (parameter panjang busur; naikkan `arcLengthDivisions` untuk jalur panjang) [3D-A5]. Adegan C1 memakai 7 titik dan `arcLengthDivisions = 2000`.
- `Curve.computeFrenetFrames(segments)` memberi tangent/normal/binormal. Implementasinya merujuk Bloomenthal TR425 ([Curve.js r187 L331–340](https://github.com/mrdoob/three.js/blob/r187/src/extras/core/Curve.js#L331-L340)) dan meminimalkan puntiran. **[opini]** Untuk kamera, lebih mudah dikendalikan bila orientasi = `lookAt(titik u+Δ)` (look-ahead) + `up` dunia + roll eksplisit. Normal Frenet berputar mengikuti kelengkungan 3D, bukan mengikuti "langit di atas", sehingga horizon bisa terbalik.
- **Look-ahead:** target pandang = `getPointAt(u + 0,02…0,05)`. Semakin jauh, semakin "halus/sinematik"; semakin dekat, semakin "FPV agresif" **[opini]**.
- **Speed ramp:** u = `ease(t)` dengan kurva dari `CustomEase` (GSAP) [3D-F]. Untuk efek "melambat di celah gapura lalu melesat naik", pakai segmen u yang diatur per detik.
- **Menembus celah gapura:** titik jalur harus melewati pusat celah, dengan jarak bebas ≥ near plane + setengah lebar frustum di jarak near **[opini]**. Periksa dengan `snap.mjs` di detik melintas.
- **Naik mendadak memperlihatkan gunung (reveal):** pitch kamera tetap menatap ke depan sementara posisi naik, lalu target pandang berpindah dari tanah ke cakrawala. Ini dua kurva: posisi dan target [3D-A5].

### 3b. Banking dari kelengkungan
- Fisika belok terkoordinasi: `tan φ = v²/(g·r) = v·ω/g` (ω = laju perubahan arah horizontal). Gaya dan *load factor* pada belokan dibahas di [FAA Pilot's Handbook of Aeronautical Knowledge](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak) (bab *Aerodynamics of Flight*). Rumus di atas diturunkan dari keseimbangan gaya, bukan dikutip.
- Implementasi di C1 (deterministik, murni fungsi t): ambil arah horizontal di `u−δ` dan `u+δ`, `k = cross_y(d1, d2)`, lalu `roll = clamp(−k·gain, ±0,6 rad)`. Roll ±20–35° terasa seperti drone FPV atau elang; lebih dari 45° membuat penonton pusing **[opini]**.

### 3c. Guncangan kamera
- Model "trauma" [Squirrel Eiserloh, GDC 2016 *Juicing Your Cameras With Math*](https://www.gdcvault.com/play/1023557/Math-for-Game-Programmers-Juicing): guncangan = trauma² × noise Perlin (bukan random) pada rotasi (dan sedikit translasi), dan trauma meluruh terhadap waktu.
- Di WeVai, trauma diambil dari kurva jam master, bukan dari peluruhan berbasis delta frame. Noise memakai `ImprovedNoise` [3D-A6]. C1 menambah dua oktaf noise pitch/yaw ±0,004 rad.

### 3d. Motion blur
- **Akumulasi sub-frame** ([Haeberli & Akeley 1990, *The Accumulation Buffer*](https://doi.org/10.1145/97880.97913)):
  - Render N kali pada `t + (i/N − 0,5)·shutter` ke render target HalfFloat, lalu rata-ratakan.
  - Shutter 180° = setengah interval frame. "By far the most common setting for cinema has been a shutter angle near 180°" ([RED, *Shutter Angle*](https://www.red.com/red-101/shutter-angle-tutorial)).
  - **Deterministik** karena tiap sub-frame murni fungsi t (diuji: hash identik).
  - Biaya terukur N=8: render 283 ms vs 61 ms (4,6×), total 491 vs 259 ms.
  - Pakai hanya di segmen cepat (menukik, whip-pan) **[opini]**.
- **Velocity buffer** ([McGuire dkk. 2012, *A Reconstruction Filter for Plausible Motion Blur*](https://doi.org/10.1145/2159616.2159639); TSL `motionBlur`) lebih murah, tetapi bergantung frame sebelumnya (§2b).
- 2D/SVG: motion blur berarah sudah ada di `techniques.md` §2.

### 3e. DOF/rack focus, letterbox, flare
- **DOF:**
  - `BokehPass` (C2: bloom + bokeh hanya +28 ms di adegan ini) dan TSL `dof(color, viewZ, focusDistance, focalLength, bokehScale)` (C4).
  - Rack focus = tween `focus` dari jarak subjek A ke B; jaraknya dihitung dari `camera.position.distanceTo(subjek)` per frame (C1/C2).
  - Catatan [3D-D2]: di uji koordinator sebelumnya, `BokehPass` mahal (169 ms). Biayanya sangat bergantung jumlah tumpang-tindih dan resolusi. Ukur per adegan.
- **Letterbox 2,39:1:** dua bilah DOM hitam masing-masing `(1080 − 1920/2,39)/2 ≈ 138 px`. Ini lapisan DOM, jadi tidak ikut jalur WebCodecs kecuali digambar di kanvas.
- **Lens flare:**
  - Addon `Lensflare` (WebGL) membutuhkan tekstur, yang bisa dibuat dari kanvas (gradien radial), jadi tetap 100% kode.
  - Versi TSL: `lensflare()` (ghost berbasis bloom) dan `lensDirt()` (r187, tekstur debu).
  - Pakai hemat: satu flare per "momen matahari" **[opini]**.

### 3f. Alat keyframe kamera
- Theatre.js: status dan lisensi ada di [3D-F] (rilis terakhir 0.7.2 2024-05-19, studio AGPL, pengembangan publik mandek). **Tidak disarankan.**
- **[opini]** Untuk agen AI, "rute" lebih baik ditulis sebagai data kecil yang bisa dibaca: titik kontrol + target + roll + ease per segmen (JSON di dalam `index.html`), lalu diperiksa dengan lembar kontak. Editor visual tidak membantu agen.

---

## 4. Tokoh prosedural

### 4a. Cara kerja rig 2D profesional (acuan konsep)
- Spine:
  - Skeleton adalah hierarki tulang. "Each bone has a rotation, translation, scale, and shear", dan transform induk diwariskan ke anak.
  - Gambar menempel ke **slot**, slot ke tulang. "Slots exist to facilitate flexible draw order". Satu slot bisa menampung beberapa attachment, tetapi hanya satu yang terlihat (misalnya tangan mengepal vs terbuka) ([Spine basic concepts](http://esotericsoftware.com/spine-basic-concepts)).
  - Mesh berbobot: "Weights are used to bind attachment vertices to bones" ([Spine weights](http://esotericsoftware.com/spine-weights)).
  - IK: "Spine IK's can constrain one or two bones", dengan *bend direction*, *mix* FK/IK, *softness*, dan *stretch* ([Spine IK constraints](http://esotericsoftware.com/spine-ik-constraints)).
  - Runtime resmi: [spine-runtimes](https://github.com/EsotericSoftware/spine-runtimes). Lisensinya berbayar, dan data rig berasal dari editor Spine, jadi **bukan 100% kode**.
- DragonBones memakai model yang serupa (armature/bone/slot/display/mesh) dengan runtime JS terbuka ([DragonBonesJS](https://github.com/DragonBones/DragonBonesJS)).
- **[opini]** Yang perlu ditiru hanyalah konsepnya, cukup dalam ±150 baris di runtime WeVai: tulang (transform hierarkis) → slot (`<g>` dengan urutan gambar yang bisa diubah per pose) → attachment (path SVG yang dirancang) + IK dua tulang. Mesh berbobot di SVG tidak praktis. Penggantinya adalah sambungan yang disembunyikan (siku/lutut ditutup bentuk sendi atau kain), persis cara wayang kulit.

### 4b. IK & gerak
- **Dua tulang (analitik):** sudut lutut/siku dari hukum kosinus, ditambah *bend direction* (tanda). Rumus ini tertutup, murah, dan deterministik.
- **FABRIK** untuk rantai panjang (ekor, selendang, ular, umbul-umbul) ([Aristidou & Lasenby 2011, *Graphical Models* 73(5):243–260](https://doi.org/10.1016/j.gmod.2011.05.003)). Three.js punya `CCDIKSolver` (addon, contoh `webgl_animation_skinning_ik`).
- **Siklus jalan prosedural:** [David Rosen, GDC 2014 *An Indie Approach to Procedural Animation*](https://www.gdcvault.com/play/1020583/Animation-Bootcamp-An-Indie-Approach) menunjukkan bahwa beberapa pose kunci + interpolasi + gerak sekunder prosedural sudah cukup meyakinkan. Untuk WeVai **[opini]**: kaki = IK dua tulang ke titik pijak yang dijadwalkan per fase (kontak, turun, lewat, naik), pinggul naik-turun 2× per siklus, bahu berlawanan pinggul, kepala dengan lag kecil, dan semuanya fungsi `t`.
- **Proporsi anatomi:** acuan kanon ilustrator adalah Andrew Loomis, *Figure Drawing for All It's Worth* (1943) ([Internet Archive](https://archive.org/details/loomis_FIGURE_draw)): tinggi ±7½ kepala untuk orang biasa, 8 kepala untuk figur ideal/heroik (lihat "Fakta yang tidak bisa diverifikasi" soal halaman tepatnya).

### 4c. 3D dan SDF
- **SkinnedMesh dari kode:** demo dokumentasi three.js [`bones-browser`](https://github.com/mrdoob/three.js/blob/r187/docs/scenes/bones-browser.html) membangun silinder bertulang tanpa model eksternal. `skinIndex`/`skinWeight` dihitung dari ketinggian verteks (`skinIndices.push(skinIndex, skinIndex+1, 0, 0)`), lalu `new SkinnedMesh(geometry, material)` + `new Skeleton(bones)`. Tubuh low-poly dari primitif yang di-skin dengan cara ini layak untuk gaya diorama.
- **Tokoh SDF/raymarch:** Inigo Quilez membuat tokoh animasi sepenuhnya dari rumus ("Selfie Girl"; video [*Painting a Character with Maths*](https://www.youtube.com/watch?v=8--5LwHRhjk), 2020). Teknik intinya adalah *smooth minimum* antar primitif, *domain repetition*, dan pencahayaan outdoor tiga lampu. **[opini]** Kualitasnya bisa sangat tinggi, tetapi raymarch layar penuh di HD 4000 pada 1080p kemungkinan ratusan ms/frame (tidak diukur), dan memelihara satu shader tokoh panjang sulit bagi agen. Cocok untuk satu shot pahlawan, bukan untuk pemeran berulang.

### 4d. Seberapa realistis & arsitektur yang disarankan **[opini]**
- 100% kode **tidak akan** menyamai ilustrasi manusia dalam anatomi wajah close-up. Sinema siluet justru tidak membutuhkannya. Target yang realistis: **siluet yang terbaca** (kontur kepala/mahkota/keris/kain), **gestur** (pose kunci yang kuat), dan **cahaya** (rim light dari sumber yang jelas).
- Arsitektur:
  1. pustaka bagian tubuh sebagai path bezier yang dirancang per peran (raja, prajurit, petani, pendeta), bukan kapsul;
  2. rig tulang + slot kecil di runtime bersama;
  3. IK dua tulang untuk kaki/tangan;
  4. pustaka pose bernama (`sembah`, `menunjuk`, `berjalan`, `berkuda`) yang di-tween;
  5. gerak sekunder (kain, selendang) lewat FABRIK atau pegas yang dihitung analitik dari t;
  6. tokoh selalu dibingkai sebagai siluet/semi-siluet dengan rim light, sehingga detail wajah tidak dibutuhkan.

---

## 5. Performa & ekspor video panjang

**Anggaran.** 60 menit × 30 fps = 108.000 frame. Pada 285 ms/frame (C2), itu ±8,6 jam di satu worker.

| Jalur | Menangkap DOM? | Terukur di mesin ini | 108k frame | Catatan / sumber |
|---|---|---|---|---|
| `page.screenshot` JPEG q80 (repo sekarang) | ✔ | 255–358 ms (DOM/SVG/WebGL) | 7,7–10,7 j | [3D-G3] |
| Idem, **2 worker paralel** | ✔ | 257 + 263 ms berjalan bersamaan → efektif ±130 ms | ±3,9 j | `WORKERS=2` di `export-frames.mjs` |
| `HeadlessExperimental.beginFrame` + screenshot | ✔ | 234–331 ms (±10% lebih cepat) | 7,0–9,9 j | Hanya `chrome-headless-shell`. Target harus dibuat dengan `enableBeginFrameControl` ("headless shell only, not supported on MacOS yet") ([protokol](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/browser_protocol.json)). Tanpa `screenshotData` bila tidak ada *damage*. Mode lama hanya tersedia sebagai biner terpisah sejak Chrome 132 ([Chrome Headless](https://developer.chrome.com/docs/chromium/headless)) |
| **WebCodecs `VideoEncoder` di halaman**, H.264 `prefer-software` | ✘ (kanvas saja) | **81 ms** termasuk render 63 ms; 90 frame → 4,47 MB @12 Mbps | **±2,4 j** | [W3C WebCodecs](https://www.w3.org/TR/webcodecs/#enumdef-hardwareacceleration), backpressure lewat [`encodeQueueSize`](https://www.w3.org/TR/webcodecs/#dom-videoencoder-encodequeuesize) + [`flush()`](https://www.w3.org/TR/webcodecs/#dom-videoencoder-flush) |
| WebCodecs `prefer-hardware` | ✘ | **Macet** setelah 8 chunk (antrean 5, tanpa error) | — | Mereproduksi [3D-G3]. Selalu pakai `prefer-software` di headless |
| `canvas.captureStream()` + `MediaRecorder` | ✘ | Tidak diuji | — | Spesifikasi menyebutnya "real-time video capture". Frame diambil saat kanvas dicat; `frameRequestRate = 0` + `requestFrame()` untuk manual ([Media Capture from DOM Elements](https://www.w3.org/TR/mediacapture-fromelement/), WD 2025-02-12, "not intended for implementation"). MediaRecorder memberi stempel waktu jam dinding, jadi tidak cocok untuk ekspor deterministik **[opini]** |

**Muxing WebCodecs.** Mediabunny `CanvasSource(canvas, {codec, quality})` + `await canvasSource.add(timestamp, duration)`. `add` mengembalikan promise yang menyalurkan backpressure ([Mediabunny media sources](https://mediabunny.dev/guide/media-sources)). Versi 1.65.0, MPL-2.0 ([npm](https://registry.npmjs.org/mediabunny)). Chunk H.264 juga bisa dikirim mentah ke Node (`exposeFunction`, ±50 KB/frame pada 12 Mbps) dan di-mux oleh ffmpeg (`-f h264`), tanpa pustaka tambahan **[opini, belum diuji]**.

**Cara alat lain.**
- **Remotion** (4.0.539): screenshot per frame lewat CDP, JPEG default ("the fastest"). `concurrency` default "half of the CPU threads available". *Parallel encoding* meng-encode sambil merender ([renderMedia](https://www.remotion.dev/docs/renderer/render-media)). Sejak v4.0.534 ada **shared-memory capture**, yang mengirim bitmap ke ffmpeg tanpa kompresi JPEG lewat Chromium 157 yang **di-patch**. Fitur ini "Not used on Windows" ([shared-memory capture](https://www.remotion.dev/docs/shared-memory-capture)). Artinya Remotion di Windows memakai jalur yang sama dengan WeVai, ditambah konkurensi.
- **Motion Canvas** (3.17.2, rilis terakhir 2024-12-14): RENDER memutar animasi di browser dan menyimpan urutan gambar. Konversi ke video diserahkan ke ffmpeg/editor ([rendering](https://motioncanvas.io/docs/rendering/)).
- **Revideo** (0.11.0, 2026-07-10, MIT): "headless render API" dan *parallel rendering* yang membagi render ke beberapa worker ([repo](https://github.com/redotvideo/revideo)).
- Tidak satu pun punya jalur yang lebih cepat dari "screenshot + paralel" untuk konten DOM di Windows.

**GPU headless di Windows.**
- Dengan argumen ekspor repo, WebGL = `ANGLE (Intel HD Graphics 4000 Direct3D11)`.
- `--disable-gpu` → WARP. Render shader B naik dari 63 ke 1.975 ms (31×), dan filter SVG dinamis 10×.
- Switch `--use-angle=d3d11`/`--use-gl=angle` didefinisikan di [gl_switches.cc](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/ui/gl/gl_switches.cc) [3D-G2].
- **Wajib:** log `GLINFO`/`chrome://gpu` di awal ekspor. Gagal diam-diam ke WARP berarti waktu render ×10–30 **[opini]**.

**[opini] Arsitektur ekspor untuk video 60 menit:**
1. **Sekarang, tanpa kode baru:** `WORKERS=2`, JPEG q80, filter statis per shot. Hasilnya ±4 jam per 60 menit untuk gaya DOM/SVG. Jalankan bersama penahan sleep (memori "Render & laptop sleep").
2. **Gaya kanvas murni** (shader atmosfer, 3D, partikel, teks digambar ke kanvas): tambahkan mode `ENCODER=webcodecs` di `export-frames.mjs`. Halaman me-render frame → `VideoFrame(canvas)` → `VideoEncoder` `prefer-software` → chunk dikirim ke Node → ffmpeg mux + audio. Perkiraan ±2,4 jam per 60 menit **di satu worker**. Dua worker belum tentu menolong karena encoder OpenH264 juga memakan CPU (belum diuji).
3. **Potong per bab:** render tiap bab sebagai berkas terpisah, lalu sambung dengan ffmpeg concat. Kegagalan di menit ke-50 tidak mengulang semuanya. `export-frames.mjs` sudah menyambung potongan antar worker dengan cara ini.

---

## 6. Bukti dari prior art (kode murni)

- **"Elevated"** (Rgba & TBC, 4k intro, Breakpoint 2009) memenangkan Scene.org Award *best 4k intro* ([pouët](https://www.pouet.net/prod.php?which=52938)). Seluruh lanskap pegunungan bersalju, kamera terbang, kabut, dan cahaya dihasilkan dari kode ≤ 4 KB.
  - Tekniknya, menurut presentasi Quilez *Rendering Worlds with Two Triangles* (NVScene 2008, lihat "Fakta yang tidak bisa diverifikasi"): terrain fBm dengan turunan analitik untuk normal, raymarching heightfield, kabut eksponensial berwarna matahari, dan pencahayaan matahari + langit + pantulan.
  - Implikasi untuk WeVai: **"mata elang" di atas lanskap prosedural memang mungkin 100% kode**. Raymarch layar penuh berat di HD 4000, jadi versi mesh Three.js (C1) lebih realistis untuk mesin ini **[opini]**.
- **Farbrausch** (fr-041 *debris*, *.kkrieger*): kode alat mereka dirilis BSD/public domain ([fr_public](https://github.com/farbrausch/fr_public)). Di dalamnya ada **OpenKTG**, generator tekstur prosedural yang "turning this into pixel shaders+JS code should work" (README). Ini sumber resep tekstur batu/bata/kayu 100% kode.
- **Inigo Quilez, seri "Painting with Maths":** [*Painting a Character with Maths*](https://www.youtube.com/watch?v=8--5LwHRhjk), [*I painted a Landscape with Mathematics*](https://www.youtube.com/watch?v=BFld4EBO2RE), [*Learn to Paint with Mathematics*](https://www.youtube.com/watch?v=0ifChJ0nJfM). Pelajaran yang dapat dipindahkan: komposisi dan cahaya lebih penting daripada jumlah detail; tokoh dan lanskap dibangun dari SDF + noise; satu matahari kunci + langit pengisi + pantulan memberi kesan "film".
- **Contoh resmi three.js r187** yang langsung relevan: `webgl_shaders_sky`, `webgl_geometry_terrain`, `webgl_instancing_scatter`, `webgl_postprocessing_godrays`, `webgl_postprocessing_3dlut`, `webgl_animation_skinning_ik`, `webgpu_fog_height`, `webgpu_volume_lighting`, `webgpu_volume_fire`, `webgpu_tsl_procedural_terrain`, `webgpu_postprocessing_motion_blur`, `webgpu_postprocessing_lensflare` ([daftar files.json r187](https://github.com/mrdoob/three.js/blob/r187/examples/files.json)).
- **Remotion/Motion Canvas** adalah bukti **alur kerja** (video yang ditulis sebagai kode dan di-render frame-per-frame), bukan bukti visual. Gaya mereka umumnya grafik datar.

---

## 7. Gaya baru yang layak 100% kode **[opini]**

Biaya render dari pengukuran (§Ringkasan) pada 1080p di mesin pemilik, 1 worker.

| Gaya | Ciri | Teknik inti | Biaya render | Risiko | Sejarah Jawa | Non-sejarah (promo/SaaS) |
|---|---|---|---|---|---|---|
| **Siluet sinematik** (paling dekat patokan) | Lapis siluet gelap, rim light jingga, langit senja/api, god rays, kabut berlapis, bara, grading serempak | SVG siluet per layer (paralaks `[data-z]`) + **modul atmosfer WebGL** di belakang/di depan (langit, kabut fBm, god rays GPU Gems, bara, grain, LUT) + layer glow obor | ±260–360 ms (A1/B), WebCodecs bila semua di kanvas | Rim light pada SVG perlu path offset/stroke tersendiri; konsistensi warna antar lapisan DOM dan WebGL | **Sangat cocok**: perang, istana malam, upacara, pelayaran | Cocok untuk hero opener dramatis, kurang untuk UI |
| **Mata elang 3D** (momen khusus) | FPV/drone di atas sawah, sungai, hutan, menembus gapura, reveal gunung | Three.js terrain fBm + InstancedMesh + Sky + FogExp2/height fog + kurva terbang + banking + shake + bloom/DOF; motion blur akumulasi hanya di segmen menukik | 259–285 ms; 491 ms dengan MB×8 | Low-poly terlihat "game" tanpa kabut dan grading kuat; menembus celah perlu dicek per frame | **Sangat cocok** untuk pembuka bab dan perpindahan wilayah (Mataram → Jawa Timur) | Cocok: fly-through kota/pabrik/peta |
| **Peta relief 3D topografi** | Pulau Jawa sebagai relief dengan sungai, gunung, rute pasukan menyala | Heightmap prosedural yang dibentuk tangan (gunung sebagai fungsi Gauss di koordinat nyata) + garis rute `TubeGeometry` + label DOM | ±60–90 ms render | Garis pantai harus dari data vektor (boleh ditulis sebagai path kode); akurasi geografi | Cocok (sudah ada kulit topografi di Jagad Budaya) | Cocok untuk peta pasar/logistik |
| **Wayang kulit / teater bayangan** | Figur pipih bersendi, kelir terang, blencong (lampu minyak) berkedip, bayangan tajam/kabur menurut jarak ke kelir | SVG figur berlubang-lubang (*tatah*, pola ulang) + rig tulang/slot (§4a) dengan lengan ber-*tuding*; blur dan skala menurut jarak ke kelir; glow kedip | ±250–300 ms (DOM statis + transform) | Butuh pustaka bentuk tokoh yang dirancang; harus hormat pada pakem (tokoh, warna, *gunungan*) | **Sangat cocok** dan khas. Wayang = Warisan Budaya Takbenda UNESCO 2008, dengan figur kulit pipih yang lengannya digerakkan dalang lewat tongkat dan diproyeksikan ke layar bercahaya dari belakang ([UNESCO](https://ich.unesco.org/en/RL/wayang-puppet-theatre-00063)) | Terbatas: jadi gimmick bila tidak dimotivasi |
| **Relief candi (bas-relief) hidup** | Panel batu berpahat, cahaya menyapu, tokoh relief "bergerak" pelan | SVG path relief → heightmap dari luminans → `feDiffuseLighting`/`feSpecularLighting` dipanggang per shot (spike gapura); sapuan cahaya = layer gradien yang bergerak, bukan lampu filter; atau 3D: `ExtrudeGeometry` dangkal + cahaya rasant | Statis: ±255 ms; lampu filter dinamis 358 ms (GPU) | Bentuk relief yang bagus butuh banyak path; risiko tampak plastik bila normal terlalu halus (tambah noise batu) | **Sangat cocok** sebagai bingkai cerita (narasi "dibaca dari dinding candi") | Lemah |
| **Lukisan prosedural / painterly** | Sapuan kuas mengikuti bentuk, tepi cat air, kertas bertekstur | Render dasar (siluet/3D) → pass Kuwahara anisotropik / cat air (Bousseau) + tekstur kertas noise | Pass tambahan ±(belum diukur), kira-kira puluhan ms di GPU | Koherensi temporal (sapuan "mendidih"); paling sulit di-*debug* agen | Cocok untuk kilas balik/legenda | Cocok untuk brand "artisan" |
| **Diorama 3D low-poly / cel-shaded** | Miniatur, toon shading, garis tepi, tilt-shift | `MeshToonMaterial` + `OutlineEffect` + tilt-shift [3D-C] | ±28–60 ms render [3D] | Kesan mainan; tokoh tetap titik lemah | Cocok untuk penjelasan struktur kota/keraton | **Sangat cocok** |

**Urutan pengembangan yang disarankan [opini]:**
1. **Modul atmosfer WebGL** (satu `<canvas>`, satu shader, parameter dari jam master). Modul ini dipakai ulang oleh siluet sinematik, relief, wayang (sebagai kelir), dan sebagai overlay di 3D. Biaya kecil, dampak terbesar.
2. **Mata elang 3D** sebagai *preset kamera* di atas `kamera-three.js` (jalur + banking + shake + MB akumulasi opsional), plus generator lanskap sawah/sungai/gunung.
3. **Rig tokoh siluet** (tulang + slot + IK dua tulang + pose bernama) dengan pustaka bentuk wayang/siluet.
4. Mode ekspor WebCodecs untuk gaya yang seluruhnya kanvas.

---

## Rekomendasi

1. **Tetapkan aturan gaya SVG:** filter cahaya dipanggang per shot dan tidak dianimasikan parameternya; gerak lewat transform layer `<svg>`/div `will-change`; region filter dipotong ke bbox. Terukur: filter statis ≈ gratis per frame; filter dinamis +40% di GPU (358 vs 255 ms) dan ×15 di CPU (3.663 vs 236 ms).
2. **Bangun satu modul "atmosfer" WebGL** sebagai pustaka runtime bersama (langit, matahari, kabut fBm berlapis, god rays post-process GPU Gems 3, bara, grain, vignette, LUT). Semua parameter digerakkan GSAP dari `tl.time()`. Ini jalan termurah ke tampilan patokan (63 ms render).
3. **Untuk 3D, pilih satu pasangan versi:**
   - r187 + `three/addons` (`EffectComposer`) atau TSL `RenderPipeline`; atau
   - r186 + pmndrs 6.39.5.
   
   Jangan memakai `time` TSL, `film()` tanpa `uvNode`, `traa`, `afterImage`, atau `motionBlur` velocity untuk ekspor. Motion blur pakai akumulasi sub-frame, dan hanya di segmen cepat.
4. **"Mata elang"** = preset kamera berbasis kurva + look-ahead + roll dari kelengkungan (`tan φ = vω/g`, di-clamp) + shake noise berbasis trauma. Validasi setiap lintasan sempit dengan `snap.mjs` di detik melintas.
5. **Tokoh:** hentikan limb kapsul. Pakai bentuk bagian tubuh yang dirancang + rig tulang/slot + IK dua tulang + pustaka pose. Bingkai tokoh sebagai siluet dengan rim light. Pertimbangkan wayang kulit sebagai gaya penuh.
6. **Ekspor 60 menit:** sekarang `WORKERS=2` (±4 jam). Berikutnya tambahkan mode WebCodecs `prefer-software` untuk gaya kanvas penuh (±2,4 jam). Jangan investasi di `beginFrame` (±10%). Log renderer GPU di awal setiap ekspor.
7. **Riset lanjutan yang dibutuhkan:** biaya pass Kuwahara/cat air di HD 4000; WebCodecs dengan 2 worker; render teks/SVG ke kanvas (agar gaya campuran bisa ikut WebCodecs) lewat `drawImage` dari SVG `data:`; dan pre-roll untuk `motionBlur` velocity.

---

## Fakta yang tidak bisa diverifikasi

- **Situs iquilezles.org mengembalikan HTTP 404 untuk semua halaman** (termasuk beranda) saat riset (2026-11-01). Arsip web juga tidak bisa diakses dari lingkungan ini, dan Shadertoy mengembalikan 403. Akibatnya, rumus kabut ketinggian analitik Quilez, resep *outdoor lighting*, artikel SDF 2D, IK sederhana, dan isi presentasi *Rendering Worlds with Two Triangles* (NVScene 2008) **tidak dikutip langsung**. Keberadaan videonya diverifikasi lewat judul YouTube.
- Isi teknis "Elevated" (raymarch heightfield, turunan analitik) berasal dari pengetahuan umum tentang presentasi Quilez, bukan dari berkas yang dibaca di riset ini. Metadata (4k, Breakpoint 2009, Scene.org Award) diverifikasi di pouët.
- Proporsi Loomis (±7½ dan 8 kepala) tidak diverifikasi pada halaman buku. Hanya keberadaan buku 1943 di Internet Archive yang diperiksa.
- Bahwa `SkRuntimeEffect` shader filter cahaya **dieksekusi di GPU** adalah inferensi dari arsitektur Skia (shader runtime) ditambah uji empiris (10× lebih lambat dengan `--disable-gpu`). Jalur kode Ganesh yang tepat tidak ditelusuri. Implementasi `feTurbulence` di Skia tidak diperiksa.
- Bahwa WebCodecs `prefer-software` di Chrome Windows memakai OpenH264 tidak ditelusuri di kode; hanya keberadaan encoder itu di Chromium yang diperiksa.
- Penyebab macetnya encoder hardware WebCodecs di headless (MFT Intel lama? kebijakan headless?) tidak diketahui. Yang terbukti hanya gejalanya (8 chunk, antrean 5, tanpa error).
- `requestAdapter() = null` di headless meski `chrome://gpu` menulis WebGPU "Hardware accelerated". Belum diuji di Chrome berjendela (non-headless).
- Jumlah panel relief Borobudur tidak dikutip karena halaman UNESCO WHC mengembalikan 403.
- Rumus banking diturunkan dari keseimbangan gaya. PDF PHAK tidak dibuka sampai ke halaman rumusnya.
- Biaya pass NPR (Kuwahara/cat air), raymarch tokoh SDF, `VolumeNodeMaterial`, dan `godrays()` TSL di HD 4000 **tidak diukur**.

---

## Lampiran: uji empiris

**Lingkungan.**
- Perangkat: i3-3217U, HD Graphics 4000 (driver 10.18.10.4252), Windows 11 Pro 22000, Node 22.19.0, puppeteer 25.11.0.
- Browser: Chrome 156.0.8078.74 (`headless: true`) dan `chrome-headless-shell` 156.0.8078.74 (diunduh dengan `@puppeteer/browsers` ke `scratchpad\riset\browsers\`).
- Library: three 0.187.0 dari jsDelivr.
- Viewport 1920×1080, `file://`.

**Berkas** (di folder `riset\` pada berkas kerja sementara di luar repo):

| Berkas | Isi |
|---|---|
| `svg-berat.html` | 4 layer `<svg>` di div `will-change:transform`: gradien langit; 3 gunung dengan filter `feTurbulence` (5 oktaf) → `feDisplacementMap` + `feDiffuseLighting`/`fePointLight`; 1.800 bata dengan heightmap luminans + turbulence → diffuse + specular; kabut `feTurbulence` layar penuh. `?dyn=1` mengubah `x` tiga `fePointLight` dan `seed` kabut tiap frame |
| `gl-shader.html` | WebGL2, 2 pass. Pass 1: langit + matahari, 4 lapis gunung fBm 6 oktaf, gapura SDF + rim light, kabut fBm, alfa = mask langit. Pass 2: god rays 64 sampel (decay 0,97), vignette, grain. `encodeTest(N, hw)` = WebCodecs H.264 `avc1.640028` 1080p 12 Mbps, keyframe tiap 60, backpressure `encodeQueueSize > 4`, deteksi macet 15 dtk |
| `three-post.html` | three r187 `WebGLRenderer`: terrain 384×384 fBm `ImprovedNoise` + lembah sungai, air, 12.000 kerucut `InstancedMesh`, gapura 14 kotak, `Sky`, `FogExp2`, `DirectionalLight` PCF 2048, ACES. Kamera `CatmullRomCurve3` + look-ahead + roll dari kelengkungan + shake noise. `?post=1`: UnrealBloom + Bokeh + Output. `?mb=8`: akumulasi 8 sub-frame shutter 180° ke RT HalfFloat |
| `tsl-post.html` | three r187 `WebGPURenderer` (jatuh ke WebGL2) + `RenderPipeline`: `pass()` → `dof()` + `bloom()`, AgX, terrain + 12.000 pohon |
| `bench.mjs` | Per frame: `seek(t)` (WebGL: termasuk `readPixels` 1 px sebagai sinkronisasi GPU) → 2×rAF → `page.screenshot` JPEG q80 + `clip` + `optimizeForSpeed`. Median frame 2..N. Hash 3 frame pertama dibandingkan dengan seek ulang |
| `bf.mjs` | `chrome-headless-shell` + `--enable-begin-frame-control --run-all-compositor-stages-before-draw`, `Target.createTarget({enableBeginFrameControl:true})`, `HeadlessExperimental.beginFrame({screenshot:{format:'jpeg',quality:80}})` |
| `wc.mjs` | Menjalankan `encodeTest` untuk `prefer-software` dan `prefer-hardware`, lalu `navigator.gpu.requestAdapter()` |
| `gpuinfo.mjs`, `gpu2.mjs` | Membaca *Graphics Feature Status* `chrome://gpu`; probe adapter WebGPU dengan beberapa set argumen |

**Perintah** (dari folder `riset`, `R=$(pwd -W)`):
```
node bench.mjs "$R/svg-berat.html?dyn=0" 6
node bench.mjs "$R/svg-berat.html?dyn=1" 6
node bench.mjs "$R/svg-berat.html?dyn=1" 6 "C:/Program Files/Google/Chrome/Application/chrome.exe" "--disable-gpu"
node bench.mjs "$R/gl-shader.html" 12
node bench.mjs "$R/three-post.html?post=0" 12
node bench.mjs "$R/three-post.html?post=1" 12
node bench.mjs "$R/three-post.html?post=0&mb=8" 12
node bench.mjs "$R/tsl-post.html" 12
node bench.mjs "$R/three-post.html?post=1" 20  (dua proses bersamaan)
node bf.mjs "$R/three-post.html?post=1" 10
node wc.mjs "$R/gl-shader.html" 90
node gpuinfo.mjs ; node gpuinfo.mjs "<chrome>" "--disable-gpu" ; node gpu2.mjs
```

**Hasil**

| ID | Uji | Argumen | Render/seek (ms) | Total/frame (ms) | Deterministik |
|---|---|---|---|---|---|
| L1a | `svg-berat ?dyn=0` | ekspor (GPU) | — | 255 | ✔ |
| L1b | `svg-berat ?dyn=1` | ekspor (GPU) | — | 358 | ✔ |
| L1c | `svg-berat ?dyn=0` | `--disable-gpu` | — | 236 | ✔ |
| L1d | `svg-berat ?dyn=1` | `--disable-gpu` | — | 3.663 | ✔ |
| L2a | `gl-shader` | ekspor | 63 | 301 | ✔ |
| L2b | `gl-shader` | `--disable-gpu` (WARP) | 1.975 | 2.197 | ✔ |
| L3a | `three-post ?post=0` | ekspor | 61 (frame pertama 92) | 259 | ✔ |
| L3b | `three-post ?post=1` | ekspor | 89 (pertama 107) | 285 | ✔ |
| L3c | `three-post ?post=0&mb=8` | ekspor | 283 | 491 | ✔ |
| L3d | `tsl-post` (WebGL2 fallback) | ekspor | 77 (pertama 395, kompilasi node) | 265 | ✔ |
| L3e | `three-post ?post=1` ×2 proses paralel, 20 frame | ekspor | 79 / 79 | 257 / 263 (wall 18,1 dtk termasuk peluncuran) | ✔ |
| L4a | beginFrame `gl-shader` | headless-shell | — | 256 | frame pertama tanpa `screenshotData` |
| L4b | beginFrame `svg-berat ?dyn=1` | headless-shell | — | 331 | ✔ |
| L4c | beginFrame `three-post ?post=1` | headless-shell | — | 234 | ✔ |
| L5a | WebCodecs `prefer-software`, 90 frame | ekspor | — | **81 ms/frame** (90 chunk, 4.467.128 byte) | — |
| L5b | WebCodecs `prefer-hardware` | ekspor | — | **macet** di frame 12: 8 chunk, `encodeQueueSize` 5, tanpa error | — |
| L6 | `requestAdapter()` | ekspor; + `--enable-unsafe-webgpu`; + `--use-webgpu-adapter=d3d11` | — | `null` (ketiganya) | — |

**`chrome://gpu` (headless, argumen ekspor):**
- "Canvas: Hardware accelerated · Compositing: Hardware accelerated · Rasterization: Hardware accelerated · Skia Graphite: Disabled · Video Encode: Hardware accelerated · WebGL: Hardware accelerated · WebGPU: Hardware accelerated".
- `GL_RENDERER`: `ANGLE (Intel, Intel(R) HD Graphics 4000 (0x00000166) Direct3D11 vs_5_0 ps_5_0, D3D11-10.18.10.4252)`.
- Dengan `--disable-gpu`: semua "Software only", dan WebGL = `Microsoft Basic Render Driver`.

**Catatan pengukuran.**
- Waktu render di halaman diukur dengan `performance.now()` mengapit draw + `readPixels(1×1)`, yang memaksa GPU selesai. Untuk halaman SVG, waktu render tidak bisa dipisahkan dari capture.
- Tangkapan C2 (`shot-three-post.html_post_1.jpg`) menunjukkan matahari + bloom yang *blown out*. Angkanya valid sebagai biaya, tetapi itu bukan contoh estetika.
- Adegan uji dibuat demi representativitas biaya, bukan keindahan.
