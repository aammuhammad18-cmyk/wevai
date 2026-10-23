# Eval — apakah aturan baru benar-benar memperbaiki hasil?

Skill ini bertumbuh dengan menambah aturan. Tanpa pembanding, aturan baru hanya
menambah konteks dan tidak ada yang tahu apakah videonya jadi lebih baik.

Alurnya per rilis:

1. Jalankan tiap brief di `briefs/` pada sesi agen BARU (satu sesi per brief —
   konteks lama membuat hasil saling meniru). Simpan hasilnya sebagai
   `<folder-hasil>/<id-brief>/index.html`.
2. `node scripts/eval-run.mjs <folder-hasil> --snap` → lint tiap hasil, potret
   detik kunci, dan tulis `laporan-<tanggal>.md` di folder ini.
3. Buka laporan itu, lihat framenya, centang "wajib ada" dan "rubrik rasa".
4. Bandingkan skornya dengan laporan rilis sebelumnya. Skor turun = aturan baru
   merugikan; kembalikan atau perbaiki.

Yang mekanis (lint, potret) otomatis. Penilaian rasa tetap pekerjaan mata —
itu memang inti skill ini, dan tidak ada gunanya berpura-pura bisa diotomatiskan.

Laporan lama sengaja disimpan di repo supaya bisa dibandingkan antar versi.

`laporan-2026-09-20.md` adalah laporan pertama: baru 1 dari 8 brief (04-bumper) dan
dibangun di sesi yang sama dengan yang menilai, jadi ia membuktikan alur evalnya jalan —
bukan baseline penuh. Laporan berikutnya sebaiknya memuat semua brief dari sesi baru.
