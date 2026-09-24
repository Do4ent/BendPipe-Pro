import { decodeHsfEnvelope, decodeHsfOpcodePrefix } from "./hsf-envelope.mjs";

function hexByte(value) {
  return `0x${Number(value).toString(16).padStart(2, "0")}`;
}

function evidenceEntity(entity, index) {
  const transform =
    entity.kind === "transform" && Array.isArray(entity.matrix)
      ? [...entity.matrix]
      : null;
  const common = {
    entity_id: `hsf-${entity.kind}-${index + 1}`,
    kind: entity.kind,
    source_offset: entity.source_offset,
    transform,
    confidence: 1,
    reason: `Decoded from synchronized HSF opcode stream at decompressed offset ${entity.source_offset}.`
  };

  const { kind, source_offset, matrix, ...payload } = entity;
  return {
    ...common,
    payload: {
      ...payload,
      source_offset_space: "decompressed_hsf"
    }
  };
}

/**
 * Partial HSF/W3D decoder used behind decodeW3dResource().
 *
 * It intentionally stops at the first unsupported opcode/variant. No byte
 * scanning, geometry guessing, or recovery by invented lengths is allowed.
 */
export async function decodeHsfW3d(bytes, context = {}) {
  const envelope = await decodeHsfEnvelope(bytes);
  const retainedKinds = new Set([
    "transform",
    "bounds",
    "polyline",
    "curve_candidate",
    "triangle_mesh",
    "polygon",
    "user_options"
  ]);
  const maxOpcodes =
    Number.isInteger(context?.max_opcodes) && context.max_opcodes > 0
      ? context.max_opcodes
      : 1_000_000;
  const prefix = decodeHsfOpcodePrefix(envelope.opcode_stream, {
    hsfVersion: envelope.hsf_version,
    maxOpcodes,
    attachSegmentPath: true,
    captureEntity: (entity) =>
      retainedKinds.has(entity.kind) ||
      (entity.kind === "segment" && entity.action === "include")
  });
  const w3dComment = envelope.comments.find((entry) => /W3D\s+V/i.test(entry.text));

  const diagnostics = [
    `HSF version ${envelope.hsf_version}; W3D marker ${w3dComment?.text ?? "not present"}.`,
    `Global zlib block decoded from ${envelope.compression.compressed_input_bytes} input bytes to ${envelope.compression.decompressed_bytes} HSF opcode bytes.`,
    `Opcode source offsets are relative to the decompressed HSF stream; compressed block starts at W3D byte ${envelope.compression.compressed_offset}.`
  ];

  if (!prefix.complete_prefix) {
    if (prefix.limit_reached) {
      diagnostics.push(
        `Synchronized HSF decoding stopped at configured opcode limit ${maxOpcodes} near decompressed offset ${prefix.next_offset}. No resynchronization scan was attempted.`
      );
    } else {
      const suffix = prefix.unsupported_variant
        ? ` (${prefix.unsupported_variant})`
        : "";
      diagnostics.push(
        `Synchronized HSF decoding stopped at decompressed offset ${prefix.next_offset}: unsupported opcode ${hexByte(prefix.unsupported_opcode)}${suffix}. No resynchronization scan was attempted.`
      );
    }
  } else {
    diagnostics.push("Synchronized HSF opcode stream reached TKE_Stop_Compression.");
  }
  diagnostics.push(
    `Retained ${prefix.entities.length} geometry/provenance entities after filtering display-only HSF records.`
  );

  if (context?.source?.package_path) {
    diagnostics.push(`Decoded resource: ${context.source.package_path}`);
  }

  return {
    complete: prefix.complete_prefix,
    entities: prefix.entities.map(evidenceEntity),
    diagnostics
  };
}
