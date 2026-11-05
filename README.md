# Local AI Experts Sync

A friendly, cross-platform desktop app that lets **non-technical people sync a Git
repository** without ever typing a Git command. Think of it as "Git for humans":
pick a folder, set how to sign in once, then use two big buttons — **Pull** and
**Push** — with plain-language explanations at every step.

Made by [Local AI Experts](https://local-ai-experts.com).

---

## Download

Get the latest release for your computer from the
**[Releases page](https://github.com/mysegfault/local-ai-experts-sync/releases/latest)**:

- **GNU/Linux** — `.AppImage` (portable) or `.deb` (Debian/Ubuntu)
- **Windows** — `…-Setup.exe` (installer) or `…-portable.exe` (no install)
- **macOS** — `.dmg` (requires macOS 13+)

> ⚠️ **The apps are not code-signed, and the macOS app never will be.** We will
> never buy an Apple Developer Program licence, so there is no Apple certificate
> to sign or notarize with. On first launch:
>
> - **macOS** — right-click the app → **Open**, or run
>   `xattr -cr "/Applications/Local AI Experts Sync.app"`.
> - **Windows** — if SmartScreen appears, click **More info → Run anyway**.

---

## Why

Git is powerful but intimidating. Non-technical users struggle with clone URLs,
SSH keys, tokens, merge conflicts and cryptic error messages. This app hides all
of that behind a clean GUI and explains **what happened and what to do next** in
simple words, in English or French.

## Goal

- Manage one or more **project folders** on the local disk.
- Configure the remote **server address** and **authentication** easily.
- **Detect local changes**, then let the user **Pull** or **Push** in one click.
- Never confuse the user: every action ends with a clear, human message.

## Features

- **Projects per folder** — add a local folder; existing Git repos are detected
  automatically (remote URL and settings are picked up), plain folders are
  initialized.
- **Git configuration tab** — set the server address and the sign-in method, then
  **Verify authentication** before syncing.
- **Authentication made easy** — supports, out of the box:
  - the **computer's existing Git configuration** (recommended default, uses the
    system's global/local settings and credential helpers),
  - **SSH keys** (system keys or a specific key file),
  - **access tokens**, and
  - **username / password**.
  Secrets are stored encrypted with the OS keychain (Electron `safeStorage`).
- **Pull / Push with guidance** — friendly translations of Git output; the app
  tells the user whether they have changes to upload, changes to download, or
  everything is up to date.
- **Pull safety for beginners** — optional (default on) protection that blocks
  **Pull** while there are local changes, to avoid conflicts.
- **Command log** — every Git command launched by the app is visible at the
  bottom of the window, with its exit code, duration, standard output and
  errors. Error banners also expose the raw Git message under "Technical
  details", so nothing fails silently.
- **Recover missing project files** — if a project folder only contains a
  `.git` directory (repository metadata without a working tree), the Sync tab
  offers a one-click **Download project files** action that fetches the server
  branch and checks it out.
- **Visual differences** — when files are modified, **See differences** opens an
  integrated diff viewer with added/removed line colours and line numbers.
  If **Meld** (or KDiff3) is installed, the same diff can also be opened in that
  external tool.
- **Sidebar status icons + legend** — 🟢 up to date, 🟠 changes to push,
  🔵 changes to pull, ⚠️ project not found.
- **Remembers the last project** and re-opens it on startup (falls back to the
  Welcome screen if none / not found).
- **First-run language chooser** — English or French, defaulting to the system
  language; changeable anytime in Settings.

## Getting started (development)

Requirements: **Node.js ≥ 22.12** and **Git** installed on the system.

```bash
npm install
npm start          # launch the app
```

> The app talks to the **system `git` binary**. If Git is missing, the app shows
> easy, OS-specific installation instructions on first launch.

## Building installers

Uses [electron-builder](https://www.electron.build/):

```bash
npm run dist:win     # Windows (NSIS + portable)
npm run dist:mac     # macOS (.dmg)
npm run dist:linux   # Linux (AppImage + deb)
```

> The macOS build is **intentionally never signed or notarized** — we will never
> buy an Apple Developer Program licence. Electron 44 also requires macOS 13+.

## Tests

Headless suites (smoke / end-to-end / credential / i18n):

```bash
npm test
```

- `i18n` — dictionary completeness and locale normalization.
- `smoke` — loads the real renderer + preload + IPC and drives the UI.
- `e2e` — init/commit/push/fetch/pull/divergence against a local bare repo.
- `cred` — verifies the HTTPS token flow through a local auth-required server.

## Project structure

```
src/
  main/        # Electron main process (git, config, credentials, IPC, window)
  preload/     # contextBridge API exposed to the renderer
  renderer/    # Vue 3 UI (no bundler; vendored Vue)
  shared/      # translation tables shared by main + renderer
scripts/       # test suites
build/         # app icon and packaging resources
```

## Tech

Electron 44 · Vue 3 (vendor-build) · system `git` · Electron `safeStorage`.

## License

MIT © Local AI Experts — <https://local-ai-experts.com>
