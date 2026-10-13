import test from "node:test";
import assert from "node:assert/strict";

import { inspectDwfxPackageEntries } from "../../src/import/dwfx/package-inspector.mjs";

test("A19: DWFx package inspector inventories W3D without pretending to decode it", () => {
  const result = inspectDwfxPackageEntries([
    { path: "[Content_Types].xml", size: 1024 },
    { path: "_rels/.rels", size: 210 },
    { path: "dwf/properties/metadata.xml", size: 4500 },
    { path: "dwf/resources/model.W3D", size: 250000 },
    { path: "dwf/resources/preview.png", size: 12000 }
  ]);

  assert.equal(result.format, "DWFx");
  assert.equal(result.entry_count, 5);
  assert.equal(result.resources.w3d.length, 1);
  assert.equal(result.resources.w3d[0].path, "dwf/resources/model.W3D");
  assert.equal(result.capabilities.w3d_candidates_present, true);
  assert.equal(result.capabilities.w3d_geometry_decoded, false);
  assert.equal(result.production_ready, false);
});

test("A19: missing W3D is an explicit blocker, not a cue to invent centerlines", () => {
  const result = inspectDwfxPackageEntries([
    "[Content_Types].xml",
    "_rels/.rels",
    "dwf/properties/metadata.xml"
  ]);

  assert.equal(result.resources.w3d.length, 0);
  assert.equal(result.capabilities.w3d_candidates_present, false);
  assert.equal(result.production_ready, false);
  assert.match(result.blockers[0], /No W3D resource/);
});

test("A19: path normalization preserves source evidence and recognizes relationship resources", () => {
  const result = inspectDwfxPackageEntries([
    { name: "\\dwf\\_rels\\document.xml.rels", size: 99 },
    { name: "/dwf/resources/part.w3d", size: 1000 }
  ]);

  assert.equal(result.entries[0].path, "dwf/_rels/document.xml.rels");
  assert.equal(result.resources.relationships.length, 1);
  assert.equal(result.resources.w3d[0].path, "dwf/resources/part.w3d");
});

test("A19: malformed entries fail loudly", () => {
  assert.throws(
    () => inspectDwfxPackageEntries([{ path: "" }]),
    /no package path/
  );
});
