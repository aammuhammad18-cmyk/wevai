# Eval 09-explainer-3d

- jenis: explainer
- rasio: 16:9
- durasi: 45 dtk
- starter: `assets/starter-explainer-3d.html`

## Prompt (disalin apa adanya ke agen)

> Explainer 45 detik: bagaimana satu peti kemas berpindah dari pabrik ke kapal. Dunia 3D, dua sudut di pelabuhan, cahaya berubah dari siang ke senja saat kapal berangkat.

## Wajib ada (diperiksa manusia/agen penilai)

- [ ] satu dunia 3D dari awal sampai akhir
- [ ] ≥ 2 sudut berbeda di pelabuhan
- [ ] satu pergantian preset cahaya dengan pemicu terlihat (kapal berangkat)
- [ ] satu hero shot dengan `focus()`

## Rubrik rasa (dinilai dari frame, bukan dari kode)

- [ ] coverage: wide → detail → wide
- [ ] cahaya bercerita, bukan sekadar berganti
- [ ] teks HUD terbaca di ponsel

## Selalu diperiksa mekanis (`scripts/eval-run.mjs`)

- [ ] `lint-motion.mjs` tanpa FAIL
- [ ] `index.html` ada dan bisa dibuka lewat `file://`
- [ ] frame detik kunci berhasil dipotret
