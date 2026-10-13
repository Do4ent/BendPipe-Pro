import {
  decodeUniqueHsfNamedSegment,
  locateUniqueHsfNamedSegment
} from "./hsf-segment-linkage.mjs";

function includeNames(decoded) {
  if (!decoded || !Array.isArray(decoded.entities)) return Object.freeze([]);
  return Object.freeze(decoded.entities
    .filter((entity) =>
      entity.kind === "segment" &&
      entity.action === "include" &&
      typeof entity.name === "string" &&
      entity.name.startsWith("?Include Library/")
    )
    .map((entity) => entity.name));
}

function resolveAnchorIncludes(opcodeStream, anchor, { hsfVersion = null } = {}) {
  if (!anchor || anchor.status !== "exact" || anchor.id == null) {
    return Object.freeze({
      anchor_status: anchor?.status ?? "not_applicable",
      include_count: 0,
      includes: Object.freeze([]),
      status: anchor?.status ?? "not_applicable",
      production_ready: false
    });
  }

  const decoded = decodeUniqueHsfNamedSegment(
    opcodeStream,
    String(anchor.id),
    { hsfVersion, attachSegmentPath: true, stopAfterRootSegmentClose: true }
  );
  const names = includeNames(decoded);
  const includes = names.map((name) => {
    const location = locateUniqueHsfNamedSegment(opcodeStream, name);
    return Object.freeze({
      name,
      status: location.status,
      offset: location.offset,
      match_count: location.match_count,
      candidates: location.candidates
    });
  });

  const ambiguous = includes.some((item) => item.status === "ambiguous");
  const unresolved = includes.some((item) => item.status === "unresolved");

  return Object.freeze({
    anchor_status: decoded.status,
    include_count: includes.length,
    includes: Object.freeze(includes),
    status:
      decoded.root_segment_complete !== true
        ? "blocked"
        : ambiguous
          ? "ambiguous"
          : unresolved
            ? "unresolved"
            : includes.length > 0
              ? "exact"
              : "empty",
    production_ready: false
  });
}

/**
 * Resolve Include Library references contained by both exact part anchors.
 *
 * The node and geometric-variation chains remain separate. This function does
 * not select either chain as the manufacturing geometry source.
 */
export function resolvePartIncludeLibraryAnchors(
  opcodeStream,
  partAnchor,
  { hsfVersion = null } = {}
) {
  if (!partAnchor || typeof partAnchor !== "object") {
    throw new TypeError("partAnchor is required");
  }

  return Object.freeze({
    part_number: String(partAnchor.part_number ?? ""),
    graphics_node: resolveAnchorIncludes(
      opcodeStream,
      partAnchor.graphics_node_segment,
      { hsfVersion }
    ),
    geometric_variation: resolveAnchorIncludes(
      opcodeStream,
      partAnchor.geometric_variation_segment,
      { hsfVersion }
    ),
    geometry_chain_selected: null,
    production_ready: false
  });
}
