# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |
| < 0.4   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in ResumeFlow, please report it
responsibly.

**Do NOT open a public issue.**

Instead, please report vulnerabilities by opening a
[private security advisory](https://github.com/al3xb0/ResumeFlow/security/advisories/new)
on GitHub.

### What to include

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledgment**: within 48 hours
- **Initial assessment**: within 7 days
- **Fix release**: as soon as reasonably possible, depending on severity

### Scope

This policy covers the ResumeFlow desktop application and its dependencies.
Since ResumeFlow is a privacy-first offline tool, most common web vulnerabilities
(XSS, CSRF, etc.) have limited attack surface. However, we take all reports
seriously, especially those related to:

- Tauri IPC and command injection
- File system access beyond intended scope
- Dependency vulnerabilities
- Content injection via imported documents

## Security Best Practices

ResumeFlow follows these security practices:

- All user-imported HTML content is sanitized with DOMPurify
- File size limits enforced on import (10 MB)
- No data is sent to external servers — all processing is local
- Dependencies are monitored via Dependabot
