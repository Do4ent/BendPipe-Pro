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

The repository is currently at the project-scaffolding stage. The application language/framework is intentionally not assumed yet.

## AI development team

See `AGENTS.md` and `docs/ai-agent-team.md`. Agent definitions live under `.ai/agents/`.

## Architecture

See `docs/architecture.md` and `.ai/contracts/domain-boundaries.md`.

## Reference-part tests

Golden/reference parts are defined under `tests/reference_parts/`. These fixtures must keep recognized geometry separate from machine compensation.
