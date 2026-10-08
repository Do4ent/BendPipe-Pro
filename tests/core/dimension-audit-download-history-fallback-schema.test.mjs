import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 548: UI fallback accepts audit download history schema",()=>{
  assert.match(ui,/"TubeBender\.DimensionAuditDownloadHistory\.v1"/);
  const block=ui.match(/const DIMENSION_AUDIT_DOWNLOAD_SCHEMAS=Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1]??"";
  assert.match(block,/DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA/);
});
