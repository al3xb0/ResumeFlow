# ResumeFlow

**Open-source desktop app that helps you tailor your resume to any job posting — privately and offline.**

No cloud, no subscriptions, no data collection. Your resume never leaves your machine.

[![CI](https://github.com/al3xb0/ResumeFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/al3xb0/ResumeFlow/actions/workflows/ci.yml)
[![Tauri](https://img.shields.io/badge/Tauri-2-blue?logo=tauri)](https://v2.tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-2021-orange?logo=rust)](https://www.rust-lang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Download](https://img.shields.io/badge/Download-Latest%20Build-brightgreen?logo=windows)](https://github.com/al3xb0/ResumeFlow/releases)

---

## Why ResumeFlow?

Most ATS checkers are SaaS tools that upload your resume to their servers, charge a monthly fee, and lock features behind paywalls. ResumeFlow takes a different approach:

- **100% offline** — all analysis runs locally on your machine via Rust. No internet needed (except optional URL fetch for job descriptions).
- **Free & open source** — MIT license, no premium tiers, no limits. Fork it, modify it, make it yours.
- **Fast** — native desktop performance, not a slow web app. PDF parsing + keyword analysis in milliseconds.
- **Multilingual** — interface available in English, Russian, and Polish.

You drop in your resume (PDF or plain text), paste a job description (or grab it from a URL), and ResumeFlow instantly shows which keywords you're missing, how well your resume matches the listing, flags weak action verbs, and whether the PDF actually parsed correctly. You can also edit your resume in a built-in block editor with live analysis feedback.

## Features

| Feature | Description |
| --- | --- |
| **Resume import** | Upload a PDF or paste text directly |
| **Job description input** | Paste text or fetch from any URL |
| **Block editor** | Section-based resume editor with drag-to-reorder, auto-sync to analysis |
| **Keyword matching** | Dictionary-based analysis of 150+ tech skills, frameworks, and tools |
| **Match score** | Weighted percentage showing how well your resume fits the job |
| **Action verb linter** | Detects weak verbs ("worked", "helped") and suggests stronger replacements |
| **Readability check** | Detects broken PDF extraction, missing sections, garbled text, word count |
| **Live analysis** | All panels update automatically as you type (debounced) |
| **Dark theme** | Easy on the eyes, always |
| **i18n** | English, Russian, Polish |

## Download

Grab the latest installer from the [**Releases page**](https://github.com/al3xb0/ResumeFlow/releases).

Builds are published automatically via GitHub Actions for **Windows**. **macOS**, and **Linux** builds are coming soon.

## Tech stack

| Layer | Technology |
| ------- | ----------- |
| Desktop framework | [Tauri 2](https://v2.tauri.app) |
| Frontend | React 19, TypeScript 5.8, Tailwind CSS 4 |
| State management | Zustand 5 |
| Backend | Rust — pdf-extract, regex, reqwest, scraper |
| i18n | react-i18next (EN, RU, PL) |

## Build from source

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) 1.80+
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS

### Development

```bash
git clone https://github.com/al3xb0/ResumeFlow.git
cd ResumeFlow
npm install
npm run tauri dev
```

### Production build

```bash
npm run tauri build
```

The installer will appear in `src-tauri/target/release/bundle/`.

### Tests

```bash
cd src-tauri
cargo test
```

## Project structure

```text
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── store/              # Zustand store
│   ├── i18n/               # Translations (en, ru, pl)
│   └── index.css           # Tailwind theme & CSS variables
├── src-tauri/              # Rust backend
│   └── src/
│       ├── lib.rs          # Tauri commands
│       ├── analysis.rs     # Keyword matching & readability engine
│       ├── parser.rs       # PDF text extraction
│       └── scraper.rs      # URL fetching & HTML parsing
└── package.json
```

## Contributing

ResumeFlow is open source and contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

Feel free to open issues, suggest features, or submit pull requests.

## License

[MIT](LICENSE) — do whatever you want with it.
