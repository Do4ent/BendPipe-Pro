function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError("HSF input must be an ArrayBuffer or Uint8Array");
}

function readU16LE(bytes, offset) {
  if (offset + 2 > bytes.length) throw new RangeError("truncated uint16 operand");
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, true);
}

function readI32LE(bytes, offset) {
  if (offset + 4 > bytes.length) throw new RangeError("truncated int32 operand");
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getInt32(0, true);
}

function readU32LE(bytes, offset) {
  if (offset + 4 > bytes.length) throw new RangeError("truncated uint32 operand");
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}

function readF32LE(bytes, offset) {
  if (offset + 4 > bytes.length) throw new RangeError("truncated float32 operand");
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getFloat32(0, true);
}

function readAscii(bytes, start, end) {
  let value = "";
  for (let i = start; i < end; i += 1) value += String.fromCharCode(bytes[i]);
  return value;
}

function findHeaderTerminator(bytes, start) {
  for (let i = start; i < Math.min(bytes.length, start + 64); i += 1) {
    if (bytes[i] === 0 || bytes[i] === 10) return i;
  }
  return -1;
}

async function inflateWithStream(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function defaultInflateZlib(bytes) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("No zlib inflater available; provide inflateZlib(bytes)");
  }
  try {
    return await inflateWithStream(bytes);
  } catch (error) {
    // Inventor W3D resources can carry one outer NUL byte after the zlib
    // member. Node 24 rejects that byte as trailing junk whereas browsers and
    // older Node versions may ignore it. Retry only this observed container
    // terminator; never scan for a guessed zlib end.
    if (bytes.length > 1 && bytes.at(-1) === 0) {
      return inflateWithStream(bytes.subarray(0, -1));
    }
    throw error;
  }
}

/** Parse only the HSF/W3D envelope and global zlib block. */
export async function decodeHsfEnvelope(input, { inflateZlib = defaultInflateZlib } = {}) {
  const bytes = asBytes(input);
  const prefix = readAscii(bytes, 0, Math.min(bytes.length, 32));
  const match = /^;; HSF V(\d+\.\d{2})/.exec(prefix);
  if (!match) throw new RangeError("W3D resource does not start with an HSF version header");

  const headerTerminator = findHeaderTerminator(bytes, match[0].length);
  if (headerTerminator < 0) throw new RangeError("HSF version header terminator not found");
  let offset = headerTerminator + 1;

  const fileInfo = [];
  const comments = [];
  while (offset < bytes.length) {
    const opcode = bytes[offset];
    if (opcode === 0x49) {
      const flags = readU32LE(bytes, offset + 1);
      fileInfo.push(Object.freeze({ source_offset: offset, flags }));
      offset += 5;
      continue;
    }
    if (opcode === 0x3b) {
      const newline = bytes.indexOf(0x0a, offset + 1);
      if (newline < 0) throw new RangeError("unterminated HSF comment before compression block");
      comments.push(Object.freeze({
        source_offset: offset,
        text: readAscii(bytes, offset + 1, newline)
      }));
      offset = newline + 1;
      continue;
    }
    break;
  }

  if (bytes[offset] !== 0x5a) {
    throw new RangeError(`expected TKE_Start_Compression at offset ${offset}`);
  }
  const compressedOffset = offset + 1;
  const opcodeStream = await inflateZlib(bytes.subarray(compressedOffset));
  if (!(opcodeStream instanceof Uint8Array)) {
    throw new TypeError("inflateZlib must resolve to Uint8Array");
  }
  if (opcodeStream.at(-1) !== 0x7a) {
    throw new RangeError("decompressed HSF stream is missing TKE_Stop_Compression");
  }

  return Object.freeze({
    hsf_version: match[1],
    header_end_offset: headerTerminator,
    file_info: Object.freeze(fileInfo),
    comments: Object.freeze(comments),
    compression: Object.freeze({
      opcode_offset: offset,
      compressed_offset: compressedOffset,
      compressed_input_bytes: bytes.length - compressedOffset,
      decompressed_bytes: opcodeStream.length
    }),
    opcode_stream: opcodeStream
  });
}

/** Decode a strict, synchronized prefix of simple HSF opcodes. Stops on the first unsupported opcode. */
export function decodeHsfOpcodePrefix(input, { maxOpcodes = 256, hsfVersion = null } = {}) {
  const bytes = asBytes(input);
  const entities = [];
  let offset = 0;
  let count = 0;
  let geometryAttributesDepth = 0;

  while (offset < bytes.length && count < maxOpcodes) {
    const opcode = bytes[offset];
    if (opcode === 0x7a) {
      return Object.freeze({ entities: Object.freeze(entities), next_offset: offset + 1, complete_prefix: true });
    }
    if (opcode === 0x28) {
      if (offset + 2 > bytes.length) throw new RangeError("truncated TKE_Open_Segment");
      const length = bytes[offset + 1];
      const end = offset + 2 + length;
      if (end > bytes.length) throw new RangeError("truncated TKE_Open_Segment name");
      entities.push(Object.freeze({
        kind: "segment",
        action: "open",
        source_offset: offset,
        name: readAscii(bytes, offset + 2, end)
      }));
      offset = end;
      count += 1;
      continue;
    }
    if (opcode === 0x29) {
      entities.push(Object.freeze({ kind: "segment", action: "close", source_offset: offset }));
      offset += 1;
      count += 1;
      continue;
    }
    if (opcode === 0x3a) { // TKE_Geometry_Attributes: no operands
      entities.push(Object.freeze({
        kind: "geometry_scope",
        action: "open",
        source_offset: offset
      }));
      geometryAttributesDepth += 1;
      offset += 1;
      count += 1;
      continue;
    }
    if (opcode === 0x00) { // TKE_Termination
      if (geometryAttributesDepth > 0) {
        geometryAttributesDepth -= 1;
        entities.push(Object.freeze({
          kind: "geometry_scope",
          action: "close",
          source_offset: offset
        }));
        offset += 1;
        count += 1;
        continue;
      }
      return Object.freeze({
        entities: Object.freeze(entities),
        next_offset: offset,
        complete_prefix: false,
        unsupported_opcode: opcode,
        unsupported_variant: "TKE_Termination outside geometry-attributes scope"
      });
    }
    if (opcode === 0x71) { // TKE_Tag: no operands
      entities.push(Object.freeze({ kind: "tag", source_offset: offset }));
      offset += 1;
      count += 1;
      continue;
    }
    if (opcode === 0x64) { // TKE_Distant_Light: Point direction
      if (offset + 13 > bytes.length) throw new RangeError("truncated TKE_Distant_Light");
      const direction = Object.freeze([
        readF32LE(bytes, offset + 1),
        readF32LE(bytes, offset + 5),
        readF32LE(bytes, offset + 9)
      ]);
      entities.push(Object.freeze({
        kind: "light",
        light_type: "distant",
        source_offset: offset,
        direction
      }));
      offset += 13;
      count += 1;
      continue;
    }
    if (opcode === 0x01) { // TKE_Pause: no operands
      entities.push(Object.freeze({ kind: "pause", source_offset: offset }));
      offset += 1;
      count += 1;
      continue;
    }
    if (opcode === 0x74) { // TKE_Texture
      let cursor = offset + 1;
      const readTextureString = (label) => {
        if (cursor >= bytes.length) throw new RangeError(`truncated TKE_Texture ${label} length`);
        let length = bytes[cursor++];
        if (length === 0xff) {
          length = readI32LE(bytes, cursor);
          cursor += 4;
          if (length < 0) throw new RangeError(`negative TKE_Texture ${label} length`);
        }
        const end = cursor + length;
        if (end > bytes.length) throw new RangeError(`truncated TKE_Texture ${label}`);
        const value = readAscii(bytes, cursor, end);
        cursor = end;
        return value;
      };

      const name = readTextureString("name");
      const imageName = readTextureString("image name");
      let flags = readU16LE(bytes, cursor);
      cursor += 2;
      if ((flags & 0x8000) !== 0) {
        flags = (flags | (readU16LE(bytes, cursor) << 16)) >>> 0;
        cursor += 2;
      }

      const options = {};
      const readByteOption = (bit, key) => {
        if ((flags & bit) === 0) return;
        if (cursor >= bytes.length) throw new RangeError(`truncated TKE_Texture ${key}`);
        options[key] = bytes[cursor++];
      };
      readByteOption(0x00000001, "parameter_source");
      readByteOption(0x00000002, "tiling");
      readByteOption(0x00000004, "interpolation");
      readByteOption(0x00000008, "decimation");
      readByteOption(0x00000010, "red_mapping");
      readByteOption(0x00000020, "green_mapping");
      readByteOption(0x00000040, "blue_mapping");
      readByteOption(0x00000080, "alpha_mapping");
      readByteOption(0x00000100, "parameter_function");
      readByteOption(0x00000200, "layout");

      if ((flags & 0x00000800) !== 0) {
        options.value_scale = Object.freeze([
          readF32LE(bytes, cursor),
          readF32LE(bytes, cursor + 4)
        ]);
        cursor += 8;
      }
      if ((flags & 0x00000400) !== 0) {
        if (cursor >= bytes.length) throw new RangeError("truncated TKE_Texture transform length");
        const length = bytes[cursor++];
        const end = cursor + length;
        if (end > bytes.length) throw new RangeError("truncated TKE_Texture transform");
        options.transform_segment = readAscii(bytes, cursor, end);
        cursor = end;
      }
      if ((flags & (0x00010000 | 0x00020000)) !== 0) {
        if (cursor >= bytes.length) throw new RangeError("truncated TKE_Texture apply mode");
        options.apply_mode = bytes[cursor++];
      }
      if ((flags & 0x00040000) !== 0) {
        if (cursor >= bytes.length) throw new RangeError("truncated TKE_Texture parameter offset");
        options.parameter_offset = bytes[cursor++];
      }

      entities.push(Object.freeze({
        kind: "texture",
        source_offset: offset,
        name,
        image_name: imageName,
        flags,
        options: Object.freeze(options)
      }));
      offset = cursor;
      count += 1;
      continue;
    }
    if (opcode === 0xe0) { // TKE_HW3D_Image
      let cursor = offset + 1;
      if (cursor >= bytes.length) throw new RangeError("truncated TKE_HW3D_Image name length");
      const nameLength = bytes[cursor++];
      const nameEnd = cursor + nameLength;
      if (nameEnd > bytes.length) throw new RangeError("truncated TKE_HW3D_Image name");
      const name = readAscii(bytes, cursor, nameEnd);
      cursor = nameEnd;
      const width = readI32LE(bytes, cursor);
      cursor += 4;
      const height = readI32LE(bytes, cursor);
      cursor += 4;
      if (cursor >= bytes.length) throw new RangeError("truncated TKE_HW3D_Image bit depth");
      const bitDepth = bytes[cursor++];

      entities.push(Object.freeze({
        kind: "hw3d_image",
        source_offset: offset,
        name,
        width,
        height,
        bit_depth: bitDepth
      }));
      offset = cursor;
      count += 1;
      continue;
    }
    if (opcode === 0x48) { // TKE_Heuristics
      let cursor = offset + 1;
      let mask = readU16LE(bytes, cursor);
      cursor += 2;
      if ((mask & 0x8000) !== 0) {
        mask = (mask | (readU16LE(bytes, cursor) << 16)) >>> 0;
        cursor += 2;
      }
      let value = readU16LE(bytes, cursor);
      cursor += 2;
      if ((mask & 0x8000) !== 0) {
        value = (value | (readU16LE(bytes, cursor) << 16)) >>> 0;
        cursor += 2;
      }

      const enabled = (mask & value) >>> 0;
      const payloadBits =
        0x00000040 | // related selection limit
        0x00000080 | // internal shell limit
        0x0000000c | // extras (handedness / quick moves)
        0x00010000 | // culling
        0x00200000 | // ordered weights
        0x00400000 | // internal polyline limit
        0x01000000;  // selection level
      if ((enabled & payloadBits) !== 0 || (mask & 0x00200000) !== 0 || (mask & 0x01000000) !== 0) {
        return Object.freeze({
          entities: Object.freeze(entities),
          next_offset: offset,
          complete_prefix: false,
          unsupported_opcode: opcode,
          unsupported_variant: "TKE_Heuristics optional payload requires version-aware decoding"
        });
      }

      entities.push(Object.freeze({
        kind: "heuristics",
        source_offset: offset,
        mask,
        value
      }));
      offset = cursor;
      count += 1;
      continue;
    }
    if (opcode === 0x55) { // TKE_User_Options
      let cursor = offset + 1;
      let length = readU16LE(bytes, cursor);
      cursor += 2;
      if (length === 0xffff) {
        length = readU32LE(bytes, cursor);
        cursor += 4;
      }
      const end = cursor + length;
      if (end > bytes.length) throw new RangeError("truncated TKE_User_Options string");
      entities.push(Object.freeze({
        kind: "user_options",
        source_offset: offset,
        value: readAscii(bytes, cursor, end)
      }));
      offset = end;
      count += 1;
      continue;
    }
    if (opcode === 0x22) { // TKE_Color
      let cursor = offset + 1;
      if (cursor >= bytes.length) throw new RangeError("truncated TKE_Color geometry mask");
      let geometryMask = bytes[cursor++];
      if ((geometryMask & 0x80) !== 0) {
        if (cursor >= bytes.length) throw new RangeError("truncated TKE_Color extended geometry mask");
        geometryMask |= bytes[cursor++] << 8;
      }
      if ((geometryMask & 0x00008000) !== 0) {
        if (cursor >= bytes.length) throw new RangeError("truncated TKE_Color extended color geometry mask");
        geometryMask |= bytes[cursor++] << 16;
      }
      if ((geometryMask & 0x00800000) !== 0) {
        if (cursor >= bytes.length) throw new RangeError("truncated TKE_Color secondary geometry mask");
        geometryMask = (geometryMask | (bytes[cursor++] << 24)) >>> 0;
      } else {
        geometryMask >>>= 0;
      }

      if (cursor >= bytes.length) throw new RangeError("truncated TKE_Color channels mask");
      let channelsMask = bytes[cursor++];
      if ((channelsMask & 0x80) !== 0) {
        if (cursor >= bytes.length) throw new RangeError("truncated TKE_Color extended channels mask");
        channelsMask |= bytes[cursor++] << 8;
      }

      const channels = {};
      const readColorValue = (channelName, extendedLength = false, rgbAllowed = true) => {
        if (cursor >= bytes.length) throw new RangeError(`truncated TKE_Color ${channelName} length`);
        let length = bytes[cursor++];
        if (extendedLength && length === 255) {
          length = readU32LE(bytes, cursor);
          cursor += 4;
        }
        if (rgbAllowed && length === 0) {
          if (cursor + 3 > bytes.length) throw new RangeError(`truncated TKE_Color ${channelName} RGB`);
          const rgb = Object.freeze([bytes[cursor], bytes[cursor + 1], bytes[cursor + 2]]);
          cursor += 3;
          channels[channelName] = Object.freeze({ rgb_bytes: rgb });
          return;
        }
        const end = cursor + length;
        if (end > bytes.length) throw new RangeError(`truncated TKE_Color ${channelName} name`);
        channels[channelName] = Object.freeze({ name: readAscii(bytes, cursor, end) });
        cursor = end;
      };

      if ((channelsMask & 0x0001) !== 0) readColorValue("diffuse", true, true);
      if ((channelsMask & 0x0002) !== 0) readColorValue("specular", false, true);
      if ((channelsMask & 0x0004) !== 0) readColorValue("mirror", false, true);
      if ((channelsMask & 0x0008) !== 0) readColorValue("transmission", false, true);
      if ((channelsMask & 0x0010) !== 0) readColorValue("emission", false, true);
      if ((channelsMask & 0x0020) !== 0) {
        channels.gloss = readF32LE(bytes, cursor);
        cursor += 4;
      }
      if ((channelsMask & 0x0040) !== 0) {
        channels.index = readF32LE(bytes, cursor);
        cursor += 4;
      }
      if ((channelsMask & 0x0100) !== 0) readColorValue("environment", false, false);
      if ((channelsMask & 0x0200) !== 0) readColorValue("bump", false, false);

      entities.push(Object.freeze({
        kind: "color",
        source_offset: offset,
        geometry_mask: geometryMask,
        channels_mask: channelsMask,
        channels: Object.freeze(channels)
      }));
      offset = cursor;
      count += 1;
      continue;
    }
    if (opcode === 0x7b) { // TKE_Style_Segment
      if (offset + 2 > bytes.length) throw new RangeError("truncated TKE_Style_Segment");
      const length = bytes[offset + 1];
      const end = offset + 2 + length;
      if (end > bytes.length) throw new RangeError("truncated TKE_Style_Segment name");
      entities.push(Object.freeze({
        kind: "segment",
        action: "style",
        source_offset: offset,
        name: readAscii(bytes, offset + 2, end)
      }));
      offset = end;
      count += 1;
      continue;
    }
    if (opcode === 0x56) { // TKE_Visibility
      if (offset + 3 > bytes.length) throw new RangeError("truncated TKE_Visibility");
      let cursor = offset + 1;
      const maskLow = bytes[cursor++];
      const valueLow = bytes[cursor++];
      let mask = maskLow;
      let value = valueLow;
      let maskHigh = null;
      let valueHigh = null;
      if ((maskLow & 0x80) !== 0) {
        maskHigh = readU16LE(bytes, cursor);
        cursor += 2;
        valueHigh = readU16LE(bytes, cursor);
        cursor += 2;
        mask = (maskLow | (maskHigh << 8)) >>> 0;
        value = (valueLow | (valueHigh << 8)) >>> 0;
      }
      entities.push(Object.freeze({
        kind: "visibility",
        source_offset: offset,
        mask,
        value,
        mask_low: maskLow,
        value_low: valueLow,
        mask_high: maskHigh,
        value_high: valueHigh
      }));
      offset = cursor;
      count += 1;
      continue;
    }
    if (opcode === 0x7e) { // TKE_Color_RGB
      if (offset + 5 > bytes.length) throw new RangeError("truncated TKE_Color_RGB");
      let cursor = offset + 1;
      const geometryLow = bytes[cursor++];
      let geometryHigh = null;
      let geometryMask = geometryLow;
      if ((geometryLow & 0x80) !== 0) {
        if (cursor >= bytes.length) throw new RangeError("truncated TKE_Color_RGB geometry mask");
        geometryHigh = bytes[cursor++];
        geometryMask = (geometryLow | (geometryHigh << 8)) >>> 0;
      }
      if (cursor + 3 > bytes.length) throw new RangeError("truncated TKE_Color_RGB value");
      const rgb = Object.freeze([bytes[cursor], bytes[cursor + 1], bytes[cursor + 2]]);
      cursor += 3;
      entities.push(Object.freeze({
        kind: "color",
        source_offset: offset,
        encoding: "rgb8",
        geometry_mask: geometryMask,
        geometry_bytes: Object.freeze(
          geometryHigh == null ? [geometryLow] : [geometryLow, geometryHigh]
        ),
        rgb_bytes: rgb
      }));
      offset = cursor;
      count += 1;
      continue;
    }
    if (opcode === 0x63) { // TKE_Circular_Arc
      if (offset + 37 > bytes.length) throw new RangeError("truncated TKE_Circular_Arc");
      const readPoint = (base) => Object.freeze([
        readF32LE(bytes, base),
        readF32LE(bytes, base + 4),
        readF32LE(bytes, base + 8)
      ]);
      const start = readPoint(offset + 1);
      const middle = readPoint(offset + 13);
      const end = readPoint(offset + 25);
      if (![...start, ...middle, ...end].every(Number.isFinite)) {
        throw new RangeError(`non-finite TKE_Circular_Arc coordinate at offset ${offset}`);
      }

      let cursor = offset + 37;
      let flags = 0;
      let center = null;
      const version = Number.parseFloat(String(hsfVersion ?? ""));
      if (!Number.isFinite(version)) {
        return Object.freeze({
          entities: Object.freeze(entities),
          next_offset: offset,
          complete_prefix: false,
          unsupported_opcode: opcode,
          unsupported_variant: "TKE_Circular_Arc requires HSF version to resolve post-12.15 flags"
        });
      }
      if (version >= 12.15) {
        if (cursor >= bytes.length) throw new RangeError("truncated TKE_Circular_Arc flags");
        flags = bytes[cursor++];
        if ((flags & 0x01) !== 0) {
          if (cursor + 12 > bytes.length) throw new RangeError("truncated TKE_Circular_Arc center");
          center = readPoint(cursor);
          cursor += 12;
        }
      }

      entities.push(Object.freeze({
        kind: "curve_candidate",
        source_offset: offset,
        primitive: "circular_arc",
        start,
        middle,
        end,
        flags,
        center,
        source_semantics: "native_hsf_circular_arc",
        canonical_ready: false,
        production_ready: false
      }));
      offset = cursor;
      count += 1;
      continue;
    }
    if (opcode === 0x53) { // TKE_Shell
      const shellOffset = offset;
      let cursor = offset + 1;
      if (cursor >= bytes.length) throw new RangeError("truncated TKE_Shell suboptions");

      const suboptions = bytes[cursor++];
      let suboptions2 = 0;
      if ((suboptions & 0x80) !== 0) {
        suboptions2 = readU16LE(bytes, cursor);
        cursor += 2;
        if ((suboptions2 & 0x000b) !== 0) {
          return Object.freeze({
            entities: Object.freeze(entities),
            next_offset: shellOffset,
            complete_prefix: false,
            unsupported_opcode: opcode,
            unsupported_variant: `TKE_Shell expanded suboptions 0x${suboptions2.toString(16)} are not decoded yet`
          });
        }
      }

      if ((suboptions & 0x20) !== 0) {
        return Object.freeze({
          entities: Object.freeze(entities),
          next_offset: shellOffset,
          complete_prefix: false,
          unsupported_opcode: opcode,
          unsupported_variant: "TKE_Shell bounding-only representation is not decoded yet"
        });
      }

      let refinementIndex = null;
      if ((suboptions & 0x10) === 0) {
        refinementIndex = readI32LE(bytes, cursor);
        cursor += 4;
      }
      if (cursor >= bytes.length) throw new RangeError("truncated TKE_Shell LOD");
      const lod = bytes[cursor++];

      let compressionScheme = 0;
      let workspaceLength = 0;
      let edgeBreaker = null;
      let vertices = Object.freeze([]);
      const hasCompressedPoints = (suboptions & 0x01) !== 0;
      const hasConnectivityCompression = (suboptions & 0x40) !== 0;

      if (hasCompressedPoints || hasConnectivityCompression) {
        if (cursor >= bytes.length) throw new RangeError("truncated TKE_Shell compression scheme");
        compressionScheme = bytes[cursor++];

        if (compressionScheme !== 0x05) {
          return Object.freeze({
            entities: Object.freeze(entities),
            next_offset: shellOffset,
            complete_prefix: false,
            unsupported_opcode: opcode,
            unsupported_variant: `TKE_Shell compression scheme ${compressionScheme} is not decoded yet`
          });
        }

        workspaceLength = readI32LE(bytes, cursor);
        cursor += 4;
        if (workspaceLength < 24 || cursor + workspaceLength > bytes.length) {
          throw new RangeError("invalid or truncated TKE_Shell EdgeBreaker workspace");
        }

        const workspaceStart = cursor;
        const workspaceEnd = workspaceStart + workspaceLength;
        const edgeScheme = bytes[workspaceStart];
        const mtableScheme = bytes[workspaceStart + 1];
        const pointsScheme = bytes[workspaceStart + 2];
        const normalsScheme = bytes[workspaceStart + 3];
        const opsLength = readI32LE(bytes, workspaceStart + 4);
        const mtableLength = readI32LE(bytes, workspaceStart + 8);
        const packedPointsLength = readI32LE(bytes, workspaceStart + 12);
        const pointCount = readI32LE(bytes, workspaceStart + 16);
        const normalsLength = readI32LE(bytes, workspaceStart + 20);

        if (
          edgeScheme !== 2 ||
          mtableScheme !== 0 ||
          opsLength < 0 ||
          mtableLength < 0 ||
          packedPointsLength < 0 ||
          normalsLength < 0 ||
          pointCount < 0 ||
          pointCount > 10_000_000
        ) {
          return Object.freeze({
            entities: Object.freeze(entities),
            next_offset: shellOffset,
            complete_prefix: false,
            unsupported_opcode: opcode,
            unsupported_variant: "TKE_Shell EdgeBreaker header variant is not decoded yet"
          });
        }

        const align4 = (value) => value + ((4 - (value % 4)) % 4);
        const expectedWorkspace =
          24 + align4(opsLength) + align4(mtableLength) + align4(packedPointsLength);
        if (expectedWorkspace !== workspaceLength) {
          return Object.freeze({
            entities: Object.freeze(entities),
            next_offset: shellOffset,
            complete_prefix: false,
            unsupported_opcode: opcode,
            unsupported_variant:
              `TKE_Shell EdgeBreaker workspace length mismatch: header implies ${expectedWorkspace}, stream has ${workspaceLength}`
          });
        }

        edgeBreaker = Object.freeze({
          scheme: edgeScheme,
          mtable_scheme: mtableScheme,
          points_scheme: pointsScheme,
          normals_scheme: normalsScheme,
          ops_length: opsLength,
          mtable_length: mtableLength,
          packed_points_length: packedPointsLength,
          point_count: pointCount,
          normals_length: normalsLength,
          workspace_offset: workspaceStart,
          workspace_length: workspaceLength
        });
        cursor = workspaceEnd;

        if (!hasCompressedPoints) {
          const version = Number.parseFloat(String(hsfVersion ?? ""));
          if (!Number.isFinite(version)) {
            return Object.freeze({
              entities: Object.freeze(entities),
              next_offset: shellOffset,
              complete_prefix: false,
              unsupported_opcode: opcode,
              unsupported_variant: "TKE_Shell requires HSF version to resolve post-EdgeBreaker point layout"
            });
          }
          if (version >= 6.51) {
            const pointBytes = pointCount * 12;
            if (cursor + pointBytes > bytes.length) {
              throw new RangeError("truncated TKE_Shell uncompressed point array");
            }
            const decodedVertices = new Array(pointCount);
            for (let i = 0; i < pointCount; i += 1) {
              const base = cursor + i * 12;
              const point = Object.freeze([
                readF32LE(bytes, base),
                readF32LE(bytes, base + 4),
                readF32LE(bytes, base + 8)
              ]);
              if (!point.every(Number.isFinite)) {
                throw new RangeError(`non-finite TKE_Shell vertex at offset ${base}`);
              }
              decodedVertices[i] = point;
            }
            vertices = Object.freeze(decodedVertices);
            cursor += pointBytes;
          }
        }
      } else {
        return Object.freeze({
          entities: Object.freeze(entities),
          next_offset: shellOffset,
          complete_prefix: false,
          unsupported_opcode: opcode,
          unsupported_variant: "uncompressed TKE_Shell connectivity is not decoded yet"
        });
      }

      const optionals = [];
      if ((suboptions & 0x08) !== 0) {
        const pointCount = edgeBreaker?.point_count ?? 0;
        let terminated = false;
        while (cursor < bytes.length) {
          const optionalOffset = cursor;
          const optionalOpcode = bytes[cursor++];
          if (optionalOpcode === 0x00) {
            terminated = true;
            break;
          }
          if (optionalOpcode === 0x1c) { // OPT_ALL_PARAMETERS
            if (cursor >= bytes.length) throw new RangeError("truncated OPT_ALL_PARAMETERS width");
            const width = bytes[cursor++];
            if (width < 1 || width > 4) {
              throw new RangeError(`invalid OPT_ALL_PARAMETERS width ${width}`);
            }
            const floatCount = pointCount * width;
            const byteCount = floatCount * 4;
            if (cursor + byteCount > bytes.length) {
              throw new RangeError("truncated OPT_ALL_PARAMETERS values");
            }
            optionals.push(Object.freeze({
              opcode: optionalOpcode,
              kind: "all_parameters",
              source_offset: optionalOffset,
              width,
              value_count: pointCount,
              scalar_count: floatCount
            }));
            cursor += byteCount;
            continue;
          }

          return Object.freeze({
            entities: Object.freeze(entities),
            next_offset: optionalOffset,
            complete_prefix: false,
            unsupported_opcode: opcode,
            unsupported_variant:
              `TKE_Shell optional opcode 0x${optionalOpcode.toString(16).padStart(2, "0")} is not decoded yet`
          });
        }
        if (!terminated) throw new RangeError("unterminated TKE_Shell optional attributes");
      }

      entities.push(Object.freeze({
        kind: "triangle_mesh",
        source_offset: shellOffset,
        encoding: "TKE_Shell",
        suboptions,
        suboptions2,
        refinement_index: refinementIndex,
        lod,
        compression_scheme: compressionScheme,
        connectivity: Object.freeze({
          status: hasConnectivityCompression ? "compressed_unresolved" : "unresolved",
          codec: hasConnectivityCompression ? "edgebreaker" : null,
          faces: null
        }),
        edge_breaker: edgeBreaker,
        vertices,
        optionals: Object.freeze(optionals)
      }));
      offset = cursor;
      count += 1;
      continue;
    }
    if (opcode === 0x42) {
      if (offset + 2 > bytes.length) throw new RangeError("truncated TKE_Bounding_Info");
      const type = bytes[offset + 1];
      if (type === 0) {
        if (offset + 26 > bytes.length) throw new RangeError("truncated cuboid TKE_Bounding_Info");
        const values = [];
        for (let i = 0; i < 6; i += 1) values.push(readF32LE(bytes, offset + 2 + i * 4));
        entities.push(Object.freeze({
          kind: "bounds",
          source_offset: offset,
          shape: "cuboid",
          min: Object.freeze(values.slice(0, 3)),
          max: Object.freeze(values.slice(3, 6))
        }));
        offset += 26;
        count += 1;
        continue;
      }
      if (type === 1) {
        if (offset + 18 > bytes.length) throw new RangeError("truncated sphere TKE_Bounding_Info");
        const center = [readF32LE(bytes, offset + 2), readF32LE(bytes, offset + 6), readF32LE(bytes, offset + 10)];
        const radius = readF32LE(bytes, offset + 14);
        entities.push(Object.freeze({
          kind: "bounds",
          source_offset: offset,
          shape: "sphere",
          center: Object.freeze(center),
          radius
        }));
        offset += 18;
        count += 1;
        continue;
      }
      throw new RangeError(`unsupported TKE_Bounding_Info type ${type} at offset ${offset}`);
    }
    if (opcode === 0x7d) {
      if (offset + 47 > bytes.length) throw new RangeError("truncated TKE_View");
      const projection = bytes[offset + 1];
      if (projection !== 0) {
        return Object.freeze({
          entities: Object.freeze(entities),
          next_offset: offset,
          complete_prefix: false,
          unsupported_opcode: opcode,
          unsupported_variant: `TKE_View projection ${projection}`
        });
      }
      const readPoint = (base) => Object.freeze([
        readF32LE(bytes, base),
        readF32LE(bytes, base + 4),
        readF32LE(bytes, base + 8)
      ]);
      const position = readPoint(offset + 2);
      const target = readPoint(offset + 14);
      const up = readPoint(offset + 26);
      const fieldWidth = readF32LE(bytes, offset + 38);
      const fieldHeight = readF32LE(bytes, offset + 42);
      const nameLength = bytes[offset + 46];
      const end = offset + 47 + nameLength;
      if (end > bytes.length) throw new RangeError("truncated TKE_View name");
      entities.push(Object.freeze({
        kind: "view",
        source_offset: offset,
        projection,
        position,
        target,
        up_vector: up,
        field_width: fieldWidth,
        field_height: fieldHeight,
        name: readAscii(bytes, offset + 47, end)
      }));
      offset = end;
      count += 1;
      continue;
    }
    if (opcode === 0x4c) {
      const pointCount = readU32LE(bytes, offset + 1);
      if (pointCount < 2 || pointCount > 1_000_000) {
        throw new RangeError(`invalid TKE_Polyline point count ${pointCount} at offset ${offset}`);
      }
      const end = offset + 5 + pointCount * 12;
      if (end > bytes.length) throw new RangeError("truncated TKE_Polyline points");
      const points = [];
      for (let i = 0; i < pointCount; i += 1) {
        const base = offset + 5 + i * 12;
        const point = [readF32LE(bytes, base), readF32LE(bytes, base + 4), readF32LE(bytes, base + 8)];
        if (!point.every(Number.isFinite)) throw new RangeError(`non-finite TKE_Polyline point at offset ${base}`);
        points.push(Object.freeze(point));
      }
      entities.push(Object.freeze({ kind: "polyline", source_offset: offset, points: Object.freeze(points) }));
      offset = end;
      count += 1;
      continue;
    }

    return Object.freeze({
      entities: Object.freeze(entities),
      next_offset: offset,
      complete_prefix: false,
      unsupported_opcode: opcode
    });
  }

  return Object.freeze({ entities: Object.freeze(entities), next_offset: offset, complete_prefix: false, limit_reached: count >= maxOpcodes });
}
