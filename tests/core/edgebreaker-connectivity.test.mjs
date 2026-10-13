import test from "node:test";
import assert from "node:assert/strict";

import { decodeEdgeBreakerConnectivity } from "../../src/import/dwfx/edgebreaker-connectivity.mjs";

const FIRST_80003043_SHELL_WORKSPACE_B64 =
  "AgAAAzwCAAA8AAAAYAIAAJ4BAABgAgAABAEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAgIEAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwECAgQBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQICBAEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAgIEAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwECAgECAQIBAgECAAADAwMDAwMDAAADAAMAAwADAAMAAwAAAwADAAMAAwADAAMAAAAAAAAAAAAAAwAAAwADAwMDAwMAAwAAAwMDAwMDAwMDAwMDAwAAAwAAAwAAAAAAAAAEAgAAAAAAAAAAAAMDAQAAAAAAAAAAAwMAAwAAAwADAwAAAAAAAAAAAAQBAQEBAQIAAwADAwMDAwMDAAMDAAMAAwADAAMAAwQBAwEDAwEDAQMCAAMAAwADAAMDAwEBAQEBAQEBAgAAAAMDAwMDAwMAAwADAAMAAwADAAMAAAMAAwADAAMAAwMAAAMAAAAAAAAAAAMAAAADAAMDAwMDAwAAAwQDAwMCAAAAAAAEAQEBAQECAAMAAAAAAAAAAAAEAgAAAAAAAAAAAwQCAAAAAAAAAAADBAIAAwADAAMAAwMAAwMDAwMDAwADAAADAwMDAwMDAwAEAgMAAwADAAMAAwAAAwADAwQDAwIBAAAAAAMDAAMAAAQBAQEBAgQCAwEDAQKIAAAACgAAAAQBAAADAAAAAwAAAAMAAAAoAAAALQAAAAkAAAAEAAAAJgAAAAMAAAAIAAAACAAAAAgAAABfIAhgH+D/HwHgH+AfYBWgFaAB4P/fH2Af4B/gFaAB4AHgH2AfYBWgH+D/3wHgH+AfYBWgFaAB4P/fH2Af4B/gFaAB4AHgH2AfYBWgH+D/3wHgH+AfYBWgFaAB4P/fH2Af4B/gH+D/3//fH+Af4B/gP+Af4B/gH6AfoD/gP+Af4D/gH6Af4B+gH6A/4D/gH+Af4B+g/98f4B/gH+Af4P/f/98f4B/gH+D/3x/gH+Af4B/g/9//3x/gH+Af4B+gP+A/4B/gH+AfoNKVP+DW1FXaVdTYVbRV0tvVdHkVe1U1egV7FTazV8lepaNXmVatl1fs21XuVerYVdJV6NRLV1XjWVNXaVdRY1fQVklvVdPlVexV1egV7FXYzl4le5WOXmVbtV5esW9XuVepY1dLV6FTLV1VjWVNXaVdRY1dQVslvVdNl1ezV1WjVbBXYTl7lexVOnqVbtV6ecW+XeVdpY5dLl2FTrZ0VTWVNXWVdhU1dgVtlfReNV1ezV5VjVfBXoXm7FWyVenoVbtV6+UV+3aVdZU6drh0FTra0lXVVdbUVdtV1NgVtFXSetV0eTZ7VTVeBXsVmbNXyVelo1fuVq2XVezbVdRV6tjj0lXoVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";

test("A20: real first 80003043 EdgeBreaker topology reconstructs exact triangle connectivity", () => {
  const captured = Uint8Array.from(Buffer.from(FIRST_80003043_SHELL_WORKSPACE_B64, "base64"));
  const workspace = new Uint8Array(1264);
  workspace.set(captured);
  // The omitted tail belongs only to the packed-point payload, which the
  // topology-only decoder intentionally does not inspect.
  workspace.fill(0x55, captured.length);
  const result = decodeEdgeBreakerConnectivity(workspace);

  assert.equal(result.codec, "edgebreaker");
  assert.equal(result.raw_point_count, 424);
  assert.equal(result.point_count, 414);
  assert.equal(result.face_count, 412);
  assert.equal(result.dropped_dummy_faces, 160);
  assert.deepEqual(result.dummy_vertices, [260,263,266,269,309,354,363,367,405,408]);

  for (const triangle of result.faces) {
    assert.equal(triangle.length, 3);
    assert.ok(triangle.every((index) => Number.isInteger(index) && index >= 0 && index < 414));
    assert.equal(new Set(triangle).size, 3);
  }
});

test("A20: merge opcodes remain explicit blockers instead of guessed topology", () => {
  const header = Buffer.alloc(24);
  header[0] = 2;
  header[1] = 0;
  header[2] = 0;
  header[3] = 0;
  header.writeInt32LE(1, 4);
  header.writeInt32LE(4, 8);
  header.writeInt32LE(0, 12);
  header.writeInt32LE(0, 16);
  header.writeInt32LE(0, 20);

  const workspace = Uint8Array.from([
    ...header,
    5, 0, 0, 0,
    0, 0, 0, 0
  ]);

  assert.throws(
    () => decodeEdgeBreakerConnectivity(workspace),
    /merge opcode/i
  );
});
