# Riset: Kamera 3D, Pencahayaan & Sinematografi untuk WeVai

> Studi kasus di dokumen ini (seri video *China Maju*: berkas `china-maju-seri/…`, lembar kontak, log ekspor)
> adalah proyek video yang dibuat dengan skill ini dan berada di luar repo WeVai. Jalur berkasnya dicantumkan
> sebagai bukti, bukan sebagai isi repo.

Tanggal: 2026-10-03 · Cakupan: Three.js (r161 yang dipakai starter, dibandingkan dengan rilis terbaru r186),
post-processing, CSS 3D, alat authoring kamera, ekspor headless, alternatif di luar browser, dan tata bahasa
sinematografi yang dipetakan ke parameter kode.

**Metode.** Setiap klaim dirujuk ke sumber primer (kode sumber pada tag rilis, spesifikasi, dokumentasi resmi,
registry npm). Klaim yang hanya bisa diuji dibuktikan dengan **uji empiris di mesin target** (lihat Lampiran):
Intel Core i3-3217U (2 core/4 thread), Intel HD Graphics 4000 (driver 10.18.10.4252, 2015), Windows 11,
Chrome 153.0.8010.53 headless lewat puppeteer 25.11.0, flag ekspor repo (`--use-gl=angle` dkk.), three r161 dari
jsDelivr, halaman dibuka lewat `file://`. Halaman uji dibuat di folder scratchpad sementara, tidak masuk repo.
Sumber sekunder (Wikipedia, StudioBinder) hanya dipakai di bagian tata bahasa dan **ditandai [sekunder]**.

---

## Ringkasan temuan

**Versi & migrasi**
- Three.js terbaru: **r186 / npm `three@0.186.1`** (terbit 2026-09-24) ([registry npm](https://registry.npmjs.org/three), [rilis r186](https://github.com/mrdoob/three.js/releases/tag/r186)). Starter memakai r161 (2024-01-31). API kamera, kurva, quaternion, `AnimationMixer.setTime` praktis tidak berubah; perubahan yang menggigit ada di cahaya/bayangan, teks 3D, dan versi pustaka pihak ketiga (detail di bagian A–D).
- `pmndrs/postprocessing` terbaru (6.39.5) **mensyaratkan three ≥ 0.168**; versi terakhir yang menyatakan kompatibel dengan r161 adalah **6.38.3** ([registry npm postprocessing](https://registry.npmjs.org/postprocessing)).

**`file://` (dibuktikan di Chrome 153)**
- `fetch()`/XHR ke file lokal **gagal**, `<img>` lokal tanpa CORS **mencemari** tekstur WebGL (`SecurityError`), dan `<img crossorigin>` lokal gagal dimuat. Akibatnya `TextureLoader`, `FileLoader`, `GLTFLoader.load`, `FontLoader.load`, dan `RGBELoader/HDRLoader.load` ke file lokal semuanya gagal. Ini sesuai spesifikasi: Fetch tidak mendefinisikan `file:` ([Fetch §scheme fetch](https://fetch.spec.whatwg.org/#scheme-fetch)), origin `file:` menjadi opaque ([URL §origin](https://url.spec.whatwg.org/#concept-url-origin)), dan WebGL wajib melempar `SECURITY_ERR` untuk gambar beda origin ([WebGL §Origin Restrictions](https://registry.khronos.org/webgl/specs/latest/1.0/#ORIGIN_RESTRICTIONS)).
- Yang **berhasil**: aset dari CDN ber-CORS (font typeface, JPG, GLB dari jsDelivr), `data:` URI, `blob:` URL, `createImageBitmap(blob)`, `GLTFLoader.parse()` dari GLB yang di-*embed* sebagai base64 (2,9 MB base64 untuk GLB 2,1 MB, tekstur ikut termuat), `SVGLoader.parse(string)`, `FontLoader.parse(json)`, dan `RoomEnvironment` + `PMREMGenerator.fromScene` (IBL tanpa file).

**Determinisme**
- Aman: kamera di rel `CatmullRomCurve3.getPointAt`, `Quaternion.slerpQuaternions`, `ImprovedNoise` (tabel permutasi tetap), `AnimationMixer.setTime(t)`, `EffectComposer.render(0)` dengan uniform waktu diisi manual, dan efek pmndrs Bloom/DOF/Vignette/Noise/ToneMapping(AGX)/SMAA. Diuji: hash frame identik saat t yang sama di-*seek* ulang.
- **Merusak determinisme**: `GlitchPass` (`Math.random` per frame), `FilmPass` dan `EffectPass` pmndrs bila `deltaTime` dibiarkan terakumulasi, `EffectComposer.render()` tanpa argumen (memakai `Clock`/`Timer`), `OutlinePass` dengan `pulsePeriod > 0` (`performance.now`), `ToneMappingEffect` mode adaptif, dan `TAARenderPass` dengan `accumulate`. `SSAOPass`/`GTAOPass` mengacak kernel/noise **saat konstruksi**, sehingga hasilnya berbeda **antar worker ekspor**. **N8AO 2.0.1 tidak deterministik** dalam uji kami: render berturut-turut pada t yang sama menghasilkan hash berbeda.
- Backend GPU berbeda (HD 4000 / WARP / SwiftShader) menghasilkan piksel berbeda. Jangan mencampur backend antar worker dalam satu ekspor.

**Biaya per frame (mesin target, 1920×1080)**
- Render saja: flat `MeshBasicMaterial` 122 mesh ≈ 13 ms; toon + bayangan PCF 2048 + `OutlineEffect` ≈ 28 ms; PBR + IBL + AgX ≈ 34 ms; toon + Bloom + Bokeh + Output ≈ 57 ms. Pengukuran koordinator (400 kotak toon): 42 / 71 (PCFSoft) / 169 ms (BokehPass).
- **Penangkapan frame mendominasi**: `page.screenshot` JPEG q90 ≈ 150–190 ms di atas waktu render. Variasi yang diukur: JPEG q80 ≈ −20%, PNG ≈ +30%, WebP ≈ 3× lebih lambat, `canvas.toBlob` JPEG (WebGL saja, tanpa DOM) ≈ 126 ms total, `readPixels` mentah ke Node ≈ 1 s (transfer base64 8 MB). `HeadlessExperimental.beginFrame` **tidak tersedia** di headless baru Chrome 153 (“wasn't found”); perintah itu hanya ada di `chrome-headless-shell`.
- Fallback software: `--disable-gpu` → WARP (toon 252 ms render), `--use-angle=swiftshader` → SwiftShader (toon 1054 ms). WARP ≈ 4× lebih cepat dari SwiftShader di mesin ini.

**Gaya & warna merek**
- Dengan `NoToneMapping`, `#EE1C25` keluar persis (238,28,37); ACES menggesernya ke (241,26,37); **AgX menggeser ke (213,89,78)**. Untuk warna merek pakai `NoToneMapping` atau `material.toneMapped = false`. Toon dengan `AmbientLight(…, Math.PI)` mereproduksi albedo persis.
- Untuk CSS 3D: di Chrome 153, **transform 3D pada elemen di dalam SVG (`<rect>`/`<g>`) diratakan menjadi skew 2D yang salah**, sedangkan `<svg>` akar sebagai kotak CSS mendapat perspektif yang benar. Jadi setiap bidang multiplane harus berupa `<svg>` sendiri.

**Lisensi**
- GSAP: sejak 2025-04-30 (≈ 3.13.0) semua plugin gratis termasuk komersial, tetapi dilarang dipakai di alat **visual no-code yang bersaing dengan Webflow**. FAQ-nya menyatakan kode yang dihasilkan AI bukan *Prohibited Use* ([GSAP Standard License](https://gsap.com/standard-license)).
- Theatre.js: `@theatre/core` Apache-2.0, tetapi **`@theatre/studio` AGPL-3.0-only**. Rilis terakhir 0.7.2 (2024-05-19), dan pengembangan dipindah ke repo privat ([README](https://github.com/theatre-js/theatre)).
- Remotion: gratis untuk individu, organisasi nirlaba, dan perusahaan ≤ 3 karyawan; di atas itu wajib *Company License* ([LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)).
- Blender **tidak layak** di mesin ini: Blender 5.x mensyaratkan OpenGL 4.3 dan Intel Kaby Lake ke atas, 4.5 LTS mensyaratkan Broadwell ke atas, CPU minimum 4 core ([requirements](https://www.blender.org/download/requirements/)). HD 4000 adalah Ivy Bridge, dan i3-3217U hanya 2 core.

---

## A. Kamera 3D nyata di Three.js

### A1. Lensa: `fov`, `filmGauge`, focal length
- `fov` adalah **sudut pandang vertikal** dalam derajat, default 50 ([docs r161 PerspectiveCamera](https://github.com/mrdoob/three.js/blob/r161/docs/api/en/cameras/PerspectiveCamera.html)).
- `filmGauge` adalah lebar film untuk **sumbu yang lebih panjang**, default 35 mm, dan `filmOffset` adalah offset horizontal dalam satuan yang sama ([sumber r161 L31–32](https://github.com/mrdoob/three.js/blob/r161/src/cameras/PerspectiveCamera.js#L31-L32), [docs](https://github.com/mrdoob/three.js/blob/r161/docs/api/en/cameras/PerspectiveCamera.html)).
- `setFocalLength(f)` menghitung `fov = 2·atan(0.5·filmHeight / f)`, dengan `filmHeight = filmGauge / max(aspect,1)` ([L67–75, L95–106](https://github.com/mrdoob/three.js/blob/r161/src/cameras/PerspectiveCamera.js#L67-L106)). `getFocalLength()` adalah kebalikannya ([L80–86](https://github.com/mrdoob/three.js/blob/r161/src/cameras/PerspectiveCamera.js#L80-L86)). Kode di r186 identik kecuali impor ([r186](https://github.com/mrdoob/three.js/blob/r186/src/cameras/PerspectiveCamera.js)).
- **Rekomendasi:** set `camera.filmGauge = 36` (lebar *full-frame*) supaya angka mm cocok dengan intuisi sinema. Tabel untuk 16:9 (dihitung dari rumus di atas):

| Focal (mm) | fov vertikal (°) | fov horizontal (°) | Jarak untuk tinggi bingkai 1 unit |
|---|---|---|---|
| 14 | 71,7 | 104,3 | 0,69 |
| 18 | 58,7 | 90,0 | 0,89 |
| 24 | 45,7 | 73,7 | 1,19 |
| 35 | 32,3 | 54,4 | 1,73 |
| 50 | 22,9 | 39,6 | 2,47 |
| 85 | 13,6 | 23,9 | 4,20 |
| 135 | 8,6 | 15,2 | 6,67 |

- `getViewSize(distance, target)` / `getViewBounds()` sudah ada di r161 ([L113–135](https://github.com/mrdoob/three.js/blob/r161/src/cameras/PerspectiveCamera.js#L113-L135)) dan berguna untuk membingkai subjek tanpa menghitung manual.
- `zoom` membagi `top` frustum ([L214–217](https://github.com/mrdoob/three.js/blob/r161/src/cameras/PerspectiveCamera.js#L214-L217)). Artinya `zoom` hanya memotong (crop) gambar: perspektif tidak berubah, persis seperti zoom optik. Perspektif hanya berubah kalau **posisi** kamera berubah (dolly).

### A2. Lens shift / framing off-axis
- `filmOffset` menggeser frustum secara horizontal: `left += near·skew/filmWidth` ([L235–236](https://github.com/mrdoob/three.js/blob/r161/src/cameras/PerspectiveCamera.js#L235-L236)).
- `setViewOffset(fullW, fullH, x, y, w, h)` membuat frustum off-axis umum, horizontal maupun vertikal ([L172–203, L222–231](https://github.com/mrdoob/three.js/blob/r161/src/cameras/PerspectiveCamera.js#L172-L231)). Ini setara *shift lens* arsitektur: garis vertikal gedung tetap sejajar saat subjek digeser ke atas bingkai.
- Efek miniatur "tilt-shift" butuh blur selektif sebagai tambahan. Shader `HorizontalTiltShiftShader`/`VerticalTiltShiftShader` tersedia di addons r161 dan r186 (diverifikasi ada di jsDelivr), begitu pula `TiltShiftEffect` di pmndrs (lihat D).

### A3. Ortografik / isometrik
- `OrthographicCamera` punya `zoom` dan `setViewOffset` ([sumber r161](https://github.com/mrdoob/three.js/blob/r161/src/cameras/OrthographicCamera.js)). Di r186 hanya ditambah `reversedDepth`.
- **Isometrik sejati:** yaw 45°, pitch `asin(tan 30°) = atan(1/√2) = 35,264°` (diturunkan secara matematis). Untuk kamera ortografik ber-yaw 45° dan elevasi θ, rasio proyeksi diagonal lantai vertikal/horizontal = `sin θ`.
- **Gaya repo bukan isometrik sejati.** Bab 7 memakai `IX=120, IY=62` (`china-maju-seri/bab-07-shenzhen/index.html` baris 229). Rasio 0,517 berarti **θ ≈ 31,1°**, mendekati dimetrik 2:1 (θ = 30°). Untuk mencocokkan seni 2D yang ada, pakai pitch ≈ 31°, bukan 35,26°.
- **Transisi ortografik → perspektif:** kedua kelas kamera tidak punya API *blend* (lihat sumber di atas). Teknik praktis: lakukan dolly zoom dari fov sangat kecil (≈1–2°, kamera sangat jauh, `far` besar) ke fov normal. Pada fov kecil, perspektif nyaris ortografik dan transisinya kontinu. Alternatif kedua adalah interpolasi `projectionMatrix` manual (ingat memperbarui `projectionMatrixInverse`), tetapi tidak ada dukungan resmi.

### A4. Dolly zoom (vertigo)
- Dari `top = near·tan(fov/2)/zoom` ([L217](https://github.com/mrdoob/three.js/blob/r161/src/cameras/PerspectiveCamera.js#L217)), tinggi bingkai di jarak *d* adalah `H = 2·d·tan(fov/2)`. Untuk menjaga subjek setinggi `H` tetap: **`d(t) = H / (2·tan(fov(t)/2))`**. Kalau patokannya lebar subjek `W`: `d = W / (2·aspect·tan(fov/2))`.
- Tekniknya berasal dari *Vertigo* (dolly mundur sambil zoom maju) dan dipakai lagi di *Jaws* ([ASC – Vertigo](https://theasc.com/article/flashback-vertigo/), [ASC Shot Craft: Camera Movement](https://theasc.com/article/shot-craft-camera-movement/)).

### A5. Rel kamera & orientasi
- `Curve.getPointAt(u)` memetakan u ke parameter t berdasar panjang busur ([Curve r161 L59–66, L151](https://github.com/mrdoob/three.js/blob/r161/src/extras/core/Curve.js#L59-L66)). Tabel panjang busur memakai `arcLengthDivisions = 200` ([L42](https://github.com/mrdoob/three.js/blob/r161/src/extras/core/Curve.js#L42)) dengan interpolasi linear. Untuk rel panjang atau berliku, naikkan nilai ini agar kecepatan tidak bergelombang. Fungsinya murni dan deterministik.
- `CatmullRomCurve3(points, closed, curveType='centripetal', tension=0.5)` ([L88](https://github.com/mrdoob/three.js/blob/r161/src/extras/curves/CatmullRomCurve3.js#L88)). **Bug di r161:** kurva **2 titik** memakai satu vektor `tmp` untuk mengekstrapolasi titik awal dan akhir ([L81, L133, L148](https://github.com/mrdoob/three.js/blob/r161/src/extras/curves/CatmullRomCurve3.js#L81)), sehingga geometrinya rusak. Bug ini diperbaiki di [PR #33270](https://github.com/mrdoob/three.js/releases/tag/r184) (r184). **Di r161 selalu pakai ≥ 3 titik.** Untuk rel gabungan, pakai `CurvePath`.
- Target pandang bisa diberi kurva kedua: `cam.lookAt(targetCurve.getPointAt(u))`. `Matrix4.lookAt` menangani kasus `up` sejajar arah pandang dengan menggeser z sebesar 0,0001 ([Matrix4 r161 L290–317](https://github.com/mrdoob/three.js/blob/r161/src/math/Matrix4.js#L290-L317)). Akibatnya **bidikan tepat lurus ke bawah (overhead 90°) bisa berputar tiba-tiba**. Untuk bird's-eye, set `camera.up` eksplisit (misal `(0,0,-1)`) atau batasi pitch 89,9°.
- `Quaternion.slerp` mengambil jalur terpendek dengan membalik tanda bila `cos < 0` ([L517–560](https://github.com/mrdoob/three.js/blob/r161/src/math/Quaternion.js#L517-L560)). Perhatikan bahwa `slerp` **memutasi `this`**. Pola `cam.quaternion.slerp(target, 0.1)` per frame adalah smoothing terakumulasi yang **melanggar determinisme**. Gunakan `q.slerpQuaternions(qa, qb, ease(t))` ([L586](https://github.com/mrdoob/three.js/blob/r161/src/math/Quaternion.js#L586)), yang murni bergantung pada t. Orientasi lewat quaternion juga menghindari gimbal lock Euler.

### A6. Guncangan kamera deterministik
- `ImprovedNoise` (Perlin) memakai **tabel permutasi tetap** `_p` tanpa `Math.random` ([r161 L3, L42](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/math/ImprovedNoise.js#L3)), jadi selalu deterministik. Variasi "seed" didapat dengan menggeser koordinat masukan, misalnya `noise(t·freq, seed, 0)`.
- `SimplexNoise(r = Math)` mengisi permutasi dari `r.random()` di konstruktor ([r161 L15, L34](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/math/SimplexNoise.js#L15-L34)). **Wajib diberi PRNG ber-seed**, misalnya `new SimplexNoise({ random: mulberry32(7) })`. Tanpa itu hasilnya berbeda setiap sesi dan setiap worker.
- Uji: kamera di rel + `ImprovedNoise` + `setFocalLength` → hash screenshot sama setelah seek bolak-balik (Lampiran, U2).

### A7. Animasi GLTF
- `AnimationMixer.setTime(t)` me-nol-kan waktu mixer dan semua action, lalu memanggil `update(t)` ([r161 L655–666](https://github.com/mrdoob/three.js/blob/r161/src/animation/AnimationMixer.js#L655-L666)). Hasilnya *seek* deterministik, tidak bergantung pada riwayat. Kodenya identik di r186 ([r186](https://github.com/mrdoob/three.js/blob/r186/src/animation/AnimationMixer.js)).
- Memuat GLB di `file://`: `GLTFLoader.parse(arrayBuffer)` dari base64 yang di-*embed* berhasil, termasuk tekstur (lewat `ImageBitmap` dari `blob:`) ([GLTFLoader r161 L2526–2541](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/loaders/GLTFLoader.js#L2526-L2541); uji U1). Memuat dari jsDelivr (`cdn.jsdelivr.net/gh/...`) juga berhasil. Memuat dari path lokal gagal.
- `THREE.Clock` dinyatakan deprecated sejak r183, diganti `Timer` di core ([Clock r186 L6](https://github.com/mrdoob/three.js/blob/r186/src/core/Clock.js#L6), [rilis r183](https://github.com/mrdoob/three.js/releases/tag/r183)). Keduanya membaca `performance.now()`, jadi jangan dipakai untuk render.

---

## B. Pencahayaan

### B1. Satuan fisik
- Sejak r155 default `useLegacyLights` adalah `false` dan properti itu deprecated ([WebGLRenderer r161 L150, L2593](https://github.com/mrdoob/three.js/blob/r161/src/renderers/WebGLRenderer.js#L2593)). Properti ini **dihapus di r165** ([rilis r165](https://github.com/mrdoob/three.js/releases/tag/r165)).
- `PointLight`/`SpotLight`: intensitas dalam **candela**, `decay` default 2. `power` dalam lumen (`4π·I` untuk point, `π·I` untuk spot) ([PointLight r186 L25–29, L75–91](https://github.com/mrdoob/three.js/blob/r186/src/lights/PointLight.js#L25-L91), [SpotLight r186](https://github.com/mrdoob/three.js/blob/r186/src/lights/SpotLight.js#L33-L144)).
- `RectAreaLight`: intensitas dalam **nits** ([r186 L79–87](https://github.com/mrdoob/three.js/blob/r186/src/lights/RectAreaLight.js#L79-L87)). Lampu ini **tanpa bayangan**, hanya bekerja untuk `MeshStandardMaterial`/`MeshPhysicalMaterial`, dan butuh `RectAreaLightUniformsLib.init()` ([docs r161](https://github.com/mrdoob/three.js/blob/r161/docs/api/en/lights/RectAreaLight.html)).
- `HemisphereLight(sky, ground, intensity)` ([docs r161](https://github.com/mrdoob/three.js/blob/r161/docs/api/en/lights/HemisphereLight.html)) murah dan cocok sebagai *fill* lembut untuk gaya flat.
- Temuan uji (U6): toon/Lambert dengan `AmbientLight(0xffffff, Math.PI)` mereproduksi warna albedo persis (238,28,37 untuk `#EE1C25`). Ini titik awal yang berguna untuk tampilan "flat tapi bisa diberi cahaya".

### B2. Bayangan
- Tipe bayangan: `BasicShadowMap`, `PCFShadowMap`, `PCFSoftShadowMap`, `VSMShadowMap` ([constants r161 L9–12](https://github.com/mrdoob/three.js/blob/r161/src/constants.js#L9-L12)).
- **`PCFSoftShadowMap` dinyatakan deprecated di r186.** Renderer memberi peringatan dan memakai `PCFShadowMap` sebagai gantinya ([constants r186 L69–75](https://github.com/mrdoob/three.js/blob/r186/src/constants.js#L69-L75), [WebGLShadowMap r186 L99–104](https://github.com/mrdoob/three.js/blob/r186/src/renderers/webgl/WebGLShadowMap.js#L99-L104), [rilis r186](https://github.com/mrdoob/three.js/releases/tag/r186)).
- `shadow.radius` tidak berpengaruh pada `PCFSoftShadowMap` (r161: kelembutan diatur dengan memperkecil `mapSize`) dan tidak berpengaruh pada `BasicShadowMap`. `bias` dan `normalBias` default 0. Penyesuaian bias dalam orde 0,0001; `normalBias` menekan *shadow acne* pada sudut landai ([docs r161 LightShadow](https://github.com/mrdoob/three.js/blob/r161/docs/api/en/lights/shadows/LightShadow.html)). `mapSize` default 512 ([LightShadow r161 L22](https://github.com/mrdoob/three.js/blob/r161/src/lights/LightShadow.js#L22)).
- Kamera bayangan `DirectionalLight` adalah ortografik **(−5..5, near 0,5, far 500)** ([DirectionalLightShadow r161 L8](https://github.com/mrdoob/three.js/blob/r161/src/lights/DirectionalLightShadow.js#L8)). Kotaknya harus dipaskan ke batas adegan, atau bayangan terpotong/kabur.
- VSM: semua penerima bayangan juga menjadi pemancar bayangan ([constants r186 L77–84](https://github.com/mrdoob/three.js/blob/r186/src/constants.js#L77-L84)).
- Biaya di mesin target (koordinator): bayangan PCFSoft 2048 menambah ≈ 29 ms per frame (42 → 71 ms).

### B3. IBL tanpa file eksternal
- `RoomEnvironment` adalah `Scene` prosedural, dan `PMREMGenerator.fromScene(scene, sigma, near, far)` merendernya ke cube-UV tanpa `fetch` ([PMREMGenerator r161 L105](https://github.com/mrdoob/three.js/blob/r161/src/extras/PMREMGenerator.js#L105)). Teruji berhasil di `file://` (U1).
- **Jebakan r161:** `new RoomEnvironment()` **tanpa argumen renderer** memakai intensitas legacy 5, bukan 900, sehingga IBL jauh lebih gelap. Harus `new RoomEnvironment(renderer)` ([r161 L17–31](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/environments/RoomEnvironment.js#L17-L31)).
- Di r186 konstruktornya tanpa parameter (selalu 900), dan adegannya digeser `position.y = -3.5` sejak r183, sehingga tampilan pantulan berubah ([r186 L35–48](https://github.com/mrdoob/three.js/blob/r186/examples/jsm/environments/RoomEnvironment.js#L35-L48), [rilis r183](https://github.com/mrdoob/three.js/releases/tag/r183)).
- r181 mengganti sampling PMREM ke GGX VNDF ([rilis r181](https://github.com/mrdoob/three.js/releases/tag/r181)), dan r186 mengubah kompensasi multi-scattering ([rilis r186](https://github.com/mrdoob/three.js/releases/tag/r186)). Material PBR **akan terlihat berbeda** setelah upgrade, jadi kunci satu versi untuk satu seri.
- Untuk file `.hdr`: `RGBELoader` diganti nama menjadi `HDRLoader` di r180 ([rilis r180](https://github.com/mrdoob/three.js/releases/tag/r180), [RGBELoader r186 L3–9](https://github.com/mrdoob/three.js/blob/r186/examples/jsm/loaders/RGBELoader.js#L3-L9)). Keduanya memuat lewat `FileLoader`/`fetch` ([FileLoader r161 L88](https://github.com/mrdoob/three.js/blob/r161/src/loaders/FileLoader.js#L88)), jadi gagal di `file://`. Gunakan `.parse(buffer)` dari data yang di-*embed*, atau CDN.

### B4. Tone mapping & manajemen warna
- r161 punya `NoToneMapping`…`ACESFilmicToneMapping`, `CustomToneMapping`, dan **`AgXToneMapping` (ditambahkan r160)**. **`NeutralToneMapping` ditambahkan di r162** dan diperbarui di r163 ([constants r161 L53–59](https://github.com/mrdoob/three.js/blob/r161/src/constants.js#L53-L59), [rilis r162](https://github.com/mrdoob/three.js/releases/tag/r162), [rilis r163](https://github.com/mrdoob/three.js/releases/tag/r163); AgX tidak ada di [constants r159](https://github.com/mrdoob/three.js/blob/r159/src/constants.js) dan ada di [constants r160](https://github.com/mrdoob/three.js/blob/r160/src/constants.js)). Default renderer tetap `NoToneMapping`, juga di r186 ([r186 L277](https://github.com/mrdoob/three.js/blob/r186/src/renderers/WebGLRenderer.js#L277)).
- `ColorManagement.enabled = true` secara default, working space Linear-sRGB ([r161 L63–65](https://github.com/mrdoob/three.js/blob/r161/src/math/ColorManagement.js#L63-L65)). `Color.setHex` menganggap input sRGB ([Color r161 L100](https://github.com/mrdoob/three.js/blob/r161/src/math/Color.js#L100)). `outputColorSpace` default `SRGBColorSpace`. Tekstur warna harus diberi `colorSpace = SRGBColorSpace` ([manual Color management r161](https://github.com/mrdoob/three.js/blob/r161/docs/manual/en/introduction/Color-management.html)).
- Saat memakai `EffectComposer`, `OutputPass` di akhir rantai melakukan konversi sRGB dan tone mapping ([manual post-processing r161](https://github.com/mrdoob/three.js/blob/r161/docs/manual/en/introduction/How-to-use-post-processing.html), [OutputPass r161](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/OutputPass.js)).
- **Uji warna merek (U6):** `#EE1C25` keluar sebagai (238,28,37) dengan `NoToneMapping`, (241,26,37) dengan ACES, **(213,89,78) dengan AgX**, dan kembali (238,28,37) dengan AgX + `toneMapped:false`. Properti `Material.toneMapped` default `true` ([Material r161 L75](https://github.com/mrdoob/three.js/blob/r161/src/materials/Material.js#L75)). Untuk palet merek datar, pakai `NoToneMapping`, atau AgX/Neutral hanya untuk objek "realistis" sementara bidang merek diberi `toneMapped:false`.

---

## C. Tampilan flat/stylized di 3D

- **Toon:** `MeshToonMaterial.gradientMap` wajib memakai `minFilter`/`magFilter = NearestFilter` ([docs r161](https://github.com/mrdoob/three.js/blob/r161/docs/api/en/materials/MeshToonMaterial.html)). Gradien bisa dibuat di kode tanpa file, misalnya `DataTexture` 3×1 (90/180/255) (U2).
- **Outline:**
  - `OutlineEffect` (addons) memakai teknik *inverted hull*: material `BackSide` digambar ulang di pass kedua ([r161 L1–60, L416–458](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/effects/OutlineEffect.js#L416-L458)). Ketebalan diatur per material lewat `material.userData.outlineParameters`. Biayanya kira-kira dua kali draw call: toon + bayangan + outline 28 ms vs flat 13 ms (U2).
  - `OutlinePass` ditujukan untuk sorotan seleksi dan memakai `performance.now()` bila `pulsePeriod > 0` ([r161 L355](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/OutlinePass.js#L355)).
  - Alternatif lain: deteksi tepi layar dengan `SobelOperatorShader` (ada di r161 dan r186), atau `OutlineEffect` milik pmndrs.
- **SVG → 3D:** `SVGLoader.parse(text)` memakai `DOMParser`, tanpa fetch ([r161 L67, L1900](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/loaders/SVGLoader.js#L67)). Elemen yang dikenali hanya `svg, style, g, path, rect, polygon, polyline, circle, ellipse, line, defs, use` ([L83–134](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/loaders/SVGLoader.js#L83-L134)). `<text>`, gradien, `clipPath`, `mask`, `pattern`, `filter`, dan `<image>` **tidak** dikonversi (disimpulkan dari daftar `switch` itu). `SVGLoader.createShapes(path)` ([L1919](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/loaders/SVGLoader.js#L1919)) → `ExtrudeGeometry` untuk ketebalan. Path yang dihitung tangan per sisi (gaya repo) cocok dengan batasan ini. Teruji di `file://` (U1).
- **Teks 3D:**
  - `TextGeometry` + `FontLoader`: font typeface JSON bisa di-*inline* lalu dibaca dengan `FontLoader.parse(json)` ([r161 L33](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/loaders/FontLoader.js#L33)), atau dimuat dari jsDelivr (teruji berhasil, U1). Ukuran: helvetiker 63 KB, droid sans 320 KB, gentilis 628 KB ([daftar file three@0.161.0](https://data.jsdelivr.com/v1/packages/npm/three@0.161.0?structure=flat)).
  - **Jebakan r161:** `TextGeometry` memakai `height`. Parameter `depth` yang diberikan **ditimpa** oleh `height` atau 50 ([r161 L38](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/geometries/TextGeometry.js#L38)). Nama `height` → `depth` baru berubah di r163 ([rilis r163](https://github.com/mrdoob/three.js/releases/tag/r163)).
  - `troika-three-text` 0.52.5 memuat font lewat **XHR** ([esm L505](https://cdn.jsdelivr.net/npm/troika-three-text@0.52.5/dist/troika-three-text.esm.js)). Font fallback-nya datang dari CDN `unicode-font-resolver` di jsDelivr (L453), dan tata letak berjalan asinkron di worker (`useWorker: true`, L1590–1600). Pustaka ini juga butuh 4 entri import map tambahan (`bidi-js`, `troika-three-utils`, `troika-worker-utils`, `webgl-sdf-generator`) ([package.json](https://cdn.jsdelivr.net/npm/troika-three-text@0.52.5/package.json)). Font lokal gagal di `file://` (XHR), dan teks yang berubah di timeline harus menunggu `sync()` asinkron.
  - **Rekomendasi:** teks tetap sebagai **HUD DOM** di atas canvas, karena font sudah dimuat, hasilnya tajam, dan ikut tertangkap `page.screenshot`. Teks 3D hanya dipakai untuk judul yang benar-benar perlu berada di ruang 3D, dengan font JSON di-*inline*.
- **Halftone:** `HalftonePass` deterministik, karena `rand()` diberi seed dari sel grid ([HalftoneShader r161 L148](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/shaders/HalftoneShader.js#L148)). Konstruktornya berubah dari `(width, height, params)` di r161 menjadi `(params)` di r186. Untuk tekstur grid halftone merek, overlay SVG/CSS di atas canvas lebih murah dan identik dengan gaya sekarang.

---

## D. Post-processing

### D1. Aturan umum determinisme
- `EffectComposer.render(deltaTime)` memakai `Clock` (r161) atau `Timer` (r186) bila argumen kosong ([r161 L51, L105–111](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/EffectComposer.js#L105-L111), [r186 L218–222](https://github.com/mrdoob/three.js/blob/r186/examples/jsm/postprocessing/EffectComposer.js#L218-L222)). **Selalu panggil `composer.render(0)`** dan isi uniform waktu secara manual dari `tl.time()`.
- pmndrs: `EffectComposer.render()` tanpa argumen memakai `Timer` berbasis `performance.now()`, dan `EffectPass` melakukan `material.time += deltaTime * timeScale` ([build 6.39.5, ±L1305 & ±L15681](https://cdn.jsdelivr.net/npm/postprocessing@6.39.5/build/index.js)). Polanya: `pass.fullscreenMaterial.time = t; composer.render(0)`. Teruji deterministik (U7).

### D2. Tabel pass/efek

| Pass / efek | Tersedia | Determinisme | Catatan biaya / API |
|---|---|---|---|
| `RenderPass` + `OutputPass` (three) | r161 & r186 | ✔ | `OutputPass` wajib terakhir (sRGB + tone mapping) |
| `UnrealBloomPass` | r161 & r186 | ✔ (tanpa random/waktu, hasil grep) | toon + bloom + bokeh = 57 ms vs 28 ms (U2) |
| `BokehPass` (`focus`, `aperture`, `maxblur`) | r161 & r186 | ✔ | Mahal di HD 4000: 169 ms vs 42 ms (koordinator) ([r161 L28–30](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/BokehPass.js#L28-L30)) |
| `SSAOPass` | r161 & r186 | ⚠ kernel `Math.random` + `SimplexNoise()` **saat konstruksi** | Berbeda antar worker ([r161 L330–365](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/SSAOPass.js#L330-L365)) |
| `GTAOPass` | r161 & r186 | ⚠ noise `SimplexNoise()` saat konstruksi | Sama ([r161 L540](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/GTAOPass.js#L540)) |
| `FilmPass` | r161 & r186 | ⚠ `time += deltaTime` | Set `uniforms.time.value = t`, render(0) ([r161 L37](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/FilmPass.js#L37)) |
| `GlitchPass` | r161 & r186 | ✘ `Math.random` per frame | Hindari ([r161 L46–67](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/GlitchPass.js#L46-L67)) |
| `SMAAPass` | r161 `(w,h)` / r186 `()` | ✔ | Tekstur bawaan berupa `data:` URI, jadi aman di `file://` ([r161 L38, L171](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/SMAAPass.js#L38)) |
| `FXAAPass` | hanya r186; di r161 pakai `ShaderPass(FXAAShader)` | ✔ | Murah |
| `SSAARenderPass` | r161 & r186 | ✔ tabel jitter tetap | Biaya × 2^`sampleLevel` (default 4 → 16×) ([r161 L31, L87](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/SSAARenderPass.js#L31)) |
| `TAARenderPass` | r161 & r186 | ⚠ bila `accumulate=true` (bergantung riwayat) | Biarkan `false` ([r161 L26](https://github.com/mrdoob/three.js/blob/r161/examples/jsm/postprocessing/TAARenderPass.js#L26)) |
| pmndrs `BloomEffect`, `DepthOfFieldEffect`, `VignetteEffect`, `ChromaticAberrationEffect`, `SMAAEffect` | 6.38.3 (r161) / 6.39.5 (r186) | ✔ teruji (Bloom/DOF/Vignette/SMAA) | `EffectPass` menggabungkan efek dalam satu shader ([README](https://github.com/pmndrs/postprocessing)); 52 ms di 960×540 dengan N8AO (U7) |
| pmndrs `NoiseEffect` | idem | ✔ bila `time` diset manual | shader `rand(uv*(1.0+time))` |
| pmndrs `ToneMappingEffect` | idem | ✔ untuk AGX/ACES/NEUTRAL; ✘ `REINHARD2_ADAPTIVE` (adaptasi luminans) | Default mode **AGX** di 6.38.3 dan 6.39.5 |
| pmndrs `GodRaysEffect` | idem | ✔ (tanpa random, hasil grep) | `samples` default 60, cenderung mahal |
| pmndrs `GlitchEffect`, `NoiseTexture` (dipakai SSAO pmndrs) | idem | ✘ / ⚠ `Math.random` | ±L5969, ±L6420 build |
| **N8AO 2.0.1** | via CDN | **✘ teruji tidak deterministik** | Lihat di bawah |

- **pmndrs/postprocessing:** lisensi Zlib. ESM `build/index.js` mengimpor `"three"` secara bare, jadi cukup satu entri import map. Rentang peer three: 6.38.3 → `>=0.157 <0.184`; 6.39.5 → `>=0.168 <0.187` ([registry](https://registry.npmjs.org/postprocessing)). README menyarankan renderer `antialias:false, stencil:false, depth:false`, `frameBufferType: HalfFloatType`, dan **`renderer.toneMapping = NoToneMapping`** dengan `ToneMappingEffect` di akhir ([README](https://github.com/pmndrs/postprocessing)).
- **N8AO 2.0.1:** dist mengimpor `"three"`, `"postprocessing"`, dan `"three/examples/jsm/postprocessing/Pass.js"` ([dist](https://cdn.jsdelivr.net/npm/n8ao@2.0.1/dist/N8AO.js)). Konsekuensinya, import map butuh entri `three/examples/jsm/` (repo saat ini hanya punya `three/addons/`) dan `postprocessing`, meskipun yang dipakai hanya `N8AOPass`.
  - Lisensi: `package.json` menyatakan ISC, tetapi file LICENSE di repo berisi CC0 ([LICENSE](https://github.com/N8python/n8ao)).
  - Setiap render, N8AO menulis `performance.now()/1000` ke uniform `time`. `accumulate` default `false` ([README](https://github.com/N8python/n8ao)).
  - **Uji U7:** hash berbeda untuk render berulang pada t yang sama, bahkan saat `performance.now` dibekukan. Penyebabnya tidak teridentifikasi. **Jangan dipakai untuk ekspor** sebelum diselidiki.

---

## E. Alternatif CSS 3D / 2.5D (mempertahankan seni SVG)

- **Properti yang memaksa perataan** (`transform-style: preserve-3d` → `flat`), menurut [CSS Transforms 2 §7.1 Grouping property values](https://drafts.csswg.org/css-transforms-2/#grouping-property-values) (Editor's Draft):
  - `overflow` selain `visible` atau `clip`
  - `opacity` < 1
  - `filter` ≠ `none`
  - `clip` ≠ `auto`
  - `clip-path` ≠ `none`
  - `isolation: isolate`
  - `mask-image` ≠ `none`
  - `mask-border-source` ≠ `none`
  - `mix-blend-mode` ≠ `normal`
  - `contain: paint` dan semua kombinasi yang menimbulkan paint containment, termasuk `content-visibility: hidden`

  Akibatnya, *fade* kamera via `opacity` atau `overflow:hidden` pada kontainer kamera akan mematikan 3D. Taruh clip/opacity di pembungkus **di luar** konteks 3D.
- **SVG & 3D:** spesifikasi mewajibkan fungsi transform 3D berlaku pada `g`, `svg`, dan elemen grafis SVG. `clipPath`/`mask`/`pattern` selalu meratakan ([§11 SVG and 3D transform functions](https://drafts.csswg.org/css-transforms-2/#svg-three-dimensional-functions)). **Implementasi Chrome 153 berbeda (uji U5):**
  - `<rect>` di dalam `<svg>` dengan `transform: perspective(600px) rotateY(60deg)` dirender sebagai jajaran genjang miring (tinggi tepi kiri = kanan = 199 px). Ini perataan affine yang keliru, bukan perspektif.
  - Elemen `<svg>` akar yang diberi `rotateY(60deg)` di dalam induk ber-`perspective` dirender sebagai trapesium yang benar (tepi 232 vs 174 px), identik dengan `<div>`.
  - **Aturan praktis:** setiap bidang paralaks = satu `<svg>` (atau `<div>`) sendiri. Transform 3D tidak boleh diberikan pada `<g>`.
- **Matematika multiplane:** dengan `perspective: p` dan bidang di `translateZ(-d)`, skala tampak = `p/(p+d)`. Untuk mengembalikan ukuran istirahat, kalikan skala bidang dengan `(p+d)/p`. Kamera yang maju `z` membuat skala bidang menjadi `p/(p - z + …)`.
- **Biaya (uji U5b):** 5 bidang × 1.500 path pada 1080p. CSS 3D multiplane ≈ 629 ms/frame vs kamera 2D SVG (`transform` pada `<g>`, cara sekarang) ≈ 590 ms/frame, termasuk screenshot. Selisihnya kecil karena biaya didominasi rasterisasi SVG + capture.
- **Ketajaman saat zoom (U5c):** zoom bertahap ke skala 4× via `translateZ` menghasilkan jumlah piksel transisi yang sama dengan render langsung di 4× (1681 vs 1681; di z=0: 1997), juga dengan `will-change: transform`. Artinya, di pipeline screenshot tidak ada raster basi/blur. Perilaku saat *preview* interaktif tidak diuji.
- Determinisme tetap aman selama transform ditulis GSAP dari `tl.time()`. Jangan pakai CSS `transition`/`animation`.

---

## F. Alat authoring kamera

- **Theatre.js**
  - Rilis dan lisensi: `@theatre/core` 0.7.2 (2024-05-19, Apache-2.0); `@theatre/studio` 0.7.2 **AGPL-3.0-only** ([registry core](https://registry.npmjs.org/@theatre/core), [registry studio](https://registry.npmjs.org/@theatre/studio)).
  - Status proyek: README menyatakan pengembangan 1.0 "sementara" dipindah ke repo privat. Commit publik terakhir 2024-04-11, *push* terakhir 2024-08-14 ([repo](https://github.com/theatre-js/theatre), [GitHub API](https://api.github.com/repos/theatre-js/theatre)).
  - Bisa dikendalikan waktu eksternal: **`sheet.sequence.position` bisa diset (detik)**, dan state produksi dimasukkan lewat `getProject(id, { state })` ([docs API core](https://www.theatrejs.com/docs/latest/api/core)). Di `file://`, state JSON harus di-*inline* (tidak bisa `import` JSON lokal).
  - Paket CommonJS (`"type":"commonjs"`), sehingga butuh `https://cdn.jsdelivr.net/npm/@theatre/core@0.7.2/+esm` (HTTP 200, diperiksa).
  - Risiko: proyek publik mandek ±2 tahun, dan studio (editor visualnya) AGPL.
- **GSAP**
  - Lisensi: *Standard License* berlaku **sejak 2025-04-30**, sama dengan tanggal `gsap@3.13.0` di npm. Lisensi ini mencakup "the GSAP animation library and related plugins", gratis termasuk untuk komersial. Larangannya adalah "Competitive Products" ("a visual interface or builder similar to Webflow"), dan FAQ-nya menyatakan kode yang dihasilkan AI bukan *Prohibited Use* ([GSAP Standard License](https://gsap.com/standard-license), [registry gsap](https://registry.npmjs.org/gsap)). Versi terbaru: 3.15.0 (2026-04-13).
  - Plugin di versi repo: `MotionPathPlugin.min.js` dan `CustomEase.min.js` tersedia di CDN untuk 3.12.5 maupun 3.15.0 (HTTP 200).
  - `MotionPathPlugin` cocok untuk rel kamera 2D: `resolution` default 12 untuk pemetaan ulang panjang busur, `getPositionOnPath(rawPath, progress)` bisa dipanggil murni dari t, dan plugin ini bisa menganimasikan objek generik, tidak hanya elemen DOM ([docs MotionPathPlugin](https://gsap.com/docs/v3/Plugins/MotionPathPlugin/)).
  - `CustomEase` membentuk kurva ease kamera dari data path SVG ([CDN 3.12.5](https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/CustomEase.min.js)).

---

## G. Rendering WebGL headless & penangkapan frame

### G1. Drawing buffer
- Dengan `preserveDrawingBuffer:false` (default), buffer dikosongkan **setelah dipresentasikan ke compositor** ([WebGL §The Drawing Buffer](https://registry.khronos.org/webgl/specs/latest/1.0/#THE_DRAWING_BUFFER), [MDN getContext](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext)).
- Uji U2/U3:
  - `page.screenshot` **tetap menangkap frame dengan benar** tanpa `preserveDrawingBuffer`, baik setelah 2×rAF maupun mode SYNC.
  - `drawImage`/`toDataURL` **setelah** frame dikomposit menghasilkan kanvas kosong. Di task yang sama dengan render, hasilnya benar.
  - Dengan `preserveDrawingBuffer:true`, readback kapan pun benar, dan biaya render nyaris sama (27 vs 28 ms).
  - Kesimpulan: pipeline repo tidak butuh `preserveDrawingBuffer`. Readback canvas harus di task yang sama dengan render.

### G2. Backend GPU di mesin target (U4)
- Semua kombinasi flag (termasuk tanpa flag) mendapat `ANGLE (Intel HD Graphics 4000 … Direct3D11)`.
  - `--disable-gpu` → **WARP** (Microsoft Basic Render Driver).
  - `--use-angle=swiftshader` → SwiftShader.
  - `--use-angle=gl`/`vulkan` jatuh ke WARP.
  - Switch `--use-angle` dan `--use-gl` didefinisikan di [gl_switches.cc](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/ui/gl/gl_switches.cc), begitu pula `--enable-unsafe-swiftshader` ("Allow usage of SwiftShader for WebGL"). `--ignore-gpu-blocklist` ada di [gpu_switches.cc](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/gpu/config/gpu_switches.cc). `--allow-file-access-from-files` ada di [content_switches.cc](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/public/common/content_switches.cc): dengan flag ini, fetch/tekstur lokal berhasil (U1), tetapi pengguna yang membuka file dengan klik ganda tidak memakainya.
- Biaya render toon: HD 4000 28 ms, WARP 252 ms, SwiftShader 1054 ms. Biaya flat: 13 / 81 / 235 ms. Kalau GPU gagal, **pilih WARP (`--disable-gpu`), bukan SwiftShader**.
- Ukuran JPEG frame yang sama berbeda antar backend (155126 / 155112 / 155520 byte). Piksel berbeda, jadi jangan campur backend antar worker.

### G3. Opsi penangkapan frame (pertanyaan koordinator)

| Metode | Ikut DOM? | Tersedia di headless baru (Chrome 153)? | Terukur (toon, 1080p, total/frame) | Sumber |
|---|---|---|---|---|
| `page.screenshot` JPEG q90 + `clip` + `optimizeForSpeed` (cara repo) | ✔ komposit penuh | ✔ | ≈ 190 ms (render+seek ≈ 35 ms) | [CDP Page.captureScreenshot](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot), [puppeteer ScreenshotOptions](https://pptr.dev/api/puppeteer.screenshotoptions) |
| CDP `Page.captureScreenshot` langsung, JPEG q80 | ✔ | ✔ | ≈ 154 ms (−20%) | idem |
| idem PNG / WebP q90 | ✔ | ✔ | ≈ 247 ms / ≈ 632 ms | idem; format: `jpeg`, `png`, `webp` |
| CDP lewat `pipe:true` vs websocket | ✔ | ✔ | Perbedaan di bawah noise ±30% | [puppeteer](https://pptr.dev/api/puppeteer.screenshotoptions) |
| `HeadlessExperimental.beginFrame({screenshot})` | ✔ | **✘ "wasn't found"**; hanya di `chrome-headless-shell` (headless lama dipisah sejak Chrome 132) | Tidak bisa diuji | [protokol](https://chromedevtools.github.io/devtools-protocol/tot/HeadlessExperimental/#method-beginFrame), [Chrome Headless](https://developer.chrome.com/docs/chromium/headless) |
| `Page.startScreencast` (jpeg/png, `everyNthFrame`, `maxFramesInFlight`) | ✔ | ✔ (experimental) | Tidak diukur; frame didorong asinkron sehingga sinkronisasi ke t sulit | [protokol](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-startScreencast) |
| `canvas.toBlob('image/jpeg', .9)` di halaman, lalu base64 ke Node | **✘ hanya canvas** | ✔ | ≈ 126 ms | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) |
| `gl.readPixels` RGBA mentah ke Node | ✘ | ✔ | ≈ 1024 ms (transfer 8 MB) | — |
| WebCodecs `VideoEncoder` + `VideoFrame(canvas)` | ✘ hanya canvas | ✔ (`isSecureContext` = true di `file://`; H.264/VP9/AV1 `isConfigSupported` true) | Encoder **macet setelah 8 chunk** di uji headless | [MDN VideoEncoder](https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder), [MDN VideoFrame()](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame/VideoFrame) |

- Opsi yang sudah dipakai repo (`fromSurface` default `true`, `optimizeForSpeed`) sudah tepat. `captureBeyondViewport` default `true` bila ada `clip` ([puppeteer](https://pptr.dev/api/puppeteer.screenshotoptions)); menonaktifkannya tidak menunjukkan beda yang konsisten di atas noise.
- **Penghematan terbesar yang terbukti: turunkan kualitas JPEG perantara** (q80, karena ffmpeg meng-encode ulang). Jalur canvas murni (`toBlob`) ≈ 30% lebih cepat, tetapi **kehilangan lapisan DOM** (HUD teks, overlay SVG). Lapisan itu harus dirender ke canvas/WebGL dulu.
- Proposal **HTML-in-Canvas** (`drawElementImage`, `texElementSubImage2D`, termasuk use case "Media Export") akan memungkinkan DOM digambar ke canvas, tetapi baru ada di balik flag `chrome://flags/#canvas-draw-element` ([WICG explainer](https://github.com/WICG/html-in-canvas)). Belum layak untuk produksi.
- Muxing WebCodecs ke MP4 butuh pustaka: `mp4-muxer` sudah deprecated dan "superseded by Mediabunny" (MPL-2.0) ([registry mp4-muxer](https://registry.npmjs.org/mp4-muxer), [registry mediabunny](https://registry.npmjs.org/mediabunny)).

---

## H. Alternatif (singkat, hanya untuk keputusan)

- **Remotion + `@remotion/three`**
  - Versi 4.0.532 (2026-10-01). `@remotion/three` berlisensi MIT, sedangkan `remotion` memakai lisensi khusus ([registry](https://registry.npmjs.org/remotion)): gratis untuk individu, nirlaba, dan perusahaan ≤ 3 karyawan, di atas itu *Company License* ([LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)).
  - Animasi ditulis di markup dengan `useCurrentFrame()`, bukan `useFrame()`. Render server butuh `chromiumOptions: { gl: "angle" }` ([docs three](https://www.remotion.dev/docs/three)).
  - Butuh proyek Node/React dengan bundler, jadi **melanggar model satu `index.html` di `file://`**. Render-nya juga lewat Chrome headless, sehingga kelas biaya per frame-nya sama.
- **React Three Fiber** 9.8.1 (MIT). Mode `frameloop="never"` + `advance(timestamp)` mengisi `clock.elapsedTime = timestamp` ([loop.ts L62–68, L160–163](https://github.com/pmndrs/react-three-fiber/blob/master/packages/fiber/src/core/loop.ts#L62-L68)), jadi bisa deterministik bila kode memakai `elapsedTime`. Tetapi R3F butuh React, yang menambah lapisan tanpa kemampuan render baru dibanding three murni.
- **Blender (bpy)**
  - Versi: rilis stabil sekarang **5.2 LTS (2026-07-14)** ([release notes](https://developer.blender.org/docs/release_notes/)).
  - Kebutuhan perangkat keras ([blender.org/requirements](https://www.blender.org/download/requirements/)):
    - Blender 5.x: GPU **OpenGL 4.3** dengan ekstensi wajib `GL_ARB_shader_draw_parameters` + `GL_ARB_clip_control`, atau Vulkan 1.3; Intel **Kaby Lake** ke atas; CPU minimum **4 core SSE4.2**; RAM 8 GB.
    - 4.5 LTS: Intel **Broadwell** ke atas.
    - 3.6 LTS: OpenGL 3.3.
  - HD 4000 = Ivy Bridge (lebih tua dari Broadwell), dan i3-3217U = 2 core, sehingga **EEVEE/Blender modern tidak didukung di mesin ini**.
  - Freestyle adalah mesin NPR berbasis garis yang memakai data mesh + Z-depth ([manual Freestyle](https://docs.blender.org/manual/en/latest/render/freestyle/introduction.html)). Render CLI: `blender -b file.blend -a` ([manual CLI](https://docs.blender.org/manual/en/latest/advanced/command_line/render.html)).
  - Kesimpulan: rute Blender hanya masuk akal di mesin lain atau render farm.

---

## Tata bahasa sinematografi (dipetakan ke kode)

Konvensi: `filmGauge = 36`, rasio 16:9, satuan dunia 1 = 1 m, tinggi subjek manusia/ikon ≈ 1,7. Jarak dihitung
`d = tinggiBingkai / (2·tan(fov/2))` (lihat A4). Angka "tinggi bingkai" adalah **konvensi kerja**, bukan kutipan
sumber. Kolom sumber menunjuk definisi istilahnya.

### Ukuran shot

| Istilah | Arti | Kapan di explainer | Three.js / CSS | Sumber |
|---|---|---|---|---|
| ECU (extreme close-up) | Detail kecil memenuhi layar | Angka kunci, ikon, detail produk | Tinggi bingkai ≈ 0,1–0,2× subjek; 85–135 mm; `d = 0,15·6,67 ≈ 1` (135 mm) | [StudioBinder](https://www.studiobinder.com/blog/types-of-camera-shots-sizes-in-film/) [sekunder] |
| CU (close-up) | Wajah/objek besar dan detail | Emosi tokoh, objek utama kalimat VO | Bingkai ≈ 0,35; 50–85 mm | [Columbia: Close-Up](https://filmglossary.ccnmtl.columbia.edu/term/close-up/) |
| MS (medium shot) | Pinggang ke atas, bisa beberapa tokoh | Narator/karakter menjelaskan | Bingkai ≈ 0,9; 35–50 mm | [Columbia: Medium Shot](https://filmglossary.ccnmtl.columbia.edu/term/medium-shot/) |
| LS / FS (long/full shot) | Tokoh utuh + sebagian lingkungan | Relasi tokoh–lingkungan | Bingkai ≈ 2,2; 24–35 mm | [Columbia: Long Shot](https://filmglossary.ccnmtl.columbia.edu/term/long-shot/) |
| EWS / establishing | Lokasi dari jauh, sering dari udara, di awal adegan | Pembuka bab: peta, kota, pabrik | Bingkai ≥ 10× subjek; 18–24 mm, kamera tinggi; atau ortografik | [Columbia: Establishing Shot](https://filmglossary.ccnmtl.columbia.edu/term/establishing-shot/), [Aerial Shot](https://filmglossary.ccnmtl.columbia.edu/term/aerial-shot/) |

### Sudut kamera

| Istilah | Arti | Kapan | Three.js / CSS | Sumber |
|---|---|---|---|---|
| Eye-level | Kamera kira-kira setinggi mata | Netral, informatif (default) | `cam.position.y = target.y` (pitch 0°) | [Columbia: Camera Angle](https://filmglossary.ccnmtl.columbia.edu/term/camera-angle/) |
| High angle | Di atas mata, menatap ke bawah | Subjek tampak kecil/tertekan; ikhtisar data | Pitch −20° s.d. −45° | [Columbia: High-Angle](https://filmglossary.ccnmtl.columbia.edu/term/high-angle-shot/) |
| Low angle | Di bawah mata, menatap ke atas | Subjek tampak besar/berkuasa (gedung, pemimpin) | Pitch +15° s.d. +35°, lensa lebar 18–24 mm | [Columbia: Low-Angle](https://filmglossary.ccnmtl.columbia.edu/term/low-angle-shot/) |
| Bird's-eye / overhead | Tegak lurus dari atas | Peta, tata letak, diagram alur | Pitch −89,9° + `cam.up.set(0,0,-1)` (hindari singularitas lookAt, A5), atau ortografik | [Columbia: Aerial](https://filmglossary.ccnmtl.columbia.edu/term/aerial-shot/); [Wikipedia](https://en.wikipedia.org/wiki/Bird%27s-eye_view) [sekunder] |
| Worm's-eye | Dari tanah ke atas | Skala ekstrem (menara, roket) | Kamera di y≈0,1, pitch +60°, 14–18 mm | [Wikipedia](https://en.wikipedia.org/wiki/Worm%27s-eye_view) [sekunder] |
| Dutch / canted | Kamera dimiringkan | Ketidakstabilan, krisis, transisi | Roll: `cam.rotateZ(±10–20°)` setelah `lookAt`; CSS: `rotate()` pada kontainer kamera | [Columbia: Canted Angle](https://filmglossary.ccnmtl.columbia.edu/term/canted-angle-dutch-angle/) |
| OTS (over-the-shoulder) | Kamera di belakang bahu satu tokoh | Dialog/"tokoh melihat data" | Kamera di belakang-samping tokoh A, target ke B, bahu A di sepertiga bingkai | [Wikipedia](https://en.wikipedia.org/wiki/Over_the_shoulder_shot) [sekunder] |
| POV | Penonton melihat lewat mata tokoh | "Bayangkan Anda di…" | Kamera di posisi mata tokoh, 24–35 mm, sedikit guncangan noise | [Columbia: Point of View](https://filmglossary.ccnmtl.columbia.edu/term/point-of-view/) |

### Gerak kamera

| Istilah | Arti | Kapan | Three.js / CSS | Sumber |
|---|---|---|---|---|
| Pan | Kepala kamera berputar horizontal dari posisi tetap | Mengikuti urutan item di kiri→kanan | Posisi tetap; target `lookAt` berjalan di garis; yaw slerp | [Columbia: Pan Shot](https://filmglossary.ccnmtl.columbia.edu/term/pan-shot/) |
| Tilt | Pan vertikal | Mengungkap tinggi (menara, grafik naik) | Posisi tetap; target bergerak di y | [Columbia: Pan Shot](https://filmglossary.ccnmtl.columbia.edu/term/pan-shot/) |
| Dolly (in/out) | Kamera di platform beroda bergerak maju/mundur | Mendekat untuk penekanan; perspektif berubah | Posisi bergerak di sepanjang arah pandang, fov tetap | [Columbia: Dolly](https://filmglossary.ccnmtl.columbia.edu/term/dolly-dolly-shot/), [ASC Shot Craft](https://theasc.com/article/shot-craft-camera-movement/) |
| Truck / crab / tracking | Bergerak menyamping atau mengikuti subjek | Menyusuri linimasa/proses | Posisi di rel `CatmullRomCurve3.getPointAt(u)`, target ikut bergeser; CSS: `translateX` kamera | [Columbia: Tracking](https://filmglossary.ccnmtl.columbia.edu/term/tracking-trucking-shot/), [Dolly](https://filmglossary.ccnmtl.columbia.edu/term/dolly-dolly-shot/) |
| Pedestal | Kamera naik/turun lurus | Naik dari data ke kesimpulan | Hanya `position.y` berubah, arah pandang tetap | (istilah studio TV; tidak ditemukan di sumber primer, lihat bagian akhir) |
| Crane / jib | Lengan panjang, kamera berayun dalam busur naik/turun | Pembuka dramatis: dari detail ke establishing | Rel busur vertikal + `lookAt` tetap; ease pelan | [ASC Shot Craft](https://theasc.com/article/shot-craft-camera-movement/), [Columbia: Crane](https://filmglossary.ccnmtl.columbia.edu/term/crane-shot/) |
| Arc / orbit | Kamera mengitari subjek | Menunjukkan objek 3D dari segala sisi | `pos = target + R·(sin θ, h, cos θ)`, θ = f(t); hormati 180° | (turunan geometris) |
| Zoom vs dolly | Zoom mengubah focal length tanpa memindah kamera; dolly memindah kamera | Zoom = penekanan "datar"; dolly = masuk ke ruang | Zoom: `setFocalLength(f(t))` atau `zoom`; dolly: posisi. Zoom tidak mengubah perspektif (A1) | [Columbia: Zoom Shot](https://filmglossary.ccnmtl.columbia.edu/term/zoom-shot/), [Columbia: Virtual Camera Movement](https://filmglossary.ccnmtl.columbia.edu/term/virtual-camera-movement/) |
| Dolly zoom | Dolly berlawanan arah dengan zoom, subjek tetap berukuran sama | Momen "sadar"/kejutan statistik | `fov(t)` di-tween, `d(t) = H/(2·tan(fov/2))` | [ASC – Vertigo](https://theasc.com/article/flashback-vertigo/), [ASC Shot Craft](https://theasc.com/article/shot-craft-camera-movement/) |
| Rack focus | Fokus berpindah dari satu bidang ke bidang lain | Mengalihkan perhatian antar data di kedalaman berbeda | `BokehPass.uniforms.focus` / pmndrs `DepthOfFieldEffect.cocMaterial` `focusDistance` di-tween (mahal di HD 4000) | [Columbia: Depth of Field](https://filmglossary.ccnmtl.columbia.edu/term/depth-of-field/); [Wikipedia Focus pulling](https://en.wikipedia.org/wiki/Focus_pulling) [sekunder] |
| Whip / swish pan | Pan sangat cepat sampai kabur, sebagai transisi | Transisi antar adegan "pada saat yang sama" | Yaw 60–90° dalam 6–10 frame + blur arah. Motion blur deterministik: rata-rata N sub-frame per frame | [Columbia: Swish Pan](https://filmglossary.ccnmtl.columbia.edu/term/swish-pan/) |
| Handheld | Kamera dipegang, bergerak bebas | Nuansa reportase, "di lapangan" | `ImprovedNoise` pada posisi (±0,02–0,08) & rotasi (±0,3°), frekuensi 0,5–2 Hz | [Columbia: Handheld](https://filmglossary.ccnmtl.columbia.edu/term/handheld-shot/), [Steadicam](https://filmglossary.ccnmtl.columbia.edu/term/steadicam-shot/) |
| Follow / tracking | Kamera mengikuti subjek bergerak | Mengikuti produk di jalur produksi | Posisi = posisi subjek(t) + offset; `lookAt(subjek(t))` | [Columbia: Tracking](https://filmglossary.ccnmtl.columbia.edu/term/tracking-trucking-shot/) |

### Lensa

| Istilah | Arti | Kapan | Three.js | Sumber |
|---|---|---|---|---|
| Wide 18–24 mm | Focal pendek, sudut pandang luas, kesan perspektif dan kedalaman kuat | Establishing, ruang, skala | `setFocalLength(18–24)` → fov-v 58,7–45,7° | [Columbia: Wide-Angle Lens](https://filmglossary.ccnmtl.columbia.edu/term/wide-angle-lens/), [Canon: Perspective](https://www.canon.ca/en/products/Lenses/RF-Lens-World/knowledge/perspective) |
| Normal 35–50 mm | Mendekati penglihatan wajar | Default penjelasan | `setFocalLength(35–50)` → 32,3–22,9° | (tabel A1) |
| Tele 85–135 mm | Latar tampak "menempel" di belakang subjek (kompresi) | Isolasi subjek, deretan objek rapat | `setFocalLength(85–135)` → 13,6–8,6°, kamera mundur | [Canon: Perspective](https://www.canon.ca/en/products/Lenses/RF-Lens-World/knowledge/perspective) |

Catatan: Canon menggambarkan kompresi sebagai efek focal length. Secara geometri proyeksi, perspektif ditentukan
oleh **posisi** kamera, sedangkan fov hanya memotong bingkai (lihat `updateProjectionMatrix`, A1). Dalam praktik,
lensa tele "mengompresi" karena kamera harus mundur agar subjek tetap sebesar sebelumnya.

### Aturan

| Istilah | Arti | Kapan | Implementasi | Sumber |
|---|---|---|---|---|
| 180° | Kamera tetap di satu sisi garis aksi | Dua tokoh/objek berhadapan, grafik A vs B | Simpan vektor garis aksi; batasi θ orbit ke satu setengah bidang; cek tanda `cross(axis, camDir).y` | [Columbia: 180-Degree Rule](https://filmglossary.ccnmtl.columbia.edu/term/180-degree-rule/) |
| 30° | Antar shot subjek yang sama, kamera bergeser ≥ 30° agar tidak terasa jump cut | Saat "cut" antar sudut di bab | Saat ganti shot: sudut antar vektor kamera ≥ 30°, atau ganti ukuran shot | [Wikipedia](https://en.wikipedia.org/wiki/30-degree_rule) [sekunder]; [Columbia: Jump Cut](https://filmglossary.ccnmtl.columbia.edu/term/jump-cut/) |
| Motivated movement | Gerak kamera punya alasan (mengikuti aksi atau mengungkap informasi) | Selalu, karena repo melarang "slide" | Setiap keyframe kamera punya pemicu di naskah/VO | (prinsip umum; tidak ditemukan definisi primer, lihat bagian akhir) |
| Lead room | Ruang kosong di arah subjek menghadap atau bergerak | Panah, kendaraan, grafik yang tumbuh ke kanan | Offset `setViewOffset`/target 1/6–1/3 lebar ke arah gerak | [Wikipedia](https://en.wikipedia.org/wiki/Lead_room) [sekunder] |
| Rule of thirds | Elemen penting di garis/potongan sepertiga bingkai | Komposisi umum | `setViewOffset(W,H, ±W/6, ±H/6, W, H)` atau target di titik sepertiga | [Wikipedia](https://en.wikipedia.org/wiki/Rule_of_thirds) [sekunder] |

### Pencahayaan

| Istilah | Arti | Kapan | Three.js | Sumber |
|---|---|---|---|---|
| Three-point (key/fill/back) | Key menentukan eksposur dan membentuk bayangan/volume; fill mengatur seberapa dalam bayangan terlihat (mood); backlight/separasi memisahkan bidang | Tokoh/objek "pahlawan" | Key: `DirectionalLight` 45° samping-atas, intensitas 2–3, `castShadow`; fill: `HemisphereLight` 0,5–1; rim: `DirectionalLight` dari belakang-atas 1–2 | [ASC – Lighting a Set (Burum)](https://theasc.com/article/lighting-a-set/) |
| High-key | Rasio cahaya rendah, terang merata, mood ceria | Gaya default merek (flat cerah) | Hemisphere tinggi, key:fill ≈ 2:1 (heuristik), `NoToneMapping` | [Wikipedia](https://en.wikipedia.org/wiki/High-key_lighting) [sekunder] |
| Low-key / chiaroscuro | Kontras terang-gelap kuat, sering hanya key | Bab "yang gagal", krisis | Fill/hemisphere ≈ 0,1–0,2, satu `SpotLight` (`penumbra` 0,3–0,6) | [Columbia: Chiaroscuro](https://filmglossary.ccnmtl.columbia.edu/term/chiaroscuro/), [Columbia: Lighting](https://filmglossary.ccnmtl.columbia.edu/term/lighting/); [Wikipedia](https://en.wikipedia.org/wiki/Low-key_lighting) [sekunder] |
| Motivated / practical | Cahaya yang sumbernya ada di adegan (lampu, jendela, layar) | Pabrik/kantor/malam | `PointLight` di posisi lampu + mesh emisif (`emissive`, `toneMapped:false`) | (tidak ditemukan definisi primer, lihat bagian akhir) |
| Kontras suhu warna | Cahaya hangat tungsten (3200 K) di dalam vs biru di luar memberi rona emas pada wajah | Membedakan "dalam/luar", "lama/baru" | Key `0xFFB46B`-an + fill/hemisphere biru `0x6FA8FF`-an (heuristik; three tidak punya parameter Kelvin) | [ASC – The Deer Hunter (Zsigmond)](https://theasc.com/article/the-deer-hunter-cinematography-zsigmond/) |
| Rim / separasi | Cahaya belakang membuat tepi terang yang memisahkan subjek dari latar | Subjek gelap di latar gelap | `DirectionalLight` di belakang subjek; pada toon, tepi menangkap pita gradien teratas | [ASC – Lighting a Set](https://theasc.com/article/lighting-a-set/) |
| Golden / magic hour | "Magic hour" = setelah matahari terbenam sebelum gelap (±20 menit); golden hour = cahaya rendah yang lebih merah dan lembut | Nostalgia, penutup bab | Elevasi `DirectionalLight` 3–10°, warna jingga, bayangan panjang; latar gradien | [ASC – Days of Heaven (Almendros)](https://theasc.com/article/photographing-days-of-heaven/); [Wikipedia Golden hour](https://en.wikipedia.org/wiki/Golden_hour_(photography)) [sekunder] |
| Blue hour | Senja ketika matahari jauh di bawah horizon, cahaya dominan biru | Kota malam, transisi waktu | Tanpa key; `HemisphereLight` biru; lampu praktis hangat sebagai kontras | [Wikipedia](https://en.wikipedia.org/wiki/Blue_hour) [sekunder] |
| Volumetric / god rays | Berkas cahaya terlihat di udara | Penekanan "pencerahan", sorot panggung | Murah: mesh kerucut aditif transparan (deterministik). Mahal: pmndrs `GodRaysEffect` (samples 60) | [Wikipedia](https://en.wikipedia.org/wiki/Volumetric_lighting) [sekunder] |

---

## Fakta yang tidak bisa diverifikasi

- **Penyebab N8AO tidak deterministik.** Hanya gejala yang terbukti (U7). Akar masalahnya (status internal, precision, atau peringatan HLSL X3595 "gradient instruction used in a loop" di ANGLE/D3D11) tidak dipastikan, dan tidak diuji di GPU lain.
- **`--enable-gpu`** tidak ditemukan di `content_switches.cc`, `gpu_switches.cc`, `gl_switches.cc`, maupun `chrome_switches.cc` (main). Kemungkinan tanpa efek, tetapi tidak dipastikan di semua file switch Chromium.
- **`HeadlessExperimental.beginFrame` di `chrome-headless-shell`:** tidak diuji, karena binarinya tidak terpasang dan sengaja tidak diunduh. Belum diketahui apakah ia mempercepat capture atau tetap menyertakan WebGL dengan GPU di Windows.
- **WebCodecs di headless:** `VideoEncoder` macet setelah 8 chunk (dengan atau tanpa backpressure, `realtime`, `prefer-software`). Belum jelas apakah ini bug lingkungan, akibat headless, atau kesalahan uji. Jangan dijadikan dasar keputusan.
- **Versi OpenGL HD 4000 di driver Windows** tidak bisa dibaca dari halaman Intel (situs diblokir dari lingkungan ini). Ivy Bridge berada di bawah syarat Blender 4.5/5.x (Broadwell/Kaby Lake) menurut blender.org, tetapi apakah Blender 3.6 LTS (OpenGL 3.3) berjalan di sini tidak diuji.
- **Rilis yang memperkenalkan `FXAAPass`** (ada di r186, tidak ada di r161) tidak dilacak.
- **Theatre.js:** apakah `obj.value` langsung terbarui secara sinkron setelah `sequence.position = t` (vs `onValuesChange` di tick rAF) tidak diuji. Dokumentasi hanya menjamin posisi bisa diset.
- **Pedestal, motivated movement, practical light, ECU/EWS:** tidak ditemukan definisi di sumber primer yang diperiksa (Columbia Film Glossary, ASC). Definisi di tabel memakai sumber sekunder atau pengetahuan umum industri.
- **Perilaku raster CSS 3D saat preview interaktif** (bukan screenshot) tidak diuji.
- **Pengukuran waktu** di mesin ini bervariasi ±30% antar run (beban latar). Angka di dokumen adalah median kasar dari 12–20 frame, bukan benchmark yang dikontrol ketat.

---

## Lampiran: uji empiris (mesin target, Chrome 153, three r161, `file://`)

| ID | Uji | Hasil kunci |
|---|---|---|
| U1 | Loader & tekstur di `file://` | fetch lokal ✘; `<img>` lokal → `texImage2D` `SecurityError`; `crossorigin` lokal ✘; `data:`/`blob:`/SVG data-URL/`createImageBitmap` ✔; `TextureLoader`/`FileLoader` lokal ✘; `FileLoader('data:…')` ✔; `SVGLoader.parse` ✔; `RoomEnvironment`+PMREM ✔; font/tekstur/GLB dari jsDelivr ✔; GLB base64 + `GLTFLoader.parse` ✔ (tekstur `ImageBitmap`); dengan `--allow-file-access-from-files` semua lokal ✔ |
| U2 | Biaya render & capture, 122 mesh, 1080p, kamera rel + noise | flat 13 ms; toon+PCF+outline 28 ms; PBR+IBL+AgX 34 ms; toon+Bloom+Bokeh+Output 57 ms; total dengan screenshot JPEG ≈ 155–255 ms; hash identik setelah seek ulang (2×rAF dan SYNC) |
| U3 | `preserveDrawingBuffer` | Tanpa PDB: screenshot ✔, readback setelah komposit = kosong, readback di task sama ✔; dengan PDB: semua ✔ |
| U4 | Backend | Default/flag repo → HD 4000 D3D11; `--disable-gpu` → WARP (toon 252 ms); `--use-angle=swiftshader` → SwiftShader (toon 1054 ms) |
| U5 | CSS 3D | `<rect>` 3D di SVG → skew datar; `<svg>` akar 3D → perspektif benar; multiplane 5×1.500 path: 3D 629 vs 2D 590 ms/frame; zoom 4× tidak blur |
| U6 | Warna merek `#EE1C25` | None (238,28,37); ACES (241,26,37); AgX (213,89,78); AgX + `toneMapped:false` (238,28,37); Toon + Ambient π (238,28,37) |
| U7 | pmndrs 6.38.3 + N8AO 2.0.1 via import map | Bloom/DOF/Vignette/Noise/ToneMapping AGX/SMAA deterministik; N8AO tidak deterministik |
| U8 | Capture alternatif (G3) | JPEG q90 190 ms; q80 154; PNG 247; WebP 632; `toBlob` 126; `readPixels` 1024; `beginFrame` tidak tersedia |
