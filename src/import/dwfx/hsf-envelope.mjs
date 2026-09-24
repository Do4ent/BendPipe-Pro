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
export function decodeHsfOpcodePrefix(input, { maxOpcodes = 256 } = {}) {
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
