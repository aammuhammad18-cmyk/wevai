# Eval 05-explainer-jurnalisme

- jenis: explainer
- rasio: 16:9
- durasi: 60 dtk
- starter: `assets/starter-explainer-jurnalisme.html`

## Prompt (disalin apa adanya ke agen)

> Explainer 60 detik gaya jurnalisme visual: bagaimana pelabuhan peti kemas bekerja. Tanpa VO.

## Wajib ada (diperiksa manusia/agen penilai)

- [ ] gaya/rasio/durasi/suara ditanya dalam SATU pertanyaan
- [ ] tiap entitas yang disebut tampil gambarnya
- [ ] sumber foto berlisensi bebas + kredit di layar

## Rubrik rasa (dinilai dari frame, bukan dari kode)

- [ ] tiap adegan 3–5 elemen yang menumpuk per frasa, bukan satu gambar + satu kalimat
- [ ] kamera punya koreografi (close-up → meluncur → zoom out)
- [ ] tidak ada tiga adegan berturut dengan sudut sama

## Selalu diperiksa mekanis (`scripts/eval-run.mjs`)

- [ ] `lint-motion.mjs` tanpa FAIL
- [ ] `index.html` ada dan bisa dibuka lewat `file://`
- [ ] frame detik kunci berhasil dipotret
