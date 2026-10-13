import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 462: Dimension Properties shows global review context summary",()=>{
  assert.match(properties,/const reviewContextSummary=audit\?\.currentDimensionReviewContextSummary\?\.\(\)\?\?null/);
  assert.match(properties,/\["Queue review action required count",reviewContextSummary\?\.action_required\]/);
  assert.match(properties,/\["Queue review state counts",reviewContextSummary\?\.by_state\]/);
  assert.match(properties,/\["Queue review health counts",reviewContextSummary\?\.by_health\]/);
  assert.match(properties,/\["Queue review blocker counts",reviewContextSummary\?\.blocker_counts\]/);
  assert.match(properties,/\["Queue review summary signature",reviewContextSummary\?\.signature\]/);
});
