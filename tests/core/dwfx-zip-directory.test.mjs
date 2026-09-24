import test from "node:test";
import assert from "node:assert/strict";

import { parseZipCentralDirectory } from "../../src/import/dwfx/zip-directory.mjs";

function u16(v) {
  return [v & 0xff, (v >>> 8) & 0xff];
}
function u32(v) {
  return [
    v & 0xff,
    (v >>> 8) & 0xff,
    (v >>> 16) & 0xff,
    (v >>> 24) & 0xff
  ];
}
function utf8(text) {
  return [...new TextEncoder().encode(text)];
}

function makeStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = utf8(entry.path);
    const data = utf8(entry.content ?? "");
    const local = [
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(name.length),
      ...u16(0),
      ...name,
      ...data
    ];
    localParts.push(local);

    const central = [
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(name.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...name
    ];
    centralParts.push(central);
    offset += local.length;
  }

  const centralOffset = offset;
  const central = centralParts.flat();
  const eocd = [
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(central.length),
    ...u32(centralOffset),
    ...u16(0)
  ];

  return new Uint8Array([...localParts.flat(), ...central, ...eocd]);
}

test("A19: ZIP directory parser finds W3D and OPC resources without decompression", () => {
  const zip = makeStoredZip([
    { path: "[Content_Types].xml", content: "<Types/>" },
    { path: "_rels/.rels", content: "<Relationships/>" },
    { path: "dwf/resources/model.w3d", content: "W3D" }
  ]);

  const result = parseZipCentralDirectory(zip);

  assert.equal(result.entry_count, 3);
  assert.deepEqual(
    result.entries.map((entry) => entry.path),
    [
      "[Content_Types].xml",
      "_rels/.rels",
      "dwf/resources/model.w3d"
    ]
  );
  assert.equal(result.entries[2].compression_method, 0);
  assert.equal(result.entries[2].encrypted, false);
  assert.ok(result.entries[2].local_header_offset > 0);
});

test("A19: malformed or non-ZIP input fails loudly", () => {
  assert.throws(
    () => parseZipCentralDirectory(new Uint8Array([1, 2, 3])),
    /too small|EOCD/
  );
});

test("A19: multi-disk ZIP is explicitly rejected", () => {
  const zip = makeStoredZip([{ path: "a.txt", content: "a" }]);
  const bytes = new Uint8Array(zip);
  const eocd = bytes.length - 22;
  bytes[eocd + 4] = 1;

  assert.throws(
    () => parseZipCentralDirectory(bytes),
    /Multi-disk ZIP/
  );
});

test("A19: empty central entry names are rejected", () => {
  const zip = makeStoredZip([{ path: "a", content: "" }]);
  const bytes = new Uint8Array(zip);
  const centralOffset =
    bytes[bytes.length - 6] |
    (bytes[bytes.length - 5] << 8) |
    (bytes[bytes.length - 4] << 16) |
    (bytes[bytes.length - 3] << 24);
  bytes[centralOffset + 28] = 0;
  bytes[centralOffset + 29] = 0;

  assert.throws(
    () => parseZipCentralDirectory(bytes),
    /empty path|size does not match/
  );
});
