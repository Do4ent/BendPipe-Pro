import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewProgress } from "../../src/domain/measurements/review-progress.mjs";

test("question 359: review progress domain fails closed on invalid input",()=>{
  assert.throws(()=>buildReviewProgress({items:null}),/items must be an array/);
  assert.throws(()=>buildReviewProgress({items:[null]}),/item 0 must be an object/);
  assert.throws(()=>buildReviewProgress({items:[{id:"",reasons:[]}]}),/id must be non-empty/);
  assert.throws(()=>buildReviewProgress({items:[{id:"a",reasons:[]}],selected_ids:null}),/selected_ids must be an array/);
  assert.throws(
    ()=>buildReviewProgress({items:[{id:"a",reasons:[]},{id:"a",reasons:["R"]}]}),
    /duplicate review progress item id/
  );
});
