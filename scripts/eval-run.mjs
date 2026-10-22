#!/usr/bin/env node
/* =========================================================
   EVAL: menjalankan pemeriksaan yang bisa diotomatiskan atas hasil brief baku,
   lalu menyusun kartu nilai berisi sisa penilaian yang HARUS dilakukan mata.

   Kenapa ada: nilai skill ini adalah kualitas video yang dihasilkan agen, tapi
   aturan baru selama ini masuk tanpa bukti bahwa hasilnya membaik. Alur evalnya:

     1. Untuk tiap brief di `evals/briefs/*.md`, jalankan agen dengan prompt-nya
        di sesi BARU, simpan hasilnya di <folder-hasil>/<id-brief>/index.html.
     2. `node scripts/eval-run.mjs <folder-hasil>` → lint tiap hasil, potret
        detik kunci (bila puppeteer ada), tulis `evals/laporan-<tanggal>.md`.
     3. Buka laporan itu, lihat framenya, centang rubrik rasa. Bandingkan dengan
        laporan rilis sebelumnya: skor turun = aturan baru merugikan.

   Skrip ini sengaja TIDAK memanggil agen: menjalankan agen bukan urusan CI, dan
   penilaian rasa tetap pekerjaan manusia. Yang diotomatiskan hanya yang mekanis.

   Pakai:
     node scripts/eval-run.mjs hasil-eval            # lint + laporan
     node scripts/eval-run.mjs hasil-eval --snap     # + potret detik kunci
   ========================================================= */
import { readFile, readdir, writeFile, mkdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const snap = args.includes('--snap');
const hasil = args.find(a => !a.startsWith('--'));
if (!hasil) { console.log('pakai: node scripts/eval-run.mjs <folder-hasil> [--snap]'); process.exit(2); }

const ada = async p => { try { await access(p); return true; } catch { return false; } };
const briefDir = join(ROOT, 'evals', 'briefs');
const briefs = (await readdir(briefDir)).filter(f => f.endsWith('.md')).sort();

const baris = [];
let adaFail = 0, adaHilang = 0;

for (const b of briefs) {
  const id = b.replace(/\.md$/, '');
  const teks = await readFile(join(briefDir, b), 'utf8');
  const meta = Object.fromEntries([...teks.matchAll(/^- (\w+): (.+)$/gm)].map(m => [m[1], m[2]]));
  const durasi = parseInt(meta.durasi) || 30;
  const proyek = join(hasil, id);
  const index = join(proyek, 'index.html');

  if (!await ada(index)) { adaHilang++; baris.push({ id, meta, status: 'belum dibuat' }); continue; }

  const lint = spawnSync(process.execPath, [join(ROOT, 'scripts', 'lint-motion.mjs'), 'index.html'],
    { cwd: proyek, encoding: 'utf8' });
  const out = (lint.stdout || '') + (lint.stderr || '');
  const fail = [...out.matchAll(/^\s+FAIL\s+(\S+)\s/gm)].map(m => m[1]);
  const warn = [...out.matchAll(/^\s+WARN\s+(\S+)\s/gm)].map(m => m[1]);
  if (fail.length) adaFail++;

  let potret = '—';
  if (snap) {
    const detik = [1, durasi * 0.25, durasi * 0.5, durasi * 0.75, Math.max(0, durasi - 1)].map(t => t.toFixed(1));
    const s = spawnSync(process.execPath, [join(ROOT, 'scripts', 'snap.mjs'), 'shots', ...detik],
      { cwd: proyek, encoding: 'utf8' });
    const err = (s.stderr || '') + (s.stdout || '');
    const sebab = /waitForFunction|TimeoutError|Waiting failed/.test(err)
      ? 'halaman tidak pernah siap — `window.OPENER.ready` tidak ada atau error JS'
      : /Cannot find package|ERR_MODULE_NOT_FOUND/.test(err) ? 'puppeteer belum dipasang di `scripts/`'
      : (err.split('\n').find(l => l.trim()) || 'sebab tidak diketahui').slice(0, 90);
    potret = s.status === 0 ? `${detik.length} frame di ${id}/shots/` : `GAGAL — ${sebab}`;
  }
  baris.push({ id, meta, status: 'ada', fail, warn, potret, teks });
}

const d = new Date();   // tanggal LOKAL: laporan berdampingan dengan CHANGELOG yang juga lokal
const tanggal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
let md = `# Laporan eval — ${tanggal}\n\nHasil: \`${hasil}\` · brief: ${briefs.length} · `
  + `mekanis otomatis, rubrik rasa dicentang manusia setelah melihat frame.\n\n`
  + `| Brief | Jenis | Hasil | FAIL lint | WARN | Potret |\n|---|---|---|---|---|---|\n`;
for (const r of baris) {
  md += `| ${r.id} | ${r.meta?.jenis || '—'} | ${r.status} | ${r.fail ? (r.fail.join(', ') || '0') : '—'} | `
     + `${r.warn ? r.warn.length : '—'} | ${r.potret || '—'} |\n`;
}
md += `\n## Penilaian per brief\n`;
for (const r of baris) {
  md += `\n### ${r.id}\n\n`;
  if (r.status !== 'ada') { md += `Belum ada \`${join(hasil, r.id, 'index.html')}\` — jalankan briefnya dulu.\n`; continue; }
  md += `Lint: ${r.fail.length ? '**' + r.fail.length + ' FAIL** (' + r.fail.join(', ') + ')' : 'lolos'}`
     + `${r.warn.length ? `, ${r.warn.length} WARN` : ''}. Potret: ${r.potret}.\n\n`;
  const rubrik = (r.teks.match(/## Rubrik rasa[\s\S]*?(?=\n## |$)/) || [''])[0]
    .split('\n').filter(l => l.startsWith('- [ ]')).join('\n');
  const wajib = (r.teks.match(/## Wajib ada[\s\S]*?(?=\n## |$)/) || [''])[0]
    .split('\n').filter(l => l.startsWith('- [ ]')).join('\n');
  md += `Wajib ada (dari percakapan agen):\n${wajib}\n\nRubrik rasa (dari frame):\n${rubrik}\n`;
}
md += `\n## Skor\n\nIsi setelah mencentang: wajib __/__, rubrik __/__, FAIL lint total ${adaFail}.\n`
   + `Bandingkan dengan laporan rilis sebelumnya di folder ini.\n`;

await mkdir(join(ROOT, 'evals'), { recursive: true });
const path = join(ROOT, 'evals', `laporan-${tanggal}.md`);
await writeFile(path, md, 'utf8');

console.log(`${briefs.length} brief · ${adaHilang} belum dibuat · ${adaFail} hasil dengan FAIL lint`);
console.log(`laporan: ${path}`);
process.exit(adaFail ? 1 : 0);
