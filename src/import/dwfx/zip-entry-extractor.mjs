const LOCAL_SIGNATURE = 0x04034b50;

function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError("ZIP input must be an ArrayBuffer or Uint8Array");
}

function u16(view, offset) {
  return view.getUint16(offset, true);
}

function u32(view, offset) {
  return view.getUint32(offset, true);
}

function exactLength(bytes, expected, label) {
  if (expected != null && bytes.length !== expected) {
    throw new RangeError(
      `${label} length mismatch: expected ${expected}, got ${bytes.length}`
    );
  }
  return bytes;
}

/**
 * Extract one ZIP entry using central-directory metadata.
 *
 * Supported:
 * - method 0 (stored)
 * - method 8 (deflate) when inflateRaw is supplied
 *
 * CRC validation is intentionally a separate step; this function enforces
 * structural bounds and size consistency but does not silently accept
 * encrypted or unsupported compression methods.
 */
export async function extractZipEntry(input, entry, options = {}) {
  const bytes = asBytes(input);
  if (!entry || typeof entry !== "object") {
    throw new TypeError("entry metadata is required");
  }

  if (entry.encrypted === true || (Number(entry.flags) & 0x0001) !== 0) {
    throw new RangeError("Encrypted ZIP entries are not supported");
  }

  const localOffset = Number(entry.local_header_offset);
  if (!Number.isInteger(localOffset) || localOffset < 0) {
    throw new RangeError("entry local_header_offset is invalid");
  }
  if (localOffset + 30 > bytes.length) {
    throw new RangeError("ZIP local header is truncated");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (u32(view, localOffset) !== LOCAL_SIGNATURE) {
    throw new RangeError("Invalid ZIP local-file-header signature");
  }

  const localFlags = u16(view, localOffset + 6);
  const localMethod = u16(view, localOffset + 8);
  const fileNameLength = u16(view, localOffset + 26);
  const extraLength = u16(view, localOffset + 28);

  if ((localFlags & 0x0001) !== 0) {
    throw new RangeError("Encrypted ZIP entries are not supported");
  }

  const method = Number(entry.compression_method);
  if (method !== localMethod) {
    throw new RangeError(
      `ZIP compression method mismatch: central=${method}, local=${localMethod}`
    );
  }

  const compressedSize = Number(entry.compressed_size);
  const uncompressedSize = Number(entry.uncompressed_size);
  if (
    !Number.isInteger(compressedSize) ||
    compressedSize < 0 ||
    !Number.isInteger(uncompressedSize) ||
    uncompressedSize < 0
  ) {
    throw new RangeError("ZIP entry size metadata is invalid");
  }

  const dataStart = localOffset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + compressedSize;

  if (dataEnd > bytes.length) {
    throw new RangeError("ZIP entry payload extends beyond the input");
  }

  const compressed = bytes.subarray(dataStart, dataEnd);

  if (method === 0) {
    return new Uint8Array(
      exactLength(compressed, uncompressedSize, "Stored ZIP entry")
    );
  }

  if (method === 8) {
    const inflateRaw = options.inflateRaw;
    if (typeof inflateRaw !== "function") {
      throw new RangeError(
        "Deflate entry requires an explicit inflateRaw implementation"
      );
    }
    const inflated = asBytes(await inflateRaw(new Uint8Array(compressed)));
    exactLength(inflated, uncompressedSize, "Deflated ZIP entry");
    return new Uint8Array(inflated);
  }

  throw new RangeError(
    `Unsupported ZIP compression method: ${String(method)}`
  );
}

/**
 * Browser adapter for ZIP deflate payloads.
 *
 * It is capability-checked and never used as an implicit fallback. Callers
 * decide whether this platform adapter is acceptable for their environment.
 */
export async function inflateRawWithDecompressionStream(compressed) {
  if (typeof DecompressionStream !== "function") {
    throw new RangeError("DecompressionStream is unavailable");
  }

  let stream;
  try {
    stream = new DecompressionStream("deflate-raw");
  } catch (error) {
    throw new RangeError(
      `deflate-raw DecompressionStream is unavailable: ${error?.message || error}`
    );
  }

  const input = asBytes(compressed);
  const readable = new Blob([input]).stream().pipeThrough(stream);
  const output = await new Response(readable).arrayBuffer();
  return new Uint8Array(output);
}
