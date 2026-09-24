import test from "node:test";
import assert from "node:assert/strict";

import { createW3dEvidence } from "../../src/import/dwfx/w3d-evidence.mjs";
import { decodeW3dResource } from "../../src/import/dwfx/w3d-decoder-boundary.mjs";

function baseEvidence() {
  return createW3dEvidence({
    dwfxFile: "sample.dwfx",
    packagePath: "dwf/resources/model.w3d",
    bytes: new Uint8Array([1,2,3,4])
  });
}

test("A19: decoder boundary preserves provenance and never sets production-ready", async () => {
  const evidence = baseEvidence();
  const result = await decodeW3dResource({
    evidence,
    bytes: new Uint8Array([1,2,3,4]),
    decoder: async (_bytes, context) => ({
      complete: true,
      diagnostics: ["synthetic decoder fixture"],
      entities: [{
        entity_id: "poly-1",
        kind: "polyline",
        source_offset: 42,
        transform: [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
        confidence: 0.9,
        reason: "fixture",
        payload: { points: [[0,0,0],[10,0,0]] }
      }]
    })
  });

  assert.equal(result.decode_status, "decoded");
  assert.equal(result.production_ready, false);
  assert.equal(result.source.package_path, "dwf/resources/model.w3d");
  assert.equal(result.entities[0].source_offset, 42);
  assert.equal(result.entities[0].confidence, 0.9);
  assert.match(result.diagnostics.at(-1), /canonical tube recognition is still required/i);
});

test("A19: partial decoder coverage stays explicit", async () => {
  const result = await decodeW3dResource({
    evidence: baseEvidence(),
    bytes: new Uint8Array([1,2,3,4]),
    decoder: async () => ({
      complete: false,
      entities: [],
      diagnostics: ["unsupported opcode at offset 128"]
    })
  });

  assert.equal(result.decode_status, "decoded_partial");
  assert.equal(result.production_ready, false);
  assert.match(result.diagnostics.join(" "), /partial resource coverage/i);
});

test("A19: decoder cannot emit unsupported entity kinds", async () => {
  await assert.rejects(
    () => decodeW3dResource({
      evidence: baseEvidence(),
      bytes: new Uint8Array([1]),
      decoder: async () => ({
        complete: true,
        entities: [{
          kind: "canonical_bend",
          confidence: 1,
          source_offset: 0
        }]
      })
    }),
    /kind is unsupported/
  );
});

test("A19: invalid transform or confidence is rejected before recognition", async () => {
  await assert.rejects(
    () => decodeW3dResource({
      evidence: baseEvidence(),
      bytes: new Uint8Array([1]),
      decoder: async () => ({
        entities: [{
          kind: "polyline",
          confidence: 2,
          source_offset: 0,
          transform: [1,0]
        }]
      })
    }),
    /confidence|transform/
  );
});
