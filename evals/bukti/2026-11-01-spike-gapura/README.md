# Acuan spike: gapura malam (1 Nov 2026)
Spike sekali pakai dari sesi brainstorming arah sinematik: seberapa jauh SVG murni (tanpa gambar) mendekati ilustrasi sinematik. Disalin dari scratchpad sesi supaya tidak hilang.
- `index.html` — versi cepat (`spike-cepat`): tiap lapisan `<svg>` sendiri di div terkomposit, cahaya dibakar sekali, per frame hanya transform.
- `spike-svg.html` — versi awal (`spike-gapura`): satu `<svg>` dengan filter hidup tiap frame, lambat.
- `f_7.jpg` (dari `index.html`) = **acuan rupa**: keluaran modul atmosfer/cahaya-2d/pasca (sub-proyek 2) "tidak boleh lebih buruk" dari still ini. `f_0.jpg` dan `f_13.jpg` dari `spike-svg.html`.
- Memotret ulang: buka `index.html?t=7` di Chrome 1920×1080 (`--use-gl=angle --ignore-gpu-blocklist`), tunggu `window.READY`, screenshot.
  Contoh skrip: `spike-gapura-shot.mjs` di scratchpad sesi 1 Nov (bila masih ada). JPEG dari PNG: `ffmpeg -i f_7.png -q:v 2 f_7.jpg`.
