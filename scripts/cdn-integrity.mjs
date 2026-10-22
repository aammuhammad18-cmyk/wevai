#!/usr/bin/env node
/* =========================================================
   SRI: mengunci isi library CDN yang dimuat deliverable.

   Deliverable memuat GSAP (dan kadang Three) dari CDN. URL-nya sudah dipatok ke
   versi tertentu, tapi yang dipatok baru NAMANYA — kalau isi berkas di URL itu
   berubah (akun CDN dibajak, proxy kantor menyisipkan sesuatu), browser tetap
   menjalankannya. `integrity="sha384-…"` membuat browser MENOLAK berkas yang
   isinya tidak sama persis.

   Pakai (dari akar repo skill, atau dari folder proyek untuk deliverable):
     node <skill>/scripts/cdn-integrity.mjs assets/*.html      # pasang/segarkan hash
     node <skill>/scripts/cdn-integrity.mjs --check assets/*.html   # CI: hash masih cocok?

   Batas: hanya untuk `<script src>` biasa. Import map (Three.js) tidak bisa diberi
   SRI — untuk arsip yang tidak boleh bergantung pada jaringan sama sekali, pakai
   `scripts/vendor-libs.mjs` atau simpan MP4 hasil export.
   ========================================================= */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const argv = process.argv.slice(2);
const check = argv.includes('--check');
const files = argv.filter(a => !a.startsWith('--'));
if (!files.length) { console.log('pakai: node cdn-integrity.mjs [--check] <berkas.html ...>'); process.exit(2); }

const cache = new Map();
const hashOf = async url => {
  if (!cache.has(url)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    cache.set(url, 'sha384-' + createHash('sha384').update(Buffer.from(await r.arrayBuffer())).digest('base64'));
  }
  return cache.get(url);
};

let berubah = 0, tidakCocok = [], importmap = 0;
for (const f of files) {
  let html = await readFile(f, 'utf8'), asli = html;
  if (/<script type="importmap">/.test(html)) importmap++;

  for (const m of [...html.matchAll(/<script\b([^>]*\bsrc=["'](https:\/\/[^"']+)["'][^>]*)>/g)]) {
    const [tag, attrs, url] = m;
    const sri = await hashOf(url);
    const lama = (attrs.match(/integrity=["']([^"']+)["']/) || [])[1];
    if (lama === sri && /crossorigin/.test(attrs)) continue;
    if (lama && lama !== sri) tidakCocok.push(`${f}: ${url}\n    tertulis ${lama}\n    sekarang ${sri}`);
    const bersih = attrs.replace(/\s*integrity=["'][^"']*["']/, '').replace(/\s*crossorigin(=["'][^"']*["'])?/, '');
    html = html.replace(tag, `<script${bersih} integrity="${sri}" crossorigin="anonymous">`);
  }

  if (html !== asli) { berubah++; if (!check) await writeFile(f, html, 'utf8'); }
  console.log(`${f}: ${html === asli ? 'sudah terkunci' : (check ? 'PERLU diperbarui' : 'diperbarui')}`);
}

if (importmap) console.log(`\n${importmap} berkas memakai import map (Three.js) — bagian itu tidak bisa diberi SRI.`);
if (tidakCocok.length) {
  console.error('\nHash tidak cocok dengan isi CDN sekarang:\n  ' + tidakCocok.join('\n  ') +
    '\nPeriksa apakah versinya memang diganti, lalu jalankan tanpa --check untuk menyegarkan.');
}
if (check && berubah) { console.error(`\n${berubah} berkas belum terkunci atau hash-nya kedaluwarsa — jalankan tanpa --check.`); process.exit(1); }
