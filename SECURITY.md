# Security Policy for DevFix

Security is a fundamental design principle of DevFix. Because DevFix automates environment diagnosis and runs commands inside containers, it enforces rigorous defense-in-depth controls to protect developers' host systems and source code.

---

## 1. Supported Versions

| Version | Supported | Security Maintenance Level |
|---|---|---|
| **1.0.x (Current / Production)** | :white_check_mark: | Full active security maintenance & vulnerability remediation |
| **< 1.0.0 (Pre-release)** | :x: | Unsupported |

---

## 2. Core Security Architecture & Guarantees

DevFix is engineered with non-negotiable security boundaries:

1. **Non-Destructive Staging Isolation (`StagingWorkspace`):**
   - The user's original project directory is **never** mounted directly as a writable repair target.
   - All repairs take place in an isolated temporary staging directory.
   - Changes are presented to the developer as a unified diff and require explicit confirmation (`--yes` or interactive `[y/N]`) before write-back.
   - A pre-commit rollback snapshot is generated before any file is touched, enabling full restoration (`devfix rollback`).

2. **Container Isolation & Privilege Dropping:**
   - Docker containers execute as a non-root user (`--user 1000:1000`).
   - All Linux kernel capabilities are permanently dropped (`--cap-drop=ALL`).
   - Privilege escalation is disabled (`--security-opt=no-new-privileges=true`).
   - Strict resource limits are enforced (memory, swap, CPU, process count).
   - Mounting the Docker socket (`docker.sock`), filesystem root (`/`), or user home directory (`$HOME`) is prohibited.

3. **Default Network Isolation:**
   - Sandboxes run with `--network=none` by default to prevent data exfiltration.
   - External network access requires explicit developer opt-in via `--allow-network`.

4. **Sensitive File & Symlink Boundaries:**
   - Credentials, private keys (`.pem`, `.key`, `id_rsa`), service account tokens, and `.env` files are blocked from staging and tools.
   - Safe environment templates (`.env.example`) are preserved.
   - In-container symlinks that resolve outside the workspace are blocked with `ACCESS_DENIED`.

5. **Prompt Injection & Secret Redaction:**
   - All project files, error outputs, and terminal streams are treated as untrusted data.
   - Centralized redaction (`Redactor.js`) scrubs API keys, bearer tokens, database connection URLs, and private keys before data enters LLM prompts or telemetry files.

---

## 3. Reporting a Vulnerability

If you discover a security vulnerability or weakness in DevFix, **please do not open a public GitHub issue**.

Please report security concerns responsibly via:

- **Email:** `security@ghulam-mustafa.com` (or contact maintainer via [GitHub Profile](https://github.com/GhulamMustufa))
- **Subject:** `[SECURITY] DevFix Vulnerability Report`

### What to Include in Your Report

1. Description of the vulnerability and attack vector.
2. Steps to reproduce the issue (proof-of-concept repository, command line flags, or script).
3. Impact assessment (privilege escalation, path traversal, sandbox breakout, or data exposure).
4. Any proposed fixes or mitigation strategies.

### Response Timeline

- **Initial Acknowledgment:** Within 48 hours.
- **Triage & Assessment:** Within 5 business days.
- **Fix & Disclosure:** Coordinated release with patched version and credit to the finder.

