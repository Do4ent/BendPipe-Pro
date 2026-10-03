function requiredId(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

export function indexToolingById(records) {
  if (!Array.isArray(records)) {
    throw new TypeError("records must be an array");
  }

  const map = new Map();
  for (const record of records) {
    if (!record || typeof record !== "object") {
      throw new TypeError("each tooling record must be an object");
    }

    const id = requiredId(record.id, "tooling record id");
    if (map.has(id)) {
      throw new RangeError(`duplicate tooling id: ${id}`);
    }
    map.set(id, record);
  }

  return map;
}

export function resolveToolingById(records, toolingId) {
  requiredId(toolingId, "toolingId");
  return indexToolingById(records).get(toolingId) ?? null;
}

/**
 * Convert a legacy array index using the original legacy snapshot.
 *
 * The migration deliberately has no nearest/default fallback. An invalid
 * legacy reference stays unresolved so the caller can block production and
 * request explicit repair.
 */
export function migrateLegacyToolingIndex(legacyIndex, legacySnapshot) {
  if (!Number.isInteger(legacyIndex)) {
    return Object.freeze({
      tooling_id: null,
      migrated_from_index: legacyIndex,
      error: "legacy tooling index is not an integer"
    });
  }

  if (!Array.isArray(legacySnapshot)) {
    throw new TypeError("legacySnapshot must be an array");
  }

  const record = legacySnapshot[legacyIndex];
  if (!record) {
    return Object.freeze({
      tooling_id: null,
      migrated_from_index: legacyIndex,
      error: "legacy tooling index is out of range"
    });
  }

  try {
    const toolingId = requiredId(record.id, "legacy tooling record id");
    return Object.freeze({
      tooling_id: toolingId,
      migrated_from_index: legacyIndex,
      error: null
    });
  } catch {
    return Object.freeze({
      tooling_id: null,
      migrated_from_index: legacyIndex,
      error: "legacy tooling record has no stable id"
    });
  }
}

/**
 * Delete tooling by stable ID.
 *
 * If any tube uses the record, an explicit replacement ID is mandatory.
 * This avoids the VC207R7 failure mode where array compaction silently
 * changes the meaning of diameterIndex/tooling references.
 */
export function deleteToolingById({
  records,
  tubes,
  toolingId,
  replacementId = null
}) {
  const byId = indexToolingById(records);
  requiredId(toolingId, "toolingId");

  if (!byId.has(toolingId)) {
    throw new RangeError(`tooling id not found: ${toolingId}`);
  }

  if (!Array.isArray(tubes)) {
    throw new TypeError("tubes must be an array");
  }

  const users = tubes.filter((tube) => tube?.tooling_id === toolingId);

  if (users.length > 0 && replacementId === null) {
    throw new Error(
      `tooling ${toolingId} is used by ${users.length} tube(s); explicit replacement required`
    );
  }

  if (replacementId !== null) {
    requiredId(replacementId, "replacementId");
    if (replacementId === toolingId) {
      throw new RangeError("replacementId must differ from toolingId");
    }
    if (!byId.has(replacementId)) {
      throw new RangeError(`replacement tooling id not found: ${replacementId}`);
    }
  }

  const nextRecords = records.filter((record) => record.id !== toolingId);
  const nextTubes = tubes.map((tube) => {
    if (tube?.tooling_id !== toolingId) {
      return tube;
    }
    return Object.freeze({
      ...tube,
      tooling_id: replacementId
    });
  });

  return Object.freeze({
    records: Object.freeze(nextRecords),
    tubes: Object.freeze(nextTubes),
    replaced_tube_ids: Object.freeze(
      users.map((tube) => tube.id ?? null)
    )
  });
}
