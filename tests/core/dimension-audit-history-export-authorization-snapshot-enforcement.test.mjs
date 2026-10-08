import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 768: copy and download require a valid history export authorization snapshot",()=>{
  const matches=[...ui.matchAll(/const exportAuthorizationSnapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot\(exportAuthorization\)/g)];
  assert.equal(matches.length,2);
  assert.match(ui,/const exportAuthorizationSnapshotValid=dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid\(exportAuthorizationSnapshot\)/);
  assert.match(ui,/if\(!exportAuthorizationSnapshotValid\|\|!exportAuthorization\.allowed\)/);
  assert.match(ui,/const blockCode=!exportAuthorizationSnapshotValid\?"INVALID_AUTHORIZATION_SNAPSHOT":exportAuthorization\.code/);
});
