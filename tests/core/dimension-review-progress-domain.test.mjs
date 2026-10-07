import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewProgress,
  reviewProgressSignature,
  reviewProgressSnapshot,
  REVIEW_PROGRESS_SNAPSHOT_SCHEMA
} from "../../src/domain/measurements/review-progress.mjs";

test("question 340: pure review progress domain model is deterministic and fail-closed",()=>{
  const items=[
    {id:"dim-b",reasons:["Stale"]},
    {id:"dim-a",reasons:["Unknown geometry","Stale"]}
  ];
  const progress=buildReviewProgress({items,selected_ids:["dim-a"]});
  assert.equal(progress.reason_count,2);
  assert.deepEqual(progress.reason_counts,{Stale:2,"Unknown geometry":1});
  assert.equal(progress.reason_selection.Stale.selection_coverage,"partial");
  assert.equal(progress.reason_selection["Unknown geometry"].selection_coverage,"complete");
  assert.deepEqual(progress.coverage,{none:0,partial:1,complete:1});
  assert.deepEqual(progress.completed_reasons,["Unknown geometry"]);
  assert.deepEqual(progress.pending_reasons,["Stale"]);
  assert.equal(progress.pending_count,1);
  assert.equal(progress.complete_percent,50);
  assert.equal(progress.completion_state,"pending");
  assert.equal(progress.valid,true);
  assert.equal(progress.status,"ok");

  const same=buildReviewProgress({items:[...items].reverse(),selected_ids:["dim-a"]});
  assert.equal(reviewProgressSignature(progress),reviewProgressSignature(same));

  const snapshot=reviewProgressSnapshot(progress);
  assert.equal(snapshot.schema,REVIEW_PROGRESS_SNAPSHOT_SCHEMA);
  assert.equal(snapshot.signature,reviewProgressSignature(progress));
  assert.throws(
    ()=>buildReviewProgress({items:[{id:"dup",reasons:[]},{id:"dup",reasons:[]}]}),
    /duplicate review progress item id/
  );
});
