import test from "node:test";
import assert from "node:assert/strict";

import {
  deleteToolingById,
  migrateLegacyToolingIndex,
  resolveToolingById
} from "../../src/domain/tooling/references.mjs";

const TOOLING = [
  { id: "tool-15", diameter_mm: 15 },
  { id: "tool-22", diameter_mm: 22 },
  { id: "tool-28", diameter_mm: 28 }
];

test("A03: sorting tooling records cannot change a tube's tooling identity", () => {
  const tube = { id: "tube-1", tooling_id: "tool-22" };
  const sorted = [...TOOLING].sort((a, b) => b.diameter_mm - a.diameter_mm);

  assert.equal(resolveToolingById(TOOLING, tube.tooling_id).diameter_mm, 22);
  assert.equal(resolveToolingById(sorted, tube.tooling_id).diameter_mm, 22);
});

test("A03: deleting an unused earlier record does not change a stable tooling reference", () => {
  const tube = { id: "tube-1", tooling_id: "tool-22" };
  const afterDelete = TOOLING.filter((record) => record.id !== "tool-15");

  assert.equal(resolveToolingById(afterDelete, tube.tooling_id).id, "tool-22");
});

test("A03: deleting used tooling without explicit replacement is rejected", () => {
  assert.throws(
    () =>
      deleteToolingById({
        records: TOOLING,
        tubes: [{ id: "tube-1", tooling_id: "tool-22" }],
        toolingId: "tool-22"
      }),
    /explicit replacement required/
  );
});

test("A03: explicit tooling replacement updates only tubes that used the deleted id", () => {
  const result = deleteToolingById({
    records: TOOLING,
    tubes: [
      { id: "tube-1", tooling_id: "tool-22" },
      { id: "tube-2", tooling_id: "tool-28" }
    ],
    toolingId: "tool-22",
    replacementId: "tool-28"
  });

  assert.equal(result.records.some((record) => record.id === "tool-22"), false);
  assert.equal(result.tubes[0].tooling_id, "tool-28");
  assert.equal(result.tubes[1].tooling_id, "tool-28");
  assert.deepEqual(result.replaced_tube_ids, ["tube-1"]);
});

test("legacy tooling index migrates against the original snapshot only", () => {
  const migration = migrateLegacyToolingIndex(1, TOOLING);

  assert.deepEqual(migration, {
    tooling_id: "tool-22",
    migrated_from_index: 1,
    error: null
  });
});

test("invalid legacy tooling index remains unresolved instead of falling back", () => {
  const migration = migrateLegacyToolingIndex(99, TOOLING);

  assert.equal(migration.tooling_id, null);
  assert.match(migration.error, /out of range/);
});
