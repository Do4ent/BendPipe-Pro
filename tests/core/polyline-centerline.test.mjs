import test from "node:test";
import assert from "node:assert/strict";

import { simplifyPolylineEvidence } from "../../src/recognition/polyline-centerline.mjs";

test("A19: nearly collinear W3D points collapse into one straight candidate", () => {
  const result = simplifyPolylineEvidence([
    [0,0,0],
    [50,0.02,0],
    [100,0,0]
  ], {
    collinear_angle_tolerance_deg: 0.1
  });

  assert.equal(result.production_ready, false);
  assert.equal(result.segments.length, 1);
  assert.ok(Math.abs(result.segments[0].length_mm - 100) < 1e-6);
});

test("A19: a real direction change remains a turn candidate", () => {
  const result = simplifyPolylineEvidence([
    [0,0,0],
    [100,0,0],
    [100,100,0]
  ]);

  assert.equal(result.segments.length, 2);
  assert.equal(result.turns.length, 1);
  assert.ok(Math.abs(result.turns[0].deflection_deg - 90) < 1e-9);
  assert.deepEqual(result.turns[0].point, [100,0,0]);
});

test("A19: duplicate W3D vertices are removed only within explicit tolerance", () => {
  const result = simplifyPolylineEvidence([
    [0,0,0],
    [0.001,0,0],
    [10,0,0]
  ], {
    duplicate_tolerance_mm: 0.01
  });

  assert.equal(result.cleaned_point_count, 2);
  assert.equal(result.segments.length, 1);
});

test("A19: candidate straight segments remain derived evidence, not canonical geometry", () => {
  const result = simplifyPolylineEvidence([
    [0,0,0],
    [10,0,0]
  ]);

  assert.equal(result.status, "candidate");
  assert.equal(result.production_ready, false);
  assert.equal(result.segments[0].kind, "straight_candidate");
  assert.equal(result.segments[0].truth_category, "derived");
  assert.match(result.segments[0].reason, /not yet accepted as canonical/i);
});

test("A19: malformed polyline evidence fails loudly", () => {
  assert.throws(
    () => simplifyPolylineEvidence([[0,0],[1,0,0]]),
    /must be \[x,y,z\]/
  );
});
