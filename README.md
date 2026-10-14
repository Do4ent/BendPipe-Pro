# BendPipe-Pro

BendPipe-Pro is intended to recognize bent tubes from CAD sources and convert verified geometry into tube-bending technological data.

## Target pipeline

1. Import CAD/DWFx/STEP/DWG/DXF.
2. Recognize tube geometry and derive a canonical centerline.
3. Identify straight segments, tangent points, CLR, bend angles, plane rotations, and bend order.
4. Report ambiguity explicitly with confidence and reasons; never silently invent dimensions.
5. Validate manufacturability.
6. Apply machine-specific compensation only in a separate downstream layer.
7. Export technological data for tube-bending workflows.

The application is a browser-based CAD editor with one standalone CAD Workspace HTML. The integration branch is `develop`. This branch prepares `v0.1.0-rc.8`, preventing delayed native tool buttons from flashing during initial load and refresh. Published packages are listed on the GitHub Releases page.

## Build and verification

Use Node.js 24 or later:

```sh
npm test
npm run build:standalone
node scripts/check-standalone-syntax.mjs
```

Open `dist/BendPipe_Pro_CAD_Workspace.html` in Chromium. For browser acceptance:

```sh
npm install --no-save @playwright/test@1.56.1
npx playwright install chromium
npx playwright test --config acceptance/playwright.config.mjs
```

The release scenario imports the committed 80004806 DWFx, recognizes nine editable tube candidates, edits a length, saves and reloads the workspace, then exports and reopens project JSON. It checks preservation of canonical geometry, provenance and production blockers. Project JSON is an editable project artifact; manufacturing export requires confirmed geometry, tooling, material and machine settings.

Build the release package with `npm run build:release` and open `dist/BendPipe_Pro_CAD_Workspace.html`. See `docs/releases/0.1.0-rc.8.md` for release scope and known limitations.

## AI development team

See `AGENTS.md` and `docs/ai-agent-team.md`. Agent definitions live under `.ai/agents/`.

## Architecture

See `docs/architecture.md` and `.ai/contracts/domain-boundaries.md`.

## Reference-part tests

Golden/reference parts are defined under `tests/reference_parts/`. These fixtures must keep recognized geometry separate from machine compensation.
