# Riset 1.5: WeVai di luar Claude Code, pemicu, kepatuhan, dan pemasangan

Tanggal: 5 Nov 2026. Basis repo: `main` @ `8a424b7` (v1.4.0). Melengkapi `docs/riset-antigravity-2026-11-03.md` dan
`CHANGELOG.md` bagian 1.4.0, dan tidak mengulang isinya kecuali untuk mengoreksi.

**Label.** **[F]** fakta dari sumber primer. **[U]** diukur di repo atau mesin hari ini. **[D]** dugaan atau tafsiran. Semua
halaman web dibaca 5 Nov 2026. Sebagian besar dibaca lewat ringkasan WebFetch, jadi kata-katanya parafrase kecuali yang diberi
tanda kutip. Halaman yang dibaca nyaris utuh: seluruh panduan agentskills.io, panduan Anthropic, `plugin-evals`, serta
`hooks.md` dan `run-workflow` bawaan Antigravity.

**Batas riset.** Chrome, puppeteer, ffmpeg, dan `agy` tidak dijalankan karena render pemilik sedang berjalan. Akibatnya, tidak ada
perilaku agen yang diuji di sini. Yang diuji hanya bacaan dokumen, string biner `agy.exe` (dibaca, tidak dijalankan), dan skrip
tanpa browser.

**Versi yang menjadi acuan**

| Komponen | Versi | Sumber |
|---|---|---|
| Antigravity App | v2.29.0 (3 Nov 2026) | [changelog](https://antigravity.google/docs/changelog) |
| Antigravity CLI, changelog publik | v1.4.12 (30 Okt 2026) | changelog yang sama |
| `agy` terpasang di mesin | 1.5.0, belum tercantum di changelog publik | `%USERPROFILE%\.gemini\bin\agy.version.json` |
| Dokumen bawaan Antigravity | 30 Okt 2026 (`plugin` 4 Nov 2026) | tanggal berkas `builtin\skills\` |
| Agent Skills | tanpa nomor versi | [agentskills.io](https://agentskills.io/specification) |
| Claude Code | `plugin eval` butuh ≥ 2.1.269; dokumen menyebut sampai 2.1.292 | [plugin-evals](https://code.claude.com/docs/en/plugin-evals) |
| Gemini 3.8 Flash | halaman model diperbarui Sep 2026 | [model](https://aistudio.google.com/docs/models/gemini-3.8-flash) |
| MCP | spesifikasi 2025-11-25 | [tasks](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks) |

---

## Ringkasan

1. **Sumber kegagalan lapangan sebagian besar ada di jalur eksekusi, bukan di aturan estetika.** Folder salah, hasil lama dipakai
   ulang, render mati, dan kutipan shell patah bisa diselesaikan dengan alat. Menambah kalimat tidak menyelesaikannya, dan
   ruangnya pun sudah habis: badan `SKILL.md` tinggal 340 byte dari batas, dan 11 dari 17 jalur baca bersisa kurang dari 1 %.
2. **Gerbang berhenti ada di tempat paling lemah.** `## Alur kerja` mulai pada 77 % badan `SKILL.md`, dan kalimat BERHENTI pada 83 %.
   Claude Code sesudah kompaksi hanya mempertahankan 5 000 token pertama skill, sedangkan Alur kerja mulai di token ±5 300 **[U, perkiraan]**.
   Panduan Gemini menyuruh batasan diletakkan di awal **[F]**.
3. **Satu CLI tipis layak dibuat, server MCP tidak.** `node "<folder skill>/scripts/wevai.mjs" baru|cek|render|status|dokter`
   tanpa npm dan tanpa PATH. MCP kalah untuk WeVai karena batas 180 dtk per panggilan di Antigravity, skema tool yang selalu masuk
   prompt, dan fitur tasks yang masih eksperimental.
4. **Pengukuran pemicu kini murah dan resmi.** `agy -p --output-format stream-json` memperlihatkan tool yang dipanggil, dan aksi
   tanpa izin ditolak lunak. `claude plugin eval` punya grader `tool_used: Skill`. Keduanya bisa dihentikan dini.
5. **Dokumen pemasangan README sudah usang.** Codex, Gemini CLI, dan Cursor kini membaca skill secara native dan berbagi
   `~/.agents/skills`. Antigravity tidak menyebut lokasi itu.
6. **Pengetahuan dokumenter sudah matang untuk dipindah ke repo.** `rakit_audio.py` dan `build.mjs` ada di 8 proyek dengan 8 varian
   berbeda **[U]**. Dokumen resmi menyebut pola ini sebagai isyarat untuk membundel skrip.

**Lima kandidat teratas** (rincian di bagian "Kandidat 1.5"): K1 eval pemicu dan gerbang, K2 susun ulang `SKILL.md` dan anggaran
konteks, K3 CLI `wevai`, K4 lint v2 dan audit runtime, K5 rute dokumenter dengan uji panjang mini.

---

## P1. Antigravity terkini dan tugas panjang

### Perubahan sesudah riset 3 Nov

**Tidak ada rilis bertanggal sesudah 3 Nov pada changelog publik per 5 Nov [F].** Yang relevan dan belum tercatat di riset lama:

| Rilis | Isi | Dampak untuk WeVai |
|---|---|---|
| App v2.29.0 (3 Nov) | Remote agents mulai digulirkan untuk AI Pro/Ultra; halaman Automations (Scheduled, Always on, Paused); tautan `antigravity://` membuka plugin, skill, atau percakapan baru berisi prompt; kartu pertanyaan otomatis batal bila user membalas | Tautan dapat dipakai di README **[D: format URL belum didokumentasikan]** |
| CLI v1.4.11 (30 Okt) | `PreInvocation` dapat menghentikan giliran (`terminationBehavior: "terminate"`); `agy plugin import claude` membaca plugin Claude terpasang | Lihat bagian hook |
| CLI v1.4.10 (29 Okt) | Subagen tidak lagi kehilangan tugas dan ID induk sesudah kompaksi | Subagen per babak lebih aman di CLI ≥ 1.4.10 |
| CLI v1.2.6 (18 Sep) | Batas waktu `-p` bawaan menjadi tak terbatas | Eval headless wajib memakai `--print-timeout` |

**Tiga koreksi atas riset 3 Nov:**

- **"Workflow sudah mati" hanya berlaku untuk `.agents/workflows/*.md`.** Ada mekanisme baru `run_workflow`, yaitu skrip Python
  yang mengatur banyak agen (`agent`, `parallel`, `pipeline`, `phase`) **[F: skill bawaan `run-workflow`; SDK beta v0.1.22–0.1.23]**.
- **`AGENTS.md` tidak dimuat dari "folder mana pun".** Dokumen menyatakan rules dimuat dari folder workspace naik sampai akar
  repo, dan "doesn't load rules from subfolders below the workspace folder" **[F: [rules](https://antigravity.google/docs/rules/)]**.
- **Kegagalan hook belum jelas.** `build-plugins` menyatakan exit non-nol dicatat lalu diabaikan (fail open) **[F]**. Uji lapangan
  4 Nov memperlihatkan hook plugin telemetri membuat semua alat gagal. Dokumen dan pengamatan tidak cocok, jadi hook harus dianggap
  berbahaya sampai diuji.

### Mekanisme untuk tugas berjam-jam dan berbabak

| Mekanisme | Fakta | Umur dan batas | Vonis untuk WeVai |
|---|---|---|---|
| Proses terlepas + log (`antre-render`) | Sudah ada di 1.4.0 | Di luar kendali agen. Lihat catatan job object di bawah | **Jalur render utama.** Perlu diuji ketahanannya |
| [`/goal`](https://antigravity.google/docs/commands/goal/) | Hook berhenti mencegah giliran berakhir. Agen memetakan tiap keluaran ke bukti. Tidak memaksa lanjut saat subagen atau tugas latar masih berjalan. App, CLI, IDE | Tanpa batas iterasi; berakhir saat agen menyatakan selesai atau user menghentikan | **Cocok sesudah rundown disetujui**, dengan bukti eksplisit (`wevai cek` keluar 0). **Bertabrakan dengan gerbang berhenti** bila dipakai sebelum persetujuan |
| [`/schedule`](https://antigravity.google/docs/commands/schedule/) | Pengatur waktu sekali atau cron; `TimerCondition` dapat mengikuti ID tugas latar. Contoh resminya memang memeriksa render | Terikat percakapan. Dokumen menyarankan sidecar atau Automations untuk yang harus bertahan lintas sesi | **Pakai untuk memantau:** "jadwalkan `wevai status` tiap 30 menit" |
| [Subagen](https://antigravity.google/docs/subagents/) | `self`, `research`, `browser`, kustom. Tanpa riwayat induk. Workspace `inherit`, `branch`, `share`. Mewarisi izin. Model `inherit`, `flash`, `pro` | Idle setelah selesai, menyimpan konteks; maksimal 10 tingkat | **Satu babak per subagen** bila tersedia. Tulis netral, tanpa cabang khusus Antigravity. Butuh berkas status karena riwayat tidak diwarisi |
| `run_workflow` | Python ≥ 3.8 di PATH. Berjalan di latar. "The user cannot be asked anything from a workflow". Menghentikan percakapan induk menghentikan semua agen | Hanya Antigravity. Dokumen publik tidak membahasnya sebagai fitur App | **Jangan masukkan ke inti skill.** Opsional untuk pemilik, membuat banyak babak paralel, boros kuota **[D]** |
| [`/teamwork`](https://antigravity.google/docs/teamwork/) | Delapan peran, wawancara lalu otonom, paket berbayar. Folder proyek bawaan `~/teamwork_projects/` | Proyek berhari-hari. Pemakaian kuota tidak dijelaskan | **Tidak disarankan.** Peran dirancang untuk kode dan riset, bukan video |
| [Sidecar](https://antigravity.google/docs/sidecars/) | Proses latar yang dimulai ulang otomatis. Mati secara bawaan, harus diaktifkan di `config.json`. Pengiriman lewat plugin | Dikelola Antigravity. `restart_policy` bawaan `always` | **Tidak disarankan** untuk render sekali jalan |
| Automations | Terjadwal, Always on; pilihan model per automation | Bertahan lintas sesi, App | Tidak diperlukan |
| [Remote agents](https://antigravity.google/docs/remote-agents/) | Lingkungan Google. Tidak bisa membaca berkas lokal. Pada sesi CLI, skill dan plugin lokal tidak tersedia | Berjalan walau laptop tidur | **Tidak cocok.** Chrome, ffmpeg, dan skill lokal tidak ada **[D untuk Chrome/ffmpeg]** |
| Artifact, [`/plan`](https://antigravity.google/docs/plan/) | Rencana bisa dikomentari; patuh pada kebijakan review. `-p` melewati review (CLI v1.1.28) | Pada setelan Turbo tidak menahan apa pun | Tidak bisa menjadi gerbang. Gerbang tetap di berkas dan alat |
| Rules | `always_on` masuk prompt tiap giliran. Anggaran 20 000 token, 24 000 byte per berkas | Tetap ada sesudah kompaksi **[D]** | Lihat rekomendasi di bawah |
| Hooks | `SessionStart`, `Pre/PostToolUse`, `Pre/PostInvocation`, `Stop`. `cmd /c` di Windows, cwd = folder `hooks.json`, timeout 30 dtk, sinkron, memblokir | Tingkat workspace, global, plugin | Lihat di bawah |

**Render terlepas belum tentu benar-benar lepas [D, perlu uji].** Microsoft mendokumentasikan bahwa proses anak ikut job induknya,
dan `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` mematikan semua anggota. Pengecualiannya: "Child processes created using Win32_Process.Create
are not associated with the job" **[F: [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)]**. Apakah
agen Antigravity atau Claude Code memakai job object seperti itu belum diketahui. Bila ya, `Start-Process` yang direkomendasikan
1.4.0 tidak akan selamat, dan `Win32_Process.Create` lewat `Invoke-CimMethod` adalah jalan keluarnya. Ini bisa menjelaskan kematian
render, tetapi tidak terbukti. Lihat uji U4.

### Model kerja video panjang yang disarankan

Prinsipnya: **berkas adalah ingatan, sesi agen boleh mati kapan saja.**

1. **Persiapan.** Naskah, gaya, dan daftar babak disetujui, lalu disimpan di `rencana.md` dan `wevai.json`.
2. **Bangun.** Satu babak per sesi atau subagen. Tiap sesi mulai dari `wevai status`, membangun satu babak, lalu `wevai cek`.
3. **Periksa.** Gerbang `cek` menulis penanda `cek/siap-NN`. Mekanisme `siap` sudah ada di `antre-render.mjs`.
4. **Render.** Proses terlepas. Agen boleh selesai. Sesi mana pun dapat membaca kemajuannya lewat `wevai status`.
5. **Pantau.** `/schedule` bila ada, atau user bertanya.

### Apa yang dibawa sebagai `workflows` atau `rules`

- **Workflow lama:** tidak.
- **`rules/AGENTS.md` di plugin:** tidak. Ia selalu aktif selama plugin aktif **[F: skill bawaan `plugin`]**, jadi akan masuk ke
  percakapan yang tak ada hubungannya dengan video dan memakan anggaran 20 000 token.
- **Hook plugin:** tidak. Kasus telemetri menunjukkan akibatnya: satu hook yang patah pada nama pengguna berspasi melumpuhkan semua alat.
- **`AGENTS.md` per proyek video, ditulis oleh `wevai baru`:** **ya**, pendek (≤ 30 baris). Isinya petunjuk ke `wevai status`, nama
  alat, dan larangan pokok. Hanya berlaku pada folder video itu, jadi agen lain dan proyek lain tak tersentuh. Codex dan Antigravity
  membacanya; Claude Code butuh satu baris `CLAUDE.md` yang mengimpornya **[D: periksa sintaks impor di dokumen memori Claude]**.
  Syaratnya folder video menjadi workspace, karena subfolder tidak dimuat **[F]**. Ini tidak melanggar keputusan 1.4.0 "repo tidak menambah `AGENTS.md`",
  karena yang dimaksud repo skill.

---

## P2. Standar Agent Skills dan cara menulis untuk model yang lebih lemah

### Batas per klien

| Klien | Lokasi global | Proyek | Batas | Catatan |
|---|---|---|---|---|
| [Spesifikasi](https://agentskills.io/specification) | tidak ditetapkan | tidak ditetapkan | `description` ≤ 1 024; badan < 5 000 token dan < 500 baris; referensi satu tingkat | Field `compatibility` ≤ 500 karakter untuk kebutuhan lingkungan |
| Antigravity | `~/.gemini/config/skills`, manifest `skills.json` | `.agents/skills` | 24 000 byte badan (uji `agy plugin validate`, 1.4.0); `description` 1–1 024 | Tidak ada `~/.agents/skills` di dokumen. CLI juga `~/.gemini/skills`, App tidak |
| [Claude Code](https://code.claude.com/docs/en/skills) | `~/.claude/skills` | `.claude/skills` | `description` + `when_to_use` dipotong di 1 536; anggaran daftar 1 % konteks | Sesudah kompaksi: 5 000 token pertama tiap skill, total 25 000. File tidak dibaca ulang |
| [Codex](https://learn.chatgpt.com/docs/build-skills) | `~/.agents/skills` | `.agents/skills` | Daftar awal 2 % konteks atau 8 000 karakter; deskripsi dipendekkan lebih dulu | Mengikuti symlink. `agents/openai.yaml` opsional |
| [Gemini CLI](https://geminicli.com/docs/cli/skills/) | `~/.gemini/skills`, `~/.agents/skills` | `.gemini/skills`, `.agents/skills` | Tidak disebut | `activate_skill` dengan konfirmasi user; `gemini skills install <git-url>` |
| [Cursor](https://cursor.com/docs/context/skills) | `~/.cursor/skills`, `~/.agents/skills` | `.cursor/skills`, `.agents/skills` | Tidak disebut | Juga membaca `.claude/skills`. `name` wajib sama dengan nama folder. Pasang dari GitHub butuh `.cursor-plugin/marketplace.json` |

**WeVai sekarang [U]:** `description` 932 karakter, badan 23 323 byte (23 660 dengan CRLF), 336 baris, ±6 800 token dengan perkiraan
3,4 karakter per token. Melewati saran 5 000 token, tetapi di bawah 500 baris.

**Antigravity dan spesifikasi berbeda soal gaya deskripsi.** Antigravity dan Anthropic menyarankan orang ketiga; agentskills.io
menyarankan kalimat perintah ("Use this skill when"). Format WeVai yang menggabungkan keduanya sudah aman.

### Praktik resmi dibanding WeVai

| Praktik resmi | Sumber | WeVai sekarang | Tindakan |
|---|---|---|---|
| Daftar periksa yang disalin agen untuk alur multilangkah | [Anthropic](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices), [agentskills](https://agentskills.io/skill-creation/best-practices) | Langkah 0–7 berbentuk paragraf panjang di belakang berkas | Checklist 8 baris di awal |
| Letakkan batasan penting di awal | [Gemini](https://aistudio.google.com/docs/prompting-strategies); Claude Code menyuruh yang terpenting di dekat awal | Hukum estetika dulu, alur kerja belakangan | Pindahkan alur dan gerbang ke atas |
| Kebebasan rendah untuk langkah rapuh: perintah persis | Anthropic | Banyak skrip, env, dan bentuk shell | CLI `wevai` |
| Lingkar validasi dengan kode keluar | keduanya | Lint ada, snap dan nilai terpisah | `wevai cek` satu pintu |
| Plan-validate-execute: berkas antara yang divalidasi mesin | keduanya | Style brief hanya teks percakapan | Templat brief + pemeriksaan isian |
| Bawaan, bukan menu | keduanya | Pemilihan starter tersebar | Rekomendasi tunggal per jenis |
| Bagian gotcha di `SKILL.md`, ditambah dari koreksi nyata | agentskills | "Jebakan" pindah ke `checklist.md`; jebakan agen tersebar | "Jebakan agen" 5–6 baris |
| Jelaskan alasan, bukan sekadar SELALU/JANGAN | [skill-creator](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md), agentskills | Campuran, banyak kata kapital | Uji dengan eval. Pada uji 1.4.0, agen menyebut aturan lalu menalarnya, jadi kata keras saja tidak cukup **[D]** |
| Skrip sebagai kotak hitam, `--help` dulu | [webapp-testing](https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md), Antigravity | `lint-motion --help` tidak mencetak bantuan | Lihat di bawah |
| Daftar isi untuk berkas panjang (Anthropic > 100 baris, skill-creator > 300) | keduanya | Pencarian pola "daftar isi" tidak menemukan di `alat-kerja` (350), `explainer` (624), `opener-konsep` (820), `sinematografi` (372) **[U]** | Tambah daftar isi |
| Tanpa info lekas basi | Anthropic | `checklist.md` baris 3 menceritakan pemindahan 3 Nov dan Antigravity | Buang |
| Keluaran terstruktur; data ke stdout, diagnostik ke stderr | [using-scripts](https://agentskills.io/skill-creation/using-scripts.md) | `lint --json` dan `nilai --json` ada, snap dan antre tidak | `--json` pada `wevai` |

**Temuan konkret di `SKILL.md` yang membingungkan model lemah [U]:**

- Baris 158–159 menyuruh menulis "**enam baris**", padahal daftarnya **16 butir**.
- Langkah 2 menyatakan "Total 25–40 detik", padahal `description` kini menjanjikan video dokumenter panjang.
- Tabel "Jenis pekerjaan" dan "Peta baca" **tidak punya baris dokumenter atau video panjang**. Satu-satunya petunjuk ada di tengah
  langkah 6: "Video lebih dari ±10 menit: pecah per babak".
- `node scripts/lint-motion.mjs --help` dari folder kosong mencetak "index.html: tidak bisa dibaca" dan "Ada FAIL", kode keluar 1.
  `context-budget -h` langsung berjalan. CHANGELOG 1.4.0 menganggap skrip seperti ini aman tanpa guard karena tak punya efek, tetapi
  agen yang mengikuti saran "`--help` dulu" tak memperoleh cara pakai, malah memperoleh FAIL palsu.

**Soal Flash.** Dokumen resmi tidak membahas kepatuhan Flash. Yang ada: Flash "takes smaller reasoning steps, calls tools iteratively,
and verifies its work along the way" dan "can use more tokens on longer running and complex tasks, by design"; tingkat pemikiran bawaan
`medium` **[F: [What's new](https://aistudio.google.com/docs/whats-new-gemini-3.8)]**. Panduan Gemini 3 juga menyebut model bisa
menganalisis berlebihan prompt yang rumit **[F, tetapi hanya lewat ringkasan pencarian; halamannya ditandai usang: [Gemini 3 developer guide](https://ai.google.dev/gemini-api/docs/generate-content/gemini-3)]**.
Maka perilaku "membaca banyak berkas" di uji lapangan mungkin bawaan model, bukan kesalahan skill **[D]**. Skill perlu memberi batas baca
yang eksplisit: "baca tiga berkas ini, lalu berhenti membaca".

### Usulan `description` (harus lewat eval dulu, jangan langsung dipakai)

Prinsip: kasus utama di depan, cakup permintaan yang tak menyebut domain, batas yang jelas. Uji lapangan 1.4.0 menunjukkan agen
menjawab dengan panduan untuk editor manual, jadi batas itu perlu dinyatakan dari sisi positif:

> Membuat video dari kode (HTML, GSAP, Three.js) yang dirender ke MP4: promo, opener, intro, bumper, kinetic typography, explainer, dan
> video dokumenter atau sejarah 45–90 menit per babak. Gunakan untuk setiap permintaan membuat, merancang, atau merender video atau
> motion graphic, termasuk bila user hanya memberi topik, naskah, atau brief dan tidak menyebut skill; juga bila animasi web terasa
> seperti slide, atau explainer dibangun di After Effects lewat bridge. Bukan untuk memotong rekaman di editor video atau animasi UI kecil.

Panjang ±480 karakter. Tak ada kata kunci bahasa Inggris tambahan; perlu tidaknya dinilai dari kueri eval berbahasa Inggris.

---

## P3. Evaluasi pemicu dan kepatuhan

### `evals/` sekarang dibanding yang dibutuhkan [U]

| Aspek | Sekarang | Praktik resmi | Celah |
|---|---|---|---|
| Pemicu | Tidak diukur | ±20 kueri, 8–10 positif dan 8–10 near-miss, 3 kali per kueri, tingkat pemicu > 0,5, pisah latih 60 % dan validasi 40 % [(agentskills)](https://agentskills.io/skill-creation/optimizing-descriptions.md) | Seluruhnya belum ada |
| Kepatuhan proses | "Wajib ada" dicentang manusia; tidak membaca jejak | Grader dari jejak (`tool_used`, `tool_order`) [(plugin-evals)](https://code.claude.com/docs/en/plugin-evals) | Tidak ada penguraian jejak |
| Pembanding | Antar laporan | Dengan skill vs tanpa, atau versi lama [(evaluating)](https://agentskills.io/skill-creation/evaluating-skills.md) | Tidak bisa membuktikan aturan membantu |
| Pengulangan | Satu kali; baru 1 dari 8 brief, sesi yang sama | 3 kali | Belum ada baseline sama sekali |
| Identitas | Tidak mencatat agen, model, versi, token, waktu | `timing.json`, `benchmark.json` | Tidak bisa membandingkan lintas model |
| Mesin | `eval-run --snap` | | Tak memanggil `nilai-visual`; tak ada `--json`; laporan pada tanggal sama ditimpa |
| Rilis | `rilis.mjs` tanpa eval | | Benar untuk CI (bebas kuota), tetapi rilis tidak punya angka |

### Rancangan empat lapis, dari yang gratis

| Lapis | Isi | Biaya kuota | Kapan |
|---|---|---|---|
| **0. Statis** | Frontmatter sesuai spec, nama = folder; ukuran badan, baris, token; posisi byte gerbang di dalam 5 000 token pertama; semua rujukan `references/` dan `assets/` ada; daftar isi pada berkas > 300 baris; `context-budget` | Nol | CI |
| **1. Pemicu** | 16 kueri, 2 kali per model, dihentikan begitu `SKILL.md` terbaca atau aksi lain dimulai | Rendah. Angka nyata dari `usage` tiga run pertama | Saat `description` berubah |
| **2. Gerbang** | Prompt asli → agen membaca apa saja, berapa byte, menulis berkas atau tidak, keluaran memuat brief dan tabel rundown. Lalu putaran kedua "setuju": starter disalin, bukan diketik | Sedang | Tiap rilis yang mengubah `SKILL.md` |
| **3. Hasil** | 3 brief saja (opener, explainer, babak) sampai `index.html`; lint, snap, nilai; rubrik mata | Tinggi | Rilis MINOR |
| **4. Panjang mini** | 3 babak @ 20 dtk, render resolusi rendah, sesi baru per babak, membunuh proses di tengah | Sedang | Sekali per rilis besar |

**Pemicu di Antigravity, tanpa UI [F: [headless](https://antigravity.google/docs/cli/headless/)]:**

```powershell
agy -p "<kueri>" --output-format stream-json --model <slug> --print-timeout 3m
```

- Langkah tool muncul sebagai `step_update` dengan `step_type: "tool"`, `tool_name`, dan `tool_info.parameters`.
- Dengan mode bawaan `request-review`, aksi yang butuh izin ditolak lunak, jalan terus, exit 0. Ini membuat eval pemicu aman: tak
  ada yang tertulis (CLI v1.1.3).
- Terdeteksi bila `view_file` menunjuk `wevai/SKILL.md` atau `skill_search` memuat "wevai" **[D: nama dan bentuk argumen harus
  dikonfirmasi pada run pertama, dokumen headless tidak menyebut skill]**. String `skill_search` memang ada di `agy.exe` **[U]**.
- Skrip pengevaluasi mematikan proses begitu hasilnya jelas, seperti disarankan agentskills.

**Pemicu dan gerbang di Claude Code [F: [plugin-evals](https://code.claude.com/docs/en/plugin-evals)]:**

- Grader `tool_used` dengan `tool: Skill`, `tool_order`, `regex`, dan `file_exists` tanpa biaya. `llm` dan `baseline` berbiaya.
- Hemat: `--ablation none --runs 2 --max-cost-usd <n> --model <pin> --json hasil.json`.
- **Wajib `--no-publish`.** Bila dijalankan dari shell dengan langganan claude.ai, laporan bisa terbit sebagai artifact. Ini bertentangan
  dengan aturan global pemilik.
- `evals/` sudah terpakai: gunakan `--eval-dir evals/claude`.
- **Windows native tidak punya backend sandbox, jadi tiap run yang diberi izin Bash atau PowerShell ditolak.** Lapis pemicu dan gerbang tidak butuh Bash
  (cukup `Read`, `Glob`, `Grep`, `Skill`, plus `Write` untuk `tool_used … max: 0`). Hasil penuh butuh WSL2 atau jalur lain.
- Tiap run terisolasi dari setelan pribadi; hasilnya lebih bersih dibanding sesi harian.

**Yang perlu ditambah di repo:**

1. `evals/pemicu.json`: 16–20 kueri nyata. Contoh positif tak langsung: "bikinin video 45 menit soal situs purbakala, naskahnya sudah ada",
   "butuh sesuatu yang bisa diupload ke YouTube dari brief ini". Contoh near-miss: "potong video ini pakai ffmpeg", "kompres mp4", "ubah
   ini jadi slide PowerPoint", "animasi hover tombol CSS", "tulis naskah saja, tanpa video", "edit timeline Premiere saya".
2. `scripts/eval-jejak.mjs`: mengubah NDJSON `agy` atau `claude` menjadi bentuk sama:
   `{ skillTerbaca, berkasTerbaca[], bytesTerbaca, tulisSebelumSetuju, perintah[], token, durasi }`.
3. `scripts/eval-pemicu.mjs`: menjalankan kueri, berhenti dini, menulis tingkat pemicu per model.
4. `eval-run`: panggil `nilai-visual`, catat agen, model, versi skill, tambah `--json`.
5. `evals/README.md`: patokan tingkat. Usulan awal **[D]**: pemicu positif ≥ 0,8, near-miss ≤ 0,2, gerbang tiga dari tiga pada Flash.
   Patokan seharusnya ditetapkan sesudah baseline pertama.

**Peringatan pengukuran.** `agy -p` dan IDE memakai konfigurasi sama, tetapi perilaku mungkin berbeda, dan aturan global
`~/.gemini/GEMINI.md` ikut memengaruhi hasil di mesin pemilik. Pemilihan skill di IDE tetap perlu dicoba manual beberapa kali (U1).
Baseline tanpa skill juga berguna untuk **membuang** aturan: "If pass rates plateau despite adding more rules, the skill may be
over-constrained" **[F: evaluating-skills]**.

---

## P4. Penegakan mekanis, CLI, MCP, dan anggaran konteks

### Aturan yang masih hanya tertulis

Lint sekarang menangkap: section yang di-fade, `Date.now`, `performance.now`, `Math.random`, `setInterval`, `THREE.Clock`, `composer.render()`,
nilai relatif, loop mati, `<video autoplay/loop>`, kontrak `OPENER`, module dan fetch lokal, teks "ketuk untuk mulai", font-size literal < 30 px,
folder proyek **[U]**.

**Bisa ditambah di `lint-motion.mjs`, tanpa Chrome, biaya kecil:**

| Aturan | Sumber | Pemeriksaan | Tingkat |
|---|---|---|---|
| Font display bukan Poppins/Inter/Roboto/Montserrat/Arial | Hukum #3 | Baca URL Google Fonts dan `font-family` di luar blok `<wv:*>`. Pengecualian konsep klaim → cara → hasil lewat `wevai.json`. Paling berguna di mesin yang aturan globalnya menyarankan Inter | WARN |
| Sisa placeholder starter | checklist 2, Hukum #3.2 | Bandingkan token warna dan font dengan starter yang tercatat di `wevai.json` | FAIL bila ada `wevai.json`, jika tidak WARN |
| Starter disalin, bukan diketik ulang | `SKILL.md` langkah 3 | Hash tiap blok `<wv:*>` terhadap `src/runtime` | WARN |
| Starter yang benar untuk jenisnya | anti-ppt #6 | Penanda `starter` di HTML atau `wevai.json` | FAIL |
| Determinisme yang lolos | Hukum #2 | `new Date`, `setTimeout`, `requestAnimationFrame`, `<animate>`, `@keyframes`, `animation:`, `transition:` di luar blok. **[U]** Starter tidak punya CSS animation sama sekali, dan rAF di luar blok hanya ada pada lima starter ber-Three.js, jadi false positive rendah | FAIL untuk CSS, WARN untuk rAF |
| Teks kecil di JS | checklist | `fontSize:` di tween dan template string | WARN |
| Glow tebal di judul | checklist | `text-shadow` ≥ 3 lapis pada aturan teks | WARN |
| Kapital-tebal berulang | Hukum #4 | `text-transform: uppercase` + bobot ≥ 700 pada > 1 selector | WARN |
| Player di layar | "Player" | `<video controls>`, `<audio controls>` | FAIL |
| `--help` | spec | Pakai `bantuan.mjs` di `lint-motion` dan `context-budget` | perbaikan bug |

**Butuh Chrome: `snap.mjs --audit`, menulis `audit.json`, biaya sedang.** Semuanya dibaca dari DOM saat `seek(t)`:

| Aturan | Sumber | Pemeriksaan |
|---|---|---|
| **Teks tak terpotong** (syarat keras pemilik) | feedback VO, checklist | Kotak teks vs panggung. Proyek dokumenter sudah punya `cek/potong.cjs` (per 1,5 dtk), tetapi terikat selector `.e.line` dan jalur puppeteer tertanam, jadi perlu digeneralisasi |
| Teks ≥ 30 px sesudah kamera | checklist | Ukuran hasil hitung × skala, menangkap yang tak terlihat lint |
| Tumpang tindih teks | langkah 5 | Irisan kotak |
| ≤ 2 tingkat teks per adegan | anti-ppt #3 | Kelompok ukuran font yang tampil bersamaan. Dokumen dan stempel dikecualikan lewat penanda |
| Variasi antar adegan | Hukum #4 | Ukuran dan posisi berurutan sama |
| Kantong teks ≤ 25 % atau ≥ 80 % | Hukum #4 | Kotak teks dikirim ke `nilai-visual`. Ambang perlu dikalibrasi karena skala L OKLab berbeda dari "luminance" di teks aturan |
| Gerak tiap detik, tanpa hold mati, latar tidak diam | anti-ppt #4, checklist | Selisih frame kecil antar detik. Untuk video panjang dicuplik |

**Proses dan VO, tanpa Chrome:**

| Aturan | Pemeriksaan |
|---|---|
| Rundown disetujui sebelum kode | `wevai baru` meminta `--setuju "<kutipan balasan user>"` atau `--langsung`, tersimpan di `wevai.json`. Agen masih bisa berbohong, tetapi harus menuliskannya secara eksplisit, dan eval dapat memeriksanya. Pada uji 1.4.0 agen menalar "permintaan awal sudah cukup" |
| Tidak memakai ulang hasil lama | `baru` menolak folder berisi tanpa `--lanjut`; `id` proyek baru ditulis ke HTML; lint mencocokkan |
| Cek lolos sebelum render | `cek` menyimpan hash `index.html`; `render` menolak hash yang tak cocok, kecuali `--paksa` |
| VO utuh, jeda ≥ 0,95 dtk, durasi dari dekode | Pindahkan `cek/linimasa.py` dan `cek/vo_utuh.py` dari proyek dokumenter |
| Naskah VO saat penyerahan | `cek --serah` memeriksa berkas naskah |

**Tetap hanya penilaian manusia:** konsep, rasa, kecocokan gaya, kulit referensi, momen istimewa, keluarga render. "Berbeda dari proyek
sebelumnya" bisa diperiksa dengan riwayat lokal, tetapi menambah keadaan global, jadi ditunda.

### Satu perintah `wevai` atau tidak?

**Rekomendasi: buat, tipis, tanpa instalasi, dan hanya lima subperintah.** `node "<folder skill>/scripts/wevai.mjs" <perintah>`

```
dokter  [--json]                      Node, puppeteer, Chrome, ffmpeg, nama folder, spasi di path, plugin telemetri bermasalah
baru    <nama> --jenis <j> --setuju "…"   buat folder proyek, salin starter, tulis wevai.json + AGENTS.md, cetak daftar baca persis
cek     [berkas|--semua] [--penuh]    lint + snap + audit + nilai + linimasa; ringkasan ≤ 40 baris, cek/laporan.json, lembar kontak
render  [--gabung]                    syarat cek lolos; susun antrean.json; jalankan terlepas; cetak pid dan log
status  [--json]                      fase, babak selesai, render hidup atau mati, fps, ETA, galat terakhir, LANGKAH BERIKUTNYA
```

**Alasan mendukung:**

- Kegagalan nyata ada di sambungan antar langkah: folder, env, kutipan PowerShell (`--sumber` JSON bahkan butuh "kunci tanpa tanda kutip
  dimaafkan" di `nilai-visual`), `Start-Process`, pemantauan.
- Panduan resmi memang menyuruh perintah persis untuk langkah rapuh, dan skrip sebagai kotak hitam.
- Konfigurasi `sumber`, `subjek`, dan detik kunci pindah ke `wevai.json`, jadi tak perlu dikutip di baris perintah.
- `status` memberi sesi baru titik mulai, yang paling berguna untuk model lemah dan video panjang.
- Satu aturan izin. Semua lewat `node`.
- Mempersingkat Alur kerja `SKILL.md` dan mengurangi kebutuhan membaca `alat-kerja.md` (31 KB).

**Alasan menentang:**

- Satu lapisan lagi yang harus dirawat, dan bisa menyembunyikan galat. Keluaran skrip asli harus diteruskan bila gagal.
- Tidak membantu penilaian estetika sama sekali.
- `<folder skill>` tetap harus diisi agen. Tak bisa di PATH: `bin/` plugin Claude hanya untuk tool Bash, dan "claude.ai and Cowork don't
  install a plugin that has this directory" **[F: [plugins-reference](https://code.claude.com/docs/en/plugins-reference)]**.
- Risiko agen tetap merangkai skrip lama. Eval perlu mengukurnya.

**Yang sengaja tidak dibuat:** `wevai nilai`, `wevai vo`, `wevai arsip`, instalasi global, paket npm, mode interaktif. Skrip lama tetap ada dan
tak berubah, jadi skrip proyek pemilik dan alur Claude Code yang berjalan tak terganggu. Bila hanya sanggup sebagian, urutannya
`status` + `render`, lalu `cek`, lalu `baru`, lalu `dokter`.

### Server MCP: tidak

| Pertimbangan | Fakta |
|---|---|
| Batas waktu | Antigravity bawaan 180 dtk per panggilan tool (dapat diatur); render berjam-jam tetap harus lepas **[F, riset 3 Nov]** |
| Tugas panjang | MCP Tasks masih "experimental" **[F]**; dukungan Antigravity tidak terdokumentasi |
| Biaya konteks | Tool MCP selalu masuk prompt. CLI hanya berbiaya saat dipakai |
| Pemasangan | Tiap agen punya format konfigurasi sendiri; menambah satu titik gagal. Plugin dapat membawanya, tetapi rute folder biasa tidak |
| Manfaat tambahan | Hampir nol, karena semua klien target punya shell |
| Klien tanpa shell | claude.ai dan remote agent juga tak punya Chrome dan ffmpeg lokal, jadi MCP tak membuat render mungkin di sana |

Pertimbangkan lagi hanya bila ada klien target tanpa shell yang bisa menjangkau layanan render. Bridge After Effects tetap MCP karena memang
menghubungkan aplikasi lain, dan itu perkara terpisah.

### Anggaran konteks

**11 dari 17 jalur tersisa < 1 % dari batasnya [U, `context-budget` hari ini]:** Opener 218/220, Siluet 234/235, Babak 366/366, Relief 296/297,
Wayang 246/246, Painterly 266/268, Explainer 3D 170/170, Opener 3D 243/245, Mata elang 155/155, Peta 176/176, Diorama 215/217.
`SKILL.md`: 23 660 dari 24 000 byte.

**Sebagian besar kepenuhan itu semu.** Anggaran menghitung starter penuh, padahal starter harus disalin, bukan dibaca, dan sebagian besarnya
adalah blok runtime yang tak perlu disunting **[U]**:

| Jalur | Sekarang KB | Blok `<wv:*>` di starter KB | Tanpa blok KB |
|---|---|---|---|
| Opener / promo | 218 | 37 | 181 |
| Explainer kolase (kartun) | 172 | 26 | 146 |
| Explainer aliran | 219 | 70 | 149 |
| Siluet sinematik | 234 | 68 | 166 |
| Babak sinematik | 366 | 170 | 196 |
| Relief candi | 296 | 140 | 156 |
| Wayang | 246 | 89 | 157 |
| Painterly | 266 | 105 | 161 |
| Explainer 3D | 170 | 38 | 132 |
| Opener 3D | 243 | 37 | 206 |
| Mata elang | 155 | 59 | 96 |
| Peta relief | 176 | 78 | 98 |
| Diorama | 215 | 116 | 99 |
| Kartun panggung | 185 | 70 | 115 |

Usulan:

1. `context-budget` memisahkan **aturan yang wajib dibaca** dari **perkakas yang disalin**, dan batas diterapkan terutama pada yang pertama.
   Komentar di skrip itu sendiri berulang kali menyebut "perkakas, bukan aturan".
2. Kepala starter diberi penunjuk: bagian yang disunting ada di baris a–b; blok `<wv:*>` jangan dibaca; API-nya di `references/…`.
   `wevai baru` dapat mencetak rentang barisnya. Starter 200 KB yang dibaca penuh setara ±60 000 token.
3. Skill menyatakan: `CHANGELOG.md`, `docs/`, `evals/`, `src/`, dan `isi-paket.md` tidak dibaca saat membuat video. Uji lapangan menunjukkan
   agen membaca banyak berkas, dan folder skill saat ini penuh hal yang menggoda.

Pemindahan ini menurunkan bacaan, tetapi **belum tentu menaikkan kepatuhan**. Yang menjawabnya hanya lapis 2 eval.

---

## P5. Pengalaman pasang

### README yang usang [F vs U]

Baris manual README berbunyi: "Gemini CLI · Cursor · others | copy into the project and reference `SKILL.md` from `GEMINI.md`, `.cursor/rules`", dan
Codex "your Codex skills folder, or add to `AGENTS.md`". Sekarang semuanya native (tabel P2). Lencana README juga tidak menyebut Antigravity, dan
itu memang menunggu uji pemilik.

### Lokasi yang disarankan

Satu salinan nyata per mesin **[D, rancangan]**:

- **Codex, Cursor, Gemini CLI:** `~/.agents/skills/wevai`.
- **Antigravity:** manifest `~/.gemini/config/skills.json` menunjuk folder yang sama dengan path absolut; `~` tidak diekspansi **[F]**.
  Junction tidak dikenali (uji 1.4.0).
- **Claude Code:** plugin (paling mudah diperbarui), atau tautan ke `~/.claude/skills/wevai`. Perilaku junction di Claude Code belum diperiksa.

`wevai dokter` dapat melaporkan keadaan ini, dan opsi `--pasang` dapat menulis `skills.json` secara aditif. Ubah berkas konfigurasi agen hanya dengan
permintaan eksplisit.

### Distribusi

| Rute | Fakta | Saran |
|---|---|---|
| Marketplace Claude sendiri | Sudah ada. `claude plugin install wevai --marketplace aammuhammad18-cmyk/wevai` (≥ 2.1.292) satu perintah. Auto-update mati secara bawaan **[F: [publish](https://code.claude.com/docs/en/plugins/publish.md)]** | Tambahkan bentuk satu perintah ke README |
| Direktori Anthropic | Portal, butuh paket berbayar; pengguna claude.ai dan Cowork tak punya Chrome dan ffmpeg lokal **[D]** | Tunda |
| `agy plugin install <github>` | Mengkloning repo. Lolos `--strict`, pemasangan belum diuji. `PLUGIN_ROOT` hanya baca dan diganti saat pembaruan **[F: [build-plugins](https://antigravity.google/docs/build-plugins/)]** | Uji (U9). `npm install --prefix` ke dalam folder itu bisa gagal atau hilang saat update |
| Marketplace Antigravity | Formulir minat sesudah `--strict`, README, dan logo. "Curated"; proses penilaian tak dijelaskan **[F: [marketplace](https://antigravity.google/docs/marketplace/)]** | Ajukan sesudah video panjang lolos uji |
| `npx skills add` (pihak ketiga) | Butuh Node ≥ 22.20, mesin acuan 22.19 **[U]**. Mencatat Antigravity global sebagai `~/.gemini/antigravity/skills/`, sedangkan dokumen resmi `~/.gemini/config/skills/`. Telemetri aktif bawaan **[F: [README](https://raw.githubusercontent.com/vercel-labs/skills/main/README.md), [agents](https://raw.githubusercontent.com/vercel-labs/skills/main/docs/agents.md)]** | Jangan jadikan rute utama |
| Paket npm milik sendiri | Menambah tugas rilis dan tak menyelesaikan apa pun yang tak bisa diselesaikan `git clone` | Tidak |
| Zip rilis GitHub | Berkas `wevai-X.Y.Z.zip` berisi folder `wevai/` hanya runtime | **Ya.** Menutup masalah `wevai-main` dan ukuran |

### Ukuran dan isi unduhan [U]

Berkas terlacak 25,2 MB: `evals/bukti` 17,8 MB, `docs/gallery` 3,6 MB. Yang dibutuhkan saat memakai: `assets` 1,8 MB, `references` 0,4 MB, `scripts`
0,5 MB. `.git` 49 MB. Tindakan murah: `git clone --depth 1` di README, `export-ignore` di `.gitattributes`, dan zip rilis. Memindahkan bukti lama ke
aset rilis bisa menyusul, tanpa menulis ulang riwayat.

### Dependensi di plugin

`npm install --prefix "<folder skill>/scripts"` tidak cocok untuk plugin karena foldernya berganti saat pembaruan **[F untuk kedua agen]**. Usulan: `chrome.mjs`
juga mencari puppeteer di `~/.wevai/node_modules`, dan `wevai dokter --pasang` memasangnya di sana, sebaiknya `puppeteer-core` agar tidak mengunduh browser
±150 MB. Lokasi itu berlaku lintas agen dan selamat saat pembaruan. Risiko kecil bagi yang sudah terpasang, karena pencarian lama tetap didahulukan.

### Nama pengguna berspasi dan macOS/Linux

- CI hanya `ubuntu-latest` **[U]**. Tambah `windows-latest` dan `macos-latest` untuk uji tanpa browser, dan satu job dengan folder berspasi. Biaya kecil, menutup klaim
  "macOS/Linux belum diuji" sebagian.
- `dokter` memeriksa spasi di path, dan keberadaan `googlecloudtools.datacloud_telemetry` yang aktif, lalu mencetak perintah penonaktifannya. Bug itu milik plugin Google,
  sebaiknya juga dilaporkan ke Google.
- Contoh di dokumen harus mengutip path, dan bentuk rumit harus diganti CLI.
- Catatan kecil yang menunjukkan bahayanya: sewaktu riset, `awk '{print $5}'` pada `ls -l` memberi angka salah karena nama pengguna berspasi menggeser kolom. Skrip proyek yang
  mem-parsing keluaran seperti ini rawan **[U]**.

### Video pertama dalam hitungan menit

Yang realistis: **melihat hasil** dalam semenit, **MP4 pendek** dalam beberapa menit, sesudah alat terpasang.

Struktur README yang disarankan (saat ini bagian Install baru muncul di baris 217 dari ±470):

```
## Quick start (3 steps)
1. Install    <satu perintah per agen, tab Claude / Antigravity / Codex-Cursor-Gemini>
2. Ask        "Make a 15-second bumper for my channel <nama>. Build it right away."
3. Open       double-click index.html
Optional: MP4 → node …/wevai.mjs dokter, lalu minta "render ke MP4"
```

- Kata "Build it right away" memanfaatkan pengecualian gerbang yang sudah ada ("langsung buat").
- Tanpa Node pun tetap jalan sampai `index.html`.
- Patokan waktu dinyatakan jujur: 15 dtk × 30 fps = 450 frame pada ±3–6 frame/dtk (angka mesin 2 inti di `alat-kerja.md`), jadi ±1,5–2,5 menit render.
- `suggestedPrompts` di `.antigravity-plugin/plugin.json` (maksimal 3) **[F]** dan field `compatibility` di `SKILL.md` adalah tambahan kecil. Pemuat plugin membuang diam-diam
  field tingkat atas yang tak dikenal, jadi validasi ulang dengan `--strict`.

---

## Kandidat 1.5

Urutan kerja: K1 dulu untuk memperoleh baseline **sebelum** mengubah `SKILL.md`.

| # | Kandidat | Manfaat | Biaya | Risiko bagi Claude Code |
|---|---|---|---|---|
| **K1** | Eval pemicu dan gerbang: lapis 0–2, `eval-pemicu`, `eval-jejak`, `evals/pemicu.json`, baseline Flash dan Claude | Satu-satunya cara mengetahui apakah sisa daftar ini berhasil; menjawab "pemilihan skill hanya teruji saat diminta" | Sedang; kuota pemilik per run | Tidak ada (tak menyentuh runtime) |
| **K2** | Susun ulang `SKILL.md`: checklist + Alur kerja + gerbang di awal, target ±17 000 byte (±5 000 token); templat style brief di `assets/`; perbaiki "enam baris" dan "25–40 detik"; rute dokumenter di Peta baca; "Jebakan agen"; batas baca eksplisit; `context-budget` dua kolom; penunjuk bagian sunting di starter; daftar isi 4 berkas | Gerbang tetap terbaca sesudah kompaksi dan pada model lemah; ruang kerja kembali tersedia | Kecil sampai sedang | **Sedang.** Urutan baca berubah. Mitigasi: bandingkan dengan baseline K1, per `aturan-rilis.md` penataan ulang bukan MAYOR |
| **K3** | `scripts/wevai.mjs` (`dokter`, `baru`, `cek`, `render`, `status`), `wevai.json`, `AGENTS.md` per proyek, render yang sungguh terlepas (uji `Win32_Process.Create`) | Menutup folder salah, pakai ulang, kutipan shell, render mati, kelanjutan sesi; memperpendek `SKILL.md` | Sedang | Kecil. Skrip lama tak berubah. `SKILL.md` kini menyarankan jalur baru, jadi perlu eval |
| **K4** | Lint v2 (tabel statis) + perbaikan `--help`; `snap --audit` (teks terpotong, kecil, tumpang tindih, tingkat teks, gerak); kantong teks di `nilai-visual`; `eval-run` memanggil `nilai-visual` | Aturan terpenting menjadi mesin, terutama syarat keras "teks tak terpotong" | Kecil untuk lint, sedang untuk audit | Kecil sampai sedang. FAIL baru dapat menghentikan alur lama. Mulai dari WARN satu rilis, jalankan pada 18 starter dan beberapa proyek nyata dulu |
| **K5** | `references/dokumenter.md` + skrip inti pindah dari proyek (`linimasa`, `vo_utuh`, `srt`, `kata_proporsional`, rakit audio ber-konfigurasi, jeda sebagai parameter) + uji panjang mini lapis 4 | Video 45–90 menit menjadi jalur yang terdokumentasi dan bisa diulang; mengurangi 8 varian berbeda | Sedang sampai besar | Kecil, jalur baru. Menambah satu baris di Peta baca |
| K6 | `description` baru dari hasil K1 | Pemicu tanpa kata "skill" | Kecil | Sedang: pemicu Claude ikut berubah. Ukur dengan `plugin eval` |
| K7 | README: Quick start, tabel agen baru, `--depth 1`, satu perintah Claude | Pengguna baru | Kecil | Tidak ada |
| K8 | CI Windows, macOS, path berspasi; zip rilis; `export-ignore` | Menutup klaim belum diuji; unduhan kecil | Kecil | Tidak ada |
| K9 | Dependensi di `~/.wevai`; `dokter --pasang` | Plugin selamat saat pembaruan | Kecil sampai sedang | Kecil, urutan pencarian lama didahulukan |
| K10 | `compatibility`, `suggestedPrompts`, bersihkan info basi di `checklist.md` | Kerapian | Kecil | Tidak ada |
| K11 | Riwayat proyek lokal untuk "berbeda dari proyek sebelumnya" | Hukum #3.4 terukur | Sedang | Kecil. **Tunda** |

**Sketsa awal `SKILL.md` sesudah K2 + K3** (hanya gambaran, bukan teks final):

```markdown
## Mulai di sini: salin dan centang
- [ ] 1 Jenis dan jalur baca (tabel di bawah). Baca hanya itu, lalu berhenti membaca.
- [ ] 2 Tulis style brief + rundown dari assets/brief-templat.md.
- [ ] 3 BERHENTI. Kirim, akhiri giliran. Permintaan awal bukan persetujuan,
        karena merombak rundown murah dan merombak kode mahal.
- [ ] 4 node "<folder skill>/scripts/wevai.mjs" baru <nama> --jenis <j> --setuju "<kutipan balasan user>"
- [ ] 5 Bangun adegan di bagian yang ditunjuk `baru`.
- [ ] 6 wevai cek → perbaiki sampai keluar 0. Buka shots/kontak.png, nilai seperti sutradara.
- [ ] 7 Serahkan index.html. MP4 hanya bila diminta: wevai render, lalu wevai status.
Bingung atau sesi baru: jalankan wevai status.
```

---

## Yang tidak disarankan

| Hal | Alasan |
|---|---|
| Server MCP WeVai | Lihat P4 |
| Hook global atau hook plugin | Kasus telemetri; dokumen dan perilaku lapangan tidak cocok; berlaku di semua percakapan. Hook tingkat proyek hanya setelah uji U12 |
| Workflow lama, atau `rules/AGENTS.md` di plugin | Workflow mati; rules plugin selalu aktif di percakapan apa pun |
| `run_workflow`, `/teamwork`, sidecar, atau remote agent di inti skill | Terikat Antigravity, boros kuota, atau lokal tak terjangkau |
| Cabang "jika Flash" atau "jika Antigravity" di `SKILL.md` | Menaikkan beban pada model lain. Tulis untuk yang terlemah, sesuai saran "aim for instructions that work well with all of them" |
| Penilai visual otomatis lewat LLM sebagai gerbang | Pemilik tetap penilai rasa. Penilai LLM boleh sebagai bantuan perbandingan buta, bukan vonis |
| Eval penuh 10 brief tiap rilis | Tak akan dijalankan, sebagaimana terbukti 1 dari 8 sejak September. Tiga brief lebih jujur |
| Menaikkan batas `context-budget` lagi | Mengukur hal yang salah. Pisahkan dulu aturan dan perkakas |
| Memecah WeVai menjadi beberapa skill sekarang | Bisa membantu pemicu, tetapi menambah keterkaitan dan beban pemasangan. Nilai ulang setelah K1 |
| Lanjut per frame di tengah babak | Babak ≤ 10 menit sudah membatasi kerugian |
| Paket npm atau `npx skills` sebagai rute utama | Lihat P5 |

---

## Fakta vs dugaan yang menentukan

**Terukur hari ini [U]:** ukuran dan posisi `SKILL.md`; ukuran blok starter; ukuran repo; `lint --help` keliru; "enam baris" vs 16 butir; 8 varian `rakit_audio.py` dan `build.mjs`; `srt.py`, `or_tts.py`, `kata_proporsional.py` identik antar proyek; CI hanya Ubuntu.

**Fakta dari dokumen [F]:** semua batas pada tabel klien; perilaku `-p` dan `stream-json`; fitur `plugin eval`; `PLUGIN_ROOT` hanya baca; rules tak dimuat dari subfolder di bawah workspace; aturan job object Windows.

**Dugaan [D]:**

- Bahwa memindahkan alur ke atas menaikkan kepatuhan Flash. Praktik resmi mendukung arah itu, tetapi tak ada bukti untuk skill ini.
- Bahwa `--setuju` mengurangi pelanggaran. Bisa jadi agen mengarang kutipan.
- Bahwa kematian render berkaitan dengan job object.
- Bahwa `Win32_Process.Create` cukup. Bisa saja ada masalah lain (sesi, jaringan, GPU).
- Bahwa `view_file` atau `skill_search` terlihat seperti diharapkan di `stream-json`.
- Bahwa `AGENTS.md` per proyek bertahan melewati kompaksi.
- Perkiraan token ±3,4 karakter per token. Sebab itu, klaim "Alur kerja lewat 5 000 token" perlu dibuktikan dengan penghitung token nyata. Selisih 5 % saja bisa mengubah posisinya, walau kesimpulan "terlalu jauh di belakang" tetap berlaku untuk kalimat BERHENTI di ±5 650.
- Bahwa rute `agy plugin install` bermasalah untuk `node_modules`.

**Tidak diketahui:** isi rilis `agy` 1.5.0 (tak ada di changelog publik), nilai N pada `view_file`, kuota per run `-p`, cara kerja kuota untuk subagen `flash`.

---

## Yang perlu diuji pemilik di Antigravity

Sesudah render selesai. Urutan dari yang termurah. Catat permukaan (IDE/App/CLI), model, dan versi tiap kali.

| # | Uji | Cara | Yang dicatat |
|---|---|---|---|
| U1 | Pemicu alami di IDE | Sesi baru, Flash, 6 prompt tanpa kata "skill": dokumenter 45 menit, promo aplikasi, explainer gunung meletus, potong video ffmpeg, animasi hover CSS, "tulis naskah saja" | Apakah `SKILL.md` dibaca; salah pilih `generative_ui`; jawaban teks panduan editor |
| U2 | Bentuk jejak | Tiga kali `agy -p "<prompt dokumenter>" --output-format stream-json --print-timeout 3m > a.ndjson` | `tool_name` saat membaca skill; `usage` per run; apakah baca skill di luar workspace ditolak lunak |
| U3 | Selera baca Flash | Dari U2, atau satu uji gerbang: jumlah berkas dan byte terbaca, Flash vs Argon | Patokan K2; nilai N `view_file` |
| U4 | Ketahanan proses | Agen menjalankan skrip dummy (`node` tidur 2 jam, menulis log tiap menit, **bukan render**) tiga cara: tugas latar agen, `Start-Process`, `Invoke-CimMethod Win32_Process Create`. Lalu restart IDE, arsipkan percakapan, tutup app | Mana yang bertahan pada tiap kejadian. Inilah dasar `wevai render` |
| U5 | `/schedule` | Timer 5 menit "cek log", lalu tutup App, buka lagi | Apakah terpicu saat tertutup; apakah pencegah sleep berlaku saat hanya ada proses terlepas |
| U6 | `/goal` dengan gerbang | `/goal` sesudah persetujuan, bukti "lint keluar 0" | Apakah berhenti tepat; apakah melewati gerbang bila dipakai sebelum persetujuan |
| U7 | `AGENTS.md` per proyek | Folder proyek sebagai workspace, lalu folder induk sebagai workspace | Apakah agen menyebut isinya; apakah dibaca Codex/Cursor bila ada |
| U8 | Sesudah kompaksi | `/compact` di tengah kerja, lalu minta agen mengutip langkah berhenti | Apakah aturan masih dikenal |
| U9 | Pasang plugin | Dalam profil terpisah: `agy plugin install <github>`, cek `agy plugin list --json`, `npm install`, perbarui | Skill terdeteksi; lokasi `node_modules` selamat atau tidak |
| U10 | Gambar | Minta agen membuka `shots/kontak.png` dan menyebut isi frame | Benar-benar melihat atau tidak |
| U11 | Video panjang mini | 3 babak @ 20 dtk, FPS 15, sesi baru per babak, restart di tengah render | Kelanjutan, status, gabung, jam nyata |
| U12 | Hook proyek (opsional) | `.agents/hooks.json` pada folder uji dengan skrip yang sengaja gagal, dan path berspasi | Fail open atau memblokir |
| U13 | Video panjang sungguhan | Sesudah U4 dan U11: satu video 45 menit | Baru sesudah ini lencana README |

---

## Keraguan untuk pemilik

1. **Isi publik atau pribadi.** Apakah rantai dokumenter (rakit VO, SRT, thumbnail, deskripsi YouTube) masuk WeVai publik, atau hanya inti gerbang dan pemeriksaan? Bagian yang terikat format saluran sebaiknya tetap di proyek.
2. **Permukaan sasaran.** Uji 1.4.0 di IDE dan `agy`. Dukungan App dianggap ikut, atau wajib diuji sendiri? Model sasaran hanya Flash, atau juga Argon?
3. **Target 5 000 token.** Memindahkan 6 KB aturan ke templat dan rujukan memaksa satu berkas baca lagi. Saran resmi mendukung, tetapi terjadi perubahan cara skill terbaca di Claude Code yang selama ini sudah berfungsi. Pemilik boleh memilih sasaran lebih lunak: cukup pindahkan Alur kerja ke atas.
4. **`--setuju` berisi kutipan user.** Dapat diterima sebagai gerbang, atau terlalu formal? Alternatifnya tanpa gerbang mesin sama sekali.
5. **Anggaran kuota eval per rilis.** Berapa yang rela dipakai? Lapis 1–2 murah tetapi tetap memakai kuota 5 jam dan mingguan.
6. **Riwayat `evals/bukti`.** Biarkan, atau pindah ke aset rilis mulai 1.5? Menulis ulang riwayat tidak disarankan.
7. **Pengajuan marketplace** Antigravity dan direktori Anthropic: keduanya berarti janji dukungan kepada pengguna lain, sedangkan video panjang belum teruji.

---

## Sumber

**Agent Skills:** [spesifikasi](https://agentskills.io/specification) · [best practices](https://agentskills.io/skill-creation/best-practices.md) · [deskripsi](https://agentskills.io/skill-creation/optimizing-descriptions.md) · [evaluasi](https://agentskills.io/skill-creation/evaluating-skills.md) · [skrip](https://agentskills.io/skill-creation/using-scripts.md) · [klien](https://agentskills.io/client-implementation/adding-skills-support.md)

**Anthropic:** [best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · [skills Claude Code](https://code.claude.com/docs/en/skills) · [plugin evals](https://code.claude.com/docs/en/plugin-evals) · [manifest plugin](https://code.claude.com/docs/en/plugins-reference) · [publikasi](https://code.claude.com/docs/en/plugins/publish.md) · [skill-creator](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md) · [webapp-testing](https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md)

**Antigravity:** [changelog](https://antigravity.google/docs/changelog) · [skills](https://antigravity.google/docs/skills/) · [discovery](https://antigravity.google/docs/customization-discovery/) · [rules](https://antigravity.google/docs/rules/) · [hooks](https://antigravity.google/docs/hooks/) · [subagen](https://antigravity.google/docs/subagents/) · [/goal](https://antigravity.google/docs/commands/goal/) · [/schedule](https://antigravity.google/docs/commands/schedule/) · [/teamwork](https://antigravity.google/docs/teamwork/) · [sidecar](https://antigravity.google/docs/sidecars/) · [remote agents](https://antigravity.google/docs/remote-agents/) · [headless](https://antigravity.google/docs/cli/headless/) · [praktik CLI](https://antigravity.google/docs/cli/best-practices/) · [marketplace](https://antigravity.google/docs/marketplace/) · [build plugins](https://antigravity.google/docs/build-plugins/)

**Lokal (dibaca, tidak dijalankan):** `%USERPROFILE%\.gemini\antigravity\builtin\skills\` (`agy-customizations\docs\hooks.md`, `skills.md`; `run-workflow\SKILL.md`; `plugin\SKILL.md`), `agy.version.json`, string `agy.exe` 1.5.0.

**Klien lain:** [Codex](https://learn.chatgpt.com/docs/build-skills) · [Gemini CLI](https://geminicli.com/docs/cli/skills/) · [Cursor](https://cursor.com/docs/context/skills) · [vercel-labs/skills](https://raw.githubusercontent.com/vercel-labs/skills/main/README.md) · [daftar agennya](https://raw.githubusercontent.com/vercel-labs/skills/main/docs/agents.md)

**Gemini:** [prompting (AI Studio)](https://aistudio.google.com/docs/prompting-strategies) · [prompting (ai.google.dev)](https://ai.google.dev/gemini-api/docs/prompting-strategies) · [Gemini 3.8 Flash](https://aistudio.google.com/docs/models/gemini-3.8-flash) · [what's new 3.8](https://aistudio.google.com/docs/whats-new-gemini-3.8)

**Lain:** [MCP Tasks](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks) · [Windows Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)
