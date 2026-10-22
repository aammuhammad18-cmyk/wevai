# Eval 07-explainer-aksi

- jenis: explainer
- rasio: 16:9
- durasi: 60 dtk
- starter: `assets/starter-explainer.html`

## Prompt (disalin apa adanya ke agen)

> Explainer 60 detik tentang kereta cepat: jarak, waktu tempuh, dan medan yang dilewati. Gaya aksi kontinu.

## Wajib ada (diperiksa manusia/agen penilai)

- [ ] satu subjek hadir dari awal sampai akhir
- [ ] angka hidup di dalam dunia, bukan overlay

## Rubrik rasa (dinilai dari frame, bukan dari kode)

- [ ] latar tidak pernah berhenti mengalir
- [ ] tiap fakta dapat instrumennya (peta, profil, kabin)
- [ ] sudut pandang berganti, subjek tetap dikenali

## Selalu diperiksa mekanis (`scripts/eval-run.mjs`)

- [ ] `lint-motion.mjs` tanpa FAIL
- [ ] `index.html` ada dan bisa dibuka lewat `file://`
- [ ] frame detik kunci berhasil dipotret
