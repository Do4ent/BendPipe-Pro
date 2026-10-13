import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import {
  extractZipEntry
} from "../../src/import/dwfx/zip-entry-extractor.mjs";

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
  return new TextEncoder().encode(text);
}

function makeSingleEntryZip({ path, data, method }) {
  const name = utf8(path);
  const raw = data instanceof Uint8Array ? data : utf8(data);
  const compressed =
    method === 8 ? new Uint8Array(deflateRawSync(raw)) : raw;

  const local = new Uint8Array([
    ...u32(0x04034b50),
    ...u16(20),
    ...u16(0x0800),
    ...u16(method),
    ...u16(0),
    ...u16(0),
    ...u32(0),
    ...u32(compressed.length),
    ...u32(raw.length),
    ...u16(name.length),
    ...u16(0),
    ...name,
    ...compressed
  ]);

  const entry = {
    path,
    flags: 0x0800,
    compression_method: method,
    compressed_size: compressed.length,
    uncompressed_size: raw.length,
    local_header_offset: 0,
    encrypted: false
  };

  return { zip: local, entry, raw };
}

test("A19: stored ZIP entry extraction returns exact bytes", async () => {
  const { zip, entry, raw } = makeSingleEntryZip({
    path: "dwf/resources/model.w3d",
    data: "W3D-BYTES",
    method: 0
  });

  const output = await extractZipEntry(zip, entry);

  assert.deepEqual([...output], [...raw]);
});

test("A19: deflate extraction requires an explicit inflater and verifies output length", async () => {
  const { zip, entry, raw } = makeSingleEntryZip({
    path: "dwf/properties/metadata.xml",
    data: "<metadata>tube</metadata>",
    method: 8
  });

  await assert.rejects(
    () => extractZipEntry(zip, entry),
    /requires an explicit inflateRaw/
  );

  const output = await extractZipEntry(zip, entry, {
    inflateRaw: (compressed) => new Uint8Array(inflateRawSync(compressed))
  });

  assert.deepEqual([...output], [...raw]);
});

test("A19: encrypted entries are rejected", async () => {
  const { zip, entry } = makeSingleEntryZip({
    path: "secret.w3d",
    data: "abc",
    method: 0
  });

  await assert.rejects(
    () => extractZipEntry(zip, { ...entry, encrypted: true }),
    /Encrypted ZIP entries/
  );
});

test("A19: unsupported compression methods fail explicitly", async () => {
  const { zip, entry } = makeSingleEntryZip({
    path: "resource.bin",
    data: "abc",
    method: 0
  });

  const patched = new Uint8Array(zip);
  patched[8] = 12;
  patched[9] = 0;

  await assert.rejects(
    () =>
      extractZipEntry(patched, {
        ...entry,
        compression_method: 12
      }),
    /Unsupported ZIP compression method/
  );
});

test("A19: central/local compression mismatch is rejected", async () => {
  const { zip, entry } = makeSingleEntryZip({
    path: "resource.bin",
    data: "abc",
    method: 0
  });

  await assert.rejects(
    () =>
      extractZipEntry(zip, {
        ...entry,
        compression_method: 8
      }),
    /compression method mismatch/
  );
});
