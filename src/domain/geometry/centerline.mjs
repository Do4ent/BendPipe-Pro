const DEG_TO_RAD = Math.PI / 180;

function finiteNumber(value, name) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function nonNegative(value, name) {
  finiteNumber(value, name);
  if (value < 0) {
    throw new RangeError(`${name} must be >= 0`);
  }
  return value;
}

/**
 * Return nominal centerline arc length for one bend.
 *
 * CLR is already the centerline radius. Tube OD/wall/tooling geometry is
 * intentionally not part of this calculation.
 */
export function centerlineArcLength(clrMm, angleDeg) {
  nonNegative(clrMm, "clrMm");
  finiteNumber(angleDeg, "angleDeg");
  return clrMm * Math.abs(angleDeg) * DEG_TO_RAD;
}

/**
 * Return nominal centerline length for an ordered canonical primitive list.
 *
 * Supported primitives:
 *   { type: "LINE", length: number }
 *   { type: "BEND", clr: number, angle: number }
 *
 * Manufacturing allowances, springback and machine/tool offsets do not belong
 * here and must be applied downstream.
 */
export function centerlineLength(primitives) {
  if (!Array.isArray(primitives)) {
    throw new TypeError("primitives must be an array");
  }

  let total = 0;
  for (const primitive of primitives) {
    if (!primitive || typeof primitive !== "object") {
      throw new TypeError("each primitive must be an object");
    }

    if (primitive.type === "LINE") {
      total += nonNegative(primitive.length, "LINE.length");
      continue;
    }

    if (primitive.type === "BEND") {
      total += centerlineArcLength(primitive.clr, primitive.angle);
      continue;
    }

    throw new RangeError(`unsupported primitive type: ${String(primitive.type)}`);
  }

  return total;
}
