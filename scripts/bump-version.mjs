#!/usr/bin/env node
/* =========================================================
   Menaikkan versi di SEMUA tempat sekaligus — versi pernah tertinggal di
   sebagian berkas (starter tertinggal beberapa versi di belakang skill).

   Pakai (dari akar repo skill):
     node scripts/bump-version.mjs 1.1.0
     node scripts/bump-version.mjs --check     # CI: gagal bila versi tidak seragam
   Tanggal `updated:` di SKILL.md ikut disetel ke hari ini.
   CHANGELOG.md tidak ditulis otomatis — catatan rilis ditulis manusia; skrip
   hanya mengingatkan bila judul versinya belum ada.
   ========================================================= */
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv[2];
const check = arg === '--check' || !arg;
if (!check && !/^\d+\.\d+\.\d+$/.test(arg)) {
  console.error('pakai: node scripts/bump-version.mjs <major.minor.patch> | --check');
  process.exit(2);
}

const starters = readdirSync(join(ROOT, 'assets')).filter(f => f.endsWith('.html')).map(f => join('assets', f));
// [berkas, regex dengan satu grup versi, cara menulis ulang]
const SPOTS = [
  ['SKILL.md', /^(  version: ")(\d+\.\d+\.\d+)(")/m],
  ['SKILL.md', /^(\*\*v)(\d+\.\d+\.\d+)( · by)/m],
  ['README.md', /(badge\/version-)(\d+\.\d+\.\d+)(-)/],
  ['.claude-plugin/plugin.json', /("version":\s*")(\d+\.\d+\.\d+)(")/],
  ['.claude-plugin/marketplace.json', /("version":\s*")(\d+\.\d+\.\d+)(")/],
  ...starters.map(f => [f, /(Made with the WeVai skill v)(\d+\.\d+\.\d+)( by)/]),
];

const found = new Map();
let missing = [];
for (const [file, re] of SPOTS) {
  const src = await readFile(join(ROOT, file), 'utf8');
  const m = src.match(re);
  if (!m) { missing.push(`${file} — pola versi tidak ditemukan`); continue; }
  found.set(`${file}`, (found.get(file) || []).concat(m[2]));
}

if (check) {
  const versions = [...new Set([...found.values()].flat())];
  for (const [file, vs] of found) for (const v of vs) if (v !== versions[0] || versions.length > 1)
    console.log(`  ${file}: ${v}`);
  if (missing.length) console.error('Tidak lengkap:\n  ' + missing.join('\n  '));
  if (versions.length > 1) { console.error(`Versi tidak seragam: ${versions.join(', ')}`); process.exit(1); }
  if (missing.length) process.exit(1);
  console.log(`Versi seragam di ${SPOTS.length} tempat: ${versions[0]}`);
  const log = await readFile(join(ROOT, 'CHANGELOG.md'), 'utf8');
  if (!log.includes(`## ${versions[0]}`)) { console.error(`CHANGELOG.md belum punya judul "## ${versions[0]}"`); process.exit(1); }
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
for (const [file, re] of SPOTS) {
  const path = join(ROOT, file);
  const src = await readFile(path, 'utf8');
  if (!re.test(src)) continue;
  await writeFile(path, src.replace(re, (_, a, __, c) => a + arg + c), 'utf8');
}
const skillPath = join(ROOT, 'SKILL.md');
await writeFile(skillPath, (await readFile(skillPath, 'utf8')).replace(/^(  updated: ")(\d{4}-\d{2}-\d{2})(")/m, `$1${today}$3`), 'utf8');

const log = await readFile(join(ROOT, 'CHANGELOG.md'), 'utf8');
console.log(`Versi disetel ke ${arg} di ${SPOTS.length} tempat; SKILL.md updated: ${today}.`);
console.log(log.includes(`## ${arg}`) ? 'CHANGELOG.md sudah memuat judul versi ini.'
  : `Sisa satu langkah manual: tulis catatan "## ${arg} — ${today}" di CHANGELOG.md.`);
