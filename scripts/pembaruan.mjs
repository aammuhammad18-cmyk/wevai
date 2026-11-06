/* =========================================================
   PEMBARUAN: cek rilis WeVai terbaru di GitHub dan jalankan update atas pilihan user.
   Dipakai lewat scripts/wevai.mjs (`versi`, `update`). Tanpa dependensi; jaringan, jam, perintah luar,
   dan daftar proses disuntikkan supaya bisa diuji tanpa jaringan (scripts/test-pembaruan.mjs).
   Status disimpan di ~/.wevai/pembaruan.json: { dicek, terbaru, catatan, url, tundaSampai, lewati, sebelumnya }.
   ========================================================= */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const lebihBaru = (terbaru, terpasang) => { try { return bandingVersi(terbaru, terpasang) > 0; } catch { return false; } };

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
