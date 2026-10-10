import test from "node:test";
import assert from "node:assert/strict";

import {
  ValidationStatus,
  calculationErrorResult,
  evaluateProductionRelease,
  makeValidationResult
} from "../../src/domain/validation/results.mjs";

const BASE = {
  scope: "tube",
  subjectId: "tube-1",
  modelRevision: "rev-1"
};

test("A02: calculation errors are explicit and block required production checks", () => {
  const result = calculationErrorResult({
    ...BASE,
    checkId: "bounds",
    requiredForProduction: true,
    message: "Bounds calculation failed",
    error: new Error("boom")
  });

  assert.equal(result.status, ValidationStatus.CALCULATION_ERROR);
  assert.equal(result.blocks_production, true);
  assert.equal(result.error.detail, "boom");
});

test("passed required check does not block production", () => {
  const result = makeValidationResult({
    ...BASE,
    checkId: "bounds",
    requiredForProduction: true,
    status: ValidationStatus.PASSED,
    severity: "info",
    message: "Bounds are valid"
  });

  assert.equal(result.blocks_production, false);
});

test("advisory violation may remain non-blocking", () => {
  const result = makeValidationResult({
    ...BASE,
    checkId: "advisory-note",
    requiredForProduction: false,
    status: ValidationStatus.VIOLATION,
    severity: "warning",
    message: "Advisory condition"
  });

  assert.equal(result.blocks_production, false);
});

test("A05: missing required check blocks production release", () => {
  const gate = evaluateProductionRelease({
    results: [],
    requiredCheckIds: ["bounds"]
  });

  assert.equal(gate.allowed, false);
  assert.deepEqual(gate.blockers, [
    {
      check_id: "bounds",
      status: ValidationStatus.NOT_CHECKED,
      reason: "required validation result is missing"
    }
  ]);
});

test("A05: any non-passed required check blocks production release", () => {
  const results = [
    makeValidationResult({
      ...BASE,
      checkId: "bounds",
      requiredForProduction: true,
      status: ValidationStatus.PASSED,
      severity: "info",
      message: "Bounds are valid"
    }),
    makeValidationResult({
      ...BASE,
      checkId: "technology",
      requiredForProduction: true,
      status: ValidationStatus.NOT_CHECKED,
      severity: "error",
      message: "Technology check has not run"
    })
  ];

  const gate = evaluateProductionRelease({
    results,
    requiredCheckIds: ["bounds", "technology"]
  });

  assert.equal(gate.allowed, false);
  assert.equal(gate.blockers.length, 1);
  assert.equal(gate.blockers[0].check_id, "technology");
  assert.equal(gate.blockers[0].status, ValidationStatus.NOT_CHECKED);
});

test("production release is allowed only when every required check passed", () => {
  const results = ["bounds", "technology"].map((checkId) =>
    makeValidationResult({
      ...BASE,
      checkId,
      requiredForProduction: true,
      status: ValidationStatus.PASSED,
      severity: "info",
      message: `${checkId} passed`
    })
  );

  const gate = evaluateProductionRelease({
    results,
    requiredCheckIds: ["bounds", "technology"]
  });

  assert.equal(gate.allowed, true);
  assert.deepEqual(gate.blockers, []);
});
