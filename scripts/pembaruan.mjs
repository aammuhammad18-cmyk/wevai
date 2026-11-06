/* =========================================================
   PEMBARUAN: cek rilis WeVai terbaru di GitHub dan jalankan update atas pilihan user.
   Dipakai lewat scripts/wevai.mjs (`versi`, `update`). Tanpa dependensi; jaringan, jam, perintah luar,
   dan daftar proses disuntikkan supaya bisa diuji tanpa jaringan (scripts/test-pembaruan.mjs).
   Status disimpan di ~/.wevai/pembaruan.json: { dicek, terbaru, catatan, url, tundaSampai, lewati, sebelumnya }.
   ========================================================= */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..');
const perintah = () => `node "${AKAR.replace(/\\/g, '/')}/scripts/wevai.mjs" update`;

const urai = v => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v).trim());
  if (!m) throw new Error(`versi tidak dikenal: ${v}`);
  return m.slice(1).map(Number);
};

export function bandingVersi(a, b) {
  const x = urai(a), y = urai(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}

export function versiTerpasang(akar) {
  return /^\s+version:\s*"([^"]+)"/m.exec(readFileSync(join(akar, 'SKILL.md'), 'utf8'))[1];
}

export function jenisPasang(akar, ada = existsSync) {
  const p = akar.replace(/\\/g, '/').toLowerCase();
  if (p.includes('/.claude/plugins/cache/')) return 'claude';
  if (p.includes('/.gemini/config/plugins/')) return 'antigravity';
  return ada(join(akar, '.git')) ? 'git' : 'zip';
}

export function marketplaceClaude(akar) {
  return /\/plugins\/cache\/([^/]+)/i.exec(akar.replace(/\\/g, '/'))?.[1] ?? null;
}

export function muatStatus(berkas, sekarang) {
  let s;
  try { s = JSON.parse(readFileSync(berkas, 'utf8')); } catch { return {}; }
  if (!s || typeof s !== 'object' || Array.isArray(s)) return {};
  if (s.dicek > sekarang) delete s.dicek;
  return s;
}

export function simpanStatus(berkas, status) {
  mkdirSync(dirname(berkas), { recursive: true });
  writeFileSync(berkas, JSON.stringify(status, null, 2) + '\n');
}

export const BERKAS_STATUS = rumah => join(rumah, '.wevai', 'pembaruan.json');
export const URL_RILIS = 'https://api.github.com/repos/aammuhammad18-cmyk/wevai/releases/latest';

export function cekAktif({ env, rumah }) {
  if (env.WEVAI_CEK_UPDATE === '0') return false;
  try { return JSON.parse(readFileSync(join(rumah, '.wevai', 'pengaturan.json'), 'utf8'))?.cekUpdate !== false; }
  catch { return true; }
}

// Gagal apa pun (offline, batas waktu, 403/429 batas laju, HTML, tanpa tag_name) → status lama, tanpa menulis, tanpa melempar.
export async function cekRilis({ fetch, sekarang, berkas, url, paksa = false }) {
  const status = muatStatus(berkas, sekarang);
  if (!paksa && status.dicek != null && sekarang - status.dicek < 86_400_000) return status;
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'wevai-cek-update' },
    });
    if (!r.ok) return status;
    const j = await r.json();
    const terbaru = String(j?.tag_name ?? '').replace(/^v/, '');
    urai(terbaru);
    const baru = { ...status, terbaru, catatan: j.body ?? '', url: j.html_url ?? '', dicek: sekarang };
    if (terbaru !== status.terbaru) delete baru.tundaSampai;
    simpanStatus(berkas, baru);
    return baru;
  } catch { return status; }
}

const lebihBaru =(terbaru, terpasang) => { try { return bandingVersi(terbaru, terpasang) > 0; } catch { return false; } };

export function pesanNotifikasi(status, terpasang, sekarang) {
  const { terbaru } = status;
  if (!terbaru || !lebihBaru(terbaru, terpasang) || status.lewati === terbaru || status.tundaSampai > sekarang) return null;
  const catatan = String(status.catatan ?? '').split(/\r?\n/).map(b => b.trimEnd()).filter(b => b.trim()).slice(0, 5);
  return [
    `WeVai ${terbaru} tersedia (terpasang ${terpasang}).`,
    ...catatan,
    ...(status.url ? [`Catatan lengkap: ${status.url}`] : []),
    'Pilihan:',
    `- update sekarang: ${perintah()}`,
    `- nanti (ingatkan besok): ${perintah()} --nanti`,
    `- lewati versi ini: ${perintah()} --lewati`,
  ].join('\n');
}

const HARI = 86_400_000;
export const REPO = 'https://github.com/aammuhammad18-cmyk/wevai';

export const daftarProsesBawaan = () => {
  const r = process.platform === 'win32'
    ? spawnSync('powershell', ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process | % CommandLine'], { encoding: 'utf8' })
    : spawnSync('ps', ['-eo', 'args'], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout) throw new Error(r.error?.message || r.stderr || 'daftar proses kosong');
  return r.stdout;
};

// `claude` di Windows adalah .cmd: perlu shell. Argumen di sini tanpa spasi, jadi aman.
export const jalanBawaan = (cmd, args, { cwd } = {}) =>
  spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' && cmd === 'claude' });

export function renderBerjalan({ daftarProses = daftarProsesBawaan, log = console.log } = {}) {
  try { return /export-frames\.mjs|antre-render\.mjs/.test(daftarProses()); }
  catch (e) { log(`Daftar proses tidak terbaca (${String(e.message).trim()}); dianggap ada render berjalan.`); return true; }
}

export async function jalankanUpdate({ akar, status, pilihan, jalan = jalanBawaan, daftarProses = daftarProsesBawaan,
  sekarang = Date.now(), berkas, log = console.log }) {
  const jenis = jenisPasang(akar), terpasang = versiTerpasang(akar), { terbaru } = status;
  const simpan = ubah => simpanStatus(berkas, { ...muatStatus(berkas, sekarang), ...ubah });
  const render = () => renderBerjalan({ daftarProses, log }) && (log('Ada render berjalan (export-frames/antre-render). Update ditolak; coba lagi sesudah render selesai.'), true);
  const g = (...a) => jalan('git', a, { cwd: akar });
  const pengamanGit = () => {
    if (render()) return 3;
    const kotor = g('status', '--porcelain', '--untracked-files=no');
    if (kotor.status !== 0 || kotor.stdout.trim()) { log(`Ada perubahan berkas terlacak di ${akar}. Update ditolak; simpan atau buang perubahan itu dulu.\n${kotor.stdout}${kotor.stderr ?? ''}`.trimEnd()); return 3; }
    const cabang = g('rev-parse', '--abbrev-ref', 'HEAD').stdout?.trim();
    if (cabang !== 'main') { log(`Cabang aktif "${cabang}", bukan main. Update ditolak.`); return 3; }
    return 0;
  };

  if (pilihan === 'kembali') {
    if (jenis !== 'git') { log('--kembali hanya untuk WeVai yang dipasang lewat git clone.'); return 1; }
    if (!status.sebelumnya) { log('Belum ada update yang bisa dibatalkan.'); return 1; }
    const tolak = pengamanGit(); if (tolak) return tolak;
    const r = g('reset', '--keep', status.sebelumnya);
    if (r.status !== 0) { log(`Gagal kembali ke ${status.sebelumnya}: ${r.stderr}`.trimEnd()); return 1; }
    const { sebelumnya, ...sisa } = muatStatus(berkas, sekarang);
    simpanStatus(berkas, { ...sisa, lewati: terpasang });
    log(`WeVai kembali ke ${versiTerpasang(akar)}. Versi ${terpasang} dilewati.`);
    return 0;
  }
  if (!terbaru) { log('Belum bisa memeriksa rilis WeVai (offline atau GitHub membatasi permintaan). Coba lagi nanti.'); return 0; }
  if (!lebihBaru(terbaru, terpasang)) { log(`WeVai ${terpasang} sudah versi terbaru.`); return 0; }
  if (pilihan === 'nanti') { simpan({ tundaSampai: sekarang + HARI }); log(`Baik, WeVai ${terbaru} diingatkan lagi besok.`); return 0; }
  if (pilihan === 'lewati') { simpan({ lewati: terbaru }); log(`Versi ${terbaru} dilewati; notifikasi muncul lagi saat ada rilis yang lebih baru.`); return 0; }

  if (jenis === 'antigravity') {
    log(`Antigravity belum punya perintah update plugin. Untuk memasang WeVai ${terbaru}, jalankan sendiri:\n  agy plugin install ${REPO}\n(Perilaku menimpa versi lama belum diverifikasi.)`);
    return 0;
  }
  if (jenis === 'zip') { log(`WeVai ini dipasang dari ZIP. Unduh ${terbaru} di: ${status.url || REPO + '/releases/latest'}`); return 0; }
  if (jenis === 'claude') {
    if (render()) return 3;
    const mp = marketplaceClaude(akar), cmd = [['plugin', 'marketplace', 'update', mp], ['plugin', 'update', `wevai@${mp}`]];
    for (const a of cmd) {
      const r = jalan('claude', a, {});
      if (r.status !== 0) { log(`Perintah claude gagal (${(r.error?.message || r.stderr || '').trim()}). Jalankan manual:\n${cmd.map(c => '  claude ' + c.join(' ')).join('\n')}`); return 1; }
    }
    log(`WeVai ${terbaru} terpasang. Mulai ulang sesi Claude Code agar versi baru dimuat.`);
    return 0;
  }

  const tolak = pengamanGit(); if (tolak) return tolak;
  const ambil = g('fetch', '--tags', 'origin');
  if (ambil.status !== 0) { log(`Gagal mengambil rilis dari origin: ${ambil.stderr}`.trimEnd()); return 1; }
  const sebelumnya = g('rev-parse', 'HEAD').stdout.trim();
  if (g('merge', '--ff-only', `v${terbaru}`).status !== 0) { log(`main lokal tidak bisa maju lurus ke v${terbaru}; tidak ada yang diubah.`); return 1; }
  simpan({ sebelumnya });
  const cek = jalan('node', ['scripts/bump-version.mjs', '--check'], { cwd: akar });
  if (cek.status !== 0) log(`Peringatan: pemeriksaan versi gagal sesudah update.\n${cek.stdout}${cek.stderr}`.trimEnd());
  log(`WeVai diperbarui ${terpasang} → ${versiTerpasang(akar)}. Batalkan dengan: ${perintah()} --kembali`);
  if (status.catatan) log(status.catatan.trim());
  return cek.status === 0 ? 0 : 1;
}
