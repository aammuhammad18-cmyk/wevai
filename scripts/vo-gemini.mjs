#!/usr/bin/env node
/* =========================================================
   VO-GEMINI: suara narasi (VO) dari Gemini TTS lewat API resmi Google, dengan beberapa kunci yang dipakai
   bergantian bila satu kunci kena batas. Tanpa dependensi (Node ≥ 18, fetch bawaan).

   Pakai:
     node scripts/vo-gemini.mjs naskah.json [--keluar audio/vo] [--model gemini-3.8-flash-tts] [--suara Iapetus]
                                [--gaya "hangat, tempo sedang"] [--paralel 1] [--jangan-tunggu] [--kunci berkas]
     node scripts/vo-gemini.mjs --cek-kunci [--kunci berkas]    tiap kunci: sah / tidak sah + status istirahat (tanpa kuota TTS)
     node scripts/vo-gemini.mjs --daftar-suara [--bahasa id-ID|semua] [--cari kata]   suara dari API (aksen regional dicari di sini)
   naskah.json: larik [{ "id": "p01", "teks": "…", "suara": "Kore", "gaya": "…" }]; suara & gaya opsional (menimpa opsi global).

   Keluaran per segmen: <keluar>/<id>.wav (24 kHz mono 16-bit) dan <id>.json {teks, suara, model, gaya, dur}.
   dur = jumlah sampel ÷ laju sampel, BUKAN taksiran ffprobe. Segmen yang json-nya cocok (teks, suara, model, gaya) dan
   wav-nya ada DILEWATI, jadi menjalankan ulang = melanjutkan. Segmen gagal (mis. ditolak filter konten, atau keluaran
   terpotong) dicatat dan didaftar di akhir; kunci tidak disalahkan. Satu segmen = satu permintaan: masukan maks. 8.192 token.

   Kunci (maks. 10, ganda dibuang), dipakai berurutan: env GEMINI_API_KEYS (pisah koma/spasi), env GEMINI_API_KEY, lalu
   berkas (--kunci, bawaan ~/.wevai/gemini-kunci.txt: satu kunci per baris, '#' = komentar). Simpan berkas di LUAR repo
   mana pun dan jangan di-commit. Kunci tak pernah dicetak atau ditulis utuh (AIza…k3Xy); status istirahat di
   ~/.wevai/gemini-kunci-status.json hanya memuat hash.

   Pindah kunci otomatis (kunci pertama dipakai sampai gagal; bukan bergilir):
     429 per menit      → kunci istirahat selama retryDelay (bawaan 60 dtk), langsung pindah
     429 per hari       → istirahat sampai tengah malam waktu Pasifik (reset kuota harian Google), pindah
     429 "limit: 0"     → model di luar paket kunci itu: dilewati di jalan ini saja (tidak disimpan, tergantung model);
                          bila semua kunci begitu, berhenti dengan saran --model lain (tidak menunggu)
     400/401/403 kunci  → dilewati 24 jam (tidak-sah), dilaporkan tersamar
     5xx / jaringan     → ulang pada kunci yang sama 1, 2, 4 dtk, lalu kunci berikutnya
   Semua kunci istirahat: ≤ 15 menit → tidur lalu lanjut; lebih lama → tunggu reset harian dan lanjut sendiri (jam
   lanjut dicatat dalam waktu lokal), atau dengan --jangan-tunggu berhenti (kode 2) sambil mencetak perintah ulang.

   PERINGATAN: kuota Gemini dihitung per PROYEK Google Cloud, bukan per kunci. Kunci dari satu proyek berbagi satu kuota,
   jadi kunci tambahan dari proyek yang sama tidak menambah apa pun. Syarat Google APIs §2(d) melarang menyiasati batas
   penggunaan. Pakai hanya kunci yang berhak Anda pakai (mis. proyek anggota tim yang berbeda, atau satu kunci berbayar
   sebagai cadangan). Rincian: references/alat-kerja.md › "VO Gemini (banyak kunci)".

   Kode keluar: 0 selesai · 1 galat atau ada segmen gagal · 2 menunggu reset (--jangan-tunggu)
   ========================================================= */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAKS_KUNCI = 10;
export const JEDA_RESET = 60e3;                           // dicoba lagi semenit SESUDAH tengah malam Pasifik: jam komputer tak persis jam Google
const MODEL = 'gemini-3.8-flash-tts', SUARA = 'Iapetus', BACKOFF = [1e3, 2e3, 4e3], JAM = 36e5, BATAS_PENDEK = 15 * 6e4;   // ≤ BATAS_PENDEK: tidur saja; lebih lama = menunggu reset harian
export class GalatPakai extends Error {}                  // salah pakai / konfigurasi: dicetak apa adanya, kode keluar 1
class Tunda extends Error { constructor(sampai) { super('menunggu'); this.sampai = sampai; } }   // --jangan-tunggu: kode keluar 2

/* ---------- kunci: urai, ganda, batas, samar ---------- */
export const samarkan = k => k.length > 8 ? `${k.slice(0, 4)}…${k.slice(-4)}` : '****';
export const idKunci = k => createHash('sha256').update(k).digest('hex').slice(0, 12);   // kunci status di disk: hash, bukan kunci
const sansBOM = s => s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
const urai = teks => sansBOM(String(teks ?? '')).split(/\r?\n/).map(b => b.replace(/#.*/, '')).join(' ').split(/[\s,]+/).filter(Boolean);

export function kumpulkanKunci({ env = {}, berkas, wajib = false }) {
  const semua = [...urai(env.GEMINI_API_KEYS), ...urai(env.GEMINI_API_KEY)];
  if (berkas && existsSync(berkas)) semua.push(...urai(readFileSync(berkas, 'utf8')));
  else if (berkas && wajib) throw new GalatPakai(`Berkas kunci tidak ditemukan: ${berkas}`);
  const unik = [...new Set(semua)];
  const rusak = unik.find(k => !/^[\w.-]{16,}$/.test(k));
  if (rusak) throw new GalatPakai(`Ada isi yang bukan kunci API (${samarkan(rusak)}): tulis satu kunci per baris, tanpa "NAMA=" dan tanpa tanda kutip.`);
  if (unik.length > MAKS_KUNCI) throw new GalatPakai(`${unik.length} kunci terlalu banyak: maksimal ${MAKS_KUNCI} (kunci ganda sudah dibuang). Kurangi dulu.`);
  return unik;
}

/* ---------- waktu: kuota harian Google reset tengah malam waktu Pasifik (Los Angeles, dengan DST) ---------- */
const FMT_LA = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
const dindingLA = ms => { const p = Object.fromEntries(FMT_LA.formatToParts(ms).map(x => [x.type, +x.value])); return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second); };   // jam dinding LA, dibaca "seolah UTC"
export function tengahMalamLA(ms) {
  const d = new Date(dindingLA(ms)), besok = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  let t = besok - (dindingLA(besok) - besok);
  return besok - (dindingLA(t) - t);   // putaran kedua cukup: DST berganti pukul 02.00, tidak pernah di tengah malam
}
export const waktuLokal = ms => new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);
export const lamaManusia = ms => { const m = Math.round(ms / 6e4); return ms < 9e4 ? `${Math.round(ms / 1e3)} dtk` : m < 120 ? `${m} mnt` : `${Math.floor(m / 60)} j ${m % 60} mnt`; };
export function durasiDetik(s) {         // "37s", "1m30s", "10h17m5.5s", "886ms" → detik; tak terbaca → null
  const t = [...String(s ?? '').matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)];
  return t.length ? t.reduce((a, [, n, u]) => a + +n * { h: 3600, m: 60, s: 1, ms: 1e-3 }[u], 0) : null;
}

/* ---------- API: bentuk permintaan & jawaban ada di DUA fungsi ini; ubah di sini bila Google mengubah dokumennya ----------
   Sumber: https://aistudio.google.com/docs/speech-generation (Interactions API; gaya = anotasi speech_metadata pada teks,
   suara = generation_config.speech_config, jawaban WAV 24 kHz mono 16-bit base64 di steps[].content[] bertipe audio). */
const API = 'https://generativelanguage.googleapis.com/v1beta';
export function bangunPermintaan(kunci, { model, teks, suara, gaya }) {
  const isi = { type: 'text', text: teks };
  if (gaya) isi.annotations = [{ type: 'speech_metadata', style: gaya }];
  return { url: `${API}/interactions`, init: { method: 'POST', headers: { 'x-goog-api-key': kunci, 'content-type': 'application/json' },
    body: JSON.stringify({ model, input: [{ type: 'user_input', content: [isi] }], response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice: suara }] } }) } };
}
export function ambilAudio(j) {          // → { audio: {pcm, laju, kanal} } | { gagal: alasan }. 'incomplete' ditolak: audionya bisa terpotong
  const konten = (j.steps ?? []).filter(s => s.type === 'model_output').flatMap(s => s.content ?? []);
  const rinci = [konten.find(c => c.type === 'text' && c.text) && `teks: "${konten.find(c => c.type === 'text' && c.text).text.slice(0, 120)}"`, j.errors?.length && `errors: ${JSON.stringify(j.errors).slice(0, 200)}`].filter(Boolean).join('; ');
  const status = j.status ?? 'completed', ket = rinci && ` (${rinci})`;
  if (status !== 'completed') return { gagal: `status ${status}${status === 'incomplete' ? ': audio mungkin terpotong, pecah teks jadi segmen lebih pendek' : ''}${ket}` };
  const a = konten.filter(c => c.type === 'audio' && c.data).at(-1);
  if (!a) return { gagal: `tanpa audio${ket}` };
  let audio; try { audio = bacaAudio(Buffer.from(a.data, 'base64'), a.sample_rate, a.channels); } catch (e) { return { gagal: `audio tak terbaca: ${e.message}` }; }
  return audio.pcm.length ? { audio } : { gagal: 'audio kosong (0 sampel)' };
}

/* ---------- galat HTTP → nasib kunci atau nasib segmen. Bentuk galat yang dikenali:
   klasik google.rpc  {error:{code:429, status:"RESOURCE_EXHAUSTED", details:[QuotaFailure{violations[].quotaId}, RetryInfo{retryDelay:"37s"}]}}
   Interactions API   {error:{code:"rate_limit_exceeded" | "quota_exceeded" | "too_many_requests" | "authentication" | …}}
   jenis: menit (tunda dtk) | harian | nol (limit: 0) | tidak-sah | server | segmen ---------- */
export function klasifikasi(status, teks, header = {}) {
  let j; try { j = JSON.parse(teks); } catch {}
  const e = (Array.isArray(j) ? j[0] : j)?.error ?? {}, kode = String(e.code ?? ''), st = String(e.status ?? ''), rinci = Array.isArray(e.details) ? e.details : [];
  const asli = String(e.message ?? (j ? '' : teks) ?? ''), pesan = `HTTP ${status}: ${asli.replace(/\s+/g, ' ').trim().slice(0, 200)}`;
  const kuota = rinci.flatMap(d => d.violations ?? []).map(v => `${v.quotaId ?? ''} ${v.quotaMetric ?? ''}`).join(' ');
  if (status === 429 || st === 'RESOURCE_EXHAUSTED' || /^(rate_limit_exceeded|quota_exceeded|too_many_requests)$/.test(kode)) {
    if (/\blimit:\s*0\b/.test(asli)) return { jenis: 'nol', pesan };                  // model ini tak termasuk paket kunci: menunggu reset tak menolong
    const menitKode = /^(rate_limit_exceeded|too_many_requests)$/.test(kode);
    // quotaId menang atas kode & teks; retryDelay TIDAK dipercaya untuk kuota harian (Google sendiri mengakuinya: bisa "1s")
    if (/PerDay/i.test(kuota) || kode === 'quota_exceeded' || (!/PerMinute/i.test(kuota) && !menitKode && /per day|daily|PerDay/i.test(asli))) return { jenis: 'harian', pesan };
    const tunda = durasiDetik(rinci.find(d => d.retryDelay)?.retryDelay) ?? durasiDetik(/retry in\s+([\d.hms]+)/i.exec(asli)?.[1]) ?? (Number(header['retry-after']) || 60);
    return { jenis: 'menit', tunda, pesan };
  }
  if (status === 401 || status === 403 || /^(authentication|permission_denied|failed_precondition)$/.test(kode) || /^(UNAUTHENTICATED|PERMISSION_DENIED|FAILED_PRECONDITION)$/.test(st)
    || (status === 400 && /API key (not valid|expired)|API_KEY_(INVALID|EXPIRED)/i.test(asli + JSON.stringify(rinci)))) return { jenis: 'tidak-sah', pesan };
  if (status >= 500 || status === 408 || status === 499) return { jenis: 'server', pesan };
  return { jenis: 'segmen', pesan };      // 400/404/413 lain: salah permintaan atau teks, bukan salah kunci
}

/* ---------- audio: WAV 24 kHz mono 16-bit; durasi dari jumlah sampel, tidak pernah dari ffprobe ---------- */
export function bungkusWav({ pcm, laju, kanal }) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(kanal, 22); h.writeUInt32LE(laju, 24); h.writeUInt32LE(laju * kanal * 2, 28); h.writeUInt16LE(kanal * 2, 32);
  h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
export const durasiPcm = ({ pcm, laju, kanal }) => pcm.length / (2 * kanal) / laju;
export function bacaAudio(b, laju = 24000, kanal = 1) {   // WAV (bawaan unary) atau PCM mentah audio/l16 → { pcm, laju, kanal }
  let pcm = b;
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WAVE') {
    let fmt, mulai = -1, n = 0;
    for (let p = 12; p + 8 <= b.length;) {
      const nama = b.toString('latin1', p, p + 4), u = b.readUInt32LE(p + 4);
      if (nama === 'fmt ') fmt = { f: b.readUInt16LE(p + 8), kanal: b.readUInt16LE(p + 10), laju: b.readUInt32LE(p + 12), bit: b.readUInt16LE(p + 22) };
      if (nama === 'data') { mulai = p + 8; n = u === 0 || u > b.length - mulai ? b.length - mulai : u; break; }   // WAV streaming: ukuran 0 / 0xFFFFFFFF = sampai akhir
      p += 8 + u + (u & 1);
    }
    if (!fmt || mulai < 0) throw new Error('WAV tak lengkap (blok fmt/data tidak ditemukan)');
    if (fmt.f !== 1 || fmt.bit !== 16) throw new Error(`WAV bukan PCM 16-bit (format ${fmt.f}, ${fmt.bit}-bit)`);
    ({ laju, kanal } = fmt); pcm = b.subarray(mulai, mulai + n);
  }
  return { pcm: pcm.subarray(0, pcm.length - pcm.length % (2 * kanal)), laju, kanal };
}

/* ---------- status istirahat kunci di disk: { <12 heks sha256 kunci>: { sampai (ms epoch), alasan } } ---------- */
export function muatStatus(berkas, sekarang = Date.now()) {      // tahan berkas rusak atau disunting: entri janggal dibuang; istirahat > 48 jam ke depan (jam komputer pernah salah) diabaikan
  let s; try { s = JSON.parse(readFileSync(berkas, 'utf8')); } catch { return {}; }
  return Object.fromEntries(Object.entries(s && typeof s === 'object' ? s : {}).filter(([, v]) => v && typeof v === 'object' && Number.isFinite(v.sampai) && typeof v.alasan === 'string' && v.sampai <= sekarang + 48 * JAM));
}
const tulisAtomik = (berkas, isi) => { writeFileSync(berkas + '.tmp', isi); renameSync(berkas + '.tmp', berkas); };
export function simpanStatus(berkas, status, sekarang) {
  for (const id of Object.keys(status)) if (!(status[id].sampai > sekarang)) delete status[id];     // yang sudah lewat tak berguna
  mkdirSync(dirname(berkas), { recursive: true });
  tulisAtomik(berkas, JSON.stringify(status, null, 1));
}

/* ---------- kolam kunci: siapa boleh dipakai sekarang, siapa istirahat sampai kapan ---------- */
function buatKolam({ kunci, status, d, catat, simpan, jangantunggu }) {
  const catatan = new Map(), beruntun = new Map(), nol = new Set(), sampai = k => status[idKunci(k)]?.sampai ?? 0, alasan = k => status[idKunci(k)]?.alasan;
  const aktif = k => sampai(k) > d.now(), mati = k => nol.has(k) || (aktif(k) && alasan(k) === 'tidak-sah');   // mati = menunggu pun tak menolong. 'nol' (limit: 0) bergantung pada model, jadi hanya di memori jalan ini
  const pesanMati = () => `Tidak ada kunci yang bisa dipakai:\n${kunci.map(k => `  ${samarkan(k)}  ${nol.has(k) ? 'nol' : alasan(k) ?? '-'}${catatan.get(k) ? ` — ${catatan.get(k)}` : ''}`).join('\n')}\n` +
    (nol.size ? 'limit: 0 = model ini tidak termasuk paket kunci tersebut: coba --model lain (mis. gemini-3.8-flash-lite-tts) atau pakai kunci berbayar.\n' : '') +
    'Periksa kuncinya dengan --cek-kunci, atau tambah kunci lain. Bila sudah diperbaiki, hapus ~/.wevai/gemini-kunci-status.json.';
  let dilaporkan = 0;
  async function tunggu(s) {              // tidur dipotong 30 dtk dan jam dinding dicek ulang: tahan laptop tidur dan jam yang digeser
    const sisa = s - d.now();
    if (sisa > BATAS_PENDEK && jangantunggu) throw new Tunda(s);
    if (dilaporkan !== s) { dilaporkan = s; catat(`Semua kunci istirahat; lanjut otomatis ${waktuLokal(s)} (${lamaManusia(sisa)} lagi${sisa > BATAS_PENDEK ? '; menunggu reset kuota harian, boleh ditutup dan dijalankan ulang kapan saja' : ''}).`); }
    while (d.now() < s) await d.sleep(Math.min(s - d.now(), 30e3));
  }
  return {
    berhasil: k => beruntun.delete(k),
    istirahatkan(k, { jenis, tunda, pesan }) {
      const t = d.now(); let s;
      if (jenis === 'nol') nol.add(k);
      else {
        if (jenis === 'harian') s = tengahMalamLA(t) + JEDA_RESET;
        else if (jenis === 'menit') {     // retryDelay kadang terlalu pendek: kena lagi SESUDAH istirahat (bukan 429 serentak dari --paralel) → minimal semenit
          const n = aktif(k) ? beruntun.get(k) ?? 1 : (beruntun.get(k) ?? 0) + 1; beruntun.set(k, n); s = t + Math.max(tunda, n > 1 ? 60 : 0) * 1e3;
        } else s = t + 24 * JAM;          // tidak-sah
        if (sampai(k) < s) { status[idKunci(k)] = { sampai: s, alasan: jenis }; simpan(); }
      }
      catatan.set(k, pesan);
      const ket = { menit: () => `kena batas per menit; istirahat ${lamaManusia(s - t)}`, harian: () => `kuota harian habis; istirahat sampai ${waktuLokal(s)} (reset tengah malam Pasifik)`,
        'tidak-sah': () => `tidak sah (${pesan}); dilewati 24 jam`, nol: () => `tanpa kuota untuk model ini (${pesan}); dilewati di jalan ini` }[jenis]();
      catat(`  ${samarkan(k)} ${ket}${kunci.some(x => x !== k && !aktif(x)) ? '; pindah kunci.' : '.'}`);
    },
    async ambil(dicoba = new Set()) {         // kunci siap berikutnya (urutan konfigurasi) | null bila semua sisanya sudah dicoba untuk segmen ini
      for (;;) {
        const hidup = kunci.filter(k => !mati(k));
        if (!hidup.length) throw new GalatPakai(pesanMati());
        const layak = hidup.filter(k => !dicoba.has(k));
        if (!layak.length) return null;
        const siap = layak.find(k => !aktif(k));
        if (siap) return siap;
        await tunggu(Math.min(...layak.map(sampai)));
      }
    },
  };
}

/* ---------- satu permintaan HTTP, lalu satu segmen (ulang 5xx pada kunci yang sama, pindah kunci bila perlu) ---------- */
async function panggil(d, req) {          // → { jenis:'ok', json } atau hasil klasifikasi; jaringan putus dihitung 'server'
  let res, teks;
  try { res = await d.fetch(req.url, { ...req.init, signal: AbortSignal.timeout(300e3) }); teks = await res.text(); }
  catch (e) { return { jenis: 'server', pesan: `jaringan: ${e.cause?.code ?? e.name}: ${e.message}` }; }
  if (!res.ok) return klasifikasi(res.status, teks, Object.fromEntries(res.headers.entries()));
  try { return { jenis: 'ok', json: JSON.parse(teks) }; } catch { return { jenis: 'server', pesan: 'jawaban 200 bukan JSON' }; }
}
async function cobaKunci(d, k, meta, catat) {
  for (let i = 0; ; i++) {
    const r = await panggil(d, bangunPermintaan(k, meta));
    if (r.jenis !== 'server' || i === BACKOFF.length) return r;
    catat(`  ${samarkan(k)}: ${r.pesan}; ulang dalam ${BACKOFF[i] / 1e3} dtk (${i + 1}/${BACKOFF.length}).`);
    await d.sleep(BACKOFF[i]);
  }
}
async function sintesis(meta, { d, kolam, catat }) {      // → { audio, kunci } | { gagal }
  const dicoba = new Set(); let akhir = '';
  for (;;) {
    const k = await kolam.ambil(dicoba);
    if (!k) return { gagal: `server Gemini tak menjawab di ${dicoba.size} kunci (${akhir})` };
    const r = await cobaKunci(d, k, meta, catat);
    if (r.jenis === 'ok') { kolam.berhasil(k); return { ...ambilAudio(r.json), kunci: k }; }
    if (r.jenis === 'segmen') return { gagal: r.pesan };
    if (r.jenis === 'server') { dicoba.add(k); akhir = r.pesan; catat(`  ${samarkan(k)}: ${r.pesan}; pindah kunci.`); continue; }
    kolam.istirahatkan(k, r);
  }
}

/* ---------- naskah & argumen ---------- */
export function periksaNaskah(n) {
  if (!Array.isArray(n) || !n.length) throw new GalatPakai('Naskah harus larik JSON yang tidak kosong: [{"id":"p01","teks":"…"}, …]');
  const lihat = new Set();
  n.forEach((s, i) => {
    const t = `Naskah segmen ke-${i + 1}`;
    if (!s || typeof s !== 'object') throw new GalatPakai(`${t}: harus objek {id, teks}.`);
    if (typeof s.id !== 'string' || !/^[A-Za-z0-9_](?:[A-Za-z0-9_.-]*[A-Za-z0-9_-])?$/.test(s.id)) throw new GalatPakai(`${t}: "id" hanya boleh huruf, angka, _ - . (tanpa spasi atau garis miring; id menjadi nama berkas), dapat ${JSON.stringify(s.id)}.`);
    if (lihat.has(s.id.toLowerCase())) throw new GalatPakai(`${t}: id "${s.id}" ganda (nama berkas tak peka huruf besar-kecil).`);
    lihat.add(s.id.toLowerCase());
    if (typeof s.teks !== 'string' || !s.teks.trim()) throw new GalatPakai(`${t} (${s.id}): "teks" kosong atau bukan string.`);
    for (const f of ['suara', 'gaya']) if (s[f] != null && typeof s[f] !== 'string') throw new GalatPakai(`${t} (${s.id}): "${f}" harus string.`);
  });
  return n;
}
const OPSI = { keluar: 's', model: 's', suara: 's', gaya: 's', paralel: 's', kunci: 's', bahasa: 's', cari: 's', 'jangan-tunggu': 'b', 'cek-kunci': 'b', 'daftar-suara': 'b' };
export function uraiArgumen(argv) {
  const o = { keluar: 'audio/vo', model: MODEL, suara: SUARA, paralel: '1', bahasa: 'id-ID' }, posisi = [];
  for (let i = 0; i < argv.length; i++) {
    const m = /^--([^=]+)(?:=([\s\S]*))?$/.exec(argv[i]);
    if (!m) { posisi.push(argv[i]); continue; }
    if (!OPSI[m[1]]) throw new GalatPakai(`Opsi tidak dikenal: --${m[1]}. Lihat: node scripts/vo-gemini.mjs --help`);
    if (OPSI[m[1]] === 'b') { o[m[1]] = true; continue; }
    const v = m[2] ?? argv[++i];
    if (v === undefined) throw new GalatPakai(`Opsi --${m[1]} butuh nilai.`);
    o[m[1]] = v;
  }
  const p = Number(o.paralel);
  if (!Number.isInteger(p) || p < 1 || p > MAKS_KUNCI) throw new GalatPakai(`--paralel harus bilangan bulat 1–${MAKS_KUNCI}, dapat "${o.paralel}".`);
  return { o: { ...o, paralel: p }, posisi };
}
const bacaJson = berkas => {
  let teks; try { teks = readFileSync(berkas, 'utf8'); } catch { throw new GalatPakai(`Berkas naskah tidak ditemukan: ${berkas}`); }
  try { return JSON.parse(sansBOM(teks)); } catch (e) { throw new GalatPakai(`${berkas} bukan JSON yang sah: ${e.message}`); }
};
const tutup = (s, kunci) => kunci.reduce((a, k) => a.split(k).join(samarkan(k)), String(s)).replace(/AIza[\w-]{20,}/g, samarkan);   // jaring terakhir: kunci tak boleh lolos ke log
const kutip = a => /^[\w@%+=:,./\\-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`;
export const perintahUlang = (skrip, argv) => ['node', skrip, ...argv].map(kutip).join(' ');

/* ---------- program utama ---------- */
const PEMAKAIAN = 'Pakai: node scripts/vo-gemini.mjs naskah.json [--keluar audio/vo] [--model …] [--suara …] [--gaya "…"] [--paralel N] [--jangan-tunggu] [--kunci berkas]\n' +
  '       node scripts/vo-gemini.mjs --cek-kunci | --daftar-suara          Rincian lengkap: --help';
const nyata = () => ({ fetch: (...a) => globalThis.fetch(...a), now: Date.now, sleep: ms => new Promise(r => setTimeout(r, ms)), log: console.log, err: console.error, env: process.env, home: homedir(), cwd: process.cwd(), skrip: process.argv[1] });

const bantuan = () => /\/\*([\s\S]*?)\*\//.exec(readFileSync(fileURLToPath(import.meta.url), 'utf8'))[1]     // komentar kepala berkas ini = teks bantuan
  .split('\n').filter(b => !/^\s*=+\s*$/.test(b)).map(b => b.replace(/^ {3}/, '')).join('\n').trim();

export async function jalankan(argv, deps = {}) {      // → kode keluar. Semua sentuhan dunia luar (fetch, jam, tidur, env, rumah) bisa disuntik
  const d = { ...nyata(), ...deps, rahasia: [] };
  if (argv.includes('--help') || argv.includes('-h')) { d.log(bantuan()); return 0; }      // sebelum apa pun
  try { return await utama(argv, d); }
  catch (e) {
    if (e instanceof Tunda) {
      d.err(tutup(`Semua kunci istirahat sampai ${waktuLokal(e.sampai)} (waktu lokal); berhenti karena --jangan-tunggu.\n` +
        `Lanjutkan nanti dengan perintah yang sama (yang sudah jadi dilewati):\n  ${perintahUlang(d.skrip, argv)}`, d.rahasia));
      return 2;
    }
    if (!(e instanceof GalatPakai)) throw e;
    d.err(`vo-gemini: ${tutup(e.message, d.rahasia)}`); return 1;
  }
}

async function utama(argv, d) {
  const { o, posisi } = uraiArgumen(argv), wevai = join(d.home, '.wevai'), berkasStatus = join(wevai, 'gemini-kunci-status.json');
  const berkasKunci = o.kunci ? resolve(d.cwd, o.kunci) : join(wevai, 'gemini-kunci.txt');
  const ambilKunci = () => {
    const kunci = kumpulkanKunci({ env: d.env, berkas: berkasKunci, wajib: !!o.kunci });
    if (!kunci.length) throw new GalatPakai(`Tidak ada kunci Gemini API. Berikan salah satu (maksimal ${MAKS_KUNCI}, dipakai berurutan):\n` +
      '  1) variabel lingkungan  GEMINI_API_KEYS="kunci1,kunci2"  atau  GEMINI_API_KEY=kunci\n' +
      `  2) berkas teks, satu kunci per baris ('#' = komentar): ${berkasKunci}  (atau pilih berkas lain dengan --kunci <berkas>)\n` +
      'Buat kunci di https://aistudio.google.com/apikey. Simpan berkasnya di luar repo mana pun dan jangan di-commit.\n' +
      'Kuota Google dihitung per PROYEK, bukan per kunci: baca peringatan di --help sebelum menambah kunci.');
    d.rahasia.push(...kunci); return kunci;
  };
  if (o['cek-kunci'] || o['daftar-suara']) {
    const kunci = ambilKunci(), catat = s => d.log(tutup(s, kunci)), status = muatStatus(berkasStatus, d.now());
    return o['cek-kunci'] ? cekKunci(kunci, status, d, catat, () => simpanStatus(berkasStatus, status, d.now())) : daftarSuara(kunci, o, d, catat);
  }
  if (posisi.length !== 1) throw new GalatPakai(posisi.length ? 'Beri tepat satu berkas naskah.\n' + PEMAKAIAN : PEMAKAIAN);
  const naskah = periksaNaskah(bacaJson(resolve(d.cwd, posisi[0]))), keluar = resolve(d.cwd, o.keluar);
  mkdirSync(keluar, { recursive: true });
  const kerja = naskah.map(s => ({ id: s.id, meta: { teks: s.teks, suara: s.suara ?? o.suara, model: o.model, gaya: s.gaya ?? o.gaya ?? '' }, wav: join(keluar, `${s.id}.wav`), js: join(keluar, `${s.id}.json`) }));
  const sudah = k => { try { const l = JSON.parse(readFileSync(k.js, 'utf8')); return existsSync(k.wav) && ['teks', 'suara', 'model', 'gaya'].every(f => l[f] === k.meta[f]); } catch { return false; } };
  const sisa = kerja.filter(k => !sudah(k)), hasil = { baru: 0, detik: 0, gagal: [] };
  const ringkas = () => {
    const belum = sisa.length - hasil.baru - hasil.gagal.length;
    d.log(`Ringkasan: ${hasil.baru} baru (${lamaManusia(hasil.detik * 1e3)} audio), ${kerja.length - sisa.length} dilewati, ${hasil.gagal.length} gagal${belum ? `, ${belum} belum dikerjakan` : ''}.`);
    if (hasil.gagal.length) d.log(`Gagal (jalankan ulang untuk mencoba lagi):\n${hasil.gagal.map(([id, a]) => `  ${id}  ${tutup(a, d.rahasia)}`).join('\n')}`);
  };
  if (sisa.length) {
    const kunci = ambilKunci(), catat = s => d.log(tutup(s, kunci)), status = muatStatus(berkasStatus, d.now());
    const kolam = buatKolam({ kunci, status, d, catat, jangantunggu: o['jangan-tunggu'], simpan: () => simpanStatus(berkasStatus, status, d.now()) }), ctx = { d, kolam, catat };
    let selesai = 0;
    try {
      await antrian(sisa, o.paralel, async k => {
        const r = await sintesis(k.meta, ctx);
        if (r.gagal) { hasil.gagal.push([k.id, r.gagal]); catat(`[${++selesai}/${sisa.length}] ${k.id} GAGAL: ${r.gagal}`); return; }
        const dur = durasiPcm(r.audio);
        tulisAtomik(k.wav, bungkusWav(r.audio)); tulisAtomik(k.js, JSON.stringify({ ...k.meta, dur }));   // json terakhir: dialah tanda "selesai"
        hasil.baru++; hasil.detik += dur;
        catat(`[${++selesai}/${sisa.length}] ${k.id} ${dur.toFixed(2)} dtk (${samarkan(r.kunci)})`);
      });
    } finally { ringkas(); }          // juga saat berhenti di tengah (kunci habis / --jangan-tunggu): tunjukkan apa yang sudah jadi
  } else ringkas();
  return hasil.gagal.length ? 1 : 0;
}
async function cekKunci(kunci, status, d, catat, simpan) {      // GET /models: memeriksa keabsahan tanpa memakai kuota TTS
  catat(`Memeriksa ${kunci.length} kunci lewat GET /v1beta/models (tidak memakai kuota TTS):`);
  let sah = 0;
  for (const k of kunci) {
    const r = await panggil(d, { url: `${API}/models?pageSize=1`, init: { method: 'GET', headers: { 'x-goog-api-key': k } } }), id = idKunci(k);
    const ket = r.jenis === 'ok' ? 'sah' : r.jenis === 'tidak-sah' ? 'tidak sah' : ['menit', 'harian', 'nol'].includes(r.jenis) ? 'sah (kena batas)' : 'tak terjawab';
    if (ket.startsWith('sah')) sah++;
    if (r.jenis === 'ok' && status[id]?.alasan === 'tidak-sah') { delete status[id]; simpan(); }                       // sudah diperbaiki: bersihkan catatan lama
    if (r.jenis === 'tidak-sah') { status[id] = { sampai: d.now() + 24 * JAM, alasan: 'tidak-sah' }; simpan(); }
    const s = status[id];
    catat(`  ${samarkan(k)}  ${ket.padEnd(16)}  ${s && s.sampai > d.now() ? `istirahat sampai ${waktuLokal(s.sampai)} (${s.alasan})` : 'siap'}${ket.startsWith('sah') ? '' : `  — ${r.pesan}`}`);
  }
  catat(`${sah} dari ${kunci.length} kunci sah.`);
  return sah ? 0 : 1;
}
async function daftarSuara(kunci, o, d, catat) {      // GET /voices (halaman demi halaman) dengan kunci pertama yang menjawab
  let alasan = '';
  for (const k of kunci) {
    const q = new URLSearchParams({ page_size: '100' }), suara = []; let gagal;
    if (o.bahasa !== 'semua') q.set('language_code', o.bahasa);
    if (o.cari) q.set('search', o.cari);
    for (let h = 0; h < 20; h++) {
      const r = await panggil(d, { url: `${API}/voices?${q}`, init: { method: 'GET', headers: { 'x-goog-api-key': k } } });
      if (r.jenis !== 'ok') { gagal = r; break; }
      suara.push(...(r.json.voices ?? []));
      if (!r.json.next_page_token) break;
      q.set('page_token', r.json.next_page_token);
    }
    if (gagal) { alasan = gagal.pesan; continue; }
    if (!suara.length) { catat(`Tidak ada suara untuk bahasa ${o.bahasa}${o.cari ? ` dengan kata "${o.cari}"` : ''}. Coba: --bahasa semua --cari <kata>`); return 0; }
    const baris = [['id', 'nama', 'bahasa', 'wilayah', 'aksen', 'gender', 'nada', 'keterangan'], ...suara.map(v => [v.id, v.display_name, v.language_code, v.region_code, v.accent, v.gender, v.pitch, String(v.description ?? '').slice(0, 60)].map(x => String(x ?? '-')))];
    const lebar = baris[0].map((_, i) => Math.min(28, Math.max(...baris.map(b => b[i].length))));
    catat(`Suara dari GET /v1beta/voices (bahasa ${o.bahasa}${o.cari ? `, cari "${o.cari}"` : ''}): ${suara.length}`);
    for (const b of baris) catat('  ' + b.map((x, i) => x.padEnd(lebar[i])).join('  ').trimEnd());
    catat('Pakai isi kolom id: --suara <id>, atau "suara" per segmen di naskah.json. Aksen regional: lihat kolom aksen dan wilayah; perluas dengan --bahasa semua --cari <kata>.');
    return 0;
  }
  throw new GalatPakai(`Daftar suara gagal di semua kunci: ${alasan}`);
}
async function antrian(daftar, n, fn) {       // n pekerja mengambil dari satu antrean; galat fatal menghentikan pembagian tugas baru
  let i = 0, fatal;
  await Promise.all(Array.from({ length: Math.min(n, daftar.length) }, async () => {
    while (!fatal && i < daftar.length) { try { await fn(daftar[i++]); } catch (e) { fatal ??= e; } }
  }));
  if (fatal) throw fatal;
}

/* dijalankan langsung (bukan di-import oleh uji). Bandingkan jalur NYATA: skill sering dipasang lewat tautan/junction, dan import.meta.url sudah menunjuk jalur nyata */
const langsung = (() => { try { return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (langsung)
  jalankan(process.argv.slice(2)).then(kode => { process.exitCode = kode; }, e => { console.error(e); process.exitCode = 1; });
