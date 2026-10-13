import { locateUniqueHsfNamedSegment } from "./hsf-segment-linkage.mjs";

function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError("HSF part-linkage input must be an ArrayBuffer or Uint8Array");
}

function finiteIndex(value, label) {
  if (value == null) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new RangeError(`${label} must be a non-negative integer or null`);
  }
  return number;
}

function locateId(bytes, value) {
  if (value == null) {
    return Object.freeze({
      id: null,
      status: "not_applicable",
      offset: null,
      match_count: 0,
      candidates: Object.freeze([])
    });
  }
  const located = locateUniqueHsfNamedSegment(bytes, String(value));
  return Object.freeze({
    id: value,
    status: located.status,
    offset: located.offset,
    match_count: located.match_count,
    candidates: located.candidates
  });
}

/**
 * Resolve exact DWFx instance IDs to exact named HSF scene segments.
 *
 * This function intentionally does not decide that a graphics-node segment and
 * a geometric-variation segment are interchangeable. It records both source
 * anchors independently so downstream geometry extraction must make the
 * semantic choice explicitly.
 */
export function resolvePartHsfSegmentAnchors(opcodeStream, partGraphicsLinks) {
  const bytes = asBytes(opcodeStream);
  if (!Array.isArray(partGraphicsLinks)) {
    throw new TypeError("partGraphicsLinks must be an array");
  }

  const items = partGraphicsLinks.map((link, index) => {
    if (!link || typeof link !== "object") {
      throw new TypeError(`partGraphicsLinks[${index}] must be an object`);
    }
    const partNumber = String(link.part_number ?? "");
    if (!partNumber) {
      throw new RangeError(`partGraphicsLinks[${index}] part_number is required`);
    }

    const graphicsNode = finiteIndex(link.graphics_node, `${partNumber} graphics_node`);
    const geometricVariation = finiteIndex(
      link.geometric_variation,
      `${partNumber} geometric_variation`
    );

    const nodeSegment = locateId(bytes, graphicsNode);
    const variationSegment = locateId(bytes, geometricVariation);
    const exactAnchors = [nodeSegment, variationSegment].filter(
      (anchor) => anchor.status === "exact"
    );
    const ambiguous = [nodeSegment, variationSegment].some(
      (anchor) => anchor.status === "ambiguous"
    );

    return Object.freeze({
      part_number: partNumber,
      graphics_node: graphicsNode,
      geometric_variation: geometricVariation,
      graphics_node_segment: nodeSegment,
      geometric_variation_segment: variationSegment,
      exact_anchor_count: exactAnchors.length,
      status: ambiguous
        ? "ambiguous"
        : exactAnchors.length > 0
          ? "anchored"
          : "unresolved",
      geometry_anchor_selected: null,
      production_ready: false
    });
  });

  return Object.freeze({
    items: Object.freeze(items),
    anchored_count: items.filter((item) => item.status === "anchored").length,
    unresolved_count: items.filter((item) => item.status === "unresolved").length,
    ambiguous_count: items.filter((item) => item.status === "ambiguous").length,
    production_ready: false
  });
}
