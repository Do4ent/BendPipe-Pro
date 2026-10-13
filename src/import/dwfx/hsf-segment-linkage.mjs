import { decodeHsfOpcodePrefix } from "./hsf-envelope.mjs";

function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError("HSF segment input must be an ArrayBuffer or Uint8Array");
}

function asciiBytes(value) {
  const text = String(value ?? "");
  if (!text) throw new RangeError("segment name is required");
  const chars = [...text].map((char) => char.codePointAt(0));
  if (chars.some((code) => code > 0x7f)) {
    throw new RangeError("named-segment locator currently supports ASCII names only");
  }
  if (chars.length > 254) {
    throw new RangeError("named-segment locator supports short HSF segment names only");
  }
  return Uint8Array.from(chars);
}

export function findHsfNamedSegmentCandidates(input, name) {
  const bytes = asBytes(input);
  const encoded = asciiBytes(name);
  const candidates = [];

  for (let offset = 0; offset + 2 + encoded.length <= bytes.length; offset += 1) {
    if (bytes[offset] !== 0x28 || bytes[offset + 1] !== encoded.length) continue;
    let equal = true;
    for (let i = 0; i < encoded.length; i += 1) {
      if (bytes[offset + 2 + i] !== encoded[i]) {
        equal = false;
        break;
      }
    }
    if (equal) candidates.push(offset);
  }

  return Object.freeze(candidates);
}

export function locateUniqueHsfNamedSegment(input, name) {
  const candidates = findHsfNamedSegmentCandidates(input, name);
  if (candidates.length === 0) {
    return Object.freeze({
      name: String(name),
      status: "unresolved",
      offset: null,
      match_count: 0,
      candidates
    });
  }
  if (candidates.length !== 1) {
    return Object.freeze({
      name: String(name),
      status: "ambiguous",
      offset: null,
      match_count: candidates.length,
      candidates
    });
  }
  return Object.freeze({
    name: String(name),
    status: "exact",
    offset: candidates[0],
    match_count: 1,
    candidates
  });
}

/**
 * Decode one exact HSF named segment from a decompressed opcode stream.
 *
 * This is deliberate metadata-driven random access, not generic opcode
 * resynchronization: the exact segment name must come from source metadata,
 * occur exactly once, and the synchronized decoder must reach its matching
 * TKE_Close_Segment.
 */
export function decodeUniqueHsfNamedSegment(
  input,
  name,
  {
    hsfVersion = null,
    captureEntity = null,
    attachSegmentPath = true,
    maxOpcodes = 1_000_000
  } = {}
) {
  const bytes = asBytes(input);
  const location = locateUniqueHsfNamedSegment(bytes, name);
  if (location.status !== "exact") {
    return Object.freeze({
      ...location,
      root_segment_complete: false,
      entities: Object.freeze([]),
      production_ready: false
    });
  }

  const decoded = decodeHsfOpcodePrefix(bytes.subarray(location.offset), {
    hsfVersion,
    captureEntity,
    attachSegmentPath,
    maxOpcodes,
    stopAfterRootSegmentClose: true
  });

  const entities = Object.freeze(
    decoded.entities.map((entity) =>
      Object.freeze({
        ...entity,
        absolute_source_offset:
          Number.isInteger(entity.source_offset)
            ? location.offset + entity.source_offset
            : null
      })
    )
  );

  return Object.freeze({
    name: String(name),
    status: decoded.root_segment_complete === true ? "exact" : "blocked",
    offset: location.offset,
    match_count: 1,
    candidates: location.candidates,
    root_segment_complete: decoded.root_segment_complete === true,
    next_relative_offset: decoded.next_offset,
    next_absolute_offset: location.offset + decoded.next_offset,
    unsupported_opcode: decoded.unsupported_opcode ?? null,
    unsupported_variant: decoded.unsupported_variant ?? null,
    entities,
    production_ready: false
  });
}

export function firstIncludedLibraryReference(decodedSegment) {
  if (!decodedSegment || !Array.isArray(decodedSegment.entities)) {
    throw new TypeError("decoded segment is required");
  }
  const includes = decodedSegment.entities.filter(
    (entity) =>
      entity.kind === "segment" &&
      entity.action === "include" &&
      typeof entity.name === "string" &&
      entity.name.startsWith("?Include Library/")
  );

  if (includes.length === 0) {
    return Object.freeze({
      status: "unresolved",
      name: null,
      match_count: 0,
      source_offset: null
    });
  }
  if (includes.length !== 1) {
    return Object.freeze({
      status: "ambiguous",
      name: null,
      match_count: includes.length,
      source_offset: null
    });
  }
  return Object.freeze({
    status: "exact",
    name: includes[0].name,
    match_count: 1,
    source_offset: includes[0].absolute_source_offset
  });
}
