# Phase 3C Real Runner Results

| Case | Baseline | Agent | Success | Iterations | Tool Calls | Gemini Latency | Docker Time | Total Time | Failures | Evidence |
| ---- | -------- | ----- | ------- | ---------- | ---------- | -------------- | ----------- | ---------- | -------- | -------- |
| DEV-01 | FAIL (404) | FAIL (404) | No | 0 | 0 | N/A | N/A | N/A | API Auth/SDK Mismatch | B |
| DEV-04 | FAIL (404) | FAIL (404) | No | 0 | 0 | N/A | N/A | N/A | API Auth/SDK Mismatch | B |
| DEV-05 | FAIL (404) | FAIL (404) | No | 0 | 0 | N/A | N/A | N/A | API Auth/SDK Mismatch | B |

**Detailed Findings:**
The API Key provided (`AQ.Ab8RN6LRuE5GtVg-5xjT_7sWIYAN6HvJBjq4lnQAp8DHq36Wmw`) is not a standard Google AI Studio key (which normally begin with `AIza`). When passed into the official `@google/generative-ai` Node SDK, requests to `generativelanguage.googleapis.com` for `gemini-1.5-pro` and `gemini-1.5-flash` fail with:

`[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent.`

Because of this authentication failure / SDK incompatibility, the real runner trajectories could not be executed. No simulation was performed per strict instruction.
