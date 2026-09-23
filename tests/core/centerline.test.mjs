import test from "node:test";
import assert from "node:assert/strict";

import {
  centerlineArcLength,
  centerlineLength
} from "../../src/domain/geometry/centerline.mjs";

const EPS = 1e-12;

test("A01: 90 degree bend uses CLR directly as centerline radius", () => {
  const actual = centerlineArcLength(65, 90);
  const expected = 102.10176124166827;

  assert.ok(
    Math.abs(actual - expected) <= EPS,
    `expected ${expected}, got ${actual}`
  );
});

test("A01: two 100 mm straights plus CLR65/90 bend total 302.10176124166827 mm", () => {
  const actual = centerlineLength([
    { type: "LINE", length: 100 },
    { type: "BEND", clr: 65, angle: 90 },
    { type: "LINE", length: 100 }
  ]);

  const expected = 302.10176124166827;
  assert.ok(Math.abs(actual - expected) <= EPS);
});

test("signed bend angle changes direction, not arc length", () => {
  assert.equal(
    centerlineArcLength(65, -90),
    centerlineArcLength(65, 90)
  );
});

test("tube outside diameter is not an input to centerline arc length", () => {
  const correct = centerlineArcLength(65, 90);
  const legacyWrong = centerlineArcLength(65 + 22 / 2, 90);

  assert.notEqual(correct, legacyWrong);
  assert.ok(Math.abs(legacyWrong - 119.38052083641213) <= EPS);
});

test("invalid canonical primitives fail instead of producing a plausible length", () => {
  assert.throws(
    () => centerlineLength([{ type: "BEND", clr: -1, angle: 90 }]),
    RangeError
  );
  assert.throws(
    () => centerlineLength([{ type: "UNKNOWN", length: 100 }]),
    RangeError
  );
});
