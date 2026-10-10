# Initial CAD scene startup yield — 2026-10-10

Scope: PERF-001 development, not acceptance.

The first heavy scene rebuild is queued after two animation-frame callbacks followed by a task boundary. This permits a browser paint opportunity after binding the controls instead of immediately executing synchronous 3D work in the first frame. A cancellation handle prevents stale startup work after teardown.

The existing interactive redraw coalescer and telemetry remain in use. Actual geometry construction is still synchronous once started; this change does not implement incremental meshing, off-main-thread workers or real-world latency guarantees. The next step is to partition high-complexity scene construction after profiling.

Tests: deterministic two-frame/task scheduling, cancellation, builder hook. CI configured on the feature branch. No release/acceptance or main merge.
