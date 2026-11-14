# DevFix — Phase 3 Compatibility Matrix: Language & Environment Support

**Branch:** `improve/production-audit-and-hardening`  
**Date:** March 2025  

---

## 1. Node.js Ecosystem Compatibility

| Dimension | Supported Tools & Formats | Detection Signals | Inferred Default Commands | Dynamic Docker Base Image |
|---|---|---|---|---|
| **Package Managers** | **npm** | `package-lock.json`, `npm-shrinkwrap.json`, `package.json` | `npm test`<br>`npm run build`<br>`npm start` | `node:20-alpine` (or version matched) |
| | **pnpm** | `pnpm-lock.yaml` | `pnpm test`<br>`pnpm run build`<br>`pnpm start` | `node:20-alpine` (or version matched) |
| | **yarn** | `yarn.lock` | `yarn test`<br>`yarn run build`<br>`yarn start` | `node:20-alpine` (or version matched) |
| | **bun** | `bun.lock`, `bun.lockb` | `bun test`<br>`bun run build`<br>`bun start` | `node:20-alpine` (or version matched) |
| | **Corepack** | `"packageManager": "<manager>@<version>"` in `package.json` | Respects declared manager | Inherits runtime image |
| **Language Flavors** | **JavaScript** | `.js`, `.mjs`, `.cjs`, `.jsx` | As defined in `package.json` | `node:20-alpine` |
| | **TypeScript** | `tsconfig.json`, `typescript` in `dependencies`/`devDependencies`, `.ts`, `.tsx` | `tsc`, test runner | `node:20-alpine` |
| **Runtime Versions** | **Node 18.x** | `engines.node` (contains `18`), `.nvmrc` (`18.*`), `.node-version` (`18.*`) | — | `node:18-alpine` |
| | **Node 20.x** | `engines.node` (contains `20`), `.nvmrc` (`20.*`), `.node-version` (`20.*`) | — | `node:20-alpine` |
| | **Node 22.x** | `engines.node` (contains `22`), `.nvmrc` (`22.*`), `.node-version` (`22.*`) | — | `node:22-alpine` |
| **Monorepo Layouts** | **npm / Yarn Workspaces** | `workspaces: [...]` or `workspaces: { packages: [...] }` in `package.json` | Inferred root scripts | `node:20-alpine` |
| | **pnpm Workspaces** | `pnpm-workspace.yaml` | Inferred root scripts | `node:20-alpine` |
| | **Lerna** | `lerna.json` | Inferred root scripts | `node:20-alpine` |

---

## 2. Python Ecosystem Compatibility

| Dimension | Supported Tools & Formats | Detection Signals | Inferred Default Commands | Dynamic Docker Base Image |
|---|---|---|---|---|
| **Package Managers & Tools** | **pip** | `requirements.txt`, `setup.py`, `setup.cfg` | `python main.py` or `python app.py` | `python:3.11-slim` (or version matched) |
| | **Poetry** | `poetry.lock`, `[tool.poetry]` in `pyproject.toml` | `pytest` (if configured) | `python:3.11-slim` (or version matched) |
| | **uv** | `uv.lock`, `[tool.uv]` in `pyproject.toml` | `pytest` (if configured) | `python:3.11-slim` (or version matched) |
| | **Pipenv** | `Pipfile`, `Pipfile.lock` | `python main.py` or `app.py` | `python:3.11-slim` (or version matched) |
| | **Conda** | `environment.yml`, `environment.yaml` | `python main.py` or `app.py` | `python:3.11-slim` (or version matched) |
| **Virtual Environments** | **Local venv** | `.venv/`, `venv/`, `env/` (containing `pyvenv.cfg` or `bin/activate`) | Recorded in context; not copied to staging | Inherits runtime image |
| **Runtime Versions** | **Python 3.10** | `requires-python` (`3.10.*`), `.python-version` (`3.10.*`), `runtime.txt` | — | `python:3.10-slim` |
| | **Python 3.11** | `requires-python` (`3.11.*`), `.python-version` (`3.11.*`), `runtime.txt` | — | `python:3.11-slim` |
| | **Python 3.12** | `requires-python` (`3.12.*`), `.python-version` (`3.12.*`), `runtime.txt` | — | `python:3.12-slim` |
| **Test Frameworks** | **pytest** | `pytest.ini`, `conftest.py`, `[tool.pytest]` in `pyproject.toml` | `pytest` | Inherits runtime image |

---

## 3. Polyglot & Mixed-Language Support

| Repository Structure | Example Layout | DevFix Classification | Execution Strategy |
|---|---|---|---|
| **Full-Stack Polyglot** | `package.json` at root + `pyproject.toml` / `backend/requirements.txt` | `Language: Mixed`<br>`Runtime: Mixed` | Informs AI agent of both stacks. Defaults container base image to `node:20-alpine` (or developer-specified `--image <image>`). |
| **Python Project with JS Tooling** | `pyproject.toml` with minor `package.json` for prettier/eslint | `Language: Python`<br>`Runtime: Python` | Weighted scoring recognizes dominant backend Python signals; selects `python:3.11-slim`. |
| **Node Project with Python Scripts** | `package.json` with helper `scripts/build.py` | `Language: JavaScript / TypeScript`<br>`Runtime: Node.js` | Weighted scoring recognizes dominant Node ecosystem; selects `node:20-alpine`. |

---

## 4. Conflict Resolution & Precedence Rules

| Condition | Example | DevFix Behavior |
|---|---|---|
| **Multiple Lockfiles** | `package-lock.json` and `yarn.lock` both present | Emits warning in terminal and agent context: `Multiple lockfiles detected: package-lock.json, yarn.lock`. Precedence favors `pnpm` > `yarn` > `bun` > `npm`. |
| **Declared Manager Mismatch** | `"packageManager": "pnpm@9.5.0"` but `yarn.lock` present | Emits warning: `Package manager declaration (pnpm) conflicts with lockfile (yarn.lock)`. Does not silently overwrite or reformat lockfiles. |
| **Multiple Python Lockfiles** | `poetry.lock` and `Pipfile.lock` present | Emits conflict warning listing all detected lockfiles. |
| **Missing Lockfile** | `package.json` with no lockfile | Defaults manager to `npm`, confidence `Medium`, container `node:20-alpine`. |

---

## 5. Container & Operating System Matrix

| Container Image | OS Base | Primary Binaries | Network Default | Security Restrictions |
|---|---|---|---|---|
| `node:18-alpine` | Alpine Linux 3.19 | Node.js v18, npm, corepack, sh | None (`--network=none`) | Non-root (`1000:1000`), `--cap-drop=ALL` |
| `node:20-alpine` | Alpine Linux 3.20 | Node.js v20, npm, corepack, sh | None (`--network=none`) | Non-root (`1000:1000`), `--cap-drop=ALL` |
| `node:22-alpine` | Alpine Linux 3.21 | Node.js v22, npm, corepack, sh | None (`--network=none`) | Non-root (`1000:1000`), `--cap-drop=ALL` |
| `python:3.10-slim` | Debian Bookworm | Python 3.10, pip, bash/sh | None (`--network=none`) | Non-root (`1000:1000`), `--cap-drop=ALL` |
| `python:3.11-slim` | Debian Bookworm | Python 3.11, pip, bash/sh | None (`--network=none`) | Non-root (`1000:1000`), `--cap-drop=ALL` |
| `python:3.12-slim` | Debian Bookworm | Python 3.12, pip, bash/sh | None (`--network=none`) | Non-root (`1000:1000`), `--cap-drop=ALL` |
| **Custom User Image** | Custom (via `--image`) | User-defined | None (`--network=none`) | Preserves all non-root and cap-drop limits |

