#!/usr/bin/env node
/* UJI EKSPOR PANJANG: ekspor-inti.mjs dan antre-render.mjs tanpa Chrome dan tanpa ffmpeg. Berkas, jam, proses anak, dan
   penahan sleep disuntikkan; hanya uji CLI di bagian akhir yang menjalankan skripnya sungguhan (--help, salah pakai).
   Pakai: node --test scripts/test-ekspor.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as inti from './ekspor-inti.mjs';
import * as ar from './antre-render.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const dibuat = [];
const folder = () => { const d = mkdtempSync(join(tmpdir(), 'wevai-ekspor-uji-')); dibuat.push(d); return d; };
process.on('exit', () => { for (const d of dibuat) try { rmSync(d, { recursive: true, force: true }); } catch {} });
const P = resolve(tmpdir(), 'proyek-uji');                 // akar proyek rekaan (tidak perlu ada di disk)
const di = (...a) => resolve(P, ...a);

/* ---------- pemulihan browser: Chrome beku tidak boleh membuat render macet tanpa pesan ---------- */
const browserPalsu = (close = async () => {}) => { const b = { dibunuh: 0, close, process: () => ({ kill: () => { b.dibunuh++; } }) }; return b; };
const selamanya = () => new Promise(() => {});
test('tutupBrowser: close yang menggantung dibatasi waktu, lalu prosesnya dimatikan', async () => {
  const b = browserPalsu(selamanya);
  await inti.tutupBrowser(b, 10);
  assert.equal(b.dibunuh, 1);
});
test('gantiBrowser: browser lama beku tetap diganti yang baru', async () => {
  const lama = browserPalsu(selamanya), baru = browserPalsu(), w = { browser: lama, page: 'lama' };
  await inti.gantiBrowser(w, async () => ({ browser: baru, page: 'baru' }), { tutupMs: 10, bukaMs: 1000 });
  assert.equal(lama.dibunuh, 1);
  assert.equal(w.browser, baru);
  assert.equal(w.page, 'baru');
});
test('gantiBrowser: pembukaan yang menggantung ditolak dengan pesan, dan browser yang terlambat ikut ditutup', async () => {
  const telat = browserPalsu(), w = { browser: browserPalsu() };
  let lepas; const buka = () => new Promise(ok => { lepas = () => ok({ browser: telat }); });
  await assert.rejects(inti.gantiBrowser(w, buka, { tutupMs: 10, bukaMs: 10 }), /membuka browser tidak selesai/);
  assert.notEqual(w.browser, telat);
  lepas(); await new Promise(r => setTimeout(r, 30));
  assert.equal(telat.dibunuh, 1);
});

/* ---------- WORKERS standar ---------- */
test('workersStandar: 2 bila thread >= 2, selain itu 1; tidak pernah lebih dari 2 tanpa env', () => {
  for (const [n, harap] of [[1, 1], [2, 2], [3, 2], [4, 2], [16, 2]]) assert.equal(inti.workersStandar({}, n), harap, `${n} thread`);
});
test('workersStandar: env WORKERS menimpa (juga di mesin 1 thread); bukan angka atau < 1 jadi 1; pecahan dibulatkan ke bawah', () => {
  assert.equal(inti.workersStandar({ WORKERS: '3' }, 1), 3);
  assert.equal(inti.workersStandar({ WORKERS: '1' }, 8), 1);
  assert.equal(inti.workersStandar({ WORKERS: '2.9' }, 8), 2);
  for (const v of ['abc', '0', '-2']) assert.equal(inti.workersStandar({ WORKERS: v }, 8), 1, v);
  assert.equal(inti.workersStandar({ WORKERS: '' }, 8), 2, 'kosong = tidak diatur');
});
test('paralel(): bilangan bulat positif dari mesin ini, dan standar sesuai dengannya', () => {
  assert.ok(Number.isInteger(inti.paralel()) && inti.paralel() >= 1);
  assert.equal(inti.workersStandar({}), inti.paralel() >= 2 ? 2 : 1);
});
test('export-frames.mjs memakai workersStandar() dan masih mencetak baris yang dibaca antre-render', () => {
  const src = readFileSync(join(DIR, 'export-frames.mjs'), 'utf8');
  assert.match(src, /const WORKERS = workersStandar\(\);/);
  assert.ok(src.includes('${total} frame @ ${FPS} fps ('), 'baris pembuka berubah: perbarui bacaBaris() di antre-render.mjs');
  assert.ok(src.includes('${done}/${total}  ${rate.toFixed(1)} frame/dtk'), 'baris kemajuan berubah: perbarui bacaBaris() di antre-render.mjs');
  assert.ok(src.includes('selesai — '), 'baris akhir berubah');
});

/* ---------- WebCodecs: level dan bitrate ---------- */
test('kodekAvc: level H.264 terkecil yang memuat ukuran x fps (High profile)', () => {
  assert.equal(inti.kodekAvc(640, 360, 15), 'avc1.64001e');       // 3.0
  assert.equal(inti.kodekAvc(1280, 720, 30), 'avc1.64001f');      // 3.1
  assert.equal(inti.kodekAvc(1920, 1080, 30), 'avc1.640028');     // 4.0 (8160 MB x 30 = 244.800 <= 245.760)
  assert.equal(inti.kodekAvc(1920, 1080, 60), 'avc1.64002a');     // 4.2
  assert.equal(inti.kodekAvc(1080, 1920, 30), 'avc1.640028');     // potret sama dengan lanskap
  assert.equal(inti.kodekAvc(3840, 2160, 30), 'avc1.640033');     // 5.1
  assert.equal(inti.kodekAvc(7680, 4320, 60), 'avc1.640034');     // di atas semuanya: level tertinggi
});
test('bitrateStandar: 0,2 bit/piksel/frame; BITRATE menimpa; nilai rusak diabaikan', () => {
  assert.equal(inti.bitrateStandar(1920, 1080, 30, {}), 12441600);
  assert.equal(inti.bitrateStandar(1920, 1080, 30, { BITRATE: '5000000' }), 5000000);
  assert.equal(inti.bitrateStandar(640, 360, 15, { BITRATE: 'x' }), 691200);
});

/* ---------- antrean: urai ---------- */
test('uraiAntrean: butir lengkap dinormalkan (path mutlak, url dari html, env jadi teks)', () => {
  const [a, b] = ar.uraiAntrean(JSON.stringify([
    { html: '00-prolog.html', mp4: 'mp4/00-prolog.mp4', siap: 'cek/siap-00', audio: 'audio/00.m4a', env: { FPS: 30, SYNC: true, PRESET: 'ultrafast' } },
    { url: 'http://localhost:8000/x/b.html?clean=1', mp4: 'mp4/b.MP4' },
  ]), P);
  assert.deepEqual(a, { no: 1, nama: '00-prolog', html: di('00-prolog.html'), url: pathToFileURL(di('00-prolog.html')).href + '?clean=1',
    mp4: di('mp4/00-prolog.mp4'), siap: di('cek/siap-00'), audio: di('audio/00.m4a'), env: { FPS: '30', SYNC: 'true', PRESET: 'ultrafast' } });
  assert.deepEqual(b, { no: 2, nama: 'b', html: '', url: 'http://localhost:8000/x/b.html?clean=1', mp4: di('mp4/b.MP4'), siap: '', audio: '', env: {} });
});
test('uraiAntrean: url file:// memberi html untuk dibandingkan; BOM diterima', () => {
  const html = di('p', 'a b.html'), [x] = ar.uraiAntrean('\uFEFF' + JSON.stringify([{ url: pathToFileURL(html).href + '?clean=1', mp4: 'o.mp4' }]), P);
  assert.equal(x.html, html);
});
test('uraiAntrean: salah isi ditolak dengan pesan yang menyebut butir dan kuncinya', () => {
  const salah = (j, re) => assert.throws(() => ar.uraiAntrean(typeof j === 'string' ? j : JSON.stringify(j), P), re);
  salah('{bukan json', /bukan JSON yang sah/);
  salah({ html: 'a.html', mp4: 'a.mp4' }, /larik yang tidak kosong/);
  salah([], /larik yang tidak kosong/);
  salah([{ html: 'a.html' }], /butir 1: "mp4" wajib/);
  salah([{ html: 'a.html', mp4: 'a.mkv' }], /harus berakhiran \.mp4/);
  salah([{ mp4: 'a.mp4' }], /butuh "html" atau "url"/);
  salah([{ html: 'a.html', mp4: 'a.mp4' }, { html: 'b.html', mp4: 'b.mp4', audoi: 'x.m4a' }], /butir 2: kunci "audoi" tidak dikenal/);
  salah([{ html: 'a.html', mp4: 'a.mp4', env: { MP4: 'x.mp4' } }], /env "MP4" diatur antrean/);
  salah([{ html: 'a.html', mp4: 'a.mp4', env: { url: 'x' } }], /env "url" diatur antrean/);
  salah([{ html: 'a.html', mp4: 'a.mp4', env: { FPS: { a: 1 } } }], /env "FPS" harus teks, angka/);
  salah([{ html: 'a.html', mp4: 'a.mp4', env: ['FPS'] }], /"env" harus objek/);
  salah([{ html: '', mp4: 'a.mp4' }], /"html" harus teks yang tidak kosong/);
  salah([null], /butir 1: harus objek/);
  salah([{ html: 'a.html', mp4: 'x/a.mp4' }, { html: 'b.html', mp4: 'x/../x/a.mp4' }], /butir 2: mp4 ganda/);
});
test('butirDariArg: tiap .html jadi satu butir, mp4 = <keluar>/<nama>.mp4; URL memakai nama berkas di path-nya', () => {
  const x = ar.butirDariArg(['bab1.html', 'sub/bab2.htm', 'http://localhost:8000/v/halaman.html?clean=1'], 'hasil', P);
  assert.deepEqual(x.map(b => b.mp4), [di('hasil/bab1.mp4'), di('hasil/bab2.mp4'), di('hasil/halaman.mp4')]);
  assert.equal(x[0].html, di('bab1.html'));
  assert.equal(x[2].url, 'http://localhost:8000/v/halaman.html?clean=1');
  assert.throws(() => ar.butirDariArg(['a/bab.html', 'b/bab.html'], 'mp4', P), /mp4 ganda/);
});
test('uraiArgumen: opsi, nilai bawaan, dan salah pakai', () => {
  assert.deepEqual(ar.uraiArgumen(['antrean.json']), { posisi: ['antrean.json'], keluar: 'mp4', gabung: '', log: 'antre-render.log', lapor: 60, poll: 30, tahan: true });
  const o = ar.uraiArgumen(['a.html', '--gabung', 'f.mp4', '--log', 'x/l.log', '--lapor', '5', '--poll', '2', '--keluar', 'o', '--tanpa-tahan-sleep', 'b.html']);
  assert.deepEqual(o, { posisi: ['a.html', 'b.html'], keluar: 'o', gabung: 'f.mp4', log: 'x/l.log', lapor: 5, poll: 2, tahan: false });
  assert.throws(() => ar.uraiArgumen(['--gabungg', 'x']), /opsi tidak dikenal: --gabungg/);
  assert.throws(() => ar.uraiArgumen(['--gabung']), /--gabung butuh nilai/);
  assert.throws(() => ar.uraiArgumen(['--lapor', '0']), /--lapor harus angka > 0/);
  assert.throws(() => ar.uraiArgumen(['--poll', 'cepat']), /--poll harus angka > 0/);
});

/* ---------- aturan lewati ---------- */
const fsRekaan = (peta, teks = {}) => ({ mtime: f => peta[f] ?? null, baca: f => teks[f] ?? null });
const itemUji = (o = {}) => ({ nama: 'b', html: di('b.html'), mp4: di('mp4/b.mp4'), audio: '', siap: '', env: {}, ...o });

test('statusItem: lewati hanya bila mp4 ada dan STRIK lebih baru dari html dan audio', () => {
  const it = itemUji({ audio: di('audio/b.m4a') }), st = peta => ar.statusItem(it, fsRekaan(peta));
  assert.deepEqual(st({ [it.html]: 100, [it.audio]: 100 }), { lewati: false, alasan: 'mp4 belum ada' });
  assert.equal(st({ [it.html]: 100, [it.audio]: 100, [it.mp4]: 200 }).lewati, true);
  assert.match(st({ [it.html]: 300, [it.audio]: 100, [it.mp4]: 200 }).alasan, /b\.html lebih baru dari mp4/);
  assert.match(st({ [it.html]: 100, [it.audio]: 300, [it.mp4]: 200 }).alasan, /b\.m4a lebih baru dari mp4/);
  assert.equal(st({ [it.html]: 200, [it.audio]: 100, [it.mp4]: 200 }).lewati, false, 'sama persis = belum lebih baru (seperti -nt)');
  assert.equal(st({ [it.mp4]: 200 }).lewati, true, 'html dan audio hilang: diabaikan');
});
test('statusItem: audio dibaca dari <audio id="vo"> bila tidak ditulis; audio eksplisit menang; sumber jauh diabaikan', () => {
  const html = di('b.html'), mp4 = di('mp4/b.mp4'), a = di('audio/00.m4a');
  const teks = { [html]: '<body><audio id="vo" src="audio/00.m4a" preload="auto"></audio>' };
  assert.equal(ar.statusItem(itemUji(), fsRekaan({ [html]: 100, [a]: 300, [mp4]: 200 }, teks)).lewati, false, 'audio terdeteksi lebih baru');
  assert.equal(ar.statusItem(itemUji({ audio: di('lain.m4a') }), fsRekaan({ [html]: 100, [a]: 300, [mp4]: 200 }, teks)).lewati, true, 'audio eksplisit menggantikan deteksi');
  assert.equal(ar.audioDari(html, () => '<audio preload="auto" src="audio/x%20y.m4a?v=2" id="vo">'), di('audio/x y.m4a'));
  assert.equal(ar.audioDari(html, () => '<audio id="vo" src="https://cdn/x.m4a">'), null);
  assert.equal(ar.audioDari(html, () => '<audio id="lain" src="a.m4a">'), null);
  assert.equal(ar.audioDari('', () => 'x'), null);
  assert.equal(ar.audioDari(html, () => null), null);
});
test('statusItem: butir url non-file (tanpa html) dilewati bila mp4 ada', () => {
  const it = itemUji({ html: '' });
  assert.deepEqual(ar.statusItem(it, fsRekaan({ [it.mp4]: 5 })), { lewati: true, alasan: 'mp4 sudah ada' });
});

/* ---------- baris keluaran export-frames, ETA ---------- */
test('bacaBaris: baris pembuka, kemajuan (\\r sudah dipisah), dan akhir export-frames', () => {
  assert.deepEqual(ar.bacaBaris('8010 frame @ 30 fps (267.0s, 1920x1080, jpeg, sync, 2 worker) -> E:\\x\\out.mp4'),
    { jenis: 'mulai', total: 8010, fps: 30, rinci: '267.0s, 1920x1080, jpeg, sync, 2 worker' });
  assert.equal(ar.bacaBaris('90 frame @ 29.97 fps (3s, 640x360, webcodecs, 1 worker) -> a.mp4').fps, 29.97);
  assert.deepEqual(ar.bacaBaris('1200/8010  2.1 frame/dtk  sisa ±3243 dtk'), { jenis: 'maju', selesai: 1200, total: 8010 });
  assert.deepEqual(ar.bacaBaris('selesai — mp4/a.mp4 (8010 frame, 2857 dtk, dengan VO)'), { jenis: 'selesai' });
  for (const lain of ['PAGEERROR boom', 'frame 12: Target closed — membuka ulang browser (percobaan 1/3)', 'MODE=webcodecs dilewati — x.']) assert.equal(ar.bacaBaris(lain), null);
});
test('sisaDetik: sisa frame / laju; tanpa laju atau sisa negatif = tidak diketahui', () => {
  assert.equal(ar.sisaDetik(300, 6), 50);
  assert.equal(ar.sisaDetik(0, 6), 0);
  assert.equal(ar.sisaDetik(10, 0), null);
  assert.equal(ar.sisaDetik(-1, 5), null);
});
test('sisaFrameLain: audio x fps bila ada, selain itu rata-rata butir yang sudah terlihat', () => {
  assert.equal(ar.sisaFrameLain([{ kira: 600 }, { kira: null }, {}], 100), 600 + 100 + 100);
  assert.equal(ar.sisaFrameLain([], 100), 0);
});
test('lama: dtk / mnt / j mnt, tanpa "1 j 60 mnt"', () => {
  assert.equal(ar.lama(0), '0 dtk');
  assert.equal(ar.lama(89), '89 dtk');
  assert.equal(ar.lama(90), '2 mnt');
  assert.equal(ar.lama(3000), '50 mnt');
  assert.equal(ar.lama(3600), '1 j 00 mnt');
  assert.equal(ar.lama(7199.6), '2 j 00 mnt');
  assert.equal(ar.lama(25644), '7 j 07 mnt');
});
test('jam & stempel: HH:MM bila hari ini, nama hari + HH:MM bila lain hari (jam lokal)', () => {
  const t = (...a) => new Date(2026, 10, ...a).getTime();      // 3 Nov 2026 = Selasa
  assert.equal(ar.jam(t(3, 23, 5), t(3, 9, 0)), '23:05');
  assert.equal(ar.jam(t(4, 2, 5), t(3, 23, 50)), 'Rab 02:05');
  assert.equal(ar.jam(t(8, 0, 0), t(3, 23, 50)), 'Min 00:00');
  assert.equal(ar.stempel(t(3, 7, 4, 9)), '07:04:09');
});

/* ---------- penahan sleep ---------- */
const anakPalsu = (pid = 777) => Object.assign(new EventEmitter(), { pid, dibunuh: 0, kill() { this.dibunuh++; } });
const jalankanTahan = (platform, pid = 4242) => {
  const catatan = [], panggilan = [], anak = anakPalsu();
  const h = ar.tahanSleep({ platform, pid, catat: s => catatan.push(s), spawn: (...a) => { panggilan.push(a); return anak; } });
  return { h, catatan, panggilan, anak };
};
test('perintahTahan: perintah per platform', () => {
  const w = ar.perintahTahan('win32', 4242);
  assert.equal(w.cmd, 'powershell.exe');
  assert.deepEqual(w.args.slice(0, 6), ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass']);
  assert.equal(w.args[6], '-Command');
  const skrip = w.args[7];
  assert.match(skrip, /SetThreadExecutionState\(uint f\)/);
  assert.match(skrip, /SetThreadExecutionState\(2147483649\)/, 'ES_CONTINUOUS | ES_SYSTEM_REQUIRED');
  assert.match(skrip, /while \(Get-Process -Id 4242 /, 'berhenti sendiri bila antrean mati');
  assert.match(skrip, /^\$ErrorActionPreference = 'Stop';/, 'Add-Type yang ditolak = keluar kode 1, bukan diam-diam tak menahan');
  assert.equal(2147483649, 0x80000000 + 0x1);
  assert.doesNotMatch(w.args.join(' '), /powercfg/i, 'setelan daya pengguna tidak disentuh');
  assert.deepEqual(ar.perintahTahan('darwin', 4242), { cmd: 'caffeinate', args: ['-i', '-w', '4242'] });
  const l = ar.perintahTahan('linux', 4242);
  assert.equal(l.cmd, 'systemd-inhibit');
  assert.ok(l.args.includes('--what=idle:sleep') && l.args.includes('--mode=block'));
  assert.match(l.args.at(-1), /^while kill -0 4242 /);
  assert.equal(ar.perintahTahan('freebsd', 1), null);
});
test('tahanSleep: menjalankan anak tersembunyi, mencatat aktif, dan stop() mematikannya tepat sekali', () => {
  const { h, catatan, panggilan, anak } = jalankanTahan('win32');
  assert.equal(panggilan.length, 1);
  assert.equal(panggilan[0][0], 'powershell.exe');
  assert.deepEqual(panggilan[0][2], { stdio: 'ignore', windowsHide: true });
  assert.equal(catatan[0], '[tahan-sleep] aktif (powershell.exe, pid 777)');
  h.stop(); h.stop();
  assert.equal(anak.dibunuh, 1);
  assert.deepEqual(catatan.slice(1), ['[tahan-sleep] dilepas']);
  anak.emit('exit', null, 'SIGTERM');
  assert.equal(catatan.length, 2, 'keluar sesudah stop() bukan peringatan');
});
test('tahanSleep: macOS dan Linux memakai alat masing-masing', () => {
  assert.deepEqual(jalankanTahan('darwin', 55).panggilan[0].slice(0, 2), ['caffeinate', ['-i', '-w', '55']]);
  assert.equal(jalankanTahan('linux', 55).panggilan[0][0], 'systemd-inhibit');
});
test('tahanSleep: alat tidak ada (ENOENT) atau mati sendiri = peringatan, bukan galat', () => {
  const a = jalankanTahan('linux');
  a.anak.emit('error', Object.assign(new Error('spawn systemd-inhibit ENOENT'), { code: 'ENOENT' }));
  assert.match(a.catatan.at(-1), /^\[peringatan\] penahan sleep tidak jalan \(systemd-inhibit: tidak terpasang\)/);
  const b = jalankanTahan('win32');
  b.anak.emit('exit', 1, null);
  assert.match(b.catatan.at(-1), /^\[peringatan\] penahan sleep berhenti sendiri \(1\)/);
  const c = []; const tanpaPid = ar.tahanSleep({ platform: 'linux', pid: 1, catat: s => c.push(s), spawn: () => anakPalsu(0) });
  assert.equal(c.length, 0, 'tanpa pid (spawn gagal) tidak mengaku aktif'); tanpaPid.stop();
});
test('tahanSleep: platform tak dikenal dan spawn yang melempar = peringatan', () => {
  const { catatan, panggilan } = jalankanTahan('sunos');
  assert.equal(panggilan.length, 0);
  assert.match(catatan[0], /^\[peringatan\] tidak ada penahan sleep untuk platform sunos/);
  const c = []; ar.tahanSleep({ platform: 'win32', pid: 1, catat: s => c.push(s), spawn: () => { throw new Error('EPERM'); } }).stop();
  assert.match(c[0], /^\[peringatan\] penahan sleep gagal dijalankan \(powershell\.exe: EPERM\)/);
});

/* ---------- antrean: dunia rekaan ---------- */
const E = (...a) => new Date(2026, 10, 3, ...a).getTime();
const hijau = async ({ onBaris, t, tulis }) => { onBaris('90 frame @ 30 fps (3s, 320x180, jpeg, sync, 2 worker) -> x'); t(9000); tulis(3); return 0; };
// render[nama]({ w, it, tmp, onBaris, t(ms) memajukan jam, tulis(dur) membuat berkas sementara }) -> kode keluar
function dunia({ berkas = {}, teks = {}, durAudio = {}, render = {}, mulai = E(22, 0, 0) } = {}) {
  const w = { berkas: structuredClone(berkas), t: mulai, log: [], panggilan: [], dihapus: [], diganti: [], digabung: [], tidur: [], tahan: { mulai: 0, henti: 0 }, siap: null };
  const d = {
    cwd: P, env: {}, catat: s => w.log.push(s), sekarang: () => w.t,
    tidur: async ms => { w.tidur.push(ms); w.t += ms; w.siap?.(); },
    mtime: f => w.berkas[f]?.m ?? null, ada: f => f in w.berkas, baca: f => teks[f] ?? null,
    ukur: f => w.berkas[f]?.dur ? { dur: w.berkas[f].dur, size: w.berkas[f].size ?? 1048576 } : null, durasi: f => durAudio[f] ?? null,
    hapus: f => { w.dihapus.push(f); delete w.berkas[f]; },
    ganti: (a, b) => { w.diganti.push([a, b]); w.berkas[b] = { ...w.berkas[a], m: w.t }; delete w.berkas[a]; },
    tahan: () => { w.tahan.mulai++; w.log.push('<tahan-mulai>'); return { stop() { w.tahan.henti++; w.log.push('<tahan-henti>'); } }; },
    gabung: async (bagian, keluar) => { w.digabung.push([bagian, keluar]); w.berkas[keluar] = { m: w.t, dur: bagian.reduce((a, f) => a + (w.berkas[f]?.dur ?? 0), 0), size: 5e6 }; return true; },
    render: async (it, tmp, onBaris) => {
      w.panggilan.push(it.nama);
      return (render[it.nama] ?? hijau)({ w, it, tmp, onBaris, t: ms => { w.t += ms; }, tulis: (dur = 3) => { w.berkas[tmp] = { m: w.t, dur, size: 2097152 }; } });
    },
  };
  return { w, d };
}
const butirUji = (n, o = {}) => ({ no: n, nama: `b${n}`, html: di(`b${n}.html`), url: `file:///b${n}.html?clean=1`, mp4: di(`mp4/b${n}.mp4`), siap: '', audio: '', env: {}, ...o });
const adaHtml = (items, m = 1) => Object.fromEntries(items.map(i => [i.html, { m }]));
const pilihan = (o = {}) => ({ gabung: '', lapor: 60, poll: 30, tahan: true, ...o });
const sementara = i => i.mp4.replace(/\.mp4$/, '') + '.sementara.mp4';

test('antrean: butir baru dirender berurutan ke berkas sementara lalu diganti nama; penahan sleep dilepas sebelum [selesai]', async () => {
  const items = [butirUji(1), butirUji(2)], { w, d } = dunia({ berkas: adaHtml(items) });
  assert.equal(await ar.jalankanAntrean(items, pilihan(), d), 0);
  assert.deepEqual(w.panggilan, ['b1', 'b2']);
  assert.deepEqual(w.diganti, items.map(i => [sementara(i), i.mp4]));
  assert.equal(w.tahan.mulai, 1, 'dinyalakan sekali untuk seluruh antrean');
  assert.equal(w.tahan.henti, 1);
  assert.ok(w.log.indexOf('<tahan-henti>') < w.log.findIndex(s => s.includes('[selesai]')), 'dilepas sebelum [selesai]');
  assert.equal(w.log.at(-1), '[selesai] 2 dirender, 0 dilewati');
  assert.ok(w.dihapus.includes(sementara(items[0]) + '.parts'), 'sisa .parts lama dibuang sebelum merender');
  assert.ok(w.log.includes('[ok] b1  90 frame dalam 9 dtk (10.00 fps)  video 3 dtk, 2.0 MB 1/2'), w.log.join('\n'));
});
test('antrean: dijalankan ulang = melanjutkan; mp4 yang lebih baru dilewati, yang basi atau rusak dirender lagi', async () => {
  const items = [butirUji(1), butirUji(2), butirUji(3)];
  const { w, d } = dunia({ berkas: {
    [items[0].html]: { m: 100 }, [items[0].mp4]: { m: 200, dur: 60, size: 1e6 },       // jadi
    [items[1].html]: { m: 300 }, [items[1].mp4]: { m: 200, dur: 60, size: 1e6 },       // html lebih baru
    [items[2].html]: { m: 100 }, [items[2].mp4]: { m: 200 },                           // ffprobe tak bisa membacanya (rusak)
  } });
  assert.equal(await ar.jalankanAntrean(items, pilihan(), d), 0);
  assert.deepEqual(w.panggilan, ['b2', 'b3']);
  assert.ok(w.log.includes('[lewati] b1 (mp4 lebih baru dari html dan audio; 60 dtk, 1.0 MB) 1/3'), w.log.join('\n'));
  assert.ok(w.log.includes('[ulang] b2: b2.html lebih baru dari mp4'));
  assert.ok(w.log.some(s => s.startsWith('[ulang] b3: mp4 ada tetapi tidak terbaca ffprobe')));
  assert.equal(w.log.at(-1), '[selesai] 2 dirender, 1 dilewati');
});
test('antrean: semua sudah jadi = tidak ada render dan penahan sleep tidak dinyalakan', async () => {
  const items = [butirUji(1)], { w, d } = dunia({ berkas: { [items[0].html]: { m: 1 }, [items[0].mp4]: { m: 9, dur: 10 } } });
  assert.equal(await ar.jalankanAntrean(items, pilihan(), d), 0);
  assert.equal(w.panggilan.length, 0);
  assert.equal(w.tahan.mulai, 0);
  assert.equal(w.log.at(-1), '[selesai] 0 dirender, 1 dilewati');
});
test('antrean: --tanpa-tahan-sleep tidak menyentuh penahan sleep', async () => {
  const items = [butirUji(1)], { w, d } = dunia({ berkas: adaHtml(items) });
  assert.equal(await ar.jalankanAntrean(items, pilihan({ tahan: false }), d), 0);
  assert.equal(w.tahan.mulai + w.tahan.henti, 0);
});
test('antrean: butir menunggu penanda siap (cek tiap poll detik), laptop tetap ditahan, lalu dirender', async () => {
  const items = [butirUji(1, { siap: di('cek/siap-1') })], { w, d } = dunia({ berkas: adaHtml(items) });
  let n = 0; w.siap = () => { if (++n === 3) w.berkas[items[0].siap] = { m: w.t }; };
  assert.equal(await ar.jalankanAntrean(items, pilihan({ poll: 20 }), d), 0);
  assert.deepEqual(w.tidur, [20000, 20000, 20000]);
  assert.ok(w.log.some(s => s.startsWith('[tunggu] b1: menunggu penanda ')));
  assert.ok(w.log.findIndex(s => s.startsWith('[tahan-sleep]') || s === '<tahan-mulai>') < w.log.findIndex(s => s.startsWith('[tunggu]')), 'ditahan sebelum menunggu');
  assert.ok(w.log.findIndex(s => s.startsWith('[siap]')) < w.log.findIndex(s => s.startsWith('[render]')));
});
test('antrean: butir yang sudah jadi tidak menunggu penandanya', async () => {
  const items = [butirUji(1, { siap: di('cek/tidak-ada') })], { w, d } = dunia({ berkas: { [items[0].html]: { m: 1 }, [items[0].mp4]: { m: 9, dur: 5 } } });
  assert.equal(await ar.jalankanAntrean(items, pilihan(), d), 0);
  assert.deepEqual(w.tidur, []);
});
test('antrean: butir gagal tidak menghentikan yang lain; sisa sementara dibuang; kode 1; gabungan ditunda; [GAGAL] di baris akhir', async () => {
  const items = [butirUji(1), butirUji(2), butirUji(3)];
  const { w, d } = dunia({ berkas: adaHtml(items), render: { b2: async () => 1, b3: async ({ tulis }) => { tulis(1); return 7; } } });
  assert.equal(await ar.jalankanAntrean(items, pilihan({ gabung: di('final.mp4') }), d), 1);
  assert.deepEqual(w.panggilan, ['b1', 'b2', 'b3']);
  assert.deepEqual(w.digabung, []);
  assert.deepEqual(Object.keys(w.berkas).filter(k => /sementara|\.mp4$/.test(k)), [items[0].mp4], 'hanya butir yang berhasil meninggalkan mp4; tidak ada sisa sementara');
  assert.ok(w.log.some(s => s.startsWith('[GAGAL] b2: export-frames keluar dengan kode 1')));
  assert.ok(w.log.some(s => s.startsWith('[GAGAL] b3: export-frames keluar dengan kode 7')));
  assert.match(w.log.at(-1), /^\[GAGAL\] 2 butir: b2, b3\. Jalankan ulang perintah yang sama.*gabungan menunggu semua butir/);
  assert.equal(w.tahan.henti, 1);
});
test('antrean: export-frames "sukses" tanpa berkas dihitung gagal; html yang hilang gagal tanpa merender', async () => {
  const items = [butirUji(1), butirUji(2)], { w, d } = dunia({ berkas: { [items[0].html]: { m: 1 } }, render: { b1: async () => 0 } });
  assert.equal(await ar.jalankanAntrean(items, pilihan(), d), 1);
  assert.deepEqual(w.panggilan, ['b1']);
  assert.ok(w.log.some(s => s.startsWith('[GAGAL] b1: export-frames selesai tanpa berkas')));
  assert.ok(w.log.some(s => s.startsWith('[GAGAL] b2: html tidak ditemukan')));
});
test('antrean: --gabung menyambung SEMUA butir berurutan (juga yang dilewati) dan mencocokkan durasi dengan jumlah butir', async () => {
  const items = [butirUji(1), butirUji(2)], final = di('mp4/final.mp4');
  const { w, d } = dunia({ berkas: { ...adaHtml(items), [items[0].mp4]: { m: 9, dur: 600.25, size: 4e8 } }, render: { b2: async ({ onBaris, t, tulis }) => { onBaris('90 frame @ 30 fps (3s, x) -> y'); t(1000); tulis(300.5); return 0; } } });
  assert.equal(await ar.jalankanAntrean(items, pilihan({ gabung: final }), d), 0);
  assert.deepEqual(w.digabung, [[[items[0].mp4, items[1].mp4], final]]);
  assert.ok(w.log.some(s => s.startsWith('[gabung] 2 berkas -> ')));
  assert.ok(w.log.includes('[gabung] durasi 900.75 dtk (15 mnt), ukuran 4.8 MB; cocok dengan jumlah butir (900.75 dtk)'), w.log.join('\n'));
  assert.match(w.log.at(-1), /^\[selesai\]/);
});
test('antrean: gabungan yang sudah lebih baru dari semua butir tidak disambung ulang; durasi yang melenceng diperingatkan', async () => {
  const items = [butirUji(1), butirUji(2)], final = di('mp4/final.mp4');
  const { w, d } = dunia({ berkas: { ...adaHtml(items), [items[0].mp4]: { m: 5, dur: 100 }, [items[1].mp4]: { m: 6, dur: 100 }, [final]: { m: 10, dur: 180, size: 1e6 } } });
  assert.equal(await ar.jalankanAntrean(items, pilihan({ gabung: final }), d), 0);
  assert.equal(w.digabung.length, 0);
  assert.ok(w.log.some(s => s.startsWith('[lewati] gabungan ')));
  assert.ok(w.log.some(s => s.includes('[peringatan] jumlah durasi butir 200.00 dtk berbeda')));
});
test('antrean: gabungan gagal disambung = kode 1', async () => {
  const items = [butirUji(1)], { w, d } = dunia({ berkas: adaHtml(items) });
  d.gabung = async () => false;
  assert.equal(await ar.jalankanAntrean(items, pilihan({ gabung: di('f.mp4') }), d), 1);
  assert.ok(w.log.some(s => s.startsWith('[GAGAL] ffmpeg gagal menyambung')));
});
test('antrean: kemajuan dicatat dengan fps, sisa butir, sisa antrean (butir lain dikira dari durasi audio), dan jam selesai; --lapor menahan baris rapat', async () => {
  const items = [butirUji(1), butirUji(2, { env: { FPS: '30' }, audio: di('audio/2.m4a') })];
  const { w, d } = dunia({ berkas: adaHtml(items), durAudio: { [di('audio/2.m4a')]: 10 },
    render: { b1: async ({ onBaris, t, tulis }) => {
      onBaris('360 frame @ 30 fps (12.0s, 320x180, jpeg, sync, 2 worker) -> x');
      t(10000); onBaris('60/360  6.0 frame/dtk  sisa ±50 dtk');       // 6 fps; sisa 300 frame = 50 dtk. Butir 2: 10 dtk x 30 fps = 300 frame = 50 dtk lagi
      t(5000); onBaris('90/360  6.0 frame/dtk  sisa ±45 dtk');        // 5 dtk sesudah baris pertama < --lapor 60: ditahan
      t(55000); onBaris('300/360  4.3 frame/dtk  sisa ±14 dtk');      // 60 dtk sesudahnya: dicatat
      tulis(12); return 0;
    } } });
  assert.equal(await ar.jalankanAntrean(items, pilihan({ lapor: 60 }), d), 0);
  const maju = w.log.filter(s => /^ {2}b1 {2}\d+\/\d+/.test(s));
  assert.deepEqual(maju, [
    '  b1  60/360 (16%)  6.00 fps  butir: sisa 50 dtk  antrean: sisa 2 mnt, selesai ±22:01',      // 22:00:10 + 100 dtk
    '  b1  300/360 (83%)  4.29 fps  butir: sisa 14 dtk  antrean: sisa 84 dtk, selesai ±22:02',    // 22:01:10 + 84 dtk; laju umum 300/70 = 4,29 fps
  ]);
  assert.ok(w.log.includes('  360 frame @ 30 fps (12.0s, 320x180, jpeg, sync, 2 worker)'));
});
test('antrean: butir terakhir tidak mencetak bagian "antrean"; butir tanpa audio dikira dari rata-rata butir yang sudah terlihat', async () => {
  const render = { b1: async ({ onBaris, t, tulis }) => { onBaris('100 frame @ 10 fps (10s, x) -> y'); t(10000); onBaris('20/100  2.0 frame/dtk  sisa ±40 dtk'); tulis(); return 0; } };
  const satu = [butirUji(1)], a = dunia({ berkas: adaHtml(satu), render });
  await ar.jalankanAntrean(satu, pilihan(), a.d);
  assert.ok(a.w.log.includes('  b1  20/100 (20%)  2.00 fps  butir: sisa 40 dtk, selesai ±22:00'), a.w.log.join('\n'));    // 22:00:10 + 40 dtk
  const dua = [butirUji(1), butirUji(2)], b = dunia({ berkas: adaHtml(dua), render });     // butir 2: 100 frame (rata-rata) pada 2 fps = 50 dtk
  await ar.jalankanAntrean(dua, pilihan(), b.d);
  assert.ok(b.w.log.includes('  b1  20/100 (20%)  2.00 fps  butir: sisa 40 dtk  antrean: sisa 2 mnt, selesai ±22:01'), b.w.log.join('\n'));   // 90 dtk -> 22:01:40
});
test('antrean: baris lain dari export-frames (PAGEERROR, membuka ulang browser) dicatat apa adanya', async () => {
  const items = [butirUji(1)], { w, d } = dunia({ berkas: adaHtml(items), render: { b1: async ({ onBaris, t, tulis }) => { onBaris('PAGEERROR boom'); onBaris('frame 7: Target closed — membuka ulang browser (percobaan 1/3)'); t(1); tulis(); return 0; } } });
  await ar.jalankanAntrean(items, pilihan(), d);
  assert.ok(w.log.includes('  | PAGEERROR boom') && w.log.includes('  | frame 7: Target closed — membuka ulang browser (percobaan 1/3)'));
});

/* ---------- CLI sungguhan: hanya jalur yang tidak butuh Chrome atau ffmpeg ---------- */
const antre = join(DIR, 'antre-render.mjs');
const jalan = (args, cwd) => spawnSync(process.execPath, [antre, ...args], { encoding: 'utf8', cwd });
test('CLI: --help mencetak komentar kepala dan keluar 0 sebelum melakukan apa pun', () => {
  const r = jalan(['--help'], folder());
  assert.equal(r.status, 0);
  assert.match(r.stdout, /ANTRE-RENDER: antrean render/);
  assert.match(r.stdout, /Kode keluar:/);
});
test('CLI: salah pakai = pesan jelas dan kode 1 (tanpa argumen, JSON rusak, opsi asing, gabungan bukan .mp4)', () => {
  const d = folder();
  assert.equal(jalan([], d).status, 1);
  assert.match(jalan([], d).stderr, /Beri antrean/);
  writeFileSync(join(d, 'rusak.json'), '{ukuran');
  const r = jalan(['rusak.json'], d);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /bukan JSON yang sah/);
  assert.match(jalan(['x.html', '--cepat'], d).stderr, /opsi tidak dikenal: --cepat/);
  assert.match(jalan(['x.html', '--gabung', 'a.txt'], d).stderr, /--gabung harus berkas \.mp4/);
  assert.match(jalan(['tidak-ada.json'], d).stderr, /Antrean tidak ditemukan/);
  assert.equal(jalan(['a.json', 'b.html'], d).status, 1);
});
