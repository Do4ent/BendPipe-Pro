import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 551: Saved Dimensions exposes copy and download history actions",()=>{
  assert.match(ui,/data-copy-dimension-audit-download-history/);
  assert.match(ui,/data-download-dimension-audit-download-history/);
  assert.match(ui,/querySelector\("\[data-copy-dimension-audit-download-history\]"\)\?\.addEventListener\("click",copyDimensionAuditDownloadHistory\)/);
  assert.match(ui,/querySelector\("\[data-download-dimension-audit-download-history\]"\)\?\.addEventListener\("click",downloadDimensionAuditDownloadHistory\)/);
});
