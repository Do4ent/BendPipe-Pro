import { resolvePartHsfSegmentAnchors } from "./part-segment-linkage.mjs";
import { inspectPartHsfGeometryEvidence } from "./part-geometry-evidence.mjs";

/**
 * Compose exact DWFx part->HSF linkage into one evidence report.
 *
 * This stage deliberately stops before choosing a geometry source or creating
 * canonical LINE/BEND primitives. It only joins exact source identifiers and
 * summarizes what each exact scene anchor contains.
 */
export function buildPartHsfEvidenceReport({
  opcodeStream,
  partGraphicsLinks,
  hsfVersion = null
}) {
  const anchors = resolvePartHsfSegmentAnchors(opcodeStream, partGraphicsLinks);
  const parts = anchors.items.map((partAnchor) =>
    inspectPartHsfGeometryEvidence(opcodeStream, partAnchor, { hsfVersion })
  );

  return Object.freeze({
    hsf_version: hsfVersion == null ? null : String(hsfVersion),
    part_count: parts.length,
    anchored_count: anchors.anchored_count,
    unresolved_count: anchors.unresolved_count,
    ambiguous_count: anchors.ambiguous_count,
    parts: Object.freeze(parts),
    geometry_source_selection_complete: false,
    production_ready: false
  });
}
