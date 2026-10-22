# Eval 06-explainer-panggung

- jenis: explainer kartun panggung
- rasio: 9:16
- durasi: 45 dtk
- starter: `assets/starter-explainer-panggung.html`

## Prompt (disalin apa adanya ke agen)

> Explainer kartun 45 detik untuk anak: kenapa gunung berapi meletus. 9:16, VO menyusul.

## Wajib ada (diperiksa manusia/agen penilai)

- [ ] naskah VO lengkap ada di pesan penutup + vo-script.md
- [ ] nol caption di layar
- [ ] tiap panggung ≥10 benda bergerak

## Rubrik rasa (dinilai dari frame, bukan dari kode)

- [ ] tidak ada frame dengan zoom < 1,08 (tidak ada miniatur)
- [ ] sendi tidak lepas saat tokoh bergerak
- [ ] pergantian panggung cut/geser 96 px, bukan fade

## Selalu diperiksa mekanis (`scripts/eval-run.mjs`)

- [ ] `lint-motion.mjs` tanpa FAIL
- [ ] `index.html` ada dan bisa dibuka lewat `file://`
- [ ] frame detik kunci berhasil dipotret
