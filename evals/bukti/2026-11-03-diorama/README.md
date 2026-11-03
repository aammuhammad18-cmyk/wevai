# Diorama cel-shaded: pura tri mandala sebagai miniatur museum (3–4 Nov 2026)

Rencana 1.4.0 §J, "Diorama cel-shaded: toon + outline + tilt-shift, kartu 2D di ruang 3D". Starter: `assets/starter-diorama.html` (19 dtk); blok:
`src/runtime/diorama.js`, `src/runtime/pura-bali.js`; dokumen + akurasi + sumber: `references/diorama.md`; uji: `scripts/test-diorama.mjs` (node:test) dan
kait `DIORAMA_UJI` di `scripts/test-starters.mjs`.

- `kontak.jpg`: 6 bingkai `?clean=1`, lalu tiga potongan 1:1: kaki kori (garis + peralihan tilt), tingkat toon padmasana, dan tepi atas pita fokus.
- `garis.jpg`: lambung terbalik (kiri) vs tepi depth/normal (kanan), adegan sama, t = 12,5 dtk, 1:1. Yang dipilih: lambung.

Bingkai PNG (±3 MB) tidak disimpan di repo. Potret ulang: `URL="file:///<repo>/assets/starter-diorama.html?clean=1" node scripts/snap.mjs shots 1.5 6.5 10 12.5 15.5 18.8`. Chrome
dijalankan lewat pembungkus berprioritas Idle yang memegang kunci Chrome bersama.

## Bingkai dan angka

`node scripts/nilai-visual.mjs <bingkai> --subjek x,y,w,h`, tanpa `--sumber` (tak ada sumber cahaya di dalam bingkai). Kotak subjek dibaca dari bingkai.

| Detik | Isi | `--subjek` | p5/p50/p95 | Rentang | Kontras subjek | Warna |
|---|---|---|---|---|---|---|
| 1,50 | maket utuh, label kaja | 234,144,1650,900 | 17/25/67 | 50,1 ok | 46,8 ok | 4 ok |
| 6,50 | nista, wantilan, beringin | 498,354,810,570 | 20/47/70 | 50,6 ok | 30,6 ok | 3 ok |
| 10,00 | candi bentar, madya | 492,144,1260,840 | 22/48/72 | 50 ok | 28,2 ok | 4 ok |
| 12,50 | kori agung, pemedek | 84,0,1020,810 | 21/48/75 | 54,2 ok | 26,3 ok | 5 ok |
| 15,50 | utama: padmasana + meru | 318,0,1590,780 | 17/39/77 | 60,1 ok | 21,2 ok | 4 ok |
| 18,80 | mendarat, gunung, legenda | 880,270,950,740 | 17/55/77 | 59,1 ok | 18 ok | 4 ok |

Nol peringatan. Bingkai 1,5–15,5 sama byte demi byte di dua peluncuran Chrome terpisah (`cmp` PNG); bingkai 18,8 berbeda hanya karena legenda diubah di antaranya.

## Uji

`node scripts/test-starters.mjs assets/starter-diorama.html` (lewat pembungkus Idle):

```
diorama: ulang 0; garis 1.02 % L 24; tilt atas 0.18 bawah 0.16 fokus 0; tone 4; mutasi tertangkap {"jam":true,"garis":true,"tilt":true,"tone":true}
ok     starter-diorama.html
```

| Pemeriksaan | Bersih | Mutasi yang wajib tertangkap |
|---|---|---|
| `ulang`: detik sama lewat dua jalur seek | 0 kanal beda | `jam` (tebal garis bergantung jumlah render): 319 082 kanal beda |
| `garis`: piksel pita fokus yang digelapkan lambung (vs lambung mati) | 1,02 %, L 24 | `garis` (lambung mati): 0 % |
| `tilt`: rasio ketajaman tilt on/off | atas ,18, bawah ,16; pita fokus 0 piksel berubah | `tilt` (pass mati): 1 / 1 |
| `tone`: `renderer.toneMapping` | 4 (ACES) | `tone` (`NoToneMapping`): 0 |

`node --test scripts/test-diorama.mjs`: 11 lolos (urutan zona, gerbang di batas, tumpang ganjil + jumlah atap, letak bangunan, simetri candi bentar, rumus tilt = shader, arah lambung, tata kartu ber-seed, tangga toon, pemedek).

## Biaya

Mesin acuan (i3-3217U, HD 4000), di halaman (`performance.now()` + `readPixels` 1 px), median 21 detik, Chrome Idle. Render pemilik ditahan, agen lain bergantian di kunci Chrome. Bukan `bench-frame.mjs`: tanpa screenshot; controller menjalankannya sesudah merge.

| Mode | Frame | Tanpa tilt |
|---|---|---|
| tanpa garis | 73,3 / 68,3 ms | 45,0 / 41,0 ms |
| lambung (dipilih) | 72,4 / 71,8 ms | 44,5 / 42,2 ms |
| tepi depth/normal | 99,1 / 96,9 ms | 71,3 / 70,9 ms |

Siap (`OPENER.ready`) 4–6 dtk di mesin senggang, sampai ±50 dtk saat agen lain memakai CPU. SwiftShader: siap 32 dtk, frame pertama 33,7 dtk → masuk `BERAT`.

## Celah dan status

- **Status penerimaan: menunggu vonis visual pemilik**, termasuk apakah denah generik ini pantas dan benar untuk format MANDALA.
- Akurasi: sumber di `references/diorama.md`. Dua sumber tak bisa diunduh otomatis (jurnal UB, halaman UNESCO; HTTP 403) dan ditandai di sana. Perlu tinjauan orang yang paham arsitektur pura sebelum tayang.
- `bench-frame.mjs` belum dijalankan.
- Kartu pohon dari `pustaka.*` dirancang untuk Jawa kuno; pemedek = kartu kecil, tanpa close-up.
