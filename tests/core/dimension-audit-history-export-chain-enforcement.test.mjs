import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 772: copy and download use the canonical history export chain",()=>{
  const chainMatches=[...ui.matchAll(/const exportChain=dimensionAuditDownloadHistoryExportChain\(snapshot\)/g)];
  assert.equal(chainMatches.length,2);
  const validMatches=[...ui.matchAll(/const exportChainValid=dimensionAuditDownloadHistoryExportChainValid\(exportChain\)/g)];
  assert.equal(validMatches.length,2);
  assert.match(ui,/if\(!exportChainValid\|\|!exportChain\.allowed\)/);
  assert.match(ui,/const blockCode=!exportChainValid\?"INVALID_EXPORT_CHAIN":exportChain\.code/);
});
