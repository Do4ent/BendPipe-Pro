import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewProgress,
  reviewProgressSnapshot
} from "../../src/domain/measurements/review-progress.mjs";

test("question 358: review progress and snapshot are deeply immutable",()=>{
  const progress=buildReviewProgress({
    items:[{id:"a",reasons:["R"]}],
    selected_ids:["a"]
  });
  const snapshot=reviewProgressSnapshot(progress);
  assert.equal(Object.isFrozen(progress),true);
  assert.equal(Object.isFrozen(progress.reason_counts),true);
  assert.equal(Object.isFrozen(progress.reason_selection),true);
  assert.equal(Object.isFrozen(progress.reason_selection.R),true);
  assert.equal(Object.isFrozen(snapshot),true);
  assert.equal(Object.isFrozen(snapshot.reason_selection),true);
  assert.throws(()=>{snapshot.reason_count=99;},TypeError);
});
