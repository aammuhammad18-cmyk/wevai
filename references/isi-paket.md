# Isi paket WeVai

Daftar berkas skill ini; dibaca bila perlu. Dipindah utuh dari SKILL.md (3 Nov 2026) supaya badan SKILL.md muat dalam 24 000 byte yang dimuat Antigravity.

## Isi paket

| Berkas | Kapan dibaca |
|---|---|
| `references/kartun-panggung.md` | KARTUN PANGGUNG: satu panggung per adegan, kamera ≥1,08, cut/geser 96 px, rig sendi + transform manual, kepala raster + ekspresi lokal, nol caption, dua kulit (flat cerah / ilustrasi sinematik) |
| `assets/starter-explainer-panggung.html` | EXPLAINER kartun panggung: sistem panggung + kamera per panggung, `J()` sendi, `character()` (kepala vektor atau raster), whoosh 96 px, contoh dua panggung |
| `references/ae-bridge-higgsfield.md` | BRIDGE: membangun kartun panggung langsung di AE lewat MCP Higgsfield — batas bridge, jebakan (null 960,540; parent ke CAM berkeyframe; reorder rusak), arsitektur CAM per panggung, rig native, relay contact sheet, penyerahan |
| `references/anti-ppt.md` | sebelum mendesain adegan |
| `references/opener-konsep.md` | OPENER/PROMO sebelum rundown: tiga kandidat konsep, menu 19 konsep (diturunkan dari layanan/aset/produk brand), panduan layout-warna-ritme, panduan animasi UI untuk app/SaaS, panduan foto dalam opener (input user / generate via MCP), menu fitur, pembuka, penutup, transisi tanpa cut yang dibawa objek, sidik jari struktur — mencegah kerangka template |
| `references/explainer.md` | bila yang diminta explainer/video penjelasan (kartun+VO, jurnalisme visual foto, katalog putih, sketsa vintage, atau aksi kontinu; default 16:9, 9:16 hanya bila diminta) |
| `references/architecture.md` | saat scaffold / butuh alasan di balik struktur |
| `references/techniques.md` | saat membangun adegan & efek (termasuk ukuran shot §3b, grainy gradient §7d, menu gaya render objek §7e, dan video sebagai layer footage §9b) |
| `references/roadmap.md` | saat mengembangkan skill ini lebih lanjut |
| `assets/starter-opener.html` | titik awal OPENER/promo — arsitektur + perkakas (8 pintu teks, transisi opsional); SENGAJA tanpa urutan adegan contoh, kerangka dari `opener-konsep.md` |
| `references/sinematografi.md` | KAMERA SINEMATIK 2.5D/3D: memilih dunia, kosakata → panggilan, aturan 180°/30°/cahaya, jebakan 3D |
| `assets/starter-explainer-3d.html` | EXPLAINER dunia 3D: Three.js r161 + `CAM`, `mat()`, `fromSVG()`, cahaya key/fill/rim, HUD di luar `#world`, `?demo=1` |
| `assets/starter-explainer.html` | EXPLAINER gaya aksi kontinu (vektor): mode aliran (strip + hero + objek dunia) + view peta + whip + contoh mode kolase |
| `assets/starter-sinematik.html` | EXPLAINER siluet sinematik 100 % kode: obor, rim, kabut, grade (`techniques.md` §7d) |
| `references/relief-candi.md` | RELIEF CANDI HIDUP: dinding galeri berpahat sebagai bingkai narasi — `reliefHidup`, `SINAR`, kosakata `pustaka.dindingRelief`, aturan, biaya, akurasi budaya |
| `assets/starter-relief.html` | EXPLAINER relief candi hidup 100 % kode: cahaya obor menyapu pahatan andesit, tokoh relief hidup pelan, kamera menyusuri galeri |
| `references/pustaka.md` | PUSTAKA ASET JAWA KUNO `pustaka.*`: candi, gapura, rumah panggung, beringin, lontar, gunung, sawah, obor/api/asap, relief, kain — kontrak, opsi, jebakan, catatan budaya |
| `assets/katalog-pustaka.html` | KATALOG pustaka aset: tiga tableau sinematik 26 dtk (bukti jalan + bahan galeri) |
| `references/tokoh.md` | RIG TOKOH V2 `tokoh.*`: rangka 2,5D + slot + IK dua tulang, pose bernama, tiga pandang, kostum Jawa kuno, arketipe, `kerumunan()` — kontrak, determinisme, catatan budaya |
| `assets/katalog-tokoh.html` | KATALOG tokoh: empat tableau 28 dtk (arketipe, siklus jalan IK, sesaji di altar, kerumunan) |
| `references/mata-elang.md` | SHOT MATA ELANG: `terbang()` 3D/2.5D, `lanskap()`, tone mapping film, motion blur akumulasi, resep + jebakan |
| `assets/starter-elang.html` | MATA ELANG 3D: sawah berundak → gapura bentar → gunung saat senja, lanskap prosedural ber-seed, Three.js r161 |
| `references/lukis.md` | GAYA PAINTERLY (Kuwahara / cat air) untuk legenda & kilas balik: bidang dilukis sekali, sprite berpose, kenop, cara tidak mendidih, biaya, batas |
| `assets/starter-lukis.html` | PAINTERLY 100 % kode: legenda senja "Desa di kaki gunung" 16 dtk, `lukis.*` + `pustaka.*`, sapuan tidak mendidih |
| `references/peta-relief.md` | PETA RELIEF 3D: data (pantai Natural Earth, gunung GVP, sungai skematis), tegak, akurasi, `medan()`/`petaRelief()`, rute menyala, label, resep + jebakan |
| `assets/starter-peta-relief.html` | PETA RELIEF 3D: Jawa dari peta cetak berkontur → relief bercahaya, rute pusat kerajaan ke timur (abad X), Three.js r161 |
| `assets/starter-explainer-kartun.html` | EXPLAINER kartun kolase: kertas krem + grain + noda, cutout ilustrasi, Bricolage + Caveat, pill warna |
| `assets/starter-explainer-jurnalisme.html` | EXPLAINER jurnalisme visual: hitam + grain, foto asli + tag sumber, Barlow Condensed + Plex Mono, highlighter kuning/merah, anotasi putus |
| `assets/starter-explainer-katalog.html` | EXPLAINER katalog putih: grid samar, cutout foto, Archivo Black + Caveat + Inter, highlighter kuning |
| `assets/starter-explainer-sketsa.html` | EXPLAINER sketsa vintage: kertas sepia (tekstur CSS), cutout ukiran multiply, Playfair + Garamond + Cinzel, karat & emas |
| `evals/briefs/*.md` + `scripts/eval-run.mjs` | PENGEMBANG SKILL: brief baku + kartu nilai untuk menguji apakah aturan baru benar-benar memperbaiki hasil |
| `references/alat-kerja.md` | ALAT KERJA: pasang puppeteer, lint, snapshot, export MP4, jalan pintas tanpa ffmpeg, dan alat pengembang skill |
