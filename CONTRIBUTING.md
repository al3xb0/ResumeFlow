# Contributing to ResumeFlow

Thanks for your interest in contributing! ResumeFlow is open source and welcomes PRs, bug reports, and feature suggestions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/ResumeFlow.git`
3. Install dependencies: `npm install`
4. Create a feature branch from `develop`: `git checkout -b feature/my-feature develop`
5. Start the dev server: `npm run tauri dev`

## Git Branching Model

We follow a simplified **Gitflow** workflow:

| Branch      | Purpose                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| `main`      | Stable releases only. Tagged with `vX.Y.Z`.                                      |
| `develop`   | Integration branch for next release. PRs go here.                                |
| `feature/*` | New features. Branch from `develop`, merge back to `develop`.                    |
| `fix/*`     | Bug fixes. Branch from `develop`, merge back to `develop`.                       |
| `hotfix/*`  | Urgent production fixes. Branch from `main`, merge to both `main` and `develop`. |
| `release/*` | Release prep. Branch from `develop`, merge to `main` and `develop`.              |

### Workflow

```text
feature/my-feature  →  develop  →  release/0.3.0  →  main (tag: v0.3.0)
```

1. Create your branch from `develop` (e.g. `feature/add-dark-mode`)
2. Make focused, well-described commits
3. Open a PR targeting `develop`
4. After CI passes and review is approved, the PR is merged
5. When ready for release, a `release/*` branch is created from `develop`
6. After final QA, the release branch is merged to `main` and tagged

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) 1.80+
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)

### Project layout

- `src/` — React frontend (TypeScript, Tailwind CSS)
- `src/hooks/` — Custom React hooks
- `src/lib/` — Pure utility & export functions
- `src/store/` — Zustand state stores
- `src/templates/` — Resume template renderers
- `src/i18n/locales/` — Translation files (EN, RU, PL)
- `src-tauri/src/` — Rust backend (PDF parsing, analysis, scraping)

### Running tests

```bash
# Frontend tests
npm test

# Rust tests
cd src-tauri && cargo test

# Full check (lint + format + types + tests)
npm run check
```

### Code style

- **TypeScript**: ESLint + Prettier. Run `npm run lint:fix` and `npm run format` before committing.
- **Rust**: `cargo fmt` for formatting, `cargo clippy` for lints.
- Prettier config: `.prettierrc` (2-space indent, double quotes, trailing commas).
- ESLint config: `eslint.config.js` (strict TS, react-hooks rules, prettier integration).

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `chore:` — tooling, deps, CI
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or updating tests

Example: `feat: add DOCX template export with i18n labels`

## Pull Requests

1. Create a feature branch from `develop`
2. Make your changes with clear, focused commits
3. Run `npm run check` — all checks must pass
4. For Rust changes: ensure `cargo test` passes and `cargo clippy` is clean
5. Open a PR targeting `develop` with a description of what changed and why
6. Link any related issues

## Bug Reports

Open an issue with:

- Steps to reproduce
- Expected vs. actual behavior
- OS and app version
- Screenshots if applicable

## Adding translations

Translation files are JSON in `src/i18n/locales/`. Copy `en.json` as a starting point and translate all values. Then register the new language in `src/i18n/index.ts` and add it to the language switcher in `src/components/Header.tsx`.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
