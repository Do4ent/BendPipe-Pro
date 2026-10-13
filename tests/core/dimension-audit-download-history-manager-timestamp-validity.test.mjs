import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 678: Saved Dimensions exposes audit history timestamp validity",()=>{
  assert.match(ui,/data-generated-at-valid="'\+\(auditDownloadHistorySnapshot\.integrity\?\.generated_at_valid\?'1':'0'\)\+'"/);
  assert.match(ui,/timestamp '\+\(auditDownloadHistorySnapshot\.integrity\?\.generated_at_valid\?'valid':'invalid'\)/);
});
