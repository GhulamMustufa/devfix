# Phase 4B — Production Implementation: Foundation

## Objective

Build STEP 1 of the Micro1 Agentic Workflows final Hackathon product: the reusable Sandbox and Tool Foundation, based on the validated architecture from Phase 3J.

## Architecture

The sandbox abstraction is implemented in `src/sandbox/Docker.js` using Node.js `child_process.exec` (asynchronous) to wrap `docker exec` calls against an existing, isolated, and resource-limited container.

The tool logic is centralized in `src/tools/` and exposes three core tools that the agent will use:
- `execute_command`
- `read_file`
- `patch_file`

A `ToolRegistry` manages tool definition schemas and dispatches actions.

## Key Mechanisms Implemented

### 1. Asynchronous Execution and Safety Limits
All interactions with Docker are fully asynchronous, respecting event loops. The `execute_command` uses a fallback timeout wrapped inside Docker to reliably terminate commands and handle zombies:
```sh
docker exec <container> timeout <sec> sh -c <command>
```

Safety pattern filters reject potentially catastrophic operations such as `rm -rf /`, `mkfs`, and recursive background loops, protecting both the host and the sandbox integrity.

### 2. Path Traversal Protection
The `read_file` and `patch_file` tools strictly validate and confine file access using regex and path normalization logic to ensure operations never touch `/etc/passwd`, `/root/`, or escape the `/app` workspace directory.

### 3. File Patching & Permission Preservation (Regression Fix)
During Phase 3J, we identified cases where modifying executable files inadvertently stripped their execution permissions (e.g. changing from `755` to `644`). 

To prevent this regression, the `patch_file` implementation explicitly reads the current permissions using `stat -c %a` before modifying the file and reinstates them via `chmod` afterwards. 

Furthermore, string interpolation of arbitrary user replacements uses safe JSON serialization and `awk -v repl=...` variables rather than brittle bash `sed` replacements.

## Verification

A comprehensive regression test suite is implemented in `tests/foundation.test.js` validating:
- Sandbox creation and cleanup lifecycle
- Timeout enforcement for stalled commands
- Execution of dangerous patterns is properly blocked
- Access to out-of-bound system files is restricted
- Executable permissions (755) are strictly preserved across patches

**Result**: All 8 subtests passing. Foundation locked.
