function normalizePath(value) {
  return String(value ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
}

function ext(path) {
  const name = path.split("/").at(-1) ?? "";
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function asSize(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Inspect an already enumerated DWFx/OPC ZIP package.
 *
 * This function intentionally does not decode W3D binary geometry. It only
 * inventories package evidence so downstream recognition can decide what is
 * supported and what remains unresolved.
 */
export function inspectDwfxPackageEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("entries must be an array");
  }

  const normalized = entries.map((entry, index) => {
    const path = normalizePath(
      typeof entry === "string" ? entry : entry?.path ?? entry?.name
    );
    if (!path) {
      throw new RangeError(`entry ${index} has no package path`);
    }
    return Object.freeze({
      path,
      extension: ext(path),
      size: asSize(typeof entry === "string" ? null : entry?.size),
      source_index: index
    });
  });

  const w3d = [];
  const xml = [];
  const properties = [];
  const relationships = [];
  const other = [];

  for (const entry of normalized) {
    const lower = entry.path.toLowerCase();

    if (entry.extension === ".w3d") {
      w3d.push(entry);
      continue;
    }
    if (
      entry.extension === ".xml" ||
      entry.extension === ".xaml" ||
      entry.extension === ".rels"
    ) {
      xml.push(entry);
      if (
        lower.includes("property") ||
        lower.includes("properties") ||
        lower.includes("metadata")
      ) {
        properties.push(entry);
      }
      if (entry.extension === ".rels" || lower.includes("_rels/")) {
        relationships.push(entry);
      }
      continue;
    }
    other.push(entry);
  }

  const blockers = [];
  if (w3d.length === 0) {
    blockers.push(
      "No W3D resource was found; bend centerline geometry cannot be extracted by the W3D pipeline."
    );
  }

  return Object.freeze({
    format: "DWFx",
    entry_count: normalized.length,
    entries: Object.freeze(normalized),
    resources: Object.freeze({
      w3d: Object.freeze(w3d),
      xml: Object.freeze(xml),
      properties: Object.freeze(properties),
      relationships: Object.freeze(relationships),
      other: Object.freeze(other)
    }),
    capabilities: Object.freeze({
      package_inventory: true,
      metadata_candidates_present: properties.length > 0 || xml.length > 0,
      w3d_candidates_present: w3d.length > 0,
      w3d_geometry_decoded: false
    }),
    production_ready: false,
    blockers: Object.freeze(blockers)
  });
}
