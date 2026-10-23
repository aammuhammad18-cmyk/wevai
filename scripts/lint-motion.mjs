#!/usr/bin/env node
/* =========================================================
   LINT: memeriksa deliverable terhadap aturan WeVai yang BISA diukur
   dari kode (SKILL.md "Larangan struktural" + checklist). Ini bukan penilaian
   rasa — frame tetap harus dilihat dengan mata (scripts/snap.mjs).

   Pakai (dari folder proyek):
     node <folder skill>/scripts/lint-motion.mjs            # memeriksa ./index.html
     node <folder skill>/scripts/lint-motion.mjs a.html b.html
     node <folder skill>/scripts/lint-motion.mjs --json     # keluaran mesin
   Keluar dengan kode 1 bila ada FAIL. Tanpa dependensi.

   FAIL = melanggar aturan keras. WARN = perlu dilihat manusia (bisa sah,
   mis. mockup UI yang memang berteks kecil). INFO = pengingat.
   ========================================================= */
import { readFile } from 'node:fs/promises';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const files = argv.filter(a => !a.startsWith('--'));
if (!files.length) files.push('index.html');

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;
const strip = src => src                                   // buang komentar supaya tidak jadi temuan palsu
  .replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '))
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));

function all(src, re) {
  const out = []; re.lastIndex = 0; let m;
  while ((m = re.exec(src))) { out.push({ idx: m.index, m }); if (!re.global) break; }
  return out;
}

function lint(file, raw) {
  const src = strip(raw), find = [];
  const add = (level, rule, msg, idx, fix) =>
    find.push({ level, rule, msg, line: idx == null ? null : lineOf(raw, idx), fix });

  // 1. Section yang di-fade = slide deck (SKILL.md Larangan struktural #1)
  const scenes = all(src, /<section\b[^>]*class="[^"]*\bscene\b/g);
  const fades = all(src, /\.(?:scene|sc-)[^\n]{0,120}\b(?:autoAlpha|opacity)\s*:/g).length
              + all(src, /\b(?:autoAlpha|opacity)\s*:\s*[01]\b[^\n]{0,80}(?:scene|sc-)/g).length;
  if (scenes.length >= 3 && fades > 0)
    add('FAIL', 'section-fade', `${scenes.length} <section class="scene"> dinyalakan/dimatikan dengan autoAlpha/opacity — itu slide deck`,
      scenes[0].idx, 'adegan berganti karena dunia/kamera bergerak (push-through, whip, latar berganti)');
  else if (scenes.length >= 3)
    add('WARN', 'section-count', `${scenes.length} <section class="scene"> — pastikan pergantiannya dibawa kamera/dunia, bukan fade`, scenes[0].idx);

  // 2. Determinisme (Hukum #2)
  for (const { idx } of all(src, /\b(?:Date\.now|performance\.now)\s*\(/g))
    add('FAIL', 'determinisme-jam', 'jam sistem di jalur render — semua visual harus fungsi dari tl.time()', idx,
      'teruskan t = tl.time() sebagai parameter');
  for (const { idx } of all(src, /\bMath\.random\s*\(/g))
    add('FAIL', 'determinisme-acak', 'Math.random() — tata letak/partikel berubah tiap muat, snapshot & MP4 tidak reproducible', idx,
      'PRNG ber-seed (mulberry32) saat setup; sinus frekuensi tinggi saat render');
  for (const { idx } of all(src, /\bsetInterval\s*\(/g))
    add('FAIL', 'determinisme-interval', 'setInterval punya jamnya sendiri', idx, 'tween {i:0→n} + onUpdate');

  // 2b. Three.js: jam & akumulasi tersembunyi — sama mematikannya dengan Date.now(), hanya lebih sulit terlihat
  for (const { idx, m } of all(src, /new\s+THREE\.Clock\b|\.getDelta\s*\(|\bmixer\.update\s*\(/g))
    add('FAIL', 'determinisme-clock', `${m[0].trim()} — jam/akumulasi di luar tl.time(); scrub & export tidak reproducible`, idx,
      'AnimationMixer.setTime(tl.time()); uniform waktu ditulis dari t');
  for (const { idx } of all(src, /composer\.render\s*\(\s*\)/g))
    add('FAIL', 'composer-render-jam', 'composer.render() tanpa argumen membaca Clock internal (FilmPass/efek ber-waktu bergerak sendiri)', idx,
      'composer.render(0) dan tulis uniform waktu dari tl.time()');

  // 2c. Nilai properti relatif ('+=120') diselesaikan GSAP saat render pertama → bergantung jalur seek.
  //     Blok <wv:kamera> dikecualikan: inti kamera menyelesaikannya sendiri lewat mutlak() saat setup.
  const kam = [...raw.matchAll(/<wv:kamera>[\s\S]*?<\/wv:kamera>/g)].map(m => [m.index, m.index + m[0].length]);   // blok tak tertutup = bukan span (aman: tetap ditandai)
  for (const { idx } of all(src, /\btl\.(?:to|fromTo|from)\s*\([^;]*?:\s*['"`][+\-*]=/g))
    if (!kam.some(([s, e]) => idx > s && idx < e))
      add('WARN', 'gsap-relatif', 'nilai relatif di tween diselesaikan GSAP saat render pertama — hasilnya bergantung jalur seek (scrub/snap/export bisa berbeda)', idx,
        'hitung nilai absolut saat setup, atau pakai gerak kamera (dolly/truck/…) yang sudah diselesaikan PLAN');

  // 3. Loop: repeat:-1 membuat durasi timeline tak hingga → onComplete tak terpicu
  const inf = all(src, /repeat\s*:\s*-\s*1/g);
  const clockLoop = /tl\.time\s*\(\s*\)\s*>=|\.time\s*\(\s*\)\s*>=\s*(?:DUR|DURATION)/.test(src);
  const onComplete = all(src, /eventCallback\s*\(\s*['"]onComplete['"]/g);
  if (inf.length && !clockLoop)
    add('FAIL', 'loop-mati', `${inf.length} tween repeat:-1 tanpa loop dari jam — tl.duration() tak hingga, video tidak pernah mengulang`,
      inf[0].idx, "gsap.ticker.add(()=>{if(!tl.paused()&&tl.time()>=DUR)start()})");
  else if (inf.length && onComplete.length && !clockLoop)
    add('WARN', 'loop-onComplete', 'loop mengandalkan onComplete padahal ada repeat:-1', onComplete[0].idx);

  // 4. Video: klip harus jadi layer footage yang terikat timeline (techniques.md §9b)
  for (const { idx, m } of all(src, /<video\b[^>]*>/g)) {
    if (/\bautoplay\b/.test(m[0])) add('FAIL', 'video-autoplay', '<video autoplay> berjalan dengan jamnya sendiri', idx, 'pasang lewat clip({at,in,out})');
    if (/\bloop\b/.test(m[0])) add('FAIL', 'video-loop', '<video loop> tidak sinkron dengan timeline', idx, 'clip() + hold bila perlu');
    if (!/\bmuted\b/.test(m[0])) add('WARN', 'video-muted', '<video> tanpa muted — audio klip menabrak VO/musik', idx);
  }
  if (/<video\b/.test(src) && !/\bclipsReady\b/.test(src))
    add('WARN', 'video-tanpa-helper', 'ada <video> tapi helper clip()/seekFrame tidak terpasang — export tidak presisi frame', null);

  // 5. Kontrak window.OPENER (dipakai snap.mjs & export-frames.mjs)
  if (!/window\.OPENER\s*=/.test(src)) add('FAIL', 'kontrak-opener', 'window.OPENER tidak diekspos — snap.mjs & export-frames.mjs tidak bisa jalan', null,
    'window.OPENER={W,H,tl,DURATION,seek,ready}');
  else for (const k of ['W', 'H', 'DURATION', 'seek', 'ready'])
    if (!new RegExp(`\\b${k}\\s*[(:,}]|OPENER\\.${k}\\s*=`).test(src.slice(src.indexOf('window.OPENER'))))
      add('WARN', 'kontrak-opener', `window.OPENER tanpa ${k} — snap/export memakai nilai default`, null);

  // 6. Satu berkas, bisa diklik dua kali (SKILL.md alur kerja 6)
  for (const { idx, m } of all(src, /<script\b[^>]*\bsrc=["'](?!https?:|\/\/)[^"']+["'][^>]*>/g))
    add('FAIL', 'module-lokal', `<script src="${(m[0].match(/src=["']([^"']+)/) || [])[1]}"> lokal diblokir CORS saat dibuka lewat file://`, idx, 'tulis JS inline');
  for (const { idx, m } of all(src, /<link\b[^>]*rel=["']stylesheet["'][^>]*>/g))
    if (!/href=["'](?:https?:|\/\/)/.test(m[0])) add('FAIL', 'css-lokal', 'stylesheet lokal — deliverable harus satu berkas', idx, 'tulis CSS inline');
  for (const { idx } of all(src, /\bfetch\s*\(\s*['"](?!https?:|data:)/g))
    add('FAIL', 'fetch-lokal', 'fetch() ke berkas lokal diblokir di file://', idx, 'tempelkan datanya di dalam berkas');

  // 7. Player & autoplay (SKILL.md "Player")
  if (!/\?debug|has\(['"]debug['"]\)|debug['"]\s*\)/.test(src)) add('WARN', 'debug', 'tidak ada panel ?debug=1 untuk scrub review', null);
  if (!/\bclean\b/.test(src)) add('WARN', 'clean', 'tidak ada ?clean=1 — export akan ikut autoplay', null);
  for (const { idx } of all(src, /(?:ketuk|tap|klik) (?:untuk|to) (?:mulai|start|play)/gi))
    add('FAIL', 'teks-ketuk', 'teks "ketuk untuk mulai" — tahan frame awal tanpa teks petunjuk', idx);

  // 8. Keterbacaan di ponsel: tidak ada teks < 30 px pada panggung 1080 (explainer.md)
  const stage = (src.match(/width\s*:\s*(1920|1080)px\s*;\s*height\s*:\s*(1080|1920)px/) || [])[0];
  const small = new Map();
  const selectorOf = idx => {                       // teks sebelum '{' terdekat = selector aturan CSS
    const open = src.lastIndexOf('{', idx); if (open < 0) return '';
    return src.slice(Math.max(0, src.lastIndexOf('}', open) + 1), open);
  };
  for (const { idx, m } of all(src, /font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) {
    const px = parseFloat(m[1]);
    if (/#dbg|#ui\b|\.dbg|debug|scrub|clock/i.test(selectorOf(idx))) continue;   // panel review, bukan teks panggung
    if (px < 30 && !small.has(px)) small.set(px, idx);
  }
  for (const [px, idx] of small)
    add(px < 24 ? 'FAIL' : 'WARN', 'teks-kecil', `font-size ${px}px pada panggung ${stage ? '1080' : '(?)'} — minimum 30 px (body 44, label 34, kredit 30)`, idx,
      'besarkan, atau pecah informasinya ke adegan lain');

  // 9. Angka berjalan tanpa tabular-nums (wadah bergetar)
  if (/toFixed\s*\(|Math\.round\s*\(\s*o?\.?[a-z]*\s*\)/.test(src) && !/tabular-nums/.test(src))
    add('INFO', 'tabular-nums', 'ada angka yang berubah tiap frame tapi tidak ada font-variant-numeric:tabular-nums', null);

  // 10. Sendi SVG: transformOrigin/rotation GSAP (kartun-panggung Hukum 5)
  if (/function J\s*\(|\bJ\(/.test(src)) {
    // hanya yang benar-benar MEMUTAR: transformOrigin + rotation/rotate dalam satu tween
    for (const { idx } of all(src, /tl\.(?:to|fromTo|set)\s*\((?:[^;]{0,200}?transformOrigin[^;]{0,200}?rotat|[^;]{0,200}?rotat[^;]{0,200}?transformOrigin)/g))
      add('WARN', 'sendi-transformOrigin', 'transformOrigin GSAP pada SVG diukur dari bounding box yang bergeser — sendi bisa lepas', idx,
        'putar lewat proxy J() dengan transform manual');
  }

  // 11. Berkas peluncur tidak boleh jadi bagian deliverable
  if (/\.(?:cmd|bat)\b/.test(src)) add('WARN', 'peluncur', 'menyebut berkas .cmd/.bat — deliverable cukup index.html (+ assets/)', null);

  return find;
}

const results = [];
for (const f of files) {
  let raw; try { raw = await readFile(f, 'utf8'); }
  catch { results.push({ file: f, error: 'tidak bisa dibaca' }); continue; }
  results.push({ file: f, findings: lint(f, raw) });
}

if (asJson) { console.log(JSON.stringify(results, null, 2)); }
else for (const r of results) {
  if (r.error) { console.log(`\n${r.file}: ${r.error}`); continue; }
  const n = { FAIL: 0, WARN: 0, INFO: 0 };
  console.log(`\n${r.file}`);
  for (const f of r.findings) {
    n[f.level]++;
    console.log(`  ${f.level.padEnd(4)} ${f.rule.padEnd(22)} ${f.line ? ('baris ' + f.line).padEnd(11) : ''.padEnd(11)} ${f.msg}`);
    if (f.fix) console.log(`       ${' '.repeat(22)} ${''.padEnd(11)} → ${f.fix}`);
  }
  if (!r.findings.length) console.log('  bersih');
  console.log(`  ${n.FAIL} FAIL · ${n.WARN} WARN · ${n.INFO} INFO`);
}
const failed = results.some(r => r.error || r.findings.some(f => f.level === 'FAIL'));
if (!asJson) console.log(failed ? '\nAda FAIL — perbaiki sebelum menyerahkan. Lint hanya memeriksa yang mekanis; frame tetap dilihat dengan mata.' : '\nLint lolos. Tetap potret detik kunci (snap.mjs) dan nilai dengan mata.');
process.exit(failed ? 1 : 0);
