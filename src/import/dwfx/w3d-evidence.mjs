function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError("W3D input must be an ArrayBuffer or Uint8Array");
}

function toHex(bytes, max = 32) {
  return [...bytes.subarray(0, Math.min(max, bytes.length))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function createW3dEvidence({
  dwfxFile,
  packagePath,
  bytes,
  diagnostics = []
}) {
  const input = asBytes(bytes);
  if (!dwfxFile || !packagePath) {
    throw new RangeError("dwfxFile and packagePath are required");
  }
  return Object.freeze({
    resource_id: `w3d:${packagePath}`,
    source: Object.freeze({
      dwfx_file: String(dwfxFile),
      package_path: String(packagePath)
    }),
    byte_length: input.length,
    header_hex: toHex(input),
    decode_status: "binary_unparsed",
    production_ready: false,
    entities: Object.freeze([]),
    diagnostics: Object.freeze([
      "W3D binary resource located but not decoded into canonical geometry.",
      ...diagnostics.map(String)
    ])
  });
}

export function withDecodedW3dEntities(evidence, entities, { complete = false } = {}) {
  if (!evidence || typeof evidence !== "object") {
    throw new TypeError("evidence is required");
  }
  if (!Array.isArray(entities)) {
    throw new TypeError("entities must be an array");
  }

  const normalized = entities.map((entity, index) => {
    if (!entity || typeof entity !== "object") {
      throw new TypeError(`entity ${index} must be an object`);
    }
    const confidence = Number(entity.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new RangeError(`entity ${index} confidence must be between 0 and 1`);
    }
    return Object.freeze({
      entity_id: String(entity.entity_id || `entity-${index + 1}`),
      kind: entity.kind || "unknown_chunk",
      source_offset:
        Number.isInteger(entity.source_offset) && entity.source_offset >= 0
          ? entity.source_offset
          : null,
      transform: Array.isArray(entity.transform)
        ? Object.freeze([...entity.transform])
        : null,
      confidence,
      reason: entity.reason ?? null,
      payload: entity.payload ?? null
    });
  });

  return Object.freeze({
    ...evidence,
    decode_status: complete ? "decoded" : "decoded_partial",
    production_ready: false,
    entities: Object.freeze(normalized)
  });
}
