# Riset: WeVai di Google Antigravity

Tanggal: 2026-11-03 · Cakupan: Antigravity App 2.x (language server 2.28.2), Antigravity CLI `agy` 1.4.x,
Antigravity IDE 2.6.0, dan ekstensi IDE, dibandingkan dengan cara WeVai dipakai sekarang (Claude Code di VS Code).
Audit repo memakai `main` @ `0748e0b`. Nomor baris `file:line` merujuk ke commit itu. Working tree sekarang ada di
branch `feat/starter-sinematik` milik agen lain, yang menggeser beberapa baris di SKILL.md setelah baris 378 sebanyak
+1.

**Metode.** Fakta Antigravity diambil dari tiga sumber primer:

1. **Dokumen resmi** `antigravity.google/docs/*`, changelog resmi, dan blog resmi. Halaman dibaca lewat WebFetch, yang
   meringkas isinya. Kutipan di sini karena itu parafrase, kecuali yang diberi tanda kutip. Changelog dibaca dalam lima
   potongan (offset 0–400 000).
2. **Berkas produk yang terpasang di mesin ini.** Ini termasuk dokumen bawaan Google yang dikirim bersama produk, yaitu
   skill bawaan `agy-customizations`, `antigravity_guide`, `plugin`, dan lain-lain. Lokasinya
   `%USERPROFILE%\.gemini\antigravity\builtin\skills\…`, bertanggal 30 Okt 2026. Termasuk juga `product.json` IDE dan
   string di biner `%USERPROFILE%\.gemini\bin\agy.exe` 1.4.11.
3. **Spesifikasi Agent Skills** ([agentskills.io/specification](https://agentskills.io/specification)).

Bukti dari string biner menunjukkan apa yang ada di kode, tetapi belum membuktikan perilakunya, jadi ditandai
**[belum terverifikasi]**. Antigravity tidak dijalankan, Chrome/puppeteer tidak dijalankan, dan tidak ada berkas lain
yang diubah.

---

## Ringkasan temuan

1. **Antigravity membaca format Agent Skills secara native.** WeVai bisa dipasang apa adanya sebagai satu folder skill.
   Skill global ada di `~/.gemini/config/skills/<nama>/SKILL.md` untuk App, CLI, dan IDE. Skill workspace ada di
   `.agents/skills/<nama>/`. Hanya `name` + `description` yang masuk konteks. SKILL.md dibaca saat model atau user
   memilihnya, dan di App bisa dipanggil `/<nama-skill>`
   ([docs/skills](https://antigravity.google/docs/skills/), [customization-discovery](https://antigravity.google/docs/customization-discovery/)).
2. **Workflow sudah mati.** "Current workflows will stop working on October 19, 2026". Penggantinya skill dengan slash
   command sendiri ([ide/workflows](https://antigravity.google/docs/ide/workflows/),
   [migrasi](https://antigravity.google/docs/migration/workflows-to-skills/)). Jadi **jangan membuat workflow `/wevai`**,
   karena skill `wevai` sudah memberi `/wevai`.
3. **Shell Windows adalah PowerShell.** Changelog CLI v1.0.10 (19 Jun 2026): PowerShell menjadi shell bawaan di Windows.
   Changelog v1.3.3 (10 Okt 2026): jatuh ke Windows PowerShell bila PowerShell 7 dari Store gagal. Mesin ini hanya punya
   **Windows PowerShell 5.1** (tanpa `pwsh`). Akibatnya contoh WeVai bergaya bash patah: `MP4=out.mp4 node …`,
   `cd … && npm install`, dan `PUPPETEER_SKIP_DOWNLOAD=1 npm install`. Selain itu `PUPPETEER_EXECUTABLE_PATH` di mesin
   ini **tidak** di-set permanen, dan Chrome bawaan puppeteer tidak ada (`~/.cache/puppeteer` tidak ada). Maka
   `snap.mjs` dan `export-frames.mjs` gagal di Antigravity sampai env itu di-set.
4. **Bahaya `--help`.** Dokumen skill Antigravity menyuruh agen menjalankan skrip skill dengan `--help` dulu
   ([docs/skills](https://antigravity.google/docs/skills/)). `export-frames.mjs` tidak mem-parse argumen, sehingga
   `--help` **langsung memulai render penuh** `./index.html` (berjam-jam). `vendor-libs.mjs --help` menulis
   `index-arsip.html`.
5. **Aturan global pemilik di Antigravity bertabrakan dengan WeVai.** `%USERPROFILE%\.gemini\GEMINI.md` selalu dimuat
   dan menyuruh "Modern typography (Inter/Geist), curated palettes (dark mode…)". WeVai melarang Inter sebagai font
   display (SKILL.md:227–228) dan melarang latar gelap otomatis (SKILL.md:280). Aturan always-on disuntikkan setiap
   giliran, sedangkan skill hanya dibaca sekali, sehingga Gemini bisa condong ke Inter + gelap.

Temuan lain:

- **Pengganti tool Claude Code:**

  | Claude Code | Antigravity |
  |---|---|
  | AskUserQuestion | `ask_question` |
  | Task/Agent | `invoke_subagent` |
  | TodoWrite | task group / implementation plan |
  | Skill tool | `skill_search` + `view_file` atau `/wevai` |

  Runtime WeVai tidak memakai satu pun tool khusus Claude itu. Satu-satunya sisa adalah kata "→ Read" di
  `ae-bridge-higgsfield.md:20`.
- **Konteks bukan masalah.** Gemini 3.8 Flash dan Gemini 4 Argon punya konteks 1 048 576 token. Jalur WeVai ±51–73 ribu
  token (`context-budget.mjs`).
- **Sandbox Windows tidak tersedia di mesin ini.** Ia butuh Windows 11 24H2 + update Agustus 2026, sedangkan mesin ini
  21H2 build 22000. Bila nanti aktif, sandbox memutus jaringan, sehingga CDN GSAP gagal dan snap ikut gagal.

**Rekomendasi singkat:**

- **Koreksi 4 Nov (uji lapangan, `agy` 1.5.0):** junction **tidak dikenali**. Skill di folder biasa terbaca, skill lewat junction tidak.
  Pasang lewat manifest `%USERPROFILE%\.gemini\config\skills.json` (lihat C4). `setx PUPPETEER_EXECUTABLE_PATH` tak perlu lagi sejak Chrome ditemukan otomatis.
- Tambah 6 perbaikan kecil yang netral-agen di repo (bagian C2).
- Tanpa workflow, AGENTS.md/GEMINI.md, MCP, hook, atau skrip instal.
- Manifest plugin `.antigravity-plugin/` **ditunda** sampai `agy plugin validate` membuktikan SKILL.md di akar terbaca.

---

## A. Antigravity, dari sumber primer

### A1. Keadaan produk (per 3 Nov 2026)

| Tanggal | Peristiwa | Sumber |
|---|---|---|
| 18 Nov 2025 | Antigravity pertama: IDE berbasis VS Code + Agent Manager | [blog](https://antigravity.google/blog) ("Introducing Google Antigravity…") |
| 19 Mei 2026 | **Antigravity 2.0**: aplikasi desktop mandiri yang agent-first (tanpa IDE), plus CLI, SDK, dan API. IDE tetap ada dan Agent Manager akan dicabut dari IDE | [blog 2.0](https://antigravity.google/blog/introducing-google-antigravity-2), changelog App v2.0.1 (19 Mei 2026) |
| Mei 2026 | Antigravity mengadopsi standar Agent Skills | [migrasi workflows→skills](https://antigravity.google/docs/migration/workflows-to-skills/) |
| 18–20 Agu 2026 | Ekstensi IDE (VS Code v1.0.0 18 Agu, blog 20 Agu) | [changelog](https://antigravity.google/docs/changelog), [blog](https://antigravity.google/blog) |
| 19 Okt 2026 | Workflow lama berhenti bekerja | [ide/workflows](https://antigravity.google/docs/ide/workflows/) |
| 29 Okt 2026 | Plugin Marketplace (partner: Figma, Linear, Notion, Stripe) | [blog marketplace](https://antigravity.google/blog/plugin-marketplace-in-antigravity), changelog App v2.28.2 |

**Versi terbaru** menurut [changelog](https://antigravity.google/docs/changelog):

- App **v2.28.2** (29 Okt 2026)
- CLI **v1.4.10** (29 Okt 2026)
- ekstensi VS Code **v1.10.0** (26 Okt 2026)
- IDE mandiri: indeks versi sampai **v2.6.0**. Detailnya tidak terbaca lewat WebFetch.

**Permukaan produk** ([getting-started](https://antigravity.google/docs/getting-started)):

- **App:** aplikasi desktop.
- **CLI** `agy`: klien terminal.
- **IDE mandiri** (fork VS Code).
- **Ekstensi IDE:** VS Code, Visual Studio, JetBrains, Zed, Xcode, Eclipse.
- **SDK Python.**

Semuanya memakai sistem kustomisasi yang sama. IDE dan App "share the same underlying agentic capabilities"
(`…\builtin\skills\antigravity_guide\references\ide.md:7-11`).

**Yang terpasang di mesin ini** (dibaca saja, tidak dijalankan):

| Komponen | Versi | Bukti |
|---|---|---|
| Antigravity IDE | **2.6.0** (VS Code OSS 1.107.0, build 2026-10-26) | `%LOCALAPPDATA%\Programs\Antigravity IDE\resources\app\product.json` (`ideVersion`, `date`) |
| Antigravity App | shell Electron 2.0.11 (4 Jun 2026); language server **2.28.2** | FileVersion `Antigravity.exe`; `%USERPROFILE%\.gemini\antigravity\cli.log` "Language server version: 2.28.2" |
| `agy` (backend App, tidak ada di PATH) | **1.4.11** (dipasang 30 Okt 2026) | `%USERPROFILE%\.gemini\bin\agy.version.json` |
| Ekstensi VS Code Antigravity | tidak terpasang | `%USERPROFILE%\.vscode\extensions` |
| OS / shell | Windows 11 Pro **21H2** build 22000; Windows PowerShell 5.1.22000; **tanpa `pwsh`**; Git Bash di PATH (`C:\Program Files\Git\usr\bin\bash.exe`) | registry `DisplayVersion`, `$PSVersionTable` |
| Node / ffmpeg / Chrome | Node v22.19.0; `C:\ffmpeg\bin\ffmpeg.exe`; Chrome terpasang; **`PUPPETEER_EXECUTABLE_PATH` tidak di-set (User/Machine)**; `~/.cache/puppeteer` tidak ada | `Get-Command`, `[Environment]::GetEnvironmentVariable` |

Bahwa FileVersion shell Electron (2.0.11) tidak mengikuti versi App (2.28.x) adalah tafsiran
**[belum terverifikasi]**. Language server-nya memang 2.28.2.

### A2. Mekanisme kustomisasi

**Akar penemuan.** Ada tiga lokasi:

- **Workspace:** `.agents/` (juga `.agent/`, `_agents/`, `_agent/`). Antigravity menelusuri dari CWD **naik sampai akar
  repo** (folder berisi `.git`), tidak turun ke subfolder, dan memindai satu tingkat.
- **Global:** `~/.gemini/config/`.
- **Aturan berbasis direktori:** `GEMINI.md`/`AGENTS.md`.

Sumber: [customization-discovery](https://antigravity.google/docs/customization-discovery/),
`…\builtin\skills\agy-customizations\SKILL.md:39-54`.

**Prioritas bila nama bentrok.** Untuk skill/agen, urutannya:

1. folder personal di repo;
2. workspace (termasuk manifest `.agents/`);
3. `~/.gemini/config/`;
4. bawaan.

Aturan tidak bentrok, semuanya dimuat. Skill dari plugin bernama `<plugin>:<skill>`
([customization-discovery](https://antigravity.google/docs/customization-discovery/);
`agy-customizations\SKILL.md:64-74`).

| Mekanisme | Lokasi workspace · global | Format | Aktivasi | Batas |
|---|---|---|---|---|
| **Rules** | `AGENTS.md`/`GEMINI.md` di folder mana pun, `.agents/AGENTS.md`, `.agents/rules/*.md` · `~/.gemini/AGENTS.md`, `~/.gemini/GEMINI.md`, `~/.gemini/config/{AGENTS,GEMINI}.md`, `~/.gemini/config/rules/*.md` | `AGENTS.md`/`GEMINI.md` tanpa frontmatter (selalu aktif). `rules/*.md` wajib `trigger: always_on \| model_decision \| glob \| manual`, plus `description`, `globs`. Include `@[label](path)` | always_on: penuh setiap giliran. model_decision: hanya path + deskripsi. glob: saat menyentuh berkas cocok. manual: `@`-mention (CLI tidak mendukung) | **24 000 byte per berkas**, dipotong. **Anggaran 20 000 token** untuk rules always-on + global; lewat anggaran → jadi penunjuk path ([rules](https://antigravity.google/docs/rules/); `docs\rules.md:29-40`) |
| **Workflows** | dulu `.agents/workflows/*.md` · `~/.gemini/config/workflows/*.md` | Markdown, ≤ 12 000 karakter | `/nama` | **Usang. Berhenti 19 Okt 2026.** `/migrate-workflows` mengubahnya jadi skill. Bila nama sama, skill menang ([ide/workflows](https://antigravity.google/docs/ide/workflows/), [migrasi](https://antigravity.google/docs/migration/workflows-to-skills/), `builtin\skills\migrate-workflows\SKILL.md:10-18`) |
| **Skills** | `.agents/skills/<nama>/SKILL.md` · `~/.gemini/config/skills/<nama>/` (App, CLI, IDE; IDE juga legacy `~/.gemini/antigravity/skills/`). CLI saja: `~/.gemini/antigravity-cli/skills/`, `~/.gemini/skills/` | Frontmatter `name` (opsional, default nama folder) + `description` (wajib). Folder opsional `scripts/ examples/ resources/ references/` | Model melihat nama + deskripsi tiap giliran lalu membaca SKILL.md. App: `/<nama-skill>`. CLI: tiap skill otomatis jadi slash command (`/skills reload`) | Tidak ada angka untuk skill. Plugin: `description` 1–1 024 karakter, `name` = nama folder induk ([build-plugins](https://antigravity.google/docs/build-plugins/)). Rekomendasi: "jalankan skrip dengan `--help` dulu" ([skills](https://antigravity.google/docs/skills/); `docs\skills.md:9-19, 47-66`) |
| **Manifest** | `.agents/skills.json`, `rules.json`, `agents.json`, `plugins.json` · sama di `~/.gemini/config/` | `{"entries":[{"path","include_only","exclude"}],"inherits":[…]}`. Tiap entry dipindai satu tingkat. Path absolut boleh (di luar workspace). Dokumen web: "doesn't expand `~`", dokumen bawaan: `~/` didukung, jadi pakai path absolut | Otomatis | [customization-discovery](https://antigravity.google/docs/customization-discovery/); `docs\json_configs.md:46-52, 86-96` |
| **AGENTS.md / GEMINI.md** | lihat Rules | Markdown polos | Selalu aktif untuk foldernya | 24 KB per berkas; masuk anggaran 20k token |
| **MCP** | `.agents/mcp_config.json` · `~/.gemini/config/mcp_config.json` · `<plugin>/mcp_config.json` | `{"mcpServers":{"x":{"command","args","env","cwd"} \| {"serverUrl"/"url","headers","oauth",…}}}`. Stdio + Streamable HTTP; SSE lama tidak didukung | Tool otomatis masuk prompt. Izin `mcp(server/tool)` | Default 300 dtk connect, **180 dtk per panggilan tool** (`timeoutSeconds`). Token OAuth di `~/.gemini/antigravity/mcp_oauth_tokens.json` ([mcp](https://antigravity.google/docs/mcp/); `docs\mcp_servers.md:17-71`) |
| **Plugins** | `.agents/plugins/<p>/` · `~/.gemini/config/plugins/<p>/` | `plugin.json` di akar atau `.antigravity-plugin/plugin.json` (lebih diutamakan); juga `.gemini-plugin/`. Isi: `skills/ agents/ rules/AGENTS.md hooks.json mcp_config.json bin/`. Field `skills` = "Extra skill folders… in addition to skills/" ([schema](https://antigravity.google/schemas/v1/plugin.json)) | Aktif = semua isinya aktif. `config.json` mencatat enable/disable | Pasang: `agy plugin install <nama>` (hanya marketplace resmi `antigravity-plugins-official`), `agy plugin install https://github.com/<o>/<r>`, `agy plugin install ./folder`. `agy plugin import claude` membaca `~/.claude/plugins/` ([plugins](https://antigravity.google/docs/plugins/), [marketplace](https://antigravity.google/docs/marketplace/), [build-plugins](https://antigravity.google/docs/build-plugins/)) |
| **Hooks** | `.agents/hooks.json` · `~/.gemini/config/hooks.json` · plugin | `SessionStart/PreToolUse/PostToolUse/PreInvocation/PostInvocation/Stop`. Di Windows dijalankan lewat **`cmd /c`** | — | Sinkron dan memblokir loop (`docs\hooks.md:127-133, 404-407`) |
| **Ekstensi / Open VSX** | IDE mandiri: galeri `https://open-vsx.org/vscode/gallery` | `product.json` IDE (`extensionsGallery`) | — | Tidak relevan untuk WeVai (WeVai bukan ekstensi VS Code) |

**Kompatibilitas dengan plugin Claude Code.**

- [build-plugins](https://antigravity.google/docs/build-plugins/): repo boleh membawa `.claude-plugin/plugin.json` atau
  `.cursor-plugin/plugin.json` di samping `.antigravity-plugin/plugin.json`, dan berkas Antigravity yang menang.
- Dokumen bawaan (`docs\plugins.md:61-70`): `agy plugin install` men-*stage* `hooks/hooks.json` ketika mengimpor ekstensi
  Gemini CLI (`gemini-extension.json`) atau Claude Code (`.claude-plugin/plugin.json`).
- String di `agy.exe` 1.4.11 memuat `.claude-plugin/plugin.json` di jalur pemasang ("Cloning plugin from %s…"), dan
  regex substitusi `\$(?:\{(PLUGIN_ROOT|PLUGIN_DATA|CLAUDE_PLUGIN_ROOT)\}…)`. Artinya `${CLAUDE_PLUGIN_ROOT}` diperlakukan
  sebagai alias **[belum terverifikasi]**.
- **Belum diketahui** apakah plugin dengan SKILL.md di **akar** (cara WeVai) dikenali sebagai skill. Claude Code
  mendukungnya ("A plugin with `SKILL.md` at its root, no `skills/`, and no `skills` key loads as a single skill",
  [plugins-reference](https://code.claude.com/docs/en/plugins-reference)). Untuk Antigravity tidak ada dokumen yang
  menyebutnya **[belum terverifikasi]**. Changelog CLI v1.4.5 (22 Okt 2026) hanya menyebut field `skills` berupa
  satu string kini diterima.

### A3. Lingkungan eksekusi di Windows

**Shell.**

- CLI v1.0.10 (19 Jun 2026): PowerShell menjadi shell bawaan di Windows.
- CLI v1.3.3 (10 Okt 2026): perintah jatuh ke Windows PowerShell bila PowerShell 7 dari Store gagal.
- App v2.24.0 (15 Okt 2026): perbaikan "Access is denied" untuk PowerShell dari Store
  ([changelog](https://antigravity.google/docs/changelog)).
- Dokumen App/IDE tidak menyebut shell. String `agy.exe` memuat `powershell -NoProfile`, `-NoProfile -Command`,
  `pwsh.exe`, dan `powershell.exe` **[belum terverifikasi untuk App/IDE]**.
- Hook memakai `cmd /c` (`docs\hooks.md:129-130`).
- Dokumen bawaan plugin: "Each command you run is a fresh shell" (`builtin\skills\plugin\SKILL.md:49-50`). Jadi variabel
  `$env:` harus di-set di baris perintah yang sama.
- Di mesin ini PowerShell 5.1 tidak mengenal `&&` maupun prefiks `VAR=x cmd`.

**Persetujuan perintah dan izin** ([permissions](https://antigravity.google/docs/permissions/),
[agent-settings](https://antigravity.google/docs/agent-settings/), [sandbox](https://antigravity.google/docs/sandbox/)):

- **Preset App:**
  - Request Review: selalu tanya.
  - Default: perintah di sandbox, di luar sandbox tanya.
  - Auto (Preview): tersedia sejak v2.23.0 dan Windows 11 24H2+ (CLI v1.4.4).
  - Turbo: tanpa batas.
- **Aturan:** `allow/ask/deny` dengan prioritas Deny > Ask > Allow. Bentuknya `command(…)`, `command(regex:…)`,
  `read_file(path)`, `write_file(path)`, `read_url(domain)`, `execute_url(domain)`, `mcp(server/tool)`. Di Windows,
  huruf drive dibuang dan `\` diubah jadi `/` sebelum dicocokkan. Perintah PowerShell yang tak bisa dipecah jadi kata
  perlu cocok persis atau `regex:`.
- **CLI:** `toolPermission` = `request-review` (default) | `proceed-in-sandbox` | `strict` | `always-proceed`.
  `allowNonWorkspaceAccess` default `false`.
- **Mesin ini** (`%USERPROFILE%\.gemini\config\config.json`, `userSettings`):
  - `autoExecutionPolicy: CASCADE_COMMANDS_AUTO_EXECUTION_EAGER`;
  - `artifactReviewMode: ARTIFACT_REVIEW_MODE_TURBO`;
  - `browserJsExecutionPolicy: …DISABLED`;
  - `sandboxEnabledAtV2Migration: false`;
  - `globalPermissionGrants.allow` sudah berisi antara lain `command(npx)`, `command(npm run)`, `command(ffmpeg)`,
    `command(powershell)`, tetapi **tidak** `command(node)`.

**Berkas di luar workspace.**

- Default dan Request Review: berkas di luar workspace perlu persetujuan. Turbo: seluruh disk
  ([permissions](https://antigravity.google/docs/permissions/)).
- Pengecualian yang relevan untuk skill global: CLI v1.2.15 (2 Okt 2026) "restores the agent's ability to read global
  rules and customization files in `~/.gemini/config`, asking before edits".
- App v2.2.1 (25 Jun 2026): perbaikan agen terblokir membaca skill bawaan di bawah sandbox.
- Jadi skill di `~/.gemini/config/skills/` boleh dibaca. Membacanya lewat **junction** yang mengarah ke `E:\mila\wevai`
  mungkin dinilai sebagai path tujuan (di luar workspace) **[belum terverifikasi]**.
- Menjalankan `node <skill>\scripts\snap.mjs` adalah izin *command*, bukan *read_file*.

**Sandbox Windows.**

- Berjalan dalam AppContainer dan butuh "Windows 11 24H2 or later with the August 2026 update or later".
- Folder di luar profil user bisa dibaca tetapi tidak bisa ditulis. Berkas lain di profil user disembunyikan.
- **Tanpa jaringan** secara default. Domain `read_url` ditambahkan ke allowlist
  ([sandbox](https://antigravity.google/docs/sandbox/)).
- Pada Windows 10 dan Windows 11 sebelum 24H2, mode sandbox jatuh ke persetujuan biasa (CLI v1.4.1, 17 Okt 2026). Mesin
  ini **21H2**, jadi sandbox tidak aktif.
- Bila nanti di-upgrade: Chrome/puppeteer di dalam sandbox tidak bisa memuat GSAP/font dari CDN (`cdnjs.cloudflare.com`,
  `cdn.jsdelivr.net`, `fonts.googleapis.com`, `fonts.gstatic.com`, dihitung dari `assets/*.html` @0748e0b), dan skill
  di profil user tersembunyi. Aturan `command(node)` membuat perintah jalan tanpa prompt "inside or outside the
  sandbox".

**Perintah lama / latar belakang.**

- String `agy.exe`: `run_command` punya `WaitMsBeforeAsync`, lalu "the system will notify you that it is still running…
  Do not set this for daemon commands". Ada pula `command_status` dan `send_command_input` ("long-running processes")
  **[belum terverifikasi]**.
- Dokumen bawaan `run-workflow` (`SKILL.md:28-31`): pola async yang sama.
- Changelog:
  - App v2.28.0 (27 Okt): tampilan *background command*, ikon status "running a background command".
  - App v2.3.0 (13 Jul): *background tasks stop when a conversation is archived*.
  - App v2.15.0 (18 Sep): perintah yang terbunuh saat app restart dilaporkan *canceled*.
  - CLI v1.2.16 (3 Okt): agen pulih bila perintah latar crash.
- Kesimpulan: render berjam-jam yang dijalankan sebagai perintah agen **mati bila App di-restart atau percakapan
  diarsipkan**. Untuk render panjang, jalankan proses terlepas (detached) dengan log.

**Tidur/sleep.**

- FAQ: "If an agent is running, Antigravity prevents your computer from sleeping"
  ([faq](https://antigravity.google/docs/faq/)).
- Setelan App: "Keep computer awake" (`antigravity_guide\references\app.md:65`).
- Apakah perintah latar dihitung "agent running" **[belum terverifikasi]**. Pola penahan sleep pemilik
  (`SetThreadExecutionState`) tetap disarankan.

**Browser agent vs puppeteer.**

- Subagen browser mengendalikan Chrome lokal di profil terpisah, dengan screenshot dan rekaman WebM, plus
  allowlist/denylist ([ide/browser](https://antigravity.google/docs/ide/browser/),
  [features](https://antigravity.google/docs/features/)).
- Tidak ada dukungan seek deterministik ke `OPENER.seek(t)`. `file://` tidak disebut. Eksekusi JS di browser di mesin
  ini dimatikan (`browserJsExecutionPolicy`).
- Jadi `snap.mjs` (puppeteer) tetap jalur verifikasi. Browser agent hanya cadangan manual (`?debug=1`).

**Node.** Antigravity tidak menyediakan Node untuk perintah agen. `node` diambil dari PATH user (Node 22.19 di mesin ini)
**[belum terverifikasi: pewarisan PATH]**.

### A4. Model dan konteks

**Model yang tersedia** ([models](https://antigravity.google/docs/models/)):

- Gemini 4 Argon (AI Pro/Ultra/Enterprise);
- Gemini 3.8 Flash (semua plan);
- Gemini 3.7/3.6 Flash dan 3.1 Pro (Enterprise);
- Claude Sonnet 5.5 dan Opus 5.5 (Thinking; AI Pro non-trial/Ultra/Enterprise);
- Claude 4.6 ("Will be removed on November 2, 2026");
- GPT-OSS 120B.

Kuota dihitung terpisah per minggu dan per 5 jam.

**Jendela konteks:**

- Gemini 3.8 Flash: input **1 048 576**, output 65 536
  ([AI Studio](https://aistudio.google.com/docs/models/gemini-3.8-flash)).
- Gemini 4 Argon: **1 048 576** token
  ([AI Studio](https://aistudio.google.com/docs/models/gemini-4-argon)).
- Antigravity tidak menyebut angka konteks per model. CLI v1.2.8: "Compaction budgets scale to the full context window".

**Beban WeVai** (`node scripts/context-budget.mjs`, dijalankan 3 Nov):

| Jalur | Ukuran |
|---|---|
| inti | 48 KB ≈ 14k token |
| opener | 220 KB ≈ 66k |
| explainer aliran | 220 KB ≈ 66k |
| opener 3D | 243 KB ≈ 73k |
| kartun/3D/panggung | ±170 KB ≈ 51k |

Itu < 7 % konteks 1M. Yang perlu diperhatikan:

- **`view_file` membatasi jumlah baris per panggilan.** String `agy.exe`: "You can view at most %d lines at a time", dengan
  nilai N saat runtime **[belum terverifikasi]**. Berkas WeVai terpanjang adalah `opener-konsep.md` (820 baris) dan
  starter (≤ 989 baris), jadi mungkin perlu 2 panggilan.
- **Gambar dibatasi 2000 piksel per sisi** (CLI v1.4.10). Lembar kontak `snap.mjs` 4 kolom × 640 px ≈ 2 630 px lebar,
  jadi diperkecil. Ini sebanding dengan pengecilan gambar di Claude.

### A5. Perbedaan perilaku dari Claude Code

| Claude Code | Antigravity | Dampak untuk WeVai |
|---|---|---|
| Skill tool + "Base directory for this skill" | indeks nama/deskripsi tiap giliran; aktivasi = baca SKILL.md (`skill_search` / `view_file`; string `agy.exe`, `builtin\skills\automation\SKILL.md:227-228`) atau `/wevai` di App | `<folder skill>` harus disimpulkan dari path SKILL.md **[belum terverifikasi]**. Lebih aman bila SKILL.md mendefinisikannya |
| AskUserQuestion | `ask_question` (pilihan tunggal/ganda + isian bebas; `builtin\skills\automation\SKILL.md:20-23`; App v2.26.0 prompt tanya "docked"; CLI v1.2.7) | Netral: explainer.md:30-31 sudah berbunyi "pakai mekanisme tanya-jawab agenmu bila ada" |
| TodoWrite | *task groups* (subtugas + progres) dan artefak *Implementation Plan* (`/plan`, review policy) ([tools](https://antigravity.google/docs/tools/), [plan](https://antigravity.google/docs/plan/), [artifact-review](https://antigravity.google/docs/artifact-review/)) | WeVai tidak memakai TodoWrite. Gerbang "style brief disetujui sebelum kode" (SKILL.md:357-358) murni instruksi. Dengan Artifact Review **Turbo** (setelan pemilik), Antigravity tidak menahan rencana, sehingga kepatuhan bergantung pada model |
| Task/Agent (subagen) | `invoke_subagent`; subagen `research`, `browser`, `self`; agen kustom `.agents/agents/*.md`; `run_workflow` ([subagents](https://antigravity.google/docs/subagents/)) | Runtime WeVai tidak menyuruh subagen. Hanya `docs/superpowers/plans/*` (proses pengembangan) |
| Bash (Git Bash) + `run_in_background` | `run_command` di PowerShell + async/`command_status` | Contoh bash di WeVai patah (bagian B) |
| Read (gambar) | `view_file` "supports text files and following binary files: %s" (string `agy.exe`) **[belum terverifikasi: PNG]** | `snap.mjs` → `kontak.png` → agen membukanya |
| CLAUDE.md | `AGENTS.md`/`GEMINI.md` (CLAUDE.md tidak dibaca; string `CLAUDE.md` tidak ada di `agy.exe`) | WeVai tidak membawa CLAUDE.md. Aman |
| Artifacts claude.ai | Artefak Antigravity di folder `brain/<id>` dan `generative_ui` (HTML inline, CSP memblokir CDN selain Tailwind gstatic: `builtin\skills\generative_ui\SKILL.md`, bagian "Constraints & Theming") | Risiko: agen membuat deliverable sebagai artefak/widget, bukan `index.html` di folder proyek, sehingga GSAP CDN terblokir |

**Cara agen bertanya:** `ask_question`. Untuk hal terbuka, teks biasa. Pertanyaan dari skrip workflow tidak mungkin
("The user cannot be asked anything from a workflow", `builtin\skills\run-workflow\SKILL.md:133`).

**Cara agen merencanakan:** `/plan` atau mode planning membuat Implementation Plan yang bisa dikomentari lalu
**Proceed**. Ia tidak membuat apa pun bila review policy = Always proceed
([implementation-plan](https://antigravity.google/docs/implementation-plan/)).

---

## B. Audit repo: keterikatan pada Claude Code (`main` @0748e0b)

**Pola yang tidak ditemukan sama sekali di konten skill** (SKILL.md, `references/`, `assets/`, `scripts/`, `src/`):

- `CLAUDE_PLUGIN_ROOT`;
- `~/.claude` (hanya ada di README:218);
- `AskUserQuestion`, `TodoWrite`, instruksi Task/Agent/subagen;
- `allowed-tools`, hooks;
- slash command (hanya di bagian Claude di README);
- heredoc.

SKILL.md:18 sudah menyatakan "untuk AI coding agent apa pun (format Agent Skills terbuka)". Keterikatannya ternyata
**shell dan lingkungan, bukan tool Claude**.

| file:line | Asumsi | Di Antigravity | Perbaikan |
|---|---|---|---|
| SKILL.md:1-11 | frontmatter `name: wevai`, `description` 940 karakter, `license`, `metadata` bersarang | **Jalan.** Spesifikasi: `name` = nama folder induk, `description` ≤ 1 024 ([spec](https://agentskills.io/specification)). Antigravity hanya mendokumentasikan `name`/`description`. Skill bawaannya sendiri memakai `metadata:` (`builtin\skills\automation\SKILL.md:4-5`), sedangkan toleransi `license` **[belum terverifikasi]** | Folder pasang **harus** bernama `wevai` (bukan `wevai-main` dari zip). Tanpa ubahan |
| SKILL.md (542 baris, 38,5 KB) | dibaca utuh | **Menurun.** Melebihi saran spec "< 500 baris / < 5000 token". Kemungkinan perlu 2 kali `view_file` | Tidak mendesak. Pantau lewat `context-budget.mjs` |
| SKILL.md:370-371 (dan 374-377) | "salin `assets/starter-….html`" tanpa cara salin | **Menurun/berisiko.** Agen bisa mengetik ulang 37–100 KB lewat `write_to_file` (terpotong atau berubah) | Satu kalimat: salin dengan perintah salin berkas (`Copy-Item` / `cp`), jangan diketik ulang. Tulis `index.html` di folder proyek, bukan folder artefak/scratch |
| SKILL.md:385; references/alat-kerja.md:37, 51-58; scripts/lint-motion.mjs:8-10, export-frames.mjs:13-14, vendor-libs.mjs:21-22, serve.py:7, ae/bridge/aset-svg.py:6, svg2png.cjs:2, cdn-integrity.mjs:12-13, snap.mjs:18-19 (`<path>`) | placeholder `<folder skill>` / `<skill>` / `<path>` diisi agen dengan path absolut skill | **Jalan bila** model memakai path SKILL.md dari indeks skill **[belum terverifikasi]**. Tiga nama untuk satu hal | Definisikan sekali di SKILL.md: "`<folder skill>` = folder berisi SKILL.md ini (path absolut yang kamu pakai untuk membukanya)". Seragamkan jadi `<folder skill>` |
| SKILL.md:390-393; scripts/snap.mjs:58-60, 83 | "BUKA gambar itu" (`shots/kontak.png`) | **Jalan bila** `view_file` membaca PNG **[belum terverifikasi]**. Diperkecil ke ≤ 2000 px | Tanpa ubahan |
| references/ae-bridge-higgsfield.md:20 | "… unduh URL media … → **Read**" (nama tool Claude Code) | **Menurun** (istilah asing) | "→ buka gambarnya dengan alat baca-berkas agenmu (Read di Claude Code, `view_file` di Antigravity)" |
| references/alat-kerja.md:37; scripts/snap.mjs:12, export-frames.mjs:8, bench-frame.mjs:12, ae/bridge/svg2png.cjs:2; README.md:340; scripts/test-starters.mjs:15 | `cd … && npm install` | **Patah** di PowerShell 5.1 (`&&` tidak dikenal) | `npm install --prefix "<folder skill>/scripts"`: satu bentuk, jalan di bash, PowerShell, dan cmd |
| references/alat-kerja.md:13-14, 39-40; scripts/snap.mjs:14-15, export-frames.mjs:9-10, bench-frame.mjs:13-14, test-starters.mjs:17 | `PUPPETEER_SKIP_DOWNLOAD=1 npm install` + "set `PUPPETEER_EXECUTABLE_PATH` saat menjalankan" | **Patah** di mesin ini. Env tidak permanen dan Chrome bawaan puppeteer tidak ada, jadi `puppeteer.launch` gagal | Pemilik: `setx PUPPETEER_EXECUTABLE_PATH "C:\Program Files\Google\Chrome\Application\chrome.exe"` (sekali, semua agen). Dokumen: tambah bentuk PowerShell `$env:PUPPETEER_SKIP_DOWNLOAD='1'; npm install --prefix …` |
| references/alat-kerja.md:28, 53; scripts/export-frames.mjs:14, snap.mjs:19 | konfigurasi lewat prefiks env bash `MP4=out.mp4 node …`, `URL="file:///…" node …` | **Patah** di PowerShell (`MP4=out.mp4` dibaca sebagai nama perintah) | Satu baris contoh PowerShell: `$env:MP4='out.mp4'; $env:FPS='30'; node "<folder skill>\scripts\export-frames.mjs"`. Tidak perlu flag baru |
| scripts/export-frames.mjs:46-56 (tanpa parse argv) | dijalankan hanya dengan sengaja | **Patah/berbahaya.** `--help` (yang disarankan dokumen skill Antigravity) langsung merender `./index.html` penuh | Guard: bila `process.argv` memuat `--help`/`-h`, cetak pemakaian lalu `exit(0)` |
| scripts/vendor-libs.mjs:26-27 | idem | **Menurun.** `--help` dibuang dari argv, lalu menulis `index-arsip.html` | Guard yang sama |
| SKILL.md:398-411; references/alat-kerja.md:53 | render panjang (60 menit ≈ 4–8,6 jam) dijalankan agen; Claude memakai `run_in_background` | **Menurun.** Perintah latar Antigravity mati saat App restart atau percakapan diarsipkan | Paragraf pendek di alat-kerja.md: render > 10 menit dijalankan terlepas (`Start-Process` / `nohup`) dengan log, dan laptop dijaga tidak sleep |
| SKILL.md:117-133, 506-517; references/ae-bridge-higgsfield.md:1-21 | MCP gambar/video/AE "yang tersedia di agen user" | **Jalan bila dikonfigurasi.** Higgsfield harus didaftarkan di `~/.gemini/config/mcp_config.json`. Nama tool bisa ber-namespace lain. Batas 180 dtk per panggilan | README: satu baris cara mendaftarkan MCP di Antigravity. URL resmi Higgsfield **[belum terverifikasi]** (hanya sumber pihak ketiga menyebut `https://mcp.higgsfield.ai/mcp`) |
| SKILL.md:351-356; references/explainer.md:30-31 | SATU pertanyaan; "mekanisme tanya-jawab agenmu bila ada" | **Jalan** (`ask_question`) | — |
| SKILL.md:485; references/explainer.md:401 | tanpa berkas `.cmd`/`.bat` | Netral | — |
| README.md:13 | lencana "works with Claude Code · Codex · Gemini CLI · Cursor" | Klaim belum diuji, Antigravity tidak disebut | Tambah Antigravity **setelah** checklist C6 lolos |
| README.md:197-208 | pasang plugin Claude (`/plugin marketplace add …`, `/plugin install wevai@wevai`) | **Khusus Claude.** `/plugin` di Antigravity adalah pengelola plugin Antigravity (hanya marketplace resmi) | Tetap. Tambah subbagian Antigravity |
| README.md:216-221 | tabel manual: Claude `~/.claude/skills/wevai`; Codex via skills folder/AGENTS.md; Gemini CLI/Cursor: salin ke proyek + rujuk dari `GEMINI.md`/`.cursor/rules` | Antigravity tidak ada. Rute "rujuk dari GEMINI.md" memang dibaca Antigravity, tetapi sebagai aturan always-on (24 KB, anggaran 20k token), tanpa `/wevai` | Tambah baris: `%USERPROFILE%\.gemini\config\skills\wevai` |
| README.md:223 | "Install one copy… plugin skills are namespaced (`wevai:wevai`)" | Berlaku juga: skill plugin Antigravity bernama `<plugin>:<skill>` | Tanpa ubahan |
| .claude-plugin/plugin.json:1-23, marketplace.json:1-31; scripts/bump-version.mjs:32-33 | manifest Claude Code | Tidak dipakai rute skill. `agy plugin install <github>` mengenali `.claude-plugin/plugin.json`, tetapi SKILL.md di akar **[belum terverifikasi]** | Tetap. `.antigravity-plugin/plugin.json` hanya di fase 2 (dan baru saat itu masuk `bump-version.mjs`) |
| docs/superpowers/plans/2026-10-04-…md:3, 2026-10-22-…md:3, 2026-11-02-…md:3 | "REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development" | Khusus proses pengembangan Claude + plugin superpowers. Bukan runtime | Tetap |

**Di luar repo, tetapi mempengaruhi pemakaian sehari-hari:**

- **Skrip proyek video pemilik serba bash.** Contoh: `E:\mila\babad-nabi-jawa-01\alat\antre-render.sh:6-15` dan
  `cek\potret.sh:6-17` memakai `export PUPPETEER_EXECUTABLE_PATH=…`, prefiks `URL=… MP4=… node E:/mila/wevai/scripts/…`,
  dan `$(pwd -W)`. Dari PowerShell skrip itu tetap jalan lewat `bash alat\antre-render.sh`, karena `bash` di PATH adalah
  Git Bash (`C:\Program Files\Git\usr\bin\bash.exe`), bukan WSL. Agen Antigravity perlu diberi tahu itu, atau ia akan
  menulis ulang skrip dalam PowerShell.
- **Konflik `%USERPROFILE%\.gemini\GEMINI.md`.** Isinya "UI Craftsmanship… Modern typography (Inter/Geist), curated
  palettes (dark mode, OKLCH)". Ini bertentangan dengan SKILL.md:227-228 (font display bukan Inter) dan SKILL.md:280
  (latar tidak default gelap). Claude Code tidak melihat berkas ini.
- **Tumpang tindih dengan skill bawaan `generative_ui`.** Skill itu membuat widget HTML artefak, dan CSP-nya memblokir
  CDN GSAP. Permintaan "animasi" bisa terserap ke sana. Mitigasi: uji pertama memakai `/wevai` secara eksplisit.
- **Berkas belum di-commit milik agen lain.** `docs/aturan-rilis.md` (baris 79 menyebut `/plugin marketplace update`
  Claude) tidak diaudit.

---

## C. Rekomendasi

### C1. Pendekatan

- **Bentuk distribusi:** satu folder **Agent Skill** global, yaitu junction `%USERPROFILE%\.gemini\config\skills\wevai`
  → `E:\mila\wevai`. Folder ini dibaca App, CLI, dan IDE. Tidak ada salinan kedua. `scripts\node_modules` yang sudah ada
  ikut terpakai. Pola ini sama dengan kebiasaan sekarang: skrip proyek memanggil `node E:/mila/wevai/scripts/…`.
- **Perbaikan di repo:** enam perbaikan kecil yang netral-agen (C2). Semuanya juga berlaku di Claude Code, tanpa cabang
  "jika Antigravity".
- **Yang tidak dibuat:** workflow (mati sejak 19 Okt), AGENTS.md/GEMINI.md di repo (always-on, memakan anggaran 20k
  token, dan tak memberi `/wevai`), `mcp_config.json`/`hooks.json` (WeVai tidak punya server/hook sendiri; MCP
  Higgsfield milik akun pemilik), skrip instal (cukup satu perintah junction), dan **plugin Antigravity** (ditunda).

### C2. Berkas yang ditambah/diubah

| Berkas | Ubahan | Alasan (B) |
|---|---|---|
| `SKILL.md` | (1) Di bawah "Peta baca": satu kalimat definisi `<folder skill>`. (2) Langkah 3: "salin starter dengan perintah salin berkas (`Copy-Item`/`cp`), jangan diketik ulang; `index.html` ditulis di folder proyek". (3) Langkah 5–6: satu catatan shell: PowerShell memakai `$env:VAR='…'; node …` dan `;`, bukan `VAR=… node` atau `&&` | placeholder, salin starter, shell |
| `references/alat-kerja.md` | `npm install --prefix "<folder skill>/scripts"`. Tabel kecil "bash ↔ PowerShell" untuk `MP4/URL/FPS/WORKERS/PUPPETEER_*`. Paragraf "Render panjang" (terlepas + log + jangan sleep). `<skill>` → `<folder skill>` | `&&`, prefiks env, render panjang |
| `references/ae-bridge-higgsfield.md:20` | "→ Read" → alat baca-berkas agen | istilah Claude |
| `scripts/export-frames.mjs`, `scripts/vendor-libs.mjs` | guard `--help`/`-h` (cetak blok pemakaian dari komentar kepala, `exit 0`) sebelum `puppeteer`/`fetch` | bahaya `--help` |
| Komentar kepala `scripts/*.mjs`, `*.py`, `*.cjs` | ganti `cd … && npm install` dengan `npm install --prefix …`. Contoh env cukup merujuk ke tabel di alat-kerja.md | konsistensi |
| `README.md` | Install: subbagian "Google Antigravity" (junction/clone ke `%USERPROFILE%\.gemini\config\skills\wevai`, `setx PUPPETEER_EXECUTABLE_PATH`, `/wevai`, MCP di `~/.gemini/config/mcp_config.json`). Baris tabel manual. Contributing: `npm install --prefix scripts`. Lencana menyusul setelah uji | dokumentasi |
| `CHANGELOG.md` | entri "Belum dirilis: kompatibel Antigravity (Windows/PowerShell)" | — |
| *(opsional, bukan sekarang)* `.antigravity-plugin/plugin.json` | `{"name":"wevai","displayName":"WeVai","version":"…","description":"…","skills":"./"}` + masuk `bump-version.mjs`. Hanya bila `agy plugin validate --strict --json ./` membuktikan SKILL.md di akar terbaca | distribusi lewat `agy plugin install https://github.com/aammuhammad18-cmyk/wevai` |

Yang sengaja dilewati:

- **Deteksi otomatis Chrome di skrip.** `setx` sekali sudah menutupnya. Tambahkan bila ada user lain tanpa env.
- **Flag CLI pengganti env.** Satu baris contoh PowerShell sudah cukup.

### C3. Yang tetap khusus Claude

- `.claude-plugin/` (marketplace + plugin) dan bagian README "As a plugin (Claude Code)".
- `scripts/bump-version.mjs:32-33`.
- `docs/superpowers/**` (proses pengembangan berbasis subagen superpowers).

SKILL.md tidak perlu menyebut Claude atau Antigravity. Cukup istilah netral: "alat tanya-jawab agenmu", "alat
baca-berkas agenmu", dan "shell agenmu (bash atau PowerShell)". Istilah itu sudah dipakai di explainer.md:30-31, jadi
Claude Code tidak dirugikan.

### C4. Pasang + verifikasi oleh pemilik (di Antigravity)

**1. Pasang** (PowerShell; aman diulang):

```powershell
'{ "entries": [ { "path": "E:/mila", "include_only": ["wevai"] } ] }' | Set-Content -Encoding ascii "$env:USERPROFILE\.gemini\config\skills.json"
agy plugin disable googlecloudtools.datacloud_telemetry   # hook-nya patah pada nama pengguna berspasi dan memblokir SEMUA alat agen
Test-Path "E:\mila\wevai\scripts\node_modules\puppeteer"   # harus True; bila False:
#   $env:PUPPETEER_SKIP_DOWNLOAD='1'; npm install --prefix "E:\mila\wevai\scripts"
```

Terbukti di mesin ini 4 Nov: `agy` melaporkan `wevai` dari `E:\mila\wevai\SKILL.md`. Cadangan:

- Clone terpisah ke folder skill:
  `git clone https://github.com/aammuhammad18-cmyk/wevai "$env:USERPROFILE\.gemini\config\skills\wevai"`, lalu
  `npm install --prefix …\scripts`.

**2. Setelan** (tutup Antigravity sepenuhnya lalu buka lagi supaya env baru terbaca):

- **Global Permissions:** allow `command(node)`. Bila muncul prompt baca berkas skill, tambah juga
  `read_file(E:/mila/wevai)`.
- **App Settings:** *Keep computer awake* ON.
- **`%USERPROFILE%\.gemini\GEMINI.md`:** tambah satu kalimat pengecualian. Contoh: "Aturan UI di atas tidak berlaku
  untuk motion graphic/video WeVai; ikuti skill wevai." Ini keputusan pemilik.

**3. Buka workspace uji**, misalnya `E:\mila\uji-antigravity` (folder kosong), di App atau IDE. Periksa bahwa
`Customizations → Skills` memuat **wevai**.

### C5. Checklist uji singkat

1. Di App, ketik `/`, lalu **`/wevai`** muncul. (IDE: cukup minta, karena dokumen tidak menjamin slash command skill di
   IDE.)
2. **Opener 20 detik.** Prompt: "/wevai Buatkan opener 20 detik untuk aplikasi kopi fiktif *Seduh*, 16:9."
   - Diharapkan: agen membaca SKILL.md + `anti-ppt.md` + `opener-konsep.md` + `techniques.md`.
   - Paling banyak satu pertanyaan (`ask_question` atau teks).
   - Style brief + rundown ditulis, lalu agen **berhenti menunggu persetujuan** (tanpa kode).
   - Font bukan Inter dan latar tidak otomatis gelap. Kalau tidak, aturan GEMINI.md menang.
3. **Setelah disetujui:**
   - `index.html` dibuat dengan **menyalin** `assets\starter-opener.html`: baris 3 berisi
     `<!-- Made with the WeVai skill v1.3.0 …`, lalu disunting. Bukan ditulis ulang dari nol.
   - `node "<folder skill>\scripts\lint-motion.mjs"` → 0 FAIL.
   - `node "<folder skill>\scripts\snap.mjs" shots 1 5 10 15` → `shots\kontak.png` ada.
   - Agen **membuka gambar itu** dan menilai frame tertentu.
4. **`index.html` diklik dua kali** (`file://`): langsung main, loop, dan tidak ada error di konsol.
5. **Uji `--help`** (setelah perbaikan C2). Minta: "tunjukkan opsi export". `export-frames.mjs --help` hanya mencetak
   bantuan dan **tidak** membuka Chrome.
6. **MP4.** Minta "export MP4 30 fps". Perintahnya berbentuk PowerShell (`$env:MP4=…; $env:FPS='30'; node …`), bukan
   `MP4=… node`. Hasilnya `out.mp4` ≈ 20 dtk (`ffprobe`). Selama render, perintah tampil sebagai *background command*
   dan laptop tidak sleep.
7. **Explainer.** Prompt: "explainer 30 detik kenapa gunung meletus" menghasilkan **satu** pertanyaan berisi gaya
   (6 pilihan + rekomendasi), rasio, durasi, dan suara (explainer.md:26-58).
8. **Tanpa sandbox.** Bila mesin sudah 24H2 dan preset Default/Auto, ulangi langkah 3. Bila snap gagal memuat GSAP,
   tambahkan `command(node)` (jalan di luar sandbox) atau `read_url` untuk `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`,
   `fonts.googleapis.com`, `fonts.gstatic.com`.

### C6. Risiko

- **Shell.** Gemini bisa tetap menulis gaya bash di PowerShell 5.1. Catatan di SKILL.md menguranginya, tetapi tidak
  menjamin.
- **Kepatuhan model.** Aturan WeVai disetel dengan Claude. Gemini 3.8 Flash atau 4 Argon mungkin lebih sering melompati
  gerbang style brief, terlebih dengan Artifact Review Turbo. Ukur dengan `evals/briefs/*.md` + `scripts/eval-run.mjs`
  di sesi Antigravity baru (`evals/README.md:8-11`).
- **Junction, izin, dan sandbox.** Path skill bisa dinilai di luar workspace. Sandbox 24H2 menyembunyikan profil user
  dan memutus CDN.
- **Render berjam-jam** mati bila App di-restart atau percakapan diarsipkan.
- **Deliverable terserap ke artefak/`generative_ui`** (CSP memblokir CDN).
- **Dev tree sebagai skill global.** `E:\mila\wevai` bisa sedang di branch fitur (sekarang `feat/starter-sinematik`,
  diganti agen lain). Antigravity akan memakai apa pun yang ter-checkout.
- **Kuota.** Gemini per 5 jam dan per minggu, sementara jalur 50–75k token dibaca ulang tiap sesi.

### C7. Pertanyaan terbuka (hanya pemilik yang bisa menjawab)

1. **Permukaan mana** yang dipakai: Antigravity App 2.x, Antigravity IDE 2.6.0 (keduanya terpasang), ekstensi VS Code
   `Google.google-antigravity` (belum terpasang), atau CLI `agy`?
2. **Model mana** (Gemini 4 Argon / 3.8 Flash / Claude Opus 5.5 di Antigravity), dan plan apa (AI Pro/Ultra)? Ini
   menentukan perlu-tidaknya eval ulang.
3. **Skill global ke dev tree** (`E:\mila\wevai`, branch bergerak) **atau clone terkunci** di rilis/`main`?
4. **MCP Higgsfield:** bagaimana tersambung di Claude Code sekarang (konektor claude.ai? tidak ada di `~/.claude.json`),
   apakah bridge AE perlu di Antigravity, dan apa URL/OAuth resminya?
5. **Boleh mengubah `%USERPROFILE%\.gemini\GEMINI.md`** (aturan Inter/dark mode)?
6. **Render panjang** tetap dijalankan dari terminal/Claude Code, atau harus oleh agen Antigravity?
7. **Upgrade ke Windows 11 24H2** direncanakan? Bila ya, sandbox, mode Auto, dan perlunya izin jaringan ikut berubah.
8. **Lencana README** "works with … Antigravity" ditambahkan hanya setelah checklist C5 lolos?

---

## Fakta yang tidak bisa diverifikasi

- **Shell App/IDE di Windows.** Dokumen hanya menyebut CLI (PowerShell bawaan sejak v1.0.10). Untuk App/IDE ada string
  biner dan laporan forum komunitas ([discuss.ai.google.dev](https://discuss.ai.google.dev/t/bug-agent-ignores-default-ide-shell-powershell-7-and-terminal-auto-execute-always-proceed-setting-is-broken/126853),
  bukan sumber resmi).
- **Penemuan skill lewat junction/symlink.** Ada catatan perbaikan "duplicate loading of rules reached through a symlink"
  di changelog CLI, tetapi tidak ada dokumen eksplisit.
- **Path SKILL.md dalam indeks skill.** Apakah ia diberikan ke model sebagai path absolut (dasar `<folder skill>`).
- **`view_file`.** Apakah membaca PNG, dan berapa N baris per panggilan.
- **Sleep.** Apakah perintah latar dihitung "agent running" untuk pencegah sleep.
- **Plugin.** Apakah `agy plugin install`/`import` menjadikan SKILL.md di akar (+ `skills: "./"`) sebuah skill.
- **IDE.** Apakah slash command skill ada di IDE 2.6.0, dan apakah ekstensi VS Code membaca `~/.gemini/config/skills/`.
- **Frontmatter.** Toleransi field `license` dan `metadata` bersarang.
- **Higgsfield.** URL MCP resmi (hanya blog pihak ketiga, mis.
  [techsy.io](https://techsy.io/en/blog/higgsfield-mcp-claude-code)). Halaman resmi `higgsfield.ai/mcp` tidak dibaca.
- **Changelog IDE mandiri.** Isi v1.11.2–v2.6.0 tidak terbaca lewat WebFetch (hanya indeks versinya).

## Sumber

**Dokumen resmi Antigravity:**

- Sitemap: [getting-started](https://antigravity.google/docs/getting-started)
- Kustomisasi: [skills](https://antigravity.google/docs/skills/) ·
  [customization-discovery](https://antigravity.google/docs/customization-discovery/) ·
  [rules](https://antigravity.google/docs/rules/) · [ide/workflows](https://antigravity.google/docs/ide/workflows/) ·
  [migration/workflows-to-skills](https://antigravity.google/docs/migration/workflows-to-skills/)
- Plugin dan MCP: [plugins](https://antigravity.google/docs/plugins/) ·
  [build-plugins](https://antigravity.google/docs/build-plugins/) · [marketplace](https://antigravity.google/docs/marketplace/) ·
  [schema plugin.json](https://antigravity.google/schemas/v1/plugin.json) · [mcp](https://antigravity.google/docs/mcp/) ·
  [cli/gcli-migration](https://antigravity.google/docs/cli/gcli-migration/)
- Izin dan setelan: [permissions](https://antigravity.google/docs/permissions/) ·
  [sandbox](https://antigravity.google/docs/sandbox/) · [agent-settings](https://antigravity.google/docs/agent-settings/) ·
  [settings](https://antigravity.google/docs/settings/)
- CLI: [cli/reference](https://antigravity.google/docs/cli/reference/) · [cli/using](https://antigravity.google/docs/cli/using/) ·
  [cli/troubleshooting](https://antigravity.google/docs/cli/troubleshooting/)
- Umum: [faq](https://antigravity.google/docs/faq/) · [features](https://antigravity.google/docs/features/) ·
  [models](https://antigravity.google/docs/models/)
- Agen dan artefak: [subagents](https://antigravity.google/docs/subagents/) ·
  [artifacts](https://antigravity.google/docs/artifacts/) · [plan](https://antigravity.google/docs/plan/) ·
  [implementation-plan](https://antigravity.google/docs/implementation-plan/) ·
  [artifact-review](https://antigravity.google/docs/artifact-review/) · [tools](https://antigravity.google/docs/tools/) ·
  [at-mentions](https://antigravity.google/docs/at-mentions/) · [slash-commands](https://antigravity.google/docs/slash-commands/)
- Browser dan ekstensi IDE: [ide/browser](https://antigravity.google/docs/ide/browser/) ·
  [ide/extensions](https://antigravity.google/docs/ide/extensions/) ·
  [ide/extensions/vscode](https://antigravity.google/docs/ide/extensions/vscode/)

**Changelog dan blog:** [changelog](https://antigravity.google/docs/changelog) ·
[blog](https://antigravity.google/blog) · [Introducing Google Antigravity 2.0](https://antigravity.google/blog/introducing-google-antigravity-2) ·
[Plugin Marketplace](https://antigravity.google/blog/plugin-marketplace-in-antigravity)

**Model:** [Gemini 3.8 Flash](https://aistudio.google.com/docs/models/gemini-3.8-flash) ·
[Gemini 4 Argon](https://aistudio.google.com/docs/models/gemini-4-argon)

**Spesifikasi dan pembanding:** [Agent Skills specification](https://agentskills.io/specification) ·
[Claude Code plugins reference](https://code.claude.com/docs/en/plugins-reference) (hanya untuk perilaku Claude Code)

**Berkas lokal (first-party, terpasang):**

- `%USERPROFILE%\.gemini\antigravity\builtin\skills\` — `agy-customizations\SKILL.md`, `docs\{skills,rules,plugins,mcp_servers,json_configs,hooks}.md`,
  `antigravity_guide\references\{app,cli,ide,sdk}.md`, `plugin\SKILL.md`, `migrate-workflows\SKILL.md`,
  `run-workflow\SKILL.md`, `automation\SKILL.md`, `generative_ui\SKILL.md`, `ui-plugin-navigation\SKILL.md` (semua
  bertanggal 30 Okt 2026)
- `%LOCALAPPDATA%\Programs\Antigravity IDE\resources\app\product.json`
- `%USERPROFILE%\.gemini\bin\agy.version.json` dan string `agy.exe` 1.4.11
- `%USERPROFILE%\.gemini\config\config.json`, `mcp_config.json`
- `%USERPROFILE%\.gemini\GEMINI.md`
