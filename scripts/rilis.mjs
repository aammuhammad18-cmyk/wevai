/* =========================================================
   RILIS: gerbang rilis + persiapan versi (aturan lengkap: docs/aturan-rilis.md).
   Pakai (dari mana saja; skrip mencari akar repo sendiri):
     node scripts/rilis.mjs                  → semua gerbang, sama dengan .github/workflows/ci.yml
     node scripts/rilis.mjs --tanpa-browser  → tanpa test-starters (mesin sedang merender: jalankan
                                               test-starters terpisah dengan prioritas rendah sebelum tag)
     node scripts/rilis.mjs 1.4.0            → gerbang, lalu "## Belum dirilis" → "## 1.4.0 — <tanggal>",
                                               bump-version 1.4.0, catatan rilis ke folder temp, cetak
                                               perintah git/gh berikutnya. TIDAK commit, tag, atau push:
                                               itu keputusan pemilik.
   Cek py_compile di CI tidak diulang di sini (Python belum tentu terpasang di Windows).
   ========================================================= */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), versi = args.find(a => /^\d+\.\d+\.\d+$/.test(a)), tanpaBrowser = args.includes('--tanpa-browser');
if (args.some(a => a !== versi && a !== '--tanpa-browser')) { console.log('pakai: node scripts/rilis.mjs [X.Y.Z] [--tanpa-browser]'); process.exit(1); }
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
const node = (...a) => spawnSync(process.execPath, a, { cwd: ROOT, encoding: 'utf8' });
let merah = 0;
const cek = (nama, ok, detail = '') => { if (!ok) merah++;
  console.log(`${ok ? 'ok   ' : 'GAGAL'} ${nama}${ok || !detail.trim() ? '' : '\n      ' + detail.trim().split('\n').slice(-6).join('\n      ')}`); };
const jalan = (nama, ...a) => { const r = node(...a); cek(nama, r.status === 0, (r.stdout || '') + (r.stderr || '')); return r; };

/* 0. pohon bersih: berkas terlacak wajib bersih; berkas tak terlacak tidak ikut rilis, cukup disebut */
const kotor = git('status', '--porcelain', '--untracked-files=no');
cek('pohon kerja bersih (berkas terlacak)', !kotor, kotor);
const asing = git('status', '--porcelain').split('\n').filter(l => l.startsWith('??')).map(l => l.slice(3));
if (asing.length) console.log(`info  tak terlacak, tidak ikut rilis: ${asing.join(', ')}`);

/* 1–8: gerbang yang sama dengan CI */
const skrip = readdirSync(join(ROOT, 'scripts')).filter(f => f.endsWith('.mjs')).map(f => join('scripts', f)).concat('scripts/ae/bridge/svg2png.cjs');
const sintaksGagal = skrip.filter(f => node('--check', f).status !== 0);
cek('sintaks skrip', !sintaksGagal.length, sintaksGagal.join('\n'));
jalan('test-kamera', '--test', 'scripts/test-kamera.mjs');
jalan('test-vo', '--test', 'scripts/test-vo.mjs');
jalan('test-elang', '--test', 'scripts/test-elang.mjs');
jalan('test-peta', '--test', 'scripts/test-peta.mjs');
jalan('test-nilai', '--test', 'scripts/test-nilai.mjs');
jalan('test-pustaka', '--test', 'scripts/test-pustaka.mjs');
jalan('test-relief', '--test', 'scripts/test-relief.mjs');
jalan('test-tokoh', '--test', 'scripts/test-tokoh.mjs');
jalan('test-ekspor', '--test', 'scripts/test-ekspor.mjs');
jalan('test-lukis', '--test', 'scripts/test-lukis.mjs');
jalan('build-starters --check', 'scripts/build-starters.mjs', '--check');
jalan('bump-version --check', 'scripts/bump-version.mjs', '--check');
jalan('context-budget --check', 'scripts/context-budget.mjs', '--check');
const starter = readdirSync(join(ROOT, 'assets')).filter(f => f.endsWith('.html')).map(f => join('assets', f));
jalan('lint-motion', 'scripts/lint-motion.mjs', ...starter);
const tiga = node('scripts/lint-motion.mjs', 'evals/bukti/lint-three-buruk.html'), relatif = node('scripts/lint-motion.mjs', 'evals/bukti/lint-relatif-buruk.html');
cek('fixture lint-three-buruk wajib gagal', tiga.status === 1 && /FAIL determinisme-clock/.test(tiga.stdout), tiga.stdout);
cek('fixture lint-relatif-buruk wajib WARN', relatif.status === 0 && /WARN gsap-relatif/.test(relatif.stdout), relatif.stdout);
jalan('cdn-integrity --check', 'scripts/cdn-integrity.mjs', '--check', ...starter);
if (tanpaBrowser) console.log('lewat  test-starters (--tanpa-browser): jalankan terpisah sebelum membuat tag');
else jalan('test-starters', 'scripts/test-starters.mjs');

if (merah) { console.log(`\n${merah} gerbang merah: jangan rilis.`); process.exit(1); }
if (!versi) { console.log(`\nSemua gerbang hijau${tanpaBrowser ? ' (tanpa test-starters)' : ''}.`); process.exit(0); }

/* 9. persiapan versi: hanya dari main, versi harus naik, "## Belum dirilis" harus berisi */
const sekarang = /^  version: "(\d+\.\d+\.\d+)"/m.exec(readFileSync(join(ROOT, 'SKILL.md'), 'utf8'))[1];
const naik = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); const i = x.findIndex((v, k) => v !== y[k]); return i >= 0 && x[i] > y[i]; };
if (!naik(versi, sekarang)) { console.log(`Versi ${versi} harus lebih besar dari ${sekarang}.`); process.exit(1); }
if (git('branch', '--show-current') !== 'main') { console.log('Rilis hanya dari main.'); process.exit(1); }
const CL = join(ROOT, 'CHANGELOG.md'), log = readFileSync(CL, 'utf8');
const bagian = /^## Belum dirilis[^\r\n]*\r?\n([\s\S]*?)(?=^## )/m.exec(log);
if (!bagian || !bagian[1].trim()) { console.log('CHANGELOG.md belum punya isi di bawah "## Belum dirilis".'); process.exit(1); }
const tanggal = new Date().toLocaleDateString('sv-SE');   // YYYY-MM-DD menurut jam lokal (bukan UTC)
writeFileSync(CL, log.replace(/^## Belum dirilis[^\r\n]*/m, `## ${versi} — ${tanggal}`));
const bump = node('scripts/bump-version.mjs', versi);
if (bump.status !== 0 || node('scripts/bump-version.mjs', '--check').status !== 0) { console.log(bump.stdout + bump.stderr); process.exit(1); }
const catatan = join(tmpdir(), `wevai-rilis-${versi}.md`);
writeFileSync(catatan, bagian[1].trim() + '\n');
console.log(`\nSiap rilis ${versi} (${tanggal}). Periksa dulu: git diff
  git add -u && git commit -m "rilis ${versi}"
  git tag -a v${versi} -m "WeVai ${versi}"
  # hanya dengan persetujuan pemilik:
  git push origin main --follow-tags
  gh release create v${versi} --title "WeVai ${versi}" --notes-file "${catatan}"`);
