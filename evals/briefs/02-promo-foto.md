# Eval 02-promo-foto

- jenis: opener
- rasio: 9:16
- durasi: 20 dtk
- starter: `assets/starter-opener.html`

## Prompt (disalin apa adanya ke agen)

> Promo 20 detik, 9:16, untuk aplikasi tiket konser "Sorak". Gaya flat pop berfoto, orang di-generate (wajah fiktif). Warna brand ungu #6B2BD9 dan kuning #FFC21A.

## Wajib ada (diperiksa manusia/agen penilai)

- [ ] sumber foto ditanyakan sebelum membangun
- [ ] daftar shot foto tertulis
- [ ] wajah fiktif, logo/teks brand ditambahkan di kode

## Rubrik rasa (dinilai dari frame, bukan dari kode)

- [ ] foto dianimasikan (pop/parallax/wadah), bukan Ken Burns
- [ ] medan warna berganti dengan pemicu terlihat
- [ ] kata raksasa terpotong tepi terasa milik brand, bukan salinan contoh

## Selalu diperiksa mekanis (`scripts/eval-run.mjs`)

- [ ] `lint-motion.mjs` tanpa FAIL
- [ ] `index.html` ada dan bisa dibuka lewat `file://`
- [ ] frame detik kunci berhasil dipotret
