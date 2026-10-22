# Eval 03-kinetic

- jenis: kinetic typography
- rasio: 16:9
- durasi: 15 dtk
- starter: `assets/starter-opener.html`

## Prompt (disalin apa adanya ke agen)

> Kinetic typography 15 detik untuk pengumuman festival: "Kota Bunyi · 3 malam · 48 panggung". Keras, poster color-block.

## Wajib ada (diperiksa manusia/agen penilai)

- [ ] font display berkarakter (bukan Poppins/Inter/Roboto/Montserrat)
- [ ] tanpa titik otomatis pada frase pendek

## Rubrik rasa (dinilai dari frame, bukan dari kode)

- [ ] ukuran/arah/posisi teks bergantian antar adegan
- [ ] latar bergerak di setiap detik
- [ ] ritme terasa mengikuti ketukan, bukan stagger seragam

## Selalu diperiksa mekanis (`scripts/eval-run.mjs`)

- [ ] `lint-motion.mjs` tanpa FAIL
- [ ] `index.html` ada dan bisa dibuka lewat `file://`
- [ ] frame detik kunci berhasil dipotret
