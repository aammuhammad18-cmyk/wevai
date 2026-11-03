#!/usr/bin/env node
/* UJI VO-GEMINI: scripts/vo-gemini.mjs tanpa jaringan. fetch, jam, dan tidur disuntikkan; folder keluaran dan "rumah"
   (~/.wevai) adalah folder sementara. Kunci di sini palsu. Pakai: node --test scripts/test-vo.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, symlinkSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as vo from './vo-gemini.mjs';

const K = n => `AIzaSyFakeKey_abcdefghijklmnopqrstu${String(n).padStart(4, '0')}`;   // 39 karakter seperti kunci asli; 4 huruf terakhir beda → bentuk tersamar (AIza…0001) beda
const dibuat = [];
const folder = () => { const d = mkdtempSync(join(tmpdir(), 'wevai-vo-uji-')); dibuat.push(d); return d; };
process.on('exit', () => { for (const d of dibuat) try { rmSync(d, { recursive: true, force: true }); } catch {} });     // tak meninggalkan sampah di folder sementara

/* ---------- kunci: urai, ganda, batas 10, samar ---------- */
test('samarkan: 4 awal + … + 4 akhir; kunci pendek tak bocor', () => {
  assert.equal(vo.samarkan('AIzaSyD1234567890abcdefghijklmnopqrstuv'), 'AIza…stuv');
  assert.equal(vo.samarkan('abc'), '****');
});

test('idKunci: 12 heks pertama sha256, bukan kunci', () => {
  const id = vo.idKunci(K(1));
  assert.match(id, /^[0-9a-f]{12}$/);
  assert.ok(!K(1).includes(id));
  assert.equal(id, vo.idKunci(K(1)));
  assert.notEqual(id, vo.idKunci(K(2)));
});

test('kumpulkanKunci: env GEMINI_API_KEYS (koma/spasi) + GEMINI_API_KEY + berkas; ganda dibuang; urutan tetap', () => {
  const d = folder(), berkas = join(d, 'kunci.txt');
  writeFileSync(berkas, `${String.fromCharCode(0xFEFF)}# kunci tim\r\n${K(4)}   # Budi\r\n\r\n${K(1)}\r\n${K(5)}\r\n`);
  const hasil = vo.kumpulkanKunci({ env: { GEMINI_API_KEYS: `${K(1)}, ${K(2)}\n${K(3)}`, GEMINI_API_KEY: K(2) }, berkas });
  assert.deepEqual(hasil, [K(1), K(2), K(3), K(4), K(5)]);
  rmSync(d, { recursive: true });
});

test('kumpulkanKunci: tanpa sumber → larik kosong; berkas bawaan yang tak ada diam saja, tapi --kunci yang tak ada galat', () => {
  assert.deepEqual(vo.kumpulkanKunci({ env: {}, berkas: join(folder(), 'tidak-ada.txt') }), []);
  assert.throws(() => vo.kumpulkanKunci({ env: {}, berkas: join(folder(), 'tidak-ada.txt'), wajib: true }), /tidak ditemukan/);
});

test('kumpulkanKunci: lebih dari 10 kunci unik ditolak dengan pesan jelas; 10 boleh; 12 dengan ganda → 10 lolos', () => {
  const sebelas = Array.from({ length: 11 }, (_, i) => K(i + 1));
  assert.throws(() => vo.kumpulkanKunci({ env: { GEMINI_API_KEYS: sebelas.join(',') } }), /11 kunci.*maksimal 10/s);
  assert.equal(vo.kumpulkanKunci({ env: { GEMINI_API_KEYS: sebelas.slice(0, 10).join(',') } }).length, 10);
  assert.equal(vo.kumpulkanKunci({ env: { GEMINI_API_KEYS: [...sebelas.slice(0, 10), K(1), K(2)].join(',') } }).length, 10);
});

test('kumpulkanKunci: baris yang bukan kunci ditolak TANPA mencetaknya utuh', () => {
  const rusak = 'GEMINI_API_KEY=' + K(1);
  let pesan; try { vo.kumpulkanKunci({ env: { GEMINI_API_KEYS: rusak } }); } catch (e) { pesan = e.message; }
  assert.ok(pesan, 'seharusnya melempar');
  assert.match(pesan, /bukan kunci API/);
  assert.ok(!pesan.includes(rusak) && !pesan.includes(K(1)), 'pesan memuat kunci utuh');
});

/* ---------- waktu: tengah malam Pasifik (reset kuota harian) dan durasi retryDelay ---------- */
const utc = (...a) => Date.UTC(...a);
test('tengahMalamLA: tanggal PST (UTC-8) → 00.00 PST = 08.00 UTC hari berikutnya', () => {
  assert.equal(vo.tengahMalamLA(utc(2026, 10, 4, 18, 0, 0)), utc(2026, 10, 5, 8, 0, 0));    // Rab 4 Nov 10.00 PST → Kam 5 Nov 00.00 PST
  assert.equal(vo.tengahMalamLA(utc(2026, 10, 4, 7, 59, 59)), utc(2026, 10, 4, 8, 0, 0));   // 3 Nov 23.59.59 PST → 4 Nov 00.00 PST
  assert.equal(vo.tengahMalamLA(utc(2026, 10, 4, 8, 0, 0)), utc(2026, 10, 5, 8, 0, 0));     // tepat tengah malam → malam berikutnya, bukan "sekarang"
});

test('tengahMalamLA: tanggal PDT (UTC-7) → 00.00 PDT = 07.00 UTC hari berikutnya', () => {
  assert.equal(vo.tengahMalamLA(utc(2026, 6, 15, 20, 0, 0)), utc(2026, 6, 16, 7, 0, 0));    // Rab 15 Jul 13.00 PDT → 16 Jul 00.00 PDT
});

test('tengahMalamLA: hari ganti DST (maju 8 Mar, mundur 1 Nov 2026) tetap tepat tengah malam lokal', () => {
  assert.equal(vo.tengahMalamLA(utc(2026, 2, 7, 20, 0, 0)), utc(2026, 2, 8, 8, 0, 0));      // Sab 7 Mar 12.00 PST → 8 Mar 00.00 PST
  assert.equal(vo.tengahMalamLA(utc(2026, 2, 8, 12, 0, 0)), utc(2026, 2, 9, 7, 0, 0));      // Min 8 Mar 05.00 PDT (sudah maju) → 9 Mar 00.00 PDT
  assert.equal(vo.tengahMalamLA(utc(2026, 10, 1, 5, 0, 0)), utc(2026, 10, 1, 7, 0, 0));     // Sab 31 Okt 22.00 PDT → 1 Nov 00.00 PDT
  assert.equal(vo.tengahMalamLA(utc(2026, 10, 1, 12, 0, 0)), utc(2026, 10, 2, 8, 0, 0));    // Min 1 Nov 04.00 PST (sudah mundur) → 2 Nov 00.00 PST
});

test('durasiDetik: Duration protobuf ("37s") dan teks "retry in" gaya Go ("10h17m5.5s")', () => {
  assert.equal(vo.durasiDetik('37s'), 37);
  assert.equal(vo.durasiDetik('37.5s'), 37.5);
  assert.equal(vo.durasiDetik('1m30s'), 90);
  assert.equal(vo.durasiDetik('10h17m5.5s'), 10 * 3600 + 17 * 60 + 5.5);
  assert.ok(Math.abs(vo.durasiDetik('886ms') - .886) < 1e-9);
  assert.equal(vo.durasiDetik('sebentar'), null);
  assert.equal(vo.durasiDetik(undefined), null);
});

/* ---------- WAV: header RIFF 44 byte + durasi persis dari jumlah sampel ---------- */
const pcm = (sampel, f = i => (i * 37) % 2000 - 1000) => { const b = Buffer.alloc(sampel * 2); for (let i = 0; i < sampel; i++) b.writeInt16LE(f(i), i * 2); return b; };
const wavTangan = (data, laju = 24000, kanal = 1) => {      // dirakit manual di uji, bukan lewat bungkusWav: pembanding independen
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(kanal, 22); h.writeUInt32LE(laju, 24); h.writeUInt32LE(laju * kanal * 2, 28); h.writeUInt16LE(kanal * 2, 32);
  h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40); return Buffer.concat([h, data]);
};

test('bungkusWav: PCM mentah 24 kHz mono 16-bit → header RIFF 44 byte, identik dengan WAV rakitan tangan', () => {
  const data = pcm(36000), w = vo.bungkusWav({ pcm: data, laju: 24000, kanal: 1 });
  assert.equal(w.length, 44 + 72000);
  assert.deepEqual(w, wavTangan(data));
  assert.equal(w.toString('latin1', 0, 4), 'RIFF'); assert.equal(w.readUInt32LE(24), 24000); assert.equal(w.readUInt16LE(22), 1); assert.equal(w.readUInt16LE(34), 16);
});

test('bacaAudio + durasiPcm: WAV dari API → PCM, laju, kanal; durasi PERSIS jumlah sampel ÷ laju (tanpa pembulatan)', () => {
  const a = vo.bacaAudio(wavTangan(pcm(36000)));
  assert.equal(a.laju, 24000); assert.equal(a.kanal, 1); assert.equal(a.pcm.length, 72000);
  assert.equal(vo.durasiPcm(a), 1.5);
  assert.equal(vo.durasiPcm(vo.bacaAudio(wavTangan(pcm(24001)))), 24001 / 24000);
});

test('bacaAudio: PCM mentah (audio/l16) memakai laju dari API, bawaan 24 kHz; byte ganjil di ujung dibuang', () => {
  const a = vo.bacaAudio(Buffer.concat([pcm(100), Buffer.from([7])]), 16000, 1);
  assert.equal(a.pcm.length, 200); assert.equal(a.laju, 16000);
  assert.equal(vo.bacaAudio(pcm(100)).laju, 24000);
});

test('bacaAudio: WAV streaming (ukuran 0xFFFFFFFF) memakai sisa berkas; chunk LIST sebelum data dilompati', () => {
  const w = wavTangan(pcm(500)); w.writeUInt32LE(0xFFFFFFFF, 4); w.writeUInt32LE(0xFFFFFFFF, 40);
  assert.equal(vo.bacaAudio(w).pcm.length, 1000);
  const list = Buffer.concat([Buffer.from('LIST'), Buffer.from([4, 0, 0, 0]), Buffer.from('INFO')]), asli = wavTangan(pcm(500));
  assert.equal(vo.bacaAudio(Buffer.concat([asli.subarray(0, 36), list, asli.subarray(36)])).pcm.length, 1000);
});

test('bacaAudio: WAV selain PCM 16-bit ditolak dengan pesan jelas', () => {
  const w = wavTangan(pcm(10)); w.writeUInt16LE(8, 34);
  assert.throws(() => vo.bacaAudio(w), /16-bit/);
});

/* ---------- permintaan & jawaban API (bentuk dari aistudio.google.com/docs/speech-generation) ---------- */
test('bangunPermintaan: Interactions API persis seperti di dokumen; kunci hanya di header', () => {
  const r = vo.bangunPermintaan(K(1), { model: 'gemini-3.8-flash-tts', teks: 'Halo dunia.', suara: 'Kore', gaya: 'hangat' });
  assert.equal(r.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(r.init.method, 'POST');
  assert.equal(r.init.headers['x-goog-api-key'], K(1));
  assert.ok(!r.url.includes(K(1)) && !r.init.body.includes(K(1)), 'kunci bocor ke URL/badan');
  assert.deepEqual(JSON.parse(r.init.body), {
    model: 'gemini-3.8-flash-tts',
    input: [{ type: 'user_input', content: [{ type: 'text', text: 'Halo dunia.', annotations: [{ type: 'speech_metadata', style: 'hangat' }] }] }],
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: 'Kore' }] },
  });
  const tanpaGaya = JSON.parse(vo.bangunPermintaan(K(1), { model: 'm', teks: 't', suara: 'Kore', gaya: '' }).init.body);
  assert.equal(tanpaGaya.input[0].content[0].annotations, undefined, 'tanpa gaya → tanpa anotasi');
});

const jawab = (konten, status = 'completed') => ({ status, steps: [{ type: 'user_input', content: [] }, { type: 'model_output', content: konten }] });
test('ambilAudio: steps[].content[] bertipe audio (base64) → WAV atau PCM; keluaran tak utuh atau tanpa audio = gagal berikut alasannya', () => {
  const wav = wavTangan(pcm(1000));
  assert.equal(vo.ambilAudio(jawab([{ type: 'audio', data: wav.toString('base64'), mime_type: 'audio/wav' }])).audio.pcm.length, 2000);
  const mentah = vo.ambilAudio(jawab([{ type: 'audio', data: pcm(100).toString('base64'), mime_type: 'audio/l16', sample_rate: 16000 }]));
  assert.equal(mentah.audio.laju, 16000);
  assert.match(vo.ambilAudio(jawab([{ type: 'text', text: 'maaf, aku tidak bisa' }])).gagal, /tanpa audio.*maaf, aku tidak bisa/);
  assert.match(vo.ambilAudio(jawab([{ type: 'audio', data: '' }])).gagal, /tanpa audio/);
  assert.match(vo.ambilAudio(jawab([{ type: 'audio', data: wav.toString('base64') }], 'incomplete')).gagal, /incomplete.*terpotong/s);
  assert.match(vo.ambilAudio({ status: 'failed', errors: [{ message: 'diblokir' }], steps: [] }).gagal, /failed.*diblokir/s);
  assert.match(vo.ambilAudio(jawab([{ type: 'audio', data: wavTangan(Buffer.alloc(0)).toString('base64') }])).gagal, /kosong/);
});

/* ---------- klasifikasi galat: satu fungsi murni yang menentukan nasib kunci vs nasib segmen ---------- */
const badan = e => JSON.stringify({ error: e });
const pilih = ({ jenis, tunda }) => tunda === undefined ? { jenis } : { jenis, tunda };
const rpc = (kuotaId, retryDelay, message = 'You exceeded your current quota, please check your plan and billing details.') => ({
  code: 429, message, status: 'RESOURCE_EXHAUSTED',
  details: [
    { '@type': 'type.googleapis.com/google.rpc.Help', links: [{ description: 'Learn more about Gemini API quotas', url: 'https://ai.google.dev/gemini-api/docs/rate-limits' }] },
    ...(kuotaId ? [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaId: kuotaId, quotaDimensions: { location: 'global', model: 'gemini-3.8-flash-tts' }, quotaValue: '10' }] }] : []),
    ...(retryDelay ? [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay }] : []),
  ],
});

test('klasifikasi 429 per menit: quotaId …PerMinute… → menit, tunda dari RetryInfo.retryDelay (bawaan 60 dtk)', () => {
  assert.deepEqual(pilih(vo.klasifikasi(429, badan(rpc('GenerateRequestsPerMinutePerProjectPerModel-FreeTier', '37s')))), { jenis: 'menit', tunda: 37 });
  assert.deepEqual(pilih(vo.klasifikasi(429, badan(rpc('GenerateRequestsPerMinutePerProjectPerModel-FreeTier')))), { jenis: 'menit', tunda: 60 });
  assert.deepEqual(pilih(vo.klasifikasi(429, 'bukan json', { 'retry-after': '12' })), { jenis: 'menit', tunda: 12 });
  assert.deepEqual(pilih(vo.klasifikasi(429, '<html>proxy</html>')), { jenis: 'menit', tunda: 60 });
});

test('klasifikasi 429 per hari: quotaId …PerDay… → harian; retryDelay "1s" yang menyesatkan DIABAIKAN (kasus nyata di forum Google)', () => {
  assert.equal(vo.klasifikasi(429, badan(rpc('GenerateRequestsPerDayPerProjectPerModel-FreeTier', '1s'))).jenis, 'harian');
  assert.equal(vo.klasifikasi(429, badan(rpc(null, null, 'Quota exceeded: you have used your requests per day for this model.'))).jenis, 'harian');
  assert.equal(vo.klasifikasi(429, badan(rpc('FooPerMinute', '5s', 'limit per day mentioned in passing'))).jenis, 'menit', 'quotaId menang atas teks pesan');
});

test('klasifikasi 429 gaya Interactions API (kode teks): quota_exceeded = harian; rate_limit_exceeded / too_many_requests = menit', () => {
  assert.equal(vo.klasifikasi(429, badan({ code: 'quota_exceeded', message: 'You have exceeded your daily quota.' })).jenis, 'harian');
  assert.equal(vo.klasifikasi(429, badan({ code: 'rate_limit_exceeded', message: 'per-minute limit, daily mentioned' })).jenis, 'menit');
  assert.equal(vo.klasifikasi(429, badan({ code: 'too_many_requests', message: 'slow down' })).jenis, 'menit');
});

test('klasifikasi 429: "Please retry in …" di pesan tanpa details dipakai sebagai tunda; "limit: 0" = kunci tak punya kuota model ini', () => {
  assert.deepEqual(pilih(vo.klasifikasi(429, badan({ code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded for metric: x, limit: 5. Please retry in 12.5s.' }))), { jenis: 'menit', tunda: 12.5 });
  assert.equal(vo.klasifikasi(429, badan({ code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: x. Please retry in 10h17m5.7s.' })).jenis, 'nol');
});

test('klasifikasi kunci ditolak: 400 "API key not valid", 401, 403 (termasuk "leaked") → tidak-sah; 400 biasa & 404 → segmen (bukan salah kunci)', () => {
  const kunci400 = badan({ code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID', domain: 'googleapis.com' }] });
  assert.equal(vo.klasifikasi(400, kunci400).jenis, 'tidak-sah');
  assert.equal(vo.klasifikasi(400, badan({ code: 400, status: 'INVALID_ARGUMENT', message: 'API key expired. Please renew the API key.' })).jenis, 'tidak-sah');
  assert.equal(vo.klasifikasi(401, badan({ code: 'authentication', message: 'The API key is missing, invalid, or expired.' })).jenis, 'tidak-sah');
  assert.equal(vo.klasifikasi(403, badan({ code: 403, status: 'PERMISSION_DENIED', message: 'Your API key was reported as leaked. Please use another API key.' })).jenis, 'tidak-sah');
  assert.equal(vo.klasifikasi(400, badan({ code: 'failed_precondition', message: 'billing disabled' })).jenis, 'tidak-sah');
  assert.equal(vo.klasifikasi(400, badan({ code: 'invalid_request', message: 'The value x is not supported' })).jenis, 'segmen');
  assert.equal(vo.klasifikasi(404, badan({ code: 404, status: 'NOT_FOUND', message: 'models/foo is not found' })).jenis, 'segmen');
});

test('klasifikasi 5xx / 408 → server (diulang); pesan dipotong dan selalu memuat kode HTTP', () => {
  for (const s of [500, 502, 503, 504, 408]) assert.equal(vo.klasifikasi(s, badan({ code: s, message: 'x' })).jenis, 'server');
  const p = vo.klasifikasi(503, badan({ code: 503, message: 'The model is overloaded. ' + 'x'.repeat(1000) })).pesan;
  assert.match(p, /^HTTP 503: The model is overloaded/); assert.ok(p.length < 300);
});

/* ---------- integrasi: jalankan() dengan fetch, jam, dan tidur palsu; "rumah" dan keluaran = folder sementara ---------- */
const MULAI_PST = Date.UTC(2026, 10, 4, 18, 0, 0);     // Rab 4 Nov 2026 10.00 PST (UTC-8)
const MULAI_PDT = Date.UTC(2026, 6, 15, 20, 0, 0);     // Rab 15 Jul 2026 13.00 PDT (UTC-7)
const ok = (sampel = 24000) => new Response(JSON.stringify(jawab([{ type: 'audio', data: wavTangan(pcm(sampel)).toString('base64'), mime_type: 'audio/wav' }])), { status: 200 });
const galat = (status, e, headers) => new Response(badan(e), { status, headers });
const kunciBuruk = () => galat(400, { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }] });
const overload = () => galat(503, { code: 503, message: 'The model is overloaded. Please try again later.', status: 'UNAVAILABLE' });
const teksDari = p => p.body.input[0].content[0].text;
const S1 = { id: 's1', teks: 'Satu.' }, S2 = { id: 's2', teks: 'Dua.' };

function dunia({ mulai = MULAI_PST, kunci = [], env = {}, naskah = [S1], jawaban }) {
  const rumah = folder(), keluar = join(rumah, 'vo'), naskahBerkas = join(rumah, 'naskah.json');
  const t = { sekarang: mulai }, tidur = [], log = [], err = [], panggilan = [];
  writeFileSync(naskahBerkas, JSON.stringify(naskah));
  const deps = {
    env: { ...(kunci.length ? { GEMINI_API_KEYS: kunci.join(',') } : {}), ...env }, home: rumah, cwd: rumah, skrip: join(rumah, 'scripts', 'vo-gemini.mjs'),
    // tidur palsu: jam maju SESUDAH satu giliran event-loop dan ke waktu bangun (bukan menambah), supaya pekerja serentak tak melihat masa depan atau menggandakan waktu
    now: () => t.sekarang, sleep: async ms => { tidur.push(ms); const bangun = t.sekarang + ms; await new Promise(r => setImmediate(r)); t.sekarang = Math.max(t.sekarang, bangun); },
    log: (...a) => log.push(a.join(' ')), err: (...a) => err.push(a.join(' ')),
    fetch: async (url, init) => {
      if (panggilan.length >= 100) throw new Error('uji: lebih dari 100 panggilan, kemungkinan putaran tak berujung');     // pengaman: jam palsu tak pernah membuat uji menggantung
      const p = { url, metode: init.method ?? 'GET', kunci: init.headers['x-goog-api-key'], body: init.body ? JSON.parse(init.body) : null };
      panggilan.push(p); return jawaban(p, panggilan.length);
    },
  };
  const statusBerkas = join(rumah, '.wevai', 'gemini-kunci-status.json');
  return { rumah, keluar, t, tidur, log, err, panggilan, deps, naskahBerkas, statusBerkas,
    jalankan: (arg = []) => vo.jalankan([naskahBerkas, '--keluar', keluar, ...arg], deps),
    status: () => existsSync(statusBerkas) ? JSON.parse(readFileSync(statusBerkas, 'utf8')) : {},
    keluaran: id => JSON.parse(readFileSync(join(keluar, id + '.json'), 'utf8')) };
}
const tanpaKunciUtuh = (w, kunci) => {      // aturan keras: kunci tak pernah tercetak atau tertulis utuh (log, galat, status)
  const semua = [...w.log, ...w.err, existsSync(w.statusBerkas) ? readFileSync(w.statusBerkas, 'utf8') : ''].join('\n');
  for (const k of kunci) assert.ok(!semua.includes(k), `kunci ${vo.samarkan(k)} bocor di log/status`);
};

test('tanpa kunci apa pun: galat Indonesia yang menyebut env, berkas bawaan, dan --kunci; tidak ada panggilan jaringan', async () => {
  const w = dunia({ jawaban: () => { throw new Error('jaringan dilarang'); } });
  assert.equal(await w.jalankan(), 1);
  assert.equal(w.panggilan.length, 0);
  const pesan = w.err.join('\n');
  assert.match(pesan, /GEMINI_API_KEYS/); assert.match(pesan, /GEMINI_API_KEY\b/); assert.match(pesan, /gemini-kunci\.txt/); assert.match(pesan, /--kunci/);
});

test('429 per menit: kunci istirahat selama retryDelay dan pindah SEKETIKA; segmen berikutnya tak menyentuh kunci itu', async () => {
  const w = dunia({ kunci: [K(1), K(2)], naskah: [S1, S2],
    jawaban: p => p.kunci === K(1) ? galat(429, rpc('GenerateRequestsPerMinutePerProjectPerModel-FreeTier', '37s')) : ok(48000) });
  assert.equal(await w.jalankan(), 0);
  assert.deepEqual(w.panggilan.map(p => p.kunci), [K(1), K(2), K(2)]);
  assert.deepEqual(w.tidur, [], 'pindah kunci tidak boleh tidur');
  assert.deepEqual(w.status()[vo.idKunci(K(1))], { sampai: MULAI_PST + 37000, alasan: 'menit' });
  assert.ok(existsSync(join(w.keluar, 's1.wav')) && existsSync(join(w.keluar, 's2.wav')));
  assert.ok(w.log.some(l => l.includes(vo.samarkan(K(1))) && /per menit/.test(l)), 'kunci yang pindah harus tampak (tersamar) di log');
  tanpaKunciUtuh(w, [K(1), K(2)]);
});

for (const [nama, mulai, tengahMalam] of [['PST', MULAI_PST, Date.UTC(2026, 10, 5, 8, 0, 0)], ['PDT', MULAI_PDT, Date.UTC(2026, 6, 16, 7, 0, 0)]]) {
  test(`429 per hari (${nama}): kunci istirahat sampai tengah malam Pasifik berikutnya (+ margin), retryDelay "1s" diabaikan, pindah kunci`, async () => {
    const w = dunia({ mulai, kunci: [K(1), K(2)], jawaban: p => p.kunci === K(1) ? galat(429, rpc('GenerateRequestsPerDayPerProjectPerModel-FreeTier', '1s')) : ok() });
    assert.equal(await w.jalankan(), 0);
    assert.deepEqual(w.status()[vo.idKunci(K(1))], { sampai: tengahMalam + vo.JEDA_RESET, alasan: 'harian' });
    assert.deepEqual(w.panggilan.map(p => p.kunci), [K(1), K(2)]);
    assert.deepEqual(w.tidur, []);
  });
}

test('kunci tidak sah (400 "API key not valid"): dilewati 24 jam (tidak-sah), dilaporkan tersamar, kunci lain meneruskan', async () => {
  const w = dunia({ kunci: [K(1), K(2)], naskah: [S1, S2], jawaban: p => p.kunci === K(1) ? kunciBuruk() : ok() });
  assert.equal(await w.jalankan(), 0);
  assert.deepEqual(w.panggilan.map(p => p.kunci), [K(1), K(2), K(2)]);
  assert.deepEqual(w.status()[vo.idKunci(K(1))], { sampai: MULAI_PST + 24 * 3600e3, alasan: 'tidak-sah' });
  assert.ok(w.log.some(l => l.includes(vo.samarkan(K(1))) && /tidak sah/.test(l)));
  tanpaKunciUtuh(w, [K(1), K(2)]);
});

test('semua kunci tidak sah: berhenti dengan galat jelas (kode 1, tanpa menunggu), tiap kunci tersamar, sekali coba per kunci', async () => {
  const w = dunia({ kunci: [K(1), K(2)], jawaban: () => kunciBuruk() });
  assert.equal(await w.jalankan(), 1);
  assert.deepEqual(w.tidur, []);
  assert.equal(w.panggilan.length, 2);
  const pesan = w.err.join('\n');
  assert.match(pesan, /tidak ada kunci yang bisa dipakai/i); assert.ok(pesan.includes(vo.samarkan(K(1))) && pesan.includes(vo.samarkan(K(2))));
  assert.match(pesan, /--cek-kunci/);
  tanpaKunciUtuh(w, [K(1), K(2)]);
});

test('5xx / jaringan putus: diulang pada kunci yang sama dengan jeda 1 lalu 2 dtk, lalu berhasil', async () => {
  const w = dunia({ kunci: [K(1), K(2)], jawaban: (p, n) => { if (n === 1) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } }); return n === 2 ? overload() : ok(); } });
  assert.equal(await w.jalankan(), 0);
  assert.deepEqual(w.tidur, [1000, 2000]);
  assert.deepEqual(w.panggilan.map(p => p.kunci), [K(1), K(1), K(1)]);
  assert.deepEqual(w.status(), {}, 'galat server bukan salah kunci: tak ada yang diistirahatkan');
});

test('5xx terus pada satu kunci: setelah 1+3 percobaan (jeda 1, 2, 4 dtk) pindah ke kunci berikutnya', async () => {
  const w = dunia({ kunci: [K(1), K(2)], jawaban: p => p.kunci === K(1) ? overload() : ok() });
  assert.equal(await w.jalankan(), 0);
  assert.deepEqual(w.tidur, [1000, 2000, 4000]);
  assert.deepEqual(w.panggilan.map(p => p.kunci), [K(1), K(1), K(1), K(1), K(2)]);
});

test('server gagal di SEMUA kunci untuk satu segmen: segmen itu dicatat gagal (kode 1), segmen lain tetap dikerjakan', async () => {
  const w = dunia({ kunci: [K(1), K(2)], naskah: [{ id: 'rewel', teks: 'x' }, { id: 'mulus', teks: 'y' }], jawaban: p => teksDari(p) === 'x' ? overload() : ok() });
  assert.equal(await w.jalankan(), 1);
  assert.ok(!existsSync(join(w.keluar, 'rewel.wav')) && existsSync(join(w.keluar, 'mulus.wav')));
  assert.match(w.log.join('\n'), /rewel/);
});

test('kegagalan konten (200 tanpa audio, atau 400 permintaan) = gagal SEGMEN, bukan kunci: ditandai, didaftar di akhir, kunci tak istirahat', async () => {
  const w = dunia({ kunci: [K(1)], naskah: [{ id: 'a', teks: 'a' }, { id: 'blok', teks: 'diblokir' }, { id: 'b', teks: 'b' }, { id: 'jelek', teks: 'jelek' }],
    jawaban: p => teksDari(p) === 'diblokir' ? new Response(JSON.stringify(jawab([{ type: 'text', text: 'Maaf, tidak bisa.' }]))) : teksDari(p) === 'jelek' ? galat(400, { code: 'invalid_request', message: 'teks tidak didukung' }) : ok() });
  assert.equal(await w.jalankan(), 1);
  assert.ok(existsSync(join(w.keluar, 'a.wav')) && existsSync(join(w.keluar, 'b.wav')), 'segmen sesudah yang gagal tetap dikerjakan');
  assert.ok(!existsSync(join(w.keluar, 'blok.json')) && !existsSync(join(w.keluar, 'jelek.json')), 'tanpa json = dicoba lagi saat dijalankan ulang');
  assert.deepEqual(w.status(), {});
  const akhir = w.log.join('\n');
  assert.match(akhir, /2 gagal/); assert.match(akhir, /blok.*tanpa audio/); assert.match(akhir, /jelek.*teks tidak didukung/);
});

test('keluaran: <id>.wav = WAV rakitan dari sampel API; <id>.json = {teks, suara, model, gaya, dur} dengan dur PERSIS sampel ÷ 24000; suara/gaya segmen menimpa opsi global', async () => {
  const w = dunia({ kunci: [K(1)], naskah: [{ id: 'a', teks: 'Satu.' }, { id: 'b', teks: 'Dua.', suara: 'Kore', gaya: 'berbisik' }], jawaban: () => ok(36001) });
  assert.equal(await w.jalankan(['--suara', 'Iapetus', '--gaya', 'hangat', '--model', 'gemini-3.8-flash-lite-tts']), 0);
  const a = w.keluaran('a');
  assert.deepEqual(a, { teks: 'Satu.', suara: 'Iapetus', model: 'gemini-3.8-flash-lite-tts', gaya: 'hangat', dur: 36001 / 24000 });
  assert.deepEqual(Object.keys(a), ['teks', 'suara', 'model', 'gaya', 'dur']);
  assert.deepEqual(readFileSync(join(w.keluar, 'a.wav')), wavTangan(pcm(36001)));
  assert.deepEqual([w.keluaran('b').suara, w.keluaran('b').gaya], ['Kore', 'berbisik']);
  assert.deepEqual(w.panggilan.map(p => p.body.generation_config.speech_config[0].voice), ['Iapetus', 'Kore']);
  assert.equal(w.panggilan[0].body.model, 'gemini-3.8-flash-lite-tts');
});

test('lanjut: json cocok (teks, suara, model, gaya) + wav ada → DILEWATI tanpa panggilan; ubah gaya atau hapus wav → dibuat ulang', async () => {
  const w = dunia({ kunci: [K(1)], naskah: [S1, S2], jawaban: () => ok() });
  assert.equal(await w.jalankan(), 0); assert.equal(w.panggilan.length, 2);
  assert.equal(await w.jalankan(), 0); assert.equal(w.panggilan.length, 2, 'jalan kedua memanggil API lagi');
  assert.match(w.log.join('\n'), /2 dilewati/);
  assert.equal(await w.jalankan(['--gaya', 'pelan']), 0); assert.equal(w.panggilan.length, 4, 'gaya berubah → dibuat ulang');
  rmSync(join(w.keluar, 's1.wav'));
  assert.equal(await w.jalankan(['--gaya', 'pelan']), 0); assert.equal(w.panggilan.length, 5, 'hanya yang wav-nya hilang');
  assert.equal(await w.jalankan(['--gaya', 'pelan', '--model', 'gemini-3.8-flash-lite-tts']), 0); assert.equal(w.panggilan.length, 7, 'model berubah → semua');
});

test('semua segmen sudah ada → selesai tanpa butuh kunci sama sekali', async () => {
  const w = dunia({ kunci: [K(1)], jawaban: () => ok() });
  assert.equal(await w.jalankan(), 0);
  const tanpa = { ...w.deps, env: {} };
  assert.equal(await vo.jalankan([w.naskahBerkas, '--keluar', w.keluar], tanpa), 0);
});

/* ---------- semua kunci istirahat: tunggu, atau berhenti dengan --jangan-tunggu ---------- */
const jumlah = a => a.reduce((x, y) => x + y, 0);
const MENIT_PER = 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier', HARI_PER = 'GenerateRequestsPerDayPerProjectPerModel-FreeTier';

test('semua kunci istirahat ≤ 15 menit: tidur lewat sleep suntikan sampai siap, lalu lanjut sendiri', async () => {
  const w = dunia({ kunci: [K(1)], jawaban: (p, n) => n === 1 ? galat(429, rpc(MENIT_PER, '30s')) : ok() });
  assert.equal(await w.jalankan(), 0);
  assert.equal(jumlah(w.tidur), 30000);
  assert.equal(w.t.sekarang, MULAI_PST + 30000);
  assert.deepEqual(w.panggilan.map(p => p.kunci), [K(1), K(1)]);
  assert.ok(w.log.some(l => /semua kunci istirahat/i.test(l)));
});

test('semua kunci habis harian: menunggu reset tengah malam Pasifik tanpa diminta, mencatat jam LANJUT dalam waktu lokal, lalu lanjut sendiri', async () => {
  const reset = Date.UTC(2026, 10, 5, 8, 0, 0) + vo.JEDA_RESET;
  const w = dunia({ kunci: [K(1), K(2)], jawaban: (p, n) => n <= 2 ? galat(429, rpc(HARI_PER, '1s')) : ok() });
  assert.equal(await w.jalankan(), 0);
  assert.equal(w.t.sekarang, reset, 'jam palsu harus maju persis sampai reset (+ margin)');
  assert.ok(w.tidur.length > 100 && w.tidur.every(ms => ms <= 30000), 'tidur dipotong-potong: tahan tidur laptop dan ganti jam');
  assert.deepEqual(w.panggilan.map(p => p.kunci), [K(1), K(2), K(1)]);
  assert.ok(w.log.some(l => /lanjut/i.test(l) && l.includes(vo.waktuLokal(reset))), 'jam lanjut (lokal) harus tercatat');
  tanpaKunciUtuh(w, [K(1), K(2)]);
});

test('--jangan-tunggu: bila harus menunggu > 15 menit, berhenti dengan kode 2 dan mencetak perintah ulang yang persis sama', async () => {
  const w = dunia({ kunci: [K(1)], jawaban: () => galat(429, rpc(HARI_PER, '1s')) });
  const arg = [w.naskahBerkas, '--keluar', w.keluar, '--jangan-tunggu'];
  assert.equal(await vo.jalankan(arg, w.deps), 2);
  assert.deepEqual(w.tidur, []);
  const out = w.err.join('\n');
  assert.ok(out.includes(vo.waktuLokal(Date.UTC(2026, 10, 5, 8, 0, 0) + vo.JEDA_RESET)), 'jam lanjut lokal');
  assert.ok(out.includes(vo.perintahUlang(w.deps.skrip, arg)), out);
  assert.match(w.log.join('\n'), /1 gagal|0 baru/);
  tanpaKunciUtuh(w, [K(1)]);
});

test('--jangan-tunggu tetap tidur bila kunci siap dalam ≤ 15 menit (hanya penantian panjang yang ditolak)', async () => {
  const w = dunia({ kunci: [K(1)], jawaban: (p, n) => n === 1 ? galat(429, rpc(MENIT_PER, '40s')) : ok() });
  assert.equal(await w.jalankan(['--jangan-tunggu']), 0);
  assert.equal(w.t.sekarang, MULAI_PST + 40000);
});

test('perintahUlang: argumen berspasi dikutip, yang polos dibiarkan', () => {
  assert.equal(vo.perintahUlang('/x/vo-gemini.mjs', ['n.json', '--gaya', 'hangat dan pelan', '--jangan-tunggu']), 'node /x/vo-gemini.mjs n.json --gaya "hangat dan pelan" --jangan-tunggu');
  assert.equal(vo.perintahUlang('C:\\a b\\vo-gemini.mjs', ['C:\\p\\n.json']), 'node "C:\\a b\\vo-gemini.mjs" C:\\p\\n.json');
});

test('retryDelay menyesatkan ("1s") tapi kena lagi: kena kedua kali berturut-turut → istirahat minimal semenit penuh', async () => {
  const w = dunia({ kunci: [K(1)], jawaban: (p, n) => n <= 2 ? galat(429, rpc(MENIT_PER, '1s')) : ok() });
  assert.equal(await w.jalankan(), 0);
  assert.equal(jumlah(w.tidur), 1000 + 60000);
});

test('429 "limit: 0" (model tak termasuk paket kunci): TIDAK menunggu reset; galat jelas menyebut sebabnya dan sarannya; TIDAK disimpan (bergantung pada model)', async () => {
  const w = dunia({ kunci: [K(1), K(2)], jawaban: p => p.body.model === 'gemini-3.8-flash-lite-tts' ? ok() :
    galat(429, rpc(HARI_PER, '5h', 'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3.8-flash-tts')) });
  assert.equal(await w.jalankan(), 1);
  assert.deepEqual(w.tidur, []);
  assert.deepEqual(w.panggilan.map(p => p.kunci), [K(1), K(2)]);
  const pesan = w.err.join('\n');
  assert.match(pesan, /tidak ada kunci yang bisa dipakai/i); assert.match(pesan, /limit: 0/); assert.match(pesan, /--model/);
  assert.deepEqual(w.status(), {}, 'limit: 0 hanya berlaku untuk model itu: tak boleh membuat kunci "mati" di jalan berikutnya');
  assert.equal(await w.jalankan(['--model', 'gemini-3.8-flash-lite-tts']), 0, 'ganti model → kunci yang sama langsung bisa dipakai');
  assert.equal(w.panggilan.at(-1).kunci, K(1));
});

test('berkas status yang rusak atau janggal dibersihkan: entri bukan objek diabaikan, istirahat absurd (> 48 jam ke depan) tak menahan kunci selamanya, yang wajar tetap dihormati', async () => {
  const w = dunia({ kunci: [K(1), K(2), K(3)], jawaban: () => ok() });
  mkdirSync(join(w.rumah, '.wevai'));
  writeFileSync(w.statusBerkas, JSON.stringify({
    [vo.idKunci(K(1))]: { sampai: MULAI_PST + 3600e3, alasan: 'menit' },             // wajar: dihormati
    [vo.idKunci(K(2))]: { sampai: MULAI_PST + 10 * 24 * 3600e3, alasan: 'harian' },  // jam komputer pernah salah / berkas disunting: diabaikan
    [vo.idKunci(K(3))]: null, aneh: 'abc', lain: { sampai: 'besok' } }));
  assert.equal(await w.jalankan(), 0);
  assert.deepEqual(w.panggilan.map(p => p.kunci), [K(2)], 'K1 istirahat (wajar) → dilewati; K2 (absurd) dipakai');
});

test('campuran: satu kunci tidak sah + satu kunci habis harian → menunggu reset kunci yang sah (bukan galat fatal)', async () => {
  const w = dunia({ kunci: [K(1), K(2)], jawaban: (p, n) => p.kunci === K(1) ? kunciBuruk() : n <= 2 ? galat(429, rpc(HARI_PER, '1s')) : ok() });
  assert.equal(await w.jalankan(), 0);
  assert.deepEqual(w.panggilan.map(p => p.kunci), [K(1), K(2), K(2)]);
  assert.equal(w.t.sekarang, Date.UTC(2026, 10, 5, 8, 0, 0) + vo.JEDA_RESET);
});

test('status istirahat bertahan antar jalan: kunci yang masih istirahat tak disentuh; sesudah lewat dicoba lagi; berkas status rusak diabaikan', async () => {
  let k1Habis = true;
  const w = dunia({ kunci: [K(1), K(2)], naskah: [S1, S2], jawaban: p => p.kunci === K(1) && k1Habis ? galat(429, rpc(HARI_PER, '1s')) : ok() });
  assert.equal(await w.jalankan(), 0);
  const hapusWav = () => { for (const i of ['s1', 's2']) rmSync(join(w.keluar, i + '.wav')); w.panggilan.length = 0; };
  hapusWav();
  assert.equal(await w.jalankan(), 0);
  assert.deepEqual(w.panggilan.map(p => p.kunci), [K(2), K(2)], 'K1 masih istirahat (tersimpan di disk): tak boleh dipanggil');
  hapusWav(); w.t.sekarang = Date.UTC(2026, 10, 5, 8, 2, 0); k1Habis = false;
  assert.equal(await w.jalankan(), 0);
  assert.deepEqual(w.panggilan.map(p => p.kunci), [K(1), K(1)], 'sudah lewat reset: kunci pertama dipakai lagi');
  writeFileSync(w.statusBerkas, '{rusak'); hapusWav();
  assert.equal(await w.jalankan(), 0);
});

test('simpanStatus: entri kedaluwarsa dibuang; berkas hanya memuat hash 12 heks, tak pernah kunci', () => {
  const berkas = join(folder(), 'dalam', 'status.json'), id1 = vo.idKunci(K(1)), id2 = vo.idKunci(K(2));
  vo.simpanStatus(berkas, { [id1]: { sampai: 5000, alasan: 'menit' }, [id2]: { sampai: 9000, alasan: 'harian' } }, 6000);
  const isi = readFileSync(berkas, 'utf8');
  assert.deepEqual(JSON.parse(isi), { [id2]: { sampai: 9000, alasan: 'harian' } });
  assert.ok(!isi.includes(K(1)) && !isi.includes(K(2)));
  assert.deepEqual(vo.muatStatus(berkas), JSON.parse(isi));
  assert.deepEqual(vo.muatStatus(join(folder(), 'tidak-ada.json')), {});
});

test('kunci dari berkas bawaan ~/.wevai/gemini-kunci.txt, dan dari --kunci bila diberikan', async () => {
  const w = dunia({ jawaban: () => ok() });
  mkdirSync(join(w.rumah, '.wevai'));
  writeFileSync(join(w.rumah, '.wevai', 'gemini-kunci.txt'), `# tim video\n${K(1)}\n`);
  assert.equal(await w.jalankan(), 0); assert.equal(w.panggilan[0].kunci, K(1));
  writeFileSync(join(w.rumah, 'lain.txt'), `${K(2)}\n`);
  assert.equal(await w.jalankan(['--kunci', 'lain.txt', '--gaya', 'x']), 0);
  assert.equal(w.panggilan.at(-1).kunci, K(2), '--kunci menggantikan berkas bawaan (bukan menambah)');
});

test('--kunci ke berkas yang tidak ada = galat jelas (berkas bawaan yang tak ada boleh diam)', async () => {
  const w = dunia({ jawaban: () => ok() });
  assert.equal(await w.jalankan(['--kunci', 'tidak-ada.txt']), 1);
  assert.match(w.err.join('\n'), /Berkas kunci tidak ditemukan/);
});

test('jaring terakhir: kunci yang terselip di pesan galat server tetap tersamar di semua keluaran', async () => {
  const liar = 'AIzaSyZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';
  const w = dunia({ kunci: [K(1), K(2)], jawaban: p => p.kunci === K(1) ? galat(403, { code: 403, status: 'PERMISSION_DENIED', message: `Key ${K(1)} was reported as leaked; also ${liar}` }) : ok() });
  assert.equal(await w.jalankan(), 0);
  tanpaKunciUtuh(w, [K(1), K(2), liar]);
  assert.ok(w.log.some(l => l.includes(vo.samarkan(K(1))) && /leaked/.test(l)));
});

/* ---------- argumen, naskah, bantuan ---------- */
test('naskah berbahaya atau cacat ditolak SEBELUM apa pun dikirim atau ditulis: id dengan garis miring/titik, ganda, teks kosong, bukan larik, JSON rusak, berkas hilang', async () => {
  const kasus = [
    [[{ id: '../luar', teks: 'x' }], /"id" hanya boleh/], [[{ id: 'a/b', teks: 'x' }], /"id" hanya boleh/], [[{ id: '.rahasia', teks: 'x' }], /"id" hanya boleh/], [[{ id: 'a\\b', teks: 'x' }], /"id" hanya boleh/],
    [[S1, { id: 'S1', teks: 'y' }], /ganda/], [[{ id: 'a', teks: '  ' }], /teks/], [{}, /larik/], [[], /larik/], [[{ id: 'a', teks: 'x', suara: 5 }], /suara/],
  ];
  for (const [naskah, pola] of kasus) {
    const w = dunia({ kunci: [K(1)], naskah, jawaban: () => { throw new Error('jaringan dilarang'); } });
    assert.equal(await w.jalankan(), 1, JSON.stringify(naskah)); assert.match(w.err.join('\n'), pola); assert.equal(w.panggilan.length, 0);
    assert.ok(!existsSync(join(w.rumah, '..', 'luar.wav')) && !existsSync(join(w.rumah, 'luar.wav')));
  }
  const w = dunia({ kunci: [K(1)], jawaban: () => ok() });
  writeFileSync(w.naskahBerkas, '[{'); assert.equal(await w.jalankan(), 1); assert.match(w.err.join('\n'), /bukan JSON yang sah/);
  rmSync(w.naskahBerkas); w.err.length = 0; assert.equal(await w.jalankan(), 1); assert.match(w.err.join('\n'), /tidak ditemukan/);
});

test('argumen salah: opsi tak dikenal, nilai hilang, --paralel tak wajar, tanpa naskah atau dua naskah → galat Indonesia, kode 1', async () => {
  const w = dunia({ kunci: [K(1)], jawaban: () => ok() });
  for (const [arg, pola] of [[['--foo'], /Opsi tidak dikenal: --foo/], [[w.naskahBerkas, '--suara'], /butuh nilai/], [[w.naskahBerkas, '--paralel', '0'], /--paralel/],
    [[w.naskahBerkas, '--paralel', 'dua'], /--paralel/], [[], /Pakai: node scripts\/vo-gemini\.mjs/], [[w.naskahBerkas, 'lain.json'], /tepat satu/]]) {
    w.err.length = 0; assert.equal(await vo.jalankan(arg, w.deps), 1, arg.join(' ')); assert.match(w.err.join('\n'), pola);
  }
  assert.equal(w.panggilan.length, 0);
});

test('--help dan -h: mencetak komentar kepala lalu keluar 0 SEBELUM apa pun (opsi lain salah pun tak masalah; tanpa kunci, tanpa jaringan)', async () => {
  for (const arg of [['--help'], ['-h'], ['--foo', '--help'], ['naskah-tak-ada.json', '-h']]) {
    const w = dunia({ jawaban: () => { throw new Error('jaringan dilarang'); } });
    assert.equal(await vo.jalankan(arg, w.deps), 0, arg.join(' '));
    const out = w.log.join('\n');
    for (const pola of [/VO-GEMINI/, /--jangan-tunggu/, /--cek-kunci/, /--daftar-suara/, /PERINGATAN/, /per PROYEK/, /§2\(d\)/, /GEMINI_API_KEYS/]) assert.match(out, pola);
    assert.ok(!out.includes('/*') && !out.includes('*/') && !/^=+$/m.test(out), 'pagar komentar tidak boleh ikut tercetak');
    assert.equal(w.panggilan.length, 0); assert.equal(w.err.length, 0);
  }
});

test('dijalankan langsung (proses sungguhan, tanpa kunci apa pun): --help keluar 0; tanpa argumen keluar 1 dengan petunjuk; naskah tanpa kunci → galat cara memberi kunci', () => {
  const skrip = fileURLToPath(new URL('./vo-gemini.mjs', import.meta.url)), rumah = folder(), naskah = join(rumah, 'n.json');
  writeFileSync(naskah, JSON.stringify([S1]));
  const env = { ...process.env, GEMINI_API_KEY: '', GEMINI_API_KEYS: '', HOME: rumah, USERPROFILE: rumah };
  const a = spawnSync(process.execPath, [skrip, '--help'], { env, encoding: 'utf8' });
  assert.equal(a.status, 0); assert.match(a.stdout, /VO-GEMINI/);
  const b = spawnSync(process.execPath, [skrip], { env, encoding: 'utf8' });
  assert.equal(b.status, 1); assert.match(b.stderr, /Pakai: node scripts\/vo-gemini\.mjs/);
  const c = spawnSync(process.execPath, [skrip, naskah, '--keluar', join(rumah, 'vo')], { env, encoding: 'utf8' });
  assert.equal(c.status, 1); assert.match(c.stderr, /Tidak ada kunci Gemini API/); assert.match(c.stderr, /GEMINI_API_KEYS/); assert.match(c.stderr, /gemini-kunci\.txt/);
});

test('dijalankan lewat tautan simbolik/junction ke folder skrip (skill dipasang sebagai tautan): tetap berjalan, bukan diam-diam tak melakukan apa-apa', () => {
  const aslinya = fileURLToPath(new URL('.', import.meta.url)), rumah = folder(), tautan = join(rumah, 'skill-scripts');
  try { symlinkSync(aslinya, tautan, 'junction'); } catch (e) { return assert.ok(true, `tautan tak bisa dibuat di mesin ini (${e.code}); dilewati`); }
  const env = { ...process.env, GEMINI_API_KEY: '', GEMINI_API_KEYS: '', HOME: rumah, USERPROFILE: rumah };
  const r = spawnSync(process.execPath, [join(tautan, 'vo-gemini.mjs'), '--help'], { env, encoding: 'utf8' });
  try { unlinkSync(tautan); } catch { rmdirSync(tautan); }          // lepas tautan DULU: pembersihan rekursif tak boleh menyentuh folder asli
  assert.equal(r.status, 0); assert.match(r.stdout, /VO-GEMINI/, 'tidak mencetak apa pun: pemeriksaan "dijalankan langsung" gagal mengenali tautan');
});

test('--paralel 2: dua segmen sekaligus, tidak lebih; semuanya selesai', async () => {
  let aktif = 0, puncak = 0;
  const w = dunia({ kunci: [K(1)], naskah: [1, 2, 3, 4].map(i => ({ id: 'p' + i, teks: 't' + i })),
    jawaban: async () => { aktif++; puncak = Math.max(puncak, aktif); await new Promise(r => setImmediate(r)); aktif--; return ok(); } });
  assert.equal(await w.jalankan(['--paralel', '2']), 0);
  assert.equal(puncak, 2);
  assert.equal(readdirSync(w.keluar).filter(f => f.endsWith('.wav')).length, 4);
});

test('--paralel 2: dua 429 per menit serentak pada satu kunci dihitung SATU kali (istirahat tidak dilipatkan menjadi semenit)', async () => {
  let n = 0;
  const w = dunia({ kunci: [K(1)], naskah: [S1, S2], jawaban: async () => { await new Promise(r => setImmediate(r)); return ++n <= 2 ? galat(429, rpc(MENIT_PER, '30s')) : ok(); } });
  assert.equal(await w.jalankan(['--paralel', '2']), 0);
  assert.equal(w.t.sekarang, MULAI_PST + 30000, 'sekali istirahat 30 dtk, bukan 60');
  assert.deepEqual(w.status()[vo.idKunci(K(1))], { sampai: MULAI_PST + 30000, alasan: 'menit' });
});

test('lamaManusia: detik sampai 90 dtk, lalu menit, lalu jam', () => {
  assert.deepEqual([0, 37e3, 89e3, 120e3, 15 * 6e4, 3 * 36e5 + 5 * 6e4].map(vo.lamaManusia), ['0 dtk', '37 dtk', '89 dtk', '2 mnt', '15 mnt', '3 j 5 mnt']);
});

/* ---------- --cek-kunci dan --daftar-suara ---------- */
test('--cek-kunci: GET /v1beta/models per kunci (bukan TTS); cetak kunci tersamar | sah/tidak sah | status istirahat; hasilnya memperbarui status tersimpan', async () => {
  const w = dunia({ kunci: [K(1), K(2), K(3)], jawaban: p => p.kunci === K(2) ? kunciBuruk() : p.kunci === K(3) ? galat(429, rpc(HARI_PER, '1s')) : new Response(JSON.stringify({ models: [{ name: 'models/gemini-3.8-flash-tts' }] })) });
  mkdirSync(join(w.rumah, '.wevai'));
  writeFileSync(w.statusBerkas, JSON.stringify({ [vo.idKunci(K(1))]: { sampai: MULAI_PST + 5 * 3600e3, alasan: 'tidak-sah' }, [vo.idKunci(K(3))]: { sampai: MULAI_PST + 3600e3, alasan: 'harian' } }));
  assert.equal(await vo.jalankan(['--cek-kunci'], w.deps), 0);
  assert.equal(w.panggilan.length, 3);
  assert.ok(w.panggilan.every(p => p.metode === 'GET' && new URL(p.url).pathname === '/v1beta/models'), 'harus GET models, bukan panggilan TTS');
  const out = w.log.join('\n'), baris = k => out.split('\n').find(l => l.includes(vo.samarkan(k)));
  assert.match(baris(K(1)), /sah\s+siap/);                                          // sah → catatan lama "tidak-sah" dibersihkan
  assert.match(baris(K(2)), /tidak sah.*istirahat sampai.*\(tidak-sah\)/);
  assert.match(baris(K(3)), /sah \(kena batas\).*istirahat sampai.*\(harian\)/);
  assert.equal(w.status()[vo.idKunci(K(1))], undefined);
  assert.equal(w.status()[vo.idKunci(K(2))].alasan, 'tidak-sah');
  assert.equal(w.status()[vo.idKunci(K(3))].alasan, 'harian', 'kuota harian tidak diubah oleh cek keabsahan');
  tanpaKunciUtuh(w, [K(1), K(2), K(3)]);
});

test('--cek-kunci: semua tidak sah → kode 1; tanpa kunci → galat cara memberi kunci', async () => {
  const w = dunia({ kunci: [K(1)], jawaban: () => kunciBuruk() });
  assert.equal(await vo.jalankan(['--cek-kunci'], w.deps), 1);
  const w2 = dunia({ jawaban: () => ok() });
  assert.equal(await vo.jalankan(['--cek-kunci'], w2.deps), 1); assert.match(w2.err.join('\n'), /Tidak ada kunci Gemini API/);
});

test('--daftar-suara: GET /v1beta/voices?language_code=id-ID (bawaan) mengikuti next_page_token; --bahasa semua tanpa filter; --cari → search; kunci pertama gagal → kunci berikutnya', async () => {
  const hal1 = { voices: [{ type: 'prebuilt', id: 'Iapetus', display_name: 'Iapetus', language_code: 'id-ID', region_code: 'ID', accent: 'Standard', gender: 'male', pitch: 'low', description: 'Berwibawa' }], next_page_token: 'hal2' };
  const hal2 = { voices: [{ type: 'prebuilt', id: 'Kore', display_name: 'Kore', language_code: 'id-ID', accent: 'Jawa', gender: 'female', pitch: 'medium', description: 'Hangat' }] };
  const w = dunia({ kunci: [K(1), K(2)], jawaban: p => p.kunci === K(1) ? galat(429, rpc(MENIT_PER, '9s')) : new Response(JSON.stringify(new URL(p.url).searchParams.get('page_token') === 'hal2' ? hal2 : hal1)) });
  assert.equal(await vo.jalankan(['--daftar-suara'], w.deps), 0);
  const u = w.panggilan.filter(p => p.kunci === K(2)).map(p => new URL(p.url));
  assert.ok(u.every(x => x.pathname === '/v1beta/voices') && w.panggilan.every(p => p.metode === 'GET'));
  assert.equal(u[0].searchParams.get('language_code'), 'id-ID'); assert.equal(u[1].searchParams.get('page_token'), 'hal2');
  const out = w.log.join('\n');
  assert.match(out, /Iapetus.*id-ID.*Standard.*male/); assert.match(out, /Kore.*id-ID.*Jawa.*female/); assert.match(out, /--suara/);
  w.panggilan.length = 0;
  assert.equal(await vo.jalankan(['--daftar-suara', '--bahasa', 'semua', '--cari', 'jawa'], w.deps), 0);
  const v = new URL(w.panggilan.find(p => p.kunci === K(2)).url);
  assert.equal(v.searchParams.get('language_code'), null); assert.equal(v.searchParams.get('search'), 'jawa');
});

test('--daftar-suara: tidak ada hasil → saran; gagal di semua kunci → galat dengan alasannya', async () => {
  const kosong = dunia({ kunci: [K(1)], jawaban: () => new Response(JSON.stringify({})) });
  assert.equal(await vo.jalankan(['--daftar-suara'], kosong.deps), 0);
  assert.match(kosong.log.join('\n'), /Tidak ada suara.*--bahasa semua/s);
  const rusak = dunia({ kunci: [K(1)], jawaban: () => kunciBuruk() });
  assert.equal(await vo.jalankan(['--daftar-suara'], rusak.deps), 1);
  assert.match(rusak.err.join('\n'), /Daftar suara gagal.*API key not valid/s);
});
