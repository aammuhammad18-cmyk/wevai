# Eval 01-opener-saas

- jenis: opener
- rasio: 16:9
- durasi: 30 dtk
- starter: `assets/starter-opener.html`

## Prompt (disalin apa adanya ke agen)

> Buatkan opener 30 detik untuk "Rapikan", aplikasi dasbor HR untuk UKM. Logo terlampir (biru tua #14324F + aksen jingga), audiens manajer HR non-teknis. Tidak ada foto orang.

## Wajib ada (diperiksa manusia/agen penilai)

- [ ] tiga kandidat konsep + satu dipilih dengan alasan dari produk
- [ ] sidik jari struktur tertulis
- [ ] minimal satu babak UI hidup (dirakit, dipakai, menghasilkan)
- [ ] palet menyebut sumber tiap warna

## Rubrik rasa (dinilai dari frame, bukan dari kode)

- [ ] UI terbaca sebagai produk, bukan kotak abu generik
- [ ] tidak ada tiga tile fitur sejajar kecuali dituntut konsep
- [ ] kamera mengikuti klik penting, tidak di setiap klik
- [ ] penutup bukan logo + CTA di tengah kecuali diminta

## Selalu diperiksa mekanis (`scripts/eval-run.mjs`)

- [ ] `lint-motion.mjs` tanpa FAIL
- [ ] `index.html` ada dan bisa dibuka lewat `file://`
- [ ] frame detik kunci berhasil dipotret
