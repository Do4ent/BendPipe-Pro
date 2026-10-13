import test from "node:test";
import assert from "node:assert/strict";

import {
  createW3dEvidence,
  withDecodedW3dEntities
} from "../../src/import/dwfx/w3d-evidence.mjs";

test("A19: located W3D bytes remain production blocked before decoding", () => {
  const evidence = createW3dEvidence({
    dwfxFile: "sample.dwfx",
    packagePath: "dwf/resources/model.w3d",
    bytes: new Uint8Array([0x57, 0x33, 0x44, 0x01])
  });

  assert.equal(evidence.decode_status, "binary_unparsed");
  assert.equal(evidence.production_ready, false);
  assert.equal(evidence.byte_length, 4);
  assert.equal(evidence.header_hex, "57334401");
  assert.deepEqual(evidence.entities, []);
});

test("A19: partial W3D entities keep confidence and source offsets", () => {
  const evidence = createW3dEvidence({
    dwfxFile: "sample.dwfx",
    packagePath: "dwf/resources/model.w3d",
    bytes: new Uint8Array([1, 2, 3])
  });

  const partial = withDecodedW3dEntities(evidence, [
    {
      entity_id: "polyline-1",
      kind: "polyline",
      source_offset: 128,
      confidence: 0.82,
      reason: "decoded from W3D opcode stream",
      payload: { point_count: 12 }
    }
  ]);

  assert.equal(partial.decode_status, "decoded_partial");
  assert.equal(partial.production_ready, false);
  assert.equal(partial.entities[0].source_offset, 128);
  assert.equal(partial.entities[0].confidence, 0.82);
});

test("A19: even a fully decoded W3D resource is not automatically production-ready", () => {
  const evidence = createW3dEvidence({
    dwfxFile: "sample.dwfx",
    packagePath: "model.w3d",
    bytes: new Uint8Array([1])
  });

  const decoded = withDecodedW3dEntities(
    evidence,
    [{ kind: "unknown_chunk", confidence: 1, source_offset: 0 }],
    { complete: true }
  );

  assert.equal(decoded.decode_status, "decoded");
  assert.equal(decoded.production_ready, false);
});

test("A19: invalid confidence is rejected", () => {
  const evidence = createW3dEvidence({
    dwfxFile: "sample.dwfx",
    packagePath: "model.w3d",
    bytes: new Uint8Array([1])
  });

  assert.throws(
    () =>
      withDecodedW3dEntities(evidence, [
        { kind: "polyline", confidence: 1.5, source_offset: 0 }
      ]),
    /confidence/
  );
});
