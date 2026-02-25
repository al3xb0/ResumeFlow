# Contributing to ResumeFlow

Thanks for your interest in contributing! ResumeFlow is open source and welcomes PRs, bug reports, and feature suggestions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/ResumeFlow.git`
3. Install dependencies: `npm install`
4. Start the dev server: `npm run tauri dev`

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) 1.70+
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)

### Project layout

- `src/` — React frontend (TypeScript, Tailwind CSS)
- `src-tauri/src/` — Rust backend (PDF parsing, analysis, scraping)
- `src/i18n/locales/` — Translation files (EN, RU, PL)

### Running tests

```bash
cd src-tauri
cargo test
```

### Code style

- **Rust**: `cargo fmt` for formatting, `cargo clippy` for lints
- **TypeScript**: Standard strict mode, no unused variables

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Ensure `cargo test` passes and `cargo clippy` is clean
4. Ensure `npx tsc --noEmit` has no errors
5. Open a PR with a description of what changed and why

## Bug Reports

Open an issue with:

- Steps to reproduce
- Expected vs. actual behavior
- OS and app version

## Adding translations

Translation files are JSON in `src/i18n/locales/`. Copy `en.json` as a starting point and translate all values. Then register the new language in `src/i18n/index.ts` and add it to the language switcher in `src/components/Header.tsx`.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
