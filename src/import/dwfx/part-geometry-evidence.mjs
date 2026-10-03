import {
  decodeUniqueHsfNamedSegment
} from "./hsf-segment-linkage.mjs";

function summarizeDecodedSegment(decoded) {
  if (!decoded || typeof decoded !== "object") {
    throw new TypeError("decoded HSF segment is required");
  }
  const entities = Array.isArray(decoded.entities) ? decoded.entities : [];
  const kindCounts = {};
  const includes = [];
  const meshes = [];
  const curves = [];
  const transforms = [];

  for (const entity of entities) {
    const kind = String(entity.kind ?? "unknown");
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;

    if (
      kind === "segment" &&
      entity.action === "include" &&
      typeof entity.name === "string"
    ) {
      includes.push(Object.freeze({
        name: entity.name,
        source_offset: entity.absolute_source_offset ?? entity.source_offset ?? null,
        segment_path: Array.isArray(entity.segment_path)
          ? Object.freeze([...entity.segment_path])
          : null
      }));
    }
    if (kind === "triangle_mesh") {
      meshes.push(Object.freeze({
        source_offset: entity.absolute_source_offset ?? entity.source_offset ?? null,
        vertex_count: Array.isArray(entity.vertices) ? entity.vertices.length : null,
        connectivity_status: entity.connectivity?.status ?? null,
        segment_path: Array.isArray(entity.segment_path)
          ? Object.freeze([...entity.segment_path])
          : null
      }));
    }
    if (kind === "curve_candidate") {
      curves.push(Object.freeze({
        source_offset: entity.absolute_source_offset ?? entity.source_offset ?? null,
        primitive: entity.primitive ?? null,
        segment_path: Array.isArray(entity.segment_path)
          ? Object.freeze([...entity.segment_path])
          : null
      }));
    }
    if (kind === "transform") {
      transforms.push(Object.freeze({
        source_offset: entity.absolute_source_offset ?? entity.source_offset ?? null,
        segment_path: Array.isArray(entity.segment_path)
          ? Object.freeze([...entity.segment_path])
          : null
      }));
    }
  }

  return Object.freeze({
    status: decoded.status,
    root_segment_complete: decoded.root_segment_complete === true,
    entity_count: entities.length,
    kind_counts: Object.freeze(kindCounts),
    includes: Object.freeze(includes),
    meshes: Object.freeze(meshes),
    curves: Object.freeze(curves),
    transforms: Object.freeze(transforms),
    unsupported_opcode: decoded.unsupported_opcode ?? null,
    unsupported_variant: decoded.unsupported_variant ?? null,
    production_ready: false
  });
}

function decodeAnchor(opcodeStream, anchor, options) {
  if (!anchor || anchor.status !== "exact" || anchor.id == null) {
    return Object.freeze({
      status: anchor?.status ?? "not_applicable",
      decoded: null,
      summary: null,
      production_ready: false
    });
  }
  const decoded = decodeUniqueHsfNamedSegment(
    opcodeStream,
    String(anchor.id),
    options
  );
  return Object.freeze({
    status: decoded.status,
    decoded,
    summary: summarizeDecodedSegment(decoded),
    production_ready: false
  });
}

/**
 * Decode both exact HSF anchors for one DWFx part without choosing which one is
 * the geometry source. The caller receives independent scene evidence for the
 * graphics node and the geometric variation.
 */
export function inspectPartHsfGeometryEvidence(
  opcodeStream,
  partAnchor,
  {
    hsfVersion = null,
    maxOpcodes = 1_000_000
  } = {}
) {
  if (!partAnchor || typeof partAnchor !== "object") {
    throw new TypeError("partAnchor is required");
  }
  const options = {
    hsfVersion,
    maxOpcodes,
    attachSegmentPath: true
  };

  const graphicsNode = decodeAnchor(
    opcodeStream,
    partAnchor.graphics_node_segment,
    options
  );
  const geometricVariation = decodeAnchor(
    opcodeStream,
    partAnchor.geometric_variation_segment,
    options
  );

  return Object.freeze({
    part_number: String(partAnchor.part_number ?? ""),
    graphics_node: graphicsNode,
    geometric_variation: geometricVariation,
    geometry_source_selected: null,
    production_ready: false
  });
}

export { summarizeDecodedSegment };
