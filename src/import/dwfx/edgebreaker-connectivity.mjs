function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError("EdgeBreaker input must be an ArrayBuffer or Uint8Array");
}

function readI32LE(bytes, offset) {
  if (offset + 4 > bytes.length) throw new RangeError("truncated EdgeBreaker int32");
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getInt32(0, true);
}

function readU32LE(bytes, offset) {
  if (offset + 4 > bytes.length) throw new RangeError("truncated EdgeBreaker uint32");
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}

const CASE_C = 0;
const CASE_L = 1;
const CASE_E = 2;
const CASE_R = 3;
const CASE_S = 4;
const CASE_M = 5;
const CASE_M2 = 6;

const MTABLE_HAS_LENGTHS = 0x01;
const MTABLE_HAS_M2STACKOFFSETS = 0x02;
const MTABLE_HAS_M2GATEOFFSETS = 0x04;
const MTABLE_HAS_DUMMIES = 0x08;
const MTABLE_HAS_PATCHES = 0x10;
const MTABLE_HAS_BOUNDING = 0x20;
const MTABLE_HAS_QUANTIZATION = 0x40;
const MTABLE_HAS_QUANTIZATION_NORMALS = 0x80;

function align4(value) {
  return value + ((4 - (value % 4)) % 4);
}

function parseMTable(bytes) {
  let cursor = 0;
  const flags = readU32LE(bytes, cursor);
  cursor += 4;

  let lengthsCount = 0;
  let m2Count = 0;
  let dummiesCount = 0;
  let patchesCount = 0;

  if (flags & MTABLE_HAS_LENGTHS) {
    lengthsCount = readU32LE(bytes, cursor);
    cursor += 4;
  }
  if (flags & MTABLE_HAS_M2STACKOFFSETS) {
    if ((flags & MTABLE_HAS_M2GATEOFFSETS) === 0) {
      throw new RangeError("EdgeBreaker MTable has stack offsets without gate offsets");
    }
    m2Count = readU32LE(bytes, cursor);
    cursor += 4;
  }
  if (flags & MTABLE_HAS_DUMMIES) {
    dummiesCount = readU32LE(bytes, cursor);
    cursor += 4;
  }
  if (flags & MTABLE_HAS_PATCHES) {
    patchesCount = readU32LE(bytes, cursor);
    cursor += 4;
    if ((patchesCount & 1) !== 0) {
      throw new RangeError("EdgeBreaker patch table length must be even");
    }
  }

  const readIntArray = (count, label) => {
    if (count > 10_000_000) throw new RangeError(`EdgeBreaker ${label} count is unreasonable`);
    const result = new Array(count);
    for (let i = 0; i < count; i += 1) {
      result[i] = readI32LE(bytes, cursor);
      cursor += 4;
    }
    return result;
  };

  const lengths = readIntArray(lengthsCount, "length");
  const m2StackOffsets = readIntArray(m2Count, "m2 stack offset");
  const m2GateOffsets = readIntArray(m2Count, "m2 gate offset");

  const dummyDeltas = readIntArray(dummiesCount, "dummy");
  const dummies = [];
  let previousDummy = 0;
  for (const delta of dummyDeltas) {
    if (delta < 0) throw new RangeError("EdgeBreaker dummy delta must be non-negative");
    previousDummy += delta;
    dummies.push(previousDummy);
  }

  const patchRaw = readIntArray(patchesCount, "patch");
  const patches = [];
  let previousPatch = 0;
  for (let i = 0; i < patchRaw.length; i += 2) {
    previousPatch += patchRaw[i];
    patches.push(Object.freeze([previousPatch, patchRaw[i + 1]]));
  }

  let bounding = null;
  if (flags & MTABLE_HAS_BOUNDING) {
    if (cursor + 24 > bytes.length) throw new RangeError("truncated EdgeBreaker MTable bounding");
    bounding = Object.freeze(Array.from({ length: 6 }, (_, i) =>
      new DataView(bytes.buffer, bytes.byteOffset + cursor + i * 4, 4).getFloat32(0, true)
    ));
    cursor += 24;
  }

  let quantization = null;
  if (flags & MTABLE_HAS_QUANTIZATION) {
    quantization = Object.freeze([
      readI32LE(bytes, cursor),
      readI32LE(bytes, cursor + 4),
      readI32LE(bytes, cursor + 8)
    ]);
    cursor += 12;
  }

  let normalQuantization = null;
  if (flags & MTABLE_HAS_QUANTIZATION_NORMALS) {
    normalQuantization = Object.freeze([
      readI32LE(bytes, cursor),
      readI32LE(bytes, cursor + 4),
      readI32LE(bytes, cursor + 8)
    ]);
    cursor += 12;
  }

  if (cursor !== bytes.length) {
    throw new RangeError(
      `EdgeBreaker MTable length mismatch: decoded ${cursor} of ${bytes.length} bytes`
    );
  }

  return Object.freeze({
    flags,
    lengths: Object.freeze(lengths),
    m2_stack_offsets: Object.freeze(m2StackOffsets),
    m2_gate_offsets: Object.freeze(m2GateOffsets),
    dummies: Object.freeze(dummies),
    patches: Object.freeze(patches),
    bounding,
    quantization,
    normal_quantization: normalQuantization
  });
}

function preprocessComponent(ops, startOffset) {
  let edgeCount = 0;
  let splitCount = 0;
  const edgeStack = [];
  const splitStack = [];
  const splitOffsets = [];
  let cursor = startOffset;

  while (cursor < ops.length) {
    const op = ops[cursor++];
    switch (op) {
      case CASE_C:
        edgeCount -= 1;
        break;
      case CASE_L:
      case CASE_R:
        edgeCount += 1;
        break;
      case CASE_E:
        edgeCount += 3;
        if (edgeStack.length > 0) {
          const splitIndex = splitStack.pop();
          const savedEdgeCount = edgeStack.pop();
          splitOffsets[splitIndex] = edgeCount - 2 - savedEdgeCount;
        } else {
          if (edgeCount <= 0) {
            throw new RangeError("EdgeBreaker component has invalid initial boundary");
          }
          return Object.freeze({
            edge_count: edgeCount,
            split_offsets: Object.freeze(splitOffsets),
            end_offset: cursor
          });
        }
        break;
      case CASE_S:
        edgeCount -= 1;
        splitStack.push(splitCount++);
        edgeStack.push(edgeCount);
        break;
      case CASE_M:
      case CASE_M2:
        throw new RangeError(
          `EdgeBreaker merge opcode ${op} is not decoded by the conservative connectivity path`
        );
      default:
        throw new RangeError(`unknown EdgeBreaker topology opcode ${op}`);
    }
  }

  throw new RangeError("unterminated EdgeBreaker connected component");
}

function ensureSlot(array, index) {
  while (array.length <= index) array.push(null);
}

function decodeTopologyCases(ops) {
  const faces = [];
  let vertexCount = 0;
  let cursor = 0;
  const components = [];

  while (cursor < ops.length) {
    const componentStart = cursor;
    const pre = preprocessComponent(ops, cursor);
    const edgeCount = pre.edge_count;

    const prev = new Array(edgeCount);
    const next = new Array(edgeCount);
    const start = new Array(edgeCount);
    for (let i = 0; i < edgeCount; i += 1) {
      prev[i] = (i - 1 + edgeCount) % edgeCount;
      next[i] = (i + 1) % edgeCount;
      start[i] = vertexCount + i;
    }
    vertexCount += edgeCount;

    let hashUsed = edgeCount;
    const available = [];
    const gateStack = [];
    let gate = 0;
    let splitIndex = 0;
    let terminated = false;

    while (!terminated) {
      if (cursor >= ops.length) throw new RangeError("truncated EdgeBreaker topology stream");
      if (available.length === 0) {
        available.push(hashUsed);
        ensureSlot(prev, hashUsed);
        ensureSlot(next, hashUsed);
        ensureSlot(start, hashUsed);
        hashUsed += 1;
      }

      const op = ops[cursor++];
      const a = start[gate];
      const b = start[next[gate]];
      let c;

      switch (op) {
        case CASE_C: {
          c = vertexCount;
          const slot = available.pop();
          const before = prev[gate];
          next[before] = slot;
          prev[slot] = before;
          next[slot] = gate;
          prev[gate] = slot;
          start[slot] = start[gate];
          start[gate] = vertexCount;
          vertexCount += 1;
          break;
        }
        case CASE_L: {
          const before = prev[gate];
          c = start[before];
          start[gate] = start[before];
          available.push(before);
          prev[gate] = prev[before];
          next[prev[gate]] = gate;
          break;
        }
        case CASE_E: {
          const before = prev[gate];
          const after = next[gate];
          c = start[before];
          available.push(gate, before, after);
          if (gateStack.length > 0) {
            gate = gateStack.pop();
          } else {
            terminated = true;
          }
          break;
        }
        case CASE_R: {
          const after = next[gate];
          const afterAfter = next[after];
          c = start[afterAfter];
          available.push(after);
          next[gate] = afterAfter;
          prev[afterAfter] = gate;
          break;
        }
        case CASE_S: {
          const splitOffset = pre.split_offsets[splitIndex++];
          if (!Number.isInteger(splitOffset) || splitOffset < 0) {
            throw new RangeError("EdgeBreaker split offset is unresolved");
          }
          let boundary = gate;
          for (let i = 0; i <= splitOffset; i += 1) {
            boundary = next[boundary];
          }
          c = start[next[boundary]];
          const slot = available.pop();
          gateStack.push(slot);

          const beforeGate = prev[gate];
          const afterBoundary = next[boundary];
          next[beforeGate] = slot;
          prev[slot] = beforeGate;
          next[slot] = afterBoundary;
          prev[afterBoundary] = slot;
          start[slot] = start[gate];
          start[gate] = start[afterBoundary];
          prev[gate] = boundary;
          next[boundary] = gate;
          break;
        }
        case CASE_M:
        case CASE_M2:
          throw new RangeError(
            `EdgeBreaker merge opcode ${op} is not decoded by the conservative connectivity path`
          );
        default:
          throw new RangeError(`unknown EdgeBreaker topology opcode ${op}`);
      }

      if (![a, b, c].every(Number.isInteger) || a === b || b === c || c === a) {
        throw new RangeError(
          `invalid EdgeBreaker triangle at topology offset ${cursor - 1}`
        );
      }
      faces.push(Object.freeze([a, b, c]));
    }

    if (cursor !== pre.end_offset) {
      throw new RangeError(
        `EdgeBreaker component boundary mismatch: preprocess=${pre.end_offset}, decode=${cursor}`
      );
    }

    components.push(Object.freeze({
      opcode_start: componentStart,
      opcode_end: cursor,
      initial_boundary_edges: edgeCount
    }));
  }

  return Object.freeze({
    raw_point_count: vertexCount,
    raw_faces: Object.freeze(faces),
    components: Object.freeze(components)
  });
}

function removeDummyVertices(topology, mtable, expectedPointCount) {
  const rawCount = topology.raw_point_count;
  const dummySet = new Set();
  for (const index of mtable.dummies) {
    if (!Number.isInteger(index) || index < 0 || index >= rawCount) {
      throw new RangeError(`EdgeBreaker dummy vertex ${index} is outside raw point array`);
    }
    if (dummySet.has(index)) {
      throw new RangeError(`duplicate EdgeBreaker dummy vertex ${index}`);
    }
    dummySet.add(index);
  }

  // HOOPS EdgeBreaker patches are vertex aliases applied after pseudomanifold
  // reconstruction: old vertex id -> new absolute vertex id. The old ids are
  // removed from the final point array, just like dummy vertices. parseMTable()
  // has already expanded the delta-encoded old ids to absolute ids.
  const aliases = new Map();
  for (const pair of mtable.patches) {
    const [oldIndex, newIndex] = pair;
    if (!Number.isInteger(oldIndex) || oldIndex < 0 || oldIndex >= rawCount) {
      throw new RangeError(`EdgeBreaker patch old vertex ${oldIndex} is outside raw point array`);
    }
    if (!Number.isInteger(newIndex) || newIndex < 0 || newIndex >= rawCount) {
      throw new RangeError(`EdgeBreaker patch new vertex ${newIndex} is outside raw point array`);
    }
    if (oldIndex === newIndex) {
      throw new RangeError(`EdgeBreaker patch ${oldIndex} aliases itself`);
    }
    if (aliases.has(oldIndex)) {
      throw new RangeError(`duplicate EdgeBreaker patch old vertex ${oldIndex}`);
    }
    aliases.set(oldIndex, newIndex);
  }

  const resolveAlias = (index) => {
    let value = index;
    const seen = new Set();
    while (aliases.has(value)) {
      if (seen.has(value)) {
        throw new RangeError("EdgeBreaker patch alias cycle");
      }
      seen.add(value);
      value = aliases.get(value);
    }
    return value;
  };

  const removedSet = new Set([...dummySet, ...aliases.keys()]);
  const remap = new Array(rawCount);
  let removed = 0;
  for (let i = 0; i < rawCount; i += 1) {
    if (removedSet.has(i)) {
      remap[i] = -1;
      removed += 1;
    } else {
      remap[i] = i - removed;
    }
  }

  const pointCount = rawCount - removed;
  if (pointCount !== expectedPointCount) {
    throw new RangeError(
      `EdgeBreaker point count mismatch after patch/dummy removal: decoded ${pointCount}, header ${expectedPointCount}`
    );
  }

  const faces = [];
  let droppedFaces = 0;
  let patchedFaceReferences = 0;
  for (const tri of topology.raw_faces) {
    const resolved = tri.map((index) => {
      const next = resolveAlias(index);
      if (next !== index) patchedFaceReferences += 1;
      return next;
    });

    if (resolved.some((index) => dummySet.has(index))) {
      droppedFaces += 1;
      continue;
    }

    const mapped = resolved.map((index) => remap[index]);
    if (
      mapped.some(
        (index) => !Number.isInteger(index) || index < 0 || index >= pointCount
      )
    ) {
      throw new RangeError("EdgeBreaker face remap escaped final point array");
    }
    if (new Set(mapped).size < 3) {
      droppedFaces += 1;
      continue;
    }
    faces.push(Object.freeze(mapped));
  }

  return Object.freeze({
    point_count: pointCount,
    face_count: faces.length,
    faces: Object.freeze(faces),
    dummy_vertices: mtable.dummies,
    patch_aliases: mtable.patches,
    dropped_dummy_faces: droppedFaces,
    patched_face_references: patchedFaceReferences
  });
}

/**
 * Decode the topology-only subset used by the 80003043 HSF 14.50 golden case.
 *
 * This intentionally does not decode compressed coordinates or normals. It only
 * reconstructs triangle connectivity from CASE_C/L/E/R/S and applies MTable
 * dummy-vertex removal plus the HSF-defined old->new patch alias table. Obsolete merge opcodes remain explicit blockers.
 */
export function decodeEdgeBreakerConnectivity(input) {
  const bytes = asBytes(input);
  if (bytes.length < 24) throw new RangeError("EdgeBreaker workspace is too short");

  const scheme = bytes[0];
  const mtableScheme = bytes[1];
  const pointsScheme = bytes[2];
  const normalsScheme = bytes[3];
  const opsLength = readI32LE(bytes, 4);
  const mtableLength = readI32LE(bytes, 8);
  const packedPointsLength = readI32LE(bytes, 12);
  const expectedPointCount = readI32LE(bytes, 16);
  const normalsLength = readI32LE(bytes, 20);

  if (scheme !== 2) throw new RangeError(`unsupported EdgeBreaker scheme ${scheme}`);
  if (mtableScheme !== 0) throw new RangeError(`unsupported EdgeBreaker MTable scheme ${mtableScheme}`);
  for (const [label, value] of [
    ["ops", opsLength],
    ["mtable", mtableLength],
    ["points", packedPointsLength],
    ["normals", normalsLength],
    ["point_count", expectedPointCount]
  ]) {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(`invalid EdgeBreaker ${label} length/count ${value}`);
    }
  }

  const opsStart = 24;
  const opsEnd = opsStart + opsLength;
  const mtableStart = opsStart + align4(opsLength);
  const mtableEnd = mtableStart + mtableLength;
  const pointsStart = mtableStart + align4(mtableLength);
  const pointsEnd = pointsStart + packedPointsLength;
  const expectedWorkspaceLength = pointsStart + align4(packedPointsLength);

  if (expectedWorkspaceLength !== bytes.length) {
    throw new RangeError(
      `EdgeBreaker workspace length mismatch: header implies ${expectedWorkspaceLength}, got ${bytes.length}`
    );
  }
  if (opsEnd > bytes.length || mtableEnd > bytes.length || pointsEnd > bytes.length) {
    throw new RangeError("truncated EdgeBreaker workspace sections");
  }

  const ops = bytes.subarray(opsStart, opsEnd);
  for (const op of ops) {
    if (op > CASE_S) {
      if (op === CASE_M || op === CASE_M2) {
        throw new RangeError(
          `EdgeBreaker merge opcode ${op} requires the extended connectivity path`
        );
      }
      throw new RangeError(`unknown EdgeBreaker topology opcode ${op}`);
    }
  }

  const mtable = parseMTable(bytes.subarray(mtableStart, mtableEnd));
  const topology = decodeTopologyCases(ops);
  const patched = removeDummyVertices(topology, mtable, expectedPointCount);

  return Object.freeze({
    codec: "edgebreaker",
    scheme,
    mtable_scheme: mtableScheme,
    points_scheme: pointsScheme,
    normals_scheme: normalsScheme,
    ops_length: opsLength,
    mtable_length: mtableLength,
    packed_points_length: packedPointsLength,
    normals_length: normalsLength,
    raw_point_count: topology.raw_point_count,
    point_count: patched.point_count,
    face_count: patched.face_count,
    faces: patched.faces,
    dummy_vertices: patched.dummy_vertices,
    dropped_dummy_faces: patched.dropped_dummy_faces,
    patch_aliases: patched.patch_aliases,
    patched_face_references: patched.patched_face_references,
    components: topology.components,
    production_ready: false
  });
}
