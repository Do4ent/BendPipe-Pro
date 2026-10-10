# TubeBender checkpoint — MOB-001 mobile viewport (2026-10-10)

## Source and scope
- Source: consolidated specification 2.1 — MOB-001, no global mobile document scrollbars.
- Secondary preserved behavior: MOB-002 local scrolling in panels.
- Base: `feature/acceptance-120-browser-20261010`, implementation branch: `feature/mobile-viewport-mob001-20261010`.
- Draft PR #4; no merge to main.

## Code implemented
- `src/ui/mobile-viewport.mjs`: responsive CSS scoped to max-width 1120px, root/app overflow clipping, flexible workspace sizing, drawers bounded by dynamic viewport, local panel scrolling preserved.
- `scripts/build-standalone.mjs`: injects style into standalone head with explicit guard.
- `tests/core/mobile-viewport.test.mjs`: regression checks for breakpoint, clipping, local scrolling, builder injection.
- Chromium test `[MOB-001]` records measured width/height with failure artifacts.

## Verification
- Node MOB-001 viewport contract: PASSED in GitHub Actions.
- Standalone build: PASSED in GitHub Actions.
- Chromium run #23 (38049831137): measured html/body/app = 390×844 with cssOverflow=clip; run timed out on a second page.evaluate poll.
- Chromium run #25 (38049942828): browser run timed out while processing a too-expensive DOM query before assertions.
- Chromium run #27 (38050115968): removed DOM scan, again measured html/body/app = 390×844 with cssOverflow=clip. Browser case still exceeded 90 seconds before assertions completed.
- Consequently **MOB-001 remains PARTIALLY VERIFIED, NOT CLOSED**. The measured layout is correct at 390×844, but reliable UI interaction and acceptance are not demonstrated.

## Next work
1. Investigate unresponsive main thread / excessive startup processing of 10MB standalone (PERF-001 / PERF-003).
2. Profile expensive initialization and WebGL under headless Chromium; capture lightweight timing markers without blocking page.evaluate.
3. Make Chromium mobile smoke reliably complete and test drawer open/close, local panel scroll and 360×740.
4. Only mark MOB-001 accepted after browser checks pass reproducibly.

Never treat CSS-contract checks as complete functional acceptance.
