export const ValidationStatus = Object.freeze({
  PASSED: "passed",
  VIOLATION: "violation",
  NOT_CHECKED: "not_checked",
  CALCULATION_ERROR: "calculation_error"
});

const VALID_STATUSES = new Set(Object.values(ValidationStatus));
const VALID_SCOPES = new Set(["tube", "project"]);
const VALID_SEVERITIES = new Set(["info", "warning", "error"]);

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

export function makeValidationResult({
  checkId,
  scope,
  subjectId,
  modelRevision,
  requiredForProduction,
  status,
  severity = "error",
  message,
  evidence = [],
  error = null
}) {
  requiredString(checkId, "checkId");
  requiredString(subjectId, "subjectId");
  requiredString(modelRevision, "modelRevision");
  requiredString(message, "message");

  if (!VALID_SCOPES.has(scope)) {
    throw new RangeError(`unsupported validation scope: ${String(scope)}`);
  }
  if (!VALID_STATUSES.has(status)) {
    throw new RangeError(`unsupported validation status: ${String(status)}`);
  }
  if (!VALID_SEVERITIES.has(severity)) {
    throw new RangeError(`unsupported validation severity: ${String(severity)}`);
  }
  if (typeof requiredForProduction !== "boolean") {
    throw new TypeError("requiredForProduction must be boolean");
  }
  if (!Array.isArray(evidence)) {
    throw new TypeError("evidence must be an array");
  }

  return Object.freeze({
    check_id: checkId,
    scope,
    subject_id: subjectId,
    model_revision: modelRevision,
    required_for_production: requiredForProduction,
    status,
    severity,
    message,
    blocks_production:
      requiredForProduction && status !== ValidationStatus.PASSED,
    evidence: Object.freeze([...evidence]),
    error
  });
}

export function calculationErrorResult({
  checkId,
  scope,
  subjectId,
  modelRevision,
  requiredForProduction,
  message,
  error
}) {
  const detail =
    error instanceof Error ? error.message : String(error ?? "unknown error");

  return makeValidationResult({
    checkId,
    scope,
    subjectId,
    modelRevision,
    requiredForProduction,
    status: ValidationStatus.CALCULATION_ERROR,
    severity: "error",
    message,
    error: {
      code: error?.code ?? null,
      detail
    }
  });
}

/**
 * Evaluate the production release gate.
 *
 * requiredCheckIds is explicit so an absent check is treated as missing rather
 * than silently disappearing from the release decision.
 */
export function evaluateProductionRelease({
  results,
  requiredCheckIds
}) {
  if (!Array.isArray(results)) {
    throw new TypeError("results must be an array");
  }
  if (!Array.isArray(requiredCheckIds)) {
    throw new TypeError("requiredCheckIds must be an array");
  }

  const byId = new Map();
  for (const result of results) {
    if (!result || typeof result !== "object") {
      throw new TypeError("each validation result must be an object");
    }
    requiredString(result.check_id, "result.check_id");
    byId.set(result.check_id, result);
  }

  const blockers = [];
  for (const checkId of requiredCheckIds) {
    requiredString(checkId, "requiredCheckId");
    const result = byId.get(checkId);

    if (!result) {
      blockers.push({
        check_id: checkId,
        status: ValidationStatus.NOT_CHECKED,
        reason: "required validation result is missing"
      });
      continue;
    }

    if (result.status !== ValidationStatus.PASSED) {
      blockers.push({
        check_id: checkId,
        status: result.status,
        reason: result.message
      });
    }
  }

  return Object.freeze({
    allowed: blockers.length === 0,
    blockers: Object.freeze(blockers)
  });
}
