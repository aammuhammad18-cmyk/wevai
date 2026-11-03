# Wayang kulit (3–4 Nov 2026)

Gaya lanjutan J di `docs/rencana-1.4.0.md`. Starter: `assets/starter-wayang.html`; blok: `src/runtime/wayang.js`; uji: `scripts/test-wayang.mjs` (node:test)
dan kait `WAYANG_UJI` di `test-starters`. Pakem, sumber, API, batas: `references/wayang.md`.

- `kontak.jpg`: enam bingkai sisi bayang, tiga krop 1:1 (raksasa menempel kelir vs dekat lampu; satria), tiga bingkai `?sisi=dalang`.
- `nilai.txt`: `nilai-visual` tiap bingkai dengan `--sumber` kaki blencong di layar dan `--subjek` kotak figur.

Bingkai PNG (±3 MB) tidak disimpan. Potret ulang: `URL="file:///<repo>/assets/starter-wayang.html?clean=1" node scripts/snap.mjs shots 0.5 2.8 7.2 9 11 13.8 15 20.5`;
untuk sisi dalang tambahkan `&sisi=dalang`. Chrome dijalankan lewat pembungkus Idle yang memegang kunci bersama.

## Angka

Biaya: dari `performance.now()` di halaman, 1920×1080, `seek(t)` + `getImageData` satu piksel (memaksa flush kanvas), 12 sampel per rentang, Chrome headless GPU
prioritas Idle, mesin acuan, agen lain ikut memakai Chrome. Bukan bench: `bench-frame.mjs` dijalankan pengendali sesudah merge. Capture ekspor (±170–200 ms menurut
`references/relief-candi.md`) belum termasuk.

| Rentang | Bayang, median (maks) ms | Dalang, median (maks) ms |
|---|---|---|
| 0,2–1,4 gunungan + simpingan | 143 (176) | 239 (296) |
| 9–11 dialog, zoom 1,3 | 199 (503) | 225 (247) |
| 13,6–14,4 raksasa blur besar | 202 (382) | 240 (251) |
| 19,5–21 gunungan tutup | 147 (209) | 173 (185) |

Muat sampai `OPENER.ready`: 2,1–8,5 dtk (bayang), 2,6–4,0 dtk (dalang). Penyebab sampel maks belum ditelusuri. Ditambah capture, perkiraan kasar 313–402 ms/frame
(bayang) dan 343–440 (dalang): sasaran ≤ 350 ms bisa terlewati; bench menentukan.

`nilai-visual`: 8 bingkai, 8 ok, 0 peringatan (`nilai.txt`).

## Mutasi uji

`node scripts/test-starters.mjs` atas salinan starter dengan satu kerusakan disengaja:

| Kerusakan | Yang gagal |
|---|---|
| `proyeksi` selalu skala 1, blur 0 | `tepiTajam`, `skalaJarak` |
| `kedipan` memakai `Math.random()` | `seek(0)` segar, kanvas, sinema, `seekSama` |
| gunungan tidak digambar | `kayonAda` |
| sisi dalang tidak dicerminkan | `dalangCermin` |
| sisi dalang memakai sprite siluet | `dalangLukis` |
