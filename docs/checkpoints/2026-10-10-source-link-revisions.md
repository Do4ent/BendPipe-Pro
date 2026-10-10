# PERF-001 Source Link Mutation Audit — 2026-10-10

Follow-up to PR #20. Inspected `reference-scene-ui.js` and identified the central `runSourceLinkCommand` handler. All user source-link commands in its UI menu — source display/show/hide/compare, restoring geometry from source snapshot, and breaking source link — pass through the handler after the model command succeeds. This handler previously rendered and saved without explicitly updating DWFx revision counters.

Now the command wrapper invokes `markSceneChanged` before save/render. Display commands increment display revision; geometry restore or link break increment geometry revision. The existing conservative source signature remains in place because legacy project-open paths and direct object writes have not been exhaustively traced. Tests cover presence/ordering of the revision hook and revision increments.

Do not claim O(1) cache validation or browser acceptance. Existing main unchanged.
