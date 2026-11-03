# Kalibrasi `nilai-visual` (3 Nov 2026)

Sub-proyek 8a (K1 di `docs/rencana-1.4.0.md`). Alat: `scripts/nilai-visual.mjs`; uji: `scripts/test-nilai.mjs`. Folder ini:

- `README.md`: angka, ambang, dan alasannya.
- `nilai.json`: laporan mesin tiap pemanggilan di bawah (kolom `perintah` berisi perintahnya, `laporan` isi lengkap alat).
- `kontak.jpg`: lembar kontak bingkai yang diukur, 3 kolom, urutan baris: sinematik t 0, 7, 11 · spike f_0, f_7, f_13 · aksi kontinu t 3, 11, 18 · kartun kolase t 1,5, 8, 16 · panggung t 2, 6, 10 · 3D t 1, 4, 7.

Bingkai PNG (±3 MB per bingkai) tidak disimpan di repo; cara memotretnya ulang ada di bawah.

## Bingkai

| Kelompok | Peran | Asal |
|---|---|---|
| sinematik, t 0, 7, 11 | acuan sinematik: harus lolos | `assets/starter-sinematik.html?clean=1`, `scripts/snap.mjs`, 1920×1080 |
| spike f_7 (+ f_0, f_13) | target rupa: harus lolos | `evals/bukti/2026-11-01-spike-gapura/f_*.jpg`, diubah ke PNG dengan `ffmpeg -i f_7.jpg f_7.png` |
| aksi kontinu, t 3, 11, 18 | acuan datar: harus ditandai | `assets/starter-explainer.html?clean=1` (jalur bawaan) |
| kartun kolase, t 1,5, 8, 16 | acuan datar: harus ditandai | `assets/starter-explainer-kartun.html?clean=1` (jalur bawaan) |
| Babad Mataram s04, 13 bingkai | validasi luar, TIDAK dipakai menetapkan ambang | produksi pemilik (gaya "ilustrasi adegan", bingkai dari `cek/s04/`); dibaca di tempat, tidak disalin |
| panggung t 2, 6, 10 · 3D t 1, 4, 7 | tambahan, untuk catatan batas alat | `starter-explainer-panggung.html`, `starter-explainer-3d.html`, jalur bawaan |

Potret: `URL="file:///<repo>/assets/starter-sinematik.html?clean=1" node scripts/snap.mjs shots 0 7 11`; sama untuk starter lain dengan detik di atas.
Chrome dijalankan lewat pembungkus berprioritas Idle yang memegang kunci Chrome bersama, karena render pemilik sedang berjalan.
Koordinat yang dideklarasikan: obor `(512,598)` dan `(778,598)` = konstanta `OBOR` di starter dan `TORCH` di spike; kotak penjaga `1230,205,540,845`
diukur dari bingkai t 7 (kepala ≈ y 215, kaki ≈ y 1040, tombak ≈ x 1240, perisai ≈ x 1755).

## Ambang

Skala luminans = L OKLab × 100, dihitung pada kisi 480×270 (rata-rata blok 4×4).

| Ukuran | Ambang | Lolos (terendah … tertinggi) | Ditandai (terendah … tertinggi) | Jarak dari ambang (lolos / ditandai) |
|---|---|---|---|---|
| rentang luminans (p95 − p5) | ≥ 28 | 36,3 … 41,4 | 4,2 … 18,8 | 8,3 / 9,2 |
| kontras, ada `--subjek` | ≥ 10 | 21,3 … 31,7 | 3,6 … 4,4 (kontrol) | 11,3 / 5,6 |
| kontras, tengah vs tepi | ≥ 10 | 12,3 … 16,2 | 0 … 6,7 | 2,3 / 3,3 |
| titik terang dekat sumber | ≥ median + 30 | +65,7 … +71,2 | −9,7 … +11,3 (sumber palsu) | 35,7 / 18,7 |
| warna dominan (≥ 5 % bingkai) | 2 sampai 6 | 3 … 4 | 1 … 2 | batas bawah terpisah jelas; batas atas **tidak terkalibrasi** |

Semua acuan sinematik dan f_7 lolos semua ukuran (keluar 0); keenam acuan datar ditandai (keluar 1); 13 dari 13 bingkai produksi Mataram ditandai.

## Angka mentah

Tanda `(!)` = peringatan. Kontras subjek ditulis nilai (selisih rata-rata; sorot).

**Acuan sinematik dan target rupa** (`--sumber` obor, `--subjek 1230,205,540,845`; kolom "tengah" = bingkai yang sama tanpa `--subjek`)

| bingkai | p5 / p50 / p95 | rentang | kontras subjek | kontras tengah | titik terang | warna |
|---|---|---|---|---|---|---|
| sinematik t 0 | 15,3 / 25,2 / 51,6 | 36,3 | 21,3 (1,6; 21,3) | 12,3 | +71,2 +71,2 | 3 |
| sinematik t 7 | 15,4 / 25,4 / 52,7 | 37,4 | 24,3 (0,5; 24,3) | 13,0 | +71,0 +71,0 | 3 |
| sinematik t 11 | 15,4 / 25,5 / 53,8 | 38,4 | 24,9 (0,4; 24,9) | 13,8 | +71,2 +71,0 | 3 |
| spike f_0 | 12,8 / 25,9 / 53,6 | 40,9 | 25,7 (1,2; 25,7) | 16,1 | +69,5 +69,3 | 3 |
| spike f_7 | 12,9 / 26,2 / 53,8 | 41,0 | 31,7 (1,8; 31,7) | 16,2 | +71,0 +71,0 | 4 |
| spike f_13 | 13,1 / 26,3 / 54,4 | 41,4 | 30,2 (1,8; 30,2) | 15,7 | +65,7 +68,9 | 3 |

**Acuan datar** (tanpa `--subjek`; kolom terakhir = obor yang sama dideklarasikan di tempat yang tak ada cahayanya)

| bingkai | p5 / p50 / p95 | rentang | kontras tengah | warna | titik terang (sumber palsu) |
|---|---|---|---|---|---|
| aksi t 3 | 71,9 / 88,7 / 90,8 | 18,8 (!) | 0 (!) | 2 | +11,3 +11,3 (!) |
| aksi t 11 | 88,7 / 92,8 / 92,9 | 4,2 (!) | 0,7 (!) | 1 (!) | +0,2 +0,2 (!) |
| aksi t 18 | 83,5 / 93,9 / 94,1 | 10,6 (!) | 6,7 (!) | 2 | +0,3 −9,7 (!) |
| kartun t 1,5 | 77,2 / 82,5 / 89,7 | 12,5 (!) | 1,6 (!) | 1 (!) | +0,7 +0,7 (!) |
| kartun t 8 | 74,6 / 82,9 / 89,9 | 15,4 (!) | 0,8 (!) | 1 (!) | +0,3 +7,5 (!) |
| kartun t 16 | 80,5 / 85,8 / 91,3 | 10,8 (!) | 1,6 (!) | 1 (!) | +4,9 −2,6 (!) |

**Kontrol subjek** (`--subjek` pada satu bingkai datar)

| bingkai, kotak | kontras: nilai (selisih rata-rata; sorot) | arti |
|---|---|---|
| kartun t 16, `636,225,708,624` | 3,6 (3,6; −5,8) (!) | cutout pasir pada kertas: menyatu |
| kartun t 8, `150,200,650,700` | 4,4 (1,1; 4,4) (!) | cutout + lingkaran: menyatu |
| kartun t 1,5, `399,0,1119,1080` | 4,4 (4,4; −2,8) (!) | cutout setinggi bingkai: menyatu |
| aksi t 3, `500,610,1030,150` | 19,5 (5,2; 19,5) | kereta putih pada latar pastel: terpisah, wajar lolos (bingkainya tetap ditandai ukuran lain) |

**Validasi luar: Babad Mataram ke Timur, bab s04** (tanpa `--sumber` dan `--subjek`; 13 dari 13 ditandai)

| t (dtk) | rentang | kontras tengah | warna | ditandai oleh |
|---|---|---|---|---|
| 3 | 25,7 (!) | 17,3 | 2 | rentang |
| 12, 32 | 31,8; 33,9 | 1,9; 3,6 (!) | 3; 2 | kontras |
| 50 | 7,1 (!) | 1,7 (!) | 1 (!) | ketiganya |
| 72, 95, 125, 140, 160 | 54,0; 36,2; 36,4; 40,6; 40,1 | 5,0; 1,3; 5,7; 2,0; 2,2 (!) | 3 | kontras |
| 185, 196 ("malam + bara") | 7,2; 7,5 (!) | 0,4; 0,1 (!) | 1 (!) | ketiganya |
| 212, 235 | 36,2; 36,7 | 0,1; 1,3 (!) | 2 | kontras |

**Tambahan, bukan kalibrasi** (tanpa `--sumber` dan `--subjek`)

| bingkai | rentang | kontras tengah | warna | hasil |
|---|---|---|---|---|
| panggung t 2 / t 6 | 49,8 / 49,7 | 3,0 (!) / 2,5 (!) | 3 / 3 | peringatan (hanya kontras) |
| panggung t 10 (rak data) | 63,6 | 33,6 | 4 | **ok semua** |
| 3D t 1 | 15,6 (!) | 9,5 (!) | 2 | peringatan |
| 3D t 4 / t 7 | 50,2 | 17,8 | 3 | ok semua |

## Alasan

1. **Skala.** L OKLab × 100 dipakai karena rata terhadap persepsi: satu angka berarti hal yang sama di bingkai gelap dan terang, dan konversi yang sama
   dipakai ukuran warna. Persentil p5 dan p95 sengaja dipakai alih-alih min dan maks: 5 % piksel paling ekstrem (bara, bintang, noda) tak melebarkan rentang.
2. **Rentang ≥ 28.** Acuan sinematik 36,3–41,4, acuan datar 4,2–18,8; 28 ada di tengah celah. Ini ukuran paling jelas untuk kertas dan pastel polos.
3. **Kontras = yang terbesar dari selisih rata-rata dan sorot.** Dengan kotak penjaga, selisih rata-rata kotak vs cincin hanya 0,4–1,8 di semua
   acuan sinematik dan f_7: siluet gelap ber-rim nyaris sama terang dengan langit di belakangnya. Selisih rata-rata saja akan menolak tampilan yang
   justru jadi target. Pemisahnya adalah rim tipis: `sorot` = p95 kotak − median cincin = 21,3–31,7, sedangkan cutout datar yang menyatu dengan
   kertas hanya −5,8…+4,4. Siluet gelap pada latar terang (atau sebaliknya) tetap lolos lewat selisih rata-rata (diuji sintetis).
   Ambang 10 memisahkan keduanya dengan jarak 5,6 dan 11,3.
4. **Kontras tengah vs tepi (tanpa kotak) adalah ukuran paling tipis.** Jaraknya hanya 2,3 dan 3,3 dari ambang. Ia menangkap tidak adanya
   falloff cahaya atau vignette, dan itulah yang paling sering menandai ilustrasi datar nyata: di s04 ia menandai 12 dari 13 bingkai, sedangkan rentang
   hanya 4. Gunakan `--subjek` bila subjeknya jelas.
5. **Titik terang ≥ median + 30.** Inti obor di acuan sinematik +65,7…+71,2; sumber yang dideklarasikan di tempat yang tak ada cahayanya −9,7…+11,3.
   Celahnya terlebar dari keempat ukuran. 30 dipilih sebagai lantai "terlihat sebagai cahaya" dan menyisakan ruang untuk sumber yang lebih lemah
   (lilin, lentera). Puncak diambil dari sel rata-rata blok 4×4, jadi bara dan bintang kecil tidak ikut.
6. **Warna dominan.** Histogram OKLab kasar (kotak 0,04), kotak yang jaraknya < 0,12 dilebur ke yang lebih besar, dihitung kelompok ≥ 5 % bingkai.
   Peleburan perlu: tanpanya gradasi lembut terhitung banyak warna (diuji sintetis). Untuk 0,10 ≤ gabung ≤ 0,15 acuan sinematik tetap 3–4. Batas bawah 2
   dari data: kertas polos 95–99 % satu warna. **Batas atas 6 tidak berasal dari sampel yang gagal**: dari semua bingkai yang diukur (termasuk 13 gambar
   galeri README dan 80 potret audit 1 Nov) tak ada yang lebih dari 4. Ia dipilih sebagai batas "pelangi" dan diuji dengan gambar sintetis 8 warna; kalibrasi ulang bila ada bingkai nyata yang gagal.
7. **Cakram sumber** bawaan 7 % sisi terpendek (76 px di 1080p), cukup menjangkau nyala bila koordinat meleset belasan piksel (obor `(512,598)` vs nyala ≈ `(520,585)`).
8. **Pembaca PNG** diperiksa silang dengan ffmpeg: 30 PNG buatan ffmpeg (5 jenis warna × filter none/sub/up/avg/paeth/mixed, alfa landai) terbaca
   persis sama, 0 piksel berbeda. Pemeriksaan ini sekali jalan (butuh ffmpeg), bukan bagian dari uji repo.

## Batas alat

- **Contoh dasar sempit.** Acuan sinematik hanyalah satu adegan (gapura malam) pada tiga detik, ditambah versi spike-nya. Adegan sinematik lain
  (senja, siang berkabut, interior) belum teruji; adegan terang bisa lebih sempit dari 28 tanpa flat. Ulangi kalibrasi untuk tiap kulit atau starter sinematik baru.
- **Blok warna rata berentang lebar lolos.** Panggung t 10 (rak gelap pada latar terang) lolos semua ukuran tanpa sumber; panggung t 2 dan t 6 hanya
  ditandai kontras tengah. Penjaganya adalah deklarasi sumber: kulit sinematik wajib menyatakannya, dan adegan datar yang menyatakan obor akan gagal di ukuran titik terang.
- **Titik terang butuh median rendah.** Di bingkai terang (median > 70) sumber nyaris mustahil ≥ +30; peringatan di sana harus dilihat dengan mata.
- **Sorot bisa dipenuhi detail terang apa pun di dalam kotak** (jendela, teks putih). Buat kotak subjek yang ketat.
- **Kontras warna (hangat vs dingin) tidak diukur**, hanya luminans.
- Kasus ini bukan sasaran: gambar galeri README (UI, teks, foto) banyak yang lolos rentang karena isinya teks dan panel, bukan cahaya.

## Mengulang

```bash
# dari folder yang berisi sinematik/ aksi/ kartun/ acuan/ (PNG), memakai skrip di repo
node <repo>/scripts/nilai-visual.mjs sinematik --sumber '[{"x":512,"y":598},{"x":778,"y":598}]' --subjek 1230,205,540,845   # keluar 0
node <repo>/scripts/nilai-visual.mjs acuan --sumber '[{"x":512,"y":598},{"x":778,"y":598}]' --subjek 1230,205,540,845       # keluar 0
node <repo>/scripts/nilai-visual.mjs aksi kartun                                                                              # keluar 1
```

Menyunting `AMBANG` di `scripts/nilai-visual.mjs` berarti memperbarui tabel ini dan tabel di `references/alat-kerja.md` › "Nilai visual".
Uji `node --test scripts/test-nilai.mjs` menjaga agar teks bantuan di kepala skrip tetap memuat ambang yang sama dengan `AMBANG`.
