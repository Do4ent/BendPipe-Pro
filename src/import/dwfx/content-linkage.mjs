function decodeXml(value) {
  return String(value ?? "").replace(
    /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g,
    (_match, entity) => {
      if (entity === "amp") return "&";
      if (entity === "lt") return "<";
      if (entity === "gt") return ">";
      if (entity === "quot") return '"';
      if (entity === "apos") return "'";
      if (entity.startsWith("#x")) {
        const code = Number.parseInt(entity.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : _match;
      }
      if (entity.startsWith("#")) {
        const code = Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : _match;
      }
      return _match;
    }
  );
}

function parseAttributes(fragment) {
  const out = {};
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/gs;
  for (const match of fragment.matchAll(pattern)) {
    const key = match[1].split(":").at(-1);
    out[key] = decodeXml(match[3]);
  }
  return out;
}

function openingElements(xml, localName) {
  if (typeof xml !== "string") throw new TypeError(`${localName} XML must be a string`);
  const escaped = localName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<(?:[A-Za-z_][\\w.-]*:)?${escaped}\\b([^>]*)>`,
    "gs"
  );
  return [...xml.matchAll(pattern)].map((match) => parseAttributes(match[1]));
}

function optionalIndex(value, label) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
  return n;
}

function freezeRecords(records) {
  return Object.freeze(records.map((record) => Object.freeze(record)));
}

export function parseDwfxContentObjects(xml) {
  const records = openingElements(xml, "Object")
    .filter((attrs) => attrs.id)
    .map((attrs) => ({
      id: attrs.id,
      label: attrs.label ?? null,
      entity_ref: attrs.entityRef ?? null
    }));
  return freezeRecords(records);
}

export function parseDwfxReferenceNodes(xml) {
  const records = openingElements(xml, "ReferenceNode")
    .filter((attrs) => attrs.id)
    .map((attrs) => ({
      id: attrs.id,
      label: attrs.label ?? null,
      content_element_refs: Object.freeze(
        String(attrs.contentElementRefs ?? "")
          .trim()
          .split(/[\s,]+/)
          .filter(Boolean)
      )
    }));
  return freezeRecords(records);
}

export function parseDwfxInstances(xml) {
  const records = openingElements(xml, "Instance")
    .filter((attrs) => attrs.id)
    .map((attrs) => ({
      id: attrs.id,
      renderable_ref: attrs.renderableRef ?? null,
      node: optionalIndex(attrs.node, `Instance ${attrs.id} node`),
      geometric_variation: optionalIndex(
        attrs.geometricVariation,
        `Instance ${attrs.id} geometricVariation`
      )
    }));
  return freezeRecords(records);
}

function pushIndex(map, key, value) {
  if (!key) return;
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}

function exactOrIssue(list, missingCode, ambiguousCode) {
  if (list.length === 1) return { value: list[0], issue: null };
  if (list.length === 0) return { value: null, issue: missingCode };
  return { value: null, issue: ambiguousCode };
}

/**
 * Join DWFx content metadata to the graphics-node IDs used by the W3D resource.
 *
 * No ordinal or label-nearest matching is allowed. The join uses exact
 * contentElementRefs/renderableRef identifiers. Ambiguity remains explicit.
 */
export function buildDwfxGraphicsLinkIndex({
  contentXml,
  presentationXml,
  contentDefinitionXml
}) {
  const objects = parseDwfxContentObjects(contentXml);
  const referenceNodes = parseDwfxReferenceNodes(presentationXml);
  const instances = parseDwfxInstances(contentDefinitionXml);

  const refsByContent = new Map();
  for (const node of referenceNodes) {
    for (const ref of node.content_element_refs) pushIndex(refsByContent, ref, node);
  }

  const instancesByRenderable = new Map();
  for (const instance of instances) {
    pushIndex(instancesByRenderable, instance.renderable_ref, instance);
  }

  const links = objects.map((object) => {
    const reference = exactOrIssue(
      refsByContent.get(object.id) ?? [],
      "REFERENCE_NODE_NOT_FOUND",
      "REFERENCE_NODE_AMBIGUOUS"
    );
    const instance = exactOrIssue(
      instancesByRenderable.get(object.id) ?? [],
      "INSTANCE_NOT_FOUND",
      "INSTANCE_AMBIGUOUS"
    );
    const issues = [reference.issue, instance.issue].filter(Boolean);

    return Object.freeze({
      object_id: object.id,
      object_label: object.label,
      entity_ref: object.entity_ref,
      reference_node_id: reference.value?.id ?? null,
      instance_id: instance.value?.id ?? null,
      graphics_node: instance.value?.node ?? null,
      geometric_variation: instance.value?.geometric_variation ?? null,
      status: issues.length === 0 ? "exact" : "unresolved",
      issues: Object.freeze(issues),
      production_ready: false
    });
  });

  return Object.freeze({
    links: Object.freeze(links),
    object_count: objects.length,
    reference_node_count: referenceNodes.length,
    instance_count: instances.length,
    production_ready: false
  });
}

function partLabelMatches(label, partNumber) {
  if (!label) return false;
  const escaped = String(partNumber).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}(?=[\\s/:-])`).test(label);
}

/**
 * Resolve requested part numbers to exact graphics node IDs.
 *
 * Multiple matching objects remain ambiguous. This function never picks one
 * based on order, geometry, dimensions, or proximity.
 */
export function resolvePartGraphicsLinks(index, partNumbers) {
  if (!index || !Array.isArray(index.links)) {
    throw new TypeError("graphics link index is required");
  }
  if (!Array.isArray(partNumbers)) {
    throw new TypeError("partNumbers must be an array");
  }

  return Object.freeze(partNumbers.map((partNumber) => {
    const part = String(partNumber);
    const matches = index.links.filter((link) =>
      partLabelMatches(link.object_label, part)
    );

    if (matches.length !== 1) {
      return Object.freeze({
        part_number: part,
        status: matches.length === 0 ? "unresolved" : "ambiguous",
        match_count: matches.length,
        graphics_node: null,
        geometric_variation: null,
        link: null,
        production_ready: false
      });
    }

    const link = matches[0];
    return Object.freeze({
      part_number: part,
      status: link.status,
      match_count: 1,
      graphics_node: link.graphics_node,
      geometric_variation: link.geometric_variation,
      link,
      production_ready: false
    });
  }));
}
