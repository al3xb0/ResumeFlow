# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] - 2026-05-31

### Changed

- Reduced startup bundle weight by lazy-loading non-default app surfaces (`ResumeBuilder`, `ResumePreview`, `ImportEditWorkspace`, `AnalysisPanel`)
- Moved DOCX export generation code behind dynamic import to keep it out of the initial bundle path
- Switched Vitest environment from `jsdom` to `happy-dom` to reduce test runtime overhead
- Standardized package manager metadata in `package.json` (`npm@11.13.0`) for consistent local/CI installs
- Tuned Rust release profile (`opt-level = "s"`, `lto = "thin"`, `codegen-units = 1`, `strip = true`) to reduce desktop binary size
- Split `typst-as-lib` features by target OS so Windows builds avoid embedded font payload by default

### Fixed

- Updated app version metadata consistently across frontend and Tauri/Rust manifests for release `0.5.1`

## [0.5.0] - 2026-05-30

### Added

- Shared template theme tokens for export styling across PDF and DOCX
- Builder resume normalization on store hydration to harden imported PDF/DOCX data
- Typst-based paged preview and PDF export pipeline shared between the builder preview and PDF export flow
- Builder-side page margin panel plus inline semantic-field layout popovers for typography and per-field margin/padding overrides
- Import-focused editing/preview workflow, including the new import workspace and supporting import-preview strings/errors
- Runtime analysis config loading, structured Tauri error mapping, and focused tests around preview/render/export flows

### Changed

- PDF export now preserves the selected builder template instead of collapsing to the classic style
- DOCX export now keeps template-specific font and accent styling as a best-effort office-document export
- README now reflects the current CI baseline, runtime analysis config layout, and export fidelity model
- Resume preview is now a cleaner zoom + page surface instead of carrying the full layout inspector above the document
- Layout settings now use per-side page margins plus a per-field box model shared by the React builder and Rust Typst renderer
- PDF export and preview now reuse the same render request, while DOCX export keeps template-aware styling as a best-effort office export
- Builder, analysis, and import surfaces were refactored around the new preview/export pipeline and inline layout controls

### Fixed

- The builder-to-PDF export path now passes the selected template through to the exporter
- Template-specific PDF backgrounds, colors, and typography are no longer ignored during export

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
