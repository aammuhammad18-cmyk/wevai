# Notifikasi dan Pembaruan WeVai: Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saat WeVai dipakai, agen memberi tahu bila ada rilis baru, lalu pengguna memilih update sekarang, nanti, atau
melewati versi itu. Update hanya berjalan sesudah dipilih dan ditolak bila tidak aman.

**Architecture:**
- Logika ada di `scripts/pembaruan.mjs`, tanpa dependensi. Jaringan, jam, perintah luar, dan daftar proses
  disuntikkan supaya bisa diuji tanpa jaringan.
- `scripts/wevai.mjs` adalah CLI tipis (subperintah `versi` dan `update`). CLI ini nanti juga menampung `status`, `kunci`,
  dan lainnya dari rencana 1.5 berikutnya.
- Satu kalimat di langkah 0 `SKILL.md` menyuruh agen menjalankan `wevai.mjs versi` sekali per sesi.

**Tech Stack:** Node ≥ 18 (fetch bawaan, `node:test`), git, GitHub Releases API.

**Spec:** `docs/superpowers/specs/2026-11-06-wevai-1.5-design.md` §5.10 (ditambah §5.9 untuk aturan berkas render).

## Global Constraints

- Tanpa dependensi npm baru. Node ≥ 18.
- Repo publik: tanpa path pribadi, nama pengguna, kunci, atau email di kode dan tes. `User-Agent: wevai-cek-update`.
- Sumber rilis: `https://api.github.com/repos/aammuhammad18-cmyk/wevai/releases/latest`. Bisa ditimpa env
  `WEVAI_RILIS_URL` (untuk tes dan fork).
- Status di `~/.wevai/pembaruan.json`. Cek paling sering sekali per 24 jam, batas waktu permintaan 3 000 ms. Saat
  offline atau API gagal: diam, tanpa pesan galat.
- Matikan cek: env `WEVAI_CEK_UPDATE=0` atau `~/.wevai/pengaturan.json` berisi `{"cekUpdate": false}`.
- Tidak pernah update tanpa perintah eksplisit `wevai.mjs update`. `versi` selalu keluar 0 dan tidak pernah menghalangi
  tugas.
- `update` ditolak (kode keluar 3) bila render berjalan, ada perubahan berkas terlacak, atau cabang bukan `main`.
  Sebutkan alasannya; jangan memaksa.
- Antigravity (`agy` 1.5.0) tidak punya perintah update: hanya tampilkan perintah pasang ulang, jangan dijalankan.
- Badan `SKILL.md` ≤ 24 000 byte (`node scripts/context-budget.mjs --check`). Sisa ±340 byte.
- Pesan untuk pengguna dalam bahasa Indonesia.
- Jangan ubah `scripts/export-frames.mjs`. Pengerjaan di worktree; `main` di folder skill tetap dipakai render produksi.

## Review Focus

1. API GitHub membalas 403/429 (batas laju tanpa token 60/jam), HTML, atau JSON tanpa `tag_name` → `versi` diam dan
   keluar 0 (tes di Task 2).
2. Perbandingan versi numerik: `1.10.0` > `1.9.0`; tag `v1.5.0` dan `1.5.0` setara (Task 1).
3. `pembaruan.json` rusak, kosong, atau `dicek` di masa depan (jam pernah salah) → dianggap kosong dan cek ulang (Task 1
   dan 2).
4. `main` lokal sudah di depan tag atau bercabang → `merge --ff-only` gagal → pesan jelas, tidak ada perubahan
   (Task 3).
5. Path Windows dengan spasi dan garis miring terbalik (`C:\Users\A B\.claude\plugins\cache\mp\wevai\1.4.1`) dikenali
   sebagai plugin Claude (Task 1).

---

### Task 1: Inti murni (versi, jenis pasang, status, pesan)

**Files:**
- Create: `scripts/pembaruan.mjs`
- Test: `scripts/test-pembaruan.mjs`

**Interfaces:**
- Produces:
  - `bandingVersi(a: string, b: string) -> -1|0|1`: awalan `v` diabaikan; bentuk selain `X.Y.Z` dilempar `Error`.
  - `versiTerpasang(akar: string) -> string`: dari baris `  version: "X.Y.Z"` di `SKILL.md`.
  - `jenisPasang(akar: string, ada = existsSync) -> 'claude'|'antigravity'|'git'|'zip'`, dengan urutan:
    1. path (dinormalkan ke `/`, huruf kecil) memuat `/.claude/plugins/cache/` → `claude`;
    2. memuat `/.gemini/config/plugins/` → `antigravity`;
    3. ada `<akar>/.git` → `git`;
    4. selain itu → `zip`.
  - `marketplaceClaude(akar: string) -> string|null`: segmen sesudah `plugins/cache/`.
  - `muatStatus(berkas: string, sekarang: number) -> object`: berkas hilang, rusak, atau bukan objek → `{}`.
    `dicek > sekarang` → `dicek` dihapus.
  - `simpanStatus(berkas: string, status: object) -> void`: buat folder bila perlu.
  - `pesanNotifikasi(status, terpasang: string, sekarang: number) -> string|null`. Hasilnya `null` bila salah satu benar:
    `status.terbaru` kosong, `bandingVersi(status.terbaru, terpasang) <= 0`, `status.lewati === status.terbaru`, atau
    `status.tundaSampai > sekarang`. Selain itu hasilnya teks seperti di Step 1.

- [ ] **Step 1: Tulis tes yang gagal** di `scripts/test-pembaruan.mjs` (pola `scripts/test-vo.mjs`: `node:test`, folder
  sementara dibersihkan saat `exit`):

```js
test('bandingVersi: numerik, awalan v', () => {
  assert.equal(p.bandingVersi('1.10.0', '1.9.0'), 1);
  assert.equal(p.bandingVersi('v1.5.0', '1.5.0'), 0);
  assert.equal(p.bandingVersi('1.4.1', 'v1.5.0'), -1);
  assert.throws(() => p.bandingVersi('1.5', '1.5.0'));
});
test('jenisPasang: path Windows berspasi dan urutan', () => {
  const tidakAda = () => false, adaGit = f => f.replace(/\\/g, '/').endsWith('/.git');
  assert.equal(p.jenisPasang('C:\\Users\\A B\\.claude\\plugins\\cache\\mp\\wevai\\1.4.1', adaGit), 'claude');
  assert.equal(p.marketplaceClaude('C:\\Users\\A B\\.claude\\plugins\\cache\\mp\\wevai\\1.4.1'), 'mp');
  assert.equal(p.jenisPasang('/home/a/.gemini/config/plugins/wevai', adaGit), 'antigravity');
  assert.equal(p.jenisPasang('/srv/wevai', adaGit), 'git');
  assert.equal(p.jenisPasang('/srv/wevai', tidakAda), 'zip');
});
test('muatStatus: rusak/kosong/masa depan', () => {
  // tulis '{rusak', '', '[]' → {}; { dicek: sekarang + 1e9, terbaru: '1.5.0' } → tanpa dicek, terbaru tetap
});
test('pesanNotifikasi: tampil, lewati, tunda, tidak lebih baru', () => {
  const s = { terbaru: '1.5.0', catatan: '- satu\n- dua\n- tiga\n- empat\n- lima\n- enam', url: 'https://x/rilis' };
  const m = p.pesanNotifikasi(s, '1.4.1', 0);
  assert.match(m, /WeVai 1\.5\.0 tersedia \(terpasang 1\.4\.1\)/);
  assert.match(m, /- lima/); assert.doesNotMatch(m, /- enam/);           // maksimal 5 baris catatan
  for (const x of ['wevai.mjs" update', 'update --nanti', 'update --lewati']) assert.ok(m.includes(x));
  assert.equal(p.pesanNotifikasi({ ...s, lewati: '1.5.0' }, '1.4.1', 0), null);
  assert.equal(p.pesanNotifikasi({ ...s, tundaSampai: 10 }, '1.4.1', 5), null);
  assert.equal(p.pesanNotifikasi(s, '1.5.0', 0), null);
});
```

  Bentuk pesan: baris pertama `WeVai <terbaru> tersedia (terpasang <terpasang>).`, lalu ≤ 5 baris tak kosong pertama
  dari `catatan`, lalu `Catatan lengkap: <url>`, lalu tiga pilihan, masing-masing dengan perintah lengkapnya:
  - update sekarang: `node "<folder skill>/scripts/wevai.mjs" update`;
  - nanti: `… update --nanti`;
  - lewati versi ini: `… update --lewati`.

- [ ] **Step 2:** `node --test scripts/test-pembaruan.mjs` → FAIL (modul belum ada).
- [ ] **Step 3:** Tulis fungsi-fungsi di `scripts/pembaruan.mjs` dengan kepala komentar gaya skrip lain.
- [ ] **Step 4:** `node --test scripts/test-pembaruan.mjs` → semua PASS.
- [ ] **Step 5:** Commit: `pembaruan: inti versi, jenis pasang, status, pesan`.

### Task 2: Cek rilis dengan cache dan opt-out

**Files:**
- Modify: `scripts/pembaruan.mjs`
- Test: `scripts/test-pembaruan.mjs`

**Interfaces:**
- Consumes: `muatStatus`, `simpanStatus`, `pesanNotifikasi`, `versiTerpasang` (Task 1).
- Produces:
  - `cekAktif({ env, rumah }) -> boolean`: `env.WEVAI_CEK_UPDATE === '0'` atau `pengaturan.json` dengan
    `cekUpdate === false` → `false`.
  - `async cekRilis({ fetch, sekarang, berkas, url, paksa = false }) -> object`: mengembalikan status (dari
    `muatStatus`). Bila `paksa` atau `sekarang - (dicek ?? 0) >= 86_400_000`: GET `url` dengan
    `signal: AbortSignal.timeout(3000)`, header `Accept: application/vnd.github+json` dan `User-Agent: wevai-cek-update`.
    - Bila sukses (`ok` dan ada `tag_name`): `terbaru` = tag tanpa `v`, `catatan` = `body`, `url` = `html_url`,
      `dicek` = `sekarang`, lalu simpan. Bila `terbaru` berubah, hapus `tundaSampai`.
    - Bila gagal apa pun (jaringan, batas waktu, bukan 2xx, JSON rusak, tanpa `tag_name`): kembalikan status lama tanpa
      menulis dan tanpa melempar.

- [ ] **Step 1: Tes gagal:**
  - `cekRilis` memanggil fetch sekali, lalu tidak memanggil lagi dalam 24 jam; memanggil lagi sesudah 24 jam atau bila
    `paksa`;
  - balasan 403 → status lama, berkas tidak berubah (Review Focus 1);
  - balasan `text/html` atau JSON tanpa `tag_name` → status lama;
  - fetch melempar (simulasi offline) → tidak melempar;
  - `terbaru` berubah dari `1.5.0` ke `1.5.1` → `tundaSampai` hilang, `lewati: '1.5.0'` tetap ada, sehingga notifikasi
    `1.5.1` muncul;
  - `cekAktif`: env `'0'` → false; `pengaturan.json` `{"cekUpdate": false}` → false; berkas rusak → true.
  Semua fetch disuntikkan; tanpa jaringan.
- [ ] **Step 2:** Jalankan tes → FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Jalankan tes → PASS.
- [ ] **Step 5:** Commit: `pembaruan: cek rilis GitHub, cache 24 jam, diam saat gagal`.

### Task 3: Menjalankan update dengan pengaman

**Files:**
- Modify: `scripts/pembaruan.mjs`
- Test: `scripts/test-pembaruan.mjs`

**Interfaces:**
- Consumes: Task 1 dan 2.
- Produces:
  - `renderBerjalan({ daftarProses }) -> boolean`: `true` bila ada baris perintah proses yang memuat `export-frames.mjs`
    atau `antre-render.mjs`. `daftarProses()` bawaan memakai:
    - Windows: `powershell -NoProfile -Command "Get-CimInstance Win32_Process | % CommandLine"`;
    - lainnya: `ps -eo args`.
    Bila daftar proses gagal dibaca, anggap `true` dan sebutkan alasannya, karena menolak lebih aman.
  - `async jalankanUpdate({ akar, status, pilihan, jalan, daftarProses, sekarang, berkas, log }) -> number` (kode
    keluar):
    - `pilihan`: `'sekarang' | 'nanti' | 'lewati' | 'kembali'`.
    - `jalan(cmd, args, { cwd }) -> { status, stdout, stderr }` mengikuti `spawnSync`.
    - `nanti`: `tundaSampai = sekarang + 86_400_000`, simpan, kode 0.
    - `lewati`: `lewati = status.terbaru`, simpan, kode 0.
    - `sekarang` untuk jenis `git`:
      1. tolak dengan kode 3 bila render berjalan, `git status --porcelain --untracked-files=no` tidak kosong, atau
         `git rev-parse --abbrev-ref HEAD` ≠ `main`;
      2. `git fetch --tags origin`, lalu `git merge --ff-only v<terbaru>`. Bila merge gagal: kode 1 dengan pesan
         "main lokal tidak bisa maju lurus ke v<terbaru>; tidak ada yang diubah";
      3. sebelum merge, simpan `sebelumnya` = `git rev-parse HEAD` di status;
      4. sesudah merge jalankan `node scripts/bump-version.mjs --check`, lalu cetak versi baru dan catatan.
    - `sekarang` untuk jenis `claude`: tolak bila render berjalan. Jalankan `claude plugin marketplace update <mp>` lalu
      `claude plugin update wevai@<mp>`, kemudian cetak "Mulai ulang sesi Claude Code agar versi baru dimuat". Bila
      `claude` tidak ada di PATH, cetak kedua perintah untuk dijalankan manual, kode 1.
    - `sekarang` untuk jenis `antigravity`: cetak
      `agy plugin install https://github.com/aammuhammad18-cmyk/wevai` serta catatan bahwa `agy` tidak punya perintah
      update dan perilaku timpa belum diverifikasi. Jangan dijalankan; kode 0.
    - `sekarang` untuk jenis `zip`: cetak `status.url`, kode 0.
    - `kembali` (hanya `git`): pengaman sama; tanpa `sebelumnya` → kode 1. `git reset --keep <sebelumnya>`, lalu
      `lewati = versi yang ditinggalkan`.

- [ ] **Step 1: Tes gagal.** Pakai git sungguhan di folder sementara:
  - buat repo asal bare;
  - klon, commit dengan `SKILL.md` berisi `  version: "1.0.0"`, lalu tag `v1.0.0`;
  - commit versi `1.0.1` dengan tag `v1.0.1`, push keduanya;
  - klon kedua di-reset ke `v1.0.0`;
  - `bump-version --check` diganti `jalan` palsu untuk langkah itu saja.

  Kasus:
  - update sukses → `HEAD` = `v1.0.1`, `sebelumnya` tersimpan;
  - berkas terlacak diubah → kode 3, `HEAD` tetap;
  - cabang `fitur` → kode 3;
  - `daftarProses` memuat `node E:/x/scripts/export-frames.mjs` → kode 3;
  - `daftarProses` melempar → kode 3;
  - commit lokal tambahan di `main` lalu update → kode 1, `HEAD` tetap (Review Focus 4);
  - `kembali` → `HEAD` = `v1.0.0`, `lewati: '1.0.1'`;
  - `nanti` dan `lewati` menulis status;
  - jenis `antigravity` tidak memanggil `jalan` sama sekali.
- [ ] **Step 2:** Jalankan tes → FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Jalankan tes → PASS.
- [ ] **Step 5:** Commit: `pembaruan: update git/claude dengan pengaman render, kembali, nanti, lewati`.

### Task 4: CLI `wevai.mjs`, aturan skill, dokumentasi, gerbang

**Files:**
- Create: `scripts/wevai.mjs`
- Modify:
  - `SKILL.md` (langkah 0 "Alur kerja");
  - `README.md` (bagian pasang);
  - `CHANGELOG.md` (`## Belum dirilis`);
  - `scripts/rilis.mjs` (tambah `jalan('test-pembaruan', '--test', 'scripts/test-pembaruan.mjs')`);
  - `.github/workflows/ci.yml` (langkah `node --test scripts/test-pembaruan.mjs`);
  - `scripts/lint-motion.mjs` (pakai `bantuan(import.meta.url)` dari `scripts/bantuan.mjs`, ganti blok `--help` buatan
    sendiri dari 1.4.1, dan sesuaikan gerbang `lint --help` di `rilis.mjs` serta CI dengan keluarannya).
- Test: `scripts/test-pembaruan.mjs`

**Interfaces:**
- Consumes: semua fungsi Task 1–3.
- Produces: perintah berikut, dengan `akar` = folder di atas `scripts/` dan `rumah` = `os.homedir()`:
  - `node scripts/wevai.mjs versi`: cetak `WeVai <versi> (<jenis>)`. Bila `cekAktif`, panggil `cekRilis`, lalu cetak
    `pesanNotifikasi` bila ada. Selalu keluar 0, termasuk saat galat tak terduga: tangkap semua.
  - `node scripts/wevai.mjs update [--nanti|--lewati|--kembali]`: `cekRilis({ paksa: true })` lalu `jalankanUpdate`;
    kode keluar dari sana.
  - `--help`: lewat `bantuan`.
  - subperintah tak dikenal: cetak cara pakai, kode 2.

- [ ] **Step 1: Tes CLI gagal.** `spawnSync` dengan `HOME` dan `USERPROFILE` diarahkan ke folder sementara, plus
  server `node:http` lokal yang membalas `{ tag_name: 'v9.9.9', body: '- baru', html_url: 'http://x' }` lewat
  `WEVAI_RILIS_URL`:
  - `versi` → kode 0, memuat `WeVai 9.9.9 tersedia`;
  - `WEVAI_CEK_UPDATE=0` → tanpa permintaan ke server (hitung permintaan) dan tanpa notifikasi;
  - `WEVAI_RILIS_URL=http://127.0.0.1:1` (port mati) → kode 0, tanpa teks galat;
  - `update --lewati` lalu `versi` → tanpa notifikasi;
  - `wevai.mjs xyz` → kode 2.
- [ ] **Step 2:** Jalankan tes → FAIL.
- [ ] **Step 3:** Tulis `scripts/wevai.mjs`.
- [ ] **Step 4:** Tambah ke akhir langkah 0 di `SKILL.md`, persis kalimat ini:
  ``Sekali per sesi jalankan `node "<folder skill>/scripts/wevai.mjs" versi`; bila ada versi baru, sampaikan pesannya apa adanya dan lanjutkan tugas. Jalankan `update` hanya bila user memilihnya.``
  Lalu `node scripts/context-budget.mjs --check` → lolos. Bila lewat batas, ringkas kalimat lain di bagian yang sama
  tanpa membuang aturan.
- [ ] **Step 5:** README: subbagian "Update" (3–6 baris):
  - cara kerja notifikasi;
  - cara mematikannya;
  - tiga jalur update;
  - pengguna 1.4.1 ke bawah perlu update manual satu kali.
  CHANGELOG: satu butir di `## Belum dirilis`.
- [ ] **Step 6:** Gerbang:
  - `node --test scripts/test-pembaruan.mjs` → PASS;
  - `node scripts/rilis.mjs --tanpa-browser` → semua hijau, termasuk `test-pembaruan` dan `lint --help`.
- [ ] **Step 7:** Commit: `wevai.mjs versi/update; skill memberi tahu rilis baru`.

### Task 5: Uji lapangan dan rilis (berhenti di izin pemilik)

- [ ] **Step 1:** Di laptop pemilik, dari folder proyek mana pun:
  `node "<folder skill>/scripts/wevai.mjs" versi` (dari worktree: path worktree). Harus mencetak versi tanpa notifikasi,
  karena versi terpasang = rilis terbaru. Ulangi dengan `pembaruan.json` berisi `terbaru: '9.9.9'` dan `dicek` = sekarang
  untuk melihat bentuk notifikasi, lalu hapus berkas itu.
- [ ] **Step 2:** Uji percakapan: satu sesi Claude Code dan satu sesi Antigravity, masing-masing dengan permintaan WeVai
  biasa dan `pembaruan.json` palsu seperti di atas. Agen harus menyampaikan notifikasi, lalu melanjutkan tugas, dan tidak
  menjalankan `update` sendiri. Uji Antigravity memakai kuota Gemini pemilik: beri tahu dulu.
- [ ] **Step 3:** Merge ke `main` hanya saat tidak ada render berjalan (cek proses `chrome`/`ffmpeg` dan folder
  `*.parts`). Lalu `node scripts/rilis.mjs <versi>`.
  **BERHENTI:** versi (1.4.2 atau 1.5.0), push, tag, dan rilis GitHub hanya dengan izin pemilik yang baru.

Ditunda ke rencana §5.2: peringatan versi untuk proyek yang belum selesai (butuh `wevai.json`, belum ada) dan
`wevai dokter` sesudah update. Sementara itu pemeriksaan sesudah update memakai `bump-version --check`.
