# Eval 10-sejarah-malam-obor

- jenis: babak sejarah sinematik, 100 % kode
- rasio: 16:9
- durasi: 60 dtk
- starter: `assets/starter-sinematik.html`

## Prompt (disalin apa adanya ke agen)

> Satu babak sejarah 60 detik: malam di gerbang keraton Jawa kuno, diterangi obor. Satu tokoh (penjaga gapura) dan satu shot mata elang yang menembus gerbang lalu mendarat di penjaga. 16:9, 100 % kode: tanpa foto dan tanpa gambar generate. VO menyusul.

## Wajib ada (diperiksa manusia/agen penilai)

- [ ] style brief menulis kulit "ilustrasi sinematik" (kulit B) beserta alasannya, bukan flat bawaan
- [ ] pesan penutup menyebut koordinat piksel tiap obor (sumber cahaya) dan kotak tokoh `x,y,w,h`, supaya angkanya bisa diulang
- [ ] satu tokoh yang terbaca dari siluetnya, dengan rim di sisi obor
- [ ] tepat satu shot mata elang: termotivasi (pemicu tertulis di rundown), ≥ 3 dtk tanpa cut, ditutup mendarat di tokoh (`sinematografi.md` §3)
- [ ] nol `<img>`, nol `url(` raster, nol foto: 100 % kode
- [ ] ANGKA, bingkai statis (potret `eval-run.mjs --snap`, di luar shot mata elang): `node scripts/nilai-visual.mjs <folder-hasil>/10-sejarah-malam-obor/shots --sumber '<obor>' --subjek <kotak tokoh>` keluar 0, yaitu rentang luminans ≥ 28, kontras subjek ≥ 10, titik terang tiap obor ≥ median + 30, 2–6 warna dominan
- [ ] ANGKA, shot mata elang (obor bergerak di bingkai, jadi tanpa `--sumber`): dua bingkai di dalamnya dipotret dengan `snap.mjs`, lalu `node scripts/nilai-visual.mjs <folder>` keluar 0
- [ ] tiap peringatan `nilai-visual` yang tersisa dijelaskan di pesan penutup (mis. bingkai di tengah fade), bukan diabaikan

## Rubrik rasa (dinilai dari frame, bukan dari kode)

- [ ] cahaya bersumber jelas: sorot jatuh di sekitar obor dan menerangi relief dan tokoh, bukan gradien layar penuh
- [ ] kabut berlapis menurut kedalaman, bara atau debu hidup, satu grade yang serempak
- [ ] tokoh bukan manekin: tampak samping atau 3/4, siluet ber-rim, tidak seperti kotak berdiri
- [ ] shot mata elang terasa terbang (kecepatan, roll dari tikungan), bukan zoom atau pan biasa
- [ ] lembar kontak: tidak ada bingkai yang terbaca "slide" atau blok warna rata, walau `nilai-visual` lolos (ia saringan, bukan vonis)

## Selalu diperiksa mekanis (`scripts/eval-run.mjs`)

- [ ] `lint-motion.mjs` tanpa FAIL
- [ ] `index.html` ada dan bisa dibuka lewat `file://`
- [ ] frame detik kunci berhasil dipotret
