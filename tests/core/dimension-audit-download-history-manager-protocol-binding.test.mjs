import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 622: Saved Dimensions exposes audit history protocol binding validity",()=>{
  assert.match(ui,/data-protocol-binding-valid="'\+\(dimensionAuditDownloadHistoryProtocolBindingValid\(auditDownloadHistorySnapshot\)\?'1':'0'\)\+'"/);
  assert.match(ui,/binding '\+\(dimensionAuditDownloadHistoryProtocolBindingValid\(auditDownloadHistorySnapshot\)\?'valid':'invalid'\)/);
});
