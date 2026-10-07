import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 361: review diagnostic error codes are centralized",()=>{
  assert.match(ui,/function reviewProgressAuditErrorCodes\(\)/);
  assert.match(ui,/const reviewProgressSupportedErrorCodes=reviewProgressAuditErrorCodes\(\)/);
  assert.match(ui,/const reviewReasonSupportedErrorCodes=reviewProgressAuditErrorCodes\(\)/);
  assert.match(ui,/\.every\(code=>reviewProgressSupportedErrorCodes\.includes\(code\)\)/);
  assert.match(ui,/reviewReasonProgressErrors\.every\(code=>reviewReasonSupportedErrorCodes\.includes\(code\)\)/);
});
