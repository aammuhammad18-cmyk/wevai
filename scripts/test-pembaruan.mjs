#!/usr/bin/env node
/* UJI PEMBARUAN: scripts/pembaruan.mjs dan scripts/wevai.mjs tanpa jaringan luar. fetch, jam, perintah luar, dan
   daftar proses disuntikkan; "rumah" (~/.wevai) dan repo git adalah folder sementara.
   Pakai: node --test scripts/test-pembaruan.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as p from './pembaruan.mjs';

const dibuat = [];
const folder = () => { const d = mkdtempSync(join(tmpdir(), 'wevai-pembaruan-uji-')); dibuat.push(d); return d; };
process.on('exit', () => { for (const d of dibuat) try { rmSync(d, { recursive: true, force: true }); } catch {} });

/* ---------- Task 1: inti murni ---------- */
test('bandingVersi: numerik, awalan v', () => {
  assert.equal(p.bandingVersi('1.10.0', '1.9.0'), 1);
  assert.equal(p.bandingVersi('v1.5.0', '1.5.0'), 0);
  assert.equal(p.bandingVersi('1.4.1', 'v1.5.0'), -1);
  assert.throws(() => p.bandingVersi('1.5', '1.5.0'));
});

test('versiTerpasang: dari baris version di SKILL.md', () => {
  const d = folder();
  writeFileSync(join(d, 'SKILL.md'), '---\nname: wevai\nmetadata:\n  version: "1.4.1"\n---\n');
  assert.equal(p.versiTerpasang(d), '1.4.1');
});

test('jenisPasang: path Windows berspasi dan urutan', () => {
  const tidakAda = () => false, adaGit = f => f.replace(/\\/g, '/').endsWith('/.git');
  assert.equal(p.jenisPasang('C:\\Users\\A B\\.claude\\plugins\\cache\\mp\\wevai\\1.4.1', adaGit), 'claude');
  assert.equal(p.marketplaceClaude('C:\\Users\\A B\\.claude\\plugins\\cache\\mp\\wevai\\1.4.1'), 'mp');
  assert.equal(p.marketplaceClaude('/srv/wevai'), null);
  assert.equal(p.jenisPasang('/home/a/.gemini/config/plugins/wevai', adaGit), 'antigravity');
  assert.equal(p.jenisPasang('/srv/wevai', adaGit), 'git');
  assert.equal(p.jenisPasang('/srv/wevai', tidakAda), 'zip');
});

test('muatStatus: rusak/kosong/masa depan → dianggap kosong; simpanStatus membuat folder', () => {
  const d = folder(), berkas = join(d, 'sub', 'pembaruan.json');
  assert.deepEqual(p.muatStatus(berkas, 0), {});                           // hilang
  for (const isi of ['{rusak', '', '[]', 'null', '7']) {
    p.simpanStatus(berkas, {}); writeFileSync(berkas, isi);
    assert.deepEqual(p.muatStatus(berkas, 0), {}, `isi ${JSON.stringify(isi)}`);
  }
  p.simpanStatus(berkas, { dicek: 5 + 1e9, terbaru: '1.5.0' });
  assert.deepEqual(p.muatStatus(berkas, 5), { terbaru: '1.5.0' });       // jam pernah salah → cek ulang
  assert.deepEqual(JSON.parse(readFileSync(berkas, 'utf8')), { dicek: 5 + 1e9, terbaru: '1.5.0' });
});

test('pesanNotifikasi: tampil, lewati, tunda, tidak lebih baru', () => {
  const s = { terbaru: '1.5.0', catatan: '- satu\n\n- dua\n- tiga\n- empat\n- lima\n- enam', url: 'https://x/rilis' };
  const m = p.pesanNotifikasi(s, '1.4.1', 0);
  assert.equal(m.split('\n')[0], 'WeVai 1.5.0 tersedia (terpasang 1.4.1).');
  assert.match(m, /- lima/); assert.doesNotMatch(m, /- enam/);           // maksimal 5 baris catatan
  assert.match(m, /Catatan lengkap: https:\/\/x\/rilis/);
  for (const x of ['wevai.mjs" update', 'update --nanti', 'update --lewati']) assert.ok(m.includes(x), x);
  assert.equal(p.pesanNotifikasi({ ...s, lewati: '1.5.0' }, '1.4.1', 0), null);
  assert.equal(p.pesanNotifikasi({ ...s, tundaSampai: 10 }, '1.4.1', 5), null);
  assert.notEqual(p.pesanNotifikasi({ ...s, tundaSampai: 10 }, '1.4.1', 11), null);
  assert.equal(p.pesanNotifikasi(s, '1.5.0', 0), null);
  assert.equal(p.pesanNotifikasi({}, '1.5.0', 0), null);
});

/* ---------- Task 2: cek rilis, cache 24 jam, opt-out ---------- */
const HARI = 86_400_000;
const balas = (status, isi, jenis = 'application/json') => async () => ({
  ok: status >= 200 && status < 300, status, headers: { get: () => jenis },
  json: async () => (typeof isi === 'string' ? JSON.parse(isi) : isi),
});
const hitung = f => { const g = async (...a) => { g.n++; g.args = a; return f(...a); }; g.n = 0; return g; };
const RILIS = { tag_name: 'v1.5.0', body: '- baru', html_url: 'https://x/v1.5.0' };

test('cekRilis: sekali per 24 jam, paksa memanggil lagi, header benar', async () => {
  const berkas = join(folder(), 'pembaruan.json'), fetch = hitung(balas(200, RILIS));
  const s = await p.cekRilis({ fetch, sekarang: 1000, berkas, url: 'https://api/x' });
  assert.deepEqual(s, { terbaru: '1.5.0', catatan: '- baru', url: 'https://x/v1.5.0', dicek: 1000 });
  assert.deepEqual(p.muatStatus(berkas, 1000), s);
  assert.equal(fetch.args[0], 'https://api/x');
  assert.equal(fetch.args[1].headers['User-Agent'], 'wevai-cek-update');
  assert.equal(fetch.args[1].headers.Accept, 'application/vnd.github+json');
  assert.ok(fetch.args[1].signal);
  await p.cekRilis({ fetch, sekarang: 1000 + HARI - 1, berkas, url: 'https://api/x' });
  assert.equal(fetch.n, 1);
  await p.cekRilis({ fetch, sekarang: 1000 + HARI, berkas, url: 'https://api/x' });
  assert.equal(fetch.n, 2);
  await p.cekRilis({ fetch, sekarang: 1000 + HARI, berkas, url: 'https://api/x', paksa: true });
  assert.equal(fetch.n, 3);
});

test('cekRilis: 403, HTML, tanpa tag_name, offline → status lama, berkas tak berubah, tak melempar', async () => {
  const berkas = join(folder(), 'pembaruan.json'), lama = { terbaru: '1.4.1', dicek: 1 };
  p.simpanStatus(berkas, lama);
  const isiLama = readFileSync(berkas, 'utf8');
  const gagal = [balas(403, { message: 'rate limit' }), balas(429, {}), balas(200, '<html>', 'text/html'),
    balas(200, { name: 'x' }), async () => { throw new Error('ENOTFOUND'); }];
  for (const fetch of gagal) {
    assert.deepEqual(await p.cekRilis({ fetch, sekarang: 10 * HARI, berkas, url: 'u' }), lama);
    assert.equal(readFileSync(berkas, 'utf8'), isiLama);
  }
});

test('cekRilis: terbaru berganti → tundaSampai hilang, lewati tetap, notifikasi versi baru muncul', async () => {
  const berkas = join(folder(), 'pembaruan.json');
  p.simpanStatus(berkas, { terbaru: '1.5.0', lewati: '1.5.0', tundaSampai: 99 * HARI, dicek: 1 });
  const s = await p.cekRilis({ fetch: balas(200, { ...RILIS, tag_name: 'v1.5.1' }), sekarang: 2 * HARI, berkas, url: 'u' });
  assert.equal(s.terbaru, '1.5.1'); assert.equal(s.lewati, '1.5.0'); assert.equal('tundaSampai' in s, false);
  assert.match(p.pesanNotifikasi(s, '1.4.1', 2 * HARI), /WeVai 1\.5\.1 tersedia/);
});

test('cekAktif: env 0 atau pengaturan cekUpdate false → mati; berkas rusak → hidup', () => {
  const rumah = folder();
  assert.equal(p.cekAktif({ env: {}, rumah }), true);
  assert.equal(p.cekAktif({ env: { WEVAI_CEK_UPDATE: '0' }, rumah }), false);
  p.simpanStatus(join(rumah, '.wevai', 'pengaturan.json'), { cekUpdate: false });
  assert.equal(p.cekAktif({ env: {}, rumah }), false);
  writeFileSync(join(rumah, '.wevai', 'pengaturan.json'), '{rusak');
  assert.equal(p.cekAktif({ env: {}, rumah }), true);
});

/* ---------- Task 3: menjalankan update dengan pengaman ---------- */
Object.assign(process.env, { GIT_AUTHOR_NAME: 'uji', GIT_AUTHOR_EMAIL: 'uji@example.invalid',
  GIT_COMMITTER_NAME: 'uji', GIT_COMMITTER_EMAIL: 'uji@example.invalid' });
const git = (cwd, ...a) => { const r = spawnSync('git', a, { cwd, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
const skill = v => `---\nname: wevai\nmetadata:\n  version: "${v}"\n---\n`;

function siapkanRepo() {                                     // asal (bare) punya v1.0.0 dan v1.0.1; klon pengguna di v1.0.0
  const d = folder(), asal = join(d, 'asal.git'), kerja = join(d, 'kerja'), akar = join(d, 'pengguna');
  git(d, 'init', '-q', '--bare', '-b', 'main', asal);
  git(d, 'clone', '-q', asal, kerja);
  git(kerja, 'checkout', '-q', '-b', 'main');
  writeFileSync(join(kerja, 'SKILL.md'), skill('1.0.0')); git(kerja, 'add', '.'); git(kerja, 'commit', '-qm', 'a'); git(kerja, 'tag', 'v1.0.0');
  writeFileSync(join(kerja, 'SKILL.md'), skill('1.0.1')); git(kerja, 'commit', '-qam', 'b'); git(kerja, 'tag', 'v1.0.1');
  git(kerja, 'push', '-q', 'origin', 'main', '--tags');
  git(d, 'clone', '-q', asal, akar); git(akar, 'reset', '-q', '--hard', 'v1.0.0');
  return { akar, berkas: join(d, 'rumah', 'pembaruan.json'), v100: git(akar, 'rev-parse', 'v1.0.0^{}'), v101: git(akar, 'rev-parse', 'v1.0.1^{}') };
}
function opsi(r, lain = {}) {
  const log = [];
  const jalanUji = (c, a, o) => c === 'node' ? { status: 0, stdout: '', stderr: '' } : spawnSync(c, a, { ...o, encoding: 'utf8' });
  return { log, o: { akar: r.akar, berkas: r.berkas, status: { terbaru: '1.0.1', catatan: '- perbaikan', url: 'https://x' },
    pilihan: 'sekarang', jalan: jalanUji, daftarProses: () => 'node wevai.mjs update\n', sekarang: 1000, log: t => log.push(t), ...lain } };
}

test('renderBerjalan: export-frames/antre-render terdeteksi; daftar tak terbaca → true', () => {
  assert.equal(p.renderBerjalan({ daftarProses: () => 'node E:/x/scripts/export-frames.mjs a.html\n' }), true);
  assert.equal(p.renderBerjalan({ daftarProses: () => 'node antre-render.mjs\n' }), true);
  assert.equal(p.renderBerjalan({ daftarProses: () => 'node lain.mjs\n' }), false);
  assert.equal(p.renderBerjalan({ daftarProses: () => { throw new Error('x'); }, log: () => {} }), true);
});

test('jalankanUpdate git: sukses maju ke tag, sebelumnya tersimpan; lalu kembali', async () => {
  const r = siapkanRepo(), { o, log } = opsi(r);
  assert.equal(await p.jalankanUpdate(o), 0, log.join('\n'));
  assert.equal(git(r.akar, 'rev-parse', 'HEAD'), r.v101);
  const s = p.muatStatus(r.berkas, 1000);
  assert.equal(s.sebelumnya, r.v100);
  assert.equal(await p.jalankanUpdate({ ...o, status: s, pilihan: 'kembali' }), 0, log.join('\n'));
  assert.equal(git(r.akar, 'rev-parse', 'HEAD'), r.v100);
  assert.equal(p.muatStatus(r.berkas, 1000).lewati, '1.0.1');
});

test('jalankanUpdate git: ditolak (kode 3) bila berkas terlacak berubah, cabang lain, render jalan, proses tak terbaca', async () => {
  const kasus = [
    r => { writeFileSync(join(r.akar, 'SKILL.md'), skill('1.0.0') + 'ubah\n'); },
    r => { git(r.akar, 'checkout', '-q', '-b', 'fitur'); },
    () => ({ daftarProses: () => 'node E:/x/scripts/export-frames.mjs\n' }),
    () => ({ daftarProses: () => { throw new Error('tak bisa'); } }),
  ];
  for (const ubah of kasus) {
    const r = siapkanRepo(), { o, log } = opsi(r, ubah(r) ?? {});
    assert.equal(await p.jalankanUpdate(o), 3);
    assert.equal(git(r.akar, 'rev-parse', 'HEAD'), r.v100);
    assert.ok(log.length, 'alasan penolakan dicetak');
  }
});

test('jalankanUpdate git: main lokal bercabang → kode 1, HEAD tetap, tak ada yang diubah', async () => {
  const r = siapkanRepo();
  writeFileSync(join(r.akar, 'lokal.txt'), 'x'); git(r.akar, 'add', '.'); git(r.akar, 'commit', '-qm', 'lokal');
  const kepala = git(r.akar, 'rev-parse', 'HEAD'), { o, log } = opsi(r);
  assert.equal(await p.jalankanUpdate(o), 1);
  assert.equal(git(r.akar, 'rev-parse', 'HEAD'), kepala);
  assert.match(log.join('\n'), /tidak bisa maju lurus ke v1\.0\.1; tidak ada yang diubah/);
  assert.equal(p.muatStatus(r.berkas, 1000).sebelumnya, undefined);
});

test('jalankanUpdate: nanti/lewati menulis status; sudah terbaru/offline → 0 tanpa perintah; kembali tanpa sebelumnya → 1', async () => {
  const r = siapkanRepo(), panggil = [], jalan = (...a) => { panggil.push(a); return { status: 0, stdout: '', stderr: '' }; };
  const { o } = opsi(r, { jalan, pilihan: 'nanti' });
  assert.equal(await p.jalankanUpdate(o), 0);
  assert.equal(p.muatStatus(r.berkas, 1000).tundaSampai, 1000 + 86_400_000);
  assert.equal(await p.jalankanUpdate({ ...o, status: { ...o.status, ...p.muatStatus(r.berkas, 1000) }, pilihan: 'lewati' }), 0);
  const s = p.muatStatus(r.berkas, 1000);
  assert.equal(s.lewati, '1.0.1'); assert.equal(s.tundaSampai, 1000 + 86_400_000);
  assert.equal(await p.jalankanUpdate({ ...o, pilihan: 'sekarang', status: { terbaru: '1.0.0' } }), 0);
  assert.equal(await p.jalankanUpdate({ ...o, pilihan: 'sekarang', status: {} }), 0);   // offline: belum ada info rilis
  assert.equal(panggil.length, 0);
  assert.equal(await p.jalankanUpdate({ ...o, status: { terbaru: '1.0.1' }, pilihan: 'kembali' }), 1);
});

test('jalankanUpdate antigravity/claude: antigravity tak menjalankan apa pun; claude memanggil 2 perintah', async () => {
  const d = folder(), panggil = [], jalan = (c, a) => { panggil.push([c, ...a].join(' ')); return { status: 0, stdout: '', stderr: '' }; };
  const ag = join(d, '.gemini', 'config', 'plugins', 'wevai'), cl = join(d, '.claude', 'plugins', 'cache', 'mp', 'wevai', '1.0.0');
  for (const a of [ag, cl]) { p.simpanStatus(join(a, 'x'), {}); writeFileSync(join(a, 'SKILL.md'), skill('1.0.0')); }
  const log = [], dasar = { status: { terbaru: '1.0.1', url: 'https://x' }, pilihan: 'sekarang', jalan, daftarProses: () => '',
    sekarang: 1, berkas: join(d, 's.json'), log: t => log.push(t) };
  assert.equal(await p.jalankanUpdate({ ...dasar, akar: ag }), 0);
  assert.equal(panggil.length, 0);
  assert.match(log.join('\n'), /agy plugin install https:\/\/github\.com\/aammuhammad18-cmyk\/wevai/);
  assert.equal(await p.jalankanUpdate({ ...dasar, akar: cl }), 0);
  assert.deepEqual(panggil, ['claude plugin marketplace update mp', 'claude plugin update wevai@mp']);
  assert.match(log.join('\n'), /Mulai ulang sesi Claude Code/);
  assert.equal(await p.jalankanUpdate({ ...dasar, akar: cl, jalan: () => ({ status: 1, stdout: '', stderr: 'not found' }) }), 1);
  assert.match(log.join('\n'), /claude plugin update wevai@mp/);
  assert.equal(await p.jalankanUpdate({ ...dasar, akar: cl, daftarProses: () => 'node export-frames.mjs' }), 3);
});
