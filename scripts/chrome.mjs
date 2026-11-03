/* =========================================================
   CHROME: satu pintu untuk skrip yang membuka browser (snap, export-frames, test-starters, bench-frame,
   ae/bridge/svg2png). Pengguna tidak wajib mengatur PUPPETEER_EXECUTABLE_PATH: browser dicari sendiri.
   Urutan (berhenti di yang pertama ada):
     1. PUPPETEER_EXECUTABLE_PATH, bila di-set: dipakai apa adanya (perilaku lama, tidak diubah)
     2. browser unduhan puppeteer sendiri (npm install tanpa PUPPETEER_SKIP_DOWNLOAD)
     3. Chrome sistem, lalu Edge, di lokasi pasang standar Windows / macOS / Linux (Chromium ikut sebagai Chrome)
     4. tidak ada: galat berbahasa Indonesia yang menyebut dua jalan keluarnya
   Pakai di skrip:   import { luncurkan } from './chrome.mjs';   const browser = await luncurkan({ headless: 'new', args: [...] });
   Cek tanpa membuka browser:   node <folder skill>/scripts/chrome.mjs   → "env: <exe>" | "puppeteer: <exe>" | "sistem: <exe>" (keluar 1 bila tidak ada)
   ========================================================= */
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const E = process.env, PF = [E.PROGRAMFILES, E['PROGRAMFILES(X86)'], E.LOCALAPPDATA].filter(Boolean);
// urutan = prioritas: semua Chrome dulu, baru Edge
const SISTEM = {
  win32: [...PF.map(d => join(d, 'Google/Chrome/Application/chrome.exe')), ...PF.map(d => join(d, 'Microsoft/Edge/Application/msedge.exe'))],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
  linux: ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge-stable', '/usr/bin/microsoft-edge', '/opt/microsoft/msedge/msedge'],
}[process.platform] || [];

const PESAN = `Chrome/Edge tidak ditemukan (dicari: PUPPETEER_EXECUTABLE_PATH, browser unduhan puppeteer, lokasi pasang standar). Pilih salah satu:
  1. pasang Google Chrome atau Microsoft Edge, atau arahkan PUPPETEER_EXECUTABLE_PATH ke chrome.exe / msedge.exe miliknya
  2. biarkan puppeteer mengunduh browsernya sendiri:  npx --prefix "${dirname(fileURLToPath(import.meta.url))}" puppeteer browsers install chrome`;

// puppeteer dimuat di sini, bukan di kepala berkas: --help dan skrip tanpa browser tak butuh puppeteer terpasang
const pakai = async () => (await import('puppeteer')).default;

export async function cariBrowser() {
  const puppeteer = await pakai();   // belum terpasang → galat Node "Cannot find package 'puppeteer'" (pasang: npm install --prefix <folder skill>/scripts), bukan "browser tidak ada"
  if (E.PUPPETEER_EXECUTABLE_PATH) return { asal: 'env', exe: E.PUPPETEER_EXECUTABLE_PATH };
  try { const exe = await puppeteer.executablePath(); if (existsSync(exe)) return { asal: 'puppeteer', exe }; } catch {}   // executablePath() tidak mengecek berkas: kita yang cek
  const exe = SISTEM.find(existsSync);
  return exe ? { asal: 'sistem', exe } : null;
}

// env/unduhan: puppeteer memilih sendiri, persis seperti dulu. Hanya Chrome/Edge sistem yang perlu executablePath
export async function luncurkan(opsi = {}) {
  const b = await cariBrowser();
  if (!b) { console.error(PESAN); process.exit(1); }
  return (await pakai()).launch(b.asal === 'sistem' ? { ...opsi, executablePath: b.exe } : opsi);
}

if (/[\\/]chrome\.mjs$/.test(process.argv[1] || '')) { const b = await cariBrowser(); console.log(b ? `${b.asal}: ${b.exe}` : PESAN); process.exit(b ? 0 : 1); }
