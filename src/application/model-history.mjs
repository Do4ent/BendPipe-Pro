function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableJson(value) {
  return JSON.stringify(value);
}

export function createModelHistory({ limit = 50, clone = jsonClone, initialState = null } = {}) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("history limit must be a positive integer");
  }

  const undoStack = [];
  const redoStack = [];

  function importState(state) {
    if (!state || typeof state !== "object") return false;
    const nextUndo = Array.isArray(state.undo) ? state.undo : [];
    const nextRedo = Array.isArray(state.redo) ? state.redo : [];
    undoStack.length = 0;
    redoStack.length = 0;
    for (const entry of nextUndo.slice(-limit)) {
      if (!entry || typeof entry !== "object") continue;
      undoStack.push(Object.freeze({
        label: String(entry.label || "Change"),
        before: clone(entry.before),
        after: clone(entry.after)
      }));
    }
    for (const entry of nextRedo.slice(-limit)) {
      if (!entry || typeof entry !== "object") continue;
      redoStack.push(Object.freeze({
        label: String(entry.label || "Change"),
        before: clone(entry.before),
        after: clone(entry.after)
      }));
    }
    return true;
  }

  function exportState() {
    return Object.freeze({
      version: 1,
      limit,
      undo: undoStack.map((entry) => ({
        label: entry.label,
        before: clone(entry.before),
        after: clone(entry.after)
      })),
      redo: redoStack.map((entry) => ({
        label: entry.label,
        before: clone(entry.before),
        after: clone(entry.after)
      }))
    });
  }

  if (initialState) importState(initialState);

  function record(label, before, after) {
    const name = String(label || "Change");
    const beforeCopy = clone(before);
    const afterCopy = clone(after);

    if (stableJson(beforeCopy) === stableJson(afterCopy)) {
      return false;
    }

    undoStack.push(Object.freeze({
      label: name,
      before: beforeCopy,
      after: afterCopy
    }));
    if (undoStack.length > limit) {
      undoStack.splice(0, undoStack.length - limit);
    }
    redoStack.length = 0;
    return true;
  }

  function undo() {
    const entry = undoStack.pop();
    if (!entry) return null;
    redoStack.push(entry);
    return Object.freeze({
      label: entry.label,
      snapshot: clone(entry.before)
    });
  }

  function redo() {
    const entry = redoStack.pop();
    if (!entry) return null;
    undoStack.push(entry);
    return Object.freeze({
      label: entry.label,
      snapshot: clone(entry.after)
    });
  }

  function clear() {
    undoStack.length = 0;
    redoStack.length = 0;
  }

  return Object.freeze({
    record,
    undo,
    redo,
    clear,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    undoCount: () => undoStack.length,
    redoCount: () => redoStack.length,
    nextUndoLabel: () => undoStack.at(-1)?.label ?? null,
    nextRedoLabel: () => redoStack.at(-1)?.label ?? null,
    exportState,
    importState
  });
}
