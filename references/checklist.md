# Checklist sebelum menyerahkan + jebakan

Dibaca di langkah 6 alur kerja SKILL.md, sebelum menyerahkan. Dipindah utuh dari SKILL.md (3 Nov 2026) supaya badan SKILL.md muat dalam 24 000 byte yang dimuat Antigravity.

## Checklist sebelum menyerahkan

Berlaku untuk semua jenis. Checklist KHUSUS jenis pekerjaan ada di dokumennya dan
dibaca bersama jalur itu: opener/promo → `references/opener-konsep.md`, explainer →
`references/explainer.md`, kartun panggung → `references/kartun-panggung.md`,
build di After Effects → `references/ae-bridge-higgsfield.md`.

- [ ] Style brief (tema, palet dari brand, font display berkarakter, satu
      bahasa latar, tanda tangan gerak, momen istimewa) ditulis dan disetujui
      SEBELUM kode
- [ ] Tidak ada sisa placeholder starter (abu-abu, font sistem, nebula bila
      arah gayanya lain) dan tidak ada kulit referensi yang disalin (palet,
      font, tekstur, tata letak, kalimat)
- [ ] Teks hidup (Hukum #4): sentence case bobot 500–600, penekanan jelas,
      tanpa titik otomatis (tanda baca hanya bila mengubah arti/irama),
      ukuran/arah/posisi bergantian antar adegan;
      kapital-tebal hanya di satu adegan. Sorotan kata hanya bila style brief
      memilihnya (bukan otomatis di setiap kalimat, bukan pill + bintang
      warisan proyek lain)
- [ ] Latar tunduk (Hukum #4): di bawah teks luminance ≤ 25 % atau ≥ 80 %,
      elemen latar redup dan berwarna gelap di kantong teks; uji grayscale —
      tidak ada latar seterang huruf
- [ ] Transisi dipilih pada batas yang membutuhkan; tidak otomatis semua
      batas diberi efek atau semua efek dihapus. Objek penyapu punya makna
      dalam adegan; kecepatan, amplitudo, dan jeda sudah diperiksa.
- [ ] Permukaan latar dari menu §7d: ≥ 2 lapis (dasar + cahaya/tekstur/
      blob), warna dari palet — tidak flat satu warna, bukan hitam/putih murni
- [ ] Gaya render objek satu keluarga (§7e), atau pergantiannya dijadikan momen
- [ ] Bila memakai grainy gradient/butiran: butiran masih terlihat di MP4 hasil encode
      dan gradien tidak banding
- [ ] Bila memakai video: klip dipasang lewat `clip()` (tanpa `autoplay`/`loop`), dibungkus
      elemen yang dianimasikan, sumbernya disepakati user, folder `assets/` disebutkan saat
      penyerahan, dan detik yang berisi klip sudah dipotret (`snap.mjs`)
- [ ] Gerak latar dipilih dari menu §7c dan BERBEDA dari proyek sebelumnya;
      tidak ada batang/garis melintas ke samping kecuali tema kecepatan/
      aliran dan belum dipakai di proyek sebelumnya
- [ ] Latar bergerak di setiap adegan (tidak ada latar diam); pergantian warna
      latar boleh kapan dibutuhkan asal punya pemicu terlihat
- [ ] Lolos 8 poin "Larangan struktural" (`anti-ppt.md`; bukan section yang di-fade, ada
      benang merah visual, ≤ 2 tingkat teks, gerak tiap detik, transisi
      bervariasi, starter yang benar, bukan miniatur, bukan kerangka template)
- [ ] Tanpa player di layar; autoplay; loop; `?debug=1` untuk scrub
- [ ] Opener: satu gagasan utama tanpa tumpukan badge; explainer: satu
      peristiwa dapat memuat beberapa beat dan objek yang saling berhubungan.
- [ ] Kamera, cut, dan gerak objek dipilih sesuai konteks; tidak ada keharusan
      menggerakkan kamera di tiap segmen. Saat kamera bergerak, seluruh dunia ikut.
- [ ] Tidak ada hold panjang yang mati: babak tanpa aksi objek yang besar mendapat
      perubahan ukuran shot ke elemen (wide ↔ medium close-up ↔ close-up) atau push pelan;
      napas kamera saja tidak dihitung. Label layar di luar rig, tidak terpotong zoom
- [ ] Motion blur berarah pada semua teks masuk/keluar
- [ ] Kamera sinematik: tiap dunia ≥ 2 sudut berbeda; cahaya bercerita di ≥ 1 segmen
      (atau dinyatakan tidak dipakai di style brief); subjek tidak masuk zona aman HUD
- [ ] Latar lahir dari tema (tidak otomatis gelap; terang bisa gradien,
      warna lembut, blok warna, kertas), punya kedalaman (bukan satu warna
      flat), TIDAK lebih ramai daripada subjek; pergantian latar diputuskan
      per segmen di style brief dan, bila ada, terjadi di balik wipe/cut
- [ ] Glow dipakai pada objek (tile, bar, ikon dekor) — judul teks BERSIH
      (putih penuh + drop shadow tipis), kecuali user minta sebaliknya
- [ ] Font display ≠ font mockup UI; mockup memakai font produk aslinya
      (konsep klaim → cara → hasil: seluruh teks memakai font UI produk)
- [ ] Nol pemakaian `Date.now()` / `Math.random()` di jalur render; acak saat setup
      memakai PRNG ber-seed; loop dari jam, bukan `onComplete`
- [ ] `lint-motion.mjs` lolos tanpa FAIL (larangan struktural & checklist yang mekanis)
- [ ] Kulit sinematik: `nilai-visual.mjs shots --sumber '<obor>' --subjek <kotak>` keluar 0; tiap peringatan diperbaiki atau dijelaskan di pesan penutup
- [ ] Sudah dipotret di detik kunci (snap.mjs / ?debug=1) dan dilihat dengan
      mata — bukan render penuh; MP4 hanya bila diminta
- [ ] Ada suara? Halaman menahan di frame awal bila autoplay diblokir dan mulai
      bersama suara pada gestur pertama — tidak pernah mulai tanpa suara; tanpa
      file peluncur (`.cmd`/`.bat`)
- [ ] Tidak ada teks di bawah 30 px pada panggung 1080 (body ≥ 44, label ≥ 34,
      kredit ≥ 30) — ditonton di HP; teks hantu & anotasi bervariasi, bukan
      selalu outline / lingkaran putus-putus
- [ ] `index.html` terbuka langsung lewat `file://` (klik dua kali) tanpa
      server — CSS/JS inline, tidak ada `src` module lokal
- [ ] Angka yang berubah tiap frame (jam, counter) memakai
      `font-variant-numeric:tabular-nums` + `min-width` supaya wadahnya
      tidak berubah lebar

## Jebakan yang sudah memakan korban

Detail dan perbaikannya di `references/techniques.md` bagian "Jebakan":
bloom threshold rendah → layar putih; nebula additive → menumpuk lewat bloom;
selector CSS lebih spesifik mengalahkan state awal `opacity:0` → elemen
muncul mendahului animasinya; module JS di-cache browser → edit "tidak
ngefek" (pakai server `Cache-Control: no-store`); tween `repeat:-1` → durasi
timeline tak hingga, `onComplete` tak pernah terpicu (loop dari jam); objek 3D pipih diputar
penuh di sumbu Y → jadi sebatang garis (goyangkan, jangan putar penuh);
kotak filter SVG default memotong ekor blur (lebarkan `x/y/width/height`).
