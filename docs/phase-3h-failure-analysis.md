# Phase 3H — Failure Analysis

## DEV-01
1. **What did the agent believe?** It believed Docker was missing from the host environment based on the error `make: not found` during the `docker build` command.
2. **What evidence did it observe?** It observed the `docker build` fail. It ran `apt --version`, `which docker`, `service docker status`.
3. **What action did it take?** It attempted to verify Docker's installation on the host.
4. **Why was that action wrong?** The failure happened *inside* the Alpine container where `make` was missing from the Dockerfile context.
5. **Did the improved prompt/tooling prevent or reduce the failure?** No. It increased token overhead but the model fundamentally misunderstood the container boundary.
6. **What evidence proves the conclusion?** Trajectory log showing host-level `apt` and `service` commands despite instructions to restrict diagnostic assumptions. (Model vs Controller: **A — Model reasoning failure**)

## DEV-02
1. **What did the agent believe?** It correctly believed `DATABASE_URL` was missing from the node runtime.
2. **What evidence did it observe?** It observed the index.js crash throwing `Missing DATABASE_URL`.
3. **What action did it take?** It patched `.env` to include the variable and tried to run `npm start` and `npm init -y`.
4. **Why was that action wrong?** Node 20 requires `--env-file=.env` if `dotenv` isn't installed. The agent failed to link the environment variables natively to the node command.
5. **Did the improved prompt/tooling prevent or reduce the failure?** No. It correctly diagnosed the issue but lacked the specific runtime knowledge for the exact repair payload. 
6. **What evidence proves the conclusion?** It ran `export DATABASE_URL=...` which is only transient to the single shell execution. (Model vs Controller: **A — Model reasoning failure**)

## DEV-03
1. **What did the agent believe?** It believed port 8080 was in use and needed to be killed.
2. **What evidence did it observe?** `EADDRINUSE :::8080` error from `node index.js`.
3. **What action did it take?** It executed tools to find the PID (`lsof -i :8080`, `netstat`) but struggled with Alpine's minimal networking toolkit.
4. **Why was that action wrong?** The agent successfully diagnosed it but spent all 8 iterations fighting missing OS utilities (`lsof: not found`, `fuser` issues) rather than cleanly killing the process or modifying `process.env.PORT` which was supported in the `index.js` file.
5. **Did the improved prompt/tooling prevent or reduce the failure?** No, the agent exhausted its limit exploring missing tools.
6. **What evidence proves the conclusion?** The tool outputs sequentially returning "command not found" for standard linux network commands. (Model vs Controller: **A — Model reasoning failure** (Should have changed `index.js` port dynamically instead)).

## DEV-04
1. **What did the agent believe?** It believed the `entrypoint.sh` had incorrect line endings (CRLF).
2. **What evidence did it observe?** It used `file ./entrypoint.sh` which returned `Bourne-Again shell script text executable, ASCII text, with CRLF line terminators`.
3. **What action did it take?** It used `patch_file` to replace the first line with `#!/usr/bin/env sh`.
4. **Why was that action wrong?** The action was correct, but the *controller's* `patch_file` implementation used `awk ... > tmp && mv tmp file` which completely stripped the executable permissions off the bash file (`chmod +x`), causing a `Permission denied` error.
5. **Did the improved prompt/tooling prevent or reduce the failure?** The prompt drastically *improved* the model's diagnostic behavior (identifying CRLF quickly with `file`). The regression was caused entirely by a brittle controller implementation.
6. **What evidence proves the conclusion?** After the patch, the verifier returned `sh: ./entrypoint.sh: Permission denied`, proving the executable bit was stripped. (Model vs Controller: **D — Controller failure** & **B — Tool interface failure**)

## DEV-05
1. **What did the agent believe?** It believed `tsc` and TypeScript dependencies were missing.
2. **What evidence did it observe?** `tsc: not found` during `npm start`.
3. **What action did it take?** It ran `npm install typescript --save-dev` on the final iteration (iteration 8).
4. **Why was that action wrong?** The action was perfectly correct, but it happened exactly at the iteration limit cutoff. Earlier iterations were wasted trying to manually edit `package.json` to bypass `tsc`.
5. **Did the improved prompt/tooling prevent or reduce the failure?** The structured feedback actively helped it realize its initial package.json patches failed, leading it to finally correctly install typescript. It just ran out of time.
6. **What evidence proves the conclusion?** Trajectory shows `npm install typescript --save-dev` successfully executed directly before the iteration limit terminated the sandbox. (Model vs Controller: **E — Environment/design failure** (Iteration limit too strict for complex cascades)).
