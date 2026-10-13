const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError("ZIP input must be an ArrayBuffer or Uint8Array");
}

function findEocd(bytes) {
  // EOCD is at least 22 bytes and may be followed by a comment up to 65535 bytes.
  const min = Math.max(0, bytes.length - (22 + 0xffff));
  for (let i = bytes.length - 22; i >= min; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      return i;
    }
  }
  return -1;
}

function readU16(view, offset) {
  return view.getUint16(offset, true);
}

function readU32(view, offset) {
  return view.getUint32(offset, true);
}

function decodeName(bytes) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/**
 * Parse only the ZIP central directory.
 *
 * DWFx is an OPC ZIP package. This intentionally does not decompress or
 * interpret W3D payloads; it exposes package evidence and offsets for the
 * downstream DWFx importer.
 */
export function parseZipCentralDirectory(input) {
  const bytes = asBytes(input);
  if (bytes.length < 22) {
    throw new RangeError("ZIP is too small to contain an EOCD record");
  }

  const eocdOffset = findEocd(bytes);
  if (eocdOffset < 0) {
    throw new RangeError("ZIP EOCD record not found");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readU32(view, eocdOffset) !== EOCD_SIGNATURE) {
    throw new RangeError("Invalid ZIP EOCD signature");
  }

  const diskNumber = readU16(view, eocdOffset + 4);
  const centralDisk = readU16(view, eocdOffset + 6);
  const entriesOnDisk = readU16(view, eocdOffset + 8);
  const totalEntries = readU16(view, eocdOffset + 10);
  const centralSize = readU32(view, eocdOffset + 12);
  const centralOffset = readU32(view, eocdOffset + 16);
  const commentLength = readU16(view, eocdOffset + 20);

  if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== totalEntries) {
    throw new RangeError("Multi-disk ZIP packages are not supported");
  }
  if (
    totalEntries === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff
  ) {
    throw new RangeError("ZIP64 central directories are not supported yet");
  }
  if (eocdOffset + 22 + commentLength > bytes.length) {
    throw new RangeError("ZIP EOCD comment extends beyond the input");
  }
  if (centralOffset + centralSize > bytes.length) {
    throw new RangeError("ZIP central directory extends beyond the input");
  }

  const entries = [];
  let offset = centralOffset;

  for (let index = 0; index < totalEntries; index++) {
    if (offset + 46 > bytes.length) {
      throw new RangeError(`ZIP central entry ${index} is truncated`);
    }
    if (readU32(view, offset) !== CENTRAL_SIGNATURE) {
      throw new RangeError(`ZIP central entry ${index} has an invalid signature`);
    }

    const flags = readU16(view, offset + 8);
    const compressionMethod = readU16(view, offset + 10);
    const crc32 = readU32(view, offset + 16);
    const compressedSize = readU32(view, offset + 20);
    const uncompressedSize = readU32(view, offset + 24);
    const fileNameLength = readU16(view, offset + 28);
    const extraLength = readU16(view, offset + 30);
    const fileCommentLength = readU16(view, offset + 32);
    const localHeaderOffset = readU32(view, offset + 42);

    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      throw new RangeError(
        `ZIP64 entry fields are not supported yet at central entry ${index}`
      );
    }

    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    const next =
      nameEnd + extraLength + fileCommentLength;

    if (next > bytes.length || next > centralOffset + centralSize) {
      throw new RangeError(`ZIP central entry ${index} exceeds directory bounds`);
    }

    const path = decodeName(bytes.subarray(nameStart, nameEnd));
    if (!path) {
      throw new RangeError(`ZIP central entry ${index} has an empty path`);
    }

    entries.push(
      Object.freeze({
        index,
        path,
        flags,
        compression_method: compressionMethod,
        crc32,
        compressed_size: compressedSize,
        uncompressed_size: uncompressedSize,
        local_header_offset: localHeaderOffset,
        encrypted: (flags & 0x0001) !== 0,
        utf8_name: (flags & 0x0800) !== 0,
        directory: path.endsWith("/")
      })
    );

    offset = next;
  }

  if (offset !== centralOffset + centralSize) {
    throw new RangeError(
      "ZIP central directory size does not match parsed entry boundaries"
    );
  }

  return Object.freeze({
    entry_count: totalEntries,
    central_directory_offset: centralOffset,
    central_directory_size: centralSize,
    eocd_offset: eocdOffset,
    entries: Object.freeze(entries)
  });
}
