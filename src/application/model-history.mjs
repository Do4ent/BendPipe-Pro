function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableJson(value) {
  return JSON.stringify(value);
}

export function createModelHistory({ limit = 50, clone = jsonClone } = {}) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("history limit must be a positive integer");
  }

  const undoStack = [];
  const redoStack = [];

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
    nextRedoLabel: () => redoStack.at(-1)?.label ?? null
  });
}
