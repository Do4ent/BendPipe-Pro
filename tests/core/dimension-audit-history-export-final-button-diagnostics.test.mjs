import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:url";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 817: final export buttons expose accessible blocked state and permit reason",()=>{
  assert.match(ui,/aria-disabled="'\+\(auditDownloadHistoryCopyPermitReady\?'false':'true'\)\+'"/);
  assert.match(ui,/title="'\+esc\(auditDownloadHistoryCopyPermit\.code\)\+'"/);
  assert.match(ui,/aria-disabled="'\+\(auditDownloadHistoryDownloadPermitReady\?'false':'true'\)\+'"/);
  assert.match(ui,/title="'\+esc\(auditDownloadHistoryDownloadPermit\.code\)\+'"/);
});
