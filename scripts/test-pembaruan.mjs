#!/usr/bin/env node
/* UJI PEMBARUAN: scripts/pembaruan.mjs dan scripts/wevai.mjs tanpa jaringan luar. fetch, jam, perintah luar, dan
   daftar proses disuntikkan; "rumah" (~/.wevai) dan repo git adalah folder sementara.
   Pakai: node --test scripts/test-pembaruan.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
