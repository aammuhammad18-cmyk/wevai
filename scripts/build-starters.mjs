#!/usr/bin/env node
/* =========================================================
   BUILD: menyisipkan runtime bersama ke dalam starter.

   Deliverable harus satu berkas, jadi blok runtime yang sama (helper footage
   `clip()`, panel ?debug=1) memang harus ada di setiap starter. Supaya tidak
   berbeda-beda diam-diam, SUMBERNYA satu: src/runtime/*.js, disisipkan ke
   assets/*.html di antara penanda:

     /* <wv:footage> ... * /            ← isi diganti oleh skrip ini
     /* </wv:footage> * /

   Pakai (dari akar repo skill):
     node scripts/build-starters.mjs           # tulis ulang starter dari sumber
     node scripts/build-starters.mjs --check   # CI: gagal bila starter menyimpang
   ========================================================= */
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const SRC = join(ROOT, 'src', 'runtime');
const blocks = readdirSync(SRC).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''));
const files = readdirSync(join(ROOT, 'assets')).filter(f => f.endsWith('.html'));

let changed = 0, drift = [];
for (const file of files) {
  const path = join(ROOT, 'assets', file);
  const before = await readFile(path, 'utf8');
  let after = before;

  for (const name of blocks) {
    const body = (await readFile(join(SRC, name + '.js'), 'utf8')).replace(/\s+$/, '');
    const re = new RegExp(`(/\\* <wv:${name}>[\\s\\S]*?\\*/\\n)([\\s\\S]*?)(\\n/\\* </wv:${name}> \\*/)`);
    const m = after.match(re);
    if (!m) continue;                                  // starter ini memang tidak memakai blok itu
    if (m[2] !== body) after = after.replace(re, (_, a, __, c) => a + body + c);
  }

  if (after === before) continue;
  if (check) drift.push(file); else { await writeFile(path, after, 'utf8'); changed++; }
}

const names = blocks.map(b => basename(b)).join(', ');
if (check) {
  if (drift.length) {
    console.error(`Starter menyimpang dari src/runtime (${names}):\n  ` + drift.join('\n  ') +
      '\nJalankan: node scripts/build-starters.mjs');
    process.exit(1);
  }
  console.log(`Starter sinkron dengan src/runtime (${names}) — ${files.length} berkas.`);
} else {
  console.log(changed ? `${changed} starter diperbarui dari src/runtime (${names}).`
                      : `Semua starter sudah sinkron (${names}).`);
}
