import { withDecodedW3dEntities } from "./w3d-evidence.mjs";

function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError("W3D input must be an ArrayBuffer or Uint8Array");
}

const ALLOWED_KINDS = new Set([
  "transform",
  "segment",
  "bounds",
  "view",
  "polyline",
  "triangle_mesh",
  "curve_candidate",
  "unknown_chunk"
]);

function validateTransform(transform, index) {
  if (transform == null) return null;
  if (!Array.isArray(transform) || transform.length !== 16) {
    throw new RangeError(`decoder entity ${index} transform must contain 16 numbers`);
  }
  const values = transform.map(Number);
  if (!values.every(Number.isFinite)) {
    throw new RangeError(`decoder entity ${index} transform contains non-finite values`);
  }
  return values;
}

function normalizeDecoderEntity(entity, index) {
  if (!entity || typeof entity !== "object") {
    throw new TypeError(`decoder entity ${index} must be an object`);
  }
  if (!ALLOWED_KINDS.has(entity.kind)) {
    throw new RangeError(
      `decoder entity ${index} kind is unsupported: ${String(entity.kind)}`
    );
  }

  const confidence = Number(entity.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new RangeError(
      `decoder entity ${index} confidence must be between 0 and 1`
    );
  }

  const sourceOffset =
    entity.source_offset == null ? null : Number(entity.source_offset);
  if (
    sourceOffset !== null &&
    (!Number.isInteger(sourceOffset) || sourceOffset < 0)
  ) {
    throw new RangeError(
      `decoder entity ${index} source_offset must be a non-negative integer`
    );
  }

  return {
    entity_id: String(entity.entity_id || `entity-${index + 1}`),
    kind: entity.kind,
    source_offset: sourceOffset,
    transform: validateTransform(entity.transform, index),
    confidence,
    reason: entity.reason ?? null,
    payload: entity.payload ?? null
  };
}

export async function decodeW3dResource({
  evidence,
  bytes,
  decoder
}) {
  if (!evidence || typeof evidence !== "object") {
    throw new TypeError("W3D evidence record is required");
  }
  if (typeof decoder !== "function") {
    throw new TypeError("decoder must be a function");
  }

  const input = asBytes(bytes);
  const decoded = await decoder(new Uint8Array(input), {
    source: evidence.source,
    header_hex: evidence.header_hex
  });

  if (!decoded || typeof decoded !== "object") {
    throw new TypeError("decoder result must be an object");
  }

  const entities = Array.isArray(decoded.entities)
    ? decoded.entities.map(normalizeDecoderEntity)
    : [];

  const complete = decoded.complete === true;
  const diagnostics = Array.isArray(decoded.diagnostics)
    ? decoded.diagnostics.map(String)
    : [];

  const next = withDecodedW3dEntities(evidence, entities, { complete });

  return Object.freeze({
    ...next,
    production_ready: false,
    diagnostics: Object.freeze([
      ...(evidence.diagnostics || []),
      ...diagnostics,
      complete
        ? "W3D decoder reported complete resource coverage; canonical tube recognition is still required."
        : "W3D decoder reported partial resource coverage."
    ])
  });
}
