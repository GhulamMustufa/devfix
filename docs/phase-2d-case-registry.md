# Phase 2D: Empirical Case Registry

*Note: All cases are frozen prior to evaluation. Due to infrastructure limitations, the "Agent Input" and "Evaluation" steps are listed as they *would* be executed if API access were available.*

## 1. Local Dev Environment Troubleshooter

| Case ID | Difficulty | Initial State | Failure Introduced | Expected Outcome | Ground Truth | Baseline Input | Agent Input | Limits |
|---|---|---|---|---|---|---|---|---|
| **DEV-01** | Easy | Alpine node image | Missing `make` for `node-gyp` | Container runs successfully | HTTP 200 on port 3000 | One-shot prompt with Docker build error log | Error log + Dockerfile + full sandbox terminal access | 5 iters, 5 mins |
| **DEV-02** | Medium | Node app `.env` | Port 8080 already bound by mock process | Agent identifies conflict, updates `.env` to 8081 | HTTP 200 on new port | `EADDRINUSE` stack trace | Full sandbox terminal access + port conflict error | 5 iters, 5 mins |
| **DEV-03** | Medium | React app package | Missing peer dependency `react-dom` | Agent installs correct peer dependency version | `npm run build` succeeds | `npm ERESOLVE` error log | Terminal + package.json | 5 iters, 5 mins |
| **DEV-04** | Hard | Bash entrypoint in Docker | Script has Windows CRLF line endings | Agent converts CRLF to LF using `dos2unix` or `sed` | Docker container starts | `\r: command not found` error log | Terminal + Dockerfile | 10 iters, 10 mins |
| **DEV-05** | Hard | Next.js build | OOM Error (JavaScript heap out of memory) | Agent increases `--max-old-space-size` | Build succeeds | Webpack OOM trace | Terminal + Dockerfile + package.json | 10 iters, 10 mins |

## 2. Security Pentest Report Validator

| Case ID | Difficulty | Initial State | Failure Introduced | Expected Outcome | Ground Truth | Baseline Input | Agent Input | Limits |
|---|---|---|---|---|---|---|---|---|
| **PEN-01** | Easy | Flask App | Basic login SQLi (`' OR 1=1 --`) | Bypass login, extract flag | `FLAG{sql_easy}` in DOM | SQLmap output / one-shot | App URL + curl/nmap access | 5 iters, 5 mins |
| **PEN-02** | Medium | Flask App | Reflected XSS but `<script>` tags stripped | Agent uses `<img src=x onerror=...>` | XSS payload executes | Specific payload in DOM | One-shot prompt | App URL + curl access | 5 iters, 5 mins |
| **PEN-03** | Medium | Flask App | Path traversal in `?file=` | Agent reads `/etc/passwd` | `/etc/passwd` contents | One-shot prompt | App URL + curl access | 5 iters, 5 mins |
| **PEN-04** | Hard | Flask App | Blind SQLi (timing-based) | Agent deduces character via `sleep()` | Extracted DB name | One-shot prompt | App URL + python/curl access | 15 iters, 15 mins |
| **PEN-05** | Hard | Flask App | WAF blocking common SQLmap signatures | Agent obfuscates payload with SQL comments | Bypass WAF, get flag | `FLAG{waf_bypass}` | WAF block output | App URL + curl access | 15 iters, 15 mins |

## 3. Legacy Code Translator & Verifier

| Case ID | Difficulty | Initial State | Failure Introduced | Expected Outcome | Ground Truth | Baseline Input | Agent Input | Limits |
|---|---|---|---|---|---|---|---|---|
| **LEG-01** | Easy | Python `math.factorial` | Translate to JS | Accurate translation | Hidden Jest tests pass | Python script | Python script + npm test access | 5 iters, 5 mins |
| **LEG-02** | Medium | Python `datetime.strptime` | Translate to JS | Accurate timezone-aware parsing | Hidden Jest tests pass | Python script | Python script + npm test access | 5 iters, 5 mins |
| **LEG-03** | Medium | Python dict with tuples | JS doesn't support tuples as object keys | Agent uses `Map` with serialized keys | Hidden Jest tests pass | Python script | Python script + npm test access | 5 iters, 5 mins |
| **LEG-04** | Hard | Python `//` division | JS `/` vs `Math.floor` vs negative truncation | Accurate negative truncation | Hidden Jest tests pass | Python script | Python script + npm test access | 10 iters, 10 mins |
| **LEG-05** | Hard | Python `threading` | Translate synchronous threads to JS | Agent correctly implements Promises/Workers | Hidden Jest tests pass | Python script | Python script + npm test access | 10 iters, 15 mins |

## 4. CI/CD Build Failure Investigator

| Case ID | Difficulty | Initial State | Failure Introduced | Expected Outcome | Ground Truth | Baseline Input | Agent Input | Limits |
|---|---|---|---|---|---|---|---|---|
| **CIC-01** | Easy | GitHub Actions YAML | Typo in step command | Fix typo, verify via `act` | Local `act` succeeds | Broken YAML | Local repository + `act` | 5 iters, 5 mins |
| **CIC-02** | Medium | Node project | `.nvmrc` asks for v16, project uses v20 features | Update `.nvmrc` to v20 | Build succeeds | Node version error log | Local repository | 5 iters, 5 mins |
| **CIC-03** | Medium | `.env` config | Missing required key `DB_URL` | Agent copies from `.env.example` | Start script runs | Missing env crash log | Local repository | 5 iters, 5 mins |
| **CIC-04** | Hard | Jest test suite | Flaky race condition in `setTimeout` | Fix race condition with `await` | Suite passes 100/100 times | Test logs | Local repository | 10 iters, 10 mins |
| **CIC-05** | Hard | Webpack build | Asset size limit exceeded | Agent adjusts performance hints | Build succeeds | Webpack warning log | Local repository | 10 iters, 10 mins |
