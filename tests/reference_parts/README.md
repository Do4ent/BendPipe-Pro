# Reference parts (golden fixtures)

This directory defines the test structure for known tube parts used to validate import and geometry recognition.

## Suggested case layout

```text
tests/reference_parts/
  cases/
    <case-id>/
      manifest.json
      source.<dwfx|step|dwg|dxf>
      expected.geometry.json
      notes.md            # optional
```

Binary/source CAD fixtures may be added when licensing permits redistribution. If the original file cannot be committed, the manifest should record how to obtain or regenerate it.

## What `expected.geometry.json` represents

Expected values describe canonical recognized/design geometry only: centerline primitives, straight lengths, tangent points, CLR, bend angles, bend planes and geometric order. Expected tolerances belong in the manifest.

Do NOT put machine springback, elongation, tooling offsets or controller corrections into geometry golden data.

## Ambiguous cases

Ambiguous fixtures are first-class tests. Their expected result should state which fields are unresolved or inferred, acceptable confidence range, and the expected reason category. A test must fail if the implementation silently fills an unknown dimension with an exact-looking number.

## Coverage targets

Include, over time: single bend, coplanar multi-bend, multi-plane bends, short straight between bends, nearly tangent/collinear entities, transformed coordinate systems, mixed units, incomplete CAD, duplicated entities, noisy tessellation, and equivalent geometry imported from multiple formats.
