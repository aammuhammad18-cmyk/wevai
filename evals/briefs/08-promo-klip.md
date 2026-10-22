# Eval 08-promo-klip

- jenis: opener
- rasio: 16:9
- durasi: 30 dtk
- starter: `assets/starter-opener.html`

## Prompt (disalin apa adanya ke agen)

> Promo 30 detik aplikasi edit video "Potong": rekaman layar produk diputar di dalam mockup laptop. Klip terlampir.

## Wajib ada (diperiksa manusia/agen penilai)

- [ ] klip dipasang lewat clip() tanpa autoplay/loop
- [ ] folder assets/ disebutkan saat penyerahan
- [ ] detik yang berisi klip sudah dipotret

## Rubrik rasa (dinilai dari frame, bukan dari kode)

- [ ] klip dibungkus perangkat yang ikut dianimasikan
- [ ] teks dan anotasi tetap hidup di atas klip
- [ ] scrub ?debug=1 tetap sinkron dengan klip

## Selalu diperiksa mekanis (`scripts/eval-run.mjs`)

- [ ] `lint-motion.mjs` tanpa FAIL
- [ ] `index.html` ada dan bisa dibuka lewat `file://`
- [ ] frame detik kunci berhasil dipotret
