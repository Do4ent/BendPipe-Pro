import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 778: copy and download require a valid history export chain snapshot",()=>{
  const matches=[...ui.matchAll(/const exportChainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(exportChain\)/g)];
  assert.equal(matches.length,2);
  assert.match(ui,/const exportChainSnapshotValid=dimensionAuditDownloadHistoryExportChainSnapshotValid\(exportChainSnapshot\)/);
  assert.match(ui,/if\(!exportChainSnapshotValid\|\|!exportChain\.allowed\)/);
  assert.match(ui,/const blockCode=!exportChainSnapshotValid\?"INVALID_EXPORT_CHAIN_SNAPSHOT":exportChain\.code/);
});
