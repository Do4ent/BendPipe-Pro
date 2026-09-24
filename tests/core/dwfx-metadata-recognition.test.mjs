import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { normalizeDwfxMetadataRecognition } from "../../src/import/dwfx/metadata-recognition.mjs";

const FIXTURE = new URL(
  "../reference_parts/cases/dwfx-80003043/recognized-metadata.json",
  import.meta.url
);
const input = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

test("A19: real 80003043 DWFx fixture remains metadata-only and production blocked", () => {
  const result = normalizeDwfxMetadataRecognition(input);

  assert.equal(result.source.format, "DWFx");
  assert.equal(result.recognition_status.metadata_only, true);
  assert.equal(result.recognition_status.production_ready, false);
  assert.equal(result.recognition_status.bend_sequence, "not_extracted_from_binary_W3D");
  assert.equal(result.tubes.length, 6);
});

test("A19: recognized placeholder LINE rows are never promoted into canonical geometry", () => {
  const result = normalizeDwfxMetadataRecognition(input);

  for (const tube of result.tubes) {
    assert.equal(tube.geometry.canonical_geometry, null);
    assert.equal(tube.geometry.production_ready, false);
    assert.match(tube.geometry.reason, /placeholder|W3D/i);
    assert.ok(
      tube.source_evidence.placeholder_rows.every(
        (row) => row.elementId === "recognized-placeholder-line"
      )
    );
  }
});

test("A19: exact DWFx metadata remains source truth with provenance", () => {
  const result = normalizeDwfxMetadataRecognition(input);
  const byPart = new Map(result.tubes.map((tube) => [tube.part_number, tube]));

  const p10157683 = byPart.get("10157683");
  assert.equal(p10157683.metadata.outer_diameter.value, 19.05);
  assert.equal(p10157683.metadata.wall_thickness.value, 1.7);
  assert.equal(p10157683.metadata.developed_length.value, 1701);
  assert.equal(p10157683.metadata.outer_diameter.confidence, 1);
  assert.equal(p10157683.metadata.outer_diameter.truth_category, "source");
  assert.match(p10157683.metadata.outer_diameter.source[0], /10157683/);

  const p10157549 = byPart.get("10157549");
  assert.equal(p10157549.quantity_in_assembly, 4);
  assert.equal(p10157549.metadata.developed_length.value, 512.3);
});


test("A20: exact DWFx XML object linkage is preserved for geometry correlation", () => {
  const result = normalizeDwfxMetadataRecognition(input);
  const byPart = new Map(result.tubes.map((tube) => [tube.part_number, tube]));

  assert.deepEqual(byPart.get("10160780").source_evidence.source_object_link, {
    referenceNodeId: "TD4C6rYJ0Ui8vPcd0hGi6w",
    contentElementRef: "C++tg4ZCQ0+2QU4Qi13JRg",
    entityRef: "Cu+tg4ZCQ0+2QU4Qi13JRg",
    instanceId: "DO+tg4ZCQ0+2QU4Qi13JRg",
    node: 121136,
    geometricVariation: 121137,
    source: "DWFx content/presentation/content-definition XML"
  });
  assert.equal(
    byPart.get("10157546").source_evidence.source_object_link.contentElementRef,
    "e++tg4ZCQ0+2QU4Qi13JRg"
  );
  assert.equal(
    byPart.get("10157555").source_evidence.source_object_link.entityRef,
    "he+tg4ZCQ0+2QU4Qi13JRg"
  );
  assert.equal(
    byPart.get("10157683").source_evidence.source_object_link.referenceNodeId,
    "hz4C6rYJ0Ui8vPcd0hGi6w"
  );
  assert.equal(
    byPart.get("10157549").source_evidence.source_object_link.contentElementRef,
    "FPCtg4ZCQ0+2QU4Qi13JRg"
  );
  assert.equal(
    byPart.get("10157552").source_evidence.source_object_link.entityRef,
    "FvCtg4ZCQ0+2QU4Qi13JRg"
  );
  assert.deepEqual(
    result.tubes.map((tube) => [
      tube.part_number,
      tube.source_evidence.source_object_link.node,
      tube.source_evidence.source_object_link.geometricVariation
    ]),
    [
      ["10160780",121136,121137],
      ["10157546",121190,121191],
      ["10157555",121196,121197],
      ["10157683",121198,121199],
      ["10157549",121270,121271],
      ["10157552",121272,121273]
    ]
  );
});

test("A19: DWFx metadata normalizer refuses non-DWFx input", () => {
  assert.throws(
    () => normalizeDwfxMetadataRecognition({ source: { format: "STEP" } }),
    /must be DWFx/
  );
});
