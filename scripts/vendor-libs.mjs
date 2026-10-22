#!/usr/bin/env node
/* =========================================================
   ARSIP: menanam library dan font ke DALAM index.html supaya berkasnya tetap
   bisa diputar bertahun-tahun ke depan.

   Deliverable normal memuat GSAP dan font dari CDN — ringan, dan hampir selalu
   yang diinginkan. Tapi berkas yang disimpan sebagai arsip (portofolio, bukti
   tayang, kiriman ke klien yang offline) akan mati begitu CDN atau versi fontnya
   berubah. Skrip ini membuat salinan mandiri:

     - `<script src="https://…">`  → isinya ditanam inline
     - `<link href="fonts.googleapis.com/css2…">` → CSS-nya ditanam, tiap woff2
       diubah jadi `data:` URI (jadi tidak ada permintaan jaringan sama sekali)

   Batas yang jujur: opener berbasis Three.js memakai import map + ES module dari
   CDN. Module tidak bisa ditanam sebagai data URI tanpa merusak `import` di dalam
   Three sendiri, jadi berkas seperti itu TETAP butuh internet — skrip akan
   mengatakannya. Explainer (GSAP + font saja) bisa 100 % mandiri.

   Pakai (dari folder proyek):
     node <folder skill>/scripts/vendor-libs.mjs                 # index.html → index-arsip.html
     node <folder skill>/scripts/vendor-libs.mjs a.html out.html
   ========================================================= */
import { readFile, writeFile } from 'node:fs/promises';

const [masukan = 'index.html', keluaran = masukan.replace(/\.html$/, '') + '-arsip.html'] =
  process.argv.slice(2).filter(a => !a.startsWith('--'));

const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125 Safari/537.36' };
const ambil = async (url, biner = false) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return biner ? Buffer.from(await r.arrayBuffer()) : r.text();
};

let html = await readFile(masukan, 'utf8');
const catatan = [];
let ditanam = 0;

// 1. <script src="https://…"></script> (bukan module) → inline
for (const m of [...html.matchAll(/<script\b([^>]*)\bsrc=["'](https?:\/\/[^"']+)["']([^>]*)><\/script>/g)]) {
  const [tag, pre, url, post] = m;
  if (/type=["']module["']/.test(pre + post)) { catatan.push(`module CDN dibiarkan: ${url}`); continue; }
  const js = await ambil(url);
  html = html.replace(tag, `<script>/* ditanam dari ${url} */\n${js}\n</script>`);
  ditanam++;
}

// 2. <link rel=stylesheet href="fonts.googleapis.com…"> → CSS inline + woff2 sebagai data URI
for (const m of [...html.matchAll(/<link\b[^>]*href=["'](https:\/\/fonts\.googleapis\.com\/[^"']+)["'][^>]*>/g)]) {
  const [tag, url] = m;
  let css = await ambil(url);
  for (const f of [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(x => x[1]))]) {
    const buf = await ambil(f, true);
    const tipe = f.endsWith('.woff2') ? 'font/woff2' : f.endsWith('.woff') ? 'font/woff' : 'font/ttf';
    css = css.split(f).join(`data:${tipe};base64,${buf.toString('base64')}`);
  }
  html = html.replace(tag, `<style>/* ditanam dari ${url} */\n${css}\n</style>`);
  ditanam++;
}

// 3. preconnect ke CDN tidak berguna lagi
html = html.replace(/[ \t]*<link\b[^>]*rel=["']preconnect["'][^>]*>\n?/g, '');

const sisaModule = /<script[^>]*type=["']module["'][^>]*>[\s\S]*?import\s+[^;]*?["']https?:/.test(html)
  || /<script type="importmap">/.test(html);
await writeFile(keluaran, html, 'utf8');

console.log(`${ditanam} sumber ditanam → ${keluaran} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
for (const c of catatan) console.log('  ' + c);
console.log(sisaModule
  ? '\nMASIH BUTUH INTERNET: berkas ini memuat ES module (mis. Three.js) lewat import map.\n'
    + 'Untuk arsip yang benar-benar mandiri, pakai jalur tanpa WebGL, atau simpan juga MP4 hasil\n'
    + 'export sebagai arsip (scripts/export-frames.mjs).'
  : '\nMandiri: tidak ada lagi permintaan jaringan — berkas ini bisa dibuka offline.');
