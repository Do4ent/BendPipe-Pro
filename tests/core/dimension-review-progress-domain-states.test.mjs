import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewProgress } from "../../src/domain/measurements/review-progress.mjs";

test("question 356: review progress domain handles empty none partial complete states",()=>{
  const empty=buildReviewProgress();
  assert.equal(empty.reason_count,0);
  assert.equal(empty.pending_count,0);
  assert.equal(empty.complete_percent,0);
  assert.equal(empty.completion_state,"empty");
  assert.equal(empty.status,"empty");
  assert.equal(empty.valid,true);

  const items=[
    {id:"a",reasons:["Needs review"]},
    {id:"b",reasons:["Needs review"]}
  ];
  const none=buildReviewProgress({items,selected_ids:["unknown"]});
  assert.equal(none.reason_selection["Needs review"].selection_coverage,"none");
  assert.equal(none.pending_count,1);
  assert.equal(none.complete_percent,0);

  const partial=buildReviewProgress({items,selected_ids:["a"]});
  assert.equal(partial.reason_selection["Needs review"].selection_coverage,"partial");
  assert.equal(partial.pending_count,1);
  assert.equal(partial.complete_percent,0);

  const complete=buildReviewProgress({items,selected_ids:["a","b"]});
  assert.equal(complete.reason_selection["Needs review"].selection_coverage,"complete");
  assert.equal(complete.pending_count,0);
  assert.equal(complete.complete_percent,100);
  assert.equal(complete.completion_state,"complete");
  assert.equal(complete.status,"ok");
});
