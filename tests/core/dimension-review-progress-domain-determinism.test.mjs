import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewProgress,
  reviewProgressSignature
} from "../../src/domain/measurements/review-progress.mjs";

test("question 357: review progress signature is invariant to input ordering",()=>{
  const a=buildReviewProgress({
    items:[
      {id:"b",reasons:["Zeta","Alpha","Alpha"]},
      {id:"a",reasons:["Alpha"]}
    ],
    selected_ids:["b","a"]
  });
  const b=buildReviewProgress({
    items:[
      {id:"a",reasons:["Alpha"]},
      {id:"b",reasons:["Alpha","Zeta"]}
    ],
    selected_ids:["a","b"]
  });
  assert.equal(reviewProgressSignature(a),reviewProgressSignature(b));
  assert.deepEqual(Object.keys(a.reason_counts),["Alpha","Zeta"]);
  assert.deepEqual(a.completed_reasons,["Alpha","Zeta"]);
});
