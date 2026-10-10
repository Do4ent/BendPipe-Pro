import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 885: UI export-event summary validation fails closed on non-array events",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventSummaryValid\(/);
  assert.match(ui,/if\(!Array\.isArray\(events\)\)return false;/);
  assert.match(ui,/const list=events;/);
});
