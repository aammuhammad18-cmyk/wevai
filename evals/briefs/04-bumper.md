# Eval 04-bumper

- jenis: bumper
- rasio: 16:9
- durasi: 6 dtk
- starter: `assets/starter-opener.html`

## Prompt (disalin apa adanya ke agen)

> Bumper 6 detik untuk kanal YouTube "aammuhammad18": logo build-on, satu gerak tanda tangan, selesai cepat.

## Wajib ada (diperiksa manusia/agen penilai)

- [ ] satu gerak tanda tangan yang jadi identitas
- [ ] loop mulus

## Rubrik rasa (dinilai dari frame, bukan dari kode)

- [ ] selesai sebelum penonton sadar, tanpa teks tambahan
- [ ] glow hanya pada objek, bukan judul

## Selalu diperiksa mekanis (`scripts/eval-run.mjs`)

- [ ] `lint-motion.mjs` tanpa FAIL
- [ ] `index.html` ada dan bisa dibuka lewat `file://`
- [ ] frame detik kunci berhasil dipotret
