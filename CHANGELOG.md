# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-04-19

### Added

- Internationalization (i18n) support: English, Polish, Russian
- PDF preview with zoom controls and page navigation
- Resume import from PDF/DOCX with Rust parser backend
- ATS keyword analysis panel with match scoring
- Readability analysis (Flesch-Kincaid, sentence length)
- Action verb linting with context-aware suggestions
- Job description input with real-time keyword extraction
- Export labels with full i18n coverage
- Error boundary wrapping for all major components
- DOMPurify sanitization for imported content
- File size validation (10 MB limit) on import
- ARIA attributes for accessibility
- Keyboard-accessible section reorder (↑/↓ arrows)
- Zoom level persistence to localStorage
- Memoized components (`React.memo`) for performance
- Pre-commit hooks with husky + lint-staged
- ESLint + Prettier + TypeScript + Vitest in CI pipeline
- Gitflow branching model documentation
- PR template and issue templates (bug report, feature request)
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- SECURITY.md responsible disclosure policy
- Dependabot configuration for npm and Cargo

### Fixed

- Infinite re-render loop caused by unstable `useToast()` reference
- ESLint errors: setState-in-effect, ref-during-render, missing deps
- All missing i18n translation keys

## [0.2.5] - 2026-04-18

### Added

- Initial public release
- Resume builder with section editor
- Multiple resume templates
- PDF export via pdfmake
- Tauri desktop app packaging (Windows, macOS, Linux)
