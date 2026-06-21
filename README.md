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

| Feature                   | Description                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------ |
| **Resume import**         | Upload PDF or DOCX, or paste text directly, then hydrate the builder safely          |
| **Job description input** | Paste text or fetch from any URL                                                     |
| **Block editor**          | Section-based resume editor with drag-and-drop & keyboard reorder                    |
| **Resume builder**        | Full WYSIWYG builder with 3 templates (Classic, Modern, Minimal)                     |
| **PDF export**            | Typst-generated PDF export from the same render request as the live preview          |
| **DOCX export**           | Best-effort DOCX export that keeps key template styling                              |
| **Field-level layout**    | Per-field typography plus per-field margin/padding controls beside each editor field |
| **Keyword matching**      | Dictionary-based analysis of 150+ tech skills, frameworks, and tools                 |
| **Match score**           | Weighted percentage showing how well your resume fits the job                        |
| **Action verb linter**    | Detects weak verbs ("worked", "helped") and suggests stronger alternatives           |
| **Readability check**     | Detects broken PDF extraction, missing sections, garbled text, word count            |
| **PDF link extraction**   | Clickable hyperlinks preserved from the original PDF                                 |
| **Live preview**          | Resume preview with zoom controls (persisted to localStorage)                        |
| **Accessibility**         | ARIA roles, keyboard navigation, screen-reader support                               |
| **Dark theme**            | Easy on the eyes, always                                                             |
| **i18n**                  | English, Russian, Polish — all strings translated including exports                  |
| **Error boundary**        | Graceful crash recovery without losing app state                                     |
| **Security**              | DOMPurify sanitization, file size validation, no unsafe innerHTML                    |

## Download

Grab the latest installer from the [**Releases page**](https://github.com/al3xb0/ResumeFlow/releases).

Builds are published automatically via GitHub Actions for **Windows**, **macOS**, and **Linux**.

## Tech stack

| Layer              | Technology                                                   |
| ------------------ | ------------------------------------------------------------ |
| Desktop framework  | [Tauri 2](https://v2.tauri.app)                              |
| Frontend           | React 19, TypeScript 6.0, Tailwind CSS 4                     |
| State management   | Zustand 5                                                    |
| Preview/PDF export | Typst renderer in Rust + Tauri commands                      |
| DOCX export        | docx 9.7                                                     |
| Backend            | Rust — pdf-extract, reqwest, scraper, Typst                  |
| i18n               | react-i18next (EN, RU, PL)                                   |
| Testing            | Vitest + React Testing Library (frontend), cargo test (Rust) |
| Linting            | ESLint 10 + Prettier 3                                       |

## Build from source

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
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

### Tests & checks

```bash
# Frontend tests
npm test

# Rust CI checks
cd src-tauri && cargo fmt --check
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test

# Full check (lint + format + types + tests)
npm run check
```

### Available scripts

| Script                    | Description                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`             | Start Vite dev server                                                   |
| `npm run build`           | Typecheck + Vite production build                                       |
| `npm run lint`            | ESLint check                                                            |
| `npm run lint:fix`        | ESLint auto-fix                                                         |
| `npm run format`          | Prettier auto-format                                                    |
| `npm run format:check`    | Prettier check                                                          |
| `npm test`                | Run Vitest tests                                                        |
| `npm run check`           | Full CI check (lint + format + types + tests)                           |

## Project structure

```text
├── src/                        # React frontend
│   ├── components/             # UI components
│   ├── hooks/                  # Custom React hooks
│   ├── store/                  # Zustand stores (resume, editor, builder, toast)
│   ├── lib/                    # Utilities, export helpers, render-request builders
│   ├── templates/              # Shared template defaults and theme tokens
│   ├── types/                  # TypeScript type definitions
│   ├── i18n/                   # react-i18next setup & locale JSON files
│   └── index.css               # Tailwind theme & CSS variables
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── config.rs           # Runtime analysis config loading / validation
│       ├── error.rs            # Structured app errors exposed to the frontend
│       ├── lib.rs              # Tauri command handlers
│       ├── parser.rs           # PDF text & hyperlink extraction
│       ├── scraper.rs          # URL fetching & HTML parsing
│       └── analysis/           # Analysis engine
│           ├── mod.rs          # Re-exports & text normalization
│           ├── keywords.rs     # Keyword matching & scoring
│           ├── readability.rs  # Readability & structure checks
│           └── verbs.rs        # Action verb linting
├── src-tauri/resources/        # Bundled runtime analysis configuration JSON
├── .github/workflows/          # CI & release pipelines
├── eslint.config.js            # ESLint configuration
├── .prettierrc                 # Prettier configuration
└── package.json
```

## Export fidelity

The builder preview is now the visual source of truth for PDF output:

- The editor preview calls the same Rust Typst pipeline as PDF export, so preview pages and exported PDFs come from the same render request.
- Layout customization now supports per-field typography plus per-field margin/padding overrides, edited directly next to the corresponding builder inputs.
- DOCX export keeps template-aware typography and accents as a best-effort office-document export rather than a pixel-perfect Typst clone.

## Git branching model

We use a **Gitflow** workflow. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full branching strategy.

| Branch      | Purpose                          |
| ----------- | -------------------------------- |
| `main`      | Stable releases, tagged `vX.Y.Z` |
| `develop`   | Next-release integration branch  |
| `feature/*` | New features                     |
| `fix/*`     | Bug fixes                        |
| `hotfix/*`  | Urgent production fixes          |

## Contributing

ResumeFlow is open source and contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on branching, commit conventions, code style, and how to get started.

Feel free to open issues, suggest features, or submit pull requests.

## License

[MIT](LICENSE) — do whatever you want with it.
