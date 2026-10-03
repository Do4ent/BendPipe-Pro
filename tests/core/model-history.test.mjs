import test from "node:test";
import assert from "node:assert/strict";

import { createModelHistory } from "../../src/application/model-history.mjs";

test("A13: one committed command creates one undo entry", () => {
  const h = createModelHistory();
  const before = { rows: [{ type: "LINE", L: 100 }] };
  const after = { rows: [{ type: "LINE", L: 125 }] };

  assert.equal(h.record("Edit line", before, after), true);
  assert.equal(h.undoCount(), 1);
  assert.equal(h.redoCount(), 0);
  assert.equal(h.nextUndoLabel(), "Edit line");
});

test("A13: no-op command does not create history", () => {
  const h = createModelHistory();
  const model = { rows: [{ type: "LINE", L: 100 }] };

  assert.equal(h.record("No-op", model, model), false);
  assert.equal(h.canUndo(), false);
});

test("A13: undo restores before snapshot and redo restores after snapshot", () => {
  const h = createModelHistory();
  const before = { rows: [{ type: "BEND", angle: 90, clr: 65 }] };
  const after = { rows: [{ type: "BEND", angle: 45, clr: 65 }] };

  h.record("Edit bend", before, after);

  const undo = h.undo();
  assert.equal(undo.label, "Edit bend");
  assert.deepEqual(undo.snapshot, before);
  assert.equal(h.canRedo(), true);

  const redo = h.redo();
  assert.equal(redo.label, "Edit bend");
  assert.deepEqual(redo.snapshot, after);
  assert.equal(h.canRedo(), false);
});

test("A13: a new command after undo clears redo branch", () => {
  const h = createModelHistory();
  h.record("One", { n: 0 }, { n: 1 });
  h.record("Two", { n: 1 }, { n: 2 });
  h.undo();

  assert.equal(h.canRedo(), true);
  h.record("Alternative", { n: 1 }, { n: 3 });
  assert.equal(h.canRedo(), false);
  assert.equal(h.nextUndoLabel(), "Alternative");
});

test("A13: history limit drops oldest commands", () => {
  const h = createModelHistory({ limit: 2 });
  h.record("One", { n: 0 }, { n: 1 });
  h.record("Two", { n: 1 }, { n: 2 });
  h.record("Three", { n: 2 }, { n: 3 });

  assert.equal(h.undoCount(), 2);
  assert.equal(h.undo().label, "Three");
  assert.equal(h.undo().label, "Two");
  assert.equal(h.undo(), null);
});

test("A13: snapshots are cloned and cannot be mutated through history", () => {
  const h = createModelHistory();
  const before = { rows: [{ type: "LINE", L: 100 }] };
  const after = { rows: [{ type: "LINE", L: 120 }] };

  h.record("Edit", before, after);
  before.rows[0].L = 1;
  after.rows[0].L = 999;

  assert.equal(h.undo().snapshot.rows[0].L, 100);
  assert.equal(h.redo().snapshot.rows[0].L, 120);
});
