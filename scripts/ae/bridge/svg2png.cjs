// Render semua SVG di <folder> ke PNG transparan dengan ukuran asli SVG (sudah 2×).
// pakai: node <folder skill>/scripts/ae/bridge/svg2png.cjs <folder>
// prasyarat: npm install --prefix "<folder skill>/scripts"; Chrome/Edge dicari otomatis (scripts/chrome.mjs)
const fs = require('fs'), path = require('path');
if (process.argv.some(a => a === '--help' || a === '-h')) { console.log(fs.readFileSync(__filename, 'utf8').match(/^(?:\/\/.*\r?\n)+/)[0]); process.exit(0); }   // sebelum membuka browser
(async () => {
  const { luncurkan } = await import('../../chrome.mjs');
  const dir = path.resolve(process.argv[2]);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
  const browser = await luncurkan({ headless: 'new' });
  const page = await browser.newPage();
  for (const f of files) {
    const svg = fs.readFileSync(path.join(dir, f), 'utf8');
    const w = +svg.match(/width="(\d+)"/)[1], h = +svg.match(/height="(\d+)"/)[1];
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await page.screenshot({ path: path.join(dir, f.replace('.svg', '.png')), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  }
  await browser.close();
  console.log('dirender', files.length, 'PNG');
})().catch(e => { console.error(e); process.exit(1); });
