import { inspectDwfxPackageEntries } from "./package-inspector.mjs";
import { parseZipCentralDirectory } from "./zip-directory.mjs";
import {
  extractZipEntry,
  inflateRawWithDecompressionStream
} from "./zip-entry-extractor.mjs";
import { createW3dEvidence } from "./w3d-evidence.mjs";

function normalizePath(value) {
  return String(value ?? "").replace(/\\/g, "/").replace(/^\/+/, "");
}

export function inspectDwfxBytes(bytes) {
  const directory = parseZipCentralDirectory(bytes);
  const inventory = inspectDwfxPackageEntries(
    directory.entries.map((entry) => ({
      path: entry.path,
      size: entry.uncompressed_size
    }))
  );

  return Object.freeze({
    format: "DWFx",
    directory,
    inventory,
    production_ready: false
  });
}

export async function extractDwfxResource(
  bytes,
  packagePath,
  { inflateRaw = null } = {}
) {
  const normalizedPath = normalizePath(packagePath);
  if (!normalizedPath) {
    throw new RangeError("packagePath is required");
  }

  const directory = parseZipCentralDirectory(bytes);
  const entry = directory.entries.find(
    (candidate) => normalizePath(candidate.path) === normalizedPath
  );

  if (!entry) {
    throw new RangeError(`DWFx resource not found: ${normalizedPath}`);
  }

  return extractZipEntry(bytes, entry, {
    inflateRaw:
      inflateRaw ??
      (entry.compression_method === 8
        ? inflateRawWithDecompressionStream
        : undefined)
  });
}

export async function extractDwfxW3dEvidence(
  bytes,
  {
    dwfxFile,
    inflateRaw = null
  } = {}
) {
  if (!dwfxFile) {
    throw new RangeError("dwfxFile is required");
  }

  const directory = parseZipCentralDirectory(bytes);
  const w3dEntries = directory.entries.filter((entry) =>
    entry.path.toLowerCase().endsWith(".w3d")
  );

  const evidence = [];
  for (const entry of w3dEntries) {
    const resourceBytes = await extractZipEntry(bytes, entry, {
      inflateRaw:
        inflateRaw ??
        (entry.compression_method === 8
          ? inflateRawWithDecompressionStream
          : undefined)
    });

    evidence.push(
      createW3dEvidence({
        dwfxFile,
        packagePath: entry.path,
        bytes: resourceBytes,
        diagnostics: [
          `ZIP compression method: ${entry.compression_method}`,
          `ZIP uncompressed size: ${entry.uncompressed_size}`
        ]
      })
    );
  }

  return Object.freeze({
    source_file: String(dwfxFile),
    w3d_resource_count: evidence.length,
    resources: Object.freeze(evidence),
    production_ready: false,
    blocker:
      evidence.length === 0
        ? "No W3D resource found in DWFx package."
        : "W3D resources extracted but not yet decoded into canonical geometry."
  });
}
