#!/usr/bin/env node
/* =========================================================
   ANGGARAN KONTEKS: berapa besar yang harus dibaca agen untuk satu pekerjaan.

   Skill ini bertumbuh dengan menambah aturan. Yang membunuh kualitas bukan
   aturan yang salah, melainkan jalur baca yang terlalu panjang: makin banyak
   yang harus dibaca sekaligus, makin besar peluang aturan penting terlewat.
   Skrip ini membuat beban itu jadi ANGKA, dan `--check` menahan pertumbuhannya.

   Jalur di bawah harus sama dengan tabel "Peta baca" di SKILL.md.

   Pakai (dari akar repo skill):
     node scripts/context-budget.mjs
     node scripts/context-budget.mjs --check    # CI: gagal bila ada jalur melewati batas
   ========================================================= */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const INTI = ['SKILL.md', 'references/anti-ppt.md', 'references/checklist.md'];   // checklist.md: dulu bagian SKILL.md, tetap dibaca di setiap jalur
// Antigravity hanya memuat 24 000 byte pertama badan SKILL.md (agy plugin validate, 3 Nov 2026). Dihitung dengan CRLF
// (checkout Windows menambah 1 byte per baris) supaya batas tetap aman di mesin mana pun.
const BADAN_SKILL_MAKS = 24000;
// [nama jalur, berkas tambahan, batas KB untuk seluruh jalur]
const JALUR = [
  ['Inti (selalu dibaca)', [], 60],
  ['Opener / promo / bumper', ['references/opener-konsep.md', 'references/techniques.md', 'assets/starter-opener.html'], 220],   // +30: blok kamera bersama di starter (perkakas, bukan aturan)
  ['Explainer kolase (kartun)', ['references/explainer.md', 'references/techniques.md', 'assets/starter-explainer-kartun.html'], 175],   // +10: blok kamera bersama di starter (perkakas, bukan aturan); +5: resep modul atmosfer/cahaya-2d/pasca di techniques.md §7d, +3,2 KB (168,8 → 172,0 KB)
  ['Explainer aliran (aksi kontinu)', ['references/explainer.md', 'references/techniques.md', 'assets/starter-explainer.html'], 245],   // pelacak tren: ukuran sekarang; target ditetapkan pemilik (celah ditemukan di review akhir 1.3.0)
  ['Siluet sinematik', ['references/explainer.md', 'references/techniques.md', 'assets/starter-sinematik.html'], 235],   // pelacak tren: ukuran sekarang; target ditetapkan pemilik
  ['Babak sinematik', ['references/explainer.md', 'references/techniques.md', 'references/sinematografi.md', 'assets/starter-babak.html'], 366],   // pelacak tren: ukuran saat masuk + ruang; babak dipisah dari starter-sinematik atas keputusan pemilik (4 Nov)
  ['Relief candi hidup', ['references/explainer.md', 'references/techniques.md', 'references/relief-candi.md', 'assets/starter-relief.html'], 297],   // pelacak tren: ukuran sekarang (293 KB); target ditetapkan pemilik. 4/5 starter = blok runtime (perkakas: kamera, atmosfer, cahaya-2d, pasca, pustaka, relief-hidup)
  ['Wayang kulit', ['references/explainer.md', 'references/techniques.md', 'references/wayang.md', 'assets/starter-wayang.html'], 246],   // pelacak tren: ukuran saat masuk + ruang
  ['Painterly (legenda)', ['references/explainer.md', 'references/techniques.md', 'references/lukis.md', 'assets/starter-lukis.html'], 268],   // pelacak tren: ukuran saat masuk (264 KB) + ruang; target ditetapkan pemilik
  ['Explainer 3D', ['references/sinematografi.md', 'references/techniques.md', 'assets/starter-explainer-3d.html'], 170],
  ['Opener 3D', ['references/opener-konsep.md', 'references/techniques.md', 'assets/starter-opener.html', 'references/sinematografi.md'], 245],   // 190 aturan opener + 30 blok kamera (perkakas) + ±21 sinematografi.md (bacaan wajib 3D) + 5: resep modul atmosfer/cahaya-2d/pasca di techniques.md §7d, +3,2 KB (238,6 → 241,8 KB)
  ['Mata elang 3D', ['references/sinematografi.md', 'references/mata-elang.md', 'assets/starter-elang.html'], 155],   // pelacak: ukuran saat masuk (149 KB) + ruang
  ['Peta relief 3D', ['references/sinematografi.md', 'references/peta-relief.md', 'assets/starter-peta-relief.html'], 176],   // pelacak: ukuran saat masuk (171 KB) + ruang
  ['Diorama cel-shaded', ['references/sinematografi.md', 'references/diorama.md', 'assets/starter-diorama.html'], 215],   // pelacak: ukuran saat masuk + ruang
  ['Explainer kartun panggung', ['references/explainer.md', 'references/kartun-panggung.md', 'assets/starter-explainer-panggung.html'], 170],   // +40: perkakas, bukan aturan: blok atmosfer/cahaya-2d/pasca + demo sinematik (122,1 → 167,8 KB: +44,8 blok di starter, +0,9 contoh kulit B; demo kini di starter-sinematik.html, diukur jalur "Siluet sinematik")
  ['Build di After Effects', ['references/kartun-panggung.md', 'references/ae-bridge-higgsfield.md'], 95],
  ['Scaffold multi-file', ['references/architecture.md'], 70],
];

const TOKEN_PER_CHAR = 1 / 3.4;   // perkiraan kasar untuk teks Indonesia + kode
// CRLF (core.autocrlf di checkout Windows) menambah satu karakter per baris: hitung tanpa CR, seperti build-starters.mjs
const size = async f => (await readFile(join(ROOT, f), 'utf8')).replace(/\r\n/g, '\n').length;

let lewat = [];
console.log('jalur                             berkas      KB    ~token   batas');
for (const [nama, tambahan, batasKB] of JALUR) {
  const berkas = [...INTI, ...tambahan];
  let chars = 0;
  for (const f of berkas) chars += await size(f);
  const kb = chars / 1024, tok = Math.round(chars * TOKEN_PER_CHAR);
  const lebih = kb > batasKB;
  if (lebih) lewat.push(`${nama}: ${kb.toFixed(0)} KB > batas ${batasKB} KB`);
  console.log(`${nama.padEnd(33)} ${String(berkas.length).padStart(2)}   ${kb.toFixed(0).padStart(6)}  ${String(tok).padStart(7)}   ${String(batasKB).padStart(5)}${lebih ? '  ← LEWAT' : ''}`);
}

{ const badan = (await readFile(join(ROOT, 'SKILL.md'), 'utf8')).replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, ''),
    b = Buffer.byteLength(badan) + badan.split('\n').length;
  console.log(`\nbadan SKILL.md: ${b} byte (CRLF), batas muat Antigravity ${BADAN_SKILL_MAKS}`);
  if (b > BADAN_SKILL_MAKS) lewat.push(`badan SKILL.md ${b} byte > ${BADAN_SKILL_MAKS}: sisanya tidak terbaca di Antigravity; pindahkan isi ke references/`); }

console.log('\nAngka token hanya perkiraan (±1 karakter per 3,4). Yang dijaga adalah TREN:');
console.log('aturan baru sebaiknya menggantikan yang lama, bukan menumpuk di jalur yang sama.');

if (lewat.length) {
  console.error('\nJalur melewati anggaran:\n  ' + lewat.join('\n  ') +
    '\nPindahkan isi ke dokumen jalurnya, gabungkan aturan yang tumpang tindih, atau naikkan batas' +
    '\ndi scripts/context-budget.mjs dengan alasan tertulis di CHANGELOG.');
  if (check) process.exit(1);
}
