| Case   | Phase 3G Agent | Phase 3H Agent | Improvement | Iterations G | Iterations H | Tool Calls G | Tool Calls H | Final Verifier |
| ------ | -------------- | -------------- | ----------- | -----------: | -----------: | -----------: | -----------: | -------------- |
| DEV-01 | FAIL           | FAIL           | 0%          | 8            | 8            | 8            | 7            | FAIL           |
| DEV-02 | FAIL           | FAIL           | 0%          | 8            | 8            | 8            | 8            | FAIL           |
| DEV-03 | FAIL           | FAIL           | 0%          | 8            | 8            | 7            | 7            | FAIL           |
| DEV-04 | PASS           | FAIL           | -100%       | 8            | 8            | 7            | 8            | FAIL           |
| DEV-05 | FAIL           | FAIL           | 0%          | 8            | 8            | 8            | 7            | FAIL           |

### Aggregate A/B Result

| Metric                | Phase 3G Control | Phase 3H Experiment |
| --------------------- | ---------------: | ------------------: |
| Verified Success      | 1/5 (20%)        | 0/5 (0%)            |
| Success Rate          | 20%              | 0%                  |
| Average Iterations    | 8.0              | 8.0                 |
| Average Tool Calls    | 7.6              | 7.4                 |
| Tool Reliability      | 94.7%            | 92.5%               |
| Average API Latency   | ~7,490 ms        | ~12,640 ms          |
| Average Total Latency | ~15,440 ms       | ~17,400 ms          |
| Average Tokens        | 5,111            | 11,263              |
| Total Cost            | < $0.01          | < $0.02             |
| Safety Violations     | 0                | 0                   |
