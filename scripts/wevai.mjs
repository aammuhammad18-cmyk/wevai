#!/usr/bin/env node
/* =========================================================
   WEVAI: perintah bantu skill.
   Pakai:
     node scripts/wevai.mjs versi                 versi terpasang + notifikasi bila ada rilis baru (cek ≤ 1×/24 jam,
                                                  diam saat offline, selalu keluar 0)
     node scripts/wevai.mjs update                update ke rilis terbaru (ditolak, kode 3, bila render berjalan,
                                                  ada perubahan berkas terlacak, atau cabang bukan main)
     node scripts/wevai.mjs update --nanti        ingatkan lagi besok
     node scripts/wevai.mjs update --lewati       lewati versi ini
     node scripts/wevai.mjs update --kembali      batalkan update terakhir (hanya git clone)
   Matikan cek: env WEVAI_CEK_UPDATE=0 atau ~/.wevai/pengaturan.json berisi {"cekUpdate": false}.
   ========================================================= */
import { bantuan } from './bantuan.mjs';
bantuan(import.meta.url);
import { homedir } from 'node:os';
import * as p from './pembaruan.mjs';

const [sub, ...opsi] = process.argv.slice(2);
const rumah = homedir(), berkas = p.BERKAS_STATUS(rumah), url = process.env.WEVAI_RILIS_URL || p.URL_RILIS;

if (sub === 'versi') {
  try {
    const terpasang = p.versiTerpasang(p.AKAR);
    console.log(`WeVai ${terpasang} (${p.jenisPasang(p.AKAR)})`);
    if (p.cekAktif({ env: process.env, rumah })) {
      const sekarang = Date.now();
      const pesan = p.pesanNotifikasi(await p.cekRilis({ fetch, sekarang, berkas, url }), terpasang, sekarang);
      if (pesan) console.log(pesan);
    }
  } catch {}                                     // notifikasi tak boleh menghalangi tugas
  process.exit(0);
} else if (sub === 'update') {
  const pilihan = { '--nanti': 'nanti', '--lewati': 'lewati', '--kembali': 'kembali' }[opsi[0]] ?? (opsi.length ? null : 'sekarang');
  if (!pilihan) { console.log(`Opsi tidak dikenal: ${opsi.join(' ')}. Lihat: node scripts/wevai.mjs --help`); process.exit(2); }
  const sekarang = Date.now();
  // nanti/lewati/kembali berlaku untuk versi yang terakhir diberitahukan; hanya "sekarang" mengambil rilis terbaru
  const status = pilihan === 'sekarang' ? await p.cekRilis({ fetch, sekarang, berkas, url, paksa: true }) : p.muatStatus(berkas, sekarang);
  process.exit(await p.jalankanUpdate({ akar: p.AKAR, status, pilihan, sekarang, berkas }));
} else {
  console.log('Pakai: node scripts/wevai.mjs versi | update [--nanti|--lewati|--kembali] | --help');
  process.exit(2);
}
