/* =========================================================
   BANTUAN: `--help` / `-h` mencetak komentar kepala skrip lalu keluar 0, SEBELUM skrip melakukan apa pun
   (merender, membuka Chrome, menulis berkas, mengakses jaringan). Agen sering menjalankan `<skrip> --help`
   dulu; skrip yang tidak membaca argumen akan menafsirkannya sebagai pekerjaan sungguhan.
   Pakai (di skrip .mjs, tepat sesudah import):   import { bantuan } from './bantuan.mjs';   bantuan(import.meta.url);
   ========================================================= */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function bantuan(url) {
  if (!process.argv.slice(2).some(a => a === '--help' || a === '-h')) return;
  console.log(readFileSync(fileURLToPath(url), 'utf8').match(/\/\*[\s\S]*?\*\//)[0]);
  process.exit(0);
}
