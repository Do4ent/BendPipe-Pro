import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseZipCentralDirectory } from "../../src/import/dwfx/zip-directory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const caseIds = ["80004806", "80005311", "80005313"];

for (const partId of caseIds) {
  test(`authoritative DWFx ${partId} keeps its source bytes and unresolved canonical boundary`, () => {
    const caseRoot = path.join(root, "reference_parts", "cases", `dwfx-${partId}`);
    const metadata = JSON.parse(fs.readFileSync(path.join(caseRoot, "source.json"), "utf8"));
    const sourcePath = path.join(caseRoot, metadata.source.file);
    const bytes = fs.readFileSync(sourcePath);
    const directory = parseZipCentralDirectory(bytes);
    const w3dResources = directory.entries.filter((entry) => /\.w3d$/i.test(entry.path));

    assert.equal(metadata.id, `dwfx-${partId}`);
    assert.equal(metadata.artifact_role, "authoritative_source_cad");
    assert.equal(metadata.source.format, "DWFx");
    assert.equal(metadata.source.file, "source.dwfx");
    assert.equal(metadata.source.byte_preserved, true);
    assert.equal(bytes.byteLength, metadata.source.size_bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), metadata.source.sha256);

    assert.equal(metadata.container_validation.format, "DWFx/OPC ZIP");
    assert.equal(directory.entry_count, metadata.container_validation.entry_count);
    assert.equal(w3dResources.length, metadata.container_validation.w3d_resource_count);

    assert.deepEqual(metadata.canonical_geometry, {
      value: null,
      confidence: 0,
      reason: metadata.canonical_geometry.reason,
      source: "source.dwfx",
      method: "not_evaluated"
    });
    assert.ok(metadata.canonical_geometry.reason.length > 0);
    assert.equal(metadata.production_ready, false);
  });
}