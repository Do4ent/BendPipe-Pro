# BendPipe-Pro agent instructions

These instructions apply to every AI-assisted change in this repository.

## Non-negotiable rules

- Never commit directly to `main`. Work in a dedicated branch and use a Pull Request.
- Read the current project structure and relevant code before proposing implementation changes.
- Keep recognized CAD geometry separate from machine/tool compensation.
- Never silently guess a missing dimension. Use `null`/unknown, a confidence value, and a human-readable ambiguity reason.
- Preserve source evidence/provenance for derived geometry whenever practical.
- Prefer deterministic, testable geometry algorithms over opaque heuristics.
- Add or update reference-part tests for geometry/import/technology behavior.
- Machine-specific springback, elongation, clamp offsets, tool corrections, calibration tables, and controller conventions belong downstream of canonical recognized geometry.
- A reviewer must verify domain-boundary compliance before a PR is considered ready.

## Canonical processing stages

`Source CAD -> Import/Normalization -> Geometry Recognition -> Canonical Tube Geometry -> Bending Technology -> Machine Adapter/Compensation -> Export`

UI may visualize every stage, but must label recognized, inferred, user-entered, and machine-compensated values distinctly.

## Confidence policy

Every ambiguous or inferred result should carry:

- `value`: actual result or `null` when unresolved;
- `confidence`: number from 0.0 to 1.0;
- `reason`: why confidence is below 1.0 or why the value is unresolved;
- `source`: source entity/feature when available;
- `method`: algorithm or rule used to derive the result.

Do not convert low-confidence inference into an authoritative dimension without explicit confirmation.

## Agent team

The Orchestrator assigns work and enforces handoffs among Lead Developer, CAD / Geometry, Tube Bending Technology, Import / Export, UI, QA, and Reviewer agents. Detailed contracts are in `docs/ai-agent-team.md` and `.ai/agents/`.
