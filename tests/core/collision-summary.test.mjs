import test from "node:test";
import assert from "node:assert/strict";

import { ValidationStatus } from "../../src/domain/validation/results.mjs";
import { summarizeCollisionValidation } from "../../src/domain/validation/collisions.mjs";

test("A09: B-C collision remains visible at project level when A is active", () => {
  const summary = summarizeCollisionValidation({
    activeTubeId: "A",
    collisions: [
      {
        self: false,
        tubeAId: "B",
        tubeBId: "C",
        rowA: 1,
        rowB: 3
      }
    ]
  });

  assert.equal(summary.active_tube.status, ValidationStatus.PASSED);
  assert.equal(summary.active_tube.collision_count, 0);

  assert.equal(summary.project.status, ValidationStatus.VIOLATION);
  assert.equal(summary.project.collision_count, 1);
  assert.equal(summary.project.inactive_only_collision_count, 1);
});

test("active-tube self and intertube collisions are counted separately", () => {
  const summary = summarizeCollisionValidation({
    activeTubeId: "A",
    collisions: [
      { self: true, tubeAId: "A", tubeBId: "A" },
      { self: false, tubeAId: "A", tubeBId: "B" },
      { self: false, tubeAId: "B", tubeBId: "C" }
    ]
  });

  assert.equal(summary.active_tube.status, ValidationStatus.VIOLATION);
  assert.equal(summary.active_tube.collision_count, 2);
  assert.equal(summary.active_tube.self_collision_count, 1);
  assert.equal(summary.active_tube.intertube_collision_count, 1);

  assert.equal(summary.project.status, ValidationStatus.VIOLATION);
  assert.equal(summary.project.collision_count, 3);
  assert.equal(summary.project.inactive_only_collision_count, 1);
});

test("no collisions passes both active and project scopes", () => {
  const summary = summarizeCollisionValidation({
    activeTubeId: "A",
    collisions: []
  });

  assert.equal(summary.active_tube.status, ValidationStatus.PASSED);
  assert.equal(summary.project.status, ValidationStatus.PASSED);
});
