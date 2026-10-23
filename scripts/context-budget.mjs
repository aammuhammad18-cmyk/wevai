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

const INTI = ['SKILL.md', 'references/anti-ppt.md'];
// [nama jalur, berkas tambahan, batas KB untuk seluruh jalur]
const JALUR = [
  ['Inti (selalu dibaca)', [], 60],
  ['Opener / promo / bumper', ['references/opener-konsep.md', 'references/techniques.md', 'assets/starter-opener.html'], 220],   // +30: blok kamera bersama di starter (perkakas, bukan aturan)
  ['Explainer (kolase / aliran)', ['references/explainer.md', 'references/techniques.md', 'assets/starter-explainer-kartun.html'], 170],   // +10: blok kamera bersama di starter (perkakas, bukan aturan)
  ['Explainer / opener 3D', ['references/sinematografi.md', 'references/techniques.md', 'assets/starter-explainer-3d.html'], 170],
  ['Explainer kartun panggung', ['references/explainer.md', 'references/kartun-panggung.md', 'assets/starter-explainer-panggung.html'], 130],
  ['Build di After Effects', ['references/kartun-panggung.md', 'references/ae-bridge-higgsfield.md'], 95],
  ['Scaffold multi-file', ['references/architecture.md'], 70],
];

const TOKEN_PER_CHAR = 1 / 3.4;   // perkiraan kasar untuk teks Indonesia + kode
const size = async f => (await readFile(join(ROOT, f), 'utf8')).length;

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

console.log('\nAngka token hanya perkiraan (±1 karakter per 3,4). Yang dijaga adalah TREN:');
console.log('aturan baru sebaiknya menggantikan yang lama, bukan menumpuk di jalur yang sama.');

if (lewat.length) {
  console.error('\nJalur melewati anggaran:\n  ' + lewat.join('\n  ') +
    '\nPindahkan isi ke dokumen jalurnya, gabungkan aturan yang tumpang tindih, atau naikkan batas' +
    '\ndi scripts/context-budget.mjs dengan alasan tertulis di CHANGELOG.');
  if (check) process.exit(1);
}
