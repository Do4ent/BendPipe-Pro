# Cooperative scene queue checkpoint — 2026-10-10

## Engineering delivered
Added createCooperativeSceneQueue in src/domain/performance/render-startup.mjs.

- Processes independent scene work in bounded batches (default 32), yielding between batches through an injected task scheduler.
- Retains input order and accepts an immutable snapshot of input list.
- Cancels stale queued work when a different CAD project replaces the previous one.
- Exposes progress and failure diagnostics, isolates independent item errors.
- Includes deterministic tests for chunk boundaries, cancellation, project replacement and error isolation.

## Important integration limit
This is a reusable execution primitive only. The legacy renderViewerOnly() scene builder has **not** been converted to iterative chunked construction; its synchronous geometry computations still block for the duration of each render. No browser performance acceptance or measured reduction is claimed. Next action: isolate per-component scene construction from the monolithic renderer, capture the project's component snapshot and commit staged meshes in batches without partial or stale project displays.

No changes to canonical geometry, compensation, main or release readiness.
