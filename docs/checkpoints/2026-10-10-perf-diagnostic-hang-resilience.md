# PERF-001 diagnostic hang-resilience checkpoint — 2026-10-10

- Bounded the final `page.evaluate` evidence read to five seconds using a race. A stalled Chromium main thread can no longer keep this diagnostic read pending indefinitely.
- Captured up to 200 console/pageerror records independently of the final page-side metrics, with each message capped at 500 characters.
- Retained the existing failing assertion on startup errors. The test does **not** convert timeouts to passing results.
- This does not cancel a blocked Chromium evaluation; it only bounds the test's wait for its result and makes evidence collection more resilient.
- No application geometry or `main` changes. Representative DWFx edit-to-paint acceptance remains open.
