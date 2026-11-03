#!/usr/bin/env node
/* =========================================================
   PETA-DATA: garis pantai + garis kedalaman 200 m dari Natural Earth (domain publik) → string ringkas untuk
   src/runtime/peta-relief.js (resep dan format: references/peta-relief.md). Hanya dipakai saat MEMBUAT data
   peta baru (pulau lain, toleransi lain); deliverable tidak membacanya.

   Pakai (folder berisi ne_10m_land.geojson + ne_10m_bathymetry_K_200.geojson, unduhan naturalearthdata.com):
     node scripts/peta-data.mjs <folder-ne> [--darat 103,-9.5,117,-3] [--laut 103.6,-12,117.4,-4] [--toleransi .5] [--luas .003]
   --darat/--laut  kotak klip lon0,lat0,lon1,lat1 (laut dibuat lebih lebar: tepi klip palsu jauh dari jaring)
   --toleransi     Douglas–Peucker dalam km (lon diskalakan cos lintang tengah)
   --luas          pulau di bawah ini (derajat²) dibuang
   Keluaran: baris JS {kotak, q, pantai} dan {kotak, q, dalam} untuk ditempel ke data peta.
   Format string: cincin dipisah spasi; tiap titik = selisih lon, lat terhadap titik sebelumnya dalam kuantum q
   derajat, zigzag, lalu varint 5 bit per huruf base64url (huruf ≥ 32 = lanjut). Cincin tepi kotak tetap disimpan
   (uji dalam/luar butuh cincin tertutup); ruas yang berimpit tepi kotak diabaikan saat menghitung jarak.
   ========================================================= */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bantuan } from './bantuan.mjs';

bantuan(import.meta.url);
const argv = process.argv.slice(2), opsi = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const folder = argv.find((a, i) => !a.startsWith('--') && !(i && argv[i - 1].startsWith('--')));
if (!folder) { console.log('pakai: node scripts/peta-data.mjs <folder-ne> [--darat …] [--laut …] [--toleransi .5] [--luas .003]'); process.exit(1); }
const kotak = (s, d) => (s || d).split(',').map(Number);
const DARAT = kotak(opsi('darat'), '103,-9.5,117,-3'), LAUT = kotak(opsi('laut'), '103.6,-12,117.4,-4'),
  EPS = +(opsi('toleransi') || .5), LUAS = +(opsi('luas') || .003), Q = .002;
const lat0 = (DARAT[1] + DARAT[3]) / 2, KX = 111.32 * Math.cos(lat0 * Math.PI / 180), KZ = 110.58;

const cincin = g => g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.flat() : [];
const luas = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return a / 2; };
/* Sutherland–Hodgman: klip cincin ke kotak [x0,y0,x1,y1] */
function klip(r, [x0, y0, x1, y1]) {
  const sisi = [[p => p[0] >= x0, 0, x0], [p => p[0] <= x1, 0, x1], [p => p[1] >= y0, 1, y0], [p => p[1] <= y1, 1, y1]];
  let out = r.slice(0, r[0][0] === r.at(-1)[0] && r[0][1] === r.at(-1)[1] ? -1 : undefined);
  for (const [dalam, k, v] of sisi) {
    const inp = out; out = [];
    const potong = (a, b) => { const t = (v - a[k]) / (b[k] - a[k]), p = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; p[k] = v; return p; };
    for (let i = 0; i < inp.length; i++) { const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
      if (dalam(b)) { if (!dalam(a)) out.push(potong(a, b)); out.push(b); } else if (dalam(a)) out.push(potong(a, b)); }
  }
  return out;
}
/* Douglas–Peucker pada cincin tertutup, jarak dalam km */
function sederhana(r, eps) {
  const P = [...r, r[0]], Z = P.map(([x, y]) => [x * KX, y * KZ]), simpan = new Uint8Array(P.length), tumpuk = [[0, P.length - 1]];
  simpan[0] = simpan[P.length - 1] = 1;
  while (tumpuk.length) { const [a, b] = tumpuk.pop(); let m = -1, d = eps;
    for (let i = a + 1; i < b; i++) { const ex = Z[b][0] - Z[a][0], ey = Z[b][1] - Z[a][1], l = ex * ex + ey * ey,
      t = l ? Math.max(0, Math.min(1, ((Z[i][0] - Z[a][0]) * ex + (Z[i][1] - Z[a][1]) * ey) / l)) : 0, e = Math.hypot(Z[i][0] - Z[a][0] - t * ex, Z[i][1] - Z[a][1] - t * ey);
      if (e > d) { d = e; m = i; } }
    if (m >= 0) { simpan[m] = 1; tumpuk.push([a, m], [m, b]); } }
  return P.filter((_, i) => simpan[i]).slice(0, -1);
}
/* poligon yang berbagi tepi (NE memotong samudra jadi beberapa fitur) disatukan: ruas kembar berlawanan arah dibuang,
   sisanya dirangkai ulang. Tanpa ini tepi potong menjadi "garis 200 m" palsu di tengah laut dalam. */
function satukan(R) {
  const kunci = p => p.map(v => v.toFixed(5)).join(','), ruas = new Map();
  for (const r of R) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], k = kunci(a) + '>' + kunci(b), kb = kunci(b) + '>' + kunci(a);
    if (kunci(a) === kunci(b)) continue;   // klip Sutherland–Hodgman bisa menggandakan titik pojok: ruas nol membuat dua ruas berawal sama → rangkaian putus → tali busur palsu
    if (ruas.has(kb)) ruas.delete(kb); else ruas.set(k, [a, b]); }
  const dari = new Map(); for (const [a, b] of ruas.values()) dari.set(kunci(a), [a, b]);
  const hasil = [];
  while (dari.size) { const [k0, [a0]] = dari.entries().next().value, r = []; let k = k0;
    while (dari.has(k)) { const [a, b] = dari.get(k); dari.delete(k); r.push(a); k = kunci(b); }
    if (r.length >= 3) hasil.push(r); }
  return hasil;
}
const huruf = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const varint = v => { let s = ''; v = v < 0 ? -2 * v - 1 : 2 * v; while (v >= 32) { s += huruf[32 + (v & 31)]; v = Math.floor(v / 32); } return s + huruf[v]; };
const kode = R => R.map(r => { let px = 0, py = 0;
  return r.map(([x, y]) => { const qx = Math.round(x / Q), qy = Math.round(y / Q), s = varint(qx - px) + varint(qy - py); px = qx; py = qy; return s; }).join(''); }).join(' ');

const baca = f => JSON.parse(readFileSync(join(folder, f), 'utf8')).features.flatMap(f => cincin(f.geometry));
const ambil = (f, k) => baca(f).map(r => klip(r, k)).filter(r => r.length >= 3);
const darat = ambil('ne_10m_land.geojson', DARAT).filter(r => Math.abs(luas(r)) >= LUAS).map(r => sederhana(r, EPS)).filter(r => r.length >= 3);
const dalam = satukan(ambil('ne_10m_bathymetry_K_200.geojson', LAUT)).filter(r => Math.abs(luas(r)) >= LUAS).map(r => sederhana(r, EPS * 3)).filter(r => r.length >= 3);
const baris = (nama, k, R) => `${nama}:{kotak:[${k}],q:${Q},s:'${kode(R)}'},   // ${R.length} cincin, ${R.reduce((s, r) => s + r.length, 0)} titik`;
console.log(`// Natural Earth 10m (domain publik): ne_10m_land, toleransi ${EPS} km; ne_10m_bathymetry_K_200, toleransi ${EPS * 3} km`);
console.log(baris('pantai', DARAT, darat));
console.log(baris('dalam', LAUT, dalam));
